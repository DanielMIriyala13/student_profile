import { Schema, model, Document } from 'mongoose';

export interface ILeadershipScore extends Document {
  studentId: Schema.Types.ObjectId;
  academicYear: number;
  totalPoints: number;
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

const leadershipScoreSchema = new Schema<ILeadershipScore>(
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
leadershipScoreSchema.index({ studentId: 1, academicYear: 1 }, { unique: true });

export const LeadershipScore = model<ILeadershipScore>('LeadershipScore', leadershipScoreSchema);
export default LeadershipScore;
