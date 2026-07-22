import { scoreEvents } from '../utils/eventEmitter';
import ExtraCurricularActivity from '../models/ExtraCurricularActivity';
import ExtraCurricularScore from '../models/ExtraCurricularScore';

/**
 * Calculates and stores the extra-curricular activities score for a student for a specific academic year.
 * 
 * @param studentId The MongoDB ID of the Student
 * @param academicYear The academic year (1, 2, 3, or 4)
 * @returns An object containing the totalPoints and the capped score.
 */
export const calculateAndStoreExtraCurricularScore = async (
  studentId: string,
  academicYear: number
): Promise<{ totalPoints: number; score: number }> => {
  if (academicYear < 1 || academicYear > 4) {
    throw new Error('Academic year must be between 1 and 4');
  }

  // 1. Fetch approved extra-curricular activities for this student and academic year
  const approvedActivities = await ExtraCurricularActivity.find({
    studentId,
    academicYear,
    status: 'APPROVED',
  } as any);

  // 2. Sum the facultyApprovedScore (with fallback to calculatedScore if not set)
  let totalPoints = 0;
  approvedActivities.forEach((act) => {
    const scoreVal = act.facultyApprovedScore !== undefined && act.facultyApprovedScore !== null
      ? act.facultyApprovedScore
      : act.calculatedScore;
    totalPoints += scoreVal;
  });

  // 3. Determine the year-wise maximum cap
  // Year 1: Max 10, Year 2, 3, 4: Max 5
  const maxCap = academicYear === 1 ? 10 : 5;

  // Apply the year-wise cap
  const score = Math.min(totalPoints, maxCap);

  // 4. Store the final score in ExtraCurricularScore
  await ExtraCurricularScore.findOneAndUpdate(
    { studentId, academicYear } as any,
    { totalPoints, score },
    { upsert: true, new: true }
  );

  scoreEvents.emit('recalculateScore', studentId);
  return { totalPoints, score };
};

export default calculateAndStoreExtraCurricularScore;
