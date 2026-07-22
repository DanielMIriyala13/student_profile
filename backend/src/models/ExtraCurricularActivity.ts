import { Schema, model, Document } from 'mongoose';

export interface IExtraCurricularActivity extends Document {
  studentId: Schema.Types.ObjectId;
  academicYear: number;
  activityName: string;
  category: 'NSS' | 'NCC' | 'Cultural Activities' | 'Dance' | 'Music' | 'Fine Arts' | 'Drama' | 'Social Service' | 'Community Service' | 'Volunteering' | 'Clubs' | 'Literary Activities' | 'Student Welfare Activities';
  studentSelectedCategory: string;
  facultyApprovedCategory?: string;
  activityLevel?: 'Department Level' | 'Institute Level' | 'Inter-University Level' | 'Zonal Level' | 'National / International Level';
  studentSelectedLevel?: string;
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

const extraCurricularActivitySchema = new Schema<IExtraCurricularActivity>(
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
      enum: ['NSS', 'NCC', 'Cultural Activities', 'Dance', 'Music', 'Fine Arts', 'Drama', 'Social Service', 'Community Service', 'Volunteering', 'Clubs', 'Literary Activities', 'Student Welfare Activities'],
      required: true,
    },
    studentSelectedCategory: {
      type: String,
      required: true,
    },
    facultyApprovedCategory: {
      type: String,
    },
    activityLevel: {
      type: String,
      enum: ['Department Level', 'Institute Level', 'Inter-University Level', 'Zonal Level', 'National / International Level'],
      default: 'Institute Level',
    },
    studentSelectedLevel: {
      type: String,
      default: 'Institute Level',
    },
    facultyApprovedLevel: {
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
    provider: {
      type: String,
      required: true,
      trim: true,
    },
    certificateFile: {
      type: String,
      required: true,
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

extraCurricularActivitySchema.index({ studentId: 1, academicYear: 1 });
extraCurricularActivitySchema.index({ status: 1 });

export const ExtraCurricularActivity = model<IExtraCurricularActivity>('ExtraCurricularActivity', extraCurricularActivitySchema);
export default ExtraCurricularActivity;
