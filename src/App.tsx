import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  Timestamp, 
  getDoc,
  query,
  getDocs,
  where
} from 'firebase/firestore';
import { UserProfile, EABot, Purchase } from './types';
import Navigation from './components/Navigation';
import BotCard from './components/BotCard';
import BotDetails from './components/BotDetails';
import SellerWorkbench from './components/SellerWorkbench';
import MyCabinet from './components/MyCabinet';
import AdminPortal from './components/AdminPortal';
import { 
  Search, 
  SlidersHorizontal, 
  Flame, 
  LineChart, 
  CheckCircle2, 
  HelpCircle, 
  Terminal,
  ArrowUpDown,
  BookOpen,
  Mail,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('marketplace');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  // Marketplace products
  const [bots, setBots] = useState<EABot[]>([]);
  const [loadingBots, setLoadingBots] = useState(true);
  const [selectedBot, setSelectedBot] = useState<EABot | null>(null);
  
  // Purchases logged matching current user to block re-buying easily
  const [myPurchases, setMyPurchases] = useState<string[]>([]);
  
  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStrategy, setSelectedStrategy] = useState('All');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [sortBy, setSortBy] = useState<'returns' | 'drawdown' | 'rating'>('returns');

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoadingAuth(true);
      if (firebaseUser) {
        // Query /users/{userId} to check list or create profile on snap
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            // Setup profile initially with $5000 free simulated buying funds!
            const newProfile: UserProfile = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'Anonymous Trader',
              photoURL: firebaseUser.photoURL || '',
              sellerStatus: 'none',
              balance: 5000,
              createdAt: Timestamp.now()
            };
            try {
              await setDoc(userRef, newProfile);
              setUserProfile(newProfile);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
            }
          }
          setLoadingAuth(false);
        }, (error) => {
          console.error("User profile load failed gracefully: ", error);
          setLoadingAuth(false);
        });
      } else {
        setUserProfile(null);
        setMyPurchases([]);
        setLoadingAuth(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to Bots collection
  useEffect(() => {
    const botsRef = collection(db, 'bots');
    
    const unsubscribe = onSnapshot(botsRef, async (snapshot) => {
      setLoadingBots(true);
      if (!snapshot.empty) {
        const loaded: EABot[] = [];
        snapshot.forEach(docSnap => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as EABot);
        });
        setBots(loaded);
      } else {
        setBots([]);
      }
      setLoadingBots(false);
    }, (error) => {
      console.error("Bots list sync failed gracefully: ", error);
      setLoadingBots(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to user's purchases to update licensed items locally
  useEffect(() => {
    if (!userProfile) {
      setMyPurchases([]);
      return;
    }
    const q = query(collection(db, 'purchases'), where('buyerId', '==', userProfile.id));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ids: string[] = [];
      snapshot.forEach(docSnap => {
        const p = docSnap.data() as Purchase;
        ids.push(p.botId);
      });
      setMyPurchases(ids);
    }, (error) => {
      console.error("Purchases list sync failed gracefully: ", error);
    });

    return () => unsubscribe();
  }, [userProfile?.id]);

  // Handle active purchase callback
  const handlePurchaseCompleted = (botId: string, paidPrice: number) => {
    setMyPurchases(prev => [...prev, botId]);
    if (selectedBot && selectedBot.id === botId) {
      // Refresh details download block triggers instantly
      setSelectedBot(prev => prev ? { ...prev, downloads: prev.downloads + 1 } : null);
    }
  };

  // Helper filters logic
  const filteredBots = bots
    .filter(bot => {
      const matchSearch = bot.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          bot.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          bot.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'All' || bot.category === selectedCategory;
      const matchStrat = selectedStrategy === 'All' || bot.strategy === selectedStrategy;
      const matchPlatform = selectedPlatform === 'All' || bot.platform === selectedPlatform || bot.platform === 'Both';
      return matchSearch && matchCat && matchStrat && matchPlatform && bot.status === 'active';
    })
    .sort((a, b) => {
      if (sortBy === 'returns') return b.monthlyProfit - a.monthlyProfit;
      if (sortBy === 'drawdown') return a.maxDrawdown - b.maxDrawdown; // lower dd is better
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0;
    });

  const handleSelectOwnedBotFromCabinet = (bot: EABot) => {
    setSelectedBot(bot);
    setActiveTab('marketplace'); // Details page is rendered inside details layout overlay
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-400">
      
      {/* Dynamic Nav Component */}
      <Navigation 
        userProfile={userProfile} 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedBot(null); // Clear selected item on tab change
        }}
        loadingAuth={loadingAuth}
      />

      {/* Main Body Stage */}
      <main className="flex-grow">
        
        {/* Render Tab 1: Detailed single item view (Overrides browse view) */}
        {selectedBot ? (
          <BotDetails 
            bot={selectedBot}
            userProfile={userProfile}
            onBack={() => setSelectedBot(null)}
            owned={myPurchases.includes(selectedBot.id) || selectedBot.ownerId === userProfile?.id}
            onPurchaseSuccess={handlePurchaseCompleted}
          />
        ) : (
          <>
            {/* Tab: Marketplace (Browse) */}
            {activeTab === 'marketplace' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
                
                {/* Hero Header Promotion */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 mb-8 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-6 shadow-xl shadow-slate-950/50">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/[0.03] blur-3xl rounded-full"></div>
                  
                  <div className="space-y-3 z-10 max-w-xl text-center lg:text-left">
                    <span className="font-mono text-xs text-emerald-400 font-bold uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-full inline-block">
                      Enterprise Auto-Trading Marketplace
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-extrabold font-sans text-white tracking-tight leading-none">
                      Deploy Expert Advisors
                    </h1>
                    <p className="text-sm text-slate-450 text-slate-400 leading-relaxed">
                      Evaluate, acquire, or publish fully automated trading strategies for MetaTrader. Acquire licenses instantly using simulated test balances.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 shrink-0 font-mono z-10 w-full sm:w-auto">
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-center">
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Listed Bots</span>
                      <span className="text-lg font-bold text-emerald-400 mt-1 block">{bots.length} active</span>
                    </div>
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-center">
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold font-semibold">Global Installs</span>
                      <span className="text-lg font-bold text-blue-400 mt-1 block">
                        {bots.reduce((sum, b) => sum + b.downloads, 0)} total
                      </span>
                    </div>
                  </div>
                </div>

                {/* Filters Board */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-8 flex flex-col gap-4">
                  
                  {/* Search and Sort controls */}
                  <div className="flex flex-col lg:flex-row items-center gap-4">
                    <div className="relative w-full lg:flex-1">
                      <Search className="absolute inset-y-0 left-0 pl-3.5 my-auto w-4.5 h-4.5 text-slate-500 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by bot title, trading logic, parameter, or developer..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-emerald-500/80 transition text-slate-200"
                      />
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto py-1">
                      <div className="flex items-center space-x-2 bg-slate-950 px-3 py-2.5 rounded-xl border border-slate-850 shrink-0">
                        <ArrowUpDown className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs text-slate-500 font-mono uppercase font-semibold">Sort</span>
                      </div>
                      <div className="flex bg-slate-950 p-1 border border-slate-850 rounded-xl shrink-0">
                        <button
                          onClick={() => setSortBy('returns')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            sortBy === 'returns' ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Returns (%)
                        </button>
                        <button
                          onClick={() => setSortBy('drawdown')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            sortBy === 'drawdown' ? 'bg-emerald-500/10 text-emerald-450 text-emerald-400' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Drawdown (Low)
                        </button>
                        <button
                          onClick={() => setSortBy('rating')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            sortBy === 'rating' ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Rating
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Badges Filters row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-850 pt-4">
                    {/* Category asset filter */}
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block mb-1.5">Asset Market Focus</span>
                      <div className="flex flex-wrap gap-1.5">
                        {['All', 'Forex', 'Crypto', 'Indices', 'Commodities'].map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                              selectedCategory === cat 
                                ? 'bg-slate-850 border border-emerald-500/25 text-emerald-400' 
                                : 'bg-slate-950/60 border border-slate-850 text-slate-400 hover:text-white'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Strategy type filter */}
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block mb-1.5">Algorithm Class Strategy</span>
                      <div className="flex flex-wrap gap-1.5">
                        {['All', 'Grid', 'Hedging', 'Scalping', 'Trend', 'Arbitrage'].map((strat) => (
                          <button
                            key={strat}
                            onClick={() => setSelectedStrategy(strat)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                              selectedStrategy === strat 
                                ? 'bg-slate-850 border border-emerald-500/25 text-emerald-400' 
                                : 'bg-slate-950/60 border border-slate-850 text-slate-400 hover:text-white'
                            }`}
                          >
                            {strat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Platform compatibility mode */}
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block mb-1.5">Terminal Runtime</span>
                      <div className="flex flex-wrap gap-1.5">
                        {['All', 'MT4', 'MT5'].map((plat) => (
                          <button
                            key={plat}
                            onClick={() => setSelectedPlatform(plat)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                              selectedPlatform === plat 
                                ? 'bg-slate-850 border border-emerald-500/25 text-emerald-400' 
                                : 'bg-slate-950/60 border border-slate-850 text-slate-400 hover:text-white'
                            }`}
                          >
                            {plat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Products Grid Output */}
                {loadingBots ? (
                  <div className="flex items-center justify-center py-24">
                    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : filteredBots.length === 0 ? (
                  <div className="text-center bg-slate-900 border border-slate-850 p-16 rounded-3xl text-slate-500">
                    <SlidersHorizontal className="w-12 h-12 stroke-[1.5] mx-auto mb-3" />
                    <h3 className="font-sans font-bold text-lg text-slate-355 text-slate-350">No trading bots match your filter</h3>
                    <p className="text-xs font-mono mt-1.5">Try relaxing your search terms or choosing 'All' strategies.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBots.map((bot) => (
                      <BotCard 
                        key={bot.id} 
                        bot={bot} 
                        onSelect={(b) => setSelectedBot(b)}
                        owned={myPurchases.includes(bot.id) || bot.ownerId === userProfile?.id}
                      />
                    ))}
                  </div>
                )}

              </div>
            )}

            {/* Tab: Licensed EAs */}
            {activeTab === 'cabinet' && (
              <MyCabinet 
                userProfile={userProfile} 
                bots={bots} 
                onSelectBot={handleSelectOwnedBotFromCabinet}
              />
            )}

            {/* Tab: Seller Workbench */}
            {activeTab === 'seller' && userProfile?.sellerStatus === 'admin' && (
              <SellerWorkbench
                userProfile={userProfile}
                myBots={bots.filter(b => b.ownerId === userProfile?.id)}
                onBotAdded={() => {
                  setSelectedBot(null);
                  setActiveTab('seller');
                }}
                onBotDeleted={() => {
                  setSelectedBot(null);
                  setActiveTab('seller');
                }}
              />
            )}

            {/* Tab: Admin Portal */}
            {activeTab === 'admin' && userProfile?.sellerStatus === 'admin' && (
              <AdminPortal
                userProfile={userProfile}
                bots={bots}
              />
            )}
          </>
        )}

      </main>

      {/* Footer Branding Area */}
      <footer className="bg-slate-950 border-t border-slate-900 text-slate-500 text-xs py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <span className="font-mono text-slate-300 font-semibold uppercase tracking-wider">EA Marketplace Engine v2.10</span>
          </div>

          <p className="text-center md:text-right text-[11px] leading-relaxed max-w-sm font-mono text-slate-600">
            Simulated portfolio playground. License activation keys are provided for test purposes only. Always execute backtests inside secure sandbox accounts first.
          </p>
        </div>
      </footer>

    </div>
  );
}
