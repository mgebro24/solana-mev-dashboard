/**
 * Brokers Comparison Module for Solana MEV Dashboard
 * Provides price comparison, fee analysis, and profit optimization between different DEXes
 */

// List of DEXes and brokers to track
const DEXES = [
  { 
    id: 'jupiter', 
    name: 'Jupiter', 
    feePercent: 0.0003, // 0.03%
    gasEstimate: 0.000005, // in SOL
    color: '#6BB1F1',
    slippageFactor: 0.8, // Lower is better
    liquidityRating: 5, // 1-5 scale
    apiEndpoint: 'https://quote-api.jup.ag/v6/quote'
  },
  { 
    id: 'raydium', 
    name: 'Raydium', 
    feePercent: 0.0025, // 0.25%
    gasEstimate: 0.000004,
    color: '#4DA0FF',
    slippageFactor: 1.0,
    liquidityRating: 4,
    apiEndpoint: 'https://api.raydium.io/v2/main/price'
  },
  { 
    id: 'orca', 
    name: 'Orca', 
    feePercent: 0.003, // 0.3%
    gasEstimate: 0.000003,
    color: '#7C41F4',
    slippageFactor: 1.2,
    liquidityRating: 4,
    apiEndpoint: 'https://api.orca.so/v1'
  },
  { 
    id: 'openbook', 
    name: 'OpenBook', 
    feePercent: 0.002, // 0.2%
    gasEstimate: 0.000004,
    color: '#5FD068',
    slippageFactor: 0.9,
    liquidityRating: 3,
    apiEndpoint: 'https://api.openbook.so/v1'
  },
  { 
    id: 'lifinity', 
    name: 'Lifinity', 
    feePercent: 0.001, // 0.1%
    gasEstimate: 0.000006,
    color: '#FF47A9',
    slippageFactor: 1.3,
    liquidityRating: 3,
    apiEndpoint: 'https://lifinity.io/api/v1'
  }
];

// Token pairs to track
const TOKEN_PAIRS = [
  { base: 'SOL', quote: 'USDC' },
  { base: 'SOL', quote: 'USDT' },
  { base: 'BTC', quote: 'USDC' },
  { base: 'ETH', quote: 'USDC' },
  { base: 'JUP', quote: 'USDC' },
  { base: 'SOL', quote: 'BTC' },
  { base: 'SOL', quote: 'ETH' },
  { base: 'RAY', quote: 'USDC' }
];

// Cache settings
const CACHE_TTL = 60 * 1000; // 60 seconds

// Main broker comparison service
const brokerService = {
  // Store for price data across different DEXes
  priceData: {
    // Structure: { [pairKey]: { [dexId]: { bid, ask, timestamp, volume24h } } }
    data: {},
    lastFullUpdate: 0
  },
  
  // Store for arbitrage opportunities
  arbitrageOpportunities: [],
  
  // Fee comparison data
  feeAnalysis: {
    // Structure: { [pairKey]: { bestBuy: dexId, bestSell: dexId, feeSavings: {} } }
    data: {},
    lastUpdate: 0
  },
  
  // Gas optimization data
  gasOptimization: {
    // Average gas prices in different time periods
    averageGasPrice: 0,
    gasHistory: [],
    lastUpdate: 0,
    congestionLevel: 'normal' // low, normal, high
  },
  
  // Initialize the broker service
  initialize() {
    console.log('Initializing broker comparison service...');
    
    // Initial data fetch
    this.updatePriceData()
      .then(() => {
        this.updateFeeAnalysis();
        this.findArbitrageOpportunities();
      })
      .catch(error => {
        console.error('Error initializing broker service:', error);
      });
    
    // Set up periodic updates
    setInterval(() => this.updatePriceData(), 30 * 1000); // Every 30 seconds
    setInterval(() => this.updateGasOptimization(), 2 * 60 * 1000); // Every 2 minutes
    
    // Listen for price update events from other modules
    window.addEventListener('price-update', (event) => {
      if (event.detail && event.detail.token) {
        this.handlePriceUpdate(event.detail);
      }
    });
    
    return true;
  },
  
  // Update price data across all DEXes and pairs
  async updatePriceData() {
    const now = Date.now();
    
    // If last update was recent, skip
    if (now - this.priceData.lastFullUpdate < CACHE_TTL) {
      return this.priceData.data;
    }
    
    console.log('Updating broker price data...');
    
    // In a real implementation, this would make API calls to each DEX
    // For demo purposes, we'll simulate the price data
    
    // Generate simulated prices for each pair on each DEX
    for (const pair of TOKEN_PAIRS) {
      const pairKey = `${pair.base}_${pair.quote}`;
      
      if (!this.priceData.data[pairKey]) {
        this.priceData.data[pairKey] = {};
      }
      
      // Generate a base price for this pair
      let basePrice;
      
      // Use real-world approximate values for simulation
      if (pair.base === 'SOL' && pair.quote === 'USDC') {
        basePrice = 120;
      } else if (pair.base === 'SOL' && pair.quote === 'USDT') {
        basePrice = 119.95;
      } else if (pair.base === 'BTC' && pair.quote === 'USDC') {
        basePrice = 67500;
      } else if (pair.base === 'ETH' && pair.quote === 'USDC') {
        basePrice = 3200;
      } else if (pair.base === 'JUP' && pair.quote === 'USDC') {
        basePrice = 1.45;
      } else if (pair.base === 'SOL' && pair.quote === 'BTC') {
        basePrice = 0.00178; // SOL/BTC rate
      } else if (pair.base === 'SOL' && pair.quote === 'ETH') {
        basePrice = 0.0375; // SOL/ETH rate
      } else if (pair.base === 'RAY' && pair.quote === 'USDC') {
        basePrice = 0.72;
      } else {
        basePrice = 100; // Default fallback
      }
      
      // Generate price data for each DEX with slight variations
      for (const dex of DEXES) {
        // Create a price variation factor unique to this DEX (-0.5% to +0.5%)
        const variation = ((dex.id.charCodeAt(0) % 10) - 5) / 1000;
        
        // Create spread based on DEX's liquidity rating (higher rating = tighter spread)
        const spreadFactor = 0.006 - (dex.liquidityRating * 0.001); // 0.1% to 0.5%
        
        // Calculate bid and ask prices
        const midPrice = basePrice * (1 + variation);
        const spread = midPrice * spreadFactor;
        const bid = midPrice - (spread / 2);
        const ask = midPrice + (spread / 2);
        
        // Generate random 24h volume (higher for more popular DEXes)
        const volumeFactor = dex.liquidityRating / 3;
        const volume24h = basePrice * 1000 * volumeFactor * (0.8 + Math.random() * 0.4);
        
        // Store the data
        this.priceData.data[pairKey][dex.id] = {
          bid: bid.toFixed(pair.base === 'BTC' ? 1 : (pair.base === 'SOL' && pair.quote === 'BTC' ? 8 : 4)),
          ask: ask.toFixed(pair.base === 'BTC' ? 1 : (pair.base === 'SOL' && pair.quote === 'BTC' ? 8 : 4)),
          spread: (spread / midPrice * 100).toFixed(3),
          volume24h: Math.round(volume24h),
          timestamp: now
        };
      }
    }
    
    this.priceData.lastFullUpdate = now;
    
    // After updating prices, update analyses
    this.updateFeeAnalysis();
    this.findArbitrageOpportunities();
    
    // Return the updated data
    return this.priceData.data;
  },
  
  // Handle real-time price updates
  handlePriceUpdate(update) {
    // In a real implementation, this would handle websocket updates
    // For our purposes, we'll just trigger a full update occasionally
    
    if (Math.random() < 0.2) { // 20% chance to trigger update
      this.updatePriceData();
    }
  },
  
  // Update fee analysis to find best buy/sell exchanges
  updateFeeAnalysis() {
    console.log('Updating fee analysis...');
    
    for (const pair of TOKEN_PAIRS) {
      const pairKey = `${pair.base}_${pair.quote}`;
      const pairData = this.priceData.data[pairKey];
      
      if (!pairData) continue;
      
      // Initialize analysis for this pair
      if (!this.feeAnalysis.data[pairKey]) {
        this.feeAnalysis.data[pairKey] = {
          bestBuy: null,
          bestSell: null,
          feeSavings: {},
          minAmount: {}
        };
      }
      
      // Find best buy (lowest ask price considering fees)
      let bestBuyDex = null;
      let lowestEffectiveAsk = Infinity;
      
      // Find best sell (highest bid price considering fees)
      let bestSellDex = null;
      let highestEffectiveBid = 0;
      
      // Compare all DEXes
      for (const dex of DEXES) {
        const dexData = pairData[dex.id];
        if (!dexData) continue;
        
        // Calculate effective buy price (ask + fees)
        const ask = parseFloat(dexData.ask);
        const effectiveAsk = ask * (1 + dex.feePercent) + dex.gasEstimate;
        
        if (effectiveAsk < lowestEffectiveAsk) {
          lowestEffectiveAsk = effectiveAsk;
          bestBuyDex = dex.id;
        }
        
        // Calculate effective sell price (bid - fees)
        const bid = parseFloat(dexData.bid);
        const effectiveBid = bid * (1 - dex.feePercent) - dex.gasEstimate;
        
        if (effectiveBid > highestEffectiveBid) {
          highestEffectiveBid = effectiveBid;
          bestSellDex = dex.id;
        }
        
        // Calculate minimum profitable amount (where gas costs are covered by profits)
        // Gas cost / (price difference percentage)
        const otherDexes = DEXES.filter(d => d.id !== dex.id);
        
        for (const otherDex of otherDexes) {
          const otherDexData = pairData[otherDex.id];
          if (!otherDexData) continue;
          
          const buyOnThis = parseFloat(dexData.ask);
          const sellOnOther = parseFloat(otherDexData.bid);
          
          if (sellOnOther > buyOnThis) {
            const priceDiffPercent = (sellOnOther - buyOnThis) / buyOnThis;
            const totalFeePercent = dex.feePercent + otherDex.feePercent;
            const totalGasCost = dex.gasEstimate + otherDex.gasEstimate;
            
            // Minimum amount where: amount * priceDiffPercent > amount * totalFeePercent + totalGasCost
            // Therefore: amount > totalGasCost / (priceDiffPercent - totalFeePercent)
            
            // Only calculate if arbitrage is still profitable after fees
            if (priceDiffPercent > totalFeePercent) {
              const minAmount = totalGasCost / (priceDiffPercent - totalFeePercent);
              
              // Save the minimum amount for this DEX pair
              const dexPairKey = `${dex.id}_${otherDex.id}`;
              this.feeAnalysis.data[pairKey].minAmount[dexPairKey] = {
                buyDex: dex.id,
                sellDex: otherDex.id,
                minAmount: minAmount.toFixed(3),
                potentialProfitPercent: ((priceDiffPercent - totalFeePercent) * 100).toFixed(3),
                buyPrice: buyOnThis,
                sellPrice: sellOnOther,
                gasCost: totalGasCost,
                timestamp: Date.now()
              };
            }
          }
        }
      }
      
      // Save best buy/sell DEXes
      this.feeAnalysis.data[pairKey].bestBuy = bestBuyDex;
      this.feeAnalysis.data[pairKey].bestSell = bestSellDex;
      
      // Calculate potential fee savings when using best DEXes
      for (const dex of DEXES) {
        if (dex.id !== bestBuyDex && pairData[dex.id]) {
          const savingsPercent = ((parseFloat(pairData[dex.id].ask) * (1 + dex.feePercent)) - 
                                 (parseFloat(pairData[bestBuyDex].ask) * (1 + DEXES.find(d => d.id === bestBuyDex).feePercent))) / 
                                 parseFloat(pairData[dex.id].ask) * 100;
          
          this.feeAnalysis.data[pairKey].feeSavings[`buy_${dex.id}_vs_${bestBuyDex}`] = savingsPercent.toFixed(3);
        }
        
        if (dex.id !== bestSellDex && pairData[dex.id]) {
          const savingsPercent = ((parseFloat(pairData[bestSellDex].bid) * (1 - DEXES.find(d => d.id === bestSellDex).feePercent)) - 
                                 (parseFloat(pairData[dex.id].bid) * (1 - dex.feePercent))) / 
                                 parseFloat(pairData[bestSellDex].bid) * 100;
          
          this.feeAnalysis.data[pairKey].feeSavings[`sell_${dex.id}_vs_${bestSellDex}`] = savingsPercent.toFixed(3);
        }
      }
    }
    
    this.feeAnalysis.lastUpdate = Date.now();
    return this.feeAnalysis.data;
  },
  
  // Find arbitrage opportunities between different DEXes
  findArbitrageOpportunities() {
    console.log('Finding arbitrage opportunities...');
    
    // Clear previous opportunities
    this.arbitrageOpportunities = [];
    
    // Check each token pair
    for (const pair of TOKEN_PAIRS) {
      const pairKey = `${pair.base}_${pair.quote}`;
      const pairData = this.priceData.data[pairKey];
      
      if (!pairData) continue;
      
      // Check each combination of DEXes
      for (const buyDex of DEXES) {
        if (!pairData[buyDex.id]) continue;
        
        const buyPrice = parseFloat(pairData[buyDex.id].ask);
        const buyFee = buyPrice * buyDex.feePercent;
        const buyGas = buyDex.gasEstimate;
        const effectiveBuyPrice = buyPrice + buyFee + buyGas;
        
        for (const sellDex of DEXES) {
          if (buyDex.id === sellDex.id || !pairData[sellDex.id]) continue;
          
          const sellPrice = parseFloat(pairData[sellDex.id].bid);
          const sellFee = sellPrice * sellDex.feePercent;
          const sellGas = sellDex.gasEstimate;
          const effectiveSellPrice = sellPrice - sellFee - sellGas;
          
          // If there's a profitable arbitrage opportunity
          if (effectiveSellPrice > effectiveBuyPrice) {
            const profitPercent = (effectiveSellPrice - effectiveBuyPrice) / effectiveBuyPrice * 100;
            
            // Calculate minimum profitable amount
            const totalGasCost = buyGas + sellGas;
            const profitPerUnit = effectiveSellPrice - effectiveBuyPrice;
            const minAmount = totalGasCost / profitPerUnit;
            
            // Only include opportunities with at least 0.1% profit
            if (profitPercent >= 0.1) {
              const opportunity = {
                id: `arb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                timestamp: Date.now(),
                pair: pairKey,
                baseToken: pair.base,
                quoteToken: pair.quote,
                buyDex: buyDex.id,
                sellDex: sellDex.id,
                buyPrice: buyPrice.toFixed(4),
                sellPrice: sellPrice.toFixed(4),
                profitPercent: profitPercent.toFixed(3),
                effectiveBuyPrice: effectiveBuyPrice.toFixed(4),
                effectiveSellPrice: effectiveSellPrice.toFixed(4),
                buyFee: buyFee.toFixed(6),
                sellFee: sellFee.toFixed(6),
                totalGasCost: totalGasCost.toFixed(6),
                minProfitableAmount: minAmount.toFixed(3),
                estimatedProfit: ((effectiveSellPrice - effectiveBuyPrice) * 10).toFixed(4), // For 10 units
                confidence: this._calculateConfidence(buyDex, sellDex, profitPercent)
              };
              
              this.arbitrageOpportunities.push(opportunity);
              
              // For significant opportunities, emit an event
              if (profitPercent > 0.5) {
                const event = new CustomEvent('broker-arbitrage-opportunity', { detail: opportunity });
                window.dispatchEvent(event);
              }
            }
          }
        }
      }
    }
    
    // Sort by profit percentage (highest first)
    this.arbitrageOpportunities.sort((a, b) => parseFloat(b.profitPercent) - parseFloat(a.profitPercent));
    
    return this.arbitrageOpportunities;
  },
  
  // Update gas optimization data
  updateGasOptimization() {
    console.log('Updating gas optimization data...');
    
    // Simulate gas price data
    const now = Date.now();
    
    // Generate a current gas price with some randomness (in Gwei)
    const baseGasPrice = 25;
    const randomFactor = Math.sin(now / 10000000) * 10 + (Math.random() * 5 - 2.5);
    const currentGasPrice = baseGasPrice + randomFactor;
    
    // Add to history (keep last 24 hours - 144 data points at 10 min intervals)
    this.gasOptimization.gasHistory.push({
      timestamp: now,
      price: currentGasPrice
    });
    
    // Trim history to last 144 points
    if (this.gasOptimization.gasHistory.length > 144) {
      this.gasOptimization.gasHistory = this.gasOptimization.gasHistory.slice(-144);
    }
    
    // Calculate average gas price
    const sum = this.gasOptimization.gasHistory.reduce((acc, point) => acc + point.price, 0);
    this.gasOptimization.averageGasPrice = sum / this.gasOptimization.gasHistory.length;
    
    // Determine congestion level
    if (currentGasPrice < this.gasOptimization.averageGasPrice * 0.8) {
      this.gasOptimization.congestionLevel = 'low';
    } else if (currentGasPrice > this.gasOptimization.averageGasPrice * 1.2) {
      this.gasOptimization.congestionLevel = 'high';
    } else {
      this.gasOptimization.congestionLevel = 'normal';
    }
    
    this.gasOptimization.lastUpdate = now;
    this.gasOptimization.currentGasPrice = currentGasPrice;
    
    return this.gasOptimization;
  },
  
  // Get best DEX recommendations for a token pair
  getBestDexRecommendation(baseToken, quoteToken) {
    const pairKey = `${baseToken}_${quoteToken}`;
    
    // Ensure we have data for this pair
    if (!this.feeAnalysis.data[pairKey] || !this.priceData.data[pairKey]) {
      return null;
    }
    
    const analysis = this.feeAnalysis.data[pairKey];
    const priceData = this.priceData.data[pairKey];
    
    // Find buy DEX details
    const bestBuyDex = DEXES.find(d => d.id === analysis.bestBuy);
    const bestBuyPrice = priceData[analysis.bestBuy]?.ask || 'N/A';
    
    // Find sell DEX details
    const bestSellDex = DEXES.find(d => d.id === analysis.bestSell);
    const bestSellPrice = priceData[analysis.bestSell]?.bid || 'N/A';
    
    // Calculate average savings
    let totalSavings = 0;
    let savingsCount = 0;
    
    for (const [key, value] of Object.entries(analysis.feeSavings)) {
      totalSavings += parseFloat(value);
      savingsCount++;
    }
    
    const averageSavings = savingsCount > 0 ? (totalSavings / savingsCount).toFixed(3) : '0';
    
    // Get minimum amounts for profitable arbitrage
    const minAmounts = Object.values(analysis.minAmount);
    
    // Find the best arbitrage opportunity (if any)
    let bestArbitrage = null;
    if (minAmounts.length > 0) {
      // Sort by potential profit percentage
      minAmounts.sort((a, b) => parseFloat(b.potentialProfitPercent) - parseFloat(a.potentialProfitPercent));
      bestArbitrage = minAmounts[0];
    }
    
    return {
      pair: pairKey,
      bestBuy: {
        dex: bestBuyDex?.name || 'N/A',
        price: bestBuyPrice,
        fee: bestBuyDex ? `${(bestBuyDex.feePercent * 100).toFixed(3)}%` : 'N/A',
        gas: bestBuyDex?.gasEstimate || 'N/A'
      },
      bestSell: {
        dex: bestSellDex?.name || 'N/A',
        price: bestSellPrice,
        fee: bestSellDex ? `${(bestSellDex.feePercent * 100).toFixed(3)}%` : 'N/A',
        gas: bestSellDex?.gasEstimate || 'N/A'
      },
      averageSavings: `${averageSavings}%`,
      bestArbitrage: bestArbitrage ? {
        buyDex: DEXES.find(d => d.id === bestArbitrage.buyDex)?.name || 'N/A',
        sellDex: DEXES.find(d => d.id === bestArbitrage.sellDex)?.name || 'N/A',
        profitPercent: `${bestArbitrage.potentialProfitPercent}%`,
        minAmount: bestArbitrage.minAmount
      } : null,
      gasLevel: this.gasOptimization.congestionLevel,
      updateTimestamp: this.feeAnalysis.lastUpdate
    };
  },
  
  // Get all broker comparison data
  getAllBrokerData() {
    return {
      priceData: this.priceData,
      feeAnalysis: this.feeAnalysis,
      arbitrageOpportunities: this.arbitrageOpportunities,
      gasOptimization: this.gasOptimization,
      dexes: DEXES,
      tokenPairs: TOKEN_PAIRS
    };
  },
  
  // Get list of all tracked DEXes
  getDexList() {
    return DEXES;
  },
  
  // Get list of all tracked token pairs
  getTokenPairs() {
    return TOKEN_PAIRS;
  },
  
  // Internal method to calculate confidence score for an arbitrage opportunity
  _calculateConfidence(buyDex, sellDex, profitPercent) {
    // Calculate a confidence score based on:
    // - Liquidity of both DEXes
    // - Profit percentage
    // - Historical reliability
    
    const liquidityScore = (buyDex.liquidityRating + sellDex.liquidityRating) / 10; // 0.2 to 1.0
    const profitScore = Math.min(1, profitPercent / 5); // Cap at 1.0
    const reliabilityScore = 0.8; // Placeholder for historical reliability
    
    const confidence = (liquidityScore * 0.4 + profitScore * 0.4 + reliabilityScore * 0.2) * 100;
    return confidence.toFixed(1);
  }
};

// Initialize broker service
document.addEventListener('DOMContentLoaded', function() {
  // Add a delay to ensure other services are initialized first
  setTimeout(() => {
    brokerService.initialize();
    
    // Attach to window object for global access
    window.brokerService = brokerService;
    
    console.log('Broker comparison service initialized');
  }, 2000);
});
