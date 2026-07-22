import { Schema, model, Document } from 'mongoose';

export interface IActivityCertification extends Document {
  studentId: Schema.Types.ObjectId;
  academicYear: number;
  activityName: string;
  category: 'Extra-Curricular' | 'Co-Curricular' | 'NSS' | 'NCC' | 'Cultural' | 'Technical Event' | 'Sports' | 'Club Activity' | 'Social Service' | 'Other';
  activityLevel: 'Department Level' | 'Institute Level' | 'Inter-University Level' | 'Zonal Level' | 'National / International Level';
  studentSelectedLevel: string;
  facultyApprovedLevel?: string;
  calculatedScore: number;
  facultyApprovedScore?: number;
  provider: string;
  certificateFile: string;
  certificateNumber?: string;
  issueDate: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks: string;
  approvedBy?: Schema.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const activityCertificationSchema = new Schema<IActivityCertification>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    academicYear: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    activityName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['Extra-Curricular', 'Co-Curricular', 'NSS', 'NCC', 'Cultural', 'Technical Event', 'Sports', 'Club Activity', 'Social Service', 'Other'],
      required: true,
    },
    activityLevel: {
      type: String,
      enum: ['Department Level', 'Institute Level', 'Inter-University Level', 'Zonal Level', 'National / International Level'],
      required: true,
    },
    studentSelectedLevel: {
      type: String,
      required: true,
    },
    facultyApprovedLevel: {
      type: String,
    },
    calculatedScore: {
      type: Number,
      required: true,
      default: 0,
    },
    facultyApprovedScore: {
      type: Number,
    },
    certificateFile: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
    },
    certificateNumber: {
      type: String,
      trim: true,
    },
    issueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    remarks: {
      type: String,
      default: '',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
activityCertificationSchema.index({ studentId: 1, academicYear: 1 });
activityCertificationSchema.index({ status: 1 });

export const ActivityCertification = model<IActivityCertification>('ActivityCertification', activityCertificationSchema);
export default ActivityCertification;
