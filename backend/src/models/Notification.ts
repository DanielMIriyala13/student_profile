import { Schema, model } from 'mongoose';

const notificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ['VERIFICATION_UPDATE', 'PLACEMENT_ALERT', 'ANNOUNCEMENT', 'DEADLINE'],
      default: 'ANNOUNCEMENT',
    },
  },
  {
    timestamps: true,
  }
);

export const Notification = model('Notification', notificationSchema);
export default Notification;
