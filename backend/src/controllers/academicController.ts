import { Response } from 'express';
import Academic from '../models/Academic';
import Attendance from '../models/Attendance';
import Student from '../models/Student';
import Notification from '../models/Notification';
import { AuthenticatedRequest } from '../middleware/auth';

// @desc    Get logged in student academic records and attendance
// @route   GET /api/academics/student-records
// @access  Private (Student)
export const getStudentRecord = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const attendance = await Attendance.find({ studentId: student._id });
    const academics = await Academic.find({ studentId: student._id }).sort({ semester: 1 });

    res.status(200).json({
      attendance,
      academics,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Faculty uploads attendance records in bulk
// @route   POST /api/academics/upload-attendance
// @access  Private (Faculty, HOD, Admin)
export const uploadAttendanceBulk = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { attendanceRecords } = req.body; // Array of { rollNumber, semester, subjectCode, subjectName, attended, total }

    if (!attendanceRecords || !Array.isArray(attendanceRecords)) {
      res.status(400).json({ message: 'Invalid payload. attendanceRecords array is required.' });
      return;
    }

    const results = [];
    for (const record of attendanceRecords) {
      const student = await Student.findOne({ rollNumber: record.rollNumber.toUpperCase() });
      if (!student) continue;

      // Upsert attendance
      const attendance = await Attendance.findOneAndUpdate(
        {
          studentId: student._id,
          semester: record.semester,
          subjectCode: record.subjectCode.toUpperCase(),
        },
        {
          subjectName: record.subjectName,
          attended: record.attended,
          total: record.total,
        },
        { upsert: true, new: true }
      );

      // Trigger notification if attendance drops below 75%
      const percentage = (record.attended / record.total) * 100;
      if (percentage < 75) {
        await Notification.create({
          userId: student.userId,
          title: `Low Attendance Warning`,
          message: `Your attendance in "${record.subjectName}" is currently ${percentage.toFixed(1)}%, which is below the required 75%.`,
          type: 'DEADLINE',
        });
      }

      results.push(attendance);
    }

    res.status(200).json({
      message: `Processed ${results.length} attendance records successfully.`,
      count: results.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Faculty uploads internal/external marks and SGPA in bulk
// @route   POST /api/academics/upload-marks
// @access  Private (Faculty, HOD, Admin)
export const uploadMarksBulk = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { marksRecords } = req.body; // Array of { rollNumber, semester, sgpa, subjects: [{ code, name, internalMarks, externalMarks, totalMarks, grade }], activeBacklogs, clearedBacklogs }

    if (!marksRecords || !Array.isArray(marksRecords)) {
      res.status(400).json({ message: 'Invalid payload. marksRecords array is required.' });
      return;
    }

    const results = [];
    for (const record of marksRecords) {
      const student = await Student.findOne({ rollNumber: record.rollNumber.toUpperCase() });
      if (!student) continue;

      // Upsert academic record
      const academic = await Academic.findOneAndUpdate(
        {
          studentId: student._id,
          semester: record.semester,
        },
        {
          sgpa: record.sgpa,
          subjects: record.subjects,
          activeBacklogs: record.activeBacklogs || 0,
          clearedBacklogs: record.clearedBacklogs || 0,
        },
        { upsert: true, new: true }
      );

      await Notification.create({
        userId: student.userId,
        title: `Semester Results Published`,
        message: `Results for Semester ${record.semester} have been updated. SGPA: ${record.sgpa}.`,
        type: 'ANNOUNCEMENT',
      });

      results.push(academic);
    }

    res.status(200).json({
      message: `Processed ${results.length} student academic records successfully.`,
      count: results.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
