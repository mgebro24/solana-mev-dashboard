/**
 * Solana Services Module
 * Handles Phantom wallet integration, token data, and automatic trading
 */

// Top Solana tokens list - expanded to 20+ tokens
const TOP_SOLANA_TOKENS = [
  { symbol: 'SOL', name: 'Solana', id: 'solana' },
  { symbol: 'USDC', name: 'USD Coin', id: 'usd-coin' },
  { symbol: 'USDT', name: 'Tether', id: 'tether' },
  { symbol: 'BTC', name: 'Bitcoin (Sollet)', id: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum (Sollet)', id: 'ethereum' },
  { symbol: 'RAY', name: 'Raydium', id: 'raydium' },
  { symbol: 'SRM', name: 'Serum', id: 'serum' },
  { symbol: 'MNGO', name: 'Mango', id: 'mango-markets' },
  { symbol: 'STEP', name: 'Step Finance', id: 'step-finance' },
  { symbol: 'ATLAS', name: 'Star Atlas', id: 'star-atlas' },
  { symbol: 'POLIS', name: 'Star Atlas DAO', id: 'star-atlas-dao' },
  { symbol: 'ORCA', name: 'Orca', id: 'orca' },
  { symbol: 'FIDA', name: 'Bonfida', id: 'bonfida' },
  { symbol: 'COPE', name: 'Cope', id: 'cope' },
  { symbol: 'JUP', name: 'Jupiter', id: 'jupiter' },
  { symbol: 'SAMO', name: 'Samoyedcoin', id: 'samoyedcoin' },
  { symbol: 'BONK', name: 'Bonk', id: 'bonk' },
  { symbol: 'DFL', name: 'DeFi Land', id: 'defi-land' },
  { symbol: 'SLND', name: 'Solend', id: 'solend' },
  { symbol: 'MEAN', name: 'Mean DAO', id: 'mean-dao' },
  { symbol: 'DUST', name: 'Dust Protocol', id: 'dust-protocol' },
  { symbol: 'TULIP', name: 'Tulip Protocol', id: 'tulip-protocol' },
  { symbol: 'MSOL', name: 'Marinade staked SOL', id: 'marinade-staked-sol' },
  { symbol: 'STSOL', name: 'Lido Staked SOL', id: 'lido-staked-sol' },
  { symbol: 'JITO', name: 'Jito', id: 'jito' }
];

// API endpoints
const API_ENDPOINTS = {
  COIN_PRICES: 'https://api.coingecko.com/api/v3/simple/price',
  JUPITER_QUOTE: 'https://quote-api.jup.ag/v6/quote',
  RAYDIUM_POOLS: 'https://api.raydium.io/v2/main/pools',
  OPENBOOK_MARKETS: 'https://api.openbook-solana.com/markets'
};

// Cache management
const CACHE_TTL = {
  PRICES: 30 * 1000, // 30 seconds
  POOLS: 2 * 60 * 1000, // 2 minutes
  QUOTES: 15 * 1000 // 15 seconds
};

// Cache storage
const dataCache = {
  prices: { data: null, timestamp: 0 },
  pools: { data: null, timestamp: 0 },
  quotes: new Map() // Maps token pairs to quote data
};

// Utility to check if cache is valid
function isCacheValid(cacheEntry, ttl) {
  return cacheEntry && cacheEntry.data && (Date.now() - cacheEntry.timestamp) < ttl;
}

/**
 * Main Solana Services
 */
const solanaServices = {
  // Wallet state
  wallet: {
    connected: false,
    address: null,
    balance: null,
    provider: null
  },
  
  // Real-time data update intervals
  intervals: {
    priceUpdate: null,
    arbitrageUpdate: null
  },
  
  // Initialize all services
  async initialize() {
    console.log('Initializing Solana services...');
    
    // Check if the wallet was previously connected
    this.checkWalletConnection();
    
    // Start the price and arbitrage opportunity update intervals
    this.startPriceUpdates(2000); // Update prices every 2 seconds
    this.startArbitrageUpdates(2000); // Update arbitrage opportunities every 2 seconds
    
    // Register event listeners
    this.setupEventListeners();
    
    return true;
  },
  
  // Setup event listeners for wallet and other components
  setupEventListeners() {
    // Listen for wallet connection events from wallet-connect.js
    window.addEventListener('wallet-connected', (event) => {
      console.log('Wallet connected event received:', event.detail);
      this.wallet.connected = true;
      this.wallet.address = event.detail.address;
      
      // Update UI elements that depend on wallet state
      this.updateWalletDependentUI();
    });
    
    window.addEventListener('wallet-disconnected', () => {
      console.log('Wallet disconnected event received');
      this.wallet.connected = false;
      this.wallet.address = null;
      this.wallet.balance = null;
      
      // Update UI elements that depend on wallet state
      this.updateWalletDependentUI();
    });
  },
  
  // Update UI elements that depend on wallet state
  updateWalletDependentUI() {
    const walletRequiredElements = document.querySelectorAll('[data-wallet-required]');
    
    if (this.wallet.connected) {
      walletRequiredElements.forEach(el => {
        el.classList.remove('disabled');
        el.removeAttribute('disabled');
      });
    } else {
      walletRequiredElements.forEach(el => {
        el.classList.add('disabled');
        if (el.tagName === 'BUTTON') {
          el.setAttribute('disabled', 'disabled');
        }
      });
    }
  },
  
  // Check if wallet is already connected on page load
  async checkWalletConnection() {
    if (window.walletConnector && typeof window.walletConnector.isConnected === 'function') {
      const isConnected = window.walletConnector.isConnected();
      
      if (isConnected) {
        const state = window.walletConnector.getState();
        this.wallet.connected = true;
        this.wallet.address = state.address;
        this.wallet.balance = state.balance;
        this.wallet.provider = state.provider;
        
        this.updateWalletDependentUI();
      }
    }
  },
  
  // Start real-time price updates
  startPriceUpdates(intervalMs = 2000) {
    // Clear any existing interval
    if (this.intervals.priceUpdate) {
      clearInterval(this.intervals.priceUpdate);
    }
    
    // Initial fetch
    this.fetchAllTokenPrices();
    
    // Set up interval for regular updates
    this.intervals.priceUpdate = setInterval(() => {
      this.fetchAllTokenPrices();
    }, intervalMs);
    
    console.log(`Started price updates with interval: ${intervalMs}ms`);
  },
  
  // Start real-time arbitrage opportunity updates
  startArbitrageUpdates(intervalMs = 2000) {
    // Clear any existing interval
    if (this.intervals.arbitrageUpdate) {
      clearInterval(this.intervals.arbitrageUpdate);
    }
    
    // Initial calculation
    this.calculateArbitrageOpportunities();
    
    // Set up interval for regular updates
    this.intervals.arbitrageUpdate = setInterval(() => {
      this.calculateArbitrageOpportunities();
    }, intervalMs);
    
    console.log(`Started arbitrage updates with interval: ${intervalMs}ms`);
  },
  
  // Stop all update intervals
  stopAllUpdates() {
    if (this.intervals.priceUpdate) {
      clearInterval(this.intervals.priceUpdate);
      this.intervals.priceUpdate = null;
    }
    
    if (this.intervals.arbitrageUpdate) {
      clearInterval(this.intervals.arbitrageUpdate);
      this.intervals.arbitrageUpdate = null;
    }
    
    console.log('All updates stopped');
  },
  
  // Fetch prices for all tokens
  async fetchAllTokenPrices() {
    try {
      // Use our real Jupiter API for price data instead of simulated data
      const tokenPrices = await window.jupiterAPI.getAllTokenPrices();
      
      if (!tokenPrices || Object.keys(tokenPrices).length === 0) {
        console.error('No token prices received from Jupiter API');
        return null;
      }
      
      // Update the cache
      dataCache.prices = {
        data: tokenPrices,
        timestamp: Date.now()
      };
      
      // Dispatch an event to notify other components
      this.dispatchPriceUpdateEvent(tokenPrices);
      
      // Update the last update time display
      const timeDisplay = document.getElementById('last-update-time');
      if (timeDisplay) {
        timeDisplay.textContent = new Date().toLocaleTimeString();
      }
      
      return tokenPrices;
    } catch (error) {
      console.error('Error fetching token prices:', error);
      
      // If there's data in the cache, return it
      if (isCacheValid(dataCache.prices, CACHE_TTL.PRICES)) {
        console.log('Using cached price data due to fetch error');
        return dataCache.prices.data;
      }
      
      return null;
    }
  },
  
  // Dispatch price update event
  dispatchPriceUpdateEvent(priceData) {
    const event = new CustomEvent('price-update', {
      detail: {
        prices: priceData,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
  },
  
  // Calculate arbitrage opportunities
  async calculateArbitrageOpportunities() {
    try {
      // Fetch the latest prices if needed
      let prices = dataCache.prices.data;
      if (!isCacheValid(dataCache.prices, CACHE_TTL.PRICES)) {
        prices = await this.fetchAllTokenPrices();
      }
      
      if (!prices) {
        console.error('No price data available for arbitrage calculations');
        return;
      }
      
      // Find different types of arbitrage opportunities
      const simpleOpps = this.findSimpleArbitrageOpportunities(prices);
      const triangularOpps = await this.findTriangularArbitrageOpportunities(prices);
      const complexOpps = this.findComplexArbitrageOpportunities(prices);
      
      // Combine all opportunities
      const allOpportunities = [
        ...simpleOpps,
        ...triangularOpps,
        ...complexOpps
      ];
      
      // Sort by profit potential (highest first)
      allOpportunities.sort((a, b) => parseFloat(b.profitPercent) - parseFloat(a.profitPercent));
      
      // Dispatch event with opportunities
      const event = new CustomEvent('arbitrage-opportunities-updated', {
        detail: {
          opportunities: allOpportunities,
          timestamp: Date.now()
        }
      });
      window.dispatchEvent(event);
      
      return allOpportunities;
    } catch (error) {
      console.error('Error calculating arbitrage opportunities:', error);
      return [];
    }
  },
  
  // Find simple arbitrage opportunities (DEX price differences)
  findSimpleArbitrageOpportunities(prices) {
    const opportunities = [];
    const dexes = ['Raydium', 'Jupiter', 'Orca', 'Serum'];
    
    // We'll simulate different prices on different DEXes
    // In a real implementation, this would fetch actual DEX prices
    
    // Get tokens with price data
    const tokens = Object.keys(prices);
    
    // Generate some simulated arbitrage opportunities
    for (let i = 0; i < 3; i++) {
      if (tokens.length < 2) continue;
      
      // Select random tokens for the pair
      const token1 = tokens[Math.floor(Math.random() * tokens.length)];
      let token2;
      do {
        token2 = tokens[Math.floor(Math.random() * tokens.length)];
      } while (token2 === token1);
      
      // Select two random DEXes
      const dex1 = dexes[Math.floor(Math.random() * dexes.length)];
      let dex2;
      do {
        dex2 = dexes[Math.floor(Math.random() * dexes.length)];
      } while (dex2 === dex1);
      
      // Calculate simulated prices with slight differences
      const basePrice = prices[token1].price / prices[token2].price;
      const price1 = basePrice * (1 - Math.random() * 0.02); // Up to 2% lower
      const price2 = basePrice * (1 + Math.random() * 0.03); // Up to 3% higher
      
      // Calculate profit percentage
      const profitPercent = ((price2 / price1) - 1) * 100;
      
      // Only include opportunities with at least 0.5% profit (after fees)
      if (profitPercent >= 0.5) {
        opportunities.push({
          type: 'simple',
          tokenIn: token1,
          tokenOut: token2,
          dexBuy: dex1,
          dexSell: dex2,
          priceBuy: price1,
          priceSell: price2,
          profitPercent: profitPercent.toFixed(3),
          estimatedProfit: ((10 / price1) * (price2 - price1)).toFixed(4),
          timestamp: Date.now()
        });
      }
    }
    
    return opportunities;
  },
  
  // Find triangular arbitrage opportunities (A → B → C → A)
  findTriangularArbitrageOpportunities(prices) {
    if (!prices) return [];
    
    try {
      // Use the Jupiter API for real triangular arbitrage opportunities
      return window.jupiterAPI.findTriangularArbitrageOpportunities();
    } catch (error) {
      console.error('Error finding triangular arbitrage opportunities:', error);
      return [];
    }
  },
  
  // Find complex arbitrage opportunities (multi-hop, multi-DEX)
  findComplexArbitrageOpportunities(prices) {
    const opportunities = [];
    const dexes = ['Raydium', 'Jupiter', 'Orca', 'Serum'];
    
    // Get tokens with price data
    const tokens = Object.keys(prices);
    
    // Only simulate 1 complex opportunity
    if (tokens.length < 4) return opportunities;
    
    // Select random tokens for a multi-hop path
    const shuffled = [...tokens].sort(() => 0.5 - Math.random());
    const selectedTokens = shuffled.slice(0, 4 + Math.floor(Math.random() * 2)); // 4-5 tokens
    
    // Build a path with the selected tokens
    const path = [];
    for (let i = 0; i < selectedTokens.length - 1; i++) {
      const fromToken = selectedTokens[i];
      const toToken = selectedTokens[i + 1];
      
      // Simulated conversion rate
      const rate = (prices[fromToken].price / prices[toToken].price) * (1 - Math.random() * 0.01);
      
      path.push({
        from: fromToken,
        to: toToken,
        rate: rate,
        dex: dexes[Math.floor(Math.random() * dexes.length)]
      });
    }
    
    // Add a final conversion back to the starting token
    const fromToken = selectedTokens[selectedTokens.length - 1];
    const toToken = selectedTokens[0];
    const rate = (prices[fromToken].price / prices[toToken].price) * (1 - Math.random() * 0.01);
    
    path.push({
      from: fromToken,
      to: toToken,
      rate: rate,
      dex: dexes[Math.floor(Math.random() * dexes.length)]
    });
    
    // Calculate the overall profit factor
    let profitFactor = 1;
    path.forEach(hop => {
      profitFactor *= hop.rate;
    });
    
    // Calculate profit percentage
    const profitPercent = (1 / profitFactor - 1) * 100;
    
    // Only include if there's a reasonable profit
    if (profitPercent >= 1.2) {
      // Randomly select 3 DEXes for the 3 conversions
      const usedDexes = [
        dexes[Math.floor(Math.random() * dexes.length)],
        dexes[Math.floor(Math.random() * dexes.length)],
        dexes[Math.floor(Math.random() * dexes.length)]
      ];
      
      opportunities.push({
        type: 'complex',
        path: path,
        profitPercent: profitPercent.toFixed(3),
        estimatedProfit: ((1 / profitFactor - 1) * prices[selectedTokens[0]].price).toFixed(4),
        complexity: path.length > 4 ? 'high' : 'medium',
        timestamp: Date.now()
      });
    }
    
    return opportunities;
  },
  
  /**
   * Automated Trading Functions
   */
  
  // Execute a simple arbitrage opportunity
  async executeSimpleArbitrage(opportunity) {
    if (!this.wallet.connected) {
      console.error('Wallet not connected');
      return { success: false, error: 'Wallet not connected' };
    }
    
    try {
      console.log('Executing simple arbitrage:', opportunity);
      
      // Prepare transaction details
      const txDetails = {
        type: 'arbitrage_simple',
        buy: {
          token: opportunity.tokenIn,
          dex: opportunity.dexBuy,
          price: opportunity.priceBuy
        },
        sell: {
          token: opportunity.tokenOut,
          dex: opportunity.dexSell,
          price: opportunity.priceSell
        },
        expectedProfit: opportunity.estimatedProfit,
        timestamp: Date.now()
      };
      
      // Execute the transaction via wallet connector
      if (window.walletConnector && typeof window.walletConnector.executeTransaction === 'function') {
        return await window.walletConnector.executeTransaction(txDetails);
      } else {
        throw new Error('Wallet connector not available');
      }
    } catch (error) {
      console.error('Error executing simple arbitrage:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // Execute a triangular arbitrage opportunity
  async executeTriangularArbitrage(opportunity) {
    if (!this.wallet.connected) {
      console.error('Wallet not connected');
      return { success: false, error: 'Wallet not connected' };
    }
    
    try {
      console.log('Executing triangular arbitrage:', opportunity);
      
      // Prepare transaction details
      const txDetails = {
        type: 'arbitrage_triangular',
        route: opportunity.route,
        expectedProfit: opportunity.estimatedProfit,
        timestamp: Date.now()
      };
      
      // Execute the transaction via wallet connector
      if (window.walletConnector && typeof window.walletConnector.executeTransaction === 'function') {
        return await window.walletConnector.executeTransaction(txDetails);
      } else {
        throw new Error('Wallet connector not available');
      }
    } catch (error) {
      console.error('Error executing triangular arbitrage:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // Execute a complex arbitrage opportunity
  async executeComplexArbitrage(opportunity) {
    if (!this.wallet.connected) {
      console.error('Wallet not connected');
      return { success: false, error: 'Wallet not connected' };
    }
    
    try {
      console.log('Executing complex arbitrage:', opportunity);
      
      // Prepare transaction details
      const txDetails = {
        type: 'arbitrage_complex',
        path: opportunity.path,
        expectedProfit: opportunity.estimatedProfit,
        complexity: opportunity.complexity,
        timestamp: Date.now()
      };
      
      // Execute the transaction via wallet connector
      if (window.walletConnector && typeof window.walletConnector.executeTransaction === 'function') {
        return await window.walletConnector.executeTransaction(txDetails);
      } else {
        throw new Error('Wallet connector not available');
      }
    } catch (error) {
      console.error('Error executing complex arbitrage:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// Export the services to the global window object
window.solanaServices = solanaServices;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing Solana services...');
  solanaServices.initialize();
});
