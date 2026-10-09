export interface AppVersion {
  id: string;
  versionName: string;
  versionCode: number;
  fileSize: number; // in bytes
  fileSizeFormatted: string;
  sha256: string;
  storageKey?: string;
  minAndroid: string;
  targetAndroid: string;
  releaseNotes: string;
  releaseDate: string;
  apkBlobUrl?: string; // if uploaded in session
  downloadUrl?: string;
  isCustomUploaded?: boolean;
}

export interface Review {
  id: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  date: string;
  versionCode: number;
  comment: string;
  developerReply?: {
    date: string;
    text: string;
  };
}

export interface AppItem {
  id: string;
  packageName: string;
  name: string;
  slug: string;
  developer: {
    id: string;
    name: string;
    verified: boolean;
    email: string;
    website?: string;
  };
  iconUrl: string;
  category: string;
  type: 'APP' | 'GAME';
  shortDescription: string;
  description: string;
  rating: number;
  ratingCount: number;
  downloadCount: number;
  downloadCountFormatted: string;
  featured?: boolean;
  trending?: boolean;
  topFree?: number;
  screenshots: string[];
  bannerUrl?: string;
  permissions: string[];
  status: 'PUBLISHED' | 'PENDING' | 'SUSPENDED';
  latestVersion: AppVersion;
  allVersions: AppVersion[];
  reviews: Review[];
  createdAt: string;
  updatedAt: string;
}

export interface DownloadHistoryItem {
  id: string;
  appId: string;
  appName: string;
  packageName: string;
  iconUrl: string;
  versionName: string;
  versionCode: number;
  fileSizeFormatted: string;
  sha256: string;
  timestamp: string;
  downloadUrl?: string;
}

export const AUTHORIZED_ADMIN_EMAILS = [
  'admin@mvp.com.ai',
  'fileslanaja@gmail.com'
] as const;

export interface CmsSettings {
  storeName: string;
  tagline: string;
  requireAdminApproval: boolean;
  maxUploadSizeMB: number;
  storageProvider: 'cloudflare_r2' | 'backblaze_b2' | 'aws_s3';
  cdnDomain: string;
  maintenanceMode: boolean;
  allowPublicUploads: boolean;
}

export interface CmsAuditLog {
  id: string;
  actorEmail: string;
  action: 'APP_CREATED' | 'APP_EDITED' | 'APP_APPROVED' | 'APP_REJECTED' | 'APP_SUSPENDED' | 'APP_RESTORED' | 'APP_DELETED' | 'SETTINGS_UPDATED';
  target: string;
  timestamp: string;
  details?: string;
}

