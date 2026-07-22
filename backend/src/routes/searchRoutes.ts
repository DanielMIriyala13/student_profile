import { Router } from 'express';
import { globalSearch } from '../controllers/searchController';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/', protect, globalSearch);

export default router;
