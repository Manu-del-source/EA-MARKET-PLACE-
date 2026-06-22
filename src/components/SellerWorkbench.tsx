import React, { useState, useEffect } from 'react';
import { EABot, UserProfile } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, updateDoc, doc, setDoc, query, where, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
import { 
  Building, 
  Plus, 
  Terminal, 
  Eye, 
  Activity, 
  Check, 
  TrendingUp, 
  Globe,
  Settings,
  Briefcase,
  Layers,
  Sparkles,
  Award,
  BookOpen,
  DollarSign
} from 'lucide-react';

interface SellerWorkbenchProps {
  userProfile: UserProfile | null;
  myBots: EABot[];
  onBotAdded: () => void;
  onBotDeleted: () => void;
}

export default function SellerWorkbench({ userProfile, myBots, onBotAdded, onBotDeleted }: SellerWorkbenchProps) {
  // Navigation states inside workbench
  const [isAdding, setIsAdding] = useState(false);
  const [registering, setRegistering] = useState(false);

  // Form states for bot listing
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'Forex' | 'Crypto' | 'Indices' | 'Commodities'>('Forex');
  const [platform, setPlatform] = useState<'MT4' | 'MT5' | 'Both'>('MT4');
  const [strategy, setStrategy] = useState<'Grid' | 'Hedging' | 'Scalping' | 'Trend' | 'Arbitrage' | 'News'>('Grid');
  const [price, setPrice] = useState(99);
  const [winRate, setWinRate] = useState(68);
  const [monthlyProfit, setMonthlyProfit] = useState(12);
  const [maxDrawdown, setMaxDrawdown] = useState(8);
  const [sourceFileName, setSourceFileName] = useState('');

  // Submit states
  const [publishing, setPublishing] = useState(false);

  const handleRegisterAsSeller = async () => {
    if (!userProfile) return;
    setRegistering(true);
    try {
      const userRef = doc(db, 'users', userProfile.id);
      await updateDoc(userRef, { sellerStatus: 'approved' });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${userProfile.id}`);
    } finally {
      setRegistering(false);
    }
  };

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setPublishing(true);
    const botId = "ea_" + Math.random().toString(36).substring(2, 10);
    const fileName = sourceFileName.trim() || `${name.replace(/\s+/g, '_')}_v1.ex4`;

    const newBotObj: EABot = {
      id: botId,
      ownerId: userProfile.id,
      ownerName: userProfile.displayName,
      name: name.trim(),
      description: description.trim(),
      category,
      platform,
      strategy,
      price: Number(price),
      winRate: Number(winRate),
      monthlyProfit: Number(monthlyProfit),
      maxDrawdown: Number(maxDrawdown),
      downloads: 0,
      rating: 0,
      status: 'active',
      sourceFileName: fileName,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    try {
      await setDoc(doc(db, 'bots', botId), newBotObj);
      onBotAdded();
      
      // Reset form fields
      setName('');
      setDescription('');
      setCategory('Forex');
      setPlatform('MT4');
      setStrategy('Grid');
      setPrice(99);
      setWinRate(68);
      setMonthlyProfit(12);
      setMaxDrawdown(8);
      setSourceFileName('');
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `bots/${botId}`);
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (!window.confirm("Are you sure you want to terminate this EA bot listing? This delete is irreversible.")) return;
    try {
      await deleteDoc(doc(db, 'bots', botId));
      onBotDeleted();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bots/${botId}`);
    }
  };

  if (!userProfile) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <Briefcase className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Connect Wallet First</h2>
        <p className="text-sm text-slate-400">You must authorize your identity in the navigation dashboard to list products.</p>
      </div>
    );
  }

  // --- 1. Registration state if not admin ---
  if (userProfile.sellerStatus !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center relative overflow-hidden">
          <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400 inline-block mb-4">
            <Settings className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold font-sans tracking-tight text-white mb-2">
            Access Denied
          </h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto mb-8 leading-relaxed">
            Only administrators can upload and manage EA bots in this application.
          </p>
        </div>
      </div>
    );
  }

  // --- 2. Add Listing Form ---
  if (isAdding) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
          
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-850">
            <div>
              <h1 className="text-xl font-bold text-white font-sans">List New Expert Advisor</h1>
              <p className="text-xs text-slate-400 mt-1">Setup your algorithmic MT4/MT5 trading bot listed features</p>
            </div>
            <button
              id="cancel-add-bot-btn"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-white bg-slate-850 px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-800 transition"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateBot} className="space-y-6 text-slate-300">
            
            {/* Row 1: Name and Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs text-slate-400 font-mono block uppercase mb-1">Bot Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Titan Scalper Pro"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 transition text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-mono block uppercase mb-1">Asset Class Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 transition text-white"
                >
                  <option value="Forex">Forex</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Indices">Indices</option>
                  <option value="Commodities">Commodities</option>
                </select>
              </div>
            </div>

            {/* Row 2: Strategy, Platform, and Simulated Target Filename */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-xs text-slate-400 font-mono block uppercase mb-1">Trading Strategy</label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 transition text-white"
                >
                  <option value="Grid">Grid</option>
                  <option value="Hedging">Hedging</option>
                  <option value="Scalping">Scalping</option>
                  <option value="Trend">Trend Following</option>
                  <option value="Arbitrage">Arbitrage</option>
                  <option value="News">News Trading</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-mono block uppercase mb-1">Terminal Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 transition text-white"
                >
                  <option value="MT4">Metatrader 4 (MT4)</option>
                  <option value="MT5">Metatrader 5 (MT5)</option>
                  <option value="Both">Both (Compatible)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-mono block uppercase mb-1">Target Filename (.ex4 / .ex5)</label>
                <input
                  type="text"
                  value={sourceFileName}
                  onChange={(e) => setSourceFileName(e.target.value)}
                  placeholder="e.g. ScalperPro_v2.ex4"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 transition text-white"
                />
              </div>
            </div>

            {/* Row 3: Win Rate, Profit limits, Drawdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-xs text-slate-400 font-mono block uppercase mb-1">Target Monthly Profit (%)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={500}
                  value={monthlyProfit}
                  onChange={(e) => setMonthlyProfit(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 transition text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-mono block uppercase mb-1">Max backtested Drawdown (%)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={99}
                  value={maxDrawdown}
                  onChange={(e) => setMaxDrawdown(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 transition text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-mono block uppercase mb-1">Calculated Win Rate (%)</label>
                <input
                  type="number"
                  required
                  min={30}
                  max={99}
                  value={winRate}
                  onChange={(e) => setWinRate(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 transition text-white"
                />
              </div>
            </div>

            {/* Price Description Box */}
            <div>
              <label className="text-xs text-slate-400 font-mono block uppercase mb-1">Licence Price ($ simulated, 0 for free)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-mono text-sm">
                  $
                </div>
                <input
                  type="number"
                  required
                  min={0}
                  max={5000}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 pl-8 text-sm focus:outline-none focus:border-emerald-500 transition text-white"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-slate-400 font-mono block uppercase mb-1 font-sans">EA Description & EA Strategy features</label>
              <textarea
                required
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe how the Expert Advisor analyzes trade setups, inputs parameters, stops-losses, and manages active market exposure risks..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 transition text-white leading-relaxed"
              />
            </div>

            <button
               id="publish-bot-btn"
               type="submit"
               disabled={publishing}
               className="w-full bg-emerald-500 hover:bg-emerald-450 text-slate-950 py-3.5 rounded-2xl font-extrabold text-sm uppercase tracking-wide flex items-center justify-center space-x-2 transition-all mt-4"
            >
              {publishing ? "Encrypting MQL package..." : "Publish to Marketplace"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- 3. Default dashboard listing seller-owned EAs ---
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in text-white">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold font-sans text-white tracking-tight">Seller Studio Workbench</h1>
          <p className="text-xs text-slate-400 mt-1">Track installs, telemetry metrics, and manage catalog deployments</p>
        </div>
        <button
          id="open-add-bot-btn"
          onClick={() => setIsAdding(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition-all shadow-md shadow-emerald-500/10 ml-auto sm:ml-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Upload New EA</span>
        </button>
      </div>

      {/* Analytics stats info for Seller */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-mono uppercase">EA Catalog Count</span>
            <span className="text-xl font-mono font-bold text-white mt-1 block">
              {myBots.length} active listings
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-mono uppercase">Total Installs</span>
            <span className="text-xl font-mono font-bold text-white mt-1 block">
              {myBots.reduce((sum, b) => sum + b.downloads, 0)} acquisitions
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-mono uppercase">Average Evaluation</span>
            <span className="text-xl font-mono font-bold text-white mt-1 block">
              {myBots.length === 0 ? "No scores" : (myBots.reduce((sum, b) => sum + b.rating, 0) / myBots.length).toFixed(1) + " / 5.0"}
            </span>
          </div>
        </div>
      </div>

      {/* Your listed items table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-slate-850">
          <h3 className="font-bold font-sans text-sm tracking-wide">Published Bots</h3>
        </div>

        {myBots.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center">
            <Briefcase className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-xs font-mono">You haven't listed any Expert Advisors in the workspace yet.</p>
            <button
              onClick={() => setIsAdding(true)}
              className="text-xs text-emerald-400 font-semibold hover:underline mt-2 inline-flex items-center space-x-1"
            >
              <span>Publish your first bot now</span>
              <span>&rarr;</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-350 border-collapse">
              <thead>
                <tr className="bg-slate-950/60 uppercase font-mono tracking-wider border-b border-slate-850">
                  <th className="p-4 font-semibold text-slate-400">Bot Module</th>
                  <th className="p-4 font-semibold text-slate-400">Trading Strategy</th>
                  <th className="p-4 font-semibold text-slate-400 text-center">Platform</th>
                  <th className="p-4 font-semibold text-slate-400 text-center">Installs</th>
                  <th className="p-4 font-semibold text-slate-400 text-right">Price</th>
                  <th className="p-4 font-semibold text-slate-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-sans">
                {myBots.map((bot) => (
                  <tr key={bot.id} className="hover:bg-slate-850/40 transition">
                    <td className="p-4 font-semibold text-white">
                      <div>
                        <span className="block text-sm">{bot.name}</span>
                        <span className="text-[10px] text-slate-500 block font-mono">{bot.sourceFileName}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono">
                      <span className="bg-slate-850 border border-slate-800 px-2.5 py-1 rounded-lg text-emerald-400 font-bold uppercase text-[10px]">
                        {bot.strategy}
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono font-semibold text-slate-200">
                      {bot.platform}
                    </td>
                    <td className="p-4 text-center font-mono font-semibold text-blue-400">
                      {bot.downloads}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-white text-sm">
                      {bot.price === 0 ? "FREE" : `$${bot.price}`}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteBot(bot.id)}
                        className="text-rose-405 text-rose-400 hover:text-rose-350 font-semibold hover:underline"
                      >
                        Delete
                      </button>
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
