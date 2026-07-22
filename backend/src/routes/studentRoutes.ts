import { Router } from 'express';
import { getProfile, updateProfile, uploadResume } from '../controllers/studentController';
import { protect, restrictTo } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/profile', protect, restrictTo('STUDENT'), getProfile);
router.put('/profile', protect, restrictTo('STUDENT'), updateProfile);
router.post('/upload-resume', protect, restrictTo('STUDENT'), upload.single('resume'), uploadResume);

export default router;
