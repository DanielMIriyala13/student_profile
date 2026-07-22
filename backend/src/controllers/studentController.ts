import { Response } from 'express';
import Student from '../models/Student';
import Profile from '../models/Profile';
import { AuthenticatedRequest } from '../middleware/auth';
import { getUploadUrl } from '../utils/uploadUrl';

const calculateCompletion = (student: any, profile: any): number => {
  let score = 30; // base score for registration info (roll, branch, section etc)

  if (profile.skills) {
    const hasTechnical = profile.skills.technical && profile.skills.technical.length > 0;
    const hasSoft = profile.skills.soft && profile.skills.soft.length > 0;
    if (hasTechnical) score += 10;
    if (hasSoft) score += 5;
  }

  if (profile.profiles) {
    if (profile.profiles.linkedin) score += 15;
    if (profile.profiles.github) score += 15;
    const hasCodingProfile = profile.profiles.leetcode || profile.profiles.hackerrank || profile.profiles.codechef;
    if (hasCodingProfile) score += 15;
  }

  if (profile.resumeUrl) score += 10;

  return Math.min(score, 100);
};

// @desc    Get logged in student profile
// @route   GET /api/students/profile
// @access  Private (Student)
export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      res.status(404).json({ message: 'Student profile not found.' });
      return;
    }

    let profile = await Profile.findOne({ studentId: student._id });
    if (!profile) {
      profile = await Profile.create({ studentId: student._id });
    }

    res.status(200).json({
      student,
      profile,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update student profile details
// @route   PUT /api/students/profile
// @access  Private (Student)
export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      res.status(404).json({ message: 'Student details not found.' });
      return;
    }

    const { contactNumber, skills, profiles } = req.body;

    // Update student details
    if (contactNumber) {
      student.contactNumber = contactNumber;
      await student.save();
    }

    let profile = await Profile.findOne({ studentId: student._id });
    if (!profile) {
      profile = new Profile({ studentId: student._id });
    }

    if (skills) {
      profile.skills = {
        technical: skills.technical || profile.skills?.technical || [],
        soft: skills.soft || profile.skills?.soft || [],
      };
    }

    if (profiles) {
      profile.profiles = {
        github: profiles.github !== undefined ? profiles.github : profile.profiles?.github || '',
        linkedin: profiles.linkedin !== undefined ? profiles.linkedin : profile.profiles?.linkedin || '',
        leetcode: profiles.leetcode !== undefined ? profiles.leetcode : profile.profiles?.leetcode || '',
        hackerrank: profiles.hackerrank !== undefined ? profiles.hackerrank : profile.profiles?.hackerrank || '',
        codechef: profiles.codechef !== undefined ? profiles.codechef : profile.profiles?.codechef || '',
        portfolio: profiles.portfolio !== undefined ? profiles.portfolio : profile.profiles?.portfolio || '',
      };
    }

    profile.profileCompletion = calculateCompletion(student, profile);
    await profile.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      student,
      profile,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload student resume
// @route   POST /api/students/upload-resume
// @access  Private (Student)
export const uploadResume = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'Please upload a PDF file.' });
      return;
    }

    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      res.status(404).json({ message: 'Student profile not found.' });
      return;
    }

    let profile = await Profile.findOne({ studentId: student._id });
    if (!profile) {
      profile = new Profile({ studentId: student._id });
    }

    // Save local URL path
    const fileUrl = getUploadUrl(req.file.filename);
    profile.resumeUrl = fileUrl;
    profile.profileCompletion = calculateCompletion(student, profile);
    await profile.save();

    res.status(200).json({
      message: 'Resume uploaded successfully',
      resumeUrl: fileUrl,
      profile,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
