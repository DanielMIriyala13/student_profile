import { Response } from 'express';
import PhysicalFitnessActivity from '../models/PhysicalFitnessActivity';
import PhysicalFitnessScore from '../models/PhysicalFitnessScore';
import Student from '../models/Student';
import Notification from '../models/Notification';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateAndStorePhysicalFitnessScore } from '../services/physicalFitnessScoringService';
import { getUploadUrl } from '../utils/uploadUrl';

// @desc    Submit a new Physical Fitness / Sports activity
// @route   POST /api/physical-fitness
// @access  Private (Student)
export const submitPhysicalFitnessActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const rawYear = req.headers['x-academic-year'];
    const academicYear = rawYear ? Number(rawYear) : (req.body.academicYear ? Number(req.body.academicYear) : undefined);

    const { activityName, eventName, organizer, eventDate, certificateNumber, description } = req.body;

    if (!activityName || !eventName || !organizer || !eventDate || !academicYear) {
      res.status(400).json({ message: 'Missing required fields: activityName, eventName, organizer, eventDate, academicYear.' });
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

    const activity = await PhysicalFitnessActivity.create({
      studentId: student._id as any,
      activityName,
      eventName,
      organizer,
      eventDate: new Date(eventDate),
      certificateNumber,
      description,
      academicYear: Number(academicYear),
      certificateFile,
      status: 'PENDING',
      remarks: '',
    });

    res.status(201).json({
      message: 'Physical Fitness / Sports activity submitted successfully. Status: PENDING.',
      activity,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get sports/fitness activities for the logged-in student
// @route   GET /api/physical-fitness/student
// @access  Private (Student)
export const getStudentPhysicalFitnessActivities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const activities = await PhysicalFitnessActivity.find({ studentId: student._id } as any).sort({ createdAt: -1 });
    const scores = await PhysicalFitnessScore.find({ studentId: student._id } as any);

    res.status(200).json({ activities, scores });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Physical Fitness / Sports activity
// @route   PUT /api/physical-fitness/:id
// @access  Private (Student)
export const updatePhysicalFitnessActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { activityName, eventName, organizer, eventDate, certificateNumber, description, academicYear } = req.body;

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student) {
      res.status(404).json({ message: 'Student profile not found.' });
      return;
    }

    const activity = await PhysicalFitnessActivity.findOne({ _id: id, studentId: student._id } as any);
    if (!activity) {
      res.status(404).json({ message: 'Physical Fitness record not found or unauthorized.' });
      return;
    }

    const previousStatus = activity.status;
    const previousYear = activity.academicYear;

    if (academicYear && Number(academicYear) !== previousYear) {
      res.status(400).json({ message: 'Academic Year is immutable and cannot be changed.' });
      return;
    }

    activity.activityName = activityName || activity.activityName;
    activity.eventName = eventName || activity.eventName;
    activity.organizer = organizer || activity.organizer;
    activity.eventDate = eventDate ? new Date(eventDate) : activity.eventDate;
    activity.certificateNumber = certificateNumber !== undefined ? certificateNumber : activity.certificateNumber;
    activity.description = description !== undefined ? description : activity.description;

    if (req.file) {
      activity.certificateFile = getUploadUrl(req.file.filename);
    }

    // Reset status to PENDING on update
    activity.status = 'PENDING';
    activity.remarks = '';
    activity.approvedBy = undefined;
    activity.approvedAt = undefined;

    await activity.save();

    // If it was previously APPROVED, we need to recalculate score
    if (previousStatus === 'APPROVED') {
      await calculateAndStorePhysicalFitnessScore(student._id.toString(), previousYear);
      if (previousYear !== activity.academicYear) {
        await calculateAndStorePhysicalFitnessScore(student._id.toString(), activity.academicYear);
      }
    }

    res.status(200).json({
      message: 'Physical Fitness record updated successfully. Status reset to PENDING.',
      activity,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete Physical Fitness / Sports activity
// @route   DELETE /api/physical-fitness/:id
// @access  Private (Student)
export const deletePhysicalFitnessActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student) {
      res.status(404).json({ message: 'Student profile not found.' });
      return;
    }

    const activity = await PhysicalFitnessActivity.findOne({ _id: id, studentId: student._id } as any);
    if (!activity) {
      res.status(404).json({ message: 'Physical Fitness record not found or unauthorized.' });
      return;
    }

    const previousStatus = activity.status;
    const academicYear = activity.academicYear;

    await PhysicalFitnessActivity.deleteOne({ _id: id } as any);

    // If it was APPROVED, recalculate the score
    if (previousStatus === 'APPROVED') {
      await calculateAndStorePhysicalFitnessScore(student._id.toString(), academicYear);
    }

    res.status(200).json({ message: 'Physical Fitness record deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending activities (Faculty view)
// @route   GET /api/physical-fitness/pending
// @access  Private (Faculty/HOD/Admin)
export const getPendingPhysicalFitnessActivities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const activities = await PhysicalFitnessActivity.find({ status: 'PENDING' } as any)
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'name email' },
      })
      .sort({ createdAt: 1 });

    res.status(200).json({ activities });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve a physical fitness activity
// @route   PUT /api/physical-fitness/:id/approve
// @access  Private (Faculty/HOD/Admin)
export const approvePhysicalFitnessActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { remarks } = req.body;

    const activity = await PhysicalFitnessActivity.findById(id);
    if (!activity) {
      res.status(404).json({ message: 'Physical Fitness record not found.' });
      return;
    }

    activity.status = 'APPROVED';
    activity.remarks = remarks || '';
    activity.approvedBy = req.user.id as any;
    activity.approvedAt = new Date();

    await activity.save();

    // Recalculate score
    await calculateAndStorePhysicalFitnessScore(activity.studentId.toString(), activity.academicYear);

    // Create Notification for Student
    const studentInfo = await Student.findById(activity.studentId);
    if (studentInfo) {
      await Notification.create({
        userId: studentInfo.userId,
        title: 'Sports Certificate Approved',
        message: `Your Physical Fitness / Sports record "${activity.activityName}" has been approved.`,
        type: 'VERIFICATION_UPDATE',
        isRead: false,
      });
    }

    res.status(200).json({
      message: 'Physical Fitness record approved successfully.',
      activity,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject a physical fitness activity
// @route   PUT /api/physical-fitness/:id/reject
// @access  Private (Faculty/HOD/Admin)
export const rejectPhysicalFitnessActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { remarks } = req.body;

    if (!remarks || !remarks.trim()) {
      res.status(400).json({ message: 'Remarks are required for rejecting achievements.' });
      return;
    }

    const activity = await PhysicalFitnessActivity.findById(id);
    if (!activity) {
      res.status(404).json({ message: 'Physical Fitness record not found.' });
      return;
    }

    const previousStatus = activity.status;

    activity.status = 'REJECTED';
    activity.remarks = remarks;
    activity.approvedBy = req.user.id as any;
    activity.approvedAt = new Date();

    await activity.save();

    // Recalculate score if it was previously approved
    if (previousStatus === 'APPROVED') {
      await calculateAndStorePhysicalFitnessScore(activity.studentId.toString(), activity.academicYear);
    }

    // Create Notification for Student
    const studentInfo = await Student.findById(activity.studentId);
    if (studentInfo) {
      await Notification.create({
        userId: studentInfo.userId,
        title: 'Sports Certificate Rejected',
        message: `Your Physical Fitness / Sports record "${activity.activityName}" has been rejected. Reason: ${remarks}`,
        type: 'VERIFICATION_UPDATE',
        isRead: false,
      });
    }

    res.status(200).json({
      message: 'Physical Fitness record rejected successfully.',
      activity,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
