// Simulation data for arbitrage opportunities
const arbitrageData = [
  {
    fromToken: 'SOL',
    toToken: 'USDC',
    viaToken: 'RAY',
    buy: {
      exchange: 'Jupiter',
      price: 120.49
    },
    sell: {
      exchange: 'Raydium',
      price: 121.73
    },
    profitPercent: 1.03,
    estimatedProfit: {
      small: 0.062, // 5 SOL position
      medium: 0.124, // 10 SOL position
      large: 0.186 // 15 SOL position
    },
    timestamp: Date.now()
  },
  {
    fromToken: 'ETH',
    toToken: 'SOL',
    viaToken: 'USDC',
    buy: {
      exchange: 'Jupiter',
      price: 36.31 // SOL per ETH
    },
    sell: {
      exchange: 'Orca',
      price: 36.79
    },
    profitPercent: 1.32,
    estimatedProfit: {
      small: 0.097, // 0.1 ETH position
      medium: 0.195, // 0.2 ETH position
      large: 0.292 // 0.3 ETH position
    },
    timestamp: Date.now() - 45000 // 45 seconds ago
  },
  {
    fromToken: 'USDC',
    toToken: 'RAY',
    viaToken: 'SOL',
    buy: {
      exchange: 'Raydium',
      price: 3.51
    },
    sell: {
      exchange: 'Jupiter',
      price: 3.54
    },
    profitPercent: 0.85,
    estimatedProfit: {
      small: 0.048, // 100 USDC position
      medium: 0.096, // 200 USDC position
      large: 0.145 // 300 USDC position
    },
    timestamp: Date.now() - 180000 // 3 minutes ago
  }
];

// Function to format the data correctly
function formatPrice(price) {
  return price.toFixed(2);
}

function formatProfit(profit) {
  return profit.toFixed(3);
}

function getProfitClass(profitPercent) {
  if (profitPercent >= 1.0) {
    return 'text-green-400';
  } else if (profitPercent >= 0.8) {
    return 'text-amber-400';
  } else {
    return 'text-gray-400';
  }
}

// Function to update the UI with arbitrage opportunities
function updateArbitrageOpportunities() {
  const container = document.getElementById('arbitrage-opportunities');
  if (!container) return;

  container.innerHTML = '';

  arbitrageData.forEach(opportunity => {
    const opportunityElement = document.createElement('div');
    opportunityElement.className = 'glass arbitrage-opportunity p-4 rounded-lg mb-4';
    
    // Calculate time difference
    const timeDiffSeconds = Math.floor((Date.now() - opportunity.timestamp) / 1000);
    let timeAgo;
    if (timeDiffSeconds < 60) {
      timeAgo = `${timeDiffSeconds} წამის წინ`;
    } else if (timeDiffSeconds < 3600) {
      timeAgo = `${Math.floor(timeDiffSeconds / 60)} წუთის წინ`;
    } else {
      timeAgo = `${Math.floor(timeDiffSeconds / 3600)} საათის წინ`;
    }

    const profitClass = getProfitClass(opportunity.profitPercent);
    
    opportunityElement.innerHTML = `
      <div class="flex justify-between items-start mb-3">
        <div>
          <h3 class="font-medium">${opportunity.fromToken} → ${opportunity.toToken} ${opportunity.viaToken ? `(${opportunity.viaToken})` : ''}</h3>
          <div class="text-xs text-gray-400">${timeAgo}</div>
        </div>
        <div class="text-right">
          <div class="${profitClass} font-bold">+${opportunity.profitPercent.toFixed(2)}%</div>
          <div class="text-xs text-gray-400">გაზის საკომისიის გათვალისწინებით</div>
        </div>
      </div>
      
      <div class="flex justify-between mb-3">
        <div class="text-sm">
          <div class="text-gray-400 mb-1">შესყიდვა</div>
          <div class="font-medium">${formatPrice(opportunity.buy.price)} ${opportunity.toToken}/${opportunity.fromToken}</div>
          <div class="text-xs text-gray-400">${opportunity.buy.exchange}</div>
        </div>
        <div class="text-lg px-3">→</div>
        <div class="text-sm text-right">
          <div class="text-gray-400 mb-1">გაყიდვა</div>
          <div class="font-medium">${formatPrice(opportunity.sell.price)} ${opportunity.toToken}/${opportunity.fromToken}</div>
          <div class="text-xs text-gray-400">${opportunity.sell.exchange}</div>
        </div>
      </div>
      
      <div class="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5">
        <div class="text-center">
          <div class="text-xs text-gray-400 mb-1">5 ${opportunity.fromToken}</div>
          <div class="font-medium ${profitClass}">+${formatProfit(opportunity.estimatedProfit.small)} ${opportunity.fromToken}</div>
        </div>
        <div class="text-center">
          <div class="text-xs text-gray-400 mb-1">10 ${opportunity.fromToken}</div>
          <div class="font-medium ${profitClass}">+${formatProfit(opportunity.estimatedProfit.medium)} ${opportunity.fromToken}</div>
        </div>
        <div class="text-center">
          <div class="text-xs text-gray-400 mb-1">15 ${opportunity.fromToken}</div>
          <div class="font-medium ${profitClass}">+${formatProfit(opportunity.estimatedProfit.large)} ${opportunity.fromToken}</div>
        </div>
      </div>
      
      <div class="mt-3 pt-3 border-t border-white/5 flex justify-end">
        <button class="btn-neo py-1 px-2 text-xs">გაანალიზება</button>
        <button class="btn-neo py-1 px-2 text-xs ml-2">შესრულება</button>
      </div>
    `;
    
    container.appendChild(opportunityElement);
  });
}

// Initialize the UI when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  updateArbitrageOpportunities();
  
  // Update every 15 seconds
  setInterval(updateArbitrageOpportunities, 15000);
});
