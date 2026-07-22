import { Router } from 'express';
import {
  submitCodingChallenge,
  getStudentCodingChallenges,
  getPendingCodingChallenges,
  approveCodingChallenge,
  rejectCodingChallenge,
  updateCodingChallenge,
  deleteCodingChallenge,
  getScoreSummary,
} from '../controllers/codingChallengeController';
import { protect, restrictTo } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Student-specific operations
router.post(
  '/',
  protect,
  restrictTo('STUDENT'),
  upload.single('proofFile'),
  submitCodingChallenge
);

router.get(
  '/student',
  protect,
  restrictTo('STUDENT'),
  getStudentCodingChallenges
);

router.put(
  '/:id',
  protect,
  restrictTo('STUDENT'),
  upload.single('proofFile'),
  updateCodingChallenge
);

router.delete(
  '/:id',
  protect,
  restrictTo('STUDENT'),
  deleteCodingChallenge
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
  getPendingCodingChallenges
);

router.put(
  '/:id/approve',
  protect,
  restrictTo('FACULTY', 'ADMIN'),
  approveCodingChallenge
);

router.put(
  '/:id/reject',
  protect,
  restrictTo('FACULTY', 'ADMIN'),
  rejectCodingChallenge
);

export default router;
