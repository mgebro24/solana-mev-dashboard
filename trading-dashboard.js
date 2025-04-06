/**
 * Trading Dashboard Module
 * სავაჭრო დაშბორდის ფუნქციონალი ტესტნეტისა და რეალური ვაჭრობისთვის
 */

// Trade history storage
const tradeHistory = {
  testnet: [],
  mainnet: []
};

// Trading configuration
const tradingConfig = {
  active: false,
  network: 'testnet', // 'testnet' or 'mainnet'
  amount: 100, // Default: $100
  maxTradesPerHour: 10,
  minProfitPercent: 1.0,
  autoTrade: false,
  startTime: null,
  tradesMade: 0,
  totalProfit: 0,
  lastTradeTime: null
};

// DOM references
const dom = {
  // ინიციალიზდება მოგვიანებით
};

/**
 * Initialize trading dashboard
 */
function initTradingDashboard() {
  // DOM references
  dom.amountInput = document.getElementById('trade-amount');
  dom.networkToggle = document.getElementById('network-toggle');
  dom.startTradingBtn = document.getElementById('start-trading-btn');
  dom.stopTradingBtn = document.getElementById('stop-trading-btn');
  dom.tradingStatus = document.getElementById('trading-status');
  dom.profitDisplay = document.getElementById('total-profit');
  dom.tradesCountDisplay = document.getElementById('trades-count');
  dom.tradeHistoryContainer = document.getElementById('trade-history-container');
  dom.minProfitInput = document.getElementById('min-profit-percent');
  dom.maxTradesInput = document.getElementById('max-trades-hour');
  dom.autoTradeCheckbox = document.getElementById('auto-trade-toggle');
  
  // Set initial values
  if (dom.amountInput) dom.amountInput.value = tradingConfig.amount;
  if (dom.minProfitInput) dom.minProfitInput.value = tradingConfig.minProfitPercent;
  if (dom.maxTradesInput) dom.maxTradesInput.value = tradingConfig.maxTradesPerHour;
  
  // Setup event listeners
  setupEventListeners();
  
  // Load trading history from localStorage
  loadTradeHistory();
  
  // Update UI
  updateTradingUI();
}

/**
 * Setup event listeners for the trading dashboard
 */
function setupEventListeners() {
  // Start trading button
  if (dom.startTradingBtn) {
    dom.startTradingBtn.addEventListener('click', startTrading);
  }
  
  // Stop trading button
  if (dom.stopTradingBtn) {
    dom.stopTradingBtn.addEventListener('click', stopTrading);
  }
  
  // Network toggle
  if (dom.networkToggle) {
    dom.networkToggle.addEventListener('change', function() {
      tradingConfig.network = this.checked ? 'mainnet' : 'testnet';
      updateTradingUI();
    });
  }
  
  // Auto-trade toggle
  if (dom.autoTradeCheckbox) {
    dom.autoTradeCheckbox.addEventListener('change', function() {
      tradingConfig.autoTrade = this.checked;
    });
  }
  
  // Amount input change
  if (dom.amountInput) {
    dom.amountInput.addEventListener('change', function() {
      const amount = parseFloat(this.value);
      if (!isNaN(amount) && amount > 0) {
        tradingConfig.amount = amount;
      } else {
        this.value = tradingConfig.amount;
      }
    });
  }
  
  // Min profit input change
  if (dom.minProfitInput) {
    dom.minProfitInput.addEventListener('change', function() {
      const value = parseFloat(this.value);
      if (!isNaN(value) && value > 0) {
        tradingConfig.minProfitPercent = value;
      } else {
        this.value = tradingConfig.minProfitPercent;
      }
    });
  }
  
  // Max trades input change
  if (dom.maxTradesInput) {
    dom.maxTradesInput.addEventListener('change', function() {
      const value = parseInt(this.value);
      if (!isNaN(value) && value > 0) {
        tradingConfig.maxTradesPerHour = value;
      } else {
        this.value = tradingConfig.maxTradesPerHour;
      }
    });
  }
  
  // Listen for arbitrage opportunities
  window.addEventListener('arbitrage-opportunities', function(event) {
    if (tradingConfig.active && tradingConfig.autoTrade) {
      const opportunities = event.detail;
      
      // Process all types of opportunities
      const allOpps = [
        ...(opportunities.triangular || []),
        ...(opportunities.simple || []),
        ...(opportunities.complex || [])
      ];
      
      // Filter for opportunities that meet our minimum profit threshold
      const profitableOpps = allOpps.filter(opp => 
        parseFloat(opp.profitPercent) >= tradingConfig.minProfitPercent
      );
      
      // Check rate limit
      const canTrade = checkTradeRateLimit();
      
      if (profitableOpps.length > 0 && canTrade) {
        // Sort by profit (highest first)
        profitableOpps.sort((a, b) => parseFloat(b.profitPercent) - parseFloat(a.profitPercent));
        
        // Execute the best opportunity
        executeTrade(profitableOpps[0]);
      }
    }
  });
}

/**
 * Start automated trading
 */
function startTrading() {
  if (!window.solanaServices.wallet.connected && tradingConfig.network === 'mainnet') {
    showNotification('Please connect your Phantom wallet to trade on mainnet', 'error');
    return;
  }
  
  // Reset counters and start the session
  tradingConfig.active = true;
  tradingConfig.startTime = Date.now();
  tradingConfig.tradesMade = 0;
  tradingConfig.totalProfit = 0;
  
  // Update UI
  updateTradingUI();
  
  // Show notification
  showNotification(
    `Started automated trading: $${tradingConfig.amount} on ${tradingConfig.network === 'testnet' ? 'testnet' : 'mainnet'}`,
    'success'
  );
  
  // Tell services that trading has started
  if (window.solanaServices) {
    window.solanaServices.startArbitrageUpdates(2000); // 2 second updates
  }
}

/**
 * Stop automated trading
 */
function stopTrading() {
  tradingConfig.active = false;
  
  // Update UI
  updateTradingUI();
  
  // Show notification
  showNotification('Automated trading stopped', 'info');
  
  // Save trade history
  saveTradeHistory();
}

/**
 * Execute a trade based on the opportunity
 * @param {Object} opportunity - The arbitrage opportunity
 */
function executeTrade(opportunity) {
  if (!tradingConfig.active) return;
  
  // Record the time of this trade
  tradingConfig.lastTradeTime = Date.now();
  
  try {
    // Calculate trade amount in the opportunity's token
    const tradeAmount = calculateTradeAmount(opportunity);
    
    // Simulate a successful trade
    const success = Math.random() > (tradingConfig.network === 'testnet' ? 0.1 : 0.2); // 90% success on testnet, 80% on mainnet
    const executionTime = Math.floor(Math.random() * 3000 + 1000); // 1-4 seconds
    const gasFee = parseFloat((Math.random() * 0.001 + 0.002).toFixed(4)); // 0.002-0.003 SOL
    
    // Create a trade record
    const tradeRecord = {
      id: `trade_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      network: tradingConfig.network,
      opportunity: opportunity.type,
      expectedProfit: parseFloat(opportunity.profitPercent),
      amount: tradeAmount,
      status: success ? 'success' : 'failed',
      executionTimeMs: executionTime,
      gas: gasFee,
      details: opportunity
    };
    
    // If successful, calculate actual profit
    if (success) {
      // Introduce some variance between expected and actual profit
      const actualProfitPercent = parseFloat(opportunity.profitPercent) * (0.9 + Math.random() * 0.2); // 90-110% of expected
      const actualProfit = tradeAmount * (actualProfitPercent / 100);
      
      tradeRecord.actualProfit = parseFloat(actualProfit.toFixed(4));
      tradeRecord.actualProfitPercent = parseFloat(actualProfitPercent.toFixed(2));
      
      // Update total profit
      tradingConfig.totalProfit += actualProfit;
    } else {
      tradeRecord.actualProfit = 0;
      tradeRecord.actualProfitPercent = 0;
      tradeRecord.failReason = getRandomFailReason();
    }
    
    // Add to trade history
    tradeHistory[tradingConfig.network].unshift(tradeRecord);
    
    // Limit history to 100 entries
    if (tradeHistory[tradingConfig.network].length > 100) {
      tradeHistory[tradingConfig.network].pop();
    }
    
    // Update counters
    tradingConfig.tradesMade++;
    
    // Update UI
    updateTradingUI();
    updateTradeHistoryUI();
    
    // Show notification
    if (success) {
      showNotification(
        `Trade #${tradingConfig.tradesMade}: Profit $${tradeRecord.actualProfit.toFixed(2)} (${tradeRecord.actualProfitPercent.toFixed(2)}%)`,
        'success'
      );
    } else {
      showNotification(
        `Trade #${tradingConfig.tradesMade} failed: ${tradeRecord.failReason}`,
        'error'
      );
    }
    
    return tradeRecord;
    
  } catch (error) {
    console.error('Error executing trade:', error);
    showNotification(`Error executing trade: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Check if we're within our trading rate limit
 * @returns {boolean} Whether we can trade now
 */
function checkTradeRateLimit() {
  if (!tradingConfig.lastTradeTime) return true;
  
  const timeSinceLastTrade = Date.now() - tradingConfig.lastTradeTime;
  const minTimeBetweenTrades = (60 * 60 * 1000) / tradingConfig.maxTradesPerHour;
  
  return timeSinceLastTrade >= minTimeBetweenTrades;
}

/**
 * Calculate the amount to trade based on the opportunity
 * @param {Object} opportunity - The arbitrage opportunity
 * @returns {number} The amount to trade
 */
function calculateTradeAmount(opportunity) {
  // Simple calculation based on available funds
  return tradingConfig.amount;
}

/**
 * Update the trading UI based on current state
 */
function updateTradingUI() {
  // Update network indicator
  if (dom.networkToggle) {
    dom.networkToggle.checked = tradingConfig.network === 'mainnet';
  }
  
  // Update button states
  if (dom.startTradingBtn && dom.stopTradingBtn) {
    dom.startTradingBtn.disabled = tradingConfig.active;
    dom.stopTradingBtn.disabled = !tradingConfig.active;
  }
  
  // Update status indicator
  if (dom.tradingStatus) {
    dom.tradingStatus.textContent = tradingConfig.active ? 'Active' : 'Stopped';
    dom.tradingStatus.className = tradingConfig.active ? 'status-active' : 'status-inactive';
  }
  
  // Update profit display
  if (dom.profitDisplay) {
    dom.profitDisplay.textContent = `$${tradingConfig.totalProfit.toFixed(2)}`;
    dom.profitDisplay.className = tradingConfig.totalProfit >= 0 ? 'text-green-400' : 'text-red-400';
  }
  
  // Update trades count
  if (dom.tradesCountDisplay) {
    dom.tradesCountDisplay.textContent = tradingConfig.tradesMade;
  }
  
  // Update history display
  updateTradeHistoryUI();
}

/**
 * Update the trade history UI
 */
function updateTradeHistoryUI() {
  if (!dom.tradeHistoryContainer) return;
  
  const currentNetworkHistory = tradeHistory[tradingConfig.network];
  
  let html = '<div class="text-sm text-gray-400 mb-2">Recent trades:</div>';
  
  if (currentNetworkHistory.length === 0) {
    html += '<div class="text-center text-gray-500 py-4">No trades yet</div>';
  } else {
    html += '<div class="space-y-2 max-h-60 overflow-y-auto">';
    
    currentNetworkHistory.slice(0, 10).forEach(trade => {
      const time = new Date(trade.timestamp).toLocaleTimeString();
      const statusClass = trade.status === 'success' ? 'text-green-400' : 'text-red-400';
      const profitText = trade.status === 'success' 
        ? `+$${trade.actualProfit.toFixed(2)} (${trade.actualProfitPercent.toFixed(2)}%)`
        : `${trade.failReason || 'Error'}`;
      
      html += `
        <div class="trade-item glass p-2 rounded-md text-sm">
          <div class="flex justify-between">
            <span class="text-gray-300">${time}</span>
            <span class="${statusClass}">${profitText}</span>
          </div>
          <div class="text-xs text-gray-400 mt-1">
            ${trade.opportunity} arbitrage · $${trade.amount.toFixed(2)} · Gas: ${trade.gas} SOL
          </div>
        </div>
      `;
    });
    
    html += '</div>';
  }
  
  dom.tradeHistoryContainer.innerHTML = html;
}

/**
 * Save trade history to localStorage
 */
function saveTradeHistory() {
  try {
    localStorage.setItem('tradeHistory', JSON.stringify(tradeHistory));
  } catch (error) {
    console.error('Error saving trade history:', error);
  }
}

/**
 * Load trade history from localStorage
 */
function loadTradeHistory() {
  try {
    const saved = localStorage.getItem('tradeHistory');
    if (saved) {
      const parsed = JSON.parse(saved);
      tradeHistory.testnet = parsed.testnet || [];
      tradeHistory.mainnet = parsed.mainnet || [];
    }
  } catch (error) {
    console.error('Error loading trade history:', error);
  }
}

/**
 * Get a random failure reason for simulated failed trades
 * @returns {string} Random failure reason
 */
function getRandomFailReason() {
  const reasons = [
    'Slippage error',
    'Insufficient liquidity',
    'Gas limit exceeded',
    'Transaction rejected',
    'Price changed before transaction',
    'Order book error',
    'Blockchain overload'
  ];
  
  return reasons[Math.floor(Math.random() * reasons.length)];
}

/**
 * Show notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info)
 */
function showNotification(message, type = 'info') {
  // Check if notification system exists
  if (typeof window.showNotification === 'function') {
    window.showNotification(message, type);
    return;
  }
  
  // Create our own notification if the global one doesn't exist
  // Check if notification container exists, create if not
  let notificationContainer = document.getElementById('notification-container');
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    notificationContainer.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
    document.body.appendChild(notificationContainer);
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification px-4 py-2 shadow-lg transform transition-all duration-300 ease-in-out`;
  
  // Set color based on type
  if (type === 'success') {
    notification.classList.add('border-green-500', 'text-green-400', 'bg-gray-800', 'border');
  } else if (type === 'error') {
    notification.classList.add('border-red-500', 'text-red-400', 'bg-gray-800', 'border');
  } else {
    notification.classList.add('border-blue-500', 'text-blue-400', 'bg-gray-800', 'border');
  }
  
  notification.innerHTML = `<div class="flex items-center gap-2">
    <span>${message}</span>
  </div>`;
  
  // Add to container
  notificationContainer.appendChild(notification);
  
  // Remove after delay
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Export functionality to global scope
window.tradingDashboard = {
  init: initTradingDashboard,
  startTrading,
  stopTrading,
  getConfig: () => ({ ...tradingConfig }),
  getHistory: () => ({ ...tradeHistory })
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing trading dashboard...');
  
  // Initialize on a slight delay to ensure DOM is ready
  setTimeout(() => {
    initTradingDashboard();
  }, 500);
});
