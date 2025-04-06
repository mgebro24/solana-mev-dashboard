/**
 * Jupiter API - Solana ტოკენების ფასებისა და სპრედების რეალურდროულად მიღება
 */

// Jupiter API ენდპოინტები
const JUPITER_ENDPOINTS = {
  PRICE: 'https://price.jup.ag/v4/price',
  QUOTE: 'https://quote-api.jup.ag/v4/quote',
  SWAP: 'https://quote-api.jup.ag/v4/swap'
};

// ტოკენის მისამართები (Solana მეინქსელისთვის)
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
  DFL: 'DFL1zNkaGPWm1BqAVqRjCZvHmwTFrEaJtbzJWgseoNJh',
  DUST: 'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ',
  TULIP: 'TuLipcqtGVXP9XR62wM8WWCm6a9vhLs7T1uoWBk6FDs',
  STSOL: '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj',
  JITO: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
  MEAN: 'MEANeD3XDdUmNMsRGjASkSWdC8prLYsoRJ61pPeHctD'
};

// ტოკენების სიმბოლოები → მისამართები მეფინგი
const SYMBOL_TO_ADDRESS = {};
Object.keys(TOKEN_ADDRESSES).forEach(symbol => {
  SYMBOL_TO_ADDRESS[symbol] = TOKEN_ADDRESSES[symbol];
});

// წამყვანი ტოკენები (საყრდენი ვალუტები)
const BASE_TOKENS = ['USDC', 'USDT', 'SOL'];

// ფასების ქეში
let priceCache = {
  data: {},
  lastUpdated: 0
};

/**
 * ყველა ტოკენის ფასების მიღება (USDC-ში)
 * @returns {Promise<Object>} ტოკენების ფასები
 */
async function getAllTokenPrices() {
  try {
    // თუ ქეში არის ახალი (2 წამზე ნაკლები), დავაბრუნოთ ის
    if (Date.now() - priceCache.lastUpdated < 2000 && Object.keys(priceCache.data).length > 0) {
      console.log('Using cached price data');
      return priceCache.data;
    }
    
    console.log('Fetching real-time prices from Jupiter API...');
    
    // დიდი ხანია მსუმენი არ განახლებულა, გავაგავაკეთოთ ახალი მოთხოვნა
    const response = await fetch(`${JUPITER_ENDPOINTS.PRICE}?ids=${Object.values(TOKEN_ADDRESSES).join(',')}`);
    
    if (!response.ok) {
      throw new Error(`Jupiter API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // დავაფორმატოთ მონაცემები უფრო მოსახერხებელ ფორმატში
    const formattedPrices = {};
    
    Object.keys(TOKEN_ADDRESSES).forEach(symbol => {
      const address = TOKEN_ADDRESSES[symbol];
      if (data.data[address]) {
        formattedPrices[symbol] = {
          symbol: symbol,
          address: address,
          price: data.data[address].price,
          change24h: data.data[address]?.priceChange24h || 0
        };
      }
    });
    
    // განვაახლოთ ქეში
    priceCache = {
      data: formattedPrices,
      lastUpdated: Date.now()
    };
    
    return formattedPrices;
  } catch (error) {
    console.error('Error fetching token prices from Jupiter:', error);
    
    // თუ ქეში აქვს მონაცემები, დავაბრუნოთ ის შეცდომის შემთხვევაში
    if (Object.keys(priceCache.data).length > 0) {
      console.log('Using cached price data due to fetch error');
      return priceCache.data;
    }
    
    return {};
  }
}

/**
 * ორ ტოკენს შორის კურსის მიღება
 * @param {string} fromToken საწყისი ტოკენის სიმბოლო
 * @param {string} toToken სამიზნე ტოკენის სიმბოლო
 * @param {number} amount რაოდენობა
 * @returns {Promise<Object>} გაცვლის კურსი
 */
async function getExchangeRate(fromToken, toToken, amount = 1) {
  try {
    // მივიღოთ მისამართები
    const inputMint = SYMBOL_TO_ADDRESS[fromToken];
    const outputMint = SYMBOL_TO_ADDRESS[toToken];
    
    if (!inputMint || !outputMint) {
      throw new Error('Invalid token symbols');
    }
    
    // Jupiter API-ს პარამეტრები
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: Math.floor(amount * 1000000), // USDC და მსგავსი ტოკენები იყენებენ 6 ათობითს
      slippageBps: 50, // 0.5% slippage
    });
    
    // ვიყენებთ Jupiter API-ს საუკეთესო კურსის მისაღებად
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
    
    // იმ შემთხვევაში, თუ API არ მუშაობს, დავაბრუნოთ ფასები კეშიდან
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
 * რამდენიმე ვალუტას შორის ტრიანგულარული არბიტრაჟის შესაძლებლობების პოვნა
 * @returns {Promise<Array>} არბიტრაჟის შესაძლებლობები
 */
async function findTriangularArbitrageOpportunities() {
  try {
    const prices = await getAllTokenPrices();
    const opportunities = [];
    
    // მივიღოთ ტოკენების სია
    const tokens = Object.keys(prices);
    
    // საყრდენი ტოკენები, საიდანაც დავიწყებთ არბიტრაჟს
    const baseTokens = BASE_TOKENS.filter(token => tokens.includes(token));
    
    for (const baseToken of baseTokens) {
      // მხოლოდ 10 შემთხვევით ტოკენს შევამოწმებთ თითოეული საყრდენი ტოკენისთვის
      // რათა არ გადავტვირთოთ API
      const randomTokens = tokens
        .filter(t => t !== baseToken && !BASE_TOKENS.includes(t))
        .sort(() => 0.5 - Math.random())
        .slice(0, 10);
      
      for (const tokenB of randomTokens) {
        // ვარჩევთ მესამე ტოკენს
        for (const tokenC of randomTokens) {
          // ვამოწმებთ რომ არ იყოს იგივე ტოკენი
          if (tokenB === tokenC) continue;
          
          try {
            // გამოვთვალოთ ყველა მიმართულებით კონვერსიის კურსები
            const rateAB = prices[tokenB].price / prices[baseToken].price; // A → B
            const rateBC = prices[tokenC].price / prices[tokenB].price;   // B → C
            const rateCA = prices[baseToken].price / prices[tokenC].price; // C → A
            
            // გამოვთვალოთ ტრიანგულარული არბიტრაჟის ფაქტორი
            // თუ ეს ფაქტორი > 1, მაშინ არსებობს არბიტრაჟის შესაძლებლობა
            const triangularFactor = (1 / (rateAB * rateBC * rateCA));
            
            // გავითვალისწინოთ საკომისიოები - 0.3% თითო გაცვლაზე
            const feePerTrade = 0.003; // 0.3% per trade
            const feeFactor = Math.pow(1 - feePerTrade, 3); // 3 trades
            
            // მოგების პროცენტი საკომისიოების გათვალისწინებით
            const profitPercent = (triangularFactor * feeFactor - 1) * 100;
            
            // თუ მოგების პროცენტი დადებითია, ე.ი. არსებობს არბიტრაჟის შესაძლებლობა
            if (profitPercent > 0.5) {
              opportunities.push({
                type: 'triangular',
                baseToken: baseToken,
                route: [
                  { from: baseToken, to: tokenB, rate: rateAB, dex: 'Jupiter' },
                  { from: tokenB, to: tokenC, rate: rateBC, dex: 'Jupiter' },
                  { from: tokenC, to: baseToken, rate: 1/rateCA, dex: 'Jupiter' }
                ],
                triangularFactor: triangularFactor,
                feeFactor: feeFactor,
                profitPercent: profitPercent.toFixed(3),
                // სავარაუდო მოგება 100 საწყისი ტოკენისთვის
                estimatedProfit: ((triangularFactor * feeFactor - 1) * 100).toFixed(4),
                timestamp: Date.now()
              });
            }
          } catch (error) {
            console.warn(`Error calculating triangular arbitrage for ${baseToken}-${tokenB}-${tokenC}:`, error);
            continue;
          }
        }
      }
    }
    
    // დავალაგოთ არბიტრაჟის შესაძლებლობები მოგების მიხედვით
    return opportunities.sort((a, b) => parseFloat(b.profitPercent) - parseFloat(a.profitPercent));
  } catch (error) {
    console.error('Error finding triangular arbitrage opportunities:', error);
    return [];
  }
}

/**
 * არბიტრაჟის შესაძლებლობების პოვნა სხვადასხვა DEX-ებს შორის
 * @returns {Promise<Array>} არბიტრაჟის შესაძლებლობები
 */
async function findDexArbitrageOpportunities() {
  // იმპლემენტაცია იქნება მომავალში...
  return [];
}

// ექსპორტი
window.jupiterAPI = {
  getAllTokenPrices,
  getExchangeRate,
  findTriangularArbitrageOpportunities,
  findDexArbitrageOpportunities,
  TOKEN_ADDRESSES,
  SYMBOL_TO_ADDRESS,
  BASE_TOKENS
};
