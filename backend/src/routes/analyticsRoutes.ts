import { Router } from 'express';
import {
  getStudentDashboard,
  getFacultyDashboard,
  getHODDashboard,
  getHODEnterpriseSearch,
  getHODCgpaTrend,
  getPlacementDashboard,
  getInstitutionDashboard,
  getInstitutionDrilldown,
  getInstitutionKpiSummary,
  getInstitutionKpiDepartments,
  getInstitutionKpiDepartmentDetails,
  getInstitutionKpiStudents,
  getInstitutionKpiStudentProfile,
} from '../controllers/analyticsController';
import { protect, restrictTo } from '../middleware/auth';

const router = Router();

router.get('/student/dashboard', protect, restrictTo('STUDENT'), getStudentDashboard);
router.get('/faculty/dashboard', protect, restrictTo('FACULTY', 'HOD', 'ADMIN'), getFacultyDashboard);
router.get('/hod/dashboard', protect, restrictTo('HOD', 'ADMIN'), getHODDashboard);
router.get('/hod/enterprise-search', protect, restrictTo('HOD', 'ADMIN'), getHODEnterpriseSearch);
router.get('/hod/cgpa-trend', protect, restrictTo('HOD', 'ADMIN'), getHODCgpaTrend);
router.get('/placement/dashboard', protect, restrictTo('PLACEMENT_OFFICER', 'ADMIN'), getPlacementDashboard);
router.get('/institution/dashboard', protect, restrictTo('ADMIN'), getInstitutionDashboard);
router.get('/institution/drilldown', protect, restrictTo('ADMIN'), getInstitutionDrilldown);
router.get('/institution/kpi-summary', protect, restrictTo('ADMIN'), getInstitutionKpiSummary);
router.get('/institution/kpi-departments', protect, restrictTo('ADMIN'), getInstitutionKpiDepartments);
router.get('/institution/kpi-department-details', protect, restrictTo('ADMIN'), getInstitutionKpiDepartmentDetails);
router.get('/institution/kpi-students', protect, restrictTo('ADMIN'), getInstitutionKpiStudents);
router.get('/institution/kpi-student-profile', protect, restrictTo('ADMIN'), getInstitutionKpiStudentProfile);

export default router;
