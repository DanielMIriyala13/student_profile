import { Router } from 'express';
import {
  getStudentRecord,
  uploadAttendanceBulk,
  uploadMarksBulk,
} from '../controllers/academicController';
import { protect, restrictTo } from '../middleware/auth';

const router = Router();

router.get('/student-records', protect, restrictTo('STUDENT'), getStudentRecord);
router.post('/upload-attendance', protect, restrictTo('FACULTY', 'HOD', 'ADMIN'), uploadAttendanceBulk);
router.post('/upload-marks', protect, restrictTo('FACULTY', 'HOD', 'ADMIN'), uploadMarksBulk);

export default router;
