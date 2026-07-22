import { Schema, model, Document } from 'mongoose';

export interface ILeadershipActivity extends Document {
  studentId: Schema.Types.ObjectId;
  academicYear: number;
  organizationName: string;
  leadershipRole: 'CR / LR / ARC / SAC – Members' | 'Coordinators';
  studentSelectedRole: string;
  facultyApprovedRole?: string;
  leadershipPosition?: string;
  duration: string;
  appointmentDate?: Date;
  description?: string;
  appointmentLetter: string;
  studentCalculatedScore: number;
  facultyApprovedScore?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks: string;
  approvedBy?: Schema.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const leadershipActivitySchema = new Schema<ILeadershipActivity>(
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
    organizationName: {
      type: String,
      required: true,
      trim: true,
    },
    leadershipRole: {
      type: String,
      enum: ['CR / LR / ARC / SAC – Members', 'Coordinators'],
      required: true,
    },
    studentSelectedRole: {
      type: String,
      required: true,
    },
    facultyApprovedRole: {
      type: String,
    },
    leadershipPosition: {
      type: String,
      trim: true,
    },
    duration: {
      type: String,
      required: true,
      trim: true,
    },
    appointmentDate: {
      type: Date,
    },
    description: {
      type: String,
      trim: true,
    },
    appointmentLetter: {
      type: String,
      required: true,
    },
    studentCalculatedScore: {
      type: Number,
      required: true,
      default: 3,
    },
    facultyApprovedScore: {
      type: Number,
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
leadershipActivitySchema.index({ studentId: 1, academicYear: 1 });
leadershipActivitySchema.index({ status: 1 });

export const LeadershipActivity = model<ILeadershipActivity>('LeadershipActivity', leadershipActivitySchema);
export default LeadershipActivity;
