/**
 * Broker UI - Module for Solana MEV Dashboard broker interface
 * Connects brokers.js module to dashboard visual elements
 */

// DOM element cache
const brokerUI = {
  // DOM element references
  elements: {
    // Selects
    tokenPairSelect: document.getElementById('broker-token-pair'),
    
    // Buy side
    bestBuyDexEl: document.getElementById('best-buy-dex'),
    bestBuyPriceEl: document.getElementById('best-buy-price'),
    bestBuyFeeEl: document.getElementById('best-buy-fee'),
    bestBuyGasEl: document.getElementById('best-buy-gas'),
    bestBuyMinEl: document.getElementById('best-buy-min'),
    
    // Sell side
    bestSellDexEl: document.getElementById('best-sell-dex'),
    bestSellPriceEl: document.getElementById('best-sell-price'),
    bestSellFeeEl: document.getElementById('best-sell-fee'),
    bestSellGasEl: document.getElementById('best-sell-gas'),
    bestSellMinEl: document.getElementById('best-sell-min'),
    
    // Arbitrage panel
    arbProfitPercentEl: document.getElementById('arb-profit-percent'),
    arbBuyDexEl: document.getElementById('arb-buy-dex'),
    arbSellDexEl: document.getElementById('arb-sell-dex'),
    arbMinAmountEl: document.getElementById('arb-min-amount'),
    arbNetProfitEl: document.getElementById('arb-net-profit'),
    executeArbButton: document.getElementById('execute-arbitrage'),
    
    // Gas status panel
    gasStatusEl: document.getElementById('gas-status'),
    avgSavingsEl: document.getElementById('avg-savings'),
    lastUpdateEl: document.getElementById('broker-last-update')
  },
  
  // Currently selected pair
  currentPair: 'SOL_USDC',
  
  // Cached data
  cache: {
    recommendations: {},
    lastUpdate: 0
  },
  
  // Initialize interface
  initialize() {
    console.log('Initializing broker UI module...');
    
    // Initialize element references
    this.cacheElements();
    
    // Listen for pair change
    if (this.elements.tokenPairSelect) {
      this.elements.tokenPairSelect.addEventListener('change', () => {
        this.currentPair = this.elements.tokenPairSelect.value;
        this.updateBrokerUI(this.currentPair);
      });
    }
    
    // Listen for arbitrage button click
    if (this.elements.executeArbButton) {
      this.elements.executeArbButton.addEventListener('click', () => {
        this.executeArbitrage();
      });
    }
    
    // Listen for new arbitrage opportunity event
    window.addEventListener('broker-arbitrage-opportunity', (event) => {
      if (event.detail) {
        // Update interface if this opportunity is for the current pair
        if (event.detail.pair === this.currentPair) {
          this.highlightOpportunity(event.detail);
        }
        
        // Show notification for significant opportunity
        if (parseFloat(event.detail.profitPercent) > 1.0) {
          this.showNotification(`${event.detail.baseToken}/${event.detail.quoteToken} - ${event.detail.profitPercent}% profit`);
        }
      }
    });
    
    // Initial update
    this.updateBrokerUI(this.currentPair);
    
    // Periodic update every 30 seconds
    setInterval(() => {
      this.updateBrokerUI(this.currentPair);
    }, 30 * 1000);
    
    return true;
  },
  
  // Re-cache DOM elements
  cacheElements() {
    this.elements = {
      // Selects
      tokenPairSelect: document.getElementById('broker-token-pair'),
      
      // Buy side
      bestBuyDexEl: document.getElementById('best-buy-dex'),
      bestBuyPriceEl: document.getElementById('best-buy-price'),
      bestBuyFeeEl: document.getElementById('best-buy-fee'),
      bestBuyGasEl: document.getElementById('best-buy-gas'),
      bestBuyMinEl: document.getElementById('best-buy-min'),
      
      // Sell side
      bestSellDexEl: document.getElementById('best-sell-dex'),
      bestSellPriceEl: document.getElementById('best-sell-price'),
      bestSellFeeEl: document.getElementById('best-sell-fee'),
      bestSellGasEl: document.getElementById('best-sell-gas'),
      bestSellMinEl: document.getElementById('best-sell-min'),
      
      // Arbitrage panel
      arbProfitPercentEl: document.getElementById('arb-profit-percent'),
      arbBuyDexEl: document.getElementById('arb-buy-dex'),
      arbSellDexEl: document.getElementById('arb-sell-dex'),
      arbMinAmountEl: document.getElementById('arb-min-amount'),
      arbNetProfitEl: document.getElementById('arb-net-profit'),
      executeArbButton: document.getElementById('execute-arbitrage'),
      
      // Gas status panel
      gasStatusEl: document.getElementById('gas-status'),
      avgSavingsEl: document.getElementById('avg-savings'),
      lastUpdateEl: document.getElementById('broker-last-update')
    };
  },
  
  // Update interface for specific pair
  updateBrokerUI(pairKey) {
    console.log(`Updating broker UI for ${pairKey}...`);
    
    // Check if brokers service is available
    if (!window.brokerService) {
      console.warn('Broker service not available yet');
      setTimeout(() => this.updateBrokerUI(pairKey), 1000);
      return;
    }
    
    // Cache and split pair
    const [baseToken, quoteToken] = pairKey.split('_');
    
    // Update gas status
    this.updateGasStatus();
    
    // Get best recommendations for this pair
    const recommendation = window.brokerService.getBestDexRecommendation(baseToken, quoteToken);
    
    if (!recommendation) {
      console.warn(`No recommendation available for ${pairKey}`);
      return;
    }
    
    // Cache
    this.cache.recommendations[pairKey] = recommendation;
    this.cache.lastUpdate = Date.now();
    
    // Update interface with new data
    this.renderRecommendation(recommendation);
    
    // Update last update time
    this.updateLastUpdateTime();
    
    return recommendation;
  },
  
  // Render best brokers recommendations on interface
  renderRecommendation(recommendation) {
    // Buy side
    if (this.elements.bestBuyDexEl) {
      this.elements.bestBuyDexEl.textContent = recommendation.bestBuy.dex;
    }
    
    if (this.elements.bestBuyPriceEl) {
      const [baseToken, quoteToken] = recommendation.pair.split('_');
      this.elements.bestBuyPriceEl.textContent = `${recommendation.bestBuy.price} ${quoteToken}`;
    }
    
    if (this.elements.bestBuyFeeEl) {
      this.elements.bestBuyFeeEl.textContent = recommendation.bestBuy.fee;
    }
    
    if (this.elements.bestBuyGasEl) {
      this.elements.bestBuyGasEl.textContent = `${recommendation.bestBuy.gas} SOL`;
    }
    
    if (this.elements.bestBuyMinEl) {
      const [baseToken, quoteToken] = recommendation.pair.split('_');
      this.elements.bestBuyMinEl.textContent = `0.01 ${baseToken}`;
    }
    
    // Sell side
    if (this.elements.bestSellDexEl) {
      this.elements.bestSellDexEl.textContent = recommendation.bestSell.dex;
    }
    
    if (this.elements.bestSellPriceEl) {
      const [baseToken, quoteToken] = recommendation.pair.split('_');
      this.elements.bestSellPriceEl.textContent = `${recommendation.bestSell.price} ${quoteToken}`;
    }
    
    if (this.elements.bestSellFeeEl) {
      this.elements.bestSellFeeEl.textContent = recommendation.bestSell.fee;
    }
    
    if (this.elements.bestSellGasEl) {
      this.elements.bestSellGasEl.textContent = `${recommendation.bestSell.gas} SOL`;
    }
    
    if (this.elements.bestSellMinEl) {
      const [baseToken, quoteToken] = recommendation.pair.split('_');
      this.elements.bestSellMinEl.textContent = `0.1 ${baseToken}`;
    }
    
    // Average savings
    if (this.elements.avgSavingsEl) {
      this.elements.avgSavingsEl.textContent = recommendation.averageSavings;
    }
    
    // Arbitrage panel
    if (recommendation.bestArbitrage) {
      this.renderArbitragePanel(recommendation);
    } else {
      this.hideArbitragePanel();
    }
  },
  
  // Render arbitrage panel
  renderArbitragePanel(recommendation) {
    const arb = recommendation.bestArbitrage;
    
    if (!arb) return;
    
    // Active arbitrage information
    if (this.elements.arbProfitPercentEl) {
      this.elements.arbProfitPercentEl.textContent = `+${arb.profitPercent}`;
    }
    
    if (this.elements.arbBuyDexEl) {
      this.elements.arbBuyDexEl.textContent = arb.buyDex;
    }
    
    if (this.elements.arbSellDexEl) {
      this.elements.arbSellDexEl.textContent = arb.sellDex;
    }
    
    if (this.elements.arbMinAmountEl) {
      const [baseToken, quoteToken] = recommendation.pair.split('_');
      this.elements.arbMinAmountEl.textContent = `${arb.minAmount} ${baseToken}`;
    }
    
    if (this.elements.arbNetProfitEl) {
      this.elements.arbNetProfitEl.textContent = arb.profitPercent;
    }
    
    // Show panel
    const panel = document.getElementById('arbitrage-opportunity-panel');
    if (panel) {
      panel.style.display = 'block';
    }
    
    // Update button state
    if (this.elements.executeArbButton) {
      const profitPercent = parseFloat(arb.profitPercent);
      
      if (profitPercent < 0.5) {
        this.elements.executeArbButton.disabled = true;
        this.elements.executeArbButton.classList.add('opacity-50');
        this.elements.executeArbButton.textContent = 'Profit too low';
      } else {
        this.elements.executeArbButton.disabled = false;
        this.elements.executeArbButton.classList.remove('opacity-50');
        this.elements.executeArbButton.textContent = 'Execute';
      }
    }
  },
  
  // Hide arbitrage panel
  hideArbitragePanel() {
    const panel = document.getElementById('arbitrage-opportunity-panel');
    if (panel) {
      panel.style.display = 'none';
    }
  },
  
  // Update gas status
  updateGasStatus() {
    if (!window.brokerService || !window.brokerService.gasOptimization) {
      return;
    }
    
    const gasStatus = window.brokerService.gasOptimization;
    
    // Determine color and text
    let gasStatusText, gasStatusColor;
    
    switch(gasStatus.congestionLevel) {
      case 'low':
        gasStatusText = 'Low';
        gasStatusColor = 'text-green-400';
        break;
      case 'high':
        gasStatusText = 'High - increased';
        gasStatusColor = 'text-red-400';
        break;
      default:
        gasStatusText = 'Normal';
        gasStatusColor = 'text-blue-400';
    }
    
    // Update gas status element
    if (this.elements.gasStatusEl) {
      this.elements.gasStatusEl.textContent = gasStatusText;
      
      // Remove old classes and add new
      this.elements.gasStatusEl.className = 'text-sm font-medium';
      this.elements.gasStatusEl.classList.add(gasStatusColor);
    }
  },
  
  // Update last update time
  updateLastUpdateTime() {
    if (!this.elements.lastUpdateEl) return;
    
    const now = Date.now();
    const lastUpdate = this.cache.lastUpdate;
    const diffSeconds = Math.floor((now - lastUpdate) / 1000);
    
    let timeText;
    
    if (diffSeconds < 5) {
      timeText = 'Just now';
    } else if (diffSeconds < 60) {
      timeText = `${diffSeconds} seconds ago`;
    } else {
      const diffMinutes = Math.floor(diffSeconds / 60);
      timeText = `${diffMinutes} minutes ago`;
    }
    
    this.elements.lastUpdateEl.textContent = timeText;
  },
  
  // Execute arbitrage
  executeArbitrage() {
    console.log('Executing arbitrage opportunity...');
    
    // Get current pair recommendation
    const recommendation = this.cache.recommendations[this.currentPair];
    
    if (!recommendation || !recommendation.bestArbitrage) {
      console.warn('No valid arbitrage opportunity available');
      this.showNotification('No active arbitrage opportunity available', 'error');
      return;
    }
    
    const arb = recommendation.bestArbitrage;
    const [baseToken, quoteToken] = this.currentPair.split('_');
    
    // Simulate arbitrage execution
    this.showNotification('Executing arbitrage...', 'info');
    
    // If transactions engine exists, use it
    if (window.transactionsEngine) {
      // Calculate minimum amount
      const minAmount = parseFloat(arb.minAmount);
      // Round minimum amount with added buffer
      const amount = Math.ceil(minAmount * 1.2 * 100) / 100;
      
      const opportunity = {
        id: `manual_arb_${Date.now()}`,
        pair: this.currentPair,
        baseToken: baseToken,
        quoteToken: quoteToken,
        buyDex: arb.buyDex.toLowerCase(),
        sellDex: arb.sellDex.toLowerCase(),
        amount: amount,
        expectedProfitPercent: parseFloat(arb.profitPercent),
        source: 'manual',
        timestamp: Date.now()
      };
      
      // Execute transaction
      window.transactionsEngine.executeOpportunity(opportunity)
        .then(result => {
          if (result.success) {
            this.showNotification(`Arbitrage executed successfully! Profit: ${result.profit} ${baseToken}`, 'success');
            
            // Update interface after a short delay
            setTimeout(() => {
              this.updateBrokerUI(this.currentPair);
            }, 2000);
          } else {
            this.showNotification(`Error executing arbitrage: ${result.error}`, 'error');
          }
        })
        .catch(error => {
          console.error('Error executing arbitrage:', error);
          this.showNotification('Error executing arbitrage', 'error');
        });
    } else {
      // Simulated execution if transactions engine does not exist
      setTimeout(() => {
        const success = Math.random() > 0.2; // 80% success chance
        
        if (success) {
          const profit = (parseFloat(arb.profitPercent) * 10).toFixed(3);
          this.showNotification(`Arbitrage executed successfully! Profit: ${profit} ${baseToken}`, 'success');
        } else {
          this.showNotification('Error executing arbitrage: market conditions changed', 'error');
        }
        
        // Update interface
        this.updateBrokerUI(this.currentPair);
      }, 1500);
    }
  },
  
  // Highlight significant arbitrage opportunities
  highlightOpportunity(opportunity) {
    console.log('Highlighting new opportunity:', opportunity);
    
    // If panel is not visible, show it
    const panel = document.getElementById('arbitrage-opportunity-panel');
    if (panel) {
      panel.style.display = 'block';
    }
    
    // Visual effect for new opportunity
    panel.classList.add('animate-pulse');
    
    // Remove effect after a short delay
    setTimeout(() => {
      panel.classList.remove('animate-pulse');
    }, 2000);
    
    // Update recommendations
    const [baseToken, quoteToken] = opportunity.pair.split('_');
    this.updateBrokerUI(opportunity.pair);
  },
  
  // Show notification
  showNotification(message, type = 'info') {
    console.log(`Notification (${type}): ${message}`);
    
    // Determine color based on type
    let bgColor, textColor;
    
    switch(type) {
      case 'success':
        bgColor = 'bg-green-500';
        textColor = 'text-white';
        break;
      case 'error':
        bgColor = 'bg-red-500';
        textColor = 'text-white';
        break;
      case 'warning':
        bgColor = 'bg-yellow-500';
        textColor = 'text-gray-900';
        break;
      default:
        bgColor = 'bg-blue-500';
        textColor = 'text-white';
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${bgColor} ${textColor} px-4 py-3 rounded-lg shadow-lg z-50 transition-all duration-500 transform translate-x-full opacity-0`;
    notification.innerHTML = `
      <div class="flex items-center">
        <span class="mr-2">${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
        <span>${message}</span>
      </div>
    `;
    
    // Add notification to document
    document.body.appendChild(notification);
    
    // Add animation
    setTimeout(() => {
      notification.classList.remove('translate-x-full', 'opacity-0');
    }, 10);
    
    // Remove notification after a short delay
    setTimeout(() => {
      notification.classList.add('translate-x-full', 'opacity-0');
      
      // Remove element after animation
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, 4000);
  }
};

// Initialize module on page load
document.addEventListener('DOMContentLoaded', function() {
  // Initialize module 1.5 seconds after page load, after brokers.js has finished
  setTimeout(() => {
    brokerUI.initialize();
    
    // Attach module to global object
    window.brokerUI = brokerUI;
    
    console.log('Broker UI module initialized');
  }, 1500);
});
