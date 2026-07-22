import { Schema, model, Document } from 'mongoose';

export interface IExtraCurricularScore extends Document {
  studentId: Schema.Types.ObjectId;
  academicYear: number;
  totalPoints: number;
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

const extraCurricularScoreSchema = new Schema<IExtraCurricularScore>(
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

extraCurricularScoreSchema.index({ studentId: 1, academicYear: 1 }, { unique: true });

export const ExtraCurricularScore = model<IExtraCurricularScore>('ExtraCurricularScore', extraCurricularScoreSchema);
export default ExtraCurricularScore;
