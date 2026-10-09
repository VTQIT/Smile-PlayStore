import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const APK_STORAGE_DIR = path.resolve(DATA_DIR, 'uploads', 'apks');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

function clearMarketplace() {
  console.log('--- STARTING MARKETPLACE CLEANUP ---');

  // 1. Delete all APK files
  if (fs.existsSync(APK_STORAGE_DIR)) {
    const files = fs.readdirSync(APK_STORAGE_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(APK_STORAGE_DIR, file));
      console.log(`Deleted APK: ${file}`);
    }
    console.log('APK storage cleared.');
  }

  // 2. Clear apps in database
  if (fs.existsSync(DB_FILE)) {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    const appCount = db.apps.length;
    db.apps = [];
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    console.log(`Cleared ${appCount} apps from database.`);
  }

  console.log('--- MARKETPLACE CLEANUP COMPLETE ---');
}

try {
  clearMarketplace();
} catch (err) {
  console.error('Cleanup error:', err);
  process.exit(1);
}
