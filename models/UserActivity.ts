import mongoose, { Schema, Document } from 'mongoose';

export interface IUserActivity extends Document {
  userId: mongoose.Types.ObjectId;
  isActive: boolean;
  lastActive: Date;
  activities: {
    date: string;
    timestamp: Date;
    action: string;
  }[];
}

const UserActivitySchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  activities: [{
    date: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    action: {
      type: String,
      required: true
    }
  }]
}, { timestamps: true });

// Auto-expire inactive users after 10 minutes
UserActivitySchema.index({ lastActive: 1 }, { 
  expireAfterSeconds: 600
});

export default mongoose.model<IUserActivity>('UserActivity', UserActivitySchema); 