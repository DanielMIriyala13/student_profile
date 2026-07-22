import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import Student from '../models/Student';
import { calculateOverallScore } from '../services/scoringEngine';

// @desc    Get current student's own year-wise and overall score
// @route   GET /api/scoring/my-score
// @access  Private (Student)
export const getMyScore = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      res.status(404).json({ message: 'Student profile not found.' });
      return;
    }

    const scoreData = await calculateOverallScore(student._id.toString());
    res.status(200).json({
      studentId: student._id,
      rollNumber: student.rollNumber,
      name: req.user.name,
      ...scoreData
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get any student's score by student ID
// @route   GET /api/scoring/student/:studentId
// @access  Private (Admin, HOD, Faculty, Placement Officer)
export const getStudentScore = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId).populate('userId', 'name rollNumber');
    if (!student) {
      res.status(404).json({ message: 'Student not found.' });
      return;
    }

    const scoreData = await calculateOverallScore(String(studentId));
    res.status(200).json({
      studentId: student._id,
      rollNumber: student.rollNumber,
      name: (student.userId as any)?.name || 'Student',
      ...scoreData
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
