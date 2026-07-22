import { Response } from 'express';
import ActivityCertification from '../models/ActivityCertification';
import Student from '../models/Student';
import Notification from '../models/Notification';
import ActivityScore from '../models/ActivityScore';
import ActivityScoreMap from '../models/ActivityScoreMap';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateAndStoreActivityScore } from '../services/activityScoringService';
import { getUploadUrl } from '../utils/uploadUrl';

// Fallback constant mappings
const fallbackScoreMap: Record<string, number> = {
  'Department Level': 1,
  'Institute Level': 2,
  'Inter-University Level': 3,
  'Zonal Level': 4,
  'National / International Level': 5,
};

// Helper to look up score dynamically from DB with fallback
const lookupActivityScore = async (level: string): Promise<number> => {
  try {
    const mapRecord = await ActivityScoreMap.findOne({ level });
    if (mapRecord) return mapRecord.score;
  } catch (err) {
    console.error('Failed to look up Activity score mappings from DB:', err);
  }
  return fallbackScoreMap[level] || 1;
};

// @desc    Submit a new Activity certificate
// @route   POST /api/activities
// @access  Private (Student)
export const submitActivityCert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const rawYear = req.headers['x-academic-year'];
    const academicYear = rawYear ? Number(rawYear) : (req.body.academicYear ? Number(req.body.academicYear) : undefined);

    const { activityName, category, activityLevel, provider, certificateNumber, issueDate } = req.body;

    if (!activityName || !category || !activityLevel || !provider || !issueDate || !academicYear) {
      res.status(400).json({ message: 'Missing required fields: activityName, category, activityLevel, provider, issueDate, academicYear.' });
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
      res.status(400).json({ message: 'Activity certificate proof file upload is required.' });
      return;
    }

    // Resolve score points dynamically from database mappings
    const calculatedScore = await lookupActivityScore(activityLevel);

    const certification = await ActivityCertification.create({
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
      message: 'Activity certificate uploaded successfully. Status: PENDING.',
      certification,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get certificates for the logged-in student
// @route   GET /api/activities/student
// @access  Private (Student)
export const getStudentActivityCerts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const certifications = await ActivityCertification.find({ studentId: student._id as any });
    const scores = await ActivityScore.find({ studentId: student._id as any });

    res.status(200).json({
      certifications,
      scores,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending certificates for faculty verification
// @route   GET /api/activities/pending
// @access  Private (Faculty, HOD, Admin)
export const getPendingActivityCerts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const certifications = await ActivityCertification.find({ status: 'PENDING' })
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'name email' }
      } as any);

    res.status(200).json({
      certifications,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve an activity certificate (with overrides)
// @route   PUT /api/activities/:id/approve
// @access  Private (Faculty, HOD, Admin)
export const approveActivityCert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { activityLevel, facultyApprovedScore, remarks } = req.body;

    const certification = await ActivityCertification.findById(id);
    if (!certification) {
      res.status(404).json({ message: 'Activity certification not found.' });
      return;
    }

    // Set faculty overrides or use defaults
    certification.facultyApprovedLevel = activityLevel || certification.studentSelectedLevel;
    certification.facultyApprovedScore = facultyApprovedScore !== undefined && facultyApprovedScore !== null
      ? Number(facultyApprovedScore)
      : (await lookupActivityScore(certification.facultyApprovedLevel || certification.studentSelectedLevel));

    certification.status = 'APPROVED';
    certification.remarks = remarks || '';
    certification.approvedBy = req.user.id as any;
    certification.approvedAt = new Date();

    await certification.save();

    // Recalculate scores for student
    const result = await calculateAndStoreActivityScore(certification.studentId.toString(), certification.academicYear);

    // Send notification
    await Notification.create({
      userId: (await Student.findById(certification.studentId))?.userId as any,
      title: 'Activity Certificate Approved',
      message: `Your certificate "${certification.activityName}" was approved. Year ${certification.academicYear} Activity Score is now ${result.score}.`,
      type: 'VERIFICATION_UPDATE',
      isRead: false,
    });

    res.status(200).json({
      message: 'Activity certification approved and scores updated.',
      certification,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject an activity certificate
// @route   PUT /api/activities/:id/reject
// @access  Private (Faculty, HOD, Admin)
export const rejectActivityCert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const certification = await ActivityCertification.findById(id);
    if (!certification) {
      res.status(404).json({ message: 'Activity certification not found.' });
      return;
    }

    certification.status = 'REJECTED';
    certification.remarks = remarks;
    certification.facultyApprovedLevel = undefined;
    certification.facultyApprovedScore = undefined;
    certification.approvedBy = req.user.id as any;
    certification.approvedAt = new Date();

    await certification.save();

    // Recalculate scores for student
    await calculateAndStoreActivityScore(certification.studentId.toString(), certification.academicYear);

    // Send notification
    await Notification.create({
      userId: (await Student.findById(certification.studentId))?.userId as any,
      title: 'Activity Certificate Rejected',
      message: `Your certificate "${certification.activityName}" was rejected. Feedback: "${remarks}".`,
      type: 'VERIFICATION_UPDATE',
      isRead: false,
    });

    res.status(200).json({
      message: 'Activity certification rejected and student notified.',
      certification,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update activity certificate (Student Edit)
// @route   PUT /api/activities/:id
// @access  Private (Student)
export const updateActivityCert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { activityName, category, activityLevel, provider, certificateNumber, issueDate, academicYear } = req.body;

    const certification = await ActivityCertification.findById(id);
    if (!certification) {
      res.status(404).json({ message: 'Activity certification not found.' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student || student._id.toString() !== certification.studentId.toString()) {
      res.status(403).json({ message: 'Not authorized to modify this certification.' });
      return;
    }

    const previousAcademicYear = certification.academicYear;

    if (academicYear && Number(academicYear) !== previousAcademicYear) {
      res.status(400).json({ message: 'Academic Year is immutable and cannot be changed.' });
      return;
    }

    certification.activityName = activityName || certification.activityName;
    certification.category = category || certification.category;
    certification.provider = provider || certification.provider;
    certification.certificateNumber = certificateNumber !== undefined ? certificateNumber : certification.certificateNumber;
    if (issueDate) {
      certification.issueDate = new Date(issueDate);
    }
    if (activityLevel) {
      certification.activityLevel = activityLevel;
      certification.studentSelectedLevel = activityLevel;
      certification.calculatedScore = await lookupActivityScore(activityLevel);
    }

    if (req.file) {
      certification.certificateFile = getUploadUrl(req.file.filename);
    }

    // Reset status to pending
    certification.status = 'PENDING';
    certification.remarks = '';
    certification.facultyApprovedLevel = undefined;
    certification.facultyApprovedScore = undefined;
    certification.approvedBy = undefined;
    certification.approvedAt = undefined;

    await certification.save();

    // Recalculate scoring for student for previous and current years
    await calculateAndStoreActivityScore(student._id.toString(), previousAcademicYear);
    if (certification.academicYear !== previousAcademicYear) {
      await calculateAndStoreActivityScore(student._id.toString(), certification.academicYear);
    }

    res.status(200).json({
      message: 'Activity certification updated. Status reverted to PENDING for review.',
      certification,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an activity certificate
// @route   DELETE /api/activities/:id
// @access  Private (Student)
export const deleteActivityCert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const certification = await ActivityCertification.findById(id);
    if (!certification) {
      res.status(404).json({ message: 'Activity certification not found.' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student || student._id.toString() !== certification.studentId.toString()) {
      res.status(403).json({ message: 'Not authorized to delete this certification.' });
      return;
    }

    const academicYear = certification.academicYear;

    await ActivityCertification.findByIdAndDelete(id);

    // Immediately recalculate
    await calculateAndStoreActivityScore(student._id.toString(), academicYear);

    res.status(200).json({
      message: 'Activity certification deleted and score recalculated.',
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get level-to-score mappings
// @route   GET /api/activities/score-mappings
// @access  Private
export const getActivityScoreMappings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const mappings = await ActivityScoreMap.find({});
    res.status(200).json({ mappings });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get year-wise scores summary
// @route   GET /api/activities/score-summary
// @access  Private
export const getActivityScoreSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
        res.status(400).json({ message: 'studentId query param is required for staff review.' });
        return;
      }
    }

    const scores = await ActivityScore.find({ studentId } as any);

    res.status(200).json({
      scores,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
