import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import connectDB from './config/db';

// Import routes
import authRoutes from './routes/authRoutes';
import studentRoutes from './routes/studentRoutes';
import achievementRoutes from './routes/achievementRoutes';
import academicRoutes from './routes/academicRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import notificationRoutes from './routes/notificationRoutes';
import searchRoutes from './routes/searchRoutes';
import scoringRoutes from './routes/scoringRoutes';
import certificationRoutes from './routes/certificationRoutes';
import cambridgeRoutes from './routes/cambridgeRoutes';
import activityRoutes from './routes/activityRoutes';
import projectRoutes from './routes/projectRoutes';
import codingChallengeRoutes from './routes/codingChallengeRoutes';
import leadershipActivityRoutes from './routes/leadershipActivityRoutes';
import coCurricularRoutes from './routes/coCurricularRoutes';
import extraCurricularRoutes from './routes/extraCurricularRoutes';
import physicalFitnessRoutes from './routes/physicalFitnessRoutes';
import facultyRoutes from './routes/facultyRoutes';
import { globalRateLimiter } from './middleware/rateLimiter';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 6002;

// Enable trust proxy to parse X-Forwarded-For headers when behind college gateway/NAT
app.set('trust proxy', 1);

// Connect to Database
import Student from './models/Student';
import { calculateOverallScore } from './services/scoringEngine';

const warmupScores = async () => {
  try {
    const studentsWithoutScores = await Student.find({ overallScore: { $exists: false } }).select('_id');
    if (studentsWithoutScores.length > 0) {
      console.log(`[Warmup] Found ${studentsWithoutScores.length} students without calculated scores. Pre-computing in background...`);
      const batchSize = 25;
      for (let i = 0; i < studentsWithoutScores.length; i += batchSize) {
        const batch = studentsWithoutScores.slice(i, i + batchSize);
        await Promise.all(
          batch.map(student => 
            calculateOverallScore(student._id.toString()).catch(err => {
              console.error(`[Warmup] Failed to calculate score for student ${student._id}:`, err.message);
            })
          )
        );
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      console.log('[Warmup] Student scores pre-computation warmup completed successfully!');
    } else {
      console.log('[Warmup] All student scores are up-to-date in database.');
    }
  } catch (err: any) {
    console.error(`[Warmup] Error during student scores warmup:`, err.message);
  }
};

connectDB().then(() => {
  warmupScores();
});

// Middleware
app.use(cors({
  origin: '*', // For development, allow all origins
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploads statically (bypasses rate limiting)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Apply global rate limiter to all API endpoints
app.use(globalRateLimiter);

// Routes mapping
app.use('/mad/auth', authRoutes);
app.use('/mad/students', studentRoutes);
app.use('/mad/achievements', achievementRoutes);
app.use('/mad/academics', academicRoutes);
app.use('/mad/analytics', analyticsRoutes);
app.use('/mad/notifications', notificationRoutes);
app.use('/mad/search', searchRoutes);
app.use('/mad/scoring', scoringRoutes);
app.use('/mad/certifications', certificationRoutes);
app.use('/mad/cambridge', cambridgeRoutes);
app.use('/mad/activities', activityRoutes);
app.use('/mad/projects', projectRoutes);
app.use('/mad/coding-challenges', codingChallengeRoutes);
app.use('/mad/leadership-activities', leadershipActivityRoutes);
app.use('/mad/co-curricular', coCurricularRoutes);
app.use('/mad/extra-curricular', extraCurricularRoutes);
app.use('/mad/physical-fitness', physicalFitnessRoutes);
app.use('/mad/faculty', facultyRoutes);


// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'VFSTR AEPS SYSTEM API is operational.' });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`❌ Server Error: ${err.message}`);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : {},
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 VFSTR AEPS SYSTEM Backend Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

export default app;
