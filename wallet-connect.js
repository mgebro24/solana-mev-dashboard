/**
 * Phantom Wallet Connect Integration
 * Solana MEV Dashboard-ის საფულის ინტეგრაციის მოდული
 */

// DOM references for wallet UI components
const domElements = {
  connectButton: document.getElementById('connect-wallet'),
  disconnectButton: document.getElementById('disconnect-wallet'), 
  walletStatus: document.getElementById('wallet-status'),
  walletAddress: document.getElementById('wallet-address'),
  walletBalanceContainer: document.getElementById('wallet-balance-container'),
  walletBalance: document.getElementById('wallet-balance')
};

// Wallet state management
const walletState = {
  connected: false,
  address: null,
  balance: 0,
  provider: null,
  network: 'mainnet-beta'
};

/**
 * Initialize the wallet connection module when document is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing wallet connect module...');
  initWalletListeners();
  checkWalletConnection();
});

/**
 * Setup event listeners for wallet integration
 */
function initWalletListeners() {
  // Connect button click handler
  domElements.connectButton.addEventListener('click', connectPhantomWallet);
  
  // Disconnect button click handler
  domElements.disconnectButton.addEventListener('click', disconnectPhantomWallet);
}

/**
 * Check if Phantom wallet is already connected on page load
 */
async function checkWalletConnection() {
  if (!isPhantomInstalled()) {
    setWalletNotInstalledState();
    return;
  }
  
  try {
    // Check if wallet is already connected
    if (window.solana && window.solana.isPhantom) {
      const connected = window.solana.isConnected;
      
      if (connected) {
        const publicKey = window.solana.publicKey.toString();
        await handleWalletConnected({
          address: publicKey,
          network: window.solana.networkVersion || 'mainnet-beta',
          connected: true,
          provider: window.solana
        });
      }
    }
  } catch (error) {
    console.error('Error checking wallet connection:', error);
  }
}

/**
 * Check if Phantom wallet is installed
 * @returns {boolean} - True if Phantom is available
 */
function isPhantomInstalled() {
  return window.solana && window.solana.isPhantom;
}

/**
 * Set UI state when wallet is not installed
 */
function setWalletNotInstalledState() {
  domElements.connectButton.innerHTML = '<span>Phantom დაინსტალირება</span>';
  domElements.connectButton.addEventListener('click', () => {
    window.open('https://phantom.app/', '_blank');
  });
}

/**
 * Connect to Phantom wallet
 */
async function connectPhantomWallet() {
  if (!isPhantomInstalled()) {
    setWalletNotInstalledState();
    return;
  }
  
  try {
    // Request wallet connection
    await window.solana.connect();
    
    if (window.solana.isConnected && window.solana.publicKey) {
      await handleWalletConnected({
        address: window.solana.publicKey.toString(),
        network: window.solana.networkVersion || 'mainnet-beta',
        connected: true,
        provider: window.solana
      });
    }
  } catch (error) {
    console.error('Error connecting to Phantom wallet:', error);
    showWalletErrorNotification('საფულის დაკავშირება ვერ მოხერხდა');
  }
}

/**
 * Disconnect from Phantom wallet
 */
async function disconnectPhantomWallet() {
  if (!walletState.connected) return;
  
  try {
    // Disconnect wallet
    await window.solana.disconnect();
    handleWalletDisconnected();
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
    showWalletErrorNotification('საფულის გამოერთება ვერ მოხერხდა');
  }
}

/**
 * Handle wallet connected state
 * @param {Object} walletData - Connected wallet data
 */
async function handleWalletConnected(walletData) {
  // Update wallet state
  walletState.connected = true;
  walletState.address = walletData.address;
  walletState.provider = walletData.provider;
  walletState.network = walletData.network;
  
  // Update UI
  updateWalletUI();
  
  // Get and display balance
  await fetchAndDisplayBalance();
  
  // Dispatch wallet connected event for other modules
  window.dispatchEvent(new CustomEvent('wallet-connected', { 
    detail: { 
      address: walletState.address,
      network: walletState.network
    } 
  }));
  
  // Show success notification
  showWalletSuccessNotification('საფულე დაკავშირებულია');
}

/**
 * Handle wallet disconnected state
 */
function handleWalletDisconnected() {
  // Reset wallet state
  walletState.connected = false;
  walletState.address = null;
  walletState.balance = 0;
  walletState.provider = null;
  
  // Update UI
  updateWalletUI();
  
  // Dispatch wallet disconnected event
  window.dispatchEvent(new CustomEvent('wallet-disconnected'));
  
  // Show notification
  showWalletNotification('საფულე გამოერთებულია', 'info');
}

/**
 * Fetch and display wallet balance
 */
async function fetchAndDisplayBalance() {
  if (!walletState.connected || !walletState.address) return;
  
  try {
    // In a real implementation, we would use Solana Web3.js to get the balance
    // For demo, we'll use a simulated balance
    const simulatedBalance = Math.random() * 20 + 0.5; // 0.5-20.5 SOL
    walletState.balance = parseFloat(simulatedBalance.toFixed(4));
    
    // Update UI
    if (domElements.walletBalance) {
      domElements.walletBalance.textContent = walletState.balance.toFixed(4);
    }
    
    return walletState.balance;
  } catch (error) {
    console.error('Error fetching balance:', error);
    return 0;
  }
}

/**
 * Update wallet UI based on connection state
 */
function updateWalletUI() {
  if (walletState.connected) {
    // Show connected UI
    document.querySelectorAll('.wallet-connected').forEach(el => {
      el.classList.remove('hidden');
    });
    
    document.querySelectorAll('.wallet-not-connected').forEach(el => {
      el.classList.add('hidden');
    });
    
    // Update address display (truncate for UI)
    if (domElements.walletAddress) {
      const address = walletState.address;
      const truncatedAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;
      domElements.walletAddress.textContent = truncatedAddress;
      domElements.walletAddress.title = address; // Full address on hover
    }
  } else {
    // Show disconnected UI
    document.querySelectorAll('.wallet-connected').forEach(el => {
      el.classList.add('hidden');
    });
    
    document.querySelectorAll('.wallet-not-connected').forEach(el => {
      el.classList.remove('hidden');
    });
  }
}

/**
 * Show wallet notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info)
 */
function showWalletNotification(message, type = 'info') {
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
  notification.className = `bg-gray-800 border rounded-md px-4 py-2 shadow-lg transform transition-all duration-300 ease-in-out`;
  
  // Set border color based on type
  if (type === 'success') {
    notification.classList.add('border-green-500', 'text-green-400');
  } else if (type === 'error') {
    notification.classList.add('border-red-500', 'text-red-400');
  } else {
    notification.classList.add('border-blue-500', 'text-blue-400');
  }
  
  notification.innerHTML = `<div class="flex items-center gap-2">
    <span>${message}</span>
  </div>`;
  
  // Add to container
  notificationContainer.appendChild(notification);
  
  // Remove after delay
  setTimeout(() => {
    notification.classList.add('opacity-0', 'translate-x-full');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

/**
 * Show wallet success notification
 * @param {string} message - Success message
 */
function showWalletSuccessNotification(message) {
  showWalletNotification(message, 'success');
}

/**
 * Show wallet error notification
 * @param {string} message - Error message
 */
function showWalletErrorNotification(message) {
  showWalletNotification(message, 'error');
}

/**
 * Execute wallet transaction (simulated for demo)
 * @param {Object} txData - Transaction data
 * @returns {Promise<Object>} - Transaction result
 */
async function executeTransaction(txData) {
  if (!walletState.connected) {
    return { success: false, error: 'Wallet not connected' };
  }
  
  try {
    console.log('Executing transaction:', txData);
    
    // Add a random delay to simulate transaction processing
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
    
    // 90% success rate for demo
    if (Math.random() < 0.9) {
      const txHash = 'Sim_' + Math.random().toString(36).substring(2, 15);
      
      // Show success notification
      showWalletSuccessNotification('ტრანზაქცია შესრულებულია');
      
      return {
        success: true,
        txHash,
        confirmations: 1
      };
    } else {
      throw new Error('Transaction simulation failed');
    }
  } catch (error) {
    console.error('Transaction error:', error);
    showWalletErrorNotification('ტრანზაქცია ვერ შესრულდა');
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Export wallet functions for external use
window.walletConnector = {
  connect: connectPhantomWallet,
  disconnect: disconnectPhantomWallet,
  executeTransaction,
  getState: () => ({ ...walletState }),
  isConnected: () => walletState.connected,
  refreshBalance: fetchAndDisplayBalance
};
