/**
 * Imports the institutional student spreadsheet without touching dashboards,
 * scoring data, staff accounts, or any existing student profile content.
 *
 * Usage: npm run seed:students
 * Optional: STUDENT_DATASET_PATH="C:\\path\\students.xlsx" npm run seed:students
 */
import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import bcrypt from 'bcryptjs';
import XLSX from 'xlsx';
import User from '../models/User';
import Student from '../models/Student';
import Profile from '../models/Profile';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vfstr_aeps';
const DATASET_PATH = process.env.STUDENT_DATASET_PATH || path.join(__dirname, '../../../CGPA  & Grades.xlsx');
const SHEET_NAME = process.env.STUDENT_DATASET_SHEET || 'Consolidated';
const BATCH_SIZE = 500;

type ImportStudent = {
  row: number;
  rollNumber: string;
  name: string;
  year: number;
  section: string;
  counselorName: string;
  intermediatePercentage: number;
  hostelerStatus: 'H' | 'D' | '';
  gender: 'M' | 'F' | '';
  admissionYear?: number;
};

type Summary = {
  totalRecords: number;
  imported: number;
  updated: number;
  skipped: number;
  invalid: number;
  reasons: Map<string, number>;
};

const addReason = (summary: Summary, reason: string) => {
  summary.reasons.set(reason, (summary.reasons.get(reason) || 0) + 1);
};

const titleCase = (value: string) => value
  .toLowerCase()
  .split(/\s+/)
  .filter(Boolean)
  .map((part) => part[0].toUpperCase() + part.slice(1))
  .join(' ');

const parseRows = (summary: Summary): ImportStudent[] => {
  const workbook = XLSX.readFile(DATASET_PATH);
  const worksheet = workbook.Sheets[SHEET_NAME];
  if (!worksheet) throw new Error(`Worksheet '${SHEET_NAME}' was not found in ${DATASET_PATH}.`);

  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][];
  const seenRollNumbers = new Set<string>();
  const students: ImportStudent[] = [];

  // The supplied Consolidated sheet has its data after ten report/header rows.
  for (let index = 10; index < rows.length; index++) {
    const row = rows[index] as any[];
    if (!row || row.every((cell) => String(cell ?? '').trim() === '')) continue;
    summary.totalRecords++;

    const rollNumber = String(row[1] ?? '').trim().toUpperCase();
    const rawName = String(row[2] ?? '').trim();
    const year = Number(row[3]);
    const section = String(row[4] ?? '').trim().toUpperCase();

    if (!rollNumber || !rawName || !Number.isInteger(year) || year < 1 || year > 4 || !section) {
      summary.invalid++;
      addReason(summary, 'Missing or invalid mandatory field');
      console.warn(`✗ Invalid record at spreadsheet row ${index + 1}`);
      continue;
    }
    if (seenRollNumbers.has(rollNumber)) {
      summary.skipped++;
      addReason(summary, 'Duplicate registration number in dataset');
      console.warn(`⚠ Duplicate skipped: ${rollNumber} (spreadsheet row ${index + 1})`);
      continue;
    }
    seenRollNumbers.add(rollNumber);

    const intermediatePercentage = Number(row[55]);
    const hosteler = String(row[56] ?? '').trim().toUpperCase();
    const gender = String(row[57] ?? '').trim().toUpperCase();
    const admissionPrefix = rollNumber.match(/^(\d{2})/);

    students.push({
      row: index + 1,
      rollNumber,
      name: titleCase(rawName),
      year,
      section,
      counselorName: String(row[53] ?? '').trim(),
      intermediatePercentage: Number.isFinite(intermediatePercentage) ? intermediatePercentage : 0,
      hostelerStatus: hosteler === 'H' || hosteler === 'D' ? hosteler : '',
      gender: gender === 'M' || gender === 'F' ? gender : '',
      admissionYear: admissionPrefix ? 2000 + Number(admissionPrefix[1]) : undefined,
    });
  }
  return students;
};

const seedStudents = async () => {
  const summary: Summary = { totalRecords: 0, imported: 0, updated: 0, skipped: 0, invalid: 0, reasons: new Map() };
  try {
    console.log(`Reading student dataset: ${DATASET_PATH}`);
    const records = parseRows(summary);
    console.log(`Validated ${records.length} student records. Connecting to MongoDB...`);

    if (MONGODB_URI.startsWith('mongodb+srv://')) dns.setServers(['8.8.8.8', '1.1.1.1']);
    await mongoose.connect(MONGODB_URI);

    for (let start = 0; start < records.length; start += BATCH_SIZE) {
      const batch = records.slice(start, start + BATCH_SIZE);
      const rolls = batch.map((record) => record.rollNumber);
      const emails = batch.map((record) => `${record.rollNumber.toLowerCase()}@gmail.com`);
      const existingStudents = await Student.find({ rollNumber: { $in: rolls } }).lean();
      const studentsByRoll = new Map(existingStudents.map((student: any) => [student.rollNumber, student]));
      const associatedUserIds = existingStudents.map((student: any) => student.userId);
      const existingUsers = await User.find({ $or: [{ email: { $in: emails } }, { _id: { $in: associatedUserIds } }] }).lean();
      const usersById = new Map(existingUsers.map((user: any) => [String(user._id), user]));
      const usersByEmail = new Map(existingUsers.map((user: any) => [user.email, user]));

      const userOperations: any[] = [];
      const studentOperations: any[] = [];
      const profileStudentIds: Types.ObjectId[] = [];

      for (const record of batch) {
        const email = `${record.rollNumber.toLowerCase()}@gmail.com`;
        const existingStudent: any = studentsByRoll.get(record.rollNumber);
        const linkedUser: any = existingStudent ? usersById.get(String(existingStudent.userId)) : undefined;
        const emailOwner: any = usersByEmail.get(email);

        // Never take over an account that belongs to another student or staff member.
        if (emailOwner && (!linkedUser || String(emailOwner._id) !== String(linkedUser._id))) {
          summary.skipped++;
          addReason(summary, 'Email already belongs to a different account');
          console.warn(`⚠ Duplicate skipped: ${record.rollNumber} (email ${email} is already in use)`);
          continue;
        }

        const userId = linkedUser?._id || new Types.ObjectId();
        const studentId = existingStudent?._id || new Types.ObjectId();
        const userSet: Record<string, unknown> = {
          name: record.name,
          email,
          role: 'STUDENT',
          department: 'Computer Science & Engineering',
        };

        // A newly-created account, or an account moved from the old domain,
        // receives the mandated initial password. Existing new-policy accounts
        // retain a password a student may have changed after first login.
        if (!linkedUser || linkedUser.email !== email) {
          userSet.password = await bcrypt.hash(record.rollNumber.toLowerCase(), 10);
        }
        userOperations.push({
          updateOne: {
            filter: { _id: userId },
            update: { $set: userSet, $setOnInsert: { isProfileSetup: false } },
            upsert: true,
          },
        });

        studentOperations.push({
          updateOne: {
            filter: { rollNumber: record.rollNumber },
            update: {
              $set: {
                userId,
                branch: 'CSE',
                department: 'Computer Science & Engineering',
                year: record.year,
                section: record.section,
                counselorName: record.counselorName,
                intermediatePercentage: record.intermediatePercentage,
                hostelerStatus: record.hostelerStatus,
                gender: record.gender,
                admissionYear: record.admissionYear,
                status: 'ACTIVE',
              },
              $setOnInsert: { _id: studentId, contactNumber: '' },
            },
            upsert: true,
          },
        });
        profileStudentIds.push(studentId);
        if (existingStudent) summary.updated++; else summary.imported++;
      }

      if (userOperations.length) await User.bulkWrite(userOperations, { ordered: false });
      if (studentOperations.length) await Student.bulkWrite(studentOperations, { ordered: false });
      if (profileStudentIds.length) {
        await Profile.bulkWrite(profileStudentIds.map((studentId) => ({
          updateOne: {
            filter: { studentId },
            update: { $setOnInsert: { profileCompletion: 0 } },
            upsert: true,
          },
        })), { ordered: false });
      }
      console.log(`✓ Processed ${Math.min(start + batch.length, records.length)} / ${records.length}`);
    }

    const importedRollNumbers = records.map((record) => record.rollNumber);
    const importedStudents = await Student.find({ rollNumber: { $in: importedRollNumbers } }).select('rollNumber userId').lean();
    const importedUsers = await User.find({ _id: { $in: importedStudents.map((student: any) => student.userId) } })
      .select('email role')
      .lean();
    const validEmails = new Set(importedRollNumbers.map((rollNumber) => `${rollNumber.toLowerCase()}@gmail.com`));
    const invalidCredentials = importedUsers.filter((user: any) =>
      user.role !== 'STUDENT' || !validEmails.has(user.email)
    ).length;
    console.log(`✓ Verification: ${importedStudents.length}/${records.length} Student records and ${importedUsers.length}/${records.length} login accounts match the import.`);
    if (importedStudents.length !== records.length || importedUsers.length !== records.length || invalidCredentials > 0) {
      throw new Error(`Post-import verification failed (${invalidCredentials} invalid student login account(s)).`);
    }
  } catch (error) {
    console.error('✗ Student import failed:', error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    console.log('\nStudent import summary');
    console.log(`Total records: ${summary.totalRecords}`);
    console.log(`Successfully imported: ${summary.imported}`);
    console.log(`Updated: ${summary.updated}`);
    console.log(`Skipped: ${summary.skipped}`);
    console.log(`Invalid: ${summary.invalid}`);
    for (const [reason, count] of summary.reasons) console.log(`- ${reason}: ${count}`);
  }
};

seedStudents();
