// Advanced arbitrage detection and execution system for the Solana MEV Bot
// This script extends the basic arbitrage.js with more sophisticated detection algorithms

// Historical arbitrage data
const arbitrageHistory = {
  last24Hours: {
    totalOpportunities: 157,
    executedOpportunities: 132,
    averageProfitPercent: 1.21,
    totalProfitSOL: 23.8,
    highestProfitPercent: 3.42,
    mostProfitablePair: "SOL/USDC",
    mostProfitableVenue: "Jupiter -> Raydium"
  },
  last7Days: {
    totalOpportunities: 952,
    executedOpportunities: 831,
    averageProfitPercent: 1.15,
    totalProfitSOL: 118.3,
    highestProfitPercent: 4.87,
    mostProfitablePair: "SOL/USDC",
    mostProfitableVenue: "Jupiter -> Raydium"
  }
};

// Advanced arbitrage opportunities with more complex paths (triangular arbitrage)
const triangularArbitrageData = [
  {
    path: ["SOL", "USDC", "RAY", "SOL"],
    exchanges: ["Jupiter", "Raydium", "Orca"],
    estimatedProfit: 1.42,
    riskLevel: "medium",
    complexity: 3,
    gasCost: 0.015,
    netProfit: 1.405,
    executionTime: 850, // milliseconds
    success: 0.95, // probability
    timestamp: Date.now() - 25000
  },
  {
    path: ["SOL", "ETH", "BTC", "SOL"],
    exchanges: ["Jupiter", "Raydium", "Orca"],
    estimatedProfit: 1.71,
    riskLevel: "high",
    complexity: 4,
    gasCost: 0.022,
    netProfit: 1.688,
    executionTime: 1100, // milliseconds
    success: 0.87, // probability
    timestamp: Date.now() - 145000
  },
  {
    path: ["USDC", "SOL", "RAY", "USDC"],
    exchanges: ["Orca", "Jupiter", "Raydium"],
    estimatedProfit: 0.92,
    riskLevel: "low",
    complexity: 3,
    gasCost: 0.012,
    netProfit: 0.908,
    executionTime: 780, // milliseconds
    success: 0.98, // probability
    timestamp: Date.now() - 310000
  }
];

// Market liquidity data for more accurate arbitrage calculations
const liquidityData = {
  "SOL/USDC": {
    jupiter: 1850000,
    raydium: 1450000,
    orca: 1250000
  },
  "ETH/SOL": {
    jupiter: 750000,
    raydium: 450000,
    orca: 580000
  },
  "BTC/USDC": {
    jupiter: 2500000,
    raydium: 1800000,
    orca: 1950000
  },
  "RAY/SOL": {
    jupiter: 380000,
    raydium: 520000,
    orca: 290000
  }
};

// Function to calculate maximum trade size based on liquidity
function calculateMaxTradeSize(pair, exchange, targetSlippage = 0.005) {
  if (!liquidityData[pair] || !liquidityData[pair][exchange]) {
    return 5; // Default conservative value if liquidity data not available
  }
  
  const liquidity = liquidityData[pair][exchange];
  // Basic formula that relates liquidity, slippage and trade size
  // For production, this would be much more sophisticated
  const maxSize = Math.sqrt(liquidity * targetSlippage) / 10;
  
  return Math.min(Math.round(maxSize * 10) / 10, 30); // Cap at 30 SOL and round to 1 decimal
}

// Function to estimate execution success probability
function estimateSuccessProbability(path, complexity, marketVolatility = 0.2) {
  const baseProb = 0.99; // Base probability for simple trades
  const complexityFactor = 0.025 * (complexity - 1); // Each step reduces probability
  const volatilityImpact = marketVolatility * 0.1; // Market volatility impact
  
  return Math.max(0.75, Math.min(0.99, baseProb - complexityFactor - volatilityImpact));
}

// Function to render advanced arbitrage opportunities
function renderAdvancedArbitrageOpportunities() {
  if (!domRefs.opportunitiesContainer) return;
  
  // Only recalculate if needed (every 5 seconds)
  if (!shouldRecalculate() && perfCache.triangularOpps.length > 0) {
    return; // Use cached data
  }
  
  // Use document fragment for better performance
  const fragment = document.createDocumentFragment();
  
  // Clear previous content
  domRefs.opportunitiesContainer.innerHTML = '';
  
  // Add summary statistics
  const summaryDiv = document.createElement('div');
  summaryDiv.className = 'mb-4 p-3 glass rounded-lg';
  summaryDiv.innerHTML = `
    <div class="flex justify-between items-center mb-3">
      <h3 class="text-sm font-medium">24 საათის არბიტრაჟის სტატისტიკა</h3>
      <div class="text-xs text-gray-400">განახლდა: ${new Date().toLocaleTimeString()}</div>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
      <div>
        <div class="text-gray-400 text-xs">აღმოჩენილი</div>
        <div class="font-medium">${arbitrageHistory.last24Hours.totalOpportunities}</div>
      </div>
      <div>
        <div class="text-gray-400 text-xs">შესრულებული</div>
        <div class="font-medium">${arbitrageHistory.last24Hours.executedOpportunities}</div>
      </div>
      <div>
        <div class="text-gray-400 text-xs">საშუალო მოგება</div>
        <div class="font-medium">${arbitrageHistory.last24Hours.averageProfitPercent.toFixed(2)}%</div>
      </div>
      <div>
        <div class="text-gray-400 text-xs">ჯამური მოგება</div>
        <div class="font-medium price-up">${arbitrageHistory.last24Hours.totalProfitSOL.toFixed(1)} SOL</div>
      </div>
    </div>
  `;
  container.appendChild(summaryDiv);
  
  // Add triangular arbitrage opportunities
  const triangularHeader = document.createElement('h3');
  triangularHeader.className = 'text-sm font-medium mb-3';
  triangularHeader.textContent = 'რთული არბიტრაჟის შესაძლებლობები';
  container.appendChild(triangularHeader);
  
  triangularArbitrageData.forEach(opportunity => {
    const opportunityDiv = document.createElement('div');
    opportunityDiv.className = 'glass arbitrage-opportunity p-4 rounded-lg mb-4';
    
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
    
    // Determine risk class
    let riskClass;
    switch(opportunity.riskLevel) {
      case 'low':
        riskClass = 'text-green-400';
        break;
      case 'medium':
        riskClass = 'text-amber-400';
        break;
      case 'high':
        riskClass = 'text-red-400';
        break;
      default:
        riskClass = 'text-gray-400';
    }
    
    opportunityDiv.innerHTML = `
      <div class="flex justify-between items-start mb-3">
        <div>
          <h3 class="font-medium">${opportunity.path.join(' → ')}</h3>
          <div class="text-xs text-gray-400">${timeAgo} • ${opportunity.exchanges.join(' → ')}</div>
        </div>
        <div class="text-right">
          <div class="price-up font-bold">+${opportunity.estimatedProfit.toFixed(2)}%</div>
          <div class="text-xs ${riskClass}">${opportunity.riskLevel.toUpperCase()} რისკი</div>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div class="text-xs text-gray-400">სისწრაფე</div>
          <div class="font-medium">${opportunity.executionTime}მწმ</div>
        </div>
        <div>
          <div class="text-xs text-gray-400">წარმატების შანსი</div>
          <div class="font-medium">${(opportunity.success * 100).toFixed(0)}%</div>
        </div>
      </div>
      
      <div class="flex items-center justify-between pt-2 border-t border-white/5">
        <div>
          <span class="text-xs text-gray-400">წმინდა მოგება: </span>
          <span class="text-sm price-up">${opportunity.netProfit.toFixed(3)} SOL</span>
        </div>
        <div>
          <button class="btn-neo py-1 px-2 text-xs ml-2">შესრულება</button>
        </div>
      </div>
    `;
    
    container.appendChild(opportunityDiv);
  });
  
  // Add liquidity analysis
  const liquidityHeader = document.createElement('h3');
  liquidityHeader.className = 'text-sm font-medium mt-4 mb-3';
  liquidityHeader.textContent = 'ლიკვიდურობის ანალიზი და მაქსიმალური ტრეიდი';
  container.appendChild(liquidityHeader);
  
  const liquidityTable = document.createElement('table');
  liquidityTable.className = 'w-full mb-3';
  
  let tableHTML = `
    <thead>
      <tr>
        <th>წყვილი</th>
        <th>ბირჟა</th>
        <th>ლიკვიდურობა</th>
        <th>მაქს. ტრეიდი</th>
      </tr>
    </thead>
    <tbody>
  `;
  
  // Add a few key rows
  const keyPairs = ["SOL/USDC", "ETH/SOL"];
  keyPairs.forEach(pair => {
    Object.keys(liquidityData[pair]).forEach(exchange => {
      const liquidity = liquidityData[pair][exchange];
      const maxTradeSize = calculateMaxTradeSize(pair, exchange);
      
      tableHTML += `
        <tr>
          <td class="text-sm">${pair}</td>
          <td class="text-sm"><span class="exchange-badge">${exchange}</span></td>
          <td class="text-sm">$${(liquidity/1000).toFixed(0)}K</td>
          <td class="text-sm">${maxTradeSize} ${pair.split('/')[0]}</td>
        </tr>
      `;
    });
  });
  
  tableHTML += '</tbody>';
  liquidityTable.innerHTML = tableHTML;
  container.appendChild(liquidityTable);
  
  // Add link to full analysis
  const fullAnalysisLink = document.createElement('div');
  fullAnalysisLink.className = 'text-right mt-2';
  fullAnalysisLink.innerHTML = `
    <button class="btn-neo py-1 px-2 text-xs">სრული ლიკვიდურობის ანალიზი</button>
  `;
  container.appendChild(fullAnalysisLink);
}

// Initialize the advanced arbitrage section when DOM is loaded
// Performance optimization cache objects
const perfCache = {
  triangularOpps: [],
  historicalData: {},
  liquidityAnalysis: {},
  lastCalculationTime: 0
};

// Only recalculate every 5 seconds to improve performance
function shouldRecalculate() {
  const now = Date.now();
  const timeSinceLastCalc = now - perfCache.lastCalculationTime;
  if (timeSinceLastCalc > 5000) {
    perfCache.lastCalculationTime = now;
    return true;
  }
  return false;
}

// Improve DOM operations using fragments and caching references
const domRefs = {};

// Use debouncing for performance-heavy operations
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Lazy load data calculations
const lazyCalculate = debounce(function() {
  calculateTriangularArbitrage();
  analyzeHistoricalPerformance();
  analyzeLiquidity();
}, 300);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Cache DOM references for better performance
  domRefs.opportunitiesContainer = document.getElementById('advanced-arbitrage-opportunities');
  domRefs.liquidityContainer = document.getElementById('liquidity-analysis');
  domRefs.historicalContainer = document.getElementById('historical-analysis');
  domRefs.advancedContainer = document.getElementById('advanced-arbitrage');
  domRefs.toggleBtn = document.getElementById('toggle-advanced-arbitrage');
  domRefs.hideBtn = document.getElementById('hide-advanced-arbitrage');
  
  renderAdvancedArbitrageOpportunities();
  
  // Update every 30 seconds
  setInterval(renderAdvancedArbitrageOpportunities, 30000);
});
