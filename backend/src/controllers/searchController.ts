import { Response } from 'express';
import Student from '../models/Student';
import Academic from '../models/Academic';
import Attendance from '../models/Attendance';
import Achievement from '../models/Achievement';
import Company from '../models/Company';
import User from '../models/User';
import Certification from '../models/Certification';
import CambridgeCertification from '../models/CambridgeCertification';
import ActivityCertification from '../models/ActivityCertification';
import CoCurricularActivity from '../models/CoCurricularActivity';
import ExtraCurricularActivity from '../models/ExtraCurricularActivity';
import PhysicalFitnessActivity from '../models/PhysicalFitnessActivity';
import CodingChallenge from '../models/CodingChallenge';
import LeadershipActivity from '../models/LeadershipActivity';
import Project from '../models/Project';
import { AuthenticatedRequest } from '../middleware/auth';

// Additional imports for search detail enrichment
import Profile from '../models/Profile';
import { calculateOverallScore } from '../services/scoringEngine';
import { countPendingAndTotalAchievements } from '../services/summaryService';

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

// @desc    Global Search and Advanced Filters
// @route   GET /api/search
// @access  Private (All Roles)
export const globalSearch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const {
      q = '',
      type = 'students', // 'students' or 'achievements'
      department,
      branch,
      year,
      semester,
      status, // Verification status for achievements (PENDING, UNDER_REVIEW, etc.)
      placementStatus, // PLACED or UNPLACED
      achievementType, // CERTIFICATION, PROJECT, etc.
    } = req.query;

    const userRole = req.user.role;
    const queryStr = String(q).trim();

    let deptFilter = department ? String(department) : undefined;
    if (userRole === 'HOD') {
      const userDept = req.user.department;
      if (!userDept) {
        res.status(403).json({ message: 'HOD has no department assigned.' });
        return;
      }
      deptFilter = userDept;
    }

    // 1. SEARCH STUDENTS
    if (type === 'students') {
      // Find matching users if there is a text query
      let userFilter: any = {};
      if (queryStr) {
        userFilter = {
          $or: [
            { name: { $regex: queryStr, $options: 'i' } },
            { email: { $regex: queryStr, $options: 'i' } },
          ],
        };
      }

      // If user is STUDENT, they can only search themselves
      let studentFilter: any = {};
      if (userRole === 'STUDENT') {
        studentFilter.userId = req.user.id;
      } else {
        if (deptFilter) studentFilter.department = deptFilter;
        if (branch) studentFilter.branch = branch;
        if (year) studentFilter.year = Number(year);
        if (queryStr) {
          // Also match roll number
          studentFilter.$or = [
            { rollNumber: { $regex: queryStr, $options: 'i' } },
          ];
        }
      }

      // Resolve users matching queryStr
      let matchedUserIds: any[] = [];
      if (queryStr && userRole !== 'STUDENT') {
        const users = await User.find(userFilter);
        matchedUserIds = users.map((u) => u._id);
        if (studentFilter.$or) {
          studentFilter.$or.push({ userId: { $in: matchedUserIds } });
        } else {
          studentFilter.userId = { $in: matchedUserIds };
        }
      }

      const students = await Student.find(studentFilter)
        .populate('userId', 'name email role')
        .limit(50);
      const companies = await Company.find({});
      const results = (await Promise.all(
        students.map(async (student) => {
          const academics = await Academic.find({ studentId: student._id });
          const attendance = await Attendance.find({ studentId: student._id });

          const cgpa = calculateCGPA(academics);
          const attendancePct = calculateAttendancePct(attendance);
          const activeBacklogs = academics.reduce((acc, curr) => acc + (curr.activeBacklogs || 0), 0);

          // Check placement
          let isPlaced = false;
          let placedCompany = '';
          let salaryPackage = 0;
          for (const comp of companies) {
            const applicant = comp.applicants.find((a) => a.studentId.toString() === student._id.toString());
            if (applicant && applicant.status === 'SELECTED') {
              isPlaced = true;
              placedCompany = comp.name;
              salaryPackage = comp.packageAmount;
              break;
            }
          }

          const isEligible = cgpa >= 7.0 && activeBacklogs === 0 && attendancePct >= 75;

          // Apply advanced filters in-memory
          if (semester) {
            const hasSemester = academics.some((a) => a.semester === Number(semester));
            if (!hasSemester) return null;
          }

          if (placementStatus) {
            if (placementStatus === 'PLACED' && !isPlaced) return null;
            if (placementStatus === 'UNPLACED' && isPlaced) return null;
          }

          // Fetch profile completion and achievements count
          const [profile, achievementCounts] = await Promise.all([
            Profile.findOne({ studentId: student._id }).select('profileCompletion profiles').lean(),
            countPendingAndTotalAchievements([student._id])
          ]);

          let overallScore = student.overallScore;
          if (overallScore === undefined || overallScore === null) {
            const scores = await calculateOverallScore(student._id.toString());
            overallScore = scores.overallScore;
          }

          return {
            id: student._id,
            name: (student.userId as any)?.name || 'Unknown',
            email: (student.userId as any)?.email || '',
            rollNumber: student.rollNumber,
            branch: student.branch,
            department: student.department,
            year: student.year,
            section: student.section,
            counselorName: student.counselorName || 'Not Assigned',
            cgpa,
            attendancePct,
            activeBacklogs,
            overallScore: overallScore || 0,
            profileCompletion: profile?.profileCompletion || 0,
            profiles: profile?.profiles || {},
            totalAchievements: achievementCounts.total,
            pendingAchievements: achievementCounts.pending,
            approvedAchievements: achievementCounts.approved,
            rejectedAchievements: achievementCounts.rejected,
            isEligible,
            isPlaced,
            placedCompany,
            salaryPackage,
          };
        })
      )).filter(Boolean);

      res.status(200).json({ results });
      return;
    }

    // 2. SEARCH ACHIEVEMENTS
    if (type === 'achievements') {
      // If user is STUDENT, they can only search their own achievements
      let studentIdFilter: any = null;
      if (userRole === 'STUDENT') {
        const student = await Student.findOne({ userId: req.user.id });
        if (!student) {
          res.status(200).json({ results: [] });
          return;
        }
        studentIdFilter = student._id;
      }

      const buildFilter = (
        studentId: any,
        queryStr: string,
        statusVal: any,
        titleField: string,
        issuerField?: string,
        descField?: string
      ) => {
        const filter: any = {};
        if (studentId) {
          filter.studentId = studentId;
        }
        if (statusVal) {
          filter.status = statusVal;
        }
        if (queryStr) {
          const orArray: any[] = [
            { [titleField]: { $regex: queryStr, $options: 'i' } }
          ];
          if (issuerField) {
            orArray.push({ [issuerField]: { $regex: queryStr, $options: 'i' } });
          }
          if (descField) {
            orArray.push({ [descField]: { $regex: queryStr, $options: 'i' } });
          }
          filter.$or = orArray;
        }
        return filter;
      };

      const shouldQuery = (typeToCheck: string) => {
        if (!achievementType || achievementType === 'ALL') return true;
        return achievementType === typeToCheck;
      };

      const queries: Promise<any[]>[] = [];
      const otherStatus = (status === 'VERIFIED' || status === 'APPROVED') ? 'APPROVED' : status;

      // 1. Achievements
      if (!achievementType || achievementType === 'ALL' || [
        'CERTIFICATION', 'PROJECT', 'INTERNSHIP', 'RESEARCH_PAPER', 'SPORTS', 'CLUB', 'HACKATHON', 'WORKSHOP', 'COMPETITION'
      ].includes(String(achievementType))) {
        const achievementFilter: any = {};
        if (studentIdFilter) achievementFilter.studentId = studentIdFilter;
        if (achievementType && achievementType !== 'ALL') {
          achievementFilter.type = achievementType;
        }
        if (status) {
          achievementFilter.status = (status === 'APPROVED' || status === 'VERIFIED') ? 'VERIFIED' : status;
        }
        if (queryStr) {
          achievementFilter.$or = [
            { title: { $regex: queryStr, $options: 'i' } },
            { issuer: { $regex: queryStr, $options: 'i' } },
            { description: { $regex: queryStr, $options: 'i' } },
          ];
        }
        queries.push(
          Achievement.find(achievementFilter)
            .populate({
              path: 'studentId',
              populate: { path: 'userId', select: 'name email' },
            })
            .lean()
            .then((list) =>
              list.map((a: any) => ({
                ...a,
                type: a.type,
                title: a.title,
                issuer: a.issuer,
                description: a.description || '',
                date: a.date,
                fileUrl: a.fileUrl || '',
              }))
            )
        );
      }

      // 2. Certifications
      if (shouldQuery('CERTIFICATION')) {
        const filter = buildFilter(studentIdFilter, queryStr, otherStatus, 'certificateName', 'provider', 'certificateCategory');
        queries.push(
          Certification.find(filter)
            .populate({
              path: 'studentId',
              populate: { path: 'userId', select: 'name email' },
            })
            .lean()
            .then((list) =>
              list.map((c: any) => ({
                ...c,
                type: 'CERTIFICATION',
                title: c.certificateName,
                issuer: c.provider,
                description: c.certificateCategory || '',
                date: c.completionDate || c.createdAt,
                fileUrl: c.certificateFile || '',
              }))
            )
        );

        // Cambridge Certifications
        const cambFilter = buildFilter(studentIdFilter, queryStr, otherStatus, 'certificateName', 'provider', 'certificateLevel');
        queries.push(
          CambridgeCertification.find(cambFilter)
            .populate({
              path: 'studentId',
              populate: { path: 'userId', select: 'name email' },
            })
            .lean()
            .then((list) =>
              list.map((c: any) => ({
                ...c,
                type: 'CERTIFICATION',
                title: c.certificateName,
                issuer: c.provider,
                description: c.certificateLevel || '',
                date: c.issueDate || c.createdAt,
                fileUrl: c.certificateFile || '',
              }))
            )
        );

        // Activity Certifications
        const actFilter = buildFilter(studentIdFilter, queryStr, otherStatus, 'activityName', 'provider', 'category');
        queries.push(
          ActivityCertification.find(actFilter)
            .populate({
              path: 'studentId',
              populate: { path: 'userId', select: 'name email' },
            })
            .lean()
            .then((list) =>
              list.map((c: any) => ({
                ...c,
                type: 'CERTIFICATION',
                title: c.activityName,
                issuer: c.provider,
                description: `${c.category || ''} - ${c.activityLevel || ''}`,
                date: c.issueDate || c.createdAt,
                fileUrl: c.certificateFile || '',
              }))
            )
        );
      }

      // 3. Projects
      if (shouldQuery('PROJECT')) {
        const filter = buildFilter(studentIdFilter, queryStr, otherStatus, 'projectTitle', 'projectDescription');
        queries.push(
          Project.find(filter)
            .populate({
              path: 'studentId',
              populate: { path: 'userId', select: 'name email' },
            })
            .lean()
            .then((list) =>
              list.map((p: any) => ({
                ...p,
                type: 'PROJECT',
                title: p.projectTitle,
                issuer: 'VFSTR',
                description: p.projectDescription || '',
                date: p.createdAt,
                fileUrl: p.supportingDocuments && p.supportingDocuments.length > 0 ? p.supportingDocuments[0] : '',
              }))
            )
        );
      }

      // 4. Co-curricular
      if (shouldQuery('CO_CURRICULAR') || (!achievementType || achievementType === 'ALL')) {
        const filter = buildFilter(studentIdFilter, queryStr, otherStatus, 'activityName', 'provider', 'category');
        queries.push(
          CoCurricularActivity.find(filter)
            .populate({
              path: 'studentId',
              populate: { path: 'userId', select: 'name email' },
            })
            .lean()
            .then((list) =>
              list.map((c: any) => ({
                ...c,
                type: 'CO_CURRICULAR',
                title: c.activityName,
                issuer: c.provider,
                description: c.category || '',
                date: c.issueDate || c.createdAt,
                fileUrl: c.certificateFile || '',
              }))
            )
        );
      }

      // 5. Extra-curricular
      if (shouldQuery('EXTRA_CURRICULAR') || (!achievementType || achievementType === 'ALL')) {
        const filter = buildFilter(studentIdFilter, queryStr, otherStatus, 'activityName', 'provider', 'category');
        queries.push(
          ExtraCurricularActivity.find(filter)
            .populate({
              path: 'studentId',
              populate: { path: 'userId', select: 'name email' },
            })
            .lean()
            .then((list) =>
              list.map((c: any) => ({
                ...c,
                type: 'EXTRA_CURRICULAR',
                title: c.activityName,
                issuer: c.provider,
                description: c.category || '',
                date: c.issueDate || c.createdAt,
                fileUrl: c.certificateFile || '',
              }))
            )
        );
      }

      // 6. Sports
      if (shouldQuery('SPORTS')) {
        const filter = buildFilter(studentIdFilter, queryStr, otherStatus, 'activityName', 'organizer', 'description');
        queries.push(
          PhysicalFitnessActivity.find(filter)
            .populate({
              path: 'studentId',
              populate: { path: 'userId', select: 'name email' },
            })
            .lean()
            .then((list) =>
              list.map((c: any) => ({
                ...c,
                type: 'SPORTS',
                title: c.activityName || c.eventName || 'Sports Activity',
                issuer: c.organizer || '',
                description: c.description || '',
                date: c.eventDate || c.createdAt,
                fileUrl: c.certificateFile || '',
              }))
            )
        );
      }

      // 7. Coding Challenges / Hackathons
      if (shouldQuery('HACKATHON')) {
        const filter = buildFilter(studentIdFilter, queryStr, otherStatus, 'eventName', 'organizer', 'achievementCategory');
        queries.push(
          CodingChallenge.find(filter)
            .populate({
              path: 'studentId',
              populate: { path: 'userId', select: 'name email' },
            })
            .lean()
            .then((list) =>
              list.map((c: any) => ({
                ...c,
                type: 'HACKATHON',
                title: c.eventName,
                issuer: c.organizer,
                description: c.achievementCategory || '',
                date: c.eventDate || c.createdAt,
                fileUrl: c.certificateFile || '',
              }))
            )
        );
      }

      // 8. Leadership Activities
      if (shouldQuery('CLUB')) {
        const filter = buildFilter(studentIdFilter, queryStr, otherStatus, 'leadershipRole', 'organizationName', 'description');
        queries.push(
          LeadershipActivity.find(filter)
            .populate({
              path: 'studentId',
              populate: { path: 'userId', select: 'name email' },
            })
            .lean()
            .then((list) =>
              list.map((c: any) => ({
                ...c,
                type: 'CLUB',
                title: `${c.leadershipRole || 'Leadership'} - ${c.leadershipPosition || 'Member'}`,
                issuer: c.organizationName,
                description: c.description || '',
                date: c.appointmentDate || c.createdAt,
                fileUrl: c.appointmentLetter || '',
              }))
            )
        );
      }

      const lists = await Promise.all(queries);
      let allAchievements = lists.flat();

      // If HOD/ADMIN/PLACEMENT/FACULTY filters achievements by student department/branch/year
      if (userRole !== 'STUDENT' && (deptFilter || branch || year)) {
        allAchievements = allAchievements.filter((ach: any) => {
          const student = ach.studentId;
          if (!student) return false;
          if (deptFilter && student.department !== deptFilter) return false;
          if (branch && student.branch !== branch) return false;
          if (year && student.year !== Number(year)) return false;
          return true;
        });
      }

      const mapStatus = (statusVal: string) => {
        const upper = String(statusVal || '').toUpperCase();
        if (upper === 'APPROVED') return 'VERIFIED';
        return upper || 'PENDING';
      };

      const results = allAchievements
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 100)
        .map((ach: any) => ({
          id: ach._id,
          type: ach.type,
          title: ach.title,
          issuer: ach.issuer,
          description: ach.description,
          date: ach.date,
          fileUrl: ach.fileUrl,
          status: mapStatus(ach.status),
          remarks: ach.remarks,
          studentName: ach.studentId?.userId?.name || 'Unknown',
          studentRoll: ach.studentId?.rollNumber || '',
          studentBranch: ach.studentId?.branch || '',
          studentDept: ach.studentId?.department || '',
        }));

      res.status(200).json({ results });
      return;
    }

    res.status(400).json({ message: 'Invalid search type.' });
  } catch (error: any) {
    res.status(550).json({ message: error.message });
  }
};
