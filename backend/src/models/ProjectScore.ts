import { Schema, model, Document } from 'mongoose';

export interface IProjectScore extends Document {
  studentId: Schema.Types.ObjectId;
  academicYear: number;
  totalPoints: number;
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

const projectScoreSchema = new Schema<IProjectScore>(
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

projectScoreSchema.index({ studentId: 1, academicYear: 1 }, { unique: true });

export const ProjectScore = model<IProjectScore>('ProjectScore', projectScoreSchema);
export default ProjectScore;