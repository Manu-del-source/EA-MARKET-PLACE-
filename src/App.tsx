import React, { useState, useEffect, useRef } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, doc, onSnapshot, setDoc, Timestamp, getDoc,
  query, getDocs, where
} from 'firebase/firestore';
import { UserProfile, EABot, Purchase } from './types';
import Navigation from './components/Navigation';
import BotCard from './components/BotCard';
import BotDetails from './components/BotDetails';
import SellerWorkbench from './components/SellerWorkbench';
import MyCabinet from './components/MyCabinet';
import AdminPortal from './components/AdminPortal';
import { 
  Search, SlidersHorizontal, Terminal, ArrowRight, Zap,
  TrendingUp, Shield, Users, X
} from 'lucide-react';

const STATS = [
  { label: 'Expert Advisors', value: '240+', icon: <Terminal className="w-5 h-5" />, color: 'text-cyan-400' },
  { label: 'Active Traders',  value: '12,400', icon: <Users className="w-5 h-5" />, color: 'text-violet-400' },
  { label: 'Avg Monthly Return', value: '18.7%', icon: <TrendingUp className="w-5 h-5" />, color: 'text-emerald-400' },
  { label: 'Verified Developers', value: '85', icon: <Shield className="w-5 h-5" />, color: 'text-cyan-400' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('marketplace');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [bots, setBots] = useState<EABot[]>([]);
  const [loadingBots, setLoadingBots] = useState(true);
  const [selectedBot, setSelectedBot] = useState<EABot | null>(null);
  const [myPurchases, setMyPurchases] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStrategy, setSelectedStrategy] = useState('All');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [sortBy, setSortBy] = useState<'returns' | 'drawdown' | 'rating'>('returns');
  const [showFilters, setShowFilters] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  /* ── Particle canvas — cyan/violet palette ── */
  useEffect(() => {
    if (activeTab !== 'marketplace' || selectedBot) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    const HEIGHT = 560;
    canvas.height = HEIGHT;

    type Particle = { x: number; y: number; vx: number; vy: number; alpha: number; size: number; violet: boolean };
    const particles: Particle[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * HEIGHT,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        alpha: Math.random() * 0.45 + 0.06,
        size: Math.random() * 2 + 0.5,
        violet: Math.random() < 0.35,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, HEIGHT);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = HEIGHT;
        if (p.y > HEIGHT) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.violet
          ? `rgba(139,92,246,${p.alpha})`
          : `rgba(6,182,212,${p.alpha})`;
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 110) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(6,182,212,${0.07 * (1 - d / 110)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => { width = canvas.width = window.innerWidth; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', onResize); };
  }, [activeTab, selectedBot]);

  /* ── Auth ── */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoadingAuth(true);
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'Anonymous Trader',
              photoURL: firebaseUser.photoURL || '',
              sellerStatus: 'none',
              balance: 5000,
              createdAt: Timestamp.now(),
            };
            try {
              await setDoc(userRef, newProfile);
              setUserProfile(newProfile);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
            }
          }
          setLoadingAuth(false);
        }, (error) => { console.error(error); setLoadingAuth(false); });
      } else {
        setUserProfile(null);
        setMyPurchases([]);
        setLoadingAuth(false);
      }
    });
    return () => unsubscribe();
  }, []);

  /* ── Bots ── */
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'bots'), (snapshot) => {
      setLoadingBots(true);
      const loaded: EABot[] = [];
      snapshot.forEach(docSnap => loaded.push({ id: docSnap.id, ...docSnap.data() } as EABot));
      setBots(loaded);
      setLoadingBots(false);
    }, (error) => { console.error(error); setLoadingBots(false); });
    return () => unsubscribe();
  }, []);

  /* ── Purchases ── */
  useEffect(() => {
    if (!userProfile) { setMyPurchases([]); return; }
    const q = query(collection(db, 'purchases'), where('buyerId', '==', userProfile.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ids: string[] = [];
      snapshot.forEach(docSnap => ids.push((docSnap.data() as Purchase).botId));
      setMyPurchases(ids);
    });
    return () => unsubscribe();
  }, [userProfile?.id]);

  const handlePurchaseCompleted = (botId: string, paidPrice: number) => {
    setMyPurchases(prev => [...prev, botId]);
    if (selectedBot?.id === botId) {
      setSelectedBot(prev => prev ? { ...prev, downloads: prev.downloads + 1 } : null);
    }
  };

  const filteredBots = bots
    .filter(bot => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        bot.name.toLowerCase().includes(q) ||
        bot.description.toLowerCase().includes(q) ||
        bot.ownerName.toLowerCase().includes(q);
      const matchCat = selectedCategory === 'All' || bot.category === selectedCategory;
      const matchStrat = selectedStrategy === 'All' || bot.strategy === selectedStrategy;
      const matchPlatform = selectedPlatform === 'All' || bot.platform === selectedPlatform || bot.platform === 'Both';
      return matchSearch && matchCat && matchStrat && matchPlatform && bot.status === 'active';
    })
    .sort((a, b) => {
      if (sortBy === 'returns') return b.monthlyProfit - a.monthlyProfit;
      if (sortBy === 'drawdown') return a.maxDrawdown - b.maxDrawdown;
      return b.rating - a.rating;
    });

  const handleSelectOwnedBotFromCabinet = (bot: EABot) => {
    setSelectedBot(bot);
    setActiveTab('marketplace');
  };

  const renderMarketplace = () => {
    if (selectedBot) {
      return (
        <BotDetails
          bot={selectedBot}
          userProfile={userProfile}
          onBack={() => setSelectedBot(null)}
          owned={myPurchases.includes(selectedBot.id)}
          onPurchaseSuccess={handlePurchaseCompleted}
        />
      );
    }

    return (
      <div>
        {/* ── Hero ── */}
        <div className="relative overflow-hidden hero-grid" style={{ minHeight: 560 }}>
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: 560 }}
          />
          {/* Gradient washes */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030712]/10 to-[#030712]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/70 via-transparent to-[#030712]/70" />

          {/* Orbs */}
          <div className="orb orb-cyan w-[500px] h-[500px] -top-32 -left-32 animate-glow-pulse-cyan" />
          <div className="orb orb-violet w-[400px] h-[400px] -top-20 right-0 animate-glow-pulse-violet" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 bg-cyan-500/8 border border-cyan-500/18 rounded-full px-4 py-1.5 mb-7 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-[0.18em]">
                Live Marketplace · {bots.filter(b => b.status === 'active').length} Active EAs
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.02] mb-6 animate-fade-in" style={{ animationDelay: '70ms' }}>
              <span className="text-white">The World's Most</span>
              <br />
              <span className="text-hero-gradient">Advanced EA</span>
              <br />
              <span className="text-white">Trading Hub</span>
            </h1>

            <p className="text-slate-400 text-lg max-w-xl mb-10 leading-relaxed animate-fade-in" style={{ animationDelay: '140ms' }}>
              Browse, license, and deploy battle-tested Expert Advisors for MetaTrader 4 &amp; 5.
              Institutional-grade algorithms — one click away.
            </p>

            <div className="flex flex-wrap gap-4 animate-fade-in" style={{ animationDelay: '220ms' }}>
              <button
                onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-cyan flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm"
              >
                Browse All EAs <ArrowRight className="w-4 h-4" />
              </button>
              {!userProfile && (
                <button className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-white border border-white/12 hover:border-cyan-500/35 hover:bg-cyan-500/5 transition-all">
                  <Zap className="w-4 h-4 text-cyan-400" /> Get Started Free
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 stagger-children">
              {STATS.map((stat, i) => (
                <div key={i} className="metric-tile p-4 animate-fade-in-up" style={{ animationDelay: `${300 + i * 70}ms` }}>
                  <div className={`flex items-center gap-2 mb-2 ${stat.color} opacity-70`}>
                    {stat.icon}
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">{stat.label}</span>
                  </div>
                  <div className={`text-2xl font-black font-mono ${stat.color}`}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Catalog ── */}
        <div id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Search bar */}
          <div className="flex flex-col gap-3 mb-8">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-grow min-w-[220px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search EAs by name, strategy, developer…"
                  className="input-dark pl-11 h-11 text-sm"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="input-dark h-11 w-44 text-sm"
              >
                <option value="returns">↑ Best Returns</option>
                <option value="drawdown">↓ Low Drawdown</option>
                <option value="rating">★ Top Rated</option>
              </select>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-semibold border transition-all ${
                  showFilters
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25'
                    : 'text-slate-400 border-white/8 hover:border-white/18 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {(selectedCategory !== 'All' || selectedStrategy !== 'All' || selectedPlatform !== 'All') && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                )}
              </button>
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-5 p-5 bg-white/2 border border-cyan-500/8 rounded-2xl animate-fade-in">
                {/* Category */}
                <div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">Asset Class</div>
                  <div className="flex flex-wrap gap-1.5">
                    {['All', 'Forex', 'Crypto', 'Indices', 'Commodities'].map(c => (
                      <button key={c} onClick={() => setSelectedCategory(c)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                          selectedCategory === c
                            ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                            : 'text-slate-400 border-white/8 hover:border-white/18 hover:text-slate-200'
                        }`}
                      >{c}</button>
                    ))}
                  </div>
                </div>
                {/* Strategy */}
                <div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">Strategy</div>
                  <div className="flex flex-wrap gap-1.5">
                    {['All', 'Grid', 'Hedging', 'Scalping', 'Trend', 'Arbitrage', 'News'].map(s => (
                      <button key={s} onClick={() => setSelectedStrategy(s)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                          selectedStrategy === s
                            ? 'bg-violet-500/15 text-violet-400 border-violet-500/30'
                            : 'text-slate-400 border-white/8 hover:border-white/18 hover:text-slate-200'
                        }`}
                      >{s}</button>
                    ))}
                  </div>
                </div>
                {/* Platform */}
                <div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">Platform</div>
                  <div className="flex gap-1.5">
                    {['All', 'MT4', 'MT5'].map(p => (
                      <button key={p} onClick={() => setSelectedPlatform(p)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                          selectedPlatform === p
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'text-slate-400 border-white/8 hover:border-white/18 hover:text-slate-200'
                        }`}
                      >{p}</button>
                    ))}
                  </div>
                </div>
                {(selectedCategory !== 'All' || selectedStrategy !== 'All' || selectedPlatform !== 'All') && (
                  <button
                    onClick={() => { setSelectedCategory('All'); setSelectedStrategy('All'); setSelectedPlatform('All'); }}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-400/40 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all self-end"
                  >
                    <X className="w-3 h-3" /> Clear all
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                <span className="text-white font-semibold">{filteredBots.length}</span> Expert Advisors
                {searchQuery && <> for "<span className="text-cyan-400">{searchQuery}</span>"</>}
              </span>
            </div>
          </div>

          {/* Grid */}
          {loadingBots ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton h-80 rounded-2xl" style={{ animationDelay: `${i * 60}ms` }} />
              ))}
            </div>
          ) : filteredBots.length === 0 ? (
            <div className="text-center py-28 animate-fade-in">
              <div className="text-7xl mb-5">🤖</div>
              <h3 className="text-xl font-bold text-white mb-2">No EAs found</h3>
              <p className="text-slate-500 text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 stagger-children">
              {filteredBots.map(bot => (
                <BotCard
                  key={bot.id}
                  bot={bot}
                  onSelect={setSelectedBot}
                  owned={myPurchases.includes(bot.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col scan-overlay">
      <Navigation
        userProfile={userProfile}
        activeTab={activeTab}
        setActiveTab={(tab) => { setActiveTab(tab); setSelectedBot(null); }}
        loadingAuth={loadingAuth}
      />

      <main className="flex-grow">
        {activeTab === 'marketplace' && renderMarketplace()}
        {activeTab === 'cabinet' && (
          <MyCabinet
            userProfile={userProfile}
            bots={bots}
            onSelectBot={handleSelectOwnedBotFromCabinet}
          />
        )}
        {activeTab === 'seller' && (
          <SellerWorkbench
            userProfile={userProfile}
            myBots={bots.filter(b => b.ownerId === userProfile?.id)}
            onBotAdded={() => {}}
            onBotDeleted={() => {}}
          />
        )}
        {activeTab === 'admin' && (
          <AdminPortal userProfile={userProfile} bots={bots} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-cyan-500/8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <Zap className="w-5 h-5 text-[#030712] stroke-[2.5]" />
              </div>
              <div>
                <div className="font-black text-sm text-white">EA<span className="text-cyan-400">Market</span></div>
                <div className="text-[9px] text-slate-600 font-mono uppercase tracking-widest">Algo Trading Hub</div>
              </div>
            </div>
            <p className="text-xs text-slate-600 font-mono text-center">
              © 2026 EAMarket · Simulated marketplace for algorithmic trading strategies
            </p>
            <div className="flex items-center gap-1 text-[10px] text-slate-600 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
