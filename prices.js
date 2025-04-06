// Simulation data for crypto prices
const tokenData = {
  SOL: {
    name: 'Solana',
    currentPrice: 121.35,
    previousPrice: 119.82,
    change24h: 1.28,
    marketCap: 54.8,
    volume24h: 2.3,
    icon: '☀️'
  },
  ETH: {
    name: 'Ethereum',
    currentPrice: 4412.87,
    previousPrice: 4385.12,
    change24h: 0.63,
    marketCap: 530.2,
    volume24h: 18.7,
    icon: '⬦'
  },
  BTC: {
    name: 'Bitcoin',
    currentPrice: 120847.25,
    previousPrice: 119572.18,
    change24h: 1.07,
    marketCap: 2350.4,
    volume24h: 47.5,
    icon: '₿'
  },
  USDC: {
    name: 'USD Coin',
    currentPrice: 1.00,
    previousPrice: 1.00,
    change24h: 0.00,
    marketCap: 45.3,
    volume24h: 4.2,
    icon: '$'
  },
  RAY: {
    name: 'Raydium',
    currentPrice: 3.52,
    previousPrice: 3.47,
    change24h: 1.44,
    marketCap: 0.87,
    volume24h: 0.22,
    icon: '◎'
  },
  JUP: {
    name: 'Jupiter',
    currentPrice: 2.78,
    previousPrice: 2.69,
    change24h: 3.35,
    marketCap: 1.21,
    volume24h: 0.35,
    icon: '♃'
  }
};

// Exchange sources with percentages for price data
const priceSource = {
  jupiter: 68,
  coingecko: 23,
  raydium: 9
};

// Function to format the data correctly
function formatPriceDisplay(price) {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  } else if (price >= 100) {
    return price.toFixed(2);
  } else if (price >= 1) {
    return price.toFixed(2);
  } else {
    return price.toFixed(4);
  }
}

function formatMarketCap(cap) {
  if (cap >= 1000) {
    return (cap / 1000).toFixed(1) + 'T';
  } else {
    return cap.toFixed(1) + 'B';
  }
}

function formatChange(change) {
  const formatted = change.toFixed(2);
  if (change > 0) {
    return `+${formatted}%`;
  } else if (change < 0) {
    return `${formatted}%`;
  } else {
    return `${formatted}%`;
  }
}

function getChangeClass(change) {
  if (change > 0) {
    return 'price-up';
  } else if (change < 0) {
    return 'price-down';
  } else {
    return 'text-gray-400';
  }
}

// Function to update the price cards
function updatePriceCards() {
  const container = document.getElementById('price-cards');
  if (!container) return;

  container.innerHTML = '';

  // Add header information about data sources
  const headerDiv = document.createElement('div');
  headerDiv.className = 'flex justify-between items-center mb-4 text-sm text-gray-400';
  headerDiv.innerHTML = `
    <div>ფასების წყაროები:</div>
    <div class="flex items-center">
      <div class="flex items-center mr-3">
        <div class="w-2 h-2 bg-purple-500 rounded-full mr-1"></div>
        <span>Jupiter ${priceSource.jupiter}%</span>
      </div>
      <div class="flex items-center mr-3">
        <div class="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
        <span>CoinGecko ${priceSource.coingecko}%</span>
      </div>
      <div class="flex items-center">
        <div class="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
        <span>Raydium ${priceSource.raydium}%</span>
      </div>
    </div>
  `;
  container.appendChild(headerDiv);

  // Create grid for price cards
  const gridDiv = document.createElement('div');
  gridDiv.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
  
  Object.entries(tokenData).forEach(([symbol, data]) => {
    const card = document.createElement('div');
    card.className = 'glass glow-card p-4 rounded-lg stats-item';
    
    const changeClass = getChangeClass(data.change24h);
    
    card.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center">
          <div class="token-icon bg-white/10 mr-3">${data.icon}</div>
          <div>
            <h3 class="font-medium">${data.name}</h3>
            <div class="text-xs text-gray-400">${symbol}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="font-bold">$${formatPriceDisplay(data.currentPrice)}</div>
          <div class="text-xs ${changeClass}">${formatChange(data.change24h)}</div>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div class="text-gray-400 text-xs">საბაზრო კაპ.</div>
          <div>$${formatMarketCap(data.marketCap)}</div>
        </div>
        <div>
          <div class="text-gray-400 text-xs">24სთ ვოლუმი</div>
          <div>$${formatMarketCap(data.volume24h)}</div>
        </div>
      </div>
    `;
    
    gridDiv.appendChild(card);
  });
  
  container.appendChild(gridDiv);
}

// Create simulated price history over 24 hours (for charts)
function generatePriceHistory(basePrice, volatility = 0.1, dataPoints = 24) {
  const history = [];
  let price = basePrice;
  
  for (let i = 0; i < dataPoints; i++) {
    // Random price movement with specified volatility
    const change = (Math.random() - 0.48) * volatility * basePrice; // Slightly biased upward
    price += change;
    price = Math.max(price, basePrice * 0.8); // Prevent going too low
    
    history.push({
      time: new Date(Date.now() - (dataPoints - i) * 3600000), // Hours
      price: price
    });
  }
  
  return history;
}

// Generate price history for each token
Object.keys(tokenData).forEach(symbol => {
  tokenData[symbol].priceHistory = generatePriceHistory(
    tokenData[symbol].currentPrice,
    symbol === 'USDC' ? 0.001 : 0.07 // USDC has very low volatility
  );
});

// Initialize the UI when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  updatePriceCards();
  
  // Update every 20 seconds with slight price changes
  setInterval(() => {
    Object.keys(tokenData).forEach(symbol => {
      const data = tokenData[symbol];
      const volatility = symbol === 'USDC' ? 0.0002 : 0.005;
      const change = (Math.random() - 0.48) * volatility * data.currentPrice;
      
      data.previousPrice = data.currentPrice;
      data.currentPrice += change;
      
      // Recalculate 24h change
      data.change24h = ((data.currentPrice / data.previousPrice) - 1) * 100;
    });
    
    updatePriceCards();
  }, 20000);
});
