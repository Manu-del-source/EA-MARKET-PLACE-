import React, { useState, useEffect } from 'react';
import { UserProfile, EABot } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ShieldAlert, Trash2, Users, Bot, CheckCircle, XCircle } from 'lucide-react';

interface AdminPortalProps {
  userProfile: UserProfile | null;
  bots: EABot[];
}

export default function AdminPortal({ userProfile, bots }: AdminPortalProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'bots'>('users');

  useEffect(() => {
    if (userProfile?.sellerStatus !== 'admin') {
      setLoading(false);
      return;
    }

    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const loaded: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as UserProfile);
      });
      setUsers(loaded);
      setLoading(false);
    }, (error) => {
      console.error("Users list load failed gracefully: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.id, userProfile?.sellerStatus]);

  const toggleSellerStatus = async (user: UserProfile) => {
    try {
      // Don't downgrade admins here to avoid lockouts in our simple UI
      if (user.sellerStatus === 'admin') return;
      
      const newStatus = user.sellerStatus === 'approved' ? 'none' : 'approved';
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { sellerStatus: newStatus });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  const makeAdmin = async (user: UserProfile) => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { sellerStatus: 'admin' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this bot?")) return;
    try {
      await deleteDoc(doc(db, 'bots', botId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bots/${botId}`);
    }
  };

  if (userProfile?.sellerStatus !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center animate-fade-in text-white/90">
        <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-rose-500" />
        <h2 className="text-2xl font-bold font-sans">Access Denied</h2>
        <p className="text-slate-400 mt-2 font-mono text-sm max-w-md mx-auto">
          Your account does not possess the necessary clearance level to access the administrative dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in text-white/90">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-3 text-rose-400 mb-2">
            <ShieldAlert className="w-6 h-6" />
            <h1 className="text-2xl font-extrabold font-sans tracking-tight text-white">Central Command</h1>
          </div>
          <p className="text-sm font-mono text-slate-400">Total systemic control over users and marketplace entries.</p>
        </div>

        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all flex items-center space-x-2 ${
              activeTab === 'users' ? 'bg-rose-500/10 text-rose-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Manage Users ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('bots')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all flex items-center space-x-2 ${
              activeTab === 'bots' ? 'bg-rose-500/10 text-rose-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Manage Bots ({bots.length})</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
           <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin"></div>
        </div>
      ) : activeTab === 'users' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300 font-mono">
              <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase tracking-widest leading-normal border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Trader</th>
                  <th className="px-6 py-4 font-semibold">ID / Email</th>
                  <th className="px-6 py-4 font-semibold text-center">Status Role</th>
                  <th className="px-6 py-4 font-semibold text-center">Simulated Balance</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-850/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={user.photoURL || 'https://via.placeholder.com/40'} 
                          alt="avatar" 
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full shadow-sm" 
                        />
                        <span className="font-sans font-semibold text-white whitespace-nowrap">{user.displayName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 opacity-75">
                      <div className="text-[10px] truncate w-32 md:w-48">{user.id}</div>
                      <div className="text-xs mt-1 text-slate-400 font-sans">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        user.sellerStatus === 'admin' 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : user.sellerStatus === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {user.sellerStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-emerald-400">
                      ${user.balance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {user.sellerStatus !== 'admin' && (
                           <>
                             <button 
                               onClick={() => toggleSellerStatus(user)}
                               className="p-2 text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-600 rounded-lg transition-all text-[10px] uppercase tracking-wider font-bold"
                             >
                               {user.sellerStatus === 'approved' ? 'Revoke Seller' : 'Approve Seller'}
                             </button>
                             <button
                               onClick={() => makeAdmin(user)}
                               className="p-2 text-rose-400 hover:text-white bg-slate-950 border border-rose-900 hover:bg-rose-500 hover:border-rose-400 rounded-lg transition-all text-[10px] uppercase tracking-wider font-bold"
                             >
                               Make Mod
                             </button>
                           </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300 font-mono">
               <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase tracking-widest leading-normal border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Bot Entity</th>
                  <th className="px-6 py-4 font-semibold">Developer</th>
                  <th className="px-6 py-4 font-semibold text-center">State / Asset</th>
                  <th className="px-6 py-4 font-semibold text-right">Price</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {bots.map(bot => (
                  <tr key={bot.id} className="hover:bg-slate-850/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-sans font-semibold text-white whitespace-nowrap">{bot.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1 uppercase">ID: {bot.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      {bot.ownerName}
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${bot.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-500'}`}>
                         {bot.status}
                       </span>
                       <span className="block mt-1 text-xs text-slate-500">{bot.category}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-sans font-bold">
                       ${bot.price}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button
                         onClick={() => handleDeleteBot(bot.id)}
                         className="p-2 text-rose-400 hover:text-white bg-slate-950 border border-rose-900 hover:bg-rose-500 hover:border-rose-400 rounded-lg transition-all"
                         title="Purge Object"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bots.length === 0 && (
              <div className="p-12 text-center text-slate-500 text-sm font-mono uppercase tracking-wider">
                 No bot records located in the grid.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
