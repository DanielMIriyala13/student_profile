import { scoreEvents } from '../utils/eventEmitter';
import ActivityCertification from '../models/ActivityCertification';
import ActivityScore from '../models/ActivityScore';

/**
 * Calculates and stores the activities score for a student for a specific academic year.
 * 
 * @param studentId The MongoDB ID of the Student
 * @param academicYear The academic year (1, 2, 3, or 4)
 * @returns An object containing the totalPoints and the capped score.
 */
export const calculateAndStoreActivityScore = async (
  studentId: string,
  academicYear: number
): Promise<{ totalPoints: number; score: number }> => {
  if (academicYear < 1 || academicYear > 4) {
    throw new Error('Academic year must be between 1 and 4');
  }

  // 1. Fetch approved certificates for this student and academic year
  const approvedCertifications = await ActivityCertification.find({
    studentId,
    academicYear,
    status: 'APPROVED',
  } as any);

  // 2. Sum the facultyApprovedScore (with fallback to calculatedScore if not set)
  let totalPoints = 0;
  approvedCertifications.forEach((cert) => {
    const scoreVal = cert.facultyApprovedScore !== undefined && cert.facultyApprovedScore !== null
      ? cert.facultyApprovedScore
      : cert.calculatedScore;
    totalPoints += scoreVal;
  });

  // 3. Determine the year-wise maximum cap
  // Year 1, 2, 3: Max 5, Year 4: Max 0
  const maxCap = academicYear === 4 ? 0 : 5;

  // Apply the year-wise cap
  const score = Math.min(totalPoints, maxCap);

  // 4. Store the final score in ActivityScore cache
  await ActivityScore.findOneAndUpdate(
    { studentId, academicYear } as any,
    { totalPoints, score },
    { upsert: true, new: true }
  );

  scoreEvents.emit('recalculateScore', studentId);
  return { totalPoints, score };
};
