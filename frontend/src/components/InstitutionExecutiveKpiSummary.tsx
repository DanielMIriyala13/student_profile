import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  Award,
  Building2,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { apiFetch } from '../utils/api';

type KpiKey = 'totalStudents' | 'avgCgpa' | 'avgAttendance' | 'avgProfileScore' | 'studentsWithBacklogs';
type ModalStep = 'departments' | 'departmentDetails' | 'students' | 'profile';
type ModalMode = 'explorer' | 'analytics';
type SortOrder = 'asc' | 'desc';

interface Props {
  year?: string;
  branch?: string;
}

interface SummaryState {
  totalStudents: number;
  avgCgpa: number;
  avgAttendance: number;
  avgProfileScore: number;
  studentsWithBacklogs: number;
}

interface DepartmentRow {
  department: string;
  totalStudents: number;
  avgCgpa: number;
  avgAttendance: number;
  avgProfileScore: number;
  studentsWithBacklogs: number;
  maleStudents: number;
  femaleStudents: number;
  placementReadyStudents: number;
  topPerformer: any;
}

interface DepartmentDetailsState {
  department: {
    department: string;
    totalStudents: number;
    maleStudents: number;
    femaleStudents: number;
    avgCgpa: number;
    highestCgpa: number;
    lowestCgpa: number;
    avgAttendance: number;
    highestAttendance: number;
    lowestAttendance: number;
    avgProfileScore: number;
    highestProfileScore: number;
    lowestProfileScore: number;
    studentsWithBacklogs: number;
    averageBacklogs: number;
    highestBacklogs: number;
    placementReadyStudents: number;
    topPerformer: any;
    studentsRequiringAttention: number;
  } | null;
  charts: {
    cgpaDistribution: Array<{ label: string; count: number }>;
    attendanceDistribution: Array<{ label: string; count: number }>;
  };
  yearWise: Array<{
    year: number;
    label: string;
    totalStudents: number;
    avgCgpa: number;
    avgAttendance: number;
    avgProfileScore: number;
    studentsWithBacklogs: number;
  }>;
  attentionStudents: any[];
}

interface StudentRow {
  id: string;
  studentId: string;
  name: string;
  email: string;
  rollNumber: string;
  branch: string;
  department: string;
  year: number;
  semester: number;
  section: string;
  gender: string;
  cgpa: number;
  attendancePct: number;
  profileScore: number;
  profileCompletion: number;
  activeBacklogs: number;
  averageBacklogs: number;
  highestBacklogs: number;
  isPlaced: boolean;
  placedCompany: string;
  salaryPackage: number;
  placementReady: boolean;
  latestSemester: number;
  skillsCount: number;
  subjectsCount: number;
}

interface StudentProfileState {
  student: any;
  analytics: any;
}

const KPI_META: Record<KpiKey, { title: string; subtitle: string; icon: React.ElementType; iconBg: string; accent: string; valueClass: string; barColor: string }> = {
  totalStudents: {
    title: 'Total Students',
    subtitle: 'Active student records & master search',
    icon: Users,
    iconBg: 'bg-sky-50 text-sky-600',
    accent: 'border-sky-200',
    valueClass: 'text-slate-900',
    barColor: '#0284c7',
  },
  avgCgpa: {
    title: 'Average CGPA',
    subtitle: 'Institution-wide cumulative GPA',
    icon: GraduationCap,
    iconBg: 'bg-violet-50 text-violet-600',
    accent: 'border-violet-200',
    valueClass: 'text-slate-900',
    barColor: '#8b5cf6',
  },
  avgAttendance: {
    title: 'Average Attendance',
    subtitle: 'Filtered attendance percentage',
    icon: TrendingUp,
    iconBg: 'bg-emerald-50 text-emerald-600',
    accent: 'border-emerald-200',
    valueClass: 'text-slate-900',
    barColor: '#10b981',
  },
  avgProfileScore: {
    title: 'Average Profile Score',
    subtitle: 'Overall profile strength score',
    icon: Award,
    iconBg: 'bg-amber-50 text-amber-600',
    accent: 'border-amber-200',
    valueClass: 'text-slate-900',
    barColor: '#f59e0b',
  },
  studentsWithBacklogs: {
    title: 'Students with Backlogs',
    subtitle: 'Active backlog count from academics',
    icon: AlertTriangle,
    iconBg: 'bg-rose-50 text-rose-600',
    accent: 'border-rose-200',
    valueClass: 'text-slate-900',
    barColor: '#f43f5e',
  },
};

const formatDecimal = (value: number, digits = 2): string => Number.isFinite(value) ? value.toFixed(digits) : `0.${'0'.repeat(digits)}`;

const formatKpiValue = (key: KpiKey, value: number): string => {
  if (key === 'totalStudents' || key === 'studentsWithBacklogs') return value.toLocaleString();
  if (key === 'avgCgpa') return formatDecimal(value, 2);
  return formatDecimal(value, key === 'avgAttendance' ? 1 : 2);
};

const buildBaseParams = (filters: Props): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.year) params.set('year', filters.year);
  if (filters.branch) params.set('department', filters.branch);
  return params;
};

const buildCsv = (rows: any[]): string => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escapeCell = (value: any) => {
    const text = value === null || value === undefined ? '' : String(value);
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(','))].join('\n');
};

const InstitutionExecutiveKpiSummary: React.FC<Props> = ({ year, branch }) => {
  const filters = useMemo(() => ({ year, branch }), [year, branch]);
  const [summary, setSummary] = useState<SummaryState | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  const [isOpen, setIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('analytics');
  const [activeKpi, setActiveKpi] = useState<KpiKey>('totalStudents');
  const [step, setStep] = useState<ModalStep>('departments');

  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [departmentDetails, setDepartmentDetails] = useState<DepartmentDetailsState>({ department: null, charts: { cgpaDistribution: [], attendanceDistribution: [] }, yearWise: [], attentionStudents: [] });
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfileState | null>(null);

  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentRow | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('ALL');

  // Metric-specific categories
  const [attendanceCategory, setAttendanceCategory] = useState<string>('ALL');
  const [cgpaCategory, setCgpaCategory] = useState<string>('ALL');
  const [profileScoreCategory, setProfileScoreCategory] = useState<string>('ALL');
  const [backlogsCategory, setBacklogsCategory] = useState<string>('ALL_BACKLOGS');

  // Total Students Search & Filters
  const [studentSearch, setStudentSearch] = useState('');
  const [rollSearch, setRollSearch] = useState('');
  const [placementStatus, setPlacementStatus] = useState('ALL');

  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [sortBy, setSortBy] = useState('rollNumber');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalStudents, setTotalStudents] = useState(0);
  const [studentLoading, setStudentLoading] = useState(false);
  const [departmentLoading, setDepartmentLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      setSummaryError('');
      const params = buildBaseParams(filters);
      const res = await apiFetch(`/analytics/institution/kpi-summary?${params.toString()}`);
      setSummary(res.summary || null);
    } catch (error: any) {
      setSummaryError(error.message || 'Failed to load KPI summary.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchDepartments = async (kpi: KpiKey) => {
    try {
      setDepartmentLoading(true);
      const params = buildBaseParams(filters);
      params.set('metric', kpi);
      if (selectedSection && selectedSection !== 'ALL') params.set('section', selectedSection);

      if (kpi === 'avgAttendance' && attendanceCategory !== 'ALL') params.set('attendanceCategory', attendanceCategory);
      if (kpi === 'avgCgpa' && cgpaCategory !== 'ALL') params.set('cgpaCategory', cgpaCategory);
      if (kpi === 'avgProfileScore' && profileScoreCategory !== 'ALL') params.set('profileScoreCategory', profileScoreCategory);
      if (kpi === 'studentsWithBacklogs' && backlogsCategory !== 'ALL') params.set('backlogsCategory', backlogsCategory);

      const res = await apiFetch(`/analytics/institution/kpi-departments?${params.toString()}`);
      setDepartments(res.departments || []);
    } finally {
      setDepartmentLoading(false);
    }
  };

  const fetchDepartmentDetails = async (departmentName: string) => {
    try {
      setDepartmentLoading(true);
      const params = buildBaseParams(filters);
      if (departmentName) params.set('department', departmentName);
      if (selectedSection && selectedSection !== 'ALL') params.set('section', selectedSection);

      if (activeKpi === 'avgAttendance' && attendanceCategory !== 'ALL') params.set('attendanceCategory', attendanceCategory);
      if (activeKpi === 'avgCgpa' && cgpaCategory !== 'ALL') params.set('cgpaCategory', cgpaCategory);
      if (activeKpi === 'avgProfileScore' && profileScoreCategory !== 'ALL') params.set('profileScoreCategory', profileScoreCategory);
      if (activeKpi === 'studentsWithBacklogs' && backlogsCategory !== 'ALL') params.set('backlogsCategory', backlogsCategory);

      const res = await apiFetch(`/analytics/institution/kpi-department-details?${params.toString()}`);
      setDepartmentDetails({
        department: res.department || null,
        charts: res.charts || { cgpaDistribution: [], attendanceDistribution: [] },
        yearWise: res.yearWise || [],
        attentionStudents: res.attentionStudents || [],
      });
    } finally {
      setDepartmentLoading(false);
    }
  };

  const fetchStudents = async (
    overridePage = page,
    overrideExport = false,
    yearOverride?: number | null,
    deptOverride?: string | null
  ) => {
    try {
      setStudentLoading(true);
      const params = buildBaseParams(filters);
      params.set('metric', activeKpi);

      const targetDept = deptOverride !== undefined ? deptOverride : selectedDepartment?.department;
      if (targetDept) params.set('department', targetDept);

      const targetYear = yearOverride !== undefined ? yearOverride : selectedYear;
      if (targetYear) params.set('year', String(targetYear));

      if (selectedSection && selectedSection !== 'ALL') params.set('section', selectedSection);

      if (activeKpi === 'totalStudents') {
        const searchTerm = studentSearch || rollSearch;
        if (searchTerm) params.set('search', searchTerm);
        if (placementStatus !== 'ALL') params.set('placementStatus', placementStatus);
      } else if (activeKpi === 'avgAttendance') {
        if (attendanceCategory !== 'ALL') params.set('attendanceCategory', attendanceCategory);
      } else if (activeKpi === 'avgCgpa') {
        if (cgpaCategory !== 'ALL') params.set('cgpaCategory', cgpaCategory);
      } else if (activeKpi === 'avgProfileScore') {
        if (profileScoreCategory !== 'ALL') params.set('profileScoreCategory', profileScoreCategory);
      } else if (activeKpi === 'studentsWithBacklogs') {
        if (backlogsCategory !== 'ALL') params.set('backlogsCategory', backlogsCategory);
      }

      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('page', String(overridePage));
      params.set('limit', String(pageSize));
      if (overrideExport) params.set('export', 'true');

      const res = await apiFetch(`/analytics/institution/kpi-students?${params.toString()}`);
      setStudents(res.students || []);
      setTotalStudents(res.totalCount || 0);
      setPageSize(res.pageSize || pageSize || 50);
      setPage(res.page || overridePage);
    } finally {
      setStudentLoading(false);
    }
  };

  const fetchStudentProfile = async (studentId: string) => {
    try {
      setProfileLoading(true);
      const res = await apiFetch(`/analytics/institution/kpi-student-profile?studentId=${encodeURIComponent(studentId)}`);
      setStudentProfile(res);
    } finally {
      setProfileLoading(false);
    }
  };

  // Direct Analytics Mode (opened by KPI cards)
  const openKpi = async (kpi: KpiKey) => {
    setActiveKpi(kpi);
    setModalMode('analytics');
    setStep('departments');
    setSelectedDepartment(null);
    setSelectedYear(null);
    setSelectedSection('ALL');
    setAttendanceCategory('ALL');
    setCgpaCategory('ALL');
    setProfileScoreCategory('ALL');
    setBacklogsCategory('ALL_BACKLOGS');
    setSelectedStudent(null);
    setStudentProfile(null);
    setStudentSearch('');
    setRollSearch('');
    setPlacementStatus('ALL');
    setSortBy(kpi === 'avgCgpa' ? 'cgpa' : kpi === 'avgAttendance' ? 'attendancePct' : kpi === 'avgProfileScore' ? 'profileScore' : kpi === 'studentsWithBacklogs' ? 'activeBacklogs' : 'rollNumber');
    setSortOrder(kpi === 'totalStudents' ? 'asc' : 'desc');
    setPage(1);
    setPageSize(50);
    setIsOpen(true);
    await Promise.all([
      fetchDepartments(kpi),
      fetchDepartmentDetails(''),
      fetchStudents(1, false, null, null),
    ]);
  };

  // Dedicated Department Explorer Button workflow
  const openExplorer = async () => {
    setModalMode('explorer');
    setStep('departments');
    setSelectedDepartment(null);
    setSelectedYear(null);
    setSelectedSection('ALL');
    setSelectedStudent(null);
    setStudentProfile(null);
    setIsOpen(true);
    await fetchDepartments(activeKpi);
  };

  const openDepartmentDetails = async (department: DepartmentRow) => {
    setSelectedDepartment(department);
    setSelectedYear(null);
    setStep('departmentDetails');
    setSelectedStudent(null);
    setStudentProfile(null);
    await fetchDepartmentDetails(department.department);
  };

  const openStudents = async () => {
    setStep('students');
    setSelectedStudent(null);
    setStudentProfile(null);
    await fetchStudents(1);
  };

  const openStudentsForYear = async (yearNum: number) => {
    setSelectedYear(yearNum);
    setStep('students');
    setSelectedStudent(null);
    setStudentProfile(null);
    setPage(1);
    await fetchStudents(1, false, yearNum);
  };

  const openProfile = async (student: StudentRow) => {
    setSelectedStudent(student);
    setStep('profile');
    await fetchStudentProfile(student.studentId);
  };

  const closeModal = () => {
    setIsOpen(false);
    setStep('departments');
    setSelectedDepartment(null);
    setSelectedYear(null);
    setSelectedSection('ALL');
    setSelectedStudent(null);
    setStudentProfile(null);
  };

  const handleSelectDepartmentAnalytics = async (deptRow: DepartmentRow | null) => {
    setSelectedDepartment(deptRow);
    await fetchDepartmentDetails(deptRow ? deptRow.department : '');
    setPage(1);
    await fetchStudents(1, false, selectedYear, deptRow ? deptRow.department : null);
  };

  const handleSelectYearAnalytics = async (yearNum: number) => {
    setSelectedYear(yearNum);
    setPage(1);
    await fetchStudents(1, false, yearNum, selectedDepartment?.department);
  };

  const handleClearAnalyticsFilters = async () => {
    setSelectedDepartment(null);
    setSelectedYear(null);
    setSelectedSection('ALL');
    setAttendanceCategory('ALL');
    setCgpaCategory('ALL');
    setProfileScoreCategory('ALL');
    setBacklogsCategory('ALL_BACKLOGS');
    setStudentSearch('');
    setRollSearch('');
    setPlacementStatus('ALL');
    setPage(1);
    await Promise.all([
      fetchDepartments(activeKpi),
      fetchDepartmentDetails(''),
      fetchStudents(1, false, null, null),
    ]);
  };

  const exportStudents = async (format: 'xlsx' | 'csv') => {
    const params = buildBaseParams(filters);
    params.set('metric', activeKpi);
    if (selectedDepartment?.department) params.set('department', selectedDepartment.department);
    if (selectedYear) params.set('year', String(selectedYear));
    if (selectedSection && selectedSection !== 'ALL') params.set('section', selectedSection);

    if (activeKpi === 'totalStudents') {
      const searchTerm = studentSearch || rollSearch;
      if (searchTerm) params.set('search', searchTerm);
      if (placementStatus !== 'ALL') params.set('placementStatus', placementStatus);
    } else if (activeKpi === 'avgAttendance') {
      if (attendanceCategory !== 'ALL') params.set('attendanceCategory', attendanceCategory);
    } else if (activeKpi === 'avgCgpa') {
      if (cgpaCategory !== 'ALL') params.set('cgpaCategory', cgpaCategory);
    } else if (activeKpi === 'avgProfileScore') {
      if (profileScoreCategory !== 'ALL') params.set('profileScoreCategory', profileScoreCategory);
    } else if (activeKpi === 'studentsWithBacklogs') {
      if (backlogsCategory !== 'ALL') params.set('backlogsCategory', backlogsCategory);
    }

    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    params.set('export', 'true');
    const res = await apiFetch(`/analytics/institution/kpi-students?${params.toString()}`);
    const rows = (res.students || []).map((student: StudentRow) => ({
      'Roll Number': student.rollNumber,
      'Student Name': student.name,
      'Department': student.department,
      'Academic Year': student.year,
      'Section': student.section,
      'Semester': student.semester,
      CGPA: student.cgpa,
      Attendance: `${student.attendancePct}%`,
      'Profile Score': student.profileScore,
      Backlogs: student.activeBacklogs,
      'Placement Status': student.isPlaced ? `Placed (${student.placedCompany})` : 'Not Placed',
    }));

    const fileName = `${(selectedDepartment?.department || activeKpi).replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
      return;
    }

    const blob = new Blob([buildCsv(rows)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${fileName}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    void fetchSummary();
  }, [filters.year, filters.branch]);

  useEffect(() => {
    if (!isOpen) return;
    if (modalMode === 'explorer') {
      if (step === 'departments') void fetchDepartments(activeKpi);
      if (step === 'departmentDetails' && selectedDepartment) void fetchDepartmentDetails(selectedDepartment.department);
      if (step === 'students') void fetchStudents(page);
      if (step === 'profile' && selectedStudent) void fetchStudentProfile(selectedStudent.studentId);
    } else {
      if (step === 'profile' && selectedStudent) void fetchStudentProfile(selectedStudent.studentId);
      else void fetchStudents(page);
    }
  }, [filters.year, filters.branch, isOpen, step, activeKpi, modalMode]);

  // Dynamically re-fetch when metric filters change
  useEffect(() => {
    if (!isOpen || modalMode !== 'analytics' || step === 'profile') return;
    const timer = window.setTimeout(() => {
      void Promise.all([
        fetchDepartments(activeKpi),
        fetchDepartmentDetails(selectedDepartment?.department || ''),
        fetchStudents(1),
      ]);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    selectedSection,
    attendanceCategory,
    cgpaCategory,
    profileScoreCategory,
    backlogsCategory,
    studentSearch,
    rollSearch,
    placementStatus,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    if (!isOpen || step === 'profile') return;
    void fetchStudents(page);
  }, [page]);

  const breadcrumbItems = [
    { label: 'KPI Summary', active: step === 'departments' || !isOpen, onClick: () => { if (isOpen) setStep('departments'); } },
    { label: 'Department List', active: step === 'departments', onClick: () => setStep('departments') },
    { label: 'Department Details', active: step === 'departmentDetails', onClick: () => setStep('departmentDetails') },
    { label: 'Student List', active: step === 'students', onClick: () => setStep('students') },
    { label: 'Student Profile', active: step === 'profile', onClick: () => setStep('profile') },
  ];

  const summaryCards = ([
    { key: 'totalStudents', value: summary?.totalStudents || 0 },
    { key: 'avgCgpa', value: summary?.avgCgpa || 0 },
    { key: 'avgAttendance', value: summary?.avgAttendance || 0 },
    { key: 'avgProfileScore', value: summary?.avgProfileScore || 0 },
    { key: 'studentsWithBacklogs', value: summary?.studentsWithBacklogs || 0 },
  ] as Array<{ key: KpiKey; value: number }>);

  const selectedDepartmentDetails = departmentDetails.department;

  // Department-wise Bar Chart Data (Graph 1)
  const deptChartData = departments.map((d) => ({
    department: d.department,
    label: d.department.length > 18 ? d.department.split(' ').map((w) => w[0]).join('') : d.department,
    value: activeKpi === 'avgCgpa' ? d.avgCgpa
         : activeKpi === 'avgAttendance' ? d.avgAttendance
         : activeKpi === 'avgProfileScore' ? d.avgProfileScore
         : activeKpi === 'studentsWithBacklogs' ? d.studentsWithBacklogs
         : d.totalStudents,
    raw: d,
  }));

  // Year-wise Bar Chart Data for Selected Department (Graph 2)
  const yearChartData = (departmentDetails.yearWise || []).map((y) => ({
    year: y.year,
    label: y.label,
    value: activeKpi === 'avgCgpa' ? y.avgCgpa
         : activeKpi === 'avgAttendance' ? y.avgAttendance
         : activeKpi === 'avgProfileScore' ? y.avgProfileScore
         : activeKpi === 'studentsWithBacklogs' ? y.studentsWithBacklogs
         : y.totalStudents,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Executive Institution Summary</h2>
          <p className="text-[10px] text-slate-500">Power BI/Tableau analytics experience. Click any KPI card to open its dedicated analytics module.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void openExplorer()}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Building2 className="h-4 w-4" /> Department Explorer
          </button>
          {(filters.year || filters.branch) && (
            <div className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1">
              Filters: {filters.year || 'All'} / {filters.branch || 'All'}
            </div>
          )}
        </div>
      </div>

      {summaryError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">{summaryError}</div>}

      {/* Executive KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {summaryCards.map((item) => {
          const meta = KPI_META[item.key];
          const Icon = meta.icon;
          const isActive = isOpen && modalMode === 'analytics' && activeKpi === item.key;
          return (
            <button
              key={item.key}
              onClick={() => void openKpi(item.key)}
              className={`group w-full text-left h-full min-h-[150px] rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all p-4 flex flex-col justify-between ${meta.accent} ${isActive ? 'ring-2 ring-primary/30' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${meta.iconBg}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900 leading-none">{summaryLoading ? '—' : formatKpiValue(item.key, item.value)}</div>
                    <div className="mt-1 text-xs font-bold text-slate-700">{meta.title}</div>
                    <div className="mt-1 text-[10px] text-slate-500">{meta.subtitle}</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            </button>
          );
        })}
      </div>

      {summaryLoading && <div className="text-[10px] text-slate-400 font-medium">Loading live KPI values...</div>}

      {/* Main Executive Analytics Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.985 }}
            className="w-full max-w-7xl h-[92vh] bg-slate-50 rounded-3xl border border-white shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Executive Top Header Bar */}
            <div className="bg-white border-b border-slate-200 px-5 md:px-6 py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {modalMode === 'explorer' ? (
                    <>
                      <button
                        onClick={() => { setStep('departments'); setSelectedDepartment(null); setSelectedYear(null); }}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                          step === 'departments'
                            ? 'bg-primary text-white border border-primary shadow-sm'
                            : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        Department Explorer
                      </button>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-500 border-l border-slate-200 pl-3">
                        {breadcrumbItems.map((item, index) => (
                          <React.Fragment key={item.label}>
                            <button
                              onClick={item.onClick}
                              className={`transition-colors ${item.active ? 'text-slate-900 font-black' : 'hover:text-primary'}`}
                            >
                              {item.label}
                            </button>
                            {index < breadcrumbItems.length - 1 && <span className="text-slate-300">/</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
                      {step === 'profile' ? (
                        <button
                          onClick={() => setStep('departments')}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all border border-slate-200"
                        >
                          ← Back to Analytics Module
                        </button>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${KPI_META[activeKpi].iconBg}`}>
                            {React.createElement(KPI_META[activeKpi].icon, { className: 'h-4.5 w-4.5' })}
                          </span>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Power BI / Tableau Executive Module</span>
                            <h3 className="text-base font-black text-slate-900 leading-tight">
                              {KPI_META[activeKpi].title} Analytics Dashboard
                            </h3>
                          </div>
                        </div>
                      )}

                      {(selectedDepartment || selectedYear || selectedSection !== 'ALL' || attendanceCategory !== 'ALL' || cgpaCategory !== 'ALL' || profileScoreCategory !== 'ALL' || backlogsCategory !== 'ALL_BACKLOGS' || studentSearch || rollSearch) && step !== 'profile' && (
                        <button
                          onClick={() => void handleClearAnalyticsFilters()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all border border-rose-200"
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Clear Filters
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <button onClick={closeModal} className="h-9 w-9 rounded-full border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Active Filter Pills Bar */}
              {modalMode === 'analytics' && step !== 'profile' && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold text-slate-500 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Filter className="h-3 w-3" /> Active Filters:
                    </span>
                    {selectedDepartment ? (
                      <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-0.5 font-bold">
                        Dept: {selectedDepartment.department}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-200/70 text-slate-700 px-3 py-0.5">Dept: All</span>
                    )}

                    {selectedYear ? (
                      <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-0.5 font-bold">
                        Year: {selectedYear === 1 ? '1st' : selectedYear === 2 ? '2nd' : selectedYear === 3 ? '3rd' : '4th'} Year
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-200/70 text-slate-700 px-3 py-0.5">Year: All</span>
                    )}

                    {selectedSection !== 'ALL' && (
                      <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-0.5 font-bold">
                        Section: {selectedSection}
                      </span>
                    )}

                    {activeKpi === 'avgAttendance' && attendanceCategory !== 'ALL' && (
                      <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-0.5 font-bold">
                        Attendance: {attendanceCategory === 'LT75' ? '< 75%' : attendanceCategory === '75-80' ? '75% - 80%' : attendanceCategory === '80-90' ? '80% - 90%' : '> 90%'}
                      </span>
                    )}

                    {activeKpi === 'avgCgpa' && cgpaCategory !== 'ALL' && (
                      <span className="rounded-full bg-violet-100 text-violet-800 border border-violet-200 px-3 py-0.5 font-bold">
                        CGPA Range: {cgpaCategory === 'LT6' ? '< 6.0' : cgpaCategory === '6-7' ? '6.0 - 7.0' : cgpaCategory === '7-8' ? '7.0 - 8.0' : '> 8.0'}
                      </span>
                    )}

                    {activeKpi === 'avgProfileScore' && profileScoreCategory !== 'ALL' && (
                      <span className="rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-3 py-0.5 font-bold">
                        Profile Score: {profileScoreCategory === 'LT50' ? '< 50' : profileScoreCategory === '50-70' ? '50 - 70' : profileScoreCategory === '70-85' ? '70 - 85' : '> 85'}
                      </span>
                    )}

                    {activeKpi === 'studentsWithBacklogs' && backlogsCategory !== 'ALL_BACKLOGS' && (
                      <span className="rounded-full bg-rose-100 text-rose-800 border border-rose-200 px-3 py-0.5 font-bold">
                        Backlogs: {backlogsCategory === '1' ? '1 Backlog' : backlogsCategory === '2-3' ? '2-3 Backlogs' : '4+ Backlogs'}
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-400 font-medium italic">
                    Click Graph 1 department bar to filter Graph 2 & Student Records dynamically
                  </div>
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden">
              {/* STUDENT PROFILE VIEW (Redirected from Profile Button) */}
              {step === 'profile' && studentProfile && selectedStudent ? (
                <div className="h-full overflow-y-auto p-5 md:p-6">
                  {profileLoading ? (
                    <div className="flex h-full items-center justify-center py-24 text-xs text-slate-500">Loading student profile...</div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                      <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                          <div>
                            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Student Profile Explorer</div>
                            <h4 className="mt-1 text-xl font-black text-slate-900">{studentProfile.student.name}</h4>
                            <p className="mt-1 text-[10px] text-slate-500">Roll Number: {studentProfile.student.rollNumber}</p>
                          </div>
                          <button onClick={() => setStep('departments')} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-white">
                            ← Back to Results
                          </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            ['Department', studentProfile.student.department || 'N/A'],
                            ['Year / Section', `Year ${studentProfile.student.year || '-'} / Sec ${studentProfile.student.section || 'A'}`],
                            ['CGPA', formatDecimal(studentProfile.student.cgpa, 2)],
                            ['Attendance', `${formatDecimal(studentProfile.student.attendancePct, 1)}%`],
                            ['Profile Score', formatDecimal(studentProfile.student.profileScore, 2)],
                            ['Active Backlogs', studentProfile.student.activeBacklogs || 0],
                            ['Profile Completion', `${studentProfile.student.profileCompletion || 0}%`],
                            ['Placement Ready', studentProfile.student.placementReady ? 'Yes' : 'No'],
                          ].map(([label, value]) => (
                            <div key={String(label)} className="rounded-xl bg-slate-50 p-4">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
                              <div className="mt-1 text-sm font-black text-slate-900">{value}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                        <div className="text-xs font-black uppercase tracking-widest text-slate-400">Academic Breakdown</div>
                        <div className="space-y-3">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Skills Identified</div>
                            <div className="mt-1 text-base font-black text-slate-900">{studentProfile.student.skillsCount || 0} Skills</div>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Placement Status</div>
                            <div className="mt-1 text-base font-black text-slate-900">
                              {studentProfile.student.isPlaced ? `Placed (${studentProfile.student.placedCompany})` : 'Not Placed'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* INDEPENDENT METRIC ANALYTICS MODULES MODE */}
                  {modalMode === 'analytics' && (
                    <div className="h-full overflow-y-auto p-5 md:p-6 space-y-6">
                      {/* SIDE-BY-SIDE DYNAMIC DRILL-DOWN CHARTS (Graph 1 & Graph 2) */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Graph 1: Department-wise Bar Chart */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Graph 1 • Department Analysis</span>
                              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Department-wise {KPI_META[activeKpi].title}</h4>
                            </div>
                            <span className="text-[9px] text-slate-400 font-semibold italic">Click bar to select Dept</span>
                          </div>
                          <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={deptChartData}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                onClick={(e: any) => {
                                  if (e && e.activePayload && e.activePayload[0] && e.activePayload[0].payload) {
                                    void handleSelectDepartmentAnalytics(e.activePayload[0].payload.raw);
                                  }
                                }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
                                <YAxis stroke="#64748b" fontSize={10} />
                                <Tooltip
                                  formatter={(val: any) => [formatKpiValue(activeKpi, Number(val)), KPI_META[activeKpi].title]}
                                  labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.department || label}
                                  contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="value" fill={KPI_META[activeKpi].barColor} radius={[6, 6, 0, 0]} className="cursor-pointer">
                                  {deptChartData.map((entry, index) => (
                                    <Cell
                                      key={`cell-dept-${index}`}
                                      fill={selectedDepartment?.department === entry.department ? '#3b82f6' : KPI_META[activeKpi].barColor}
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Graph 2: Year-wise Bar Chart for Selected Department */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Graph 2 • Year Breakdown ({selectedDepartment ? selectedDepartment.department : 'All Departments'})
                              </span>
                              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Year-wise {KPI_META[activeKpi].title}</h4>
                            </div>
                            <span className="text-[9px] text-slate-400 font-semibold italic">Click bar to filter Year</span>
                          </div>
                          <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={yearChartData}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                onClick={(e: any) => {
                                  if (e && e.activePayload && e.activePayload[0] && e.activePayload[0].payload) {
                                    void handleSelectYearAnalytics(e.activePayload[0].payload.year);
                                  }
                                }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
                                <YAxis stroke="#64748b" fontSize={10} />
                                <Tooltip
                                  formatter={(val: any) => [formatKpiValue(activeKpi, Number(val)), KPI_META[activeKpi].title]}
                                  contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="value" fill={KPI_META[activeKpi].barColor} radius={[6, 6, 0, 0]} className="cursor-pointer">
                                  {yearChartData.map((entry, index) => (
                                    <Cell
                                      key={`cell-year-${index}`}
                                      fill={selectedYear === entry.year ? '#3b82f6' : KPI_META[activeKpi].barColor}
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* METRIC-SPECIFIC MODULE FILTERS BAR (POSITIONED AFTER GRAPHS, ABOVE FILTERED RESULTS) */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                        <div className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                          <span>{KPI_META[activeKpi].title} Module Filters</span>
                          <span className="text-[10px] text-slate-400 font-medium italic">Specific to {KPI_META[activeKpi].title} metric</span>
                        </div>

                        {/* MODULE 1: TOTAL STUDENTS FILTERS */}
                        {activeKpi === 'totalStudents' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
                            <div className="relative xl:col-span-2">
                              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                              <input
                                value={studentSearch}
                                onChange={(e) => { setStudentSearch(e.target.value); setPage(1); }}
                                placeholder="Search by Student Name"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs text-slate-800 focus:border-primary focus:outline-none"
                              />
                            </div>
                            <div className="relative">
                              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                              <input
                                value={rollSearch}
                                onChange={(e) => { setRollSearch(e.target.value); setPage(1); }}
                                placeholder="Search by Roll Number"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs text-slate-800 focus:border-primary focus:outline-none"
                              />
                            </div>
                            <select
                              value={selectedDepartment?.department || ''}
                              onChange={(e) => {
                                const deptObj = departments.find((d) => d.department === e.target.value) || null;
                                void handleSelectDepartmentAnalytics(deptObj as any);
                              }}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none"
                            >
                              <option value="">All Departments</option>
                              {departments.map((d) => (
                                <option key={d.department} value={d.department}>{d.department}</option>
                              ))}
                            </select>
                            <select
                              value={selectedYear || ''}
                              onChange={(e) => {
                                const y = e.target.value ? Number(e.target.value) : null;
                                void handleSelectYearAnalytics(y as any);
                              }}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none"
                            >
                              <option value="">All Academic Years</option>
                              <option value="1">1st Year</option>
                              <option value="2">2nd Year</option>
                              <option value="3">3rd Year</option>
                              <option value="4">4th Year</option>
                            </select>
                            <select
                              value={selectedSection}
                              onChange={(e) => { setSelectedSection(e.target.value); setPage(1); }}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none"
                            >
                              <option value="ALL">All Sections</option>
                              <option value="A">Section A</option>
                              <option value="B">Section B</option>
                              <option value="C">Section C</option>
                            </select>
                          </div>
                        )}

                        {/* MODULE 2: AVERAGE ATTENDANCE FILTERS */}
                        {activeKpi === 'avgAttendance' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                            <select
                              value={selectedDepartment?.department || ''}
                              onChange={(e) => {
                                const deptObj = departments.find((d) => d.department === e.target.value) || null;
                                void handleSelectDepartmentAnalytics(deptObj as any);
                              }}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none"
                            >
                              <option value="">All Departments</option>
                              {departments.map((d) => (
                                <option key={d.department} value={d.department}>{d.department}</option>
                              ))}
                            </select>
                            <select
                              value={selectedYear || ''}
                              onChange={(e) => {
                                const y = e.target.value ? Number(e.target.value) : null;
                                void handleSelectYearAnalytics(y as any);
                              }}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none"
                            >
                              <option value="">All Academic Years</option>
                              <option value="1">1st Year</option>
                              <option value="2">2nd Year</option>
                              <option value="3">3rd Year</option>
                              <option value="4">4th Year</option>
                            </select>
                            <select
                              value={selectedSection}
                              onChange={(e) => { setSelectedSection(e.target.value); setPage(1); }}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none"
                            >
                              <option value="ALL">All Sections</option>
                              <option value="A">Section A</option>
                              <option value="B">Section B</option>
                              <option value="C">Section C</option>
                            </select>
                            <select
                              value={attendanceCategory}
                              onChange={(e) => { setAttendanceCategory(e.target.value); setPage(1); }}
                              className="rounded-xl border border-slate-200 bg-emerald-50 border-emerald-200 px-3 py-2.5 text-xs font-bold text-emerald-900 focus:border-emerald-500 focus:outline-none"
                            >
                              <option value="ALL">Attendance Category: All</option>
                              <option value="LT75">Less than 75% (&lt; 75%)</option>
                              <option value="75-80">Between 75% and 80%</option>
                              <option value="80-90">Between 80% and 90%</option>
                              <option value="GT90">Greater than 90% (&gt; 90%)</option>
                            </select>
                          </div>
                        )}

                        {/* MODULE 3: AVERAGE CGPA FILTERS */}
                        {activeKpi === 'avgCgpa' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                            <select
                              value={selectedDepartment?.department || ''}
                              onChange={(e) => {
                                const deptObj = departments.find((d) => d.department === e.target.value) || null;
                                void handleSelectDepartmentAnalytics(deptObj as any);
                              }}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none"
                            >
                              <option value="">All Departments</option>
                              {departments.map((d) => (
                                <option key={d.department} value={d.department}>{d.department}</option>
                              ))}
                            </select>
                            <select
                              value={selectedYear || ''}
                              onChange={(e) => {
                                const y = e.target.value ? Number(e.target.value) : null;
                                void handleSelectYearAnalytics(y as any);
                              }}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none"
                            >
                              <option value="">All Academic Years</option>
                              <option value="1">1st Year</option>
                              <option value="2">2nd Year</option>
                              <option value="3">3rd Year</option>
                              <option value="4">4th Year</option>
                            </select>
                            <select
                              value={selectedSection}
                              onChange={(e) => { setSelectedSection(e.target.value); setPage(1); }}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none"
                            >
                              <option value="ALL">All Sections</option>
                              <option value="A">Section A</option>
                              <option value="B">Section B</option>
                              <option value="C">Section C</option>
                            </select>
                            <select
                              value={cgpaCategory}
                              onChange={(e) => { setCgpaCategory(e.target.value); setPage(1); }}
                              className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs font-bold text-violet-900 focus:border-violet-500 focus:outline-none"
                            >
                              <option value="ALL">CGPA Category: All</option>
                              <option value="LT6">Less than 6.0 (&lt; 6.0)</option>
                              <option value="6-7">Between 6.0 and 7.0</option>
                              <option value="7-8">Between 7.0 and 8.0</option>
                              <option value="GT8">Greater than 8.0 (&gt; 8.0)</option>
                            </select>
                          </div>
                        )}

                        {/* MODULE 4: AVERAGE PROFILE SCORE FILTERS */}
                        {activeKpi === 'avgProfileScore' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                            <select
                              value={selectedDepartment?.department || ''}
                              onChange={(e) => {
                                const deptObj = departments.find((d) => d.department === e.target.value) || null;
                                void handleSelectDepartmentAnalytics(deptObj as any);
                              }}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none"
                            >
                              <option value="">All Departments</option>
                              {departments.map((d) => (
                                <option key={d.department} value={d.department}>{d.department}</option>
                              ))}
                            </select>
                            <select
                              value={selectedYear || ''}
                              onChange={(e) => {
                                const y = e.target.value ? Number(e.target.value) : null;
                                void handleSelectYearAnalytics(y as any);
                              }}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none"
                            >
                              <option value="">All Academic Years</option>
                              <option value="1">1st Year</option>
                              <option value="2">2nd Year</option>
                              <option value="3">3rd Year</option>
                              <option value="4">4th Year</option>
                            </select>
                            <select
                              value={selectedSection}
                              onChange={(e) => { setSelectedSection(e.target.value); setPage(1); }}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none"
                            >
                              <option value="ALL">All Sections</option>
                              <option value="A">Section A</option>
                              <option value="B">Section B</option>
                              <option value="C">Section C</option>
                            </select>
                            <select
                              value={profileScoreCategory}
                              onChange={(e) => { setProfileScoreCategory(e.target.value); setPage(1); }}
                              className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-900 focus:border-amber-500 focus:outline-none"
                            >
                              <option value="ALL">Profile Score Range: All</option>
                              <option value="LT50">Less than 50 (&lt; 50)</option>
                              <option value="50-70">Between 50 and 70</option>
                              <option value="70-85">Between 70 and 85</option>
                              <option value="GT85">Greater than 85 (&gt; 85)</option>
                            </select>
                          </div>
                        )}

                        {/* MODULE 5: STUDENTS WITH BACKLOGS FILTERS */}
                        {activeKpi === 'studentsWithBacklogs' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                            <select
                              value={selectedDepartment?.department || ''}
                              onChange={(e) => {
                                const deptObj = departments.find((d) => d.department === e.target.value) || null;
                                void handleSelectDepartmentAnalytics(deptObj as any);
                              }}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none"
                            >
                              <option value="">All Departments</option>
                              {departments.map((d) => (
                                <option key={d.department} value={d.department}>{d.department}</option>
                              ))}
                            </select>
                            <select
                              value={selectedYear || ''}
                              onChange={(e) => {
                                const y = e.target.value ? Number(e.target.value) : null;
                                void handleSelectYearAnalytics(y as any);
                              }}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none"
                            >
                              <option value="">All Academic Years</option>
                              <option value="1">1st Year</option>
                              <option value="2">2nd Year</option>
                              <option value="3">3rd Year</option>
                              <option value="4">4th Year</option>
                            </select>
                            <select
                              value={selectedSection}
                              onChange={(e) => { setSelectedSection(e.target.value); setPage(1); }}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none"
                            >
                              <option value="ALL">All Sections</option>
                              <option value="A">Section A</option>
                              <option value="B">Section B</option>
                              <option value="C">Section C</option>
                            </select>
                            <select
                              value={backlogsCategory}
                              onChange={(e) => { setBacklogsCategory(e.target.value); setPage(1); }}
                              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-900 focus:border-rose-500 focus:outline-none"
                            >
                              <option value="ALL_BACKLOGS">All Backlog Students</option>
                              <option value="1">1 Backlog</option>
                              <option value="2-3">2-3 Backlogs</option>
                              <option value="4+">4+ Backlogs</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* FILTERED RESULTS SUMMARY COUNT & STUDENT RECORDS */}
                      <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filtered Results</div>
                            <div className="text-xl font-black text-slate-900 flex items-center gap-3">
                              <span>Total Matching Students:</span>
                              <span className="rounded-xl bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-lg font-black">
                                {studentLoading ? '—' : `${totalStudents} Students`}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(selectedDepartment || selectedYear || selectedSection !== 'ALL') && (
                              <button onClick={() => void handleClearAnalyticsFilters()} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all">
                                Reset Filters
                              </button>
                            )}
                            <button onClick={() => void exportStudents('xlsx')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                              <Download className="h-4 w-4" /> Export Excel
                            </button>
                            <button onClick={() => void exportStudents('csv')} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">
                              <FileText className="h-4 w-4" /> Export CSV
                            </button>
                          </div>
                        </div>

                        {/* METRIC-TAILORED STUDENT RECORDS TABLE */}
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[1000px] text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                                  <th className="px-4 py-3 font-bold">Roll Number</th>
                                  <th className="px-4 py-3 font-bold">Student Name</th>
                                  <th className="px-4 py-3 font-bold">Department</th>
                                  <th className="px-4 py-3 font-bold">Academic Year</th>
                                  <th className="px-4 py-3 font-bold">Section</th>

                                  {/* Metric specific columns */}
                                  {activeKpi === 'avgAttendance' && <th className="px-4 py-3 font-bold">Attendance %</th>}
                                  {activeKpi === 'avgAttendance' && <th className="px-4 py-3 font-bold">Attendance Status</th>}

                                  {activeKpi === 'avgCgpa' && <th className="px-4 py-3 font-bold">CGPA</th>}
                                  {activeKpi === 'avgCgpa' && <th className="px-4 py-3 font-bold">Performance Category</th>}

                                  {activeKpi === 'avgProfileScore' && <th className="px-4 py-3 font-bold">Profile Score</th>}
                                  {activeKpi === 'avgProfileScore' && <th className="px-4 py-3 font-bold">Profile Completion</th>}

                                  {activeKpi === 'studentsWithBacklogs' && <th className="px-4 py-3 font-bold">Active Backlogs</th>}
                                  {activeKpi === 'studentsWithBacklogs' && <th className="px-4 py-3 font-bold">Highest Backlogs</th>}

                                  {activeKpi === 'totalStudents' && <th className="px-4 py-3 font-bold">CGPA</th>}
                                  {activeKpi === 'totalStudents' && <th className="px-4 py-3 font-bold">Attendance</th>}
                                  {activeKpi === 'totalStudents' && <th className="px-4 py-3 font-bold">Profile Score</th>}
                                  {activeKpi === 'totalStudents' && <th className="px-4 py-3 font-bold">Backlogs</th>}
                                  {activeKpi === 'totalStudents' && <th className="px-4 py-3 font-bold">Placement Status</th>}

                                  <th className="px-4 py-3 font-bold text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700">
                                {studentLoading ? (
                                  <tr>
                                    <td colSpan={activeKpi === 'totalStudents' ? 11 : 8} className="px-4 py-10 text-center text-slate-500">Loading filtered student records...</td>
                                  </tr>
                                ) : students.length === 0 ? (
                                  <tr>
                                    <td colSpan={activeKpi === 'totalStudents' ? 11 : 8} className="px-4 py-10 text-center text-slate-500">No students match the selected metric filters.</td>
                                  </tr>
                                ) : (
                                  students.map((student) => (
                                    <tr key={student.studentId} className="hover:bg-slate-50/80 transition-colors">
                                      <td className="px-4 py-3 font-bold text-slate-900">{student.rollNumber}</td>
                                      <td className="px-4 py-3 font-semibold text-slate-900">{student.name}</td>
                                      <td className="px-4 py-3 text-slate-600 font-semibold">{student.department}</td>
                                      <td className="px-4 py-3 font-bold text-slate-800">Year {student.year}</td>
                                      <td className="px-4 py-3 font-semibold text-slate-700">Sec {student.section}</td>

                                      {/* Attendance KPI metric columns */}
                                      {activeKpi === 'avgAttendance' && (
                                        <td className="px-4 py-3 font-black text-slate-900">{formatDecimal(student.attendancePct, 1)}%</td>
                                      )}
                                      {activeKpi === 'avgAttendance' && (
                                        <td className="px-4 py-3">
                                          {student.attendancePct < 75 ? (
                                            <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-[10px] font-bold text-rose-700">&lt; 75% (Shortage)</span>
                                          ) : student.attendancePct <= 80 ? (
                                            <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[10px] font-bold text-amber-700">75% - 80% (Moderate)</span>
                                          ) : student.attendancePct <= 90 ? (
                                            <span className="rounded-full bg-sky-50 border border-sky-200 px-2.5 py-1 text-[10px] font-bold text-sky-700">80% - 90% (Good)</span>
                                          ) : (
                                            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-bold text-emerald-700">&gt; 90% (Excellent)</span>
                                          )}
                                        </td>
                                      )}

                                      {/* CGPA KPI metric columns */}
                                      {activeKpi === 'avgCgpa' && (
                                        <td className="px-4 py-3 font-black text-slate-900">{formatDecimal(student.cgpa, 2)}</td>
                                      )}
                                      {activeKpi === 'avgCgpa' && (
                                        <td className="px-4 py-3">
                                          {student.cgpa < 6.0 ? (
                                            <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-[10px] font-bold text-rose-700">&lt; 6.0 (Needs Improvement)</span>
                                          ) : student.cgpa <= 7.0 ? (
                                            <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[10px] font-bold text-amber-700">6.0 - 7.0 (Average)</span>
                                          ) : student.cgpa <= 8.0 ? (
                                            <span className="rounded-full bg-sky-50 border border-sky-200 px-2.5 py-1 text-[10px] font-bold text-sky-700">7.0 - 8.0 (Good)</span>
                                          ) : (
                                            <span className="rounded-full bg-violet-50 border border-violet-200 px-2.5 py-1 text-[10px] font-bold text-violet-700">&gt; 8.0 (Excellent)</span>
                                          )}
                                        </td>
                                      )}

                                      {/* Profile Score KPI metric columns */}
                                      {activeKpi === 'avgProfileScore' && (
                                        <td className="px-4 py-3 font-black text-slate-900">{formatDecimal(student.profileScore, 2)}</td>
                                      )}
                                      {activeKpi === 'avgProfileScore' && (
                                        <td className="px-4 py-3 font-semibold text-slate-700">{student.profileCompletion}% Complete</td>
                                      )}

                                      {/* Backlogs KPI metric columns */}
                                      {activeKpi === 'studentsWithBacklogs' && (
                                        <td className="px-4 py-3 font-black text-rose-700">{student.activeBacklogs} Active</td>
                                      )}
                                      {activeKpi === 'studentsWithBacklogs' && (
                                        <td className="px-4 py-3 font-semibold text-slate-700">{student.highestBacklogs} Max</td>
                                      )}

                                      {/* Total Students KPI metric columns */}
                                      {activeKpi === 'totalStudents' && (
                                        <>
                                          <td className="px-4 py-3 font-bold text-slate-900">{formatDecimal(student.cgpa, 2)}</td>
                                          <td className="px-4 py-3 font-bold text-slate-900">{formatDecimal(student.attendancePct, 1)}%</td>
                                          <td className="px-4 py-3 font-bold text-slate-900">{formatDecimal(student.profileScore, 2)}</td>
                                          <td className="px-4 py-3 font-bold text-slate-900">{student.activeBacklogs}</td>
                                          <td className="px-4 py-3">
                                            {student.isPlaced ? (
                                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Placed</span>
                                            ) : (
                                              <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">Not Placed</span>
                                            )}
                                          </td>
                                        </>
                                      )}

                                      <td className="px-4 py-3 text-right">
                                        <button onClick={() => void openProfile(student)} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-bold text-white hover:bg-slate-800">
                                          <Eye className="h-3.5 w-3.5" /> Profile
                                        </button>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                          {/* Pagination Controls */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-[10px] font-semibold text-slate-500">
                            <div>
                              Showing {students.length > 0 ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, totalStudents)} of {totalStudents} matching students
                            </div>
                            <div className="flex items-center gap-2">
                              <button disabled={page <= 1 || studentLoading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                                Previous
                              </button>
                              <span className="font-bold text-slate-800">Page {page} of {Math.ceil(totalStudents / pageSize) || 1}</span>
                              <button disabled={page * pageSize >= totalStudents || studentLoading} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                                Next
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DEPARTMENT EXPLORER WORKFLOW MODE */}
                  {modalMode === 'explorer' && (
                    <div className="h-full overflow-y-auto">
                      {step === 'departments' && (
                        <div className="h-full p-5 md:p-6 space-y-6">
                          {departmentLoading ? (
                            <div className="flex h-full items-center justify-center py-24 text-xs text-slate-500">Loading department summaries...</div>
                          ) : departments.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-xs text-slate-500">No department data found.</div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                              {departments.map((department) => (
                                <button
                                  key={department.department}
                                  onClick={() => void openDepartmentDetails(department)}
                                  className="text-left rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all p-4 flex flex-col gap-4 group hover:border-primary/40"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">{department.department}</div>
                                      <div className="mt-1 text-[10px] text-slate-500 font-medium">Click to view Department Details</div>
                                    </div>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">{department.totalStudents} Students</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                                    <div className="rounded-xl bg-slate-50 p-3">
                                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Average CGPA</div>
                                      <div className="mt-1 text-base font-black text-slate-900">{formatDecimal(department.avgCgpa, 2)}</div>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-3">
                                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Average Attendance</div>
                                      <div className="mt-1 text-base font-black text-slate-900">{formatDecimal(department.avgAttendance, 1)}%</div>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-3">
                                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Average Profile Score</div>
                                      <div className="mt-1 text-base font-black text-slate-900">{formatDecimal(department.avgProfileScore, 2)}</div>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-3">
                                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Backlogs</div>
                                      <div className="mt-1 text-base font-black text-slate-900">{department.studentsWithBacklogs}</div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {step === 'departmentDetails' && selectedDepartmentDetails && (
                        <div className="h-full p-5 md:p-6 space-y-6">
                          {departmentLoading ? (
                            <div className="flex h-full items-center justify-center py-24 text-xs text-slate-500">Loading department details...</div>
                          ) : (
                            <>
                              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Department Overview ({selectedDepartmentDetails.department})</span>
                                    <h4 className="text-base font-black text-slate-900">Year-wise {KPI_META[activeKpi].title}</h4>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400 italic">Click any year bar to view Student List for that Year</span>
                                </div>

                                <div className="h-56 w-full pt-2">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                      data={yearChartData}
                                      margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                                      onClick={(e: any) => {
                                        if (e && e.activePayload && e.activePayload[0] && e.activePayload[0].payload) {
                                          void openStudentsForYear(e.activePayload[0].payload.year);
                                        }
                                      }}
                                    >
                                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                      <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                                      <YAxis stroke="#64748b" fontSize={10} />
                                      <Tooltip
                                        formatter={(val: any) => [formatKpiValue(activeKpi, Number(val)), KPI_META[activeKpi].title]}
                                        contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                                      />
                                      <Bar dataKey="value" fill={KPI_META[activeKpi].barColor} radius={[6, 6, 0, 0]} className="cursor-pointer">
                                        {yearChartData.map((_, index) => (
                                          <Cell key={`cell-year-exp-${index}`} fill={KPI_META[activeKpi].barColor} />
                                        ))}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                  {(departmentDetails.yearWise || []).map((y) => (
                                    <button
                                      key={y.year}
                                      onClick={() => void openStudentsForYear(y.year)}
                                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-primary transition-all text-left group"
                                    >
                                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-primary">{y.label}</div>
                                      <div className="mt-1 text-sm font-black text-slate-900">
                                        {formatKpiValue(activeKpi, activeKpi === 'avgCgpa' ? y.avgCgpa : activeKpi === 'avgAttendance' ? y.avgAttendance : activeKpi === 'avgProfileScore' ? y.avgProfileScore : activeKpi === 'studentsWithBacklogs' ? y.studentsWithBacklogs : y.totalStudents)}
                                      </div>
                                      <div className="text-[9px] text-slate-500 font-semibold">{y.totalStudents} Students</div>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                                <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                                    <div>
                                      <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Department Details</div>
                                      <h4 className="mt-1 text-xl font-black text-slate-900">{selectedDepartmentDetails.department}</h4>
                                    </div>
                                    <button onClick={() => void openStudents()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary/95">
                                      View All Students <ChevronRight className="h-4 w-4" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {[
                                      ['Total Students', selectedDepartmentDetails.totalStudents],
                                      ['Male Students', selectedDepartmentDetails.maleStudents],
                                      ['Female Students', selectedDepartmentDetails.femaleStudents],
                                      ['Average CGPA', formatDecimal(selectedDepartmentDetails.avgCgpa, 2)],
                                      ['Average Attendance', `${formatDecimal(selectedDepartmentDetails.avgAttendance, 1)}%`],
                                      ['Average Profile Score', formatDecimal(selectedDepartmentDetails.avgProfileScore, 2)],
                                      ['Students with Backlogs', selectedDepartmentDetails.studentsWithBacklogs],
                                      ['Placement Ready Students', selectedDepartmentDetails.placementReadyStudents],
                                      ['Students Requiring Attention', selectedDepartmentDetails.studentsRequiringAttention],
                                    ].map(([label, value]) => (
                                      <div key={String(label)} className="rounded-xl bg-slate-50 p-4">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
                                        <div className="mt-1 text-base font-black text-slate-900">{value}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                                  <div className="text-xs font-black uppercase tracking-widest text-slate-400">Top Performer</div>
                                  {selectedDepartmentDetails.topPerformer ? (
                                    <div className="rounded-xl bg-slate-50 p-4 space-y-2">
                                      <div className="text-sm font-black text-slate-900">{selectedDepartmentDetails.topPerformer.name}</div>
                                      <div className="text-[10px] text-slate-500">{selectedDepartmentDetails.topPerformer.rollNumber}</div>
                                      <div className="grid grid-cols-2 gap-3 pt-2 text-[11px]">
                                        <div>
                                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CGPA</div>
                                          <div className="font-black text-slate-900">{formatDecimal(selectedDepartmentDetails.topPerformer.cgpa, 2)}</div>
                                        </div>
                                        <div>
                                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Profile Score</div>
                                          <div className="font-black text-slate-900">{formatDecimal(selectedDepartmentDetails.topPerformer.profileScore, 2)}</div>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-slate-500">No top performer data available.</div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {step === 'students' && (
                        <div className="h-full p-5 md:p-6 space-y-4">
                          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                              <div>
                                <div className="text-xs font-black uppercase tracking-widest text-slate-400">Student List</div>
                                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                  <span>{selectedDepartment?.department || 'All Departments'}</span>
                                  {selectedYear && (
                                    <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-xs font-black">
                                      {selectedYear === 1 ? '1st' : selectedYear === 2 ? '2nd' : selectedYear === 3 ? '3rd' : '4th'} Year
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button onClick={() => void exportStudents('xlsx')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                                  <Download className="h-4 w-4" /> Export Excel
                                </button>
                                <button onClick={() => void exportStudents('csv')} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">
                                  <FileText className="h-4 w-4" /> Export CSV
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[1000px] text-left text-xs">
                                <thead>
                                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                                    <th className="px-4 py-3 font-bold">Roll Number</th>
                                    <th className="px-4 py-3 font-bold">Student Name</th>
                                    <th className="px-4 py-3 font-bold">Department</th>
                                    <th className="px-4 py-3 font-bold">Academic Year</th>
                                    <th className="px-4 py-3 font-bold">Section</th>
                                    <th className="px-4 py-3 font-bold">CGPA</th>
                                    <th className="px-4 py-3 font-bold">Attendance</th>
                                    <th className="px-4 py-3 font-bold">Profile Score</th>
                                    <th className="px-4 py-3 font-bold">Backlogs</th>
                                    <th className="px-4 py-3 font-bold">Placement Status</th>
                                    <th className="px-4 py-3 font-bold text-right">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                  {studentLoading ? (
                                    <tr>
                                      <td colSpan={11} className="px-4 py-10 text-center text-slate-500">Loading students...</td>
                                    </tr>
                                  ) : students.length === 0 ? (
                                    <tr>
                                      <td colSpan={11} className="px-4 py-10 text-center text-slate-500">No students match current filters.</td>
                                    </tr>
                                  ) : (
                                    students.map((student) => (
                                      <tr key={student.studentId} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-4 py-3 font-bold text-slate-900">{student.rollNumber}</td>
                                        <td className="px-4 py-3 font-semibold text-slate-900">{student.name}</td>
                                        <td className="px-4 py-3 text-slate-600 font-semibold">{student.department}</td>
                                        <td className="px-4 py-3 font-bold text-slate-800">Year {student.year}</td>
                                        <td className="px-4 py-3 font-semibold text-slate-700">Sec {student.section}</td>
                                        <td className="px-4 py-3 font-bold text-slate-900">{formatDecimal(student.cgpa, 2)}</td>
                                        <td className="px-4 py-3 font-bold text-slate-900">{formatDecimal(student.attendancePct, 1)}%</td>
                                        <td className="px-4 py-3 font-bold text-slate-900">{formatDecimal(student.profileScore, 2)}</td>
                                        <td className="px-4 py-3 font-bold text-slate-900">{student.activeBacklogs}</td>
                                        <td className="px-4 py-3">
                                          {student.isPlaced ? (
                                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Placed</span>
                                          ) : (
                                            <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">Not Placed</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          <button onClick={() => void openProfile(student)} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-bold text-white hover:bg-slate-800">
                                            <Eye className="h-3.5 w-3.5" /> Profile
                                          </button>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default InstitutionExecutiveKpiSummary;
