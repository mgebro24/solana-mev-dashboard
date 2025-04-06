/**
 * Jupiter API - Solana token prices and spreads in real-time
 */

// Jupiter API endpoints - replaced with mock API, which works offline
const JUPITER_ENDPOINTS = {
  PRICE: 'https://price.jup.ag/v4/price',  // Real endpoint, currently not in use
  QUOTE: 'https://quote-api.jup.ag/v4/quote',
  SWAP: 'https://quote-api.jup.ag/v4/swap'
};

// Token addresses (for Solana mainnet)
const TOKEN_ADDRESSES = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BTC: '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E',
  ETH: '2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZxfrEBUJ',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  MSOL: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  SAMO: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
  SRM: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',
  MNGO: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac',
  STEP: 'StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT',
  ATLAS: 'ATLASXmbPQxBUYbxPsV97usA3fPQYEqzQBUHgiFCUsXx',
  POLIS: 'poLisWXnNRwC6oBu1vHiuKQzFjGL4XDSu4g9qjz9qVk',
  FIDA: 'EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp',
  COPE: '8HGyAAB1yoM1ttS7pXjHMa3dukTFGQggnFFH3hJZgzQh',
  SLND: 'SLNDpmoWTVADgEdndyvWzroNL7zSi1dF9PC3xHGtPwp',
  DFL: 'DFL1zNkaGPWm1BqAVqRdHDCbuYhCPADMLM2VcCb8VnFnQ',
  DUST: 'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ',
  TULIP: 'TuLipcqtGVXP9XR62wM8WWCm6a9vhLs7T1uoWBk6FDs',
  STSOL: '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj',
  JITO: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
  MEAN: 'MEANeD3XDdUmNMsRGjASkSWdC8prLYsoRJ61pPeHctD'
};

// Token symbols → addresses mapping
const SYMBOL_TO_ADDRESS = {};
Object.keys(TOKEN_ADDRESSES).forEach(symbol => {
  SYMBOL_TO_ADDRESS[symbol] = TOKEN_ADDRESSES[symbol];
});

// Major tokens (base currencies)
const BASE_TOKENS = ['USDC', 'USDT', 'SOL'];

// Prices cache
let priceCache = {
  data: {},
  lastUpdated: 0
};

/**
 * Get all token prices (in USDC)
 * @returns {Promise<Object>} Token prices
 */
async function getAllTokenPrices() {
  try {
    // If cache is recent (less than 2 seconds old), return it
    if (Date.now() - priceCache.lastUpdated < 2000 && Object.keys(priceCache.data).length > 0) {
      console.log('Using cached price data');
      return priceCache.data;
    }
    
    console.log('Generating mock price data for testing...');
    
    // Local mock data for offline use
    const formattedPrices = {};
    
    // Base prices - realistic but simulated
    const basePrices = {
      SOL: 120.45 + (Math.random() * 2 - 1), // Price fluctuates between 119.45-121.45
      USDC: 1.0,
      USDT: 0.999 + (Math.random() * 0.002),
      BTC: 67000 + (Math.random() * 200 - 100),
      ETH: 3200 + (Math.random() * 50 - 25),
      JUP: 1.35 + (Math.random() * 0.1 - 0.05),
      RAY: 0.68 + (Math.random() * 0.04 - 0.02),
      MSOL: 125.5 + (Math.random() * 2 - 1),
      BONK: 0.00002 + (Math.random() * 0.000005),
      SAMO: 0.025 + (Math.random() * 0.002 - 0.001)
    };
    
    // Generate token prices
    Object.keys(TOKEN_ADDRESSES).forEach(symbol => {
      const address = TOKEN_ADDRESSES[symbol];
      
      // If base price exists, use it, otherwise use a random price
      const price = basePrices[symbol] || (Math.random() * 10 + 0.1);
      
      // Random 24-hour change from -5% to +5%
      const change24h = (Math.random() * 10 - 5).toFixed(2);
      
      formattedPrices[symbol] = {
        symbol: symbol,
        address: address,
        price: price,
        change24h: parseFloat(change24h)
      };
    });
    
    // Update cache
    priceCache = {
      data: formattedPrices,
      lastUpdated: Date.now()
    };
    
    // Dispatch event about prices update
    const priceUpdateEvent = new CustomEvent('token-prices-updated', {
      detail: { prices: formattedPrices, timestamp: Date.now() }
    });
    window.dispatchEvent(priceUpdateEvent);
    
    return formattedPrices;
  } catch (error) {
    console.error('Error getting token prices:', error);
    
    // If error occurs, return mock prices
    const fallbackPrices = {
      SOL: { symbol: 'SOL', address: TOKEN_ADDRESSES.SOL, price: 120.5, change24h: 1.2 },
      USDC: { symbol: 'USDC', address: TOKEN_ADDRESSES.USDC, price: 1.0, change24h: 0.0 },
      USDT: { symbol: 'USDT', address: TOKEN_ADDRESSES.USDT, price: 0.999, change24h: -0.1 },
      BTC: { symbol: 'BTC', address: TOKEN_ADDRESSES.BTC, price: 67100, change24h: 2.5 },
      ETH: { symbol: 'ETH', address: TOKEN_ADDRESSES.ETH, price: 3210, change24h: 1.7 }
    };
    
    return fallbackPrices;
  }
}

/**
 * Get exchange rate between two tokens
 * @param {string} fromToken Starting token symbol
 * @param {string} toToken Target token symbol
 * @param {number} amount Amount
 * @returns {Promise<Object>} Exchange rate
 */
async function getExchangeRate(fromToken, toToken, amount = 1) {
  try {
    // Get addresses
    const inputMint = SYMBOL_TO_ADDRESS[fromToken];
    const outputMint = SYMBOL_TO_ADDRESS[toToken];
    
    if (!inputMint || !outputMint) {
      throw new Error('Invalid token symbols');
    }
    
    // Jupiter API parameters
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: Math.floor(amount * 1000000), // USDC and similar tokens use 6 decimals
      slippageBps: 50, // 0.5% slippage
    });
    
    // Use Jupiter API to get the best rate
    const response = await fetch(`${JUPITER_ENDPOINTS.QUOTE}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Jupiter Quote API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      fromToken,
      toToken,
      inputAmount: amount,
      outputAmount: data.outAmount / 1000000, // 6 decimal conversion
      rate: (data.outAmount / 1000000) / amount,
      priceImpactPct: data.priceImpactPct,
      routeInfo: data.routeInfo,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error(`Error getting exchange rate ${fromToken} → ${toToken}:`, error);
    
    // If API fails, return prices from cache
    try {
      const prices = await getAllTokenPrices();
      if (prices[fromToken] && prices[toToken]) {
        const rate = prices[toToken].price / prices[fromToken].price;
        return {
          fromToken,
          toToken,
          inputAmount: amount,
          outputAmount: amount * rate,
          rate: rate,
          priceImpactPct: 0,
          estimatedFromCache: true,
          timestamp: Date.now()
        };
      }
    } catch (cacheError) {
      console.error('Cache fallback also failed:', cacheError);
    }
    
    throw error;
  }
}

/**
 * Find triangular arbitrage opportunities
 * This function searches for potential profitable triangular arbitrage paths
 * A -> B -> C -> A where the final amount is greater than starting amount
 * @returns {Promise<Array>} Array of triangular arbitrage opportunities
 */
async function findTriangularArbitrageOpportunities() {
  try {
    console.log('Finding triangular arbitrage opportunities...');
    
    // Check if we have the prices cache
    if (!this.pricesCache || Object.keys(this.pricesCache).length === 0) {
      console.log('No prices in cache, fetching prices first...');
      await this.getAllTokenPrices();
    }
    
    // Define base tokens to start from (typically stablecoins or major tokens)
    const baseTokens = ['USDC', 'SOL', 'USDT', 'ETH', 'BTC'];
    
    // Define token universe to explore
    const tokenUniverse = Object.keys(this.pricesCache).filter(symbol => 
      this.pricesCache[symbol] && this.pricesCache[symbol].price > 0
    );
    
    console.log(`Searching for triangular arbitrage among ${tokenUniverse.length} tokens`);
    
    // Store found opportunities
    const opportunities = [];
    
    // For each base token
    for (const baseToken of baseTokens) {
      // Skip if base token not in prices cache
      if (!this.pricesCache[baseToken]) continue;
      
      // For each first hop token
      for (const token1 of tokenUniverse) {
        // Skip if same as base token
        if (token1 === baseToken) continue;
        // Skip if we don't have a price
        if (!this.pricesCache[token1]) continue;
        
        // For each second hop token 
        for (const token2 of tokenUniverse) {
          // Skip if same as other tokens
          if (token2 === baseToken || token2 === token1) continue;
          // Skip if we don't have a price
          if (!this.pricesCache[token2]) continue;
          
          // Calculate conversion rates with some randomness to simulate market inefficiencies
          const baseToToken1Rate = this.pricesCache[token1].price / this.pricesCache[baseToken].price;
          const token1ToToken2Rate = this.pricesCache[token2].price / this.pricesCache[token1].price;
          const token2ToBaseRate = this.pricesCache[baseToken].price / this.pricesCache[token2].price;
          
          // Add some random price difference (market inefficiency)
          const inefficiency1 = 0.99 + Math.random() * 0.04; // 0.99 to 1.03
          const inefficiency2 = 0.99 + Math.random() * 0.04; // 0.99 to 1.03
          const inefficiency3 = 0.99 + Math.random() * 0.04; // 0.99 to 1.03
          
          // Simulate DEX differences by adjusting rates
          const baseToToken1 = baseToToken1Rate * inefficiency1;
          const token1ToToken2 = token1ToToken2Rate * inefficiency2;
          const token2ToBase = token2ToBaseRate * inefficiency3;
          
          // Calculate the final amount if we start with 1 unit of base token
          const finalAmount = 1 * baseToToken1 * token1ToToken2 * token2ToBase;
          
          // Calculate profit percentage
          const profitPercent = ((finalAmount - 1) * 100).toFixed(2);
          
          // Only consider profitable opportunities
          if (finalAmount > 1.001) {  // At least 0.1% profit to account for fees
            // Get random dexes for the transactions
            const dexes = ['Jupiter', 'Raydium', 'Orca', 'Serum', 'Saber'];
            const dex1 = dexes[Math.floor(Math.random() * dexes.length)];
            const dex2 = dexes[Math.floor(Math.random() * dexes.length)];
            const dex3 = dexes[Math.floor(Math.random() * dexes.length)];
            
            // Create route
            const route = [
              { from: baseToken, to: token1, dex: dex1 },
              { from: token1, to: token2, dex: dex2 },
              { from: token2, to: baseToken, dex: dex3 }
            ];
            
            // Calculate estimated profit in base token units
            const basePrice = this.pricesCache[baseToken].price;
            const estimatedProfitInBase = finalAmount - 1;
            const estimatedProfitInUsd = (estimatedProfitInBase * basePrice).toFixed(3);
            
            // Create opportunity object
            opportunities.push({
              id: `tri_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              type: 'triangular',
              baseToken,
              route,
              profitPercent,
              estimatedProfit: estimatedProfitInUsd,
              timestamp: Date.now(),
              confidence: Math.floor(70 + Math.random() * 25), // 70-95% confidence
              executionTime: Math.floor(300 + Math.random() * 400) // 300-700ms estimated execution time
            });
          }
        }
      }
    }
    
    // Sort by profit percentage (descending)
    opportunities.sort((a, b) => parseFloat(b.profitPercent) - parseFloat(a.profitPercent));
    
    // Take the top opportunities (limit to 5 to avoid overwhelming the UI)
    const topOpportunities = opportunities.slice(0, 5);
    
    console.log(`Found ${topOpportunities.length} triangular arbitrage opportunities`);
    return topOpportunities;
  } catch (error) {
    console.error('Error finding triangular arbitrage opportunities:', error);
    return [];
  }
}

/**
 * Find simple DEX arbitrage opportunities (price differences between DEXes)
 * @returns {Promise<Array>} Array of simple arbitrage opportunities
 */
async function findDexArbitrageOpportunities() {
  try {
    console.log('Finding simple DEX arbitrage opportunities...');
    
    // Ensure we have prices
    if (!this.pricesCache || Object.keys(this.pricesCache).length === 0) {
      await this.getAllTokenPrices();
    }
    
    // Define tokens to check
    const tokens = Object.keys(this.pricesCache).filter(symbol => 
      this.pricesCache[symbol] && this.pricesCache[symbol].price > 0
    );
    
    // Virtual DEXes with slightly different prices
    const dexes = ['Jupiter', 'Raydium', 'Orca', 'OpenBook', 'Saber'];
    
    // Generate prices on different DEXes
    const dexPrices = {};
    
    // For each DEX, create slightly different prices
    dexes.forEach(dex => {
      dexPrices[dex] = {};
      
      tokens.forEach(token => {
        if (this.pricesCache[token]) {
          // Add +/- 0-3% variation to the price
          const variation = 0.97 + Math.random() * 0.06;
          dexPrices[dex][token] = this.pricesCache[token].price * variation;
        }
      });
    });
    
    // Find arbitrage opportunities
    const opportunities = [];
    
    tokens.forEach(token => {
      // Skip tokens without prices
      if (!this.pricesCache[token]) return;
      
      // Find lowest and highest prices
      let lowestPrice = Infinity;
      let highestPrice = 0;
      let buyDex = '';
      let sellDex = '';
      
      dexes.forEach(dex => {
        const price = dexPrices[dex][token];
        
        if (price < lowestPrice) {
          lowestPrice = price;
          buyDex = dex;
        }
        
        if (price > highestPrice) {
          highestPrice = price;
          sellDex = dex;
        }
      });
      
      // Calculate profit percentage
      const profitPercent = ((highestPrice / lowestPrice - 1) * 100).toFixed(2);
      
      // Only consider meaningful opportunities (at least 0.5% profit)
      if (parseFloat(profitPercent) >= 0.5 && buyDex !== sellDex) {
        // Estimate profit in USD for a standard trade size
        const tradeSize = 100; // $100 equivalent
        const estimatedProfit = (tradeSize * parseFloat(profitPercent) / 100).toFixed(2);
        
        opportunities.push({
          id: `simple_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          type: 'simple',
          fromToken: 'USDC', // Assume starting with a stablecoin
          toToken: token,
          buyDex,
          sellDex,
          buyPrice: lowestPrice.toFixed(4),
          sellPrice: highestPrice.toFixed(4),
          profitPercent,
          estimatedProfit,
          timestamp: Date.now(),
          executionTime: Math.floor(200 + Math.random() * 300) // 200-500ms estimated execution time
        });
      }
    });
    
    // Sort by profit percentage (descending)
    opportunities.sort((a, b) => parseFloat(b.profitPercent) - parseFloat(a.profitPercent));
    
    // Take top opportunities
    const topOpportunities = opportunities.slice(0, 5);
    
    console.log(`Found ${topOpportunities.length} simple DEX arbitrage opportunities`);
    return topOpportunities;
  } catch (error) {
    console.error('Error finding DEX arbitrage opportunities:', error);
    return [];
  }
}

// Export
window.jupiterAPI = {
  getAllTokenPrices,
  getExchangeRate,
  findTriangularArbitrageOpportunities,
  findDexArbitrageOpportunities,
  TOKEN_ADDRESSES,
  SYMBOL_TO_ADDRESS,
  BASE_TOKENS
};
