import mongoose from 'mongoose';
import Student from '../models/Student';
import Academic from '../models/Academic';
import Attendance from '../models/Attendance';
import Achievement from '../models/Achievement';
import CommunicationScore from '../models/CommunicationScore';
import ActivityScore from '../models/ActivityScore';
import ProjectScore from '../models/ProjectScore';
import CodingChallengeScore from '../models/CodingChallengeScore';
import LeadershipScore from '../models/LeadershipScore';
import CoCurricularScore from '../models/CoCurricularScore';
import ExtraCurricularScore from '../models/ExtraCurricularScore';
import PhysicalFitnessScore from '../models/PhysicalFitnessScore';
import CertificationScore from '../models/CertificationScore';

// Exact weights from main table
const weights: Record<number, Record<string, number>> = {
  1: {
    cgpa: 35,
    attendance: 10,
    communication: 10,
    coding: 10,
    extracurricular: 10,
    certifications: 5,
    projects: 5,
    cocurricular: 5,
    leadership: 5,
    sports: 5,
    publications: 0,
    crtAttendance: 0,
    crtPerformance: 0,
    placementPrep: 0
  },
  2: {
    cgpa: 30,
    attendance: 10,
    communication: 10,
    coding: 10,
    extracurricular: 5,
    certifications: 5,
    projects: 5,
    cocurricular: 5,
    leadership: 5,
    sports: 5,
    publications: 5,
    crtAttendance: 5,
    crtPerformance: 0,
    placementPrep: 0
  },
  3: {
    cgpa: 25,
    attendance: 5,
    communication: 5,
    coding: 5,
    extracurricular: 5,
    certifications: 10,
    projects: 10,
    cocurricular: 5,
    leadership: 5,
    sports: 0,
    publications: 10,
    crtAttendance: 5,
    crtPerformance: 10,
    placementPrep: 0
  },
  4: {
    cgpa: 20,
    attendance: 0,
    communication: 5,
    coding: 5,
    extracurricular: 5,
    certifications: 10,
    projects: 15,
    cocurricular: 5,
    leadership: 0,
    sports: 0,
    publications: 10,
    crtAttendance: 5,
    crtPerformance: 10,
    placementPrep: 10
  }
};

// Percentage lookup calculators
const getCgpaLookupPct = (cgpa: number): number => {
  if (cgpa > 9.0) return 100;
  if (cgpa >= 8.5) return 90;
  if (cgpa >= 8.0) return 80;
  if (cgpa >= 7.5) return 70;
  if (cgpa >= 7.0) return 60;
  return 50; // < 7.0
};

const getAttendanceLookupPct = (pct: number): number => {
  if (pct > 90) return 100;
  if (pct >= 80) return 90;
  if (pct >= 75) return 80;
  if (pct >= 70) return 70;
  if (pct >= 65) return 60;
  return 50; // < 65
};

const getCrtAttendanceMult = (pct: number): number => {
  if (pct > 90) return 1.0;
  if (pct >= 80) return 0.8;
  if (pct >= 70) return 0.6;
  return 0.5; // < 70
};

const getCrtPerformanceMult = (score: number): number => {
  if (score > 90) return 1.0;
  if (score >= 80) return 0.9;
  if (score >= 70) return 0.8;
  if (score >= 60) return 0.7;
  return 0.0; // < 60
};

// Extracurricular/Co-curricular Level Lookup
const getLevelPoints = (title: string, desc: string): number => {
  const text = `${title} ${desc}`.toLowerCase();
  if (text.includes('national') || text.includes('international')) return 5;
  if (text.includes('zonal')) return 4;
  if (text.includes('inter-university') || text.includes('inter university')) return 3;
  if (text.includes('institute') || text.includes('university') || text.includes('college')) return 2;
  if (text.includes('department') || text.includes('dept')) return 1;
  return 1; // Default
};

// Simple in-memory cache for student overall scores (30-second TTL)
const scoreCache = new Map<string, { data: any; expiry: number }>();

export const clearScoreCache = (studentId: string) => {
  scoreCache.delete(studentId);
};

/**
 * Calculates student score breakdown for a specific academic year.
 */
export const calculateYearScore = async (
  studentId: string,
  year: number
): Promise<{ year: number; score: number; breakdown: Record<string, number> }> => {
  if (year < 1 || year > 4) {
    throw new Error('Year must be between 1 and 4');
  }

  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error('Student not found');
  }

  // Define isolated date ranges for the target year
  const rollNumber = student.rollNumber;
  const match = rollNumber.match(/^(\d{2})/);
  const admissionYear = match ? 2000 + parseInt(match[1]) : new Date().getFullYear() - 3;

  const startDate = new Date(`${admissionYear + year - 1}-07-01T00:00:00.000Z`);
  const endDate = new Date(`${admissionYear + year}-06-30T23:59:59.999Z`);
  const semesters = [2 * year - 1, 2 * year];

  const yearWeights = weights[year];

  // Execute all fetches in parallel
  const [
    achievements,
    academicRecords,
    attendanceRecords,
    commScoreRecord,
    codingScoreRecord,
    actScoreRecord,
    certScoreRecord,
    projectScoreRecord,
    coScoreRecord,
    leadershipScoreRecord,
    sportsScoreRecord
  ] = await Promise.all([
    Achievement.find({ studentId, status: 'VERIFIED', date: { $gte: startDate, $lte: endDate } }),
    Academic.find({ studentId, semester: { $in: semesters } }),
    Attendance.find({ studentId, semester: { $in: semesters } }),
    yearWeights.communication > 0 ? CommunicationScore.findOne({ studentId, academicYear: year } as any) : null,
    yearWeights.coding > 0 ? CodingChallengeScore.findOne({ studentId, academicYear: year } as any) : null,
    yearWeights.extracurricular > 0 ? ExtraCurricularScore.findOne({ studentId, academicYear: year } as any) : null,
    yearWeights.certifications > 0 ? CertificationScore.findOne({ studentId, academicYear: year } as any) : null,
    yearWeights.projects > 0 ? ProjectScore.findOne({ studentId, academicYear: year } as any) : null,
    yearWeights.cocurricular > 0 ? CoCurricularScore.findOne({ studentId, academicYear: year } as any) : null,
    yearWeights.leadership > 0 ? LeadershipScore.findOne({ studentId, academicYear: year } as any) : null,
    yearWeights.sports > 0 ? PhysicalFitnessScore.findOne({ studentId, academicYear: year } as any) : null
  ]);

  const breakdown: Record<string, number> = {};

  // ----------------------------------------------------
  // Category 1: CGPA (Percentage-Based)
  // ----------------------------------------------------
  if (yearWeights.cgpa > 0) {
    const cgpas = academicRecords.map(r => r.sgpa).filter(Boolean);
    const avgCgpa = cgpas.length > 0 ? cgpas.reduce((a, b) => a + b, 0) / cgpas.length : 0;
    const lookupPct = getCgpaLookupPct(avgCgpa);
    breakdown.cgpa = Number(((lookupPct / 100) * yearWeights.cgpa).toFixed(2));
  } else {
    breakdown.cgpa = 0;
  }

  // ----------------------------------------------------
  // Category 2: Attendance (Percentage-Based)
  // ----------------------------------------------------
  if (yearWeights.attendance > 0) {
    const totalClasses = attendanceRecords.reduce((acc, curr) => acc + curr.total, 0);
    const totalAttended = attendanceRecords.reduce((acc, curr) => acc + curr.attended, 0);
    const attendancePct = totalClasses > 0 ? (totalAttended / totalClasses) * 100 : 0;
    const lookupPct = getAttendanceLookupPct(attendancePct);
    breakdown.attendance = Number(((lookupPct / 100) * yearWeights.attendance).toFixed(2));
  } else {
    breakdown.attendance = 0;
  }

  // ----------------------------------------------------
  // Category 3: Communication Skills
  // ----------------------------------------------------
  breakdown.communication = (yearWeights.communication > 0 && commScoreRecord) ? commScoreRecord.score : 0;

  // ----------------------------------------------------
  // Category 4: Coding / Hackathons
  // ----------------------------------------------------
  breakdown.coding = (yearWeights.coding > 0 && codingScoreRecord) ? codingScoreRecord.score : 0;

  // ----------------------------------------------------
  // Category 5: Extra-Curricular
  // ----------------------------------------------------
  breakdown.extracurricular = (yearWeights.extracurricular > 0 && actScoreRecord) ? actScoreRecord.score : 0;

  // ----------------------------------------------------
  // Category 6: Certifications
  // ----------------------------------------------------
  breakdown.certifications = (yearWeights.certifications > 0 && certScoreRecord) ? Math.min(certScoreRecord.score, yearWeights.certifications) : 0;

  // ----------------------------------------------------
  // Category 7: Projects
  // ----------------------------------------------------
  breakdown.projects = (yearWeights.projects > 0 && projectScoreRecord) ? Math.min(projectScoreRecord.score, yearWeights.projects) : 0;

  // ----------------------------------------------------
  // Category 8: Co-Curricular
  // ----------------------------------------------------
  breakdown.cocurricular = (yearWeights.cocurricular > 0 && coScoreRecord) ? coScoreRecord.score : 0;

  // ----------------------------------------------------
  // Category 9: Leadership
  // ----------------------------------------------------
  breakdown.leadership = (yearWeights.leadership > 0 && leadershipScoreRecord) ? leadershipScoreRecord.score : 0;

  // ----------------------------------------------------
  // Category 10: Sports
  // ----------------------------------------------------
  breakdown.sports = (yearWeights.sports > 0 && sportsScoreRecord) ? sportsScoreRecord.score : 0;

  // ----------------------------------------------------
  // Category 11: Publications / Internship
  // ----------------------------------------------------
  if (yearWeights.publications > 0) {
    let pubPoints = 0;
    achievements.forEach(ach => {
      if (ach.type === 'RESEARCH_PAPER' || ach.type === 'INTERNSHIP') {
        pubPoints += 5;
      }
    });
    breakdown.publications = Math.min(pubPoints, yearWeights.publications);
  } else {
    breakdown.publications = 0;
  }

  // ----------------------------------------------------
  // Category 12: CRT Attendance
  // ----------------------------------------------------
  if (yearWeights.crtAttendance > 0) {
    const crtAttends = academicRecords.map(r => r.crtAttendance).filter(val => val !== undefined && val !== null);
    const avgCrtAtt = crtAttends.length > 0 ? crtAttends.reduce((a, b) => a + b, 0) / crtAttends.length : 0;
    const multiplier = getCrtAttendanceMult(avgCrtAtt);
    breakdown.crtAttendance = Number((multiplier * yearWeights.crtAttendance).toFixed(2));
  } else {
    breakdown.crtAttendance = 0;
  }

  // ----------------------------------------------------
  // Category 13: CRT Performance
  // ----------------------------------------------------
  if (yearWeights.crtPerformance > 0) {
    const crtPerfList = academicRecords.map(r => r.crtPerformance).filter(val => val !== undefined && val !== null);
    const avgCrtPerf = crtPerfList.length > 0 ? crtPerfList.reduce((a, b) => a + b, 0) / crtPerfList.length : 0;
    const multiplier = getCrtPerformanceMult(avgCrtPerf);
    breakdown.crtPerformance = Number((multiplier * yearWeights.crtPerformance).toFixed(2));
  } else {
    breakdown.crtPerformance = 0;
  }

  // ----------------------------------------------------
  // Category 14: GRE / TOEFL / GATE / Placement
  // ----------------------------------------------------
  if (yearWeights.placementPrep > 0) {
    const hasPrep = achievements.some(ach => {
      const text = `${ach.title} ${ach.description}`.toLowerCase();
      return text.match(/gre|gate|toefl|ielts|placement|offer letter|selected|hired/i);
    });
    breakdown.placementPrep = hasPrep ? yearWeights.placementPrep : 0;
  } else {
    breakdown.placementPrep = 0;
  }

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return {
    year,
    score: Number(score.toFixed(2)),
    breakdown
  };
};

/**
 * Calculates overall score as average of completed year scores.
 */
export const calculateOverallScore = async (
  studentId: string
): Promise<{ overallScore: number; yearScores: any[] }> => {
  const cacheKey = studentId;
  const cached = scoreCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error('Student not found');
  }

  // Find all active semesters in academic records
  const academicSemesters = await Academic.find({ studentId }).distinct('semester');
  if (academicSemesters.length === 0) {
    const result = { overallScore: 0, yearScores: [] };
    scoreCache.set(cacheKey, { data: result, expiry: Date.now() + 30000 });
    return result;
  }

  const completedYears: number[] = [];
  if (academicSemesters.some(s => s === 1 || s === 2)) completedYears.push(1);
  if (academicSemesters.some(s => s === 3 || s === 4)) completedYears.push(2);
  if (academicSemesters.some(s => s === 5 || s === 6)) completedYears.push(3);
  if (academicSemesters.some(s => s === 7 || s === 8)) completedYears.push(4);

  // Run year calculations in parallel
  const yearScores = await Promise.all(
    completedYears.map(year => calculateYearScore(studentId, year))
  );

  const sumScores = yearScores.reduce((acc, curr) => acc + curr.score, 0);
  const overallScore = yearScores.length > 0 ? Number((sumScores / yearScores.length).toFixed(2)) : 0;

  const result = {
    overallScore,
    yearScores
  };

  // Save to Student document in database
  await Student.updateOne(
    { _id: studentId },
    { $set: { overallScore, yearScores } }
  );

  // Cache overall score for 30 seconds
  scoreCache.set(cacheKey, { data: result, expiry: Date.now() + 30000 });

  return result;
};

// Register background recalculation event listener
import { scoreEvents } from '../utils/eventEmitter';
scoreEvents.on('recalculateScore', (studentId: string) => {
  scoreCache.delete(studentId);
  calculateOverallScore(studentId).catch((err: any) => {
    console.error(`[ScoreEvent] Failed to recalculate score for student ${studentId}: ${err.message}`);
  });
});
