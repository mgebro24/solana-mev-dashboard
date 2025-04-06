/**
 * Services Module for Solana MEV Dashboard
 * მსახურებების მოდული Solana MEV Dashboard-ისთვის, რომელიც უზრუნველყოფს API ინტეგრაციებს,
 * WebSocket კონექშენებს და Solana საფულის ინტეგრაციებს
 */

// API endpoints
const API_ENDPOINTS = {
  SOLANA_PRICES: 'https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum,usd-coin,tether,jupiter,raydium&vs_currencies=usd&include_24hr_change=true',
  SOLANA_MARKETS: 'https://api.mainnet-beta.solana.com',
  DEX_POOL_INFO: 'https://api.raydium.io/v2/main/pool',
  JUPITER_QUOTE: 'https://quote-api.jup.ag/v6/quote',
};

// WebSocket connections
let priceSocket = null;
let transactionSocket = null;
let networkSocket = null;

// Cache settings
const CACHE_TTL = {
  PRICES: 30 * 1000, // 30 seconds
  MARKETS: 5 * 60 * 1000, // 5 minutes
  POOLS: 10 * 60 * 1000, // 10 minutes
  QUOTES: 15 * 1000, // 15 seconds
};

// Cache storage
const dataCache = {
  prices: { data: null, timestamp: 0 },
  markets: { data: null, timestamp: 0 },
  pools: { data: null, timestamp: 0 },
  quotes: new Map(), // Map of tokenPair -> {data, timestamp}
};

// Utility for checking if cache is still valid
function isCacheValid(cacheEntry, ttl) {
  return cacheEntry.data !== null && (Date.now() - cacheEntry.timestamp) < ttl;
}

// მთავარი სერვისების ობიექტი
const services = {
  // Solana საფულის ინტეგრაციები
  wallet: {
    // მიმდინარე კონფიგურაცია
    config: {
      connected: false,
      address: null,        // Solana საფულის მისამართი
      balance: 0,           // SOL ბალანსი
      network: 'mainnet-beta', // Solana ქსელი (mainnet-beta, testnet, devnet)
      provider: null,       // Phantom საფულის პროვაიდერი
      type: null            // 'phantom', 'solflare'
    },
    
    // Solana საფულის პროვაიდერები
    providers: {
      phantom: null,
      solflare: null
    },
    
    // Phantom საფულის ინიციალიზაცია
    async initPhantom() {
      console.log('Initializing Phantom wallet service...');
      
      // შევამოწმოთ არის თუ არა Phantom საფულე ხელმისაწვდომი
      if (window.solana && window.solana.isPhantom) {
        try {
          this.providers.phantom = window.solana;
          
          // მოვუსმინოთ მდგომარეობის ცვლილებას
          window.solana.on('connect', () => {
            console.log('Phantom wallet connected:', window.solana.publicKey.toString());
            this.config.address = window.solana.publicKey.toString();
            this.config.connected = true;
            this.config.type = 'phantom';
            this.updateSolanaBalance();
              
            // დავაინფორმოთ აპლიკაცია საფულის მდგომარეობის ცვლილების შესახებ
            const event = new CustomEvent('wallet-status-changed', { 
              detail: { 
                connected: true, 
                address: this.config.address,
                type: 'phantom'
              } 
            });
            window.dispatchEvent(event);
          });
          
          // მოვუსმინოთ გამოერთებას
          window.solana.on('disconnect', () => {
            console.log('Phantom wallet disconnected');
            this.disconnectPhantom(false); // არ დავუძახოთ disconnect ბრძანებას კვლავ რათა თავიდან ავიცილოთ უსასრულო ციკლი
          });
          
          // მოვუსმინოთ ანგარიშის ცვლილებას
          window.solana.on('accountChanged', (publicKey) => {
            if (publicKey) {
              console.log('Phantom account changed:', publicKey.toString());
              this.config.address = publicKey.toString();
              this.updateSolanaBalance();
              
              const event = new CustomEvent('wallet-status-changed', { 
                detail: { 
                  connected: true, 
                  address: this.config.address,
                  type: 'phantom'
                } 
              });
              window.dispatchEvent(event);
            } else {
              this.disconnectPhantom();
            }
          });
          
          console.log('Phantom wallet initialized successfully');
          return true;
        } catch (error) {
          console.error('Error initializing Phantom wallet:', error);
          return false;
        }
      } else {
        console.warn('Phantom wallet not found. Install from https://phantom.app/');
        return false;
      }
    },
    
    // Phantom საფულის დაკავშირება
    async connectPhantom() {
      console.log('Connecting to Phantom wallet...');
      
      if (!this.providers.phantom) {
        const initialized = await this.initPhantom();
        if (!initialized) {
          console.error('Could not initialize Phantom wallet');
          return { success: false, error: 'Could not initialize Phantom wallet. Is it installed?' };
        }
      }
      
      try {
        // მოვითხოვოთ ანგარიშის დაკავშირება
        await this.providers.phantom.connect();
        
        if (this.providers.phantom.publicKey) {
          const publicKey = this.providers.phantom.publicKey.toString();
          
          this.config.type = 'phantom';
          this.config.address = publicKey;
          this.config.connected = true;
          this.config.provider = this.providers.phantom;
          this.config.network = this.providers.phantom.networkVersion || 'mainnet-beta';
          
          // მივიღოთ SOL ბალანსი
          await this.updateSolanaBalance();
          
          console.log('Connected to Phantom wallet:', this.config);
          
          // დავაინფორმოთ აპლიკაცია წარმატებული დაკავშირების შესახებ
          const event = new CustomEvent('wallet-connected', { 
            detail: { 
              address: publicKey,
              balance: this.config.balance,
              network: this.config.network,
              type: 'phantom'
            } 
          });
          window.dispatchEvent(event);
          
          return { 
            success: true, 
            address: publicKey,
            balance: this.config.balance,
            network: this.config.network
          };
        } else {
          return { success: false, error: 'No Solana account found' };
        }
      } catch (error) {
        console.error('Error connecting to Phantom wallet:', error);
        return { success: false, error: error.message };
      }
    },
    
    // Phantom საფულის გამოერთება
    async disconnectPhantom(triggerDisconnect = true) {
      console.log('Disconnecting from Phantom wallet...');
      
      if (triggerDisconnect && this.providers.phantom && this.config.connected) {
        try {
          await this.providers.phantom.disconnect();
        } catch (error) {
          console.error('Error during Phantom disconnect:', error);
        }
      }
      
      // განვაახლოთ მდგომარეობა
      this.config.connected = false;
      this.config.address = null;
      this.config.balance = 0;
      this.config.provider = null;
      this.config.type = null;
      
      // დავაინფორმოთ აპლიკაცია საფულის გამოერთების შესახებ
      const event = new CustomEvent('wallet-disconnected', { detail: { type: 'phantom' } });
      window.dispatchEvent(event);
      
      return { success: true };
    },
    
    // Solana ბალანსის განახლება
    async updateSolanaBalance() {
      if (!this.config.connected || !this.config.address) {
        return { success: false, error: 'Wallet not connected' };
      }
      
      try {
        // ნამდვილი იმპლემენტაციისთვის გამოვიყენებთ Solana Web3.js ბიბლიოთეკას
        // ამ დემოსთვის კი გამოვიყენებთ სიმულაციას
        
        // სიმულირებული ბალანსი დემოსთვის
        const simulatedBalance = Math.random() * 20 + 0.5; // 0.5-20.5 SOL
        this.config.balance = parseFloat(simulatedBalance.toFixed(4));
        
        // ნამდვილი იმპლემენტაცია იქნებოდა მსგავსი:
        /*
        // @solana/web3.js უნდა იყოს დამატებული პროექტში
        const connection = new solanaWeb3.Connection(
          solanaWeb3.clusterApiUrl(this.config.network),
          'confirmed'
        );
        const publicKey = new solanaWeb3.PublicKey(this.config.address);
        const balance = await connection.getBalance(publicKey);
        
        // ლამპორტებიდან SOL-ში გადაყვანა (1 SOL = 1e9 ლამპორტი)
        this.config.balance = balance / 1e9;
        */
        
        return { success: true, balance: this.config.balance };
      } catch (error) {
        console.error('Error getting Solana balance:', error);
        return { success: false, error: error.message };
      }
    },
    
    // Solana ქსელის შემოწმება
    getSolanaNetwork() {
      const networks = {
        'mainnet-beta': 'Solana Mainnet',
        'testnet': 'Solana Testnet',
        'devnet': 'Solana Devnet',
        'localnet': 'Solana Localnet'
      };
      
      return networks[this.config.network] || 'Unknown Solana Network';
    },
    
    // საფულის მდგომარეობის მიღება
    getWalletState() {
      return this.config;
    },
    
    // შევამოწმოთ არის თუ არა საფულე დაკავშირებული
    isConnected() {
      return this.config.connected;
    },
    
    // მოკლე დახმარება Phantom საფულის დასაინსტალირებლად
    openPhantomInstallHelp() {
      window.open('https://phantom.app/', '_blank');
    },
    
    // ტრანზაქციის ხელმოწერა და გაგზავნა
    async signAndSendTransaction(transaction) {
      if (!this.config.connected || !this.config.provider) {
        return { success: false, error: 'Wallet not connected' };
      }
      
      try {
        // დემო რეჟიმში - ტრანზაქციის სიმულაცია
        const simulatedSignature = 'sim_' + Math.random().toString(36).substring(2, 15);
        console.log('Simulating transaction signature:', simulatedSignature);
        
        // რეალური იმპლემენტაცია იქნებოდა:
        /*
        const { signature } = await this.config.provider.signAndSendTransaction(transaction);
        await connection.confirmTransaction(signature);
        */
        
        return {
          success: true,
          signature: simulatedSignature
        };
      } catch (error) {
        console.error('Error signing transaction:', error);
        return { success: false, error: error.message };
      }
    }
  },
  
  // API ინტეგრაციები
  api: {
    // Fetch with timeout and retry logic
    async fetchWithRetry(url, options = {}, retries = 3, timeout = 5000) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      options.signal = controller.signal;
      
      try {
        const response = await fetch(url, options);
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status} - ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          console.warn(`Request timeout for ${url}`);
        }
        
        if (retries > 0) {
          console.log(`Retrying request to ${url}, ${retries} retries left`);
          return this.fetchWithRetry(url, options, retries - 1, timeout);
        }
        
        throw error;
      }
    },
    
    // Get token prices from CoinGecko or cache
    async getTokenPrices() {
      try {
        if (isCacheValid(dataCache.prices, CACHE_TTL.PRICES)) {
          return dataCache.prices.data;
        }
        
        const response = await this.fetchWithRetry(API_ENDPOINTS.SOLANA_PRICES);
        
        // Format data for our application
        const formattedData = {
          SOL: {
            price: response.solana.usd,
            change24h: response.solana.usd_24h_change,
            history: []
          },
          BTC: {
            price: response.bitcoin.usd,
            change24h: response.bitcoin.usd_24h_change,
            history: []
          },
          ETH: {
            price: response.ethereum.usd,
            change24h: response.ethereum.usd_24h_change,
            history: []
          },
          USDC: {
            price: response['usd-coin'].usd,
            change24h: response['usd-coin'].usd_24h_change,
            history: []
          },
          USDT: {
            price: response.tether.usd,
            change24h: response.tether.usd_24h_change,
            history: []
          },
          JUP: {
            price: response.jupiter.usd,
            change24h: response.jupiter.usd_24h_change,
            history: []
          },
          RAY: {
            price: response.raydium.usd,
            change24h: response.raydium.usd_24h_change,
            history: []
          }
        };
        
        // Update price history for each token
        Object.keys(formattedData).forEach(token => {
          if (dataCache.prices.data && dataCache.prices.data[token]) {
            formattedData[token].history = [
              ...dataCache.prices.data[token].history || [],
              formattedData[token].price
            ].slice(-48); // Keep last 48 data points (24 hours if updating every 30 min)
          } else {
            // Initialize with current price repeated
            formattedData[token].history = Array(10).fill(formattedData[token].price);
          }
        });
        
        // Update cache
        dataCache.prices = {
          data: formattedData,
          timestamp: Date.now()
        };
        
        return formattedData;
      } catch (error) {
        console.error('Error fetching token prices:', error);
        
        // Return cached data if available, empty object otherwise
        return dataCache.prices.data || {};
      }
    },
    
    // Get liquidity pool information from Raydium
    async getLiquidityPools(forceRefresh = false) {
      try {
        if (!forceRefresh && isCacheValid(dataCache.pools, CACHE_TTL.POOLS)) {
          return dataCache.pools.data;
        }
        
        const response = await this.fetchWithRetry(API_ENDPOINTS.DEX_POOL_INFO);
        
        // Filter and format pool data
        const relevantPools = response.official
          .filter(pool => {
            // Filter for pools with tokens we're interested in
            const baseMint = pool.baseMint.toLowerCase();
            const quoteMint = pool.quoteMint.toLowerCase();
            
            // SOL, BTC, ETH, USDC, USDT, JUP, RAY
            const relevantTokens = [
              'So11111111111111111111111111111111111111112', // SOL
              'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
              'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
              '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E', // BTC (wrapped)
              '2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk', // ETH (wrapped)
              'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // JUP
              '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' // RAY
            ];
            
            return relevantTokens.includes(baseMint) || relevantTokens.includes(quoteMint);
          })
          .map(pool => ({
            id: pool.id,
            name: pool.name,
            baseMint: pool.baseMint,
            quoteMint: pool.quoteMint,
            baseSymbol: pool.baseSymbol,
            quoteSymbol: pool.quoteSymbol,
            liquidity: {
              base: parseFloat(pool.liquidity.base),
              quote: parseFloat(pool.liquidity.quote),
              usd: parseFloat(pool.liquidity.usd)
            },
            volume24h: parseFloat(pool.volume24h),
            fee: parseFloat(pool.fee)
          }));
        
        // Update cache
        dataCache.pools = {
          data: relevantPools,
          timestamp: Date.now()
        };
        
        return relevantPools;
      } catch (error) {
        console.error('Error fetching liquidity pools:', error);
        
        // Return cached data if available
        return dataCache.pools.data || [];
      }
    },
    
    // Get Jupiter DEX aggregator quote for token swap
    async getSwapQuote(inputToken, outputToken, amount, slippage = 0.5) {
      try {
        const cacheKey = `${inputToken}-${outputToken}-${amount}`;
        const cachedQuote = dataCache.quotes.get(cacheKey);
        
        if (cachedQuote && (Date.now() - cachedQuote.timestamp) < CACHE_TTL.QUOTES) {
          return cachedQuote.data;
        }
        
        // Map token symbols to addresses
        const tokenAddresses = {
          SOL: 'So11111111111111111111111111111111111111112',
          USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
          BTC: '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E',
          ETH: '2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk',
          JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
          RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'
        };
        
        // Ensure tokens are valid
        if (!tokenAddresses[inputToken] || !tokenAddresses[outputToken]) {
          throw new Error('Invalid token symbols');
        }
        
        // Convert amount to proper format (lamports for SOL, etc.)
        const inputDecimals = inputToken === 'SOL' ? 9 : 
                             (inputToken === 'USDC' || inputToken === 'USDT') ? 6 : 8;
        const amountInSmallestUnit = Math.floor(amount * Math.pow(10, inputDecimals));
        
        const queryParams = new URLSearchParams({
          inputMint: tokenAddresses[inputToken],
          outputMint: tokenAddresses[outputToken],
          amount: amountInSmallestUnit.toString(),
          slippageBps: Math.floor(slippage * 100)
        });
        
        const url = `${API_ENDPOINTS.JUPITER_QUOTE}?${queryParams.toString()}`;
        const response = await this.fetchWithRetry(url);
        
        // Format the response
        const formattedQuote = {
          inputToken,
          outputToken,
          inputAmount: amount,
          outputAmount: response.outAmount / Math.pow(10, response.outputDecimals),
          price: response.outAmount / amountInSmallestUnit,
          priceImpact: response.priceImpactPct,
          routeCount: response.routesCount,
          bestRoute: response.routePlan.map(step => ({
            swapInfo: {
              amountIn: step.swapInfo.inAmount,
              amountOut: step.swapInfo.outAmount,
              fee: step.swapInfo.fee
            },
            percent: step.percent,
            dex: step.swapInfo.label || 'Unknown'
          }))
        };
        
        // Update cache
        dataCache.quotes.set(cacheKey, {
          data: formattedQuote,
          timestamp: Date.now()
        });
        
        // Clean up old cache entries every 100 requests
        if (Math.random() < 0.01) {
          this.cleanupQuoteCache();
        }
        
        return formattedQuote;
      } catch (error) {
        console.error('Error fetching swap quote:', error);
        
        // Return cached data if available
        const cacheKey = `${inputToken}-${outputToken}-${amount}`;
        const cachedQuote = dataCache.quotes.get(cacheKey);
        return cachedQuote ? cachedQuote.data : null;
      }
    },
    
    // Clean up old quote cache entries
    cleanupQuoteCache() {
      const now = Date.now();
      
      for (const [key, value] of dataCache.quotes.entries()) {
        if (now - value.timestamp > CACHE_TTL.QUOTES) {
          dataCache.quotes.delete(key);
        }
      }
    }
  },
  
  // WebSocket Service
  sockets: {
    // Initialize price WebSocket connection
    initPriceSocket() {
      if (priceSocket) {
        this.closePriceSocket();
      }
      
      try {
        // Use a simulated WebSocket for demo purposes
        // In production, use a real crypto price WebSocket API
        if (!window.WebSocket) {
          console.error('WebSocket not supported by your browser');
          return;
        }
        
        console.log('Initializing price WebSocket...');
        
        // Simulate WebSocket with setInterval
        this.simulatedPriceSocket = setInterval(() => {
          if (!dataCache.prices.data) return;
          
          const tokens = Object.keys(dataCache.prices.data);
          
          // Generate a random price update for demonstration
          const randomToken = tokens[Math.floor(Math.random() * tokens.length)];
          const currentPrice = dataCache.prices.data[randomToken].price;
          const randomChange = (Math.random() * 0.01 - 0.005) * currentPrice; // -0.5% to +0.5%
          
          const update = {
            token: randomToken,
            price: currentPrice + randomChange,
            timestamp: Date.now()
          };
          
          // Update the cache
          if (dataCache.prices.data[randomToken]) {
            dataCache.prices.data[randomToken].price = update.price;
            dataCache.prices.data[randomToken].history.push(update.price);
            
            if (dataCache.prices.data[randomToken].history.length > 48) {
              dataCache.prices.data[randomToken].history.shift();
            }
          }
          
          // Dispatch custom event for price update
          const event = new CustomEvent('price-update', { detail: update });
          window.dispatchEvent(event);
        }, 3000);
        
        return true;
      } catch (error) {
        console.error('Error initializing price WebSocket:', error);
        return false;
      }
    },
    
    // Close price WebSocket connection
    closePriceSocket() {
      if (this.simulatedPriceSocket) {
        clearInterval(this.simulatedPriceSocket);
        this.simulatedPriceSocket = null;
      }
      
      if (priceSocket && priceSocket.readyState === WebSocket.OPEN) {
        priceSocket.close();
        priceSocket = null;
      }
    },
    
    // Initialize transaction WebSocket connection
    initTransactionSocket() {
      if (transactionSocket) {
        this.closeTransactionSocket();
      }
      
      try {
        console.log('Initializing transaction WebSocket...');
        
        // Simulate transaction WebSocket
        this.simulatedTransactionSocket = setInterval(() => {
          // Generate random transaction
          const tokens = ['SOL', 'BTC', 'ETH', 'USDC', 'USDT', 'JUP', 'RAY'];
          const dexes = ['Jupiter', 'Raydium', 'Orca', 'OpenBook'];
          
          const fromToken = tokens[Math.floor(Math.random() * tokens.length)];
          let toToken;
          do {
            toToken = tokens[Math.floor(Math.random() * tokens.length)];
          } while (toToken === fromToken);
          
          const amount = (Math.random() * 20 + 0.5).toFixed(2);
          const dex = dexes[Math.floor(Math.random() * dexes.length)];
          const success = Math.random() > 0.1; // 90% success rate
          
          const transaction = {
            id: 'tx_' + Math.random().toString(36).substring(2, 10),
            timestamp: Date.now(),
            fromToken,
            toToken,
            amount: parseFloat(amount),
            dex,
            status: success ? 'completed' : 'failed',
            profit: success ? (Math.random() * amount * 0.03).toFixed(3) : '0',
            gasUsed: (Math.random() * 0.0001).toFixed(6)
          };
          
          // Dispatch custom event for transaction update
          const event = new CustomEvent('transaction-update', { detail: transaction });
          window.dispatchEvent(event);
        }, 45000); // New transaction every 45 seconds
        
        return true;
      } catch (error) {
        console.error('Error initializing transaction WebSocket:', error);
        return false;
      }
    },
    
    // Close transaction WebSocket connection
    closeTransactionSocket() {
      if (this.simulatedTransactionSocket) {
        clearInterval(this.simulatedTransactionSocket);
        this.simulatedTransactionSocket = null;
        console.log('Initializing network WebSocket for arbitrage opportunities...');
        
        // Simulate network WebSocket for arbitrage opportunities
        this.simulatedNetworkSocket = setInterval(() => {
          // Generate random arbitrage opportunity
          const tokens = ['SOL', 'BTC', 'ETH', 'USDC', 'USDT', 'JUP', 'RAY'];
          const dexes = ['Jupiter', 'Raydium', 'Orca', 'OpenBook'];
          
          const baseToken = tokens[Math.floor(Math.random() * tokens.length)];
          let quoteToken;
          do {
            quoteToken = tokens[Math.floor(Math.random() * tokens.length)];
          } while (quoteToken === baseToken);
          
          const sourceDex = dexes[Math.floor(Math.random() * dexes.length)];
          let targetDex;
          do {
            targetDex = dexes[Math.floor(Math.random() * dexes.length)];
          } while (targetDex === sourceDex);
          
          // Generate profit percentage (0.1% to 2.5%)
          const profitPercent = (Math.random() * 2.4 + 0.1).toFixed(2);
          
          const arbitrage = {
            id: 'arb_' + Math.random().toString(36).substring(2, 10),
            timestamp: Date.now(),
            baseToken,
            quoteToken,
            sourceDex,
            targetDex,
            profitPercent: parseFloat(profitPercent),
            estimatedProfit: (Math.random() * 0.5).toFixed(3),
            confidence: Math.random() * 100 // 0-100%
          };
          
          // Dispatch custom event for arbitrage opportunity
          const event = new CustomEvent('arbitrage-opportunity', { detail: arbitrage });
          window.dispatchEvent(event);
          
          // 20% chance to generate a triangular arbitrage opportunity
          if (Math.random() < 0.2) {
            let intermediateToken;
            do {
              intermediateToken = tokens[Math.floor(Math.random() * tokens.length)];
            } while (intermediateToken === baseToken || intermediateToken === quoteToken);
            
            const triangularArbitrage = {
              id: 'tri_' + Math.random().toString(36).substring(2, 10),
              timestamp: Date.now(),
              type: 'triangular',
              path: [baseToken, intermediateToken, quoteToken, baseToken],
              exchanges: [
                dexes[Math.floor(Math.random() * dexes.length)],
                dexes[Math.floor(Math.random() * dexes.length)],
                dexes[Math.floor(Math.random() * dexes.length)]
              ],
              profitPercent: (Math.random() * 3.4 + 0.3).toFixed(2),
              estimatedProfit: (Math.random() * 0.7).toFixed(3),
              complexity: 'medium',
              executionTime: Math.floor(Math.random() * 500 + 500) // 500-1000ms
            };
            
            // Dispatch custom event for triangular arbitrage opportunity
            const triangularEvent = new CustomEvent('triangular-arbitrage', { detail: triangularArbitrage });
            window.dispatchEvent(triangularEvent);
          }
        }, 25000); // New arbitrage opportunity every 25 seconds
        
        return true;
      } catch (error) {
        console.error('Error initializing network WebSocket:', error);
        return false;
      }
    },
    
    // Close network WebSocket connection
    closeNetworkSocket() {
      try {
        if (this.simulatedNetworkSocket) {
          clearInterval(this.simulatedNetworkSocket);
          this.simulatedNetworkSocket = null;
        }
        
        if (networkSocket && networkSocket.readyState === WebSocket.OPEN) {
          networkSocket.close();
          networkSocket = null;
        }
        
        return true;
      } catch (error) {
        console.error('Error closing network socket:', error);
        return false;
      }
    }
  },
  
  // Starts the interval for generating and updating arbitrage opportunities
  startArbitrageUpdates(intervalMs = 5000) {
    try {
      // Clear existing interval if any
      if (this.arbitrageUpdateInterval) {
        clearInterval(this.arbitrageUpdateInterval);
      }
      
      // Set up new interval for updating arbitrage opportunities
      this.arbitrageUpdateInterval = setInterval(() => {
        try {
          // Generate new sample data (temporary for testing)
          const opportunities = {
            simple: this.generateSampleSimpleArbitrageOpportunities(),
            triangular: this.generateSampleTriangularArbitrageOpportunities(),
            complex: this.generateSampleComplexArbitrageOpportunities()
          };
          
          // Dispatch event with all opportunities
          const event = new CustomEvent('arbitrage-opportunities', {
            detail: opportunities
          });
          
          window.dispatchEvent(event);
          console.log('Dispatched arbitrage opportunities event', opportunities);
          
          // Update last update timestamp
          this.lastArbitrageUpdate = Date.now();
          
          // Update UI element if exists
          const lastUpdateElement = document.getElementById('broker-last-update');
          if (lastUpdateElement) {
            lastUpdateElement.textContent = 'ახლახანს';
          }
        } catch (err) {
          console.error('Error updating arbitrage opportunities:', err);
        }
      }, intervalMs);
      
      console.log(`Started arbitrage updates with interval: ${intervalMs}ms`);
      return true;
    } catch (error) {
      console.error('Error starting arbitrage updates:', error);
      return false;
    }
  },
  
  // Stop arbitrage updates
  stopArbitrageUpdates() {
    try {
      if (this.arbitrageUpdateInterval) {
        clearInterval(this.arbitrageUpdateInterval);
        this.arbitrageUpdateInterval = null;
        console.log('Stopped arbitrage updates');
      }
      return true;
    } catch (error) {
      console.error('Error stopping arbitrage updates:', error);
      return false;
    }
  },
  
  // Generate sample complex arbitrage opportunities for testing
  generateSampleComplexArbitrageOpportunities() {
    try {
      const tokens = Object.keys(this.tokens);
      const opportunities = [];
      
      // Generate 1-3 complex opportunities
      const count = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < count; i++) {
        // Create a random path of 4-6 tokens
        const pathLength = Math.floor(Math.random() * 3) + 4; // 4-6 tokens
        const tokenPath = [];
        
        // Ensure we don't have duplicates in sequence
        while (tokenPath.length < pathLength) {
          const randomToken = tokens[Math.floor(Math.random() * tokens.length)];
          if (tokenPath.length === 0 || tokenPath[tokenPath.length - 1] !== randomToken) {
            tokenPath.push(randomToken);
          }
        }
        
        // Ensure the path is circular
        if (tokenPath[0] !== tokenPath[tokenPath.length - 1]) {
          tokenPath.push(tokenPath[0]);
        }
        
        // Select random exchanges for each step
        const exchanges = [];
        const allExchanges = ['Jupiter', 'Raydium', 'Orca', 'Serum', 'Saber'];
        
        for (let j = 0; j < tokenPath.length - 1; j++) {
          const randomExchange = allExchanges[Math.floor(Math.random() * allExchanges.length)];
          exchanges.push(randomExchange);
        }
        
        // Calculate a random profit percentage (0.1% to 2.5%)
        const profitPercent = (Math.random() * 2.4 + 0.1).toFixed(2);
        
        // Determine risk level based on profit
        let riskLevel;
        if (profitPercent < 0.5) {
          riskLevel = 'low';
        } else if (profitPercent < 1.5) {
          riskLevel = 'medium';
        } else {
          riskLevel = 'high';
        }
        
        // Create the opportunity object
        opportunities.push({
          id: `complex_${Date.now()}_${i}`,
          type: 'complex',
          tokenPath,
          exchanges,
          profitPercent,
          riskLevel,
          estimatedGas: (Math.random() * 0.001 + 0.002).toFixed(6),
          minAmount: (Math.random() * 10 + 1).toFixed(2),
          complexity: 'high',
          executionTime: Math.floor(Math.random() * 1000 + 1000) // 1000-2000ms
        });
      }
      
      return opportunities;
    } catch (error) {
      console.error('Error generating sample complex arbitrage opportunities:', error);
      return [];
    }
  },
  
  // Calculate arbitrage opportunities
  calculateArbitrageOpportunities() {
    try {
      // Generate some sample arbitrage opportunities for testing
      const sampleOpportunities = {
        simple: this.generateSampleSimpleArbitrage(),
        triangular: this.generateSampleTriangularArbitrage(),
        complex: this.generateSampleComplexArbitrage(),
        timestamp: Date.now()
      };
      
      // Dispatch event with all arbitrage opportunities
      const event = new CustomEvent('arbitrage-opportunities', {
        detail: sampleOpportunities
      });
      
      window.dispatchEvent(event);
      
      return sampleOpportunities;
    } catch (error) {
      console.error('Error calculating arbitrage opportunities:', error);
      return {
        simple: [],
        triangular: [],
        complex: [],
        timestamp: Date.now(),
        error: error.message
      };
    }
  },
  
  // Generate sample simple arbitrage opportunities
  generateSampleSimpleArbitrage() {
    const opportunities = [];
    const tokens = ['SOL', 'USDC', 'ETH', 'BTC', 'USDT', 'RAY', 'MSOL'];
    const dexes = ['Jupiter', 'Raydium', 'Orca', 'Openbook'];
    
    // Generate 2-3 opportunities
    for (let i = 0; i < Math.floor(Math.random() * 2) + 2; i++) {
      const tokenIn = tokens[Math.floor(Math.random() * tokens.length)];
      const tokenOut = tokens[Math.floor(Math.random() * tokens.length)];
      
      if (tokenIn === tokenOut) continue;
      
      const dexBuy = dexes[Math.floor(Math.random() * dexes.length)];
      let dexSell;
      do {
        dexSell = dexes[Math.floor(Math.random() * dexes.length)];
      } while (dexSell === dexBuy);
      
      const priceBuy = parseFloat((Math.random() * 10 + 90).toFixed(2)); // 90-100
      const priceSell = parseFloat((priceBuy * (1 + (Math.random() * 0.05 + 0.01))).toFixed(2)); // 1-6% higher
      
      const profitPercent = ((priceSell / priceBuy) - 1) * 100;
      
      opportunities.push({
        type: 'simple',
        tokenIn,
        tokenOut,
        dexBuy,
        dexSell,
        priceBuy,
        priceSell,
        profitPercent: profitPercent.toFixed(2),
        estimatedProfit: ((priceSell - priceBuy) * 0.1).toFixed(4), // 0.1 token
        timestamp: Date.now()
      });
    }
    
    return opportunities;
  },
  
  // Generate sample triangular arbitrage opportunities
  generateSampleTriangularArbitrage() {
    const opportunities = [];
    const tokens = ['SOL', 'USDC', 'ETH', 'BTC', 'USDT', 'RAY', 'MSOL'];
    const dexes = ['Jupiter', 'Raydium', 'Orca', 'Openbook'];
    
    // Generate 1-2 opportunities
    for (let i = 0; i < Math.floor(Math.random() * 2) + 1; i++) {
      // Select three different tokens
      const tokenIndices = [];
      while (tokenIndices.length < 3) {
        const index = Math.floor(Math.random() * tokens.length);
        if (!tokenIndices.includes(index)) {
          tokenIndices.push(index);
        }
      }
      
      const tokenA = tokens[tokenIndices[0]];
      const tokenB = tokens[tokenIndices[1]];
      const tokenC = tokens[tokenIndices[2]];
      
      // Random rates with a small arbitrage opportunity
      const rateAB = parseFloat((1 + Math.random() * 0.5).toFixed(4));
      const rateBC = parseFloat((1 + Math.random() * 0.5).toFixed(4));
      const rateCA = parseFloat((1 / (rateAB * rateBC) * (1 + (Math.random() * 0.05 + 0.01))).toFixed(4));
      
      const profitPercent = ((rateAB * rateBC * rateCA) - 1) * 100;
      
      opportunities.push({
        type: 'triangular',
        route: [
          { from: tokenA, to: tokenB, rate: rateAB, dex: dexes[Math.floor(Math.random() * dexes.length)] },
          { from: tokenB, to: tokenC, rate: rateBC, dex: dexes[Math.floor(Math.random() * dexes.length)] },
          { from: tokenC, to: tokenA, rate: rateCA, dex: dexes[Math.floor(Math.random() * dexes.length)] }
        ],
        profitPercent: profitPercent.toFixed(2),
        estimatedProfit: ((profitPercent / 100) * parseFloat((Math.random() * 5 + 5).toFixed(2))).toFixed(4), // $5-10 profit
        timestamp: Date.now()
      });
    }
    
    return opportunities;
  },
  
  // Generate sample complex arbitrage opportunities
  generateSampleComplexArbitrage() {
    const opportunities = [];
    const tokens = ['SOL', 'USDC', 'ETH', 'BTC', 'USDT', 'RAY', 'MSOL', 'BONK', 'ORCA'];
    const dexes = ['Jupiter', 'Raydium', 'Orca', 'Openbook'];
    
    // Just one complex opportunity
    if (Math.random() > 0.3) { // 70% chance to get a complex opp
      const path = [];
      const usedTokens = new Set();
      const pathLength = Math.floor(Math.random() * 2) + 4; // 4-5 steps
      
      let currentToken = tokens[Math.floor(Math.random() * tokens.length)];
      usedTokens.add(currentToken);
      
      for (let j = 0; j < pathLength; j++) {
        let nextToken;
        do {
          nextToken = tokens[Math.floor(Math.random() * tokens.length)];
        } while (usedTokens.has(nextToken) && usedTokens.size < tokens.length);
        
        usedTokens.add(nextToken);
        
        path.push({
          from: currentToken,
          to: nextToken,
          dex: dexes[Math.floor(Math.random() * dexes.length)],
          rate: parseFloat((1 + Math.random() * 0.2).toFixed(4))
        });
        
        currentToken = nextToken;
      }
      
      // Close the loop
      path.push({
        from: currentToken,
        to: path[0].from,
        dex: dexes[Math.floor(Math.random() * dexes.length)],
        rate: parseFloat((1 + Math.random() * 0.1).toFixed(4))
      });
      
      // Calculate compound profit
      let profitFactor = 1;
      path.forEach(step => {
        profitFactor *= step.rate;
      });
      
      const profitPercent = (profitFactor - 1) * 100;
      
      opportunities.push({
        type: 'complex',
        path: path,
        profitPercent: profitPercent.toFixed(2),
        estimatedProfit: ((profitPercent / 100) * parseFloat((Math.random() * this.generateRandomInt(10, 20)).toFixed(2))).toFixed(4),
        complexity: path.length > 5 ? 'high' : 'medium',
        timestamp: Date.now()
      });
    }
    
    return opportunities;
  },
  
  // Helper to generate random integer
  generateRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
};

// Wallet service for connecting to Phantom, Solflare, etc.
const walletService = {
  // Connected wallet details
  wallet: {
    connected: false,
    address: null,
    balance: null,
    provider: null
  },
  
  // Connect to wallet
  async connect(providerName = 'phantom') {
    try {
      let provider;
      
      // Check for provider availability
      switch (providerName.toLowerCase()) {
        case 'phantom':
          provider = window.phantom?.solana;
          if (!provider) {
            window.open('https://phantom.app/', '_blank');
            throw new Error('Phantom wallet not installed. Please install it and try again.');
          }
          break;
          
        case 'solflare':
          provider = window.solflare;
          if (!provider) {
            window.open('https://solflare.com/', '_blank');
            throw new Error('Solflare wallet not installed. Please install it and try again.');
          }
          break;
          
        default:
          throw new Error('Unsupported wallet provider');
      }
      
      // Connect to wallet
      const connection = await provider.connect();
      
      this.wallet.connected = true;
      this.wallet.address = connection.publicKey.toString();
      this.wallet.provider = provider;
      
      // Fetch balance
      await this.refreshBalance();
      
      // Listen for account changes
      provider.on('accountChanged', this.handleAccountChanged);
      
      // Dispatch wallet connection event
      const event = new CustomEvent('wallet-connected', { 
        detail: { 
          address: this.wallet.address,
          balance: this.wallet.balance 
        } 
      });
      window.dispatchEvent(event);
      
      return {
        success: true,
        address: this.wallet.address,
        balance: this.wallet.balance
      };
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // Disconnect from wallet
  disconnect() {
    try {
      if (this.wallet.provider && this.wallet.connected) {
        this.wallet.provider.disconnect();
        
        // Remove event listeners
        if (this.wallet.provider.off) {
          this.wallet.provider.off('accountChanged', this.handleAccountChanged);
        }
      }
      
      // Reset wallet state
      this.wallet = {
        connected: false,
        address: null,
        balance: null,
        provider: null
      };
      
      // Dispatch wallet disconnection event
      const event = new CustomEvent('wallet-disconnected');
      window.dispatchEvent(event);
      
      return { success: true };
    } catch (error) {
      console.error('Error disconnecting from wallet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // Refresh wallet balance
  async refreshBalance() {
    try {
      if (!this.wallet.connected || !this.wallet.provider) {
        throw new Error('Wallet not connected');
      }
      
      // For demo purposes, simulate balance retrieval
      const simulatedBalance = Math.random() * 100 + 20;
      this.wallet.balance = simulatedBalance.toFixed(4);
      
      // In a real implementation, we would use the Solana Web3.js library:
      // const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'));
      // const publicKey = new solanaWeb3.PublicKey(this.wallet.address);
      // const balance = await connection.getBalance(publicKey);
      // this.wallet.balance = balance / solanaWeb3.LAMPORTS_PER_SOL;
      
      return {
        success: true,
        balance: this.wallet.balance
      };
    } catch (error) {
      console.error('Error refreshing wallet balance:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // Handle wallet account changes
  handleAccountChanged(publicKey) {
    if (publicKey) {
      this.wallet.address = publicKey.toString();
      this.refreshBalance();
      
      // Dispatch account changed event
      const event = new CustomEvent('wallet-account-changed', { 
        detail: { 
          address: this.wallet.address 
        } 
      });
      window.dispatchEvent(event);
    } else {
      this.disconnect();
    }
  },
  
  // Sign and send transaction (simulated)
  async signAndSendTransaction(transaction) {
    try {
      if (!this.wallet.connected || !this.wallet.provider) {
        throw new Error('Wallet not connected');
      }
      
      // For demo purposes, simulate transaction processing
      console.log('Signing and sending transaction:', transaction);
      
      // Simulate transaction processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 90% success rate
      const success = Math.random() > 0.1;
      
      if (success) {
        const signature = 'sim_' + Math.random().toString(36).substring(2, 15);
        
        return {
          success: true,
          signature,
          confirmations: 1
        };
      } else {
        throw new Error('Transaction simulation failed');
      }
    } catch (error) {
      console.error('Error signing transaction:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// Export services
window.solanaServices = {
  api: apiService,
  webSocket: webSocketService,
  wallet: walletService
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log('Solana Services initialized');
  
  // Start WebSocket connections after a short delay
  setTimeout(() => {
    webSocketService.initPriceSocket();
    webSocketService.initTransactionSocket();
    webSocketService.initNetworkSocket();
  }, 2000);
});

// სერვისების ინიციალიზაცია
services.initialize = async function() {
  try {
    console.log('Initializing services module...');
    
    // API სერვისების ინიციალიზაცია
    this.api.initialize();
    
    // WebSocket სერვისების ინიციალიზაცია
    this.sockets.initialize();
    
    // Solana საფულის სერვისების ინიციალიზაცია
    if (window.solana && window.solana.isPhantom) {
      this.wallet.initPhantom();
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing services:', error);
    return false;
  }
};
