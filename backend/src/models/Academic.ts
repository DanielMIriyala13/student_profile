import { Schema, model } from 'mongoose';

const subjectScoreSchema = new Schema({
  code: { type: String, required: true, uppercase: true },
  name: { type: String, required: true },
  internalMarks: { type: Number, required: true, min: 0 },
  externalMarks: { type: Number, required: true, min: 0 },
  totalMarks: { type: Number, required: true, min: 0 },
  maxMarks: { type: Number, default: 100 },
  grade: { type: String, required: true },
});

const academicSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    semester: {
      type: Number,
      required: true,
    },
    sgpa: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    subjects: [subjectScoreSchema],
    activeBacklogs: {
      type: Number,
      default: 0,
    },
    clearedBacklogs: {
      type: Number,
      default: 0,
    },
    rGradeCount: {
      type: Number,
      default: 0,
    },
    iGradeCount: {
      type: Number,
      default: 0,
    },
    crtAttendance: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    crtPerformance: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

academicSchema.index({ studentId: 1 });

export const Academic = model('Academic', academicSchema);
export default Academic;

