/**
 * Transactions Engine for Solana MEV Dashboard
 * Handles automated transaction execution, validation, and risk management
 */

// Main transaction engine object
const transactionsEngine = {
  // Engine state
  state: {
    running: false,
    pauseReason: null,
    lastExecutionTime: 0,
    activeTransactions: [],
    pendingOpportunities: [],
    executionStats: {
      total: 0,
      successful: 0,
      failed: 0,
      aborted: 0,
      totalProfit: 0,
      averageExecutionTime: 0
    }
  },
  
  // Configuration (loaded from database)
  config: {
    maxConcurrentTransactions: 3,
    minTimeBetweenTrades: 5000, // 5 seconds
    maxTransactionSize: 15, // SOL
    minProfitThreshold: 0.5, // %
    maxSlippage: 1.0, // %
    gasLimitMultiplier: 1.5, // Multiply estimated gas by this factor
    riskProfile: 'moderate', // conservative, moderate, aggressive
    executionMode: 'manual', // manual, semi-auto, auto
    retryAttempts: 3,
    retryDelay: 2000, // ms
    blockchainConfirmations: 1, // Required confirmations
    stopLoss: -3, // % at which to trigger stop loss
    executionTimeout: 30000, // 30 seconds
    marketConditionsCheck: true, // Check market conditions before execution
    autoRebalance: false, // Automatically rebalance portfolio
    debug: false // Enable debug logging
  },
  
  // Initialize the transaction engine
  async initialize() {
    console.log('Initializing transactions engine...');
    
    try {
      // Load configuration from database
      if (window.db) {
        const settings = await window.db.getSettings();
        
        if (settings) {
          // Update engine configuration from settings
          this.config.maxTransactionSize = settings.maxTransactionSize || this.config.maxTransactionSize;
          this.config.minProfitThreshold = settings.minProfitThreshold || this.config.minProfitThreshold;
          this.config.riskProfile = settings.riskProfile || this.config.riskProfile;
          this.config.executionMode = settings.autoExecute ? 'auto' : 'manual';
          this.config.stopLoss = settings.stopLoss || this.config.stopLoss;
          
          console.log('Loaded configuration from database:', this.config);
        }
      }
      
      // Set up event listeners
      this._setupEventListeners();
      
      // Start the engine loop if in auto mode
      if (this.config.executionMode === 'auto') {
        this.start();
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing transactions engine:', error);
      return false;
    }
  },
  
  // Start the transaction engine
  start() {
    if (this.state.running) {
      console.log('Transaction engine is already running');
      return false;
    }
    
    console.log('Starting transaction engine...');
    this.state.running = true;
    this.state.pauseReason = null;
    
    // Start the main execution loop
    this._processNextOpportunity();
    
    // Dispatch engine started event
    this._dispatchEvent('engine-started', { timestamp: Date.now() });
    
    return true;
  },
  
  // Stop the transaction engine
  stop(reason = 'User requested') {
    if (!this.state.running) {
      console.log('Transaction engine is already stopped');
      return false;
    }
    
    console.log(`Stopping transaction engine. Reason: ${reason}`);
    this.state.running = false;
    this.state.pauseReason = reason;
    
    // Abort any active transactions
    this._abortActiveTransactions('Engine stopped');
    
    // Clear pending opportunities
    this.state.pendingOpportunities = [];
    
    // Dispatch engine stopped event
    this._dispatchEvent('engine-stopped', { 
      timestamp: Date.now(),
      reason
    });
    
    return true;
  },
  
  // Manually execute a transaction for an opportunity
  async executeOpportunity(opportunity) {
    if (!opportunity) {
      console.error('Invalid opportunity provided to executeOpportunity');
      return { success: false, error: 'Invalid opportunity' };
    }
    
    // Check if the wallet is connected
    if (!this._isWalletConnected()) {
      const error = 'Wallet not connected';
      this._logTransaction(opportunity, 'failed', error);
      return { success: false, error };
    }
    
    // Validate the opportunity
    const validation = this._validateOpportunity(opportunity);
    if (!validation.valid) {
      this._logTransaction(opportunity, 'failed', validation.reason);
      return { success: false, error: validation.reason };
    }
    
    // Execute the transaction
    try {
      console.log(`Executing opportunity: ${opportunity.id}`);
      
      // Create transaction record
      const transaction = this._createTransactionFromOpportunity(opportunity);
      
      // Log pending transaction
      await this._logTransaction(transaction, 'pending');
      
      // Add to active transactions
      this.state.activeTransactions.push(transaction);
      
      // Dispatch transaction started event
      this._dispatchEvent('transaction-started', { transaction });
      
      // Execute the actual blockchain transaction
      const result = await this._executeTransaction(transaction);
      
      // Update transaction status
      if (result.success) {
        // Update with actual profit and gas used
        transaction.profit = result.profit || transaction.estimatedProfit;
        transaction.gasUsed = result.gasUsed || transaction.estimatedGas;
        transaction.status = 'completed';
        
        // Log successful transaction
        await this._logTransaction(transaction, 'completed');
        
        // Update statistics
        this.state.executionStats.successful++;
        this.state.executionStats.totalProfit += parseFloat(transaction.profit);
        
        // Dispatch transaction completed event
        this._dispatchEvent('transaction-completed', { transaction });
      } else {
        transaction.status = 'failed';
        transaction.error = result.error;
        
        // Log failed transaction
        await this._logTransaction(transaction, 'failed', result.error);
        
        // Update statistics
        this.state.executionStats.failed++;
        
        // Dispatch transaction failed event
        this._dispatchEvent('transaction-failed', { 
          transaction,
          error: result.error
        });
      }
      
      // Remove from active transactions
      this._removeActiveTransaction(transaction.id);
      
      // Update total statistics
      this.state.executionStats.total++;
      
      return result;
    } catch (error) {
      console.error('Error executing opportunity:', error);
      
      // Log failed transaction
      await this._logTransaction(opportunity, 'failed', error.message);
      
      // Update statistics
      this.state.executionStats.failed++;
      
      return { success: false, error: error.message };
    }
  },
  
  // Add an opportunity to the pending queue
  addOpportunity(opportunity) {
    // Generate ID if not present
    if (!opportunity.id) {
      opportunity.id = 'opp_' + Math.random().toString(36).substring(2, 10);
    }
    
    // Add timestamp if not present
    if (!opportunity.timestamp) {
      opportunity.timestamp = Date.now();
    }
    
    // Add to pending opportunities
    this.state.pendingOpportunities.push(opportunity);
    
    // Sort by profit potential (highest first)
    this.state.pendingOpportunities.sort((a, b) => {
      return parseFloat(b.profitPercent) - parseFloat(a.profitPercent);
    });
    
    console.log(`Added opportunity to queue: ${opportunity.id} (${opportunity.profitPercent}%)`);
    
    // If in auto mode and running, process immediately
    if (this.state.running && this.config.executionMode === 'auto') {
      this._processNextOpportunity();
    }
    
    // Dispatch opportunity added event
    this._dispatchEvent('opportunity-added', { opportunity });
    
    return opportunity.id;
  },
  
  // Get the current state of the engine
  getState() {
    return {
      running: this.state.running,
      pauseReason: this.state.pauseReason,
      activeTransactions: this.state.activeTransactions.length,
      pendingOpportunities: this.state.pendingOpportunities.length,
      stats: this.state.executionStats,
      config: this.config
    };
  },
  
  // Update engine configuration
  updateConfig(newConfig) {
    // Validate the new configuration
    if (!newConfig) return false;
    
    // Update config with new values
    Object.keys(newConfig).forEach(key => {
      if (this.config.hasOwnProperty(key)) {
        this.config[key] = newConfig[key];
      }
    });
    
    console.log('Transaction engine configuration updated:', this.config);
    
    // Save to database if available
    if (window.db) {
      window.db.saveSettings({
        maxTransactionSize: this.config.maxTransactionSize,
        minProfitThreshold: this.config.minProfitThreshold,
        riskProfile: this.config.riskProfile,
        autoExecute: this.config.executionMode === 'auto',
        stopLoss: this.config.stopLoss
      }).catch(error => {
        console.error('Error saving engine configuration to database:', error);
      });
    }
    
    // Start/stop engine based on executionMode
    if (this.config.executionMode === 'auto' && !this.state.running) {
      this.start();
    } else if (this.config.executionMode === 'manual' && this.state.running) {
      this.stop('Switched to manual mode');
    }
    
    // Dispatch config updated event
    this._dispatchEvent('config-updated', { config: this.config });
    
    return true;
  },
  
  // Abort a specific transaction
  abortTransaction(transactionId) {
    const transaction = this.state.activeTransactions.find(tx => tx.id === transactionId);
    
    if (!transaction) {
      console.warn(`Cannot abort transaction ${transactionId}: not found in active transactions`);
      return false;
    }
    
    console.log(`Aborting transaction: ${transactionId}`);
    
    // Update transaction status
    transaction.status = 'aborted';
    transaction.error = 'User aborted transaction';
    
    // Log aborted transaction
    this._logTransaction(transaction, 'aborted', 'User aborted transaction');
    
    // Remove from active transactions
    this._removeActiveTransaction(transactionId);
    
    // Update statistics
    this.state.executionStats.aborted++;
    this.state.executionStats.total++;
    
    // Dispatch transaction aborted event
    this._dispatchEvent('transaction-aborted', { transaction });
    
    return true;
  },
  
  // Get active and pending transactions
  getActiveTransactions() {
    return this.state.activeTransactions;
  },
  
  getPendingOpportunities() {
    return this.state.pendingOpportunities;
  },
  
  // Internal method: Set up event listeners
  _setupEventListeners() {
    // Listen for arbitrage opportunities
    window.addEventListener('arbitrage-opportunity', (event) => {
      if (event.detail) {
        this.addOpportunity(event.detail);
      }
    });
    
    // Listen for triangular arbitrage opportunities
    window.addEventListener('triangular-arbitrage', (event) => {
      if (event.detail) {
        this.addOpportunity(event.detail);
      }
    });
    
    // Listen for wallet connection events
    window.addEventListener('wallet-connected', () => {
      // Resume engine if it was paused due to wallet disconnection
      if (!this.state.running && this.state.pauseReason === 'Wallet disconnected') {
        this.start();
      }
    });
    
    window.addEventListener('wallet-disconnected', () => {
      // Pause engine if it was running
      if (this.state.running) {
        this.stop('Wallet disconnected');
      }
    });
    
    console.log('Transaction engine event listeners initialized');
  },
  
  // Internal method: Process the next opportunity in the queue
  _processNextOpportunity() {
    // If engine is not running or no pending opportunities, return
    if (!this.state.running || this.state.pendingOpportunities.length === 0) {
      return;
    }
    
    // Check if we're at max concurrent transactions
    if (this.state.activeTransactions.length >= this.config.maxConcurrentTransactions) {
      console.log('Max concurrent transactions reached, waiting...');
      
      // Schedule another check soon
      setTimeout(() => this._processNextOpportunity(), 1000);
      return;
    }
    
    // Check if enough time has passed since last execution
    const now = Date.now();
    const timeSinceLastExecution = now - this.state.lastExecutionTime;
    
    if (timeSinceLastExecution < this.config.minTimeBetweenTrades) {
      const waitTime = this.config.minTimeBetweenTrades - timeSinceLastExecution;
      console.log(`Waiting ${waitTime}ms before next execution`);
      
      // Schedule next opportunity after wait time
      setTimeout(() => this._processNextOpportunity(), waitTime);
      return;
    }
    
    // Get the highest profit opportunity
    const opportunity = this.state.pendingOpportunities.shift();
    
    // Update last execution time
    this.state.lastExecutionTime = now;
    
    // Execute the opportunity
    this.executeOpportunity(opportunity)
      .then(() => {
        // Process next opportunity after a short delay
        setTimeout(() => this._processNextOpportunity(), 100);
      })
      .catch(error => {
        console.error('Error executing opportunity:', error);
        
        // Process next opportunity after a short delay
        setTimeout(() => this._processNextOpportunity(), 100);
      });
  },
  
  // Internal method: Abort all active transactions
  _abortActiveTransactions(reason) {
    const activeTransactionIds = this.state.activeTransactions.map(tx => tx.id);
    
    activeTransactionIds.forEach(txId => {
      this.abortTransaction(txId);
    });
    
    console.log(`Aborted ${activeTransactionIds.length} active transactions. Reason: ${reason}`);
  },
  
  // Internal method: Remove a transaction from the active list
  _removeActiveTransaction(transactionId) {
    this.state.activeTransactions = this.state.activeTransactions.filter(tx => tx.id !== transactionId);
  },
  
  // Internal method: Validate an opportunity before execution
  _validateOpportunity(opportunity) {
    // Check if opportunity is expired
    const now = Date.now();
    const opportunityAge = now - opportunity.timestamp;
    
    if (opportunityAge > 60000) { // Older than 1 minute
      return { valid: false, reason: 'Opportunity expired' };
    }
    
    // Check minimum profit threshold
    if (parseFloat(opportunity.profitPercent) < this.config.minProfitThreshold) {
      return { valid: false, reason: 'Below profit threshold' };
    }
    
    // Check market conditions if enabled
    if (this.config.marketConditionsCheck && !this._checkMarketConditions()) {
      return { valid: false, reason: 'Unfavorable market conditions' };
    }
    
    return { valid: true };
  },
  
  // Internal method: Check current market conditions
  _checkMarketConditions() {
    // This would be a more complex check in a real implementation
    // For now, we'll just do a simple check based on the risk profile
    
    // Get the latest market volatility from analytics
    let marketVolatility = 0;
    
    if (window.solanaAnalytics && window.solanaAnalytics.marketAnalysis) {
      marketVolatility = window.solanaAnalytics.marketAnalysis.volatilityIndex || 0;
    }
    
    // Define thresholds based on risk profile
    let volatilityThreshold = 0;
    
    switch (this.config.riskProfile) {
      case 'conservative':
        volatilityThreshold = 0.02; // 2%
        break;
      case 'moderate':
        volatilityThreshold = 0.04; // 4%
        break;
      case 'aggressive':
        volatilityThreshold = 0.08; // 8%
        break;
      default:
        volatilityThreshold = 0.04; // default to moderate
    }
    
    // If market is too volatile for our risk profile, return false
    if (marketVolatility > volatilityThreshold) {
      console.log(`Market conditions check failed: volatility ${marketVolatility} exceeds threshold ${volatilityThreshold}`);
      return false;
    }
    
    return true;
  },
  
  // Internal method: Check if wallet is connected
  _isWalletConnected() {
    return window.solanaServices && 
           window.solanaServices.wallet && 
           window.solanaServices.wallet.wallet && 
           window.solanaServices.wallet.wallet.connected;
  },
  
  // Internal method: Create a transaction object from an opportunity
  _createTransactionFromOpportunity(opportunity) {
    // Basic transaction fields
    const transaction = {
      id: 'tx_' + Math.random().toString(36).substring(2, 10),
      timestamp: Date.now(),
      opportunityId: opportunity.id,
      status: 'pending'
    };
    
    // Handle different types of opportunities
    if (opportunity.type === 'triangular') {
      // Triangular arbitrage
      transaction.type = 'triangular';
      transaction.path = opportunity.path.slice(); // Clone array
      transaction.exchanges = opportunity.exchanges.slice(); // Clone array
      transaction.fromToken = opportunity.path[0];
      transaction.toToken = opportunity.path[0]; // Same start and end token
      transaction.estimatedProfit = opportunity.estimatedProfit;
      transaction.profitPercent = opportunity.profitPercent;
      transaction.amount = this._calculateOptimalAmount(opportunity);
      transaction.estimatedGas = (Math.random() * 0.0001).toFixed(6); // Simulated gas estimate
    } else {
      // Regular arbitrage
      transaction.type = 'simple';
      transaction.fromToken = opportunity.baseToken;
      transaction.toToken = opportunity.quoteToken;
      transaction.sourceDex = opportunity.sourceDex;
      transaction.targetDex = opportunity.targetDex;
      transaction.estimatedProfit = opportunity.estimatedProfit;
      transaction.profitPercent = opportunity.profitPercent;
      transaction.amount = this._calculateOptimalAmount(opportunity);
      transaction.estimatedGas = (Math.random() * 0.0001).toFixed(6); // Simulated gas estimate
    }
    
    return transaction;
  },
  
  // Internal method: Calculate optimal amount for transaction
  _calculateOptimalAmount(opportunity) {
    // This would be a more complex calculation in a real implementation
    // For now, we'll just use a random amount within our max transaction size
    const maxSize = this.config.maxTransactionSize;
    const minSize = Math.min(1, maxSize * 0.1); // Minimum 1 SOL or 10% of max
    
    // Calculate optimal size based on profit and risk profile
    const profitPercent = parseFloat(opportunity.profitPercent);
    const riskFactor = this.config.riskProfile === 'conservative' ? 0.3 :
                      this.config.riskProfile === 'moderate' ? 0.6 : 0.9;
    
    // Higher profit % leads to larger position size, scaled by risk factor
    const optimalSize = Math.min(
      maxSize,
      minSize + (maxSize - minSize) * (profitPercent / 5) * riskFactor
    );
    
    return optimalSize.toFixed(2);
  },
  
  // Internal method: Execute a transaction on the blockchain
  async _executeTransaction(transaction) {
    // This would interact with the actual blockchain in a real implementation
    // For now, we'll just simulate the execution
    
    console.log(`Executing transaction ${transaction.id}:`, transaction);
    
    // Simulate transaction processing time
    const processingTime = Math.random() * 3000 + 1000; // 1-4 seconds
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Simulate success/failure (90% success rate)
    const success = Math.random() < 0.9;
    
    if (success) {
      // Calculate actual profit (may differ slightly from estimated)
      const actualProfitVariance = (Math.random() * 0.2 - 0.1); // -10% to +10% of estimated
      const actualProfit = parseFloat(transaction.estimatedProfit) * (1 + actualProfitVariance);
      
      // Calculate gas used
      const gasUsed = (Math.random() * 0.0001).toFixed(6);
      
      return {
        success: true,
        transactionId: transaction.id,
        profit: actualProfit.toFixed(3),
        gasUsed,
        executionTime: processingTime
      };
    } else {
      // Generate a random error message
      const errors = [
        'Insufficient liquidity',
        'Price slippage too high',
        'Execution timed out',
        'Blockchain congestion',
        'Transaction reverted'
      ];
      const error = errors[Math.floor(Math.random() * errors.length)];
      
      return {
        success: false,
        transactionId: transaction.id,
        error
      };
    }
  },
  
  // Internal method: Log a transaction to the database
  async _logTransaction(transaction, status, error = null) {
    // Update transaction status
    transaction.status = status;
    
    if (error) {
      transaction.error = error;
    }
    
    // Save to database if available
    if (window.db) {
      try {
        // Check if transaction already exists
        const existingTx = await window.db.getById('transactions', transaction.id);
        
        if (existingTx) {
          // Update existing transaction
          await window.db.update('transactions', transaction);
        } else {
          // Add new transaction
          await window.db.add('transactions', transaction);
        }
      } catch (dbError) {
        console.error('Error logging transaction to database:', dbError);
      }
    }
    
    // Log to console
    console.log(`Transaction ${transaction.id} ${status}:`, transaction);
  },
  
  // Internal method: Dispatch custom event
  _dispatchEvent(eventName, detail) {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  }
};

// Initialize the transactions engine
document.addEventListener('DOMContentLoaded', function() {
  // Add a delay to ensure services are initialized first
  setTimeout(() => {
    transactionsEngine.initialize().then(success => {
      if (success) {
        console.log('Transaction engine initialized successfully');
        
        // Attach to window object for global access
        window.transactionsEngine = transactionsEngine;
      } else {
        console.error('Failed to initialize transaction engine');
      }
    });
  }, 1000);
});
