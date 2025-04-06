/**
 * Arbitrage UI Module
 * Handles rendering of arbitrage opportunities and automated trading functions
 */

// DOM references (will be initialized on page load)
let domElements = {
  opportunitiesContainer: null,
  opportunitiesLoading: null,
  opportunityTemplate: null,
  arbitrageCount: null,
  walletBalance: null,
  profitIndicator: null
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
  
  // Initialize DOM references - critical to do this here instead of at top level
  domElements = {
    opportunitiesContainer: document.getElementById('opportunities-container'),
    opportunitiesLoading: document.getElementById('opportunities-loading'),
    opportunityTemplate: document.getElementById('opportunity-template'),
    arbitrageCount: document.getElementById('arbitrage-count'),
    walletBalance: document.getElementById('total-balance'),
    profitIndicator: document.getElementById('profit-indicator')
  };
  
  console.log('DOM Elements initialized:', {
    opportunitiesContainer: !!domElements.opportunitiesContainer,
    opportunitiesLoading: !!domElements.opportunitiesLoading,
    opportunityTemplate: !!domElements.opportunityTemplate
  });
  
  // If we don't have the opportunities container, try to create a fallback
  if (!domElements.opportunitiesContainer) {
    console.warn('Opportunities container not found, creating fallback');
    const mainContent = document.querySelector('main') || document.body;
    
    const fallbackContainer = document.createElement('div');
    fallbackContainer.id = 'opportunities-container';
    fallbackContainer.className = 'space-y-3';
    mainContent.appendChild(fallbackContainer);
    
    domElements.opportunitiesContainer = fallbackContainer;
  }
  
  // Register event listeners
  registerEventListeners();
  
  // Initial UI setup
  updateArbitrageCount(0);
  
  // Start periodic UI updates
  setInterval(updateTimestamps, 10000); // Update timestamps every 10 seconds
  
  // Force generate some sample opportunities if none exist
  setTimeout(() => {
    if (uiState.totalOpportunitiesCount === 0 && window.solanaServices) {
      console.log('No opportunities yet, generating samples...');
      if (window.solanaServices.generateSampleTriangularArbitrageOpportunities) {
        const triangular = window.solanaServices.generateSampleTriangularArbitrageOpportunities();
        const simple = window.solanaServices.generateSampleSimpleArbitrageOpportunities();
        
        // Update state and UI
        uiState.opportunities = {
          simple: simple || [],
          triangular: triangular || [],
          complex: []
        };
        
        uiState.totalOpportunitiesCount = (simple?.length || 0) + (triangular?.length || 0);
        uiState.lastUpdate = Date.now();
        
        // Update UI
        updateArbitrageCount(uiState.totalOpportunitiesCount);
        renderArbitrageOpportunities();
      }
    }
  }, 2000);
}

/**
 * Register event listeners for arbitrage opportunities
 */
function registerEventListeners() {
  // Listen for arbitrage opportunities updates (new format)
  window.addEventListener('arbitrage-opportunities', (event) => {
    const opportunities = event.detail;
    
    console.log('Received arbitrage opportunities event with:', {
      simple: opportunities.simple?.length || 0,
      triangular: opportunities.triangular?.length || 0,
      complex: opportunities.complex?.length || 0
    });
    
    // Update our UI state
    uiState.opportunities = opportunities;
    uiState.lastUpdate = Date.now();
    
    // Calculate total opportunities count
    uiState.totalOpportunitiesCount = 
      (opportunities.simple?.length || 0) + 
      (opportunities.triangular?.length || 0) + 
      (opportunities.complex?.length || 0);
    
    // Update UI
    updateArbitrageCount(uiState.totalOpportunitiesCount);
    renderArbitrageOpportunities();
  });
  
  // Backward compatibility with old format
  window.addEventListener('arbitrage-opportunities-updated', (event) => {
    const data = event.detail;
    const opportunities = data.opportunities || [];
    
    console.log('Received arbitrage-opportunities-updated event with', opportunities.length, 'opportunities');
    
    // Organize by type
    const sortedOpportunities = {
      simple: opportunities.filter(opp => opp.type === 'simple'),
      triangular: opportunities.filter(opp => opp.type === 'triangular'),
      complex: opportunities.filter(opp => opp.type === 'complex')
    };
    
    // If we didn't get opportunities from the new format event, use these
    if (uiState.lastUpdate < data.timestamp || Date.now() - uiState.lastUpdate > 5000) {
      // Update our UI state
      uiState.opportunities = sortedOpportunities;
      uiState.lastUpdate = data.timestamp || Date.now();
      
      // Calculate total opportunities count
      uiState.totalOpportunitiesCount = opportunities.length;
      
      // Update UI
      updateArbitrageCount(uiState.totalOpportunitiesCount);
      renderArbitrageOpportunities();
    }
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
  if (!domElements.opportunitiesContainer) {
    console.warn('Opportunities container element not found');
    return;
  }
  
  if (!domElements.opportunityTemplate) {
    console.warn('Opportunity template element not found');
    return;
  }
  
  // Hide loading indicator
  if (domElements.opportunitiesLoading) {
    domElements.opportunitiesLoading.classList.add('hidden');
  }
  
  // Clear existing opportunities
  domElements.opportunitiesContainer.innerHTML = '';
  
  // Count of rendered opportunities
  let renderedCount = 0;
  const maxToRender = 6; // Limit to prevent overwhelming the UI
  
  // Helper to add opportunities of a specific type
  const addOpportunitiesOfType = (opportunities, type, maxCount) => {
    if (!opportunities || opportunities.length === 0) return 0;
    
    let count = 0;
    const sortedOpps = [...opportunities].sort((a, b) => {
      // Sort by profit percentage descending
      return parseFloat(b.profitPercent) - parseFloat(a.profitPercent);
    });
    
    for (const opp of sortedOpps) {
      if (count >= maxCount) break;
      
      const element = createOpportunityElement(opp, type);
      if (element) {
        domElements.opportunitiesContainer.appendChild(element);
        count++;
      }
    }
    
    return count;
  };
  
  // Render opportunities in order of complexity (simple first, complex last)
  const types = ['simple', 'triangular', 'complex'];
  
  for (const type of types) {
    const opps = uiState.opportunities[type] || [];
    const remaining = maxToRender - renderedCount;
    
    if (remaining <= 0) break;
    
    const typeMaxCount = type === 'simple' ? 2 : type === 'triangular' ? 3 : 1;
    const countToRender = Math.min(remaining, typeMaxCount);
    
    renderedCount += addOpportunitiesOfType(opps, type, countToRender);
  }
  
  // If no opportunities were rendered, show a message
  if (renderedCount === 0) {
    domElements.opportunitiesContainer.innerHTML = `
      <div class="text-center py-8 text-gray-400">
        <div class="text-3xl mb-2"><i class="fas fa-search"></i></div>
        <div>No arbitrage opportunities found</div>
        <div class="text-sm mt-2">Searching for profitable trading opportunities...</div>
      </div>
    `;
  }
  
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
  if (!domElements.opportunityTemplate) return null;
  
  // Clone the template
  const template = domElements.opportunityTemplate.cloneNode(true);
  template.removeAttribute('id');
  template.classList.remove('hidden');
  
  // Common properties to set
  const opportunityId = opportunity.id || `opp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const profitPercent = parseFloat(opportunity.profitPercent).toFixed(2);
  const estimatedProfit = parseFloat(opportunity.estimatedProfit || 0).toFixed(4);
  
  // Set opportunity type badge
  const typeBadge = template.querySelector('.opportunity-type');
  if (typeBadge) {
    const typeLabels = {
      'simple': 'Simple',
      'triangular': 'Triangular',
      'complex': 'Complex'
    };
    
    typeBadge.textContent = typeLabels[type] || type;
    
    // Add specific class based on type
    if (type === 'simple') {
      typeBadge.classList.add('bg-blue-900/30', 'text-blue-400', 'border-blue-500/50');
    } else if (type === 'triangular') {
      typeBadge.classList.add('bg-purple-900/30', 'text-purple-400', 'border-purple-500/50');
    } else if (type === 'complex') {
      typeBadge.classList.add('bg-red-900/30', 'text-red-400', 'border-red-500/50');
    }
  }
  
  // Set profit percentage
  const profitElement = template.querySelector('.opportunity-profit');
  if (profitElement) {
    profitElement.textContent = `+${profitPercent}%`;
    
    // Style based on profit amount
    if (parseFloat(profitPercent) > 2) {
      profitElement.classList.add('text-green-400');
    } else if (parseFloat(profitPercent) > 1) {
      profitElement.classList.add('text-green-300');
    } else {
      profitElement.classList.add('text-green-200');
    }
  }
  
  // Set opportunity details based on type
  const detailsElement = template.querySelector('.opportunity-details');
  if (detailsElement) {
    if (type === 'simple') {
      detailsElement.innerHTML = `
        <div class="flex justify-between mb-1 text-xs">
          <span>Current: ${opportunity.fromToken || 'SOL'} → ${opportunity.toToken || 'USDC'}</span>
          <span class="text-gray-400">$${estimatedProfit} profit</span>
        </div>
        <div class="flex justify-between text-xs text-gray-400">
          <span>Buy: ${opportunity.buyDex || 'Jupiter'} @ ${opportunity.buyPrice || '?'}</span>
          <span>Sell: ${opportunity.sellDex || 'Raydium'} @ ${opportunity.sellPrice || '?'}</span>
        </div>
      `;
    } else if (type === 'triangular') {
      const route = opportunity.route || [];
      const routeText = route.map(step => 
        `${step.from}→${step.to} (${step.dex})`
      ).join(' → ');
      
      detailsElement.innerHTML = `
        <div class="flex justify-between mb-1 text-xs">
          <span>Base: ${opportunity.baseToken || route[0]?.from || 'USDC'}</span>
          <span class="text-gray-400">$${estimatedProfit} profit</span>
        </div>
        <div class="text-xs text-gray-400 truncate">
          <span title="${routeText}">${routeText}</span>
        </div>
      `;
    } else if (type === 'complex') {
      const path = opportunity.path || [];
      const routeText = path.length > 0 
        ? `${path.length} step chain: ${path[0]?.from || '?'} → ... → ${path[path.length-1]?.to || '?'}`
        : 'Complex arbitrage chain';
      
      detailsElement.innerHTML = `
        <div class="flex justify-between mb-1 text-xs">
          <span>Complex</span>
          <span class="text-gray-400">$${estimatedProfit} profit</span>
        </div>
        <div class="text-xs text-gray-400">
          ${routeText}
        </div>
      `;
    }
  }
  
  // Set execute button data
  const executeButton = template.querySelector('.execute-opportunity');
  if (executeButton) {
    executeButton.dataset.opportunityId = opportunityId;
    executeButton.dataset.opportunityType = type;
    executeButton.dataset.opportunityData = JSON.stringify(opportunity);
  }
  
  return template;
}

/**
 * Add event listeners to execute buttons
 */
function addExecuteButtonListeners() {
  const executeButtons = document.querySelectorAll('.execute-opportunity');
  
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
          showNotification(`Arbitrage executed successfully! (${opportunityData.profitPercent}% profit)`, 'success');
          
          // Disable the button permanently and update text
          button.textContent = 'Executed ✓';
          button.disabled = true;
          button.classList.add('bg-green-900/30', 'text-green-400', 'border-green-500/50');
          button.classList.remove('bg-purple-900/30');
        } else {
          const errorMessage = result && result.error ? result.error : 'Unknown error';
          showNotification(`Failed to execute arbitrage: ${errorMessage}`, 'error');
          
          // Re-enable button
          button.textContent = 'Retry';
          button.disabled = false;
        }
      } catch (error) {
        console.error('Error executing opportunity:', error);
        showNotification(`Error: ${error.message}`, 'error');
        
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
