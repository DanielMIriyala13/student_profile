import { Schema, model, Document } from 'mongoose';

export interface ICoCurricularScore extends Document {
  studentId: Schema.Types.ObjectId;
  academicYear: number;
  totalPoints: number;
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

const coCurricularScoreSchema = new Schema<ICoCurricularScore>(
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

coCurricularScoreSchema.index({ studentId: 1, academicYear: 1 }, { unique: true });

export const CoCurricularScore = model<ICoCurricularScore>('CoCurricularScore', coCurricularScoreSchema);
export default CoCurricularScore;
