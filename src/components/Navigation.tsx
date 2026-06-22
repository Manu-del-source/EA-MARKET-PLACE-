import React from 'react';
import { auth, signInWithGoogle, logoutUser, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { TrendingUp, Coins, LogOut, LogIn, Award, ShoppingBag, Terminal, ShieldAlert } from 'lucide-react';

interface NavigationProps {
  userProfile: UserProfile | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  loadingAuth: boolean;
}

export default function Navigation({ userProfile, activeTab, setActiveTab, loadingAuth }: NavigationProps) {
  
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setActiveTab('marketplace'); // Reset on logout
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddFunds = async () => {
    if (!userProfile) return;
    const newBalance = userProfile.balance + 1000;
    try {
      const userRef = doc(db, 'users', userProfile.id);
      await updateDoc(userRef, { balance: newBalance });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.id}`);
    }
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => setActiveTab('marketplace')}
          >
            <div className="p-2.5 bg-emerald-500 rounded-xl text-slate-900 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
              <Terminal className="w-6 h-6 stroke-[2.5]" id="logo-icon-svg" />
            </div>
            <div>
              <span className="font-sans font-bold text-lg tracking-wider text-white uppercase block">
                EA Marketplace
              </span>
              <span className="font-mono text-[10px] text-emerald-400 font-semibold tracking-widest uppercase block -mt-1">
                Trading Core
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1.5">
            <button
              id="tab-btn-marketplace"
              onClick={() => setActiveTab('marketplace')}
              className={`px-4 py-2 rounded-xl text-sm font-medium tracking-wide transition-all duration-200 ${
                activeTab === 'marketplace'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Browse EAs
            </button>
            
            {userProfile && (
              <>
                <button
                  id="tab-btn-cabinet"
                  onClick={() => setActiveTab('cabinet')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium tracking-wide transition-all duration-200 flex items-center space-x-1.5 ${
                    activeTab === 'cabinet'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-inner'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Licensed EAs</span>
                </button>

                {userProfile.sellerStatus === 'admin' && (
                  <button
                    id="tab-btn-seller"
                    onClick={() => setActiveTab('seller')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium tracking-wide transition-all duration-200 flex items-center space-x-1.5 ${
                      activeTab === 'seller' || activeTab === 'seller-add'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-inner'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>Upload Bot</span>
                  </button>
                )}

                {userProfile.sellerStatus === 'admin' && (
                  <button
                    id="tab-btn-admin"
                    onClick={() => setActiveTab('admin')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium tracking-wide transition-all duration-200 flex items-center space-x-1.5 ${
                      activeTab === 'admin'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-inner'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>Admin Portal</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Authentication & simulated cash */}
          <div className="flex items-center space-x-4">
            {loadingAuth ? (
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
            ) : userProfile ? (
              <div className="flex items-center space-x-4">
                {/* Simulated Cash */}
                <div 
                  className="bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-1.5 flex items-center space-x-2.5 shadow-inner cursor-pointer hover:bg-slate-900 group transition-all"
                  onClick={handleAddFunds}
                  title="Click to top-up $1,000 simulated funds"
                >
                  <Coins className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium tracking-widest leading-none">Sim Balance</span>
                    <span className="text-sm font-mono text-amber-400 font-bold leading-normal">
                      ${userProfile.balance.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    +$1K
                  </span>
                </div>

                {/* Profile Card */}
                <div className="flex items-center space-x-3 bg-slate-950/40 p-1.5 pl-3 rounded-2xl border border-slate-800/60">
                  <div className="hidden lg:block text-right">
                    <span className="text-xs font-semibold text-slate-200 block truncate max-w-[120px]">
                      {userProfile.displayName}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-medium block">
                      {userProfile.sellerStatus === 'approved' ? 'PRO SELLER' : 'TRADER'}
                    </span>
                  </div>
                  <img
                    referrerPolicy="no-referrer"
                    src={userProfile.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                    alt={userProfile.displayName}
                    className="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-800 ring-offset-2 ring-offset-slate-900 shadow-md"
                  />
                  
                  <button
                    id="auth-logout-btn"
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                id="auth-login-btn"
                onClick={handleLogin}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 rounded-xl text-sm font-semibold tracking-wide flex items-center space-x-2 transition-all duration-200 shadow-lg shadow-emerald-500/10"
              >
                <LogIn className="w-4 h-4 stroke-[2.5]" />
                <span>Login with Google</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Nav Links */}
      {userProfile && (
        <div className="md:hidden flex border-t border-slate-800 bg-slate-950/80 px-4 py-2 justify-around">
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`text-xs font-semibold uppercase tracking-wider py-1.5 ${
              activeTab === 'marketplace' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            Browse
          </button>
          <button
            onClick={() => setActiveTab('cabinet')}
            className={`text-xs font-semibold uppercase tracking-wider py-1.5 ${
              activeTab === 'cabinet' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            Licensed
          </button>
          {userProfile.sellerStatus === 'admin' && (
            <button
              onClick={() => setActiveTab('seller')}
              className={`text-xs font-semibold uppercase tracking-wider py-1.5 ${
                activeTab === 'seller' || activeTab === 'seller-add' ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              Upload
            </button>
          )}
          {userProfile.sellerStatus === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`text-xs font-semibold uppercase tracking-wider py-1.5 ${
                activeTab === 'admin' ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              Admin
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
