import React, { useState, useEffect } from 'react';
import { 
  Shield, Lock, UserCheck, AlertTriangle, CheckCircle2, XCircle, 
  Settings as SettingsIcon, Download, Edit3, Trash2, Plus, Search, 
  Check, X, Eye, FileText, Database, Server, HardDrive, RefreshCw, 
  LogOut, ShieldAlert, Sparkles, Sliders, ExternalLink, Activity
} from 'lucide-react';
import { AppItem, AppVersion, AUTHORIZED_ADMIN_EMAILS, CmsSettings, CmsAuditLog } from '../types';
import { 
  loadCmsSettings, saveCmsSettings, loadAuditLogs, recordAuditLog, 
  loadAdminSession, saveAdminSession, saveApp, deleteSavedApp 
} from '../services/storageService';
import { 
  apiAdminLogin, apiUpdateAdminApp, apiDeleteAdminApp, 
  apiFetchAdminSettings, apiSaveAdminSettings, apiFetchAdminAuditLogs,
  apiFetchStorageStatus
} from '../services/apiClient';

interface AdminPanelProps {
  apps: AppItem[];
  onUpdateApp: (updatedApp: AppItem) => void;
  onDeleteApp: (appId: string) => void;
  onTriggerDownload: (app: AppItem, version?: AppVersion) => void;
  onOpenUploadModal: () => void;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  apps,
  onUpdateApp,
  onDeleteApp,
  onTriggerDownload,
  onOpenUploadModal,
  onClose
}) => {
  // Authentication State
  const [currentAdminEmail, setCurrentAdminEmail] = useState<string | null>(() => loadAdminSession());
  const [loginInputEmail, setLoginInputEmail] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // CMS Sub-Tabs
  const [activeTab, setActiveTab] = useState<'apps' | 'settings' | 'logs'>('apps');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'PENDING' | 'SUSPENDED'>('ALL');

  // Settings State
  const [settings, setSettings] = useState<CmsSettings>(() => loadCmsSettings());
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<CmsAuditLog[]>(() => loadAuditLogs());

  // Editing App Modal State
  const [editingApp, setEditingApp] = useState<AppItem | null>(null);

  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState<any>(null);

  const isAuthorized = currentAdminEmail && AUTHORIZED_ADMIN_EMAILS.includes(currentAdminEmail as any);

  useEffect(() => {
    if (isAuthorized) {
      apiFetchStorageStatus().then(st => setStorageStatus(st)).catch(() => {});
    }
  }, [isAuthorized]);

  // Handle Login Attempt
  const handleLogin = async (emailToVerify: string) => {
    const cleanEmail = emailToVerify.trim().toLowerCase();
    if (AUTHORIZED_ADMIN_EMAILS.includes(cleanEmail as any)) {
      try {
        const res = await apiAdminLogin(cleanEmail);
        setAdminToken(res.token);
      } catch (e) {
        console.warn('API login notice:', e);
      }
      setCurrentAdminEmail(cleanEmail);
      saveAdminSession(cleanEmail);
      setAuthError(null);
      recordAuditLog({
        actorEmail: cleanEmail,
        action: 'SETTINGS_UPDATED',
        target: 'Admin Session',
        details: `Administrator logged into CMS console.`
      });
      setAuditLogs(loadAuditLogs());
    } else {
      setAuthError(`Access Denied: "${emailToVerify}" is not authorized. Only admin@mvp.com.ai and fileslanaja@gmail.com have CMS administrative clearance.`);
    }
  };

  const handleLogout = () => {
    if (currentAdminEmail) {
      recordAuditLog({
        actorEmail: currentAdminEmail,
        action: 'SETTINGS_UPDATED',
        target: 'Admin Session',
        details: `Administrator signed out.`
      });
    }
    setCurrentAdminEmail(null);
    setAdminToken(null);
    saveAdminSession(null);
    setAuditLogs(loadAuditLogs());
  };

  // Change Application Status (Approve / Suspend / Restore)
  const handleStatusChange = async (app: AppItem, newStatus: 'PUBLISHED' | 'PENDING' | 'SUSPENDED') => {
    if (!currentAdminEmail) return;

    const updatedApp: AppItem = {
      ...app,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };

    try {
      await apiUpdateAdminApp(app.id, { status: newStatus }, adminToken || undefined, currentAdminEmail);
    } catch (e) {
      console.warn('Backend update sync note:', e);
    }

    saveApp(updatedApp);
    onUpdateApp(updatedApp);

    const actionMap: Record<string, CmsAuditLog['action']> = {
      PUBLISHED: 'APP_APPROVED',
      SUSPENDED: 'APP_SUSPENDED',
      PENDING: 'APP_EDITED'
    };

    recordAuditLog({
      actorEmail: currentAdminEmail,
      action: actionMap[newStatus] || 'APP_EDITED',
      target: app.name,
      details: `Changed status of package ${app.packageName} to ${newStatus}.`
    });

    setAuditLogs(loadAuditLogs());
  };

  // Save App Edits
  const handleSaveAppEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp || !currentAdminEmail) return;

    try {
      await apiUpdateAdminApp(editingApp.id, editingApp, adminToken || undefined, currentAdminEmail);
    } catch (err) {
      console.warn('Backend edit sync note:', err);
    }

    saveApp(editingApp);
    onUpdateApp(editingApp);

    recordAuditLog({
      actorEmail: currentAdminEmail,
      action: 'APP_EDITED',
      target: editingApp.name,
      details: `Updated metadata for ${editingApp.packageName} (version ${editingApp.latestVersion.versionName}, rating ${editingApp.rating}).`
    });

    setAuditLogs(loadAuditLogs());
    setEditingApp(null);
  };

  // Delete App
  const handleDeleteAppWithAudit = async (app: AppItem) => {
    if (!currentAdminEmail) return;
    if (window.confirm(`Are you sure you want to permanently delete "${app.name}" (${app.packageName}) from the marketplace?`)) {
      try {
        await apiDeleteAdminApp(app.id, adminToken || undefined, currentAdminEmail);
      } catch (e) {
        console.warn('Backend delete sync note:', e);
      }

      deleteSavedApp(app.id);
      onDeleteApp(app.id);

      recordAuditLog({
        actorEmail: currentAdminEmail,
        action: 'APP_DELETED',
        target: app.name,
        details: `Deleted app package ${app.packageName} from storage and catalog.`
      });

      setAuditLogs(loadAuditLogs());
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdminEmail) return;

    try {
      await apiSaveAdminSettings(settings, adminToken || undefined, currentAdminEmail);
    } catch (err) {
      console.warn('Backend settings sync note:', err);
    }

    saveCmsSettings(settings);
    setSettingsSavedToast(true);

    recordAuditLog({
      actorEmail: currentAdminEmail,
      action: 'SETTINGS_UPDATED',
      target: 'System Settings',
      details: `Updated marketplace configuration (Max upload: ${settings.maxUploadSizeMB}MB, Storage: ${settings.storageProvider}).`
    });

    setAuditLogs(loadAuditLogs());
    setTimeout(() => setSettingsSavedToast(false), 2500);
  };

  // Filter apps
  const filteredApps = apps.filter(app => {
    if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        app.name.toLowerCase().includes(q) ||
        app.packageName.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate Metrics
  const totalApps = apps.length;
  const publishedApps = apps.filter(a => a.status === 'PUBLISHED').length;
  const pendingApps = apps.filter(a => a.status === 'PENDING').length;
  const suspendedApps = apps.filter(a => a.status === 'SUSPENDED').length;
  const totalDownloads = apps.reduce((sum, a) => sum + a.downloadCount, 0);

  // If NOT authorized, render the Admin Gate
  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
          
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
              <ShieldAlert className="w-7 h-7" />
            </div>
            
            <h2 className="text-xl font-black text-white">CMS Admin Dashboard Gate</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Restricted Area. Per security specification, access is strictly limited to authorized administrative email accounts.
            </p>
          </div>

          {authError && (
            <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* Login Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin(loginInputEmail);
            }}
            className="mt-5 space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Enter Administrator Email
              </label>
              <input
                type="email"
                required
                value={loginInputEmail}
                onChange={(e) => setLoginInputEmail(e.target.value)}
                placeholder="e.g. admin@mvp.com.ai"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              Authenticate Admin Access
            </button>
          </form>

          {/* Quick Click for Authorized Accounts */}
          <div className="mt-6 pt-5 border-t border-slate-800 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
              Authorized Whitelist Accounts:
            </span>
            <div className="space-y-1.5">
              {AUTHORIZED_ADMIN_EMAILS.map((email) => (
                <button
                  key={email}
                  type="button"
                  onClick={() => handleLogin(email)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 text-xs text-slate-200 font-mono flex items-center justify-between group transition cursor-pointer"
                >
                  <span className="font-semibold text-amber-300">{email}</span>
                  <span className="text-[10px] text-slate-400 group-hover:text-white flex items-center gap-1">
                    <span>Sign In</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
              Return to Marketplace
            </button>
          </div>

        </div>
      </div>
    );
  }

  // AUTHORIZED ADMIN CMS DASHBOARD
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden min-h-screen sm:min-h-[85vh] text-slate-100 flex flex-col my-0 sm:my-6">
        
        {/* Top CMS Header */}
        <header className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-black text-lg shadow">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-white">Smile Store CMS Administration</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Live Production Access
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Logged in as: <strong className="text-amber-300 font-mono">{currentAdminEmail}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenUploadModal}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add / Upload APK</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Sign out of CMS"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Secondary CMS Sub-Navigation Tabs */}
        <div className="px-6 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('apps')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'apps' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Applications ({totalApps})</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'settings' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>Marketplace Settings</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'logs' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Audit Logs ({auditLogs.length})</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-4 text-[11px] font-mono text-slate-400">
            <span>Published: <strong className="text-emerald-400">{publishedApps}</strong></span>
            <span>Pending: <strong className="text-amber-400">{pendingApps}</strong></span>
            <span>Suspended: <strong className="text-rose-400">{suspendedApps}</strong></span>
            <span>Installs: <strong className="text-cyan-400">{totalDownloads.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* CMS Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: APPLICATIONS MANAGEMENT */}
          {activeTab === 'apps' && (
            <div className="space-y-4">
              
              {/* Filter bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search package name, title..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto text-xs">
                  <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">Status Filter:</span>
                  {(['ALL', 'PUBLISHED', 'PENDING', 'SUSPENDED'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition text-[11px] cursor-pointer ${
                        statusFilter === st
                          ? 'bg-slate-700 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Applications Data Table */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4 font-bold">App & Identifier</th>
                        <th className="py-3 px-4 font-bold">Status</th>
                        <th className="py-3 px-4 font-bold">Version & Size</th>
                        <th className="py-3 px-4 font-bold">Downloads & Rating</th>
                        <th className="py-3 px-4 font-bold">SHA-256 Checksum</th>
                        <th className="py-3 px-4 font-bold text-right">Moderation Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredApps.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">
                            No applications match the current filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredApps.map((app) => (
                          <tr key={app.id} className="hover:bg-slate-900/50 transition">
                            {/* App & Identifier */}
                            <td className="py-3 px-4 flex items-center gap-3">
                              <img src={app.iconUrl} alt={app.name} className="w-9 h-9 rounded-xl object-cover bg-slate-800 shrink-0" />
                              <div>
                                <span className="font-bold text-white block">{app.name}</span>
                                <span className="font-mono text-[11px] text-cyan-400">{app.packageName}</span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                app.status === 'PUBLISHED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : app.status === 'PENDING'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}>
                                {app.status}
                              </span>
                            </td>

                            {/* Version & Size */}
                            <td className="py-3 px-4 font-mono text-[11px]">
                              <span className="text-white block font-semibold">v{app.latestVersion.versionName} ({app.latestVersion.versionCode})</span>
                              <span className="text-slate-400">{app.latestVersion.fileSizeFormatted}</span>
                            </td>

                            {/* Downloads & Rating */}
                            <td className="py-3 px-4">
                              <span className="font-bold text-white block">{app.downloadCountFormatted} installs</span>
                              <span className="text-amber-400 text-[11px]">{app.rating.toFixed(1)} ★ ({app.ratingCount})</span>
                            </td>

                            {/* SHA-256 */}
                            <td className="py-3 px-4 font-mono text-[10px] text-slate-400 max-w-[130px] truncate" title={app.latestVersion.sha256}>
                              {app.latestVersion.sha256.substring(0, 16)}...
                            </td>

                            {/* Moderation Actions */}
                            <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                              {/* Direct APK Download */}
                              <button
                                onClick={() => onTriggerDownload(app)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                                title="Download APK Binary"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Metadata */}
                              <button
                                onClick={() => setEditingApp(app)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 transition"
                                title="Edit Application"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Approve (if not published) */}
                              {app.status !== 'PUBLISHED' && (
                                <button
                                  onClick={() => handleStatusChange(app, 'PUBLISHED')}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 transition"
                                  title="Approve / Publish"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>
                              )}

                              {/* Suspend (if published) */}
                              {app.status === 'PUBLISHED' && (
                                <button
                                  onClick={() => handleStatusChange(app, 'SUSPENDED')}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 transition"
                                  title="Suspend Application"
                                >
                                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>
                              )}

                              {/* Delete App */}
                              <button
                                onClick={() => handleDeleteAppWithAudit(app)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 transition"
                                title="Delete from Store"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: MARKETPLACE CMS SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="max-w-2xl space-y-5 text-xs">
              
              {settingsSavedToast && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>CMS Settings saved and updated successfully across the marketplace!</span>
                </div>
              )}

              <div className="space-y-4 p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  General Marketplace Configuration
                </h3>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Marketplace Branding Name</label>
                  <input
                    type="text"
                    value={settings.storeName}
                    onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Marketplace Tagline</label>
                  <input
                    type="text"
                    value={settings.tagline}
                    onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-850">
                  <div>
                    <span className="font-semibold text-white block">Require Admin Review before Publishing</span>
                    <span className="text-[11px] text-slate-400">If enabled, new developer APK uploads go to "PENDING" queue until approved.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.requireAdminApproval}
                    onChange={(e) => setSettings({ ...settings, requireAdminApproval: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-850">
                  <div>
                    <span className="font-semibold text-white block">Allow Public Developer Uploads</span>
                    <span className="text-[11px] text-slate-400">Permit community developers to submit APK files.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.allowPublicUploads}
                    onChange={(e) => setSettings({ ...settings, allowPublicUploads: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-850">
                  <div>
                    <span className="font-semibold text-rose-400 block">Marketplace Maintenance Mode</span>
                    <span className="text-[11px] text-slate-400">Lock down the marketplace for database updates or infrastructure maintenance.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                    className="w-4 h-4 accent-rose-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Cloud & Object Storage Settings */}
              <div className="space-y-4 p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-cyan-400" />
                    Cloud Object Storage & CDN Settings
                  </h3>
                  {storageStatus?.configured ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      R2 Connected ($0 Egress)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Local Storage Fallback
                    </span>
                  )}
                </div>

                {/* Cloudflare R2 Live Status Card */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-300">Cloudflare R2 Free Allowance Tier:</span>
                    <span className="text-amber-400 font-mono">10 GB Free Storage • $0 Egress</span>
                  </div>
                  <p className="text-slate-400">
                    {storageStatus?.configured
                      ? `Active bucket: "${storageStatus.bucket}" (Region: ${storageStatus.region}). Downloads are served via secure 5-minute time-limited presigned URLs directly from Cloudflare R2 edge.`
                      : `To activate Cloudflare R2 on its free allowance, configure STORAGE_PROVIDER="cloudflare_r2", STORAGE_BUCKET, STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, and STORAGE_SECRET_KEY in server environment variables. The server seamlessly maintains local backups in the meantime.`}
                  </p>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Max APK File Size Cap (MB)</label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={settings.maxUploadSizeMB}
                    onChange={(e) => setSettings({ ...settings, maxUploadSizeMB: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">S3-Compatible Storage Provider</label>
                  <select
                    value={settings.storageProvider}
                    onChange={(e) => setSettings({ ...settings, storageProvider: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="cloudflare_r2">Cloudflare R2 (Recommended - Zero Egress Fees)</option>
                    <option value="backblaze_b2">Backblaze B2 (S3 Compatible)</option>
                    <option value="aws_s3">AWS S3 (Amazon Web Services)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">CDN Edge Domain</label>
                  <input
                    type="text"
                    value={settings.cdnDomain}
                    onChange={(e) => setSettings({ ...settings, cdnDomain: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Save CMS Settings
                </button>
              </div>

            </form>
          )}

          {/* TAB 3: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Immutable Administrative Audit Logs</h3>
                  <p className="text-xs text-slate-400">All sensitive approvals, suspensions, edits, and configuration changes are recorded.</p>
                </div>
                <span className="text-[11px] font-mono text-slate-500">Latest 100 entries</span>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4 font-bold">Timestamp</th>
                        <th className="py-3 px-4 font-bold">Actor Email</th>
                        <th className="py-3 px-4 font-bold">Action</th>
                        <th className="py-3 px-4 font-bold">Target</th>
                        <th className="py-3 px-4 font-bold">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-900/40">
                          <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                          <td className="py-2.5 px-4 text-amber-300 font-semibold">{log.actorEmail}</td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-cyan-300 font-bold">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-white font-sans font-semibold">{log.target}</td>
                          <td className="py-2.5 px-4 text-slate-400 font-sans">{log.details || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* EDIT APP MODAL */}
        {editingApp && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  Edit Application: {editingApp.name}
                </h3>
                <button
                  onClick={() => setEditingApp(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAppEdit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={editingApp.name}
                    onChange={(e) => setEditingApp({ ...editingApp, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Status</label>
                    <select
                      value={editingApp.status}
                      onChange={(e) => setEditingApp({ ...editingApp, status: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="PUBLISHED">PUBLISHED</option>
                      <option value="PENDING">PENDING</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Category</label>
                    <input
                      type="text"
                      value={editingApp.category}
                      onChange={(e) => setEditingApp({ ...editingApp, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Version Name</label>
                    <input
                      type="text"
                      value={editingApp.latestVersion.versionName}
                      onChange={(e) => setEditingApp({
                        ...editingApp,
                        latestVersion: { ...editingApp.latestVersion, versionName: e.target.value }
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Version Code</label>
                    <input
                      type="number"
                      value={editingApp.latestVersion.versionCode}
                      onChange={(e) => setEditingApp({
                        ...editingApp,
                        latestVersion: { ...editingApp.latestVersion, versionCode: Number(e.target.value) }
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Rating (1.0 to 5.0)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="5.0"
                      value={editingApp.rating}
                      onChange={(e) => setEditingApp({ ...editingApp, rating: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Download Count</label>
                    <input
                      type="number"
                      value={editingApp.downloadCount}
                      onChange={(e) => {
                        const count = Number(e.target.value);
                        setEditingApp({
                          ...editingApp,
                          downloadCount: count,
                          downloadCountFormatted: count >= 1000 ? `${Math.round(count / 1000)}K+` : `${count}`
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Short Description</label>
                  <input
                    type="text"
                    value={editingApp.shortDescription}
                    onChange={(e) => setEditingApp({ ...editingApp, shortDescription: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Full Description</label>
                  <textarea
                    rows={3}
                    value={editingApp.description}
                    onChange={(e) => setEditingApp({ ...editingApp, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="featuredCheckbox"
                    checked={editingApp.featured || false}
                    onChange={(e) => setEditingApp({ ...editingApp, featured: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                  <label htmlFor="featuredCheckbox" className="text-slate-300 cursor-pointer">
                    Display as Featured Hero Spotlight on Store Home
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingApp(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
