import { Schema, model, Document } from 'mongoose';

export interface ICambridgeScoreMap extends Document {
  level: string;
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

const cambridgeScoreMapSchema = new Schema<ICambridgeScoreMap>(
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

export const CambridgeScoreMap = model<ICambridgeScoreMap>('CambridgeScoreMap', cambridgeScoreMapSchema);
export default CambridgeScoreMap;
