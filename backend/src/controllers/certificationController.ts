import { Response } from 'express';
import Certification from '../models/Certification';
import Student from '../models/Student';
import Notification from '../models/Notification';
import CertificationScore from '../models/CertificationScore';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateAndStoreCertificationScore } from '../services/certificationScoringService';
import { getUploadUrl } from '../utils/uploadUrl';

const categoryScoreMap: Record<string, number> = {
  'Normal Certificate': 2,
  'NPTEL Elite': 3,
  'NPTEL Silver': 5,
  'NPTEL Gold': 5,
  'NPTEL Topper': 5,
  'Global Certification': 10,
};

// @desc    Create a new certification
// @route   POST /api/certifications
// @access  Private (Student)
export const submitCertification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const rawYear = req.headers['x-academic-year'];
    const academicYear = rawYear ? Number(rawYear) : (req.body.academicYear ? Number(req.body.academicYear) : undefined);

    const { certificateName, provider, certificateCategory, completionDate } = req.body;

    if (!certificateName || !provider || !certificateCategory || !academicYear) {
      res.status(400).json({ message: 'Missing required fields: certificateName, provider, certificateCategory, academicYear.' });
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
      res.status(400).json({ message: 'Certification certificate proof file upload is required.' });
      return;
    }

    const initialScore = categoryScoreMap[certificateCategory] || 2;

    const certification = await Certification.create({
      studentId: student._id as any,
      certificateName,
      provider,
      certificateCategory,
      studentSelectedCategory: certificateCategory,
      calculatedScore: initialScore,
      academicYear: Number(academicYear),
      completionDate: completionDate ? new Date(completionDate) : undefined,
      certificateFile,
      status: 'PENDING',
      remarks: '',
    });

    res.status(201).json({
      message: 'Certification submitted successfully. Status: PENDING.',
      certification,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get certifications for the logged-in student
// @route   GET /api/certifications/student
// @access  Private (Student)
export const getStudentCertifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const certifications = await Certification.find({ studentId: student._id } as any).sort({ createdAt: -1 });
    const scores = await CertificationScore.find({ studentId: student._id } as any);

    res.status(200).json({
      certifications,
      scores,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending certification requests
// @route   GET /api/certifications/pending
// @access  Private (Faculty, HOD, Admin)
export const getPendingCertifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const certifications = await Certification.find({ status: 'PENDING' } as any)
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

// @desc    Approve a certification
// @route   PUT /api/certifications/:id/approve
// @access  Private (Faculty, HOD, Admin)
export const approveCertification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { certificateCategory, facultyApprovedScore } = req.body;

    const certification = await Certification.findById(id).populate({
      path: 'studentId',
      populate: { path: 'userId' },
    });

    if (!certification) {
      res.status(404).json({ message: 'Certification request not found.' });
      return;
    }

    // Set approved category (either overridden by faculty, or fallback to student's category)
    const finalCategory = certificateCategory || certification.studentSelectedCategory;
    certification.facultyApprovedCategory = finalCategory;
    certification.certificateCategory = finalCategory as any;

    // Set approved score (either overridden explicitly by faculty, or fallback to category score mapping)
    if (facultyApprovedScore !== undefined && facultyApprovedScore !== null) {
      certification.facultyApprovedScore = Number(facultyApprovedScore);
    } else {
      certification.facultyApprovedScore = categoryScoreMap[finalCategory] || 2;
    }

    certification.status = 'APPROVED';
    certification.remarks = req.body.remarks || '';
    certification.approvedBy = req.user.id as any;
    certification.approvedAt = new Date();

    await certification.save();

    const studentIdStr = (certification.studentId as any)._id
      ? (certification.studentId as any)._id.toString()
      : certification.studentId.toString();

    // Recalculate score for student for this academic year
    await calculateAndStoreCertificationScore(
      studentIdStr,
      certification.academicYear
    );

    // Send notification to student
    const studentUser = (certification.studentId as any).userId;
    if (studentUser) {
      await Notification.create({
        userId: studentUser._id,
        title: 'Certification Approved',
        message: `Your certification "${certification.certificateName}" has been approved as ${certification.facultyApprovedCategory} (Score: ${certification.facultyApprovedScore}).`,
        type: 'VERIFICATION_UPDATE',
      });
    }

    res.status(200).json({
      message: 'Certification approved and scoring recalculated.',
      certification,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject a certification
// @route   PUT /api/certifications/:id/reject
// @access  Private (Faculty, HOD, Admin)
export const rejectCertification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const certification = await Certification.findById(id).populate({
      path: 'studentId',
      populate: { path: 'userId' },
    });

    if (!certification) {
      res.status(404).json({ message: 'Certification request not found.' });
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

    // Recalculate score (it ignores rejected certifications)
    await calculateAndStoreCertificationScore(
      studentIdStr,
      certification.academicYear
    );

    // Send notification to student
    const studentUser = (certification.studentId as any).userId;
    if (studentUser) {
      await Notification.create({
        userId: studentUser._id,
        title: 'Certification Rejected',
        message: `Your certification "${certification.certificateName}" has been rejected. Feedback: ${remarks}`,
        type: 'VERIFICATION_UPDATE',
      });
    }

    res.status(200).json({
      message: 'Certification rejected and scoring recalculated.',
      certification,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update/Edit a certification
// @route   PUT /api/certifications/:id
// @access  Private (Student)
export const updateCertification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { certificateName, provider, certificateCategory, academicYear, completionDate } = req.body;

    const certification = await Certification.findById(id);
    if (!certification) {
      res.status(404).json({ message: 'Certification not found.' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student || student._id.toString() !== certification.studentId.toString()) {
      res.status(403).json({ message: 'Not authorized to edit this certification.' });
      return;
    }

    const previousAcademicYear = certification.academicYear;

    if (academicYear && Number(academicYear) !== previousAcademicYear) {
      res.status(400).json({ message: 'Academic Year is immutable and cannot be changed.' });
      return;
    }

    certification.certificateName = certificateName || certification.certificateName;
    certification.provider = provider || certification.provider;
    if (certificateCategory) {
      certification.certificateCategory = certificateCategory;
      certification.studentSelectedCategory = certificateCategory;
      certification.calculatedScore = categoryScoreMap[certificateCategory] || 2;
    }
    if (completionDate) {
      certification.completionDate = new Date(completionDate);
    }

    if (req.file) {
      certification.certificateFile = getUploadUrl(req.file.filename);
    }

    // Reset status to PENDING
    certification.status = 'PENDING';
    certification.remarks = '';
    certification.facultyApprovedCategory = undefined;
    certification.facultyApprovedScore = undefined;
    certification.approvedBy = undefined;
    certification.approvedAt = undefined;

    await certification.save();

    // Recalculate scores for the previous and current academic year
    await calculateAndStoreCertificationScore(student._id.toString(), previousAcademicYear);
    if (certification.academicYear !== previousAcademicYear) {
      await calculateAndStoreCertificationScore(student._id.toString(), certification.academicYear);
    }

    res.status(200).json({
      message: 'Certification updated. Status reverted to PENDING for faculty review.',
      certification,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a certification
// @route   DELETE /api/certifications/:id
// @access  Private (Student)
export const deleteCertification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const certification = await Certification.findById(id);
    if (!certification) {
      res.status(404).json({ message: 'Certification not found.' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student || student._id.toString() !== certification.studentId.toString()) {
      res.status(403).json({ message: 'Not authorized to delete this certification.' });
      return;
    }

    const academicYear = certification.academicYear;

    await Certification.findByIdAndDelete(id);

    // Immediately recalculate score
    await calculateAndStoreCertificationScore(student._id.toString(), academicYear);

    res.status(200).json({
      message: 'Certification deleted successfully and scoring recalculated.',
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get certification score summary for a student
// @route   GET /api/certifications/score-summary
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

    const scores = await CertificationScore.find({ studentId } as any);

    res.status(200).json({
      scores,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
