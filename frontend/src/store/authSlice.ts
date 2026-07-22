import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'FACULTY' | 'HOD' | 'PLACEMENT_OFFICER' | 'ADMIN';
  department?: string;
  isProfileSetup: boolean;
}

interface StudentInfo {
  id: string;
  rollNumber: string;
  branch: string;
  department: string;
  year: number;
  section: string;
}

interface AuthState {
  user: UserInfo | null;
  studentInfo: StudentInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  currentAcademicYear: number;
}

// Load initial state from local storage
const storedUser = localStorage.getItem('user');
const storedStudentInfo = localStorage.getItem('studentInfo');
const storedAccess = localStorage.getItem('accessToken');
const storedRefresh = localStorage.getItem('refreshToken');
const storedYear = localStorage.getItem('currentAcademicYear');

const initialState: AuthState = {
  user: storedUser ? JSON.parse(storedUser) : null,
  studentInfo: storedStudentInfo ? JSON.parse(storedStudentInfo) : null,
  accessToken: storedAccess || null,
  refreshToken: storedRefresh || null,
  loading: false,
  error: null,
  currentAcademicYear: storedYear ? Number(storedYear) : (storedStudentInfo ? JSON.parse(storedStudentInfo).year || 1 : 1),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    authSuccess: (
      state,
      action: PayloadAction<{
        user: UserInfo;
        studentInfo: StudentInfo | null;
        accessToken: string;
        refreshToken: string;
      }>
    ) => {
      state.loading = false;
      state.user = action.payload.user;
      state.studentInfo = action.payload.studentInfo;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;

      localStorage.setItem('user', JSON.stringify(action.payload.user));
      if (action.payload.studentInfo) {
        localStorage.setItem('studentInfo', JSON.stringify(action.payload.studentInfo));
        localStorage.setItem('currentAcademicYear', (action.payload.studentInfo.year || 1).toString());
        state.currentAcademicYear = action.payload.studentInfo.year || 1;
      }
      localStorage.setItem('accessToken', action.payload.accessToken);
      localStorage.setItem('refreshToken', action.payload.refreshToken);
    },
    authFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateStudentDetails: (state, action: PayloadAction<StudentInfo>) => {
      state.studentInfo = action.payload;
      localStorage.setItem('studentInfo', JSON.stringify(action.payload));
      localStorage.setItem('currentAcademicYear', (action.payload.year || 1).toString());
      state.currentAcademicYear = action.payload.year || 1;
    },
    setCurrentAcademicYear: (state, action: PayloadAction<number>) => {
      state.currentAcademicYear = action.payload;
      localStorage.setItem('currentAcademicYear', action.payload.toString());
    },
    logout: (state) => {
      state.user = null;
      state.studentInfo = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.loading = false;
      state.error = null;
      state.currentAcademicYear = 1;

      localStorage.removeItem('user');
      localStorage.removeItem('studentInfo');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentAcademicYear');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  authStart,
  authSuccess,
  authFailure,
  updateStudentDetails,
  setCurrentAcademicYear,
  logout,
  clearError,
} = authSlice.actions;

export default authSlice.reducer;
