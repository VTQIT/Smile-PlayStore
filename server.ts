import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import multer from 'multer';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { AUTHORIZED_ADMIN_EMAILS, AppItem, AppVersion, Review, CmsSettings } from './src/types';
import { 
  initDatabase, getAllApps, getAppById, getAppByPackage, 
  saveOrUpdateApp, deleteApp, incrementAppDownloads, addReviewToApp, 
  getApkFilePath, saveUploadedApk, getSettings, updateSettings, 
  getAuditLogs, addAuditLog, checkPackageUpdates, getApkStorageKey 
} from './src/server/db';
import { 
  isR2Configured, uploadApkToR2, generateR2SignedDownloadUrl, 
  deleteApkFromR2, getR2Config 
} from './src/server/r2Storage';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Initialize server data & seed APK files on disk
initDatabase();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Multer upload config for APK binaries
const uploadTempDir = path.resolve(os.tmpdir(), 'smilestore_uploads');
if (!fs.existsSync(uploadTempDir)) {
  fs.mkdirSync(uploadTempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadTempDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    cb(null, `apk-${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 250 * 1024 * 1024 } // 250 MB
});

// Admin Authentication Middleware
const ADMIN_SECRET = process.env.JWT_SECRET || 'smilestore_super_admin_secret_key_2026';

function generateAdminToken(email: string): string {
  const payload = JSON.stringify({ email, exp: Date.now() + 24 * 60 * 60 * 1000 });
  const b64 = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', ADMIN_SECRET).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

function verifyAdminToken(token: string): string | null {
  try {
    const [b64, sig] = token.split('.');
    if (!b64 || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', ADMIN_SECRET).update(b64).digest('base64url');
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf-8'));
    if (payload.exp < Date.now()) return null;
    if (!AUTHORIZED_ADMIN_EMAILS.includes(payload.email)) return null;
    return payload.email;
  } catch {
    return null;
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const rawEmailHeader = req.headers['x-admin-email'] as string;

  let verifiedEmail: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    verifiedEmail = verifyAdminToken(token);
  } else if (rawEmailHeader && AUTHORIZED_ADMIN_EMAILS.includes(rawEmailHeader as any)) {
    verifiedEmail = rawEmailHeader;
  }

  if (!verifiedEmail) {
    res.status(403).json({ 
      error: 'Forbidden: CMS Administration access restricted to authorized emails (admin@mvp.com.ai, fileslanaja@gmail.com)' 
    });
    return;
  }

  (req as any).adminEmail = verifiedEmail;
  next();
}

// -------------------------------------------------------------
// PUBLIC REST APIS (/api/v1/*)
// -------------------------------------------------------------

// 1. Healthcheck
app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    marketplace: 'Smile Store Independent Android Marketplace',
    version: '1.0.0-production',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// 2. List Apps
app.get('/api/v1/apps', (req, res) => {
  const { category, type, search, status } = req.query;
  const apps = getAllApps({
    category: category as string,
    type: type as string,
    search: search as string,
    status: (status as string) || 'PUBLISHED'
  });
  res.json({ apps, total: apps.length });
});

// 3. Get Single App by ID
app.get('/api/v1/apps/:id', (req, res) => {
  const app = getAppById(req.params.id);
  if (!app) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }
  res.json(app);
});

// 4. Get App by Package Name
app.get('/api/v1/apps/package/:packageName', (req, res) => {
  const app = getAppByPackage(req.params.packageName);
  if (!app) {
    res.status(404).json({ error: 'Package not found' });
    return;
  }
  res.json(app);
});

// 5. Download APK Binary Route (supports Cloudflare R2 Signed URLs and Direct Streaming)
app.get('/api/v1/apps/:id/download', async (req, res) => {
  const appItem = getAppById(req.params.id);
  if (!appItem) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }

  // Increment download telemetry
  incrementAppDownloads(appItem.id);

  const safeFilename = `${appItem.slug || appItem.packageName}-v${appItem.latestVersion.versionName}.apk`;
  const storageKey = getApkStorageKey(appItem);

  // If Cloudflare R2 is configured, generate a secure time-limited signed URL (5-min TTL)
  if (isR2Configured()) {
    try {
      const signedUrl = await generateR2SignedDownloadUrl(storageKey, safeFilename, 300);
      if (signedUrl) {
        if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
          res.json({
            downloadUrl: signedUrl,
            provider: 'cloudflare_r2',
            expiresInSeconds: 300,
            sha256: appItem.latestVersion.sha256,
            packageName: appItem.packageName,
            filename: safeFilename
          });
          return;
        }
        // Redirect client directly to Cloudflare R2 CDN edge (zero server egress consumed!)
        res.redirect(302, signedUrl);
        return;
      }
    } catch (err) {
      console.warn('[Cloudflare R2] Failed to generate signed URL, falling back to local stream:', err);
    }
  }

  // Fallback: Stream directly from local disk cache
  const apkFilePath = getApkFilePath(appItem);
  if (!apkFilePath || !fs.existsSync(apkFilePath)) {
    res.status(404).json({ error: 'APK binary file not found on storage server' });
    return;
  }

  const fileStat = fs.statSync(apkFilePath);
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  res.setHeader('Content-Length', fileStat.size);
  res.setHeader('X-APK-SHA256', appItem.latestVersion.sha256);
  res.setHeader('X-APK-Package', appItem.packageName);
  res.setHeader('X-APK-VersionCode', appItem.latestVersion.versionCode);

  const fileStream = fs.createReadStream(apkFilePath);
  fileStream.pipe(res);
});

// 5b. Request Download Authorization URL (Section 7 Signed URL API)
app.get('/api/v1/apps/:id/download-url', async (req, res) => {
  const appItem = getAppById(req.params.id);
  if (!appItem) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }

  incrementAppDownloads(appItem.id);
  const safeFilename = `${appItem.slug || appItem.packageName}-v${appItem.latestVersion.versionName}.apk`;
  const storageKey = getApkStorageKey(appItem);

  if (isR2Configured()) {
    const signedUrl = await generateR2SignedDownloadUrl(storageKey, safeFilename, 300);
    if (signedUrl) {
      res.json({
        authorized: true,
        downloadUrl: signedUrl,
        provider: 'cloudflare_r2',
        storageKey,
        expiresInSeconds: 300,
        sha256: appItem.latestVersion.sha256,
        fileSize: appItem.latestVersion.fileSize,
        fileSizeFormatted: appItem.latestVersion.fileSizeFormatted,
        filename: safeFilename
      });
      return;
    }
  }

  // Fallback direct endpoint
  res.json({
    authorized: true,
    downloadUrl: `/api/v1/apps/${appItem.id}/download`,
    provider: 'local_storage',
    expiresInSeconds: 3600,
    sha256: appItem.latestVersion.sha256,
    fileSize: appItem.latestVersion.fileSize,
    fileSizeFormatted: appItem.latestVersion.fileSizeFormatted,
    filename: safeFilename
  });
});

// 5c. Storage Configuration Status
app.get('/api/v1/storage/status', (_req, res) => {
  const config = getR2Config();
  res.json({
    provider: config.provider || 'local',
    configured: isR2Configured(),
    bucket: config.bucket || null,
    region: config.region || 'auto',
    endpointConfigured: Boolean(config.endpoint),
    hasAccessKey: Boolean(config.accessKeyId),
    hasSecretKey: Boolean(config.secretAccessKey)
  });
});

// 6. Post User Review
app.post('/api/v1/apps/:id/reviews', (req, res) => {
  const { userName, rating, comment, versionCode } = req.body;
  if (!comment || !rating) {
    res.status(400).json({ error: 'Rating and comment are required' });
    return;
  }

  const review: Review = {
    id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userName: userName || 'Android Community Member',
    rating: Number(rating),
    date: 'Today',
    versionCode: Number(versionCode) || 1,
    comment
  };

  const updated = addReviewToApp(req.params.id, review);
  if (!updated) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }

  res.status(201).json({ success: true, app: updated });
});

// 7. Updates Check API (Section 22)
app.post('/api/v1/updates/check', (req, res) => {
  const { packages } = req.body;
  if (!Array.isArray(packages)) {
    res.status(400).json({ error: 'packages array is required' });
    return;
  }
  const result = checkPackageUpdates(packages);
  res.json(result);
});

// 8. Upload & Publish APK (Multipart form-data)
app.post('/api/v1/upload', upload.single('apk'), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No APK file uploaded' });
      return;
    }

    const {
      name,
      packageName,
      versionName = '1.0.0',
      versionCode = '1',
      category = 'Tools',
      type = 'APP',
      shortDescription,
      description,
      releaseNotes = 'Initial release',
      minAndroid = 'Android 8.0 (API 26)',
      targetAndroid = 'Android 15 (API 35)',
      developerName = 'Indie Developer',
      developerEmail = 'developer@smilestore.org',
      iconUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256&h=256&fit=crop&q=80'
    } = req.body;

    if (!name || !packageName) {
      res.status(400).json({ error: 'App name and package name are required' });
      return;
    }

    const appId = `app-${Date.now()}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const versionId = `ver-${Date.now()}`;

    // Move uploaded file from temp to storage and calculate real SHA-256
    const { filePath, sha256, size, buffer, storageKey } = saveUploadedApk(appId, slug, versionName, req.file.path, packageName);
    const formattedSize = `${(size / (1024 * 1024)).toFixed(1)} MB`;

    // If Cloudflare R2 is configured, upload to private bucket
    if (isR2Configured()) {
      uploadApkToR2(storageKey, buffer, 'application/vnd.android.package-archive').catch((err) => {
        console.error('[Cloudflare R2] Background upload error:', err);
      });
    }

    const settings = getSettings();
    const initialStatus = settings.requireAdminApproval ? 'PENDING' : 'PUBLISHED';

    const newVersion: AppVersion = {
      id: versionId,
      versionName,
      versionCode: Number(versionCode),
      fileSize: size,
      fileSizeFormatted: formattedSize,
      sha256,
      storageKey,
      minAndroid,
      targetAndroid,
      releaseNotes,
      releaseDate: 'Just now',
      downloadUrl: `/api/v1/apps/${appId}/download`,
      isCustomUploaded: true
    };

    const newApp: AppItem = {
      id: appId,
      packageName: packageName.toLowerCase().trim(),
      name: name.trim(),
      slug,
      developer: {
        id: `dev-${Date.now()}`,
        name: developerName,
        verified: false,
        email: developerEmail
      },
      iconUrl,
      category,
      type: type === 'GAME' ? 'GAME' : 'APP',
      shortDescription: shortDescription || `${name} for Android.`,
      description: description || `${name} published independently on Smile Store.`,
      rating: 5.0,
      ratingCount: 1,
      downloadCount: 0,
      downloadCountFormatted: 'New',
      featured: false,
      trending: true,
      screenshots: [
        'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=1400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=1400&fit=crop&q=80'
      ],
      permissions: ['android.permission.INTERNET'],
      status: initialStatus,
      latestVersion: newVersion,
      allVersions: [newVersion],
      reviews: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    saveOrUpdateApp(newApp);

    addAuditLog({
      actorEmail: developerEmail,
      action: 'APP_CREATED',
      target: newApp.name,
      details: `Uploaded APK package ${newApp.packageName} (SHA-256: ${sha256.substring(0, 16)}...). Status: ${initialStatus}.`
    });

    res.status(201).json({ success: true, app: newApp });
  } catch (err: any) {
    console.error('Error in /api/v1/upload:', err);
    res.status(500).json({ error: err.message || 'Failed to process APK upload' });
  }
});

// -------------------------------------------------------------
// CMS ADMIN REST APIS (/api/v1/admin/*)
// -------------------------------------------------------------

// Admin Login
app.post('/api/v1/admin/login', (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!AUTHORIZED_ADMIN_EMAILS.includes(cleanEmail as any)) {
    res.status(403).json({ 
      error: `Access Denied: '${email}' is not authorized. Only admin@mvp.com.ai and fileslanaja@gmail.com have clearance.` 
    });
    return;
  }

  const token = generateAdminToken(cleanEmail);
  addAuditLog({
    actorEmail: cleanEmail,
    action: 'SETTINGS_UPDATED',
    target: 'CMS Session',
    details: 'Administrator authenticated successfully.'
  });

  res.json({
    success: true,
    email: cleanEmail,
    token,
    role: 'SUPER_ADMIN'
  });
});

// Admin: Get All Apps (including pending & suspended)
app.get('/api/v1/admin/apps', requireAdmin, (_req, res) => {
  const apps = getAllApps();
  res.json({ apps });
});

// Admin: Update Application Metadata / Status
app.patch('/api/v1/admin/apps/:id', requireAdmin, (req, res) => {
  const existing = getAppById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }

  const adminEmail = (req as any).adminEmail;
  const updates = req.body;

  const updated: AppItem = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  saveOrUpdateApp(updated);

  addAuditLog({
    actorEmail: adminEmail,
    action: updates.status === 'PUBLISHED' ? 'APP_APPROVED' : updates.status === 'SUSPENDED' ? 'APP_SUSPENDED' : 'APP_EDITED',
    target: updated.name,
    details: `Admin modified metadata/status for package ${updated.packageName}.`
  });

  res.json({ success: true, app: updated });
});

// Admin: Delete App
app.delete('/api/v1/admin/apps/:id', requireAdmin, (req, res) => {
  const appItem = getAppById(req.params.id);
  if (!appItem) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }

  const adminEmail = (req as any).adminEmail;
  if (isR2Configured()) {
    deleteApkFromR2(getApkStorageKey(appItem)).catch((err) => {
      console.warn('[Cloudflare R2] Object delete warning:', err);
    });
  }
  deleteApp(appItem.id);

  addAuditLog({
    actorEmail: adminEmail,
    action: 'APP_DELETED',
    target: appItem.name,
    details: `Admin deleted package ${appItem.packageName} from database and disk.`
  });

  res.json({ success: true });
});

// Admin: Get CMS Settings
app.get('/api/v1/admin/settings', requireAdmin, (_req, res) => {
  res.json(getSettings());
});

// Admin: Update CMS Settings
app.put('/api/v1/admin/settings', requireAdmin, (req, res) => {
  const adminEmail = (req as any).adminEmail;
  const newSettings = updateSettings(req.body);

  addAuditLog({
    actorEmail: adminEmail,
    action: 'SETTINGS_UPDATED',
    target: 'Marketplace Configuration',
    details: `Admin updated marketplace configuration.`
  });

  res.json({ success: true, settings: newSettings });
});

// Admin: Get Audit Logs
app.get('/api/v1/admin/audit-logs', requireAdmin, (_req, res) => {
  res.json({ auditLogs: getAuditLogs() });
});

// -------------------------------------------------------------
// VITE SPA & STATIC ASSETS
// -------------------------------------------------------------

async function startServer() {
  if (!isProduction) {
    // Development mode: attach Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve built static files
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SmileStore Production Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SmileStore Server Error]', err);
  process.exit(1);
});
