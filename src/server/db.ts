import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AppItem, AppVersion, CmsSettings, CmsAuditLog, Review } from '../types';
import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

const APK_STORAGE_DIR = path.resolve(process.cwd(), 'data', 'uploads', 'apks');

export function initDatabase(): void {
  // Ensure directories exist
  if (!fs.existsSync(APK_STORAGE_DIR)) {
    fs.mkdirSync(APK_STORAGE_DIR, { recursive: true });
  }
}

export async function getAllApps(): Promise<AppItem[]> {
  const snapshot = await getDocs(collection(db, 'apps'));
  return snapshot.docs.map(doc => doc.data() as AppItem);
}

export async function getAppById(id: string): Promise<AppItem | null> {
  const docRef = doc(db, 'apps', id);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? (snapshot.data() as AppItem) : null;
}

export async function getAppByPackage(packageName: string): Promise<AppItem | null> {
  const allApps = await getAllApps();
  return allApps.find(a => a.packageName.toLowerCase() === packageName.toLowerCase()) || null;
}

export async function saveOrUpdateApp(app: AppItem): Promise<AppItem> {
  await setDoc(doc(db, 'apps', app.id), app);
  return app;
}

export async function deleteApp(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'apps', id));
    return true;
  } catch {
    return false;
  }
}

export async function incrementAppDownloads(id: string): Promise<AppItem | null> {
  const app = await getAppById(id);
  if (!app) return null;

  app.downloadCount += 1;
  app.downloadCountFormatted = app.downloadCount >= 1000 
    ? `${Math.round(app.downloadCount / 1000)}K+` 
    : `${app.downloadCount}`;
  
  await saveOrUpdateApp(app);
  return app;
}

export async function addReviewToApp(id: string, review: Review): Promise<AppItem | null> {
  const app = await getAppById(id);
  if (!app) return null;

  app.reviews.unshift(review);
  const total = app.reviews.reduce((sum: number, r: Review) => sum + r.rating, 0);
  app.rating = Number((total / app.reviews.length).toFixed(1));
  app.ratingCount = app.reviews.length;

  await saveOrUpdateApp(app);
  return app;
}
// ... (keep remaining APK and setting functions, making them async where needed)


// Get APK file path on disk
export function getApkFilePath(app: AppItem): string | null {
  // If app is a placeholder fixture without uploaded binary, return null
  if (app.latestVersion.isPlaceholder) {
    return null;
  }

  // Check standard naming
  const filename = `${app.slug}-v${app.latestVersion.versionName}.apk`;
  const filePath = path.resolve(APK_STORAGE_DIR, filename);
  if (fs.existsSync(filePath)) {
    return filePath;
  }

  // Check if any file starts with slug or package name
  if (fs.existsSync(APK_STORAGE_DIR)) {
    const files = fs.readdirSync(APK_STORAGE_DIR);
    const match = files.find(f => f.startsWith(app.slug) || f.startsWith(app.packageName));
    if (match) {
      return path.resolve(APK_STORAGE_DIR, match);
    }
  }

  return null;
}

export function getApkStorageKey(app: AppItem): string {
  if (app.latestVersion.storageKey) {
    return app.latestVersion.storageKey;
  }
  return `apps/${app.packageName}/versions/${app.latestVersion.versionName}/${app.latestVersion.sha256}.apk`;
}

export function saveUploadedApk(appId: string, slug: string, versionName: string, tempFilePath: string, packageName = 'app'): { filePath: string; sha256: string; size: number; buffer: Buffer; storageKey: string } {
  const filename = `${slug}-v${versionName}.apk`;
  const finalPath = path.resolve(APK_STORAGE_DIR, filename);
  
  fs.copyFileSync(tempFilePath, finalPath);
  try { fs.unlinkSync(tempFilePath); } catch {}

  const buffer = fs.readFileSync(finalPath);
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const size = buffer.length;
  const storageKey = `apps/${packageName}/versions/${versionName}/${sha256}.apk`;

  return { filePath: finalPath, sha256, size, buffer, storageKey };
}

const SETTINGS_DOC = doc(db, 'settings', 'config');

export async function getSettings(): Promise<CmsSettings> {
  const snapshot = await getDoc(SETTINGS_DOC);
  return snapshot.exists() ? (snapshot.data() as CmsSettings) : DEFAULT_SETTINGS;
}

export async function updateSettings(settings: CmsSettings): Promise<CmsSettings> {
  await setDoc(SETTINGS_DOC, settings, { merge: true });
  return settings;
}

export async function getAuditLogs(): Promise<CmsAuditLog[]> {
  const snapshot = await getDocs(collection(db, 'auditLogs'));
  return snapshot.docs.map(doc => doc.data() as CmsAuditLog);
}

export async function addAuditLog(log: Omit<CmsAuditLog, 'id' | 'timestamp'>): Promise<CmsAuditLog> {
  const newLog: CmsAuditLog = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toLocaleString()
  };
  await setDoc(doc(db, 'auditLogs', newLog.id), newLog);
  return newLog;
}


const DEFAULT_SETTINGS: CmsSettings = {
  storeName: 'Smile Store',
  tagline: 'Your independent Android app marketplace.',
  requireAdminApproval: false,
  maxUploadSizeMB: 250,
  storageProvider: 'cloudflare_r2',
  cdnDomain: 'https://cdn.smilestore.example.com',
  maintenanceMode: false,
  allowPublicUploads: true
};

// ... (other functions)

// Updates Check
export async function checkPackageUpdates(packages: { packageName: string; versionCode: number }[]): Promise<{ updates: any[] }> {
  const allApps = await getAllApps();
  const updates: any[] = [];

  for (const pkg of packages) {
    const app = allApps.find(a => a.packageName.toLowerCase() === pkg.packageName.toLowerCase() && a.status === 'PUBLISHED');
    if (app && app.latestVersion.versionCode > pkg.versionCode) {
      updates.push({
        packageName: app.packageName,
        name: app.name,
        latestVersionCode: app.latestVersion.versionCode,
        latestVersionName: app.latestVersion.versionName,
        fileSize: app.latestVersion.fileSize,
        fileSizeFormatted: app.latestVersion.fileSizeFormatted,
        sha256: app.latestVersion.sha256,
        releaseNotes: app.latestVersion.releaseNotes,
        downloadUrl: `/api/v1/apps/${app.id}/download`
      });
    }
  }

  return { updates };
}

