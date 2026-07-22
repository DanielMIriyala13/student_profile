import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Search as SearchIcon,
  Filter,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  RefreshCw,
  Award,
  ExternalLink,
  Code,
  X
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import type { RootState } from '../store';
import * as XLSX from 'xlsx';

export const Search: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<'students' | 'achievements'>('students');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentAchievements, setStudentAchievements] = useState<any[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);

  useEffect(() => {
    if (!selectedStudent) {
      setStudentAchievements([]);
      return;
    }

    const fetchAchievements = async () => {
      try {
        setLoadingAchievements(true);
        const res = await apiFetch(`/achievements/student?studentId=${selectedStudent.id}`);
        setStudentAchievements(res.achievements || []);
      } catch (err) {
        console.error('Failed to fetch student achievements', err);
      } finally {
        setLoadingAchievements(false);
      }
    };

    fetchAchievements();
  }, [selectedStudent]);

  // Advanced Filters
  const [department, setDepartment] = useState(user?.role === 'HOD' ? (user?.department || 'ALL') : 'ALL');
  const [year, setYear] = useState('ALL');
  const [verificationStatus, setVerificationStatus] = useState('ALL');
  const [achievementType, setAchievementType] = useState('ALL');

  useEffect(() => {
    if (user?.role === 'HOD' && user?.department) {
      setDepartment(user.department);
    }
  }, [user]);

  const executeSearch = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('type', searchType);
      if (query.trim()) params.append('q', query.trim());
      if (department !== 'ALL') params.append('department', department);
      if (year !== 'ALL') params.append('year', year);
      if (verificationStatus !== 'ALL') params.append('status', verificationStatus);
      if (achievementType !== 'ALL') params.append('achievementType', achievementType);

      const res = await apiFetch(`/search?${params.toString()}`);
      setResults(res.results || []);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      executeSearch();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, searchType, department, year, verificationStatus, achievementType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch();
  };

  const handleResetFilters = () => {
    setQuery('');
    setDepartment('ALL');
    setYear('ALL');
    setVerificationStatus('ALL');
    setAchievementType('ALL');
  };

  const handleExportExcel = () => {
    if (results.length === 0) return;

    let excelData = [];
    if (searchType === 'students') {
      excelData = results.map((student: any) => ({
        'Roll Number': student.rollNumber,
        'Name': student.name,
        'Email': student.email,
        'Branch': student.branch,
        'Department': student.department,
        'Year': student.year,
        'Section': student.section,
        'Faculty Mentor': student.counselorName || 'Not Assigned',
        'CGPA': student.cgpa,
        'Attendance (%)': student.attendancePct,
        'Active Backlogs': student.activeBacklogs,
        'Overall Profile Score': student.overallScore || 0,
        'Profile Completion (%)': student.profileCompletion || 0,
        'Total Achievements': student.totalAchievements || 0,
        'Pending Approvals': student.pendingAchievements || 0,
        'Approved Achievements': student.approvedAchievements || 0,
        'Rejected Achievements': student.rejectedAchievements || 0,
        'Eligibility': student.isEligible ? 'Eligible' : 'Ineligible',
        'Placement Status': student.isPlaced ? 'Placed' : 'Not Placed',
        'Placed Company': student.placedCompany || 'N/A',
        'Salary Package (LPA)': student.salaryPackage || 'N/A',
      }));
    } else {
      excelData = results.map((ach: any) => ({
        'Student Name': ach.studentName,
        'Roll Number': ach.studentRoll,
        'Branch': ach.studentBranch,
        'Type': ach.type,
        'Title': ach.title,
        'Issuer': ach.issuer,
        'Date': new Date(ach.date).toLocaleDateString(),
        'Status': ach.status,
        'Remarks': ach.remarks || 'N/A',
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Search Results');
    XLSX.writeFile(workbook, `EduPulse_Search_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportCSV = () => {
    if (results.length === 0) return;

    let headers = [];
    let rows = [];

    if (searchType === 'students') {
      headers = [
        'Roll Number', 'Name', 'Email', 'Branch', 'Department', 'Year', 'Section',
        'Faculty Mentor', 'CGPA', 'Attendance', 'Backlogs',
        'Overall Profile Score', 'Profile Completion', 'Total Achievements',
        'Pending Approvals', 'Approved Achievements', 'Rejected Achievements',
        'Eligibility', 'Status', 'Company', 'Package'
      ];
      rows = results.map((s: any) => [
        s.rollNumber,
        s.name,
        s.email,
        s.branch,
        s.department,
        s.year,
        s.section,
        s.counselorName || 'Not Assigned',
        s.cgpa,
        s.attendancePct,
        s.activeBacklogs,
        s.overallScore || 0,
        s.profileCompletion || 0,
        s.totalAchievements || 0,
        s.pendingAchievements || 0,
        s.approvedAchievements || 0,
        s.rejectedAchievements || 0,
        s.isEligible ? 'Eligible' : 'Ineligible',
        s.isPlaced ? 'Placed' : 'Not Placed',
        s.placedCompany || 'N/A',
        s.salaryPackage || 'N/A',
      ]);
    } else {
      headers = ['Student Name', 'Roll Number', 'Branch', 'Type', 'Title', 'Issuer', 'Date', 'Status', 'Remarks'];
      rows = results.map((ach: any) => [
        ach.studentName,
        ach.studentRoll,
        ach.studentBranch,
        ach.type,
        ach.title,
        ach.issuer,
        new Date(ach.date).toLocaleDateString(),
        ach.status,
        ach.remarks || 'N/A',
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `EduPulse_Search_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-[#0b1a50] text-white p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-md">
        <div>
          <h1 className="text-base md:text-lg font-bold uppercase tracking-wider text-white">Enterprise Search Engine</h1>
          <p className="text-xs text-white/80">Search students, verify certifications, inspect projects, and filter by placement readiness.</p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={handleExportExcel}
            disabled={results.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-all"
          >
            <Download className="h-4 w-4" /> Excel Export
          </button>
          <button
            onClick={handleExportCSV}
            disabled={results.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-650 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-all"
          >
            <FileSpreadsheet className="h-4 w-4" /> CSV Export
          </button>
        </div>
      </div>

      {/* Main Search Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-5 h-fit">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
              <Filter className="h-4.5 w-4.5 text-primary" /> Advanced Filters
            </h3>
            <button
              onClick={handleResetFilters}
              className="text-[10px] text-primary hover:underline font-semibold"
            >
              Reset All
            </button>
          </div>

          <div className="space-y-4">
            {/* General Filters */}
            {user?.role !== 'STUDENT' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={user?.role === 'HOD'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 disabled:opacity-75 disabled:cursor-not-allowed focus:outline-none focus:border-primary"
                  >
                    <option value="ALL">All Departments</option>
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Electronics & Communication Engineering">Electronics & Communication Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Year</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-primary"
                  >
                    <option value="ALL">All Years</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
              </>
            )}

            {/* Achievement specific filters */}
            {searchType === 'achievements' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Achievement Type</label>
                  <select
                    value={achievementType}
                    onChange={(e) => setAchievementType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-primary"
                  >
                    <option value="ALL">All Types</option>
                    <option value="CERTIFICATION">Certification</option>
                    <option value="PROJECT">Project</option>
                    <option value="INTERNSHIP">Internship</option>
                    <option value="RESEARCH_PAPER">Research Paper</option>
                    <option value="SPORTS">Sports</option>
                    <option value="CLUB">Club Activity</option>
                    <option value="HACKATHON">Hackathon</option>
                    <option value="WORKSHOP">Workshop</option>
                    <option value="COMPETITION">Competition</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Verification Status</label>
                  <select
                    value={verificationStatus}
                    onChange={(e) => setVerificationStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-primary"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content Pane */}
        <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-6">
          {/* Tabs & Search Bar */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              {/* Type Switcher */}
              <div className="flex p-1 bg-slate-100 rounded-xl w-full md:w-auto">
                <button
                  onClick={() => setSearchType('students')}
                  className={`flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all ${searchType === 'students'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  Students Registry
                </button>
                <button
                  onClick={() => setSearchType('achievements')}
                  className={`flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all ${searchType === 'achievements'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  Achievements Repository
                </button>
              </div>

              {/* Refresh Trigger */}
              <button
                onClick={executeSearch}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-all flex items-center gap-1 text-xs font-bold"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
            </div>

            {/* Search Input Box */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <SearchIcon className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  searchType === 'students'
                    ? 'Search by roll number, name, email...'
                    : 'Search certifications, project titles, keywords...'
                }
                className="w-full pl-12 pr-28 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 px-4 py-1.5 bg-primary hover:bg-primary/95 text-white font-semibold text-xs rounded-xl transition-all"
              >
                Search
              </button>
            </form>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto min-h-[300px]">
            {loading ? (
              <div className="flex h-[300px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-slate-400 space-y-2">
                <FileText className="h-10 w-10 text-slate-350" />
                <p className="text-xs italic">No matching records found.</p>
              </div>
            ) : searchType === 'students' ? (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold">
                    <th className="py-2.5 px-3">Roll No & Name</th>
                    <th className="py-2.5 px-3">Profile Score</th>
                    <th className="py-2.5 px-3">Branch & Dept</th>
                    <th className="py-2.5 px-3">Year / Section</th>
                    <th className="py-2.5 px-3">CGPA & Attendance</th>
                    <th className="py-2.5 px-3">Placement</th>
                    <th className="py-2.5 px-3">Eligibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {results.map((stud: any) => (
                    <tr key={stud.id} className="hover:bg-slate-50/85 cursor-pointer transition-colors" onClick={() => setSelectedStudent(stud)}>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800">{stud.name}</p>
                        <span className="text-[10px] text-slate-400">{stud.rollNumber}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2.5 py-0.5 bg-primary/15 border border-primary/20 text-primary font-bold text-xs rounded-full">
                          {stud.overallScore || 0}/100
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-700">{stud.branch}</p>
                        <span className="text-[10px] text-slate-400">{stud.department}</span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-700">{stud.year} Year</p>
                        <span className="text-[10px] text-slate-450">Sec {stud.section}</span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-[10px] text-slate-550">
                          GPA: <span className="font-bold text-slate-700">{stud.cgpa}</span>
                        </p>
                        <p className="text-[10px] text-slate-550">
                          Attd: <span className="font-bold text-slate-700">{stud.attendancePct}%</span>
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        {stud.isPlaced ? (
                          <div>
                            <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold rounded-full">
                              Placed
                            </span>
                            <p className="text-[9px] text-slate-700 mt-1 font-bold">{stud.placedCompany}</p>
                            <span className="text-[8px] text-slate-400">Package: {stud.salaryPackage} LPA</span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-550 text-[9px] font-semibold rounded-full">
                            Not Placed
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((ach: any) => (
                  <div key={ach.id} className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 flex flex-col justify-between transition-colors">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start">
                        <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold rounded-full uppercase">
                          {ach.type}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[9px] font-bold rounded-full flex items-center gap-1 ${ach.status === 'VERIFIED'
                              ? 'text-emerald-700 bg-emerald-50 border border-emerald-250'
                              : ach.status === 'REJECTED'
                                ? 'text-rose-700 bg-rose-50 border border-rose-250'
                                : 'text-amber-700 bg-amber-50 border border-amber-250'
                            }`}
                        >
                          {ach.status === 'VERIFIED' && <CheckCircle className="h-3 w-3" />}
                          {ach.status === 'REJECTED' && <XCircle className="h-3 w-3" />}
                          {ach.status === 'PENDING' && <Clock className="h-3 w-3" />}
                          {ach.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-xs tracking-tight">{ach.title}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">Issuer: <span className="text-slate-700 font-semibold">{ach.issuer}</span></p>
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{ach.description || 'No description provided.'}</p>
                    </div>

                    <div className="pt-2.5 border-t border-slate-200 flex justify-between items-center text-[10px]">
                      <div>
                        <p className="font-bold text-slate-700">{ach.studentName}</p>
                        <span className="text-[9px] text-slate-400">{ach.studentRoll} | {ach.studentBranch}</span>
                      </div>
                      {ach.fileUrl ? (
                        <a
                          href={ach.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 font-semibold text-primary hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" /> View Proof
                        </a>
                      ) : (
                        <span className="text-slate-400">No proof</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student Detail Modal (Complete Student View for Admin/Faculty) */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-start p-6 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-800">{selectedStudent.name}</h2>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold rounded-full">
                    Score: {selectedStudent.overallScore || 0}/100
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Roll Number: <span className="text-slate-850 font-semibold">{selectedStudent.rollNumber}</span> | {selectedStudent.branch} | {selectedStudent.department}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 flex-1">
              {/* Info Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CGPA</span>
                  <p className="text-xl font-extrabold text-slate-800 mt-1">{selectedStudent.cgpa}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance</span>
                  <p className="text-xl font-extrabold text-slate-800 mt-1">{selectedStudent.attendancePct}%</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Backlogs</span>
                  <p className="text-xl font-extrabold text-slate-800 mt-1">{selectedStudent.activeBacklogs}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Section</span>
                  <p className="text-xl font-extrabold text-slate-800 mt-1">Sec {selectedStudent.section}</p>
                </div>
              </div>

              {/* Professional & Coding Profiles Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Code className="h-4 w-4 text-primary" /> Coding & Professional Profiles
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* LeetCode */}
                  <div className="p-3 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">LeetCode</p>
                      <p className="text-[11px] font-semibold text-slate-700 truncate max-w-[120px]">
                        {selectedStudent.profiles?.leetcode ? 'Linked' : 'Not Linked'}
                      </p>
                    </div>
                    {selectedStudent.profiles?.leetcode && (
                      <a
                        href={selectedStudent.profiles.leetcode}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 hover:bg-slate-100 rounded-lg text-primary"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>

                  {/* CodeChef */}
                  <div className="p-3 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">CodeChef</p>
                      <p className="text-[11px] font-semibold text-slate-700 truncate max-w-[120px]">
                        {selectedStudent.profiles?.codechef ? 'Linked' : 'Not Linked'}
                      </p>
                    </div>
                    {selectedStudent.profiles?.codechef && (
                      <a
                        href={selectedStudent.profiles.codechef}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 hover:bg-slate-100 rounded-lg text-primary"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>

                  {/* GitHub */}
                  <div className="p-3 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">GitHub</p>
                      <p className="text-[11px] font-semibold text-slate-700 truncate max-w-[120px]">
                        {selectedStudent.profiles?.github ? 'Linked' : 'Not Linked'}
                      </p>
                    </div>
                    {selectedStudent.profiles?.github && (
                      <a
                        href={selectedStudent.profiles.github}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 hover:bg-slate-100 rounded-lg text-primary"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>

                  {/* LinkedIn */}
                  <div className="p-3 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">LinkedIn</p>
                      <p className="text-[11px] font-semibold text-slate-700 truncate max-w-[120px]">
                        {selectedStudent.profiles?.linkedin ? 'Linked' : 'Not Linked'}
                      </p>
                    </div>
                    {selectedStudent.profiles?.linkedin && (
                      <a
                        href={selectedStudent.profiles.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 hover:bg-slate-100 rounded-lg text-primary"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Verified Achievements & Certifications */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="h-4.5 w-4.5 text-primary" /> Verified Achievements & Certifications
                </h3>
                {loadingAchievements ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  </div>
                ) : studentAchievements.filter((a: any) => a.status === 'VERIFIED').length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-400">
                    <p className="text-xs italic">No verified achievements found for this student.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {studentAchievements
                      .filter((a: any) => a.status === 'VERIFIED')
                      .map((ach: any) => (
                        <div key={ach._id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[8px] font-bold rounded-full uppercase">
                                {ach.type}
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-[8px] text-emerald-600 font-bold">
                                <CheckCircle className="h-3 w-3" /> Verified
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-800 text-xs">{ach.title}</h4>
                            <p className="text-[10px] text-slate-550">Issuer: <span className="text-slate-700 font-semibold">{ach.issuer}</span></p>
                            <p className="text-[10px] text-slate-500 line-clamp-2">{ach.description || 'No description provided.'}</p>
                          </div>
                          <div className="pt-2.5 mt-2 border-t border-slate-200/60 flex justify-between items-center text-[10px]">
                            <span className="text-slate-400">{new Date(ach.date).toLocaleDateString()}</span>
                            {ach.fileUrl && (
                              <a
                                href={ach.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 font-semibold text-primary hover:underline"
                              >
                                <FileText className="h-3.5 w-3.5" /> View Proof
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;
