import { Response } from 'express';
import Achievement from '../models/Achievement';
import Student from '../models/Student';
import Notification from '../models/Notification';
import { AuthenticatedRequest } from '../middleware/auth';
import { getUploadUrl } from '../utils/uploadUrl';

import Certification from '../models/Certification';
import Project from '../models/Project';
import CambridgeCertification from '../models/CambridgeCertification';
import ActivityCertification from '../models/ActivityCertification';
import CoCurricularActivity from '../models/CoCurricularActivity';
import ExtraCurricularActivity from '../models/ExtraCurricularActivity';
import PhysicalFitnessActivity from '../models/PhysicalFitnessActivity';
import CodingChallenge from '../models/CodingChallenge';
import LeadershipActivity from '../models/LeadershipActivity';

// @desc    Submit a new achievement / upload document
// @route   POST /api/achievements
// @access  Private (Student)
export const submitAchievement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { type, title, issuer, description, date } = req.body;

    if (!type || !title || !issuer || !date) {
      res.status(400).json({ message: 'Type, title, issuer, and date are required.' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      res.status(404).json({ message: 'Student details not found.' });
      return;
    }

    let fileUrl = '';
    if (req.file) {
      fileUrl = getUploadUrl(req.file.filename);
    }

    const achievement = await Achievement.create({
      studentId: student._id,
      type,
      title,
      issuer,
      description,
      date: new Date(date),
      fileUrl,
      status: 'PENDING',
    });

    res.status(201).json({
      message: 'Achievement submitted for verification successfully',
      achievement,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all achievements for the logged-in student
// @route   GET /api/achievements/student
// @access  Private (Student)
export const getStudentAchievements = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    let targetStudentId = req.query.studentId as string;

    if (targetStudentId) {
      if (req.user.role === 'STUDENT') {
        res.status(403).json({ message: 'Forbidden: Students cannot access other students\' records.' });
        return;
      }
    } else {
      const student = await Student.findOne({ userId: req.user.id });
      if (!student) {
        res.status(404).json({ message: 'Student profile not found.' });
        return;
      }
      targetStudentId = student._id.toString();
    }

    // Query all collections in parallel
    const [
      achList,
      certList,
      cambList,
      actList,
      coList,
      extraList,
      fitList,
      codingList,
      leadList,
      projList
    ] = await Promise.all([
      Achievement.find({ studentId: targetStudentId } as any).lean(),
      Certification.find({ studentId: targetStudentId } as any).lean(),
      CambridgeCertification.find({ studentId: targetStudentId } as any).lean(),
      ActivityCertification.find({ studentId: targetStudentId } as any).lean(),
      CoCurricularActivity.find({ studentId: targetStudentId } as any).lean(),
      ExtraCurricularActivity.find({ studentId: targetStudentId } as any).lean(),
      PhysicalFitnessActivity.find({ studentId: targetStudentId } as any).lean(),
      CodingChallenge.find({ studentId: targetStudentId } as any).lean(),
      LeadershipActivity.find({ studentId: targetStudentId } as any).lean(),
      Project.find({ studentId: targetStudentId } as any).lean()
    ]);

    const achievements: any[] = [];

    // Helper to map status
    const mapStatus = (status: string) => {
      const upper = String(status || '').toUpperCase();
      if (upper === 'APPROVED') return 'VERIFIED';
      return upper || 'PENDING';
    };

    // 1. General achievements
    achList.forEach((a: any) => {
      achievements.push({
        _id: a._id,
        type: a.type,
        title: a.title,
        issuer: a.issuer,
        description: a.description || '',
        date: a.date,
        fileUrl: a.fileUrl || '',
        status: mapStatus(a.status),
        remarks: a.remarks || ''
      });
    });

    // 2. Certifications
    certList.forEach((c: any) => {
      achievements.push({
        _id: c._id,
        type: 'CERTIFICATION',
        title: c.certificateName || 'Certification',
        issuer: c.provider || '',
        description: c.certificateCategory || '',
        date: c.issueDate || c.createdAt,
        fileUrl: c.certificateFile || '',
        status: mapStatus(c.status),
        remarks: c.remarks || ''
      });
    });

    // 3. Cambridge Certifications
    cambList.forEach((c: any) => {
      achievements.push({
        _id: c._id,
        type: 'CERTIFICATION',
        title: c.certificateName || 'Cambridge Certification',
        issuer: c.provider || 'Cambridge',
        description: c.certificateLevel || '',
        date: c.issueDate || c.createdAt,
        fileUrl: c.certificateFile || '',
        status: mapStatus(c.status),
        remarks: c.remarks || ''
      });
    });

    // 4. Activity Certifications
    actList.forEach((c: any) => {
      achievements.push({
        _id: c._id,
        type: 'CERTIFICATION',
        title: c.activityName || 'Activity Certification',
        issuer: c.provider || '',
        description: `${c.category || ''} - ${c.activityLevel || ''}`,
        date: c.issueDate || c.createdAt,
        fileUrl: c.certificateFile || '',
        status: mapStatus(c.status),
        remarks: c.remarks || ''
      });
    });

    // 5. Co-Curricular Activities
    coList.forEach((c: any) => {
      achievements.push({
        _id: c._id,
        type: 'CO_CURRICULAR',
        title: c.activityName || 'Co-Curricular Activity',
        issuer: c.provider || '',
        description: c.category || '',
        date: c.issueDate || c.createdAt,
        fileUrl: c.certificateFile || '',
        status: mapStatus(c.status),
        remarks: c.remarks || ''
      });
    });

    // 6. Extra-Curricular Activities
    extraList.forEach((c: any) => {
      achievements.push({
        _id: c._id,
        type: 'EXTRA_CURRICULAR',
        title: c.activityName || 'Extra-Curricular Activity',
        issuer: c.provider || '',
        description: c.category || '',
        date: c.issueDate || c.createdAt,
        fileUrl: c.certificateFile || '',
        status: mapStatus(c.status),
        remarks: c.remarks || ''
      });
    });

    // 7. Physical Fitness/Sports Activities
    fitList.forEach((c: any) => {
      achievements.push({
        _id: c._id,
        type: 'SPORTS',
        title: c.activityName || c.eventName || 'Sports Activity',
        issuer: c.organizer || '',
        description: c.description || '',
        date: c.eventDate || c.createdAt,
        fileUrl: c.certificateFile || '',
        status: mapStatus(c.status),
        remarks: c.remarks || ''
      });
    });

    // 8. Coding Challenges
    codingList.forEach((c: any) => {
      achievements.push({
        _id: c._id,
        type: 'HACKATHON',
        title: c.eventName || 'Coding Challenge',
        issuer: c.organizer || '',
        description: c.achievementCategory || '',
        date: c.eventDate || c.createdAt,
        fileUrl: c.certificateFile || '',
        status: mapStatus(c.status),
        remarks: c.remarks || ''
      });
    });

    // 9. Leadership Activities
    leadList.forEach((c: any) => {
      achievements.push({
        _id: c._id,
        type: 'CLUB',
        title: `${c.leadershipRole || 'Leadership'} - ${c.leadershipPosition || 'Member'}`,
        issuer: c.organizationName || '',
        description: c.description || '',
        date: c.appointmentDate || c.createdAt,
        fileUrl: c.appointmentLetter || '',
        status: mapStatus(c.status),
        remarks: c.remarks || ''
      });
    });

    // 10. Projects
    projList.forEach((c: any) => {
      achievements.push({
        _id: c._id,
        type: 'PROJECT',
        title: c.projectTitle || 'Project',
        issuer: 'VFSTR',
        description: c.projectDescription || '',
        date: c.createdAt,
        fileUrl: (c.supportingDocuments && c.supportingDocuments.length > 0) ? c.supportingDocuments[0] : '',
        status: mapStatus(c.status),
        remarks: c.remarks || ''
      });
    });

    // Sort achievements by date descending
    achievements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.status(200).json({
      achievements,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all pending achievements (for faculty/HOD review)
// @route   GET /api/achievements/pending
// @access  Private (Faculty, HOD, Admin)
export const getPendingAchievements = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Populate student and user information
    const achievements = await Achievement.find({ status: { $in: ['PENDING', 'UNDER_REVIEW'] } })
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'name email' },
      })
      .sort({ createdAt: 1 });

    res.status(200).json({
      achievements,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify (Approve / Reject) an achievement submission
// @route   PUT /api/achievements/:id/verify
// @access  Private (Faculty, HOD, Admin)
export const verifyAchievement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!['VERIFIED', 'REJECTED', 'UNDER_REVIEW'].includes(status)) {
      res.status(400).json({ message: 'Invalid verification status.' });
      return;
    }

    const achievement = await Achievement.findById(id).populate({
      path: 'studentId',
      populate: { path: 'userId' }
    });

    if (!achievement) {
      res.status(404).json({ message: 'Achievement not found.' });
      return;
    }

    achievement.status = status;
    achievement.remarks = remarks || '';
    achievement.verifiedBy = req.user.id as any;
    await achievement.save();

    // Create a Notification for the student
    const studentUser = (achievement.studentId as any).userId;
    if (studentUser) {
      await Notification.create({
        userId: studentUser._id,
        title: `Achievement Verification Update`,
        message: `Your submission "${achievement.title}" has been ${status.toLowerCase()} by Faculty ${req.user.name}.${remarks ? ` Remarks: "${remarks}"` : ''}`,
        type: 'VERIFICATION_UPDATE',
      });
    }

    res.status(200).json({
      message: `Achievement successfully marked as ${status}`,
      achievement,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
