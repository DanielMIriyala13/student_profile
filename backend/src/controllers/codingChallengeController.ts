import { Response } from 'express';
import CodingChallenge from '../models/CodingChallenge';
import Student from '../models/Student';
import Notification from '../models/Notification';
import CodingChallengeScore from '../models/CodingChallengeScore';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateAndStoreCodingChallengeScore } from '../services/codingChallengeScoringService';
import { getUploadUrl } from '../utils/uploadUrl';

const categoryScoreMap: Record<string, number> = {
  'Hackathon Participation': 2,
  'Hackathon Merit': 4,
  'Coding Challenge Participation': 2,
  'Coding Challenge Merit': 3,
};

// @desc    Create a new coding challenge / hackathon record
// @route   POST /api/coding-challenges
// @access  Private (Student)
export const submitCodingChallenge = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const rawYear = req.headers['x-academic-year'];
    const academicYear = rawYear ? Number(rawYear) : (req.body.academicYear ? Number(req.body.academicYear) : undefined);

    const {
      eventName,
      eventType,
      organizer,
      eventDate,
      platform,
      achievementCategory,
      rank,
      teamName,
      teamMembers,
      description,
      certificateNumber,
    } = req.body;

    if (!eventName || !eventType || !organizer || !eventDate || !platform || !achievementCategory || !academicYear) {
      res.status(400).json({
        message: 'Missing required fields: eventName, eventType, organizer, eventDate, platform, achievementCategory, academicYear.',
      });
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
      res.status(400).json({ message: 'Certificate proof file is required.' });
      return;
    }

    const initialScore = categoryScoreMap[achievementCategory] || 2;

    const challenge = await CodingChallenge.create({
      studentId: student._id as any,
      eventName,
      eventType,
      organizer,
      eventDate: new Date(eventDate),
      platform,
      achievementCategory,
      studentSelectedCategory: achievementCategory,
      studentCalculatedScore: initialScore,
      rank,
      teamName,
      teamMembers,
      description,
      certificateNumber,
      certificateFile,
      academicYear: Number(academicYear),
      status: 'PENDING',
      remarks: '',
    });

    res.status(201).json({
      message: 'Coding Challenge / Hackathon submitted successfully. Status: PENDING.',
      challenge,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get coding challenges for the logged-in student
// @route   GET /api/coding-challenges/student
// @access  Private (Student)
export const getStudentCodingChallenges = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const challenges = await CodingChallenge.find({ studentId: student._id } as any).sort({ createdAt: -1 });
    const scores = await CodingChallengeScore.find({ studentId: student._id } as any);

    res.status(200).json({
      challenges,
      scores,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending coding challenges for verification
// @route   GET /api/coding-challenges/pending
// @access  Private (Faculty, HOD, Admin)
export const getPendingCodingChallenges = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const challenges = await CodingChallenge.find({ status: 'PENDING' } as any)
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'name email' },
      })
      .sort({ createdAt: 1 });

    res.status(200).json({
      challenges,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve a coding challenge / hackathon record
// @route   PUT /api/coding-challenges/:id/approve
// @access  Private (Faculty, HOD, Admin)
export const approveCodingChallenge = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { achievementCategory, facultyApprovedScore } = req.body;

    const challenge = await CodingChallenge.findById(id).populate({
      path: 'studentId',
      populate: { path: 'userId' },
    });

    if (!challenge) {
      res.status(404).json({ message: 'Coding challenge request not found.' });
      return;
    }

    // Set approved category (either overridden by faculty, or fallback to student's category)
    const finalCategory = achievementCategory || challenge.studentSelectedCategory;
    challenge.facultyApprovedCategory = finalCategory;
    challenge.achievementCategory = finalCategory as any;

    // Set approved score (either overridden explicitly by faculty, or fallback to category score mapping)
    if (facultyApprovedScore !== undefined && facultyApprovedScore !== null) {
      challenge.facultyApprovedScore = Number(facultyApprovedScore);
    } else {
      challenge.facultyApprovedScore = categoryScoreMap[finalCategory] || 2;
    }

    challenge.status = 'APPROVED';
    challenge.remarks = req.body.remarks || '';
    challenge.approvedBy = req.user.id as any;
    challenge.approvedAt = new Date();

    await challenge.save();

    const studentIdStr = (challenge.studentId as any)._id
      ? (challenge.studentId as any)._id.toString()
      : challenge.studentId.toString();

    // Recalculate score for student for this academic year
    await calculateAndStoreCodingChallengeScore(
      studentIdStr,
      challenge.academicYear
    );

    // Send notification to student
    const studentUser = (challenge.studentId as any).userId;
    if (studentUser) {
      await Notification.create({
        userId: studentUser._id,
        title: 'Coding Challenge Approved',
        message: `Your coding challenge/hackathon achievement "${challenge.eventName}" has been approved as ${challenge.facultyApprovedCategory} (Score: ${challenge.facultyApprovedScore}).`,
        type: 'VERIFICATION_UPDATE',
      });
    }

    res.status(200).json({
      message: 'Coding challenge approved and scoring recalculated.',
      challenge,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject a coding challenge / hackathon record
// @route   PUT /api/coding-challenges/:id/reject
// @access  Private (Faculty, HOD, Admin)
export const rejectCodingChallenge = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const challenge = await CodingChallenge.findById(id).populate({
      path: 'studentId',
      populate: { path: 'userId' },
    });

    if (!challenge) {
      res.status(404).json({ message: 'Coding challenge request not found.' });
      return;
    }

    challenge.status = 'REJECTED';
    challenge.remarks = remarks;
    challenge.approvedBy = req.user.id as any;
    challenge.approvedAt = new Date();

    await challenge.save();

    const studentIdStr = (challenge.studentId as any)._id
      ? (challenge.studentId as any)._id.toString()
      : challenge.studentId.toString();

    // Recalculate score (it ignores rejected coding challenges)
    await calculateAndStoreCodingChallengeScore(
      studentIdStr,
      challenge.academicYear
    );

    // Send notification to student
    const studentUser = (challenge.studentId as any).userId;
    if (studentUser) {
      await Notification.create({
        userId: studentUser._id,
        title: 'Coding Challenge Rejected',
        message: `Your coding challenge/hackathon achievement "${challenge.eventName}" has been rejected. Feedback: ${remarks}`,
        type: 'VERIFICATION_UPDATE',
      });
    }

    res.status(200).json({
      message: 'Coding challenge rejected and scoring recalculated.',
      challenge,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update/Edit a coding challenge / hackathon record
// @route   PUT /api/coding-challenges/:id
// @access  Private (Student)
export const updateCodingChallenge = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const {
      eventName,
      eventType,
      organizer,
      eventDate,
      platform,
      achievementCategory,
      rank,
      teamName,
      teamMembers,
      description,
      certificateNumber,
      academicYear,
    } = req.body;

    const challenge = await CodingChallenge.findById(id);
    if (!challenge) {
      res.status(404).json({ message: 'Coding challenge not found.' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student || student._id.toString() !== challenge.studentId.toString()) {
      res.status(403).json({ message: 'Not authorized to edit this record.' });
      return;
    }

    const previousAcademicYear = challenge.academicYear;

    if (academicYear && Number(academicYear) !== previousAcademicYear) {
      res.status(400).json({ message: 'Academic Year is immutable and cannot be changed.' });
      return;
    }

    challenge.eventName = eventName || challenge.eventName;
    challenge.eventType = eventType || challenge.eventType;
    challenge.organizer = organizer || challenge.organizer;
    if (eventDate) challenge.eventDate = new Date(eventDate);
    challenge.platform = platform || challenge.platform;

    if (achievementCategory) {
      challenge.achievementCategory = achievementCategory;
      challenge.studentSelectedCategory = achievementCategory;
      challenge.studentCalculatedScore = categoryScoreMap[achievementCategory] || 2;
    }

    challenge.rank = rank !== undefined ? rank : challenge.rank;
    challenge.teamName = teamName !== undefined ? teamName : challenge.teamName;
    challenge.teamMembers = teamMembers !== undefined ? teamMembers : challenge.teamMembers;
    challenge.description = description !== undefined ? description : challenge.description;
    challenge.certificateNumber = certificateNumber !== undefined ? certificateNumber : challenge.certificateNumber;

    if (req.file) {
      challenge.certificateFile = getUploadUrl(req.file.filename);
    }

    // Reset status to PENDING
    challenge.status = 'PENDING';
    challenge.remarks = '';
    challenge.facultyApprovedCategory = undefined;
    challenge.facultyApprovedScore = undefined;
    challenge.approvedBy = undefined;
    challenge.approvedAt = undefined;

    await challenge.save();

    // Recalculate scores for the previous and current academic year
    await calculateAndStoreCodingChallengeScore(student._id.toString(), previousAcademicYear);
    if (challenge.academicYear !== previousAcademicYear) {
      await calculateAndStoreCodingChallengeScore(student._id.toString(), challenge.academicYear);
    }

    res.status(200).json({
      message: 'Coding challenge updated. Status reverted to PENDING for faculty review.',
      challenge,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a coding challenge / hackathon record
// @route   DELETE /api/coding-challenges/:id
// @access  Private (Student)
export const deleteCodingChallenge = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const challenge = await CodingChallenge.findById(id);
    if (!challenge) {
      res.status(404).json({ message: 'Coding challenge not found.' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student || student._id.toString() !== challenge.studentId.toString()) {
      res.status(403).json({ message: 'Not authorized to delete this record.' });
      return;
    }

    const academicYear = challenge.academicYear;

    await CodingChallenge.findByIdAndDelete(id);

    // Immediately recalculate score
    await calculateAndStoreCodingChallengeScore(student._id.toString(), academicYear);

    res.status(200).json({
      message: 'Coding challenge deleted successfully and scoring recalculated.',
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get coding challenge score summary for a student
// @route   GET /api/coding-challenges/score-summary
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

    const scores = await CodingChallengeScore.find({ studentId } as any);

    res.status(200).json({
      scores,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
