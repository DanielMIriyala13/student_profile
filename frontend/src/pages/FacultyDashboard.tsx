import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import PageSkeleton from '../components/PageSkeleton';
import { motion } from 'framer-motion';
import {
  CheckSquare,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  X,
  FileText,
  RefreshCw,
  Users,
  HelpCircle,
  ExternalLink,
  Award,
  Code,
  Trophy
} from 'lucide-react';
import { apiFetch, getCachedData } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const categoryPointsMap: Record<string, number> = {
  'Normal Certificate': 2,
  'NPTEL Elite': 3,
  'NPTEL Silver': 5,
  'NPTEL Gold': 5,
  'NPTEL Topper': 5,
  'Global Certification': 10,
};

const cambPointsMap: Record<string, number> = {
  'A2 Key': 2,
  'B1 Preliminary': 4,
  'B2 First': 6,
  'C1 Advanced': 8,
  'C2 Proficiency': 10,
};

const coPointsMap: Record<string, number> = {
  'Department Level': 1,
  'Institute Level': 2,
  'Inter-University Level': 3,
  'Zonal Level': 4,
  'National / International Level': 5,
};

const extraPointsMap: Record<string, number> = {
  'Department Level': 1,
  'Institute Level': 2,
  'Inter-University Level': 3,
  'Zonal Level': 4,
  'National / International Level': 5,
};

const projectPointsMap: Record<string, number> = {
  Department: 2,
  Institute: 4,
  'Inter-University': 6,
  'National / International': 10,
};

const challengePointsMap: Record<string, number> = {
  'Hackathon Participation': 2,
  'Hackathon Merit': 4,
  'Coding Challenge Participation': 2,
  'Coding Challenge Merit': 3,
};

const roleScoreMap: Record<string, number> = {
  'CR / LR / ARC / SAC – Members': 3,
  'Coordinators': 5,
};

const getCachedFacultyData = () => {
  const stats = getCachedData('/analytics/faculty/dashboard');
  const pending = getCachedData('/achievements/pending');
  const pendingCerts = getCachedData('/certifications/pending');
  const pendingProjects = getCachedData('/projects/pending');
  const pendingCamb = getCachedData('/cambridge/pending');
  const mappings = getCachedData('/cambridge/score-mappings');
  const pendingCo = getCachedData('/co-curricular/pending');
  const pendingExtra = getCachedData('/extra-curricular/pending');
  const pendingCoding = getCachedData('/coding-challenges/pending');
  const pendingLeadership = getCachedData('/leadership-activities/pending');
  const pendingSports = getCachedData('/physical-fitness/pending');

  return {
    stats: stats || null,
    pending: pending?.achievements || [],
    pendingCerts: pendingCerts?.certifications || [],
    pendingProjects: pendingProjects?.projects || [],
    pendingCamb: pendingCamb?.certifications || [],
    mappings: mappings?.mappings || [],
    pendingCo: pendingCo?.activities || [],
    pendingExtra: pendingExtra?.activities || [],
    pendingCoding: pendingCoding?.challenges || [],
    pendingLeadership: pendingLeadership?.activities || [],
    pendingSports: pendingSports?.activities || [],
  };
};

const GradeDistributionChart: React.FC<{ charts: any }> = React.memo(({ charts }) => {
  const gradeDistributionData = [
    { name: 'Excellent (>=8.5)', count: charts?.gradeDistribution?.excellent || 0 },
    { name: 'Good (7.0-8.5)', count: charts?.gradeDistribution?.good || 0 },
    { name: 'Average (5.0-7.0)', count: charts?.gradeDistribution?.average || 0 },
    { name: 'Poor (<5.0)', count: charts?.gradeDistribution?.poor || 0 },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={gradeDistributionData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
          <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
          <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
          <Tooltip />
          <Bar
            dataKey="count"
            name="Students"
            fill="#3b82f6"
            radius={[6, 6, 0, 0]}
            isAnimationActive={true}
            animationDuration={2000}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

const AttendanceRiskChart: React.FC<{ charts: any }> = React.memo(({ charts }) => {
  const attendanceRiskData = [
    { name: 'Safe (>=75%)', value: charts?.attendanceRisk?.safe || 0, color: '#10b981' },
    { name: 'At Risk (<75%)', value: charts?.attendanceRisk?.risk || 0, color: '#f43f5e' },
  ];

  return (
    <div className="flex items-center justify-between gap-4 h-56">
      <div className="w-[50%] h-full relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={attendanceRiskData}
              innerRadius={45}
              outerRadius={65}
              paddingAngle={4}
              dataKey="value"
              isAnimationActive={true}
              animationDuration={2000}
            >
              {attendanceRiskData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute text-center">
          <span className="text-xl font-black text-slate-808">
            {charts?.attendanceRisk?.risk || 0}
          </span>
          <p className="text-[8px] text-slate-400 font-bold uppercase">At Risk</p>
        </div>
      </div>
      <div className="w-[50%] space-y-2.5 text-[10px]">
        {attendanceRiskData.map((item, idx) => {
          const total = (charts?.attendanceRisk?.safe || 0) + (charts?.attendanceRisk?.risk || 0);
          const pct = total > 0 ? ((item.value / total) * 105).toFixed(1) : 0;
          return (
            <div key={idx} className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.name.includes('Safe') ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              <span className="text-slate-600 font-semibold">{item.name}</span>
              <span className="font-extrabold text-slate-808 ml-auto">{item.value} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export const FacultyDashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const cached = getCachedFacultyData();

  const [loading, setLoading] = useState(!cached.stats);
  const [dashboardData, setDashboardData] = useState<any>(cached.stats);
  const [pendingQueue, setPendingQueue] = useState<any[]>(cached.pending);
  const [pendingCertsQueue, setPendingCertsQueue] = useState<any[]>(cached.pendingCerts);
  const [pendingProjectsQueue, setPendingProjectsQueue] = useState<any[]>(cached.pendingProjects);
  const [pendingCambQueue, setPendingCambQueue] = useState<any[]>(cached.pendingCamb);
  const [cambMappings, setCambMappings] = useState<any[]>(cached.mappings);
  const [pendingCoQueue, setPendingCoQueue] = useState<any[]>(cached.pendingCo);
  const [pendingExtraQueue, setPendingExtraQueue] = useState<any[]>(cached.pendingExtra);
  const [pendingCodingQueue, setPendingCodingQueue] = useState<any[]>(cached.pendingCoding);
  const [pendingLeadershipQueue, setPendingLeadershipQueue] = useState<any[]>(cached.pendingLeadership);
  const [pendingSportsQueue, setPendingSportsQueue] = useState<any[]>(cached.pendingSports);

  // Tab State
  const [activeTab, setActiveTab] = useState<'analytics' | 'achievements' | 'certifications' | 'projects' | 'cambridge' | 'cocurricular' | 'extracurricular' | 'sports' | 'coding' | 'leadership' | 'approved' | 'rejected'>('analytics');

  // Approved/Rejected history and filters state
  const [historyLoading, setHistoryLoading] = useState(false);
  const [processedRecords, setProcessedRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Editing state
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editScore, setEditScore] = useState<number | string>('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editStatus, setEditStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMsg, setEditMsg] = useState('');

  // Audit Logs state
  const [activeAuditRecord, setActiveAuditRecord] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Detail Modal state
  const [detailRecord, setDetailRecord] = useState<any | null>(null);

  // Verification form states (Achievements)
  const [activeVerification, setActiveVerification] = useState<any | null>(null);
  const [remarks, setRemarks] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [showRejectRemarks, setShowRejectRemarks] = useState(false);

  // Verification form states (Certifications)
  const [activeCertVerification, setActiveCertVerification] = useState<any | null>(null);
  const [certCategoryOverride, setCertCategoryOverride] = useState('Normal Certificate');
  const [certScoreOverride, setCertScoreOverride] = useState<number>(2);
  const [certRemarks, setCertRemarks] = useState('');
  const [certVerifying, setCertVerifying] = useState(false);
  const [certActionMsg, setCertActionMsg] = useState('');
  const [showCertRejectRemarks, setShowCertRejectRemarks] = useState(false);

  // Verification form states (Projects)
  const [activeProjectVerification, setActiveProjectVerification] = useState<any | null>(null);
  const [projectLevelOverride, setProjectLevelOverride] = useState('Department');
  const [projectScoreOverride, setProjectScoreOverride] = useState<number>(2);
  const [projectRemarks, setProjectRemarks] = useState('');
  const [projectVerifying, setProjectVerifying] = useState(false);
  const [projectActionMsg, setProjectActionMsg] = useState('');
  const [showProjectRejectRemarks, setShowProjectRejectRemarks] = useState(false);

  // Verification form states (Cambridge)
  const [activeCambVerification, setActiveCambVerification] = useState<any | null>(null);
  const [cambLevelOverride, setCambLevelOverride] = useState('B2 First');
  const [cambScoreOverride, setCambScoreOverride] = useState<number>(6);
  const [cambRemarks, setCambRemarks] = useState('');
  const [cambVerifying, setCambVerifying] = useState(false);
  const [cambActionMsg, setCambActionMsg] = useState('');
  const [showCambRejectRemarks, setShowCambRejectRemarks] = useState(false);

  // Verification form states (Co-Curricular)
  const [activeCoVerification, setActiveCoVerification] = useState<any | null>(null);
  const [coLevelOverride, setCoLevelOverride] = useState('Institute Level');
  const [coScoreOverride, setCoScoreOverride] = useState<number>(2);
  const [coRemarks, setCoRemarks] = useState('');
  const [coVerifying, setCoVerifying] = useState(false);
  const [coActionMsg, setCoActionMsg] = useState('');
  const [showCoRejectRemarks, setShowCoRejectRemarks] = useState(false);

  // Verification form states (Extra-Curricular)
  const [activeExtraVerification, setActiveExtraVerification] = useState<any | null>(null);
  const [extraLevelOverride, setExtraLevelOverride] = useState('Institute Level');
  const [extraScoreOverride, setExtraScoreOverride] = useState<number>(5);
  const [extraRemarks, setExtraRemarks] = useState('');
  const [extraVerifying, setExtraVerifying] = useState(false);
  const [extraActionMsg, setExtraActionMsg] = useState('');
  const [showExtraRejectRemarks, setShowExtraRejectRemarks] = useState(false);

  // Verification form states (Coding Challenges)
  const [activeCodingVerification, setActiveCodingVerification] = useState<any | null>(null);
  const [codingCategoryOverride, setCodingCategoryOverride] = useState('Hackathon Participation');
  const [codingScoreOverride, setCodingScoreOverride] = useState<number>(2);
  const [codingRemarks, setCodingRemarks] = useState('');
  const [codingVerifying, setCodingVerifying] = useState(false);
  const [codingActionMsg, setCodingActionMsg] = useState('');
  const [showCodingRejectRemarks, setShowCodingRejectRemarks] = useState(false);

  // Verification form states (Leadership Activities)
  const [activeLeadershipVerification, setActiveLeadershipVerification] = useState<any | null>(null);
  const [leadRoleOverride, setLeadRoleOverride] = useState<'CR / LR / ARC / SAC – Members' | 'Coordinators'>('CR / LR / ARC / SAC – Members');
  const [leadScoreOverride, setLeadScoreOverride] = useState<number>(3);
  const [leadRemarks, setLeadRemarks] = useState('');
  const [leadVerifying, setLeadVerifying] = useState(false);
  const [leadActionMsg, setLeadActionMsg] = useState('');
  const [showLeadRejectRemarks, setShowLeadRejectRemarks] = useState(false);

  // Verification form states (Physical Fitness / Sports)
  const [activeSportsVerification, setActiveSportsVerification] = useState<any | null>(null);
  const [sportsRemarks, setSportsRemarks] = useState('');
  const [sportsVerifying, setSportsVerifying] = useState(false);
  const [sportsActionMsg, setSportsActionMsg] = useState('');
  const [showSportsRejectRemarks, setShowSportsRejectRemarks] = useState(false);

  // Bulk uploads states
  const [attendanceJson, setAttendanceJson] = useState('');
  const [marksJson, setMarksJson] = useState('');
  const [bulkMsg, setBulkMsg] = useState('');

  const loadData = async (isInitial = false) => {
    try {
      if (isInitial && !cached.stats) {
        setLoading(true);
      }
      const [
        stats,
        pending,
        pendingCerts,
        pendingProjects,
        pendingCamb,
        mappings,
        pendingCo,
        pendingExtra,
        pendingCoding,
        pendingLeadership,
        pendingSports
      ] = await Promise.all([
        apiFetch('/analytics/faculty/dashboard'),
        apiFetch('/achievements/pending'),
        apiFetch('/certifications/pending'),
        apiFetch('/projects/pending'),
        apiFetch('/cambridge/pending'),
        apiFetch('/cambridge/score-mappings'),
        apiFetch('/co-curricular/pending'),
        apiFetch('/extra-curricular/pending'),
        apiFetch('/coding-challenges/pending'),
        apiFetch('/leadership-activities/pending'),
        apiFetch('/physical-fitness/pending')
      ]);

      setDashboardData(stats);
      setPendingQueue(pending.achievements || []);
      setPendingCertsQueue(pendingCerts.certifications || []);
      setPendingProjectsQueue(pendingProjects.projects || []);
      setPendingCambQueue(pendingCamb.certifications || []);
      setCambMappings(mappings.mappings || []);
      setPendingCoQueue(pendingCo.activities || []);
      setPendingExtraQueue(pendingExtra.activities || []);
      setPendingCodingQueue(pendingCoding.challenges || []);
      setPendingLeadershipQueue(pendingLeadership.activities || []);
      setPendingSportsQueue(pendingSports.activities || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => loadData(false), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch approved/rejected history from unified endpoint
  const loadHistory = async (statusVal: 'APPROVED' | 'REJECTED') => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('status', statusVal);
      if (searchQuery) params.append('q', searchQuery);
      if (filterYear) params.append('academicYear', filterYear);
      if (filterDept) params.append('department', filterDept);
      if (filterSection) params.append('section', filterSection);
      if (filterModule) params.append('module', filterModule);
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);

      const data = await apiFetch(`/faculty/achievements?${params.toString()}`);
      setProcessedRecords(data.results || []);
    } catch (err) {
      console.error('Failed to load processed history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Helper to format date with strictly 4-digit year (YYYY)
  const formatDate = (dateVal: string | Date | undefined | null) => {
    if (!dateVal) return 'N/A';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Sync approved/rejected history whenever tab or filters/search change
  useEffect(() => {
    if (activeTab === 'approved' || activeTab === 'rejected') {
      loadHistory(activeTab === 'approved' ? 'APPROVED' : 'REJECTED');
    }
  }, [activeTab, searchQuery, filterYear, filterDept, filterSection, filterModule, filterStartDate, filterEndDate]);

  // Edit Handlers
  const handleOpenEdit = (record: any) => {
    setEditingRecord(record);
    setEditCategory(record.categoryOrLevel || '');
    setEditScore(record.score !== undefined ? record.score : '');
    setEditRemarks(record.remarks || '');
    setEditStatus(record.status === 'APPROVED' || record.status === 'VERIFIED' ? 'APPROVED' : 'REJECTED');
    setEditMsg('');
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    setSavingEdit(true);
    setEditMsg('');
    try {
      await apiFetch(`/faculty/achievements/${editingRecord.module}/${editingRecord.id}/edit`, {
        method: 'PUT',
        bodyData: {
          category: editCategory,
          score: editScore === '' ? undefined : Number(editScore),
          remarks: editRemarks,
          status: editStatus
        }
      });
      setEditMsg('✅ Changes saved and scoring recalculated successfully!');
      
      // Reload both dashboards stats and current list
      loadData();
      loadHistory(activeTab === 'approved' ? 'APPROVED' : 'REJECTED');
      
      // Close modal after delay
      setTimeout(() => {
        setEditingRecord(null);
      }, 1500);
    } catch (err: any) {
      setEditMsg(`❌ Save failed: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  // Audit Log Timeline Handlers
  const handleOpenAudit = async (record: any) => {
    setActiveAuditRecord(record);
    setLoadingAudit(true);
    setAuditLogs([]);
    try {
      const data = await apiFetch(`/faculty/achievements/${record.module}/${record.id}/audit`);
      setAuditLogs(data.history || []);
    } catch (err) {
      console.error('Failed to fetch audit history:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Update score automatically when category changes in faculty dropdown
  const handleCategoryChange = (cat: string) => {
    setCertCategoryOverride(cat);
    setCertScoreOverride(categoryPointsMap[cat] || 2);
  };

  // Verify Achievement handler
  const handleVerify = async (status: 'VERIFIED' | 'REJECTED') => {
    if (!activeVerification) return;
    setVerifying(true);
    setActionMsg('');
    try {
      await apiFetch(`/achievements/${activeVerification._id}/verify`, {
        method: 'PUT',
        bodyData: { status, remarks },
      });
      setActionMsg(`✅ Submission successfully marked as ${status.toLowerCase()}!`);
      setRemarks('');
      setShowRejectRemarks(false);
      setActiveVerification(null);
      loadData();
    } catch (err: any) {
      setActionMsg(`❌ Verification failed: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  // Verify Certification handlers (Approve / Reject)
  const handleCertApprove = async () => {
    if (!activeCertVerification) return;
    setCertVerifying(true);
    setCertActionMsg('');
    try {
      await apiFetch(`/certifications/${activeCertVerification._id}/approve`, {
        method: 'PUT',
        bodyData: {
          certificateCategory: certCategoryOverride,
          facultyApprovedScore: Number(certScoreOverride),
          remarks: certRemarks
        },
      });
      setCertActionMsg('✅ Certification approved successfully!');
      setCertRemarks('');
      setShowCertRejectRemarks(false);
      setActiveCertVerification(null);
      loadData();
    } catch (err: any) {
      setCertActionMsg(`❌ Approval failed: ${err.message}`);
    } finally {
      setCertVerifying(false);
    }
  };

  const handleCertReject = async () => {
    if (!activeCertVerification) return;
    if (!certRemarks.trim()) {
      setCertActionMsg('❌ Rejection feedback/remarks is mandatory.');
      return;
    }
    setCertVerifying(true);
    setCertActionMsg('');
    try {
      await apiFetch(`/certifications/${activeCertVerification._id}/reject`, {
        method: 'PUT',
        bodyData: { remarks: certRemarks },
      });
      setCertActionMsg('✅ Certification rejected and feedback sent.');
      setCertRemarks('');
      setShowCertRejectRemarks(false);
      setActiveCertVerification(null);
      loadData();
    } catch (err: any) {
      setCertActionMsg(`❌ Rejection failed: ${err.message}`);
    } finally {
      setCertVerifying(false);
    }
  };

  const handleProjectLevelChange = (level: string) => {
    setProjectLevelOverride(level);
    setProjectScoreOverride(projectPointsMap[level] || 2);
  };

  const handleProjectApprove = async () => {
    if (!activeProjectVerification) return;
    setProjectVerifying(true);
    setProjectActionMsg('');
    try {
      await apiFetch(`/projects/${activeProjectVerification._id}/approve`, {
        method: 'PUT',
        bodyData: {
          projectLevel: projectLevelOverride,
          facultyApprovedScore: Number(projectScoreOverride),
          remarks: projectRemarks,
        },
      });
      setProjectActionMsg('✅ Project approved successfully!');
      setProjectRemarks('');
      setShowProjectRejectRemarks(false);
      setActiveProjectVerification(null);
      loadData();
    } catch (err: any) {
      setProjectActionMsg(`❌ Approval failed: ${err.message}`);
    } finally {
      setProjectVerifying(false);
    }
  };

  const handleProjectReject = async () => {
    if (!activeProjectVerification) return;
    if (!projectRemarks.trim()) {
      setProjectActionMsg('❌ Rejection feedback/remarks is mandatory.');
      return;
    }
    setProjectVerifying(true);
    setProjectActionMsg('');
    try {
      await apiFetch(`/projects/${activeProjectVerification._id}/reject`, {
        method: 'PUT',
        bodyData: { remarks: projectRemarks },
      });
      setProjectActionMsg('✅ Project rejected and feedback sent.');
      setProjectRemarks('');
      setShowProjectRejectRemarks(false);
      setActiveProjectVerification(null);
      loadData();
    } catch (err: any) {
      setProjectActionMsg(`❌ Rejection failed: ${err.message}`);
    } finally {
      setProjectVerifying(false);
    }
  };

  // Verify Cambridge handlers (Approve / Reject)
  const handleCambLevelChange = (level: string) => {
    setCambLevelOverride(level);
    const match = cambMappings.find((m: any) => m.level === level);
    setCambScoreOverride(match ? match.score : (cambPointsMap[level] || 2));
  };

  const handleCambApprove = async () => {
    if (!activeCambVerification) return;
    setCambVerifying(true);
    setCambActionMsg('');
    try {
      await apiFetch(`/cambridge/${activeCambVerification._id}/approve`, {
        method: 'PUT',
        bodyData: {
          certificateLevel: cambLevelOverride,
          facultyApprovedScore: Number(cambScoreOverride),
          remarks: cambRemarks
        },
      });
      setCambActionMsg('✅ Cambridge Certificate approved successfully!');
      setCambRemarks('');
      setShowCambRejectRemarks(false);
      setActiveCambVerification(null);
      loadData();
    } catch (err: any) {
      setCambActionMsg(`❌ Approval failed: ${err.message}`);
    } finally {
      setCambVerifying(false);
    }
  };

  const handleCambReject = async () => {
    if (!activeCambVerification) return;
    if (!cambRemarks.trim()) {
      setCambActionMsg('❌ Rejection feedback/remarks is mandatory.');
      return;
    }
    setCambVerifying(true);
    setCambActionMsg('');
    try {
      await apiFetch(`/cambridge/${activeCambVerification._id}/reject`, {
        method: 'PUT',
        bodyData: { remarks: cambRemarks },
      });
      setCambActionMsg('✅ Cambridge Certificate rejected and feedback sent.');
      setCambRemarks('');
      setShowCambRejectRemarks(false);
      setActiveCambVerification(null);
      loadData();
    } catch (err: any) {
      setCambActionMsg(`❌ Rejection failed: ${err.message}`);
    } finally {
      setCambVerifying(false);
    }
  };

  // Verify Co-Curricular handlers (Approve / Reject)
  const handleCoLevelChange = (level: string) => {
    setCoLevelOverride(level);
    setCoScoreOverride(coPointsMap[level] || 1);
  };

  const handleCoApprove = async () => {
    if (!activeCoVerification) return;
    setCoVerifying(true);
    setCoActionMsg('');
    try {
      await apiFetch(`/co-curricular/${activeCoVerification._id}/approve`, {
        method: 'PUT',
        bodyData: {
          activityLevel: coLevelOverride,
          facultyApprovedScore: Number(coScoreOverride),
          remarks: coRemarks
        },
      });
      setCoActionMsg('✅ Co-Curricular Activity approved successfully!');
      setCoRemarks('');
      setShowCoRejectRemarks(false);
      setActiveCoVerification(null);
      loadData();
    } catch (err: any) {
      setCoActionMsg(`❌ Approval failed: ${err.message}`);
    } finally {
      setCoVerifying(false);
    }
  };

  const handleCoReject = async () => {
    if (!activeCoVerification) return;
    if (!coRemarks.trim()) {
      setCoActionMsg('❌ Rejection feedback/remarks is mandatory.');
      return;
    }
    setCoVerifying(true);
    setCoActionMsg('');
    try {
      await apiFetch(`/co-curricular/${activeCoVerification._id}/reject`, {
        method: 'PUT',
        bodyData: { remarks: coRemarks },
      });
      setCoActionMsg('✅ Co-Curricular Activity rejected and feedback sent.');
      setCoRemarks('');
      setShowCoRejectRemarks(false);
      setActiveCoVerification(null);
      loadData();
    } catch (err: any) {
      setCoActionMsg(`❌ Rejection failed: ${err.message}`);
    } finally {
      setCoVerifying(false);
    }
  };

  // Verify Extra-Curricular handlers (Approve / Reject)
  const handleExtraLevelChange = (level: string) => {
    setExtraLevelOverride(level);
    setExtraScoreOverride(extraPointsMap[level] || 1);
  };

  const handleExtraApprove = async () => {
    if (!activeExtraVerification) return;
    setExtraVerifying(true);
    setExtraActionMsg('');
    try {
      await apiFetch(`/extra-curricular/${activeExtraVerification._id}/approve`, {
        method: 'PUT',
        bodyData: {
          activityLevel: extraLevelOverride,
          category: activeExtraVerification.category,
          facultyApprovedScore: Number(extraScoreOverride),
          remarks: extraRemarks
        },
      });
      setExtraActionMsg('✅ Extra-Curricular Activity approved successfully!');
      setExtraRemarks('');
      setShowExtraRejectRemarks(false);
      setActiveExtraVerification(null);
      loadData();
    } catch (err: any) {
      setExtraActionMsg(`❌ Approval failed: ${err.message}`);
    } finally {
      setExtraVerifying(false);
    }
  };

  const handleExtraReject = async () => {
    if (!activeExtraVerification) return;
    if (!extraRemarks.trim()) {
      setExtraActionMsg('❌ Rejection feedback/remarks is mandatory.');
      return;
    }
    setExtraVerifying(true);
    setExtraActionMsg('');
    try {
      await apiFetch(`/extra-curricular/${activeExtraVerification._id}/reject`, {
        method: 'PUT',
        bodyData: { remarks: extraRemarks },
      });
      setExtraActionMsg('✅ Extra-Curricular Activity rejected and feedback sent.');
      setExtraRemarks('');
      setShowExtraRejectRemarks(false);
      setActiveExtraVerification(null);
      loadData();
    } catch (err: any) {
      setExtraActionMsg(`❌ Rejection failed: ${err.message}`);
    } finally {
      setExtraVerifying(false);
    }
  };

  // Verify Physical Fitness / Sports handlers (Approve / Reject)
  const handleSportsApprove = async () => {
    if (!activeSportsVerification) return;
    setSportsVerifying(true);
    setSportsActionMsg('');
    try {
      await apiFetch(`/physical-fitness/${activeSportsVerification._id}/approve`, {
        method: 'PUT',
        bodyData: { remarks: sportsRemarks },
      });
      setSportsActionMsg('✅ Sports record approved successfully!');
      setSportsRemarks('');
      setShowSportsRejectRemarks(false);
      setActiveSportsVerification(null);
      loadData();
    } catch (err: any) {
      setSportsActionMsg(`❌ Approval failed: ${err.message}`);
    } finally {
      setSportsVerifying(false);
    }
  };

  const handleSportsReject = async () => {
    if (!activeSportsVerification) return;
    if (!sportsRemarks.trim()) {
      setSportsActionMsg('❌ Rejection feedback/remarks is mandatory.');
      return;
    }
    setSportsVerifying(true);
    setSportsActionMsg('');
    try {
      await apiFetch(`/physical-fitness/${activeSportsVerification._id}/reject`, {
        method: 'PUT',
        bodyData: { remarks: sportsRemarks },
      });
      setSportsActionMsg('✅ Sports record rejected and feedback sent.');
      setSportsRemarks('');
      setShowSportsRejectRemarks(false);
      setActiveSportsVerification(null);
      loadData();
    } catch (err: any) {
      setSportsActionMsg(`❌ Rejection failed: ${err.message}`);
    } finally {
      setSportsVerifying(false);
    }
  };

  // Verify Coding Challenge handlers (Approve / Reject)
  const handleCodingCategoryChange = (cat: string) => {
    setCodingCategoryOverride(cat);
    setCodingScoreOverride(challengePointsMap[cat] || 2);
  };

  const handleCodingApprove = async () => {
    if (!activeCodingVerification) return;
    setCodingVerifying(true);
    setCodingActionMsg('');
    try {
      await apiFetch(`/coding-challenges/${activeCodingVerification._id}/approve`, {
        method: 'PUT',
        bodyData: {
          achievementCategory: codingCategoryOverride,
          facultyApprovedScore: Number(codingScoreOverride),
          remarks: codingRemarks
        },
      });
      setCodingActionMsg('✅ Coding Challenge approved successfully!');
      setCodingRemarks('');
      setShowCodingRejectRemarks(false);
      setActiveCodingVerification(null);
      loadData();
    } catch (err: any) {
      setCodingActionMsg(`❌ Approval failed: ${err.message}`);
    } finally {
      setCodingVerifying(false);
    }
  };

  const handleCodingReject = async () => {
    if (!activeCodingVerification) return;
    if (!codingRemarks.trim()) {
      setCodingActionMsg('❌ Rejection feedback/remarks is mandatory.');
      return;
    }
    setCodingVerifying(true);
    setCodingActionMsg('');
    try {
      await apiFetch(`/coding-challenges/${activeCodingVerification._id}/reject`, {
        method: 'PUT',
        bodyData: { remarks: codingRemarks },
      });
      setCodingActionMsg('✅ Coding Challenge rejected and feedback sent.');
      setCodingRemarks('');
      setShowCodingRejectRemarks(false);
      setActiveCodingVerification(null);
      loadData();
    } catch (err: any) {
      setCodingActionMsg(`❌ Rejection failed: ${err.message}`);
    } finally {
      setCodingVerifying(false);
    }
  };

  const handleLeadRoleChange = (role: 'CR / LR / ARC / SAC – Members' | 'Coordinators') => {
    setLeadRoleOverride(role);
    setLeadScoreOverride(roleScoreMap[role] || 3);
  };

  const handleLeadApprove = async () => {
    if (!activeLeadershipVerification) return;
    setLeadVerifying(true);
    setLeadActionMsg('');
    try {
      await apiFetch(`/leadership-activities/${activeLeadershipVerification._id}/approve`, {
        method: 'PUT',
        bodyData: { 
          leadershipRole: leadRoleOverride,
          facultyApprovedScore: Number(leadScoreOverride),
          remarks: leadRemarks
        },
      });
      setLeadActionMsg('✅ Leadership Activity approved successfully!');
      setLeadRemarks('');
      setShowLeadRejectRemarks(false);
      setActiveLeadershipVerification(null);
      loadData();
    } catch (err: any) {
      setLeadActionMsg(`❌ Approval failed: ${err.message}`);
    } finally {
      setLeadVerifying(false);
    }
  };

  const handleLeadReject = async () => {
    if (!activeLeadershipVerification) return;
    if (!leadRemarks.trim()) {
      setLeadActionMsg('❌ Rejection feedback/remarks is mandatory.');
      return;
    }
    setLeadVerifying(true);
    setLeadActionMsg('');
    try {
      await apiFetch(`/leadership-activities/${activeLeadershipVerification._id}/reject`, {
        method: 'PUT',
        bodyData: { remarks: leadRemarks },
      });
      setLeadActionMsg('✅ Leadership Activity rejected and feedback sent.');
      setLeadRemarks('');
      setShowLeadRejectRemarks(false);
      setActiveLeadershipVerification(null);
      loadData();
    } catch (err: any) {
      setLeadActionMsg(`❌ Rejection failed: ${err.message}`);
    } finally {
      setLeadVerifying(false);
    }
  };

  const handleBulkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkMsg('');
    try {
      const records = JSON.parse(attendanceJson);
      const res = await apiFetch('/academics/upload-attendance', {
        method: 'POST',
        bodyData: { attendanceRecords: records },
      });
      setBulkMsg(`✅ Success: ${res.message}`);
      setAttendanceJson('');
      loadData();
    } catch (err: any) {
      setBulkMsg(`❌ Failed: ${err.message}. Ensure valid JSON format.`);
    }
  };

  const handleBulkMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkMsg('');
    try {
      const records = JSON.parse(marksJson);
      const res = await apiFetch('/academics/upload-marks', {
        method: 'POST',
        bodyData: { marksRecords: records },
      });
      setBulkMsg(`✅ Success: ${res.message}`);
      setMarksJson('');
      loadData();
    } catch (err: any) {
      setBulkMsg(`❌ Failed: ${err.message}. Ensure valid JSON format.`);
    }
  };

  const handleQuickSeedAttendance = () => {
    const mock = [
      { rollNumber: '21CSE01', semester: 5, subjectCode: 'CS301', subjectName: 'Database Management Systems', attended: 38, total: 40 },
      { rollNumber: '21ECE04', semester: 5, subjectCode: 'EC301', subjectName: 'Signals and Systems', attended: 26, total: 40 }
    ];
    setAttendanceJson(JSON.stringify(mock, null, 2));
  };

  const handleQuickSeedMarks = () => {
    const mock = [
      {
        rollNumber: '21CSE01',
        semester: 5,
        sgpa: 9.6,
        subjects: [
          { code: 'CS301', name: 'Database Management Systems', internalMarks: 29, externalMarks: 67, totalMarks: 96, grade: 'O' }
        ],
        activeBacklogs: 0
      }
    ];
    setMarksJson(JSON.stringify(mock, null, 2));
  };

  if (loading && !dashboardData) {
    return <PageSkeleton />;
  }

  const summary = dashboardData?.summary || {};
  const atRiskStudents = dashboardData?.atRiskStudents || [];
  const charts = dashboardData?.charts || {};

  const totalPending = (pendingQueue?.length || 0) +
    (pendingCertsQueue?.length || 0) +
    (pendingProjectsQueue?.length || 0) +
    (pendingCodingQueue?.length || 0) +
    (pendingCambQueue?.length || 0) +
    (pendingCoQueue?.length || 0) +
    (pendingExtraQueue?.length || 0) +
    (pendingLeadershipQueue?.length || 0) +
    (pendingSportsQueue?.length || 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center bg-[#0b1a50] text-white p-4 rounded-xl shadow-md">
        <div>
          <h1 className="text-base md:text-lg font-bold uppercase tracking-wider text-white">Faculty Intelligence</h1>
          <p className="text-xs text-white/80">Review student achievement uploads, verify certifications, and monitor at-risk compliance.</p>
        </div>
        <button onClick={() => loadData()} title="Refresh dashboard" aria-label="Refresh dashboard" className="p-2 hover:bg-[#122b7d] border border-white/20 rounded-lg text-white transition-all">
          <RefreshCw className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Total Students</span>
            <p className="text-xl font-black text-slate-805">{summary.totalStudents || 0}</p>
          </div>
          <div className="bg-blue-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
            <Users className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Pending Achievements</span>
            <p className="text-xl font-black text-slate-805">{pendingQueue.length || 0}</p>
          </div>
          <div className="bg-amber-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
            <CheckSquare className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Pending Certifications</span>
            <p className="text-xl font-black text-slate-805">{pendingCertsQueue.length || 0}</p>
          </div>
          <div className="bg-indigo-650 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
            <Award className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Pending Coding</span>
            <p className="text-xl font-black text-slate-805">{pendingCodingQueue.length || 0}</p>
          </div>
          <div className="bg-indigo-650 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
            <Code className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Pending Leadership</span>
            <p className="text-xl font-black text-slate-805">{pendingLeadershipQueue.length || 0}</p>
          </div>
          <div className="bg-indigo-650 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
            <Users className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">At-Risk Students Alerts</span>
            <p className="text-xl font-black text-slate-805">{summary.atRiskStudentsCount || 0}</p>
          </div>
          <div className="bg-rose-600 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4.5 w-4.5" />
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="space-y-4">
        {/* Main Sections */}
        <div className="flex border-b border-slate-200 gap-6 flex-wrap">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${activeTab === 'analytics'
                ? 'border-primary border-b-2 text-primary font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
          >
            Intelligence & Analytics
          </button>
          
          <button
            onClick={() => setActiveTab('approved')}
            className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${activeTab === 'approved'
                ? 'border-primary border-b-2 text-primary font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
          >
            Approved Submissions History
          </button>

          <button
            onClick={() => setActiveTab('rejected')}
            className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${activeTab === 'rejected'
                ? 'border-primary border-b-2 text-primary font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
          >
            Rejected Submissions History
          </button>
        </div>

        {/* Pending Queues Section (Module-wise Pending Submissions) */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-2.5 px-1">
            Pending verification queues by module ({totalPending} total pending)
          </span>
          <div className="flex gap-3 flex-wrap text-xs">
            <button
              onClick={() => setActiveTab('achievements')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${activeTab === 'achievements'
                  ? 'bg-primary text-white font-bold shadow'
                  : 'bg-white border border-slate-200 text-slate-550 hover:bg-slate-50'
                }`}
            >
              Achievements ({pendingQueue.length})
            </button>
            <button
              onClick={() => setActiveTab('certifications')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${activeTab === 'certifications'
                  ? 'bg-primary text-white font-bold shadow'
                  : 'bg-white border border-slate-200 text-slate-550 hover:bg-slate-50'
                }`}
            >
              Certifications ({pendingCertsQueue.length})
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${activeTab === 'projects'
                  ? 'bg-primary text-white font-bold shadow'
                  : 'bg-white border border-slate-200 text-slate-550 hover:bg-slate-50'
                }`}
            >
              Projects ({pendingProjectsQueue.length})
            </button>
            <button
              onClick={() => setActiveTab('coding')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${activeTab === 'coding'
                  ? 'bg-primary text-white font-bold shadow'
                  : 'bg-white border border-slate-200 text-slate-550 hover:bg-slate-50'
                }`}
            >
              Coding ({pendingCodingQueue.length})
            </button>
            <button
              onClick={() => setActiveTab('cambridge')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${activeTab === 'cambridge'
                  ? 'bg-primary text-white font-bold shadow'
                  : 'bg-white border border-slate-200 text-slate-550 hover:bg-slate-50'
                }`}
            >
              Cambridge ({pendingCambQueue.length})
            </button>
            <button
              onClick={() => setActiveTab('cocurricular')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${activeTab === 'cocurricular'
                  ? 'bg-primary text-white font-bold shadow'
                  : 'bg-white border border-slate-200 text-slate-550 hover:bg-slate-50'
                }`}
            >
              Co-Curricular ({pendingCoQueue.length})
            </button>
            <button
              onClick={() => setActiveTab('extracurricular')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${activeTab === 'extracurricular'
                  ? 'bg-primary text-white font-bold shadow'
                  : 'bg-white border border-slate-200 text-slate-550 hover:bg-slate-50'
                }`}
            >
              Extra-Curricular ({pendingExtraQueue.length})
            </button>
            <button
              onClick={() => setActiveTab('leadership')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${activeTab === 'leadership'
                  ? 'bg-primary text-white font-bold shadow'
                  : 'bg-white border border-slate-200 text-slate-550 hover:bg-slate-50'
                }`}
            >
              Leadership ({pendingLeadershipQueue.length})
            </button>
            <button
              onClick={() => setActiveTab('sports')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${activeTab === 'sports'
                  ? 'bg-primary text-white font-bold shadow'
                  : 'bg-white border border-slate-200 text-slate-550 hover:bg-slate-50'
                }`}
            >
              Sports ({pendingSportsQueue.length})
            </button>
          </div>
        </div>
      </div>

      {/* TAB CONTENT: ANALYTICS & STATS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Analytics Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xs font-bold text-slate-805 mb-6 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="h-4.5 w-4.5 text-primary" /> Student Grade Distribution
              </h3>
              <GradeDistributionChart charts={charts} />
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <h3 className="text-xs font-bold text-slate-805 mb-6 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-500" /> Attendance Compliance Risk
              </h3>
              <AttendanceRiskChart charts={charts} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* At-Risk Students Panel */}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-[#e11d48] flex items-center gap-2 border-b border-slate-100 pb-3 uppercase tracking-wider">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-500" /> Academic & Attendance Compliance
              </h3>

              <div className="overflow-x-auto">
                {atRiskStudents.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4">All students meet requirements. Compliance stands at 100%.</p>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold">
                        <th className="py-2.5">Roll No & Name</th>
                        <th className="py-2.5">Metrics</th>
                        <th className="py-2.5">Alert Flags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {atRiskStudents.map((stud: any) => (
                        <tr key={stud.id} className="hover:bg-slate-50">
                          <td className="py-3">
                            <p className="font-bold text-slate-800">{stud.name}</p>
                            <span className="text-[10px] text-slate-400">{stud.rollNumber} | {stud.branch}</span>
                          </td>
                          <td className="py-3 space-y-1">
                            <p className="text-[10px] text-slate-500">
                              GPA: <span className={`font-bold ${stud.cgpa < 6.0 ? 'text-rose-600' : 'text-slate-700'}`}>{stud.cgpa}</span>
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Attendance: <span className={`font-bold ${stud.attendancePct < 75 ? 'text-rose-600' : 'text-slate-700'}`}>{stud.attendancePct}%</span>
                            </p>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-1">
                              {stud.riskFactors.map((f: string) => (
                                <span key={f} className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 text-[8px] font-bold rounded-full">
                                  {f}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Bulk Upload Section */}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-5">
              <h3 className="text-xs font-bold text-slate-805 flex items-center gap-2 border-b border-slate-100 pb-3 uppercase tracking-wider">
                <FileSpreadsheet className="h-4.5 w-4.5 text-primary" /> Institutional Registry (Bulk Uploads)
              </h3>

              {bulkMsg && (
                <div className="p-3 bg-slate-50 border border-border text-xs text-primary rounded-xl font-semibold">
                  {bulkMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Bulk Attendance */}
                <form onSubmit={handleBulkAttendance} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-605">Bulk Attendance (JSON)</span>
                    <button
                      type="button"
                      onClick={handleQuickSeedAttendance}
                      className="text-[10px] text-primary hover:underline font-semibold"
                    >
                      Demo Template
                    </button>
                  </div>
                  <textarea
                    value={attendanceJson}
                    onChange={(e) => setAttendanceJson(e.target.value)}
                    placeholder="Paste attendance JSON arrays..."
                    className="w-full p-3 bg-slate-50 border border-border rounded-xl text-[10px] font-mono focus:outline-none text-slate-705"
                    rows={4}
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-primary hover:bg-primary/95 text-white font-semibold text-xs rounded-xl"
                  >
                    Process Attendance
                  </button>
                </form>

                {/* Bulk Marks */}
                <form onSubmit={handleBulkMarks} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-605">Bulk Grades (JSON)</span>
                    <button
                      type="button"
                      onClick={handleQuickSeedMarks}
                      className="text-[10px] text-primary hover:underline font-semibold"
                    >
                      Demo Template
                    </button>
                  </div>
                  <textarea
                    value={marksJson}
                    onChange={(e) => setMarksJson(e.target.value)}
                    placeholder="Paste marks JSON arrays..."
                    className="w-full p-3 bg-slate-50 border border-border rounded-xl text-[10px] font-mono focus:outline-none text-slate-705"
                    rows={4}
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-primary hover:bg-primary/95 text-white font-semibold text-xs rounded-xl"
                  >
                    Process Grades
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ACHIEVEMENTS QUEUE */}
      {activeTab === 'achievements' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Action Dialog / Remarks Section for Verification */}
          {activeVerification && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 rounded-xl border border-primary/20 shadow-md">
              <h3 className="text-sm font-bold text-slate-800 mb-2">Review Submission</h3>
              <p className="text-xs text-slate-500 mb-4">
                Verify: <span className="font-semibold text-slate-800">{activeVerification.title}</span> submitted by{' '}
                <span className="font-semibold text-primary">{activeVerification.studentId?.userId?.name}</span> ({activeVerification.studentId?.rollNumber})
              </p>

              {actionMsg && <div className="mb-4 text-xs text-primary font-semibold">{actionMsg}</div>}

              <div className="space-y-4">
                {(user?.role === 'HOD' || user?.role === 'ADMIN') ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                      ⚠️ Read-only monitor mode. Verification actions are restricted to faculty advisors.
                    </div>
                    <button
                      onClick={() => setActiveVerification(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                    >
                      Close Review Panel
                    </button>
                  </div>
                ) : !showRejectRemarks ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleVerify('VERIFIED')}
                      disabled={verifying}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
                    >
                      <Check className="h-4 w-4" /> Approve & Verify
                    </button>
                    <button
                      onClick={() => setShowRejectRemarks(true)}
                      disabled={verifying}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
                    >
                      <X className="h-4 w-4" /> Reject Submission
                    </button>
                    <button
                      onClick={() => {
                        setActiveVerification(null);
                        setShowRejectRemarks(false);
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">Rejection Remarks</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Please specify why this achievement is being rejected (required)..."
                      className="w-full p-3 bg-slate-50 border border-rose-200 rounded-xl text-xs focus:outline-none focus:border-rose-500 text-slate-850 focus:ring-1 focus:ring-rose-505"
                      rows={3}
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleVerify('REJECTED')}
                        disabled={verifying || !remarks.trim()}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        <X className="h-4 w-4" /> Confirm Rejection
                      </button>
                      <button
                        onClick={() => {
                          setShowRejectRemarks(false);
                          setRemarks('');
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        Go Back
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Verification Queue */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-805 flex items-center gap-2 border-b border-slate-100 pb-3 uppercase tracking-wider">
              <CheckSquare className="h-4.5 w-4.5 text-primary" /> Achievements Verification Queue
            </h3>

            <div className="overflow-x-auto">
              {pendingQueue.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No pending achievements. All clear!</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold">
                      <th className="py-2.5">Student</th>
                      <th className="py-2.5">Submission Details</th>
                      <th className="py-2.5">Document</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {pendingQueue.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50">
                        <td className="py-3">
                          <p className="font-bold text-slate-800">{item.studentId?.userId?.name}</p>
                          <span className="text-[10px] text-slate-400">{item.studentId?.rollNumber}</span>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold rounded-full">
                            {item.type}
                          </span>
                          <p className="font-semibold text-slate-700 mt-1">{item.title}</p>
                          <span className="text-[9px] text-slate-400">{new Date(item.date).toLocaleDateString()}</span>
                        </td>
                        <td className="py-3">
                          {item.fileUrl ? (
                            <a
                              href={item.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-semibold"
                            >
                              <FileText className="h-3 w-3" /> View Doc
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400">No doc</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              setActiveVerification(item);
                              setActionMsg('');
                              setRemarks('');
                              setShowRejectRemarks(false);
                            }}
                            className="px-2.5 py-1 bg-primary text-white hover:bg-primary/90 rounded-lg font-semibold text-[10px] transition-all"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CERTIFICATIONS QUEUE */}
      {activeTab === 'certifications' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Action Dialog / Category Override Section for Certifications */}
          {activeCertVerification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-xl border border-indigo-200 shadow-md grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn"
            >
              {/* Left & Middle Column: Controls */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Award className="h-4.5 w-4.5 text-primary" /> Inspect & Verify Certification
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-650 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Student Name & Roll No</span>
                    <p className="font-bold text-slate-800 mt-0.5">{activeCertVerification.studentId?.userId?.name}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">{activeCertVerification.studentId?.rollNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Certificate Name & Provider</span>
                    <p className="font-bold text-slate-850 mt-0.5">{activeCertVerification.certificateName}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">{activeCertVerification.provider}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Academic Year</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">Year {activeCertVerification.academicYear}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Completion Date</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">
                      {activeCertVerification.completionDate ? new Date(activeCertVerification.completionDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {certActionMsg && (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-lg text-xs font-semibold">
                    {certActionMsg}
                  </div>
                )}

                {/* Review Form controls */}
                {(user?.role === 'HOD' || user?.role === 'ADMIN') ? (
                  <div className="space-y-4 border-t border-slate-100 pt-3">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                      ⚠️ Read-only monitor mode. Verification actions are restricted to faculty advisors.
                    </div>
                    <button
                      onClick={() => setActiveCertVerification(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                    >
                      Close Review Panel
                    </button>
                  </div>
                ) : !showCertRejectRemarks ? (
                  <div className="space-y-4 border-t border-slate-100 pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Editable category selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                          Editable Approved Category
                        </label>
                        <select
                          value={certCategoryOverride}
                          onChange={(e) => handleCategoryChange(e.target.value)}
                          title="Editable approved certification category"
                          aria-label="Editable approved certification category"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary focus:ring-1"
                        >
                          <option value="Normal Certificate">Normal Certificate (2 pts)</option>
                          <option value="NPTEL Elite">NPTEL Elite (3 pts)</option>
                          <option value="NPTEL Silver">NPTEL Silver (5 pts)</option>
                          <option value="NPTEL Gold">NPTEL Gold (5 pts)</option>
                          <option value="NPTEL Topper">NPTEL Topper (5 pts)</option>
                          <option value="Global Certification">Global Certification (10 pts)</option>
                        </select>
                      </div>

                      {/* Editable score input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                          Editable Score Points
                        </label>
                        <input
                          type="number"
                          value={certScoreOverride}
                          onChange={(e) => setCertScoreOverride(Number(e.target.value))}
                          min={0}
                          max={50}
                          title="Editable certification score points"
                          aria-label="Editable certification score points"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary focus:ring-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                        Faculty Feedback / Remarks (Optional on Approval)
                      </label>
                      <textarea
                        value={certRemarks}
                        onChange={(e) => setCertRemarks(e.target.value)}
                        placeholder="Add comments about this certification..."
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-primary text-slate-800"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleCertApprove}
                        disabled={certVerifying}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow"
                      >
                        <Check className="h-4 w-4" /> Approve Certification
                      </button>
                      <button
                        onClick={() => setShowCertRejectRemarks(true)}
                        disabled={certVerifying}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow"
                      >
                        <X className="h-4 w-4" /> Reject Certification
                      </button>
                      <button
                        onClick={() => {
                          setActiveCertVerification(null);
                          setShowCertRejectRemarks(false);
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 border-t border-slate-100 pt-3">
                    <label className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
                      Mandatory Rejection Feedback / Remarks
                    </label>
                    <textarea
                      value={certRemarks}
                      onChange={(e) => setCertRemarks(e.target.value)}
                      placeholder="Please specify why this certificate is being rejected (required)..."
                      className="w-full p-3 bg-slate-50 border border-rose-200 rounded-xl text-xs focus:outline-none focus:border-rose-500 text-slate-850 focus:ring-1"
                      rows={3}
                      required
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleCertReject}
                        disabled={certVerifying || !certRemarks.trim()}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        <X className="h-4 w-4" /> Confirm Rejection
                      </button>
                      <button
                        onClick={() => {
                          setShowCertRejectRemarks(false);
                          setCertRemarks('');
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        Go Back
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Faculty Reference Panel */}
              <div className="lg:col-span-1 bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1 mb-2.5">
                    <HelpCircle className="h-4 w-4 text-slate-400" /> Reference Table
                  </h4>
                  <div className="text-[11px] text-slate-650 space-y-1.5">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Normal Certificate</span>
                      <span className="font-bold text-slate-805">2</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>NPTEL Elite</span>
                      <span className="font-bold text-slate-805">3</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>NPTEL Silver</span>
                      <span className="font-bold text-slate-805">5</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>NPTEL Gold</span>
                      <span className="font-bold text-slate-805">5</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>NPTEL Topper</span>
                      <span className="font-bold text-slate-805">5</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Global Certification</span>
                      <span className="font-bold text-slate-805">10</span>
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-slate-450 italic mt-4 leading-normal bg-white p-2 rounded-lg border border-slate-100">
                  Note: Approved scores are capped year-wise: Max 5 for Year 1/2, Max 10 for Year 3/4. Recalculation is automatic upon approval or category change.
                </p>
              </div>
            </motion.div>
          )}

          {/* Pending Certifications List */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-805 flex items-center gap-2 border-b border-slate-100 pb-3 uppercase tracking-wider">
              <Award className="h-4.5 w-4.5 text-primary" /> Certifications Verification Queue
            </h3>

            <div className="overflow-x-auto">
              {pendingCertsQueue.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No pending certifications. All clear!</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold">
                      <th className="py-2.5">Student</th>
                      <th className="py-2.5">Certification Details</th>
                      <th className="py-2.5">Student Category</th>
                      <th className="py-2.5">Score</th>
                      <th className="py-2.5">Document</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {pendingCertsQueue.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50">
                        <td className="py-3">
                          <p className="font-bold text-slate-800">{item.studentId?.userId?.name}</p>
                          <span className="text-[10px] text-slate-400">{item.studentId?.rollNumber}</span>
                        </td>
                        <td className="py-3">
                          <p className="font-semibold text-slate-700">{item.certificateName}</p>
                          <p className="text-[10px] text-slate-400">
                            {item.provider} | Year {item.academicYear}
                          </p>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-bold rounded-full">
                            {item.studentSelectedCategory}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="font-bold text-slate-700">{item.calculatedScore}</span>
                        </td>
                        <td className="py-3">
                          {item.certificateFile ? (
                            <a
                              href={item.certificateFile}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-semibold"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Preview File
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400">No file</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              setActiveCertVerification(item);
                              setCertCategoryOverride(item.studentSelectedCategory);
                              setCertScoreOverride(item.calculatedScore);
                              setCertActionMsg('');
                              setCertRemarks(item.remarks || '');
                              setShowCertRejectRemarks(false);
                            }}
                            className="px-2.5 py-1 bg-primary text-white hover:bg-primary/90 rounded-lg font-semibold text-[10px] transition-all"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PROJECTS QUEUE */}
      {activeTab === 'projects' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Action Dialog / Category Override Section for Projects */}
          {activeProjectVerification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-xl border border-indigo-200 shadow-md grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn"
            >
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Award className="h-4.5 w-4.5 text-primary" /> Inspect & Verify Project
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-650 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Student Name & Roll No</span>
                    <p className="font-bold text-slate-800 mt-0.5">{activeProjectVerification.studentId?.userId?.name}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">{activeProjectVerification.studentId?.rollNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Project Title & Team</span>
                    <p className="font-bold text-slate-850 mt-0.5">{activeProjectVerification.projectTitle}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">{activeProjectVerification.teamMembers}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Academic Year</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">Year {activeProjectVerification.academicYear}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Project Duration</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">{activeProjectVerification.projectDuration}</span>
                  </div>
                </div>

                {projectActionMsg && (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-lg text-xs font-semibold">
                    {projectActionMsg}
                  </div>
                )}

                {(user?.role === 'HOD' || user?.role === 'ADMIN') ? (
                  <div className="space-y-4 border-t border-slate-100 pt-3">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                      ⚠️ Read-only monitor mode. Verification actions are restricted to faculty advisors.
                    </div>
                    <button
                      onClick={() => setActiveProjectVerification(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                    >
                      Close Review Panel
                    </button>
                  </div>
                ) : !showProjectRejectRemarks ? (
                  <div className="space-y-4 border-t border-slate-100 pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                          Editable Approved Level
                        </label>
                        <select
                          value={projectLevelOverride}
                          onChange={(e) => handleProjectLevelChange(e.target.value)}
                          title="Editable approved project level"
                          aria-label="Editable approved project level"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary focus:ring-1"
                        >
                          <option value="Department">Department (2 pts)</option>
                          <option value="Institute">Institute (4 pts)</option>
                          <option value="Inter-University">Inter-University (6 pts)</option>
                          <option value="National / International">National / International (10 pts)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                          Editable Score Points
                        </label>
                        <input
                          type="number"
                          value={projectScoreOverride}
                          onChange={(e) => setProjectScoreOverride(Number(e.target.value))}
                          min={0}
                          max={50}
                          title="Editable project score points"
                          aria-label="Editable project score points"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary focus:ring-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                        Faculty Feedback / Remarks (Optional on Approval)
                      </label>
                      <textarea
                        value={projectRemarks}
                        onChange={(e) => setProjectRemarks(e.target.value)}
                        placeholder="Add comments about this project..."
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-primary text-slate-800"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleProjectApprove}
                        disabled={projectVerifying}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow"
                      >
                        <Check className="h-4 w-4" /> Approve Project
                      </button>
                      <button
                        onClick={() => setShowProjectRejectRemarks(true)}
                        disabled={projectVerifying}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow"
                      >
                        <X className="h-4 w-4" /> Reject Project
                      </button>
                      <button
                        onClick={() => {
                          setActiveProjectVerification(null);
                          setShowProjectRejectRemarks(false);
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 border-t border-slate-100 pt-3">
                    <label className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
                      Mandatory Rejection Feedback / Remarks
                    </label>
                    <textarea
                      value={projectRemarks}
                      onChange={(e) => setProjectRemarks(e.target.value)}
                      placeholder="Please specify why this project is being rejected (required)..."
                      className="w-full p-3 bg-slate-50 border border-rose-200 rounded-xl text-xs focus:outline-none focus:border-rose-500 text-slate-855 focus:ring-1"
                      rows={3}
                      required
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleProjectReject}
                        disabled={projectVerifying || !projectRemarks.trim()}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        <X className="h-4 w-4" /> Confirm Rejection
                      </button>
                      <button
                        onClick={() => {
                          setShowProjectRejectRemarks(false);
                          setProjectRemarks('');
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        Go Back
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-1 bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1 mb-2.5">
                    <HelpCircle className="h-4 w-4 text-slate-400" /> Reference Table
                  </h4>
                  <div className="text-[11px] text-slate-650 space-y-1.5">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Department</span>
                      <span className="font-bold text-slate-805">2</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Institute</span>
                      <span className="font-bold text-slate-805">4</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Inter-University</span>
                      <span className="font-bold text-slate-805">6</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>National / International</span>
                      <span className="font-bold text-slate-805">10</span>
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-slate-450 italic mt-4 leading-normal bg-white p-2 rounded-lg border border-slate-100">
                  Note: Approved scores are capped year-wise: Max 5 for Year 1, Max 10 for Years 2/3/4. Recalculation is automatic upon approval or level change.
                </p>
              </div>
            </motion.div>
          )}

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-805 flex items-center gap-2 border-b border-slate-100 pb-3 uppercase tracking-wider">
              <Award className="h-4.5 w-4.5 text-primary" /> Projects Verification Queue
            </h3>

            <div className="overflow-x-auto">
              {pendingProjectsQueue.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No pending projects. All clear!</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold">
                      <th className="py-2.5">Student</th>
                      <th className="py-2.5">Project Details</th>
                      <th className="py-2.5">Level</th>
                      <th className="py-2.5">Score</th>
                      <th className="py-2.5">Documents</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {pendingProjectsQueue.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50">
                        <td className="py-3">
                          <p className="font-bold text-slate-800">{item.studentId?.userId?.name}</p>
                          <span className="text-[10px] text-slate-400">{item.studentId?.rollNumber}</span>
                        </td>
                        <td className="py-3">
                          <p className="font-semibold text-slate-700">{item.projectTitle}</p>
                          <p className="text-[10px] text-slate-400">{item.projectDuration} | {item.teamMembers}</p>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-bold rounded-full">
                            {item.studentSelectedLevel}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="font-bold text-slate-700">{item.calculatedScore}</span>
                        </td>
                        <td className="py-3">
                          {item.supportingDocuments?.[0] ? (
                            <a
                              href={item.supportingDocuments[0]}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-semibold"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Preview File
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400">No file</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              setActiveProjectVerification(item);
                              setProjectLevelOverride(item.studentSelectedLevel);
                              setProjectScoreOverride(item.calculatedScore);
                              setProjectActionMsg('');
                              setProjectRemarks(item.remarks || '');
                              setShowProjectRejectRemarks(false);
                            }}
                            className="px-2.5 py-1 bg-primary text-white hover:bg-primary/90 rounded-lg font-semibold text-[10px] transition-all"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CAMBRIDGE CERTIFICATIONS QUEUE */}
      {activeTab === 'cambridge' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Action Dialog / Category Override Section for Cambridge */}
          {activeCambVerification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-xl border border-indigo-200 shadow-md grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn"
            >
              {/* Left & Middle Column: Controls */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Award className="h-4.5 w-4.5 text-primary" /> Inspect & Verify Cambridge Certificate
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-650 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Student Name & Roll No</span>
                    <p className="font-bold text-slate-800 mt-0.5">{activeCambVerification.studentId?.userId?.name}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">{activeCambVerification.studentId?.rollNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Certificate Name & Provider</span>
                    <p className="font-bold text-slate-850 mt-0.5">{activeCambVerification.certificateName}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">{activeCambVerification.provider}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Academic Year</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">Year {activeCambVerification.academicYear}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Issue Date</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">
                      {activeCambVerification.issueDate ? new Date(activeCambVerification.issueDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {cambActionMsg && (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-lg text-xs font-semibold">
                    {cambActionMsg}
                  </div>
                )}

                {/* Review Form controls */}
                {(user?.role === 'HOD' || user?.role === 'ADMIN') ? (
                  <div className="space-y-4 border-t border-slate-100 pt-3">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                      ⚠️ Read-only monitor mode. Verification actions are restricted to faculty advisors.
                    </div>
                    <button
                      onClick={() => setActiveCambVerification(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                    >
                      Close Review Panel
                    </button>
                  </div>
                ) : !showCambRejectRemarks ? (
                  <div className="space-y-4 border-t border-slate-100 pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Editable category selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                          Editable Approved Level
                        </label>
                        <select
                          value={cambLevelOverride}
                          onChange={(e) => handleCambLevelChange(e.target.value)}
                          title="Editable approved Cambridge level"
                          aria-label="Editable approved Cambridge level"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary focus:ring-1"
                        >
                          <option value="A2 Key">A2 Key (2 pts)</option>
                          <option value="B1 Preliminary">B1 Preliminary (4 pts)</option>
                          <option value="B2 First">B2 First (6 pts)</option>
                          <option value="C1 Advanced">C1 Advanced (8 pts)</option>
                          <option value="C2 Proficiency">C2 Proficiency (10 pts)</option>
                        </select>
                      </div>

                      {/* Editable score input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                          Editable Score Points
                        </label>
                        <input
                          type="number"
                          value={cambScoreOverride}
                          onChange={(e) => setCambScoreOverride(Number(e.target.value))}
                          min={0}
                          max={50}
                          title="Editable Cambridge score points"
                          aria-label="Editable Cambridge score points"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary focus:ring-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                        Faculty Feedback / Remarks (Optional on Approval)
                      </label>
                      <textarea
                        value={cambRemarks}
                        onChange={(e) => setCambRemarks(e.target.value)}
                        placeholder="Add comments about this communication certification..."
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-primary text-slate-800"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleCambApprove}
                        disabled={cambVerifying}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow"
                      >
                        <Check className="h-4 w-4" /> Approve Certification
                      </button>
                      <button
                        onClick={() => setShowCambRejectRemarks(true)}
                        disabled={cambVerifying}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow"
                      >
                        <X className="h-4 w-4" /> Reject Certification
                      </button>
                      <button
                        onClick={() => {
                          setActiveCambVerification(null);
                          setShowCambRejectRemarks(false);
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 border-t border-slate-100 pt-3">
                    <label className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
                      Mandatory Rejection Feedback / Remarks
                    </label>
                    <textarea
                      value={cambRemarks}
                      onChange={(e) => setCambRemarks(e.target.value)}
                      placeholder="Please specify why this certificate is being rejected (required)..."
                      className="w-full p-3 bg-slate-50 border border-rose-200 rounded-xl text-xs focus:outline-none focus:border-rose-505 focus:ring-1"
                      rows={3}
                      required
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleCambReject}
                        disabled={cambVerifying || !cambRemarks.trim()}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        <X className="h-4 w-4" /> Confirm Rejection
                      </button>
                      <button
                        onClick={() => {
                          setShowCambRejectRemarks(false);
                          setCambRemarks('');
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        Go Back
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Faculty Reference Panel */}
              <div className="lg:col-span-1 bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1 mb-2.5">
                    <HelpCircle className="h-4 w-4 text-slate-400" /> Cambridge Reference Table
                  </h4>
                  <div className="text-[11px] text-slate-650 space-y-1.5">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>A2 Key</span>
                      <span className="font-bold text-slate-805">2</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>B1 Preliminary</span>
                      <span className="font-bold text-slate-805">4</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>B2 First</span>
                      <span className="font-bold text-slate-805">6</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>C1 Advanced</span>
                      <span className="font-bold text-slate-805">8</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>C2 Proficiency</span>
                      <span className="font-bold text-slate-805">10</span>
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-slate-450 italic mt-4 leading-normal bg-white p-2 rounded-lg border border-slate-100">
                  Note: Approved scores are capped year-wise: Max 10 for Year 1/2, Max 5 for Year 3/4. Recalculation is automatic upon approval or level change.
                </p>
              </div>
            </motion.div>
          )}

          {/* Pending Cambridge List */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-805 flex items-center gap-2 border-b border-slate-100 pb-3 uppercase tracking-wider">
              <Award className="h-4.5 w-4.5 text-primary" /> Cambridge Verification Queue
            </h3>

            <div className="overflow-x-auto">
              {pendingCambQueue.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No pending Cambridge certifications. All clear!</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold">
                      <th className="py-2.5">Student</th>
                      <th className="py-2.5">Certificate Details</th>
                      <th className="py-2.5">Student Selected Level</th>
                      <th className="py-2.5">Score</th>
                      <th className="py-2.5">Document</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {pendingCambQueue.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50">
                        <td className="py-3">
                          <p className="font-bold text-slate-800">{item.studentId?.userId?.name}</p>
                          <span className="text-[10px] text-slate-400">{item.studentId?.rollNumber}</span>
                        </td>
                        <td className="py-3">
                          <p className="font-semibold text-slate-700">{item.certificateName}</p>
                          <p className="text-[10px] text-slate-400">
                            {item.provider} | Year {item.academicYear}
                          </p>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-bold rounded-full">
                            {item.studentSelectedLevel}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="font-bold text-slate-700">{item.calculatedScore}</span>
                        </td>
                        <td className="py-3">
                          {item.certificateFile ? (
                            <a
                              href={item.certificateFile}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-semibold"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Preview File
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400">No file</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              setActiveCambVerification(item);
                              setCambLevelOverride(item.studentSelectedLevel);
                              setCambScoreOverride(item.calculatedScore);
                              setCambActionMsg('');
                              setCambRemarks(item.remarks || '');
                              setShowCambRejectRemarks(false);
                            }}
                            className="px-2.5 py-1 bg-primary text-white hover:bg-primary/90 rounded-lg font-semibold text-[10px] transition-all"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
      {activeTab === 'cocurricular' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Action Dialog / Category Override Section for Co-Curricular */}
          {activeCoVerification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-xl border border-indigo-200 shadow-md grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn"
            >
              {/* Left & Middle Column: Controls */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Award className="h-4.5 w-4.5 text-primary" /> Inspect & Verify Co-Curricular Certificate
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-650 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Student Name & Roll No</span>
                    <p className="font-bold text-slate-800 mt-0.5">{activeCoVerification.studentId?.userId?.name}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">{activeCoVerification.studentId?.rollNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Activity Details & Category</span>
                    <p className="font-bold text-slate-850 mt-0.5">{activeCoVerification.activityName}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">{activeCoVerification.category} | {activeCoVerification.provider}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Academic Year</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">Year {activeCoVerification.academicYear}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Issue Date</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">
                      {activeCoVerification.issueDate ? new Date(activeCoVerification.issueDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {coActionMsg && (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-lg text-xs font-semibold">
                    {coActionMsg}
                  </div>
                )}

                {/* Review Form controls */}
                {(user?.role === 'HOD' || user?.role === 'ADMIN') ? (
                  <div className="space-y-4 border-t border-slate-100 pt-3">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                      ⚠️ Read-only monitor mode. Verification actions are restricted to faculty advisors.
                    </div>
                    <button
                      onClick={() => setActiveCoVerification(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                    >
                      Close Review Panel
                    </button>
                  </div>
                ) : !showCoRejectRemarks ? (
                  <div className="space-y-4 border-t border-slate-100 pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Editable level selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                          Editable Approved Level
                        </label>
                        <select
                          value={coLevelOverride}
                          onChange={(e) => handleCoLevelChange(e.target.value)}
                          title="Editable approved activity level"
                          aria-label="Editable approved activity level"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary focus:ring-1"
                        >
                          <option value="Department Level">Department Level (1 pt)</option>
                          <option value="Institute Level">Institute Level (2 pts)</option>
                          <option value="Inter-University Level">Inter-University Level (3 pts)</option>
                          <option value="Zonal Level">Zonal Level (4 pts)</option>
                          <option value="National / International Level">National / International Level (5 pts)</option>
                        </select>
                      </div>

                      {/* Editable score input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                          Editable Score Points
                        </label>
                        <input
                          type="number"
                          value={coScoreOverride}
                          onChange={(e) => setCoScoreOverride(Number(e.target.value))}
                          min={0}
                          max={50}
                          title="Editable activity score points"
                          aria-label="Editable activity score points"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary focus:ring-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                        Faculty Feedback / Remarks (Optional on Approval)
                      </label>
                      <textarea
                        value={coRemarks}
                        onChange={(e) => setCoRemarks(e.target.value)}
                        placeholder="Add comments about this co-curricular activity..."
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-primary text-slate-800"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleCoApprove}
                        disabled={coVerifying}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow"
                      >
                        <Check className="h-4 w-4" /> Approve Activity
                      </button>
                      <button
                        onClick={() => setShowCoRejectRemarks(true)}
                        disabled={coVerifying}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow"
                      >
                        <X className="h-4 w-4" /> Reject Activity
                      </button>
                      <button
                        onClick={() => {
                          setActiveCoVerification(null);
                          setShowCoRejectRemarks(false);
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 border-t border-slate-100 pt-3">
                    <label className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
                      Mandatory Rejection Feedback / Remarks
                    </label>
                    <textarea
                      value={coRemarks}
                      onChange={(e) => setCoRemarks(e.target.value)}
                      placeholder="Please specify why this certificate is being rejected (required)..."
                      className="w-full p-3 bg-slate-50 border border-rose-200 rounded-xl text-xs focus:outline-none focus:border-rose-505 focus:ring-1"
                      rows={3}
                      required
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleCoReject}
                        disabled={coVerifying || !coRemarks.trim()}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        <X className="h-4 w-4" /> Confirm Rejection
                      </button>
                      <button
                        onClick={() => {
                          setShowCoRejectRemarks(false);
                          setCoRemarks('');
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        Go Back
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Faculty Reference Panel */}
              <div className="lg:col-span-1 bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1 mb-2.5">
                    <HelpCircle className="h-4 w-4 text-slate-400" /> Activity Level Reference Table
                  </h4>
                  <div className="text-[11px] text-slate-650 space-y-1.5">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Department Level</span>
                      <span className="font-bold text-slate-805">1 Point</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Institute Level</span>
                      <span className="font-bold text-slate-805">2 Points</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Inter-University Level</span>
                      <span className="font-bold text-slate-805">3 Points</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Zonal Level</span>
                      <span className="font-bold text-slate-805">4 Points</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>National / International Level</span>
                      <span className="font-bold text-slate-805">5 Points</span>
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-slate-450 italic mt-4 leading-normal bg-white p-2 rounded-lg border border-slate-100">
                  Note: Approved scores are capped academic year-wise: Max 5 for Year 1, 2, 3. Max 0 for Year 4.
                </p>
              </div>
            </motion.div>
          )}

          {/* Pending Activities List */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-855 flex items-center gap-2 border-b border-slate-100 pb-3 uppercase tracking-wider">
              <Award className="h-4.5 w-4.5 text-primary" /> Co-Curricular Verification Queue
            </h3>

            <div className="overflow-x-auto">
              {pendingCoQueue.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No pending co-curricular certifications. All clear!</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold">
                      <th className="py-2.5">Student</th>
                      <th className="py-2.5">Activity Details</th>
                      <th className="py-2.5">Category</th>
                      <th className="py-2.5">Student Selected Level</th>
                      <th className="py-2.5">Score</th>
                      <th className="py-2.5">Document</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {pendingCoQueue.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50">
                        <td className="py-3">
                          <p className="font-bold text-slate-800">{item.studentId?.userId?.name}</p>
                          <span className="text-[10px] text-slate-400">{item.studentId?.rollNumber}</span>
                        </td>
                        <td className="py-3">
                          <p className="font-semibold text-slate-700">{item.activityName}</p>
                          <p className="text-[10px] text-slate-400">
                            {item.provider} | Year {item.academicYear}
                          </p>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-650 text-[9px] font-semibold rounded">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-bold rounded-full">
                            {item.studentSelectedLevel}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="font-bold text-slate-700">{item.calculatedScore}</span>
                        </td>
                        <td className="py-3">
                          {item.certificateFile ? (
                            <a
                              href={item.certificateFile}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-semibold"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Preview File
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400">No file</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              setActiveCoVerification(item);
                              setCoLevelOverride(item.studentSelectedLevel);
                              setCoScoreOverride(item.calculatedScore);
                              setCoActionMsg('');
                              setCoRemarks(item.remarks || '');
                              setShowCoRejectRemarks(false);
                            }}
                            className="px-2.5 py-1 bg-primary text-white hover:bg-primary/90 rounded-lg font-semibold text-[10px] transition-all"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'extracurricular' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Action Dialog / Category Override Section for Extra-Curricular */}
          {activeExtraVerification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-xl border border-indigo-200 shadow-md grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn"
            >
              {/* Left & Middle Column: Controls */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Award className="h-4.5 w-4.5 text-primary" /> Inspect & Verify Extra-Curricular Certificate
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-650 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Student Name & Roll No</span>
                    <p className="font-bold text-slate-800 mt-0.5">{activeExtraVerification.studentId?.userId?.name}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">{activeExtraVerification.studentId?.rollNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Activity Details & Category</span>
                    <p className="font-bold text-slate-850 mt-0.5">{activeExtraVerification.activityName}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">{activeExtraVerification.category} | {activeExtraVerification.provider}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Academic Year</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">Year {activeExtraVerification.academicYear}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Issue Date</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">
                      {activeExtraVerification.issueDate ? new Date(activeExtraVerification.issueDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {extraActionMsg && (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-lg text-xs font-semibold">
                    {extraActionMsg}
                  </div>
                )}

                {(user?.role === 'HOD' || user?.role === 'ADMIN') ? (
                  <div className="space-y-4 border-t border-slate-100 pt-3">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                      ⚠️ Read-only monitor mode. Verification actions are restricted to faculty advisors.
                    </div>
                    <button
                      onClick={() => setActiveExtraVerification(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                    >
                      Close Review Panel
                    </button>
                  </div>
                ) : !showExtraRejectRemarks ? (
                  <div className="space-y-4 border-t border-slate-100 pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Editable level selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                          Editable Approved Level
                        </label>
                        <select
                          value={extraLevelOverride}
                          onChange={(e) => handleExtraLevelChange(e.target.value)}
                          title="Editable approved activity level"
                          aria-label="Editable approved activity level"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary focus:ring-1"
                        >
                          <option value="Department Level">Department Level (1 pt)</option>
                          <option value="Institute Level">Institute Level (2 pts)</option>
                          <option value="Inter-University Level">Inter-University Level (3 pts)</option>
                          <option value="Zonal Level">Zonal Level (4 pts)</option>
                          <option value="National / International Level">National / International Level (5 pts)</option>
                        </select>
                      </div>

                      {/* Editable score input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                          Editable Score Points
                        </label>
                        <input
                          type="number"
                          value={extraScoreOverride}
                          onChange={(e) => setExtraScoreOverride(Number(e.target.value))}
                          min={0}
                          max={50}
                          title="Editable activity score points"
                          aria-label="Editable activity score points"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary focus:ring-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                        Faculty Feedback / Remarks (Optional on Approval)
                      </label>
                      <textarea
                        value={extraRemarks}
                        onChange={(e) => setExtraRemarks(e.target.value)}
                        placeholder="Add comments about this extra-curricular activity..."
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-primary text-slate-800"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleExtraApprove}
                        disabled={extraVerifying}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow"
                      >
                        <Check className="h-4 w-4" /> Approve Activity
                      </button>
                      <button
                        onClick={() => setShowExtraRejectRemarks(true)}
                        disabled={extraVerifying}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow"
                      >
                        <X className="h-4 w-4" /> Reject Activity
                      </button>
                      <button
                        onClick={() => {
                          setActiveExtraVerification(null);
                          setShowExtraRejectRemarks(false);
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 border-t border-slate-100 pt-3">
                    <label className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
                      Mandatory Rejection Feedback / Remarks
                    </label>
                    <textarea
                      value={extraRemarks}
                      onChange={(e) => setExtraRemarks(e.target.value)}
                      placeholder="Please specify why this certificate is being rejected (required)..."
                      className="w-full p-3 bg-slate-50 border border-rose-200 rounded-xl text-xs focus:outline-none focus:border-rose-505 focus:ring-1"
                      rows={3}
                      required
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleExtraReject}
                        disabled={extraVerifying || !extraRemarks.trim()}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        <X className="h-4 w-4" /> Confirm Rejection
                      </button>
                      <button
                        onClick={() => {
                          setShowExtraRejectRemarks(false);
                          setExtraRemarks('');
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        Go Back
                      </button>
                    </div>
                  </div>
                )}
              </div>
 
              {/* Right Column: Faculty Reference Panel */}
              <div className="lg:col-span-1 bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1 mb-2.5">
                    <HelpCircle className="h-4 w-4 text-slate-400" /> Activity Level Reference Table
                  </h4>
                  <div className="text-[11px] text-slate-650 space-y-1.5">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Department Level</span>
                      <span className="font-bold text-slate-805">1 Point</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Institute Level</span>
                      <span className="font-bold text-slate-805">2 Points</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Inter-University Level</span>
                      <span className="font-bold text-slate-805">3 Points</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Zonal Level</span>
                      <span className="font-bold text-slate-805">4 Points</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>National / International Level</span>
                      <span className="font-bold text-slate-805">5 Points</span>
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-slate-450 italic mt-4 leading-normal bg-white p-2 rounded-lg border border-slate-100">
                  Note: Approved scores are capped academic year-wise: Max 10 for Year 1, Max 5 for Year 2, 3, 4.
                </p>
              </div>
            </motion.div>
          )}

          {/* Pending Activities List */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-855 flex items-center gap-2 border-b border-slate-100 pb-3 uppercase tracking-wider">
              <Award className="h-4.5 w-4.5 text-primary" /> Extra-Curricular Verification Queue
            </h3>

            <div className="overflow-x-auto">
              {pendingExtraQueue.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No pending extra-curricular certifications. All clear!</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold">
                      <th className="py-2.5">Student</th>
                      <th className="py-2.5">Activity Details</th>
                      <th className="py-2.5">Category</th>
                      <th className="py-2.5">Student Selected Level</th>
                      <th className="py-2.5">Score</th>
                      <th className="py-2.5">Document</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {pendingExtraQueue.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50">
                        <td className="py-3">
                          <p className="font-bold text-slate-800">{item.studentId?.userId?.name}</p>
                          <span className="text-[10px] text-slate-400">{item.studentId?.rollNumber}</span>
                        </td>
                        <td className="py-3">
                          <p className="font-semibold text-slate-700">{item.activityName}</p>
                          <p className="text-[10px] text-slate-400">
                            {item.provider} | Year {item.academicYear}
                          </p>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-655 text-[9px] font-semibold rounded">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-bold rounded">
                            {item.studentSelectedLevel || item.activityLevel || 'Institute Level'}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="font-bold text-slate-700">{item.calculatedScore}</span>
                        </td>
                        <td className="py-3">
                          {item.certificateFile ? (
                            <a
                              href={item.certificateFile}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-semibold"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Preview File
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400">No file</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              setActiveExtraVerification(item);
                              setExtraLevelOverride(item.studentSelectedLevel || item.activityLevel || 'Institute Level');
                              setExtraScoreOverride(item.facultyApprovedScore !== undefined && item.facultyApprovedScore !== null ? item.facultyApprovedScore : item.calculatedScore);
                              setExtraActionMsg('');
                              setExtraRemarks(item.remarks || '');
                              setShowExtraRejectRemarks(false);
                            }}
                            className="px-2.5 py-1 bg-primary text-white hover:bg-primary/90 rounded-lg font-semibold text-[10px] transition-all"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'coding' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Action Dialog / Category Override Section for Coding Challenges */}
          {activeCodingVerification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-xl border border-indigo-200 shadow-md grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn"
            >
              {/* Left & Middle Column: Controls */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Code className="h-4.5 w-4.5 text-primary" /> Inspect & Verify Coding Achievement
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-655 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Student Details</span>
                    <p className="font-bold text-slate-800 mt-0.5">{activeCodingVerification.studentId?.userId?.name}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">{activeCodingVerification.studentId?.rollNumber} | Dept: {activeCodingVerification.studentId?.department} | Sec: {activeCodingVerification.studentId?.section}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Event Details</span>
                    <p className="font-bold text-slate-850 mt-0.5">{activeCodingVerification.eventName} ({activeCodingVerification.eventType})</p>
                    <span className="text-[10px] text-slate-400 font-semibold">Organizer: {activeCodingVerification.organizer} | Platform: {activeCodingVerification.platform}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Academic Year</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">Year {activeCodingVerification.academicYear}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Event Date</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">
                      {activeCodingVerification.eventDate ? new Date(activeCodingVerification.eventDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  {activeCodingVerification.rank && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Rank / Position</span>
                      <span className="font-bold text-slate-700 mt-0.5 block">{activeCodingVerification.rank}</span>
                    </div>
                  )}
                  {activeCodingVerification.teamName && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Team Details</span>
                      <span className="font-bold text-slate-700 mt-0.5 block">{activeCodingVerification.teamName} {activeCodingVerification.teamMembers ? `(${activeCodingVerification.teamMembers})` : ''}</span>
                    </div>
                  )}
                </div>

                {codingActionMsg && (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-lg text-xs font-semibold">
                    {codingActionMsg}
                  </div>
                )}

                {/* Review Form controls */}
                {(user?.role === 'HOD' || user?.role === 'ADMIN') ? (
                  <div className="space-y-4 border-t border-slate-100 pt-3">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                      ⚠️ Read-only monitor mode. Verification actions are restricted to faculty advisors.
                    </div>
                    <button
                      onClick={() => setActiveCodingVerification(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                    >
                      Close Review Panel
                    </button>
                  </div>
                ) : !showCodingRejectRemarks ? (
                  <div className="space-y-4 border-t border-slate-100 pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Editable category selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                          Editable Approved Category
                        </label>
                        <select
                          value={codingCategoryOverride}
                          onChange={(e) => handleCodingCategoryChange(e.target.value)}
                          title="Editable approved coding category"
                          aria-label="Editable approved coding category"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary focus:ring-1"
                        >
                          <option value="Hackathon Participation">Hackathon Participation (2 pts)</option>
                          <option value="Hackathon Merit">Hackathon Merit (4 pts)</option>
                          <option value="Coding Challenge Participation">Coding Challenge Participation (2 pts)</option>
                          <option value="Coding Challenge Merit">Coding Challenge Merit (3 pts)</option>
                        </select>
                      </div>

                      {/* Editable score input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                          Editable Score Points
                        </label>
                        <input
                          type="number"
                          value={codingScoreOverride}
                          onChange={(e) => setCodingScoreOverride(Number(e.target.value))}
                          min={0}
                          max={50}
                          title="Editable coding score points"
                          aria-label="Editable coding score points"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary focus:ring-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                        Faculty Remarks / Feedback (Optional on Approval)
                      </label>
                      <textarea
                        value={codingRemarks}
                        onChange={(e) => setCodingRemarks(e.target.value)}
                        placeholder="Add comments about this achievement..."
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-primary text-slate-800"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleCodingApprove}
                        disabled={codingVerifying}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow"
                      >
                        <Check className="h-4 w-4" /> Approve Submission
                      </button>
                      <button
                        onClick={() => setShowCodingRejectRemarks(true)}
                        disabled={codingVerifying}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow"
                      >
                        <X className="h-4 w-4" /> Reject Submission
                      </button>
                      <button
                        onClick={() => {
                          setActiveCodingVerification(null);
                          setShowCodingRejectRemarks(false);
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 border-t border-slate-100 pt-3">
                    <label className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
                      Mandatory Rejection Feedback / Remarks
                    </label>
                    <textarea
                      value={codingRemarks}
                      onChange={(e) => setCodingRemarks(e.target.value)}
                      placeholder="Please specify why this achievement is being rejected (required)..."
                      className="w-full p-3 bg-slate-50 border border-rose-200 rounded-xl text-xs focus:outline-none focus:border-rose-500 text-slate-850 focus:ring-1"
                      rows={3}
                      required
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleCodingReject}
                        disabled={codingVerifying || !codingRemarks.trim()}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        <X className="h-4 w-4" /> Confirm Rejection
                      </button>
                      <button
                        onClick={() => {
                          setShowCodingRejectRemarks(false);
                          setCodingRemarks('');
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        Go Back
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Reference Panel */}
              <div className="lg:col-span-1 bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1 mb-2.5">
                    <HelpCircle className="h-4 w-4 text-slate-400" /> Reference Table
                  </h4>
                  <div className="text-[11px] text-slate-650 space-y-1.5">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Hackathon Participation</span>
                      <span className="font-bold text-slate-805">2 Points</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Hackathon Merit</span>
                      <span className="font-bold text-slate-805">4 Points</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Coding Challenge Part.</span>
                      <span className="font-bold text-slate-805">2 Points</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Coding Challenge Merit</span>
                      <span className="font-bold text-slate-805">3 Points</span>
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-slate-450 italic mt-4 leading-normal bg-white p-2 rounded-lg border border-slate-100">
                  Note: Approved scores are capped: Max 10 for Year 1/2, Max 5 for Year 3/4. Recalculation is automatic.
                </p>
              </div>
            </motion.div>
          )}

          {/* Pending Coding Challenges List */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-850 flex items-center gap-2 border-b border-slate-100 pb-3 uppercase tracking-wider">
              <Code className="h-4.5 w-4.5 text-primary" /> Coding Challenges & Hackathons Queue
            </h3>

            <div className="overflow-x-auto">
              {pendingCodingQueue.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No pending coding challenge submissions. All clear!</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold">
                      <th className="py-2.5">Student</th>
                      <th className="py-2.5">Event Details</th>
                      <th className="py-2.5">Platform & Category</th>
                      <th className="py-2.5">Score</th>
                      <th className="py-2.5">Document</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {pendingCodingQueue.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50">
                        <td className="py-3">
                          <p className="font-bold text-slate-800">{item.studentId?.userId?.name}</p>
                          <span className="text-[10px] text-slate-400">{item.studentId?.rollNumber} ({item.studentId?.department} - {item.studentId?.section})</span>
                        </td>
                        <td className="py-3">
                          <p className="font-semibold text-slate-700">{item.eventName}</p>
                          <p className="text-[10px] text-slate-450">
                            Type: {item.eventType} | Org: {item.organizer} | Year {item.academicYear}
                          </p>
                        </td>
                        <td className="py-3">
                          <p className="font-semibold text-slate-700">{item.platform}</p>
                          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-bold rounded-full">
                            {item.studentSelectedCategory}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="font-bold text-slate-705">{item.studentCalculatedScore}</span>
                        </td>
                        <td className="py-3">
                          {item.certificateFile ? (
                            <a
                              href={item.certificateFile}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-semibold"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Preview File
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400">No file</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              setActiveCodingVerification(item);
                              setCodingCategoryOverride(item.studentSelectedCategory);
                              setCodingScoreOverride(item.studentCalculatedScore);
                              setCodingActionMsg('');
                              setCodingRemarks(item.remarks || '');
                              setShowCodingRejectRemarks(false);
                            }}
                            className="px-2.5 py-1 bg-primary text-white hover:bg-primary/90 rounded-lg font-semibold text-[10px] transition-all"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leadership' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Action Dialog / Category Override Section for Leadership Activities */}
          {activeLeadershipVerification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-xl border border-indigo-200 shadow-md grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn"
            >
              {/* Left & Middle Column: Controls */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-slate-805 flex items-center gap-1.5">
                  <Users className="h-4.5 w-4.5 text-primary" /> Inspect & Verify Leadership Activity
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-655 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Student Details</span>
                    <p className="font-bold text-slate-800 mt-0.5">{activeLeadershipVerification.studentId?.userId?.name}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">{activeLeadershipVerification.studentId?.rollNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Organization / Club Details</span>
                    <p className="font-bold text-slate-850 mt-0.5">{activeLeadershipVerification.organizationName}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">Position: {activeLeadershipVerification.leadershipPosition || 'N/A'} | Duration: {activeLeadershipVerification.duration}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Academic Year</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">Year {activeLeadershipVerification.academicYear}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Appointment Date</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">
                      {activeLeadershipVerification.appointmentDate ? new Date(activeLeadershipVerification.appointmentDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {leadActionMsg && (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-lg text-xs font-semibold">
                    {leadActionMsg}
                  </div>
                )}

                {/* Review Form controls */}
                {(user?.role === 'HOD' || user?.role === 'ADMIN') ? (
                  <div className="space-y-4 border-t border-slate-100 pt-3">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                      ⚠️ Read-only monitor mode. Verification actions are restricted to faculty advisors.
                    </div>
                    <button
                      onClick={() => setActiveLeadershipVerification(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                    >
                      Close Review Panel
                    </button>
                  </div>
                ) : !showLeadRejectRemarks ? (
                  <div className="space-y-4 border-t border-slate-100 pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Editable category selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                          Editable Approved Role
                        </label>
                        <select
                          value={leadRoleOverride}
                          onChange={(e) => handleLeadRoleChange(e.target.value as any)}
                          title="Editable approved leadership role"
                          aria-label="Editable approved leadership role"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary focus:ring-1"
                        >
                          <option value="CR / LR / ARC / SAC – Members">CR / LR / ARC / SAC – Members (3 pts)</option>
                          <option value="Coordinators">Coordinators (5 pts)</option>
                        </select>
                      </div>

                      {/* Editable score input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                          Editable Score Points
                        </label>
                        <input
                          type="number"
                          value={leadScoreOverride}
                          onChange={(e) => setLeadScoreOverride(Number(e.target.value))}
                          min={0}
                          max={50}
                          title="Editable leadership score points"
                          aria-label="Editable leadership score points"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary focus:ring-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                        Faculty Remarks / Feedback (Optional on Approval)
                      </label>
                      <textarea
                        value={leadRemarks}
                        onChange={(e) => setLeadRemarks(e.target.value)}
                        placeholder="Add comments about this leadership position..."
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-primary text-slate-800"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleLeadApprove}
                        disabled={leadVerifying}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow"
                      >
                        <Check className="h-4 w-4" /> Approve Submission
                      </button>
                      <button
                        onClick={() => setShowLeadRejectRemarks(true)}
                        disabled={leadVerifying}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow"
                      >
                        <X className="h-4 w-4" /> Reject Submission
                      </button>
                      <button
                        onClick={() => {
                          setActiveLeadershipVerification(null);
                          setShowLeadRejectRemarks(false);
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 border-t border-slate-100 pt-3">
                    <label className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
                      Mandatory Rejection Feedback / Remarks
                    </label>
                    <textarea
                      value={leadRemarks}
                      onChange={(e) => setLeadRemarks(e.target.value)}
                      placeholder="Please specify why this leadership activity is being rejected (required)..."
                      className="w-full p-3 bg-slate-50 border border-rose-200 rounded-xl text-xs focus:outline-none focus:border-rose-500 text-slate-850 focus:ring-1"
                      rows={3}
                      required
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleLeadReject}
                        disabled={leadVerifying || !leadRemarks.trim()}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        <X className="h-4 w-4" /> Confirm Rejection
                      </button>
                      <button
                        onClick={() => {
                          setShowLeadRejectRemarks(false);
                          setLeadRemarks('');
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        Go Back
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Reference Panel */}
              <div className="lg:col-span-1 bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1 mb-2.5">
                    <HelpCircle className="h-4 w-4 text-slate-400" /> Reference Table
                  </h4>
                  <div className="text-[11px] text-slate-655 space-y-1.5">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>CR / LR / ARC / SAC – Members</span>
                      <span className="font-bold text-slate-805">3 Points</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Coordinators</span>
                      <span className="font-bold text-slate-805">5 Points</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Year 1, 2, & 3 Cap</span>
                      <span className="font-bold text-slate-805">5 Points</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Year 4 Cap</span>
                      <span className="font-bold text-slate-805">0 Points</span>
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-slate-450 italic mt-4 leading-normal bg-white p-2 rounded-lg border border-slate-100">
                  Note: Approved activities in Year 4 contribute 0 marks, but will still be stored and displayed. Recalculation is automatic.
                </p>
              </div>
            </motion.div>
          )}

          {/* Pending Leadership List */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-850 flex items-center gap-2 border-b border-slate-100 pb-3 uppercase tracking-wider">
              <Users className="h-4.5 w-4.5 text-primary" /> Leadership Activities Queue
            </h3>

            <div className="overflow-x-auto">
              {pendingLeadershipQueue.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No pending leadership submissions. All clear!</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold">
                      <th className="py-2.5">Student</th>
                      <th className="py-2.5">Organization Details</th>
                      <th className="py-2.5">Student Selected Role</th>
                      <th className="py-2.5">Score</th>
                      <th className="py-2.5">Document</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {pendingLeadershipQueue.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50">
                        <td className="py-3">
                          <p className="font-bold text-slate-800">{item.studentId?.userId?.name}</p>
                          <span className="text-[10px] text-slate-400">{item.studentId?.rollNumber}</span>
                        </td>
                        <td className="py-3">
                          <p className="font-semibold text-slate-700">{item.organizationName}</p>
                          <p className="text-[10px] text-slate-455">
                            Position: {item.leadershipPosition || 'N/A'} | Year {item.academicYear}
                          </p>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-bold rounded-full">
                            {item.studentSelectedRole}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="font-bold text-slate-705">{item.studentCalculatedScore}</span>
                        </td>
                        <td className="py-3">
                          {item.appointmentLetter ? (
                            <a
                              href={item.appointmentLetter}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-semibold"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Preview File
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400">No file</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              setActiveLeadershipVerification(item);
                              setLeadRoleOverride(item.studentSelectedRole);
                              setLeadScoreOverride(item.studentCalculatedScore);
                              setLeadActionMsg('');
                              setLeadRemarks(item.remarks || '');
                              setShowLeadRejectRemarks(false);
                            }}
                            className="px-2.5 py-1 bg-primary text-white hover:bg-primary/90 rounded-lg font-semibold text-[10px] transition-all"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sports' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Action Dialog Section for Sports/Fitness */}
          {activeSportsVerification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-xl border border-indigo-200 shadow-md grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn"
            >
              {/* Left & Middle Column: Controls */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-slate-805 flex items-center gap-1.5">
                  <Trophy className="h-4.5 w-4.5 text-primary" /> Inspect & Verify Sports / Physical Fitness Certificate
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-655 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Student Details</span>
                    <p className="font-bold text-slate-800 mt-0.5">{activeSportsVerification.studentId?.userId?.name}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">{activeSportsVerification.studentId?.rollNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Activity Details</span>
                    <p className="font-bold text-slate-850 mt-0.5">{activeSportsVerification.activityName}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">Event: {activeSportsVerification.eventName} | Organizer: {activeSportsVerification.organizer}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Academic Year</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">Year {activeSportsVerification.academicYear}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Event Date</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">
                      {activeSportsVerification.eventDate ? new Date(activeSportsVerification.eventDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  {activeSportsVerification.description && (
                    <div className="md:col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Student Description</span>
                      <p className="text-slate-700 mt-0.5 italic">"{activeSportsVerification.description}"</p>
                    </div>
                  )}
                </div>

                {sportsActionMsg && (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-lg text-xs font-semibold">
                    {sportsActionMsg}
                  </div>
                )}

                {/* Review Form controls */}
                {(user?.role === 'HOD' || user?.role === 'ADMIN') ? (
                  <div className="space-y-4 border-t border-slate-100 pt-3">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                      ⚠️ Read-only monitor mode. Verification actions are restricted to faculty advisors.
                    </div>
                    <button
                      onClick={() => setActiveSportsVerification(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                    >
                      Close Review Panel
                    </button>
                  </div>
                ) : !showSportsRejectRemarks ? (
                  <div className="space-y-4 border-t border-slate-100 pt-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                        Faculty Remarks / Feedback (Optional on Approval)
                      </label>
                      <textarea
                        value={sportsRemarks}
                        onChange={(e) => setSportsRemarks(e.target.value)}
                        placeholder="Add comments about this sports certificate..."
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-primary text-slate-800"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleSportsApprove}
                        disabled={sportsVerifying}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow"
                      >
                        <Check className="h-4 w-4" /> Approve Submission
                      </button>
                      <button
                        onClick={() => setShowSportsRejectRemarks(true)}
                        disabled={sportsVerifying}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow"
                      >
                        <X className="h-4 w-4" /> Reject Submission
                      </button>
                      <button
                        onClick={() => {
                          setActiveSportsVerification(null);
                          setShowSportsRejectRemarks(false);
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 border-t border-slate-100 pt-3">
                    <label className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
                      Mandatory Rejection Feedback / Remarks
                    </label>
                    <textarea
                      value={sportsRemarks}
                      onChange={(e) => setSportsRemarks(e.target.value)}
                      placeholder="Please specify why this sports certificate is being rejected (required)..."
                      className="w-full p-3 bg-slate-50 border border-rose-200 rounded-xl text-xs focus:outline-none focus:border-rose-500 text-slate-855 focus:ring-1"
                      rows={3}
                      required
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleSportsReject}
                        disabled={sportsVerifying || !sportsRemarks.trim()}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        <X className="h-4 w-4" /> Confirm Rejection
                      </button>
                      <button
                        onClick={() => {
                          setShowSportsRejectRemarks(false);
                          setSportsRemarks('');
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        Go Back
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Reference Panel */}
              <div className="lg:col-span-1 bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1 mb-2.5">
                    <HelpCircle className="h-4 w-4 text-slate-400" /> Scoring Policy
                  </h4>
                  <div className="text-[11px] text-slate-655 space-y-2">
                    <p>Physical Fitness / Sports uses a <strong>binary scoring system</strong> per academic year:</p>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Year 1 Weight</span>
                      <span className="font-bold text-slate-805">5 Points</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Year 2 Weight</span>
                      <span className="font-bold text-slate-805">5 Points</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Year 3 Weight</span>
                      <span className="font-bold text-slate-805">0 Points</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Year 4 Weight</span>
                      <span className="font-bold text-slate-805">0 Points</span>
                    </div>
                    <p className="text-[10px] text-slate-500 italic mt-2">
                      * Awarded if student has at least 1 approved certificate. Additional approved certificates do not award extra points.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Pending Sports Certificates List */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-850 flex items-center gap-2 border-b border-slate-100 pb-3 uppercase tracking-wider">
              <Trophy className="h-4.5 w-4.5 text-primary" /> Sports / Physical Fitness Activities Queue
            </h3>

            <div className="overflow-x-auto">
              {pendingSportsQueue.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No pending sports certifications. All clear!</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold">
                      <th className="py-2.5">Student</th>
                      <th className="py-2.5">Activity & Event Details</th>
                      <th className="py-2.5">Event Date</th>
                      <th className="py-2.5">Academic Year</th>
                      <th className="py-2.5">Document</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {pendingSportsQueue.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50">
                        <td className="py-3">
                          <p className="font-bold text-slate-800">{item.studentId?.userId?.name}</p>
                          <span className="text-[10px] text-slate-400">{item.studentId?.rollNumber}</span>
                        </td>
                        <td className="py-3">
                          <p className="font-semibold text-slate-700">{item.activityName}</p>
                          <p className="text-[10px] text-slate-455">
                            Event: {item.eventName} | Org: {item.organizer}
                          </p>
                        </td>
                        <td className="py-3">
                          <span className="font-semibold text-slate-700">{item.eventDate ? new Date(item.eventDate).toLocaleDateString() : 'N/A'}</span>
                        </td>
                        <td className="py-3">
                          <span className="font-bold text-slate-705">Year {item.academicYear}</span>
                        </td>
                        <td className="py-3">
                          {item.certificateFile ? (
                            <a
                              href={item.certificateFile}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-semibold"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Preview File
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400">No file</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              setActiveSportsVerification(item);
                              setSportsActionMsg('');
                              setSportsRemarks(item.remarks || '');
                              setShowSportsRejectRemarks(false);
                            }}
                            className="px-2.5 py-1 bg-primary text-white hover:bg-primary/90 rounded-lg font-semibold text-[10px] transition-all"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APPROVED SUBMISSIONS HISTORY TAB */}
      {activeTab === 'approved' && (
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-850 flex items-center gap-2 uppercase tracking-wider">
                <CheckSquare className="h-4.5 w-4.5 text-emerald-600" /> Approved Submissions History ({processedRecords.length})
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">View and edit previously approved student achievements and correct dynamic scores.</p>
            </div>
            <button
              onClick={() => loadHistory('APPROVED')}
              className="p-1.5 self-end md:self-auto hover:bg-slate-50 border border-slate-205 rounded-lg text-slate-500 hover:text-slate-800 transition-all flex items-center gap-1 text-[10px] font-bold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? 'animate-spin' : ''}`} /> Refresh History
            </button>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-150">
            {/* Search Input */}
            <div className="sm:col-span-2">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Search Records</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, roll, title, level..."
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-primary text-slate-800"
              />
            </div>

            {/* Academic Year Filter */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Academic Year</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-primary text-slate-850"
              >
                <option value="">All Years</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
            </div>

            {/* Module Filter */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Module</label>
              <select
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-primary text-slate-855"
              >
                <option value="">All Modules</option>
                <option value="Certification">Certification</option>
                <option value="Project">Project</option>
                <option value="Cambridge">Cambridge</option>
                <option value="Co-Curricular">Co-Curricular</option>
                <option value="Extra-Curricular">Extra-Curricular</option>
                <option value="Sports">Sports</option>
                <option value="Coding">Coding</option>
                <option value="Leadership">Leadership</option>
                <option value="Activity">Activity</option>
                <option value="Achievements">Achievements</option>
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Department</label>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-primary text-slate-850"
              >
                <option value="">All Departments</option>
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="EEE">EEE</option>
                <option value="IT">IT</option>
                <option value="MECH">MECH</option>
                <option value="CIVIL">CIVIL</option>
              </select>
            </div>

            {/* Section Filter */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Section</label>
              <input
                type="text"
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                placeholder="Section (e.g. A)"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-primary text-slate-800"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Start Date</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-primary text-slate-800"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">End Date</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-primary text-slate-800"
              />
            </div>
          </div>

          {/* History List Table */}
          <div className="overflow-x-auto">
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                <span className="text-xs text-slate-500 font-semibold">Loading approved history...</span>
              </div>
            ) : processedRecords.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-8 text-center bg-slate-50 rounded-xl">No approved submissions found matching search query.</p>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5">Student Details</th>
                    <th className="py-2.5">Module & Title</th>
                    <th className="py-2.5">Academic Year</th>
                    <th className="py-2.5">Upload Date</th>
                    <th className="py-2.5">Approved Score</th>
                    <th className="py-2.5">Approval Date</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {processedRecords.map((record) => (
                    <tr key={`${record.module}-${record.id}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3">
                        <p className="font-bold text-slate-800">{record.studentName}</p>
                        <span className="text-[10px] text-slate-400 block font-semibold">{record.studentRoll} | {record.studentDept} - {record.studentSection}</span>
                      </td>
                      <td className="py-3">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 mb-0.5">
                          {record.module}
                        </span>
                        <p className="font-semibold text-slate-750 line-clamp-1">{record.title}</p>
                        <span className="text-[9px] text-slate-400 block font-medium">Category: {record.categoryOrLevel}</span>
                      </td>
                      <td className="py-3">
                        <span className="font-bold text-slate-705">Year {record.academicYear}</span>
                      </td>
                      <td className="py-3 font-semibold text-slate-600">
                        {formatDate(record.uploadedDate)}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          +{record.score} pts
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-slate-600">
                        {formatDate(record.processedDate)}
                      </td>
                      <td className="py-3 text-right space-x-1.5">
                        <button
                          onClick={() => setDetailRecord(record)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all"
                        >
                          View Details
                        </button>
                        {record.fileUrl && (
                          <a
                            href={record.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[10px] font-bold transition-all border border-blue-200"
                          >
                            Preview
                          </a>
                        )}
                        {(user?.role === 'FACULTY' || user?.role === 'ADMIN') && (
                          <button
                            onClick={() => handleOpenEdit(record)}
                            className="px-2 py-1 bg-primary text-white hover:bg-primary/90 rounded-lg text-[10px] font-bold transition-all"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* REJECTED SUBMISSIONS HISTORY TAB */}
      {activeTab === 'rejected' && (
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-850 flex items-center gap-2 uppercase tracking-wider">
                <CheckSquare className="h-4.5 w-4.5 text-rose-600" /> Rejected Submissions History ({processedRecords.length})
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">View and edit previously rejected student achievements and reverse decisions.</p>
            </div>
            <button
              onClick={() => loadHistory('REJECTED')}
              className="p-1.5 self-end md:self-auto hover:bg-slate-50 border border-slate-205 rounded-lg text-slate-500 hover:text-slate-800 transition-all flex items-center gap-1 text-[10px] font-bold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? 'animate-spin' : ''}`} /> Refresh History
            </button>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-150">
            {/* Search Input */}
            <div className="sm:col-span-2">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Search Records</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, roll, title, level..."
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-primary text-slate-800"
              />
            </div>

            {/* Academic Year Filter */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Academic Year</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-primary text-slate-850"
              >
                <option value="">All Years</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
            </div>

            {/* Module Filter */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Module</label>
              <select
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-primary text-slate-855"
              >
                <option value="">All Modules</option>
                <option value="Certification">Certification</option>
                <option value="Project">Project</option>
                <option value="Cambridge">Cambridge</option>
                <option value="Co-Curricular">Co-Curricular</option>
                <option value="Extra-Curricular">Extra-Curricular</option>
                <option value="Sports">Sports</option>
                <option value="Coding">Coding</option>
                <option value="Leadership">Leadership</option>
                <option value="Activity">Activity</option>
                <option value="Achievements">Achievements</option>
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Department</label>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-primary text-slate-850"
              >
                <option value="">All Departments</option>
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="EEE">EEE</option>
                <option value="IT">IT</option>
                <option value="MECH">MECH</option>
                <option value="CIVIL">CIVIL</option>
              </select>
            </div>

            {/* Section Filter */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Section</label>
              <input
                type="text"
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                placeholder="Section (e.g. A)"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-primary text-slate-800"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Start Date</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-primary text-slate-800"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">End Date</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-primary text-slate-800"
              />
            </div>
          </div>

          {/* History List Table */}
          <div className="overflow-x-auto">
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                <span className="text-xs text-slate-500 font-semibold">Loading rejected history...</span>
              </div>
            ) : processedRecords.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-8 text-center bg-slate-50 rounded-xl">No rejected submissions found matching search query.</p>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5">Student Details</th>
                    <th className="py-2.5">Module & Title</th>
                    <th className="py-2.5">Academic Year</th>
                    <th className="py-2.5">Upload Date</th>
                    <th className="py-2.5">Faculty Remarks</th>
                    <th className="py-2.5">Rejection Date</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {processedRecords.map((record) => (
                    <tr key={`${record.module}-${record.id}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3">
                        <p className="font-bold text-slate-800">{record.studentName}</p>
                        <span className="text-[10px] text-slate-400 block font-semibold">{record.studentRoll} | {record.studentDept} - {record.studentSection}</span>
                      </td>
                      <td className="py-3">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-100 mb-0.5">
                          {record.module}
                        </span>
                        <p className="font-semibold text-slate-750 line-clamp-1">{record.title}</p>
                        <span className="text-[9px] text-slate-400 block font-medium">Category: {record.categoryOrLevel}</span>
                      </td>
                      <td className="py-3">
                        <span className="font-bold text-slate-705">Year {record.academicYear}</span>
                      </td>
                      <td className="py-3 font-semibold text-slate-600">
                        {formatDate(record.uploadedDate)}
                      </td>
                      <td className="py-3 font-medium italic text-slate-500 max-w-xs truncate">
                        "{record.remarks || 'No remarks.'}"
                      </td>
                      <td className="py-3 font-semibold text-slate-600">
                        {formatDate(record.processedDate)}
                      </td>
                      <td className="py-3 text-right space-x-1.5">
                        <button
                          onClick={() => setDetailRecord(record)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all"
                        >
                          View Details
                        </button>
                        {record.fileUrl && (
                          <a
                            href={record.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[10px] font-bold transition-all border border-blue-200"
                          >
                            Preview
                          </a>
                        )}
                        {(user?.role === 'FACULTY' || user?.role === 'ADMIN') && (
                          <button
                            onClick={() => handleOpenEdit(record)}
                            className="px-2 py-1 bg-primary text-white hover:bg-primary/90 rounded-lg text-[10px] font-bold transition-all"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* DETAIL VIEW & TIMELINE MODAL */}
      {detailRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-xl overflow-hidden animate-scaleIn flex flex-col max-h-[90vh]">
            <div className="bg-[#0b1a50] text-white p-4 flex justify-between items-center shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Submission Verification Details</h3>
              <button
                onClick={() => {
                  setDetailRecord(null);
                  setActiveAuditRecord(null);
                  setAuditLogs([]);
                }}
                className="text-white/80 hover:text-white transition-all text-sm font-bold bg-transparent border-0 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150 text-slate-750">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Student Name</span>
                  <span className="font-bold text-slate-800">{detailRecord.studentName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Roll Number</span>
                  <span className="font-bold text-slate-800">{detailRecord.studentRoll}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Department & Section</span>
                  <span className="font-semibold text-slate-700">{detailRecord.studentDept} - {detailRecord.studentSection}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Academic Year</span>
                  <span className="font-semibold text-slate-700">Year {detailRecord.academicYear}</span>
                </div>
                <div className="col-span-2 border-t border-slate-205 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Achievement Title</span>
                  <span className="font-bold text-slate-805 text-xs">{detailRecord.title}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Category / Level</span>
                  <span className="font-bold text-indigo-700">{detailRecord.categoryOrLevel}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Awarded Score</span>
                  <span className="font-bold text-emerald-700">+{detailRecord.score} Points</span>
                </div>
                <div className="col-span-2 border-t border-slate-205 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Faculty Remarks</span>
                  <p className="text-slate-700 italic bg-white p-3 rounded-lg border border-slate-150 mt-1 whitespace-pre-wrap">
                    "{detailRecord.remarks || 'No remarks provided.'}"
                  </p>
                </div>
              </div>

              {/* Audit History Timeline section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Audit & Modification History</h4>
                  {!activeAuditRecord ? (
                    <button
                      onClick={() => handleOpenAudit(detailRecord)}
                      className="text-primary hover:underline text-[10px] font-bold bg-transparent border-0 cursor-pointer"
                    >
                      Fetch Audit Trail
                    </button>
                  ) : null}
                </div>

                {activeAuditRecord && (
                  <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
                    {loadingAudit ? (
                      <div className="flex items-center gap-1.5 py-4">
                        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-[10px] text-slate-500 font-semibold">Loading audit logs...</span>
                      </div>
                    ) : auditLogs.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic py-2">No previous modifications. This represents the original verification.</p>
                    ) : (
                      <div className="relative border-l-2 border-slate-200 pl-4 space-y-4 ml-1">
                        {auditLogs.map((log, idx) => (
                          <div key={log._id || idx} className="relative text-[10px]">
                            <span className="absolute -left-[22px] top-1 bg-primary text-white text-[8px] font-black h-3.5 w-3.5 rounded-full flex items-center justify-center border border-white">
                              {auditLogs.length - idx}
                            </span>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 space-y-1">
                              <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                                <span>Modified by: {log.facultyName}</span>
                                <span>{formatDate(log.modificationDate || log.createdAt)}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[9.5px] mt-1 border-t border-slate-100 pt-1.5">
                                <div>
                                  <span className="text-[8px] text-slate-400 block uppercase font-bold">Decision Shift</span>
                                  <span className="font-bold text-slate-700">{log.previousStatus} ➔ {log.newStatus}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-slate-400 block uppercase font-bold">Score Shift</span>
                                  <span className="font-bold text-slate-700">+{log.previousScore} ➔ +{log.updatedScore} pts</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-[8px] text-slate-400 block uppercase font-bold font-bold">Remarks Shift</span>
                                  <p className="text-slate-600 italic mt-0.5">
                                    "{log.previousRemarks || 'Empty'}" ➔ "{log.updatedRemarks || 'Empty'}"
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-150 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => {
                  setDetailRecord(null);
                  setActiveAuditRecord(null);
                  setAuditLogs([]);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-all"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SUBMISSION MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-sm overflow-hidden animate-scaleIn flex flex-col">
            <div className="bg-primary text-white p-4 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Adjust Verification Decision</h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-white/80 hover:text-white transition-all text-sm font-bold bg-transparent border-0 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Read-only reference banner */}
              <div className="bg-indigo-50 border border-indigo-150 p-3 rounded-lg text-slate-750">
                <p className="font-bold text-slate-800">{editingRecord.studentName} ({editingRecord.studentRoll})</p>
                <p className="font-semibold text-slate-550 text-[10px] mt-0.5">{editingRecord.module}: "{editingRecord.title}"</p>
              </div>

              {/* Status Decision Select */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 block uppercase tracking-wide">Verification Decision</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-primary text-slate-850"
                >
                  <option value="APPROVED">APPROVED (Verified & Score Awarded)</option>
                  <option value="REJECTED">REJECTED (Certificate Rejected & Score Revoked)</option>
                </select>
              </div>

              {/* Category / Level override select */}
              {editStatus === 'APPROVED' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 block uppercase tracking-wide">Approved Category / Level</label>
                    {editingRecord.module === 'Sports' ? (
                      <input
                        type="text"
                        value="Sports Activity"
                        disabled
                        className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-400 cursor-not-allowed"
                      />
                    ) : (
                      <select
                        value={editCategory}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditCategory(val);
                          // Auto pre-fill score based on standard mapping
                          if (editingRecord.module === 'Certification') {
                            setEditScore(categoryPointsMap[val] || 2);
                          } else if (editingRecord.module === 'Project') {
                            setEditScore(projectPointsMap[val] || 2);
                          } else if (editingRecord.module === 'Cambridge') {
                            setEditScore(cambPointsMap[val] || 6);
                          } else if (editingRecord.module === 'Co-Curricular' || editingRecord.module === 'Extra-Curricular' || editingRecord.module === 'Activity') {
                            setEditScore(coPointsMap[val] || extraPointsMap[val] || 2);
                          } else if (editingRecord.module === 'Coding') {
                            setEditScore(challengePointsMap[val] || 2);
                          } else if (editingRecord.module === 'Leadership') {
                            setEditScore(roleScoreMap[val] || 3);
                          }
                        }}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-primary text-slate-850"
                      >
                        {editingRecord.module === 'Certification' && Object.keys(categoryPointsMap).map(k => <option key={k} value={k}>{k}</option>)}
                        {editingRecord.module === 'Project' && Object.keys(projectPointsMap).map(k => <option key={k} value={k}>{k}</option>)}
                        {editingRecord.module === 'Cambridge' && Object.keys(cambPointsMap).map(k => <option key={k} value={k}>{k}</option>)}
                        {editingRecord.module === 'Co-Curricular' && Object.keys(coPointsMap).map(k => <option key={k} value={k}>{k}</option>)}
                        {editingRecord.module === 'Extra-Curricular' && Object.keys(extraPointsMap).map(k => <option key={k} value={k}>{k}</option>)}
                        {(editingRecord.module === 'Activity') && Object.keys(coPointsMap).map(k => <option key={k} value={k}>{k}</option>)}
                        {editingRecord.module === 'Coding' && Object.keys(challengePointsMap).map(k => <option key={k} value={k}>{k}</option>)}
                        {editingRecord.module === 'Leadership' && Object.keys(roleScoreMap).map(k => <option key={k} value={k}>{k}</option>)}
                        {editingRecord.module === 'Achievements' && [
                          'CERTIFICATION', 'PROJECT', 'INTERNSHIP', 'RESEARCH_PAPER', 'SPORTS', 'CLUB', 'HACKATHON', 'WORKSHOP', 'COMPETITION'
                        ].map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    )}
                  </div>

                  {/* Awarded Score */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 block uppercase tracking-wide">Approved Awarded Score</label>
                    <input
                      type="number"
                      value={editScore}
                      onChange={(e) => setEditScore(e.target.value)}
                      disabled={editingRecord.module === 'Sports' || editingRecord.module === 'Achievements'}
                      className={`w-full p-2.5 border rounded-xl text-xs focus:outline-none focus:border-primary text-slate-800 ${
                        editingRecord.module === 'Sports' || editingRecord.module === 'Achievements'
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </>
              )}

              {/* Remarks */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 block uppercase tracking-wide">
                  Faculty Modification Remarks {editStatus === 'REJECTED' && '(Required for rejection)'}
                </label>
                <textarea
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-primary text-slate-800"
                  rows={2}
                  placeholder="Explain why this decision/score is being corrected..."
                />
              </div>

              {editMsg && (
                <div className={`p-2 rounded-lg text-xs font-semibold ${
                  editMsg.startsWith('✅')
                    ? 'bg-emerald-50 border border-emerald-150 text-emerald-700'
                    : 'bg-rose-50 border border-rose-150 text-rose-700'
                }`}>
                  {editMsg}
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-150 flex justify-end gap-3 text-xs">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 bg-slate-205 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit || (editStatus === 'REJECTED' && !editRemarks.trim())}
                className="px-4 py-2 bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl disabled:opacity-50 transition-all flex items-center gap-1.5 shadow"
              >
                {savingEdit && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Confirm Edits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyDashboard;
