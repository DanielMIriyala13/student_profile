import { Response } from 'express';
import CambridgeCertification from '../models/CambridgeCertification';
import Student from '../models/Student';
import Notification from '../models/Notification';
import CommunicationScore from '../models/CommunicationScore';
import CambridgeScoreMap from '../models/CambridgeScoreMap';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateAndStoreCommunicationScore } from '../services/communicationScoringService';
import { getUploadUrl } from '../utils/uploadUrl';

// Fallback constant mappings
const fallbackScoreMap: Record<string, number> = {
  'A2 Key': 2,
  'B1 Preliminary': 4,
  'B2 First': 6,
  'C1 Advanced': 8,
  'C2 Proficiency': 10,
};

// Helper to look up score dynamically from DB with fallback
const lookupLevelScore = async (level: string): Promise<number> => {
  try {
    const mapRecord = await CambridgeScoreMap.findOne({ level });
    if (mapRecord) return mapRecord.score;
  } catch (err) {
    console.error('Failed to look up Cambridge score mappings from DB:', err);
  }
  return fallbackScoreMap[level] || 2;
};

// @desc    Submit a new Cambridge certificate
// @route   POST /api/cambridge
// @access  Private (Student)
export const submitCambridgeCert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const rawYear = req.headers['x-academic-year'];
    const academicYear = rawYear ? Number(rawYear) : (req.body.academicYear ? Number(req.body.academicYear) : undefined);

    const { certificateName, provider, certificateNumber, issueDate, certificateLevel } = req.body;

    if (!certificateName || !provider || !issueDate || !certificateLevel || !academicYear) {
      res.status(400).json({ message: 'Missing required fields: certificateName, provider, issueDate, certificateLevel, academicYear.' });
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
      res.status(400).json({ message: 'Cambridge certificate proof file upload is required.' });
      return;
    }

    // Resolve score points dynamically from database mappings
    const calculatedScore = await lookupLevelScore(certificateLevel);

    const certification = await CambridgeCertification.create({
      studentId: student._id as any,
      certificateName,
      provider,
      certificateNumber,
      issueDate: new Date(issueDate),
      certificateLevel,
      studentSelectedLevel: certificateLevel,
      calculatedScore,
      academicYear: Number(academicYear),
      certificateFile,
      status: 'PENDING',
      remarks: '',
    });

    res.status(201).json({
      message: 'Cambridge Certification uploaded successfully. Status: PENDING.',
      certification,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get certificates for the logged-in student
// @route   GET /api/cambridge/student
// @access  Private (Student)
export const getStudentCambridgeCerts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const certifications = await CambridgeCertification.find({ studentId: student._id } as any).sort({ createdAt: -1 });
    const scores = await CommunicationScore.find({ studentId: student._id } as any);

    res.status(200).json({
      certifications,
      scores,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending Cambridge certifications requests
// @route   GET /api/cambridge/pending
// @access  Private (Faculty, HOD, Admin)
export const getPendingCambridgeCerts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const certifications = await CambridgeCertification.find({ status: 'PENDING' } as any)
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'name email' },
      })
      .sort({ createdAt: 1 });

    res.status(200).json({
      certifications,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve a Cambridge certificate
// @route   PUT /api/cambridge/:id/approve
// @access  Private (Faculty, HOD, Admin)
export const approveCambridgeCert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { certificateLevel, facultyApprovedScore, remarks } = req.body;

    const certification = await CambridgeCertification.findById(id).populate({
      path: 'studentId',
      populate: { path: 'userId' },
    });

    if (!certification) {
      res.status(404).json({ message: 'Cambridge certificate request not found.' });
      return;
    }

    // Set level (overridden or default)
    const finalLevel = certificateLevel || certification.studentSelectedLevel;
    certification.facultyApprovedLevel = finalLevel;
    certification.certificateLevel = finalLevel as any;

    // Set score (overridden explicitly or dynamic category lookup)
    if (facultyApprovedScore !== undefined && facultyApprovedScore !== null) {
      certification.facultyApprovedScore = Number(facultyApprovedScore);
    } else {
      certification.facultyApprovedScore = await lookupLevelScore(finalLevel);
    }

    certification.status = 'APPROVED';
    certification.remarks = remarks || '';
    certification.approvedBy = req.user.id as any;
    certification.approvedAt = new Date();

    await certification.save();

    const studentIdStr = (certification.studentId as any)._id
      ? (certification.studentId as any)._id.toString()
      : certification.studentId.toString();

    // Recalculate communication scores
    await calculateAndStoreCommunicationScore(
      studentIdStr,
      certification.academicYear
    );

    // Send notification
    const studentUser = (certification.studentId as any).userId;
    if (studentUser) {
      await Notification.create({
        userId: studentUser._id,
        title: 'Cambridge Certificate Approved',
        message: `Your Cambridge certification level "${certification.facultyApprovedLevel}" has been approved.`,
        type: 'VERIFICATION_UPDATE',
      });
    }

    res.status(200).json({
      message: 'Cambridge Certificate approved and score recalculated.',
      certification,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject a Cambridge certificate
// @route   PUT /api/cambridge/:id/reject
// @access  Private (Faculty, HOD, Admin)
export const rejectCambridgeCert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { remarks } = req.body;

    if (!remarks || !remarks.trim()) {
      res.status(400).json({ message: 'Remarks/feedback is mandatory for rejection.' });
      return;
    }

    const certification = await CambridgeCertification.findById(id).populate({
      path: 'studentId',
      populate: { path: 'userId' },
    });

    if (!certification) {
      res.status(404).json({ message: 'Cambridge certificate request not found.' });
      return;
    }

    certification.status = 'REJECTED';
    certification.remarks = remarks;
    certification.approvedBy = req.user.id as any;
    certification.approvedAt = new Date();

    await certification.save();

    const studentIdStr = (certification.studentId as any)._id
      ? (certification.studentId as any)._id.toString()
      : certification.studentId.toString();

    // Recalculate communication scores
    await calculateAndStoreCommunicationScore(
      studentIdStr,
      certification.academicYear
    );

    // Send notification
    const studentUser = (certification.studentId as any).userId;
    if (studentUser) {
      await Notification.create({
        userId: studentUser._id,
        title: 'Cambridge Certificate Rejected',
        message: `Your Cambridge certificate upload has been rejected. Reason: ${remarks}`,
        type: 'VERIFICATION_UPDATE',
      });
    }

    res.status(200).json({
      message: 'Cambridge certificate rejected and score recalculated.',
      certification,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a Cambridge certificate
// @route   PUT /api/cambridge/:id
// @access  Private (Student)
export const updateCambridgeCert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { certificateName, provider, certificateNumber, issueDate, certificateLevel, academicYear } = req.body;

    const certification = await CambridgeCertification.findById(id);
    if (!certification) {
      res.status(404).json({ message: 'Cambridge certification record not found.' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student || student._id.toString() !== certification.studentId.toString()) {
      res.status(403).json({ message: 'Not authorized to edit this record.' });
      return;
    }

    const previousAcademicYear = certification.academicYear;

    if (academicYear && Number(academicYear) !== previousAcademicYear) {
      res.status(400).json({ message: 'Academic Year is immutable and cannot be changed.' });
      return;
    }

    certification.certificateName = certificateName || certification.certificateName;
    certification.provider = provider || certification.provider;
    certification.certificateNumber = certificateNumber !== undefined ? certificateNumber : certification.certificateNumber;
    if (issueDate) {
      certification.issueDate = new Date(issueDate);
    }
    if (certificateLevel) {
      certification.certificateLevel = certificateLevel;
      certification.studentSelectedLevel = certificateLevel;
      certification.calculatedScore = await lookupLevelScore(certificateLevel);
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
    await calculateAndStoreCommunicationScore(student._id.toString(), previousAcademicYear);
    if (certification.academicYear !== previousAcademicYear) {
      await calculateAndStoreCommunicationScore(student._id.toString(), certification.academicYear);
    }

    res.status(200).json({
      message: 'Cambridge certification updated. Status reverted to PENDING for review.',
      certification,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a Cambridge certificate
// @route   DELETE /api/cambridge/:id
// @access  Private (Student)
export const deleteCambridgeCert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const certification = await CambridgeCertification.findById(id);
    if (!certification) {
      res.status(404).json({ message: 'Cambridge certification not found.' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student || student._id.toString() !== certification.studentId.toString()) {
      res.status(403).json({ message: 'Not authorized to delete this certification.' });
      return;
    }

    const academicYear = certification.academicYear;

    await CambridgeCertification.findByIdAndDelete(id);

    // Immediately recalculate
    await calculateAndStoreCommunicationScore(student._id.toString(), academicYear);

    res.status(200).json({
      message: 'Cambridge certification deleted and score recalculated.',
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Communication skills scores summary
// @route   GET /api/cambridge/score-summary
// @access  Private (Student, Faculty, HOD, Admin)
export const getCommunicationScoreSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const scores = await CommunicationScore.find({ studentId } as any);

    res.status(200).json({
      scores,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all Cambridge certification level score mappings
// @route   GET /api/cambridge/score-mappings
// @access  Private (Student, Faculty, HOD, Admin)
export const getScoreMappings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const mappings = await CambridgeScoreMap.find({});
    res.status(200).json({ mappings });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
