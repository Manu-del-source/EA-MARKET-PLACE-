import React, { useState, useEffect } from 'react';
import { UserProfile, EABot, toUserProfile } from '../types';
import { supabase, handleSupabaseError } from '../supabase';
import { ShieldAlert, Trash2, Users, Bot } from 'lucide-react';

interface AdminPortalProps {
  userProfile: UserProfile | null;
  bots: EABot[];
}

export default function AdminPortal({ userProfile, bots }: AdminPortalProps) {
  const [users, setUsers]       = useState<UserProfile[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setTab]     = useState<'users' | 'bots'>('users');

  useEffect(() => {
    if (userProfile?.sellerStatus !== 'admin') { setLoading(false); return; }
    loadUsers();
    const channel = supabase.channel('admin-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => loadUsers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userProfile?.id, userProfile?.sellerStatus]);

  const loadUsers = async () => {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error) handleSupabaseError(error, 'adminLoadUsers');
    else setUsers((data ?? []).map(toUserProfile));
    setLoading(false);
  };

  const toggleSeller = async (user: UserProfile) => {
    if (user.sellerStatus === 'admin') return;
    const next = user.sellerStatus === 'approved' ? 'none' : 'approved';
    const { error } = await supabase.from('users').update({ seller_status: next }).eq('id', user.id);
    if (error) handleSupabaseError(error, 'toggleSeller');
  };

  const makeAdmin = async (user: UserProfile) => {
    const { error } = await supabase.from('users').update({ seller_status: 'admin' }).eq('id', user.id);
    if (error) handleSupabaseError(error, 'makeAdmin');
  };

  const deleteBot = async (botId: string) => {
    if (!window.confirm('Permanently delete this EA?')) return;
    const { error } = await supabase.from('bots').delete().eq('id', botId);
    if (error) handleSupabaseError(error, 'adminDeleteBot');
  };

  if (userProfile?.sellerStatus !== 'admin') {
    return (
      <div className="max-w-lg mx-auto py-20 px-4 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-red-500/8 border border-red-500/18 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Access Denied</h2>
        <p className="text-slate-500 text-sm max-w-xs mx-auto">Your account does not have admin clearance.</p>
      </div>
    );
  }

  const statusBadge = (s: string) =>
    s === 'admin'    ? 'bg-red-500/12 text-red-400 border-red-500/25'
    : s === 'approved' ? 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25'
    : 'bg-white/5 text-slate-500 border-white/8';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Admin Control Panel</h1>
          <p className="text-xs text-slate-500 font-mono">Supabase · users · bots · RLS enforced</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 stagger-children">
        {[
          { label: 'Total Users',       value: users.length,                                              color: 'text-cyan-400' },
          { label: 'Active EAs',        value: bots.filter(b => b.status === 'active').length,            color: 'text-violet-400' },
          { label: 'Approved Sellers',  value: users.filter(u => u.sellerStatus === 'approved').length,   color: 'text-emerald-400' },
          { label: 'Total Installs',    value: bots.reduce((s, b) => s + b.downloads, 0),                 color: 'text-cyan-400' },
        ].map((s, i) => (
          <div key={i} className="metric-tile p-4 animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`text-2xl font-mono font-black ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-black/30 border border-cyan-500/8 rounded-xl p-1 mb-6 w-fit">
        {([['users', 'Users', <Users className="w-4 h-4" />], ['bots', 'EAs', <Bot className="w-4 h-4" />]] as const).map(([id, label, icon]) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === id ? 'nav-active' : 'text-slate-400 hover:text-white'}`}>
            {icon} {label}
            <span className="ml-1 text-[9px] font-mono bg-white/8 px-1.5 py-0.5 rounded">
              {id === 'users' ? users.length : bots.length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-16 rounded-xl" style={{ animationDelay: `${i * 60}ms` }} />)}</div>
      ) : activeTab === 'users' ? (
        <div className="card-ink rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs table-dark">
              <thead>
                <tr className="text-[9px] font-mono uppercase tracking-wider">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3 hidden md:table-cell">Email</th>
                  <th className="px-5 py-3 text-center">Role</th>
                  <th className="px-5 py-3 text-center">Balance</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/5">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-cyan-500/3 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <img referrerPolicy="no-referrer"
                          src={user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                          alt={user.displayName} className="w-8 h-8 rounded-lg ring-1 ring-cyan-500/15 shrink-0" />
                        <span className="font-semibold text-white whitespace-nowrap">{user.displayName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-slate-400 text-xs">{user.email}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${statusBadge(user.sellerStatus)}`}>
                        {user.sellerStatus === 'admin' ? '⚡ Admin' : user.sellerStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono font-bold text-cyan-400">${user.balance.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right">
                      {user.sellerStatus !== 'admin' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => toggleSeller(user)}
                            className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-lg border border-white/8 text-slate-400 hover:text-white hover:border-white/20 transition-all">
                            {user.sellerStatus === 'approved' ? 'Revoke' : 'Approve'}
                          </button>
                          <button onClick={() => makeAdmin(user)}
                            className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-400 transition-all">
                            Admin
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-600 text-xs font-mono">No users yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card-ink rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs table-dark">
              <thead>
                <tr className="text-[9px] font-mono uppercase tracking-wider">
                  <th className="px-5 py-3">Bot Entity</th>
                  <th className="px-5 py-3 hidden md:table-cell">Developer</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Price</th>
                  <th className="px-5 py-3 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/5">
                {bots.map(bot => (
                  <tr key={bot.id} className="hover:bg-cyan-500/3 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-white">{bot.name}</div>
                      <div className="text-[9px] text-slate-600 font-mono mt-0.5">{bot.id}</div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-slate-400">{bot.ownerName}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border ${bot.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                        {bot.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-white">
                      {bot.price === 0 ? <span className="text-emerald-400">FREE</span> : `$${bot.price}`}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => deleteBot(bot.id)}
                        className="p-2 text-red-500 hover:text-white hover:bg-red-500 border border-red-500/20 hover:border-red-400 rounded-lg transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {bots.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-600 text-xs font-mono">No bots in the grid.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
