/**
 * Arbitrage UI Module
 * Handles rendering of arbitrage opportunities and automated trading functions
 */

// DOM references
const domElements = {
  opportunitiesContainer: document.getElementById('opportunities-container'),
  opportunitiesLoading: document.getElementById('opportunities-loading'),
  opportunityTemplate: document.getElementById('opportunity-template'),
  arbitrageCount: document.getElementById('arbitrage-count'),
  walletBalance: document.getElementById('total-balance'),
  profitIndicator: document.getElementById('profit-indicator')
};

// UI state
const uiState = {
  opportunities: {
    simple: [],
    triangular: [],
    complex: []
  },
  lastUpdate: 0,
  totalOpportunitiesCount: 0,
  profitHistory: [] // For tracking profit changes
};

/**
 * Initialize the arbitrage UI module
 */
function initArbitrageUI() {
  console.log('Initializing arbitrage UI module...');
  
  // Register event listeners
  registerEventListeners();
  
  // Initial UI setup
  updateArbitrageCount(0);
  
  // Start periodic UI updates
  setInterval(updateTimestamps, 10000); // Update timestamps every 10 seconds
}

/**
 * Register event listeners for arbitrage opportunities
 */
function registerEventListeners() {
  // Listen for arbitrage opportunities updates
  window.addEventListener('arbitrage-opportunities', (event) => {
    const opportunities = event.detail;
    
    // Update our UI state
    uiState.opportunities.simple = opportunities.simple || [];
    uiState.opportunities.triangular = opportunities.triangular || [];
    uiState.opportunities.complex = opportunities.complex || [];
    uiState.lastUpdate = opportunities.timestamp || Date.now();
    
    // Calculate total opportunities count
    uiState.totalOpportunitiesCount = 
      uiState.opportunities.simple.length + 
      uiState.opportunities.triangular.length + 
      uiState.opportunities.complex.length;
    
    // Update UI
    updateArbitrageCount(uiState.totalOpportunitiesCount);
    renderArbitrageOpportunities();
  });
  
  // Listen for wallet balance updates
  window.addEventListener('wallet-balance-updated', (event) => {
    updateWalletBalanceUI(event.detail.balance);
  });
}

/**
 * Update arbitrage count display
 * @param {number} count - Number of arbitrage opportunities 
 */
function updateArbitrageCount(count) {
  if (domElements.arbitrageCount) {
    domElements.arbitrageCount.textContent = count;
  }
}

/**
 * Update wallet balance UI
 * @param {number} balance - Wallet balance in SOL
 */
function updateWalletBalanceUI(balance) {
  if (!domElements.walletBalance) return;
  
  // Format balance
  const formattedBalance = parseFloat(balance).toFixed(4);
  domElements.walletBalance.textContent = `${formattedBalance} SOL`;
  
  // Track profit changes
  if (uiState.profitHistory.length > 0) {
    const lastBalance = uiState.profitHistory[uiState.profitHistory.length - 1];
    const difference = balance - lastBalance;
    
    if (Math.abs(difference) > 0.001) { // Only show significant changes
      const changePercentage = ((balance / lastBalance) - 1) * 100;
      
      if (domElements.profitIndicator) {
        const changeText = difference > 0 
          ? `+${difference.toFixed(4)} SOL (+${changePercentage.toFixed(2)}%)`
          : `${difference.toFixed(4)} SOL (${changePercentage.toFixed(2)}%)`;
          
        domElements.profitIndicator.textContent = changeText;
        domElements.profitIndicator.className = difference > 0 ? 'text-sm text-green-400' : 'text-sm text-red-400';
      }
    }
  }
  
  // Add to history (limit to 10 entries)
  uiState.profitHistory.push(parseFloat(balance));
  if (uiState.profitHistory.length > 10) {
    uiState.profitHistory.shift();
  }
}

/**
 * Render arbitrage opportunities in the UI
 */
function renderArbitrageOpportunities() {
  if (!domElements.opportunitiesContainer || !domElements.opportunityTemplate) return;
  
  // Hide loading indicator
  if (domElements.opportunitiesLoading) {
    domElements.opportunitiesLoading.style.display = 'none';
  }
  
  // Clear existing opportunities
  const existingOpportunities = domElements.opportunitiesContainer.querySelectorAll('.opportunity-item');
  existingOpportunities.forEach(item => {
    if (!item.id.startsWith('opportunities-loading')) {
      item.remove();
    }
  });
  
  // Create document fragment for better performance
  const fragment = document.createDocumentFragment();
  
  // Add triangular opportunities (highest priority)
  uiState.opportunities.triangular.forEach(opportunity => {
    const item = createOpportunityElement(opportunity, 'triangular');
    fragment.appendChild(item);
  });
  
  // Add complex opportunities
  uiState.opportunities.complex.forEach(opportunity => {
    const item = createOpportunityElement(opportunity, 'complex');
    fragment.appendChild(item);
  });
  
  // Add simple opportunities
  uiState.opportunities.simple.forEach(opportunity => {
    const item = createOpportunityElement(opportunity, 'simple');
    fragment.appendChild(item);
  });
  
  // If no opportunities, show message
  if (uiState.totalOpportunitiesCount === 0) {
    const noOppsMessage = document.createElement('div');
    noOppsMessage.className = 'glass p-3 rounded-lg text-center py-6';
    noOppsMessage.innerHTML = `<div class="text-sm text-gray-400">არ არის ხელმისაწვდომი არბიტრაჟის შესაძლებლობები</div>`;
    fragment.appendChild(noOppsMessage);
  }
  
  // Add all opportunities to the container
  domElements.opportunitiesContainer.appendChild(fragment);
  
  // Add event listeners to execute buttons
  addExecuteButtonListeners();
}

/**
 * Create opportunity element from template
 * @param {Object} opportunity - Arbitrage opportunity data
 * @param {string} type - Type of opportunity (simple, triangular, complex)
 * @returns {HTMLElement} - The created opportunity element
 */
function createOpportunityElement(opportunity, type) {
  // Clone the template
  const template = domElements.opportunityTemplate.content.cloneNode(true);
  const item = template.querySelector('.opportunity-item');
  
  // Add data attributes for filtering
  item.dataset.opportunityType = type;
  item.dataset.opportunityId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Find elements to update
  const routeElement = item.querySelector('.opportunity-route');
  const dexesElement = item.querySelector('.opportunity-dexes');
  const profitElement = item.querySelector('.opportunity-profit');
  const valueElement = item.querySelector('.opportunity-value');
  const executeButton = item.querySelector('.opportunity-execute');
  
  // Set opportunity data based on type
  if (type === 'simple') {
    routeElement.textContent = `${opportunity.tokenIn} → ${opportunity.tokenOut}`;
    dexesElement.textContent = `${opportunity.dexBuy} → ${opportunity.dexSell}`;
    executeButton.dataset.opportunityData = JSON.stringify(opportunity);
  } else if (type === 'triangular') {
    const route = opportunity.route.map(hop => hop.from).join(' → ') + 
                  ` → ${opportunity.route[opportunity.route.length - 1].to}`;
    routeElement.textContent = route;
    
    const dexes = opportunity.route.map(hop => hop.dex).join(', ');
    dexesElement.textContent = dexes;
    executeButton.dataset.opportunityData = JSON.stringify(opportunity);
  } else if (type === 'complex') {
    const routeTokens = opportunity.path.map(hop => hop.from);
    routeTokens.push(opportunity.path[opportunity.path.length - 1].to);
    
    // For complex routes, we might want to truncate if too long
    let routeText = routeTokens.join(' → ');
    if (routeText.length > 40) {
      routeText = routeTokens.slice(0, 2).join(' → ') + 
                  ` → ... → ${routeTokens[routeTokens.length - 1]}`;
    }
    
    routeElement.textContent = routeText;
    
    // Show DEXes used (might be long, so we'll truncate)
    const dexes = opportunity.path.map(hop => hop.dex);
    const uniqueDexes = [...new Set(dexes)]; // Remove duplicates
    dexesElement.textContent = uniqueDexes.join(', ');
    executeButton.dataset.opportunityData = JSON.stringify(opportunity);
  }
  
  // Common data
  profitElement.textContent = `+${opportunity.profitPercent}%`;
  valueElement.textContent = `${opportunity.estimatedProfit} SOL`;
  executeButton.dataset.opportunityType = type;
  
  return item;
}

/**
 * Add event listeners to execute buttons
 */
function addExecuteButtonListeners() {
  const executeButtons = document.querySelectorAll('.opportunity-execute');
  
  executeButtons.forEach(button => {
    button.addEventListener('click', async () => {
      // Disable button while processing
      button.disabled = true;
      button.textContent = 'Processing...';
      
      try {
        const opportunityType = button.dataset.opportunityType;
        const opportunityData = JSON.parse(button.dataset.opportunityData);
        
        // Call the appropriate execution function in solanaServices
        let result;
        
        if (opportunityType === 'simple') {
          result = await window.solanaServices.executeSimpleArbitrage(opportunityData);
        } else if (opportunityType === 'triangular') {
          result = await window.solanaServices.executeTriangularArbitrage(opportunityData);
        } else if (opportunityType === 'complex') {
          result = await window.solanaServices.executeComplexArbitrage(opportunityData);
        }
        
        // Check result
        if (result && result.success) {
          showNotification(`არბიტრაჟი წარმატებით შესრულდა! (${opportunityData.profitPercent}% მოგებით)`, 'success');
          
          // Disable the button permanently and update text
          button.textContent = 'Executed ✓';
          button.disabled = true;
          button.classList.add('bg-green-900/30', 'text-green-400', 'border-green-500/50');
          button.classList.remove('bg-purple-900/30');
        } else {
          const errorMessage = result && result.error ? result.error : 'უცნობი შეცდომა';
          showNotification(`არბიტრაჟის შესრულება ვერ მოხერხდა: ${errorMessage}`, 'error');
          
          // Re-enable button
          button.textContent = 'Retry';
          button.disabled = false;
        }
      } catch (error) {
        console.error('Error executing opportunity:', error);
        showNotification(`შეცდომა: ${error.message}`, 'error');
        
        // Re-enable button
        button.textContent = 'Retry';
        button.disabled = false;
      }
    });
  });
}

/**
 * Update timestamps on opportunities
 */
function updateTimestamps() {
  // This function would update relative timestamps if we were showing them
  // Not needed for the current implementation, but useful for future enhancements
}

/**
 * Show notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info)
 */
function showNotification(message, type = 'info') {
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing arbitrage UI module...');
  
  // Initialize on a slight delay to ensure DOM is ready
  setTimeout(() => {
    initArbitrageUI();
  }, 500);
});
