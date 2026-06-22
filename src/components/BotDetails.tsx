import React, { useState, useEffect } from 'react';
import { EABot, UserProfile, Purchase, Review, ChartPoint } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, updateDoc, doc, setDoc, query, where, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
import { generateBacktestCurve, simulateDownloadFile } from '../utils/simulation';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend
} from 'recharts';
import { 
  ArrowLeft, 
  Settings, 
  Activity, 
  FileCode, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  PlusCircle, 
  Star, 
  Trash2,
  Lock,
  Cpu,
  RefreshCw,
  MessageCircle,
  X,
  Send
} from 'lucide-react';

interface BotDetailsProps {
  bot: EABot;
  userProfile: UserProfile | null;
  onBack: () => void;
  owned: boolean;
  onPurchaseSuccess: (botId: string, balancePaid: number) => void;
}

export default function BotDetails({ bot, userProfile, onBack, owned, onPurchaseSuccess }: BotDetailsProps) {
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [profitGrowthData, setProfitGrowthData] = useState<{ month: string; "Profit Growth (%)": number; "Target Average (%)": number }[]>([]);
  const [chartTab, setChartTab] = useState<'profit6m' | 'balance12m'>('profit6m');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [purchasing, setPurchasing] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState<Purchase | null>(null);
  
  // Review form states
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  
  // Download states
  const [downloadedFile, setDownloadedFile] = useState<string | null>(null);

  // Chat Modal States
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatSent, setChatSent] = useState(false);

  // Generate chart data based on bot parameters
  useEffect(() => {
    setChartData(generateBacktestCurve(bot.winRate, bot.monthlyProfit, bot.maxDrawdown));
    
    // Generate simulated past 6 months profit growth data
    // We base it on current date (June 2026 as per our environment metadata: June 21, 2026)
    // The past 6 completed months: Jan 26, Feb 26, Mar 26, Apr 26, May 26, Jun 26
    const pData = [];
    const months = ["Jan 26", "Feb 26", "Mar 26", "Apr 26", "May 26", "Jun 26"];
    const seed = bot.name.charCodeAt(0) + bot.name.charCodeAt(bot.name.length - 1);
    
    for (let i = 0; i < 6; i++) {
      // Create some variance based on winRate + maxDrawdown
      const monthFactor = 0.8 + ((seed * (i + 3)) % 45) / 100; // variance factor around 0.8 - 1.25
      const randomJitter = (Math.random() * 0.1) - 0.05; // small random factor
      const profitVal = parseFloat((bot.monthlyProfit * (monthFactor + randomJitter)).toFixed(2));
      
      pData.push({
        month: months[i],
        "Profit Growth (%)": profitVal,
        "Target Average (%)": bot.monthlyProfit
      });
    }
    setProfitGrowthData(pData);

    loadReviews();
    if (owned && userProfile) {
      loadLicenseInfo();
    }
  }, [bot.id, bot.winRate, bot.monthlyProfit, bot.maxDrawdown, bot.name, owned, userProfile?.id]);

  const loadReviews = async () => {
    const q = query(collection(db, 'reviews'), where('botId', '==', bot.id));
    try {
      const snap = await getDocs(q);
      const revs: Review[] = [];
      snap.forEach(docSnap => {
        revs.push({ id: docSnap.id, ...docSnap.data() } as Review);
      });
      // Sort reviews descending by date
      revs.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      setReviews(revs);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'reviews');
    }
  };

  const loadLicenseInfo = async () => {
    if (!userProfile) return;
    const purchaseId = `${userProfile.id}_${bot.id}`;
    try {
      const docSnap = await getDocs(query(collection(db, 'purchases'), 
        where('buyerId', '==', userProfile.id), 
        where('botId', '==', bot.id)
      ));
      if (!docSnap.empty) {
        setLicenseInfo({ id: docSnap.docs[0].id, ...docSnap.docs[0].data() } as Purchase);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `purchases/${purchaseId}`);
    }
  };

  const handleCheckout = async () => {
    if (!userProfile) return;
    if (userProfile.balance < bot.price) {
      alert("Simulated balance insufficient! Add $1,000 using the 'Sim Balance' link in the top bar.");
      return;
    }

    setPurchasing(true);
    const purchaseId = `${userProfile.id}_${bot.id}`;
    // Generate terminal-acceptable 16-char GUID license key
    const generatedLicense = "MT-" + Math.random().toString(36).substring(2, 10).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    try {
      // 1. Write the purchase lock (representing an immutable payment receipt)
      const purchaseRef = doc(db, 'purchases', purchaseId);
      await setDoc(purchaseRef, {
        id: purchaseId,
        buyerId: userProfile.id,
        botId: bot.id,
        botName: bot.name,
        price: bot.price,
        licenseKey: generatedLicense,
        purchaseDate: Timestamp.now()
      });

      // 2. Debit client's simulated funds
      const userRef = doc(db, 'users', userProfile.id);
      await updateDoc(userRef, {
        balance: userProfile.balance - bot.price
      });

      // 3. Increment EA download count
      const botRef = doc(db, 'bots', bot.id);
      await updateDoc(botRef, {
        downloads: bot.downloads + 1,
        updatedAt: Timestamp.now()
      });

      // 4. Update parent state
      onPurchaseSuccess(bot.id, bot.price);
      setLicenseInfo({
        id: purchaseId,
        buyerId: userProfile.id,
        botId: bot.id,
        botName: bot.name,
        price: bot.price,
        licenseKey: generatedLicense,
        purchaseDate: Timestamp.now()
      });

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `purchases/${purchaseId}`);
    } finally {
      setPurchasing(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !comment.trim()) return;

    setSubmittingReview(true);
    const reviewId = `${userProfile.id}_${bot.id}_rev`;
    const newReview: Omit<Review, 'id'> = {
      userId: userProfile.id,
      userName: userProfile.displayName,
      userPhoto: userProfile.photoURL,
      botId: bot.id,
      rating,
      comment: comment.trim(),
      createdAt: Timestamp.now()
    };

    try {
      // Create review document in reviews collection
      await setDoc(doc(db, 'reviews', reviewId), newReview);
      
      // Clear form inputs
      setComment('');
      loadReviews();

      // Recalculate Bot average rating
      // For dynamic responsiveness without complex backend triggers:
      const allRevs = [...reviews, { id: reviewId, ...newReview } as Review];
      const avgRating = parseFloat((allRevs.reduce((acc, curr) => acc + curr.rating, 0) / allRevs.length).toFixed(1));
      
      const botRef = doc(db, 'bots', bot.id);
      await updateDoc(botRef, {
        rating: avgRating,
        updatedAt: Timestamp.now()
      });

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `reviews/${reviewId}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!userProfile) return;
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      const updatedRevs = reviews.filter(r => r.id !== reviewId);
      setReviews(updatedRevs);

      // Recalculate rating
      const avgRating = updatedRevs.length === 0 
        ? 0 
        : parseFloat((updatedRevs.reduce((acc, curr) => acc + curr.rating, 0) / updatedRevs.length).toFixed(1));
      
      const botRef = doc(db, 'bots', bot.id);
      await updateDoc(botRef, {
        rating: avgRating,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reviews/${reviewId}`);
    }
  };

  const triggerDownloadSim = () => {
    if (!licenseInfo) return;
    const fileSource = simulateDownloadFile(bot.name, bot.sourceFileName, licenseInfo.licenseKey);
    setDownloadedFile(fileSource);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setChatSent(true);
    setTimeout(() => {
      setShowChatModal(false);
      setChatSent(false);
      setChatMessage('');
    }, 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in text-white/90">
      
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 border border-slate-800 rounded-xl px-4 py-2 text-xs font-semibold mr-auto transition-all mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Marketplace</span>
      </button>

      {/* Hero Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Core Product Details (Col-2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-semibold uppercase tracking-widest block mb-1">
                  {bot.strategy} EA
                </span>
                <h1 className="text-3xl font-bold font-sans tracking-tight text-white mb-1.5">
                  {bot.name}
                </h1>
                <p className="text-sm text-slate-400 font-medium">
                  Listed by <span className="text-slate-300 font-semibold">{bot.ownerName}</span>
                </p>
              </div>

              <div className="flex items-center space-x-3.5">
                <div className="bg-slate-950 px-4 py-2 border border-slate-800 rounded-2xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Platform</span>
                  <span className="text-sm font-sans font-extrabold text-emerald-400">{bot.platform}</span>
                </div>
                <div className="bg-slate-950 px-4 py-2 border border-slate-800 rounded-2xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Market</span>
                  <span className="text-sm font-sans font-extrabold text-blue-400">{bot.category}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800 pb-2">Description & Strategy</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-6 whitespace-pre-wrap">
              {bot.description}
            </p>

            {/* Statistics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/80 p-5 rounded-2xl border border-slate-800/80">
              <div className="text-center md:text-left">
                <span className="text-xs text-slate-500 font-mono block uppercase">Expected Returns</span>
                <span className="text-xl font-mono text-emerald-450 font-bold text-emerald-400 mt-1 block">
                  +{bot.monthlyProfit}% <span className="text-xs font-normal text-slate-400">/ mo</span>
                </span>
              </div>
              <div className="text-center md:text-left border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-5">
                <span className="text-xs text-slate-500 font-mono block uppercase">Max Drawdown</span>
                <span className="text-xl font-mono text-rose-400 font-bold mt-1 block">
                  {bot.maxDrawdown}% <span className="text-xs font-normal text-slate-400">(Tested)</span>
                </span>
              </div>
              <div className="text-center md:text-left border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-5">
                <span className="text-xs text-slate-500 font-mono block uppercase">Win Ratio</span>
                <span className="text-xl font-mono text-amber-400 font-bold mt-1 block">
                  {bot.winRate}% <span className="text-xs font-normal text-slate-400">rate</span>
                </span>
              </div>
              <div className="text-center md:text-left border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-5">
                <span className="text-xs text-slate-500 font-mono block uppercase">Downloads</span>
                <span className="text-xl font-mono text-blue-400 font-bold mt-1 block">
                  {bot.downloads} <span className="text-xs font-normal text-slate-400">licenses</span>
                </span>
              </div>
            </div>
          </div>

          {/* Performance Curves Graph */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-3 border-b border-slate-850 gap-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold font-sans text-white">Simulated Historical Performance</h3>
              </div>
              
              {/* Tab Toggles for Charts */}
              <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-xl">
                <button
                  onClick={() => setChartTab('profit6m')}
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    chartTab === 'profit6m' 
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  6M Profit Growth
                </button>
                <button
                  onClick={() => setChartTab('balance12m')}
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    chartTab === 'balance12m' 
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  12M Equity Curve
                </button>
              </div>
            </div>

            {chartTab === 'profit6m' ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs text-slate-400 font-mono">TREND: Monthly Net Income Growth</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-mono uppercase font-semibold">
                    Simulated Past 6 Months
                  </span>
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={profitGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                      <YAxis stroke="#64748b" unit="%" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                        labelStyle={{ color: '#fff', fontFamily: 'monospace', fontSize: '11px' }}
                        itemStyle={{ fontFamily: 'monospace', fontSize: '11px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                      <Line 
                        type="monotone" 
                        dataKey="Profit Growth (%)" 
                        stroke="#10b981" 
                        strokeWidth={3} 
                        activeDot={{ r: 8 }} 
                        dot={{ stroke: '#059669', strokeWidth: 2, r: 4 }}
                        name="Profit Growth (%)" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Target Average (%)" 
                        stroke="#64748b" 
                        strokeWidth={1.5} 
                        strokeDasharray="5 5" 
                        name="Target Mean (%)" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-slate-500 font-mono text-center mt-2">
                  This trend line projects monthly algorithmic profit growth from January to June 2026 based on winRate ({bot.winRate}%) parameters.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs text-slate-400 font-mono">PROGRESSION: Capital Balance vs Equity</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-mono uppercase font-semibold">
                    10K Start Capital
                  </span>
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="period" stroke="#64748b" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                      <YAxis stroke="#64748b" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                      <Line type="monotone" dataKey="Balance" stroke="#34d399" strokeWidth={2.5} activeDot={{ r: 8 }} name="Balance ($)" />
                      <Line type="monotone" dataKey="Equity" stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="5 5" name="Equity ($)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-slate-500 font-mono text-center mt-2">
                  Note: Simulative rendering generated dynamically matching winRate ({bot.winRate}%) and drawdown limits. Past performance does not guarantee future results.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Purchase & Licensing Sidebar (Col-1) */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-emerald-500/20 rounded-3xl p-6 relative overflow-hidden">
            {/* Gradient background highlights */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full"></div>
            
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Licensing Terminal</span>
            </h3>

            {/* Price section */}
            <div className="flex items-baseline space-x-2 bg-slate-950 p-4 rounded-2xl border border-slate-800/80 mb-6">
              <span className="text-xs text-slate-400 font-medium">Single Dev License:</span>
              <span className="text-2xl font-mono font-black text-white ml-auto">
                {bot.price === 0 ? <span className="text-emerald-400">FREE</span> : `$${bot.price}`}
              </span>
            </div>

            {/* Display status depending on whether verified profile owns the EA bot already */}
            {owned ? (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wide">License Active</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      You own a verified license key for <strong>{bot.name}</strong>. Assign it to your platform terminals.
                    </p>
                  </div>
                </div>

                {/* License details */}
                {licenseInfo && (
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs font-mono space-y-2">
                    <div className="flex justify-between border-b border-slate-850 pb-1.5">
                      <span className="text-slate-500">License ID:</span>
                      <span className="text-slate-300">{licenseInfo.id}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-850 pb-1.5">
                      <span className="text-slate-500">Key:</span>
                      <span className="text-amber-400 font-semibold">{licenseInfo.licenseKey}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status:</span>
                      <span className="text-emerald-400">ONLINE</span>
                    </div>
                  </div>
                )}

                {/* Simulated File Download Button */}
                <button
                  id="simulate-download-btn"
                  onClick={triggerDownloadSim}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3.5 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/10 transition-all font-sans"
                >
                  <Download className="w-5 h-5" />
                  <span>Download EA Bot File</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {userProfile ? (
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center mb-4">
                    <span className="text-xs text-slate-400 block mb-1">Your Available Sim Balance:</span>
                    <span className="text-lg font-mono font-bold text-amber-450 text-amber-400">
                      ${userProfile.balance.toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-start space-x-3 mb-4">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-300">
                      You must sign in to acquire and deploy licenses for this Expert Advisor.
                    </p>
                  </div>
                )}

                <button
                  id="checkout-license-btn"
                  disabled={!userProfile || purchasing}
                  onClick={handleCheckout}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 py-3.5 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/10 transition-all"
                >
                  {purchasing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Securing License...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>{bot.price === 0 ? "Get Free License" : "Purchase & License"}</span>
                    </>
                  )}
                </button>
                
                {userProfile && userProfile.balance < bot.price && (
                  <p className="text-xs text-rose-400 text-center font-semibold mt-2">
                    Insufficient Balance! Click "Sim Balance" in navbar to add mock cash.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Quick Setup Instructions if owned */}
          {owned && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-sm">
              <h4 className="font-bold flex items-center space-x-2 text-white mb-3">
                <Settings className="w-4 h-4 text-emerald-400" />
                <span>Integration Instructions</span>
              </h4>
              <ol className="list-decimal pl-4 space-y-2 text-xs text-slate-400">
                <li>Download your EA bot file (<span className="font-mono text-emerald-400">{bot.sourceFileName}</span>) with included license parameters.</li>
                <li>Open your Metatrader terminal workspace.</li>
                <li>Go to <span className="text-slate-300">File &gt; Open Data Folder &gt; MQL4/MQL5 &gt; Experts</span>.</li>
                <li>Drag and drop the downloaded file there.</li>
                <li>Refresh your navigator menu and drag the bot onto your active chart window.</li>
                <li>Enter your custom generated License Key in the EA properties popup.</li>
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* Code Display Sandbox if downloaded */}
      {downloadedFile && (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 mb-8 font-mono text-xs overflow-x-auto relative">
          <div className="absolute top-4 right-4 text-[10px] text-emerald-400 uppercase font-bold bg-emerald-500/10 px-2 py-1 rounded">
            MQL Live Code
          </div>
          <h4 className="text-sm font-sans font-bold text-white mb-3 flex items-center space-x-2">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span>Generated EX Compiler Snippet ({bot.sourceFileName})</span>
          </h4>
          <pre className="text-slate-400 select-all p-4 bg-slate-900/60 rounded-xl overflow-x-auto line-clamp-[25] hover:line-clamp-none transition-all duration-350 cursor-pointer">
            {downloadedFile}
          </pre>
        </div>
      )}

      {/* Community review boards section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Write a Review Form if owned */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sticky top-28">
            <h3 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span>Give Your Review</span>
            </h3>

            {userProfile && owned ? (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 font-mono block uppercase mb-1">Rating Score</label>
                  <div className="flex items-center space-x-1.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setRating(s)}
                        className={`p-1.5 rounded-lg transition-all ${
                          rating >= s ? 'text-amber-400' : 'text-slate-600'
                        }`}
                      >
                        <Star className={`w-6 h-6 ${rating >= s ? 'fill-amber-400' : 'fill-transparent'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-mono block uppercase mb-1">Written Feedback</label>
                  <textarea
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Describe your returns, drawdown, win experiences, or recommended settings..."
                    rows={4}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 transition-all text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Post Review</span>
                </button>
              </form>
            ) : !userProfile ? (
              <p className="text-xs text-slate-400 text-center leading-relaxed py-4 border border-dashed border-slate-800 rounded-2xl">
                Please connect your wallet in the navbar to rate this bot.
              </p>
            ) : (
              <p className="text-xs text-slate-400 text-center leading-relaxed py-4 border border-dashed border-slate-800 rounded-2xl">
                You must possess an active licensed installation of this EA to post your trading performance feedback.
              </p>
            )}
          </div>
        </div>

        {/* Reviews List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-base font-bold text-white mb-6 flex items-center space-x-2 pb-3 border-b border-slate-850">
              <span>Trader Reviews</span>
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-sans font-semibold">
                {reviews.length} total
              </span>
            </h3>

            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xs text-slate-500 font-mono">No reviews listed for this EA yet. Be the first to try and rate it!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="bg-slate-950/60 p-4 border border-slate-850 rounded-2xl flex items-start space-x-3 text-slate-300">
                    <img
                      referrerPolicy="no-referrer"
                      src={rev.userPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                      alt={rev.userName}
                      className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-800 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-slate-200 truncate">{rev.userName}</h4>
                        <div className="flex items-center space-x-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star 
                              key={s} 
                              className={`w-3.5 h-3.5 ${rev.rating >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-850'}`} 
                            />
                          ))}
                        </div>
                      </div>
                      
                      <p className="text-xs text-slate-400 mb-2 font-mono">
                        {rev.createdAt?.seconds 
                          ? new Date(rev.createdAt.seconds * 1000).toLocaleDateString()
                          : 'Recent'
                        }
                      </p>

                      <p className="text-sm text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">
                        {rev.comment}
                      </p>

                      {userProfile && userProfile.id === rev.userId && (
                        <button
                          onClick={() => handleDeleteReview(rev.id)}
                          className="flex items-center space-x-1.5 text-rose-400 mt-3 text-[10px] uppercase tracking-wider font-extrabold hover:underline"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Review</span>
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

      {/* Floating Chat Button */}
      <button
        onClick={() => setShowChatModal(true)}
        className="fixed bottom-8 right-8 z-50 bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-4 rounded-full shadow-xl shadow-emerald-500/20 transition-all hover:scale-105"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative animate-fade-in-up">
            {/* Header */}
            <div className="bg-slate-850 p-4 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                  <Cpu className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Chat with {bot.ownerName}</h3>
                  <p className="text-xs text-slate-400">Developer of {bot.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowChatModal(false)}
                className="text-slate-500 hover:text-white transition p-2 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6">
              {chatSent ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                  <h4 className="text-lg font-bold text-white mb-2">Message Sent!</h4>
                  <p className="text-sm text-slate-400">
                    The developer will review your inquiry. Since this is a simulated sandbox, mock communication stops here.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSendMessage}>
                  <p className="text-xs text-slate-400 mb-4 font-mono uppercase tracking-widest text-center border-b border-slate-800 pb-4">
                    Secure Encrypted Channel
                  </p>
                  
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                       Message To Developer
                    </label>
                    <textarea 
                      required
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder={`Hello, I have a question about ${bot.name}'s strategy settings...`}
                      rows={5}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 transition-all text-white max-h-48 resize-none"
                    ></textarea>
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Message</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
