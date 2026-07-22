import { Response } from 'express';
import ExtraCurricularActivity from '../models/ExtraCurricularActivity';
import Student from '../models/Student';
import Notification from '../models/Notification';
import ExtraCurricularScore from '../models/ExtraCurricularScore';
import ActivityScoreMap from '../models/ActivityScoreMap';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateAndStoreExtraCurricularScore } from '../services/extraCurricularScoringService';
import { getUploadUrl } from '../utils/uploadUrl';

const fallbackActivityLevelScoreMap: Record<string, number> = {
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
  return fallbackActivityLevelScoreMap[level] || 1;
};

const getLevelFromCategory = (category: string): 'Department Level' | 'Institute Level' | 'Inter-University Level' | 'Zonal Level' | 'National / International Level' => {
  if (category === 'NSS' || category === 'NCC') {
    return 'National / International Level';
  } else if (['Social Service', 'Community Service', 'Student Welfare Activities'].includes(category)) {
    return 'Zonal Level';
  } else if (['Cultural Activities', 'Dance', 'Music', 'Fine Arts', 'Drama', 'Clubs', 'Volunteering', 'Literary Activities'].includes(category)) {
    return 'Inter-University Level';
  } else {
    return 'Institute Level';
  }
};

export const submitExtraCurricular = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const rawYear = req.headers['x-academic-year'];
    const academicYear = rawYear ? Number(rawYear) : (req.body.academicYear ? Number(req.body.academicYear) : undefined);

    let { activityName, category, activityLevel, provider, certificateNumber, issueDate } = req.body;

    if (!activityName || !category || !provider || !issueDate || !academicYear) {
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

    if (!activityLevel) {
      activityLevel = getLevelFromCategory(category);
    }

    const calculatedScore = await lookupActivityScore(activityLevel);

    const activity = await ExtraCurricularActivity.create({
      studentId: student._id as any,
      activityName,
      category,
      studentSelectedCategory: category,
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
      message: 'Extra-Curricular activity submitted. Status: PENDING.',
      activity,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentExtraCurriculars = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const activities = await ExtraCurricularActivity.find({ studentId: student._id as any });
    const scores = await ExtraCurricularScore.find({ studentId: student._id as any });

    res.status(200).json({
      activities,
      scores,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getPendingExtraCurriculars = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const activities = await ExtraCurricularActivity.find({ status: 'PENDING' })
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

export const approveExtraCurricular = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { activityLevel, category, facultyApprovedScore, remarks } = req.body;

    const activity = await ExtraCurricularActivity.findById(id);
    if (!activity) {
      res.status(404).json({ message: 'Activity not found.' });
      return;
    }

    activity.facultyApprovedCategory = category || activity.studentSelectedCategory;
    
    // Map activityLevel from input, or fallback from category if present, or fallback to student selected levels
    let approvedLevel = activityLevel;
    if (!approvedLevel && category) {
      approvedLevel = getLevelFromCategory(category);
    }
    activity.facultyApprovedLevel = approvedLevel || activity.studentSelectedLevel || activity.activityLevel;

    activity.facultyApprovedScore = facultyApprovedScore !== undefined && facultyApprovedScore !== null
      ? Number(facultyApprovedScore)
      : await lookupActivityScore(activity.facultyApprovedLevel || 'Institute Level');

    activity.status = 'APPROVED';
    activity.remarks = remarks || '';
    activity.approvedBy = req.user.id as any;
    activity.approvedAt = new Date();

    await activity.save();

    const result = await calculateAndStoreExtraCurricularScore(activity.studentId.toString(), activity.academicYear);

    await Notification.create({
      userId: (await Student.findById(activity.studentId))?.userId as any,
      title: 'Extra-Curricular Activity Approved',
      message: `Your extra-curricular activity "${activity.activityName}" was approved. Year ${activity.academicYear} Score: ${result.score}.`,
      type: 'VERIFICATION_UPDATE',
      isRead: false,
    });

    res.status(200).json({
      message: 'Extra-Curricular activity approved.',
      activity,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const rejectExtraCurricular = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const activity = await ExtraCurricularActivity.findById(id);
    if (!activity) {
      res.status(404).json({ message: 'Activity not found.' });
      return;
    }

    activity.status = 'REJECTED';
    activity.remarks = remarks;
    activity.facultyApprovedCategory = undefined;
    activity.facultyApprovedLevel = undefined;
    activity.facultyApprovedScore = undefined;
    activity.approvedBy = req.user.id as any;
    activity.approvedAt = new Date();

    await activity.save();

    await calculateAndStoreExtraCurricularScore(activity.studentId.toString(), activity.academicYear);

    await Notification.create({
      userId: (await Student.findById(activity.studentId))?.userId as any,
      title: 'Extra-Curricular Activity Rejected',
      message: `Your extra-curricular activity "${activity.activityName}" was rejected. Remarks: "${remarks}".`,
      type: 'VERIFICATION_UPDATE',
      isRead: false,
    });

    res.status(200).json({
      message: 'Extra-Curricular activity rejected.',
      activity,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateExtraCurricular = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { activityName, category, activityLevel, provider, certificateNumber, issueDate, academicYear } = req.body;

    const activity = await ExtraCurricularActivity.findById(id);
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
    
    if (category) {
      activity.studentSelectedCategory = category;
    }

    if (activityLevel) {
      activity.activityLevel = activityLevel;
      activity.studentSelectedLevel = activityLevel;
      activity.calculatedScore = await lookupActivityScore(activityLevel);
    } else if (category) {
      activity.activityLevel = getLevelFromCategory(category);
      activity.studentSelectedLevel = activity.activityLevel;
      activity.calculatedScore = await lookupActivityScore(activity.activityLevel || 'Institute Level');
    }

    if (req.file) {
      activity.certificateFile = getUploadUrl(req.file.filename);
    }

    activity.status = 'PENDING';
    activity.remarks = '';
    activity.facultyApprovedCategory = undefined;
    activity.facultyApprovedLevel = undefined;
    activity.facultyApprovedScore = undefined;
    activity.approvedBy = undefined;
    activity.approvedAt = undefined;

    await activity.save();

    await calculateAndStoreExtraCurricularScore(student._id.toString(), previousAcademicYear);
    if (activity.academicYear !== previousAcademicYear) {
      await calculateAndStoreExtraCurricularScore(student._id.toString(), activity.academicYear);
    }

    res.status(200).json({
      message: 'Extra-Curricular activity updated. Status reverted to PENDING.',
      activity,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteExtraCurricular = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const activity = await ExtraCurricularActivity.findById(id);
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

    await ExtraCurricularActivity.findByIdAndDelete(id);

    await calculateAndStoreExtraCurricularScore(student._id.toString(), academicYear);

    res.status(200).json({
      message: 'Extra-Curricular activity deleted.',
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getExtraCurricularScoreSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const scores = await ExtraCurricularScore.find({ studentId } as any);
    res.status(200).json({ scores });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
