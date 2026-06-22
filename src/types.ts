export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  sellerStatus: 'none' | 'approved' | 'admin';
  balance: number; // Simulated trader currency
  createdAt: any; // Firestore Timestamp
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
  price: number; // 0 for free
  winRate: number; // Win % e.g. 74.2
  monthlyProfit: number; // Return e.g. 18.5
  maxDrawdown: number; // DD % e.g. 6.8
  downloads: number;
  rating: number; // 1 to 5 average
  status: 'active' | 'inactive';
  sourceFileName: string; // Fake compiled file, e.g. ScalpMaster_v2.ex4
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

export interface Purchase {
  id: string; // `${userId}_${botId}`
  buyerId: string;
  botId: string;
  botName: string;
  price: number;
  licenseKey: string;
  purchaseDate: any; // Timestamp
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  botId: string;
  rating: number; // 1 - 5
  comment: string;
  createdAt: any; // Timestamp
}

export interface ChartPoint {
  period: string; // e.g. "Month 1", "Day 10"
  Equity: number;
  Balance: number;
}
