import { Router } from 'express';
import {
  submitLeadershipActivity,
  getStudentLeadershipActivities,
  getPendingLeadershipActivities,
  approveLeadershipActivity,
  rejectLeadershipActivity,
  updateLeadershipActivity,
  deleteLeadershipActivity,
  getScoreSummary,
} from '../controllers/leadershipActivityController';
import { protect, restrictTo } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Student-specific operations
router.post(
  '/',
  protect,
  restrictTo('STUDENT'),
  upload.single('proofFile'),
  submitLeadershipActivity
);

router.get(
  '/student',
  protect,
  restrictTo('STUDENT'),
  getStudentLeadershipActivities
);

router.put(
  '/:id',
  protect,
  restrictTo('STUDENT'),
  upload.single('proofFile'),
  updateLeadershipActivity
);

router.delete(
  '/:id',
  protect,
  restrictTo('STUDENT'),
  deleteLeadershipActivity
);

// Shared score summary endpoint
router.get(
  '/score-summary',
  protect,
  getScoreSummary
);

// Faculty/Staff-specific operations
router.get(
  '/pending',
  protect,
  restrictTo('FACULTY', 'HOD', 'ADMIN'),
  getPendingLeadershipActivities
);

router.put(
  '/:id/approve',
  protect,
  restrictTo('FACULTY', 'ADMIN'),
  approveLeadershipActivity
);

router.put(
  '/:id/reject',
  protect,
  restrictTo('FACULTY', 'ADMIN'),
  rejectLeadershipActivity
);

export default router;
