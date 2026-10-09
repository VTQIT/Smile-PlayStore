import React, { useState } from 'react';
import { 
  X, Download, Star, ShieldCheck, CheckCircle2, Copy, Check, 
  ExternalLink, ArrowLeft, Heart, Share2, AlertCircle, Sparkles, 
  ChevronRight, Calendar, Info, Smartphone, Hash, FileCode, MessageSquare
} from 'lucide-react';
import { AppItem, AppVersion, Review } from '../types';

interface AppDetailsModalProps {
  app: AppItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (app: AppItem, version?: AppVersion) => void;
  onAddReview: (appId: string, review: Review) => void;
}

export const AppDetailsModal: React.FC<AppDetailsModalProps> = ({
  app,
  isOpen,
  onClose,
  onDownload,
  onAddReview
}) => {
  if (!isOpen || !app) return null;

  const [selectedVersion, setSelectedVersion] = useState<AppVersion>(app.latestVersion);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Review form states
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newUserName, setNewUserName] = useState('');
  const [newComment, setNewComment] = useState('');

  const copyHash = () => {
    navigator.clipboard.writeText(selectedVersion.sha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const review: Review = {
      id: `rev-${Date.now()}`,
      userName: newUserName.trim() || 'Android Enthusiast',
      rating: newRating,
      date: 'Just now',
      versionCode: selectedVersion.versionCode,
      comment: newComment.trim()
    };

    onAddReview(app.id, review);
    setNewComment('');
    setNewUserName('');
    setShowReviewForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 sm:border sm:border-slate-800 sm:rounded-3xl shadow-2xl overflow-hidden min-h-screen sm:min-h-0 sm:my-8 text-slate-100 flex flex-col">
        
        {/* Top Floating App Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-3.5 bg-slate-900/90 backdrop-blur border-b border-slate-800">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Store</span>
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className={`p-2 rounded-full transition cursor-pointer ${
                isFavorite ? 'text-rose-500 bg-rose-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Add to wishlist"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
            </button>
            <button
              onClick={copyShareLink}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Share App"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 space-y-8 overflow-y-auto max-h-[85vh]">
          
          {/* Main Play Store Header (Icon, Title, Stats, Install Button) */}
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="relative shrink-0">
              <img
                src={app.iconUrl}
                alt={app.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover shadow-2xl border border-slate-800 bg-slate-800"
              />
              {app.developer.verified && (
                <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-1 rounded-full shadow-lg" title="Verified Publisher">
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{app.name}</h1>
              
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-semibold text-amber-400">{app.developer.name}</span>
                {app.developer.verified && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                    Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">{app.category} • Contains no third-party ads</p>

              {/* Play Store 4-Column Metric Ribbon */}
              <div className="flex items-center gap-4 sm:gap-8 mt-5 py-3 border-y border-slate-800/80 text-xs">
                {/* Rating */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 font-bold text-white text-sm">
                    <span>{app.rating.toFixed(1)}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5">{app.ratingCount.toLocaleString()} reviews</span>
                </div>

                <div className="w-px h-8 bg-slate-800" />

                {/* Downloads */}
                <div className="flex flex-col items-center">
                  <span className="font-bold text-white text-sm">{app.downloadCountFormatted}</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">Downloads</span>
                </div>

                <div className="w-px h-8 bg-slate-800" />

                {/* File Size */}
                <div className="flex flex-col items-center">
                  <span className="font-bold text-white text-sm font-mono">{selectedVersion.fileSizeFormatted}</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">APK Size</span>
                </div>

                <div className="w-px h-8 bg-slate-800" />

                {/* Content Rating */}
                <div className="flex flex-col items-center">
                  <span className="font-bold text-white text-sm">3+</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">Rated for 3+</span>
                </div>
              </div>

              {/* Install / Download Button Action Row */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => onDownload(app, selectedVersion)}
                  className="flex-1 sm:flex-none px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm tracking-wide transition shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Download APK ({selectedVersion.fileSizeFormatted})</span>
                </button>

                {/* Version Selector if multiple exist */}
                {app.allVersions.length > 1 && (
                  <select
                    value={selectedVersion.id}
                    onChange={(e) => {
                      const v = app.allVersions.find(item => item.id === e.target.value);
                      if (v) setSelectedVersion(v);
                    }}
                    className="px-3 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400"
                  >
                    {app.allVersions.map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.versionName} (Build {v.versionCode}) - {v.fileSizeFormatted}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Screenshots Gallery (Horizontal Scrollable) */}
          {app.screenshots && app.screenshots.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-white mb-3">Screenshots</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {app.screenshots.map((s, idx) => (
                  <div key={idx} className="shrink-0 w-48 sm:w-56 h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md">
                    <img src={s} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* About this app */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400" />
              About this app
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              {app.description}
            </p>
          </div>

          {/* What's New */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                What's New in v{selectedVersion.versionName}
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">{selectedVersion.releaseDate}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedVersion.releaseNotes}
            </p>
          </div>

          {/* App Specifications & Security Badge */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Technical Specifications & Cryptographic Signature
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Verified Clean APK
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block">Android Package Name</span>
                <span className="font-mono text-cyan-300 font-bold break-all">{app.packageName}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block">OS Compatibility</span>
                <span className="font-medium text-white">{selectedVersion.minAndroid} • Target {selectedVersion.targetAndroid}</span>
              </div>
            </div>

            {/* SHA-256 with Copy */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-[11px] flex items-center gap-1">
                  <Hash className="w-3 h-3 text-amber-400" /> SHA-256 Checksum (Immutable Binary Hash)
                </span>
                <button
                  onClick={copyHash}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="font-mono text-[11px] text-slate-300 break-all select-all">
                {selectedVersion.sha256}
              </div>
            </div>

            {/* Permissions */}
            {app.permissions && app.permissions.length > 0 && (
              <div>
                <span className="text-slate-400 text-[11px] block mb-1.5 font-semibold">Permissions Declared in AndroidManifest.xml:</span>
                <div className="flex flex-wrap gap-1.5">
                  {app.permissions.map((p, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 font-mono text-[10px] text-slate-300">
                      {p.replace('android.permission.', '')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ratings & Reviews Section */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Ratings and Reviews</h3>
                <p className="text-xs text-slate-400">Ratings are verified from community members using this device family</p>
              </div>

              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Write a Review</span>
              </button>
            </div>

            {/* Write Review Form */}
            {showReviewForm && (
              <form onSubmit={handleReviewSubmit} className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">Your Rating:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="p-1 cursor-pointer"
                      >
                        <Star className={`w-5 h-5 ${star <= newRating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Your Name (optional)"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                />

                <textarea
                  required
                  rows={2}
                  placeholder="Share your experience with this APK..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs text-slate-950 font-bold"
                  >
                    Post Review
                  </button>
                </div>
              </form>
            )}

            {/* Review Cards List */}
            <div className="space-y-3">
              {app.reviews.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950 text-center text-xs text-slate-400">
                  No user reviews yet. Be the first to install and rate this app!
                </div>
              ) : (
                app.reviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 font-bold text-[10px] text-amber-400 flex items-center justify-center">
                          {rev.userName[0]}
                        </div>
                        <span className="text-xs font-semibold text-white">{rev.userName}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{rev.date}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-3 h-3 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} />
                      ))}
                      <span className="text-[10px] text-slate-500 font-mono ml-2">Build {rev.versionCode}</span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{rev.comment}</p>

                    {rev.developerReply && (
                      <div className="mt-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                        <span className="font-semibold text-amber-400 block mb-0.5">{app.developer.name} (Developer)</span>
                        <p className="text-slate-400">{rev.developerReply.text}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
