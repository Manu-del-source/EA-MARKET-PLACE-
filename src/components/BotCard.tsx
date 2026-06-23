import React from 'react';
import { EABot } from '../types';
import { Star, ShieldCheck, Zap, ChevronRight, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';

interface BotCardProps {
  bot: EABot;
  onSelect: (bot: EABot) => void;
  owned: boolean;
}

const getStrategyStyle = (strategy: string): string => {
  const map: Record<string, string> = {
    Grid: 'badge-grid', Scalping: 'badge-scalping', Trend: 'badge-trend',
    Hedging: 'badge-hedging', Arbitrage: 'badge-arbitrage', News: 'badge-news',
  };
  return map[strategy] || 'bg-slate-800 text-slate-400 border-slate-700';
};

const getPlatformColor = (platform: string) => {
  if (platform === 'MT5') return 'text-violet-400';
  if (platform === 'Both') return 'text-emerald-400';
  return 'text-cyan-400';
};

export default function BotCard({ bot, onSelect, owned }: BotCardProps) {
  const stars = Math.round(bot.rating);

  return (
    <div
      onClick={() => onSelect(bot)}
      className="card-ink shimmer-sweep rounded-2xl p-5 cursor-pointer group transition-all duration-350 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-500/8 flex flex-col h-full animate-fade-in"
    >
      {/* Top accent line — animated glow */}
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${getStrategyStyle(bot.strategy)}`}>
            {bot.strategy}
          </span>
          {bot.ownerId === 'system_seed' && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20">
              <ShieldCheck className="w-3 h-3" /> Verified
            </span>
          )}
        </div>
        <div className="text-right">
          <span className={`text-xs font-mono font-black ${getPlatformColor(bot.platform)}`}>{bot.platform}</span>
          <div className="text-[9px] text-slate-500 font-mono uppercase">{bot.category}</div>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-black text-lg text-white group-hover:text-cyan-300 transition-colors duration-300 leading-tight mb-1">
        {bot.name}
      </h3>
      <p className="text-xs text-slate-500 font-medium mb-3">
        by <span className="text-slate-400">{bot.ownerName}</span>
      </p>

      {/* Description */}
      <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-4 flex-grow">
        {bot.description}
      </p>

      {/* Metric grid */}
      <div className="metric-tile p-3 mb-4 grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="text-[9px] text-slate-500 uppercase font-mono tracking-wider">Monthly</div>
          <div className="text-sm font-mono font-black text-emerald-400 mt-0.5">+{bot.monthlyProfit}%</div>
        </div>
        <div className="text-center border-x border-cyan-500/10">
          <div className="text-[9px] text-slate-500 uppercase font-mono tracking-wider">Drawdown</div>
          <div className="text-sm font-mono font-black text-red-400 mt-0.5">{bot.maxDrawdown}%</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-slate-500 uppercase font-mono tracking-wider">Win Rate</div>
          <div className="text-sm font-mono font-black text-cyan-400 mt-0.5">{bot.winRate}%</div>
        </div>
      </div>

      {/* Stars */}
      {bot.rating > 0 && (
        <div className="flex items-center gap-1 mb-4">
          {[1,2,3,4,5].map(s => (
            <Star key={s} className={`w-3.5 h-3.5 transition-colors ${stars >= s ? 'text-violet-400 fill-violet-400' : 'text-slate-700'}`} />
          ))}
          <span className="text-[11px] text-slate-500 ml-1 font-mono">{bot.rating.toFixed(1)}</span>
          <span className="text-[11px] text-slate-600 ml-auto font-mono">{bot.downloads} installs</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-cyan-500/8">
        <div>
          <div className="text-[9px] text-slate-600 font-mono uppercase tracking-widest">License Price</div>
          <div className="text-lg font-mono font-black">
            {bot.price === 0 ? (
              <span className="text-emerald-400">FREE</span>
            ) : (
              <span className="text-white">${bot.price}</span>
            )}
          </div>
        </div>

        {owned ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-xl">
            <CheckCircle2 className="w-3.5 h-3.5" /> Owned
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-cyan-300 border border-white/8 group-hover:border-cyan-500/35 group-hover:bg-cyan-500/8 px-3 py-1.5 rounded-xl transition-all duration-200">
            View Bot <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        )}
      </div>
    </div>
  );
}
