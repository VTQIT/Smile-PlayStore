import React from 'react';
import { Star, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { AppItem } from '../types';

interface AppCardProps {
  app: AppItem;
  rank?: number;
  onSelect: (app: AppItem) => void;
  onQuickDownload: (app: AppItem, e: React.MouseEvent) => void;
}

export const AppCard: React.FC<AppCardProps> = ({ app, rank, onSelect, onQuickDownload }) => {
  return (
    <div
      onClick={() => onSelect(app)}
      className="group relative p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-xl hover:shadow-black/40 flex flex-col justify-between"
    >
      <div>
        {/* Top: Icon + Rank + Badges */}
        <div className="flex items-start gap-3 mb-2.5">
          {rank !== undefined && (
            <span className="font-mono font-black text-sm text-slate-500 w-4 text-center mt-1">
              {rank}
            </span>
          )}

          <div className="relative shrink-0">
            <img
              src={app.iconUrl}
              alt={app.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover shadow-md group-hover:scale-[1.02] transition-transform duration-200 bg-slate-800"
              loading="lazy"
            />
            {app.developer.verified && (
              <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-0.5 rounded-full shadow" title="Verified Developer">
                <CheckCircle2 className="w-3 h-3 stroke-[3]" />
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-white truncate group-hover:text-amber-400 transition-colors">
              {app.name}
            </h3>
            <p className="text-xs text-slate-400 truncate mt-0.5">{app.developer.name}</p>
            
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-0.5 font-semibold text-amber-300">
                <span>{app.rating.toFixed(1)}</span>
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              </span>
              <span>•</span>
              <span className="truncate">{app.category}</span>
            </div>
          </div>
        </div>

        {/* Short description */}
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
          {app.shortDescription}
        </p>
      </div>

      {/* Footer: Size + Downloads + Install Button */}
      <div className="pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
          <span>{app.latestVersion.fileSizeFormatted}</span>
          <span>•</span>
          <span>{app.downloadCountFormatted} installs</span>
        </div>

        <button
          onClick={(e) => onQuickDownload(app, e)}
          className="px-3 py-1 rounded-full bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-semibold text-xs transition duration-150 flex items-center gap-1 cursor-pointer"
          title="Download APK directly"
        >
          <Download className="w-3 h-3" />
          <span>Install</span>
        </button>
      </div>
    </div>
  );
};
