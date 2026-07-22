import { Response } from 'express';
import LeadershipActivity from '../models/LeadershipActivity';
import Student from '../models/Student';
import Notification from '../models/Notification';
import LeadershipScore from '../models/LeadershipScore';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateAndStoreLeadershipScore } from '../services/leadershipScoringService';
import { getUploadUrl } from '../utils/uploadUrl';

const roleScoreMap: Record<string, number> = {
  'CR / LR / ARC / SAC – Members': 3,
  'Coordinators': 5,
};

// @desc    Create a new leadership activity record
// @route   POST /api/leadership-activities
// @access  Private (Student)
export const submitLeadershipActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const rawYear = req.headers['x-academic-year'];
    const academicYear = rawYear ? Number(rawYear) : (req.body.academicYear ? Number(req.body.academicYear) : undefined);

    const {
      organizationName,
      leadershipRole,
      leadershipPosition,
      duration,
      appointmentDate,
      description,
    } = req.body;

    if (!academicYear || !organizationName || !leadershipRole || !duration) {
      res.status(400).json({
        message: 'Missing required fields: academicYear, organizationName, leadershipRole, duration.',
      });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student) {
      res.status(404).json({ message: 'Student profile not found.' });
      return;
    }

    let appointmentLetter = '';
    if (req.file) {
      appointmentLetter = getUploadUrl(req.file.filename);
    } else {
      res.status(400).json({ message: 'Appointment letter file upload is required.' });
      return;
    }

    const initialScore = roleScoreMap[leadershipRole] || 3;

    const activity = await LeadershipActivity.create({
      studentId: student._id as any,
      academicYear: Number(academicYear),
      organizationName,
      leadershipRole,
      studentSelectedRole: leadershipRole,
      leadershipPosition,
      duration,
      appointmentDate: appointmentDate ? new Date(appointmentDate) : undefined,
      description,
      appointmentLetter,
      studentCalculatedScore: initialScore,
      status: 'PENDING',
      remarks: '',
    });

    res.status(201).json({
      message: 'Leadership Activity submitted successfully. Status: PENDING.',
      activity,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get leadership activities for the logged-in student
// @route   GET /api/leadership-activities/student
// @access  Private (Student)
export const getStudentLeadershipActivities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student) {
      res.status(404).json({ message: 'Student profile not found.' });
      return;
    }

    const activities = await LeadershipActivity.find({ studentId: student._id } as any).sort({ createdAt: -1 });
    const scores = await LeadershipScore.find({ studentId: student._id } as any);

    res.status(200).json({
      activities,
      scores,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending leadership activities for verification
// @route   GET /api/leadership-activities/pending
// @access  Private (Faculty, HOD, Admin)
export const getPendingLeadershipActivities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const activities = await LeadershipActivity.find({ status: 'PENDING' } as any)
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'name email' },
      })
      .sort({ createdAt: 1 });

    res.status(200).json({
      activities,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve a leadership activity record
// @route   PUT /api/leadership-activities/:id/approve
// @access  Private (Faculty, HOD, Admin)
export const approveLeadershipActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { leadershipRole, facultyApprovedScore } = req.body;

    const activity = await LeadershipActivity.findById(id).populate({
      path: 'studentId',
      populate: { path: 'userId' },
    });

    if (!activity) {
      res.status(404).json({ message: 'Leadership activity request not found.' });
      return;
    }

    // Set approved role (overridden by faculty, or fallback to student selected role)
    const finalRole = leadershipRole || activity.studentSelectedRole;
    activity.facultyApprovedRole = finalRole;
    activity.leadershipRole = finalRole as any;

    // Set approved score
    if (facultyApprovedScore !== undefined && facultyApprovedScore !== null) {
      activity.facultyApprovedScore = Number(facultyApprovedScore);
    } else {
      activity.facultyApprovedScore = roleScoreMap[finalRole] || 3;
    }

    activity.status = 'APPROVED';
    activity.remarks = req.body.remarks || '';
    activity.approvedBy = req.user.id as any;
    activity.approvedAt = new Date();

    await activity.save();

    const studentIdStr = (activity.studentId as any)._id
      ? (activity.studentId as any)._id.toString()
      : activity.studentId.toString();

    // Recalculate score for student for this academic year
    await calculateAndStoreLeadershipScore(
      studentIdStr,
      activity.academicYear
    );

    // Send notification to student
    const studentUser = (activity.studentId as any).userId;
    if (studentUser) {
      await Notification.create({
        userId: studentUser._id,
        title: 'Leadership Activity Approved',
        message: `Your leadership activity for "${activity.organizationName}" has been approved as ${activity.facultyApprovedRole} (Score: ${activity.facultyApprovedScore}).`,
        type: 'VERIFICATION_UPDATE',
      });
    }

    res.status(200).json({
      message: 'Leadership activity approved and scoring recalculated.',
      activity,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject a leadership activity record
// @route   PUT /api/leadership-activities/:id/reject
// @access  Private (Faculty, HOD, Admin)
export const rejectLeadershipActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { remarks } = req.body;

    if (!remarks || !remarks.trim()) {
      res.status(400).json({ message: 'Rejection remarks/feedback is mandatory.' });
      return;
    }

    const activity = await LeadershipActivity.findById(id).populate({
      path: 'studentId',
      populate: { path: 'userId' },
    });

    if (!activity) {
      res.status(404).json({ message: 'Leadership activity request not found.' });
      return;
    }

    activity.status = 'REJECTED';
    activity.remarks = remarks;
    activity.approvedBy = req.user.id as any;
    activity.approvedAt = new Date();

    await activity.save();

    const studentIdStr = (activity.studentId as any)._id
      ? (activity.studentId as any)._id.toString()
      : activity.studentId.toString();

    // Recalculate score (it ignores rejected ones)
    await calculateAndStoreLeadershipScore(
      studentIdStr,
      activity.academicYear
    );

    // Send notification to student
    const studentUser = (activity.studentId as any).userId;
    if (studentUser) {
      await Notification.create({
        userId: studentUser._id,
        title: 'Leadership Activity Rejected',
        message: `Your leadership activity for "${activity.organizationName}" has been rejected. Feedback: ${remarks}`,
        type: 'VERIFICATION_UPDATE',
      });
    }

    res.status(200).json({
      message: 'Leadership activity rejected and scoring recalculated.',
      activity,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update/Edit a leadership activity record
// @route   PUT /api/leadership-activities/:id
// @access  Private (Student)
export const updateLeadershipActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const {
      academicYear,
      organizationName,
      leadershipRole,
      leadershipPosition,
      duration,
      appointmentDate,
      description,
    } = req.body;

    const activity = await LeadershipActivity.findById(id);
    if (!activity) {
      res.status(404).json({ message: 'Leadership activity not found.' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student || student._id.toString() !== activity.studentId.toString()) {
      res.status(403).json({ message: 'Not authorized to edit this record.' });
      return;
    }

    const previousAcademicYear = activity.academicYear;

    if (academicYear && Number(academicYear) !== previousAcademicYear) {
      res.status(400).json({ message: 'Academic Year is immutable and cannot be changed.' });
      return;
    }

    activity.organizationName = organizationName || activity.organizationName;
    if (leadershipRole) {
      activity.leadershipRole = leadershipRole;
      activity.studentSelectedRole = leadershipRole;
      activity.studentCalculatedScore = roleScoreMap[leadershipRole] || 3;
    }
    activity.leadershipPosition = leadershipPosition !== undefined ? leadershipPosition : activity.leadershipPosition;
    activity.duration = duration || activity.duration;
    if (appointmentDate !== undefined) {
      activity.appointmentDate = appointmentDate ? new Date(appointmentDate) : undefined;
    }
    activity.description = description !== undefined ? description : activity.description;

    if (req.file) {
      activity.appointmentLetter = getUploadUrl(req.file.filename);
    }

    // Reset status to PENDING
    activity.status = 'PENDING';
    activity.remarks = '';
    activity.facultyApprovedRole = undefined;
    activity.facultyApprovedScore = undefined;
    activity.approvedBy = undefined;
    activity.approvedAt = undefined;

    await activity.save();

    // Recalculate scores for the previous and current academic year
    await calculateAndStoreLeadershipScore(student._id.toString(), previousAcademicYear);
    if (activity.academicYear !== previousAcademicYear) {
      await calculateAndStoreLeadershipScore(student._id.toString(), activity.academicYear);
    }

    res.status(200).json({
      message: 'Leadership activity updated. Status reverted to PENDING for faculty review.',
      activity,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a leadership activity record
// @route   DELETE /api/leadership-activities/:id
// @access  Private (Student)
export const deleteLeadershipActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const activity = await LeadershipActivity.findById(id);
    if (!activity) {
      res.status(404).json({ message: 'Leadership activity not found.' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student || student._id.toString() !== activity.studentId.toString()) {
      res.status(403).json({ message: 'Not authorized to delete this record.' });
      return;
    }

    const academicYear = activity.academicYear;

    await LeadershipActivity.findByIdAndDelete(id);

    // Immediately recalculate score
    await calculateAndStoreLeadershipScore(student._id.toString(), academicYear);

    res.status(200).json({
      message: 'Leadership activity deleted successfully and scoring recalculated.',
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get leadership score summary for a student
// @route   GET /api/leadership-activities/score-summary
// @access  Private (Student, Faculty, HOD, Admin)
export const getScoreSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    let studentId = '';
    if (req.user.role === 'STUDENT') {
      const student = await Student.findOne({ userId: req.user.id } as any);
      if (!student) {
        res.status(404).json({ message: 'Student profile not found.' });
        return;
      }
      studentId = student._id.toString();
    } else {
      studentId = req.query.studentId as string;
      if (!studentId) {
        res.status(400).json({ message: 'studentId query parameter is required for staff review.' });
        return;
      }
    }

    const scores = await LeadershipScore.find({ studentId } as any);

    res.status(200).json({
      scores,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
