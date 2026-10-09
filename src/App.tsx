import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Download, Plus, Star, Shield, HardDrive, Smartphone, 
  Layers, CheckCircle2, AlertTriangle, ArrowRight, Upload, Sparkles, 
  Filter, Grid, Clock, Heart, BookOpen, ExternalLink, RefreshCw, 
  ChevronRight, Trash2, ShieldCheck, Check, Laptop, Terminal, Database
} from 'lucide-react';
import { AppItem, AppVersion, Review, DownloadHistoryItem } from './types';
import { INITIAL_APPS, CATEGORIES } from './data/mockApps';
import { loadSavedApps, loadDownloadHistory, deleteSavedApp, saveApp, loadCmsSettings } from './services/storageService';
import { apiFetchApps, apiSubmitReview } from './services/apiClient';
import { AppCard } from './components/AppCard';
import { AppDetailsModal } from './components/AppDetailsModal';
import { UploadApkModal } from './components/UploadApkModal';
import { DownloadProgressModal } from './components/DownloadProgressModal';
import { AdminPanel } from './components/AdminPanel';

export default function App() {
  // Navigation & View mode
  const [currentView, setCurrentView] = useState<'store' | 'developer' | 'library' | 'architecture'>('store');
  
  // CMS Settings & Admin Modal State
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [cmsSettings, setCmsSettings] = useState(() => loadCmsSettings());
  
  // Apps state: combine built-in seed apps with custom uploaded apps from localStorage
  const [apps, setApps] = useState<AppItem[]>(() => {
    const saved = loadSavedApps();
    return [...saved, ...INITIAL_APPS];
  });

  // Selected filters
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabType, setActiveTabType] = useState<'ALL' | 'APP' | 'GAME'>('ALL');

  // Modals
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [downloadingApp, setDownloadingApp] = useState<{ app: AppItem; version?: AppVersion } | null>(null);

  // Download history
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistoryItem[]>(() => loadDownloadHistory());

  // Fetch real apps from backend on mount
  useEffect(() => {
    let isMounted = true;
    apiFetchApps().then((serverApps) => {
      if (isMounted && serverApps && serverApps.length > 0) {
        setApps(serverApps);
      }
    }).catch((err) => {
      console.warn('Initial backend sync note:', err);
    });
    return () => { isMounted = false; };
  }, []);

  // Reload downloads when library is viewed
  useEffect(() => {
    setDownloadHistory(loadDownloadHistory());
  }, [currentView]);

  // Handle newly published custom APK
  const handleAppPublished = (newApp: AppItem) => {
    setApps(prev => [newApp, ...prev.filter(a => a.id !== newApp.id)]);
    setSelectedApp(newApp); // immediately open its store page
  };

  // Handle successful download completion (increment counter)
  const handleDownloadCompleted = (appId: string) => {
    setApps(prev => prev.map(a => {
      if (a.id === appId) {
        const newCount = a.downloadCount + 1;
        const updated = {
          ...a,
          downloadCount: newCount,
          downloadCountFormatted: newCount >= 1000 ? `${Math.round(newCount / 1000)}K+` : `${newCount}`
        };
        saveApp(updated);
        return updated;
      }
      return a;
    }));
    setDownloadHistory(loadDownloadHistory());
  };

  // Handle user review submission
  const handleAddReview = async (appId: string, review: Review) => {
    try {
      await apiSubmitReview(appId, {
        userName: review.userName,
        rating: review.rating,
        comment: review.comment,
        versionCode: review.versionCode
      });
    } catch (e) {
      console.warn('Server review submission note:', e);
    }

    setApps(prev => prev.map(a => {
      if (a.id === appId) {
        const updatedReviews = [review, ...a.reviews];
        const newRating = Number((updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length).toFixed(1));
        const updatedApp = {
          ...a,
          reviews: updatedReviews,
          rating: newRating,
          ratingCount: a.ratingCount + 1
        };
        saveApp(updatedApp);
        if (selectedApp && selectedApp.id === appId) {
          setSelectedApp(updatedApp);
        }
        return updatedApp;
      }
      return a;
    }));
  };

  // Handle deleting custom uploaded app
  const handleDeleteApp = (appId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSavedApp(appId);
    setApps(prev => prev.filter(a => a.id !== appId));
    if (selectedApp?.id === appId) {
      setSelectedApp(null);
    }
  };

  // Filtered Apps List (for Public Store)
  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      // Only show published apps in public store
      if (app.status !== 'PUBLISHED') return false;

      // Type filter (Apps vs Games)
      if (activeTabType !== 'ALL' && app.type !== activeTabType) return false;

      // Category filter
      if (selectedCategory !== 'All' && selectedCategory !== 'Top Charts' && selectedCategory !== 'For You') {
        if (app.category !== selectedCategory) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = app.name.toLowerCase().includes(query);
        const matchesPkg = app.packageName.toLowerCase().includes(query);
        const matchesCat = app.category.toLowerCase().includes(query);
        const matchesDesc = app.description.toLowerCase().includes(query);
        const matchesDev = app.developer.name.toLowerCase().includes(query);
        if (!matchesName && !matchesPkg && !matchesCat && !matchesDesc && !matchesDev) {
          return false;
        }
      }

      return true;
    });
  }, [apps, selectedCategory, searchQuery, activeTabType]);

  // Featured Apps for Hero Carousel
  const featuredApps = useMemo(() => apps.filter(a => a.featured && a.status === 'PUBLISHED'), [apps]);

  // Top Charts Apps
  const topChartApps = useMemo(() => [...apps].filter(a => a.status === 'PUBLISHED').sort((a, b) => b.downloadCount - a.downloadCount).slice(0, 5), [apps]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Play Store Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          
          {/* Logo & Brand Identity */}
          <div 
            onClick={() => { setCurrentView('store'); setSelectedCategory('All'); setSearchQuery(''); }}
            className="flex items-center space-x-3 cursor-pointer shrink-0"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl">
              ☺
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">Smile Store</span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Android Marketplace
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">"Your independent Android app marketplace."</p>
            </div>
          </div>

          {/* Search Bar (Like Google Play) */}
          <div className="flex-1 max-w-xl relative">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); if (currentView !== 'store') setCurrentView('store'); }}
                placeholder="Search apps, games, packages (e.g. com.smile.player)..."
                className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-800/90 border border-slate-700/80 text-white text-xs placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:bg-slate-800 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Top Actions: Add APK, Admin CMS & Nav Modes */}
          <div className="flex items-center gap-2">
            {/* Direct "+ Add APK" Button */}
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs transition shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add APK</span>
            </button>

            {/* Admin CMS Access Button */}
            <button
              onClick={() => setIsAdminOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-750 hover:border-amber-500/50 font-bold text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="CMS Admin Dashboard (Restricted: admin@mvp.com.ai & fileslanaja@gmail.com)"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin CMS</span>
            </button>

            {/* View Switchers */}
            <div className="hidden md:flex items-center bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60 text-xs">
              <button
                onClick={() => setCurrentView('store')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  currentView === 'store' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                Store
              </button>
              <button
                onClick={() => setCurrentView('developer')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  currentView === 'developer' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                Developer
              </button>
              <button
                onClick={() => setCurrentView('library')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 ${
                  currentView === 'library' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>Downloads</span>
                {downloadHistory.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                    {downloadHistory.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setCurrentView('architecture')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  currentView === 'architecture' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                System Blueprint
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Category Ribbon (Play Store Style) */}
        {currentView === 'store' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto no-scrollbar py-2 border-t border-slate-800/60 text-xs">
            {/* Apps / Games Switcher */}
            <div className="flex bg-slate-800/90 rounded-lg p-0.5 border border-slate-700/60 mr-2 shrink-0">
              <button
                onClick={() => setActiveTabType('ALL')}
                className={`px-3 py-1 rounded-md font-semibold ${activeTabType === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTabType('APP')}
                className={`px-3 py-1 rounded-md font-semibold ${activeTabType === 'APP' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Apps
              </button>
              <button
                onClick={() => setActiveTabType('GAME')}
                className={`px-3 py-1 rounded-md font-semibold ${activeTabType === 'GAME' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Games
              </button>
            </div>

            {/* Category Pills */}
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'bg-slate-800/60 text-slate-400 border border-slate-700/40 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Maintenance Mode Alert Banner */}
      {cmsSettings.maintenanceMode && (
        <div className="bg-rose-950/90 border-b border-rose-800/80 px-4 py-2 text-center text-xs text-rose-200 font-semibold flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>Marketplace Maintenance Mode Active: Public submissions are currently read-only. (Configured in CMS Admin)</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        
        {/* VIEW 1: PLAY STORE MAIN PAGE */}
        {currentView === 'store' && (
          <div className="space-y-8">
            
            {/* Top Action Banner when no search */}
            {!searchQuery && selectedCategory === 'All' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Featured Hero App (Spotlight) */}
                {featuredApps[0] && (
                  <div 
                    onClick={() => setSelectedApp(featuredApps[0])}
                    className="lg:col-span-2 relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 group cursor-pointer shadow-xl min-h-[260px] flex flex-col justify-end p-6 sm:p-8"
                  >
                    <img 
                      src={featuredApps[0].bannerUrl || featuredApps[0].screenshots[0]} 
                      alt={featuredApps[0].name}
                      className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
                    
                    <div className="relative z-10 space-y-3">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Featured Application</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white">{featuredApps[0].name}</h2>
                      <p className="text-xs sm:text-sm text-slate-300 max-w-xl line-clamp-2">
                        {featuredApps[0].shortDescription}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-4 pt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDownloadingApp({ app: featuredApps[0] }); }}
                          className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
                        >
                          <Download className="w-4 h-4 stroke-[2.5]" />
                          <span>Download APK ({featuredApps[0].latestVersion.fileSizeFormatted})</span>
                        </button>
                        <span className="text-xs font-mono text-slate-400">
                          {featuredApps[0].downloadCountFormatted} downloads • v{featuredApps[0].latestVersion.versionName}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* "Publish Your Own APK" Quick Action Card */}
                <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-6 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-3">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Independent Developers</span>
                    <h3 className="text-lg font-bold text-white mt-1">Have an Android APK?</h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Upload your compiled APK binary directly to Smile Store. We calculate the SHA-256 digest, verify AndroidManifest integrity, and make it immediately downloadable to users worldwide.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-800">
                    <button
                      onClick={() => setIsUploadOpen(true)}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Upload & Publish APK</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Top Charts Row */}
            {!searchQuery && selectedCategory === 'All' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Top Free Applications</h3>
                    <p className="text-xs text-slate-400">Most downloaded verified APK packages on Smile Store</p>
                  </div>
                  <button 
                    onClick={() => setSelectedCategory('Top Charts')}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <span>See All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {topChartApps.map((app, idx) => (
                    <AppCard
                      key={app.id}
                      app={app}
                      rank={idx + 1}
                      onSelect={(a) => setSelectedApp(a)}
                      onQuickDownload={(a, e) => {
                        e.stopPropagation();
                        setDownloadingApp({ app: a });
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All / Filtered Apps Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {searchQuery
                      ? `Search Results for "${searchQuery}" (${filteredApps.length})`
                      : selectedCategory === 'All'
                      ? 'Recommended for You'
                      : `${selectedCategory} (${filteredApps.length})`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {searchQuery ? 'Matching application names, descriptions, and package identifiers' : 'Independent apps verified with cryptographic SHA-256 hashes'}
                  </p>
                </div>

                {filteredApps.length > 0 && (
                  <span className="text-xs text-slate-500 font-mono">
                    Showing {filteredApps.length} apps
                  </span>
                )}
              </div>

              {filteredApps.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <Search className="w-6 h-6 text-amber-400" />
                  </div>
                  <h4 className="text-base font-bold text-white">No applications found</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    We could not find any applications matching your query. Would you like to upload this APK to Smile Store?
                  </p>
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                  >
                    Upload APK File
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredApps.map((app) => (
                    <AppCard
                      key={app.id}
                      app={app}
                      onSelect={(a) => setSelectedApp(a)}
                      onQuickDownload={(a, e) => {
                        e.stopPropagation();
                        setDownloadingApp({ app: a });
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* VIEW 2: DEVELOPER PORTAL / MY APPS */}
        {currentView === 'developer' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Developer Console</span>
                <h2 className="text-2xl font-black text-white mt-1">Application Catalog & Version Management</h2>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Manage your independently published Android applications, release updates, monitor SHA-256 binary digests, and view install statistics.
                </p>
              </div>

              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Upload New APK</span>
              </button>
            </div>

            {/* Apps table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4 font-bold">App & Package</th>
                      <th className="py-3.5 px-4 font-bold">Category</th>
                      <th className="py-3.5 px-4 font-bold">Latest Version</th>
                      <th className="py-3.5 px-4 font-bold">File Size</th>
                      <th className="py-3.5 px-4 font-bold">Total Installs</th>
                      <th className="py-3.5 px-4 font-bold">SHA-256 Digest</th>
                      <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {apps.map((app) => (
                      <tr 
                        key={app.id} 
                        className="hover:bg-slate-850/60 transition cursor-pointer"
                        onClick={() => setSelectedApp(app)}
                      >
                        <td className="py-3.5 px-4 flex items-center gap-3">
                          <img src={app.iconUrl} alt={app.name} className="w-9 h-9 rounded-xl object-cover bg-slate-800" />
                          <div>
                            <span className="font-bold text-white block">{app.name}</span>
                            <span className="font-mono text-[11px] text-slate-400">{app.packageName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] text-slate-300 font-medium">
                            {app.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-white">
                          v{app.latestVersion.versionName} ({app.latestVersion.versionCode})
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          {app.latestVersion.fileSizeFormatted}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-400">
                          {app.downloadCountFormatted}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 max-w-[140px] truncate" title={app.latestVersion.sha256}>
                          {app.latestVersion.sha256.substring(0, 16)}...
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDownloadingApp({ app });
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                            title="Download APK"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          
                          {/* If custom uploaded, allow deletion */}
                          {app.latestVersion.isCustomUploaded && (
                            <button
                              onClick={(e) => handleDeleteApp(app.id, e)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                              title="Delete from Catalog"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: DOWNLOADS / LIBRARY */}
        {currentView === 'library' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Device Storage</span>
                <h2 className="text-2xl font-black text-white mt-1">Downloaded APK Packages</h2>
                <p className="text-xs text-slate-400 mt-1">
                  History of APK binaries downloaded to this device from Smile Store.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-slate-800 text-xs font-mono text-slate-300">
                  {downloadHistory.length} Package{downloadHistory.length === 1 ? '' : 's'} Downloaded
                </span>
              </div>
            </div>

            {downloadHistory.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <Download className="w-6 h-6 text-amber-400" />
                </div>
                <h4 className="text-base font-bold text-white">No downloads yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Browse the store and click "Install" on any app to download its APK binary directly to your device!
                </p>
                <button
                  onClick={() => setCurrentView('store')}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  Explore Store Apps
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {downloadHistory.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <img src={item.iconUrl} alt={item.appName} className="w-12 h-12 rounded-2xl object-cover bg-slate-800" />
                      <div>
                        <h4 className="font-bold text-white text-sm">{item.appName}</h4>
                        <span className="text-[11px] font-mono text-slate-400 block">{item.packageName}</span>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400 font-mono">
                          <span className="text-amber-400 font-semibold">v{item.versionName}</span>
                          <span>•</span>
                          <span>{item.fileSizeFormatted}</span>
                          <span>•</span>
                          <span>Downloaded at {item.timestamp}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const target = apps.find(a => a.id === item.appId) || apps[0];
                        setDownloadingApp({ app: target });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Re-download</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: SYSTEM ARCHITECTURE BLUEPRINT (From Phase 1) */}
        {currentView === 'architecture' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">System Architecture</span>
                <h2 className="text-2xl font-black text-white mt-1">Cloud Architecture & Capacity Blueprint</h2>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Smile Store's Phase 1 architecture specification: decoupled API, S3 presigned URL downloads, and zero egress cost design.
                </p>
              </div>

              <button
                onClick={() => setCurrentView('store')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Back to Store
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-emerald-400 block mb-1">Direct CDN Downloads</span>
                <p className="text-slate-400">Express API issues 5-minute presigned S3 URLs. APK downloads stream directly from Cloudflare R2 to client devices with zero server CPU/RAM load.</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-cyan-400 block mb-1">Zero Binary Blobs in DB</span>
                <p className="text-slate-400">PostgreSQL 16 holds strict metadata (SHA-256, package names, version codes). All APK files are stored in object storage.</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-amber-400 block mb-1">PackageInstaller Session API</span>
                <p className="text-slate-400">The native Android client uses Android's PackageInstaller Session API for secure background installation on Android 8.0 through Android 15.</p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Floating Bottom Navigation Bar for Mobile */}
      <nav className="md:hidden sticky bottom-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-4 py-2 flex items-center justify-around text-[10px]">
        <button
          onClick={() => setCurrentView('store')}
          className={`flex flex-col items-center gap-1 ${currentView === 'store' ? 'text-amber-400 font-bold' : 'text-slate-400'}`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Store</span>
        </button>
        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex flex-col items-center gap-1 text-amber-400 font-bold"
        >
          <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow">
            <Plus className="w-4 h-4 stroke-[3]" />
          </div>
          <span>Add APK</span>
        </button>
        <button
          onClick={() => setCurrentView('developer')}
          className={`flex flex-col items-center gap-1 ${currentView === 'developer' ? 'text-amber-400 font-bold' : 'text-slate-400'}`}
        >
          <Layers className="w-4 h-4" />
          <span>Developer</span>
        </button>
        <button
          onClick={() => setCurrentView('library')}
          className={`flex flex-col items-center gap-1 ${currentView === 'library' ? 'text-amber-400 font-bold' : 'text-slate-400'}`}
        >
          <Download className="w-4 h-4" />
          <span>Downloads</span>
        </button>
        <button
          onClick={() => setIsAdminOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-amber-400"
        >
          <Shield className="w-4 h-4 text-amber-400" />
          <span>CMS</span>
        </button>
      </nav>

      {/* Modals */}
      {/* 1. App Details Modal */}
      <AppDetailsModal
        app={selectedApp}
        isOpen={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        onDownload={(app, version) => {
          setSelectedApp(null);
          setDownloadingApp({ app, version });
        }}
        onAddReview={handleAddReview}
      />

      {/* 2. Upload APK Modal */}
      <UploadApkModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onAppPublished={handleAppPublished}
      />

      {/* 3. Real Download Progress Modal */}
      {downloadingApp && (
        <DownloadProgressModal
          app={downloadingApp.app}
          version={downloadingApp.version}
          isOpen={true}
          onClose={() => setDownloadingApp(null)}
          onDownloadCompleted={handleDownloadCompleted}
        />
      )}

      {/* 4. CMS Admin Dashboard Modal (Restricted to admin@mvp.com.ai and fileslanaja@gmail.com) */}
      {isAdminOpen && (
        <AdminPanel
          apps={apps}
          onUpdateApp={(updated) => {
            setApps(prev => prev.map(a => a.id === updated.id ? updated : a));
            if (selectedApp?.id === updated.id) setSelectedApp(updated);
          }}
          onDeleteApp={(appId) => {
            setApps(prev => prev.filter(a => a.id !== appId));
            if (selectedApp?.id === appId) setSelectedApp(null);
          }}
          onTriggerDownload={(app, version) => {
            setDownloadingApp({ app, version });
          }}
          onOpenUploadModal={() => setIsUploadOpen(true)}
          onClose={() => {
            setIsAdminOpen(false);
            setCmsSettings(loadCmsSettings()); // Refresh settings in parent
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 py-5 px-6 text-center text-xs text-slate-500">
        <p className="max-w-2xl mx-auto">
          Smile Store — "Your independent Android app marketplace." • Production Cloud Architecture • Direct APK Downloads with SHA-256 Cryptographic Verification
        </p>
      </footer>

    </div>
  );
}
