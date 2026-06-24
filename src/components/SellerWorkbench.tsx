import React, { useState, useRef } from 'react';
import { EABot, UserProfile } from '../types';
import { supabase, handleSupabaseError } from '../supabase';
import {
  Plus, Terminal, Layers, Check, Zap, ShieldAlert, Briefcase,
  X, Cpu, Activity, UploadCloud, FileCode, AlertCircle, CheckCircle2
} from 'lucide-react';

interface SellerWorkbenchProps {
  userProfile: UserProfile | null;
  myBots: EABot[];
  onBotAdded: () => void;
  onBotDeleted: () => void;
}

const F = 'input-dark text-sm';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function SellerWorkbench({ userProfile, myBots, onBotAdded, onBotDeleted }: SellerWorkbenchProps) {
  const [isAdding, setIsAdding]         = useState(false);
  const [publishing, setPublishing]     = useState(false);
  const [uploadState, setUploadState]   = useState<UploadState>('idle');
  const [uploadProgress, setProgress]   = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver]         = useState(false);
  const fileInputRef                    = useRef<HTMLInputElement>(null);

  const [name, setName]                   = useState('');
  const [description, setDescription]     = useState('');
  const [category, setCategory]           = useState<'Forex'|'Crypto'|'Indices'|'Commodities'>('Forex');
  const [platform, setPlatform]           = useState<'MT4'|'MT5'|'Both'>('MT4');
  const [strategy, setStrategy]           = useState<'Grid'|'Hedging'|'Scalping'|'Trend'|'Arbitrage'|'News'>('Grid');
  const [price, setPrice]                 = useState(99);
  const [winRate, setWinRate]             = useState(68);
  const [monthlyProfit, setMonthlyProfit] = useState(12);
  const [maxDrawdown, setMaxDrawdown]     = useState(8);

  const ALLOWED_EXT = ['.ex4', '.ex5', '.mq4', '.mq5', '.zip'];

  const validateFile = (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      alert(`Invalid file type. Allowed: ${ALLOWED_EXT.join(', ')}`);
      return false;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert('File too large. Max size is 20MB.');
      return false;
    }
    return true;
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) setSelectedFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) setSelectedFile(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    if (!selectedFile) { alert('Please select an EA file to upload (.ex4, .ex5, .mq4, .mq5, .zip)'); return; }

    setPublishing(true);
    setUploadState('uploading');
    setProgress(0);

    const botId    = 'ea_' + Math.random().toString(36).substring(2, 10);
    const filePath = `${userProfile.id}/${botId}/${selectedFile.name}`;

    // Upload file to Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('ea-files')
      .upload(filePath, selectedFile, { cacheControl: '3600', upsert: false });

    if (storageError) {
      handleSupabaseError(storageError, 'uploadFile');
      setUploadState('error');
      setPublishing(false);
      return;
    }

    setProgress(60);

    // Insert bot record with file_path
    const { error: dbError } = await supabase.from('bots').insert({
      id:               botId,
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
      source_file_name: selectedFile.name,
      file_path:        filePath,
    });

    if (dbError) {
      handleSupabaseError(dbError, 'createBot');
      // Clean up uploaded file if DB insert fails
      await supabase.storage.from('ea-files').remove([filePath]);
      setUploadState('error');
      setPublishing(false);
      return;
    }

    setProgress(100);
    setUploadState('success');

    // Reset form
    setTimeout(() => {
      setName(''); setDescription(''); setCategory('Forex'); setPlatform('MT4');
      setStrategy('Grid'); setPrice(99); setWinRate(68); setMonthlyProfit(12);
      setMaxDrawdown(8); setSelectedFile(null); setUploadState('idle'); setProgress(0);
      setIsAdding(false);
      onBotAdded();
    }, 1500);

    setPublishing(false);
  };

  const handleDelete = async (bot: EABot) => {
    if (!window.confirm(`Delete "${bot.name}"? This also removes the EA file. Irreversible.`)) return;
    // Delete file from storage
    if ((bot as any).filePath) {
      await supabase.storage.from('ea-files').remove([(bot as any).filePath]);
    }
    const { error } = await supabase.from('bots').delete().eq('id', bot.id);
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
        <div className="card-ink rounded-2xl p-10 text-center">
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
                <UploadCloud className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Publish New EA</h2>
                <p className="text-[10px] text-slate-500 font-mono">Upload .ex4 / .ex5 / .mq4 / .mq5 / .zip</p>
              </div>
            </div>
            <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-white p-2 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-5">

            {/* ── File drop zone ── */}
            <div>
              <label className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-2">
                EA File * (.ex4, .ex5, .mq4, .mq5, .zip — max 20MB)
              </label>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  dragOver
                    ? 'border-cyan-400 bg-cyan-500/8'
                    : selectedFile
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-cyan-500/20 bg-cyan-500/3 hover:border-cyan-500/40 hover:bg-cyan-500/6'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ex4,.ex5,.mq4,.mq5,.zip"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                      <FileCode className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="text-sm font-bold text-emerald-400">{selectedFile.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {(selectedFile.size / 1024).toFixed(1)} KB · Click to change
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wide mt-1"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${dragOver ? 'bg-cyan-500/15 scale-110' : 'bg-cyan-500/8'} border border-cyan-500/20`}>
                      <UploadCloud className={`w-7 h-7 transition-colors ${dragOver ? 'text-cyan-300' : 'text-cyan-500'}`} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white mb-0.5">
                        {dragOver ? 'Drop it!' : 'Drag & drop your EA file'}
                      </div>
                      <div className="text-xs text-slate-500">or <span className="text-cyan-400 font-semibold">click to browse</span></div>
                    </div>
                    <div className="flex gap-2 mt-1">
                      {['.ex4', '.ex5', '.mq4', '.mq5', '.zip'].map(ext => (
                        <span key={ext} className="text-[9px] font-mono font-bold text-slate-600 bg-white/4 border border-white/8 px-2 py-0.5 rounded">{ext}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Upload progress */}
            {uploadState === 'uploading' && (
              <div className="animate-fade-in">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-mono">Uploading to Supabase Storage…</span>
                  <span className="text-cyan-400 font-mono font-bold">{uploadProgress}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {uploadState === 'success' && (
              <div className="flex items-center gap-2 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs text-emerald-400 font-semibold">File uploaded successfully! Publishing bot…</span>
              </div>
            )}

            {uploadState === 'error' && (
              <div className="flex items-center gap-2 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-xs text-red-400 font-semibold">Upload failed. Check your Supabase storage bucket and try again.</span>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-1.5">EA Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. NeuroScalp Pro v2" className={F} />
            </div>

            {/* Category / Platform / Strategy */}
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

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Monthly Profit (%)', val: monthlyProfit, set: setMonthlyProfit, min: 1,  max: 200,  color: 'text-emerald-400' },
                { label: 'Max Drawdown (%)',   val: maxDrawdown,   set: setMaxDrawdown,   min: 1,  max: 99,   color: 'text-red-400'     },
                { label: 'Win Rate (%)',        val: winRate,       set: setWinRate,       min: 30, max: 99,   color: 'text-cyan-400'    },
                { label: 'Price ($)',           val: price,         set: setPrice,         min: 0,  max: 5000, color: 'text-violet-400'  },
              ].map(m => (
                <div key={m.label}>
                  <label className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-1.5">{m.label}</label>
                  <input type="number" required min={m.min} max={m.max} value={m.val}
                    onChange={e => m.set(Number(e.target.value))}
                    className={`${F} ${m.color} font-mono font-bold`} />
                </div>
              ))}
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-1.5">Description *</label>
              <textarea required rows={5} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe entry logic, stop-loss, risk management, pairs optimised for…"
                className={`${F} resize-none`} />
            </div>

            <button type="submit" disabled={publishing || !selectedFile}
              className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all ${
                publishing || !selectedFile ? 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/6' : 'btn-cyan'
              }`}>
              {publishing ? (
                <><div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" /> Uploading & Publishing…</>
              ) : (
                <><UploadCloud className="w-4 h-4" /> Upload EA & Publish</>
              )}
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
            <p className="text-xs text-slate-500 font-mono">Upload EA files · track installs · manage catalog</p>
          </div>
        </div>
        <button onClick={() => setIsAdding(true)} className="btn-cyan flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm">
          <Plus className="w-4 h-4 stroke-[2.5]" /> Upload New EA
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 stagger-children">
        {[
          { label: 'Active Listings', value: myBots.length.toString(),                                                                                             icon: <Layers   className="w-5 h-5" />, bg: 'bg-cyan-500/8 border-cyan-500/18',    color: 'text-cyan-400'    },
          { label: 'Total Installs',  value: myBots.reduce((s, b) => s + b.downloads, 0).toString(),                                                               icon: <Check    className="w-5 h-5" />, bg: 'bg-emerald-500/8 border-emerald-500/18', color: 'text-emerald-400' },
          { label: 'Avg Rating',      value: myBots.length === 0 ? '—' : (myBots.reduce((s, b) => s + b.rating, 0) / myBots.length).toFixed(1) + ' / 5',         icon: <Activity className="w-5 h-5" />, bg: 'bg-violet-500/8 border-violet-500/18',  color: 'text-violet-400'  },
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
            <UploadCloud className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No EAs published yet.</p>
            <button onClick={() => setIsAdding(true)} className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold mt-2">Upload your first bot →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs table-dark">
              <thead>
                <tr className="text-[10px] font-mono uppercase tracking-wider">
                  <th className="px-5 py-3">Bot Module</th>
                  <th className="px-5 py-3 hidden sm:table-cell">Strategy</th>
                  <th className="px-5 py-3 text-center hidden md:table-cell">Platform</th>
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
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <FileCode className="w-3 h-3 text-cyan-500/60" />
                        <span className="text-[10px] text-slate-600 font-mono">{bot.sourceFileName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-lg uppercase font-mono">{bot.strategy}</span>
                    </td>
                    <td className="px-5 py-4 text-center font-mono font-semibold text-violet-400 hidden md:table-cell">{bot.platform}</td>
                    <td className="px-5 py-4 text-center font-mono font-bold text-slate-300">{bot.downloads}</td>
                    <td className="px-5 py-4 text-right font-mono font-bold">
                      {bot.price === 0 ? <span className="text-emerald-400">FREE</span> : <span className="text-white">${bot.price}</span>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => handleDelete(bot)} className="text-red-500 hover:text-red-400 text-[11px] font-bold uppercase tracking-wide transition-colors">Delete</button>
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
