import React, { useState, useEffect } from 'react';
import { EABot, UserProfile, Purchase } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { simulateDownloadFile } from '../utils/simulation';
import { ShoppingBag, Key, Download, Code, ExternalLink, ClipboardCopy, Terminal, FileCode, Activity, TrendingUp } from 'lucide-react';

interface MyCabinetProps {
  userProfile: UserProfile | null;
  bots: EABot[];
  onSelectBot: (bot: EABot) => void;
}

export default function MyCabinet({ userProfile, bots, onSelectBot }: MyCabinetProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeCodeBotId, setActiveCodeBotId] = useState<string | null>(null);
  const [activeCodeFile, setActiveCodeFile] = useState<string | null>(null);

  useEffect(() => { loadMyPurchases(); }, [userProfile?.id]);

  const loadMyPurchases = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'purchases'), where('buyerId', '==', userProfile.id)));
      const items: Purchase[] = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() } as Purchase));
      setPurchases(items);
    } catch (e) { handleFirestoreError(e, OperationType.LIST, 'purchases'); }
    finally { setLoading(false); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const toggleCode = (purchase: Purchase, bot: EABot) => {
    if (activeCodeBotId === bot.id) {
      setActiveCodeBotId(null); setActiveCodeFile(null);
    } else {
      setActiveCodeBotId(bot.id);
      setActiveCodeFile(simulateDownloadFile(bot.name, bot.sourceFileName, purchase.licenseKey));
    }
  };

  if (!userProfile) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-cyan-500/8 border border-cyan-500/18 flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-cyan-400/50" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Connect Your Account</h2>
        <p className="text-slate-500 text-sm">Sign in via the navigation bar to view your licensed Expert Advisors.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Portfolio Terminal</h1>
            <p className="text-xs text-slate-500 font-mono">Manage licenses · Download source files · Inspect performance</p>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-cyan-500/30 via-violet-500/20 to-transparent mt-6" />
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Active Licenses', value: purchases.length, color: 'text-cyan-400' },
          { label: 'Portfolio Value', value: `$${purchases.reduce((a, p) => a + p.price, 0).toLocaleString()}`, color: 'text-violet-400' },
          { label: 'Sim Balance', value: `$${userProfile.balance.toLocaleString()}`, color: 'text-emerald-400' },
        ].map((s, i) => (
          <div key={i} className="metric-tile p-4 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`text-xl font-mono font-black ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-36 rounded-2xl" style={{ animationDelay: `${i * 80}ms` }} />)}
        </div>
      ) : purchases.length === 0 ? (
        <div className="card-ink rounded-2xl p-16 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/8 border border-cyan-500/18 flex items-center justify-center mx-auto mb-5">
            <ShoppingBag className="w-8 h-8 text-cyan-400/40" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No licenses yet</h3>
          <p className="text-xs text-slate-500 font-mono leading-relaxed max-w-md mx-auto">
            Acquire licenses for Expert Advisor frameworks through the trade catalog to sync your account.
          </p>
        </div>
      ) : (
        <div className="space-y-5 stagger-children">
          {purchases.map((purchase) => {
            const botObj = bots.find(b => b.id === purchase.botId);
            return (
              <div key={purchase.id} className="card-ink shimmer-sweep rounded-2xl p-5 sm:p-6 animate-fade-in-up hover:-translate-y-0.5 transition-transform duration-200">
                {/* Top row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/15 to-violet-500/10 border border-cyan-500/18 flex items-center justify-center shrink-0">
                      <Terminal className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-white">{purchase.botName}</h3>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Licensed {purchase.purchaseDate?.seconds
                          ? new Date(purchase.purchaseDate.seconds * 1000).toLocaleDateString()
                          : 'Recently'}
                        {botObj && ` · ${botObj.platform} · ${botObj.strategy}`}
                      </p>
                    </div>
                  </div>

                  {/* License key pill */}
                  <div className="flex items-center gap-2 bg-black/40 border border-cyan-500/12 rounded-xl px-3 py-2 font-mono text-xs min-w-0 max-w-xs">
                    <Key className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] text-slate-600 uppercase tracking-widest">License Key</div>
                      <div className="text-cyan-400 font-bold truncate">{purchase.licenseKey}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(purchase.licenseKey)}
                      className="p-1.5 bg-cyan-500/8 hover:bg-cyan-500/18 text-slate-400 hover:text-cyan-400 rounded-lg border border-cyan-500/15 transition-all"
                      title="Copy key"
                    >
                      {copiedKey === purchase.licenseKey
                        ? <span className="text-emerald-400 text-[9px] font-bold">✓</span>
                        : <ClipboardCopy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {botObj && (
                      <button
                        onClick={() => onSelectBot(botObj)}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-white border border-white/8 hover:border-white/18 bg-white/3 hover:bg-white/6 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Details
                      </button>
                    )}
                    {botObj && (
                      <button
                        onClick={() => toggleCode(purchase, botObj)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          activeCodeBotId === botObj.id
                            ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                            : 'btn-cyan'
                        }`}
                      >
                        <Code className="w-3.5 h-3.5" />
                        {activeCodeBotId === botObj.id ? 'Minimize' : 'Get Source'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats mini-row */}
                {botObj && (
                  <div className="mt-4 pt-4 border-t border-cyan-500/8 flex flex-wrap gap-4 font-mono text-xs">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Monthly Return</span>
                      <span className="text-emerald-400 font-black">+{botObj.monthlyProfit}% <span className="text-slate-600 font-normal">/mo</span></span>
                    </div>
                    <div className="border-l border-cyan-500/8 pl-4">
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Win Rate</span>
                      <span className="text-cyan-400 font-black">{botObj.winRate}%</span>
                    </div>
                    <div className="border-l border-cyan-500/8 pl-4">
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Drawdown</span>
                      <span className="text-red-400 font-black">{botObj.maxDrawdown}%</span>
                    </div>
                    <div className="border-l border-cyan-500/8 pl-4">
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Source File</span>
                      <span className="text-slate-300">{botObj.sourceFileName}</span>
                    </div>
                  </div>
                )}

                {/* Code drawer */}
                {activeCodeBotId === purchase.botId && activeCodeFile && (
                  <div className="mt-5 bg-black/60 border border-cyan-500/12 rounded-xl p-4 font-mono text-[11px] relative animate-fade-in">
                    <div className="absolute top-3 right-3 flex items-center gap-1 text-[9px] text-cyan-400 bg-cyan-500/8 border border-cyan-500/15 px-2 py-0.5 rounded font-sans font-bold uppercase tracking-wider">
                      <Terminal className="w-3 h-3" /> MQL Source
                    </div>
                    <h4 className="text-xs text-slate-400 font-bold mb-3 flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                      {botObj?.sourceFileName}
                    </h4>
                    <pre className="text-slate-500 p-4 bg-cyan-500/3 rounded-xl overflow-x-auto max-h-72 overflow-y-auto select-all border border-cyan-500/8 leading-relaxed">
                      {activeCodeFile}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
