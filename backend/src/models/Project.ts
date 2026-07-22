import { Schema, model, Document } from 'mongoose';

export interface IProject extends Document {
  studentId: Schema.Types.ObjectId;
  academicYear: number;
  projectTitle: string;
  projectDescription: string;
  projectLevel: 'Department' | 'Institute' | 'Inter-University' | 'National / International';
  studentSelectedLevel: string;
  facultyApprovedLevel?: string;
  technologiesUsed: string[];
  projectDuration: string;
  teamMembers: string;
  repositoryUrl?: string;
  demoUrl?: string;
  supportingDocuments: string[];
  calculatedScore: number;
  facultyApprovedScore?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks: string;
  approvedBy?: Schema.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
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
    projectTitle: {
      type: String,
      required: true,
      trim: true,
    },
    projectDescription: {
      type: String,
      required: true,
      trim: true,
    },
    projectLevel: {
      type: String,
      enum: ['Department', 'Institute', 'Inter-University', 'National / International'],
      required: true,
    },
    studentSelectedLevel: {
      type: String,
      required: true,
    },
    facultyApprovedLevel: {
      type: String,
    },
    technologiesUsed: {
      type: [String],
      default: [],
    },
    projectDuration: {
      type: String,
      required: true,
      trim: true,
    },
    teamMembers: {
      type: String,
      required: true,
      trim: true,
    },
    repositoryUrl: {
      type: String,
      trim: true,
    },
    demoUrl: {
      type: String,
      trim: true,
    },
    supportingDocuments: {
      type: [String],
      default: [],
    },
    calculatedScore: {
      type: Number,
      required: true,
      default: 2,
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

projectSchema.index({ studentId: 1, academicYear: 1 });
projectSchema.index({ status: 1 });

export const Project = model<IProject>('Project', projectSchema);
export default Project;