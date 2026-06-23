import React, { useState } from 'react';
import { EABot, UserProfile } from '../types';
import { supabase, handleSupabaseError } from '../supabase';
import { Plus, Terminal, Layers, Check, Zap, ShieldAlert, Briefcase, X, Cpu, Activity } from 'lucide-react';

interface SellerWorkbenchProps {
  userProfile: UserProfile | null;
  myBots: EABot[];
  onBotAdded: () => void;
  onBotDeleted: () => void;
}

const F = 'input-dark text-sm';

export default function SellerWorkbench({ userProfile, myBots, onBotAdded, onBotDeleted }: SellerWorkbenchProps) {
  const [isAdding, setIsAdding]     = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [name, setName]                   = useState('');
  const [description, setDescription]     = useState('');
  const [category, setCategory]           = useState<'Forex'|'Crypto'|'Indices'|'Commodities'>('Forex');
  const [platform, setPlatform]           = useState<'MT4'|'MT5'|'Both'>('MT4');
  const [strategy, setStrategy]           = useState<'Grid'|'Hedging'|'Scalping'|'Trend'|'Arbitrage'|'News'>('Grid');
  const [price, setPrice]                 = useState(99);
  const [winRate, setWinRate]             = useState(68);
  const [monthlyProfit, setMonthlyProfit] = useState(12);
  const [maxDrawdown, setMaxDrawdown]     = useState(8);
  const [sourceFileName, setSrcFile]      = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setPublishing(true);
    const botId   = 'ea_' + Math.random().toString(36).substring(2, 10);
    const fileName = sourceFileName.trim() || `${name.replace(/\s+/g, '_')}_v1.ex4`;

    const { error } = await supabase.from('bots').insert({
      id: botId,
      owner_id:         userProfile.id,
      owner_name:       userProfile.displayName,
      name:             name.trim(),
      description:      description.trim(),
      category,
      platform,
      strategy,
      price:            Number(price),
      win_rate:         Number(winRate),
      monthly_profit:   Number(monthlyProfit),
      max_drawdown:     Number(maxDrawdown),
      downloads:        0,
      rating:           0,
      status:           'active',
      source_file_name: fileName,
    });

    if (error) { handleSupabaseError(error, 'createBot'); setPublishing(false); return; }

    onBotAdded();
    setName(''); setDescription(''); setCategory('Forex'); setPlatform('MT4'); setStrategy('Grid');
    setPrice(99); setWinRate(68); setMonthlyProfit(12); setMaxDrawdown(8); setSrcFile('');
    setIsAdding(false);
    setPublishing(false);
  };

  const handleDelete = async (botId: string) => {
    if (!window.confirm('Delete this EA? This is irreversible.')) return;
    const { error } = await supabase.from('bots').delete().eq('id', botId);
    if (error) handleSupabaseError(error, 'deleteBot');
    else onBotDeleted();
  };

  if (!userProfile) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4 text-center animate-fade-in">
        <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h2 className="text-xl font-black text-white mb-2">Sign In Required</h2>
        <p className="text-sm text-slate-500">Authorize your identity to list products.</p>
      </div>
    );
  }

  if (userProfile.sellerStatus !== 'admin') {
    return (
      <div className="max-w-lg mx-auto py-20 px-4 animate-fade-in">
        <div className="card-ink rounded-2xl p-10 text-center border-red-500/15">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">Admin Access Required</h1>
          <p className="text-sm text-slate-500 leading-relaxed">Only administrators can upload and manage EA bots.</p>
        </div>
      </div>
    );
  }

  /* ── Add Form ── */
  if (isAdding) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 animate-fade-in">
        <div className="card-ink rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-7 pb-5 border-b border-cyan-500/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Plus className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Publish New EA</h2>
                <p className="text-[10px] text-slate-500 font-mono">Fills Supabase · bots table</p>
              </div>
            </div>
            <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-white p-2 transition-colors"><X className="w-5 h-5" /></button>
          </div>

          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-1.5">EA Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. NeuroScalp Pro v2" className={F} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Asset Class', val: category, set: setCategory, opts: ['Forex','Crypto','Indices','Commodities'] },
                { label: 'Platform',   val: platform,  set: setPlatform,  opts: ['MT4','MT5','Both'] },
                { label: 'Strategy',   val: strategy,  set: setStrategy,  opts: ['Grid','Hedging','Scalping','Trend','Arbitrage','News'] },
              ].map(s => (
                <div key={s.label}>
                  <label className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-1.5">{s.label}</label>
                  <select value={s.val} onChange={e => (s.set as any)(e.target.value)} className={F}>
                    {s.opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Monthly Profit (%)', val: monthlyProfit, set: setMonthlyProfit, min: 1,  max: 200,  color: 'text-emerald-400' },
                { label: 'Max Drawdown (%)',   val: maxDrawdown,   set: setMaxDrawdown,   min: 1,  max: 99,   color: 'text-red-400' },
                { label: 'Win Rate (%)',        val: winRate,       set: setWinRate,       min: 30, max: 99,   color: 'text-cyan-400' },
                { label: 'Price ($)',           val: price,         set: setPrice,         min: 0,  max: 5000, color: 'text-violet-400' },
              ].map(m => (
                <div key={m.label}>
                  <label className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-1.5">{m.label}</label>
                  <input type="number" required min={m.min} max={m.max} value={m.val}
                    onChange={e => m.set(Number(e.target.value))}
                    className={`${F} ${m.color} font-mono font-bold`} />
                </div>
              ))}
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-1.5">Source Filename (optional)</label>
              <input value={sourceFileName} onChange={e => setSrcFile(e.target.value)} placeholder="MyEA_v1.ex4 (auto-generated if blank)" className={F} />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-1.5">Description *</label>
              <textarea required rows={5} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe how the EA analyses setups, entry logic, stop-loss, and risk management…"
                className={`${F} resize-none`} />
            </div>

            <button type="submit" disabled={publishing}
              className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all ${publishing ? 'bg-white/5 text-slate-600 cursor-not-allowed' : 'btn-cyan'}`}>
              {publishing
                ? <><div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" /> Writing to Supabase…</>
                : <><Zap className="w-4 h-4" /> Publish to Marketplace</>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ── Dashboard ── */
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Seller Workbench</h1>
            <p className="text-xs text-slate-500 font-mono">Track installs · manage catalog · Supabase powered</p>
          </div>
        </div>
        <button onClick={() => setIsAdding(true)} className="btn-cyan flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm">
          <Plus className="w-4 h-4 stroke-[2.5]" /> Upload New EA
        </button>
      </div>

      {/* Analytics strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 stagger-children">
        {[
          { label: 'Active Listings', value: myBots.length.toString(),                                                                                               icon: <Layers className="w-5 h-5" />, bg: 'bg-cyan-500/8 border-cyan-500/18',   color: 'text-cyan-400' },
          { label: 'Total Installs',  value: myBots.reduce((s, b) => s + b.downloads, 0).toString(),                                                                 icon: <Check className="w-5 h-5"  />, bg: 'bg-emerald-500/8 border-emerald-500/18', color: 'text-emerald-400' },
          { label: 'Avg Rating',      value: myBots.length === 0 ? '—' : (myBots.reduce((s, b) => s + b.rating, 0) / myBots.length).toFixed(1) + ' / 5',           icon: <Activity className="w-5 h-5" />, bg: 'bg-violet-500/8 border-violet-500/18', color: 'text-violet-400' },
        ].map((s, i) => (
          <div key={i} className="metric-tile p-5 flex items-center gap-4 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${s.bg} ${s.color}`}>{s.icon}</div>
            <div>
              <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">{s.label}</div>
              <div className={`text-xl font-mono font-black mt-0.5 ${s.color}`}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card-ink rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-cyan-500/8 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm flex items-center gap-2"><Terminal className="w-4 h-4 text-cyan-400" /> Published EAs</h3>
          <span className="text-xs text-slate-500 font-mono">{myBots.length} items</span>
        </div>

        {myBots.length === 0 ? (
          <div className="p-16 text-center">
            <Briefcase className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No EAs published yet.</p>
            <button onClick={() => setIsAdding(true)} className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold mt-2">Publish your first bot →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs table-dark">
              <thead>
                <tr className="text-[10px] font-mono uppercase tracking-wider">
                  <th className="px-5 py-3">Bot Module</th>
                  <th className="px-5 py-3">Strategy</th>
                  <th className="px-5 py-3 text-center">Platform</th>
                  <th className="px-5 py-3 text-center">Installs</th>
                  <th className="px-5 py-3 text-right">Price</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/5">
                {myBots.map(bot => (
                  <tr key={bot.id} className="hover:bg-cyan-500/3 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{bot.name}</div>
                      <div className="text-[10px] text-slate-600 font-mono mt-0.5">{bot.sourceFileName}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-lg uppercase font-mono">{bot.strategy}</span>
                    </td>
                    <td className="px-5 py-4 text-center font-mono font-semibold text-violet-400">{bot.platform}</td>
                    <td className="px-5 py-4 text-center font-mono font-bold text-slate-300">{bot.downloads}</td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-white">
                      {bot.price === 0 ? <span className="text-emerald-400">FREE</span> : `$${bot.price}`}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => handleDelete(bot.id)} className="text-red-500 hover:text-red-400 text-[11px] font-bold uppercase tracking-wide transition-colors">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
