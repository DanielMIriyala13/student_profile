import { scoreEvents } from '../utils/eventEmitter';
import PhysicalFitnessActivity from '../models/PhysicalFitnessActivity';
import PhysicalFitnessScore from '../models/PhysicalFitnessScore';

/**
 * Calculates and stores the physical fitness / sports score for a student for a specific academic year.
 * 
 * @param studentId The MongoDB ID of the Student
 * @param academicYear The academic year (1, 2, 3, or 4)
 * @returns An object containing the totalPoints and the capped score.
 */
export const calculateAndStorePhysicalFitnessScore = async (
  studentId: string,
  academicYear: number
): Promise<{ totalPoints: number; score: number }> => {
  if (academicYear < 1 || academicYear > 4) {
    throw new Error('Academic year must be between 1 and 4');
  }

  // 1. Fetch approved physical fitness activities for this student and academic year
  const approvedActivities = await PhysicalFitnessActivity.find({
    studentId,
    academicYear,
    status: 'APPROVED',
  } as any);

  // 2. Count the number of approved certificates
  const totalPoints = approvedActivities.length;

  // 3. Determine score based on academic year and presence of at least one approved activity
  // Year 1 & 2: 5 points if approvedActivities exists, else 0.
  // Year 3 & 4: 0 points.
  let score = 0;
  if (academicYear === 1 || academicYear === 2) {
    score = totalPoints > 0 ? 5 : 0;
  } else {
    score = 0;
  }

  // 4. Store the final score in PhysicalFitnessScore
  await PhysicalFitnessScore.findOneAndUpdate(
    { studentId, academicYear } as any,
    { totalPoints, score },
    { upsert: true, new: true }
  );

  scoreEvents.emit('recalculateScore', studentId);
  return { totalPoints, score };
};

export default calculateAndStorePhysicalFitnessScore;
