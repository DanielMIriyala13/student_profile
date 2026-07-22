import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import AuditLog from '../models/AuditLog';
import Certification from '../models/Certification';
import Project from '../models/Project';
import CambridgeCertification from '../models/CambridgeCertification';
import CoCurricularActivity from '../models/CoCurricularActivity';
import ExtraCurricularActivity from '../models/ExtraCurricularActivity';
import PhysicalFitnessActivity from '../models/PhysicalFitnessActivity';
import CodingChallenge from '../models/CodingChallenge';
import LeadershipActivity from '../models/LeadershipActivity';
import ActivityCertification from '../models/ActivityCertification';
import Achievement from '../models/Achievement';
import Student from '../models/Student';
import User from '../models/User';
import Notification from '../models/Notification';

// Scoring services
import { calculateAndStoreCertificationScore } from '../services/certificationScoringService';
import { calculateAndStoreProjectScore } from '../services/projectScoringService';
import { calculateAndStoreCommunicationScore } from '../services/communicationScoringService';
import { calculateAndStoreCoCurricularScore } from '../services/coCurricularScoringService';
import { calculateAndStoreExtraCurricularScore } from '../services/extraCurricularScoringService';
import { calculateAndStorePhysicalFitnessScore } from '../services/physicalFitnessScoringService';
import { calculateAndStoreCodingChallengeScore } from '../services/codingChallengeScoringService';
import { calculateAndStoreLeadershipScore } from '../services/leadershipScoringService';
import { calculateAndStoreActivityScore } from '../services/activityScoringService';

// GET all achievements (Pending, Approved, Rejected) with search and filters
export const getFacultyAchievements = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const {
      q = '',
      status, // APPROVED, REJECTED, PENDING
      academicYear,
      department,
      section,
      module, // Specific module name like 'Certification', 'Project', etc.
      startDate,
      endDate
    } = req.query;

    const userRole = req.user.role;
    const queryStr = String(q).trim();

    // Determine HOD department filter if applicable
    let deptFilter = department ? String(department) : undefined;
    if (userRole === 'HOD') {
      const userDept = req.user.department;
      if (!userDept) {
        res.status(403).json({ message: 'HOD has no department assigned.' });
        return;
      }
      deptFilter = userDept;
    }

    // First, resolve student IDs matching the filters if student details are searched/filtered
    let studentIds: any[] | undefined = undefined;
    if (deptFilter || section || queryStr) {
      const studentQuery: any = {};
      if (deptFilter) studentQuery.department = deptFilter;
      if (section) studentQuery.section = section;
      
      if (queryStr) {
        // Search users matching name
        const users = await User.find({ name: { $regex: queryStr, $options: 'i' } }).select('_id');
        const userIds = users.map(u => u._id);
        studentQuery.$or = [
          { rollNumber: { $regex: queryStr, $options: 'i' } },
          { userId: { $in: userIds } }
        ];
      }

      const students = await Student.find(studentQuery).select('_id');
      studentIds = students.map(s => s._id);
      
      // If we filtered by student details but no student matches, return early with empty array
      if (studentIds.length === 0) {
        res.status(200).json({ results: [] });
        return;
      }
    }

    // Modules configuration to query
    // The module schemas differ, but all expose the Mongoose query methods used
    // below. A common model type keeps this cross-module read operation typed.
    const modulesConfig: Array<{
      name: string;
      model: any;
      titleField: string;
      catField: string;
      levelField: string;
    }> = [
      { name: 'Certification', model: Certification, titleField: 'certificateName', catField: 'certificateCategory', levelField: '' },
      { name: 'Project', model: Project, titleField: 'projectTitle', catField: '', levelField: 'projectLevel' },
      { name: 'Cambridge', model: CambridgeCertification, titleField: 'certificateName', catField: '', levelField: 'certificateLevel' },
      { name: 'Co-Curricular', model: CoCurricularActivity, titleField: 'activityName', catField: '', levelField: 'activityLevel' },
      { name: 'Extra-Curricular', model: ExtraCurricularActivity, titleField: 'activityName', catField: '', levelField: 'activityLevel' },
      { name: 'Sports', model: PhysicalFitnessActivity, titleField: 'activityName', catField: '', levelField: '' },
      { name: 'Coding', model: CodingChallenge, titleField: 'eventName', catField: 'achievementCategory', levelField: '' },
      { name: 'Leadership', model: LeadershipActivity, titleField: 'organizationName', catField: '', levelField: 'leadershipRole' },
      { name: 'Activity', model: ActivityCertification, titleField: 'activityName', catField: '', levelField: 'activityLevel' },
      { name: 'Achievements', model: Achievement, titleField: 'title', catField: 'type', levelField: '' }
    ];

    // Filter target models based on module selection
    const targetModules = module
      ? modulesConfig.filter(m => m.name.toLowerCase() === String(module).toLowerCase())
      : modulesConfig;

    const queryPromises = targetModules.map(async (mod) => {
      const modelQuery: any = {};
      
      // Student IDs filter
      if (studentIds) {
        modelQuery.studentId = { $in: studentIds };
      }

      // Academic Year filter
      if (academicYear) {
        if (mod.name === 'Achievements') {
          // Achievements model does not have academicYear directly, so map student admission year boundaries
          const students = await Student.find(studentIds ? { _id: { $in: studentIds } } : {}).select('rollNumber').lean();
          const targetRanges = students.map(student => {
            const rollNumber = student.rollNumber;
            const match = rollNumber?.match(/^(\d{2})/);
            const admissionYear = match ? 2000 + parseInt(match[1]) : new Date().getFullYear() - 3;
            const sDate = new Date(`${admissionYear + Number(academicYear) - 1}-07-01T00:00:00.000Z`);
            const eDate = new Date(`${admissionYear + Number(academicYear)}-06-30T23:59:59.999Z`);
            return { studentId: student._id, date: { $gte: sDate, $lte: eDate } };
          });
          if (targetRanges.length > 0) {
            modelQuery.$or = targetRanges;
          } else {
            return [];
          }
        } else {
          modelQuery.academicYear = Number(academicYear);
        }
      }

      // Date Range filter (createdAt)
      if (startDate || endDate) {
        modelQuery.createdAt = {};
        if (startDate) modelQuery.createdAt.$gte = new Date(startDate as string);
        if (endDate) modelQuery.createdAt.$lte = new Date(endDate as string);
      }

      // Status filter mapping
      if (status) {
        if (status === 'PENDING') {
          if (mod.name === 'Achievements') {
            modelQuery.status = { $in: ['PENDING', 'UNDER_REVIEW'] };
          } else {
            modelQuery.status = 'PENDING';
          }
        } else if (status === 'APPROVED') {
          if (mod.name === 'Achievements') {
            modelQuery.status = 'VERIFIED';
          } else {
            modelQuery.status = 'APPROVED';
          }
        } else if (status === 'REJECTED') {
          modelQuery.status = 'REJECTED';
        }
      }

      // Text Search q filter on title / category / level
      if (queryStr) {
        const matchesModule = mod.name.toLowerCase().includes(queryStr.toLowerCase());
        if (!matchesModule) {
          const conditions: any[] = [
            { [mod.titleField]: { $regex: queryStr, $options: 'i' } }
          ];
          if (mod.catField) {
            conditions.push({ [mod.catField]: { $regex: queryStr, $options: 'i' } });
          }
          if (mod.levelField) {
            conditions.push({ [mod.levelField]: { $regex: queryStr, $options: 'i' } });
          }
          
          if (studentIds && studentIds.length > 0) {
            conditions.push({ studentId: { $in: studentIds } });
          }

          if (modelQuery.$or) {
            modelQuery.$and = [
              { $or: modelQuery.$or },
              { $or: conditions }
            ];
            delete modelQuery.$or;
          } else {
            modelQuery.$or = conditions;
          }
        }
      }

      // Execute query and populate student & user
      const docs = await (mod.model as any).find(modelQuery)
        .populate({
          path: 'studentId',
          populate: { path: 'userId', select: 'name email' }
        })
        .sort({ createdAt: -1 })
        .lean();

      // Format results into a unified structure
      return docs.map((doc: any) => {
        const student = doc.studentId;
        const user = student?.userId;

        // Title mapping
        let title = '';
        if (mod.name === 'Certification' || mod.name === 'Cambridge' || mod.name === 'Activity') {
          title = doc.certificateName;
        } else if (mod.name === 'Project') {
          title = doc.projectTitle;
        } else if (mod.name === 'Co-Curricular' || mod.name === 'Extra-Curricular' || mod.name === 'Sports') {
          title = doc.activityName;
        } else if (mod.name === 'Coding') {
          title = doc.eventName;
        } else if (mod.name === 'Leadership') {
          title = doc.organizationName;
        } else if (mod.name === 'Achievements') {
          title = doc.title;
        }

        // Category/Level mapping
        let categoryOrLevel = '';
        if (mod.name === 'Certification') {
          categoryOrLevel = doc.facultyApprovedCategory || doc.certificateCategory;
        } else if (mod.name === 'Project') {
          categoryOrLevel = doc.facultyApprovedLevel || doc.projectLevel;
        } else if (mod.name === 'Cambridge') {
          categoryOrLevel = doc.facultyApprovedLevel || doc.certificateLevel;
        } else if (mod.name === 'Co-Curricular' || mod.name === 'Extra-Curricular' || mod.name === 'Activity') {
          categoryOrLevel = doc.facultyApprovedLevel || doc.activityLevel;
        } else if (mod.name === 'Coding') {
          categoryOrLevel = doc.facultyApprovedCategory || doc.achievementCategory;
        } else if (mod.name === 'Leadership') {
          categoryOrLevel = doc.facultyApprovedRole || doc.leadershipRole;
        } else if (mod.name === 'Achievements') {
          categoryOrLevel = doc.type;
        } else {
          categoryOrLevel = 'N/A';
        }

        // Score mapping
        let scoreVal = 0;
        if (doc.status === 'APPROVED' || doc.status === 'VERIFIED') {
          if (mod.name === 'Sports') {
            const year = doc.academicYear;
            scoreVal = (year === 1 || year === 2) ? 5 : 0;
          } else if (mod.name === 'Achievements') {
            scoreVal = 0;
          } else {
            scoreVal = doc.facultyApprovedScore !== undefined && doc.facultyApprovedScore !== null
              ? doc.facultyApprovedScore
              : doc.calculatedScore || doc.studentCalculatedScore || 0;
          }
        }

        // Status mapping
        let statusVal = doc.status;
        if (statusVal === 'VERIFIED') statusVal = 'APPROVED';

        // File URL mapping
        let file = '';
        if (mod.name === 'Project') {
          file = doc.supportingDocuments?.[0] || '';
        } else if (mod.name === 'Leadership') {
          file = doc.appointmentLetter || '';
        } else if (mod.name === 'Achievements') {
          file = doc.fileUrl || '';
        } else {
          file = doc.certificateFile || '';
        }

        // Academic Year mapping for Achievements
        let yearVal = doc.academicYear;
        if (mod.name === 'Achievements' && student) {
          const rollNumber = student.rollNumber;
          const match = rollNumber?.match(/^(\d{2})/);
          const admissionYear = match ? 2000 + parseInt(match[1]) : new Date().getFullYear() - 3;
          const docDate = new Date(doc.date);
          const diffYears = docDate.getFullYear() - admissionYear;
          yearVal = diffYears + 1;
          if (yearVal < 1) yearVal = 1;
          if (yearVal > 4) yearVal = 4;
        }

        return {
          id: doc._id,
          module: mod.name,
          studentName: user?.name || 'Unknown',
          studentRoll: student?.rollNumber || 'N/A',
          studentDept: student?.department || 'N/A',
          studentSection: student?.section || 'N/A',
          academicYear: yearVal || 1,
          title,
          categoryOrLevel,
          score: scoreVal,
          remarks: doc.remarks || '',
          uploadedDate: doc.createdAt,
          processedDate: doc.approvedAt || doc.updatedAt,
          status: statusVal,
          fileUrl: file,
          originalRecord: doc
        };
      });
    });

    const resultsArrays = await Promise.all(queryPromises);
    const results: any[] = resultsArrays.flat();

    // Sort by processedDate (or uploadedDate fallback) descending
    results.sort((a: any, b: any) => {
      const dateA = new Date(a.processedDate || a.uploadedDate).getTime();
      const dateB = new Date(b.processedDate || b.uploadedDate).getTime();
      return dateB - dateA;
    });

    res.status(200).json({ results });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// PUT to edit any approved or rejected achievement
export const editAchievement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { module, id } = req.params;
    const { category, score, remarks, status } = req.body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ message: 'Status must be APPROVED or REJECTED.' });
      return;
    }

    let model: any;
    let modelName = '';
    let recalculateFn: ((studentId: string, year: number) => Promise<any>) | null = null;
    
    switch (module) {
      case 'Certification':
        model = Certification;
        modelName = 'Certification';
        recalculateFn = calculateAndStoreCertificationScore;
        break;
      case 'Project':
        model = Project;
        modelName = 'Project';
        recalculateFn = calculateAndStoreProjectScore;
        break;
      case 'Cambridge':
        model = CambridgeCertification;
        modelName = 'CambridgeCertification';
        recalculateFn = calculateAndStoreCommunicationScore;
        break;
      case 'Co-Curricular':
        model = CoCurricularActivity;
        modelName = 'CoCurricularActivity';
        recalculateFn = calculateAndStoreCoCurricularScore;
        break;
      case 'Extra-Curricular':
        model = ExtraCurricularActivity;
        modelName = 'ExtraCurricularActivity';
        recalculateFn = calculateAndStoreExtraCurricularScore;
        break;
      case 'Sports':
        model = PhysicalFitnessActivity;
        modelName = 'PhysicalFitnessActivity';
        recalculateFn = calculateAndStorePhysicalFitnessScore;
        break;
      case 'Coding':
        model = CodingChallenge;
        modelName = 'CodingChallenge';
        recalculateFn = calculateAndStoreCodingChallengeScore;
        break;
      case 'Leadership':
        model = LeadershipActivity;
        modelName = 'LeadershipActivity';
        recalculateFn = calculateAndStoreLeadershipScore;
        break;
      case 'Activity':
        model = ActivityCertification;
        modelName = 'ActivityCertification';
        recalculateFn = calculateAndStoreActivityScore;
        break;
      case 'Achievements':
        model = Achievement;
        modelName = 'Achievement';
        break;
      default:
        res.status(400).json({ message: 'Invalid module name.' });
        return;
    }

    const record = await model.findById(id).populate({ path: 'studentId', populate: { path: 'userId' } });
    if (!record) {
      res.status(404).json({ message: 'Record not found.' });
      return;
    }

    // Save previous values for audit trail
    const prevStatus = record.status === 'VERIFIED' ? 'APPROVED' : record.status;
    const prevRemarks = record.remarks || '';
    
    let prevScore = 0;
    if (module === 'Certification' || module === 'Project' || module === 'Cambridge' || module === 'Co-Curricular' || module === 'Extra-Curricular' || module === 'Coding' || module === 'Leadership' || module === 'Activity') {
      prevScore = record.facultyApprovedScore !== undefined && record.facultyApprovedScore !== null
        ? record.facultyApprovedScore
        : record.calculatedScore || record.studentCalculatedScore || 0;
    } else if (module === 'Sports') {
      prevScore = record.status === 'APPROVED' ? 5 : 0;
    }

    // Apply updates
    record.remarks = remarks || '';
    
    // Status mapping for Achievements model ('VERIFIED' instead of 'APPROVED')
    if (module === 'Achievements') {
      record.status = status === 'APPROVED' ? 'VERIFIED' : 'REJECTED';
    } else {
      record.status = status;
    }

    // If changing to REJECTED, clear approved fields
    if (status === 'REJECTED') {
      if (module === 'Certification') {
        record.facultyApprovedScore = undefined;
        record.facultyApprovedCategory = undefined;
      } else if (module === 'Project') {
        record.facultyApprovedScore = undefined;
        record.facultyApprovedLevel = undefined;
      } else if (module === 'Cambridge') {
        record.facultyApprovedScore = undefined;
        record.facultyApprovedLevel = undefined;
      } else if (module === 'Co-Curricular' || module === 'Extra-Curricular') {
        record.facultyApprovedScore = undefined;
        record.facultyApprovedLevel = undefined;
      } else if (module === 'Coding') {
        record.facultyApprovedScore = undefined;
        record.facultyApprovedCategory = undefined;
      } else if (module === 'Leadership') {
        record.facultyApprovedScore = undefined;
        record.facultyApprovedRole = undefined;
      } else if (module === 'Activity') {
        record.facultyApprovedScore = undefined;
        record.facultyApprovedLevel = undefined;
      }
    } else {
      // If APPROVED, set approved score and category/level
      if (score !== undefined && score !== null) {
        record.facultyApprovedScore = Number(score);
      }
      
      if (category) {
        if (module === 'Certification') {
          record.facultyApprovedCategory = category;
          record.certificateCategory = category;
        } else if (module === 'Project') {
          record.facultyApprovedLevel = category;
          record.projectLevel = category;
        } else if (module === 'Cambridge') {
          record.facultyApprovedLevel = category;
          record.certificateLevel = category;
        } else if (module === 'Co-Curricular' || module === 'Extra-Curricular') {
          record.facultyApprovedLevel = category;
          record.activityLevel = category;
        } else if (module === 'Coding') {
          record.facultyApprovedCategory = category;
          record.achievementCategory = category;
        } else if (module === 'Leadership') {
          record.facultyApprovedRole = category;
          record.leadershipRole = category;
        } else if (module === 'Activity') {
          record.facultyApprovedLevel = category;
          record.activityLevel = category;
        }
      }
    }

    record.approvedBy = req.user.id;
    record.approvedAt = new Date();

    await record.save();

    // Recalculate scoring if scoring service is available
    const studentIdStr = record.studentId._id ? record.studentId._id.toString() : record.studentId.toString();
    if (recalculateFn) {
      await recalculateFn(studentIdStr, record.academicYear);
    }

    // Determine updated score for audit
    let updatedScore = 0;
    if (status === 'APPROVED') {
      if (module === 'Certification' || module === 'Project' || module === 'Cambridge' || module === 'Co-Curricular' || module === 'Extra-Curricular' || module === 'Coding' || module === 'Leadership' || module === 'Activity') {
        updatedScore = record.facultyApprovedScore !== undefined && record.facultyApprovedScore !== null
          ? record.facultyApprovedScore
          : record.calculatedScore || record.studentCalculatedScore || 0;
      } else if (module === 'Sports') {
        updatedScore = 5;
      }
    }

    // Create Audit Log entry
    await AuditLog.create({
      achievementId: record._id,
      achievementModel: modelName,
      achievementModule: module,
      previousStatus: prevStatus,
      newStatus: status,
      previousScore: prevScore,
      updatedScore: updatedScore,
      previousRemarks: prevRemarks,
      updatedRemarks: remarks || '',
      facultyName: req.user.name,
      modifiedBy: new Types.ObjectId(req.user.id),
    });

    // Send Notification to student
    const studentUser = record.studentId?.userId;
    if (studentUser) {
      let titleText = record.certificateName || record.projectTitle || record.activityName || record.eventName || record.organizationName || record.title || 'Record';
      await Notification.create({
        userId: studentUser._id,
        title: `Achievement Modified by Faculty`,
        message: `Your submission "${titleText}" has been modified by Faculty ${req.user.name}. Status: ${status}. Remarks: "${remarks || 'None'}"`,
        type: 'VERIFICATION_UPDATE',
      });
    }

    res.status(200).json({
      message: 'Record successfully updated and scores recalculated.',
      record,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// GET audit logs history for a specific achievement
export const getAuditHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid achievement id.' });
      return;
    }

    const history = await AuditLog.find({ achievementId: new Types.ObjectId(id) })
      .populate('modifiedBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({ history });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
