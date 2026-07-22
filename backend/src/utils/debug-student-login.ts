import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import Student from '../models/Student';
import User from '../models/User';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vfstr_aeps';
const registrationNumber = (process.env.DEBUG_STUDENT_ROLL || process.argv[2] || '231FA04829').trim().toUpperCase();
const loginEmail = `${registrationNumber.toLowerCase()}@gmail.com`;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const print = (label: string, value: unknown) => console.log(`${label}:`, value);

const debugStudentLogin = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`\nStudent login diagnostic for ${registrationNumber}`);

    const matchingStudents = await Student.find({
      rollNumber: { $regex: `^${escapeRegex(registrationNumber)}$`, $options: 'i' },
    }).lean();
    const student: any = matchingStudents[0];
    print('Student documents found', matchingStudents.length);
    print('Student document', student || 'NOT FOUND');
    if (!student) return;

    const linkedUser: any = await User.findById(student.userId).lean();
    const emailMatches: any[] = await User.find({
      email: { $regex: `^${escapeRegex(loginEmail)}$`, $options: 'i' },
    }).lean();
    const emailUser = emailMatches[0];

    print('Student.userId', String(student.userId));
    print('Linked User document', linkedUser || 'NOT FOUND');
    print('User documents matching email (case-insensitive)', emailMatches.length);
    print('Stored email', linkedUser?.email || 'MISSING');
    print('Stored password hash', linkedUser?.password || 'MISSING');
    print('Role', linkedUser?.role || 'MISSING');
    print('Account status', student.status || 'NOT_SET (treated as ACTIVE)');
    print('Student.userId links to email user', Boolean(linkedUser && emailUser && String(linkedUser._id) === String(emailUser._id)));

    if (linkedUser) {
      print(`bcrypt.compare("${registrationNumber.toLowerCase()}", storedPassword)`,
        await bcrypt.compare(registrationNumber.toLowerCase(), linkedUser.password));
    }
    print('Controller email lookup finds user', Boolean(await User.findOne({ email: loginEmail }).lean()));
    print('Expected email', loginEmail);

    if (matchingStudents.length !== 1) console.error('FAIL: duplicate or missing Student registration number.');
    if (emailMatches.length !== 1) console.error('FAIL: duplicate or missing User email.');
    if (!linkedUser) console.error('FAIL: Student.userId does not reference a User document.');
  } catch (error) {
    console.error('Student login diagnostic failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

debugStudentLogin();
