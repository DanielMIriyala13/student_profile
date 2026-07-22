import { Router } from 'express';
import {
  submitActivityCert,
  getStudentActivityCerts,
  getPendingActivityCerts,
  approveActivityCert,
  rejectActivityCert,
  updateActivityCert,
  deleteActivityCert,
  getActivityScoreMappings,
  getActivityScoreSummary,
} from '../controllers/activityController';
import { protect, restrictTo } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Student-specific operations
router.post(
  '/',
  protect,
  restrictTo('STUDENT'),
  upload.single('proofFile'),
  submitActivityCert
);

router.get(
  '/student',
  protect,
  restrictTo('STUDENT'),
  getStudentActivityCerts
);

router.put(
  '/:id',
  protect,
  restrictTo('STUDENT'),
  upload.single('proofFile'),
  updateActivityCert
);

router.delete(
  '/:id',
  protect,
  restrictTo('STUDENT'),
  deleteActivityCert
);

// Shared metadata endpoints
router.get(
  '/score-summary',
  protect,
  getActivityScoreSummary
);

router.get(
  '/score-mappings',
  protect,
  getActivityScoreMappings
);

// Faculty/Staff-specific operations
router.get(
  '/pending',
  protect,
  restrictTo('FACULTY', 'HOD', 'ADMIN'),
  getPendingActivityCerts
);

router.put(
  '/:id/approve',
  protect,
  restrictTo('FACULTY', 'ADMIN'),
  approveActivityCert
);

router.put(
  '/:id/reject',
  protect,
  restrictTo('FACULTY', 'ADMIN'),
  rejectActivityCert
);

export default router;
