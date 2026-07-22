import { Response } from 'express';
import CoCurricularActivity from '../models/CoCurricularActivity';
import Student from '../models/Student';
import Notification from '../models/Notification';
import CoCurricularScore from '../models/CoCurricularScore';
import ActivityScoreMap from '../models/ActivityScoreMap';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateAndStoreCoCurricularScore } from '../services/coCurricularScoringService';
import { getUploadUrl } from '../utils/uploadUrl';

const fallbackScoreMap: Record<string, number> = {
  'Department Level': 1,
  'Institute Level': 2,
  'Inter-University Level': 3,
  'Zonal Level': 4,
  'National / International Level': 5,
};

const lookupActivityScore = async (level: string): Promise<number> => {
  try {
    const mapRecord = await ActivityScoreMap.findOne({ level });
    if (mapRecord) return mapRecord.score;
  } catch (err) {
    console.error('Failed to look up Activity score mappings from DB:', err);
  }
  return fallbackScoreMap[level] || 1;
};

export const submitCoCurricular = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const rawYear = req.headers['x-academic-year'];
    const academicYear = rawYear ? Number(rawYear) : (req.body.academicYear ? Number(req.body.academicYear) : undefined);

    const { activityName, category, activityLevel, provider, certificateNumber, issueDate } = req.body;

    if (!activityName || !category || !activityLevel || !provider || !issueDate || !academicYear) {
      res.status(400).json({ message: 'Missing required fields.' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student) {
      res.status(404).json({ message: 'Student profile not found.' });
      return;
    }

    let certificateFile = '';
    if (req.file) {
      certificateFile = getUploadUrl(req.file.filename);
    } else {
      res.status(400).json({ message: 'Certificate proof file upload is required.' });
      return;
    }

    const calculatedScore = await lookupActivityScore(activityLevel);

    const activity = await CoCurricularActivity.create({
      studentId: student._id as any,
      activityName,
      category,
      activityLevel,
      studentSelectedLevel: activityLevel,
      calculatedScore,
      academicYear: Number(academicYear),
      provider,
      certificateNumber,
      issueDate: new Date(issueDate),
      certificateFile,
      status: 'PENDING',
      remarks: '',
    });

    res.status(201).json({
      message: 'Co-Curricular activity submitted. Status: PENDING.',
      activity,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentCoCurriculars = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const activities = await CoCurricularActivity.find({ studentId: student._id as any });
    const scores = await CoCurricularScore.find({ studentId: student._id as any });

    res.status(200).json({
      activities,
      scores,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getPendingCoCurriculars = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const activities = await CoCurricularActivity.find({ status: 'PENDING' })
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'name email' }
      } as any);

    res.status(200).json({
      activities,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const approveCoCurricular = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { activityLevel, facultyApprovedScore, remarks } = req.body;

    const activity = await CoCurricularActivity.findById(id);
    if (!activity) {
      res.status(404).json({ message: 'Activity not found.' });
      return;
    }

    activity.facultyApprovedLevel = activityLevel || activity.studentSelectedLevel;
    activity.facultyApprovedScore = facultyApprovedScore !== undefined && facultyApprovedScore !== null
      ? Number(facultyApprovedScore)
      : await lookupActivityScore(activity.facultyApprovedLevel || activity.studentSelectedLevel);

    activity.status = 'APPROVED';
    activity.remarks = remarks || '';
    activity.approvedBy = req.user.id as any;
    activity.approvedAt = new Date();

    await activity.save();

    const result = await calculateAndStoreCoCurricularScore(activity.studentId.toString(), activity.academicYear);

    await Notification.create({
      userId: (await Student.findById(activity.studentId))?.userId as any,
      title: 'Co-Curricular Activity Approved',
      message: `Your co-curricular activity "${activity.activityName}" was approved. Year ${activity.academicYear} Score: ${result.score}.`,
      type: 'VERIFICATION_UPDATE',
      isRead: false,
    });

    res.status(200).json({
      message: 'Co-Curricular activity approved.',
      activity,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const rejectCoCurricular = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { remarks } = req.body;

    if (!remarks || !remarks.trim()) {
      res.status(400).json({ message: 'Feedback remarks are required for rejection.' });
      return;
    }

    const activity = await CoCurricularActivity.findById(id);
    if (!activity) {
      res.status(404).json({ message: 'Activity not found.' });
      return;
    }

    activity.status = 'REJECTED';
    activity.remarks = remarks;
    activity.facultyApprovedLevel = undefined;
    activity.facultyApprovedScore = undefined;
    activity.approvedBy = req.user.id as any;
    activity.approvedAt = new Date();

    await activity.save();

    await calculateAndStoreCoCurricularScore(activity.studentId.toString(), activity.academicYear);

    await Notification.create({
      userId: (await Student.findById(activity.studentId))?.userId as any,
      title: 'Co-Curricular Activity Rejected',
      message: `Your co-curricular activity "${activity.activityName}" was rejected. Remarks: "${remarks}".`,
      type: 'VERIFICATION_UPDATE',
      isRead: false,
    });

    res.status(200).json({
      message: 'Co-Curricular activity rejected.',
      activity,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCoCurricular = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { activityName, category, activityLevel, provider, certificateNumber, issueDate, academicYear } = req.body;

    const activity = await CoCurricularActivity.findById(id);
    if (!activity) {
      res.status(404).json({ message: 'Activity not found.' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student || student._id.toString() !== activity.studentId.toString()) {
      res.status(403).json({ message: 'Not authorized.' });
      return;
    }

    const previousAcademicYear = activity.academicYear;

    if (academicYear && Number(academicYear) !== previousAcademicYear) {
      res.status(400).json({ message: 'Academic Year is immutable and cannot be changed.' });
      return;
    }

    activity.activityName = activityName || activity.activityName;
    activity.category = category || activity.category;
    activity.provider = provider || activity.provider;
    activity.certificateNumber = certificateNumber !== undefined ? certificateNumber : activity.certificateNumber;
    if (issueDate) {
      activity.issueDate = new Date(issueDate);
    }
    if (activityLevel) {
      activity.activityLevel = activityLevel;
      activity.studentSelectedLevel = activityLevel;
      activity.calculatedScore = await lookupActivityScore(activityLevel);
    }

    if (req.file) {
      activity.certificateFile = getUploadUrl(req.file.filename);
    }

    activity.status = 'PENDING';
    activity.remarks = '';
    activity.facultyApprovedLevel = undefined;
    activity.facultyApprovedScore = undefined;
    activity.approvedBy = undefined;
    activity.approvedAt = undefined;

    await activity.save();

    await calculateAndStoreCoCurricularScore(student._id.toString(), previousAcademicYear);
    if (activity.academicYear !== previousAcademicYear) {
      await calculateAndStoreCoCurricularScore(student._id.toString(), activity.academicYear);
    }

    res.status(200).json({
      message: 'Co-Curricular activity updated. Status reverted to PENDING.',
      activity,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCoCurricular = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const activity = await CoCurricularActivity.findById(id);
    if (!activity) {
      res.status(404).json({ message: 'Activity not found.' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student || student._id.toString() !== activity.studentId.toString()) {
      res.status(403).json({ message: 'Not authorized.' });
      return;
    }

    const academicYear = activity.academicYear;

    await CoCurricularActivity.findByIdAndDelete(id);

    await calculateAndStoreCoCurricularScore(student._id.toString(), academicYear);

    res.status(200).json({
      message: 'Co-Curricular activity deleted.',
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCoCurricularScoreSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
        res.status(400).json({ message: 'studentId query param is required.' });
        return;
      }
    }

    const scores = await CoCurricularScore.find({ studentId } as any);
    res.status(200).json({ scores });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
