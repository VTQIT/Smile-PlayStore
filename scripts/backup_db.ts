import fs from 'fs';
import path from 'path';

export function backupDatabase(): string {
  const dataDir = path.resolve(process.cwd(), 'data');
  const dbFile = path.resolve(dataDir, 'database.json');
  const backupDir = path.resolve(dataDir, 'backups');

  if (!fs.existsSync(dbFile)) {
    throw new Error(`Database file not found at ${dbFile}`);
  }

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.resolve(backupDir, `database-backup-${timestamp}.json`);

  fs.copyFileSync(dbFile, backupFile);
  const stat = fs.statSync(backupFile);

  console.log(`[Backup Success] Created snapshot: ${backupFile} (${stat.size} bytes)`);
  return backupFile;
}

if (process.argv[1]?.endsWith('backup_db.ts')) {
  try {
    backupDatabase();
  } catch (err) {
    console.error('[Backup Error]', err);
    process.exit(1);
  }
}
