import { Schema, model, Document } from 'mongoose';

export interface ICodingChallenge extends Document {
  studentId: Schema.Types.ObjectId;
  academicYear: number;
  eventName: string;
  eventType: string;
  organizer: string;
  eventDate: Date;
  platform: string;
  achievementCategory: 'Hackathon Participation' | 'Hackathon Merit' | 'Coding Challenge Participation' | 'Coding Challenge Merit';
  studentSelectedCategory: string;
  facultyApprovedCategory?: string;
  rank?: string;
  teamName?: string;
  teamMembers?: string;
  description?: string;
  certificateNumber?: string;
  certificateFile: string;
  studentCalculatedScore: number;
  facultyApprovedScore?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks: string;
  approvedBy?: Schema.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const codingChallengeSchema = new Schema<ICodingChallenge>(
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
    eventName: {
      type: String,
      required: true,
      trim: true,
    },
    eventType: {
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
    platform: {
      type: String,
      required: true,
      trim: true,
    },
    achievementCategory: {
      type: String,
      enum: ['Hackathon Participation', 'Hackathon Merit', 'Coding Challenge Participation', 'Coding Challenge Merit'],
      required: true,
    },
    studentSelectedCategory: {
      type: String,
      required: true,
    },
    facultyApprovedCategory: {
      type: String,
    },
    rank: {
      type: String,
      trim: true,
    },
    teamName: {
      type: String,
      trim: true,
    },
    teamMembers: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    certificateNumber: {
      type: String,
      trim: true,
    },
    certificateFile: {
      type: String,
      required: true,
    },
    studentCalculatedScore: {
      type: Number,
      required: true,
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
codingChallengeSchema.index({ studentId: 1, academicYear: 1 });
codingChallengeSchema.index({ status: 1 });

export const CodingChallenge = model<ICodingChallenge>('CodingChallenge', codingChallengeSchema);
export default CodingChallenge;
