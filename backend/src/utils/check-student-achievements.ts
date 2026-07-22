import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';

import Student from '../models/Student';
import Achievement from '../models/Achievement';
import Certification from '../models/Certification';
import CambridgeCertification from '../models/CambridgeCertification';
import CoCurricularActivity from '../models/CoCurricularActivity';
import ExtraCurricularActivity from '../models/ExtraCurricularActivity';
import PhysicalFitnessActivity from '../models/PhysicalFitnessActivity';
import CodingChallenge from '../models/CodingChallenge';
import LeadershipActivity from '../models/LeadershipActivity';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vfstr_aeps';

const checkStudentData = async () => {
  try {
    if (MONGODB_URI.startsWith('mongodb+srv://')) {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    }
    await mongoose.connect(MONGODB_URI);
    console.log('📡 Connected to MongoDB.');

    const rollNumber = '231FA04864';
    const student = await Student.findOne({ rollNumber });
    if (!student) {
      console.log(`❌ Student with Roll Number ${rollNumber} not found.`);
      await mongoose.disconnect();
      return;
    }

    console.log(`\nFound student: ${student.rollNumber} - ID: ${student._id}`);

    // Query all collections
    const achievements = await Achievement.find({ studentId: student._id } as any).lean();
    const certifications = await Certification.find({ studentId: student._id } as any).lean();
    const cambridge = await CambridgeCertification.find({ studentId: student._id } as any).lean();
    const cocurricular = await CoCurricularActivity.find({ studentId: student._id } as any).lean();
    const extracurricular = await ExtraCurricularActivity.find({ studentId: student._id } as any).lean();
    const fitness = await PhysicalFitnessActivity.find({ studentId: student._id } as any).lean();
    const coding = await CodingChallenge.find({ studentId: student._id } as any).lean();
    const leadership = await LeadershipActivity.find({ studentId: student._id } as any).lean();

    console.log(`\n--- Document counts for student ${rollNumber} ---`);
    console.log(`- Achievement collection: ${achievements.length}`);
    console.log(`- Certification collection: ${certifications.length}`);
    console.log(`- CambridgeCertification collection: ${cambridge.length}`);
    console.log(`- CoCurricularActivity collection: ${cocurricular.length}`);
    console.log(`- ExtraCurricularActivity collection: ${extracurricular.length}`);
    console.log(`- PhysicalFitnessActivity collection: ${fitness.length}`);
    console.log(`- CodingChallenge collection: ${coding.length}`);
    console.log(`- LeadershipActivity collection: ${leadership.length}`);

    if (achievements.length > 0) {
      console.log('\n--- Details of Achievements ---');
      achievements.forEach((ach: any) => {
        console.log(`  - Title: "${ach.title}", Type: ${ach.type}, Status: ${ach.status}`);
      });
    }
    if (certifications.length > 0) {
      console.log('\n--- Details of Certifications ---');
      certifications.forEach((c: any) => {
        console.log(`  - Name: "${c.name}", Status: ${c.status}`);
      });
    }
    if (cocurricular.length > 0) {
      console.log('\n--- Details of Co-Curricular Activities ---');
      cocurricular.forEach((c: any) => {
        console.log(`  - Title: "${c.activityTitle}", Status: ${c.status}`);
      });
    }

    console.log('');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error running check-student-achievements:', error);
  }
};

checkStudentData();
