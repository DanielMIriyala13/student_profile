import { Router } from 'express';
import {
  submitPhysicalFitnessActivity,
  getStudentPhysicalFitnessActivities,
  updatePhysicalFitnessActivity,
  deletePhysicalFitnessActivity,
  getPendingPhysicalFitnessActivities,
  approvePhysicalFitnessActivity,
  rejectPhysicalFitnessActivity,
} from '../controllers/physicalFitnessController';
import { protect, restrictTo } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.post(
  '/',
  protect,
  restrictTo('STUDENT'),
  upload.single('proofFile'),
  submitPhysicalFitnessActivity
);

router.get(
  '/student',
  protect,
  restrictTo('STUDENT'),
  getStudentPhysicalFitnessActivities
);

router.put(
  '/:id',
  protect,
  restrictTo('STUDENT'),
  upload.single('proofFile'),
  updatePhysicalFitnessActivity
);

router.delete(
  '/:id',
  protect,
  restrictTo('STUDENT'),
  deletePhysicalFitnessActivity
);

router.get(
  '/pending',
  protect,
  restrictTo('FACULTY', 'HOD', 'ADMIN'),
  getPendingPhysicalFitnessActivities
);

router.put(
  '/:id/approve',
  protect,
  restrictTo('FACULTY', 'ADMIN'),
  approvePhysicalFitnessActivity
);

router.put(
  '/:id/reject',
  protect,
  restrictTo('FACULTY', 'ADMIN'),
  rejectPhysicalFitnessActivity
);

export default router;
