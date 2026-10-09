import { AppItem, DownloadHistoryItem } from '../types';

const DB_NAME = 'SmileStoreDB';
const DB_VERSION = 1;
const STORE_APKS = 'apks';
const STORAGE_KEY_APPS = 'smilestore_apps_v1';
const STORAGE_KEY_DOWNLOADS = 'smilestore_downloads_v1';
const STORAGE_KEY_FAVORITES = 'smilestore_favorites_v1';

// Open IndexedDB database for APK Blob storage
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_APKS)) {
        db.createObjectStore(STORE_APKS, { keyPath: 'id' });
      }
    };
  });
}

// Compute real cryptographic SHA-256 hex string from ArrayBuffer or Blob
export async function calculateSHA256(data: ArrayBuffer | Blob): Promise<string> {
  let buffer: ArrayBuffer;
  if (data instanceof Blob) {
    buffer = await data.arrayBuffer();
  } else {
    buffer = data;
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Store an uploaded APK Blob in IndexedDB
export async function saveApkBlob(versionId: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_APKS, 'readwrite');
      const store = transaction.objectStore(STORE_APKS);
      const req = store.put({ id: versionId, blob, updatedAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not save APK blob to IndexedDB:', err);
  }
}

// Retrieve an uploaded APK Blob from IndexedDB
export async function getApkBlob(versionId: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_APKS, 'readonly');
      const store = transaction.objectStore(STORE_APKS);
      const req = store.get(versionId);
      req.onsuccess = () => {
        resolve(req.result ? req.result.blob : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not read APK blob from IndexedDB:', err);
    return null;
  }
}

// Format bytes into human readable format (MB, KB)
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Generate realistic APK binary blob for pre-seeded applications
export function createSyntheticApkBlob(appName: string, packageName: string, versionName: string): Blob {
  // A realistic structured zip container mimicking an Android APK package
  const manifestContent = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${packageName}"
    android:versionCode="1"
    android:versionName="${versionName}">
    <uses-sdk android:minSdkVersion="26" android:targetSdkVersion="35" />
    <uses-permission android:name="android.permission.INTERNET" />
    <application android:label="${appName}" android:icon="@mipmap/ic_launcher">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

  const metadataJson = JSON.stringify({
    distribution: 'Smile Store Independent Marketplace',
    name: appName,
    package: packageName,
    version: versionName,
    verified_by: 'Smile Shield Security Pipeline',
    signed_at: new Date().toISOString()
  }, null, 2);

  // Combine into an APK binary container
  return new Blob([
    'PK\x03\x04', // Standard ZIP/APK local file header magic
    '\x14\x00\x00\x00\x08\x00',
    manifestContent,
    '\n--- SMILE STORE SIGNATURE & ASSET BLOCK ---\n',
    metadataJson,
    '\n--- END SMILE STORE APK PACKAGE ---'
  ], { type: 'application/vnd.android.package-archive' });
}

// Trigger browser download for a Blob
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// LocalStorage helpers for custom apps
export function loadSavedApps(): AppItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_APPS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveApp(app: AppItem): void {
  try {
    const existing = loadSavedApps();
    const index = existing.findIndex(a => a.id === app.id);
    let updated: AppItem[];
    if (index >= 0) {
      updated = [...existing];
      updated[index] = app;
    } else {
      updated = [app, ...existing];
    }
    localStorage.setItem(STORAGE_KEY_APPS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save app to localStorage:', e);
  }
}

export function deleteSavedApp(appId: string): void {
  try {
    const existing = loadSavedApps();
    const updated = existing.filter(a => a.id !== appId);
    localStorage.setItem(STORAGE_KEY_APPS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete app:', e);
  }
}

// Download history
export function loadDownloadHistory(): DownloadHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOWNLOADS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function recordDownload(item: DownloadHistoryItem): void {
  try {
    const existing = loadDownloadHistory();
    const updated = [item, ...existing.filter(i => i.id !== item.id)].slice(0, 50);
    localStorage.setItem(STORAGE_KEY_DOWNLOADS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to record download:', e);
  }
}

// CMS Admin Settings & Audit Logs
import { CmsSettings, CmsAuditLog } from '../types';

const STORAGE_KEY_CMS_SETTINGS = 'smilestore_cms_settings_v1';
const STORAGE_KEY_AUDIT_LOGS = 'smilestore_audit_logs_v1';
const STORAGE_KEY_ADMIN_SESSION = 'smilestore_admin_session_v1';
const STORAGE_KEY_ADMIN_TOKEN = 'smilestore_admin_token_v1';

export const DEFAULT_CMS_SETTINGS: CmsSettings = {
  storeName: 'Smile Store',
  tagline: 'Your independent Android app marketplace.',
  requireAdminApproval: false,
  maxUploadSizeMB: 250,
  storageProvider: 'cloudflare_r2',
  cdnDomain: 'https://cdn.smilestore.example.com',
  maintenanceMode: false,
  allowPublicUploads: true
};

export function loadCmsSettings(): CmsSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CMS_SETTINGS);
    if (!raw) return DEFAULT_CMS_SETTINGS;
    return { ...DEFAULT_CMS_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CMS_SETTINGS;
  }
}

export function saveCmsSettings(settings: CmsSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_CMS_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save CMS settings:', e);
  }
}

export function loadAuditLogs(): CmsAuditLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDIT_LOGS);
    if (!raw) {
      return [
        {
          id: 'log-init-1',
          actorEmail: 'admin@mvp.com.ai',
          action: 'SETTINGS_UPDATED',
          target: 'System Initialization',
          timestamp: 'Oct 08, 2026, 04:00 AM',
          details: 'Initialized Smile Store CMS cluster configuration.'
        }
      ];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function recordAuditLog(log: Omit<CmsAuditLog, 'id' | 'timestamp'>): void {
  try {
    const existing = loadAuditLogs();
    const newLog: CmsAuditLog = {
      ...log,
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString()
    };
    const updated = [newLog, ...existing].slice(0, 100);
    localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to record audit log:', e);
  }
}

export function loadAdminSession(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_ADMIN_SESSION);
  } catch {
    return null;
  }
}

export function loadAdminToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_ADMIN_TOKEN);
  } catch {
    return null;
  }
}

export function saveAdminSession(email: string | null, token: string | null = null): void {
  try {
    if (email) {
      localStorage.setItem(STORAGE_KEY_ADMIN_SESSION, email);
    } else {
      localStorage.removeItem(STORAGE_KEY_ADMIN_SESSION);
    }
    if (token) {
      localStorage.setItem(STORAGE_KEY_ADMIN_TOKEN, token);
    } else if (!email) {
      localStorage.removeItem(STORAGE_KEY_ADMIN_TOKEN);
    }
  } catch (e) {
    console.error('Failed to save admin session:', e);
  }
}

