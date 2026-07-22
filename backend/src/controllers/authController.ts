import { Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Student from '../models/Student';
import Profile from '../models/Profile';
import { AuthenticatedRequest } from '../middleware/auth';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const generateTokens = (userId: string, role: string) => {
  const accessToken = jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'supersecretkey_vfstr_aeps_2026_go_deepmind_ag_key',
    { expiresIn: '1d' }
  );

  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || 'supersecretkey_refresh_vfstr_aeps_2026_go_deepmind',
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// @desc    Register a new student
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, rollNumber, branch, department, year, section, contactNumber } = req.body;

    if (!rollNumber) {
      res.status(400).json({ message: 'Roll number is required.' });
      return;
    }

    const studentRoll = rollNumber.trim().toLowerCase();
    const email = `${studentRoll}@gmail.com`;
    const password = studentRoll;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User with this email already exists.' });
      return;
    }

    // Check roll number uniqueness
    const studentExists = await Student.findOne({ rollNumber: rollNumber.toUpperCase() });
    if (studentExists) {
      res.status(400).json({ message: 'Student with this roll number already exists.' });
      return;
    }

    // Create User
    const user = await User.create({
      name,
      email,
      password,
      role: 'STUDENT',
      isProfileSetup: true, // We take details in registration itself
    });

    // Create Student
    const student = await Student.create({
      userId: user._id,
      rollNumber,
      branch,
      department,
      year,
      section,
      contactNumber,
    });

    // Create Profile
    await Profile.create({
      studentId: student._id,
      profileCompletion: 40, // Base profile completion from registration details
    });

    const { accessToken, refreshToken } = generateTokens(user._id.toString(), 'STUDENT');

    res.status(201).json({
      message: 'Student registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        isProfileSetup: user.isProfileSetup,
      },
      studentInfo: {
        id: student._id,
        rollNumber: student.rollNumber,
        branch: student.branch,
        department: student.department,
        year: student.year,
        section: student.section,
      },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user (any role)
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const authDebug = process.env.AUTH_DEBUG === 'true';
    const debug = (message: string) => {
      if (authDebug) console.debug(`[auth-debug] ${message}`);
    };

    if (!email || !password) {
      res.status(400).json({ message: 'Please provide email and password.' });
      return;
    }

    // Student login identifiers are stored in lowercase. Normalizing here also
    // keeps the existing staff login flow case-insensitive without changing it.
    const normalizedEmail = String(email).trim().toLowerCase();
    debug(`Email received: ${normalizedEmail}`);
    const user = await User.findOne({ email: normalizedEmail })
      || await User.findOne({ email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: 'i' } });
    debug(`User found: ${user ? 'YES' : 'NO'}`);
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }
    debug(`Stored email: ${user.email}; role: ${user.role}`);

    let isPasswordCorrect = await (user as any).comparePassword(password);
    if (!isPasswordCorrect && user.role === 'STUDENT') {
      isPasswordCorrect = await (user as any).comparePassword(password.toLowerCase());
    }
    debug(`Password comparison: ${isPasswordCorrect ? 'PASS' : 'FAIL'}`);

    if (!isPasswordCorrect) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    let studentInfo = null;
    if (user.role === 'STUDENT') {
      studentInfo = await Student.findOne({ userId: user._id });
      debug(`Linked Student found: ${studentInfo ? 'YES' : 'NO'}; status: ${(studentInfo as any)?.status || 'NOT_SET'}`);
      if ((studentInfo as any)?.status === 'INACTIVE') {
        debug('Authentication blocked: student account is inactive');
        res.status(403).json({ message: 'Student account is inactive.' });
        return;
      }
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.role);
    debug('JWT generated: YES');

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        isProfileSetup: user.isProfileSetup,
      },
      studentInfo: studentInfo ? {
        id: studentInfo._id,
        rollNumber: studentInfo.rollNumber,
        branch: studentInfo.branch,
        department: studentInfo.department,
        year: studentInfo.year,
        section: studentInfo.section,
      } : null,
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
export const refreshToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ message: 'Refresh token is required.' });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || 'supersecretkey_refresh_vfstr_aeps_2026_go_deepmind'
    ) as any;

    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401).json({ message: 'User does not exist.' });
      return;
    }

    const tokens = generateTokens(user._id.toString(), user.role);

    res.status(200).json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error: any) {
    res.status(401).json({ message: 'Invalid or expired refresh token.' });
  }
};

// @desc    Admin creates institutional staff (Faculty, HOD, Placement Officer)
// @route   POST /api/auth/admin/create-user
// @access  Private (Admin only)
export const adminCreateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    if (!['FACULTY', 'HOD', 'PLACEMENT_OFFICER', 'ADMIN'].includes(role)) {
      res.status(400).json({ message: 'Invalid role for admin creation.' });
      return;
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User with this email already exists.' });
      return;
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      isProfileSetup: true,
    });

    res.status(201).json({
      message: 'Account created successfully by admin',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user details
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }

    const user = await User.findById(req.user.id).select('-password');
    let studentInfo = null;
    let profileInfo = null;

    if (user?.role === 'STUDENT') {
      studentInfo = await Student.findOne({ userId: user._id });
      if (studentInfo) {
        profileInfo = await Profile.findOne({ studentId: studentInfo._id });
      }
    }

    res.status(200).json({
      user,
      studentInfo,
      profileInfo,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
