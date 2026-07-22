import { Schema, model } from 'mongoose';

const achievementSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'CERTIFICATION',
        'PROJECT',
        'INTERNSHIP',
        'RESEARCH_PAPER',
        'SPORTS',
        'CLUB',
        'HACKATHON',
        'WORKSHOP',
        'COMPETITION',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    issuer: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      required: true,
    },
    fileUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
    },
    remarks: {
      type: String,
      default: '',
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

achievementSchema.index({ studentId: 1 });

export const Achievement = model('Achievement', achievementSchema);
export default Achievement;
