import { scoreEvents } from '../utils/eventEmitter';
import CodingChallenge from '../models/CodingChallenge';
import CodingChallengeScore from '../models/CodingChallengeScore';

/**
 * Calculates and stores the coding challenge / hackathon score for a student for a specific academic year.
 * 
 * @param studentId The MongoDB ID of the Student
 * @param academicYear The academic year (1, 2, 3, or 4)
 * @returns An object containing the totalPoints and the capped score.
 */
export const calculateAndStoreCodingChallengeScore = async (
  studentId: string,
  academicYear: number
): Promise<{ totalPoints: number; score: number }> => {
  if (academicYear < 1 || academicYear > 4) {
    throw new Error('Academic year must be between 1 and 4');
  }

  // 1. Fetch approved coding challenges/hackathons for this student and academic year
  const approvedChallenges = await CodingChallenge.find({
    studentId,
    academicYear,
    status: 'APPROVED',
  } as any);

  // 2. Sum the facultyApprovedScore (with fallback to studentCalculatedScore if not set)
  let totalPoints = 0;
  approvedChallenges.forEach((challenge) => {
    const scoreVal = challenge.facultyApprovedScore !== undefined && challenge.facultyApprovedScore !== null
      ? challenge.facultyApprovedScore
      : challenge.studentCalculatedScore;
    totalPoints += scoreVal;
  });

  // 3. Determine the year-wise maximum cap
  // Year 1: Max 10, Year 2: Max 10, Year 3: Max 5, Year 4: Max 5
  const maxCap = academicYear === 1 || academicYear === 2 ? 10 : 5;

  // Apply the year-wise cap
  const score = Math.min(totalPoints, maxCap);

  // 4. Store the final score in CodingChallengeScore
  await CodingChallengeScore.findOneAndUpdate(
    { studentId, academicYear } as any,
    { totalPoints, score },
    { upsert: true, new: true }
  );

  scoreEvents.emit('recalculateScore', studentId);
  return { totalPoints, score };
};
