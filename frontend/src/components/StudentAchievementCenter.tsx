import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import {
  Award,
  Plus,
  X,
  Edit3,
  Trash2,
  ExternalLink,
  File,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Code,
  Trophy,
  Users,
  Calendar,
} from 'lucide-react';
import { apiFetch } from '../utils/api';

const categoryScoreMap: Record<string, number> = {
  'Normal Certificate': 2,
  'NPTEL Elite': 3,
  'NPTEL Silver': 5,
  'NPTEL Gold': 5,
  'NPTEL Topper': 5,
  'Global Certification': 10,
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

type AchievementTab = 'certifications' | 'projects' | 'cambridge' | 'cocurricular' | 'extracurricular' | 'sports' | 'coding' | 'leadership';

const StudentAchievementCenter: React.FC = () => {
  const currentAcademicYear = useSelector((state: RootState) => state.auth.currentAcademicYear);
  const selectedAcademicYear = currentAcademicYear;
  const selectedCambridgeYear = currentAcademicYear;
  const selectedCoYear = currentAcademicYear;
  const selectedExtraYear = currentAcademicYear;
  const selectedSportsYear = currentAcademicYear;
  const selectedProjectYear = currentAcademicYear;
  const selectedChallengeYear = currentAcademicYear;
  const selectedLeadershipYear = currentAcademicYear;

  const [activeTab, setActiveTab] = useState<AchievementTab>('certifications');

  const [certifications, setCertifications] = useState<any[]>([]);
  const [certificationScores, setCertificationScores] = useState<any[]>([]);
  const [showCertModal, setShowCertModal] = useState(false);
  const [isEditingCert, setIsEditingCert] = useState(false);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [certName, setCertName] = useState('');
  const [certCategory, setCertCategory] = useState('Normal Certificate');
  const [provider, setProvider] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [certAcademicYear, setCertAcademicYear] = useState<number>(1);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certSubmitting, setCertSubmitting] = useState(false);
  const [certError, setCertError] = useState('');
  const [certMsg, setCertMsg] = useState('');

  const [cambridgeCerts, setCambridgeCerts] = useState<any[]>([]);
  const [cambridgeScores, setCambridgeScores] = useState<any[]>([]);
  const [levelMappings, setLevelMappings] = useState<any[]>([]);
  const [showCambModal, setShowCambModal] = useState(false);
  const [isEditingCamb, setIsEditingCamb] = useState(false);
  const [editingCambId, setEditingCambId] = useState<string | null>(null);
  const [cambName, setCambName] = useState('');
  const [cambLevel, setCambLevel] = useState('B2 First');
  const [cambProvider, setCambProvider] = useState('Cambridge English');
  const [cambCertNumber, setCambCertNumber] = useState('');
  const [cambIssueDate, setCambIssueDate] = useState('');
  const [cambAcademicYear, setCambAcademicYear] = useState<number>(1);
  const [cambFile, setCambFile] = useState<File | null>(null);
  const [cambSubmitting, setCambSubmitting] = useState(false);
  const [cambError, setCambError] = useState('');
  const [cambMsg, setCambMsg] = useState('');

  // Co-Curricular States
  const [coCerts, setCoCerts] = useState<any[]>([]);
  const [coScores, setCoScores] = useState<any[]>([]);
  const [showCoModal, setShowCoModal] = useState(false);
  const [isEditingCo, setIsEditingCo] = useState(false);
  const [editingCoId, setEditingCoId] = useState<string | null>(null);
  const [coName, setCoName] = useState('');
  const [coCategory, setCoCategory] = useState('Paper Presentation');
  const [coLevel, setCoLevel] = useState('Institute Level');
  const [coProvider, setCoProvider] = useState('');
  const [coCertNumber, setCoCertNumber] = useState('');
  const [coIssueDate, setCoIssueDate] = useState('');
  const [coAcademicYear, setCoAcademicYear] = useState<number>(1);
  const [coFile, setCoFile] = useState<File | null>(null);
  const [coSubmitting, setCoSubmitting] = useState(false);
  const [coError, setCoError] = useState('');
  const [coMsg, setCoMsg] = useState('');

  // Extra-Curricular States
  const [extraCerts, setExtraCerts] = useState<any[]>([]);
  const [extraScores, setExtraScores] = useState<any[]>([]);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [isEditingExtra, setIsEditingExtra] = useState(false);
  const [editingExtraId, setEditingExtraId] = useState<string | null>(null);
  const [extraName, setExtraName] = useState('');
  const [extraCategory, setExtraCategory] = useState('NSS');
  const [extraProvider, setExtraProvider] = useState('');
  const [extraCertNumber, setExtraCertNumber] = useState('');
  const [extraIssueDate, setExtraIssueDate] = useState('');
  const [extraAcademicYear, setExtraAcademicYear] = useState<number>(1);
  const [extraFile, setExtraFile] = useState<File | null>(null);
  const [extraSubmitting, setExtraSubmitting] = useState(false);
  const [extraError, setExtraError] = useState('');
  const [extraMsg, setExtraMsg] = useState('');
  const [extraLevel, setExtraLevel] = useState('Institute Level');

  // Physical Fitness / Sports States
  const [sportsCerts, setSportsCerts] = useState<any[]>([]);
  const [sportsScores, setSportsScores] = useState<any[]>([]);
  const [showSportsModal, setShowSportsModal] = useState(false);
  const [isEditingSports, setIsEditingSports] = useState(false);
  const [editingSportsId, setEditingSportsId] = useState<string | null>(null);
  const [sportsActivityName, setSportsActivityName] = useState('');
  const [sportsEventName, setSportsEventName] = useState('');
  const [sportsOrganizer, setSportsOrganizer] = useState('');
  const [sportsEventDate, setSportsEventDate] = useState('');
  const [sportsCertNumber, setSportsCertNumber] = useState('');
  const [sportsDescription, setSportsDescription] = useState('');
  const [sportsAcademicYear, setSportsAcademicYear] = useState<number>(1);
  const [sportsFile, setSportsFile] = useState<File | null>(null);
  const [sportsSubmitting, setSportsSubmitting] = useState(false);
  const [sportsError, setSportsError] = useState('');
  const [sportsMsg, setSportsMsg] = useState('');
  const [projectCerts, setProjectCerts] = useState<any[]>([]);
  const [projectScores, setProjectScores] = useState<any[]>([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectLevel, setProjectLevel] = useState('Department');
  const [projectTechnologies, setProjectTechnologies] = useState('');
  const [projectDuration, setProjectDuration] = useState('');
  const [projectTeamMembers, setProjectTeamMembers] = useState('');
  const [projectRepositoryUrl, setProjectRepositoryUrl] = useState('');
  const [projectDemoUrl, setProjectDemoUrl] = useState('');
  const [projectAcademicYear, setProjectAcademicYear] = useState<number>(1);
  const [projectFiles, setProjectFiles] = useState<File[]>([]);
  const [projectSubmitting, setProjectSubmitting] = useState(false);
  const [projectError, setProjectError] = useState('');
  const [projectMsg, setProjectMsg] = useState('');

  // Coding Challenge / Hackathon States
  const [challenges, setChallenges] = useState<any[]>([]);
  const [challengeScores, setChallengeScores] = useState<any[]>([]);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [isEditingChallenge, setIsEditingChallenge] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(null);

  const [challengeEventName, setChallengeEventName] = useState('');
  const [challengeEventType, setChallengeEventType] = useState('Hackathon');
  const [challengeOrganizer, setChallengeOrganizer] = useState('');
  const [challengeEventDate, setChallengeEventDate] = useState('');
  const [challengePlatform, setChallengePlatform] = useState('LeetCode');
  const [challengeCategory, setChallengeCategory] = useState('Hackathon Participation');
  const [challengeRank, setChallengeRank] = useState('');
  const [challengeTeamName, setChallengeTeamName] = useState('');
  const [challengeTeamMembers, setChallengeTeamMembers] = useState('');
  const [challengeDescription, setChallengeDescription] = useState('');
  const [challengeCertNumber, setChallengeCertNumber] = useState('');
  const [challengeAcademicYear, setChallengeAcademicYear] = useState<number>(1);
  const [challengeFile, setChallengeFile] = useState<File | null>(null);
  const [challengeSubmitting, setChallengeSubmitting] = useState(false);
  const [challengeError, setChallengeError] = useState('');
  const [challengeMsg, setChallengeMsg] = useState('');

  // Leadership Activities States
  const [leadershipActivities, setLeadershipActivities] = useState<any[]>([]);
  const [leadershipScores, setLeadershipScores] = useState<any[]>([]);
  const [showLeadershipModal, setShowLeadershipModal] = useState(false);
  const [isEditingLeadership, setIsEditingLeadership] = useState(false);
  const [editingLeadershipId, setEditingLeadershipId] = useState<string | null>(null);

  const [leadRole, setLeadRole] = useState<'CR / LR / ARC / SAC – Members' | 'Coordinators'>('CR / LR / ARC / SAC – Members');
  const [leadOrganizationName, setLeadOrganizationName] = useState('');
  const [leadPosition, setLeadPosition] = useState('');
  const [leadAcademicYear, setLeadAcademicYear] = useState<number>(1);
  const [leadDuration, setLeadDuration] = useState('');
  const [leadAppointmentDate, setLeadAppointmentDate] = useState('');
  const [leadDescription, setLeadDescription] = useState('');
  const [leadFile, setLeadFile] = useState<File | null>(null);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadError, setLeadError] = useState('');
  const [leadMsg, setLeadMsg] = useState('');

  const loadLeadershipActivities = async () => {
    const data = await apiFetch('/leadership-activities/student');
    setLeadershipActivities(data.activities || []);
    setLeadershipScores(data.scores || []);
  };

  const loadCertifications = async () => {
    const data = await apiFetch('/certifications/student');
    setCertifications(data.certifications || []);
    setCertificationScores(data.scores || []);
  };

  const loadCambridge = async () => {
    const data = await apiFetch('/cambridge/student');
    setCambridgeCerts(data.certifications || []);
    setCambridgeScores(data.scores || []);
  };

  const loadCambridgeMappings = async () => {
    const data = await apiFetch('/cambridge/score-mappings');
    setLevelMappings(data.mappings || []);
  };

  const loadCoCurriculars = async () => {
    const data = await apiFetch('/co-curricular/student');
    setCoCerts(data.activities || []);
    setCoScores(data.scores || []);
  };
  const loadExtraCurriculars = async () => {
    const data = await apiFetch('/extra-curricular/student');
    setExtraCerts(data.activities || []);
    setExtraScores(data.scores || []);
  };
  const loadSports = async () => {
    const data = await apiFetch('/physical-fitness/student');
    setSportsCerts(data.activities || []);
    setSportsScores(data.scores || []);
  };
  const loadProjects = async () => {
    const data = await apiFetch('/projects/student');
    setProjectCerts(data.projects || []);
    setProjectScores(data.scores || []);
  };

  const loadCodingChallenges = async () => {
    const data = await apiFetch('/coding-challenges/student');
    setChallenges(data.challenges || []);
    setChallengeScores(data.scores || []);
  };

  useEffect(() => {
    const loadMappings = async () => {
      try {
        await loadCambridgeMappings();
      } catch (err) {
        console.error('Failed to load cambridge mappings', err);
      }
    };
    loadMappings();
  }, []);

  useEffect(() => {
    const loadActiveTabData = async () => {
      try {
        switch (activeTab) {
          case 'certifications':
            await loadCertifications();
            break;
          case 'projects':
            await loadProjects();
            break;
          case 'cambridge':
            await loadCambridge();
            break;
          case 'cocurricular':
            await loadCoCurriculars();
            break;
          case 'extracurricular':
            await loadExtraCurriculars();
            break;
          case 'sports':
            await loadSports();
            break;
          case 'coding':
            await loadCodingChallenges();
            break;
          case 'leadership':
            await loadLeadershipActivities();
            break;
          default:
            break;
        }
      } catch (err) {
        console.error(`Failed to load tab data for ${activeTab}:`, err);
      }
    };
    loadActiveTabData();
  }, [activeTab]);

  const openUploadCertModal = () => {
    setIsEditingCert(false);
    setEditingCertId(null);
    setCertName('');
    setCertCategory('Normal Certificate');
    setProvider('');
    setCertAcademicYear(selectedAcademicYear);
    setCompletionDate('');
    setCertFile(null);
    setCertError('');
    setCertMsg('');
    setShowCertModal(true);
  };

  const openEditCertModal = (cert: any) => {
    setIsEditingCert(true);
    setEditingCertId(cert._id);
    setCertName(cert.certificateName);
    setCertCategory(cert.studentSelectedCategory || cert.certificateCategory);
    setProvider(cert.provider);
    setCertAcademicYear(cert.academicYear);
    setCompletionDate(cert.completionDate ? new Date(cert.completionDate).toISOString().split('T')[0] : '');
    setCertFile(null);
    setCertError('');
    setCertMsg('');
    setShowCertModal(true);
  };

  const closeCertModal = () => {
    setShowCertModal(false);
    setIsEditingCert(false);
    setEditingCertId(null);
  };

  const openUploadCambModal = () => {
    setIsEditingCamb(false);
    setEditingCambId(null);
    setCambName('');
    setCambLevel('B2 First');
    setCambProvider('Cambridge English');
    setCambCertNumber('');
    setCambAcademicYear(selectedCambridgeYear);
    setCambIssueDate('');
    setCambFile(null);
    setCambError('');
    setCambMsg('');
    setShowCambModal(true);
  };

  const openEditCambModal = (cert: any) => {
    setIsEditingCamb(true);
    setEditingCambId(cert._id);
    setCambName(cert.certificateName);
    setCambLevel(cert.studentSelectedLevel || cert.certificateLevel);
    setCambProvider(cert.provider);
    setCambCertNumber(cert.certificateNumber || '');
    setCambAcademicYear(cert.academicYear);
    setCambIssueDate(cert.issueDate ? new Date(cert.issueDate).toISOString().split('T')[0] : '');
    setCambFile(null);
    setCambError('');
    setCambMsg('');
    setShowCambModal(true);
  };

  const closeCambModal = () => {
    setShowCambModal(false);
    setIsEditingCamb(false);
    setEditingCambId(null);
  };

  const openUploadCoModal = () => {
    setIsEditingCo(false);
    setEditingCoId(null);
    setCoName('');
    setCoCategory('Paper Presentation');
    setCoLevel('Institute Level');
    setCoProvider('');
    setCoCertNumber('');
    setCoAcademicYear(selectedCoYear);
    setCoIssueDate('');
    setCoFile(null);
    setCoError('');
    setCoMsg('');
    setShowCoModal(true);
  };
  const openUploadExtraModal = () => {
    setIsEditingExtra(false);
    setEditingExtraId(null);
    setExtraName('');
    setExtraCategory('NSS');
    setExtraLevel('Institute Level');
    setExtraProvider('');
    setExtraCertNumber('');
    setExtraAcademicYear(selectedExtraYear);
    setExtraIssueDate('');
    setExtraFile(null);
    setExtraError('');
    setExtraMsg('');
    setShowExtraModal(true);
  };
  const openUploadProjectModal = () => {
    setIsEditingProject(false);
    setEditingProjectId(null);
    setProjectTitle('');
    setProjectDescription('');
    setProjectLevel('Department');
    setProjectTechnologies('');
    setProjectDuration('');
    setProjectTeamMembers('');
    setProjectRepositoryUrl('');
    setProjectDemoUrl('');
    setProjectAcademicYear(selectedProjectYear);
    setProjectFiles([]);
    setProjectError('');
    setProjectMsg('');
    setShowProjectModal(true);
  };

  const openEditProjectModal = (project: any) => {
    setIsEditingProject(true);
    setEditingProjectId(project._id);
    setProjectTitle(project.projectTitle);
    setProjectDescription(project.projectDescription);
    setProjectLevel(project.studentSelectedLevel || project.projectLevel);
    setProjectTechnologies(Array.isArray(project.technologiesUsed) ? project.technologiesUsed.join(', ') : (project.technologiesUsed || ''));
    setProjectDuration(project.projectDuration);
    setProjectTeamMembers(project.teamMembers);
    setProjectRepositoryUrl(project.repositoryUrl || '');
    setProjectDemoUrl(project.demoUrl || '');
    setProjectAcademicYear(project.academicYear);
    setProjectFiles([]);
    setProjectError('');
    setProjectMsg('');
    setShowProjectModal(true);
  };

  const closeProjectModal = () => {
    setShowProjectModal(false);
    setIsEditingProject(false);
    setEditingProjectId(null);
  };

  const openEditCoModal = (cert: any) => {
    setIsEditingCo(true);
    setEditingCoId(cert._id);
    setCoName(cert.activityName);
    setCoCategory(cert.category);
    setCoLevel(cert.studentSelectedLevel || cert.activityLevel);
    setCoProvider(cert.provider);
    setCoCertNumber(cert.certificateNumber || '');
    setCoAcademicYear(cert.academicYear);
    setCoIssueDate(cert.issueDate ? new Date(cert.issueDate).toISOString().split('T')[0] : '');
    setCoFile(null);
    setCoError('');
    setCoMsg('');
    setShowCoModal(true);
  };

  const closeCoModal = () => {
    setShowCoModal(false);
    setIsEditingCo(false);
    setEditingCoId(null);
  };

  const openEditExtraModal = (cert: any) => {
    setIsEditingExtra(true);
    setEditingExtraId(cert._id);
    setExtraName(cert.activityName);
    setExtraCategory(cert.category);
    setExtraLevel(cert.studentSelectedLevel || cert.activityLevel || 'Institute Level');
    setExtraProvider(cert.provider);
    setExtraCertNumber(cert.certificateNumber || '');
    setExtraAcademicYear(cert.academicYear);
    setExtraIssueDate(cert.issueDate ? new Date(cert.issueDate).toISOString().split('T')[0] : '');
    setExtraFile(null);
    setExtraError('');
    setExtraMsg('');
    setShowExtraModal(true);
  };

  const closeExtraModal = () => {
    setShowExtraModal(false);
    setIsEditingExtra(false);
    setEditingExtraId(null);
  };

  const openUploadSportsModal = () => {
    setIsEditingSports(false);
    setEditingSportsId(null);
    setSportsActivityName('');
    setSportsEventName('');
    setSportsOrganizer('');
    setSportsCertNumber('');
    setSportsDescription('');
    setSportsAcademicYear(selectedSportsYear);
    setSportsEventDate('');
    setSportsFile(null);
    setSportsError('');
    setSportsMsg('');
    setShowSportsModal(true);
  };

  const openEditSportsModal = (cert: any) => {
    setIsEditingSports(true);
    setEditingSportsId(cert._id);
    setSportsActivityName(cert.activityName);
    setSportsEventName(cert.eventName);
    setSportsOrganizer(cert.organizer);
    setSportsCertNumber(cert.certificateNumber || '');
    setSportsAcademicYear(cert.academicYear);
    setSportsEventDate(cert.eventDate ? new Date(cert.eventDate).toISOString().split('T')[0] : '');
    setSportsDescription(cert.description || '');
    setSportsFile(null);
    setSportsError('');
    setSportsMsg('');
    setShowSportsModal(true);
  };

  const closeSportsModal = () => {
    setShowSportsModal(false);
    setIsEditingSports(false);
    setEditingSportsId(null);
  };

  const handleCertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certName.trim() || !provider.trim() || !certCategory) {
      setCertError('Please fill in all required fields.');
      return;
    }

    setCertSubmitting(true);
    setCertError('');
    setCertMsg('');

    const formData = new FormData();
    formData.append('certificateName', certName);
    formData.append('certificateCategory', certCategory);
    formData.append('provider', provider);
    formData.append('academicYear', certAcademicYear.toString());
    if (completionDate) {
      formData.append('completionDate', completionDate);
    }
    if (certFile) {
      formData.append('proofFile', certFile);
    }

    try {
      if (isEditingCert && editingCertId) {
        await apiFetch(`/certifications/${editingCertId}`, { method: 'PUT', bodyData: formData, isMultipart: true });
        setCertMsg('✅ Certification updated successfully and reverted to PENDING.');
      } else {
        if (!certFile) {
          setCertError('Please select a certificate proof file.');
          setCertSubmitting(false);
          return;
        }
        await apiFetch('/certifications', { method: 'POST', bodyData: formData, isMultipart: true });
        setCertMsg('✅ Certification uploaded successfully. Status: PENDING.');
      }

      await loadCertifications();
      setTimeout(() => closeCertModal(), 1500);
    } catch (err: any) {
      setCertError(`❌ Operation failed: ${err.message}`);
    } finally {
      setCertSubmitting(false);
    }
  };

  const handleDeleteCert = async (certId: string) => {
    if (!window.confirm('Are you sure you want to delete this certificate? This action will immediately update your certification score.')) return;
    try {
      await apiFetch(`/certifications/${certId}`, { method: 'DELETE' });
      await loadCertifications();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const handleCambSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cambName.trim() || !cambProvider.trim() || !cambLevel || !cambIssueDate) {
      setCambError('Please fill in all required fields.');
      return;
    }

    setCambSubmitting(true);
    setCambError('');
    setCambMsg('');

    const formData = new FormData();
    formData.append('certificateName', cambName);
    formData.append('certificateLevel', cambLevel);
    formData.append('provider', cambProvider);
    formData.append('certificateNumber', cambCertNumber);
    formData.append('issueDate', cambIssueDate);
    formData.append('academicYear', cambAcademicYear.toString());
    if (cambFile) {
      formData.append('proofFile', cambFile);
    }

    try {
      if (isEditingCamb && editingCambId) {
        await apiFetch(`/cambridge/${editingCambId}`, { method: 'PUT', bodyData: formData, isMultipart: true });
        setCambMsg('✅ Cambridge Certificate updated successfully and reverted to PENDING.');
      } else {
        if (!cambFile) {
          setCambError('Please select a certificate file.');
          setCambSubmitting(false);
          return;
        }
        await apiFetch('/cambridge', { method: 'POST', bodyData: formData, isMultipart: true });
        setCambMsg('✅ Cambridge Certificate uploaded successfully. Status: PENDING.');
      }

      await loadCambridge();
      setTimeout(() => closeCambModal(), 1500);
    } catch (err: any) {
      setCambError(`❌ Operation failed: ${err.message}`);
    } finally {
      setCambSubmitting(false);
    }
  };

  const handleDeleteCamb = async (certId: string) => {
    if (!window.confirm('Are you sure you want to delete this Cambridge certificate? This action will immediately update your communication score.')) return;
    try {
      await apiFetch(`/cambridge/${certId}`, { method: 'DELETE' });
      await loadCambridge();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const handleCoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coName.trim() || !coProvider.trim() || !coLevel || !coIssueDate || !coCategory) {
      setCoError('Please fill in all required fields.');
      return;
    }

    setCoSubmitting(true);
    setCoError('');
    setCoMsg('');

    const formData = new FormData();
    formData.append('activityName', coName);
    formData.append('category', coCategory);
    formData.append('activityLevel', coLevel);
    formData.append('provider', coProvider);
    formData.append('certificateNumber', coCertNumber);
    formData.append('issueDate', coIssueDate);
    formData.append('academicYear', coAcademicYear.toString());
    if (coFile) {
      formData.append('proofFile', coFile);
    }

    try {
      if (isEditingCo && editingCoId) {
        await apiFetch(`/co-curricular/${editingCoId}`, { method: 'PUT', bodyData: formData, isMultipart: true });
        setCoMsg('✅ Co-Curricular Activity updated successfully and reverted to PENDING.');
      } else {
        if (!coFile) {
          setCoError('Please select a certificate proof file.');
          setCoSubmitting(false);
          return;
        }
        await apiFetch('/co-curricular', { method: 'POST', bodyData: formData, isMultipart: true });
        setCoMsg('✅ Co-Curricular Activity uploaded successfully. Status: PENDING.');
      }

      await loadCoCurriculars();
      setTimeout(() => closeCoModal(), 1500);
    } catch (err: any) {
      setCoError(`❌ Operation failed: ${err.message}`);
    } finally {
      setCoSubmitting(false);
    }
  };

  const handleDeleteCo = async (certId: string) => {
    if (!window.confirm('Are you sure you want to delete this co-curricular activity? This action will immediately update your score.')) return;
    try {
      await apiFetch(`/co-curricular/${certId}`, { method: 'DELETE' });
      await loadCoCurriculars();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const handleExtraSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraName.trim() || !extraProvider.trim() || !extraIssueDate || !extraCategory || !extraLevel) {
      setExtraError('Please fill in all required fields.');
      return;
    }

    setExtraSubmitting(true);
    setExtraError('');
    setExtraMsg('');

    const formData = new FormData();
    formData.append('activityName', extraName);
    formData.append('category', extraCategory);
    formData.append('activityLevel', extraLevel);
    formData.append('provider', extraProvider);
    formData.append('certificateNumber', extraCertNumber);
    formData.append('issueDate', extraIssueDate);
    formData.append('academicYear', extraAcademicYear.toString());
    if (extraFile) {
      formData.append('proofFile', extraFile);
    }

    try {
      if (isEditingExtra && editingExtraId) {
        await apiFetch(`/extra-curricular/${editingExtraId}`, { method: 'PUT', bodyData: formData, isMultipart: true });
        setExtraMsg('✅ Extra-Curricular Activity updated successfully and reverted to PENDING.');
      } else {
        if (!extraFile) {
          setExtraError('Please select a certificate proof file.');
          setExtraSubmitting(false);
          return;
        }
        await apiFetch('/extra-curricular', { method: 'POST', bodyData: formData, isMultipart: true });
        setExtraMsg('✅ Extra-Curricular Activity uploaded successfully. Status: PENDING.');
      }

      await loadExtraCurriculars();
      setTimeout(() => closeExtraModal(), 1500);
    } catch (err: any) {
      setExtraError(`❌ Operation failed: ${err.message}`);
    } finally {
      setExtraSubmitting(false);
    }
  };

  const handleDeleteExtra = async (certId: string) => {
    if (!window.confirm('Are you sure you want to delete this extra-curricular activity? This action will immediately update your score.')) return;
    try {
      await apiFetch(`/extra-curricular/${certId}`, { method: 'DELETE' });
      await loadExtraCurriculars();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const handleSportsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sportsActivityName.trim() || !sportsEventName.trim() || !sportsOrganizer.trim() || !sportsEventDate) {
      setSportsError('Please fill in all required fields.');
      return;
    }

    setSportsSubmitting(true);
    setSportsError('');
    setSportsMsg('');

    const formData = new FormData();
    formData.append('activityName', sportsActivityName);
    formData.append('eventName', sportsEventName);
    formData.append('organizer', sportsOrganizer);
    formData.append('eventDate', sportsEventDate);
    formData.append('academicYear', sportsAcademicYear.toString());
    if (sportsCertNumber) {
      formData.append('certificateNumber', sportsCertNumber);
    }
    if (sportsDescription) {
      formData.append('description', sportsDescription);
    }
    if (sportsFile) {
      formData.append('proofFile', sportsFile);
    }

    try {
      if (isEditingSports && editingSportsId) {
        await apiFetch(`/physical-fitness/${editingSportsId}`, { method: 'PUT', bodyData: formData, isMultipart: true });
        setSportsMsg('✅ Physical Fitness record updated successfully and reverted to PENDING.');
      } else {
        if (!sportsFile) {
          setSportsError('Please select a certificate proof file.');
          setSportsSubmitting(false);
          return;
        }
        await apiFetch('/physical-fitness', { method: 'POST', bodyData: formData, isMultipart: true });
        setSportsMsg('✅ Physical Fitness record uploaded successfully. Status: PENDING.');
      }

      await loadSports();
      setTimeout(() => closeSportsModal(), 1500);
    } catch (err: any) {
      setSportsError(`❌ Operation failed: ${err.message}`);
    } finally {
      setSportsSubmitting(false);
    }
  };

  const handleDeleteSports = async (certId: string) => {
    if (!window.confirm('Are you sure you want to delete this physical fitness/sports record? This action will immediately update your score.')) return;
    try {
      await apiFetch(`/physical-fitness/${certId}`, { method: 'DELETE' });
      await loadSports();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };
  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim() || !projectDescription.trim() || !projectLevel || !projectDuration.trim() || !projectTeamMembers.trim()) {
      setProjectError('Please fill in all required fields.');
      return;
    }

    setProjectSubmitting(true);
    setProjectError('');
    setProjectMsg('');

    const formData = new FormData();
    formData.append('projectTitle', projectTitle);
    formData.append('projectDescription', projectDescription);
    formData.append('projectLevel', projectLevel);
    formData.append('technologiesUsed', projectTechnologies);
    formData.append('projectDuration', projectDuration);
    formData.append('teamMembers', projectTeamMembers);
    formData.append('repositoryUrl', projectRepositoryUrl);
    formData.append('demoUrl', projectDemoUrl);
    formData.append('academicYear', projectAcademicYear.toString());
    projectFiles.forEach((file) => formData.append('supportingDocuments', file));

    try {
      if (isEditingProject && editingProjectId) {
        await apiFetch(`/projects/${editingProjectId}`, { method: 'PUT', bodyData: formData, isMultipart: true });
        setProjectMsg('✅ Project updated successfully and reverted to PENDING.');
      } else {
        if (projectFiles.length === 0) {
          setProjectError('Please upload at least one supporting document.');
          setProjectSubmitting(false);
          return;
        }
        await apiFetch('/projects', { method: 'POST', bodyData: formData, isMultipart: true });
        setProjectMsg('✅ Project submitted successfully. Status: PENDING.');
      }

      await loadProjects();
      setTimeout(() => closeProjectModal(), 1500);
    } catch (err: any) {
      setProjectError(`❌ Operation failed: ${err.message}`);
    } finally {
      setProjectSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project? This action will immediately update your project score.')) return;
    try {
      await apiFetch(`/projects/${projectId}`, { method: 'DELETE' });
      await loadProjects();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const openUploadChallengeModal = () => {
    setIsEditingChallenge(false);
    setEditingChallengeId(null);
    setChallengeEventName('');
    setChallengeEventType('Hackathon');
    setChallengeOrganizer('');
    setChallengeEventDate('');
    setChallengePlatform('LeetCode');
    setChallengeCategory('Hackathon Participation');
    setChallengeRank('');
    setChallengeTeamName('');
    setChallengeTeamMembers('');
    setChallengeDescription('');
    setChallengeCertNumber('');
    setChallengeAcademicYear(selectedChallengeYear);
    setChallengeFile(null);
    setChallengeError('');
    setChallengeMsg('');
    setShowChallengeModal(true);
  };

  const openEditChallengeModal = (chal: any) => {
    setIsEditingChallenge(true);
    setEditingChallengeId(chal._id);
    setChallengeEventName(chal.eventName);
    setChallengeEventType(chal.eventType);
    setChallengeOrganizer(chal.organizer);
    setChallengeEventDate(chal.eventDate ? new Date(chal.eventDate).toISOString().split('T')[0] : '');
    setChallengePlatform(chal.platform);
    setChallengeCategory(chal.studentSelectedCategory || chal.achievementCategory);
    setChallengeRank(chal.rank || '');
    setChallengeTeamName(chal.teamName || '');
    setChallengeTeamMembers(chal.teamMembers || '');
    setChallengeDescription(chal.description || '');
    setChallengeCertNumber(chal.certificateNumber || '');
    setChallengeAcademicYear(chal.academicYear);
    setChallengeFile(null);
    setChallengeError('');
    setChallengeMsg('');
    setShowChallengeModal(true);
  };

  const closeChallengeModal = () => {
    setShowChallengeModal(false);
    setIsEditingChallenge(false);
    setEditingChallengeId(null);
  };

  const handleChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeEventName.trim() || !challengeEventType.trim() || !challengeOrganizer.trim() || !challengeEventDate || !challengePlatform.trim() || !challengeCategory) {
      setChallengeError('Please fill in all required fields.');
      return;
    }

    setChallengeSubmitting(true);
    setChallengeError('');
    setChallengeMsg('');

    const formData = new FormData();
    formData.append('eventName', challengeEventName);
    formData.append('eventType', challengeEventType);
    formData.append('organizer', challengeOrganizer);
    formData.append('eventDate', challengeEventDate);
    formData.append('platform', challengePlatform);
    formData.append('achievementCategory', challengeCategory);
    formData.append('rank', challengeRank);
    formData.append('teamName', challengeTeamName);
    formData.append('teamMembers', challengeTeamMembers);
    formData.append('description', challengeDescription);
    formData.append('certificateNumber', challengeCertNumber);
    formData.append('academicYear', challengeAcademicYear.toString());
    if (challengeFile) {
      formData.append('proofFile', challengeFile);
    }

    try {
      if (isEditingChallenge && editingChallengeId) {
        await apiFetch(`/coding-challenges/${editingChallengeId}`, { method: 'PUT', bodyData: formData, isMultipart: true });
        setChallengeMsg('✅ Coding Challenge updated successfully and reverted to PENDING.');
      } else {
        if (!challengeFile) {
          setChallengeError('Please select a certificate proof file.');
          setChallengeSubmitting(false);
          return;
        }
        await apiFetch('/coding-challenges', { method: 'POST', bodyData: formData, isMultipart: true });
        setChallengeMsg('✅ Coding Challenge uploaded successfully. Status: PENDING.');
      }

      await loadCodingChallenges();
      setTimeout(() => closeChallengeModal(), 1500);
    } catch (err: any) {
      setChallengeError(`❌ Operation failed: ${err.message}`);
    } finally {
      setChallengeSubmitting(false);
    }
  };

  const handleDeleteChallenge = async (chalId: string) => {
    if (!window.confirm('Are you sure you want to delete this coding challenge record? This action will immediately update your coding score.')) return;
    try {
      await apiFetch(`/coding-challenges/${chalId}`, { method: 'DELETE' });
      await loadCodingChallenges();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const openUploadLeadershipModal = () => {
    setIsEditingLeadership(false);
    setEditingLeadershipId(null);
    setLeadRole('CR / LR / ARC / SAC – Members');
    setLeadOrganizationName('');
    setLeadPosition('');
    setLeadAcademicYear(selectedLeadershipYear);
    setLeadDuration('');
    setLeadAppointmentDate('');
    setLeadDescription('');
    setLeadFile(null);
    setLeadError('');
    setLeadMsg('');
    setShowLeadershipModal(true);
  };

  const openEditLeadershipModal = (act: any) => {
    setIsEditingLeadership(true);
    setEditingLeadershipId(act._id);
    setLeadRole(act.studentSelectedRole || act.leadershipRole);
    setLeadOrganizationName(act.organizationName);
    setLeadPosition(act.leadershipPosition || '');
    setLeadAcademicYear(act.academicYear);
    setLeadDuration(act.duration);
    setLeadAppointmentDate(act.appointmentDate ? new Date(act.appointmentDate).toISOString().split('T')[0] : '');
    setLeadDescription(act.description || '');
    setLeadFile(null);
    setLeadError('');
    setLeadMsg('');
    setShowLeadershipModal(true);
  };

  const closeLeadershipModal = () => {
    setShowLeadershipModal(false);
    setIsEditingLeadership(false);
    setEditingLeadershipId(null);
  };

  const handleLeadershipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadOrganizationName.trim() || !leadRole || !leadDuration.trim()) {
      setLeadError('Please fill in all required fields.');
      return;
    }

    setLeadSubmitting(true);
    setLeadError('');
    setLeadMsg('');

    const formData = new FormData();
    formData.append('academicYear', leadAcademicYear.toString());
    formData.append('organizationName', leadOrganizationName);
    formData.append('leadershipRole', leadRole);
    formData.append('leadershipPosition', leadPosition);
    formData.append('duration', leadDuration);
    if (leadAppointmentDate) {
      formData.append('appointmentDate', leadAppointmentDate);
    }
    formData.append('description', leadDescription);
    if (leadFile) {
      formData.append('proofFile', leadFile);
    }

    try {
      if (isEditingLeadership && editingLeadershipId) {
        await apiFetch(`/leadership-activities/${editingLeadershipId}`, { method: 'PUT', bodyData: formData, isMultipart: true });
        setLeadMsg('✅ Leadership Activity updated successfully and reverted to PENDING.');
      } else {
        if (!leadFile) {
          setLeadError('Please select an appointment proof file.');
          setLeadSubmitting(false);
          return;
        }
        await apiFetch('/leadership-activities', { method: 'POST', bodyData: formData, isMultipart: true });
        setLeadMsg('✅ Leadership Activity submitted successfully. Status: PENDING.');
      }

      await loadLeadershipActivities();
      setTimeout(() => closeLeadershipModal(), 1500);
    } catch (err: any) {
      setLeadError(`❌ Operation failed: ${err.message}`);
    } finally {
      setLeadSubmitting(false);
    }
  };

  const handleDeleteLeadership = async (actId: string) => {
    if (!window.confirm('Are you sure you want to delete this leadership record? This action will immediately update your leadership score.')) return;
    try {
      await apiFetch(`/leadership-activities/${actId}`, { method: 'DELETE' });
      await loadLeadershipActivities();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const filteredCerts = certifications.filter(cert => cert.academicYear === selectedAcademicYear);
  const activeYearScoreObj = certificationScores.find(score => score.academicYear === selectedAcademicYear) || { score: 0, totalPoints: 0 };
  const maxCap = selectedAcademicYear === 3 || selectedAcademicYear === 4 ? 10 : 5;
  const currentPreviewScore = categoryScoreMap[certCategory] || 2;
  const filteredProjects = projectCerts.filter(project => project.academicYear === selectedProjectYear);
  const activeProjectScoreObj = projectScores.find(score => score.academicYear === selectedProjectYear) || { score: 0, totalPoints: 0 };
  const projectYearCap = selectedProjectYear === 1 ? 5 : 10;
  const currentProjectPreviewScore = projectPointsMap[projectLevel] || 2;

  const filteredChallenges = challenges.filter(chal => chal.academicYear === selectedChallengeYear);
  const activeChallengeScoreObj = challengeScores.find(score => score.academicYear === selectedChallengeYear) || { score: 0, totalPoints: 0 };
  const challengeYearCap = selectedChallengeYear === 1 || selectedChallengeYear === 2 ? 10 : 5;
  const currentChallengePreviewScore = challengePointsMap[challengeCategory] || 2;

  const filteredLeadership = leadershipActivities.filter(act => act.academicYear === selectedLeadershipYear);
  const activeLeadershipScoreObj = leadershipScores.find(score => score.academicYear === selectedLeadershipYear) || { score: 0, totalPoints: 0 };
  const leadershipYearCap = selectedLeadershipYear === 4 ? 0 : 5;
  const currentLeadershipPreviewScore = roleScoreMap[leadRole] || 3;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
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
      case 'APPROVED':
      case 'VERIFIED':
        return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
      case 'REJECTED':
        return 'text-rose-700 bg-rose-50 border border-rose-200';
      default:
        return 'text-amber-700 bg-amber-50 border border-amber-200';
    }
  };

  const getPreviewScore = (level: string) => {
    const match = levelMappings.find((m: any) => m.level === level);
    return match ? match.score : (level === 'A2 Key' ? 2 : level === 'B1 Preliminary' ? 4 : level === 'B2 First' ? 6 : level === 'C1 Advanced' ? 8 : level === 'C2 Proficiency' ? 10 : 2);
  };

  const getCoCurricularPreviewScore = (level: string) => {
    switch (level) {
      case 'Department Level': return 1;
      case 'Institute Level': return 2;
      case 'Inter-University Level': return 3;
      case 'Zonal Level': return 4;
      case 'National / International Level': return 5;
      default: return 1;
    }
  };

  const getExtraCurricularPreviewScore = (level: string) => {
    switch (level) {
      case 'Department Level': return 1;
      case 'Institute Level': return 2;
      case 'Inter-University Level': return 3;
      case 'Zonal Level': return 4;
      case 'National / International Level': return 5;
      default: return 1;
    }
  };

  const getProjectStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'APPROVED';
      case 'REJECTED':
        return 'REJECTED';
      default:
        return 'PENDING';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 bg-primary/10 text-primary font-bold rounded-2xl border border-primary/20 flex items-center justify-center text-3xl">A</div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Submit Achievement</h1>
            <p className="text-xs text-slate-500 mt-1">Certifications, projects, Cambridge certifications, extra-curricular activities, coding challenges / hackathons, and leadership activities.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <FileText className="h-4 w-4 text-primary" /> Reused student modules
        </div>
      </div>

      <div className="flex border-b border-slate-200 gap-6 flex-wrap">
        <button onClick={() => setActiveTab('certifications')} className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${activeTab === 'certifications' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>Certifications & Score Card</button>
        <button onClick={() => setActiveTab('projects')} className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${activeTab === 'projects' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>Projects & Score Card</button>
        <button onClick={() => setActiveTab('coding')} className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${activeTab === 'coding' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>Coding Challenges / Hackathons</button>
        <button onClick={() => setActiveTab('leadership')} className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${activeTab === 'leadership' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>Leadership Activities</button>
        <button onClick={() => setActiveTab('cambridge')} className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${activeTab === 'cambridge' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>Cambridge Certifications</button>
        <button onClick={() => setActiveTab('cocurricular')} className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${activeTab === 'cocurricular' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>Co-Curricular Activities</button>
        <button onClick={() => setActiveTab('extracurricular')} className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${activeTab === 'extracurricular' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>Extra-Curricular Activities</button>
        <button onClick={() => setActiveTab('sports')} className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${activeTab === 'sports' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>Physical Fitness / Sports</button>
      </div>

      {activeTab === 'certifications' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs text-slate-650 font-bold select-none">
              <Calendar className="h-4 w-4 text-primary mr-1" />
              <span>Active Academic Year: Year {currentAcademicYear}</span>
            </div>
            <button onClick={openUploadCertModal} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"><Plus className="h-4 w-4" /> Upload Certification</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-gradient-to-r from-slate-900 to-[#1e1b4b] text-white p-5 rounded-xl border border-indigo-900/50 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Award className="h-24 w-24 text-white" /></div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400">Year {selectedAcademicYear} Capped Score</span>
              <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-white">{activeYearScoreObj.score}</span><span className="text-xs text-indigo-300">/ {maxCap} max score</span></div>
              <progress value={activeYearScoreObj.score} max={maxCap} className="w-full h-2 mt-4 rounded-full overflow-hidden bg-indigo-950/80 [&::-webkit-progress-bar]:bg-indigo-950/80 [&::-webkit-progress-value]:bg-indigo-400 [&::-moz-progress-bar]:bg-indigo-400" />
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450">Total Uncapped Points</span>
                <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-slate-805">{activeYearScoreObj.totalPoints}</span><span className="text-xs text-slate-400">points accumulated</span></div>
              </div>
              <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100"><AlertCircle className="h-3.5 w-3.5 text-primary shrink-0" /> Score is calculated only from approved certifications.</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-2.5">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450 block">Year Scoring Cap Information</span>
              <div className="text-[11px] text-slate-600 space-y-1.5">
                <div className="flex justify-between border-b border-slate-100 pb-1"><span>Year 1 & 2 Cap</span><span className="font-bold text-slate-800">5 Points</span></div>
                <div className="flex justify-between border-b border-slate-100 pb-1"><span>Year 3 & 4 Cap</span><span className="font-bold text-slate-800">10 Points</span></div>
                <p className="text-[9px] text-slate-400 italic pt-1 leading-relaxed">* Note: There is no limit on the number of certificates uploaded. All approved certificates remain visible on your profile.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-805 border-b border-slate-100 pb-3 uppercase tracking-wider">Certifications uploaded for Year {selectedAcademicYear}</h3>
            {filteredCerts.length === 0 ? (
              <div className="text-center py-10"><File className="h-10 w-10 text-slate-300 mx-auto mb-2" /><p className="text-xs text-slate-400 italic">No certifications uploaded for Year {selectedAcademicYear} yet.</p><button onClick={openUploadCertModal} className="mt-3 text-xs text-primary font-bold hover:underline">Upload your first certificate</button></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCerts.map((cert) => (
                  <div key={cert._id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between gap-3 relative">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-1.5"><h4 className="text-xs font-bold text-slate-800 break-words line-clamp-2 pr-20">{cert.certificateName}</h4><span className={`absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold ${getStatusClass(cert.status)}`}>{getStatusIcon(cert.status)} {cert.status}</span></div>
                      <div className="space-y-1 text-[11px] text-slate-600">
                        <p><span className="font-medium text-slate-400">Provider:</span> {cert.provider}</p>
                        <p><span className="font-medium text-slate-400">Category:</span> <span className="font-semibold text-slate-700">{cert.status === 'APPROVED' ? cert.facultyApprovedCategory : cert.studentSelectedCategory}</span></p>
                        <p><span className="font-medium text-slate-400">Score:</span> <span className="font-bold text-slate-700">{cert.status === 'APPROVED' ? cert.facultyApprovedScore : cert.calculatedScore}</span></p>
                        {cert.completionDate && <p><span className="font-medium text-slate-400">Completion Date:</span> {new Date(cert.completionDate).toLocaleDateString()}</p>}
                      </div>
                      {cert.status === 'REJECTED' && cert.remarks && <div className="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-700"><span className="font-bold">Rejection Feedback:</span> "{cert.remarks}"</div>}
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-1.5">
                      <a href={cert.certificateFile} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-bold"><ExternalLink className="h-3 w-3" /> View Certificate</a>
                      <div className="flex gap-2">
                        <button onClick={() => openEditCertModal(cert)} className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-200/50 rounded-lg transition-all" title="Edit certificate details"><Edit3 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDeleteCert(cert._id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete certificate"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs text-slate-650 font-bold select-none">
              <Calendar className="h-4 w-4 text-primary mr-1" />
              <span>Active Academic Year: Year {currentAcademicYear}</span>
            </div>
            <button onClick={openUploadProjectModal} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95">
              <Plus className="h-4 w-4" /> Upload Project
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-gradient-to-r from-slate-900 to-[#1e1b4b] text-white p-5 rounded-xl border border-indigo-900/50 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Award className="h-24 w-24 text-white" /></div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400">Year {selectedProjectYear} Capped Score</span>
              <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-white">{activeProjectScoreObj.score}</span><span className="text-xs text-indigo-300">/ {projectYearCap} max score</span></div>
              <progress value={activeProjectScoreObj.score} max={projectYearCap} className="w-full h-2 mt-4 rounded-full overflow-hidden bg-indigo-950/80 [&::-webkit-progress-bar]:bg-indigo-950/80 [&::-webkit-progress-value]:bg-indigo-400 [&::-moz-progress-bar]:bg-indigo-400" />
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450">Total Uncapped Points</span>
                <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-slate-805">{activeProjectScoreObj.totalPoints}</span><span className="text-xs text-slate-400">points accumulated</span></div>
              </div>
              <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100"><AlertCircle className="h-3.5 w-3.5 text-primary shrink-0" /> Score is calculated only from approved projects.</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-2.5">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450 block">Year Scoring Cap Information</span>
              <div className="text-[11px] text-slate-600 space-y-1.5">
                <div className="flex justify-between border-b border-slate-100 pb-1"><span>Year 1 Cap</span><span className="font-bold text-slate-800">5 Points</span></div>
                <div className="flex justify-between border-b border-slate-100 pb-1"><span>Year 2, 3, 4 Cap</span><span className="font-bold text-slate-800">10 Points</span></div>
                <p className="text-[9px] text-slate-400 italic pt-1 leading-relaxed">* Note: Projects can be edited or replaced, but only approved projects count toward the capped year score.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-805 border-b border-slate-100 pb-3 uppercase tracking-wider">Projects uploaded for Year {selectedProjectYear}</h3>
            {filteredProjects.length === 0 ? (
              <div className="text-center py-10">
                <File className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 italic">No projects uploaded for Year {selectedProjectYear} yet.</p>
                <button onClick={openUploadProjectModal} className="mt-3 text-xs text-primary font-bold hover:underline">Upload your first project</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProjects.map((project) => (
                  <div key={project._id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between gap-3 relative">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <h4 className="text-xs font-bold text-slate-800 break-words line-clamp-2 pr-20">{project.projectTitle}</h4>
                        <span className={`absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold ${getStatusClass(project.status)}`}>{getStatusIcon(project.status)} {getProjectStatusLabel(project.status)}</span>
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-600">
                        <p><span className="font-medium text-slate-400">Level:</span> <span className="font-semibold text-slate-700">{project.status === 'APPROVED' ? project.facultyApprovedLevel : project.studentSelectedLevel}</span></p>
                        <p><span className="font-medium text-slate-400">Duration:</span> {project.projectDuration}</p>
                        <p><span className="font-medium text-slate-400">Team Members:</span> {project.teamMembers}</p>
                        <p><span className="font-medium text-slate-400">Technologies:</span> {Array.isArray(project.technologiesUsed) ? project.technologiesUsed.join(', ') : project.technologiesUsed}</p>
                        <p><span className="font-medium text-slate-400">Score:</span> <span className="font-bold text-slate-700">{project.status === 'APPROVED' ? project.facultyApprovedScore : project.calculatedScore}</span></p>
                        {project.repositoryUrl && <p><span className="font-medium text-slate-400">Repository:</span> <a href={project.repositoryUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">Open link</a></p>}
                        {project.demoUrl && <p><span className="font-medium text-slate-400">Demo:</span> <a href={project.demoUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">Open link</a></p>}
                        {project.projectDescription && <p className="pt-1 text-[10px] text-slate-500 line-clamp-3"><span className="font-semibold text-slate-400">Description:</span> {project.projectDescription}</p>}
                      </div>
                      {project.supportingDocuments?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {project.supportingDocuments.map((doc: string, index: number) => (
                            <a key={`${doc}-${index}`} href={doc} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-bold">
                              <ExternalLink className="h-3 w-3" /> Document {index + 1}
                            </a>
                          ))}
                        </div>
                      )}
                      {project.status === 'REJECTED' && project.remarks && <div className="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-700"><span className="font-bold">Rejection Feedback:</span> "{project.remarks}"</div>}
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-1.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{project.status}</span>
                      <div className="flex gap-2">
                        <button onClick={() => openEditProjectModal(project)} className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-200/50 rounded-lg transition-all" title="Edit project details"><Edit3 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDeleteProject(project._id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete project"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'cambridge' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs text-slate-650 font-bold select-none">
              <Calendar className="h-4 w-4 text-primary mr-1" />
              <span>Active Academic Year: Year {currentAcademicYear}</span>
            </div>
            <button onClick={openUploadCambModal} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"><Plus className="h-4 w-4" /> Upload Cambridge Certificate</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(() => {
              const scoreObj = cambridgeScores.find(s => s.academicYear === selectedCambridgeYear) || { score: 0, totalPoints: 0 };
              const yearMax = selectedCambridgeYear === 1 || selectedCambridgeYear === 2 ? 10 : 5;
              return (
                <>
                  <div className="bg-gradient-to-r from-slate-900 to-[#1e1b4b] text-white p-5 rounded-xl border border-indigo-900/50 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Award className="h-24 w-24 text-white" /></div>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400">Year {selectedCambridgeYear} Capped Score</span>
                    <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-white">{scoreObj.score}</span><span className="text-xs text-indigo-300">/ {yearMax} max score</span></div>
                    <progress value={scoreObj.score} max={yearMax} className="w-full h-2 mt-4 rounded-full overflow-hidden bg-indigo-950/80 [&::-webkit-progress-bar]:bg-indigo-950/80 [&::-webkit-progress-value]:bg-indigo-400 [&::-moz-progress-bar]:bg-indigo-400" />
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450">Total Uncapped Points</span>
                      <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-slate-805">{scoreObj.totalPoints}</span><span className="text-xs text-slate-400">points accumulated</span></div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100"><AlertCircle className="h-3.5 w-3.5 text-primary shrink-0" /> Score is calculated only from approved certificates.</p>
                  </div>
                </>
              );
            })()}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-2.5">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450 block">Year Scoring Cap Information</span>
              <div className="text-[11px] text-slate-600 space-y-1.5">
                <div className="flex justify-between border-b border-slate-100 pb-1"><span>Year 1 & 2 Cap</span><span className="font-bold text-slate-800">5 Points</span></div>
                <div className="flex justify-between border-b border-slate-100 pb-1"><span>Year 3 & 4 Cap</span><span className="font-bold text-slate-800">10 Points</span></div>
                <p className="text-[9px] text-slate-400 italic pt-1 leading-relaxed">* Note: There is no limit on the number of certificates uploaded. All approved certificates remain visible on your profile.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-805 border-b border-slate-100 pb-3 uppercase tracking-wider">Cambridge Certifications for Year {selectedCambridgeYear}</h3>
            {cambridgeCerts.filter(c => c.academicYear === selectedCambridgeYear).length === 0 ? (
              <div className="text-center py-10"><File className="h-10 w-10 text-slate-300 mx-auto mb-2" /><p className="text-xs text-slate-400 italic">No Cambridge certifications uploaded for Year {selectedCambridgeYear} yet.</p><button onClick={openUploadCambModal} className="mt-3 text-xs text-primary font-bold hover:underline">Upload your first certificate</button></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cambridgeCerts.filter(c => c.academicYear === selectedCambridgeYear).map((cert) => (
                  <div key={cert._id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between gap-3 relative">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-1.5"><h4 className="text-xs font-bold text-slate-800 break-words line-clamp-2 pr-20">{cert.certificateName}</h4><span className={`absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold ${getStatusClass(cert.status)}`}>{getStatusIcon(cert.status)} {cert.status}</span></div>
                      <div className="space-y-1 text-[11px] text-slate-600">
                        <p><span className="font-medium text-slate-400">Provider:</span> {cert.provider}</p>
                        {cert.certificateNumber && <p><span className="font-medium text-slate-400">Cert Number:</span> {cert.certificateNumber}</p>}
                        <p><span className="font-medium text-slate-400 font-bold">Level:</span> <span className="font-semibold text-slate-700">{cert.status === 'APPROVED' ? cert.facultyApprovedLevel : cert.studentSelectedLevel}</span></p>
                        <p><span className="font-medium text-slate-400">Score:</span> <span className="font-bold text-slate-700">{cert.status === 'APPROVED' ? cert.facultyApprovedScore : cert.calculatedScore}</span></p>
                        <p><span className="font-medium text-slate-400">Issue Date:</span> {new Date(cert.issueDate).toLocaleDateString()}</p>
                      </div>
                      {cert.status === 'REJECTED' && cert.remarks && <div className="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-700"><span className="font-bold">Rejection Feedback:</span> "{cert.remarks}"</div>}
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-1.5">
                      <a href={cert.certificateFile} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-bold"><ExternalLink className="h-3 w-3" /> View Certificate</a>
                      <div className="flex gap-2">
                        <button onClick={() => openEditCambModal(cert)} className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-200/50 rounded-lg transition-all" title="Edit details"><Edit3 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDeleteCamb(cert._id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete record"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'cocurricular' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs text-slate-650 font-bold select-none">
              <Calendar className="h-4 w-4 text-primary mr-1" />
              <span>Active Academic Year: Year {currentAcademicYear}</span>
            </div>
            <button onClick={openUploadCoModal} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"><Plus className="h-4 w-4" /> Upload Co-Curricular Certificate</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(() => {
              const scoreObj = coScores.find(s => s.academicYear === selectedCoYear) || { score: 0, totalPoints: 0 };
              const yearMax = selectedCoYear === 4 ? 0 : 5;
              return (
                <>
                  <div className="bg-gradient-to-r from-slate-900 to-[#1e1b4b] text-white p-5 rounded-xl border border-indigo-900/50 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Award className="h-24 w-24 text-white" /></div>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400">Year {selectedCoYear} Capped Score</span>
                    <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-white">{scoreObj.score}</span><span className="text-xs text-indigo-300">/ {yearMax} max score</span></div>
                    <progress value={scoreObj.score} max={yearMax || 1} className="w-full h-2 mt-4 rounded-full overflow-hidden bg-indigo-950/80 [&::-webkit-progress-bar]:bg-indigo-950/80 [&::-webkit-progress-value]:bg-indigo-400 [&::-moz-progress-bar]:bg-indigo-400" />
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450">Total Uncapped Points</span>
                      <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-slate-805">{scoreObj.totalPoints}</span><span className="text-xs text-slate-400">points accumulated</span></div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100"><AlertCircle className="h-3.5 w-3.5 text-primary shrink-0" /> Calculated only from approved certificates.</p>
                  </div>
                </>
              );
            })()}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-2.5">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450 block">Year Scoring Cap Information</span>
              <div className="text-[11px] text-slate-650 space-y-1.5">
                <div className="flex justify-between border-b border-slate-100 pb-1"><span>Year 1, 2, 3 Cap</span><span className="font-bold text-slate-800">5 Points</span></div>
                <div className="flex justify-between border-b border-slate-100 pb-1"><span>Year 4 Cap</span><span className="font-bold text-slate-800">0 Points</span></div>
                <p className="text-[9px] text-slate-400 italic pt-1 leading-relaxed">* Note: All approved certificates are visible in your profile. Score caps apply only to your dynamic total point scores.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-850 border-b border-slate-100 pb-3 uppercase tracking-wider">Co-Curricular Activities for Year {selectedCoYear}</h3>
            {coCerts.filter(c => c.academicYear === selectedCoYear).length === 0 ? (
              <div className="text-center py-10"><File className="h-10 w-10 text-slate-300 mx-auto mb-2" /><p className="text-xs text-slate-400 italic">No co-curricular activity certificates uploaded for Year {selectedCoYear} yet.</p><button onClick={openUploadCoModal} className="mt-3 text-xs text-primary font-bold hover:underline">Upload your first certificate</button></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coCerts.filter(c => c.academicYear === selectedCoYear).map((cert) => (
                  <div key={cert._id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between gap-3 relative">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-1.5"><h4 className="text-xs font-bold text-slate-800 break-words line-clamp-2 pr-20">{cert.activityName}</h4><span className={`absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold ${getStatusClass(cert.status)}`}>{getStatusIcon(cert.status)} {cert.status}</span></div>
                      <div className="space-y-1 text-[11px] text-slate-600">
                        <p><span className="font-medium text-slate-400">Category:</span> {cert.category}</p>
                        <p><span className="font-medium text-slate-400">Organizer/Provider:</span> {cert.provider}</p>
                        {cert.certificateNumber && <p><span className="font-medium text-slate-400">Cert Number:</span> {cert.certificateNumber}</p>}
                        <p><span className="font-medium text-slate-400 font-bold">Activity Level:</span> <span className="font-semibold text-slate-700">{cert.status === 'APPROVED' ? cert.facultyApprovedLevel : cert.studentSelectedLevel}</span></p>
                        <p><span className="font-medium text-slate-400">Score:</span> <span className="font-bold text-slate-700">{cert.status === 'APPROVED' ? cert.facultyApprovedScore : cert.calculatedScore}</span></p>
                        <p><span className="font-medium text-slate-400">Issue Date:</span> {new Date(cert.issueDate).toLocaleDateString()}</p>
                      </div>
                      {cert.status === 'REJECTED' && cert.remarks && <div className="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-700"><span className="font-bold">Rejection Feedback:</span> "{cert.remarks}"</div>}
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-1.5">
                      <a href={cert.certificateFile} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-bold"><ExternalLink className="h-3 w-3" /> View Certificate</a>
                      <div className="flex gap-2">
                        <button onClick={() => openEditCoModal(cert)} className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-200/50 rounded-lg transition-all" title="Edit details"><Edit3 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDeleteCo(cert._id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete record"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'extracurricular' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs text-slate-650 font-bold select-none">
              <Calendar className="h-4 w-4 text-primary mr-1" />
              <span>Active Academic Year: Year {currentAcademicYear}</span>
            </div>
            <button onClick={openUploadExtraModal} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"><Plus className="h-4 w-4" /> Upload Extra-Curricular Certificate</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(() => {
              const scoreObj = extraScores.find(s => s.academicYear === selectedExtraYear) || { score: 0, totalPoints: 0 };
              const yearMax = selectedExtraYear === 1 ? 10 : 5;
              return (
                <>
                  <div className="bg-gradient-to-r from-slate-900 to-[#1e1b4b] text-white p-5 rounded-xl border border-indigo-900/50 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Award className="h-24 w-24 text-white" /></div>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400">Year {selectedExtraYear} Capped Score</span>
                    <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-white">{scoreObj.score}</span><span className="text-xs text-indigo-300">/ {yearMax} max score</span></div>
                    <progress value={scoreObj.score} max={yearMax} className="w-full h-2 mt-4 rounded-full overflow-hidden bg-indigo-950/80 [&::-webkit-progress-bar]:bg-indigo-950/80 [&::-webkit-progress-value]:bg-indigo-400 [&::-moz-progress-bar]:bg-indigo-400" />
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450">Total Uncapped Points</span>
                      <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-slate-805">{scoreObj.totalPoints}</span><span className="text-xs text-slate-400">points accumulated</span></div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100"><AlertCircle className="h-3.5 w-3.5 text-primary shrink-0" /> Calculated only from approved certificates.</p>
                  </div>
                </>
              );
            })()}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-2.5">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450 block">Year Scoring Cap Information</span>
              <div className="text-[11px] text-slate-650 space-y-1.5">
                <div className="flex justify-between border-b border-slate-100 pb-1"><span>Year 1 Cap</span><span className="font-bold text-slate-800">10 Points</span></div>
                <div className="flex justify-between border-b border-slate-100 pb-1"><span>Year 2, 3, 4 Cap</span><span className="font-bold text-slate-800">5 Points</span></div>
                <p className="text-[9px] text-slate-400 italic pt-1 leading-relaxed">* Note: All approved certificates are visible in your profile. Score caps apply only to your dynamic total point scores.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-850 border-b border-slate-100 pb-3 uppercase tracking-wider">Extra-Curricular Activities for Year {selectedExtraYear}</h3>
            {extraCerts.filter(c => c.academicYear === selectedExtraYear).length === 0 ? (
              <div className="text-center py-10"><File className="h-10 w-10 text-slate-300 mx-auto mb-2" /><p className="text-xs text-slate-400 italic">No extra-curricular activity certificates uploaded for Year {selectedExtraYear} yet.</p><button onClick={openUploadExtraModal} className="mt-3 text-xs text-primary font-bold hover:underline">Upload your first certificate</button></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {extraCerts.filter(c => c.academicYear === selectedExtraYear).map((cert) => (
                  <div key={cert._id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between gap-3 relative">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-1.5"><h4 className="text-xs font-bold text-slate-800 break-words line-clamp-2 pr-20">{cert.activityName}</h4><span className={`absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold ${getStatusClass(cert.status)}`}>{getStatusIcon(cert.status)} {cert.status}</span></div>
                      <div className="space-y-1 text-[11px] text-slate-600">
                        <p><span className="font-medium text-slate-400">Category:</span> {cert.category}</p>
                        <p><span className="font-medium text-slate-400">Organizer/Provider:</span> {cert.provider}</p>
                        {cert.certificateNumber && <p><span className="font-medium text-slate-400">Cert Number:</span> {cert.certificateNumber}</p>}
                        <p><span className="font-medium text-slate-400">Score:</span> <span className="font-bold text-slate-700">{cert.status === 'APPROVED' ? cert.facultyApprovedScore : cert.calculatedScore}</span></p>
                        <p><span className="font-medium text-slate-400">Issue Date:</span> {new Date(cert.issueDate).toLocaleDateString()}</p>
                      </div>
                      {cert.status === 'REJECTED' && cert.remarks && <div className="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-700"><span className="font-bold">Rejection Feedback:</span> "{cert.remarks}"</div>}
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-1.5">
                      <a href={cert.certificateFile} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-bold"><ExternalLink className="h-3 w-3" /> View Certificate</a>
                      <div className="flex gap-2">
                        <button onClick={() => openEditExtraModal(cert)} className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-200/50 rounded-lg transition-all" title="Edit details"><Edit3 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDeleteExtra(cert._id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete record"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sports' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs text-slate-650 font-bold select-none">
              <Calendar className="h-4 w-4 text-primary mr-1" />
              <span>Active Academic Year: Year {currentAcademicYear}</span>
            </div>
            <button onClick={openUploadSportsModal} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"><Plus className="h-4 w-4" /> Upload Sports Certificate</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(() => {
              const scoreObj = sportsScores.find(s => s.academicYear === selectedSportsYear) || { score: 0, totalPoints: 0 };
              const yearMax = (selectedSportsYear === 1 || selectedSportsYear === 2) ? 5 : 0;
              return (
                <>
                  <div className="bg-gradient-to-r from-slate-900 to-[#1e1b4b] text-white p-5 rounded-xl border border-indigo-900/50 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Trophy className="h-24 w-24 text-white" /></div>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400">Year {selectedSportsYear} Capped Score</span>
                    <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-white">{scoreObj.score}</span><span className="text-xs text-indigo-300">/ {yearMax} max score</span></div>
                    <progress value={scoreObj.score} max={yearMax || 1} className="w-full h-2 mt-4 rounded-full overflow-hidden bg-indigo-950/80 [&::-webkit-progress-bar]:bg-indigo-950/80 [&::-webkit-progress-value]:bg-indigo-400 [&::-moz-progress-bar]:bg-indigo-400" />
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450">Total Verified Certificates</span>
                      <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-slate-805">{scoreObj.totalPoints}</span><span className="text-xs text-slate-400">approved certificates</span></div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100"><AlertCircle className="h-3.5 w-3.5 text-primary shrink-0" /> Binary scoring: 5 points if at least one certificate is approved.</p>
                  </div>
                </>
              );
            })()}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-2.5">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450 block">Year Scoring Information</span>
              <div className="text-[11px] text-slate-655 space-y-1.5">
                <div className="flex justify-between border-b border-slate-100 pb-1"><span>Year 1 & 2 Weight</span><span className="font-bold text-slate-800">5 Points</span></div>
                <div className="flex justify-between border-b border-slate-100 pb-1"><span>Year 3 & 4 Weight</span><span className="font-bold text-slate-800">0 Points</span></div>
                <p className="text-[9px] text-slate-400 italic pt-1 leading-relaxed">* Note: All approved certificates are visible in your profile. Score caps apply only to your dynamic total point scores.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-850 border-b border-slate-100 pb-3 uppercase tracking-wider">Physical Fitness / Sports Certificates for Year {selectedSportsYear}</h3>
            {sportsCerts.filter(c => c.academicYear === selectedSportsYear).length === 0 ? (
              <div className="text-center py-10"><File className="h-10 w-10 text-slate-300 mx-auto mb-2" /><p className="text-xs text-slate-400 italic">No physical fitness / sports certificates uploaded for Year {selectedSportsYear} yet.</p><button onClick={openUploadSportsModal} className="mt-3 text-xs text-primary font-bold hover:underline">Upload your first certificate</button></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sportsCerts.filter(c => c.academicYear === selectedSportsYear).map((cert) => (
                  <div key={cert._id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between gap-3 relative">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-1.5"><h4 className="text-xs font-bold text-slate-800 break-words line-clamp-2 pr-20">{cert.activityName}</h4><span className={`absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold ${getStatusClass(cert.status)}`}>{getStatusIcon(cert.status)} {cert.status}</span></div>
                      <div className="space-y-1 text-[11px] text-slate-600">
                        <p><span className="font-medium text-slate-400">Event:</span> {cert.eventName}</p>
                        <p><span className="font-medium text-slate-400">Organizer:</span> {cert.organizer}</p>
                        {cert.certificateNumber && <p><span className="font-medium text-slate-400">Cert Number:</span> {cert.certificateNumber}</p>}
                        <p><span className="font-medium text-slate-400">Event Date:</span> {new Date(cert.eventDate).toLocaleDateString()}</p>
                        {cert.description && <p><span className="font-medium text-slate-400">Description:</span> {cert.description}</p>}
                      </div>
                      {cert.status === 'REJECTED' && cert.remarks && <div className="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-700"><span className="font-bold">Rejection Feedback:</span> "{cert.remarks}"</div>}
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-1.5">
                      <a href={cert.certificateFile} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-bold"><ExternalLink className="h-3 w-3" /> View Certificate</a>
                      <div className="flex gap-2">
                        <button onClick={() => openEditSportsModal(cert)} className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-200/50 rounded-lg transition-all" title="Edit details"><Edit3 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDeleteSports(cert._id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete record"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'coding' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs text-slate-650 font-bold select-none">
              <Calendar className="h-4 w-4 text-primary mr-1" />
              <span>Active Academic Year: Year {currentAcademicYear}</span>
            </div>
            <button onClick={openUploadChallengeModal} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"><Plus className="h-4 w-4" /> Add Coding Challenge / Hackathon</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(() => {
              const scoreObj = activeChallengeScoreObj;
              const yearMax = challengeYearCap;
              return (
                <>
                  <div className="bg-gradient-to-r from-slate-900 to-[#0f172a] text-white p-5 rounded-xl border border-slate-850 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Trophy className="h-24 w-24 text-white" /></div>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400">Year {selectedChallengeYear} Capped Score</span>
                    <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-white">{scoreObj.score}</span><span className="text-xs text-indigo-300">/ {yearMax} max score</span></div>
                    <progress value={scoreObj.score} max={yearMax} className="w-full h-2 mt-4 rounded-full overflow-hidden bg-slate-950/80 [&::-webkit-progress-bar]:bg-slate-950/80 [&::-webkit-progress-value]:bg-indigo-400 [&::-moz-progress-bar]:bg-indigo-400" />
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450">Total Uncapped Points</span>
                      <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-slate-805">{scoreObj.totalPoints}</span><span className="text-xs text-slate-400">points accumulated</span></div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100"><AlertCircle className="h-3.5 w-3.5 text-primary shrink-0" /> Score is calculated only from approved entries.</p>
                  </div>
                </>
              );
            })()}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-2.5">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450 block">Year Scoring Cap Information</span>
              <div className="text-[11px] text-slate-650 space-y-1.5">
                <div className="flex justify-between border-b border-slate-100 pb-1"><span>Year 1 & 2 Cap</span><span className="font-bold text-slate-800">10 Points</span></div>
                <div className="flex justify-between border-b border-slate-100 pb-1"><span>Year 3 & 4 Cap</span><span className="font-bold text-slate-800">5 Points</span></div>
                <p className="text-[9px] text-slate-400 italic pt-1 leading-relaxed">* Note: All approved entries are visible in your profile. Score caps apply only to your dynamic total point scores.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-850 border-b border-slate-100 pb-3 uppercase tracking-wider flex items-center gap-2"><Code className="h-4.5 w-4.5 text-primary" /> Coding Challenge & Hackathon Submissions for Year {selectedChallengeYear}</h3>
            {filteredChallenges.length === 0 ? (
              <div className="text-center py-10"><Trophy className="h-10 w-10 text-slate-300 mx-auto mb-2" /><p className="text-xs text-slate-400 italic">No coding challenge achievements uploaded for Year {selectedChallengeYear} yet.</p><button onClick={openUploadChallengeModal} className="mt-3 text-xs text-primary font-bold hover:underline">Upload your first achievement</button></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredChallenges.map((chal) => (
                  <div key={chal._id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between gap-3 relative">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-1.5"><h4 className="text-xs font-bold text-slate-800 break-words line-clamp-2 pr-20">{chal.eventName}</h4><span className={`absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold ${getStatusClass(chal.status)}`}>{getStatusIcon(chal.status)} {chal.status}</span></div>
                      <div className="space-y-1 text-[11px] text-slate-655">
                        <p><span className="font-medium text-slate-400">Event Type:</span> {chal.eventType}</p>
                        <p><span className="font-medium text-slate-400">Organizer:</span> {chal.organizer}</p>
                        <p><span className="font-medium text-slate-400">Platform:</span> {chal.platform}</p>
                        <p><span className="font-medium text-slate-400">Category:</span> {chal.status === 'APPROVED' ? chal.facultyApprovedCategory : chal.studentSelectedCategory}</p>
                        {chal.rank && <p><span className="font-medium text-slate-400 font-bold">Rank / Position:</span> <span className="font-semibold text-slate-700">{chal.rank}</span></p>}
                        {chal.teamName && <p><span className="font-medium text-slate-400">Team:</span> {chal.teamName} {chal.teamMembers ? `(${chal.teamMembers})` : ''}</p>}
                        <p><span className="font-medium text-slate-400">Score:</span> <span className="font-bold text-slate-700">{chal.status === 'APPROVED' ? chal.facultyApprovedScore : chal.studentCalculatedScore}</span></p>
                        <p><span className="font-medium text-slate-400">Date:</span> {new Date(chal.eventDate).toLocaleDateString()}</p>
                        {chal.description && <p className="text-[10px] text-slate-500 italic line-clamp-2 mt-1">{chal.description}</p>}
                      </div>
                      {chal.status === 'REJECTED' && chal.remarks && <div className="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-700"><span className="font-bold">Rejection Feedback:</span> "{chal.remarks}"</div>}
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-1.5">
                      <a href={chal.certificateFile} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-bold"><ExternalLink className="h-3 w-3" /> View Certificate</a>
                      <div className="flex gap-2">
                        <button onClick={() => openEditChallengeModal(chal)} className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-200/50 rounded-lg transition-all" title="Edit details"><Edit3 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDeleteChallenge(chal._id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete record"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'leadership' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs text-slate-650 font-bold select-none">
              <Calendar className="h-4 w-4 text-primary mr-1" />
              <span>Active Academic Year: Year {currentAcademicYear}</span>
            </div>
            <button onClick={openUploadLeadershipModal} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"><Plus className="h-4 w-4" /> Add Leadership Activity</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(() => {
              const scoreObj = activeLeadershipScoreObj;
              const yearMax = leadershipYearCap;
              return (
                <>
                  <div className="bg-gradient-to-r from-slate-900 to-[#1e1b4b] text-white p-5 rounded-xl border border-slate-850 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Trophy className="h-24 w-24 text-white" /></div>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400">Year {selectedLeadershipYear} Capped Score</span>
                    <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-white">{scoreObj.score}</span><span className="text-xs text-indigo-300">/ {yearMax} max score</span></div>
                    <progress value={scoreObj.score} max={yearMax} className="w-full h-2 mt-4 rounded-full overflow-hidden bg-slate-950/80 [&::-webkit-progress-bar]:bg-slate-950/80 [&::-webkit-progress-value]:bg-indigo-400 [&::-moz-progress-bar]:bg-indigo-400" />
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-455">Total Uncapped Points</span>
                      <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-slate-805">{scoreObj.totalPoints}</span><span className="text-xs text-slate-400">points accumulated</span></div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100"><AlertCircle className="h-3.5 w-3.5 text-primary shrink-0" /> Score is calculated only from approved entries.</p>
                  </div>
                </>
              );
            })()}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-2.5">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450 block">Year Scoring Cap Information</span>
              <div className="text-[11px] text-slate-655 space-y-1.5">
                <div className="flex justify-between border-b border-slate-100 pb-1"><span>Year 1, 2, & 3 Cap</span><span className="font-bold text-slate-805">5 Points</span></div>
                <div className="flex justify-between border-b border-slate-100 pb-1"><span>Year 4 Cap</span><span className="font-bold text-slate-805">0 Points</span></div>
                <p className="text-[9px] text-slate-400 italic pt-1 leading-relaxed">* Note: Approved activities in Fourth Year contribute 0 marks, but will still be stored, approved, and displayed.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-855 border-b border-slate-100 pb-3 uppercase tracking-wider flex items-center gap-2"><Users className="h-4.5 w-4.5 text-primary" /> Leadership Activities for Year {selectedLeadershipYear}</h3>
            {filteredLeadership.length === 0 ? (
              <div className="text-center py-10"><Users className="h-10 w-10 text-slate-300 mx-auto mb-2" /><p className="text-xs text-slate-400 italic">No leadership records uploaded for Year {selectedLeadershipYear} yet.</p><button onClick={openUploadLeadershipModal} className="mt-3 text-xs text-primary font-bold hover:underline">Upload your first record</button></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredLeadership.map((act) => (
                  <div key={act._id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between gap-3 relative">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-1.5"><h4 className="text-xs font-bold text-slate-800 pr-20 break-words line-clamp-2">{act.organizationName}</h4><span className={`absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold ${getStatusClass(act.status)}`}>{getStatusIcon(act.status)} {act.status}</span></div>
                      <div className="space-y-1 text-[11px] text-slate-655">
                        <p><span className="font-medium text-slate-400">Leadership Role:</span> <span className="font-bold text-slate-750">{act.status === 'APPROVED' ? act.facultyApprovedRole : act.studentSelectedRole}</span></p>
                        {act.leadershipPosition && <p><span className="font-medium text-slate-400">Position Details:</span> {act.leadershipPosition}</p>}
                        <p><span className="font-medium text-slate-400">Duration:</span> {act.duration}</p>
                        {act.appointmentDate && <p><span className="font-medium text-slate-400">Appointment Date:</span> {new Date(act.appointmentDate).toLocaleDateString()}</p>}
                        <p><span className="font-medium text-slate-400">Score:</span> <span className="font-bold text-slate-705">{act.status === 'APPROVED' ? act.facultyApprovedScore : act.studentCalculatedScore}</span></p>
                        {act.description && <p className="text-[10px] text-slate-500 italic mt-1.5 whitespace-pre-wrap">{act.description}</p>}
                      </div>
                      {act.status === 'REJECTED' && act.remarks && <div className="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-700"><span className="font-bold">Rejection Feedback:</span> "{act.remarks}"</div>}
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-1.5">
                      <a href={act.appointmentLetter} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-bold"><ExternalLink className="h-3 w-3" /> View Document</a>
                      <div className="flex gap-2">
                        <button onClick={() => openEditLeadershipModal(act)} className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-200/50 rounded-lg transition-all" title="Edit details"><Edit3 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDeleteLeadership(act._id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete record"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showChallengeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden my-8 animate-scaleUp">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">{isEditingChallenge ? 'Edit Coding Achievement' : 'Upload Coding Achievement'}</h3>
              <button onClick={closeChallengeModal} aria-label="Close coding modal" title="Close coding modal" className="p-1 text-slate-400 hover:text-slate-700 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleChallengeSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {challengeError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-600">{challengeError}</div>}
              {challengeMsg && <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl text-xs font-semibold text-emerald-700">{challengeMsg}</div>}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Event Name *</label>
                <input type="text" value={challengeEventName} onChange={(e) => setChallengeEventName(e.target.value)} placeholder="e.g. Smart India Hackathon 2026, LeetCode Weekly..." title="Event name" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Event Type *</label>
                  <select aria-label="Event Type" value={challengeEventType} onChange={(e) => setChallengeEventType(e.target.value)} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary">
                    <option value="Hackathon">Hackathon</option>
                    <option value="Coding Challenge">Coding Challenge</option>
                    <option value="Competitive Programming">Competitive Programming</option>
                    <option value="Programming Contest">Programming Contest</option>
                    <option value="Algorithm Competition">Algorithm Competition</option>
                    <option value="Innovation Challenge">Innovation Challenge</option>
                    <option value="Technical Coding Event">Technical Coding Event</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Achievement Category *</label>
                  <select aria-label="Achievement Category" value={challengeCategory} onChange={(e) => setChallengeCategory(e.target.value)} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary">
                    <option value="Hackathon Participation">Hackathon Participation (2 pts)</option>
                    <option value="Hackathon Merit">Hackathon Merit (4 pts)</option>
                    <option value="Coding Challenge Participation">Coding Challenge Participation (2 pts)</option>
                    <option value="Coding Challenge Merit">Coding Challenge Merit (3 pts)</option>
                  </select>
                </div>
              </div>

              {challengeEventType === 'Other' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Custom Event Type Name *</label>
                  <input type="text" placeholder="Specify custom event type" title="Custom Event Type" onChange={(e) => setChallengeEventType(e.target.value)} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Organizer *</label>
                  <input type="text" value={challengeOrganizer} onChange={(e) => setChallengeOrganizer(e.target.value)} placeholder="e.g. AICTE, CodeChef, Google" title="Organizer" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Platform *</label>
                  <select aria-label="Platform" value={challengePlatform} onChange={(e) => setChallengePlatform(e.target.value)} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary">
                    <option value="LeetCode">LeetCode</option>
                    <option value="CodeChef">CodeChef</option>
                    <option value="Codeforces">Codeforces</option>
                    <option value="GeeksForGeeks">GeeksForGeeks</option>
                    <option value="HackerRank">HackerRank</option>
                    <option value="HackerEarth">HackerEarth</option>
                    <option value="Google">Google</option>
                    <option value="Microsoft">Microsoft</option>
                    <option value="Amazon">Amazon</option>
                    <option value="TCS CodeVita">TCS CodeVita</option>
                    <option value="Infosys">Infosys</option>
                    <option value="IBM">IBM</option>
                    <option value="Smart India Hackathon">Smart India Hackathon</option>
                    <option value="University Coding Events">University Coding Events</option>
                    <option value="Department Coding Contests">Department Coding Contests</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {challengePlatform === 'Other' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Custom Platform Name *</label>
                  <input type="text" placeholder="Specify custom platform" title="Custom Platform" onChange={(e) => setChallengePlatform(e.target.value)} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Event Date *</label>
                  <input type="date" value={challengeEventDate} onChange={(e) => setChallengeEventDate(e.target.value)} title="Event date" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Academic Year</label>
                  <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-semibold select-none">Year {isEditingChallenge ? challengeAcademicYear : currentAcademicYear}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Rank / Position</label>
                  <input type="text" value={challengeRank} onChange={(e) => setChallengeRank(e.target.value)} placeholder="e.g. 1st, Winner" title="Rank" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary" />
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Team Name</label>
                  <input type="text" value={challengeTeamName} onChange={(e) => setChallengeTeamName(e.target.value)} placeholder="e.g. ByteBusters" title="Team Name" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary" />
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Team Members</label>
                  <input type="text" value={challengeTeamMembers} onChange={(e) => setChallengeTeamMembers(e.target.value)} placeholder="Names (comma-sep)" title="Team Members" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Certificate Number</label>
                <input type="text" value={challengeCertNumber} onChange={(e) => setChallengeCertNumber(e.target.value)} placeholder="Certificate ID (if any)" title="Certificate number" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Description</label>
                <textarea value={challengeDescription} onChange={(e) => setChallengeDescription(e.target.value)} placeholder="Short description of your contribution..." title="Description" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-850 focus:outline-none focus:border-primary resize-none" rows={2} />
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Certificate File (PDF or Image) {isEditingChallenge ? '(Optional)' : '*'}</label>
                <input type="file" accept=".pdf,image/*" onChange={(e) => setChallengeFile(e.target.files ? e.target.files[0] : null)} title="Certificate proof file" aria-label="Certificate proof file" required={!isEditingChallenge} className="w-full text-xs text-slate-500 bg-slate-50 p-2 border border-slate-200 rounded-xl" />
              </div>

              <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-150 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-indigo-700 uppercase block tracking-wider">Auto Score Calculation</span>
                  <span className="text-[9px] text-slate-500 italic mt-0.5">Based on category score rules</span>
                </div>
                <span className="px-3.5 py-1.5 bg-white text-indigo-700 font-extrabold text-sm border border-indigo-200 rounded-lg shadow-sm">+{currentChallengePreviewScore} Points</span>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                <button type="button" onClick={closeChallengeModal} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all">Cancel</button>
                <button type="submit" disabled={challengeSubmitting} className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5">{challengeSubmitting ? 'Uploading...' : isEditingChallenge ? 'Save Changes' : 'Upload Achievement'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLeadershipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden my-8 animate-scaleUp">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">{isEditingLeadership ? 'Edit Leadership Record' : 'Upload Leadership Record'}</h3>
              <button onClick={closeLeadershipModal} aria-label="Close leadership modal" title="Close leadership modal" className="p-1 text-slate-400 hover:text-slate-700 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleLeadershipSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {leadError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-600">{leadError}</div>}
              {leadMsg && <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl text-xs font-semibold text-emerald-700">{leadMsg}</div>}
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Organization / Club Name *</label>
                <input type="text" value={leadOrganizationName} onChange={(e) => setLeadOrganizationName(e.target.value)} placeholder="e.g. Student Council, ACM Club, CSE Department" title="Organization" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Leadership Role *</label>
                  <select aria-label="Leadership Role" value={leadRole} onChange={(e) => setLeadRole(e.target.value as any)} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary">
                    <option value="CR / LR / ARC / SAC – Members">CR / LR / ARC / SAC – Members</option>
                    <option value="Coordinators">Coordinators</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Academic Year</label>
                  <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-semibold select-none">Year {isEditingLeadership ? leadAcademicYear : currentAcademicYear}</div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Leadership Position Details (Optional)</label>
                <input type="text" value={leadPosition} onChange={(e) => setLeadPosition(e.target.value)} placeholder="e.g. Class Representative, Club Joint Secretary, ARC President" title="Leadership Position" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Duration *</label>
                  <input type="text" value={leadDuration} onChange={(e) => setLeadDuration(e.target.value)} placeholder="e.g. Jun 2025 - May 2026, 1 Year" title="Duration" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Appointment Date (Optional)</label>
                  <input type="date" value={leadAppointmentDate} onChange={(e) => setLeadAppointmentDate(e.target.value)} title="Appointment date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Description (Optional)</label>
                <textarea value={leadDescription} onChange={(e) => setLeadDescription(e.target.value)} placeholder="Describe key roles or achievements in this position..." title="Description" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-850 focus:outline-none focus:border-primary resize-none" rows={2} />
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Appointment Letter / Supporting Certificate {isEditingLeadership ? '(Optional)' : '*'}</label>
                <input type="file" accept=".pdf,image/*" onChange={(e) => setLeadFile(e.target.files ? e.target.files[0] : null)} title="Appointment letter" aria-label="Appointment letter" required={!isEditingLeadership} className="w-full text-xs text-slate-500 bg-slate-50 p-2 border border-slate-200 rounded-xl" />
              </div>

              <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-150 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-indigo-700 uppercase block tracking-wider">Auto Calculated Score (Read-Only)</span>
                  <span className="text-[9px] text-slate-500 italic mt-0.5">Based on role score rules</span>
                </div>
                <span className="px-3.5 py-1.5 bg-white text-indigo-700 font-extrabold text-sm border border-indigo-200 rounded-lg shadow-sm">
                  {leadAcademicYear === 4 ? '+0 Points (Year 4 Cap)' : `+${currentLeadershipPreviewScore} Points`}
                </span>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                <button type="button" onClick={closeLeadershipModal} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all">Cancel</button>
                <button type="submit" disabled={leadSubmitting} className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5">{leadSubmitting ? 'Uploading...' : isEditingLeadership ? 'Save Changes' : 'Upload Achievement'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden my-8 animate-scaleUp">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center"><h3 className="text-sm font-bold text-slate-800">{isEditingCert ? 'Edit Certification Details' : 'Upload New Certification'}</h3><button onClick={closeCertModal} aria-label="Close certification modal" title="Close certification modal" className="p-1 text-slate-400 hover:text-slate-700 transition-colors"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleCertSubmit} className="p-6 space-y-4">
              {certError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-600">{certError}</div>}
              {certMsg && <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl text-xs font-semibold text-emerald-700">{certMsg}</div>}
              <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Certificate Name *</label><input type="text" value={certName} onChange={(e) => setCertName(e.target.value)} placeholder="Certificate name" title="Certificate name" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" /></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Academic Year</label><div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-semibold select-none">Year {isEditingCert ? certAcademicYear : currentAcademicYear}</div></div><div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Category *</label><select aria-label="Certificate category" value={certCategory} onChange={(e) => setCertCategory(e.target.value)} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary"><option value="Normal Certificate">Normal Certificate (2 pts)</option><option value="NPTEL Elite">NPTEL Elite (3 pts)</option><option value="NPTEL Silver">NPTEL Silver (5 pts)</option><option value="NPTEL Gold">NPTEL Gold (5 pts)</option><option value="NPTEL Topper">NPTEL Topper (5 pts)</option><option value="Global Certification">Global Certification (10 pts)</option></select></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Provider *</label><input type="text" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Issuer or provider" title="Certificate provider" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" /></div><div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Completion Date</label><input type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} title="Completion date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" /></div></div>
              <div className="space-y-1.5 pt-2"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Certificate File (PDF or Image) {isEditingCert ? '(Optional)' : '*'}</label><input type="file" accept=".pdf,image/*" onChange={(e) => setCertFile(e.target.files ? e.target.files[0] : null)} title="Certificate proof file" aria-label="Certificate proof file" required={!isEditingCert} className="w-full text-xs text-slate-500 bg-slate-50 p-2 border border-slate-200 rounded-xl" /></div>
              <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-150 rounded-xl"><div><span className="text-[10px] font-bold text-indigo-700 uppercase block tracking-wider">Auto Score Calculation</span><span className="text-[9px] text-slate-500 italic mt-0.5">Based on category score rules</span></div><span className="px-3.5 py-1.5 bg-white text-indigo-700 font-extrabold text-sm border border-indigo-200 rounded-lg shadow-sm">+{currentPreviewScore} Points</span></div>
              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100"><button type="button" onClick={closeCertModal} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all">Cancel</button><button type="submit" disabled={certSubmitting} className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5">{certSubmitting ? 'Uploading...' : isEditingCert ? 'Save Changes' : 'Upload certificate'}</button></div>
            </form>
          </div>
        </div>
      )}

      {showCambModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden my-8 animate-scaleUp">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center"><h3 className="text-sm font-bold text-slate-800">{isEditingCamb ? 'Edit Cambridge Certificate' : 'Upload Cambridge Certificate'}</h3><button onClick={closeCambModal} aria-label="Close Cambridge modal" title="Close Cambridge modal" className="p-1 text-slate-400 hover:text-slate-700 transition-colors"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleCambSubmit} className="p-6 space-y-4">
              {cambError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-600">{cambError}</div>}
              {cambMsg && <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl text-xs font-semibold text-emerald-700">{cambMsg}</div>}
              <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Certificate Name *</label><input type="text" value={cambName} onChange={(e) => setCambName(e.target.value)} placeholder="Certificate name" title="Cambridge certificate name" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-850 focus:outline-none focus:border-primary focus:ring-1" /></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Academic Year</label><div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-semibold select-none">Year {isEditingCamb ? cambAcademicYear : currentAcademicYear}</div></div><div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Cambridge Level *</label><select aria-label="Cambridge level" value={cambLevel} onChange={(e) => setCambLevel(e.target.value)} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary"><option value="A2 Key">A2 Key (2 pts)</option><option value="B1 Preliminary">B1 Preliminary (4 pts)</option><option value="B2 First">B2 First (6 pts)</option><option value="C1 Advanced">C1 Advanced (8 pts)</option><option value="C2 Proficiency">C2 Proficiency (10 pts)</option></select></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Provider *</label><input type="text" value={cambProvider} onChange={(e) => setCambProvider(e.target.value)} placeholder="Cambridge English" title="Cambridge provider" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-855 focus:outline-none focus:border-primary focus:ring-1" /></div><div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Certificate Number</label><input type="text" value={cambCertNumber} onChange={(e) => setCambCertNumber(e.target.value)} placeholder="Certificate number" title="Cambridge certificate number" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" /></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Issue Date *</label><input type="date" value={cambIssueDate} onChange={(e) => setCambIssueDate(e.target.value)} title="Cambridge issue date" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" /></div><div className="space-y-1"></div></div>
              <div className="space-y-1.5 pt-2"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Certificate File (PDF or Image) {isEditingCamb ? '(Optional)' : '*'}</label><input type="file" accept=".pdf,image/*" onChange={(e) => setCambFile(e.target.files ? e.target.files[0] : null)} title="Cambridge certificate file" aria-label="Cambridge certificate file" required={!isEditingCamb} className="w-full text-xs text-slate-500 bg-slate-50 p-2 border border-slate-200 rounded-xl" /></div>
              <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-150 rounded-xl"><div><span className="text-[10px] font-bold text-indigo-700 uppercase block tracking-wider">Dynamic Score Value</span><span className="text-[9px] text-slate-500 italic mt-0.5">Calculated instantly from score guidelines</span></div><span className="px-3.5 py-1.5 bg-white text-indigo-700 font-extrabold text-sm border border-indigo-200 rounded-lg shadow-sm">+{getPreviewScore(cambLevel)} Points</span></div>
              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100"><button type="button" onClick={closeCambModal} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all">Cancel</button><button type="submit" disabled={cambSubmitting} className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5">{cambSubmitting ? 'Uploading...' : isEditingCamb ? 'Save Changes' : 'Upload certificate'}</button></div>
            </form>
          </div>
        </div>
      )}

      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden my-8 animate-scaleUp">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">{isEditingProject ? 'Edit Project Details' : 'Upload New Project'}</h3>
              <button onClick={closeProjectModal} aria-label="Close project modal" title="Close project modal" className="p-1 text-slate-400 hover:text-slate-700 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleProjectSubmit} className="p-6 space-y-4">
              {projectError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-600">{projectError}</div>}
              {projectMsg && <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl text-xs font-semibold text-emerald-700">{projectMsg}</div>}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Project Title *</label>
                <input type="text" value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="Project title" title="Project title" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Project Description *</label>
                <textarea value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} placeholder="Brief project summary" title="Project description" required rows={4} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Academic Year</label>
                  <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-semibold select-none">Year {isEditingProject ? projectAcademicYear : currentAcademicYear}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Project Level *</label>
                  <select aria-label="Project level" value={projectLevel} onChange={(e) => setProjectLevel(e.target.value)} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary">
                    <option value="Department">Department (2 pts)</option>
                    <option value="Institute">Institute (4 pts)</option>
                    <option value="Inter-University">Inter-University (6 pts)</option>
                    <option value="National / International">National / International (10 pts)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Project Duration *</label>
                  <input type="text" value={projectDuration} onChange={(e) => setProjectDuration(e.target.value)} placeholder="Example: 3 months" title="Project duration" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Team Members *</label>
                  <input type="text" value={projectTeamMembers} onChange={(e) => setProjectTeamMembers(e.target.value)} placeholder="Comma-separated names" title="Project team members" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Technologies Used</label>
                <input type="text" value={projectTechnologies} onChange={(e) => setProjectTechnologies(e.target.value)} placeholder="React, Node.js, MongoDB" title="Technologies used" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Repository URL</label>
                  <input type="url" value={projectRepositoryUrl} onChange={(e) => setProjectRepositoryUrl(e.target.value)} placeholder="https://github.com/..." title="Repository URL" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Demo URL</label>
                  <input type="url" value={projectDemoUrl} onChange={(e) => setProjectDemoUrl(e.target.value)} placeholder="https://demo.example.com" title="Demo URL" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" />
                </div>
              </div>
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Supporting Documents (PDF/Image) {isEditingProject ? '(Optional)' : '*'}</label>
                <input type="file" multiple accept=".pdf,image/*" onChange={(e) => setProjectFiles(e.target.files ? Array.from(e.target.files) : [])} title="Supporting documents" aria-label="Supporting documents" required={!isEditingProject} className="w-full text-xs text-slate-500 bg-slate-50 p-2 border border-slate-200 rounded-xl" />
                {projectFiles.length > 0 && <p className="text-[10px] text-slate-500">{projectFiles.length} file(s) selected</p>}
              </div>
              <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-150 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-indigo-700 uppercase block tracking-wider">Auto Score Calculation</span>
                  <span className="text-[9px] text-slate-500 italic mt-0.5">Based on project level rules</span>
                </div>
                <span className="px-3.5 py-1.5 bg-white text-indigo-700 font-extrabold text-sm border border-indigo-200 rounded-lg shadow-sm">+{currentProjectPreviewScore} Points</span>
              </div>
              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                <button type="button" onClick={closeProjectModal} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all">Cancel</button>
                <button type="submit" disabled={projectSubmitting} className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5">{projectSubmitting ? 'Uploading...' : isEditingProject ? 'Save Changes' : 'Upload project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden my-8 animate-scaleUp">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center"><h3 className="text-sm font-bold text-slate-805">{isEditingCo ? 'Edit Co-Curricular Details' : 'Upload Co-Curricular Activity'}</h3><button onClick={closeCoModal} aria-label="Close co-curricular modal" title="Close co-curricular modal" className="p-1 text-slate-400 hover:text-slate-700 transition-colors"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleCoSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {coError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-600">{coError}</div>}
              {coMsg && <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl text-xs font-semibold text-emerald-700">{coMsg}</div>}
              <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Activity Name / Seminar Title *</label><input type="text" value={coName} onChange={(e) => setCoName(e.target.value)} placeholder="e.g. Technical Paper Presentation on AI" title="Activity name" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-850 focus:outline-none focus:border-primary focus:ring-1" /></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Co-Curricular Category *</label><select aria-label="Activity category" value={coCategory} onChange={(e) => setCoCategory(e.target.value as any)} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary"><option value="Paper Presentation">Paper Presentation</option><option value="Technical Quiz">Technical Quiz</option><option value="Technical Symposium">Technical Symposium</option><option value="Technical Workshops">Technical Workshops</option><option value="Technical Seminars">Technical Seminars</option><option value="Technical Competitions">Technical Competitions</option><option value="Technical Events">Technical Events</option><option value="Innovation Events">Innovation Events</option><option value="Technical Conferences">Technical Conferences</option><option value="Academic Co-Curricular Activities">Academic Co-Curricular Activities</option></select></div><div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Activity Level *</label><select aria-label="Activity level" value={coLevel} onChange={(e) => setCoLevel(e.target.value)} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary"><option value="Department Level">Department Level (1 pt)</option><option value="Institute Level">Institute Level (2 pts)</option><option value="Inter-University Level">Inter-University Level (3 pts)</option><option value="Zonal Level">Zonal Level (4 pts)</option><option value="National / International Level">National / International Level (5 pts)</option></select></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Academic Year</label><div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-semibold select-none">Year {isEditingCo ? coAcademicYear : currentAcademicYear}</div></div><div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Organizer / Provider *</label><input type="text" value={coProvider} onChange={(e) => setCoProvider(e.target.value)} placeholder="e.g. IEEE, Institution Dept" title="Activity provider" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-850 focus:outline-none focus:border-primary focus:ring-1" /></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Certificate Number</label><input type="text" value={coCertNumber} onChange={(e) => setCoCertNumber(e.target.value)} placeholder="Certificate number" title="Activity certificate number" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-850 focus:outline-none focus:border-primary focus:ring-1" /></div><div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Issue Date *</label><input type="date" value={coIssueDate} onChange={(e) => setCoIssueDate(e.target.value)} title="Activity issue date" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" /></div></div>
              <div className="space-y-1.5 pt-2"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Certificate File (PDF or Image) {isEditingCo ? '(Optional)' : '*'}</label><input type="file" accept=".pdf,image/*" onChange={(e) => setCoFile(e.target.files ? e.target.files[0] : null)} title="Activity proof file" aria-label="Activity proof file" required={!isEditingCo} className="w-full text-xs text-slate-500 bg-slate-50 p-2 border border-slate-200 rounded-xl" /></div>
              <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-150 rounded-xl"><div><span className="text-[10px] font-bold text-indigo-700 uppercase block tracking-wider">Dynamic Score Value</span><span className="text-[9px] text-slate-500 italic mt-0.5">Calculated instantly from score guidelines</span></div><span className="px-3.5 py-1.5 bg-white text-indigo-700 font-extrabold text-sm border border-indigo-200 rounded-lg shadow-sm">+{getCoCurricularPreviewScore(coLevel)} Points</span></div>
              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100"><button type="button" onClick={closeCoModal} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all">Cancel</button><button type="submit" disabled={coSubmitting} className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5">{coSubmitting ? 'Uploading...' : isEditingCo ? 'Save Changes' : 'Upload certificate'}</button></div>
            </form>
          </div>
        </div>
      )}

      {showExtraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden my-8 animate-scaleUp">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center"><h3 className="text-sm font-bold text-slate-855">{isEditingExtra ? 'Edit Extra-Curricular Details' : 'Upload Extra-Curricular Certificate'}</h3><button onClick={closeExtraModal} aria-label="Close extra-curricular modal" title="Close extra-curricular modal" className="p-1 text-slate-400 hover:text-slate-700 transition-colors"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleExtraSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {extraError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-600">{extraError}</div>}
              {extraMsg && <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl text-xs font-semibold text-emerald-700">{extraMsg}</div>}
              <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Activity Name / Event Title *</label><input type="text" value={extraName} onChange={(e) => setExtraName(e.target.value)} placeholder="e.g. Inter-College Dance Competition, NSS Camp" title="Activity name" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-850 focus:outline-none focus:border-primary focus:ring-1" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Extra-Curricular Category *</label>
                  <select aria-label="Activity category" value={extraCategory} onChange={(e) => setExtraCategory(e.target.value as any)} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary">
                    <option value="NSS">NSS</option>
                    <option value="NCC">NCC</option>
                    <option value="Cultural Activities">Cultural Activities</option>
                    <option value="Dance">Dance</option>
                    <option value="Music">Music</option>
                    <option value="Fine Arts">Fine Arts</option>
                    <option value="Drama">Drama</option>
                    <option value="Social Service">Social Service</option>
                    <option value="Community Service">Community Service</option>
                    <option value="Volunteering">Volunteering</option>
                    <option value="Clubs">Clubs</option>
                    <option value="Literary Activities">Literary Activities</option>
                    <option value="Student Welfare Activities">Student Welfare Activities</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Activity Level *</label>
                  <select aria-label="Activity level" value={extraLevel} onChange={(e) => setExtraLevel(e.target.value)} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary">
                    <option value="Department Level">Department Level (1 pt)</option>
                    <option value="Institute Level">Institute Level (2 pts)</option>
                    <option value="Inter-University Level">Inter-University Level (3 pts)</option>
                    <option value="Zonal Level">Zonal Level (4 pts)</option>
                    <option value="National / International Level">National / International Level (5 pts)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Academic Year</label>
                  <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-655 font-semibold select-none">Year {isEditingExtra ? extraAcademicYear : currentAcademicYear}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Organizer / Provider *</label>
                  <input type="text" value={extraProvider} onChange={(e) => setExtraProvider(e.target.value)} placeholder="e.g. State NSS Unit, Cultural Committee" title="Activity provider" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-850 focus:outline-none focus:border-primary focus:ring-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Certificate Number</label>
                  <input type="text" value={extraCertNumber} onChange={(e) => setExtraCertNumber(e.target.value)} placeholder="Certificate number" title="Activity certificate number" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-850 focus:outline-none focus:border-primary focus:ring-1" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Issue Date *</label>
                  <input type="date" value={extraIssueDate} onChange={(e) => setExtraIssueDate(e.target.value)} title="Activity issue date" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" />
                </div>
              </div>
              <div className="space-y-1.5 pt-2"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Certificate File (PDF or Image) {isEditingExtra ? '(Optional)' : '*'}</label><input type="file" accept=".pdf,image/*" onChange={(e) => setExtraFile(e.target.files ? e.target.files[0] : null)} title="Activity proof file" aria-label="Activity proof file" required={!isEditingExtra} className="w-full text-xs text-slate-500 bg-slate-50 p-2 border border-slate-200 rounded-xl" /></div>
              <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-150 rounded-xl"><div><span className="text-[10px] font-bold text-indigo-700 uppercase block tracking-wider">Dynamic Score Value</span><span className="text-[9px] text-slate-500 italic mt-0.5">Calculated instantly from score guidelines</span></div><span className="px-3.5 py-1.5 bg-white text-indigo-700 font-extrabold text-sm border border-indigo-200 rounded-lg shadow-sm">+{getExtraCurricularPreviewScore(extraLevel)} Points</span></div>
              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100"><button type="button" onClick={closeExtraModal} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all">Cancel</button><button type="submit" disabled={extraSubmitting} className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5">{extraSubmitting ? 'Uploading...' : isEditingExtra ? 'Save Changes' : 'Upload certificate'}</button></div>
            </form>
          </div>
        </div>
      )}
      {showSportsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden my-8 animate-scaleUp">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">{isEditingSports ? 'Edit Sports Record' : 'Upload Sports Record'}</h3>
              <button onClick={closeSportsModal} aria-label="Close sports modal" title="Close sports modal" className="p-1 text-slate-400 hover:text-slate-700 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSportsSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {sportsError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-600">{sportsError}</div>}
              {sportsMsg && <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl text-xs font-semibold text-emerald-700">{sportsMsg}</div>}
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Activity Name *</label>
                <input type="text" value={sportsActivityName} onChange={(e) => setSportsActivityName(e.target.value)} placeholder="e.g. Football Tournament, Yoga Championship" title="Activity name" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Event Name *</label>
                <input type="text" value={sportsEventName} onChange={(e) => setSportsEventName(e.target.value)} placeholder="e.g. Annual Sports Meet 2026, Fit India Challenge" title="Event name" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Organizer *</label>
                  <input type="text" value={sportsOrganizer} onChange={(e) => setSportsOrganizer(e.target.value)} placeholder="e.g. Sports Board, District Athletics Association" title="Organizer" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Event Date *</label>
                  <input type="date" value={sportsEventDate} onChange={(e) => setSportsEventDate(e.target.value)} title="Event date" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Academic Year</label>
                  <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-semibold select-none">Year {isEditingSports ? sportsAcademicYear : currentAcademicYear}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Certificate Number (Optional)</label>
                  <input type="text" value={sportsCertNumber} onChange={(e) => setSportsCertNumber(e.target.value)} placeholder="e.g. SP-8849" title="Certificate number" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:border-primary focus:ring-1" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Description (Optional)</label>
                <textarea value={sportsDescription} onChange={(e) => setSportsDescription(e.target.value)} placeholder="Provide details of your participation or rank achieved..." title="Description" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-850 focus:outline-none focus:border-primary resize-none" rows={2} />
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Certificate File (PDF or Image) {isEditingSports ? '(Optional)' : '*'}</label>
                <input type="file" accept=".pdf,image/*" onChange={(e) => setSportsFile(e.target.files ? e.target.files[0] : null)} title="Certificate proof file" aria-label="Certificate proof file" required={!isEditingSports} className="w-full text-xs text-slate-500 bg-slate-50 p-2 border border-slate-200 rounded-xl" />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                <button type="button" onClick={closeSportsModal} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all">Cancel</button>
                <button type="submit" disabled={sportsSubmitting} className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5">{sportsSubmitting ? 'Uploading...' : isEditingSports ? 'Save Changes' : 'Upload Certificate'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAchievementCenter;