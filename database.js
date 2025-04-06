/**
 * Database service for Solana MEV Dashboard
 * Uses IndexedDB for persistent local storage
 */

// Database configuration
const DB_CONFIG = {
  name: 'SolanaMEVDashboard',
  version: 1,
  stores: {
    transactions: { keyPath: 'id', indices: ['timestamp', 'status', 'fromToken', 'toToken'] },
    arbitrageOpportunities: { keyPath: 'id', indices: ['timestamp', 'profitPercent', 'baseToken', 'quoteToken'] },
    priceHistory: { keyPath: 'id', indices: ['token', 'timestamp'] },
    settings: { keyPath: 'id' },
    walletHistory: { keyPath: 'id', indices: ['timestamp', 'action'] }
  }
};

// Database service
const databaseService = {
  db: null,
  
  // Initialize the database
  async init() {
    if (this.db) return this.db;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);
      
      // Create object stores on database upgrade
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores for each store defined in DB_CONFIG
        Object.entries(DB_CONFIG.stores).forEach(([storeName, storeConfig]) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: storeConfig.keyPath });
            
            // Create indices for the store
            if (storeConfig.indices) {
              storeConfig.indices.forEach(indexName => {
                store.createIndex(indexName, indexName, { unique: false });
              });
            }
            
            console.log(`Created object store: ${storeName}`);
          }
        });
        
        console.log(`Database upgraded to version ${DB_CONFIG.version}`);
      };
      
      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('Database initialized successfully');
        resolve(this.db);
      };
      
      request.onerror = (event) => {
        console.error('Error initializing database:', event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  // Generic method to add an item to a store
  async add(storeName, item) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Add timestamp if not present
      if (!item.timestamp) {
        item.timestamp = Date.now();
      }
      
      const request = store.add(item);
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = (event) => {
        console.error(`Error adding item to ${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  // Generic method to update an item in a store
  async update(storeName, item) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Update timestamp if updating
      item.lastUpdated = Date.now();
      
      const request = store.put(item);
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = (event) => {
        console.error(`Error updating item in ${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  // Generic method to get an item from a store by ID
  async getById(storeName, id) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = store.get(id);
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = (event) => {
        console.error(`Error getting item from ${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  // Generic method to delete an item from a store by ID
  async deleteById(storeName, id) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.delete(id);
      
      request.onsuccess = (event) => {
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error(`Error deleting item from ${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  // Generic method to get all items from a store
  async getAll(storeName, limit = 100) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = store.getAll(null, limit);
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = (event) => {
        console.error(`Error getting all items from ${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  // Generic method to get items from a store by index and range
  async getByIndex(storeName, indexName, range, limit = 100) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      
      const request = index.getAll(range, limit);
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = (event) => {
        console.error(`Error getting items by index from ${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  // Get transactions with optional filtering
  async getTransactions(filters = {}, limit = 100) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('transactions', 'readonly');
      const store = transaction.objectStore('transactions');
      
      // If we have a specific filter on status, use the status index
      if (filters.status) {
        const statusIndex = store.index('status');
        const request = statusIndex.getAll(filters.status, limit);
        
        request.onsuccess = (event) => {
          const results = event.target.result;
          
          // Apply additional filtering
          const filteredResults = results.filter(tx => {
            let match = true;
            
            if (filters.fromToken && tx.fromToken !== filters.fromToken) {
              match = false;
            }
            
            if (filters.toToken && tx.toToken !== filters.toToken) {
              match = false;
            }
            
            if (filters.fromTimestamp && tx.timestamp < filters.fromTimestamp) {
              match = false;
            }
            
            if (filters.toTimestamp && tx.timestamp > filters.toTimestamp) {
              match = false;
            }
            
            return match;
          });
          
          // Sort by timestamp (newest first)
          filteredResults.sort((a, b) => b.timestamp - a.timestamp);
          
          resolve(filteredResults.slice(0, limit));
        };
        
        request.onerror = (event) => {
          console.error('Error getting transactions:', event.target.error);
          reject(event.target.error);
        };
      } else {
        // Just get all and filter in memory
        const request = store.getAll(null, limit * 2); // Get more to allow for filtering
        
        request.onsuccess = (event) => {
          const results = event.target.result;
          
          // Apply filtering
          const filteredResults = results.filter(tx => {
            let match = true;
            
            if (filters.fromToken && tx.fromToken !== filters.fromToken) {
              match = false;
            }
            
            if (filters.toToken && tx.toToken !== filters.toToken) {
              match = false;
            }
            
            if (filters.fromTimestamp && tx.timestamp < filters.fromTimestamp) {
              match = false;
            }
            
            if (filters.toTimestamp && tx.timestamp > filters.toTimestamp) {
              match = false;
            }
            
            if (filters.status && tx.status !== filters.status) {
              match = false;
            }
            
            return match;
          });
          
          // Sort by timestamp (newest first)
          filteredResults.sort((a, b) => b.timestamp - a.timestamp);
          
          resolve(filteredResults.slice(0, limit));
        };
        
        request.onerror = (event) => {
          console.error('Error getting transactions:', event.target.error);
          reject(event.target.error);
        };
      }
    });
  },
  
  // Get arbitrage opportunities within time range
  async getArbitrageOpportunities(timeRange = 24 * 60 * 60 * 1000, minProfit = 0, limit = 50) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('arbitrageOpportunities', 'readonly');
      const store = transaction.objectStore('arbitrageOpportunities');
      
      // Use the timestamp index
      const timestampIndex = store.index('timestamp');
      const lowerBound = Date.now() - timeRange;
      const range = IDBKeyRange.lowerBound(lowerBound);
      
      const request = timestampIndex.getAll(range, limit * 2); // Get more for filtering
      
      request.onsuccess = (event) => {
        const results = event.target.result;
        
        // Filter by minimum profit
        const filteredResults = results.filter(opp => opp.profitPercent >= minProfit);
        
        // Sort by profit (highest first)
        filteredResults.sort((a, b) => b.profitPercent - a.profitPercent);
        
        resolve(filteredResults.slice(0, limit));
      };
      
      request.onerror = (event) => {
        console.error('Error getting arbitrage opportunities:', event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  // Get price history for a token
  async getPriceHistory(token, timeRange = 24 * 60 * 60 * 1000, limit = 100) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('priceHistory', 'readonly');
      const store = transaction.objectStore('priceHistory');
      
      // Use the token index to get entries for this token
      const tokenIndex = store.index('token');
      const request = tokenIndex.getAll(token, limit * 2); // Get more for filtering
      
      request.onsuccess = (event) => {
        const results = event.target.result;
        
        // Filter by time range
        const lowerBound = Date.now() - timeRange;
        const filteredResults = results.filter(entry => entry.timestamp >= lowerBound);
        
        // Sort by timestamp (oldest first for charting)
        filteredResults.sort((a, b) => a.timestamp - b.timestamp);
        
        resolve(filteredResults.slice(0, limit));
      };
      
      request.onerror = (event) => {
        console.error(`Error getting price history for ${token}:`, event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  // Get user settings
  async getSettings() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('settings', 'readonly');
      const store = transaction.objectStore('settings');
      
      // Try to get the settings object with ID 'user-settings'
      const request = store.get('user-settings');
      
      request.onsuccess = (event) => {
        const settings = event.target.result;
        
        if (settings) {
          resolve(settings);
        } else {
          // If no settings found, create default settings
          const defaultSettings = {
            id: 'user-settings',
            theme: 'dark',
            riskProfile: 'moderate',
            maxTransactionSize: 15, // in SOL
            gasLimit: 35, // in Gwei
            minProfitThreshold: 0.5, // in %
            stopLoss: -3, // in %
            autoExecute: false,
            notifications: true,
            timestamp: Date.now()
          };
          
          // Save default settings
          this.update('settings', defaultSettings)
            .then(() => resolve(defaultSettings))
            .catch(reject);
        }
      };
      
      request.onerror = (event) => {
        console.error('Error getting settings:', event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  // Save user settings
  async saveSettings(settings) {
    settings.id = 'user-settings'; // Ensure consistent ID
    settings.timestamp = Date.now();
    
    return this.update('settings', settings);
  },
  
  // Clear all data (for testing/reset)
  async clearAll() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const stores = Object.keys(DB_CONFIG.stores);
      let completed = 0;
      
      stores.forEach(storeName => {
        const transaction = this.db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const request = store.clear();
        
        request.onsuccess = (event) => {
          completed++;
          
          if (completed === stores.length) {
            console.log('All data cleared');
            resolve(true);
          }
        };
        
        request.onerror = (event) => {
          console.error(`Error clearing ${storeName}:`, event.target.error);
          reject(event.target.error);
        };
      });
    });
  },
  
  // Fill database with simulated data for testing
  async fillWithTestData() {
    // Generate random transactions
    const tokens = ['SOL', 'BTC', 'ETH', 'USDC', 'USDT', 'JUP', 'RAY'];
    const dexes = ['Jupiter', 'Raydium', 'Orca', 'OpenBook'];
    const statuses = ['completed', 'failed', 'pending'];
    
    // Transactions
    for (let i = 0; i < 50; i++) {
      const fromToken = tokens[Math.floor(Math.random() * tokens.length)];
      let toToken;
      do {
        toToken = tokens[Math.floor(Math.random() * tokens.length)];
      } while (toToken === fromToken);
      
      const amount = (Math.random() * 20 + 0.5).toFixed(2);
      const dex = dexes[Math.floor(Math.random() * dexes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const isSuccess = status === 'completed';
      
      // Generate time in the past (up to 7 days ago)
      const timestamp = Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000);
      
      const transaction = {
        id: 'tx_' + Math.random().toString(36).substring(2, 10),
        timestamp,
        fromToken,
        toToken,
        amount: parseFloat(amount),
        dex,
        status,
        profit: isSuccess ? (Math.random() * amount * 0.03).toFixed(3) : '0',
        gasUsed: (Math.random() * 0.0001).toFixed(6)
      };
      
      await this.add('transactions', transaction);
    }
    
    // Arbitrage opportunities
    for (let i = 0; i < 30; i++) {
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
      
      // Generate time in the past (up to 2 days ago)
      const timestamp = Date.now() - Math.floor(Math.random() * 2 * 24 * 60 * 60 * 1000);
      
      // Generate profit percentage (0.1% to 2.5%)
      const profitPercent = (Math.random() * 2.4 + 0.1).toFixed(2);
      
      const arbitrage = {
        id: 'arb_' + Math.random().toString(36).substring(2, 10),
        timestamp,
        baseToken,
        quoteToken,
        sourceDex,
        targetDex,
        profitPercent: parseFloat(profitPercent),
        estimatedProfit: (Math.random() * 0.5).toFixed(3),
        confidence: Math.random() * 100 // 0-100%
      };
      
      await this.add('arbitrageOpportunities', arbitrage);
      
      // Add some triangular arbitrage opportunities
      if (Math.random() < 0.2) {
        let intermediateToken;
        do {
          intermediateToken = tokens[Math.floor(Math.random() * tokens.length)];
        } while (intermediateToken === baseToken || intermediateToken === quoteToken);
        
        const triangularTimestamp = timestamp + 1000; // Just after the regular arbitrage
        
        const triangularArbitrage = {
          id: 'tri_' + Math.random().toString(36).substring(2, 10),
          timestamp: triangularTimestamp,
          type: 'triangular',
          baseToken,
          quoteToken,
          intermediateCoin: intermediateToken,
          path: [baseToken, intermediateToken, quoteToken, baseToken],
          exchanges: [
            dexes[Math.floor(Math.random() * dexes.length)],
            dexes[Math.floor(Math.random() * dexes.length)],
            dexes[Math.floor(Math.random() * dexes.length)]
          ],
          profitPercent: parseFloat((Math.random() * 3.4 + 0.3).toFixed(2)),
          estimatedProfit: parseFloat((Math.random() * 0.7).toFixed(3)),
          complexity: 'medium',
          executionTime: Math.floor(Math.random() * 500 + 500) // 500-1000ms
        };
        
        await this.add('arbitrageOpportunities', triangularArbitrage);
      }
    }
    
    // Price history
    for (const token of tokens) {
      // Base price for each token
      const basePrice = token === 'SOL' ? 120 : 
                       token === 'BTC' ? 60000 :
                       token === 'ETH' ? 3500 :
                       token === 'USDC' || token === 'USDT' ? 1 :
                       token === 'JUP' ? 1.5 :
                       token === 'RAY' ? 0.65 : 1;
      
      // Generate price points for the last 7 days
      const totalPoints = 168; // 7 days * 24 hours
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      
      for (let i = 0; i < totalPoints; i++) {
        const timestamp = now - (totalPoints - i) * oneHour;
        
        // Add some price volatility (up to ±2% between data points)
        const volatility = (Math.random() * 4 - 2) / 100;
        const previousPrice = i === 0 ? basePrice : 
          (await this.getByIndex('priceHistory', 'token', token, 1))
            .sort((a, b) => b.timestamp - a.timestamp)[0]?.price || basePrice;
        
        const price = previousPrice * (1 + volatility);
        
        const pricePoint = {
          id: `${token}_${timestamp}`,
          token,
          timestamp,
          price
        };
        
        await this.add('priceHistory', pricePoint);
      }
    }
    
    console.log('Test data generation completed');
    return true;
  }
};

// Initialize database and attach to window object
window.db = databaseService;

// Initialize database when the page loads
document.addEventListener('DOMContentLoaded', async function() {
  try {
    await databaseService.init();
    console.log('Database initialized');
    
    // Check if we have any transactions data
    const transactions = await databaseService.getAll('transactions', 1);
    
    // If no data, fill with test data
    if (transactions.length === 0) {
      console.log('No data found, filling database with test data...');
      await databaseService.fillWithTestData();
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
});
