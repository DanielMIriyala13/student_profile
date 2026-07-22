import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  achievementId: Types.ObjectId;
  achievementModel: string;
  achievementModule: string;
  previousStatus: string;
  newStatus: string;
  previousScore?: number;
  updatedScore?: number;
  previousRemarks?: string;
  updatedRemarks?: string;
  facultyName: string;
  modifiedBy: Types.ObjectId;
  modificationDate: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    achievementId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    achievementModel: {
      type: String,
      required: true,
    },
    achievementModule: {
      type: String,
      required: true,
    },
    previousStatus: {
      type: String,
      required: true,
    },
    newStatus: {
      type: String,
      required: true,
    },
    previousScore: {
      type: Number,
      default: 0,
    },
    updatedScore: {
      type: Number,
      default: 0,
    },
    previousRemarks: {
      type: String,
      default: '',
    },
    updatedRemarks: {
      type: String,
      default: '',
    },
    facultyName: {
      type: String,
      required: true,
    },
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    modificationDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ achievementId: 1 });
auditLogSchema.index({ modifiedBy: 1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
export default AuditLog;
