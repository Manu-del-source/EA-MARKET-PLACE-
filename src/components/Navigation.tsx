import React, { useState, useEffect } from 'react';
import { auth, signInWithGoogle, logoutUser, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { TrendingUp, Coins, LogOut, LogIn, Award, ShoppingBag, Terminal, ShieldAlert, Activity, Zap, Cpu } from 'lucide-react';

interface NavigationProps {
  userProfile: UserProfile | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  loadingAuth: boolean;
}

const TICKER_ITEMS = [
  { sym: 'EURUSD', val: '1.0847', chg: '+0.12%', up: true },
  { sym: 'XAUUSD', val: '2,341.50', chg: '+0.87%', up: true },
  { sym: 'BTCUSD', val: '67,420', chg: '-1.23%', up: false },
  { sym: 'GBPUSD', val: '1.2691', chg: '+0.08%', up: true },
  { sym: 'NASDAQ', val: '19,847', chg: '+0.34%', up: true },
  { sym: 'USDJPY', val: '157.82', chg: '-0.21%', up: false },
  { sym: 'SPX500', val: '5,307', chg: '+0.19%', up: true },
  { sym: 'ETHUSD', val: '3,521', chg: '+2.14%', up: true },
  { sym: 'USDCHF', val: '0.9012', chg: '-0.05%', up: false },
  { sym: 'AUDUSD', val: '0.6644', chg: '+0.31%', up: true },
];

export default function Navigation({ userProfile, activeTab, setActiveTab, loadingAuth }: NavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogin = async () => {
    try { await signInWithGoogle(); } catch (e) { console.error(e); }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setActiveTab('marketplace');
    } catch (e) { console.error(e); }
  };

  const handleAddFunds = async () => {
    if (!userProfile) return;
    try {
      const userRef = doc(db, 'users', userProfile.id);
      await updateDoc(userRef, { balance: userProfile.balance + 1000 });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.id}`);
    }
  };

  const navLinks = [
    { id: 'marketplace', label: 'Browse EAs', icon: <Activity className="w-3.5 h-3.5" /> },
    ...(userProfile ? [{ id: 'cabinet', label: 'My Portfolio', icon: <ShoppingBag className="w-3.5 h-3.5" /> }] : []),
    ...(userProfile?.sellerStatus === 'admin' ? [
      { id: 'seller', label: 'Upload Bot', icon: <Award className="w-3.5 h-3.5" /> },
      { id: 'admin', label: 'Admin', icon: <ShieldAlert className="w-3.5 h-3.5" />, danger: true },
    ] : []),
  ];

  return (
    <header className="sticky top-0 z-50">
      {/* Ticker tape */}
      <div className="ticker-wrap py-1.5 overflow-hidden">
        <div className="animate-ticker flex gap-12 w-max">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 text-[11px] font-mono">
              <span className="text-slate-500 font-semibold">{item.sym}</span>
              <span className="text-slate-200 font-medium">{item.val}</span>
              <span className={item.up ? 'text-emerald-400' : 'text-red-400'}>{item.chg}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Main nav */}
      <nav
        className={`transition-all duration-300 ${
          scrolled
            ? 'bg-[#030712]/95 backdrop-blur-xl border-b border-cyan-500/10 shadow-lg shadow-black/60'
            : 'bg-[#030712]/80 backdrop-blur-lg border-b border-white/5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button
              onClick={() => setActiveTab('marketplace')}
              className="flex items-center gap-3 group"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:shadow-cyan-500/55 transition-all duration-300 group-hover:scale-105">
                  <Zap className="w-5 h-5 text-[#030712] stroke-[2.5]" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-violet-400 border-2 border-[#030712] animate-pulse" />
              </div>
              <div className="text-left">
                <div className="font-black text-base tracking-tight text-white leading-none">
                  EA<span className="text-cyan-400">Market</span>
                </div>
                <div className="text-[9px] font-mono text-slate-500 tracking-[0.15em] uppercase leading-none mt-0.5">
                  Algo Trading Hub
                </div>
              </div>
            </button>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold tracking-wide transition-all duration-200 ${
                    activeTab === link.id || (link.id === 'seller' && activeTab === 'seller-add')
                      ? link.danger
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'nav-active'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </button>
              ))}
            </div>

            {/* Auth / Balance */}
            <div className="flex items-center gap-3">
              {loadingAuth ? (
                <div className="w-7 h-7 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              ) : userProfile ? (
                <div className="flex items-center gap-3">
                  {/* Balance pill */}
                  <button
                    onClick={handleAddFunds}
                    title="Click to add $1,000 simulated funds"
                    className="flex items-center gap-2 bg-cyan-500/8 hover:bg-cyan-500/15 border border-cyan-500/15 hover:border-cyan-500/35 rounded-xl px-3 py-1.5 transition-all duration-200 group"
                  >
                    <Coins className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider leading-none">Balance</div>
                      <div className="text-sm font-mono font-bold text-cyan-400 leading-tight">
                        ${userProfile.balance.toLocaleString()}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity bg-violet-500/10 px-1.5 py-0.5 rounded">+$1K</span>
                  </button>

                  {/* Profile */}
                  <div className="flex items-center gap-2 bg-white/3 border border-white/8 rounded-xl p-1.5 pl-3">
                    <div className="hidden lg:block text-right">
                      <div className="text-xs font-semibold text-white truncate max-w-[110px] leading-none">{userProfile.displayName}</div>
                      <div className="text-[9px] text-cyan-400 font-mono uppercase tracking-wider mt-0.5">
                        {userProfile.sellerStatus === 'admin' ? '⚡ Admin' : userProfile.sellerStatus === 'approved' ? 'Pro Seller' : 'Trader'}
                      </div>
                    </div>
                    <img
                      referrerPolicy="no-referrer"
                      src={userProfile.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                      alt={userProfile.displayName}
                      className="w-9 h-9 rounded-lg object-cover ring-1 ring-cyan-500/20"
                    />
                    <button
                      onClick={handleLogout}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="btn-cyan flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm"
                >
                  <LogIn className="w-4 h-4 stroke-[2.5]" />
                  <span>Connect Google</span>
                </button>
              )}

              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                <div className={`w-5 h-0.5 bg-current mb-1 transition-all ${mobileOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                <div className={`w-5 h-0.5 bg-current mb-1 transition-all ${mobileOpen ? 'opacity-0' : ''}`} />
                <div className={`w-5 h-0.5 bg-current transition-all ${mobileOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-cyan-500/10 bg-[#030712]/95 backdrop-blur-xl animate-fade-in">
            <div className="px-4 py-3 flex flex-col gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => { setActiveTab(link.id); setMobileOpen(false); }}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold text-left transition-all ${
                    activeTab === link.id
                      ? link.danger ? 'bg-red-500/10 text-red-400' : 'nav-active'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
