export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  sellerStatus: 'none' | 'approved' | 'admin';
  balance: number;
  createdAt: string;
}

export interface EABot {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  description: string;
  category: 'Forex' | 'Crypto' | 'Indices' | 'Commodities';
  platform: 'MT4' | 'MT5' | 'Both';
  strategy: 'Grid' | 'Hedging' | 'Scalping' | 'Trend' | 'Arbitrage' | 'News';
  price: number;
  winRate: number;
  monthlyProfit: number;
  maxDrawdown: number;
  downloads: number;
  rating: number;
  status: 'active' | 'inactive';
  sourceFileName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Purchase {
  id: string;
  buyerId: string;
  botId: string;
  botName: string;
  price: number;
  licenseKey: string;
  purchaseDate: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  botId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ChartPoint {
  period: string;
  Balance: number;
  Equity: number;
}

/* ── DB row → app type converters ── */
import type { DbUser, DbBot, DbPurchase, DbReview } from './supabase';

export const toUserProfile = (row: DbUser): UserProfile => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  photoURL: row.photo_url,
  sellerStatus: row.seller_status,
  balance: row.balance,
  createdAt: row.created_at,
});

export const toEABot = (row: DbBot): EABot => ({
  id: row.id,
  ownerId: row.owner_id,
  ownerName: row.owner_name,
  name: row.name,
  description: row.description,
  category: row.category as EABot['category'],
  platform: row.platform as EABot['platform'],
  strategy: row.strategy as EABot['strategy'],
  price: row.price,
  winRate: row.win_rate,
  monthlyProfit: row.monthly_profit,
  maxDrawdown: row.max_drawdown,
  downloads: row.downloads,
  rating: row.rating,
  status: row.status as EABot['status'],
  sourceFileName: row.source_file_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toPurchase = (row: DbPurchase): Purchase => ({
  id: row.id,
  buyerId: row.buyer_id,
  botId: row.bot_id,
  botName: row.bot_name,
  price: row.price,
  licenseKey: row.license_key,
  purchaseDate: row.purchase_date,
});

export const toReview = (row: DbReview): Review => ({
  id: row.id,
  userId: row.user_id,
  userName: row.user_name,
  userPhoto: row.user_photo,
  botId: row.bot_id,
  rating: row.rating,
  comment: row.comment,
  createdAt: row.created_at,
});
