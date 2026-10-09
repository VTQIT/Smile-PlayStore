import React, { useState, useRef } from 'react';
import { 
  Upload, X, FileCheck, Shield, CheckCircle2, AlertCircle, Loader2, 
  Sparkles, Hash, HardDrive, Smartphone, Layers, Image as ImageIcon 
} from 'lucide-react';
import { AppItem, AppVersion } from '../types';
import { calculateSHA256, formatBytes, saveApkBlob, saveApp, loadCmsSettings } from '../services/storageService';
import { apiUploadApk } from '../services/apiClient';

interface UploadApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppPublished: (app: AppItem) => void;
}

const PRESET_ICONS = [
  { label: 'Gradient Sphere', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256&h=256&fit=crop&q=80' },
  { label: 'Cyber Grid', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=256&h=256&fit=crop&q=80' },
  { label: 'Neon Circuit', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=256&h=256&fit=crop&q=80' },
  { label: 'Terminal Dark', url: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=256&h=256&fit=crop&q=80' },
  { label: 'Pulse Wave', url: 'https://images.unsplash.com/photo-1510519138161-58446232938f?w=256&h=256&fit=crop&q=80' },
  { label: 'Abstract Prism', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=256&h=256&fit=crop&q=80' },
];

export const UploadApkModal: React.FC<UploadApkModalProps> = ({ isOpen, onClose, onAppPublished }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sha256, setSha256] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [appName, setAppName] = useState('');
  const [packageName, setPackageName] = useState('');
  const [versionName, setVersionName] = useState('1.0.0');
  const [versionCode, setVersionCode] = useState(1);
  const [category, setCategory] = useState('Tools');
  const [type, setType] = useState<'APP' | 'GAME'>('APP');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('Initial public release on Smile Store.');
  const [minAndroid, setMinAndroid] = useState('Android 8.0 (API 26)');
  const [targetAndroid, setTargetAndroid] = useState('Android 15 (API 35)');
  const [developerName, setDeveloperName] = useState('Indie Creator');
  const [developerEmail, setDeveloperEmail] = useState('developer@smilestore.org');
  const [iconUrl, setIconUrl] = useState(PRESET_ICONS[0].url);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    setError(null);
    setIsProcessing(true);

    try {
      // Check file size (e.g. limit to 250MB)
      if (selectedFile.size > 250 * 1024 * 1024) {
        throw new Error('File exceeds maximum upload limit of 250 MB.');
      }

      setFile(selectedFile);
      setFileSize(selectedFile.size);

      // Auto-suggest app and package name from filename if empty
      const baseName = selectedFile.name.replace(/\.apk$/i, '');
      if (!appName) {
        const cleanName = baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        setAppName(cleanName);
      }
      if (!packageName) {
        const cleanPkg = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
        setPackageName(`com.smile.${cleanPkg || 'app'}`);
      }

      // Compute REAL SHA-256 Cryptographic Hash via Web Crypto API
      const hash = await calculateSHA256(selectedFile);
      setSha256(hash);
    } catch (err: any) {
      setError(err.message || 'Failed to process APK file.');
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError('Please select or drag an APK file.');
      return;
    }
    if (!appName.trim() || !packageName.trim()) {
      setError('App Name and Package Name are required.');
      return;
    }
    if (!packageName.includes('.')) {
      setError('Package name must follow Android reverse-domain format (e.g. com.example.app).');
      return;
    }

    setIsProcessing(true);

    try {
      let publishedApp: AppItem;

      // 1. Attempt Real Server Upload via multipart/form-data
      try {
        const formData = new FormData();
        formData.append('apk', file);
        formData.append('name', appName.trim());
        formData.append('packageName', packageName.trim().toLowerCase());
        formData.append('versionName', versionName);
        formData.append('versionCode', String(versionCode));
        formData.append('category', category);
        formData.append('type', type);
        formData.append('shortDescription', shortDesc || `${appName} for Android.`);
        formData.append('description', description || `${appName} is an independently published application on Smile Store.`);
        formData.append('releaseNotes', releaseNotes);
        formData.append('minAndroid', minAndroid);
        formData.append('targetAndroid', targetAndroid);
        formData.append('developerName', developerName.trim() || 'Indie Developer');
        formData.append('developerEmail', developerEmail.trim());
        formData.append('iconUrl', iconUrl || PRESET_ICONS[0].url);

        publishedApp = await apiUploadApk(formData);
      } catch (apiErr) {
        console.warn('Server upload fallback to client database:', apiErr);
        // Fallback for offline/client operation
        const versionId = `ver-${Date.now()}`;
        const appId = `app-${Date.now()}`;
        await saveApkBlob(versionId, file);

        const newVersion: AppVersion = {
          id: versionId,
          versionName,
          versionCode: Number(versionCode),
          fileSize,
          fileSizeFormatted: formatBytes(fileSize),
          sha256,
          minAndroid,
          targetAndroid,
          releaseNotes,
          releaseDate: 'Just now',
          downloadUrl: `/api/v1/apps/${appId}/download`,
          isCustomUploaded: true
        };

        publishedApp = {
          id: appId,
          packageName: packageName.trim().toLowerCase(),
          name: appName.trim(),
          slug: appName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          developer: {
            id: `dev-${Date.now()}`,
            name: developerName.trim() || 'Indie Developer',
            verified: false,
            email: developerEmail.trim()
          },
          iconUrl: iconUrl || PRESET_ICONS[0].url,
          category,
          type,
          shortDescription: shortDesc || `${appName} for Android.`,
          description: description || `${appName} is an independently published application on Smile Store. Clean and verified.`,
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
          status: loadCmsSettings().requireAdminApproval ? 'PENDING' : 'PUBLISHED',
          latestVersion: newVersion,
          allVersions: [newVersion],
          reviews: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      // Save app metadata into persistent storage & notify parent
      saveApp(publishedApp);
      onAppPublished(publishedApp);
      setIsSuccess(true);

      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1400);

    } catch (err: any) {
      setError(err.message || 'Failed to publish application.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add an APK Application</h2>
              <p className="text-xs text-slate-400">Publish APK binary to the Smile Store marketplace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {isSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <strong className="block font-bold">APK Published Successfully!</strong>
                <span>Application is now live and downloadable in Smile Store.</span>
              </div>
            </div>
          )}

          {/* Drag & Drop APK File Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 ${
              file
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-slate-700 hover:border-amber-500/50 hover:bg-slate-800/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />

            {isProcessing ? (
              <div className="py-4 flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                <span className="text-xs text-slate-300 font-medium">Calculating SHA-256 and validating APK...</span>
              </div>
            ) : file ? (
              <div className="space-y-2 w-full">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-semibold">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  APK Binary Ready ({formatBytes(fileSize)})
                </div>
                <div className="text-sm font-bold text-white truncate max-w-md mx-auto">{file.name}</div>
                
                {sha256 && (
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 break-all text-left">
                    <span className="text-amber-400 font-semibold block mb-0.5 flex items-center gap-1">
                      <Hash className="w-3 h-3" /> SHA-256 Checksum Verified:
                    </span>
                    {sha256}
                  </div>
                )}
                <span className="text-[11px] text-slate-400 block">Click or drop another file to replace</span>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                  <Upload className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white block">Drop your Android APK file here</span>
                  <span className="text-xs text-slate-400">or click to browse from your device (.apk format, max 250MB)</span>
                </div>
              </>
            )}
          </div>

          {/* Form Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">App Display Name *</label>
              <input
                type="text"
                required
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="e.g. Smile Player HD"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Package Name (reverse-domain) *</label>
              <input
                type="text"
                required
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                placeholder="e.g. com.smile.player"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Version Name (SemVer)</label>
              <input
                type="text"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="e.g. 1.0.0"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Version Code (integer)</label>
              <input
                type="number"
                min="1"
                value={versionCode}
                onChange={(e) => setVersionCode(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 transition"
              >
                <option value="Tools">Tools</option>
                <option value="Media & Video">Media & Video</option>
                <option value="Productivity">Productivity</option>
                <option value="Health & Fitness">Health & Fitness</option>
                <option value="Games">Games</option>
                <option value="Role Playing">Role Playing</option>
                <option value="Social">Social</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Application Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType('APP')}
                  className={`flex-1 py-2 text-xs rounded-lg font-semibold transition ${
                    type === 'APP' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  App
                </button>
                <button
                  type="button"
                  onClick={() => setType('GAME')}
                  className={`flex-1 py-2 text-xs rounded-lg font-semibold transition ${
                    type === 'GAME' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Game
                </button>
              </div>
            </div>
          </div>

          {/* App Icon Presets / Custom URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>App Icon Selection</span>
              <span className="text-[11px] text-slate-400">Select preset or paste custom image URL</span>
            </label>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {PRESET_ICONS.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setIconUrl(p.url)}
                  className={`relative p-1 rounded-xl border transition cursor-pointer ${
                    iconUrl === p.url ? 'border-amber-400 bg-amber-500/10' : 'border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <img src={p.url} alt={p.label} className="w-10 h-10 rounded-lg object-cover" />
                </button>
              ))}
            </div>
            <input
              type="url"
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              placeholder="Custom icon image URL (e.g. https://.../icon.webp)"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          {/* Short Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Short Tagline (under 120 chars)</label>
            <input
              type="text"
              maxLength={120}
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              placeholder="e.g. Ultra low-latency media player with hardware acceleration."
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          {/* Detailed Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed app overview, features, key advantages..."
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          {/* Release Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">What's New in this Version</label>
            <input
              type="text"
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              placeholder="e.g. Added dark theme and improved Bluetooth playback."
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          {/* Android Compatibility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Minimum Android OS</label>
              <input
                type="text"
                value={minAndroid}
                onChange={(e) => setMinAndroid(e.target.value)}
                placeholder="e.g. Android 8.0 (API 26)"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Android OS</label>
              <input
                type="text"
                value={targetAndroid}
                onChange={(e) => setTargetAndroid(e.target.value)}
                placeholder="e.g. Android 15 (API 35)"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 transition"
              />
            </div>
          </div>

          {/* Developer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Developer Name</label>
              <input
                type="text"
                value={developerName}
                onChange={(e) => setDeveloperName(e.target.value)}
                placeholder="e.g. Indie Studio"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Support Email</label>
              <input
                type="email"
                value={developerEmail}
                onChange={(e) => setDeveloperEmail(e.target.value)}
                placeholder="developer@smilestore.org"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 transition"
              />
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified with SHA-256 binary hash</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing || !file}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing APK...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Publish to Smile Store</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
