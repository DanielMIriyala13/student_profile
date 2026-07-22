import { Schema, model } from 'mongoose';

const applicantSchema = new Schema({
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  status: {
    type: String,
    enum: ['APPLIED', 'SHORTLISTED', 'SELECTED', 'REJECTED'],
    default: 'APPLIED',
  },
});

const companySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    packageAmount: {
      type: Number, // In LPA (Lakhs Per Annum)
      required: true,
    },
    eligibilityCriteria: {
      minCGPA: { type: Number, default: 0.0 },
      minAttendance: { type: Number, default: 0.0 },
      allowedBranches: { type: [String], default: [] },
      activeBacklogsAllowed: { type: Number, default: 0 },
    },
    dateOfVisit: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['UPCOMING', 'ACTIVE', 'COMPLETED'],
      default: 'UPCOMING',
    },
    applicants: [applicantSchema],
  },
  {
    timestamps: true,
  }
);

export const Company = model('Company', companySchema);
export default Company;
