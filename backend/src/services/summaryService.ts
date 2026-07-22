import Student from '../models/Student';
import Academic from '../models/Academic';
import Attendance from '../models/Attendance';
import Achievement from '../models/Achievement';
import Certification from '../models/Certification';
import Project from '../models/Project';
import CambridgeCertification from '../models/CambridgeCertification';
import CoCurricularActivity from '../models/CoCurricularActivity';
import ExtraCurricularActivity from '../models/ExtraCurricularActivity';
import PhysicalFitnessActivity from '../models/PhysicalFitnessActivity';
import CodingChallenge from '../models/CodingChallenge';
import LeadershipActivity from '../models/LeadershipActivity';
import ActivityCertification from '../models/ActivityCertification';
import Company from '../models/Company';
import { calculateOverallScore } from './scoringEngine';

export const countPendingAndTotalAchievements = async (studentIds: any[], yearFilter?: number) => {
  const models = [
    { model: Achievement },
    { model: Certification },
    { model: Project },
    { model: CambridgeCertification },
    { model: CoCurricularActivity },
    { model: ExtraCurricularActivity },
    { model: PhysicalFitnessActivity },
    { model: CodingChallenge },
    { model: LeadershipActivity },
    { model: ActivityCertification },
  ];

  let pending = 0;
  let approved = 0;
  let rejected = 0;

  for (const item of models) {
    try {
      let query: any = { studentId: { $in: studentIds } };
      if (yearFilter) {
        if (item.model === Achievement) {
          const students = await Student.find({ _id: { $in: studentIds } }).select('rollNumber').lean();
          const targetRanges = students.map(student => {
            const rollNumber = student.rollNumber;
            const match = rollNumber?.match(/^(\d{2})/);
            const admissionYear = match ? 2000 + parseInt(match[1]) : new Date().getFullYear() - 3;
            const startDate = new Date(`${admissionYear + yearFilter - 1}-07-01T00:00:00.000Z`);
            const endDate = new Date(`${admissionYear + yearFilter}-06-30T23:59:59.999Z`);
            return { studentId: student._id, date: { $gte: startDate, $lte: endDate } };
          });
          if (targetRanges.length > 0) {
            query = { $or: targetRanges };
          }
        } else {
          query.academicYear = yearFilter;
        }
      }
      const records = await (item.model as any).find(query).select('status').lean();
      records.forEach((r: any) => {
        const status = String(r.status).toUpperCase();
        if (status === 'PENDING' || status === 'UNDER_REVIEW') {
          pending++;
        } else if (status === 'APPROVED' || status === 'VERIFIED') {
          approved++;
        } else if (status === 'REJECTED') {
          rejected++;
        }
      });
    } catch (err) {
      console.error(`Failed to count achievements for model:`, err);
    }
  }

  return { pending, approved, rejected, total: pending + approved + rejected };
};

export const calculateDepartmentSummary = async (departmentName: string, yearFilter?: number) => {
  const filter: any = { department: departmentName };
  if (yearFilter) {
    filter.year = yearFilter;
  }

  const students = await Student.find(filter).populate('userId', 'name email').lean();
  const studentIds = students.map(s => s._id);

  if (students.length === 0) {
    return {
      summary: {
        totalStudents: 0,
        avgCGPA: 0,
        avgAttendance: 0,
        totalAchievements: 0,
        totalBacklogs: 0,
        totalRGrades: 0,
        totalIGrades: 0,
        avgProfileScore: 0,
        pendingApprovals: 0,
        approvedAchievements: 0,
        rejectedAchievements: 0,
      },
      charts: {
        studentCountByYear: { 1: 0, 2: 0, 3: 0, 4: 0 },
        studentsOverPerformance: { excellent: 0, good: 0, average: 0, poor: 0 },
        cgpaVsAttendance: [],
        sectionScores: [],
        yearWisePerformance: { 1: 0, 2: 0, 3: 0, 4: 0 },
        moduleWisePerformance: {
          cgpa: 0,
          attendance: 0,
          certifications: 0,
          projects: 0,
          coding: 0,
          cocurricular: 0,
          extracurricular: 0,
          leadership: 0,
          sports: 0,
          communication: 0
        }
      },
      topStudents: []
    };
  }

  const allAcademics = await Academic.find({ studentId: { $in: studentIds } }).lean();
  const allAttendance = await Attendance.find({ studentId: { $in: studentIds } }).lean();

  const academicsMap = new Map<string, any[]>();
  allAcademics.forEach(ac => {
    const sid = ac.studentId.toString();
    if (!academicsMap.has(sid)) academicsMap.set(sid, []);
    academicsMap.get(sid)!.push(ac);
  });

  const attendanceMap = new Map<string, any[]>();
  allAttendance.forEach(att => {
    const sid = att.studentId.toString();
    if (!attendanceMap.has(sid)) attendanceMap.set(sid, []);
    attendanceMap.get(sid)!.push(att);
  });

  const studentsWithScores = await Promise.all(students.map(async (student) => {
    try {
      let overallScore = student.overallScore;
      let yearScores = student.yearScores;
      if (overallScore === undefined || overallScore === null) {
        const scores = await calculateOverallScore(student._id.toString());
        overallScore = scores.overallScore;
        yearScores = scores.yearScores;
      }
      const yrScoreObj = yearScores?.find((y: any) => y.year === yearFilter);
      const targetScore = yearFilter ? (yrScoreObj ? yrScoreObj.score : 0) : overallScore;
      return {
        ...student,
        overallScore: targetScore,
        yearScores
      };
    } catch (e) {
      return {
        ...student,
        overallScore: 0,
        yearScores: []
      };
    }
  }));

  let totalCGPASum = 0;
  let totalAttendanceSum = 0;
  let studentStatsCount = 0;
  let totalBacklogsCount = 0;
  let totalRGrades = 0;
  let totalIGrades = 0;

  const studentCountByYear: any = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const studentsOverPerformance = { excellent: 0, good: 0, average: 0, poor: 0 };
  const cgpaVsAttendance: any[] = [];

  const sectionSum: Record<string, { sum: number; count: number }> = {};
  const yearSum: Record<number, { sum: number; count: number }> = { 1: { sum: 0, count: 0 }, 2: { sum: 0, count: 0 }, 3: { sum: 0, count: 0 }, 4: { sum: 0, count: 0 } };
  
  const modules = ['cgpa', 'attendance', 'certifications', 'projects', 'coding', 'cocurricular', 'extracurricular', 'leadership', 'sports', 'communication'];
  const moduleSums: Record<string, { sum: number; count: number }> = {};
  modules.forEach(m => { moduleSums[m] = { sum: 0, count: 0 }; });

  const targetSemesters = yearFilter ? [yearFilter * 2 - 1, yearFilter * 2] : [];

  studentsWithScores.forEach((student) => {
    studentCountByYear[student.year] = (studentCountByYear[student.year] || 0) + 1;

    const sidStr = student._id.toString();
    const studentAc = academicsMap.get(sidStr) || [];
    const studentAtt = attendanceMap.get(sidStr) || [];

    const filteredAc = yearFilter
      ? studentAc.filter(ac => targetSemesters.includes(ac.semester))
      : studentAc;
    const filteredAtt = yearFilter
      ? studentAtt.filter(att => targetSemesters.includes(att.semester))
      : studentAtt;

    const sgpas = filteredAc.map(r => r.sgpa).filter(Boolean);
    const cgpa = sgpas.length > 0 ? sgpas.reduce((a, b) => a + b, 0) / sgpas.length : 0;
    
    const totalClasses = filteredAtt.reduce((acc, curr) => acc + curr.total, 0);
    const totalAttended = filteredAtt.reduce((acc, curr) => acc + curr.attended, 0);
    const attendancePct = totalClasses > 0 ? (totalAttended / totalClasses) * 100 : 0;

    const activeBacklogs = filteredAc.reduce((acc, curr) => acc + (curr.activeBacklogs || 0), 0);
    totalBacklogsCount += activeBacklogs;

    filteredAc.forEach(ac => {
      totalRGrades += ac.rGradeCount || 0;
      totalIGrades += ac.iGradeCount || 0;
    });

    if (cgpa > 0 || attendancePct > 0) {
      studentStatsCount++;
      totalCGPASum += cgpa;
      totalAttendanceSum += attendancePct;

      if (cgpa >= 8.5) studentsOverPerformance.excellent++;
      else if (cgpa >= 7.0) studentsOverPerformance.good++;
      else if (cgpa >= 5.0) studentsOverPerformance.average++;
      else studentsOverPerformance.poor++;

      cgpaVsAttendance.push({
        rollNumber: student.rollNumber,
        name: (student.userId as any)?.name || 'Student',
        cgpa: Number(cgpa.toFixed(2)),
        attendance: Number(attendancePct.toFixed(1)),
      });
    }

    const sec = student.section || 'A';
    if (!sectionSum[sec]) sectionSum[sec] = { sum: 0, count: 0 };
    sectionSum[sec].sum += student.overallScore;
    sectionSum[sec].count++;

    yearSum[student.year].sum += student.overallScore;
    yearSum[student.year].count++;

    student.yearScores?.forEach((yrScore: any) => {
      modules.forEach(m => {
        if (yrScore.breakdown && yrScore.breakdown[m] !== undefined) {
          moduleSums[m].sum += yrScore.breakdown[m];
          moduleSums[m].count++;
        }
      });
    });
  });

  const avgCGPA = studentStatsCount > 0 ? Number((totalCGPASum / studentStatsCount).toFixed(2)) : 0;
  const avgAttendance = studentStatsCount > 0 ? Number((totalAttendanceSum / studentStatsCount).toFixed(1)) : 0;

  const totalProfileScore = studentsWithScores.reduce((acc, curr) => acc + curr.overallScore, 0);
  const avgProfileScore = studentsWithScores.length > 0 ? Number((totalProfileScore / studentsWithScores.length).toFixed(2)) : 0;

  const achievementCounts = await countPendingAndTotalAchievements(studentIds, yearFilter);

  const sectionScores = Object.keys(sectionSum).map(sec => ({
    section: sec,
    avgProfileScore: Number((sectionSum[sec].sum / sectionSum[sec].count).toFixed(2))
  }));

  const yearWisePerformance: any = {};
  [1, 2, 3, 4].forEach(yr => {
    yearWisePerformance[yr] = yearSum[yr].count > 0 ? Number((yearSum[yr].sum / yearSum[yr].count).toFixed(2)) : 0;
  });

  const moduleWisePerformance: any = {};
  modules.forEach(m => {
    moduleWisePerformance[m] = moduleSums[m].count > 0 ? Number((moduleSums[m].sum / moduleSums[m].count).toFixed(2)) : 0;
  });

  const topStudents = studentsWithScores
    .map(s => ({
      _id: s._id,
      name: (s.userId as any)?.name || 'Unknown',
      rollNumber: s.rollNumber,
      section: s.section,
      overallScore: s.overallScore
    }))
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 10);

  return {
    summary: {
      totalStudents: students.length,
      avgCGPA,
      avgAttendance,
      totalAchievements: achievementCounts.total,
      totalBacklogs: totalBacklogsCount,
      totalRGrades,
      totalIGrades,
      avgProfileScore,
      pendingApprovals: achievementCounts.pending,
      approvedAchievements: achievementCounts.approved,
      rejectedAchievements: achievementCounts.rejected,
    },
    charts: {
      studentCountByYear,
      studentsOverPerformance,
      cgpaVsAttendance,
      sectionScores,
      yearWisePerformance,
      moduleWisePerformance
    },
    topStudents
  };
};

export const calculateUniversitySummary = async (yearFilter?: number) => {
  const filter: any = {};
  if (yearFilter) {
    filter.year = yearFilter;
  }

  const students = await Student.find(filter).populate('userId', 'name email').lean();
  const studentIds = students.map(s => s._id);

  const companies = await Company.find({}).lean();

  if (students.length === 0) {
    return {
      summary: {
        totalStudents: 0,
        overallCGPA: 0,
        overallAttendance: 0,
        placementRatePct: 0,
        totalAchievements: 0,
        totalCompaniesVisiting: companies.length,
        totalRGrades: 0,
        totalIGrades: 0,
        avgProfileScore: 0,
        pendingAchievements: 0,
        approvedAchievements: 0,
        rejectedAchievements: 0,
      },
      departmentComparison: [],
      studentDistribution: { 1: 0, 2: 0, 3: 0, 4: 0 },
      achievementSummary: {},
      sectionSummary: [],
      yearWiseSummary: { 1: 0, 2: 0, 3: 0, 4: 0 },
      topStudents: []
    };
  }

  const allAcademics = await Academic.find({}).lean();
  const allAttendance = await Attendance.find({}).lean();

  const academicsMap = new Map<string, any[]>();
  allAcademics.forEach(ac => {
    const sid = ac.studentId.toString();
    if (!academicsMap.has(sid)) academicsMap.set(sid, []);
    academicsMap.get(sid)!.push(ac);
  });

  const attendanceMap = new Map<string, any[]>();
  allAttendance.forEach(att => {
    const sid = att.studentId.toString();
    if (!attendanceMap.has(sid)) attendanceMap.set(sid, []);
    attendanceMap.get(sid)!.push(att);
  });

  const studentsWithScores = await Promise.all(students.map(async (student) => {
    try {
      let overallScore = student.overallScore;
      let yearScores = student.yearScores;
      if (overallScore === undefined || overallScore === null) {
        const scores = await calculateOverallScore(student._id.toString());
        overallScore = scores.overallScore;
        yearScores = scores.yearScores;
      }
      const yrScoreObj = yearScores?.find((y: any) => y.year === yearFilter);
      const targetScore = yearFilter ? (yrScoreObj ? yrScoreObj.score : 0) : overallScore;
      return {
        ...student,
        overallScore: targetScore,
      };
    } catch (e) {
      return {
        ...student,
        overallScore: 0,
      };
    }
  }));

  let totalCGPASum = 0;
  let totalAttendanceSum = 0;
  let studentStatsCount = 0;
  let placedCount = 0;
  let totalRGrades = 0;
  let totalIGrades = 0;

  const deptStats: any = {};
  const studentDistribution: any = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const sectionSum: Record<string, { sum: number; count: number }> = {};
  const yearSum: Record<number, { sum: number; count: number }> = { 1: { sum: 0, count: 0 }, 2: { sum: 0, count: 0 }, 3: { sum: 0, count: 0 }, 4: { sum: 0, count: 0 } };

  const targetSemesters = yearFilter ? [yearFilter * 2 - 1, yearFilter * 2] : [];

  studentsWithScores.forEach((student) => {
    studentDistribution[student.year] = (studentDistribution[student.year] || 0) + 1;

    const sidStr = student._id.toString();
    const studentAc = academicsMap.get(sidStr) || [];
    const studentAtt = attendanceMap.get(sidStr) || [];

    const filteredAc = yearFilter
      ? studentAc.filter(ac => targetSemesters.includes(ac.semester))
      : studentAc;
    const filteredAtt = yearFilter
      ? studentAtt.filter(att => targetSemesters.includes(att.semester))
      : studentAtt;

    const sgpas = filteredAc.map(r => r.sgpa).filter(Boolean);
    const cgpa = sgpas.length > 0 ? sgpas.reduce((a, b) => a + b, 0) / sgpas.length : 0;

    const totalClasses = filteredAtt.reduce((acc, curr) => acc + curr.total, 0);
    const totalAttended = filteredAtt.reduce((acc, curr) => acc + curr.attended, 0);
    const attendancePct = totalClasses > 0 ? (totalAttended / totalClasses) * 100 : 0;

    filteredAc.forEach(ac => {
      totalRGrades += ac.rGradeCount || 0;
      totalIGrades += ac.iGradeCount || 0;
    });

    let isPlaced = false;
    let salaryPackage = 0;
    for (const comp of companies) {
      const applicant = comp.applicants?.find((a: any) => a.studentId.toString() === sidStr);
      if (applicant && applicant.status === 'SELECTED') {
        isPlaced = true;
        salaryPackage = comp.packageAmount;
        break;
      }
    }

    if (isPlaced) placedCount++;

    const dept = student.department;
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
      };
    }

    const dStat = deptStats[dept];
    dStat.studentCount++;
    dStat.overallScoreSum += student.overallScore;

    if (cgpa > 0) {
      dStat.cgpaSum += cgpa;
      dStat.cgpaCount++;
      totalCGPASum += cgpa;
    }
    if (attendancePct > 0) {
      dStat.attendanceSum += attendancePct;
      dStat.attendanceCount++;
      totalAttendanceSum += attendancePct;
    }
    if (cgpa > 0 || attendancePct > 0) {
      studentStatsCount++;
    }
    if (isPlaced) {
      dStat.placedCount++;
      dStat.totalSalary += salaryPackage;
    }

    const secKey = `${dept} - Sec ${student.section}`;
    if (!sectionSum[secKey]) sectionSum[secKey] = { sum: 0, count: 0 };
    sectionSum[secKey].sum += student.overallScore;
    sectionSum[secKey].count++;

    yearSum[student.year].sum += student.overallScore;
    yearSum[student.year].count++;
  });

  const overallCGPA = studentStatsCount > 0 ? Number((totalCGPASum / students.length).toFixed(2)) : 0;
  const overallAttendance = studentStatsCount > 0 ? Number((totalAttendanceSum / students.length).toFixed(1)) : 0;

  const totalProfileScore = studentsWithScores.reduce((acc, curr) => acc + curr.overallScore, 0);
  const avgProfileScore = studentsWithScores.length > 0 ? Number((totalProfileScore / studentsWithScores.length).toFixed(2)) : 0;

  const departmentComparison = Object.keys(deptStats).map(key => {
    const d = deptStats[key];
    return {
      department: d.name,
      studentsCount: d.studentCount,
      avgCGPA: d.cgpaCount > 0 ? Number((d.cgpaSum / d.cgpaCount).toFixed(2)) : 0,
      avgAttendance: d.attendanceCount > 0 ? Number((d.attendanceSum / d.attendanceCount).toFixed(1)) : 0,
      placedCount: d.placedCount,
      placementRatePct: d.studentCount > 0 ? Number(((d.placedCount / d.studentCount) * 100).toFixed(1)) : 0,
      avgSalaryLPA: d.placedCount > 0 ? Number((d.totalSalary / d.placedCount).toFixed(2)) : 0,
      avgProfileScore: Number((d.overallScoreSum / d.studentCount).toFixed(2))
    };
  });

  const achievementCounts = await countPendingAndTotalAchievements(studentIds, yearFilter);

  const sectionSummary = Object.keys(sectionSum).map(key => {
    const [department, sectionPart] = key.split(' - Sec ');
    return {
      department,
      section: sectionPart,
      avgProfileScore: Number((sectionSum[key].sum / sectionSum[key].count).toFixed(2))
    };
  });

  const yearWiseSummary: any = {};
  [1, 2, 3, 4].forEach(yr => {
    yearWiseSummary[yr] = yearSum[yr].count > 0 ? Number((yearSum[yr].sum / yearSum[yr].count).toFixed(2)) : 0;
  });

  const topStudents = studentsWithScores
    .map(s => ({
      _id: s._id,
      name: (s.userId as any)?.name || 'Unknown',
      rollNumber: s.rollNumber,
      department: s.department,
      section: s.section,
      overallScore: s.overallScore
    }))
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 10);

  return {
    summary: {
      totalStudents: students.length,
      overallCGPA,
      overallAttendance,
      placementRatePct: students.length > 0 ? Number(((placedCount / students.length) * 100).toFixed(1)) : 0,
      totalAchievements: achievementCounts.total,
      totalCompaniesVisiting: companies.length,
      totalRGrades,
      totalIGrades,
      avgProfileScore,
      pendingAchievements: achievementCounts.pending,
      approvedAchievements: achievementCounts.approved,
      rejectedAchievements: achievementCounts.rejected,
    },
    departmentComparison,
    studentDistribution,
    achievementSummary: {},
    sectionSummary,
    yearWiseSummary,
    topStudents
  };
};
