export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum MasterProductSource {
  ADMIN = 'admin',
  VENDOR_ADDED = 'vendor-added',
}

export enum MasterProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum ProductStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum OrderStatus {
  PLACED = 'placed',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned',
}

export enum PaymentMethod {
  COD = 'COD',
  RAZORPAY = 'razorpay',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COLLECTED = 'collected',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum InquiryStatus {
  NEW = 'NEW',
  IN_REVIEW = 'IN_REVIEW',
  CONTACTED = 'CONTACTED',
  IN_DISCUSSION = 'IN_DISCUSSION',
  CONVERTED = 'CONVERTED',
  CLOSED = 'CLOSED',
}

export enum ContentModerationMode {
  PRE_APPROVAL = 'pre-approval',
  POST_PUBLISH = 'post-publish',
}

export enum PostStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  LIVE = 'live',
  REMOVED = 'removed',
}

export enum PostMediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

export enum ReportStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  DISMISSED = 'dismissed',
  ACTIONED = 'actioned',
}
