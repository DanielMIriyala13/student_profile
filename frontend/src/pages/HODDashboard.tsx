import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import PageSkeleton from '../components/PageSkeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Filter,
  Users,
  Award,
  GraduationCap,
  AlertTriangle,
  Briefcase,
  Shield,
  BookOpen,
  Code,
  FolderClosed,
  Activity,
  Star,
  FileText,
  Target,
  TrendingUp,
  Search,
  ExternalLink,
  X,
  AlertCircle
} from 'lucide-react';
import { apiFetch, getCachedData } from '../utils/api';

// Sparkline SVG generator with gradient area fills
const Sparkline: React.FC<{ color: string; id: string }> = ({ color, id }) => (
  <svg className="w-full h-6 opacity-90 mt-1" viewBox="0 0 100 20" preserveAspectRatio="none">
    <defs>
      <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
        <stop offset="100%" stopColor={color} stopOpacity="0.0" />
      </linearGradient>
    </defs>
    <path
      d="M0,15 Q15,4 30,12 T60,6 T90,14 T100,8"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M0,15 Q15,4 30,12 T60,6 T90,14 T100,8 L100,20 L0,20 Z"
      fill={`url(#grad-${id})`}
    />
  </svg>
);

const HODBatchDistributionChart: React.FC<{ data: any[] }> = React.memo(({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
      <YAxis stroke="#64748b" fontSize={11} />
      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }} />
      <Bar
        dataKey="students"
        fill="#3b82f6"
        radius={[6, 6, 0, 0]}
        isAnimationActive={true}
        animationDuration={2000}
        animationEasing="ease-in-out"
      />
    </BarChart>
  </ResponsiveContainer>
));

const HODAcademicGradeDistributionChart: React.FC<{ data: any[] }> = React.memo(({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
      <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
      <YAxis stroke="#64748b" fontSize={11} />
      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }} />
      <Bar
        dataKey="count"
        fill="#10b981"
        radius={[6, 6, 0, 0]}
        isAnimationActive={true}
        animationDuration={2000}
        animationEasing="ease-in-out"
      />
    </BarChart>
  </ResponsiveContainer>
));

const HODCorrelationScatterChart: React.FC<{ data: any[] }> = React.memo(({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
      <XAxis type="number" dataKey="x" name="Attendance" unit="%" stroke="#64748b" fontSize={11} domain={[50, 100]} />
      <YAxis type="number" dataKey="y" name="CGPA" stroke="#64748b" fontSize={11} domain={[0, 10]} />
      <ZAxis type="number" dataKey="z" range={[60, 60]} />
      <Tooltip 
        cursor={{ strokeDasharray: '3 3' }} 
        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px', fontSize: '11px' }}
        formatter={(value, name) => {
          if (name === "CGPA") return [`${value}`, "CGPA"];
          if (name === "Attendance") return [`${value}%`, "Attendance"];
          return [value, name];
        }}
        labelFormatter={() => ''}
      />
      <Scatter 
        name="Students" 
        data={data} 
        fill="#ec4899"
        isAnimationActive={true}
        animationDuration={2000}
      />
    </ScatterChart>
  </ResponsiveContainer>
));

const HODCgpaDistributionChart: React.FC<{ data: any[] }> = React.memo(({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
      <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
      <YAxis stroke="#64748b" fontSize={9} />
      <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
      <Bar
        dataKey="count"
        fill="#8b5cf6"
        radius={[6, 6, 0, 0]}
        isAnimationActive={true}
        animationDuration={2000}
        animationEasing="ease-in-out"
      >
        {data.map((_: any, index: number) => (
          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#8b5cf6' : '#a78bfa'} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
));

const HODAttendanceTrendChart: React.FC<{ data: any[] }> = React.memo(({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
      <XAxis dataKey="sem" stroke="#64748b" fontSize={9} />
      <YAxis domain={[50, 100]} stroke="#64748b" fontSize={9} />
      <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
      <Line
        type="monotone"
        dataKey="pct"
        stroke="#3b82f6"
        strokeWidth={3}
        dot={{ r: 4, fill: '#1d4ed8', strokeWidth: 2, stroke: '#ffffff' }}
        activeDot={{ r: 6 }}
        isAnimationActive={true}
        animationDuration={2000}
        animationEasing="ease-in-out"
      />
    </LineChart>
  </ResponsiveContainer>
));

const HODEmployabilityPieChart: React.FC<{ data: any[] }> = React.memo(({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={data}
        innerRadius={38}
        outerRadius={52}
        paddingAngle={4}
        dataKey="value"
        isAnimationActive={true}
        animationDuration={2000}
        animationEasing="ease-in-out"
      >
        {data.map((entry: any, index: number) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
    </PieChart>
  </ResponsiveContainer>
));

const HODParticipationChart: React.FC<{ data: any[] }> = React.memo(({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
      <XAxis type="number" stroke="#64748b" fontSize={9} />
      <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={8} width={65} />
      <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
      <Bar
        dataKey="count"
        fill="#8b5cf6"
        radius={[0, 6, 6, 0]}
        isAnimationActive={true}
        animationDuration={2000}
        animationEasing="ease-in-out"
      >
        {data.map((_: any, index: number) => (
          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#a78bfa' : '#c084fc'} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
));

const HODActivityPieChart: React.FC<{ data: any[] }> = React.memo(({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={data}
        outerRadius={55}
        dataKey="value"
        isAnimationActive={true}
        animationDuration={2000}
        animationEasing="ease-in-out"
      >
        {data.map((entry: any, index: number) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
    </PieChart>
  </ResponsiveContainer>
));

const HODAcademicPerformancePieChart: React.FC<{ data: any[] }> = React.memo(({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={data}
        outerRadius={55}
        dataKey="value"
        isAnimationActive={true}
        animationDuration={2000}
        animationEasing="ease-in-out"
      >
        {data.map((entry: any, index: number) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
    </PieChart>
  </ResponsiveContainer>
));

const HODCrtPerformanceChart: React.FC<{ data: any[] }> = React.memo(({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
      <XAxis dataKey="range" stroke="#64748b" fontSize={9} />
      <YAxis stroke="#64748b" fontSize={9} />
      <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
      <Bar
        dataKey="count"
        fill="#f97316"
        radius={[6, 6, 0, 0]}
        isAnimationActive={true}
        animationDuration={2000}
        animationEasing="ease-in-out"
      >
        {data.map((_: any, index: number) => (
          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#f97316' : '#fdba74'} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
));

const HODCgpaTrendChart: React.FC<{ data: any[] }> = React.memo(({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
      <XAxis dataKey="label" stroke="#64748b" fontSize={9} />
      <YAxis stroke="#64748b" fontSize={9} />
      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px', fontSize: '10px' }} />
      <Bar dataKey="improved" name="Improved" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
      <Bar dataKey="declined" name="Declined" fill="#ef4444" stackId="a" radius={[0, 0, 0, 0]} />
      <Bar dataKey="stable" name="Stable" fill="#94a3b8" stackId="a" radius={[6, 6, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
));

export const HODDashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  // Filters
  const [department, setDepartment] = useState(user?.department || 'Computer Science & Engineering');
  const [year, setYear] = useState('');

  // Enterprise Search & Advanced Filters states
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('');
  const [cgpaFilter, setCgpaFilter] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [cgpaTrendData, setCgpaTrendData] = useState<any[]>([]);
  const [loadingTrend, setLoadingTrend] = useState(false);

  // Initial cache resolve based on defaults
  const initialQuery = `?department=${encodeURIComponent(user?.department || 'Computer Science & Engineering')}`;
  const cachedData = getCachedData(`/analytics/hod/dashboard${initialQuery}`);

  const [loading, setLoading] = useState(!cachedData);
  const [data, setData] = useState<any>(cachedData || null);

  // Sync state when user loads or updates
  useEffect(() => {
    if (user?.department) {
      setDepartment(user.department);
    }
  }, [user]);

  const loadHODData = async (isInitial = false) => {
    try {
      const query = `?department=${encodeURIComponent(department)}${year ? `&year=${year}` : ''}`;
      const cached = getCachedData(`/analytics/hod/dashboard${query}`);
      if (isInitial && !cached && !data) {
        setLoading(true);
      }

      const res = await apiFetch(`/analytics/hod/dashboard${query}`);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSearchResults = async () => {
    try {
      setSearching(true);
      const query = `?q=${encodeURIComponent(searchQuery)}&department=${encodeURIComponent(department)}&year=${year}&attendanceFilter=${attendanceFilter}&cgpaFilter=${cgpaFilter}`;
      const res = await apiFetch(`/analytics/hod/enterprise-search${query}`);
      setSearchResults(res.results || []);
      
      // If we have a selected student, refresh their details in the search results
      if (selectedStudent) {
        const updated = (res.results || []).find((s: any) => s.id === selectedStudent.id);
        if (updated) {
          setSelectedStudent(updated);
        }
      }
    } catch (err) {
      console.error('Error fetching search results:', err);
    } finally {
      setSearching(false);
    }
  };

  const fetchCgpaTrend = async () => {
    try {
      setLoadingTrend(true);
      const query = `?department=${encodeURIComponent(department)}`;
      const res = await apiFetch(`/analytics/hod/cgpa-trend${query}`);
      setCgpaTrendData(res.trend || []);
    } catch (err) {
      console.error('Error fetching CGPA trend:', err);
    } finally {
      setLoadingTrend(false);
    }
  };

  useEffect(() => {
    const query = `?department=${encodeURIComponent(department)}${year ? `&year=${year}` : ''}`;
    const cached = getCachedData(`/analytics/hod/dashboard${query}`);
    if (cached) {
      setData(cached);
      setLoading(false);
      loadHODData(false); // background sync
    } else {
      if (!data) {
        setLoading(true);
      }
      loadHODData(true);
    }
    const interval = setInterval(() => loadHODData(false), 60000);
    return () => clearInterval(interval);
  }, [department, year]);

  useEffect(() => {
    fetchSearchResults();
  }, [searchQuery, department, year, attendanceFilter, cgpaFilter]);

  useEffect(() => {
    fetchCgpaTrend();
  }, [department]);

  if (loading && !data) {
    return <PageSkeleton />;
  }

  const summary = data?.summary || {};
  const charts = data?.charts || {};

  // Formulate data for Year Distribution Chart
  const yearDistData = Object.keys(charts.studentCountByYear || {}).map(y => ({
    name: `${y} Year`,
    students: charts.studentCountByYear[y],
  }));

  // Formulate data for Performance Level Chart
  const perfData = [
    { name: 'Poor (<5.0)', count: charts.studentsOverPerformance?.poor || 0 },
    { name: 'Average (5.0-7.0)', count: charts.studentsOverPerformance?.average || 0 },
    { name: 'Good (7.0-8.5)', count: charts.studentsOverPerformance?.good || 0 },
    { name: 'Excellent (>=8.5)', count: charts.studentsOverPerformance?.excellent || 0 },
  ];

  // Formulate data for CGPA vs Attendance correlation Scatter plot
  const correlationData = (charts.cgpaVsAttendance || []).map((item: any) => ({
    x: item.attendance,
    y: item.cgpa,
    z: 1,
    rollNumber: item.rollNumber,
    name: item.name
  }));

  const cgpaDistribution = charts.cgpaDistribution || [];
  const attendanceTrend = charts.attendanceTrend || [];
  const employabilityBreakdown = charts.employabilityBreakdown || [];
  const participationOverview = charts.participationOverview || [];
  const activityPercentage = charts.activityPercentage || [];
  const academicPerformanceMix = charts.academicPerformanceMix || [];
  const crtPerformanceDistribution = charts.crtPerformanceDistribution || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0b1a50] text-white p-4 rounded-xl flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-white" />
          <h1 className="text-base md:text-lg font-bold uppercase tracking-wider text-white">HOD Intelligence Panel</h1>
        </div>
        <p className="hidden md:block text-xs text-white/80 max-w-sm text-right">Department performance analytics, comparative metrics, and academic distribution.</p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4.5 w-4.5 text-primary" />
          <span className="text-xs font-bold text-slate-700">Filters</span>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={department}
            onChange={(e) => { setDepartment(e.target.value); setSelectedStudent(null); }}
            disabled={user?.role === 'HOD'}
            className="px-3 py-1.5 bg-slate-50 border border-border rounded-lg text-xs text-slate-800 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer focus:outline-none"
          >
            {user?.role !== 'HOD' && (
              <option value="">Whole College (All Depts)</option>
            )}
            <option value="Computer Science & Engineering">Computer Science & Eng</option>
            <option value="Electronics & Communication Engineering">Electronics & Comm Eng</option>
            <option value="Information Technology">Information Technology</option>
          </select>

          <select
            value={year}
            onChange={(e) => { setYear(e.target.value); setSelectedStudent(null); }}
            className="px-3 py-1.5 bg-slate-50 border border-border rounded-lg text-xs text-slate-800 cursor-pointer focus:outline-none"
          >
            <option value="">All Academic Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          {/* Attendance Filter */}
          <select
            value={attendanceFilter}
            onChange={(e) => { setAttendanceFilter(e.target.value); setSelectedStudent(null); }}
            className="px-3 py-1.5 bg-slate-50 border border-border rounded-lg text-xs text-slate-800 cursor-pointer focus:outline-none"
          >
            <option value="">All Attendance</option>
            <option value="above80">&gt; 80% Attendance</option>
            <option value="below75">&lt; 75% Attendance</option>
            <option value="below60">&lt; 60% Attendance</option>
          </select>

          {/* CGPA Filter */}
          <select
            value={cgpaFilter}
            onChange={(e) => { setCgpaFilter(e.target.value); setSelectedStudent(null); }}
            className="px-3 py-1.5 bg-slate-50 border border-border rounded-lg text-xs text-slate-800 cursor-pointer focus:outline-none"
          >
            <option value="">All CGPA</option>
            <option value="above8">&gt; 8.0 CGPA</option>
            <option value="above7">&gt; 7.0 CGPA (Ready)</option>
            <option value="below6">&lt; 6.0 CGPA</option>
          </select>
        </div>
      </div>

      {/* Enterprise Student Profile Lookup Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
        <div className="border-l-4 border-l-primary pl-3">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Enterprise Student Profile Lookup</h2>
          <p className="text-[10px] text-slate-500">Quickly search student profiles, check live academic risk status, coding platform profiles, and certification score sheets.</p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search student by Name or Roll Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Results list */}
        {(searchQuery || attendanceFilter || cgpaFilter) && (
          <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 max-h-60 overflow-y-auto bg-slate-50/50">
            {searching ? (
              <div className="p-4 text-center text-xs text-slate-500">Searching...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 italic">No matching students found. Try checking your filter criteria.</div>
            ) : (
              searchResults.map((student: any) => (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className={`p-3 flex items-center justify-between hover:bg-white hover:shadow-sm cursor-pointer transition-all ${selectedStudent?.id === student.id ? 'bg-white border-l-2 border-l-primary' : ''}`}
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800">{student.name}</span>
                    <div className="flex gap-2 items-center mt-0.5">
                      <span className="text-[9px] font-mono text-slate-500 bg-slate-150 px-1.5 py-0.5 rounded">{student.rollNumber}</span>
                      <span className="text-[9px] text-slate-400">{student.department} • {student.year} Year</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-700">CGPA: {student.cgpa.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-500">Attendance: {student.attendancePct}%</div>
                    </div>
                    {student.overallRisk === 'HIGH' ? (
                      <span className="px-2 py-0.5 text-[8px] font-black rounded-full bg-red-100 text-red-750">RED ALERT</span>
                    ) : student.overallRisk === 'MEDIUM' ? (
                      <span className="px-2 py-0.5 text-[8px] font-black rounded-full bg-yellow-100 text-yellow-750">WARN</span>
                    ) : (
                      <span className="px-2 py-0.5 text-[8px] font-black rounded-full bg-green-100 text-green-750">NORMAL</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Student Deep Profile Detail Card */}
      {selectedStudent && (
        <div className="bg-white border border-slate-200 shadow-md rounded-xl p-6 relative overflow-hidden transition-all duration-300">
          <button
            onClick={() => setSelectedStudent(null)}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-650 bg-slate-100 p-1.5 rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-slate-800">{selectedStudent.name}</h2>
                {selectedStudent.overallRisk === 'HIGH' ? (
                  <span className="px-2 py-0.5 text-[8px] font-black rounded bg-red-150 text-red-750 border border-red-200">High Risk Academic Status</span>
                ) : selectedStudent.overallRisk === 'MEDIUM' ? (
                  <span className="px-2 py-0.5 text-[8px] font-black rounded bg-yellow-150 text-yellow-750 border border-yellow-200">Attention Required</span>
                ) : (
                  <span className="px-2 py-0.5 text-[8px] font-black rounded bg-green-150 text-green-750 border border-green-200">Safe Academic Standing</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{selectedStudent.email}</p>
              
              <div className="flex flex-wrap gap-2 mt-3 text-[10px] font-semibold text-slate-550">
                <span className="bg-slate-50 px-2 py-1 border border-slate-150 rounded">Roll: {selectedStudent.rollNumber}</span>
                <span className="bg-slate-50 px-2 py-1 border border-slate-150 rounded">Dept: {selectedStudent.department}</span>
                <span className="bg-slate-50 px-2 py-1 border border-slate-155 rounded">Branch: {selectedStudent.branch}</span>
                <span className="bg-slate-50 px-2 py-1 border border-slate-155 rounded">{selectedStudent.year} Year - Sec {selectedStudent.section}</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="bg-slate-50 px-4 py-3 border border-slate-100 rounded-lg text-center">
                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Overall CGPA</span>
                <span className="text-xl font-black text-primary block mt-0.5">{selectedStudent.cgpa.toFixed(2)}</span>
              </div>
              <div className="bg-slate-50 px-4 py-3 border border-slate-100 rounded-lg text-center">
                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Attendance</span>
                <span className={`text-xl font-black block mt-0.5 ${selectedStudent.attendancePct < 75 ? 'text-red-500' : 'text-emerald-600'}`}>{selectedStudent.attendancePct}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Side: Subject Attendance & Risks */}
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <Activity className="h-4.5 w-4.5 text-blue-500" /> Subject-Wise Attendance Breakdown
                </h3>
                <div className="space-y-3">
                  {selectedStudent.subjectAttendance && selectedStudent.subjectAttendance.length > 0 ? (
                    selectedStudent.subjectAttendance.map((sub: any) => (
                      <div key={sub.subjectCode} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-slate-700">{sub.subjectName} ({sub.subjectCode})</span>
                          <span className={sub.pct < 75 ? 'text-red-600 font-extrabold' : 'text-slate-600'}>{sub.attended}/{sub.total} ({sub.pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${sub.pct < 75 ? 'bg-red-500' : sub.pct < 85 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(100, sub.pct)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 italic py-2 text-center">No subject attendance details logged.</div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <AlertCircle className="h-4.5 w-4.5 text-red-500" /> Live Risk Assessment
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-slate-100 flex flex-col justify-between">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Attendance Alert</span>
                    <span className={`text-[11px] font-black mt-1 ${selectedStudent.attendanceRisk === 'HIGH' ? 'text-red-500' : selectedStudent.attendanceRisk === 'MEDIUM' ? 'text-yellow-650' : 'text-green-600'}`}>
                      {selectedStudent.attendanceRisk === 'HIGH' ? '🔴 Critical (<60%)' : selectedStudent.attendanceRisk === 'MEDIUM' ? '🟡 Low (<75%)' : '🟢 Normal (>=75%)'}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-100 flex flex-col justify-between">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Academic Alert</span>
                    <span className={`text-[11px] font-black mt-1 ${selectedStudent.cgpaRisk === 'HIGH' ? 'text-red-500' : selectedStudent.cgpaRisk === 'MEDIUM' ? 'text-yellow-650' : 'text-green-600'}`}>
                      {selectedStudent.cgpaRisk === 'HIGH' ? '🔴 Critical (<5.0)' : selectedStudent.cgpaRisk === 'MEDIUM' ? '🟡 Low CGPA (<7.0)' : '🟢 Safe (>=7.0)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Coding Profiles & Certifications */}
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <Code className="h-4.5 w-4.5 text-indigo-500" /> Connected Coding Accounts
                </h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white p-3 rounded-lg border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">LeetCode</span>
                    {selectedStudent.codingAccounts?.leetcode ? (
                      <a
                        href={`https://leetcode.com/${selectedStudent.codingAccounts.leetcode}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center justify-center gap-0.5 mt-1"
                      >
                        {selectedStudent.codingAccounts.leetcode} <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic block mt-1">Not Linked</span>
                    )}
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">CodeChef</span>
                    {selectedStudent.codingAccounts?.codechef ? (
                      <a
                        href={`https://www.codechef.com/users/${selectedStudent.codingAccounts.codechef}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center justify-center gap-0.5 mt-1"
                      >
                        {selectedStudent.codingAccounts.codechef} <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic block mt-1">Not Linked</span>
                    )}
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">HackerRank</span>
                    {selectedStudent.codingAccounts?.hackerrank ? (
                      <a
                        href={`https://www.hackerrank.com/${selectedStudent.codingAccounts.hackerrank}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center justify-center gap-0.5 mt-1"
                      >
                        {selectedStudent.codingAccounts.hackerrank} <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic block mt-1">Not Linked</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <Award className="h-4.5 w-4.5 text-amber-500" /> Academic Certifications
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedStudent.certifications && selectedStudent.certifications.length > 0 ? (
                    selectedStudent.certifications.map((c: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-slate-150 flex justify-between items-center shadow-sm">
                        <div>
                          <span className="text-[11px] font-bold text-slate-800 block">{c.name}</span>
                          <span className="text-[9px] text-slate-450 block mt-0.5">Provider: {c.issuer} | {c.category}</span>
                        </div>
                        <span className="bg-amber-50 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded border border-amber-150">
                          +{c.score || 0} pts
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 italic text-center py-4">No verified certifications found.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-blue-755 uppercase tracking-wider block">Dept Students</span>
                <p className="text-xl font-extrabold text-slate-800 mt-2">{summary.totalStudents || 0}</p>
              </div>
              <div className="bg-blue-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                <Users className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-purple-755 uppercase tracking-wider block">Average CGPA</span>
                <p className="text-xl font-extrabold text-slate-800 mt-2">{summary.avgCGPA || '0.00'}</p>
              </div>
              <div className="bg-purple-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                <GraduationCap className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-teal-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-teal-755 uppercase tracking-wider block">Average Attendance</span>
                <p className="text-xl font-extrabold text-slate-800 mt-2">{summary.avgAttendance || 0}%</p>
              </div>
              <div className="bg-teal-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                <Users className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-indigo-755 uppercase tracking-wider block">Average Profile Score</span>
                <p className="text-xl font-extrabold text-slate-800 mt-2">{summary.avgProfileScore || '0.00'}</p>
              </div>
              <div className="bg-indigo-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                <Star className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-amber-755 uppercase tracking-wider block">Achievements Logged</span>
                <p className="text-xl font-extrabold text-slate-800 mt-2">{summary.totalAchievements || 0}</p>
              </div>
              <div className="bg-amber-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                <Award className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow col-span-2 sm:col-span-1 md:col-span-1">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-rose-755 uppercase tracking-wider block">Active Backlogs</span>
                <p className="text-xl font-extrabold text-slate-800 mt-2">{summary.totalBacklogs || 0}</p>
              </div>
              <div className="bg-rose-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4.5 w-4.5" />
              </div>
            </div>
          </div>

          {/* Charts Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Year Wise student count */}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xs font-bold text-slate-850 mb-6 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <Users className="h-4.5 w-4.5 text-primary" /> Student Batch Distribution
              </h3>
              <div className="h-64 w-full">
                <HODBatchDistributionChart data={yearDistData} />
              </div>
            </div>

            {/* Performance Level */}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xs font-bold text-slate-850 mb-6 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <Award className="h-4.5 w-4.5 text-primary" /> Academic Grade Distribution
              </h3>
              <div className="h-64 w-full">
                <HODAcademicGradeDistributionChart data={perfData} />
              </div>
            </div>
          </div>

          {/* Scatter Plot Correlation */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow mt-6">
            <h3 className="text-xs font-bold text-slate-850 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Award className="h-4.5 w-4.5 text-[#ec4899]" /> CGPA vs Attendance Correlation Analysis
            </h3>
            <p className="text-[11px] text-slate-500 mb-4">This scatter plot visualizes the correlation between student Attendance (X-axis) and CGPA (Y-axis). The ideal quadrant is top-right (high attendance, high grades).</p>
            <div className="h-72 w-full">
              {correlationData.length > 0 ? (
                <HODCorrelationScatterChart data={correlationData} />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-450 italic">No correlation data available for the selected filters.</div>
              )}
            </div>
          </div>

          {/* Institution-Wide Benchmarks & Distributions */}
          <div className="border-l-4 border-l-purple-500 pl-3 mb-2 mt-6">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Institution-Wide Analytics & Benchmarks</h2>
            <p className="text-[10px] text-slate-500">Compare metrics against the institution-wide distributions, activities, and risk parameters.</p>
          </div>

          {/* Row 1: Compact KPI Blocks */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {/* 1. CGPA */}
            <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-purple-755 uppercase tracking-wider block">CGPA (Average)</span>
                  <p className="text-xl font-extrabold text-slate-800">{summary.avgCGPA || '0.00'}</p>
                </div>
                <div className="bg-purple-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <span className="text-[9px] text-slate-400 block">Out of 10</span>
                <Sparkline color="#8b5cf6" id="cgpa" />
              </div>
            </div>

            {/* 2. Attendance */}
            <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-blue-755 uppercase tracking-wider block">ATTENDANCE (Avg)</span>
                  <p className="text-xl font-extrabold text-slate-800">{summary.avgAttendance || 0}%</p>
                </div>
                <div className="bg-blue-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                  <Users className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <span className="text-[9px] text-slate-400 block">Average Attendance</span>
                <Sparkline color="#3b82f6" id="attendance" />
              </div>
            </div>

            {/* 3. I Grade */}
            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-emerald-755 uppercase tracking-wider block">I GRADE</span>
                  <p className="text-xl font-extrabold text-slate-800">{summary.totalIGrades || 0}</p>
                </div>
                <div className="bg-emerald-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                  <Award className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <span className="text-[9px] text-slate-400 block">Total I Grades</span>
                <Sparkline color="#10b981" id="igrade" />
              </div>
            </div>

            {/* 4. R Grade */}
            <div className="bg-white p-4 rounded-xl border border-orange-200 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-orange-755 uppercase tracking-wider block">R GRADE</span>
                  <p className="text-xl font-extrabold text-slate-800">{summary.totalRGrades || 0}</p>
                </div>
                <div className="bg-orange-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                  <FileText className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <span className="text-[9px] text-slate-400 block">Total R Grades</span>
                <Sparkline color="#f97316" id="rgrade" />
              </div>
            </div>

            {/* 5. Extra-Curricular */}
            <div className="bg-white p-4 rounded-xl border border-pink-200 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-pink-755 uppercase tracking-wider block">EXTRA-CURRICULAR</span>
                  <p className="text-xl font-extrabold text-slate-800">{summary.totalExtraCurricular || 0}</p>
                </div>
                <div className="bg-pink-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                  <Star className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <span className="text-[9px] text-slate-400 block">Participants</span>
                <Sparkline color="#ec4899" id="extra" />
              </div>
            </div>
          </div>

          {/* Row 2: Larger Centered Placement Readiness Gauge */}
          <div className="grid grid-cols-2 md:grid-cols-[1fr_1fr_1.8fr_1fr_1fr] gap-4 items-center mt-4">
            {/* 6. Co-Curricular */}
            <div className="bg-white p-4 rounded-xl border border-teal-200 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-teal-755 uppercase tracking-wider block">CO-CURRICULAR</span>
                  <p className="text-xl font-extrabold text-slate-800">{summary.totalCoCurricular || 0}</p>
                </div>
                <div className="bg-teal-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                  <Activity className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <span className="text-[9px] text-slate-400 block">Participants</span>
                <Sparkline color="#0d9488" id="co" />
              </div>
            </div>

            {/* 7. Sports Participants */}
            <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-purple-755 uppercase tracking-wider block">SPORTS PARTICIPANTS</span>
                  <p className="text-xl font-extrabold text-slate-800">{summary.totalSports || 0}</p>
                </div>
                <div className="bg-purple-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                  <Star className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <span className="text-[9px] text-slate-400 block">Participants</span>
                <Sparkline color="#8b5cf6" id="sports" />
              </div>
            </div>

            {/* 8. Placement Readiness Meter - Centered, Highlighted and Expanded */}
            <div className="bg-white p-5 rounded-2xl border-2 border-amber-300 shadow-md flex flex-col justify-between min-h-[175px] col-span-2 md:col-span-1 hover:shadow-lg transition-shadow">
              <div className="flex flex-col items-center justify-between h-full py-1">
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block text-center mb-1">Placement Readiness</span>
                <div className="relative w-full h-20 flex items-center justify-center">
                  <svg viewBox="0 0 100 55" className="w-36 h-20">
                    {/* Semicircle gauge segments */}
                    <path d="M 10 50 A 40 40 0 0 1 21.72 21.72" fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" />
                    <path d="M 21.72 21.72 A 40 40 0 0 1 50 10" fill="none" stroke="#f97316" strokeWidth="8" />
                    <path d="M 50 10 A 40 40 0 0 1 78.28 21.72" fill="none" stroke="#eab308" strokeWidth="8" />
                    <path d="M 78.28 21.72 A 40 40 0 0 1 90 50" fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round" />
                    
                    {/* Needle */}
                    <g transform="translate(50, 50)">
                      <line x1="0" y1="0" x2="32" y2="0" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" transform={`rotate(${-180 + (summary.placementReadiness || 0) * 1.8})`} />
                      <circle cx="0" cy="0" r="5" fill="#0f172a" />
                    </g>
                  </svg>
                  <div className="absolute bottom-1 text-center">
                    <span className="text-base font-black text-slate-800">{summary.placementReadiness || 0}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[7.5px] text-slate-500 font-bold px-1 mt-2 leading-tight">
                  <span className="text-red-500 truncate">🔴 &lt;50% Focus</span>
                  <span className="text-orange-500 truncate">🟠 50-70% Avg</span>
                  <span className="text-yellow-600 truncate">🟡 70-85% Good</span>
                  <span className="text-green-600 truncate">🟢 &gt;85% Excel</span>
                </div>
              </div>
            </div>

            {/* 9. Managerial */}
            <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-blue-755 uppercase tracking-wider block">MANAGERIAL</span>
                  <p className="text-xl font-extrabold text-slate-800">{summary.totalManagerial || 0}</p>
                </div>
                <div className="bg-blue-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                  <Briefcase className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <span className="text-[9px] text-slate-400 block">Participants</span>
                <Sparkline color="#3b82f6" id="managerial" />
              </div>
            </div>

            {/* 10. NSS / NCC */}
            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-emerald-755 uppercase tracking-wider block">NSS / NCC</span>
                  <p className="text-xl font-extrabold text-slate-800">{summary.totalNssNcc || 0}</p>
                </div>
                <div className="bg-emerald-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                  <Shield className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <span className="text-[9px] text-slate-400 block">Participants</span>
                <Sparkline color="#10b981" id="nss" />
              </div>
            </div>
          </div>

          {/* Row 3: Compact KPI Blocks */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-4">
            {/* 11. Star Coder */}
            <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-rose-755 uppercase tracking-wider block">STAR CODER</span>
                  <p className="text-xl font-extrabold text-slate-800">{summary.totalStarCoders || 0}</p>
                </div>
                <div className="bg-rose-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                  <Code className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <span className="text-[9px] text-slate-400 block">Star Coders</span>
                <Sparkline color="#f43f5e" id="starcoder" />
              </div>
            </div>

            {/* 12. GRE / IELTS */}
            <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-purple-755 uppercase tracking-wider block">GRE / IELTS</span>
                  <p className="text-xl font-extrabold text-slate-800">{summary.totalGreIelts || 0}</p>
                </div>
                <div className="bg-purple-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                  <BookOpen className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <span className="text-[9px] text-slate-400 block">Qualified Students</span>
                <Sparkline color="#8b5cf6" id="gre" />
              </div>
            </div>

            {/* 13. Certifications */}
            <div className="bg-white p-4 rounded-xl border border-orange-200 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-orange-755 uppercase tracking-wider block">CERTIFICATIONS</span>
                  <p className="text-xl font-extrabold text-slate-800">{summary.totalCertifications || 0}</p>
                </div>
                <div className="bg-orange-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                  <Award className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <span className="text-[9px] text-slate-400 block">Total Certifications</span>
                <Sparkline color="#f97316" id="certs" />
              </div>
            </div>

            {/* 14. CRT Performance */}
            <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-blue-755 uppercase tracking-wider block">CRT PERFORMANCE (Avg)</span>
                  <p className="text-xl font-extrabold text-slate-800">{summary.avgCrtPerformance || 0}%</p>
                </div>
                <div className="bg-blue-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <span className="text-[9px] text-slate-400 block">Average Score</span>
                <Sparkline color="#3b82f6" id="crt" />
              </div>
            </div>

            {/* 15. Projects */}
            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-emerald-755 uppercase tracking-wider block">PROJECTS</span>
                  <p className="text-xl font-extrabold text-slate-800">{summary.totalProjects || 0}</p>
                </div>
                <div className="bg-emerald-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                  <FolderClosed className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <span className="text-[9px] text-slate-400 block">Total Projects</span>
                <Sparkline color="#10b981" id="projects" />
              </div>
            </div>
          </div>

          {/* Main Charts Area */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
            {/* CGPA Distribution */}
            <div className="bg-white p-5 rounded-xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xs font-bold text-[#8b5cf6] uppercase tracking-wider mb-4 text-center">CGPA Distribution</h3>
              <div className="h-48 w-full">
                <HODCgpaDistributionChart data={cgpaDistribution} />
              </div>
            </div>

            {/* Attendance Trend */}
            <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 text-center">Attendance Trend</h3>
              <div className="h-48 w-full">
                <HODAttendanceTrendChart data={attendanceTrend} />
              </div>
            </div>

            {/* Employability Index Breakdown */}
            <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 text-center">Employability Index Breakdown</h3>
              <div className="flex items-center justify-between gap-2 h-40">
                <div className="w-[55%] h-full relative flex items-center justify-center">
                  <HODEmployabilityPieChart data={employabilityBreakdown} />
                  <div className="absolute text-center">
                    <span className="text-[15px] font-black text-slate-800">82%</span>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">Index</p>
                  </div>
                </div>
                <div className="w-[45%] space-y-1.5 text-[9px]">
                  {employabilityBreakdown.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                      <span className="text-slate-600 truncate font-semibold" title={item.name}>{item.name}</span>
                      <span className="font-extrabold text-slate-800 ml-auto">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2 of Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-6">
            {/* Participation Overview */}
            <div className="bg-white p-5 rounded-xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-4 text-center">Participation Overview</h3>
              <div className="h-48 w-full">
                <HODParticipationChart data={participationOverview} />
              </div>
            </div>

            {/* Activity Percentage */}
            <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 text-center">Activity Percentage</h3>
              <div className="flex items-center justify-between gap-2 h-40">
                <div className="w-[50%] h-full">
                  <HODActivityPieChart data={activityPercentage} />
                </div>
                <div className="w-[50%] space-y-1.5 text-[9px]">
                  {activityPercentage.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                      <span className="text-slate-600 truncate font-semibold">{item.name}</span>
                      <span className="font-extrabold text-slate-800 ml-auto">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Academic Performance Mix */}
            <div className="bg-white p-5 rounded-xl border border-pink-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <h3 className="text-xs font-bold text-[#ec4899] uppercase tracking-wider mb-2 text-center">Academic Performance Mix</h3>
              <div className="flex items-center justify-between gap-2 h-40">
                <div className="w-[50%] h-full">
                  <HODAcademicPerformancePieChart data={academicPerformanceMix} />
                </div>
                <div className="w-[50%] space-y-1.5 text-[9px]">
                  {academicPerformanceMix.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                      <span className="text-slate-600 truncate font-semibold">{item.name}</span>
                      <span className="font-extrabold text-slate-800 ml-auto">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CRT Performance Distribution */}
            <div className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-4 text-center">CRT Performance Distribution</h3>
              <div className="h-48 w-full">
                <HODCrtPerformanceChart data={crtPerformanceDistribution} />
              </div>
            </div>
          </div>

          {/* CGPA Trend Progression Section */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow my-6">
            <div className="border-l-4 border-l-emerald-500 pl-3 mb-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Semester-Over-Semester CGPA Progression Trend</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Tracks student performance shifts by comparing SGPAs of adjacent semesters. Displays counts of students who improved (&gt;+0.1 SGPA), declined (&lt;-0.1 SGPA), or stayed stable.</p>
            </div>
            <div className="h-64 w-full">
              {loadingTrend ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400 italic">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2"></div> Loading progression analytics...
                </div>
              ) : cgpaTrendData && cgpaTrendData.length > 0 ? (
                <HODCgpaTrendChart data={cgpaTrendData} />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400 italic">No semester-over-semester grade progression logs found for this department.</div>
              )}
            </div>
          </div>

          {/* Bottom Section - Risk Analysis Table & Overall Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6">
            {/* Risk Analysis Table */}
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
              <div className="border-l-4 border-l-red-500 pl-3 mb-4">
                <h3 className="text-xs font-black text-red-500 uppercase tracking-wider">Risk Analysis - Students Requiring Attention</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">PARAMETER</th>
                      <th className="py-2.5 px-3">CONDITION</th>
                      <th className="py-2.5 px-3">HIGH RISK (🔴)</th>
                      <th className="py-2.5 px-3">MODERATE RISK (🟡)</th>
                      <th className="py-2.5 px-3">GOOD (🟢)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-2.5 px-3 font-semibold">Attendance</td>
                      <td className="py-2.5 px-3 font-medium text-slate-500">&lt; 75%</td>
                      <td className="py-2.5 px-3 text-red-600 font-bold">{data.riskAnalysis?.attendance?.highCount ?? 0} ({data.riskAnalysis?.attendance?.highPct ?? '0.0'}%)</td>
                      <td className="py-2.5 px-3 text-yellow-600 font-semibold">{data.riskAnalysis?.attendance?.modCount ?? 0} ({data.riskAnalysis?.attendance?.modPct ?? '0.0'}%)</td>
                      <td className="py-2.5 px-3 text-green-600 font-semibold">{data.riskAnalysis?.attendance?.goodCount ?? 0} ({data.riskAnalysis?.attendance?.goodPct ?? '0.0'}%)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold">CGPA</td>
                      <td className="py-2.5 px-3 font-medium text-slate-500">&lt; 6.5</td>
                      <td className="py-2.5 px-3 text-red-600 font-bold">{data.riskAnalysis?.cgpa?.highCount ?? 0} ({data.riskAnalysis?.cgpa?.highPct ?? '0.0'}%)</td>
                      <td className="py-2.5 px-3 text-yellow-600 font-semibold">{data.riskAnalysis?.cgpa?.modCount ?? 0} ({data.riskAnalysis?.cgpa?.modPct ?? '0.0'}%)</td>
                      <td className="py-2.5 px-3 text-green-600 font-semibold">{data.riskAnalysis?.cgpa?.goodCount ?? 0} ({data.riskAnalysis?.cgpa?.goodPct ?? '0.0'}%)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold">I Grades</td>
                      <td className="py-2.5 px-3 font-medium text-slate-500">&gt; 2</td>
                      <td className="py-2.5 px-3 text-red-600 font-bold">{data.riskAnalysis?.igrades?.highCount ?? 0} ({data.riskAnalysis?.igrades?.highPct ?? '0.0'}%)</td>
                      <td className="py-2.5 px-3 text-yellow-600 font-semibold">{data.riskAnalysis?.igrades?.modCount ?? 0} ({data.riskAnalysis?.igrades?.modPct ?? '0.0'}%)</td>
                      <td className="py-2.5 px-3 text-green-600 font-semibold">{data.riskAnalysis?.igrades?.goodCount ?? 0} ({data.riskAnalysis?.igrades?.goodPct ?? '0.0'}%)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold">R Grades</td>
                      <td className="py-2.5 px-3 font-medium text-slate-500">&gt; 1</td>
                      <td className="py-2.5 px-3 text-red-600 font-bold">{data.riskAnalysis?.rgrades?.highCount ?? 0} ({data.riskAnalysis?.rgrades?.highPct ?? '0.0'}%)</td>
                      <td className="py-2.5 px-3 text-yellow-600 font-semibold">{data.riskAnalysis?.rgrades?.modCount ?? 0} ({data.riskAnalysis?.rgrades?.modPct ?? '0.0'}%)</td>
                      <td className="py-2.5 px-3 text-green-600 font-semibold">{data.riskAnalysis?.rgrades?.goodCount ?? 0} ({data.riskAnalysis?.rgrades?.goodPct ?? '0.0'}%)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold">CRT Performance</td>
                      <td className="py-2.5 px-3 font-medium text-slate-500">&lt; 50%</td>
                      <td className="py-2.5 px-3 text-red-600 font-bold">{data.riskAnalysis?.crt?.highCount ?? 0} ({data.riskAnalysis?.crt?.highPct ?? '0.0'}%)</td>
                      <td className="py-2.5 px-3 text-yellow-600 font-semibold">{data.riskAnalysis?.crt?.modCount ?? 0} ({data.riskAnalysis?.crt?.modPct ?? '0.0'}%)</td>
                      <td className="py-2.5 px-3 text-green-600 font-semibold">{data.riskAnalysis?.crt?.goodCount ?? 0} ({data.riskAnalysis?.crt?.goodPct ?? '0.0'}%)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <span className="text-[10px] text-slate-400 block mt-4 italic">
                Note: All percentages are calculated based on total strength.
              </span>
            </div>

            {/* Overall Summary Row */}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 text-center border-b border-slate-100 pb-2">Overall Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center gap-2.5">
                    <Users className="h-5 w-5 text-blue-500" />
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">TOTAL STUDENTS</span>
                      <p className="text-sm font-extrabold text-slate-800">{summary.totalStudents || 0}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center gap-2.5">
                    <Target className="h-5 w-5 text-emerald-500" />
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">PLACEMENT READY</span>
                      <p className="text-sm font-extrabold text-slate-800">{summary.placementReadiness || 0}%</p>
                      <span className="text-[8px] text-slate-400 font-semibold">{summary.placementReadyCount || 0} Students</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center gap-2.5">
                    <GraduationCap className="h-5 w-5 text-purple-500" />
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">HIGHER STUDIES</span>
                      <p className="text-sm font-extrabold text-slate-800">{summary.higherStudiesPct || 0}%</p>
                      <span className="text-[8px] text-slate-400 font-semibold">{summary.totalGreIelts || 0} Students</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center gap-2.5">
                    <TrendingUp className="h-5 w-5 text-cyan-500" />
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">EMPLOYABILITY INDEX</span>
                      <p className="text-sm font-extrabold text-slate-800">{summary.employabilityIndex || 0}%</p>
                      <span className={`text-[8px] font-bold ${summary.employabilityLabel === 'Excellent' ? 'text-green-500' : summary.employabilityLabel === 'Good' ? 'text-yellow-600' : 'text-red-500'}`}>{summary.employabilityLabel || 'Poor'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right text-[10px] text-slate-400 mt-4 font-medium">
                Last Updated: {data.lastUpdated || new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HODDashboard;
