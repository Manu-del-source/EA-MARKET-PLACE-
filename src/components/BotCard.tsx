import React from 'react';
import { EABot } from '../types';
import { Star, ShieldCheck, Download, BarChart2, CheckCircle2, ChevronRight } from 'lucide-react';

interface BotCardProps {
  bot: EABot;
  onSelect: (bot: EABot) => void;
  owned: boolean;
}

const BotCard: React.FC<BotCardProps> = ({ bot, onSelect, owned }) => {
  // Select color for strategy badge
  const getStrategyStyle = (strategy: string) => {
    switch (strategy) {
      case 'Grid': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Hedging': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'Scalping': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Trend': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Arbitrage': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div 
      id={`bot-card-${bot.id}`}
      onClick={() => onSelect(bot)}
      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/[0.04] transition-all duration-300 cursor-pointer flex flex-col justify-between group h-full"
    >
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between mb-4">
          <span className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-lg border ${getStrategyStyle(bot.strategy)}`}>
            {bot.strategy}
          </span>
          <div className="flex items-center space-x-1">
            <span className="text-xs font-mono font-bold text-slate-400">{bot.platform}</span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono font-medium uppercase">{bot.category}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-sans font-bold text-lg text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
          {bot.name}
        </h3>
        
        {/* Developer line */}
        <p className="text-xs text-slate-400 font-medium mb-4 flex items-center mb-4">
          by <span className="text-slate-300 ml-1 hover:underline">{bot.ownerName}</span>
          {bot.ownerId === 'system_seed' && (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 ml-1" />
          )}
        </p>

        {/* Description Snippet */}
        <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed mb-5 h-10">
          {bot.description}
        </p>

        {/* Highlight Numbers Grid */}
        <div className="grid grid-cols-3 gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/40 mb-5">
          <div className="text-center">
            <span className="text-[9px] text-slate-400 uppercase font-mono tracking-wider font-semibold block leading-none">Monthly Return</span>
            <span className="text-sm font-mono text-emerald-400 font-bold leading-normal block mt-1">
              +{bot.monthlyProfit}%
            </span>
          </div>
          <div className="text-center border-x border-slate-800/50">
            <span className="text-[9px] text-slate-400 uppercase font-mono tracking-wider font-semibold block leading-none">Max Drawdown</span>
            <span className="text-sm font-mono text-rose-400 font-bold leading-normal block mt-1">
              {bot.maxDrawdown}%
            </span>
          </div>
          <div className="text-center">
            <span className="text-[9px] text-slate-400 uppercase font-mono tracking-wider font-semibold block leading-none">Win Rate</span>
            <span className="text-sm font-mono text-amber-400 font-bold leading-normal block mt-1">
              {bot.winRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Footer Details */}
      <div className="flex items-center justify-between border-t border-slate-800/60 pt-4 mt-auto">
        {/* Cost */}
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-mono">EA Licence Price</span>
          <span className="text-lg font-mono font-bold text-white">
            {bot.price === 0 ? (
              <span className="text-emerald-400">FREE</span>
            ) : (
              `$${bot.price}`
            )}
          </span>
        </div>

        {/* Status / Call to Action */}
        <div>
          {owned ? (
            <span className="flex items-center space-x-1 text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold px-3 py-1.5 rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Owned</span>
            </span>
          ) : (
            <span className="flex items-center space-x-0.5 text-xs text-slate-300 font-semibold border border-slate-800 group-hover:border-emerald-500/30 group-hover:text-emerald-400 group-hover:bg-emerald-500/5 px-3 py-1.5 rounded-xl transition-all">
              <span>View Bot</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BotCard;
