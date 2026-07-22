import { Schema, model } from 'mongoose';

const profileSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      unique: true,
    },
    skills: {
      technical: {
        type: [String],
        default: [],
      },
      soft: {
        type: [String],
        default: [],
      },
    },
    profiles: {
      github: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      leetcode: { type: String, default: '' },
      hackerrank: { type: String, default: '' },
      codechef: { type: String, default: '' },
      portfolio: { type: String, default: '' },
    },
    resumeUrl: {
      type: String,
      default: '',
    },
    profileCompletion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Profile = model('Profile', profileSchema);
export default Profile;
