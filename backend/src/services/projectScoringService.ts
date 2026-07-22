import { scoreEvents } from '../utils/eventEmitter';
import Project from '../models/Project';
import ProjectScore from '../models/ProjectScore';

const projectLevelScoreMap: Record<string, number> = {
  Department: 2,
  Institute: 4,
  'Inter-University': 6,
  'National / International': 10,
};

export const getProjectLevelScore = (level: string): number => {
  return projectLevelScoreMap[level] || 2;
};

export const calculateAndStoreProjectScore = async (
  studentId: string,
  academicYear: number
): Promise<{ totalPoints: number; score: number }> => {
  if (academicYear < 1 || academicYear > 4) {
    throw new Error('Academic year must be between 1 and 4');
  }

  const approvedProjects = await Project.find({
    studentId,
    academicYear,
    status: 'APPROVED',
  } as any);

  let totalPoints = 0;
  approvedProjects.forEach((project) => {
    const scoreVal = project.facultyApprovedScore !== undefined && project.facultyApprovedScore !== null
      ? project.facultyApprovedScore
      : project.calculatedScore;
    totalPoints += scoreVal;
  });

  const maxCap = academicYear === 1 ? 5 : 10;
  const score = Math.min(totalPoints, maxCap);

  await ProjectScore.findOneAndUpdate(
    { studentId, academicYear } as any,
    { totalPoints, score },
    { upsert: true, new: true }
  );

  scoreEvents.emit('recalculateScore', studentId);
  return { totalPoints, score };
};