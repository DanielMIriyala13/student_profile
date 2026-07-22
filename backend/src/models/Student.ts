import { Schema, model, Types } from 'mongoose';

const studentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    rollNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    branch: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    section: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    contactNumber: {
      type: String,
      trim: true,
      default: '',
    },
    counselorName: {
      type: String,
      default: '',
    },
    intermediatePercentage: {
      type: Number,
      default: 0,
    },
    hostelerStatus: {
      type: String,
      enum: ['H', 'D', ''],
      default: '',
    },
    gender: {
      type: String,
      enum: ['M', 'F', ''],
      default: '',
    },
    overallScore: {
      type: Number,
      default: 0,
    },
    yearScores: {
      type: Schema.Types.Mixed,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Student = model('Student', studentSchema);
export default Student;
