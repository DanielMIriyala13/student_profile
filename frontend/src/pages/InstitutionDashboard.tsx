import React, { useState, useEffect } from 'react';
import PageSkeleton from '../components/PageSkeleton';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Eye,
  Award,
  Shield,
  BookOpen,
  Code,
  Activity,
  Star,
  Target,
  Search,
  Download,
  ArrowUpDown
} from 'lucide-react';
import { apiFetch, getCachedData } from '../utils/api';
import InstitutionExecutiveKpiSummary from '../components/InstitutionExecutiveKpiSummary';

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



const InstCgpaDistributionChart: React.FC<{ data: any[] }> = React.memo(({ data }) => (
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

const InstAttendanceTrendChart: React.FC<{ data: any[] }> = React.memo(({ data }) => (
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

export const InstitutionDashboard: React.FC = () => {
  const [filterYear, setFilterYear] = useState('');
  const [filterDept, setFilterDept] = useState('');

  // Table sorting & search states
  const [searchText, setSearchText] = useState('');
  const [sortField, setSortField] = useState('rollNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Drilldown states
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedYear, _setSelectedYear] = useState('');
  const [drilldownStudents, setDrilldownStudents] = useState<any[]>([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  if (drilldownLoading) { /* no-op to satisfy noUnusedLocals */ }

  // Student detail modal state
  const [activeStudent, setActiveStudent] = useState<any | null>(null);



  // Power BI Drilldown states
  const [pbMetric, setPbMetric] = useState<string | null>(null);
  const [pbPath, setPbPath] = useState<string[]>([]); // [range, department, year]
  const [pbData, setPbData] = useState<any[]>([]);
  const [pbLevel, setPbLevel] = useState<string>('distribution');
  const [pbLoading, setPbLoading] = useState(false);

  const fetchPbDrilldown = async (metric: string, path: string[]) => {
    setPbLoading(true);
    try {
      let query = `/analytics/institution/drilldown?metric=${metric}`;
      
      const pathYear = path.length > 2 ? path[2] : filterYear;

      if (pathYear) query += `&year=${pathYear}`;
      
      const res = await apiFetch(query);
      setPbData(res.data || []);
      setPbLevel(res.level || 'distribution');
    } catch (err) {
      console.error('Error fetching PB drilldown:', err);
    } finally {
      setPbLoading(false);
    }
  };

  useEffect(() => {
    if (pbMetric) {
      fetchPbDrilldown(pbMetric, pbPath);
    } else {
      setPbData([]);
      setPbLevel('distribution');
    }
  }, [pbMetric, pbPath, filterYear, filterDept]);

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setPbPath([]);
    } else {
      setPbPath(pbPath.slice(0, index + 1));
    }
  };

  const handleItemClick = (itemValue: string) => {
    setPbPath([...pbPath, itemValue]);
  };

  const handleExitDrilldown = () => {
    setPbMetric(null);
    setPbPath([]);
    setSearchText('');
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'placementReady': return 'Placement Readiness';
      case 'cgpa': return 'Academic CGPA';
      case 'attendance': return 'Attendance Analysis';
      case 'backlogs': return 'Backlog Analysis';
      case 'certifications': return 'Certifications';
      case 'internships': return 'Internship Analytics';
      case 'projects': return 'Project Analytics';
      case 'coding': return 'Coding Challenges';
      case 'placementDashboard': return 'Placement Performance';
      case 'risk': return 'Risk Analysis';
      case 'higherStudies': return 'Higher Studies Readiness';
      default: return metric;
    }
  };

  const fetchInstData = async (isInitial = false) => {
    try {
      let query = '/analytics/institution/dashboard?';
      const params = new URLSearchParams();
      if (filterYear) params.append('year', filterYear);
      if (filterDept) params.append('department', filterDept);
      query += params.toString();

      if (isInitial) {
        setLoading(true);
      }
      const res = await apiFetch(query);
      setData(res);
      // Select first department as default if available and not already selected
      if (res.departmentsComparison && res.departmentsComparison.length > 0 && !selectedDept) {
        setSelectedDept(res.departmentsComparison[0].department);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstData(true);
    const interval = setInterval(() => fetchInstData(false), 60000);
    return () => clearInterval(interval);
  }, [filterYear, filterDept]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortHeader = (field: string, label: string) => {
    const isSorted = sortField === field;
    return (
      <button 
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 hover:text-primary transition-colors focus:outline-none font-bold"
      >
        <span>{label}</span>
        <ArrowUpDown className={`h-3 w-3 ${isSorted ? 'text-primary' : 'text-slate-450'}`} />
      </button>
    );
  };

  const getFilteredAndSortedData = () => {
    let result = [...pbData];

    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter(stud => 
        stud.rollNumber?.toLowerCase().includes(lower) ||
        stud.name?.toLowerCase().includes(lower) ||
        stud.email?.toLowerCase().includes(lower)
      );
    }

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'cgpa') {
        aVal = a.cgpa || 0;
        bVal = b.cgpa || 0;
      } else if (sortField === 'overallScore') {
        aVal = a.overallScore || 0;
        bVal = b.overallScore || 0;
      }

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return sortOrder === 'asc' 
          ? (aVal > bVal ? 1 : -1)
          : (bVal > aVal ? 1 : -1);
      }
    });

    return result;
  };

  const sortedStudents = getFilteredAndSortedData();

  const exportToExcel = (studentsToExport: any[], categoryName: string) => {
    const excelData = studentsToExport.map(s => ({
      'Roll Number': s.rollNumber,
      'Name': s.name,
      'CGPA': s.cgpa?.toFixed(2) || '0.00',
      'Placement Readiness %': `${s.overallScore || 0}%`,
      'Email': s.email || '',
      'Section': s.section || '',
      'Current Status': s.isPlaced ? `Placed (${s.placedCompany})` : 'Not Placed'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    
    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 10 },
      { wch: 25 },
      { wch: 30 },
      { wch: 10 },
      { wch: 25 }
    ];

    XLSX.writeFile(workbook, `Placement_Readiness_${categoryName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDrilldownQuery = async (isInitial = false) => {
    if (!selectedDept || !selectedYear) return;
    const drilldownQuery = `/analytics/institution/dashboard?department=${encodeURIComponent(selectedDept)}&year=${selectedYear}`;
    const cachedDrilldown = getCachedData(drilldownQuery);
    if (isInitial && !cachedDrilldown && drilldownStudents.length === 0) {
      setDrilldownLoading(true);
    }
    try {
      const res = await apiFetch(drilldownQuery);
      setDrilldownStudents(res.drilldownStudents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setDrilldownLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDept && selectedYear) {
      const drilldownQuery = `/analytics/institution/dashboard?department=${encodeURIComponent(selectedDept)}&year=${selectedYear}`;
      const cachedDrilldown = getCachedData(drilldownQuery);
      if (cachedDrilldown) {
        setDrilldownStudents(cachedDrilldown.drilldownStudents || []);
        setDrilldownLoading(false);
        handleDrilldownQuery(false);
      } else {
        if (drilldownStudents.length === 0) {
          setDrilldownLoading(true);
        }
        handleDrilldownQuery(true);
      }
      const interval = setInterval(() => handleDrilldownQuery(false), 60000);
      return () => clearInterval(interval);
    } else {
      setDrilldownStudents([]);
    }
  }, [selectedDept, selectedYear]);



  if (loading && !data) {
    return <PageSkeleton />;
  }

  const summary = data?.summary || {};
  const comparison = data?.departmentsComparison || [];

  const cgpaDistribution = data?.cgpaDistribution || [];
  const attendanceTrend = data?.attendanceTrend || [];
  const activityPercentage = data?.activityPercentage || [];
  const academicPerformanceMix = data?.academicPerformanceMix || [];

  const isActivityAllZero = !activityPercentage.length || activityPercentage.every((item: any) => !item.value || item.value === 0);
  const activityChartData = isActivityAllZero
    ? [{ name: 'No verified activities yet', value: 100, color: '#cbd5e1' }]
    : activityPercentage;

  const isPerformanceAllZero = !academicPerformanceMix.length || academicPerformanceMix.every((item: any) => !item.value || item.value === 0);
  const performanceChartData = isPerformanceAllZero
    ? [{ name: 'No grade records', value: 100, color: '#cbd5e1' }]
    : academicPerformanceMix;

  return (
    <div className="space-y-6">


      {/* Global Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Academic Year Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Academic Year</label>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:border-primary transition-all"
          >
            <option value="">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
        </div>

        {/* Branch / Department Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Branch</label>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:border-primary transition-all"
          >
            <option value="">All Branches</option>
            {comparison.map((dept: any) => (
              <option key={dept.department} value={dept.department}>
                {dept.department}
              </option>
            ))}
          </select>
        </div>

      </div>

      <InstitutionExecutiveKpiSummary
        year={filterYear}
        branch={filterDept}
      />

      {pbMetric ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          {/* Panel Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Target className="h-4.5 w-4.5 text-primary" />
                {getMetricLabel(pbMetric)} Drill-Down Analysis
              </h2>
              {/* Breadcrumb Trail */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                <button 
                  onClick={() => handleBreadcrumbClick(-1)} 
                  className="hover:text-primary transition-colors hover:underline"
                >
                  Institution
                </button>
                {pbPath.map((segment, idx) => (
                  <React.Fragment key={idx}>
                    <span className="text-slate-400">/</span>
                    <button
                      disabled={idx === pbPath.length - 1}
                      onClick={() => handleBreadcrumbClick(idx)}
                      className={`transition-colors ${idx === pbPath.length - 1 ? 'text-slate-800 font-bold' : 'hover:text-primary hover:underline'}`}
                    >
                      {segment}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <button
              onClick={handleExitDrilldown}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all self-start md:self-auto"
            >
              Exit Drill-Down
            </button>
          </div>

          {pbLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <span className="text-xs text-slate-400 font-medium">Fetching registry drill-down data...</span>
            </div>
          ) : pbLevel === 'student' ? (
            <div className="space-y-4">
              {/* Search & Excel Export Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search by Roll Number, Name or Email..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <button
                  onClick={() => exportToExcel(sortedStudents, pbPath[pbPath.length - 1] || getMetricLabel(pbMetric))}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[#10b981] hover:bg-[#10b981]/90 text-white font-bold text-xs rounded-lg transition-all shadow-sm"
                >
                  <Download className="h-4 w-4" /> Export to Excel
                </button>
              </div>

              {/* Student registry drill-down table */}
              <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-505 font-bold">
                      <th className="py-3.5 px-4">{renderSortHeader('rollNumber', 'Roll Number')}</th>
                      <th className="py-3.5 px-4">{renderSortHeader('name', 'Student Name')}</th>
                      <th className="py-3.5 px-4">{renderSortHeader('cgpa', 'CGPA')}</th>
                      <th className="py-3.5 px-4">{renderSortHeader('overallScore', 'Placement Readiness %')}</th>
                      <th className="py-3.5 px-4">{renderSortHeader('email', 'Email')}</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500">Section</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500">Current Status</th>
                      <th className="py-3.5 px-4 text-right font-bold text-slate-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                    {sortedStudents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 italic font-medium">No students match the current filters or search term.</td>
                      </tr>
                    ) : (
                      sortedStudents.map((stud) => (
                        <tr key={stud._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-700">{stud.rollNumber}</td>
                          <td className="py-3 px-4 font-extrabold text-slate-900">{stud.name}</td>
                          <td className="py-3 px-4 text-slate-850 font-bold">{stud.cgpa?.toFixed(2) || '0.00'}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-750">{stud.overallScore || 0}%</span>
                              <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                                <div 
                                  className="h-full rounded-full" 
                                  style={{ 
                                    width: `${stud.overallScore || 0}%`,
                                    backgroundColor: 
                                      (stud.overallScore || 0) === 100 ? '#10b981' :
                                      (stud.overallScore || 0) >= 90 ? '#0d9488' :
                                      (stud.overallScore || 0) >= 80 ? '#3b82f6' :
                                      (stud.overallScore || 0) >= 70 ? '#f59e0b' : '#ef4444'
                                  }} 
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">{stud.email || 'N/A'}</td>
                          <td className="py-3 px-4"><span className="px-2 py-0.5 bg-slate-100 rounded text-slate-650 font-bold">{stud.section}</span></td>
                          <td className="py-3 px-4">
                            {stud.isPlaced ? (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.75 rounded-full border border-emerald-200">
                                Placed ({stud.placedCompany})
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.75 rounded-full border border-blue-200">
                                Not Placed
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setActiveStudent(stud)}
                              className="p-1.5 hover:bg-slate-100 text-slate-450 hover:text-primary rounded-lg transition-all"
                            >
                              <Eye className="h-4.5 w-4.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Category distribution checklist on the left */}
              <div className="lg:col-span-1 space-y-3">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-1">
                  Ranges & Categories
                </h3>
                <div className="space-y-3">
                  {pbData.map((item, idx) => {
                    const colors = [
                      { bg: 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-450', text: 'text-emerald-800', progress: 'bg-[#10b981]' },
                      { bg: 'bg-teal-50/70 border-teal-200 hover:border-teal-450', text: 'text-teal-800', progress: 'bg-[#0d9488]' },
                      { bg: 'bg-blue-50/70 border-blue-200 hover:border-blue-450', text: 'text-blue-800', progress: 'bg-[#3b82f6]' },
                      { bg: 'bg-amber-50/70 border-amber-200 hover:border-amber-450', text: 'text-amber-800', progress: 'bg-[#f59e0b]' },
                      { bg: 'bg-rose-50/70 border-rose-200 hover:border-rose-450', text: 'text-rose-800', progress: 'bg-[#ef4444]' }
                    ];
                    const design = colors[idx % colors.length];

                    return (
                      <div
                        key={idx}
                        onClick={() => handleItemClick(item.value || item.name)}
                        className={`p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-2.5 ${design.bg}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-black uppercase tracking-wider ${design.text}`}>{item.name}</span>
                          <span className={`text-xs font-black ${design.text}`}>{item.count} Students</span>
                        </div>
                        <div className="space-y-1">
                          <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${design.progress}`} style={{ width: `${item.pct}%` }} />
                          </div>
                          <span className="text-[9.5px] text-slate-500 font-bold block text-right">{item.pct}% of total filtered students</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Graphic distributions on the right */}
              <div className="lg:col-span-2 space-y-4 bg-slate-50/50 p-5 border border-slate-100 rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Doughnut Chart */}
                  <div className="h-64 flex flex-col justify-between">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
                      Doughnut Share
                    </h3>
                    <div className="h-52 w-full mt-2 relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pbData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="count"
                          >
                            {pbData.map((_, index) => {
                              const hexColors = ['#10b981', '#0d9488', '#3b82f6', '#f59e0b', '#ef4444'];
                              return <Cell key={`cell-${index}`} fill={hexColors[index % hexColors.length]} />;
                            })}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute text-center flex flex-col items-center justify-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                        <span className="text-xl font-black text-slate-800 leading-none mt-0.5">
                          {pbData.reduce((acc, curr) => acc + curr.count, 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bar Chart */}
                  <div className="h-64 flex flex-col justify-between">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
                      Bar Distribution
                    </h3>
                    <div className="h-52 w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pbData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                          <YAxis stroke="#64748b" fontSize={9} />
                          <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {pbData.map((_, index) => {
                              const hexColors = ['#10b981', '#0d9488', '#3b82f6', '#f59e0b', '#ef4444'];
                              return <Cell key={`cell-${index}`} fill={hexColors[index % hexColors.length]} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="border-l-4 border-l-purple-500 pl-3 mb-2 mt-6">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Institution-Wide Analytics & Benchmarks</h2>
            <p className="text-[10px] text-slate-500">Compare metrics against the institution-wide distributions, activities, and risk parameters.</p>
          </div>

          {/* Retained KPI Blocks */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
            {/* 1. Extra-Curricular */}
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

            {/* 2. Co-Curricular */}
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

            {/* 3. Sports Participants */}
            <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-purple-750 uppercase tracking-wider block">SPORTS PARTICIPANTS</span>
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

            {/* 4. NSS / NCC */}
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

            {/* 5. Star Coder */}
            <div 
              onClick={() => { setPbMetric('coding'); setPbPath([]); }}
              className={`bg-white p-4 rounded-xl border-2 flex flex-col justify-between min-h-[110px] hover:shadow-md cursor-pointer transition-all ${pbMetric === 'coding' ? 'border-primary bg-primary/5' : 'border-rose-200'}`}
            >
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

            {/* 6. Placement Readiness Meter */}
            <div 
              onClick={() => { setPbMetric('placementReady'); setPbPath([]); }}
              className={`bg-white p-4 rounded-xl border-2 shadow-md flex flex-col justify-between min-h-[110px] hover:shadow-lg cursor-pointer transition-all ${pbMetric === 'placementReady' ? 'border-primary bg-primary/5' : 'border-amber-300'}`}
            >
              <div className="flex flex-col items-center justify-between h-full py-0.5">
                <span className="text-[9.5px] font-black text-amber-700 uppercase tracking-wider block text-center">Placement Readiness</span>
                <div className="relative w-full h-14 flex items-center justify-center">
                  <svg viewBox="0 0 100 55" className="w-28 h-14">
                    <path d="M 10 50 A 40 40 0 0 1 21.72 21.72" fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" />
                    <path d="M 21.72 21.72 A 40 40 0 0 1 50 10" fill="none" stroke="#f97316" strokeWidth="8" />
                    <path d="M 50 10 A 40 40 0 0 1 78.28 21.72" fill="none" stroke="#eab308" strokeWidth="8" />
                    <path d="M 78.28 21.72 A 40 40 0 0 1 90 50" fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round" />
                    <g transform="translate(50, 50)">
                      <line x1="0" y1="0" x2="32" y2="0" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" transform={`rotate(${((summary.placementReadiness || 0) / 100) * 180 - 180})`} />
                      <circle cx="0" cy="0" r="5" fill="#0f172a" />
                    </g>
                  </svg>
                  <div className="absolute bottom-0 text-center">
                    <span className="text-sm font-black text-slate-800">{summary.placementReadiness || 0}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 7. GRE / IELTS */}
            <div 
              onClick={() => { setPbMetric('higherStudies'); setPbPath([]); }}
              className={`bg-white p-4 rounded-xl border-2 flex flex-col justify-between min-h-[110px] hover:shadow-md cursor-pointer transition-all ${pbMetric === 'higherStudies' ? 'border-primary bg-primary/5' : 'border-purple-200'}`}
            >
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

            {/* 8. Certifications */}
            <div 
              onClick={() => { setPbMetric('certifications'); setPbPath([]); }}
              className={`bg-white p-4 rounded-xl border-2 flex flex-col justify-between min-h-[110px] hover:shadow-md cursor-pointer transition-all ${pbMetric === 'certifications' ? 'border-primary bg-primary/5' : 'border-orange-200'}`}
            >
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
          </div>

          {/* Main Retained Charts Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
            {/* CGPA Distribution */}
            <div className="bg-white p-5 rounded-xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xs font-bold text-[#8b5cf6] uppercase tracking-wider mb-4 text-center">CGPA Distribution</h3>
              <div className="h-52 w-full">
                <InstCgpaDistributionChart data={cgpaDistribution} />
              </div>
            </div>

            {/* Attendance Trend */}
            <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 text-center">Attendance Trend</h3>
              <div className="h-52 w-full">
                <InstAttendanceTrendChart data={attendanceTrend} />
              </div>
            </div>

            {/* Activity Percentage */}
            <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 text-center">Activity Percentage</h3>
              <div className="flex items-center justify-between gap-2 h-44">
                <div className="w-[50%] h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={activityChartData}
                        outerRadius={55}
                        dataKey="value"
                        isAnimationActive={true}
                        animationDuration={2000}
                        animationEasing="ease-in-out"
                      >
                        {activityChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-[50%] space-y-1.5 text-[9px]">
                  {activityPercentage.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                      <span className="text-slate-600 truncate font-semibold">{item.name}</span>
                      <span className="font-extrabold text-slate-800 ml-auto">{item.value}%</span>
                    </div>
                  ))}
                  {isActivityAllZero && (
                    <div className="text-[9px] text-slate-450 italic text-center">No verified activities registered yet</div>
                  )}
                </div>
              </div>
            </div>

            {/* Academic Performance Mix */}
            <div className="bg-white p-5 rounded-xl border border-pink-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <h3 className="text-xs font-bold text-[#ec4899] uppercase tracking-wider mb-2 text-center">Academic Performance Mix</h3>
              <div className="flex items-center justify-between gap-2 h-44">
                <div className="w-[50%] h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={performanceChartData}
                        outerRadius={55}
                        dataKey="value"
                        isAnimationActive={true}
                        animationDuration={2000}
                        animationEasing="ease-in-out"
                      >
                        {performanceChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-[50%] space-y-1.5 text-[9px]">
                  {academicPerformanceMix.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                      <span className="text-slate-600 truncate font-semibold">{item.name}</span>
                      <span className="font-extrabold text-slate-800 ml-auto">{item.value}%</span>
                    </div>
                  ))}
                  {isPerformanceAllZero && (
                    <div className="text-[9px] text-slate-450 italic text-center">No grade mix data registered yet</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Risk Analysis Table */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm my-6">
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
                  <tr 
                    className="hover:bg-slate-50 cursor-pointer transition-colors" 
                    onClick={() => { setPbMetric('risk'); setPbPath(['Low Attendance']); }}
                  >
                    <td className="py-2.5 px-3 font-semibold">Attendance</td>
                    <td className="py-2.5 px-3 font-medium text-slate-500">&lt; 75%</td>
                    <td className="py-2.5 px-3 text-red-600 font-bold">
                      {data?.riskAnalysis?.attendance?.highCount ?? 0} ({data?.riskAnalysis?.attendance?.highPct ?? '0.0'}%)
                    </td>
                    <td className="py-2.5 px-3 text-yellow-600 font-semibold">
                      {data?.riskAnalysis?.attendance?.modCount ?? 0} ({data?.riskAnalysis?.attendance?.modPct ?? '0.0'}%)
                    </td>
                    <td className="py-2.5 px-3 text-green-600 font-semibold">
                      {data?.riskAnalysis?.attendance?.goodCount ?? 0} ({data?.riskAnalysis?.attendance?.goodPct ?? '0.0'}%)
                    </td>
                  </tr>
                  <tr 
                    className="hover:bg-slate-50 cursor-pointer transition-colors" 
                    onClick={() => { setPbMetric('risk'); setPbPath(['Low Academic Performance']); }}
                  >
                    <td className="py-2.5 px-3 font-semibold">CGPA</td>
                    <td className="py-2.5 px-3 font-medium text-slate-500">&lt; 6.5</td>
                    <td className="py-2.5 px-3 text-red-600 font-bold">
                      {data?.riskAnalysis?.cgpa?.highCount ?? 0} ({data?.riskAnalysis?.cgpa?.highPct ?? '0.0'}%)
                    </td>
                    <td className="py-2.5 px-3 text-yellow-600 font-semibold">
                      {data?.riskAnalysis?.cgpa?.modCount ?? 0} ({data?.riskAnalysis?.cgpa?.modPct ?? '0.0'}%)
                    </td>
                    <td className="py-2.5 px-3 text-green-600 font-semibold">
                      {data?.riskAnalysis?.cgpa?.goodCount ?? 0} ({data?.riskAnalysis?.cgpa?.goodPct ?? '0.0'}%)
                    </td>
                  </tr>
                  <tr 
                    className="hover:bg-slate-50 cursor-pointer transition-colors" 
                    onClick={() => { setPbMetric('backlogs'); setPbPath([]); }}
                  >
                    <td className="py-2.5 px-3 font-semibold">I Grades</td>
                    <td className="py-2.5 px-3 font-medium text-slate-500">&gt; 2</td>
                    <td className="py-2.5 px-3 text-red-600 font-bold">
                      {data?.riskAnalysis?.igrades?.highCount ?? 0} ({data?.riskAnalysis?.igrades?.highPct ?? '0.0'}%)
                    </td>
                    <td className="py-2.5 px-3 text-yellow-600 font-semibold">
                      {data?.riskAnalysis?.igrades?.modCount ?? 0} ({data?.riskAnalysis?.igrades?.modPct ?? '0.0'}%)
                    </td>
                    <td className="py-2.5 px-3 text-green-600 font-semibold">
                      {data?.riskAnalysis?.igrades?.goodCount ?? 0} ({data?.riskAnalysis?.igrades?.goodPct ?? '0.0'}%)
                    </td>
                  </tr>
                  <tr 
                    className="hover:bg-slate-50 cursor-pointer transition-colors" 
                    onClick={() => { setPbMetric('risk'); setPbPath(['High Backlogs']); }}
                  >
                    <td className="py-2.5 px-3 font-semibold font-semibold">R Grades</td>
                    <td className="py-2.5 px-3 font-medium text-slate-500">&gt; 1</td>
                    <td className="py-2.5 px-3 text-red-600 font-bold">
                      {data?.riskAnalysis?.rgrades?.highCount ?? 0} ({data?.riskAnalysis?.rgrades?.highPct ?? '0.0'}%)
                    </td>
                    <td className="py-2.5 px-3 text-yellow-600 font-semibold">
                      {data?.riskAnalysis?.rgrades?.modCount ?? 0} ({data?.riskAnalysis?.rgrades?.modPct ?? '0.0'}%)
                    </td>
                    <td className="py-2.5 px-3 text-green-600 font-semibold">
                      {data?.riskAnalysis?.rgrades?.goodCount ?? 0} ({data?.riskAnalysis?.rgrades?.goodPct ?? '0.0'}%)
                    </td>
                  </tr>
                  <tr 
                    className="hover:bg-slate-50 cursor-pointer transition-colors" 
                    onClick={() => { setPbMetric('placementDashboard'); setPbPath([]); }}
                  >
                    <td className="py-2.5 px-3 font-semibold font-semibold">CRT Performance</td>
                    <td className="py-2.5 px-3 font-medium text-slate-500">&lt; 50%</td>
                    <td className="py-2.5 px-3 text-red-600 font-bold">
                      {data?.riskAnalysis?.crt?.highCount ?? 0} ({data?.riskAnalysis?.crt?.highPct ?? '0.0'}%)
                    </td>
                    <td className="py-2.5 px-3 text-yellow-600 font-semibold">
                      {data?.riskAnalysis?.crt?.modCount ?? 0} ({data?.riskAnalysis?.crt?.modPct ?? '0.0'}%)
                    </td>
                    <td className="py-2.5 px-3 text-green-600 font-semibold">
                      {data?.riskAnalysis?.crt?.goodCount ?? 0} ({data?.riskAnalysis?.crt?.goodPct ?? '0.0'}%)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <span className="text-[10px] text-slate-400 block mt-4 italic">
              Note: All percentages are calculated based on total strength.
            </span>
          </div>
        </>
      )}

      {/* Student Details overlay Modal drawer */}
      {activeStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-6 relative border border-slate-100 shadow-xl">
            <button
              onClick={() => setActiveStudent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 transition-all text-xs font-bold"
            >
              Close
            </button>
            <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
              <div className="h-12 w-12 bg-primary/10 text-primary font-bold rounded-xl border border-primary/20 flex items-center justify-center text-xl">
                {activeStudent.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">{activeStudent.name}</h3>
                <span className="text-[10px] text-slate-400">Roll No: {activeStudent.rollNumber} | Year: {selectedYear}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Academic Overview</span>
                <p>Cumulative GPA: <span className="font-semibold text-slate-800">{activeStudent.cgpa}</span></p>
                <p>Attendance Rate: <span className="font-semibold text-slate-800">{activeStudent.attendancePct}%</span></p>
                <p>Active Backlogs: <span className="font-semibold text-slate-800">{activeStudent.activeBacklogs}</span></p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Placement Overview</span>
                <p>Status: <span className="font-semibold text-slate-800">{activeStudent.isPlaced ? 'Placed' : 'Not Placed'}</span></p>
                {activeStudent.isPlaced && (
                  <>
                    <p>Company: <span className="font-semibold text-slate-800">{activeStudent.placedCompany}</span></p>
                    <p>Package: <span className="font-semibold text-slate-800">{activeStudent.salaryPackage} LPA</span></p>
                  </>
                )}
                <p>Skills Profiled: <span className="font-semibold text-slate-800">{activeStudent.skillsCount || 0} skills</span></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstitutionDashboard;
