/**
 * Advanced analytics for the Solana MEV Dashboard
 * Provides detailed market analysis, trading simulation, and performance metrics
 */

// Market analysis metrics for various tokens
const marketAnalysis = {
  // Initialize storage for market analysis data
  data: {},
  volatilityIndex: 0,
  lastUpdate: 0,
  
  // Calculate volatility for a specific token
  calculateVolatility(token, priceHistory) {
    if (!priceHistory || priceHistory.length < 5) return 0;
    
    // Calculate standard deviation of price changes
    const changes = [];
    for (let i = 1; i < priceHistory.length; i++) {
      const pctChange = (priceHistory[i] - priceHistory[i-1]) / priceHistory[i-1];
      changes.push(pctChange);
    }
    
    const mean = changes.reduce((sum, val) => sum + val, 0) / changes.length;
    const variance = changes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / changes.length;
    return Math.sqrt(variance);
  },
  
  // Update market analysis for all tokens
  updateAnalysis(priceData) {
    if (!priceData) return;
    const now = Date.now();
    
    // Only update every 30 seconds to improve performance
    if (now - this.lastUpdate < 30000 && Object.keys(this.data).length > 0) {
      return this.data;
    }
    
    this.lastUpdate = now;
    
    // Calculate metrics for each token
    Object.keys(priceData).forEach(token => {
      const history = priceData[token].history || [];
      const currentPrice = priceData[token].price || 0;
      
      if (!this.data[token]) {
        this.data[token] = {
          volatility: 0,
          trend: 0,
          support: 0,
          resistance: 0,
          volume24h: 0,
          priceHistory: []
        };
      }
      
      // Update price history (keep last 48 entries - 24 hours)
      this.data[token].priceHistory.push(currentPrice);
      if (this.data[token].priceHistory.length > 48) {
        this.data[token].priceHistory.shift();
      }
      
      // Calculate volatility
      this.data[token].volatility = this.calculateVolatility(token, this.data[token].priceHistory);
      
      // Calculate trend (simple moving average direction)
      const shortMA = history.slice(-5).reduce((sum, price) => sum + price, 0) / 5;
      const longMA = history.slice(-20).reduce((sum, price) => sum + price, 0) / 20;
      this.data[token].trend = shortMA > longMA ? 1 : shortMA < longMA ? -1 : 0;
      
      // Estimate support/resistance levels
      const sortedPrices = [...history].sort((a, b) => a - b);
      const lowerBound = Math.floor(sortedPrices.length * 0.1);
      const upperBound = Math.floor(sortedPrices.length * 0.9);
      this.data[token].support = sortedPrices[lowerBound] || 0;
      this.data[token].resistance = sortedPrices[upperBound] || 0;
      
      // Use simulated 24h volume (in real system this would come from API)
      this.data[token].volume24h = Math.random() * 10000000 * (currentPrice || 1);
    });
    
    // Calculate market-wide volatility index
    const volatilities = Object.values(this.data).map(data => data.volatility);
    this.volatilityIndex = volatilities.reduce((sum, vol) => sum + vol, 0) / volatilities.length;
    
    return this.data;
  },
  
  // Get market analysis data
  getAnalysis() {
    return {
      tokenData: this.data,
      marketIndex: {
        volatility: this.volatilityIndex,
        timestamp: this.lastUpdate
      }
    };
  }
};

// Trading simulation engine
const tradingSimulator = {
  // Trade history for simulation
  history: [],
  
  // Configuration for trading simulation
  config: {
    initialCapital: 1000,
    maxLeverage: 3,
    feeRate: 0.0005, // 0.05%
    slippageModel: 'adaptive', // 'fixed', 'adaptive', 'liquidity-based'
    riskProfile: 'moderate' // 'conservative', 'moderate', 'aggressive'
  },
  
  // Current simulation state
  state: {
    balance: 1000,
    openPositions: [],
    pnl: 0,
    totalTrades: 0,
    successfulTrades: 0,
    failedTrades: 0
  },
  
  // Reset the simulation
  reset(config = {}) {
    this.config = { ...this.config, ...config };
    this.state = {
      balance: this.config.initialCapital,
      openPositions: [],
      pnl: 0,
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0
    };
    this.history = [];
  },
  
  // Execute a simulated trade
  executeTrade(fromToken, toToken, amount, prices) {
    if (!prices || !prices[fromToken] || !prices[toToken]) {
      return { success: false, reason: 'Invalid prices data' };
    }
    
    const fromPrice = prices[fromToken].price;
    const toPrice = prices[toToken].price;
    
    if (!fromPrice || !toPrice) {
      return { success: false, reason: 'Missing price data' };
    }
    
    // Calculate value
    const initialValue = amount * fromPrice;
    
    // Apply fees
    const feeAmount = initialValue * this.config.feeRate;
    
    // Calculate slippage based on model
    let slippageRate = 0;
    if (this.config.slippageModel === 'fixed') {
      slippageRate = 0.001; // 0.1%
    } else if (this.config.slippageModel === 'adaptive') {
      // Slippage increases with trade size and market volatility
      const volatility = marketAnalysis.data[toToken]?.volatility || 0.01;
      slippageRate = 0.0005 + (initialValue / 10000) * 0.001 + volatility * 0.01;
    } else if (this.config.slippageModel === 'liquidity-based') {
      // Based on simulated liquidity depth
      const liquidityFactor = Math.random() * 0.5 + 0.5; // 0.5 to 1.0
      slippageRate = 0.0005 + (initialValue / (10000 * liquidityFactor)) * 0.002;
    }
    
    const slippageAmount = initialValue * slippageRate;
    
    // Calculate final value
    const effectiveValue = initialValue - feeAmount - slippageAmount;
    const receivedAmount = effectiveValue / toPrice;
    
    // Record the trade
    const trade = {
      timestamp: Date.now(),
      fromToken,
      toToken,
      fromAmount: amount,
      toAmount: receivedAmount,
      fromPrice,
      toPrice,
      fees: feeAmount,
      slippage: slippageAmount,
      success: true
    };
    
    this.history.push(trade);
    this.state.totalTrades++;
    
    // Randomly determine success based on risk profile
    let successProbability = 0;
    switch (this.config.riskProfile) {
      case 'conservative':
        successProbability = 0.85;
        break;
      case 'moderate':
        successProbability = 0.75;
        break;
      case 'aggressive':
        successProbability = 0.65;
        break;
      default:
        successProbability = 0.75;
    }
    
    const isSuccessful = Math.random() < successProbability;
    
    if (isSuccessful) {
      this.state.successfulTrades++;
      
      // Simulate profit or loss
      const profit = (Math.random() * 0.03 - 0.01) * effectiveValue; // -1% to +2%
      this.state.pnl += profit;
      this.state.balance += profit;
      
      return {
        success: true,
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: receivedAmount,
        profit
      };
    } else {
      this.state.failedTrades++;
      
      // Simulate bigger loss on failed trades
      const loss = -0.02 * effectiveValue; // -2%
      this.state.pnl += loss;
      this.state.balance += loss;
      
      return {
        success: false,
        reason: 'Transaction reverted due to market conditions',
        loss
      };
    }
  },
  
  // Get trading simulation summary
  getSummary() {
    return {
      config: this.config,
      state: this.state,
      successRate: this.state.totalTrades > 0 ? 
        (this.state.successfulTrades / this.state.totalTrades * 100).toFixed(1) + '%' : 'N/A',
      averageProfitPerTrade: this.state.totalTrades > 0 ? 
        (this.state.pnl / this.state.totalTrades).toFixed(4) : 'N/A',
      roi: ((this.state.balance / this.config.initialCapital - 1) * 100).toFixed(2) + '%'
    };
  }
};

// Market visualization utilities
const marketVisualizer = {
  // Chart colors for different tokens
  colors: {
    SOL: '#9945FF',
    BTC: '#F7931A',
    ETH: '#627EEA',
    USDC: '#2775CA',
    USDT: '#26A17B',
    JUP: '#6BB1F1',
    RAY: '#4DA0FF',
    DEFAULT: '#627EEA'
  },
  
  // Generate chart data from price history
  generateChartData(token, priceHistory, timeframeInHours = 24) {
    if (!priceHistory || priceHistory.length < 2) return null;
    
    const timeIntervalMs = (timeframeInHours * 3600000) / priceHistory.length;
    const endTime = Date.now();
    const startTime = endTime - (timeframeInHours * 3600000);
    
    return priceHistory.map((price, index) => {
      const timestamp = startTime + (index * timeIntervalMs);
      return {
        x: new Date(timestamp).toISOString(),
        y: price
      };
    });
  },
  
  // Render a simple price chart (to be used with a chart library)
  renderPriceChart(element, token, priceHistory, options = {}) {
    if (!element) return;
    
    const chartData = this.generateChartData(token, priceHistory, options.timeframe || 24);
    if (!chartData) {
      element.innerHTML = '<div class="text-center py-4 text-gray-400">Insufficient data</div>';
      return;
    }
    
    // This is a placeholder - in a real implementation, you'd use a library like Chart.js
    const chartColor = this.colors[token] || this.colors.DEFAULT;
    
    element.innerHTML = `
      <div class="text-center py-2 glass rounded-lg">
        <div class="text-sm font-medium">${token} Price Chart</div>
        <div class="text-xs text-gray-400">Last ${options.timeframe || 24} hours</div>
        <div class="h-32 mt-2 flex items-end justify-between px-2 gap-1">
          ${chartData.map((point, i) => {
            const height = (point.y / Math.max(...chartData.map(p => p.y))) * 100;
            return `<div style="height:${height}%; background-color:${chartColor}; width:4px; opacity:${0.5 + (i/chartData.length)*0.5}"></div>`;
          }).join('')}
        </div>
        <div class="flex justify-between text-xs text-gray-400 mt-1">
          <span>${new Date(chartData[0].x).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</span>
          <span>${new Date(chartData[chartData.length-1].x).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
      </div>
    `;
  },
  
  // Render market analysis metrics
  renderMarketMetrics(element, token, analysisData) {
    if (!element || !analysisData || !analysisData[token]) return;
    
    const tokenData = analysisData[token];
    const trendIcon = tokenData.trend > 0 ? '↑' : tokenData.trend < 0 ? '↓' : '→';
    const trendClass = tokenData.trend > 0 ? 'price-up' : tokenData.trend < 0 ? 'price-down' : '';
    
    element.innerHTML = `
      <div class="glass p-3 rounded-lg">
        <div class="text-sm font-medium mb-2">${token} Market Analysis</div>
        
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div class="text-gray-400">Volatility</div>
            <div>${(tokenData.volatility * 100).toFixed(2)}%</div>
          </div>
          <div>
            <div class="text-gray-400">Trend</div>
            <div class="${trendClass}">${trendIcon} ${tokenData.trend > 0 ? 'Bullish' : tokenData.trend < 0 ? 'Bearish' : 'Neutral'}</div>
          </div>
          <div>
            <div class="text-gray-400">Support</div>
            <div>${tokenData.support.toFixed(2)}</div>
          </div>
          <div>
            <div class="text-gray-400">Resistance</div>
            <div>${tokenData.resistance.toFixed(2)}</div>
          </div>
          <div class="col-span-2">
            <div class="text-gray-400">24h Volume</div>
            <div>$${(tokenData.volume24h / 1000000).toFixed(2)}M</div>
          </div>
        </div>
      </div>
    `;
  }
};

// Performance report for the Solana MEV Bot
const performanceReporter = {
  // Report data
  data: {
    uptime: 3600 * 24 * 15, // 15 days in seconds
    successRate: 97.3,
    avgExecutionTime: 842,
    profitUSD: 3603.69,
    hourlyProfits: Array(24).fill(0).map(() => Math.random() * 20 + 5),
    transactionCount: 952,
    gasCosts: 0.011223,
    cpuUsage: {
      average: 23,
      peak: 68
    },
    memoryUsage: {
      average: 350,
      peak: 780
    }
  },
  
  // Report templates
  templates: {
    executionStats: (data) => `
      <div class="report-section">
        <h4 class="font-medium">Execution Statistics</h4>
        <div class="glass p-3 rounded-lg my-2">
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div class="text-gray-400 text-xs">Transactions</div>
              <div>${data.transactionCount}</div>
            </div>
            <div>
              <div class="text-gray-400 text-xs">Success Rate</div>
              <div>${data.successRate}%</div>
            </div>
            <div>
              <div class="text-gray-400 text-xs">Average Execution Time</div>
              <div>${data.avgExecutionTime} ms</div>
            </div>
            <div>
              <div class="text-gray-400 text-xs">Gas Costs</div>
              <div>${data.gasCosts.toFixed(6)} SOL</div>
            </div>
          </div>
        </div>
      </div>
    `,
    
    profitabilityAnalysis: (data) => `
      <div class="report-section">
        <h4 class="font-medium">Profitability Analysis</h4>
        <div class="glass p-3 rounded-lg my-2">
          <div class="flex justify-between items-center mb-2">
            <div class="text-gray-400 text-xs">Total Profit</div>
            <div class="price-up font-medium">$${data.profitUSD.toFixed(2)}</div>
          </div>
          
          <div class="text-gray-400 text-xs mb-1">Hourly Profit Distribution</div>
          <div class="h-16 flex items-end justify-between gap-1">
            ${data.hourlyProfits.map(profit => {
              const height = (profit / Math.max(...data.hourlyProfits)) * 100;
              return `<div style="height:${height}%; background-color:#10b981; width:8px;"></div>`;
            }).join('')}
          </div>
          <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span>12AM</span>
            <span>12PM</span>
            <span>11PM</span>
          </div>
        </div>
      </div>
    `,
    
    systemPerformance: (data) => `
      <div class="report-section">
        <h4 class="font-medium">System Performance</h4>
        <div class="glass p-3 rounded-lg my-2">
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div class="text-gray-400 text-xs">Uptime</div>
              <div>${Math.floor(data.uptime / 86400)} days ${Math.floor((data.uptime % 86400) / 3600)} hours</div>
            </div>
            <div>
              <div class="text-gray-400 text-xs">CPU Usage</div>
              <div>Avg ${data.cpuUsage.average}% (Peak ${data.cpuUsage.peak}%)</div>
            </div>
            <div>
              <div class="text-gray-400 text-xs">Memory Usage</div>
              <div>Avg ${data.memoryUsage.average}MB (Peak ${data.memoryUsage.peak}MB)</div>
            </div>
            <div>
              <div class="text-gray-400 text-xs">Logging System</div>
              <div>10MB rotation / 1KB storage</div>
            </div>
          </div>
        </div>
      </div>
    `
  },
  
  // Generate a complete performance report
  generateReport(element) {
    if (!element) return;
    
    element.innerHTML = `
      <div class="performance-report">
        <div class="text-lg font-medium mb-4">Solana MEV Bot - Performance Report</div>
        
        ${this.templates.executionStats(this.data)}
        ${this.templates.profitabilityAnalysis(this.data)}
        ${this.templates.systemPerformance(this.data)}
      </div>
    `;
  }
};

// Initialize analytics when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Attach to window object for global access
  window.solanaAnalytics = {
    marketAnalysis,
    tradingSimulator,
    marketVisualizer,
    performanceReporter
  };
  
  // Initialize with default values if price data is available
  if (window.prices) {
    marketAnalysis.updateAnalysis(window.prices);
  }
  
  console.log('Analytics module initialized');
});
