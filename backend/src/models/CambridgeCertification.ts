import { Schema, model, Document } from 'mongoose';

export interface ICambridgeCertification extends Document {
  studentId: Schema.Types.ObjectId;
  academicYear: number;
  certificateName: string;
  provider: string;
  certificateNumber?: string;
  issueDate: Date;
  certificateLevel: 'A2 Key' | 'B1 Preliminary' | 'B2 First' | 'C1 Advanced' | 'C2 Proficiency';
  studentSelectedLevel: string;
  facultyApprovedLevel?: string;
  calculatedScore: number;
  facultyApprovedScore?: number;
  certificateFile: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks: string;
  approvedBy?: Schema.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const cambridgeCertificationSchema = new Schema<ICambridgeCertification>(
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
    certificateNumber: {
      type: String,
      trim: true,
    },
    issueDate: {
      type: Date,
      required: true,
    },
    certificateLevel: {
      type: String,
      enum: ['A2 Key', 'B1 Preliminary', 'B2 First', 'C1 Advanced', 'C2 Proficiency'],
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
cambridgeCertificationSchema.index({ studentId: 1, academicYear: 1 });
cambridgeCertificationSchema.index({ status: 1 });

export const CambridgeCertification = model<ICambridgeCertification>('CambridgeCertification', cambridgeCertificationSchema);
export default CambridgeCertification;
