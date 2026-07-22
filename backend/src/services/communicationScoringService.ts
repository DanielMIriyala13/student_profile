import { scoreEvents } from '../utils/eventEmitter';
import CambridgeCertification from '../models/CambridgeCertification';
import CommunicationScore from '../models/CommunicationScore';

/**
 * Calculates and stores the communication score for a student for a specific academic year.
 * 
 * @param studentId The MongoDB ID of the Student
 * @param academicYear The academic year (1, 2, 3, or 4)
 * @returns An object containing the totalPoints and the capped score.
 */
export const calculateAndStoreCommunicationScore = async (
  studentId: string,
  academicYear: number
): Promise<{ totalPoints: number; score: number }> => {
  if (academicYear < 1 || academicYear > 4) {
    throw new Error('Academic year must be between 1 and 4');
  }

  // 1. Fetch approved certificates for this student and academic year
  const approvedCertifications = await CambridgeCertification.find({
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
  // Year 1: Max 10, Year 2: Max 10, Year 3: Max 5, Year 4: Max 5
  const maxCap = academicYear === 1 || academicYear === 2 ? 10 : 5;

  // Apply the year-wise cap
  const score = Math.min(totalPoints, maxCap);

  // 4. Store the final communication score in CommunicationScore
  await CommunicationScore.findOneAndUpdate(
    { studentId, academicYear } as any,
    { totalPoints, score },
    { upsert: true, new: true }
  );

  scoreEvents.emit('recalculateScore', studentId);
  return { totalPoints, score };
};
