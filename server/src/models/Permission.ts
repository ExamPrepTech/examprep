import mongoose, { Schema, Document } from 'mongoose';

export type ResourceType = 'space' | 'subject' | 'topic' | 'contentBlock' | 'test';
export type GrantType = 'invite' | 'link';
export type PermissionStatus = 'active' | 'pending' | 'revoked';

export interface IPermission extends Document {
  resourceType: ResourceType;
  resourceId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  email?: string;
  grantType: GrantType;
  linkHash?: string;
  invitedBy: mongoose.Types.ObjectId;
  acceptedAt?: Date;
  status: PermissionStatus;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>({
  resourceType: {
    type: String,
    required: true,
    enum: ['space', 'subject', 'topic', 'contentBlock', 'test'],
  },
  resourceId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  email: { type: String },
  grantType: {
    type: String,
    required: true,
    enum: ['invite', 'link'],
  },
  linkHash: { type: String, index: true },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  acceptedAt: { type: Date },
  status: {
    type: String,
    required: true,
    enum: ['active', 'pending', 'revoked'],
    default: 'pending',
    index: true,
  },
  expiresAt: { type: Date },
}, { timestamps: true });

PermissionSchema.index({ resourceType: 1, resourceId: 1, status: 1 });
PermissionSchema.index({ userId: 1, status: 1 });
PermissionSchema.index({ linkHash: 1 }, { sparse: true });

export default mongoose.model<IPermission>('Permission', PermissionSchema);
