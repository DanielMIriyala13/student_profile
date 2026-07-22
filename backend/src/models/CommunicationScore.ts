import { Schema, model, Document } from 'mongoose';

export interface ICommunicationScore extends Document {
  studentId: Schema.Types.ObjectId;
  academicYear: number;
  totalPoints: number;
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

const communicationScoreSchema = new Schema<ICommunicationScore>(
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
    totalPoints: {
      type: Number,
      required: true,
      default: 0,
    },
    score: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique score record per student per year
communicationScoreSchema.index({ studentId: 1, academicYear: 1 }, { unique: true });

export const CommunicationScore = model<ICommunicationScore>('CommunicationScore', communicationScoreSchema);
export default CommunicationScore;
