import { Router } from 'express';
import {
  submitExtraCurricular,
  getStudentExtraCurriculars,
  getPendingExtraCurriculars,
  approveExtraCurricular,
  rejectExtraCurricular,
  updateExtraCurricular,
  deleteExtraCurricular,
  getExtraCurricularScoreSummary,
} from '../controllers/extraCurricularController';
import { protect, restrictTo } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.post(
  '/',
  protect,
  restrictTo('STUDENT'),
  upload.single('proofFile'),
  submitExtraCurricular
);

router.get(
  '/student',
  protect,
  restrictTo('STUDENT'),
  getStudentExtraCurriculars
);

router.put(
  '/:id',
  protect,
  restrictTo('STUDENT'),
  upload.single('proofFile'),
  updateExtraCurricular
);

router.delete(
  '/:id',
  protect,
  restrictTo('STUDENT'),
  deleteExtraCurricular
);

router.get(
  '/score-summary',
  protect,
  getExtraCurricularScoreSummary
);

router.get(
  '/pending',
  protect,
  restrictTo('FACULTY', 'HOD', 'ADMIN'),
  getPendingExtraCurriculars
);

router.put(
  '/:id/approve',
  protect,
  restrictTo('FACULTY', 'ADMIN'),
  approveExtraCurricular
);

router.put(
  '/:id/reject',
  protect,
  restrictTo('FACULTY', 'ADMIN'),
  rejectExtraCurricular
);

export default router;
