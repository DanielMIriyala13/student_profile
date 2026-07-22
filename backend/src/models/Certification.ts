import { Schema, model, Document } from 'mongoose';

export interface ICertification extends Document {
  studentId: Schema.Types.ObjectId;
  academicYear: number;
  certificateName: string;
  provider: string;
  certificateCategory: 'Normal Certificate' | 'NPTEL Elite' | 'NPTEL Silver' | 'NPTEL Gold' | 'NPTEL Topper' | 'Global Certification';
  studentSelectedCategory: string;
  facultyApprovedCategory?: string;
  calculatedScore: number;
  facultyApprovedScore?: number;
  certificateFile: string;
  completionDate?: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks: string;
  approvedBy?: Schema.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const certificationSchema = new Schema<ICertification>(
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
    certificateName: {
      type: String,
      required: true,
      trim: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
    },
    completionDate: {
      type: Date,
    },
    certificateCategory: {
      type: String,
      enum: ['Normal Certificate', 'NPTEL Elite', 'NPTEL Silver', 'NPTEL Gold', 'NPTEL Topper', 'Global Certification'],
      required: true,
    },
    studentSelectedCategory: {
      type: String,
      required: true,
    },
    facultyApprovedCategory: {
      type: String,
    },
    calculatedScore: {
      type: Number,
      required: true,
      default: 2,
    },
    facultyApprovedScore: {
      type: Number,
    },
    certificateFile: {
      type: String,
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
certificationSchema.index({ studentId: 1, academicYear: 1 });
certificationSchema.index({ status: 1 });

export const Certification = model<ICertification>('Certification', certificationSchema);
export default Certification;
