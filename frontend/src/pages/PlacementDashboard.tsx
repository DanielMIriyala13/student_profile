import React, { useState, useEffect } from 'react';
import PageSkeleton from '../components/PageSkeleton';
import { Building, Download, Search, CheckCircle, XCircle, FileSpreadsheet, GraduationCap, TrendingUp } from 'lucide-react';
import { apiFetch } from '../utils/api';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const PlacementDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [eligibilityFilter, setEligibilityFilter] = useState('ALL'); // ALL, ELIGIBLE, INELIGIBLE
  const [placementFilter, setPlacementFilter] = useState('ALL'); // ALL, PLACED, UNPLACED
  const [branchFilter, setBranchFilter] = useState('ALL');

  const fetchPlacementData = async () => {
    try {
      if (!data) {
        setLoading(true);
      }
      const res = await apiFetch('/analytics/placement/dashboard');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlacementData();
  }, []);

  const handleExportExcel = () => {
    if (!filteredStudents || filteredStudents.length === 0) return;

    // Map to simple key-value structure for excel
    const excelData = filteredStudents.map((student: any) => ({
      'Roll Number': student.rollNumber,
      'Name': student.name,
      'Branch': student.branch,
      'CGPA': student.cgpa,
      'Attendance (%)': student.attendancePct,
      'Active Backlogs': student.activeBacklogs,
      'Placement Eligibility': student.isEligible ? 'Eligible' : 'Ineligible',
      'Placement Status': student.isPlaced ? 'Placed' : 'Not Placed',
      'Company Hired': student.placedCompany || 'N/A',
      'Package (LPA)': student.salaryPackage || 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Placement Eligibility Report');

    // Save file
    XLSX.writeFile(workbook, `Placement_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportCSV = () => {
    if (!filteredStudents || filteredStudents.length === 0) return;

    const headers = ['Roll Number', 'Name', 'Branch', 'CGPA', 'Attendance (%)', 'Active Backlogs', 'Eligibility', 'Status', 'Company', 'Package'];
    const rows = filteredStudents.map((s: any) => [
      s.rollNumber,
      s.name,
      s.branch,
      s.cgpa,
      s.attendancePct,
      s.activeBacklogs,
      s.isEligible ? 'Eligible' : 'Ineligible',
      s.isPlaced ? 'Placed' : 'Not Placed',
      s.placedCompany || 'N/A',
      s.salaryPackage || 'N/A'
    ]);

    const csvContent = [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Placement_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !data) {
    return <PageSkeleton />;
  }

  const summary = data?.summary || {};
  const students = data?.students || [];
  const upcomingDrives = data?.upcomingDrives || [];

  // Filter students array
  const filteredStudents = students.filter((student: any) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEligibility =
      eligibilityFilter === 'ALL' ||
      (eligibilityFilter === 'ELIGIBLE' && student.isEligible) ||
      (eligibilityFilter === 'INELIGIBLE' && !student.isEligible);

    const matchesPlacement =
      placementFilter === 'ALL' ||
      (placementFilter === 'PLACED' && student.isPlaced) ||
      (placementFilter === 'UNPLACED' && !student.isPlaced);

    const matchesBranch =
      branchFilter === 'ALL' ||
      student.branch === branchFilter;

    return matchesSearch && matchesEligibility && matchesPlacement && matchesBranch;
  });

  // Calculate dynamic chart analytics
  const placementStatusData = [
    { name: 'Placed', value: students.filter((s: any) => s.isPlaced).length, color: '#10b981' },
    { name: 'Unplaced', value: students.filter((s: any) => !s.isPlaced).length, color: '#f43f5e' },
  ];

  const packageDistributionData = [
    { range: '< 5 LPA', count: students.filter((s: any) => s.isPlaced && s.salaryPackage < 5).length },
    { range: '5-10 LPA', count: students.filter((s: any) => s.isPlaced && s.salaryPackage >= 5 && s.salaryPackage < 10).length },
    { range: '10-15 LPA', count: students.filter((s: any) => s.isPlaced && s.salaryPackage >= 10 && s.salaryPackage < 15).length },
    { range: '> 15 LPA', count: students.filter((s: any) => s.isPlaced && s.salaryPackage >= 15).length },
  ];

  const hiringPartnersMap: { [key: string]: number } = {};
  students.forEach((s: any) => {
    if (s.isPlaced && s.placedCompany) {
      hiringPartnersMap[s.placedCompany] = (hiringPartnersMap[s.placedCompany] || 0) + 1;
    }
  });
  const topHiringPartnersData = Object.keys(hiringPartnersMap).map(comp => ({
    company: comp,
    hired: hiringPartnersMap[comp]
  })).sort((a, b) => b.hired - a.hired).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0b1a50] text-white p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-md">
        <div>
          <h1 className="text-base md:text-lg font-bold uppercase tracking-wider text-white">Placement Intelligence</h1>
          <p className="text-xs text-white/80">Monitor recruitment drives, verify company criteria, and export lists of eligible talent.</p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-all"
          >
            <Download className="h-4 w-4" /> Excel Export
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-650 text-white font-semibold text-xs rounded-lg transition-all"
          >
            <FileSpreadsheet className="h-4 w-4" /> CSV Export
          </button>
        </div>
      </div>

      {/* Summaries */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Placement Rate */}
        <div className="bg-white p-4 rounded-xl border border-teal-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-teal-755 uppercase tracking-wider block font-black">Placement Rate</span>
            <p className="text-xl font-extrabold text-slate-800 mt-2">{summary.placementRatePct || 0}%</p>
            <span className="text-[8px] text-slate-400 mt-1 block">Placed vs Registered</span>
          </div>
          <div className="bg-teal-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
            <TrendingUp className="h-4.5 w-4.5" />
          </div>
        </div>

        {/* Placed Students */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-emerald-755 uppercase tracking-wider block font-black">Placed Students</span>
            <p className="text-xl font-extrabold text-slate-800 mt-2">{summary.placedCount || 0}</p>
          </div>
          <div className="bg-emerald-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
            <CheckCircle className="h-4.5 w-4.5" />
          </div>
        </div>

        {/* Unplaced Students */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-rose-755 uppercase tracking-wider block font-black">Unplaced Students</span>
            <p className="text-xl font-extrabold text-slate-800 mt-2">{summary.unplacedCount || 0}</p>
          </div>
          <div className="bg-rose-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
            <XCircle className="h-4.5 w-4.5" />
          </div>
        </div>

        {/* Placement Eligible */}
        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-purple-755 uppercase tracking-wider block font-black">Placement Eligible</span>
            <p className="text-xl font-extrabold text-slate-800 mt-2">{summary.eligibleCount || 0}</p>
          </div>
          <div className="bg-purple-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
            <GraduationCap className="h-4.5 w-4.5" />
          </div>
        </div>

        {/* Active Companies */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow col-span-2 md:col-span-1">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-amber-755 uppercase tracking-wider block font-black">Active Companies</span>
            <p className="text-xl font-extrabold text-slate-800 mt-2">{summary.totalRecruitmentDrives || 0}</p>
          </div>
          <div className="bg-amber-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
            <Building className="h-4.5 w-4.5" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Placement Status Donut */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-850 mb-2 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <CheckCircle className="h-4.5 w-4.5 text-emerald-600" /> Placement Status Breakdown
          </h3>
          <div className="flex items-center justify-between gap-2 h-48">
            <div className="w-[50%] h-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={placementStatusData}
                    innerRadius={40}
                    outerRadius={55}
                    paddingAngle={4}
                    dataKey="value"
                    isAnimationActive={true}
                    animationDuration={2000}
                  >
                    {placementStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <span className="text-base font-black text-slate-800">{summary.placementRatePct || 0}%</span>
                <p className="text-[8px] text-slate-400 font-bold uppercase">Placed</p>
              </div>
            </div>
            <div className="w-[50%] space-y-2 text-[10px]">
              {placementStatusData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-600 font-semibold">{item.name}</span>
                  <span className="font-extrabold text-slate-800 ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Salary Package brackets */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-xs font-bold text-slate-850 mb-2 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <TrendingUp className="h-4.5 w-4.5 text-primary" /> Salary Package Distribution
          </h3>
          <div className="h-48 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={packageDistributionData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                <XAxis dataKey="range" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }} />
                <Bar
                  dataKey="count"
                  name="Students Placed"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={2000}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Recruiting Partners */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-xs font-bold text-slate-850 mb-2 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="h-4.5 w-4.5 text-purple-600" /> Top Recruiting Partners
          </h3>
          <div className="h-48 w-full mt-4">
            {topHiringPartnersData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topHiringPartnersData} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} allowDecimals={false} />
                  <YAxis dataKey="company" type="category" stroke="#64748b" fontSize={9} width={60} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }} />
                  <Bar
                    dataKey="hired"
                    name="Hired"
                    fill="#8b5cf6"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={true}
                    animationDuration={2000}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-450 italic">No hiring data logged.</div>
            )}
          </div>
        </div>
      </div>

      {/* Company Drives Panel & Student List */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Drives */}
        <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4 h-fit">
          <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2 uppercase tracking-wider">
            <Building className="h-4.5 w-4.5 text-primary" /> Active Recruitment Drives
          </h3>
          <div className="space-y-3.5">
            {upcomingDrives.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No upcoming drives scheduled.</p>
            ) : (
              upcomingDrives.map((drv: any) => (
                <div key={drv._id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <p className="text-xs font-bold text-slate-800">{drv.name}</p>
                  <span className="text-[10px] text-primary font-bold">{drv.role}</span>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-[9px] text-slate-500">
                    <span>Package: {drv.packageAmount} LPA</span>
                    <span>Date: {new Date(drv.dateOfVisit).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Filters and Grid of Students */}
        <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
              <GraduationCap className="h-4.5 w-4.5 text-primary" /> Student Placement List
            </h3>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search roll no, name..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-border rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-bold text-slate-400 uppercase">Branch</span>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-700 cursor-pointer focus:outline-none"
              >
                <option value="ALL">All Branches</option>
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="IT">IT</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-bold text-slate-400 uppercase">Eligibility</span>
              <select
                value={eligibilityFilter}
                onChange={(e) => setEligibilityFilter(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-700 cursor-pointer focus:outline-none"
              >
                <option value="ALL">All Students</option>
                <option value="ELIGIBLE">Eligible Only</option>
                <option value="INELIGIBLE">Ineligible Only</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-bold text-slate-400 uppercase">Status</span>
              <select
                value={placementFilter}
                onChange={(e) => setPlacementFilter(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-700 cursor-pointer focus:outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="PLACED">Placed Only</option>
                <option value="UNPLACED">Unplaced Only</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {filteredStudents.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">No students match current filter selections.</p>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold">
                    <th className="py-2.5">Roll No & Name</th>
                    <th className="py-2.5">Branch</th>
                    <th className="py-2.5">Performance</th>
                    <th className="py-2.5">Resume / Code</th>
                    <th className="py-2.5">Eligibility</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredStudents.map((stud: any) => (
                    <tr key={stud.id} className="hover:bg-slate-50">
                      <td className="py-3">
                        <p className="font-bold text-slate-800">{stud.name}</p>
                        <span className="text-[10px] text-slate-400">{stud.rollNumber}</span>
                      </td>
                      <td className="py-3 font-semibold text-slate-600">{stud.branch}</td>
                      <td className="py-3">
                        <p className="text-[10px] text-slate-500">
                          GPA: <span className="font-bold text-slate-700">{stud.cgpa}</span>
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Attendance: <span className="font-bold text-slate-700">{stud.attendancePct}%</span>
                        </p>
                      </td>
                      <td className="py-3 space-y-1">
                        {stud.hasResume ? (
                          <span className="text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-bold block w-fit">
                            Resume OK
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold block w-fit">
                            No Resume
                          </span>
                        )}
                        {stud.hasCodingHandles ? (
                          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold block w-fit">
                            Coding OK
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-bold block w-fit">
                            No Coding
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {stud.isEligible ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 font-bold">
                            <CheckCircle className="h-3 w-3" /> Eligible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[9px] text-rose-600 font-bold">
                            <XCircle className="h-3 w-3" /> Ineligible
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {stud.isPlaced ? (
                          <div>
                            <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold rounded-full">
                              Placed
                            </span>
                            <p className="text-[9px] text-slate-700 mt-1 font-bold">{stud.placedCompany}</p>
                            <span className="text-[8px] text-slate-500">Package: {stud.salaryPackage} LPA</span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 text-[9px] font-semibold rounded-full">
                            Not Placed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlacementDashboard;
