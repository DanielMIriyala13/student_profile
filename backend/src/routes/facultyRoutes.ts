import { Router } from 'express';
import { getFacultyAchievements, editAchievement, getAuditHistory } from '../controllers/facultyController';
import { protect, restrictTo } from '../middleware/auth';

const router = Router();

// Retrieve list of all achievements (Approved/Rejected/Pending) with filters and search
router.get('/achievements', protect, restrictTo('FACULTY', 'HOD', 'ADMIN'), getFacultyAchievements);

// Edit specific approved/rejected achievement and recalculate scores
router.put('/achievements/:module/:id/edit', protect, restrictTo('FACULTY', 'ADMIN'), editAchievement);

// Get audit trail modifications timeline for specific achievement
router.get('/achievements/:module/:id/audit', protect, restrictTo('FACULTY', 'HOD', 'ADMIN'), getAuditHistory);

export default router;
