import { Schema, model, Document } from 'mongoose';

export interface IActivityScoreMap extends Document {
  level: string;
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

const activityScoreMapSchema = new Schema<IActivityScoreMap>(
  {
    level: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const ActivityScoreMap = model<IActivityScoreMap>('ActivityScoreMap', activityScoreMapSchema);
export default ActivityScoreMap;
