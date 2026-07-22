import { Router } from 'express';
import {
  approveProject,
  deleteProject,
  getPendingProjects,
  getProjectScoreSummary,
  getStudentProjects,
  rejectProject,
  submitProject,
  updateProject,
} from '../controllers/projectController';
import { protect, restrictTo } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.post(
  '/',
  protect,
  restrictTo('STUDENT'),
  upload.array('supportingDocuments', 5),
  submitProject
);

router.get(
  '/student',
  protect,
  restrictTo('STUDENT'),
  getStudentProjects
);

router.put(
  '/:id',
  protect,
  restrictTo('STUDENT'),
  upload.array('supportingDocuments', 5),
  updateProject
);

router.delete(
  '/:id',
  protect,
  restrictTo('STUDENT'),
  deleteProject
);

router.get(
  '/score-summary',
  protect,
  getProjectScoreSummary
);

router.get(
  '/pending',
  protect,
  restrictTo('FACULTY', 'HOD', 'ADMIN'),
  getPendingProjects
);

router.put(
  '/:id/approve',
  protect,
  restrictTo('FACULTY', 'ADMIN'),
  approveProject
);

router.put(
  '/:id/reject',
  protect,
  restrictTo('FACULTY', 'ADMIN'),
  rejectProject
);

export default router;