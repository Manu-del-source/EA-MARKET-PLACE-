import { ChartPoint } from '../types';

/**
 * Generates custom, realistic backtest data curves for Expert Advisors.
 * This simulates actual high-frequency trading equity and balance fluctuations
 * using the bot's own statistical limits.
 */
export function generateBacktestCurve(
  winRate: number, 
  monthlyProfit: number, 
  maxDrawdown: number
): ChartPoint[] {
  const points: ChartPoint[] = [];
  let currentBalance = 10000; // Standard starting capital
  let currentEquity = 10000;

  // Let's generate 12 months of daily/monthly data
  points.push({
    period: "Start",
    Balance: Math.round(currentBalance),
    Equity: Math.round(currentEquity),
  });

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let i = 0; i < 12; i++) {
    // Generate simulated return
    const randomFactor = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
    const monthlyReturn = monthlyProfit * randomFactor;
    
    // Balance grows relatively smoothly
    currentBalance = currentBalance * (1 + monthlyReturn / 100);
    
    // Win rate determines if equity rises smoothly or undergoes drawdowns
    const ddFactor = (100 - winRate) / 100; // Higher win rate = less deviation
    const tempDD = maxDrawdown * (0.2 + Math.random() * 0.8) * ddFactor;
    
    // Equity fluctuates and can dip below balance (active trades open)
    currentEquity = currentBalance * (1 - tempDD / 100);

    points.push({
      period: months[i],
      Balance: Math.round(currentBalance),
      Equity: Math.round(Math.max(currentEquity, currentBalance * 0.5)), // limit to 50% max destruction for visual beauty
    });
  }

  return points;
}

/**
 * Generates a mock download of the MT4/MT5 EA bot.
 * Outputs a simulated source file block or deployment instruction guide.
 */
export function simulateDownloadFile(botName: string, fileName: string, licenseKey: string): string {
  return `//+------------------------------------------------------------------+
//|                                                   ${botName}
//|                                  Copyright 2026, EA Bot Marketplace
//|                                             https://ea-bot-market.com|
//+------------------------------------------------------------------+
#property copyright "EA Bot Marketplace"
#property link      "https://ea-bot-market.com"
#property version   "2.10"
#property strict

// --- Licensing Variables ---
input string LicenseKey            = "${licenseKey}"; // Active licence
input double RiskPercentage         = 2.0;            // Risk Per Trade (%)
input int    MagicNumber            = ${Math.floor(100000 + Math.random() * 900000)};   // EA identifier
input int    MaxOpenOrders          = 5;              // Maximum simultaneous trades

// --- Initialization ---
int OnInit()
{
   Print("Initializing ${botName}...");
   if(LicenseKey != "${licenseKey}") {
      Alert("CRITICAL: Invalid License Key '${licenseKey}' for running ${botName}!");
      return(INIT_FAILED);
   }
   
   Print("Licence verified successfully for user account.");
   return(INIT_SUCCEEDED);
}

// --- Deinitialization ---
void OnDeinit(const int reason)
{
   Print("De-initialising Expert Advisor...");
}

// --- Tick handler ---
void OnTick()
{
   // Intelligent algorithmic trading state evaluation
   // Scanning indicators, grid positions, and trailing spread
   
   if(Hour() == 0 && Minute() == 0) {
      Print("Bot ${botName} checking active spread and open positions...");
   }
}
//+------------------------------------------------------------------+`;
}
