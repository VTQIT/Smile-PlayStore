import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AppItem, AppVersion, CmsSettings, CmsAuditLog, Review } from '../types';
import { INITIAL_APPS } from '../data/mockApps';
import { buildValidApkBuffer } from './apkGenerator';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const APK_STORAGE_DIR = path.resolve(DATA_DIR, 'uploads', 'apks');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

interface DatabaseSchema {
  apps: AppItem[];
  settings: CmsSettings;
  auditLogs: CmsAuditLog[];
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

// Ensure directories and files exist
export function initDatabase(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(APK_STORAGE_DIR)) {
    fs.mkdirSync(APK_STORAGE_DIR, { recursive: true });
  }

  let dbData: DatabaseSchema;

  if (!fs.existsSync(DB_FILE)) {
    // Seed initial showcase catalog with isPlaceholder metadata flag
    // Notice: Generated fixtures are identified as placeholders, not real installable release APKs
    const seededApps: AppItem[] = INITIAL_APPS.map((app) => {
      const updatedVersion: AppVersion = {
        ...app.latestVersion,
        isPlaceholder: true,
        downloadUrl: `/api/v1/apps/${app.id}/download`
      };

      return {
        ...app,
        latestVersion: updatedVersion,
        allVersions: [updatedVersion]
      };
    });

    dbData = {
      apps: seededApps,
      settings: DEFAULT_SETTINGS,
      auditLogs: [
        {
          id: 'log-seed-1',
          actorEmail: 'admin@mvp.com.ai',
          action: 'SETTINGS_UPDATED',
          target: 'System Provisioning',
          timestamp: new Date().toLocaleString(),
          details: 'Production catalog initialized. Showcase entries marked as catalog placeholders awaiting signed production release binaries.'
        }
      ]
    };

    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf-8');
  } else {
    // Migrate existing DB if needed: ensure seed apps without real uploads have isPlaceholder marked
    try {
      const current = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as DatabaseSchema;
      let changed = false;
      current.apps = current.apps.map(app => {
        if (!app.latestVersion.isCustomUploaded && !app.latestVersion.isPlaceholder) {
          app.latestVersion.isPlaceholder = true;
          changed = true;
        }
        return app;
      });
      if (changed) {
        fs.writeFileSync(DB_FILE, JSON.stringify(current, null, 2), 'utf-8');
      }
    } catch {}
  }
}

function readDb(): DatabaseSchema {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    initDatabase();
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  }
}

function writeDb(data: DatabaseSchema): void {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// App Operations
export function getAllApps(filter?: { category?: string; type?: string; search?: string; status?: string }): AppItem[] {
  const db = readDb();
  let list = db.apps;

  if (filter?.status) {
    list = list.filter(a => a.status === filter.status);
  }
  if (filter?.type && filter.type !== 'ALL') {
    list = list.filter(a => a.type === filter.type);
  }
  if (filter?.category && filter.category !== 'All') {
    list = list.filter(a => a.category === filter.category);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    list = list.filter(a => 
      a.name.toLowerCase().includes(q) ||
      a.packageName.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q)
    );
  }

  return list;
}

export function getAppById(id: string): AppItem | null {
  const db = readDb();
  return db.apps.find(a => a.id === id) || null;
}

export function getAppByPackage(packageName: string): AppItem | null {
  const db = readDb();
  return db.apps.find(a => a.packageName.toLowerCase() === packageName.toLowerCase()) || null;
}

export function saveOrUpdateApp(app: AppItem): AppItem {
  const db = readDb();
  const idx = db.apps.findIndex(a => a.id === app.id);
  if (idx >= 0) {
    db.apps[idx] = app;
  } else {
    db.apps.unshift(app);
  }
  writeDb(db);
  return app;
}

export function deleteApp(id: string): boolean {
  const db = readDb();
  const target = db.apps.find(a => a.id === id);
  if (!target) return false;

  // Try removing binary file if present
  const filename = `${target.slug}-v${target.latestVersion.versionName}.apk`;
  const filePath = path.resolve(APK_STORAGE_DIR, filename);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch {}
  }

  db.apps = db.apps.filter(a => a.id !== id);
  writeDb(db);
  return true;
}

export function incrementAppDownloads(id: string): AppItem | null {
  const db = readDb();
  const app = db.apps.find(a => a.id === id);
  if (!app) return null;

  app.downloadCount += 1;
  app.downloadCountFormatted = app.downloadCount >= 1000 
    ? `${Math.round(app.downloadCount / 1000)}K+` 
    : `${app.downloadCount}`;
  
  writeDb(db);
  return app;
}

export function addReviewToApp(id: string, review: Review): AppItem | null {
  const db = readDb();
  const app = db.apps.find(a => a.id === id);
  if (!app) return null;

  app.reviews.unshift(review);
  const total = app.reviews.reduce((sum, r) => sum + r.rating, 0);
  app.rating = Number((total / app.reviews.length).toFixed(1));
  app.ratingCount = app.reviews.length;

  writeDb(db);
  return app;
}

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

// Settings
export function getSettings(): CmsSettings {
  return readDb().settings || DEFAULT_SETTINGS;
}

export function updateSettings(settings: CmsSettings): CmsSettings {
  const db = readDb();
  db.settings = { ...DEFAULT_SETTINGS, ...settings };
  writeDb(db);
  return db.settings;
}

// Audit Logs
export function getAuditLogs(): CmsAuditLog[] {
  return readDb().auditLogs || [];
}

export function addAuditLog(log: Omit<CmsAuditLog, 'id' | 'timestamp'>): CmsAuditLog {
  const db = readDb();
  const newLog: CmsAuditLog = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toLocaleString()
  };
  db.auditLogs.unshift(newLog);
  if (db.auditLogs.length > 200) {
    db.auditLogs = db.auditLogs.slice(0, 200);
  }
  writeDb(db);
  return newLog;
}

// Updates Check
export function checkPackageUpdates(packages: { packageName: string; versionCode: number }[]): { updates: any[] } {
  const db = readDb();
  const updates: any[] = [];

  for (const pkg of packages) {
    const app = db.apps.find(a => a.packageName.toLowerCase() === pkg.packageName.toLowerCase() && a.status === 'PUBLISHED');
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
