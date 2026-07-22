import { Schema, model, Document } from 'mongoose';

export interface IPhysicalFitnessActivity extends Document {
  studentId: Schema.Types.ObjectId;
  academicYear: number;
  activityName: string;
  eventName: string;
  organizer: string;
  eventDate: Date;
  certificateFile: string;
  certificateNumber?: string;
  description?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks: string;
  approvedBy?: Schema.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const physicalFitnessActivitySchema = new Schema<IPhysicalFitnessActivity>(
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
    eventName: {
      type: String,
      required: true,
      trim: true,
    },
    organizer: {
      type: String,
      required: true,
      trim: true,
    },
    eventDate: {
      type: Date,
      required: true,
    },
    certificateFile: {
      type: String,
      required: true,
    },
    certificateNumber: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
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

physicalFitnessActivitySchema.index({ studentId: 1, academicYear: 1 });
physicalFitnessActivitySchema.index({ status: 1 });

export const PhysicalFitnessActivity = model<IPhysicalFitnessActivity>(
  'PhysicalFitnessActivity',
  physicalFitnessActivitySchema
);
export default PhysicalFitnessActivity;
