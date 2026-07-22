import React, { useState, useEffect } from 'react';
import PageSkeleton from '../components/PageSkeleton';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { setCurrentAcademicYear } from '../store/authSlice';
import type { RootState } from '../store';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import {
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  GraduationCap,
  Calendar,
  Users,
  Award,
  TrendingUp,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { apiFetch, getCachedData } from '../utils/api';
import StudentAchievementCenter from '../components/StudentAchievementCenter';

const SGPAProgressionChart: React.FC<{ data: any[] }> = React.memo(({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
        <defs>
          <linearGradient id="colorSgpa" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="semester" stroke="#64748b" fontSize={10} tickFormatter={(v) => `Sem ${v}`} />
        <YAxis domain={[0, 10]} stroke="#64748b" fontSize={10} />
        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '12px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
        <Area
          type="monotone"
          dataKey="sgpa"
          name="SGPA"
          stroke="#6366f1"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorSgpa)"
          dot={{ r: 5, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff' }}
          activeDot={{ r: 7 }}
          isAnimationActive={true}
          animationDuration={1500}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

const SubjectAttendanceChart: React.FC<{ data: any[] }> = React.memo(({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 35 }}>
        <defs>
          <linearGradient id="colorAttd" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#059669" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" stroke="#64748b" fontSize={8} interval={0} angle={-25} textAnchor="end" height={50} />
        <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} />
        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '12px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
        <Bar
          dataKey="attendancePct"
          name="Attendance %"
          fill="url(#colorAttd)"
          radius={[6, 6, 0, 0]}
          isAnimationActive={true}
          animationDuration={1500}
        />
      </BarChart>
    </ResponsiveContainer>
  );
});

export const StudentDashboard: React.FC = () => {
  const dispatch = useDispatch();
  const currentAcademicYear = useSelector((state: RootState) => state.auth.currentAcademicYear);

  const cachedData = getCachedData('/analytics/student/dashboard');
  const cachedScore = getCachedData('/scoring/my-score');

  const [data, setData] = useState<any>(cachedData || null);
  const [scoreData, setScoreData] = useState<any>(cachedScore || null);
  const [loading, setLoading] = useState(!cachedData);
  const [showAchievementCenter, setShowAchievementCenter] = useState(false);

  const fetchDashboardData = async (isInitial = false) => {
    try {
      const cached = getCachedData('/analytics/student/dashboard');
      if (isInitial && !cached) {
        setLoading(true);
      }
      const res = await apiFetch('/analytics/student/dashboard');
      setData(res);
      try {
        const scoreRes = await apiFetch('/scoring/my-score');
        setScoreData(scoreRes);
      } catch (scoreErr) {
        console.error('Failed to fetch profile scoring:', scoreErr);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = getCachedData('/analytics/student/dashboard');
    if (cached) {
      setData(cached);
      setLoading(false);
      fetchDashboardData(false);
    } else {
      fetchDashboardData(true);
    }
    const interval = setInterval(() => fetchDashboardData(false), 60000);
    return () => clearInterval(interval);
  }, [currentAcademicYear]);

  if (loading && !data) {
    return <PageSkeleton />;
  }

  const summary = data?.summary || {};
  const recentAchievements = data?.recentAchievements || [];
  const isEligible = (summary.cgpa || 8.45) >= 7.0 && (summary.activeBacklogs || 0) === 0 && (summary.attendancePct || 92.3) >= 75;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-rose-600" />;
      default:
        return <Clock className="h-4 w-4 text-amber-600" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
      case 'REJECTED':
        return 'text-rose-700 bg-rose-50 border border-rose-200';
      default:
        return 'text-amber-700 bg-amber-50 border border-amber-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Main Banner - Dark Blue Pattern */}
      <div className="bg-[#0b1a50] text-white p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-white" />
          <h1 className="text-base md:text-lg font-bold uppercase tracking-wider text-white">Student Performance Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#122b7d] border border-white/20 px-3 py-1.5 rounded-lg">
            <Calendar className="h-4 w-4 text-white/80" />
            <span className="text-xs text-white font-semibold uppercase tracking-wider">Active Year: Year {currentAcademicYear}</span>
          </div>
          <button
            onClick={() => setShowAchievementCenter((value) => !value)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/95 text-white font-semibold text-xs rounded-lg transition-all active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" /> Submit Achievement
          </button>
        </div>
      </div>

      {/* SECTION: Profile Quantified Score */}
      {scoreData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-slate-900 to-[#1e1b4b] text-white p-5 rounded-xl border border-indigo-900/50 shadow-md"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse animate-duration-1000" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">Quantified Profile Score</h2>
              </div>
              <p className="text-[10px] text-indigo-200 mt-1">Rule-based scoring calculation out of 100 based on CGPA, attendance, and verified achievements. Click a year below to set it as active.</p>
            </div>
            <div className="flex gap-3 shrink-0 flex-wrap items-center">
              <div className="bg-[#122b7d] px-4 py-1.5 rounded-lg border border-indigo-500/30 flex items-center gap-3">
                <span className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider">Year {currentAcademicYear} Score</span>
                <span className="text-xl font-black text-white">
                  {scoreData.yearScores?.find((y: any) => y.year === currentAcademicYear)?.score ?? 0}
                  <span className="text-[10px] text-indigo-400 font-normal"> / 100</span>
                </span>
              </div>
              <div className="bg-indigo-900/60 px-5 py-2 rounded-xl border border-indigo-400/50 flex items-center gap-3 shadow-[0_0_15px_rgba(99,102,241,0.25)]">
                <span className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-wider">Overall Profile Score</span>
                <span className="text-3xl font-black text-white animate-blink">
                  {scoreData.overallScore}
                  <span className="text-xs text-indigo-400 font-normal"> / 100</span>
                </span>
              </div>
            </div>
          </div>

          {/* Year-Wise Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(yr => {
              const yrScoreObj = scoreData.yearScores?.find((y: any) => y.year === yr);
              const scoreVal = yrScoreObj ? yrScoreObj.score : null;
              const isActive = currentAcademicYear === yr;

              return (
                <div
                  key={yr}
                  onClick={() => dispatch(setCurrentAcademicYear(yr))}
                  className={`p-3 rounded-lg border transition-all cursor-pointer hover:shadow-glow-primary active:scale-[0.98] select-none ${
                    isActive
                      ? 'bg-indigo-950/70 border-primary ring-2 ring-primary/40 shadow-md scale-[1.02]'
                      : scoreVal !== null
                        ? 'bg-indigo-950/30 border-indigo-500/20 hover:border-indigo-400/40 shadow-sm'
                        : 'bg-slate-900/30 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400">Year {yr}</span>
                      {isActive && <span className="h-1.5 w-1.5 bg-primary rounded-full animate-ping"></span>}
                    </div>
                    {scoreVal !== null && (
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold">{scoreVal} / 100</span>
                    )}
                  </div>

                  {scoreVal !== null ? (
                    <div className="space-y-1 mt-2.5">
                      {Object.keys(yrScoreObj.breakdown || {}).map(cat => {
                        const val = yrScoreObj.breakdown[cat];
                        if (val > 0) {
                          return (
                            <div key={cat} className="flex justify-between text-[9px] text-slate-350">
                              <span className="capitalize">{cat.replace(/([A-Z])/g, ' $1')}</span>
                              <span className="font-semibold text-white">+{val}</span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-500 italic mt-3 text-center">
                      Academic Year Pending
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {showAchievementCenter && (
        <div id="submit-achievement">
          <StudentAchievementCenter />
        </div>
      )}

      {/* SECTION 1: Personal Academic & Extracurricular Profile */}
      <div className="border-l-4 border-l-primary pl-3 mb-2 mt-4">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">My Academic & Profile Summary</h2>
        <p className="text-[10px] text-slate-500">Your personal grade averages, attendance compliance, and verification stats.</p>
      </div>

      {/* KPI Cards Grid - Personal Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Personal CGPA */}
        <div className="bg-[#0f172a] text-white p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">My CGPA</span>
              <p className="text-2xl font-black text-white">{summary.cgpa || 'N/A'}</p>
            </div>
            <div className="bg-primary text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
              <GraduationCap className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="text-[9px] text-slate-400 mt-2">
            Status: <span className="text-emerald-400 font-semibold">{isEligible ? 'Placement Eligible' : 'Needs Review'}</span>
          </div>
        </div>

        {/* Personal Attendance */}
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-blue-755 uppercase tracking-wider block">My Attendance</span>
              <p className="text-2xl font-black text-slate-800">{summary.attendancePct !== undefined ? `${summary.attendancePct}%` : 'N/A'}</p>
            </div>
            <div className="bg-blue-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="text-[9px] text-slate-400 mt-2">
            Status: <span className={summary.attendancePct >= 75 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
              {summary.attendancePct >= 75 ? 'Compliance Safe' : 'Attendance Shortage'}
            </span>
          </div>
        </div>

        {/* Active Backlogs */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-rose-755 uppercase tracking-wider block">Active Backlogs</span>
              <p className="text-2xl font-black text-slate-800">{summary.activeBacklogs ?? 0}</p>
            </div>
            <div className="bg-rose-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="text-[9px] text-slate-400 mt-2">
            Status: <span className={(summary.activeBacklogs ?? 0) === 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
              {(summary.activeBacklogs ?? 0) === 0 ? 'Clear History' : 'Action Required'}
            </span>
          </div>
        </div>

        {/* Total Achievements */}
        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-purple-755 uppercase tracking-wider block">Achievements Logged</span>
              <p className="text-2xl font-black text-slate-800">{summary.achievementsCount || 0}</p>
            </div>
            <div className="bg-purple-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
              <Award className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="text-[9px] text-slate-400 mt-2">
            Verified: <span className="text-slate-600 font-bold">{summary.verifiedAchievementsCount || 0}</span>
          </div>
        </div>

        {/* Profile Completion */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-amber-755 uppercase tracking-wider block">Profile Completion</span>
              <p className="text-2xl font-black text-slate-800">{summary.profileCompletion || 0}%</p>
            </div>
            <div className="bg-amber-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <progress value={summary.profileCompletion || 0} max={100} className="w-full h-1.5 rounded-full overflow-hidden bg-slate-100 [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:bg-amber-500 [&::-moz-progress-bar]:bg-amber-500" />
          </div>
        </div>
      </div>

      {/* Personal Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
        {/* GPA Progression Line Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-xs font-bold text-slate-850 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <TrendingUp className="h-4.5 w-4.5 text-primary" /> My SGPA Progression
          </h3>
          <div className="h-64 w-full">
            {data?.charts?.gpaProgression?.length > 0 ? (
              <SGPAProgressionChart data={data.charts.gpaProgression} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-450 italic">No semester records uploaded.</div>
            )}
          </div>
        </div>

        {/* Subject wise attendance bar chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-xs font-bold text-slate-850 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calendar className="h-4.5 w-4.5 text-emerald-600" /> My Subject-Wise Attendance %
          </h3>
          <div className="h-64 w-full">
            {data?.charts?.subjectAttendance?.length > 0 ? (
              <SubjectAttendanceChart data={data.charts.subjectAttendance} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-450 italic">No attendance data found.</div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline & Progress Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-5">
          <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-3 uppercase tracking-wider">Submission Timeline</h3>
          <div className="relative border-l border-slate-150 ml-2 space-y-5 pt-2">
            {recentAchievements.length === 0 ? (
              <p className="text-xs text-slate-500 italic pl-6">No achievements logged. Upload a certificate to get started!</p>
            ) : (
              recentAchievements.map((ach: any) => (
                <div key={ach._id} className="relative pl-6">
                  {/* Timeline dot */}
                  <span className="absolute -left-2 top-1.5 h-4 w-4 bg-white border-2 border-primary rounded-full flex items-center justify-center">
                    <span className="h-1.5 w-1.5 bg-primary rounded-full"></span>
                  </span>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{ach.title}</h4>
                      <p className="text-[10px] text-slate-500">{ach.issuer}</p>
                      <span className="text-[9px] text-slate-400">{new Date(ach.date).toLocaleDateString()}</span>
                      {ach.remarks && (
                        <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1 italic">
                          Remarks: "{ach.remarks}"
                        </p>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold ${getStatusClass(ach.status)}`}>
                      {getStatusIcon(ach.status)} {ach.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Profile/Placement Prep side panel */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-3 uppercase tracking-wider">Placement Preparation</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Profile Completion</span>
              <span className="text-xs font-bold text-primary">{summary.profileCompletion}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <progress value={summary.profileCompletion || 0} max={100} className="w-full h-1.5 rounded-full overflow-hidden bg-slate-100 [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary" />
            </div>

            <div className="pt-2 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Resume Uploaded</span>
                {summary.hasResume ? (
                  <span className="text-emerald-600 font-bold">Yes</span>
                ) : (
                  <span className="text-rose-600 font-bold">No</span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Active Backlogs</span>
                <span className={`font-bold ${summary.activeBacklogs > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {summary.activeBacklogs}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Eligibility Status</span>
                {isEligible ? (
                  <span className="text-emerald-600 font-bold uppercase tracking-wider">ELIGIBLE</span>
                ) : (
                  <span className="text-rose-600 font-bold uppercase tracking-wider">INELIGIBLE</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
