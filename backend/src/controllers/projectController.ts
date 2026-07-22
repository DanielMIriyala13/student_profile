import { Response } from 'express';
import Project from '../models/Project';
import Student from '../models/Student';
import Notification from '../models/Notification';
import ProjectScore from '../models/ProjectScore';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateAndStoreProjectScore, getProjectLevelScore } from '../services/projectScoringService';
import { getUploadUrl } from '../utils/uploadUrl';

const buildUploadedFiles = (req: AuthenticatedRequest): string[] => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    return req.file ? [getUploadUrl(req.file.filename)] : [];
  }

  return files.map((file) => getUploadUrl(file.filename));
};

const parseList = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

// @desc    Submit a new project
// @route   POST /api/projects
// @access  Private (Student)
export const submitProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const rawYear = req.headers['x-academic-year'];
    const academicYear = rawYear ? Number(rawYear) : (req.body.academicYear ? Number(req.body.academicYear) : undefined);

    const {
      projectTitle,
      projectDescription,
      projectLevel,
      technologiesUsed,
      projectDuration,
      teamMembers,
      repositoryUrl,
      demoUrl,
    } = req.body;

    if (!projectTitle || !projectDescription || !projectLevel || !projectDuration || !teamMembers || !academicYear) {
      res.status(400).json({
        message: 'Missing required fields: projectTitle, projectDescription, projectLevel, projectDuration, teamMembers, academicYear.',
      });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student) {
      res.status(404).json({ message: 'Student profile not found.' });
      return;
    }

    const supportingDocuments = buildUploadedFiles(req);
    if (supportingDocuments.length === 0) {
      res.status(400).json({ message: 'Supporting document upload is required.' });
      return;
    }

    const selectedLevel = String(projectLevel) as 'Department' | 'Institute' | 'Inter-University' | 'National / International';
    const calculatedScore = getProjectLevelScore(selectedLevel);

    const project = await Project.create({
      studentId: student._id as any,
      academicYear: Number(academicYear),
      projectTitle,
      projectDescription,
      projectLevel: selectedLevel,
      studentSelectedLevel: selectedLevel,
      technologiesUsed: parseList(technologiesUsed),
      projectDuration,
      teamMembers,
      repositoryUrl,
      demoUrl,
      supportingDocuments,
      calculatedScore,
      status: 'PENDING',
      remarks: '',
    });

    res.status(201).json({
      message: 'Project submitted successfully. Status: PENDING.',
      project,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get projects for logged-in student
// @route   GET /api/projects/student
// @access  Private (Student)
export const getStudentProjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student) {
      res.status(404).json({ message: 'Student profile not found.' });
      return;
    }

    const projects = await Project.find({ studentId: student._id } as any).sort({ createdAt: -1 });
    const scores = await ProjectScore.find({ studentId: student._id } as any);

    res.status(200).json({ projects, scores });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending projects for faculty review
// @route   GET /api/projects/pending
// @access  Private (Faculty, HOD, Admin)
export const getPendingProjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const projects = await Project.find({ status: 'PENDING' } as any)
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'name email' },
      })
      .sort({ createdAt: 1 });

    res.status(200).json({ projects });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve a project
// @route   PUT /api/projects/:id/approve
// @access  Private (Faculty, HOD, Admin)
export const approveProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { projectLevel, facultyApprovedScore, remarks } = req.body;

    const project = await Project.findById(id).populate({
      path: 'studentId',
      populate: { path: 'userId' },
    });

    if (!project) {
      res.status(404).json({ message: 'Project request not found.' });
      return;
    }

    const finalLevel = projectLevel || project.studentSelectedLevel;
    project.facultyApprovedLevel = finalLevel;
    project.projectLevel = finalLevel as any;
    project.facultyApprovedScore = facultyApprovedScore !== undefined && facultyApprovedScore !== null
      ? Number(facultyApprovedScore)
      : getProjectLevelScore(finalLevel);
    project.status = 'APPROVED';
    project.remarks = remarks || '';
    project.approvedBy = req.user.id as any;
    project.approvedAt = new Date();

    await project.save();

    const studentIdStr = (project.studentId as any)._id
      ? (project.studentId as any)._id.toString()
      : project.studentId.toString();

    await calculateAndStoreProjectScore(studentIdStr, project.academicYear);

    const studentUser = (project.studentId as any).userId;
    if (studentUser) {
      await Notification.create({
        userId: studentUser._id,
        title: 'Project Approved',
        message: `Your project "${project.projectTitle}" has been approved as ${project.facultyApprovedLevel} (Score: ${project.facultyApprovedScore}).`,
        type: 'VERIFICATION_UPDATE',
      });
    }

    res.status(200).json({
      message: 'Project approved and scoring recalculated.',
      project,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject a project
// @route   PUT /api/projects/:id/reject
// @access  Private (Faculty, HOD, Admin)
export const rejectProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { remarks } = req.body;

    if (!remarks || !remarks.trim()) {
      res.status(400).json({ message: 'Rejection remarks/feedback is mandatory.' });
      return;
    }

    const project = await Project.findById(id).populate({
      path: 'studentId',
      populate: { path: 'userId' },
    });

    if (!project) {
      res.status(404).json({ message: 'Project request not found.' });
      return;
    }

    project.status = 'REJECTED';
    project.remarks = remarks;
    project.facultyApprovedLevel = undefined;
    project.facultyApprovedScore = undefined;
    project.approvedBy = req.user.id as any;
    project.approvedAt = new Date();

    await project.save();

    const studentIdStr = (project.studentId as any)._id
      ? (project.studentId as any)._id.toString()
      : project.studentId.toString();

    await calculateAndStoreProjectScore(studentIdStr, project.academicYear);

    const studentUser = (project.studentId as any).userId;
    if (studentUser) {
      await Notification.create({
        userId: studentUser._id,
        title: 'Project Rejected',
        message: `Your project "${project.projectTitle}" has been rejected. Feedback: ${remarks}`,
        type: 'VERIFICATION_UPDATE',
      });
    }

    res.status(200).json({
      message: 'Project rejected and scoring recalculated.',
      project,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update/Edit a project
// @route   PUT /api/projects/:id
// @access  Private (Student)
export const updateProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const {
      projectTitle,
      projectDescription,
      projectLevel,
      technologiesUsed,
      projectDuration,
      teamMembers,
      repositoryUrl,
      demoUrl,
      academicYear,
    } = req.body;

    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student || student._id.toString() !== project.studentId.toString()) {
      res.status(403).json({ message: 'Not authorized to edit this project.' });
      return;
    }

    const previousAcademicYear = project.academicYear;

    if (academicYear && Number(academicYear) !== previousAcademicYear) {
      res.status(400).json({ message: 'Academic Year is immutable and cannot be changed.' });
      return;
    }

    project.projectTitle = projectTitle || project.projectTitle;
    project.projectDescription = projectDescription || project.projectDescription;
    project.projectDuration = projectDuration || project.projectDuration;
    project.teamMembers = teamMembers || project.teamMembers;
    project.repositoryUrl = repositoryUrl !== undefined ? repositoryUrl : project.repositoryUrl;
    project.demoUrl = demoUrl !== undefined ? demoUrl : project.demoUrl;

    if (projectLevel) {
      project.projectLevel = projectLevel;
      project.studentSelectedLevel = projectLevel;
      project.calculatedScore = getProjectLevelScore(projectLevel);
    }

    if (technologiesUsed !== undefined) {
      project.technologiesUsed = parseList(technologiesUsed);
    }

    const supportingDocuments = buildUploadedFiles(req);
    if (supportingDocuments.length > 0) {
      project.supportingDocuments = supportingDocuments;
    }

    project.status = 'PENDING';
    project.remarks = '';
    project.facultyApprovedLevel = undefined;
    project.facultyApprovedScore = undefined;
    project.approvedBy = undefined;
    project.approvedAt = undefined;

    await project.save();

    await calculateAndStoreProjectScore(student._id.toString(), previousAcademicYear);
    if (project.academicYear !== previousAcademicYear) {
      await calculateAndStoreProjectScore(student._id.toString(), project.academicYear);
    }

    res.status(200).json({
      message: 'Project updated. Status reverted to PENDING for faculty review.',
      project,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a project
// @route   DELETE /api/projects/:id
// @access  Private (Student)
export const deleteProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id } as any);
    if (!student || student._id.toString() !== project.studentId.toString()) {
      res.status(403).json({ message: 'Not authorized to delete this project.' });
      return;
    }

    const academicYear = project.academicYear;

    await Project.findByIdAndDelete(id);
    await calculateAndStoreProjectScore(student._id.toString(), academicYear);

    res.status(200).json({
      message: 'Project deleted successfully and scoring recalculated.',
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get project score summary for a student
// @route   GET /api/projects/score-summary
// @access  Private (Student, Faculty, HOD, Admin)
export const getProjectScoreSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    let studentId = '';
    if (req.user.role === 'STUDENT') {
      const student = await Student.findOne({ userId: req.user.id } as any);
      if (!student) {
        res.status(404).json({ message: 'Student profile not found.' });
        return;
      }
      studentId = student._id.toString();
    } else {
      studentId = req.query.studentId as string;
      if (!studentId) {
        res.status(400).json({ message: 'studentId query parameter is required for staff review.' });
        return;
      }
    }

    const scores = await ProjectScore.find({ studentId } as any);

    res.status(200).json({ scores });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};