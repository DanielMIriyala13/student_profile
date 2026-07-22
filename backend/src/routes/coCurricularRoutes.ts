import { Router } from 'express';
import {
  submitCoCurricular,
  getStudentCoCurriculars,
  getPendingCoCurriculars,
  approveCoCurricular,
  rejectCoCurricular,
  updateCoCurricular,
  deleteCoCurricular,
  getCoCurricularScoreSummary,
} from '../controllers/coCurricularController';
import { protect, restrictTo } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.post(
  '/',
  protect,
  restrictTo('STUDENT'),
  upload.single('proofFile'),
  submitCoCurricular
);

router.get(
  '/student',
  protect,
  restrictTo('STUDENT'),
  getStudentCoCurriculars
);

router.put(
  '/:id',
  protect,
  restrictTo('STUDENT'),
  upload.single('proofFile'),
  updateCoCurricular
);

router.delete(
  '/:id',
  protect,
  restrictTo('STUDENT'),
  deleteCoCurricular
);

router.get(
  '/score-summary',
  protect,
  getCoCurricularScoreSummary
);

router.get(
  '/pending',
  protect,
  restrictTo('FACULTY', 'HOD', 'ADMIN'),
  getPendingCoCurriculars
);

router.put(
  '/:id/approve',
  protect,
  restrictTo('FACULTY', 'ADMIN'),
  approveCoCurricular
);

router.put(
  '/:id/reject',
  protect,
  restrictTo('FACULTY', 'ADMIN'),
  rejectCoCurricular
);

export default router;
