import fs from 'fs';
import path from 'path';
import { Firestore } from '@google-cloud/firestore';
import { AppItem, CmsSettings, CmsAuditLog } from '../src/types';
import { backupDatabase } from './backup_db';

interface DatabaseSchema {
  apps: AppItem[];
  settings: CmsSettings;
  auditLogs: CmsAuditLog[];
}

export async function migrateToFirestore(options: { dryRun?: boolean } = {}) {
  const { dryRun = false } = options;
  console.log(`=== MIGRATION TO GOOGLE CLOUD FIRESTORE ${dryRun ? '(DRY RUN)' : ''} ===`);

  const projectId = process.env.FIRESTORE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';

  console.log(`Configuration: Project ID: ${projectId || '[Auto-detected/ADC]'}, Database: ${databaseId}`);

  // 1. Create a safe backup first
  const backupPath = backupDatabase();
  console.log(`1. Pre-migration backup saved to: ${backupPath}`);

  // 2. Read source data
  const dataPath = path.resolve(process.cwd(), 'data', 'database.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Source database file missing: ${dataPath}`);
  }

  const raw = fs.readFileSync(dataPath, 'utf-8');
  const data: DatabaseSchema = JSON.parse(raw);

  console.log(`2. Source data loaded: ${data.apps.length} apps, ${data.auditLogs?.length || 0} audit logs, 1 settings document.`);

  if (dryRun) {
    console.log('[Dry Run] Schema validation successful:');
    console.log(`- Would migrate ${data.apps.length} apps to 'apps' collection.`);
    console.log(`- Would migrate settings to 'settings/singleton'.`);
    console.log(`- Would migrate ${data.auditLogs?.length || 0} logs to 'audit_logs' collection.`);
    console.log('[Dry Run] Completed without making cloud changes.');
    return { success: true, dryRun: true, backupPath, count: data.apps.length };
  }

  // 3. Initialize Firestore Client
  const firestore = new Firestore({
    projectId: projectId || undefined,
    databaseId: databaseId === '(default)' ? undefined : databaseId
  });

  // Test connection
  try {
    const testDoc = await firestore.collection('settings').doc('singleton').get();
    console.log(`3. Firestore connection established. (settings/singleton exists: ${testDoc.exists})`);
  } catch (connErr: any) {
    console.error(`3. Firestore connection failed: ${connErr.message}`);
    throw new Error(`Cannot connect to Firestore. Ensure GOOGLE_APPLICATION_CREDENTIALS or gcloud auth is configured. Details: ${connErr.message}`);
  }

  // 4. Batch Write Apps (idempotent: uses doc ID = app.id)
  console.log('4. Migrating applications collection...');
  let appCount = 0;
  for (const app of data.apps) {
    if (!app.id) continue;
    await firestore.collection('apps').doc(app.id).set(app, { merge: true });
    appCount++;
  }
  console.log(`   Migrated ${appCount} applications.`);

  // 5. Migrate Settings
  console.log('5. Migrating settings document...');
  if (data.settings) {
    await firestore.collection('settings').doc('singleton').set(data.settings, { merge: true });
    console.log('   Migrated settings document.');
  }

  // 6. Migrate Audit Logs
  console.log('6. Migrating audit logs...');
  let logCount = 0;
  if (Array.isArray(data.auditLogs)) {
    for (const log of data.auditLogs) {
      if (!log.id) continue;
      await firestore.collection('audit_logs').doc(log.id).set(log, { merge: true });
      logCount++;
    }
  }
  console.log(`   Migrated ${logCount} audit logs.`);

  console.log('=== MIGRATION COMPLETE ===');
  return { success: true, appCount, logCount, backupPath };
}

if (process.argv[1]?.endsWith('migrate_to_firestore.ts')) {
  const isDryRun = process.argv.includes('--dry-run');
  migrateToFirestore({ dryRun: isDryRun })
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[Migration Aborted]', err.message);
      process.exit(1);
    });
}
