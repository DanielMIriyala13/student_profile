import { Router } from 'express';
import { getMyScore, getStudentScore } from '../controllers/scoringController';
import { protect, restrictTo } from '../middleware/auth';

const router = Router();

// Student routes
router.get('/my-score', protect, restrictTo('STUDENT'), getMyScore);

// Staff/Admin routes
router.get(
  '/student/:studentId',
  protect,
  restrictTo('FACULTY', 'HOD', 'PLACEMENT_OFFICER', 'ADMIN'),
  getStudentScore
);

export default router;
