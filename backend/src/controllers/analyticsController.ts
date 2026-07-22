import { Response } from 'express';
import Student from '../models/Student';
import Academic from '../models/Academic';
import Attendance from '../models/Attendance';
import Achievement from '../models/Achievement';
import Profile from '../models/Profile';
import Company from '../models/Company';
import User from '../models/User';
import Project from '../models/Project';
import CodingChallenge from '../models/CodingChallenge';
import LeadershipActivity from '../models/LeadershipActivity';
import CoCurricularActivity from '../models/CoCurricularActivity';
import ExtraCurricularActivity from '../models/ExtraCurricularActivity';
import PhysicalFitnessActivity from '../models/PhysicalFitnessActivity';
import CambridgeCertification from '../models/CambridgeCertification';
import Certification from '../models/Certification';
import CertificationScore from '../models/CertificationScore';
import CodingChallengeScore from '../models/CodingChallengeScore';
import ProjectScore from '../models/ProjectScore';
import LeadershipScore from '../models/LeadershipScore';
import CommunicationScore from '../models/CommunicationScore';
import CoCurricularScore from '../models/CoCurricularScore';
import ExtraCurricularScore from '../models/ExtraCurricularScore';
import PhysicalFitnessScore from '../models/PhysicalFitnessScore';
import { AuthenticatedRequest } from '../middleware/auth';

// Helper to calculate CGPA
const calculateCGPA = (academics: any[]): number => {
  if (!academics || academics.length === 0) return 0;
  const sum = academics.reduce((acc, curr) => acc + curr.sgpa, 0);
  return Number((sum / academics.length).toFixed(2));
};

// Helper to calculate overall attendance percentage
const calculateAttendancePct = (attendance: any[]): number => {
  if (!attendance || attendance.length === 0) return 0;
  const totalAttended = attendance.reduce((acc, curr) => acc + curr.attended, 0);
  const totalClasses = attendance.reduce((acc, curr) => acc + curr.total, 0);
  if (totalClasses === 0) return 0;
  return Number(((totalAttended / totalClasses) * 100).toFixed(1));
};

// @desc    Get dashboard metrics for logged-in student
// @route   GET /api/analytics/student/dashboard
// @access  Private (Student)
export const getStudentDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      res.status(404).json({ message: 'Student profile not found.' });
      return;
    }

    const academicYearHeader = req.headers['x-academic-year'];
    const academicYear = academicYearHeader ? Number(academicYearHeader) : (student.year || 1);
    const semestersOfActiveYear = [(academicYear * 2) - 1, academicYear * 2];

    const profile = await Profile.findOne({ studentId: student._id });
    const academics = await Academic.find({ studentId: student._id }).sort({ semester: 1 });
    const attendance = await Attendance.find({ studentId: student._id });
    const achievements = await Achievement.find({ studentId: student._id }).sort({ date: -1 });

    const cgpa = calculateCGPA(academics);
    
    // Calculate attendance percentage for the active academic year semesters
    const activeYearAttendance = attendance.filter((a) => semestersOfActiveYear.includes(a.semester));
    const attendancePct = calculateAttendancePct(activeYearAttendance.length > 0 ? activeYearAttendance : attendance);

    const activeBacklogs = academics.reduce((acc, curr) => acc + (curr.activeBacklogs || 0), 0);

    // Prepare chart: GPA progression up to the active academic year
    const gpaProgression = academics
      .filter((sem) => sem.semester <= academicYear * 2)
      .map((sem) => ({
        semester: sem.semester,
        sgpa: sem.sgpa,
        gpa: sem.sgpa,
      }));

    // Prepare chart: Subject-wise attendance for the active academic year (grouped by subject code to remove duplicates)
    const attendanceMap = new Map<string, { subjectCode: string, name: string, attended: number, total: number }>();
    for (const sub of activeYearAttendance) {
      const code = sub.subjectCode;
      const existing = attendanceMap.get(code);
      if (existing) {
        existing.attended += sub.attended;
        existing.total += sub.total;
      } else {
        attendanceMap.set(code, {
          subjectCode: code,
          name: sub.subjectName,
          attended: sub.attended,
          total: sub.total,
        });
      }
    }

    const subjectAttendance = Array.from(attendanceMap.values()).map((sub) => ({
      subject: sub.subjectCode,
      subjectCode: sub.subjectCode,
      name: sub.name,
      attended: sub.attended,
      total: sub.total,
      percentage: Number(((sub.attended / sub.total) * 100).toFixed(1)),
      attendancePct: Number(((sub.attended / sub.total) * 100).toFixed(1)),
    }));

    // Prepare achievement statistics
    const achievementsByType = achievements.reduce((acc: any, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      summary: {
        cgpa,
        attendancePct,
        activeBacklogs,
        profileCompletion: profile?.profileCompletion || 0,
        achievementsCount: achievements.length,
        verifiedAchievementsCount: achievements.filter(a => a.status === 'VERIFIED').length,
        hasResume: !!profile?.resumeUrl,
      },
      charts: {
        gpaProgression,
        subjectAttendance,
        achievementsByType,
      },
      recentAchievements: achievements.slice(0, 5),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard metrics for faculty member
// @route   GET /api/analytics/faculty/dashboard
// @access  Private (Faculty, HOD, Admin)
export const getFacultyDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // 1. Total Student Count
    const totalStudents = await Student.countDocuments({});

    // 2. Pending Verification Count
    const [
      pendingAchievementsCount,
      pendingProjectsCount,
      pendingCodingChallengesCount,
      pendingLeadershipCount,
      pendingCoCurricularCount,
      pendingExtraCurricularCount,
      pendingPhysicalFitnessCount,
    ] = await Promise.all([
      Achievement.countDocuments({ status: 'PENDING' }),
      Project.countDocuments({ status: 'PENDING' }),
      CodingChallenge.countDocuments({ status: 'PENDING' }),
      LeadershipActivity.countDocuments({ status: 'PENDING' }),
      CoCurricularActivity.countDocuments({ status: 'PENDING' }),
      ExtraCurricularActivity.countDocuments({ status: 'PENDING' }),
      PhysicalFitnessActivity.countDocuments({ status: 'PENDING' }),
    ]);
    const pendingVerificationsCount =
      pendingAchievementsCount +
      pendingProjectsCount +
      pendingCodingChallengesCount +
      pendingLeadershipCount +
      pendingCoCurricularCount +
      pendingExtraCurricularCount +
      pendingPhysicalFitnessCount;

    // 3. Find at-risk students: Attendance < 75% or CGPA < 6.0
    // We will aggregate records to find students who match this
    const allStudents = await Student.find({}).populate('userId', 'name email').lean();
    const studentIds = allStudents.map(s => s._id);

    // Bulk fetch all academics and attendance
    const allAcademics = await Academic.find({ studentId: { $in: studentIds } }).select('studentId sgpa activeBacklogs rGradeCount iGradeCount').lean();
    const allAttendance = await Attendance.find({ studentId: { $in: studentIds } }).select('studentId attended total').lean();

    const academicsMap = new Map<string, any[]>();
    for (const ac of allAcademics) {
      const sid = ac.studentId.toString();
      if (!academicsMap.has(sid)) academicsMap.set(sid, []);
      academicsMap.get(sid)!.push(ac);
    }

    const attendanceMap = new Map<string, any[]>();
    for (const att of allAttendance) {
      const sid = att.studentId.toString();
      if (!attendanceMap.has(sid)) attendanceMap.set(sid, []);
      attendanceMap.get(sid)!.push(att);
    }

    const atRiskStudents = [];

    const gradeDistribution = { excellent: 0, good: 0, average: 0, poor: 0 };
    const attendanceRisk = { safe: 0, risk: 0 };

    for (const student of allStudents) {
      const sidStr = student._id.toString();
      const studentAttendance = attendanceMap.get(sidStr) || [];
      const attendancePct = calculateAttendancePct(studentAttendance);

      const studentAcademics = academicsMap.get(sidStr) || [];
      const cgpa = calculateCGPA(studentAcademics);
      const activeBacklogs = studentAcademics.reduce((acc, curr) => acc + (curr.activeBacklogs || 0), 0);

      const isLowAttendance = studentAttendance.length > 0 && attendancePct < 75;
      const isLowGPA = studentAcademics.length > 0 && cgpa < 6.0;
      const hasBacklogs = activeBacklogs > 0;

      if (studentAcademics.length > 0) {
        if (cgpa >= 8.5) gradeDistribution.excellent++;
        else if (cgpa >= 7.0) gradeDistribution.good++;
        else if (cgpa >= 5.0) gradeDistribution.average++;
        else gradeDistribution.poor++;
      }
      if (studentAttendance.length > 0) {
        if (attendancePct >= 75) attendanceRisk.safe++;
        else attendanceRisk.risk++;
      }

      if (isLowAttendance || isLowGPA || hasBacklogs) {
        atRiskStudents.push({
          id: student._id,
          name: (student.userId as any)?.name || 'Unknown',
          rollNumber: student.rollNumber,
          branch: student.branch,
          department: student.department,
          year: student.year,
          section: student.section,
          attendancePct,
          cgpa,
          activeBacklogs,
          riskFactors: [
            isLowAttendance ? 'Low Attendance' : null,
            isLowGPA ? 'Low CGPA' : null,
            hasBacklogs ? 'Active Backlogs' : null,
          ].filter(Boolean),
        });
      }
    }

    res.status(200).json({
      summary: {
        totalStudents,
        pendingVerificationsCount,
        atRiskStudentsCount: atRiskStudents.length,
      },
      atRiskStudents: atRiskStudents.slice(0, 10), // Limit dashboard display
      charts: {
        gradeDistribution,
        attendanceRisk,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard metrics for HOD (department metrics)
// @route   GET /api/analytics/hod/dashboard
// @access  Private (HOD, Admin)
export const getHODDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { department, year } = req.query;

    const filter: any = {};
    if (department) filter.department = department;
    if (year) filter.year = Number(year);

    const students = await Student.find(filter).populate('userId', 'name email').lean();
    const studentIds = students.map(s => s._id);
    const studentIdsSet = new Set(studentIds.map(id => id.toString()));

    const targetSemesters = year ? [Number(year) * 2 - 1, Number(year) * 2] : [];

    const [
      allAcademics,
      allAttendance,
      allAchievements,
      allCertifications,
      allProjects,
      allCambridge,
      allCoCurricular,
      allExtraCurricular,
      allSports,
      allCoding,
      allLeadership,
      certScores,
      codingScores,
      projScores,
      leadScores,
      commScores,
      coScores,
      extraScores,
      fitScores,
      companies
    ] = await Promise.all([
      Academic.find({ studentId: { $in: studentIds } } as any).lean(),
      Attendance.find({ studentId: { $in: studentIds } } as any).lean(),
      Achievement.find({ studentId: { $in: studentIds } } as any).lean(),
      Certification.find({ studentId: { $in: studentIds } } as any).lean(),
      Project.find({ studentId: { $in: studentIds } } as any).lean(),
      CambridgeCertification.find({ studentId: { $in: studentIds } } as any).lean(),
      CoCurricularActivity.find({ studentId: { $in: studentIds } } as any).lean(),
      ExtraCurricularActivity.find({ studentId: { $in: studentIds } } as any).lean(),
      PhysicalFitnessActivity.find({ studentId: { $in: studentIds } } as any).lean(),
      CodingChallenge.find({ studentId: { $in: studentIds } } as any).lean(),
      LeadershipActivity.find({ studentId: { $in: studentIds } } as any).lean(),
      CertificationScore.find({ studentId: { $in: studentIds } } as any).lean(),
      CodingChallengeScore.find({ studentId: { $in: studentIds } } as any).lean(),
      ProjectScore.find({ studentId: { $in: studentIds } } as any).lean(),
      LeadershipScore.find({ studentId: { $in: studentIds } } as any).lean(),
      CommunicationScore.find({ studentId: { $in: studentIds } } as any).lean(),
      CoCurricularScore.find({ studentId: { $in: studentIds } } as any).lean(),
      ExtraCurricularScore.find({ studentId: { $in: studentIds } } as any).lean(),
      PhysicalFitnessScore.find({ studentId: { $in: studentIds } } as any).lean(),
      Company.find({}).lean()
    ]);

    const extraCurricularList = allExtraCurricular as any[];
    const leadershipList = allLeadership as any[];
    const certificationsList = allCertifications as any[];

    const academicsMap = new Map<string, any[]>();
    allAcademics.forEach(ac => {
      if (year && !targetSemesters.includes(ac.semester)) return;
      const sid = ac.studentId.toString();
      if (!academicsMap.has(sid)) academicsMap.set(sid, []);
      academicsMap.get(sid)!.push(ac);
    });

    const attendanceMap = new Map<string, any[]>();
    allAttendance.forEach(att => {
      if (year && !targetSemesters.includes(att.semester)) return;
      const sid = att.studentId.toString();
      if (!attendanceMap.has(sid)) attendanceMap.set(sid, []);
      attendanceMap.get(sid)!.push(att);
    });

    const achievementsMap = new Map<string, any[]>();
    allAchievements.forEach(ach => {
      const sid = ach.studentId.toString();
      if (!achievementsMap.has(sid)) achievementsMap.set(sid, []);
      achievementsMap.get(sid)!.push(ach);
    });

    const certScoresMap = new Map<string, any>();
    certScores.forEach(c => certScoresMap.set(`${c.studentId.toString()}-${c.academicYear}`, c));

    const codingScoresMap = new Map<string, any>();
    codingScores.forEach(c => codingScoresMap.set(`${c.studentId.toString()}-${c.academicYear}`, c));

    const projScoresMap = new Map<string, any>();
    projScores.forEach(p => projScoresMap.set(`${p.studentId.toString()}-${p.academicYear}`, p));

    const leadScoresMap = new Map<string, any>();
    leadScores.forEach(l => leadScoresMap.set(`${l.studentId.toString()}-${l.academicYear}`, l));

    const commScoresMap = new Map<string, any>();
    commScores.forEach(c => commScoresMap.set(`${c.studentId.toString()}-${c.academicYear}`, c));

    const coScoresMap = new Map<string, any>();
    coScores.forEach(c => coScoresMap.set(`${c.studentId.toString()}-${c.academicYear}`, c));

    const extraScoresMap = new Map<string, any>();
    extraScores.forEach(e => extraScoresMap.set(`${e.studentId.toString()}-${e.academicYear}`, e));

    const fitScoresMap = new Map<string, any>();
    fitScores.forEach(f => fitScoresMap.set(`${f.studentId.toString()}-${f.academicYear}`, f));

    const weights: Record<number, Record<string, number>> = {
      1: { cgpa: 35, attendance: 10, communication: 10, coding: 10, extracurricular: 10, certifications: 5, projects: 5, cocurricular: 5, leadership: 5, sports: 5, publications: 0, crtAttendance: 0, crtPerformance: 0, placementPrep: 0 },
      2: { cgpa: 30, attendance: 10, communication: 10, coding: 10, extracurricular: 5, certifications: 5, projects: 5, cocurricular: 5, leadership: 5, sports: 5, publications: 5, crtAttendance: 5, crtPerformance: 0, placementPrep: 0 },
      3: { cgpa: 25, attendance: 5, communication: 5, coding: 5, extracurricular: 5, certifications: 10, projects: 10, cocurricular: 5, leadership: 5, sports: 0, publications: 10, crtAttendance: 5, crtPerformance: 10, placementPrep: 0 },
      4: { cgpa: 20, attendance: 0, communication: 5, coding: 5, extracurricular: 5, certifications: 10, projects: 15, cocurricular: 5, leadership: 0, sports: 0, publications: 10, crtAttendance: 5, crtPerformance: 10, placementPrep: 10 }
    };

    const getCgpaLookupPct = (cgpa: number): number => {
      if (cgpa > 9.0) return 100;
      if (cgpa >= 8.5) return 90;
      if (cgpa >= 8.0) return 80;
      if (cgpa >= 7.5) return 70;
      if (cgpa >= 7.0) return 60;
      return 50;
    };

    const getAttendanceLookupPct = (pct: number): number => {
      if (pct > 90) return 100;
      if (pct >= 80) return 90;
      if (pct >= 75) return 80;
      if (pct >= 70) return 70;
      if (pct >= 65) return 60;
      return 50;
    };

    const getCrtAttendanceMult = (pct: number): number => {
      if (pct > 90) return 1.0;
      if (pct >= 80) return 0.8;
      if (pct >= 70) return 0.6;
      return 0.5;
    };

    const getCrtPerformanceMult = (score: number): number => {
      if (score > 90) return 1.0;
      if (score >= 80) return 0.9;
      if (score >= 70) return 0.8;
      if (score >= 60) return 0.7;
      return 0.0;
    };

    const computeYearScoreVal = (sId: string, roll: string, y: number) => {
      const semesters = [2 * y - 1, 2 * y];
      const studentAc = academicsMap.get(sId)?.filter(ac => semesters.includes(ac.semester)) || [];
      const studentAtt = attendanceMap.get(sId)?.filter(att => semesters.includes(att.semester)) || [];

      const match = roll.match(/^(\d{2})/);
      const admissionYear = match ? 2000 + parseInt(match[1]) : new Date().getFullYear() - 3;
      const startDate = new Date(`${admissionYear + y - 1}-07-01T00:00:00.000Z`);
      const endDate = new Date(`${admissionYear + y}-06-30T23:59:59.999Z`);

      const studentAch = achievementsMap.get(sId)?.filter(ach => ach.date >= startDate && ach.date <= endDate) || [];

      const yearWeights = weights[y];
      const breakdown: Record<string, number> = {};

      if (yearWeights.cgpa > 0) {
        const sgpas = studentAc.map(r => r.sgpa).filter(Boolean);
        const avgCgpa = sgpas.length > 0 ? sgpas.reduce((a, b) => a + b, 0) / sgpas.length : 0;
        const lookupPct = getCgpaLookupPct(avgCgpa);
        breakdown.cgpa = Number(((lookupPct / 100) * yearWeights.cgpa).toFixed(2));
      } else {
        breakdown.cgpa = 0;
      }

      if (yearWeights.attendance > 0) {
        const totalClasses = studentAtt.reduce((acc, curr) => acc + curr.total, 0);
        const totalAttended = studentAtt.reduce((acc, curr) => acc + curr.attended, 0);
        const attendancePct = totalClasses > 0 ? (totalAttended / totalClasses) * 100 : 0;
        const lookupPct = getAttendanceLookupPct(attendancePct);
        breakdown.attendance = Number(((lookupPct / 100) * yearWeights.attendance).toFixed(2));
      } else {
        breakdown.attendance = 0;
      }

      breakdown.communication = yearWeights.communication > 0 ? (commScoresMap.get(`${sId}-${y}`)?.score || 0) : 0;
      breakdown.coding = yearWeights.coding > 0 ? (codingScoresMap.get(`${sId}-${y}`)?.score || 0) : 0;
      breakdown.extracurricular = yearWeights.extracurricular > 0 ? (extraScoresMap.get(`${sId}-${y}`)?.score || 0) : 0;
      breakdown.certifications = yearWeights.certifications > 0 ? Math.min(certScoresMap.get(`${sId}-${y}`)?.score || 0, yearWeights.certifications) : 0;
      breakdown.projects = yearWeights.projects > 0 ? Math.min(projScoresMap.get(`${sId}-${y}`)?.score || 0, yearWeights.projects) : 0;
      breakdown.cocurricular = yearWeights.cocurricular > 0 ? (coScoresMap.get(`${sId}-${y}`)?.score || 0) : 0;
      breakdown.leadership = yearWeights.leadership > 0 ? (leadScoresMap.get(`${sId}-${y}`)?.score || 0) : 0;
      breakdown.sports = yearWeights.sports > 0 ? (fitScoresMap.get(`${sId}-${y}`)?.score || 0) : 0;

      if (yearWeights.publications > 0) {
        let pubPoints = 0;
        studentAch.forEach(ach => {
          if (ach.type === 'RESEARCH_PAPER' || ach.type === 'INTERNSHIP') pubPoints += 5;
        });
        breakdown.publications = Math.min(pubPoints, yearWeights.publications);
      } else {
        breakdown.publications = 0;
      }

      if (yearWeights.crtAttendance > 0) {
        const crtAttends = studentAc.map(r => r.crtAttendance).filter(val => val !== undefined && val !== null);
        const avgCrtAtt = crtAttends.length > 0 ? crtAttends.reduce((a, b) => a + b, 0) / crtAttends.length : 0;
        const multiplier = getCrtAttendanceMult(avgCrtAtt);
        breakdown.crtAttendance = Number((multiplier * yearWeights.crtAttendance).toFixed(2));
      } else {
        breakdown.crtAttendance = 0;
      }

      if (yearWeights.crtPerformance > 0) {
        const crtPerfList = studentAc.map(r => r.crtPerformance).filter(val => val !== undefined && val !== null);
        const avgCrtPerf = crtPerfList.length > 0 ? crtPerfList.reduce((a, b) => a + b, 0) / crtPerfList.length : 0;
        const multiplier = getCrtPerformanceMult(avgCrtPerf);
        breakdown.crtPerformance = Number((multiplier * yearWeights.crtPerformance).toFixed(2));
      } else {
        breakdown.crtPerformance = 0;
      }

      if (yearWeights.placementPrep > 0) {
        const hasPrep = studentAch.some(ach => {
          const text = `${ach.title} ${ach.description}`.toLowerCase();
          return text.match(/gre|gate|toefl|ielts|placement|offer letter|selected|hired/i);
        });
        breakdown.placementPrep = hasPrep ? yearWeights.placementPrep : 0;
      } else {
        breakdown.placementPrep = 0;
      }

      const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
      return Number(score.toFixed(2));
    };

    const computeOverallScoreVal = (sId: string, roll: string) => {
      const studentAc = academicsMap.get(sId) || [];
      if (studentAc.length === 0) return 0;
      const studentSemesters = studentAc.map(a => a.semester);

      const completedYears: number[] = [];
      if (studentSemesters.some(s => s === 1 || s === 2)) completedYears.push(1);
      if (studentSemesters.some(s => s === 3 || s === 4)) completedYears.push(2);
      if (studentSemesters.some(s => s === 5 || s === 6)) completedYears.push(3);
      if (studentSemesters.some(s => s === 7 || s === 8)) completedYears.push(4);

      let sum = 0;
      for (const yr of completedYears) {
        sum += computeYearScoreVal(sId, roll, yr);
      }
      return completedYears.length > 0 ? Number((sum / completedYears.length).toFixed(2)) : 0;
    };

    let totalCGPASum = 0;
    let totalAttendancePctSum = 0;
    let studentWithStatsCount = 0;
    let totalBacklogsCount = 0;
    let totalRGrades = 0;
    let totalIGrades = 0;
    let studentCountByYear: any = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let studentsOverPerformance = { excellent: 0, good: 0, average: 0, poor: 0 };
    const cgpaVsAttendance: any[] = [];

    const cgpaBins = { '9-10': 0, '8-9': 0, '7-8': 0, '6-7': 0, '<6': 0 };
    const attendanceBySem: Record<number, { attended: number; total: number }> = {};

    let attHigh = 0, attMod = 0, attGood = 0;
    let cgpaHigh = 0, cgpaMod = 0, cgpaGood = 0;
    let iHigh = 0, iMod = 0, iGood = 0;
    let rHigh = 0, rMod = 0, rGood = 0;
    let crtHigh = 0, crtMod = 0, crtGood = 0;

    let placedCount = 0;
    let placementReadyCount = 0;

    let certScoreSum = 0, certScoreCount = 0;
    let codingScoreSum = 0, codingScoreCount = 0;
    let projectScoreSum = 0, projectScoreCount = 0;
    let leadershipScoreSum = 0, leadershipScoreCount = 0;
    let commScoreSum = 0, commScoreCount = 0;
    let coScoreSum = 0, coScoreCount = 0;
    let extraScoreSum = 0, extraScoreCount = 0;
    let sportsScoreSum = 0, sportsScoreCount = 0;

    let profileScoreSum = 0;

    for (const student of students) {
      studentCountByYear[student.year] = (studentCountByYear[student.year] || 0) + 1;
      const sIdStr = student._id.toString();

      const studentAc = academicsMap.get(sIdStr) || [];
      const sgpas = studentAc.map(r => r.sgpa).filter(val => val !== undefined && val !== null);
      const cgpa = sgpas.length > 0 ? Number((sgpas.reduce((a, b) => a + b, 0) / sgpas.length).toFixed(2)) : null;

      const activeBacklogs = studentAc.reduce((acc, curr) => acc + (curr.activeBacklogs || 0), 0);
      const rGrades = studentAc.reduce((acc, curr) => acc + (curr.rGradeCount || 0), 0);
      const iGrades = studentAc.reduce((acc, curr) => acc + (curr.iGradeCount || 0), 0);

      totalBacklogsCount += activeBacklogs;
      totalRGrades += rGrades;
      totalIGrades += iGrades;

      const studentAtt = attendanceMap.get(sIdStr) || [];
      const totalClasses = studentAtt.reduce((acc, curr) => acc + curr.total, 0);
      const totalAttended = studentAtt.reduce((acc, curr) => acc + curr.attended, 0);
      const attendancePct = totalClasses > 0 ? Number(((totalAttended / totalClasses) * 100).toFixed(1)) : null;

      studentAtt.forEach(att => {
        if (!attendanceBySem[att.semester]) {
          attendanceBySem[att.semester] = { attended: 0, total: 0 };
        }
        attendanceBySem[att.semester].attended += att.attended;
        attendanceBySem[att.semester].total += att.total;
      });

      if (cgpa !== null) {
        totalCGPASum += cgpa;
        if (cgpa >= 9.0) cgpaBins['9-10']++;
        else if (cgpa >= 8.0) cgpaBins['8-9']++;
        else if (cgpa >= 7.0) cgpaBins['7-8']++;
        else if (cgpa >= 6.0) cgpaBins['6-7']++;
        else cgpaBins['<6']++;

        if (cgpa >= 8.5) studentsOverPerformance.excellent++;
        else if (cgpa >= 7.0) studentsOverPerformance.good++;
        else if (cgpa >= 5.0) studentsOverPerformance.average++;
        else studentsOverPerformance.poor++;
      } else {
        cgpaBins['<6']++;
        studentsOverPerformance.poor++;
      }

      if (attendancePct !== null) {
        totalAttendancePctSum += attendancePct;
      }

      if (cgpa !== null || attendancePct !== null) {
        studentWithStatsCount++;
        if (cgpa !== null && attendancePct !== null) {
          cgpaVsAttendance.push({
            rollNumber: student.rollNumber,
            name: (student.userId as any)?.name || 'Student',
            cgpa,
            attendance: attendancePct,
          });
        }
      }

      let isPlaced = false;
      for (const comp of companies) {
        const applicant = comp.applicants?.find((a: any) => a.studentId.toString() === sIdStr);
        if (applicant && applicant.status === 'SELECTED') {
          isPlaced = true;
          break;
        }
      }
      if (isPlaced) placedCount++;

      const overallProfileScore = computeOverallScoreVal(sIdStr, student.rollNumber);
      profileScoreSum += overallProfileScore;

      const hasBacklogs = activeBacklogs > 0;
      const isLowAttendance = attendancePct !== null && attendancePct < 75;
      const isLowCGPA = cgpa !== null && cgpa < 7.0;
      if (!hasBacklogs && !isLowAttendance && !isLowCGPA && overallProfileScore >= 70) {
        placementReadyCount++;
      }

      if (attendancePct !== null) {
        if (attendancePct < 75) attHigh++;
        else if (attendancePct < 85) attMod++;
        else attGood++;
      } else {
        attGood++;
      }

      if (cgpa !== null) {
        if (cgpa < 6.5) cgpaHigh++;
        else if (cgpa < 7.5) cgpaMod++;
        else cgpaGood++;
      } else {
        cgpaGood++;
      }

      if (iGrades > 2) iHigh++;
      else if (iGrades >= 1) iMod++;
      else iGood++;

      if (rGrades > 1) rHigh++;
      else if (rGrades === 1) rMod++;
      else rGood++;

      const crtPerfs = studentAc.map(r => r.crtPerformance).filter(val => val !== undefined && val !== null);
      const avgCrtPerf = crtPerfs.length > 0 ? crtPerfs.reduce((a, b) => a + b, 0) / crtPerfs.length : 0;
      if (avgCrtPerf > 0) {
        if (avgCrtPerf < 50) crtHigh++;
        else if (avgCrtPerf < 70) crtMod++;
        else crtGood++;
      } else {
        crtGood++;
      }

      const keys = Array.from({ length: 4 }, (_, index) => `${sIdStr}-${index + 1}`);
      keys.forEach(k => {
        const cert = certScoresMap.get(k);
        if (cert) { certScoreSum += cert.score; certScoreCount++; }

        const coding = codingScoresMap.get(k);
        if (coding) { codingScoreSum += coding.score; codingScoreCount++; }

        const proj = projScoresMap.get(k);
        if (proj) { projectScoreSum += proj.score; projectScoreCount++; }

        const lead = leadScoresMap.get(k);
        if (lead) { leadershipScoreSum += lead.score; leadershipScoreCount++; }

        const comm = commScoresMap.get(k);
        if (comm) { commScoreSum += comm.score; commScoreCount++; }

        const co = coScoresMap.get(k);
        if (co) { coScoreSum += co.score; coScoreCount++; }

        const extra = extraScoresMap.get(k);
        if (extra) { extraScoreSum += extra.score; extraScoreCount++; }

        const sports = fitScoresMap.get(k);
        if (sports) { sportsScoreSum += sports.score; sportsScoreCount++; }
      });
    }

    const totalStudents = students.length;
    const avgCGPA = studentWithStatsCount > 0 ? Number((totalCGPASum / studentWithStatsCount).toFixed(2)) : 0;
    const avgAttendance = studentWithStatsCount > 0 ? Number((totalAttendancePctSum / studentWithStatsCount).toFixed(1)) : 0;
    const avgProfileScore = totalStudents > 0 ? Number((profileScoreSum / totalStudents).toFixed(2)) : 0;

    const avgCertificationScore = certScoreCount > 0 ? Number((certScoreSum / certScoreCount).toFixed(2)) : 0;
    const avgCodingScore = codingScoreCount > 0 ? Number((codingScoreSum / codingScoreCount).toFixed(2)) : 0;
    const avgProjectScore = projectScoreCount > 0 ? Number((projectScoreSum / projectScoreCount).toFixed(2)) : 0;
    const avgLeadershipScore = leadershipScoreCount > 0 ? Number((leadershipScoreSum / leadershipScoreCount).toFixed(2)) : 0;
    const avgCommunicationScore = commScoreCount > 0 ? Number((commScoreSum / commScoreCount).toFixed(2)) : 0;
    const avgCoCurricularScore = coScoreCount > 0 ? Number((coScoreSum / coScoreCount).toFixed(2)) : 0;
    const avgExtraCurricularScore = extraScoreCount > 0 ? Number((extraScoreSum / extraScoreCount).toFixed(2)) : 0;
    const avgPhysicalFitnessScore = sportsScoreCount > 0 ? Number((sportsScoreSum / sportsScoreCount).toFixed(2)) : 0;

    const countStatusInArray = (arr: any[], statusList: string[]) => {
      const filtered = arr.filter(item => studentIdsSet.has(item.studentId.toString()));
      return filtered.filter(item => statusList.includes(String(item.status).toUpperCase())).length;
    };

    const pendingApprovals =
      countStatusInArray(allAchievements, ['PENDING', 'UNDER_REVIEW']) +
      countStatusInArray(allCertifications, ['PENDING', 'UNDER_REVIEW']) +
      countStatusInArray(allProjects, ['PENDING', 'UNDER_REVIEW']) +
      countStatusInArray(allCambridge, ['PENDING', 'UNDER_REVIEW']) +
      countStatusInArray(allCoCurricular, ['PENDING', 'UNDER_REVIEW']) +
      countStatusInArray(allExtraCurricular, ['PENDING', 'UNDER_REVIEW']) +
      countStatusInArray(allSports, ['PENDING', 'UNDER_REVIEW']) +
      countStatusInArray(allCoding, ['PENDING', 'UNDER_REVIEW']) +
      countStatusInArray(allLeadership, ['PENDING', 'UNDER_REVIEW']);

    const approvedAchievements =
      countStatusInArray(allAchievements, ['APPROVED', 'VERIFIED']) +
      countStatusInArray(allCertifications, ['APPROVED', 'VERIFIED']) +
      countStatusInArray(allProjects, ['APPROVED', 'VERIFIED']) +
      countStatusInArray(allCambridge, ['APPROVED', 'VERIFIED']) +
      countStatusInArray(allCoCurricular, ['APPROVED', 'VERIFIED']) +
      countStatusInArray(allExtraCurricular, ['APPROVED', 'VERIFIED']) +
      countStatusInArray(allSports, ['APPROVED', 'VERIFIED']) +
      countStatusInArray(allCoding, ['APPROVED', 'VERIFIED']) +
      countStatusInArray(allLeadership, ['APPROVED', 'VERIFIED']);

    const rejectedAchievements =
      countStatusInArray(allAchievements, ['REJECTED']) +
      countStatusInArray(allCertifications, ['REJECTED']) +
      countStatusInArray(allProjects, ['REJECTED']) +
      countStatusInArray(allCambridge, ['REJECTED']) +
      countStatusInArray(allCoCurricular, ['REJECTED']) +
      countStatusInArray(allExtraCurricular, ['REJECTED']) +
      countStatusInArray(allSports, ['REJECTED']) +
      countStatusInArray(allCoding, ['REJECTED']) +
      countStatusInArray(allLeadership, ['REJECTED']);

    const totalAchievements = pendingApprovals + approvedAchievements + rejectedAchievements;

    const totalExtraCurricular = countStatusInArray(allExtraCurricular, ['APPROVED', 'VERIFIED']);
    const totalCoCurricular = countStatusInArray(allCoCurricular, ['APPROVED', 'VERIFIED']);
    const totalSports = countStatusInArray(allSports, ['APPROVED', 'VERIFIED']);

    const totalNssNcc = extraCurricularList.filter(c =>
      studentIdsSet.has(c.studentId.toString()) &&
      ['APPROVED', 'VERIFIED'].includes(String(c.status).toUpperCase()) &&
      String(c.activityName || c.description || '').match(/nss|ncc/i)
    ).length;

    const totalManagerial = leadershipList.filter(c =>
      studentIdsSet.has(c.studentId.toString()) &&
      ['APPROVED', 'VERIFIED'].includes(String(c.status).toUpperCase()) &&
      String(c.role || c.description || '').match(/coordinator|lead|president|secretary/i)
    ).length;

    const starCodersList = new Set<string>();
    codingScores.forEach(c => {
      if (studentIdsSet.has(c.studentId.toString()) && c.score >= 8) {
        starCodersList.add(c.studentId.toString());
      }
    });
    const totalStarCoders = starCodersList.size;

    const totalGreIelts = certificationsList.filter(c =>
      studentIdsSet.has(c.studentId.toString()) &&
      ['APPROVED', 'VERIFIED'].includes(String(c.status).toUpperCase()) &&
      String(c.title || c.issuer || '').match(/gre|ielts|toefl|gate/i)
    ).length;

    const totalCertifications = 
      countStatusInArray(allCertifications, ['APPROVED', 'VERIFIED']) +
      countStatusInArray(allAchievements.filter(a => a.type === 'CERTIFICATION'), ['APPROVED', 'VERIFIED']);
    const totalProjects = 
      countStatusInArray(allProjects, ['APPROVED', 'VERIFIED']) +
      countStatusInArray(allAchievements.filter(a => a.type === 'PROJECT'), ['APPROVED', 'VERIFIED']);

    const crtPerfs = allAcademics.filter(r => studentIdsSet.has(r.studentId.toString())).map(r => r.crtPerformance).filter(val => val !== undefined && val !== null && val > 0);
    const avgCrtPerformance = crtPerfs.length > 0 ? Math.round(crtPerfs.reduce((a, b) => a + b, 0) / crtPerfs.length) : 0;

    const avgProjectScoreScaled = avgProjectScore > 0 ? (avgProjectScore / 15) * 100 : 0;
    const avgCertificationScoreScaled = avgCertificationScore > 0 ? (avgCertificationScore / 10) * 100 : 0;
    const avgCodingScoreScaled = avgCodingScore > 0 ? (avgCodingScore / 10) * 100 : 0;
    const grePct = totalStudents > 0 ? (totalGreIelts / totalStudents) * 100 : 0;

    const employabilityIndex = Math.round(
      (avgCrtPerformance * 0.3) +
      (avgProjectScoreScaled * 0.25) +
      (avgCertificationScoreScaled * 0.2) +
      (avgCodingScoreScaled * 0.1) +
      (grePct * 0.15)
    );

    const employabilityBreakdown = [
      { name: 'CRT Performance', value: Math.round(avgCrtPerformance * 0.3), color: '#3b82f6' },
      { name: 'Projects', value: Math.round(avgProjectScoreScaled * 0.25), color: '#10b981' },
      { name: 'Certifications', value: Math.round(avgCertificationScoreScaled * 0.2), color: '#f59e0b' },
      { name: 'Star Coder', value: Math.round(avgCodingScoreScaled * 0.1), color: '#8b5cf6' },
      { name: 'GRE / IELTS', value: Math.round(grePct * 0.15), color: '#ec4899' }
    ];

    let employabilityLabel = 'Poor';
    if (employabilityIndex >= 85) employabilityLabel = 'Excellent';
    else if (employabilityIndex >= 70) employabilityLabel = 'Good';
    else if (employabilityIndex >= 50) employabilityLabel = 'Average';

    const placementReadiness = totalStudents > 0 ? Math.round((placementReadyCount / totalStudents) * 100) : 0;
    const higherStudiesPct = totalStudents > 0 ? Math.round((totalGreIelts / totalStudents) * 100) : 0;

    const cgpaDistribution = [
      { name: '9-10', count: cgpaBins['9-10'] },
      { name: '8-9', count: cgpaBins['8-9'] },
      { name: '7-8', count: cgpaBins['7-8'] },
      { name: '6-7', count: cgpaBins['6-7'] },
      { name: '<6', count: cgpaBins['<6'] }
    ];

    const attendanceTrend = Object.keys(attendanceBySem).sort().map(sem => {
      const { attended, total } = attendanceBySem[Number(sem)];
      return {
        sem: `Sem ${sem}`,
        pct: total > 0 ? Math.round((attended / total) * 100) : 0
      };
    });

    const participationOverview = [
      { name: 'Co-Curricular', count: totalCoCurricular },
      { name: 'Extra-Curricular', count: totalExtraCurricular },
      { name: 'Sports', count: totalSports },
      { name: 'NSS / NCC', count: totalNssNcc },
      { name: 'Managerial', count: totalManagerial }
    ];

    const totalVer = approvedAchievements || 1;
    const activityPercentage = [
      { name: 'Co-Curricular', value: Number(((totalCoCurricular / totalVer) * 100).toFixed(1)), color: '#3b82f6' },
      { name: 'Extra-Curricular', value: Number(((totalExtraCurricular / totalVer) * 100).toFixed(1)), color: '#ec4899' },
      { name: 'Sports', value: Number(((totalSports / totalVer) * 100).toFixed(1)), color: '#10b981' },
      { name: 'NSS / NCC', value: Number(((totalNssNcc / totalVer) * 100).toFixed(1)), color: '#06b6d4' },
      { name: 'Managerial', value: Number(((totalManagerial / totalVer) * 100).toFixed(1)), color: '#f59e0b' },
      { name: 'Others', value: Number(((Math.max(0, approvedAchievements - (totalCoCurricular + totalExtraCurricular + totalSports)) / totalVer) * 100).toFixed(1)), color: '#8b5cf6' }
    ];

    const goodCgpaCount = students.filter(s => {
      const studentAc = academicsMap.get(s._id.toString()) || [];
      const sgpas = studentAc.map(r => r.sgpa).filter(Boolean);
      const cgpa = sgpas.length > 0 ? sgpas.reduce((a, b) => a + b, 0) / sgpas.length : 0;
      return cgpa >= 7.0 && cgpa < 8.0;
    }).length;

    const avgCgpaCount = students.filter(s => {
      const studentAc = academicsMap.get(s._id.toString()) || [];
      const sgpas = studentAc.map(r => r.sgpa).filter(Boolean);
      const cgpa = sgpas.length > 0 ? sgpas.reduce((a, b) => a + b, 0) / sgpas.length : 0;
      return cgpa >= 6.0 && cgpa < 7.0;
    }).length;

    const poorCgpaCount = students.filter(s => {
      const studentAc = academicsMap.get(s._id.toString()) || [];
      const sgpas = studentAc.map(r => r.sgpa).filter(Boolean);
      const cgpa = sgpas.length > 0 ? sgpas.reduce((a, b) => a + b, 0) / sgpas.length : 0;
      return cgpa > 0 && cgpa < 6.0;
    }).length;

    const totalMix = (totalIGrades + totalRGrades + goodCgpaCount + avgCgpaCount + poorCgpaCount) || 1;
    const academicPerformanceMix = [
      { name: 'I Grades', value: Number(((totalIGrades / totalMix) * 100).toFixed(1)), color: '#3b82f6' },
      { name: 'R Grades', value: Number(((totalRGrades / totalMix) * 100).toFixed(1)), color: '#ef4444' },
      { name: 'Good (7-8)', value: Number(((goodCgpaCount / totalMix) * 100).toFixed(1)), color: '#f59e0b' },
      { name: 'Average (6-7)', value: Number(((avgCgpaCount / totalMix) * 100).toFixed(1)), color: '#10b981' },
      { name: 'Needs Improvement (<6)', value: Number(((poorCgpaCount / totalMix) * 100).toFixed(1)), color: '#8b5cf6' }
    ];

    const crtBins = { '90-100': 0, '80-90': 0, '70-80': 0, '60-70': 0, '<60': 0 };
    allAcademics.forEach(r => {
      if (studentIdsSet.has(r.studentId.toString())) {
        const crt = r.crtPerformance;
        if (crt !== undefined && crt !== null && crt > 0) {
          if (crt >= 90) crtBins['90-100']++;
          else if (crt >= 80) crtBins['80-90']++;
          else if (crt >= 70) crtBins['70-80']++;
          else if (crt >= 60) crtBins['60-70']++;
          else crtBins['<60']++;
        }
      }
    });

    const crtPerformanceDistribution = [
      { range: '90-100', count: crtBins['90-100'] },
      { range: '80-90', count: crtBins['80-90'] },
      { range: '70-80', count: crtBins['70-80'] },
      { range: '60-70', count: crtBins['60-70'] },
      { range: '<60', count: crtBins['<60'] }
    ];

    const riskAnalysis = {
      attendance: {
        highCount: attHigh,
        highPct: totalStudents > 0 ? Number(((attHigh / totalStudents) * 100).toFixed(1)) : 0,
        modCount: attMod,
        modPct: totalStudents > 0 ? Number(((attMod / totalStudents) * 100).toFixed(1)) : 0,
        goodCount: attGood,
        goodPct: totalStudents > 0 ? Number(((attGood / totalStudents) * 100).toFixed(1)) : 0,
      },
      cgpa: {
        highCount: cgpaHigh,
        highPct: totalStudents > 0 ? Number(((cgpaHigh / totalStudents) * 100).toFixed(1)) : 0,
        modCount: cgpaMod,
        modPct: totalStudents > 0 ? Number(((cgpaMod / totalStudents) * 100).toFixed(1)) : 0,
        goodCount: cgpaGood,
        goodPct: totalStudents > 0 ? Number(((cgpaGood / totalStudents) * 100).toFixed(1)) : 0,
      },
      igrades: {
        highCount: iHigh,
        highPct: totalStudents > 0 ? Number(((iHigh / totalStudents) * 100).toFixed(1)) : 0,
        modCount: iMod,
        modPct: totalStudents > 0 ? Number(((iMod / totalStudents) * 100).toFixed(1)) : 0,
        goodCount: iGood,
        goodPct: totalStudents > 0 ? Number(((iGood / totalStudents) * 100).toFixed(1)) : 0,
      },
      rgrades: {
        highCount: rHigh,
        highPct: totalStudents > 0 ? Number(((rHigh / totalStudents) * 100).toFixed(1)) : 0,
        modCount: rMod,
        modPct: totalStudents > 0 ? Number(((rMod / totalStudents) * 100).toFixed(1)) : 0,
        goodCount: rGood,
        goodPct: totalStudents > 0 ? Number(((rGood / totalStudents) * 100).toFixed(1)) : 0,
      },
      crt: {
        highCount: crtHigh,
        highPct: totalStudents > 0 ? Number(((crtHigh / totalStudents) * 100).toFixed(1)) : 0,
        modCount: crtMod,
        modPct: totalStudents > 0 ? Number(((crtMod / totalStudents) * 100).toFixed(1)) : 0,
        goodCount: crtGood,
        goodPct: totalStudents > 0 ? Number(((crtGood / totalStudents) * 100).toFixed(1)) : 0,
      },
    };

    res.status(200).json({
      summary: {
        totalStudents,
        avgCGPA,
        avgAttendance,
        avgProfileScore,
        placementRatePct: totalStudents > 0 ? Number(((placedCount / totalStudents) * 100).toFixed(1)) : 0,
        totalAchievements,
        totalBacklogs: totalBacklogsCount,
        totalRGrades,
        totalIGrades,
        totalExtraCurricular,
        totalCoCurricular,
        totalSports,
        totalNssNcc,
        totalManagerial,
        totalStarCoders,
        totalGreIelts,
        totalCertifications,
        totalProjects,
        avgCrtPerformance,
        employabilityIndex,
        employabilityLabel,
        placementReadiness,
        placementReadyCount,
        higherStudiesPct,
        pendingApprovals,
        approvedAchievements,
        rejectedAchievements
      },
      charts: {
        studentCountByYear,
        studentsOverPerformance,
        cgpaVsAttendance,
        cgpaDistribution,
        attendanceTrend,
        employabilityBreakdown,
        participationOverview,
        activityPercentage,
        academicPerformanceMix,
        crtPerformanceDistribution
      },
      riskAnalysis,
      lastUpdated: new Date().toLocaleString()
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard metrics for Placement Officer
// @route   GET /api/analytics/placement/dashboard
// @access  Private (Placement Officer, Admin)
export const getPlacementDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const students = await Student.find({} as any).populate('userId', 'name email').lean();
    const eligibleStudentsList = [];
    let placedCount = 0;
    let unplacedCount = 0;

    // Fetch all profiles to check resume, coding handles
    const profiles = await Profile.find({} as any).lean();
    const profileMap = new Map(profiles.map(p => [p.studentId.toString(), p]));

    // Check companies
    const companies = await Company.find({} as any).lean();
    const totalDrives = companies.length;

    // Bulk fetch all academics and attendance
    const allAcademics = await Academic.find({} as any).lean();
    const allAttendance = await Attendance.find({} as any).lean();

    const academicsMap = new Map<string, any[]>();
    for (const ac of allAcademics) {
      const sid = ac.studentId.toString();
      if (!academicsMap.has(sid)) academicsMap.set(sid, []);
      academicsMap.get(sid)!.push(ac);
    }

    const attendanceMap = new Map<string, any[]>();
    for (const att of allAttendance) {
      const sid = att.studentId.toString();
      if (!attendanceMap.has(sid)) attendanceMap.set(sid, []);
      attendanceMap.get(sid)!.push(att);
    }

    for (const student of students) {
      const sidStr = student._id.toString();
      const studentAcademics = academicsMap.get(sidStr) || [];
      const cgpa = calculateCGPA(studentAcademics);
      const activeBacklogs = studentAcademics.reduce((acc, curr) => acc + (curr.activeBacklogs || 0), 0);

      const studentAttendance = attendanceMap.get(sidStr) || [];
      const attendancePct = calculateAttendancePct(studentAttendance);

      const profile = profileMap.get(sidStr);
      const hasResume = !!profile?.resumeUrl;
      const hasCodingHandles = !!(profile?.profiles?.leetcode || profile?.profiles?.hackerrank || profile?.profiles?.codechef);

      const isEligible = cgpa >= 7.0 && activeBacklogs === 0 && attendancePct >= 75;

      let isPlaced = false;
      let placedCompany = '';
      let salaryPackage = 0;

      for (const comp of companies) {
        const applicant = comp.applicants?.find((a: any) => a.studentId.toString() === sidStr);
        if (applicant && applicant.status === 'SELECTED') {
          isPlaced = true;
          placedCompany = comp.name;
          salaryPackage = comp.packageAmount;
          break;
        }
      }

      if (isPlaced) placedCount++;
      else unplacedCount++;

      eligibleStudentsList.push({
        id: student._id,
        name: (student.userId as any)?.name || 'Unknown',
        rollNumber: student.rollNumber,
        branch: student.branch,
        department: student.department,
        year: student.year,
        cgpa,
        attendancePct,
        activeBacklogs,
        isEligible,
        isPlaced,
        placedCompany,
        salaryPackage,
        hasResume,
        hasCodingHandles,
      });
    }

    res.status(200).json({
      summary: {
        totalStudents: students.length,
        eligibleCount: eligibleStudentsList.filter(s => s.isEligible).length,
        placedCount,
        unplacedCount,
        placementRatePct: students.length > 0 ? Number(((placedCount / students.length) * 100).toFixed(1)) : 0,
        totalRecruitmentDrives: totalDrives,
      },
      students: eligibleStudentsList,
      upcomingDrives: companies.filter(c => c.status === 'UPCOMING'),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard metrics for institutional head (drilldown support)
// @route   GET /api/analytics/institution/dashboard
// @access  Private (Admin)
export const getInstitutionDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { department, year, type } = req.query;

    if (type === 'registry' || (department && year && !type)) {
      // 1. DRILLDOWN REGISTRY QUERY
      const filter: any = {
        department: String(department),
        year: Number(year),
      };

      const students = await Student.find(filter).populate('userId', 'name email').lean();
      const studentIds = students.map(s => s._id);

      const [academics, attendance, profiles, companies] = await Promise.all([
        Academic.find({ studentId: { $in: studentIds } } as any).lean(),
        Attendance.find({ studentId: { $in: studentIds } } as any).lean(),
        Profile.find({ studentId: { $in: studentIds } } as any).lean(),
        Company.find({}).lean()
      ]);

      const academicsMap = new Map<string, any[]>();
      academics.forEach(ac => {
        const sid = ac.studentId.toString();
        if (!academicsMap.has(sid)) academicsMap.set(sid, []);
        academicsMap.get(sid)!.push(ac);
      });

      const attendanceMap = new Map<string, any[]>();
      attendance.forEach(att => {
        const sid = att.studentId.toString();
        if (!attendanceMap.has(sid)) attendanceMap.set(sid, []);
        attendanceMap.get(sid)!.push(att);
      });

      const profilesMap = new Map<string, any>();
      profiles.forEach(p => profilesMap.set(p.studentId.toString(), p));

      const drilldownStudents = students.map(student => {
        const sIdStr = student._id.toString();
        const studentAc = academicsMap.get(sIdStr) || [];
        const sgpas = studentAc.map(r => r.sgpa).filter(val => val !== undefined && val !== null);
        const cgpa = sgpas.length > 0 ? Number((sgpas.reduce((a, b) => a + b, 0) / sgpas.length).toFixed(2)) : 0;
        
        const activeBacklogs = studentAc.reduce((acc, curr) => acc + (curr.activeBacklogs || 0), 0);
        
        const studentAtt = attendanceMap.get(sIdStr) || [];
        const totalClasses = studentAtt.reduce((acc, curr) => acc + curr.total, 0);
        const totalAttended = studentAtt.reduce((acc, curr) => acc + curr.attended, 0);
        const attendancePct = totalClasses > 0 ? Number(((totalAttended / totalClasses) * 100).toFixed(1)) : 0;

        let isPlaced = false;
        let placedCompany = '';
        let salaryPackage = 0;
        for (const comp of companies) {
          const applicant = comp.applicants?.find((a: any) => a.studentId.toString() === sIdStr);
          if (applicant && applicant.status === 'SELECTED') {
            isPlaced = true;
            placedCompany = comp.name;
            salaryPackage = comp.packageAmount;
            break;
          }
        }

        const isEligible = cgpa >= 7.0 && activeBacklogs === 0 && attendancePct >= 75;

        const profileObj = profilesMap.get(sIdStr);
        const skillsCount = (profileObj?.skills?.technical?.length || 0) + (profileObj?.skills?.soft?.length || 0);

        return {
          _id: student._id,
          rollNumber: student.rollNumber,
          name: (student.userId as any)?.name || 'Unknown',
          cgpa,
          attendancePct,
          activeBacklogs,
          isEligible,
          isPlaced,
          placedCompany,
          salaryPackage,
          skillsCount
        };
      });

      res.status(200).json({ drilldownStudents });
      return;
    }

    // 2. OVERVIEW METRICS QUERY
    const filter: any = {};
    if (department) filter.department = String(department);
    if (year) filter.year = Number(year);

    const [
      students,
      totalFaculty,
      totalHODs,
      companies,
      allAcademics,
      allAttendance,
      allAchievements,
      allCertifications,
      allProjects,
      allCambridge,
      allCoCurricular,
      allExtraCurricular,
      allSports,
      allCoding,
      allLeadership,
      certScores,
      codingScores,
      projScores,
      leadScores,
      commScores,
      coScores,
      extraScores,
      fitScores
    ] = await Promise.all([
      Student.find(filter).populate('userId', 'name email').lean(),
      User.countDocuments({ role: 'FACULTY' }),
      User.countDocuments({ role: 'HOD' }),
      Company.find({}).lean(),
      Academic.find({} as any).lean(),
      Attendance.find({} as any).lean(),
      Achievement.find({} as any).lean(),
      Certification.find({} as any).lean(),
      Project.find({} as any).lean(),
      CambridgeCertification.find({} as any).lean(),
      CoCurricularActivity.find({} as any).lean(),
      ExtraCurricularActivity.find({} as any).lean(),
      PhysicalFitnessActivity.find({} as any).lean(),
      CodingChallenge.find({} as any).lean(),
      LeadershipActivity.find({} as any).lean(),
      CertificationScore.find({} as any).lean(),
      CodingChallengeScore.find({} as any).lean(),
      ProjectScore.find({} as any).lean(),
      LeadershipScore.find({} as any).lean(),
      CommunicationScore.find({} as any).lean(),
      CoCurricularScore.find({} as any).lean(),
      ExtraCurricularScore.find({} as any).lean(),
      PhysicalFitnessScore.find({} as any).lean()
    ]);

    const studentIdsSet = new Set(students.map(s => s._id.toString()));

    const certsCountMap = new Map<string, number>();
    allCertifications.forEach((c: any) => {
      if (['APPROVED', 'VERIFIED'].includes(String(c.status).toUpperCase())) {
        const sid = c.studentId.toString();
        certsCountMap.set(sid, (certsCountMap.get(sid) || 0) + 1);
      }
    });

    const projsCountMap = new Map<string, number>();
    allProjects.forEach((p: any) => {
      if (['APPROVED', 'VERIFIED'].includes(String(p.status).toUpperCase())) {
        const sid = p.studentId.toString();
        projsCountMap.set(sid, (projsCountMap.get(sid) || 0) + 1);
      }
    });

    const researchCountMap = new Map<string, number>();
    allAchievements.forEach((a: any) => {
      if (a.type === 'RESEARCH_PAPER' && ['APPROVED', 'VERIFIED'].includes(String(a.status).toUpperCase())) {
        const sid = a.studentId.toString();
        researchCountMap.set(sid, (researchCountMap.get(sid) || 0) + 1);
      }
    });

    const extraCurricularList = allExtraCurricular as any[];
    const leadershipList = allLeadership as any[];
    const certificationsList = allCertifications as any[];

    const academicsMap = new Map<string, any[]>();
    allAcademics.forEach(ac => {
      const sid = ac.studentId.toString();
      if (!studentIdsSet.has(sid)) return;
      if (!academicsMap.has(sid)) academicsMap.set(sid, []);
      academicsMap.get(sid)!.push(ac);
    });

    const attendanceMap = new Map<string, any[]>();
    allAttendance.forEach(att => {
      const sid = att.studentId.toString();
      if (!studentIdsSet.has(sid)) return;
      if (!attendanceMap.has(sid)) attendanceMap.set(sid, []);
      attendanceMap.get(sid)!.push(att);
    });

    const achievementsMap = new Map<string, any[]>();
    allAchievements.forEach(ach => {
      const sid = ach.studentId.toString();
      if (!studentIdsSet.has(sid)) return;
      if (!achievementsMap.has(sid)) achievementsMap.set(sid, []);
      achievementsMap.get(sid)!.push(ach);
    });

    const certScoresMap = new Map<string, any>();
    certScores.forEach(c => {
      if (studentIdsSet.has(c.studentId.toString())) {
        certScoresMap.set(`${c.studentId.toString()}-${c.academicYear}`, c);
      }
    });

    const codingScoresMap = new Map<string, any>();
    codingScores.forEach(c => {
      if (studentIdsSet.has(c.studentId.toString())) {
        codingScoresMap.set(`${c.studentId.toString()}-${c.academicYear}`, c);
      }
    });

    const projScoresMap = new Map<string, any>();
    projScores.forEach(p => {
      if (studentIdsSet.has(p.studentId.toString())) {
        projScoresMap.set(`${p.studentId.toString()}-${p.academicYear}`, p);
      }
    });

    const leadScoresMap = new Map<string, any>();
    leadScores.forEach(l => {
      if (studentIdsSet.has(l.studentId.toString())) {
        leadScoresMap.set(`${l.studentId.toString()}-${l.academicYear}`, l);
      }
    });

    const commScoresMap = new Map<string, any>();
    commScores.forEach(c => {
      if (studentIdsSet.has(c.studentId.toString())) {
        commScoresMap.set(`${c.studentId.toString()}-${c.academicYear}`, c);
      }
    });

    const coScoresMap = new Map<string, any>();
    coScores.forEach(c => {
      if (studentIdsSet.has(c.studentId.toString())) {
        coScoresMap.set(`${c.studentId.toString()}-${c.academicYear}`, c);
      }
    });

    const extraScoresMap = new Map<string, any>();
    extraScores.forEach(e => {
      if (studentIdsSet.has(e.studentId.toString())) {
        extraScoresMap.set(`${e.studentId.toString()}-${e.academicYear}`, e);
      }
    });

    const fitScoresMap = new Map<string, any>();
    fitScores.forEach(f => {
      if (studentIdsSet.has(f.studentId.toString())) {
        fitScoresMap.set(`${f.studentId.toString()}-${f.academicYear}`, f);
      }
    });

    const weights: Record<number, Record<string, number>> = {
      1: { cgpa: 35, attendance: 10, communication: 10, coding: 10, extracurricular: 10, certifications: 5, projects: 5, cocurricular: 5, leadership: 5, sports: 5, publications: 0, crtAttendance: 0, crtPerformance: 0, placementPrep: 0 },
      2: { cgpa: 30, attendance: 10, communication: 10, coding: 10, extracurricular: 5, certifications: 5, projects: 5, cocurricular: 5, leadership: 5, sports: 5, publications: 5, crtAttendance: 5, crtPerformance: 0, placementPrep: 0 },
      3: { cgpa: 25, attendance: 5, communication: 5, coding: 5, extracurricular: 5, certifications: 10, projects: 10, cocurricular: 5, leadership: 5, sports: 0, publications: 10, crtAttendance: 5, crtPerformance: 10, placementPrep: 0 },
      4: { cgpa: 20, attendance: 0, communication: 5, coding: 5, extracurricular: 5, certifications: 10, projects: 15, cocurricular: 5, leadership: 0, sports: 0, publications: 10, crtAttendance: 5, crtPerformance: 10, placementPrep: 10 }
    };

    const getCgpaLookupPct = (cgpa: number): number => {
      if (cgpa > 9.0) return 100;
      if (cgpa >= 8.5) return 90;
      if (cgpa >= 8.0) return 80;
      if (cgpa >= 7.5) return 70;
      if (cgpa >= 7.0) return 60;
      return 50;
    };

    const getAttendanceLookupPct = (pct: number): number => {
      if (pct > 90) return 100;
      if (pct >= 80) return 90;
      if (pct >= 75) return 80;
      if (pct >= 70) return 70;
      if (pct >= 65) return 60;
      return 50;
    };

    const getCrtAttendanceMult = (pct: number): number => {
      if (pct > 90) return 1.0;
      if (pct >= 80) return 0.8;
      if (pct >= 70) return 0.6;
      return 0.5;
    };

    const getCrtPerformanceMult = (score: number): number => {
      if (score > 90) return 1.0;
      if (score >= 80) return 0.9;
      if (score >= 70) return 0.8;
      if (score >= 60) return 0.7;
      return 0.0;
    };

    const computeYearScoreVal = (sId: string, roll: string, y: number) => {
      const semesters = [2 * y - 1, 2 * y];
      const studentAc = academicsMap.get(sId)?.filter(ac => semesters.includes(ac.semester)) || [];
      const studentAtt = attendanceMap.get(sId)?.filter(att => semesters.includes(att.semester)) || [];

      const match = roll.match(/^(\d{2})/);
      const admissionYear = match ? 2000 + parseInt(match[1]) : new Date().getFullYear() - 3;
      const startDate = new Date(`${admissionYear + y - 1}-07-01T00:00:00.000Z`);
      const endDate = new Date(`${admissionYear + y}-06-30T23:59:59.999Z`);

      const studentAch = achievementsMap.get(sId)?.filter(ach => ach.date >= startDate && ach.date <= endDate) || [];

      const yearWeights = weights[y];
      const breakdown: Record<string, number> = {};

      if (yearWeights.cgpa > 0) {
        const sgpas = studentAc.map(r => r.sgpa).filter(Boolean);
        const avgCgpa = sgpas.length > 0 ? sgpas.reduce((a, b) => a + b, 0) / sgpas.length : 0;
        const lookupPct = getCgpaLookupPct(avgCgpa);
        breakdown.cgpa = Number(((lookupPct / 100) * yearWeights.cgpa).toFixed(2));
      } else {
        breakdown.cgpa = 0;
      }

      if (yearWeights.attendance > 0) {
        const totalClasses = studentAtt.reduce((acc, curr) => acc + curr.total, 0);
        const totalAttended = studentAtt.reduce((acc, curr) => acc + curr.attended, 0);
        const attendancePct = totalClasses > 0 ? (totalAttended / totalClasses) * 100 : 0;
        const lookupPct = getAttendanceLookupPct(attendancePct);
        breakdown.attendance = Number(((lookupPct / 100) * yearWeights.attendance).toFixed(2));
      } else {
        breakdown.attendance = 0;
      }

      breakdown.communication = yearWeights.communication > 0 ? (commScoresMap.get(`${sId}-${y}`)?.score || 0) : 0;
      breakdown.coding = yearWeights.coding > 0 ? (codingScoresMap.get(`${sId}-${y}`)?.score || 0) : 0;
      breakdown.extracurricular = yearWeights.extracurricular > 0 ? (extraScoresMap.get(`${sId}-${y}`)?.score || 0) : 0;
      breakdown.certifications = yearWeights.certifications > 0 ? Math.min(certScoresMap.get(`${sId}-${y}`)?.score || 0, yearWeights.certifications) : 0;
      breakdown.projects = yearWeights.projects > 0 ? Math.min(projScoresMap.get(`${sId}-${y}`)?.score || 0, yearWeights.projects) : 0;
      breakdown.cocurricular = yearWeights.cocurricular > 0 ? (coScoresMap.get(`${sId}-${y}`)?.score || 0) : 0;
      breakdown.leadership = yearWeights.leadership > 0 ? (leadScoresMap.get(`${sId}-${y}`)?.score || 0) : 0;
      breakdown.sports = yearWeights.sports > 0 ? (fitScoresMap.get(`${sId}-${y}`)?.score || 0) : 0;

      if (yearWeights.publications > 0) {
        let pubPoints = 0;
        studentAch.forEach(ach => {
          if (ach.type === 'RESEARCH_PAPER' || ach.type === 'INTERNSHIP') pubPoints += 5;
        });
        breakdown.publications = Math.min(pubPoints, yearWeights.publications);
      } else {
        breakdown.publications = 0;
      }

      if (yearWeights.crtAttendance > 0) {
        const crtAttends = studentAc.map(r => r.crtAttendance).filter(val => val !== undefined && val !== null);
        const avgCrtAtt = crtAttends.length > 0 ? crtAttends.reduce((a, b) => a + b, 0) / crtAttends.length : 0;
        const multiplier = getCrtAttendanceMult(avgCrtAtt);
        breakdown.crtAttendance = Number((multiplier * yearWeights.crtAttendance).toFixed(2));
      } else {
        breakdown.crtAttendance = 0;
      }

      if (yearWeights.crtPerformance > 0) {
        const crtPerfList = studentAc.map(r => r.crtPerformance).filter(val => val !== undefined && val !== null);
        const avgCrtPerf = crtPerfList.length > 0 ? crtPerfList.reduce((a, b) => a + b, 0) / crtPerfList.length : 0;
        const multiplier = getCrtPerformanceMult(avgCrtPerf);
        breakdown.crtPerformance = Number((multiplier * yearWeights.crtPerformance).toFixed(2));
      } else {
        breakdown.crtPerformance = 0;
      }

      if (yearWeights.placementPrep > 0) {
        const hasPrep = studentAch.some(ach => {
          const text = `${ach.title} ${ach.description}`.toLowerCase();
          return text.match(/gre|gate|toefl|ielts|placement|offer letter|selected|hired/i);
        });
        breakdown.placementPrep = hasPrep ? yearWeights.placementPrep : 0;
      } else {
        breakdown.placementPrep = 0;
      }

      const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
      return Number(score.toFixed(2));
    };

    const computeOverallScoreVal = (sId: string, roll: string) => {
      const studentAc = academicsMap.get(sId) || [];
      if (studentAc.length === 0) return 0;
      const studentSemesters = studentAc.map(a => a.semester);

      const completedYears: number[] = [];
      if (studentSemesters.some(s => s === 1 || s === 2)) completedYears.push(1);
      if (studentSemesters.some(s => s === 3 || s === 4)) completedYears.push(2);
      if (studentSemesters.some(s => s === 5 || s === 6)) completedYears.push(3);
      if (studentSemesters.some(s => s === 7 || s === 8)) completedYears.push(4);

      let sum = 0;
      for (const yr of completedYears) {
        sum += computeYearScoreVal(sId, roll, yr);
      }
      return completedYears.length > 0 ? Number((sum / completedYears.length).toFixed(2)) : 0;
    };

    let totalCGPASum = 0;
    let totalAttendancePctSum = 0;
    let studentWithStatsCount = 0;
    let totalBacklogsCount = 0;
    let totalRGrades = 0;
    let totalIGrades = 0;
    let highestCGPA = 0;
    let lowestCGPA = 10;
    let studentCountByYear: any = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let studentsOverPerformance = { excellent: 0, good: 0, average: 0, poor: 0 };
    const cgpaVsAttendance: any[] = [];

    const cgpaBins = { '9-10': 0, '8-9': 0, '7-8': 0, '6-7': 0, '<6': 0 };
    const attendanceBySem: Record<number, { attended: number; total: number }> = {};

    let attHigh = 0, attMod = 0, attGood = 0;
    let cgpaHigh = 0, cgpaMod = 0, cgpaGood = 0;
    let iHigh = 0, iMod = 0, iGood = 0;
    let rHigh = 0, rMod = 0, rGood = 0;
    let crtHigh = 0, crtMod = 0, crtGood = 0;

    let placedCount = 0;
    let placementReadyCount = 0;

    let certScoreSum = 0, certScoreCount = 0;
    let codingScoreSum = 0, codingScoreCount = 0;
    let projectScoreSum = 0, projectScoreCount = 0;
    let leadershipScoreSum = 0, leadershipScoreCount = 0;
    let commScoreSum = 0, commScoreCount = 0;
    let coScoreSum = 0, coScoreCount = 0;
    let extraScoreSum = 0, extraScoreCount = 0;
    let sportsScoreSum = 0, sportsScoreCount = 0;

    let profileScoreSum = 0;

    const deptStats: any = {};

    for (const student of students) {
      studentCountByYear[student.year] = (studentCountByYear[student.year] || 0) + 1;
      const sIdStr = student._id.toString();

      const studentAc = academicsMap.get(sIdStr) || [];
      const sgpas = studentAc.map(r => r.sgpa).filter(val => val !== undefined && val !== null);
      const cgpa = sgpas.length > 0 ? Number((sgpas.reduce((a, b) => a + b, 0) / sgpas.length).toFixed(2)) : null;

      const activeBacklogs = studentAc.reduce((acc, curr) => acc + (curr.activeBacklogs || 0), 0);
      const rGrades = studentAc.reduce((acc, curr) => acc + (curr.rGradeCount || 0), 0);
      const iGrades = studentAc.reduce((acc, curr) => acc + (curr.iGradeCount || 0), 0);

      totalBacklogsCount += activeBacklogs;
      totalRGrades += rGrades;
      totalIGrades += iGrades;

      const studentAtt = attendanceMap.get(sIdStr) || [];
      const totalClasses = studentAtt.reduce((acc, curr) => acc + curr.total, 0);
      const totalAttended = studentAtt.reduce((acc, curr) => acc + curr.attended, 0);
      const attendancePct = totalClasses > 0 ? Number(((totalAttended / totalClasses) * 100).toFixed(1)) : null;

      studentAtt.forEach(att => {
        if (!attendanceBySem[att.semester]) {
          attendanceBySem[att.semester] = { attended: 0, total: 0 };
        }
        attendanceBySem[att.semester].attended += att.attended;
        attendanceBySem[att.semester].total += att.total;
      });

      if (cgpa !== null) {
        totalCGPASum += cgpa;
        if (cgpa > highestCGPA) highestCGPA = cgpa;
        if (cgpa < lowestCGPA) lowestCGPA = cgpa;
        if (cgpa >= 9.0) cgpaBins['9-10']++;
        else if (cgpa >= 8.0) cgpaBins['8-9']++;
        else if (cgpa >= 7.0) cgpaBins['7-8']++;
        else if (cgpa >= 6.0) cgpaBins['6-7']++;
        else cgpaBins['<6']++;
      } else {
        cgpaBins['<6']++;
      }

      if (attendancePct !== null) {
        totalAttendancePctSum += attendancePct;
      }

      if (cgpa !== null || attendancePct !== null) {
        studentWithStatsCount++;
        if (cgpa !== null && attendancePct !== null) {
          cgpaVsAttendance.push({
            rollNumber: student.rollNumber,
            name: (student.userId as any)?.name || 'Student',
            cgpa,
            attendance: attendancePct,
          });
        }
      }

      let isPlaced = false;
      let salaryPackage = 0;
      for (const comp of companies) {
        const applicant = comp.applicants?.find((a: any) => a.studentId.toString() === sIdStr);
        if (applicant && applicant.status === 'SELECTED') {
          isPlaced = true;
          salaryPackage = comp.packageAmount;
          break;
        }
      }
      if (isPlaced) placedCount++;

      let overallProfileScore = (student as any).overallScore;
      if (overallProfileScore === undefined || overallProfileScore === null) {
        overallProfileScore = computeOverallScoreVal(sIdStr, student.rollNumber);
      }
      profileScoreSum += overallProfileScore;

      const hasBacklogs = activeBacklogs > 0;
      const isLowAttendance = attendancePct !== null && attendancePct < 75;
      const isLowCGPA = cgpa !== null && cgpa < 7.0;
      if (!hasBacklogs && !isLowAttendance && !isLowCGPA && overallProfileScore >= 70) {
        placementReadyCount++;
      }

      if (attendancePct !== null) {
        if (attendancePct < 75) attHigh++;
        else if (attendancePct < 85) attMod++;
        else attGood++;
      } else {
        attGood++;
      }

      if (cgpa !== null) {
        if (cgpa < 6.5) cgpaHigh++;
        else if (cgpa < 7.5) cgpaMod++;
        else cgpaGood++;
      } else {
        cgpaGood++;
      }

      if (iGrades > 2) iHigh++;
      else if (iGrades >= 1) iMod++;
      else iGood++;

      if (rGrades > 1) rHigh++;
      else if (rGrades === 1) rMod++;
      else rGood++;

      const crtPerfs = studentAc.map(r => r.crtPerformance).filter(val => val !== undefined && val !== null);
      const avgCrtPerf = crtPerfs.length > 0 ? crtPerfs.reduce((a, b) => a + b, 0) / crtPerfs.length : 0;
      if (avgCrtPerf > 0) {
        if (avgCrtPerf < 50) crtHigh++;
        else if (avgCrtPerf < 70) crtMod++;
        else crtGood++;
      } else {
        crtGood++;
      }

      const keys = Array.from({ length: 4 }, (_, index) => `${sIdStr}-${index + 1}`);
      keys.forEach(k => {
        const cert = certScoresMap.get(k);
        if (cert) { certScoreSum += cert.score; certScoreCount++; }

        const coding = codingScoresMap.get(k);
        if (coding) { codingScoreSum += coding.score; codingScoreCount++; }

        const proj = projScoresMap.get(k);
        if (proj) { projectScoreSum += proj.score; projectScoreCount++; }

        const lead = leadScoresMap.get(k);
        if (lead) { leadershipScoreSum += lead.score; leadershipScoreCount++; }

        const comm = commScoresMap.get(k);
        if (comm) { commScoreSum += comm.score; commScoreCount++; }

        const co = coScoresMap.get(k);
        if (co) { coScoreSum += co.score; coScoreCount++; }

        const extra = extraScoresMap.get(k);
        if (extra) { extraScoreSum += extra.score; extraScoreCount++; }

        const sports = fitScoresMap.get(k);
        if (sports) { sportsScoreSum += sports.score; sportsScoreCount++; }
      });

      // Dept comparisons stats calculation
      const certCount = certsCountMap.get(sIdStr) || 0;
      const projCount = projsCountMap.get(sIdStr) || 0;
      const researchCount = researchCountMap.get(sIdStr) || 0;

      const dept = student.department || 'Other';
      if (!deptStats[dept]) {
        deptStats[dept] = {
          name: dept,
          studentCount: 0,
          cgpaSum: 0,
          cgpaCount: 0,
          attendanceSum: 0,
          attendanceCount: 0,
          placedCount: 0,
          totalSalary: 0,
          overallScoreSum: 0,
          projectsCountSum: 0,
          certificationsCountSum: 0,
          researchCountSum: 0,
        };
      }
      const dStat = deptStats[dept];
      dStat.studentCount++;
      dStat.overallScoreSum += overallProfileScore;
      dStat.projectsCountSum += projCount;
      dStat.certificationsCountSum += certCount;
      dStat.researchCountSum += researchCount;
      if (cgpa !== null) {
        dStat.cgpaSum += cgpa;
        dStat.cgpaCount++;
      }
      if (attendancePct !== null) {
        dStat.attendanceSum += attendancePct;
        dStat.attendanceCount++;
      }
      if (isPlaced) {
        dStat.placedCount++;
        dStat.totalSalary += salaryPackage;
      }
    }

    const departmentsComparison = Object.keys(deptStats).map(key => {
      const d = deptStats[key];
      return {
        department: d.name,
        studentsCount: d.studentCount,
        avgCGPA: d.cgpaCount > 0 ? Number((d.cgpaSum / d.cgpaCount).toFixed(2)) : 0,
        avgAttendance: d.attendanceCount > 0 ? Number((d.attendanceSum / d.attendanceCount).toFixed(1)) : 0,
        placedCount: d.placedCount,
        placementRatePct: d.studentCount > 0 ? Number(((d.placedCount / d.studentCount) * 100).toFixed(1)) : 0,
        avgSalaryLPA: d.placedCount > 0 ? Number((d.totalSalary / d.placedCount).toFixed(2)) : 0,
        avgProfileScore: d.studentCount > 0 ? Number((d.overallScoreSum / d.studentCount).toFixed(2)) : 0,
        avgProjects: d.studentCount > 0 ? Number((d.projectsCountSum / d.studentCount).toFixed(2)) : 0,
        avgCertifications: d.studentCount > 0 ? Number((d.certificationsCountSum / d.studentCount).toFixed(2)) : 0,
        avgResearch: d.studentCount > 0 ? Number((d.researchCountSum / d.studentCount).toFixed(2)) : 0,
      };
    });

    const totalStudents = students.length;
    const avgCGPA = studentWithStatsCount > 0 ? Number((totalCGPASum / studentWithStatsCount).toFixed(2)) : 0;
    const avgAttendance = studentWithStatsCount > 0 ? Number((totalAttendancePctSum / studentWithStatsCount).toFixed(1)) : 0;
    const avgProfileScore = totalStudents > 0 ? Number((profileScoreSum / totalStudents).toFixed(2)) : 0;

    const avgCertificationScore = certScoreCount > 0 ? Number((certScoreSum / certScoreCount).toFixed(2)) : 0;
    const avgCodingScore = codingScoreCount > 0 ? Number((codingScoreSum / codingScoreCount).toFixed(2)) : 0;
    const avgProjectScore = projectScoreCount > 0 ? Number((projectScoreSum / projectScoreCount).toFixed(2)) : 0;
    const avgLeadershipScore = leadershipScoreCount > 0 ? Number((leadershipScoreSum / leadershipScoreCount).toFixed(2)) : 0;
    const avgCommunicationScore = commScoreCount > 0 ? Number((commScoreSum / commScoreCount).toFixed(2)) : 0;
    const avgCoCurricularScore = coScoreCount > 0 ? Number((coScoreSum / coScoreCount).toFixed(2)) : 0;
    const avgExtraCurricularScore = extraScoreCount > 0 ? Number((extraScoreSum / extraScoreCount).toFixed(2)) : 0;
    const avgPhysicalFitnessScore = sportsScoreCount > 0 ? Number((sportsScoreSum / sportsScoreCount).toFixed(2)) : 0;

    const countStatusInArray = (arr: any[], statusList: string[]) => {
      const filtered = arr.filter(item => studentIdsSet.has(item.studentId.toString()));
      return filtered.filter(item => statusList.includes(String(item.status).toUpperCase())).length;
    };

    const pendingApprovals =
      countStatusInArray(allAchievements, ['PENDING', 'UNDER_REVIEW']) +
      countStatusInArray(allCertifications, ['PENDING', 'UNDER_REVIEW']) +
      countStatusInArray(allProjects, ['PENDING', 'UNDER_REVIEW']) +
      countStatusInArray(allCambridge, ['PENDING', 'UNDER_REVIEW']) +
      countStatusInArray(allCoCurricular, ['PENDING', 'UNDER_REVIEW']) +
      countStatusInArray(allExtraCurricular, ['PENDING', 'UNDER_REVIEW']) +
      countStatusInArray(allSports, ['PENDING', 'UNDER_REVIEW']) +
      countStatusInArray(allCoding, ['PENDING', 'UNDER_REVIEW']) +
      countStatusInArray(allLeadership, ['PENDING', 'UNDER_REVIEW']);

    const approvedAchievements =
      countStatusInArray(allAchievements, ['APPROVED', 'VERIFIED']) +
      countStatusInArray(allCertifications, ['APPROVED', 'VERIFIED']) +
      countStatusInArray(allProjects, ['APPROVED', 'VERIFIED']) +
      countStatusInArray(allCambridge, ['APPROVED', 'VERIFIED']) +
      countStatusInArray(allCoCurricular, ['APPROVED', 'VERIFIED']) +
      countStatusInArray(allExtraCurricular, ['APPROVED', 'VERIFIED']) +
      countStatusInArray(allSports, ['APPROVED', 'VERIFIED']) +
      countStatusInArray(allCoding, ['APPROVED', 'VERIFIED']) +
      countStatusInArray(allLeadership, ['APPROVED', 'VERIFIED']);

    const rejectedAchievements =
      countStatusInArray(allAchievements, ['REJECTED']) +
      countStatusInArray(allCertifications, ['REJECTED']) +
      countStatusInArray(allProjects, ['REJECTED']) +
      countStatusInArray(allCambridge, ['REJECTED']) +
      countStatusInArray(allCoCurricular, ['REJECTED']) +
      countStatusInArray(allExtraCurricular, ['REJECTED']) +
      countStatusInArray(allSports, ['REJECTED']) +
      countStatusInArray(allCoding, ['REJECTED']) +
      countStatusInArray(allLeadership, ['REJECTED']);

    const totalAchievements = pendingApprovals + approvedAchievements + rejectedAchievements;

    const totalExtraCurricular = countStatusInArray(allExtraCurricular, ['APPROVED', 'VERIFIED']);
    const totalCoCurricular = countStatusInArray(allCoCurricular, ['APPROVED', 'VERIFIED']);
    const totalSports = countStatusInArray(allSports, ['APPROVED', 'VERIFIED']);

    const totalNssNcc = extraCurricularList.filter(c =>
      studentIdsSet.has(c.studentId.toString()) &&
      ['APPROVED', 'VERIFIED'].includes(String(c.status).toUpperCase()) &&
      String(c.activityName || c.description || '').match(/nss|ncc/i)
    ).length;

    const totalManagerial = leadershipList.filter(c =>
      studentIdsSet.has(c.studentId.toString()) &&
      ['APPROVED', 'VERIFIED'].includes(String(c.status).toUpperCase()) &&
      String(c.role || c.description || '').match(/coordinator|lead|president|secretary/i)
    ).length;

    const starCodersList = new Set<string>();
    codingScores.forEach(c => {
      if (studentIdsSet.has(c.studentId.toString()) && c.score >= 8) {
        starCodersList.add(c.studentId.toString());
      }
    });
    const totalStarCoders = starCodersList.size;

    const totalGreIelts = certificationsList.filter(c =>
      studentIdsSet.has(c.studentId.toString()) &&
      ['APPROVED', 'VERIFIED'].includes(String(c.status).toUpperCase()) &&
      String(c.title || c.issuer || '').match(/gre|ielts|toefl|gate/i)
    ).length;

    const totalCertifications = 
      countStatusInArray(allCertifications, ['APPROVED', 'VERIFIED']) +
      countStatusInArray(allAchievements.filter(a => a.type === 'CERTIFICATION'), ['APPROVED', 'VERIFIED']);
    const totalProjects = 
      countStatusInArray(allProjects, ['APPROVED', 'VERIFIED']) +
      countStatusInArray(allAchievements.filter(a => a.type === 'PROJECT'), ['APPROVED', 'VERIFIED']);

    const crtPerfs = allAcademics.filter(r => studentIdsSet.has(r.studentId.toString())).map(r => r.crtPerformance).filter(val => val !== undefined && val !== null && val > 0);
    const avgCrtPerformance = crtPerfs.length > 0 ? Math.round(crtPerfs.reduce((a, b) => a + b, 0) / crtPerfs.length) : 0;

    const avgProjectScoreScaled = avgProjectScore > 0 ? (avgProjectScore / 15) * 100 : 0;
    const avgCertificationScoreScaled = avgCertificationScore > 0 ? (avgCertificationScore / 10) * 100 : 0;
    const avgCodingScoreScaled = avgCodingScore > 0 ? (avgCodingScore / 10) * 100 : 0;
    const grePct = totalStudents > 0 ? (totalGreIelts / totalStudents) * 100 : 0;

    const employabilityIndex = Math.round(
      (avgCrtPerformance * 0.3) +
      (avgProjectScoreScaled * 0.25) +
      (avgCertificationScoreScaled * 0.2) +
      (avgCodingScoreScaled * 0.1) +
      (grePct * 0.15)
    );

    const employabilityBreakdown = [
      { name: 'CRT Performance', value: Math.round(avgCrtPerformance * 0.3), color: '#3b82f6' },
      { name: 'Projects', value: Math.round(avgProjectScoreScaled * 0.25), color: '#10b981' },
      { name: 'Certifications', value: Math.round(avgCertificationScoreScaled * 0.2), color: '#f59e0b' },
      { name: 'Star Coder', value: Math.round(avgCodingScoreScaled * 0.1), color: '#8b5cf6' },
      { name: 'GRE / IELTS', value: Math.round(grePct * 0.15), color: '#ec4899' }
    ];

    let employabilityLabel = 'Poor';
    if (employabilityIndex >= 85) employabilityLabel = 'Excellent';
    else if (employabilityIndex >= 70) employabilityLabel = 'Good';
    else if (employabilityIndex >= 50) employabilityLabel = 'Average';

    const placementReadiness = totalStudents > 0 ? Math.round((placementReadyCount / totalStudents) * 100) : 0;
    const higherStudiesPct = totalStudents > 0 ? Math.round((totalGreIelts / totalStudents) * 100) : 0;

    const cgpaDistribution = [
      { name: '9-10', count: cgpaBins['9-10'] },
      { name: '8-9', count: cgpaBins['8-9'] },
      { name: '7-8', count: cgpaBins['7-8'] },
      { name: '6-7', count: cgpaBins['6-7'] },
      { name: '<6', count: cgpaBins['<6'] }
    ];

    const attendanceTrend = Object.keys(attendanceBySem).sort().map(sem => {
      const { attended, total } = attendanceBySem[Number(sem)];
      return {
        sem: `Sem ${sem}`,
        pct: total > 0 ? Math.round((attended / total) * 100) : 0
      };
    });

    const participationOverview = [
      { name: 'Co-Curricular', count: totalCoCurricular },
      { name: 'Extra-Curricular', count: totalExtraCurricular },
      { name: 'Sports', count: totalSports },
      { name: 'NSS / NCC', count: totalNssNcc },
      { name: 'Managerial', count: totalManagerial }
    ];

    const totalVer = approvedAchievements || 1;
    const activityPercentage = [
      { name: 'Co-Curricular', value: Number(((totalCoCurricular / totalVer) * 100).toFixed(1)), color: '#3b82f6' },
      { name: 'Extra-Curricular', value: Number(((totalExtraCurricular / totalVer) * 100).toFixed(1)), color: '#ec4899' },
      { name: 'Sports', value: Number(((totalSports / totalVer) * 100).toFixed(1)), color: '#10b981' },
      { name: 'NSS / NCC', value: Number(((totalNssNcc / totalVer) * 100).toFixed(1)), color: '#06b6d4' },
      { name: 'Managerial', value: Number(((totalManagerial / totalVer) * 100).toFixed(1)), color: '#f59e0b' },
      { name: 'Others', value: Number(((Math.max(0, approvedAchievements - (totalCoCurricular + totalExtraCurricular + totalSports)) / totalVer) * 100).toFixed(1)), color: '#8b5cf6' }
    ];

    const goodCgpaCount = students.filter(s => {
      const studentAc = academicsMap.get(s._id.toString()) || [];
      const sgpas = studentAc.map(r => r.sgpa).filter(Boolean);
      const cgpa = sgpas.length > 0 ? sgpas.reduce((a, b) => a + b, 0) / sgpas.length : 0;
      return cgpa >= 7.0 && cgpa < 8.0;
    }).length;

    const avgCgpaCount = students.filter(s => {
      const studentAc = academicsMap.get(s._id.toString()) || [];
      const sgpas = studentAc.map(r => r.sgpa).filter(Boolean);
      const cgpa = sgpas.length > 0 ? sgpas.reduce((a, b) => a + b, 0) / sgpas.length : 0;
      return cgpa >= 6.0 && cgpa < 7.0;
    }).length;

    const poorCgpaCount = students.filter(s => {
      const studentAc = academicsMap.get(s._id.toString()) || [];
      const sgpas = studentAc.map(r => r.sgpa).filter(Boolean);
      const cgpa = sgpas.length > 0 ? sgpas.reduce((a, b) => a + b, 0) / sgpas.length : 0;
      return cgpa > 0 && cgpa < 6.0;
    }).length;

    const totalMix = (totalIGrades + totalRGrades + goodCgpaCount + avgCgpaCount + poorCgpaCount) || 1;
    const academicPerformanceMix = [
      { name: 'I Grades', value: Number(((totalIGrades / totalMix) * 100).toFixed(1)), color: '#3b82f6' },
      { name: 'R Grades', value: Number(((totalRGrades / totalMix) * 100).toFixed(1)), color: '#ef4444' },
      { name: 'Good (7-8)', value: Number(((goodCgpaCount / totalMix) * 100).toFixed(1)), color: '#f59e0b' },
      { name: 'Average (6-7)', value: Number(((avgCgpaCount / totalMix) * 100).toFixed(1)), color: '#10b981' },
      { name: 'Needs Improvement (<6)', value: Number(((poorCgpaCount / totalMix) * 100).toFixed(1)), color: '#8b5cf6' }
    ];

    const crtBins = { '90-100': 0, '80-90': 0, '70-80': 0, '60-70': 0, '<60': 0 };
    allAcademics.forEach(r => {
      if (studentIdsSet.has(r.studentId.toString())) {
        const crt = r.crtPerformance;
        if (crt !== undefined && crt !== null && crt > 0) {
          if (crt >= 90) crtBins['90-100']++;
          else if (crt >= 80) crtBins['80-90']++;
          else if (crt >= 70) crtBins['70-80']++;
          else if (crt >= 60) crtBins['60-70']++;
          else crtBins['<60']++;
        }
      }
    });

    const crtPerformanceDistribution = [
      { range: '90-100', count: crtBins['90-100'] },
      { range: '80-90', count: crtBins['80-90'] },
      { range: '70-80', count: crtBins['70-80'] },
      { range: '60-70', count: crtBins['60-70'] },
      { range: '<60', count: crtBins['<60'] }
    ];

    const riskAnalysis = {
      attendance: {
        highCount: attHigh,
        highPct: totalStudents > 0 ? Number(((attHigh / totalStudents) * 100).toFixed(1)) : 0,
        modCount: attMod,
        modPct: totalStudents > 0 ? Number(((attMod / totalStudents) * 100).toFixed(1)) : 0,
        goodCount: attGood,
        goodPct: totalStudents > 0 ? Number(((attGood / totalStudents) * 100).toFixed(1)) : 0,
      },
      cgpa: {
        highCount: cgpaHigh,
        highPct: totalStudents > 0 ? Number(((cgpaHigh / totalStudents) * 100).toFixed(1)) : 0,
        modCount: cgpaMod,
        modPct: totalStudents > 0 ? Number(((cgpaMod / totalStudents) * 100).toFixed(1)) : 0,
        goodCount: cgpaGood,
        goodPct: totalStudents > 0 ? Number(((cgpaGood / totalStudents) * 100).toFixed(1)) : 0,
      },
      igrades: {
        highCount: iHigh,
        highPct: totalStudents > 0 ? Number(((iHigh / totalStudents) * 100).toFixed(1)) : 0,
        modCount: iMod,
        modPct: totalStudents > 0 ? Number(((iMod / totalStudents) * 100).toFixed(1)) : 0,
        goodCount: iGood,
        goodPct: totalStudents > 0 ? Number(((iGood / totalStudents) * 100).toFixed(1)) : 0,
      },
      rgrades: {
        highCount: rHigh,
        highPct: totalStudents > 0 ? Number(((rHigh / totalStudents) * 100).toFixed(1)) : 0,
        modCount: rMod,
        modPct: totalStudents > 0 ? Number(((rMod / totalStudents) * 100).toFixed(1)) : 0,
        goodCount: rGood,
        goodPct: totalStudents > 0 ? Number(((rGood / totalStudents) * 100).toFixed(1)) : 0,
      },
      crt: {
        highCount: crtHigh,
        highPct: totalStudents > 0 ? Number(((crtHigh / totalStudents) * 100).toFixed(1)) : 0,
        modCount: crtMod,
        modPct: totalStudents > 0 ? Number(((crtMod / totalStudents) * 100).toFixed(1)) : 0,
        goodCount: crtGood,
        goodPct: totalStudents > 0 ? Number(((crtGood / totalStudents) * 100).toFixed(1)) : 0,
      },
    };

    const studentDistribution = {
      '1': studentCountByYear[1] || 0,
      '2': studentCountByYear[2] || 0,
      '3': studentCountByYear[3] || 0,
      '4': studentCountByYear[4] || 0
    };

    res.status(200).json({
      summary: {
        totalStudents,
        avgCGPA,
        overallCGPA: avgCGPA,
        highestCGPA: Number(highestCGPA.toFixed(2)),
        lowestCGPA: studentWithStatsCount > 0 ? Number(lowestCGPA.toFixed(2)) : 0,
        overallAttendance: avgAttendance,
        avgProfileScore,
        placementRatePct: totalStudents > 0 ? Number(((placedCount / totalStudents) * 100).toFixed(1)) : 0,
        totalAchievements,
        totalCompaniesVisiting: companies.length,
        totalRGrades,
        totalIGrades,
        totalExtraCurricular,
        totalCoCurricular,
        totalSports,
        totalNssNcc,
        totalManagerial,
        totalStarCoders,
        totalGreIelts,
        totalCertifications,
        totalProjects,
        avgCrtPerformance,
        employabilityIndex,
        employabilityLabel,
        placementReadiness,
        placementReadyCount,
        higherStudiesPct,
        totalFaculty,
        totalHODs,
        pendingApprovals,
        approvedAchievements,
        rejectedAchievements
      },
      departmentsComparison,
      departmentComparison: departmentsComparison,
      studentDistribution,
      cgpaDistribution,
      attendanceTrend,
      employabilityBreakdown,
      participationOverview,
      activityPercentage,
      academicPerformanceMix,
      crtPerformanceDistribution,
      riskAnalysis,
      lastUpdated: new Date()
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Helper for drilldown metric ranges
const getMetricRanges = (metric: string): string[] => {
  switch (metric) {
    case 'placementReady':
      return ['100% Ready', '90-99%', '80-89%', '70-79%', 'Below 70%'];
    case 'cgpa':
      return ['9-10', '8-9', '7-8', '6-7', 'Below 6'];
    case 'attendance':
      return ['95-100%', '90-95%', '85-90%', '75-85%', 'Below 75%'];
    case 'backlogs':
      return ['No Backlogs', '1 Backlog', '2 Backlogs', '3+ Critical'];
    case 'certifications':
      return ['5+ Certifications', '3-4', '1-2', '0'];
    case 'internships':
      return ['Paid', 'Unpaid', 'Virtual', 'Onsite', 'None'];
    case 'projects':
      return ['Minor', 'Major', 'Research', 'Industry', 'None'];
    case 'coding':
      return ['LeetCode', 'CodeChef', 'HackerRank', 'GitHub', 'None'];
    case 'placementDashboard':
      return ['Eligible Students', 'Placed Students', 'Multiple Offers'];
    case 'risk':
      return ['Low Attendance', 'High Backlogs', 'Low Academic Performance', 'No Certifications', 'No Projects'];
    case 'higherStudies':
      return ['GRE', 'IELTS', 'TOEFL', 'GATE', 'None'];
    default:
      return [];
  }
};

// @desc    Get interactive drilldown data for institutional admin (Power BI style)
// @route   GET /api/analytics/institution/drilldown
// @access  Private (Admin)
export const getInstitutionDrilldown = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { metric, range, department, year } = req.query;

    if (!metric) {
      res.status(400).json({ message: 'Metric parameter is required.' });
      return;
    }

    const metricStr = String(metric);

    // Initial student filter (optimized by applying query filters at DB level)
    const studentFilter: any = {};
    if (department) studentFilter.department = String(department);
    if (year) studentFilter.year = Number(year);

    const students = await Student.find(studentFilter).populate('userId', 'name email').lean();
    const studentIds = students.map(s => s._id);

    // Fetch related collections for student subset
    const [academics, attendance, profiles, achievements, certifications, projects, companies] = await Promise.all([
      Academic.find({ studentId: { $in: studentIds } } as any).lean(),
      Attendance.find({ studentId: { $in: studentIds } } as any).lean(),
      Profile.find({ studentId: { $in: studentIds } } as any).lean(),
      Achievement.find({ studentId: { $in: studentIds } } as any).lean(),
      Certification.find({ studentId: { $in: studentIds } } as any).lean(),
      Project.find({ studentId: { $in: studentIds } } as any).lean(),
      Company.find({}).lean()
    ]);

    // Build index maps
    const academicsMap = new Map<string, any[]>();
    academics.forEach(ac => {
      const sid = ac.studentId.toString();
      if (!academicsMap.has(sid)) academicsMap.set(sid, []);
      academicsMap.get(sid)!.push(ac);
    });

    const attendanceMap = new Map<string, any[]>();
    attendance.forEach(att => {
      const sid = att.studentId.toString();
      if (!attendanceMap.has(sid)) attendanceMap.set(sid, []);
      attendanceMap.get(sid)!.push(att);
    });

    const profilesMap = new Map<string, any>();
    profiles.forEach(p => profilesMap.set(p.studentId.toString(), p));

    const achievementsMap = new Map<string, any[]>();
    achievements.forEach(ach => {
      const sid = ach.studentId.toString();
      if (!achievementsMap.has(sid)) achievementsMap.set(sid, []);
      achievementsMap.get(sid)!.push(ach);
    });

    const certificationsMap = new Map<string, any[]>();
    certifications.forEach(c => {
      const sid = c.studentId.toString();
      if (!certificationsMap.has(sid)) certificationsMap.set(sid, []);
      certificationsMap.get(sid)!.push(c);
    });

    const projectsMap = new Map<string, any[]>();
    projects.forEach(p => {
      const sid = p.studentId.toString();
      if (!projectsMap.has(sid)) projectsMap.set(sid, []);
      projectsMap.get(sid)!.push(p);
    });

    const getStudentMetricValue = (student: any): { value: any } => {
      const sIdStr = student._id.toString();

      // CGPA
      const studentAc = academicsMap.get(sIdStr) || [];
      const sgpas = studentAc.map(r => r.sgpa).filter(val => val !== undefined && val !== null);
      const cgpa = sgpas.length > 0 ? Number((sgpas.reduce((a, b) => a + b, 0) / sgpas.length).toFixed(2)) : 0;

      // Attendance
      const studentAtt = attendanceMap.get(sIdStr) || [];
      const totalClasses = studentAtt.reduce((acc, curr) => acc + curr.total, 0);
      const totalAttended = studentAtt.reduce((acc, curr) => acc + curr.attended, 0);
      const attendancePct = totalClasses > 0 ? Number(((totalAttended / totalClasses) * 100).toFixed(1)) : 0;

      // Backlogs
      const activeBacklogs = studentAc.reduce((acc, curr) => acc + (curr.activeBacklogs || 0), 0);

      // Certifications
      const approvedCerts = (certificationsMap.get(sIdStr) || []).filter(c => ['APPROVED', 'VERIFIED'].includes(c.status)).length;
      const approvedAchCerts = (achievementsMap.get(sIdStr) || []).filter(a => a.type === 'CERTIFICATION' && ['APPROVED', 'VERIFIED'].includes(a.status)).length;
      const certificationsCount = approvedCerts + approvedAchCerts;

      // Projects
      const approvedProjs = (projectsMap.get(sIdStr) || []).filter(p => ['APPROVED', 'VERIFIED'].includes(p.status)).length;
      const approvedAchProjs = (achievementsMap.get(sIdStr) || []).filter(a => a.type === 'PROJECT' && ['APPROVED', 'VERIFIED'].includes(a.status)).length;
      const projectsCount = approvedProjs + approvedAchProjs;

      // Internships
      const studentAch = achievementsMap.get(sIdStr) || [];
      const internships = studentAch.filter(a => a.type === 'INTERNSHIP' && ['APPROVED', 'VERIFIED'].includes(a.status));
      const internshipCount = internships.length;
      let internshipType = 'None';
      if (internshipCount > 0) {
        const text = `${internships[0].title} ${internships[0].description}`.toLowerCase();
        if (text.includes('paid')) internshipType = 'Paid';
        else if (text.includes('unpaid')) internshipType = 'Unpaid';
        else if (text.includes('virtual') || text.includes('remote')) internshipType = 'Virtual';
        else if (text.includes('onsite') || text.includes('office') || text.includes('in-office')) internshipType = 'Onsite';
        else internshipType = 'Unpaid';
      }

      // Projects Types
      let projectType = 'None';
      if (projectsCount > 0) {
        const mainProjs = (projectsMap.get(sIdStr) || []).filter(p => ['APPROVED', 'VERIFIED'].includes(p.status));
        if (mainProjs.length > 0) {
          const text = `${mainProjs[0].title} ${mainProjs[0].description}`.toLowerCase();
          if (text.includes('minor')) projectType = 'Minor';
          else if (text.includes('major')) projectType = 'Major';
          else if (text.includes('research')) projectType = 'Research';
          else if (text.includes('industry')) projectType = 'Industry';
          else projectType = 'Major';
        } else {
          const achProjs = studentAch.filter(a => a.type === 'PROJECT' && ['APPROVED', 'VERIFIED'].includes(a.status));
          if (achProjs.length > 0) {
            const text = `${achProjs[0].title} ${achProjs[0].description}`.toLowerCase();
            if (text.includes('minor')) projectType = 'Minor';
            else if (text.includes('major')) projectType = 'Major';
            else if (text.includes('research')) projectType = 'Research';
            else if (text.includes('industry')) projectType = 'Industry';
            else projectType = 'Major';
          }
        }
      }

      // Coding Platforms
      const profile = profilesMap.get(sIdStr);
      const codingPlatformsList: string[] = [];
      if (profile?.profiles?.leetcode) codingPlatformsList.push('LeetCode');
      if (profile?.profiles?.codechef) codingPlatformsList.push('CodeChef');
      if (profile?.profiles?.hackerrank) codingPlatformsList.push('HackerRank');
      if (profile?.profiles?.github) codingPlatformsList.push('GitHub');

      // Placement status & eligibility
      let isPlaced = false;
      let placedCompany = '';
      let salaryPackage = 0;
      let selectedOffers = 0;
      for (const comp of companies) {
        const applicant = comp.applicants?.find((a: any) => a.studentId.toString() === sIdStr);
        if (applicant && applicant.status === 'SELECTED') {
          isPlaced = true;
          salaryPackage = comp.packageAmount;
          placedCompany = comp.name;
          selectedOffers++;
        }
      }
      const isEligible = cgpa >= 7.0 && activeBacklogs === 0 && attendancePct >= 75;

      return {
        value: {
          cgpa,
          attendancePct,
          activeBacklogs,
          certificationsCount,
          projectsCount,
          internshipCount,
          internshipType,
          projectType,
          codingPlatformsList,
          isPlaced,
          placedCompany,
          salaryPackage,
          selectedOffers,
          isEligible,
          overallScore: student.overallScore || 0
        }
      };
    };

    const studentMatchesRange = (student: any, targetRange: string): boolean => {
      const { value } = getStudentMetricValue(student);
      
      if (metricStr === 'placementReady') {
        const score = value.overallScore;
        if (targetRange === '100% Ready') return score === 100;
        if (targetRange === '90-99%') return score >= 90 && score < 100;
        if (targetRange === '80-89%') return score >= 80 && score < 90;
        if (targetRange === '70-79%') return score >= 70 && score < 80;
        if (targetRange === 'Below 70%') return score < 70;
      }
      if (metricStr === 'cgpa') {
        const gpa = value.cgpa;
        if (targetRange === '9-10') return gpa >= 9.0;
        if (targetRange === '8-9') return gpa >= 8.0 && gpa < 9.0;
        if (targetRange === '7-8') return gpa >= 7.0 && gpa < 8.0;
        if (targetRange === '6-7') return gpa >= 6.0 && gpa < 7.0;
        if (targetRange === 'Below 6') return gpa < 6.0;
      }
      if (metricStr === 'attendance') {
        const att = value.attendancePct;
        if (targetRange === '95-100%') return att >= 95;
        if (targetRange === '90-95%') return att >= 90 && att < 95;
        if (targetRange === '85-90%') return att >= 85 && att < 90;
        if (targetRange === '75-85%') return att >= 75 && att < 85;
        if (targetRange === 'Below 75%') return att < 75;
      }
      if (metricStr === 'backlogs') {
        const backlogs = value.activeBacklogs;
        if (targetRange === 'No Backlogs') return backlogs === 0;
        if (targetRange === '1 Backlog') return backlogs === 1;
        if (targetRange === '2 Backlogs') return backlogs === 2;
        if (targetRange === '3+ Critical') return backlogs >= 3;
      }
      if (metricStr === 'certifications') {
        const certs = value.certificationsCount;
        if (targetRange === '5+ Certifications') return certs >= 5;
        if (targetRange === '3-4') return certs >= 3 && certs <= 4;
        if (targetRange === '1-2') return certs >= 1 && certs <= 2;
        if (targetRange === '0') return certs === 0;
      }
      if (metricStr === 'internships') {
        return value.internshipType === targetRange;
      }
      if (metricStr === 'projects') {
        return value.projectType === targetRange;
      }
      if (metricStr === 'coding') {
        if (targetRange === 'None') return value.codingPlatformsList.length === 0;
        return value.codingPlatformsList.includes(targetRange);
      }
      if (metricStr === 'placementDashboard') {
        if (targetRange === 'Eligible Students') return value.isEligible;
        if (targetRange === 'Placed Students') return value.isPlaced;
        if (targetRange === 'Multiple Offers') return value.selectedOffers > 1;
      }
      if (metricStr === 'risk') {
        if (targetRange === 'Low Attendance') return value.attendancePct < 75;
        if (targetRange === 'High Backlogs') return value.activeBacklogs >= 3;
        if (targetRange === 'Low Academic Performance') return value.cgpa < 6.5;
        if (targetRange === 'No Certifications') return value.certificationsCount === 0;
        if (targetRange === 'No Projects') return value.projectsCount === 0;
      }
      if (metricStr === 'higherStudies') {
        const sId = student._id.toString();
        const approvedCerts = (certificationsMap.get(sId) || []).filter(c => ['APPROVED', 'VERIFIED'].includes(String(c.status).toUpperCase()));
        const matched = approvedCerts.some(c => String(c.title || c.issuer || '').match(new RegExp(targetRange, 'i')));
        if (targetRange === 'None') {
          return !approvedCerts.some(c => String(c.title || c.issuer || '').match(/gre|ielts|toefl|gate/i));
        }
        return matched;
      }
      return false;
    };

    // Filter students array based on target range
    let filtered = students;
    if (range) {
      filtered = students.filter(student => studentMatchesRange(student, String(range)));
    }

    // Determine current level based on provided query parameters
    if (!range) {
      // LEVEL 1: Ranges / Distribution
      const ranges = getMetricRanges(metricStr);
      const data = ranges.map(r => {
        const count = students.filter(s => studentMatchesRange(s, r)).length;
        const pct = students.length > 0 ? Number(((count / students.length) * 100).toFixed(1)) : 0;
        return { name: r, count, pct };
      });
      res.status(200).json({ level: 'distribution', data });
      return;
    }

    if (!department) {
      // LEVEL 2: Department-wise counts
      const deptMap: Record<string, number> = {};
      filtered.forEach(s => {
        deptMap[s.department] = (deptMap[s.department] || 0) + 1;
      });
      const data = Object.keys(deptMap).map(d => ({
        name: d,
        count: deptMap[d],
        pct: filtered.length > 0 ? Number(((deptMap[d] / filtered.length) * 100).toFixed(1)) : 0
      })).sort((a, b) => b.count - a.count);
      res.status(200).json({ level: 'department', data });
      return;
    }

    if (!year) {
      // LEVEL 3: Year-wise counts
      const yearMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
      filtered.forEach(s => {
        if (s.year >= 1 && s.year <= 4) {
          yearMap[s.year] = (yearMap[s.year] || 0) + 1;
        }
      });
      const data = [1, 2, 3, 4].map(y => ({
        name: `${y}${y === 1 ? 'st' : y === 2 ? 'nd' : y === 3 ? 'rd' : 'th'} Year`,
        value: String(y),
        count: yearMap[y],
        pct: filtered.length > 0 ? Number(((yearMap[y] / filtered.length) * 100).toFixed(1)) : 0
      }));
      res.status(200).json({ level: 'year', data });
      return;
    }

    const data = filtered.map(s => {
      const { value } = getStudentMetricValue(s);
      const sIdStr = s._id.toString();
      return {
        _id: s._id,
        rollNumber: s.rollNumber,
        name: (s.userId as any)?.name || 'Unknown',
        email: (s.userId as any)?.email || '',
        section: s.section,
        cgpa: value.cgpa,
        attendancePct: value.attendancePct,
        activeBacklogs: value.activeBacklogs,
        isEligible: value.isEligible,
        isPlaced: value.isPlaced,
        placedCompany: value.placedCompany,
        salaryPackage: value.salaryPackage,
        overallScore: value.overallScore,
        profiles: profilesMap.get(sIdStr)?.profiles || {},
        achievements: (achievementsMap.get(sIdStr) || []).filter(a => a.status === 'VERIFIED'),
        projects: (projectsMap.get(sIdStr) || []).filter(p => p.status === 'VERIFIED'),
        certifications: (certificationsMap.get(sIdStr) || []).filter(c => c.status === 'VERIFIED')
      };
    });
    res.status(200).json({ level: 'student', data });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

type InstitutionKpiFilters = {
  department?: string;
  year?: number;
  section?: string;
  studentId?: string;
  attendanceCategory?: string;
  cgpaCategory?: string;
  profileScoreCategory?: string;
  backlogsCategory?: string;
};

type InstitutionKpiRecord = {
  id: string;
  studentId: string;
  name: string;
  email: string;
  rollNumber: string;
  branch: string;
  department: string;
  year: number;
  semester: number;
  section: string;
  gender: string;
  cgpa: number;
  attendancePct: number;
  profileScore: number;
  profileCompletion: number;
  activeBacklogs: number;
  averageBacklogs: number;
  highestBacklogs: number;
  isPlaced: boolean;
  placedCompany: string;
  salaryPackage: number;
  placementReady: boolean;
  latestSemester: number;
  skillsCount: number;
  subjectsCount: number;
  academics: any[];
  attendances: any[];
  profile: any;
};

const buildInstitutionKpiStudentFilter = (filters: InstitutionKpiFilters): any => {
  const studentFilter: any = {};
  if (filters.studentId) studentFilter._id = filters.studentId;
  if (filters.department) studentFilter.department = String(filters.department);
  if (filters.year) studentFilter.year = Number(filters.year);
  if (filters.section && filters.section !== 'ALL') studentFilter.section = String(filters.section);
  return studentFilter;
};

const buildInstitutionKpiPlacementMap = (companies: any[]): Map<string, { placedCompany: string; salaryPackage: number }> => {
  const placementMap = new Map<string, { placedCompany: string; salaryPackage: number }>();

  for (const company of companies) {
    const applicants = Array.isArray(company.applicants) ? company.applicants : [];
    for (const applicant of applicants) {
      if (String(applicant?.status || '').toUpperCase() !== 'SELECTED') continue;
      const studentId = applicant.studentId?.toString();
      if (!studentId || placementMap.has(studentId)) continue;
      placementMap.set(studentId, {
        placedCompany: company.name || '',
        salaryPackage: Number(company.packageAmount || 0),
      });
    }
  }

  return placementMap;
};

const hydrateInstitutionKpiRecords = async (filters: InstitutionKpiFilters): Promise<InstitutionKpiRecord[]> => {
  const studentFilter = buildInstitutionKpiStudentFilter(filters);

  const pipeline: any[] = [
    { $match: studentFilter },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $lookup: {
        from: 'academics',
        let: { studentId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$studentId', '$$studentId'] } } },
          { $sort: { semester: 1 } },
        ],
        as: 'academics',
      },
    },
    {
      $lookup: {
        from: 'attendances',
        let: { studentId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$studentId', '$$studentId'] } } },
        ],
        as: 'attendances',
      },
    },
    {
      $lookup: {
        from: 'profiles',
        localField: '_id',
        foreignField: 'studentId',
        as: 'profile',
      },
    },
    {
      $project: {
        _id: 1,
        user: { $first: '$user' },
        rollNumber: 1,
        branch: 1,
        department: 1,
        year: 1,
        section: 1,
        gender: 1,
        overallScore: 1,
        academics: 1,
        attendances: 1,
        profile: { $first: '$profile' },
      },
    },
  ];

  const [students, companies] = await Promise.all([
    Student.aggregate(pipeline),
    Company.find({}).lean(),
  ]);

  const placementMap = buildInstitutionKpiPlacementMap(companies as any[]);

  let records = students.map((student: any) => {
    const academics = Array.isArray(student.academics) ? student.academics : [];
    const attendances = Array.isArray(student.attendances) ? student.attendances : [];
    const profile = student.profile || null;
    const sgpas = academics.map((record: any) => record.sgpa).filter((value: any) => value !== undefined && value !== null);
    const cgpa = sgpas.length > 0 ? Number((sgpas.reduce((sum: number, value: number) => sum + value, 0) / sgpas.length).toFixed(2)) : 0;
    const totalClasses = attendances.reduce((sum: number, record: any) => sum + (record.total || 0), 0);
    const totalAttended = attendances.reduce((sum: number, record: any) => sum + (record.attended || 0), 0);
    const attendancePct = totalClasses > 0 ? Number(((totalAttended / totalClasses) * 100).toFixed(1)) : 0;
    const activeBacklogs = academics.reduce((sum: number, record: any) => sum + (record.activeBacklogs || 0), 0);
    const highestBacklogs = academics.length > 0 ? Math.max(...academics.map((record: any) => record.activeBacklogs || 0)) : 0;
    const averageBacklogs = academics.length > 0 ? Number((activeBacklogs / academics.length).toFixed(2)) : 0;
    const latestSemester = academics.length > 0 ? Math.max(...academics.map((record: any) => Number(record.semester || 0))) : Number(student.year || 0) * 2;
    const profileScore = Number(student.overallScore || 0);
    const profileCompletion = Number(profile?.profileCompletion || 0);
    const skillsCount = (profile?.skills?.technical?.length || 0) + (profile?.skills?.soft?.length || 0);
    const subjectsCount = academics.reduce((sum: number, record: any) => sum + (Array.isArray(record.subjects) ? record.subjects.length : 0), 0);
    const placement = placementMap.get(student._id.toString()) || { placedCompany: '', salaryPackage: 0 };
    const placementReady = cgpa >= 7 && attendancePct >= 75 && activeBacklogs === 0 && profileScore >= 70;

    return {
      id: student._id.toString(),
      studentId: student._id.toString(),
      name: (student.user as any)?.name || 'Unknown',
      email: (student.user as any)?.email || '',
      rollNumber: student.rollNumber,
      branch: student.branch || '',
      department: student.department || '',
      year: Number(student.year || 0),
      semester: latestSemester,
      section: student.section || 'A',
      gender: student.gender || '',
      cgpa,
      attendancePct,
      profileScore,
      profileCompletion,
      activeBacklogs,
      averageBacklogs,
      highestBacklogs,
      isPlaced: !!placement.placedCompany,
      placedCompany: placement.placedCompany,
      salaryPackage: placement.salaryPackage,
      placementReady,
      latestSemester,
      skillsCount,
      subjectsCount,
      academics,
      attendances,
      profile,
    };
  });

  if (filters.attendanceCategory && filters.attendanceCategory !== 'ALL') {
    const cat = filters.attendanceCategory;
    if (cat === 'LT75') records = records.filter((r) => r.attendancePct < 75);
    else if (cat === '75-80') records = records.filter((r) => r.attendancePct >= 75 && r.attendancePct <= 80);
    else if (cat === '80-90') records = records.filter((r) => r.attendancePct >= 80 && r.attendancePct <= 90);
    else if (cat === 'GT90') records = records.filter((r) => r.attendancePct > 90);
  }

  if (filters.cgpaCategory && filters.cgpaCategory !== 'ALL') {
    const cat = filters.cgpaCategory;
    if (cat === 'LT6') records = records.filter((r) => r.cgpa < 6.0);
    else if (cat === '6-7') records = records.filter((r) => r.cgpa >= 6.0 && r.cgpa <= 7.0);
    else if (cat === '7-8') records = records.filter((r) => r.cgpa >= 7.0 && r.cgpa <= 8.0);
    else if (cat === 'GT8') records = records.filter((r) => r.cgpa > 8.0);
  }

  if (filters.profileScoreCategory && filters.profileScoreCategory !== 'ALL') {
    const cat = filters.profileScoreCategory;
    if (cat === 'LT50') records = records.filter((r) => r.profileScore < 50);
    else if (cat === '50-70') records = records.filter((r) => r.profileScore >= 50 && r.profileScore <= 70);
    else if (cat === '70-85') records = records.filter((r) => r.profileScore >= 70 && r.profileScore <= 85);
    else if (cat === 'GT85') records = records.filter((r) => r.profileScore > 85);
  }

  if (filters.backlogsCategory && filters.backlogsCategory !== 'ALL') {
    const cat = filters.backlogsCategory;
    if (cat === '1') records = records.filter((r) => r.activeBacklogs === 1);
    else if (cat === '2-3') records = records.filter((r) => r.activeBacklogs >= 2 && r.activeBacklogs <= 3);
    else if (cat === '4+') records = records.filter((r) => r.activeBacklogs >= 4);
    else if (cat === 'ALL_BACKLOGS') records = records.filter((r) => r.activeBacklogs > 0);
  }

  return records;
};

export const getInstitutionKpiSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const filters: InstitutionKpiFilters = {
      department: req.query.department ? String(req.query.department) : undefined,
      year: req.query.year ? Number(req.query.year) : undefined,
    };

    const records = await hydrateInstitutionKpiRecords(filters);
    const totalStudents = records.length;
    const avgCgpa = totalStudents > 0 ? Number((records.reduce((sum, record) => sum + record.cgpa, 0) / totalStudents).toFixed(2)) : 0;
    const avgAttendance = totalStudents > 0 ? Number((records.reduce((sum, record) => sum + record.attendancePct, 0) / totalStudents).toFixed(1)) : 0;
    const avgProfileScore = totalStudents > 0 ? Number((records.reduce((sum, record) => sum + record.profileScore, 0) / totalStudents).toFixed(2)) : 0;
    const studentsWithBacklogs = records.filter((record) => record.activeBacklogs > 0).length;

    res.status(200).json({
      summary: {
        totalStudents,
        avgCgpa,
        avgAttendance,
        avgProfileScore,
        studentsWithBacklogs,
      },
      filters,
      lastUpdated: new Date(),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getInstitutionKpiDepartments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const filters: InstitutionKpiFilters = {
      department: req.query.department ? String(req.query.department) : undefined,
      year: req.query.year ? Number(req.query.year) : undefined,
      section: req.query.section ? String(req.query.section) : undefined,
      attendanceCategory: req.query.attendanceCategory ? String(req.query.attendanceCategory) : undefined,
      cgpaCategory: req.query.cgpaCategory ? String(req.query.cgpaCategory) : undefined,
      profileScoreCategory: req.query.profileScoreCategory ? String(req.query.profileScoreCategory) : undefined,
      backlogsCategory: req.query.backlogsCategory ? String(req.query.backlogsCategory) : undefined,
    };

    const metric = String(req.query.metric || 'totalStudents');
    const records = await hydrateInstitutionKpiRecords(filters);
    const departmentMap = new Map<string, any>();

    for (const record of records) {
      const key = record.department || 'Unknown';
      if (!departmentMap.has(key)) {
        departmentMap.set(key, {
          department: key,
          totalStudents: 0,
          avgCgpaSum: 0,
          avgAttendanceSum: 0,
          avgProfileScoreSum: 0,
          backlogsCount: 0,
          maleStudents: 0,
          femaleStudents: 0,
          placementReadyStudents: 0,
          topPerformer: null,
        });
      }

      const dept = departmentMap.get(key);
      dept.totalStudents += 1;
      dept.avgCgpaSum += record.cgpa;
      dept.avgAttendanceSum += record.attendancePct;
      dept.avgProfileScoreSum += record.profileScore;
      dept.backlogsCount += record.activeBacklogs > 0 ? 1 : 0;
      dept.maleStudents += record.gender === 'M' ? 1 : 0;
      dept.femaleStudents += record.gender === 'F' ? 1 : 0;
      dept.placementReadyStudents += record.placementReady ? 1 : 0;

      if (!dept.topPerformer || record.profileScore > dept.topPerformer.profileScore) {
        dept.topPerformer = {
          studentId: record.studentId,
          name: record.name,
          rollNumber: record.rollNumber,
          profileScore: record.profileScore,
          cgpa: record.cgpa,
        };
      }
    }

    const departments = Array.from(departmentMap.values()).map((dept) => ({
      department: dept.department,
      totalStudents: dept.totalStudents,
      avgCgpa: dept.totalStudents > 0 ? Number((dept.avgCgpaSum / dept.totalStudents).toFixed(2)) : 0,
      avgAttendance: dept.totalStudents > 0 ? Number((dept.avgAttendanceSum / dept.totalStudents).toFixed(1)) : 0,
      avgProfileScore: dept.totalStudents > 0 ? Number((dept.avgProfileScoreSum / dept.totalStudents).toFixed(2)) : 0,
      studentsWithBacklogs: dept.backlogsCount,
      maleStudents: dept.maleStudents,
      femaleStudents: dept.femaleStudents,
      placementReadyStudents: dept.placementReadyStudents,
      topPerformer: dept.topPerformer,
    })).sort((left, right) => {
      if (metric === 'avgCgpa') return right.avgCgpa - left.avgCgpa;
      if (metric === 'avgAttendance') return right.avgAttendance - left.avgAttendance;
      if (metric === 'avgProfileScore') return right.avgProfileScore - left.avgProfileScore;
      if (metric === 'studentsWithBacklogs') return right.studentsWithBacklogs - left.studentsWithBacklogs;
      return right.totalStudents - left.totalStudents;
    });

    res.status(200).json({ departments });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getInstitutionKpiDepartmentDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const department = String(req.query.department || '').trim();

    const filters: InstitutionKpiFilters = {
      department: department && department.toUpperCase() !== 'ALL' ? department : undefined,
      year: req.query.year ? Number(req.query.year) : undefined,
      section: req.query.section ? String(req.query.section) : undefined,
      attendanceCategory: req.query.attendanceCategory ? String(req.query.attendanceCategory) : undefined,
      cgpaCategory: req.query.cgpaCategory ? String(req.query.cgpaCategory) : undefined,
      profileScoreCategory: req.query.profileScoreCategory ? String(req.query.profileScoreCategory) : undefined,
      backlogsCategory: req.query.backlogsCategory ? String(req.query.backlogsCategory) : undefined,
    };

    const records = await hydrateInstitutionKpiRecords(filters);
    const totalStudents = records.length;
    const cgpaValues = records.map((record) => record.cgpa);
    const attendanceValues = records.map((record) => record.attendancePct);
    const profileScores = records.map((record) => record.profileScore);
    const backlogValues = records.map((record) => record.activeBacklogs);

    const highestCgpaRecord = records.reduce((best, current) => (best === null || current.cgpa > best.cgpa ? current : best), null as any);
    const lowestCgpaRecord = records.reduce((best, current) => (best === null || current.cgpa < best.cgpa ? current : best), null as any);
    const highestAttendanceRecord = records.reduce((best, current) => (best === null || current.attendancePct > best.attendancePct ? current : best), null as any);
    const lowestAttendanceRecord = records.reduce((best, current) => (best === null || current.attendancePct < best.attendancePct ? current : best), null as any);
    const highestProfileRecord = records.reduce((best, current) => (best === null || current.profileScore > best.profileScore ? current : best), null as any);
    const lowestProfileRecord = records.reduce((best, current) => (best === null || current.profileScore < best.profileScore ? current : best), null as any);

    const avgCgpa = totalStudents > 0 ? Number((cgpaValues.reduce((sum, value) => sum + value, 0) / totalStudents).toFixed(2)) : 0;
    const avgAttendance = totalStudents > 0 ? Number((attendanceValues.reduce((sum, value) => sum + value, 0) / totalStudents).toFixed(1)) : 0;
    const avgProfileScore = totalStudents > 0 ? Number((profileScores.reduce((sum, value) => sum + value, 0) / totalStudents).toFixed(2)) : 0;
    const totalBacklogs = backlogValues.reduce((sum, value) => sum + value, 0);
    const studentsWithBacklogs = records.filter((record) => record.activeBacklogs > 0).length;
    const averageBacklogs = totalStudents > 0 ? Number((totalBacklogs / totalStudents).toFixed(2)) : 0;
    const highestBacklogs = backlogValues.length > 0 ? Math.max(...backlogValues) : 0;
    const maleStudents = records.filter((record) => record.gender === 'M').length;
    const femaleStudents = records.filter((record) => record.gender === 'F').length;
    const placementReadyStudents = records.filter((record) => record.placementReady).length;
    const studentsRequiringAttention = records.filter((record) => record.cgpa < 6.5 || record.attendancePct < 75 || record.activeBacklogs > 0 || record.profileScore < 70).length;

    const topPerformer = highestProfileRecord
      ? {
          studentId: highestProfileRecord.studentId,
          name: highestProfileRecord.name,
          rollNumber: highestProfileRecord.rollNumber,
          cgpa: highestProfileRecord.cgpa,
          attendancePct: highestProfileRecord.attendancePct,
          profileScore: highestProfileRecord.profileScore,
        }
      : null;

    const cgpaDistribution = [
      { label: '9-10', count: records.filter((record) => record.cgpa >= 9).length },
      { label: '8-9', count: records.filter((record) => record.cgpa >= 8 && record.cgpa < 9).length },
      { label: '7-8', count: records.filter((record) => record.cgpa >= 7 && record.cgpa < 8).length },
      { label: '6-7', count: records.filter((record) => record.cgpa >= 6 && record.cgpa < 7).length },
      { label: '<6', count: records.filter((record) => record.cgpa < 6).length },
    ];

    const attendanceDistribution = [
      { label: '95-100', count: records.filter((record) => record.attendancePct >= 95).length },
      { label: '85-95', count: records.filter((record) => record.attendancePct >= 85 && record.attendancePct < 95).length },
      { label: '75-85', count: records.filter((record) => record.attendancePct >= 75 && record.attendancePct < 85).length },
      { label: '60-75', count: records.filter((record) => record.attendancePct >= 60 && record.attendancePct < 75).length },
      { label: '<60', count: records.filter((record) => record.attendancePct < 60).length },
    ];

    const attentionStudents = records
      .filter((record) => record.cgpa < 6.5 || record.attendancePct < 75 || record.activeBacklogs > 0 || record.profileScore < 70)
      .sort((left, right) => left.profileScore - right.profileScore)
      .slice(0, 5)
      .map((record) => ({
        studentId: record.studentId,
        name: record.name,
        rollNumber: record.rollNumber,
        cgpa: record.cgpa,
        attendancePct: record.attendancePct,
        profileScore: record.profileScore,
        activeBacklogs: record.activeBacklogs,
      }));

    const yearWiseMap = new Map<number, { year: number; label: string; count: number; cgpaSum: number; attendanceSum: number; profileScoreSum: number; backlogsCount: number }>();
    for (let y = 1; y <= 4; y++) {
      yearWiseMap.set(y, {
        year: y,
        label: y === 1 ? '1st Year' : y === 2 ? '2nd Year' : y === 3 ? '3rd Year' : '4th Year',
        count: 0,
        cgpaSum: 0,
        attendanceSum: 0,
        profileScoreSum: 0,
        backlogsCount: 0,
      });
    }

    for (const record of records) {
      const y = Number(record.year) || 1;
      const item = yearWiseMap.get(y) || { year: y, label: `${y}th Year`, count: 0, cgpaSum: 0, attendanceSum: 0, profileScoreSum: 0, backlogsCount: 0 };
      item.count += 1;
      item.cgpaSum += record.cgpa;
      item.attendanceSum += record.attendancePct;
      item.profileScoreSum += record.profileScore;
      item.backlogsCount += record.activeBacklogs > 0 ? 1 : 0;
      yearWiseMap.set(y, item);
    }

    const yearWise = Array.from(yearWiseMap.values()).map((item) => ({
      year: item.year,
      label: item.label,
      totalStudents: item.count,
      avgCgpa: item.count > 0 ? Number((item.cgpaSum / item.count).toFixed(2)) : 0,
      avgAttendance: item.count > 0 ? Number((item.attendanceSum / item.count).toFixed(1)) : 0,
      avgProfileScore: item.count > 0 ? Number((item.profileScoreSum / item.count).toFixed(2)) : 0,
      studentsWithBacklogs: item.backlogsCount,
    }));

    res.status(200).json({
      department: {
        department,
        totalStudents,
        maleStudents,
        femaleStudents,
        avgCgpa,
        highestCgpa: highestCgpaRecord ? highestCgpaRecord.cgpa : 0,
        lowestCgpa: lowestCgpaRecord ? lowestCgpaRecord.cgpa : 0,
        avgAttendance,
        highestAttendance: highestAttendanceRecord ? highestAttendanceRecord.attendancePct : 0,
        lowestAttendance: lowestAttendanceRecord ? lowestAttendanceRecord.attendancePct : 0,
        avgProfileScore,
        highestProfileScore: highestProfileRecord ? highestProfileRecord.profileScore : 0,
        lowestProfileScore: lowestProfileRecord ? lowestProfileRecord.profileScore : 0,
        studentsWithBacklogs,
        averageBacklogs,
        highestBacklogs,
        placementReadyStudents,
        topPerformer,
        studentsRequiringAttention,
      },
      charts: {
        cgpaDistribution,
        attendanceDistribution,
      },
      yearWise,
      attentionStudents,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getInstitutionKpiStudents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const metric = String(req.query.metric || 'totalStudents');
    const search = String(req.query.search || '').trim().toLowerCase();
    const placementStatus = String(req.query.placementStatus || 'ALL').toUpperCase();
    const backlogsOnly = String(req.query.backlogsOnly || '').toLowerCase() === 'true' || metric === 'studentsWithBacklogs';
    const sortBy = String(req.query.sortBy || (metric === 'avgCgpa' ? 'cgpa' : metric === 'avgAttendance' ? 'attendancePct' : metric === 'avgProfileScore' ? 'profileScore' : metric === 'studentsWithBacklogs' ? 'activeBacklogs' : 'rollNumber'));
    const sortOrder = String(req.query.sortOrder || (sortBy === 'rollNumber' ? 'asc' : 'desc')).toLowerCase() === 'asc' ? 1 : -1;
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 10)));
    const exportRows = String(req.query.export || '').toLowerCase() === 'true';

    const filters: InstitutionKpiFilters = {
      department: req.query.department ? String(req.query.department) : undefined,
      year: req.query.year ? Number(req.query.year) : undefined,
      section: req.query.section ? String(req.query.section) : undefined,
      attendanceCategory: req.query.attendanceCategory ? String(req.query.attendanceCategory) : undefined,
      cgpaCategory: req.query.cgpaCategory ? String(req.query.cgpaCategory) : undefined,
      profileScoreCategory: req.query.profileScoreCategory ? String(req.query.profileScoreCategory) : undefined,
      backlogsCategory: req.query.backlogsCategory ? String(req.query.backlogsCategory) : undefined,
    };

    let records = await hydrateInstitutionKpiRecords(filters);

    if (search) {
      records = records.filter((record) =>
        record.rollNumber.toLowerCase().includes(search) ||
        record.name.toLowerCase().includes(search) ||
        record.email.toLowerCase().includes(search)
      );
    }

    if (placementStatus === 'PLACED') {
      records = records.filter((record) => record.isPlaced);
    } else if (placementStatus === 'UNPLACED') {
      records = records.filter((record) => !record.isPlaced);
    }

    if (backlogsOnly) {
      records = records.filter((record) => record.activeBacklogs > 0);
    }

    records.sort((left: any, right: any) => {
      const leftValue = left[sortBy] ?? 0;
      const rightValue = right[sortBy] ?? 0;
      if (typeof leftValue === 'string' || typeof rightValue === 'string') {
        return sortOrder * String(leftValue).localeCompare(String(rightValue));
      }
      return sortOrder * ((leftValue as number) - (rightValue as number));
    });

    const totalCount = records.length;
    const students = exportRows ? records : records.slice((page - 1) * limit, page * limit);

    res.status(200).json({
      students,
      totalCount,
      page: exportRows ? 1 : page,
      pageSize: exportRows ? totalCount : limit,
      sortBy,
      sortOrder: sortOrder === 1 ? 'asc' : 'desc',
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getInstitutionKpiStudentProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentId = String(req.query.studentId || '').trim();
    if (!studentId) {
      res.status(400).json({ message: 'studentId parameter is required.' });
      return;
    }

    const student = await Student.findById(studentId).populate('userId', 'name email role').lean();
    if (!student) {
      res.status(404).json({ message: 'Student profile not found.' });
      return;
    }

    const [academics, attendance, profile, achievements, certifications, cambridgeCertifications, companies] = await Promise.all([
      Academic.find({ studentId } as any).sort({ semester: 1 }).lean(),
      Attendance.find({ studentId } as any).lean(),
      Profile.findOne({ studentId } as any).lean(),
      Achievement.find({ studentId } as any).sort({ date: -1 }).lean(),
      Certification.find({ studentId } as any).lean(),
      CambridgeCertification.find({ studentId } as any).lean(),
      Company.find({}).lean(),
    ]);

    const cgpa = calculateCGPA(academics as any[]);
    const attendancePct = calculateAttendancePct(attendance as any[]);
    const activeBacklogs = (academics as any[]).reduce((sum, record) => sum + (record.activeBacklogs || 0), 0);
    const attendanceRisk = attendancePct < 60 ? 'HIGH' : attendancePct < 75 ? 'MEDIUM' : 'LOW';
    const cgpaRisk = cgpa < 5 ? 'HIGH' : cgpa < 7 ? 'MEDIUM' : 'LOW';
    const overallRisk = attendanceRisk === 'HIGH' || cgpaRisk === 'HIGH'
      ? 'HIGH'
      : attendanceRisk === 'MEDIUM' || cgpaRisk === 'MEDIUM'
        ? 'MEDIUM'
        : 'LOW';

    const subjectAttendanceMap = new Map<string, { subjectName: string; attended: number; total: number }>();
    for (const record of attendance as any[]) {
      const key = record.subjectCode;
      const existing = subjectAttendanceMap.get(key);
      if (existing) {
        existing.attended += record.attended;
        existing.total += record.total;
      } else {
        subjectAttendanceMap.set(key, {
          subjectName: record.subjectName,
          attended: record.attended,
          total: record.total,
        });
      }
    }

    const subjectAttendance = Array.from(subjectAttendanceMap.entries()).map(([subjectCode, value]) => ({
      subjectCode,
      subjectName: value.subjectName,
      attended: value.attended,
      total: value.total,
      pct: value.total > 0 ? Number(((value.attended / value.total) * 100).toFixed(1)) : 0,
    }));

    const codingAccounts = {
      leetcode: (profile as any)?.profiles?.leetcode || '',
      hackerrank: (profile as any)?.profiles?.hackerrank || '',
      codechef: (profile as any)?.profiles?.codechef || '',
      github: (profile as any)?.profiles?.github || '',
      linkedin: (profile as any)?.profiles?.linkedin || '',
      portfolio: (profile as any)?.profiles?.portfolio || '',
    };

    const placementMap = buildInstitutionKpiPlacementMap(companies as any[]);
    const placement = placementMap.get(student._id.toString()) || { placedCompany: '', salaryPackage: 0 };

    const certificationEntries = [
      ...(certifications as any[]).map((cert) => ({
        name: cert.certificateName,
        issuer: cert.provider,
        category: cert.certificateCategory,
        score: cert.facultyApprovedScore || 0,
      })),
      ...(cambridgeCertifications as any[]).map((cert) => ({
        name: cert.certificateName,
        issuer: cert.provider,
        category: cert.certificateLevel,
        score: cert.facultyApprovedScore || 0,
      })),
    ];

    res.status(200).json({
      student: {
        id: student._id,
        name: (student.userId as any)?.name || 'Unknown',
        email: (student.userId as any)?.email || '',
        rollNumber: student.rollNumber,
        branch: student.branch,
        department: student.department,
        year: student.year,
        section: student.section,
        gender: student.gender || '',
        contactNumber: student.contactNumber || '',
        cgpa,
        attendancePct,
        activeBacklogs,
        profileScore: Number(student.overallScore || 0),
        profileCompletion: Number((profile as any)?.profileCompletion || 0),
        resumeUrl: (profile as any)?.resumeUrl || '',
        skills: (profile as any)?.skills || { technical: [], soft: [] },
        profiles: (profile as any)?.profiles || {},
        isPlaced: !!placement.placedCompany,
        placedCompany: placement.placedCompany,
        salaryPackage: placement.salaryPackage,
      },
      analytics: {
        attendanceRisk,
        cgpaRisk,
        overallRisk,
        subjectAttendance,
        academicTrend: (academics as any[]).map((record) => ({ semester: record.semester, sgpa: record.sgpa })),
        achievements: (achievements as any[]).slice(0, 10),
        certifications: certificationEntries,
        codingAccounts,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    HOD Enterprise Search — per-student deep profile with certifications, attendance, risk, coding accounts
// @route   GET /api/analytics/hod/enterprise-search
// @access  Private (HOD, Admin)
export const getHODEnterpriseSearch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const {
      q = '',
      department,
      year,
      section,
      attendanceFilter,
      cgpaFilter,
      page = '1',
      limit = '20',
    } = req.query;

    let deptFilter = department ? String(department) : undefined;
    if (req.user.role === 'HOD') {
      deptFilter = req.user.department || undefined;
    }

    const studentFilter: any = {};
    if (deptFilter) studentFilter.department = deptFilter;
    if (year) studentFilter.year = Number(year);
    if (section) studentFilter.section = String(section);

    const queryStr = String(q).trim();
    if (queryStr) {
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: queryStr, $options: 'i' } },
          { email: { $regex: queryStr, $options: 'i' } },
        ],
      }).select('_id');
      const matchedUserIds = matchingUsers.map((u: any) => u._id);
      studentFilter.$or = [
        { rollNumber: { $regex: queryStr, $options: 'i' } },
        { userId: { $in: matchedUserIds } },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page)));
    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit))));
    const skip = (pageNum - 1) * limitNum;

    const students = await Student.find(studentFilter)
      .populate('userId', 'name email')
      .sort({ rollNumber: 1 })
      .skip(skip)
      .limit(limitNum);

    const totalCount = await Student.countDocuments(studentFilter);

    const studentIds = students.map((s: any) => s._id);

    const [allAcademics, allAttendances, allProfiles, allCertifications] = await Promise.all([
      Academic.find({ studentId: { $in: studentIds } } as any).sort({ semester: 1 }),
      Attendance.find({ studentId: { $in: studentIds } } as any),
      Profile.find({ studentId: { $in: studentIds } } as any).select('studentId profiles resumeUrl profileCompletion'),
      Certification.find({ studentId: { $in: studentIds }, status: 'APPROVED' } as any)
        .select('studentId certificateName provider certificateCategory completionDate facultyApprovedScore'),
    ]);

    const academicsMap = new Map<string, any[]>();
    const attendancesMap = new Map<string, any[]>();
    const profilesMap = new Map<string, any>();
    const certsMap = new Map<string, any[]>();

    for (const a of allAcademics) {
      const sid = a.studentId.toString();
      if (!academicsMap.has(sid)) academicsMap.set(sid, []);
      academicsMap.get(sid)!.push(a);
    }
    for (const a of allAttendances) {
      const sid = a.studentId.toString();
      if (!attendancesMap.has(sid)) attendancesMap.set(sid, []);
      attendancesMap.get(sid)!.push(a);
    }
    for (const p of allProfiles) {
      profilesMap.set(p.studentId.toString(), p);
    }
    for (const c of allCertifications) {
      const sid = c.studentId.toString();
      if (!certsMap.has(sid)) certsMap.set(sid, []);
      certsMap.get(sid)!.push(c);
    }

    const results: any[] = [];

    for (const student of students) {
      const sId = (student._id as any).toString();
      const academics = academicsMap.get(sId) || [];
      const attendance = attendancesMap.get(sId) || [];
      const profile = profilesMap.get(sId);
      const certifications = certsMap.get(sId) || [];

      const cgpa = calculateCGPA(academics);
      const attendancePct = calculateAttendancePct(attendance);
      const activeBacklogs = academics.reduce((acc: number, curr: any) => acc + (curr.activeBacklogs || 0), 0);

      if (attendanceFilter === 'above80' && attendancePct <= 80) continue;
      if (attendanceFilter === 'below75' && attendancePct >= 75) continue;
      if (attendanceFilter === 'below60' && attendancePct >= 60) continue;
      if (cgpaFilter === 'above8' && cgpa < 8) continue;
      if (cgpaFilter === 'above7' && cgpa < 7) continue;
      if (cgpaFilter === 'below6' && cgpa >= 6) continue;

      const attendanceRisk = attendancePct < 60 ? 'HIGH' : attendancePct < 75 ? 'MEDIUM' : 'LOW';
      const cgpaRisk = cgpa < 5 ? 'HIGH' : cgpa < 7 ? 'MEDIUM' : 'LOW';
      const overallRisk = (attendanceRisk === 'HIGH' || cgpaRisk === 'HIGH') ? 'HIGH'
        : (attendanceRisk === 'MEDIUM' || cgpaRisk === 'MEDIUM') ? 'MEDIUM' : 'LOW';

      const subjectAttMap = new Map<string, { name: string; attended: number; total: number }>();
      for (const sub of attendance) {
        const code = sub.subjectCode;
        const ex = subjectAttMap.get(code);
        if (ex) { ex.attended += sub.attended; ex.total += sub.total; }
        else subjectAttMap.set(code, { name: sub.subjectName, attended: sub.attended, total: sub.total });
      }
      const subjectAttendance = Array.from(subjectAttMap.entries()).map(([code, v]) => ({
        subjectCode: code,
        subjectName: v.name,
        attended: v.attended,
        total: v.total,
        pct: v.total > 0 ? Number(((v.attended / v.total) * 100).toFixed(1)) : 0,
      }));

      const sgpaTrend = academics.map((a: any) => ({ semester: a.semester, sgpa: a.sgpa }));

      const codingAccounts = {
        leetcode: (profile?.profiles as any)?.leetcode || '',
        hackerrank: (profile?.profiles as any)?.hackerrank || '',
        codechef: (profile?.profiles as any)?.codechef || '',
      };

      results.push({
        id: student._id,
        name: (student.userId as any)?.name || 'Unknown',
        email: (student.userId as any)?.email || '',
        rollNumber: student.rollNumber,
        department: student.department,
        branch: student.branch,
        year: student.year,
        section: student.section,
        cgpa,
        attendancePct,
        activeBacklogs,
        attendanceRisk,
        cgpaRisk,
        overallRisk,
        subjectAttendance,
        sgpaTrend,
        certifications: certifications.map((c: any) => ({
          name: c.certificateName,
          issuer: c.provider,
          category: c.certificateCategory,
          date: c.completionDate,
          score: c.facultyApprovedScore,
        })),
        codingAccounts,
        profileCompletion: profile?.profileCompletion || 0,
      });
    }

    res.status(200).json({ results, totalCount, page: pageNum, totalPages: Math.ceil(totalCount / limitNum) });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    HOD CGPA Trend — semester-over-semester improvement/decline per dept
// @route   GET /api/analytics/hod/cgpa-trend
// @access  Private (HOD, Admin)
export const getHODCgpaTrend = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    let deptFilter = req.query.department ? String(req.query.department) : undefined;
    if (req.user.role === 'HOD') deptFilter = req.user.department || undefined;

    const studentFilter: any = {};
    if (deptFilter) studentFilter.department = deptFilter;

    const students = await Student.find(studentFilter).select('_id');
    const studentIds = students.map((s: any) => s._id);

    const allAcademics = await Academic.find({ studentId: { $in: studentIds } } as any).sort({ semester: 1 });

    const acadMap = new Map<string, { semester: number; sgpa: number }[]>();
    for (const a of allAcademics) {
      const sid = a.studentId.toString();
      if (!acadMap.has(sid)) acadMap.set(sid, []);
      acadMap.get(sid)!.push({ semester: a.semester, sgpa: a.sgpa });
    }

    const semPairStats: Record<string, { improved: number; declined: number; stable: number }> = {};
    for (const [, semesters] of acadMap.entries()) {
      const sorted = [...semesters].sort((a, b) => a.semester - b.semester);
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        const key = `Sem ${prev.semester}→${curr.semester}`;
        if (!semPairStats[key]) semPairStats[key] = { improved: 0, declined: 0, stable: 0 };
        const diff = curr.sgpa - prev.sgpa;
        if (diff > 0.1) semPairStats[key].improved++;
        else if (diff < -0.1) semPairStats[key].declined++;
        else semPairStats[key].stable++;
      }
    }

    const trend = Object.entries(semPairStats).map(([label, stats]) => ({ label, ...stats }));
    res.status(200).json({ trend, department: deptFilter || 'All' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
