import { Router } from 'express';
import {
  submitCertification,
  getStudentCertifications,
  getPendingCertifications,
  approveCertification,
  rejectCertification,
  updateCertification,
  deleteCertification,
  getScoreSummary,
} from '../controllers/certificationController';
import { protect, restrictTo } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Student-specific operations
router.post(
  '/',
  protect,
  restrictTo('STUDENT'),
  upload.single('proofFile'),
  submitCertification
);

router.get(
  '/student',
  protect,
  restrictTo('STUDENT'),
  getStudentCertifications
);

router.put(
  '/:id',
  protect,
  restrictTo('STUDENT'),
  upload.single('proofFile'),
  updateCertification
);

router.delete(
  '/:id',
  protect,
  restrictTo('STUDENT'),
  deleteCertification
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
  getPendingCertifications
);

router.put(
  '/:id/approve',
  protect,
  restrictTo('FACULTY', 'ADMIN'),
  approveCertification
);

router.put(
  '/:id/reject',
  protect,
  restrictTo('FACULTY', 'ADMIN'),
  rejectCertification
);

export default router;
