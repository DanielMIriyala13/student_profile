import { Router } from 'express';
import {
  submitAchievement,
  getStudentAchievements,
  getPendingAchievements,
  verifyAchievement,
} from '../controllers/achievementController';
import { protect, restrictTo } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/', protect, restrictTo('STUDENT'), upload.single('document'), submitAchievement);
router.get('/student', protect, restrictTo('STUDENT', 'FACULTY', 'HOD', 'ADMIN'), getStudentAchievements);
router.get('/pending', protect, restrictTo('FACULTY', 'HOD', 'ADMIN'), getPendingAchievements);
router.put('/:id/verify', protect, restrictTo('FACULTY', 'ADMIN'), verifyAchievement);

export default router;
