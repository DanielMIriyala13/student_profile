import { Schema, model, Document } from 'mongoose';

export interface ICoCurricularActivity extends Document {
  studentId: Schema.Types.ObjectId;
  academicYear: number;
  activityName: string;
  category: 'Paper Presentation' | 'Technical Quiz' | 'Technical Symposium' | 'Technical Workshops' | 'Technical Seminars' | 'Technical Competitions' | 'Technical Events' | 'Innovation Events' | 'Technical Conferences' | 'Academic Co-Curricular Activities';
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

const coCurricularActivitySchema = new Schema<ICoCurricularActivity>(
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
      enum: ['Paper Presentation', 'Technical Quiz', 'Technical Symposium', 'Technical Workshops', 'Technical Seminars', 'Technical Competitions', 'Technical Events', 'Innovation Events', 'Technical Conferences', 'Academic Co-Curricular Activities'],
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
      default: 1,
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

coCurricularActivitySchema.index({ studentId: 1, academicYear: 1 });
coCurricularActivitySchema.index({ status: 1 });

export const CoCurricularActivity = model<ICoCurricularActivity>('CoCurricularActivity', coCurricularActivitySchema);
export default CoCurricularActivity;
