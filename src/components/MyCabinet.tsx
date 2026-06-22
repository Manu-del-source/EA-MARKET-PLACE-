import React, { useState, useEffect } from 'react';
import { EABot, UserProfile, Purchase } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { simulateDownloadFile } from '../utils/simulation';
import { 
  ShoppingBag, 
  Key, 
  Download, 
  Code, 
  Cpu, 
  ExternalLink,
  ClipboardCopy,
  Terminal,
  Activity,
  FileCode
} from 'lucide-react';

interface MyCabinetProps {
  userProfile: UserProfile | null;
  bots: EABot[];
  onSelectBot: (bot: EABot) => void;
}

export default function MyCabinet({ userProfile, bots, onSelectBot }: MyCabinetProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Download code viewer states
  const [activeCodeBotId, setActiveCodeBotId] = useState<string | null>(null);
  const [activeCodeFile, setActiveCodeFile] = useState<string | null>(null);

  useEffect(() => {
    loadMyPurchases();
  }, [userProfile?.id]);

  const loadMyPurchases = async () => {
    if (!userProfile) return;
    setLoading(true);
    const q = query(collection(db, 'purchases'), where('buyerId', '==', userProfile.id));
    try {
      const snap = await getDocs(q);
      const items: Purchase[] = [];
      snap.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Purchase);
      });
      setPurchases(items);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'purchases');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const toggleRenderCode = (purchase: Purchase, bot: EABot) => {
    if (activeCodeBotId === bot.id) {
      setActiveCodeBotId(null);
      setActiveCodeFile(null);
    } else {
      const fileCode = simulateDownloadFile(bot.name, bot.sourceFileName, purchase.licenseKey);
      setActiveCodeBotId(bot.id);
      setActiveCodeFile(fileCode);
    }
  };

  if (!userProfile) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center text-white">
        <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold font-sans">Connect Your Wallet</h2>
        <p className="text-sm text-slate-400 mt-2">Sign in via the navigation bar to inspect your licensed Expert Advisors.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in text-white">
      
      {/* Page Title */}
      <div className="border-b border-slate-800 pb-4 mb-8">
        <h1 className="text-2xl font-bold font-sans text-white tracking-tight">Your Portfolio Terminal</h1>
        <p className="text-xs text-slate-400 mt-1">Manage acquired software licenses, extract source outputs, and inspect properties</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : purchases.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-2xl mx-auto">
          <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold">You don't own any active licenses yet</h3>
          <p className="text-xs text-slate-500 font-mono mt-1 leading-relaxed">
            Acquire licenses for Expert Advisor algorithmic frameworks directly through the trade catalog to sync your account properties.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {purchases.map((purchase) => {
            // Find corresponding bot details to render stats or catalog link
            const botObj = bots.find(b => b.id === purchase.botId);
            
            return (
              <div 
                key={purchase.id} 
                className="bg-slate-900 border border-slate-800 hover:border-slate-750 p-5 sm:p-6 rounded-3xl transition duration-300"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Title and Strategy info */}
                  <div>
                    <h3 className="font-sans font-bold text-lg text-emerald-400">
                      {purchase.botName}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Licensed for Metatrader terminal on {purchase.purchaseDate?.seconds 
                        ? new Date(purchase.purchaseDate.seconds * 1000).toLocaleDateString()
                        : 'Recent'
                      }
                    </p>
                  </div>

                  {/* License Token */}
                  <div className="bg-slate-950 px-4 py-2.5 border border-slate-850 rounded-2xl flex items-center space-x-3 text-xs font-mono max-w-sm md:w-[280px]">
                    <Key className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-500 block">LICENSE KEY</span>
                      <span className="font-semibold text-amber-400 block truncate">{purchase.licenseKey}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(purchase.licenseKey)}
                      className="p-1 px-2.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition"
                      title="Copy licence token code"
                    >
                      {copiedKey === purchase.licenseKey ? "Copied!" : <ClipboardCopy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {botObj && (
                      <button
                        onClick={() => onSelectBot(botObj)}
                        className="bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Inspect Performance</span>
                      </button>
                    )}

                    {botObj && (
                      <button
                        onClick={() => toggleRenderCode(purchase, botObj)}
                        className="bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition"
                      >
                        <Code className="w-4 h-4" />
                        <span>{activeCodeBotId === botObj.id ? "Minimize" : "Generate Code"}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Performance stats summary for easy lookup */}
                {botObj && (
                  <div className="mt-4 pt-4 border-t border-slate-850/60 grid grid-cols-3 gap-4 max-w-md text-xs font-mono">
                    <div>
                      <span className="text-slate-500 block">RETURNS</span>
                      <span className="text-white font-semibold block">+{botObj.monthlyProfit}% / mo</span>
                    </div>
                    <div className="border-l border-slate-850 pl-4">
                      <span className="text-slate-500 block">STRATEGY</span>
                      <span className="text-emerald-400 font-semibold block">{botObj.strategy}</span>
                    </div>
                    <div className="border-l border-slate-850 pl-4">
                      <span className="text-slate-500 block">FILE</span>
                      <span className="text-slate-300 block truncate">{botObj.sourceFileName}</span>
                    </div>
                  </div>
                )}

                {/* If code drawer active */}
                {activeCodeBotId === purchase.botId && activeCodeFile && (
                  <div className="mt-6 bg-slate-950 p-4 rounded-2xl border border-slate-850 font-mono text-[11px] relative select-all">
                    <div className="absolute top-4 right-4 text-[9px] text-slate-500 uppercase font-bold tracking-widest font-sans flex items-center space-x-1">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>EX MODULE ACTIVE</span>
                    </div>
                    <h4 className="text-xs font-sans text-slate-300 font-bold mb-3 flex items-center space-x-1.5">
                      <FileCode className="w-4 h-4 text-emerald-450 text-emerald-400" />
                      <span>Code template matching MT terminal configuration</span>
                    </h4>
                    <pre className="text-slate-400 p-4 bg-slate-900 rounded-xl overflow-x-auto text-[11px] leading-relaxed max-h-[300px] overflow-y-auto w-full border border-slate-850">
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
