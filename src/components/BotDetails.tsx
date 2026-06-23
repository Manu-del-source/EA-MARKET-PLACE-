import React, { useState, useEffect } from 'react';
import { EABot, UserProfile, Purchase, Review, ChartPoint, toPurchase, toReview } from '../types';
import { supabase, handleSupabaseError } from '../supabase';
import { generateBacktestCurve, simulateDownloadFile } from '../utils/simulation';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { ArrowLeft, Settings, Activity, FileCode, Download, CheckCircle2, PlusCircle, Star, Trash2, Lock, Cpu, RefreshCw, MessageCircle, X, Send, Zap } from 'lucide-react';

interface BotDetailsProps {
  bot: EABot;
  userProfile: UserProfile | null;
  onBack: () => void;
  owned: boolean;
  onPurchaseSuccess: (botId: string) => void;
}

export default function BotDetails({ bot, userProfile, onBack, owned, onPurchaseSuccess }: BotDetailsProps) {
  const [chartData, setChartData]         = useState<ChartPoint[]>([]);
  const [profitData, setProfitData]       = useState<any[]>([]);
  const [chartTab, setChartTab]           = useState<'profit6m' | 'balance12m'>('profit6m');
  const [reviews, setReviews]             = useState<Review[]>([]);
  const [licenseInfo, setLicenseInfo]     = useState<Purchase | null>(null);
  const [purchasing, setPurchasing]       = useState(false);
  const [comment, setComment]             = useState('');
  const [rating, setRating]               = useState(5);
  const [submittingReview, setSubmitting] = useState(false);
  const [downloadedFile, setDownloaded]   = useState<string | null>(null);
  const [showChat, setShowChat]           = useState(false);
  const [chatMsg, setChatMsg]             = useState('');
  const [chatSent, setChatSent]           = useState(false);

  useEffect(() => {
    setChartData(generateBacktestCurve(bot.winRate, bot.monthlyProfit, bot.maxDrawdown));
    const months = ['Jan 26','Feb 26','Mar 26','Apr 26','May 26','Jun 26'];
    const seed = bot.name.charCodeAt(0) + bot.name.charCodeAt(bot.name.length - 1);
    setProfitData(months.map((month, i) => ({
      month,
      'Profit Growth (%)': parseFloat((bot.monthlyProfit * (0.8 + ((seed * (i + 3)) % 45) / 100)).toFixed(2)),
      'Target Average (%)': bot.monthlyProfit,
    })));
    loadReviews();
    if (owned && userProfile) loadLicense();
  }, [bot.id, owned, userProfile?.id]);

  const loadReviews = async () => {
    const { data, error } = await supabase.from('reviews').select('*').eq('bot_id', bot.id).order('created_at', { ascending: false });
    if (error) handleSupabaseError(error, 'loadReviews');
    else setReviews((data ?? []).map(toReview));
  };

  const loadLicense = async () => {
    if (!userProfile) return;
    const { data, error } = await supabase.from('purchases')
      .select('*').eq('buyer_id', userProfile.id).eq('bot_id', bot.id).single();
    if (!error && data) setLicenseInfo(toPurchase(data));
  };

  const handleCheckout = async () => {
    if (!userProfile) return;
    if (userProfile.balance < bot.price) { alert('Insufficient balance! Click Balance in the nav to top up.'); return; }
    setPurchasing(true);
    const purchaseId  = `${userProfile.id}_${bot.id}`;
    const licenseKey  = 'MT-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

    const { error: pErr } = await supabase.from('purchases').insert({
      id: purchaseId, buyer_id: userProfile.id, bot_id: bot.id,
      bot_name: bot.name, price: bot.price, license_key: licenseKey,
    });
    if (pErr) { handleSupabaseError(pErr, 'checkout/purchase'); setPurchasing(false); return; }

    await supabase.from('users').update({ balance: userProfile.balance - bot.price }).eq('id', userProfile.id);
    await supabase.from('bots').update({ downloads: bot.downloads + 1 }).eq('id', bot.id);

    const lic: Purchase = { id: purchaseId, buyerId: userProfile.id, botId: bot.id, botName: bot.name, price: bot.price, licenseKey, purchaseDate: new Date().toISOString() };
    setLicenseInfo(lic);
    onPurchaseSuccess(bot.id);
    setPurchasing(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !comment.trim()) return;
    setSubmitting(true);
    const reviewId = `${userProfile.id}_${bot.id}_rev`;
    const { error } = await supabase.from('reviews').upsert({
      id: reviewId, user_id: userProfile.id, user_name: userProfile.displayName,
      user_photo: userProfile.photoURL, bot_id: bot.id, rating, comment: comment.trim(),
    });
    if (error) { handleSupabaseError(error, 'submitReview'); setSubmitting(false); return; }
    setComment('');
    await loadReviews();
    const { data: allRevs } = await supabase.from('reviews').select('rating').eq('bot_id', bot.id);
    if (allRevs?.length) {
      const avg = parseFloat((allRevs.reduce((a: number, r: any) => a + r.rating, 0) / allRevs.length).toFixed(1));
      await supabase.from('bots').update({ rating: avg }).eq('id', bot.id);
    }
    setSubmitting(false);
  };

  const handleDeleteReview = async (reviewId: string) => {
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
    if (error) { handleSupabaseError(error, 'deleteReview'); return; }
    const updated = reviews.filter(r => r.id !== reviewId);
    setReviews(updated);
    const avg = updated.length === 0 ? 0 : parseFloat((updated.reduce((a, r) => a + r.rating, 0) / updated.length).toFixed(1));
    await supabase.from('bots').update({ rating: avg }).eq('id', bot.id);
  };

  const tooltipStyle = {
    contentStyle: { backgroundColor: '#0b1629', borderColor: 'rgba(6,182,212,0.2)', borderRadius: '12px', fontFamily: 'monospace', fontSize: '11px' },
    labelStyle: { color: '#22d3ee', fontFamily: 'monospace' },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-cyan-400 bg-white/3 hover:bg-cyan-500/8 border border-white/8 hover:border-cyan-500/25 rounded-xl px-4 py-2 text-xs font-bold transition-all mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to Marketplace
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2 space-y-6">
          {/* Info card */}
          <div className="card-ink rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-[10px] font-mono font-bold text-cyan-400/80 uppercase tracking-widest bg-cyan-500/8 border border-cyan-500/18 px-2.5 py-1 rounded-lg">{bot.strategy}</span>
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest bg-white/4 border border-white/8 px-2.5 py-1 rounded-lg">{bot.category}</span>
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight mb-1">{bot.name}</h1>
                <p className="text-sm text-slate-500">by <span className="text-slate-300 font-semibold">{bot.ownerName}</span></p>
              </div>
              <div className="flex gap-3 shrink-0">
                <div className="bg-cyan-500/8 border border-cyan-500/18 rounded-xl px-4 py-2.5 text-center">
                  <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Platform</div>
                  <div className="text-sm font-black text-cyan-400 mt-0.5 font-mono">{bot.platform}</div>
                </div>
                <div className="bg-violet-500/8 border border-violet-500/18 rounded-xl px-4 py-2.5 text-center">
                  <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Downloads</div>
                  <div className="text-sm font-black text-violet-400 mt-0.5 font-mono">{bot.downloads}</div>
                </div>
              </div>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap mb-5">{bot.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 bg-black/30 border border-cyan-500/8 rounded-xl overflow-hidden">
              {[
                { label: 'Monthly Return', value: `+${bot.monthlyProfit}%`, color: 'text-emerald-400' },
                { label: 'Max Drawdown',   value: `${bot.maxDrawdown}%`,   color: 'text-red-400' },
                { label: 'Win Rate',       value: `${bot.winRate}%`,       color: 'text-cyan-400' },
                { label: 'Rating',         value: bot.rating > 0 ? bot.rating.toFixed(1) : 'N/A', color: 'text-violet-400' },
              ].map((m, i) => (
                <div key={i} className={`p-4 ${i > 0 ? 'border-l border-cyan-500/8' : ''}`}>
                  <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mb-1">{m.label}</div>
                  <div className={`text-xl font-mono font-black ${m.color}`}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="card-ink rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
              <div className="flex items-center gap-2"><Activity className="w-5 h-5 text-cyan-400" /><h3 className="text-base font-bold text-white">Simulated Performance</h3></div>
              <div className="flex bg-black/40 border border-cyan-500/10 rounded-xl p-1">
                {(['profit6m', 'balance12m'] as const).map(tab => (
                  <button key={tab} onClick={() => setChartTab(tab)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${chartTab === tab ? 'bg-cyan-500/12 border border-cyan-500/25 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
                    {tab === 'profit6m' ? '6M Profit' : '12M Equity'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartTab === 'profit6m' ? profitData : chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.06)" />
                  <XAxis dataKey={chartTab === 'profit6m' ? 'month' : 'period'} stroke="#1e3a4a" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  <YAxis stroke="#1e3a4a" unit={chartTab === 'profit6m' ? '%' : ''} style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  {chartTab === 'profit6m' ? (
                    <>
                      <Line type="monotone" dataKey="Profit Growth (%)" stroke="#06b6d4" strokeWidth={2.5} activeDot={{ r: 7, fill: '#22d3ee' }} dot={{ stroke: '#0891b2', strokeWidth: 2, r: 3, fill: '#06b6d4' }} />
                      <Line type="monotone" dataKey="Target Average (%)" stroke="#1e3a5f" strokeWidth={1.5} strokeDasharray="5 5" />
                    </>
                  ) : (
                    <>
                      <Line type="monotone" dataKey="Balance" stroke="#06b6d4" strokeWidth={2.5} activeDot={{ r: 7 }} name="Balance ($)" />
                      <Line type="monotone" dataKey="Equity"  stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 4" name="Equity ($)" />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-600 font-mono text-center mt-3">Simulated · win rate {bot.winRate}% · max drawdown {bot.maxDrawdown}% · Past performance ≠ future results.</p>
          </div>
        </div>

        {/* License sidebar */}
        <div className="space-y-5">
          <div className="relative rounded-2xl overflow-hidden p-6 card-ink border-cyan-500/20">
            <div className="orb orb-violet w-48 h-48 -top-12 -right-12 opacity-50" />
            <div className="flex items-center gap-2 mb-5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">License Terminal</h3>
              <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400 font-mono"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online</span>
            </div>
            <div className="flex items-baseline justify-between bg-black/40 border border-cyan-500/8 rounded-xl px-4 py-3 mb-5">
              <span className="text-xs text-slate-500">Single Dev License</span>
              <span className="text-2xl font-mono font-black">
                {bot.price === 0 ? <span className="text-emerald-400">FREE</span> : <span className="text-white">${bot.price}</span>}
              </span>
            </div>

            {owned ? (
              <div className="space-y-4">
                <div className="bg-emerald-500/8 border border-emerald-500/22 p-4 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-emerald-400 uppercase tracking-wide">License Active</div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">You own a verified license for <strong>{bot.name}</strong>.</p>
                  </div>
                </div>
                {licenseInfo && (
                  <div className="bg-black/40 border border-cyan-500/8 rounded-xl p-4 text-xs font-mono space-y-2">
                    <div className="flex justify-between border-b border-white/5 pb-1.5">
                      <span className="text-slate-600">Key</span>
                      <span className="text-cyan-400 font-bold">{licenseInfo.licenseKey}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Status</span>
                      <span className="text-emerald-400 font-bold">● ACTIVE</span>
                    </div>
                  </div>
                )}
                <button onClick={() => { if (licenseInfo) setDownloaded(simulateDownloadFile(bot.name, bot.sourceFileName, licenseInfo.licenseKey)); }}
                  className="btn-cyan w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm">
                  <Download className="w-5 h-5" /> Download EA File
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {userProfile ? (
                  <div className="bg-black/40 border border-cyan-500/8 rounded-xl p-4 text-center">
                    <div className="text-xs text-slate-500 mb-1 font-mono">Your Sim Balance</div>
                    <div className="text-lg font-mono font-black text-cyan-400">${userProfile.balance.toLocaleString()}</div>
                  </div>
                ) : (
                  <div className="bg-cyan-500/5 border border-cyan-500/15 p-4 rounded-xl flex items-start gap-3">
                    <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400">Sign in to acquire a license.</p>
                  </div>
                )}
                <button disabled={!userProfile || purchasing} onClick={handleCheckout}
                  className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all ${!userProfile || purchasing ? 'bg-white/4 text-slate-600 cursor-not-allowed border border-white/6' : 'btn-cyan'}`}>
                  {purchasing ? <><RefreshCw className="w-5 h-5 animate-spin" /> Securing License…</> : <><Zap className="w-4 h-4" />{bot.price === 0 ? 'Get Free License' : 'Purchase License'}</>}
                </button>
                {userProfile && userProfile.balance < bot.price && (
                  <p className="text-xs text-red-400 text-center font-semibold">Insufficient balance — top up in the nav bar.</p>
                )}
              </div>
            )}
          </div>

          {owned && (
            <div className="card-ink rounded-2xl p-5">
              <h4 className="font-bold flex items-center gap-2 text-white mb-4 text-sm"><Settings className="w-4 h-4 text-cyan-400" /> MT Setup Guide</h4>
              <ol className="space-y-2.5">
                {[`Download ${bot.sourceFileName}.`, 'Open MetaTrader terminal.', 'File → Open Data Folder → MQL4/MQL5 → Experts.', 'Drop EA into Experts folder.', 'Refresh Navigator and drag EA onto chart.', 'Enter license key in EA properties.'].map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-xs text-slate-500 leading-relaxed">
                    <span className="flex-shrink-0 w-4 h-4 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold font-mono text-[9px] mt-0.5">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* Code view */}
      {downloadedFile && (
        <div className="bg-black/70 border border-cyan-500/15 rounded-2xl p-6 mb-10 font-mono text-xs relative animate-fade-in">
          <div className="absolute top-4 right-4 text-[10px] text-cyan-400 bg-cyan-500/8 border border-cyan-500/15 px-2.5 py-1 rounded font-sans font-bold uppercase tracking-wider">MQL Source</div>
          <h4 className="text-sm font-sans font-bold text-white mb-4 flex items-center gap-2"><FileCode className="w-4 h-4 text-cyan-400" />{bot.sourceFileName}</h4>
          <pre className="text-slate-400 select-all p-4 bg-cyan-500/3 border border-cyan-500/8 rounded-xl overflow-x-auto">{downloadedFile}</pre>
        </div>
      )}

      {/* Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="card-ink rounded-2xl p-6 sticky top-24">
            <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2"><Star className="w-5 h-5 text-violet-400 fill-violet-400" /> Write a Review</h3>
            {userProfile && owned ? (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-2">Rating</label>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} type="button" onClick={() => setRating(s)} className={`p-1 rounded transition-colors ${rating >= s ? 'text-violet-400' : 'text-slate-700'}`}>
                        <Star className={`w-6 h-6 ${rating >= s ? 'fill-violet-400' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea required value={comment} onChange={e => setComment(e.target.value)} placeholder="Describe your experience…" rows={4} className="input-dark resize-none" />
                <button type="submit" disabled={submittingReview}
                  className="w-full btn-violet py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                  <PlusCircle className="w-4 h-4" />{submittingReview ? 'Submitting…' : 'Post Review'}
                </button>
              </form>
            ) : !userProfile ? (
              <p className="text-xs text-slate-500 text-center py-6 border border-dashed border-white/8 rounded-xl">Sign in to leave a review.</p>
            ) : (
              <p className="text-xs text-slate-500 text-center py-6 border border-dashed border-white/8 rounded-xl">Purchase this EA to write a review.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card-ink rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2 pb-4 border-b border-cyan-500/8">
              Trader Reviews <span className="text-xs bg-white/5 text-slate-400 px-2 py-0.5 rounded-full font-sans">{reviews.length}</span>
            </h3>
            {reviews.length === 0 ? (
              <div className="text-center py-12"><p className="text-xs text-slate-600 font-mono">No reviews yet. Be the first!</p></div>
            ) : (
              <div className="space-y-4 stagger-children">
                {reviews.map(rev => (
                  <div key={rev.id} className="bg-black/30 border border-cyan-500/6 p-4 rounded-xl flex gap-3 animate-fade-in hover:border-cyan-500/15 transition-colors">
                    <img referrerPolicy="no-referrer" src={rev.userPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'} alt={rev.userName} className="w-9 h-9 rounded-xl object-cover ring-1 ring-cyan-500/15 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-200 truncate">{rev.userName}</span>
                        <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${rev.rating >= s ? 'text-violet-400 fill-violet-400' : 'text-slate-700'}`} />)}</div>
                      </div>
                      <p className="text-[10px] text-slate-600 font-mono mb-2">{rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : 'Recently'}</p>
                      <p className="text-sm text-slate-400 leading-relaxed">{rev.comment}</p>
                      {userProfile?.id === rev.userId && (
                        <button onClick={() => handleDeleteReview(rev.id)} className="flex items-center gap-1 text-red-500 hover:text-red-400 text-[10px] font-bold uppercase mt-3 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat FAB */}
      <button onClick={() => setShowChat(true)} className="fixed bottom-8 right-8 z-50 btn-cyan w-14 h-14 rounded-full flex items-center justify-center shadow-2xl shadow-cyan-500/25 animate-pulse-ring">
        <MessageCircle className="w-6 h-6" />
      </button>

      {showChat && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="card-ink rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up border-cyan-500/20">
            <div className="p-4 border-b border-cyan-500/8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center"><Cpu className="w-5 h-5 text-cyan-400" /></div>
                <div>
                  <div className="text-sm font-bold text-white">{bot.ownerName}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{bot.name} developer</div>
                </div>
              </div>
              <button onClick={() => setShowChat(false)} className="text-slate-600 hover:text-white p-2 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              {chatSent ? (
                <div className="text-center py-8 animate-fade-in">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                  <h4 className="text-lg font-bold text-white mb-2">Message Sent!</h4>
                  <p className="text-sm text-slate-500">The developer will review your inquiry.</p>
                </div>
              ) : (
                <form onSubmit={e => { e.preventDefault(); setChatSent(true); setTimeout(() => { setShowChat(false); setChatSent(false); setChatMsg(''); }, 2500); }}>
                  <label className="text-xs text-slate-500 font-mono uppercase tracking-wider block mb-2">Message</label>
                  <textarea required value={chatMsg} onChange={e => setChatMsg(e.target.value)} placeholder={`Ask about ${bot.name}…`} rows={5} className="input-dark mb-4 resize-none" />
                  <button type="submit" className="btn-cyan w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm"><Send className="w-4 h-4" /> Send Message</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
