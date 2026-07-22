import { Router } from 'express';
import {
  submitCambridgeCert,
  getStudentCambridgeCerts,
  getPendingCambridgeCerts,
  approveCambridgeCert,
  rejectCambridgeCert,
  updateCambridgeCert,
  deleteCambridgeCert,
  getCommunicationScoreSummary,
  getScoreMappings,
} from '../controllers/cambridgeController';
import { protect, restrictTo } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Student-specific operations
router.post(
  '/',
  protect,
  restrictTo('STUDENT'),
  upload.single('proofFile'),
  submitCambridgeCert
);

router.get(
  '/student',
  protect,
  restrictTo('STUDENT'),
  getStudentCambridgeCerts
);

router.put(
  '/:id',
  protect,
  restrictTo('STUDENT'),
  upload.single('proofFile'),
  updateCambridgeCert
);

router.delete(
  '/:id',
  protect,
  restrictTo('STUDENT'),
  deleteCambridgeCert
);

// Shared score summary endpoint
router.get(
  '/score-summary',
  protect,
  getCommunicationScoreSummary
);

router.get(
  '/score-mappings',
  protect,
  getScoreMappings
);

// Faculty/Staff-specific operations
router.get(
  '/pending',
  protect,
  restrictTo('FACULTY', 'HOD', 'ADMIN'),
  getPendingCambridgeCerts
);

router.put(
  '/:id/approve',
  protect,
  restrictTo('FACULTY', 'ADMIN'),
  approveCambridgeCert
);

router.put(
  '/:id/reject',
  protect,
  restrictTo('FACULTY', 'ADMIN'),
  rejectCambridgeCert
);

export default router;
