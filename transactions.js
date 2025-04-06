// Transaction history and management system for the Solana MEV Bot
// This provides detailed transaction history, filtering, and analysis

// Sample transaction data
const transactionHistory = [
  {
    id: "tx7862541",
    timestamp: Date.now() - 15 * 60000, // 15 minutes ago
    fromToken: "SOL",
    toToken: "USDC",
    exchange: "Jupiter",
    amount: 15,
    amountUsd: 1810.35,
    profit: 0.18,
    profitUsd: 21.72,
    status: "completed",
    executionTime: 820, // ms
    gasUsed: 0.000012,
    gasPrice: 31,
    blockHeight: 228631742
  },
  {
    id: "tx7862435",
    timestamp: Date.now() - 32 * 60000, // 32 minutes ago
    fromToken: "ETH",
    toToken: "SOL",
    exchange: "Orca",
    amount: 0.2,
    amountUsd: 882.57,
    profit: 0.21,
    profitUsd: 25.35,
    status: "completed",
    executionTime: 950, // ms
    gasUsed: 0.000018,
    gasPrice: 30,
    blockHeight: 228631501
  },
  {
    id: "tx7862301",
    timestamp: Date.now() - 44 * 60000, // 44 minutes ago
    fromToken: "USDC",
    toToken: "RAY",
    exchange: "Raydium",
    amount: 200,
    amountUsd: 200,
    profit: 0.11,
    profitUsd: 13.29,
    status: "completed",
    executionTime: 780, // ms
    gasUsed: 0.000010,
    gasPrice: 28,
    blockHeight: 228631320
  },
  {
    id: "tx7862180",
    timestamp: Date.now() - 55 * 60000, // 55 minutes ago
    fromToken: "SOL",
    toToken: "JUP",
    exchange: "Jupiter",
    amount: 10,
    amountUsd: 1207.9,
    profit: -0.03,
    profitUsd: -3.62,
    status: "reverted",
    executionTime: 890, // ms
    gasUsed: 0.000014,
    gasPrice: 29,
    blockHeight: 228631105
  },
  {
    id: "tx7862022",
    timestamp: Date.now() - 65 * 60000, // 65 minutes ago
    fromToken: "JUP",
    toToken: "USDC",
    exchange: "Jupiter",
    amount: 50,
    amountUsd: 139,
    profit: 0.15,
    profitUsd: 18.12,
    status: "completed",
    executionTime: 735, // ms
    gasUsed: 0.000011,
    gasPrice: 29,
    blockHeight: 228630944
  },
  // Add more historical transactions
  {
    id: "tx7861950",
    timestamp: Date.now() - 95 * 60000, // 95 minutes ago
    fromToken: "ETH",
    toToken: "BTC",
    exchange: "Jupiter",
    amount: 0.1,
    amountUsd: 441.29,
    profit: 0.22,
    profitUsd: 26.58,
    status: "completed",
    executionTime: 905, // ms
    gasUsed: 0.000017,
    gasPrice: 30,
    blockHeight: 228630532
  },
  {
    id: "tx7861820",
    timestamp: Date.now() - 120 * 60000, // 2 hours ago
    fromToken: "BTC",
    toToken: "SOL",
    exchange: "Orca",
    amount: 0.001,
    amountUsd: 120.85,
    profit: 0.08,
    profitUsd: 9.67,
    status: "completed",
    executionTime: 810, // ms
    gasUsed: 0.000013,
    gasPrice: 28,
    blockHeight: 228630201
  }
];

// Transaction statistics
const transactionStats = {
  last24Hours: {
    total: 157,
    successful: 148,
    failed: 9,
    profitSol: 4.52,
    profitUsd: 546.28,
    averageExecTime: 842,
    gasSpent: 0.001854
  },
  last7Days: {
    total: 952,
    successful: 912,
    failed: 40,
    profitSol: 29.82,
    profitUsd: 3603.69,
    averageExecTime: 837,
    gasSpent: 0.011223
  },
  allTime: {
    total: 8945,
    successful: 8763,
    failed: 182,
    profitSol: 254.82,
    profitUsd: 30803.09,
    averageExecTime: 843,
    gasSpent: 0.104876
  }
};

// Helper functions for rendering transactions
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatFullTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('ka-GE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatProfit(profit) {
  return profit.toFixed(3);
}

function getStatusClass(status) {
  switch(status) {
    case 'completed':
      return 'text-green-400';
    case 'pending':
      return 'text-blue-400';
    case 'failed':
    case 'reverted':
      return 'text-amber-400';
    default:
      return 'text-gray-400';
  }
}

function getStatusText(status) {
  switch(status) {
    case 'completed':
      return '✓ შესრულდა';
    case 'pending':
      return '⟳ მიმდინარე';
    case 'failed':
      return '✗ ჩავარდა';
    case 'reverted':
      return '⚠ უკუგება';
    default:
      return status;
  }
}

// Function to render transaction table
function renderTransactionTable(containerId, transactions = transactionHistory, limit = 5) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Take only the specified number of transactions
  const limitedTransactions = transactions.slice(0, limit);
  
  // Create table rows
  const tableRows = limitedTransactions.map(tx => {
    const profitClass = tx.profit >= 0 ? 'price-up' : 'price-down';
    
    return `
      <tr data-tx-id="${tx.id}" class="transaction-row">
        <td class="text-sm">${formatTimestamp(tx.timestamp)}</td>
        <td class="text-sm">${tx.fromToken} → ${tx.toToken}</td>
        <td class="text-sm"><span class="exchange-badge">${tx.exchange}</span></td>
        <td class="text-sm">${tx.amount} ${tx.fromToken}</td>
        <td class="text-sm ${profitClass}">${tx.profit >= 0 ? '+' : ''}${formatProfit(tx.profit)} ${tx.fromToken}</td>
        <td class="text-sm"><span class="${getStatusClass(tx.status)}">${getStatusText(tx.status)}</span></td>
      </tr>
    `;
  }).join('');
  
  // Update table content
  container.innerHTML = tableRows;
  
  // Add click event listeners to rows for detailed view
  document.querySelectorAll('.transaction-row').forEach(row => {
    row.addEventListener('click', function() {
      const txId = this.getAttribute('data-tx-id');
      showTransactionDetails(txId);
    });
  });
}

// Function to show transaction details
function showTransactionDetails(txId) {
  const tx = transactionHistory.find(tx => tx.id === txId);
  if (!tx) return;
  
  // Create modal for transaction details
  const modalElement = document.createElement('div');
  modalElement.className = 'fixed inset-0 flex items-center justify-center z-50 bg-black/50 p-4';
  
  const profitClass = tx.profit >= 0 ? 'price-up' : 'price-down';
  
  modalElement.innerHTML = `
    <div class="glass p-6 rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-start mb-4">
        <h3 class="text-lg font-medium">ტრანზაქციის დეტალები</h3>
        <button class="p-2 hover:bg-white/5 rounded-lg close-modal">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div class="text-xs text-gray-400 mb-1">ტრანზაქციის ID</div>
          <div class="font-mono text-sm">${tx.id}</div>
        </div>
        <div>
          <div class="text-xs text-gray-400 mb-1">დრო</div>
          <div class="text-sm">${formatFullTimestamp(tx.timestamp)}</div>
        </div>
      </div>
      
      <div class="mb-4 p-3 glass rounded-lg">
        <div class="flex justify-between items-center mb-2">
          <div class="text-xs text-gray-400">წყვილი</div>
          <div class="text-sm font-medium">${tx.fromToken} → ${tx.toToken}</div>
        </div>
        <div class="flex justify-between items-center mb-2">
          <div class="text-xs text-gray-400">რაოდენობა</div>
          <div class="text-sm">${tx.amount} ${tx.fromToken} ($${tx.amountUsd.toFixed(2)})</div>
        </div>
        <div class="flex justify-between items-center">
          <div class="text-xs text-gray-400">მოგება</div>
          <div class="text-sm ${profitClass}">${tx.profit >= 0 ? '+' : ''}${formatProfit(tx.profit)} ${tx.fromToken} ($${tx.profitUsd.toFixed(2)})</div>
        </div>
      </div>
      
      <div class="mb-4 grid grid-cols-2 gap-4">
        <div>
          <div class="text-xs text-gray-400 mb-1">ბირჟა</div>
          <div class="text-sm">${tx.exchange}</div>
        </div>
        <div>
          <div class="text-xs text-gray-400 mb-1">სტატუსი</div>
          <div class="text-sm ${getStatusClass(tx.status)}">${getStatusText(tx.status)}</div>
        </div>
        <div>
          <div class="text-xs text-gray-400 mb-1">შესრულების დრო</div>
          <div class="text-sm">${tx.executionTime} მწმ</div>
        </div>
        <div>
          <div class="text-xs text-gray-400 mb-1">ბლოკის სიმაღლე</div>
          <div class="text-sm font-mono">${tx.blockHeight}</div>
        </div>
      </div>
      
      <div class="mb-4">
        <div class="text-xs text-gray-400 mb-1">გაზის ინფორმაცია</div>
        <div class="text-sm">
          <span class="parameter-value">${tx.gasUsed} SOL</span> |
          <span class="parameter-value">${tx.gasPrice} Gwei</span>
        </div>
      </div>
      
      <div class="flex justify-end">
        <button class="btn-neo py-1 px-3 text-sm mr-2 view-explorer">ექსპლორერში ნახვა</button>
        <button class="btn-neo py-1 px-3 text-sm close-modal">დახურვა</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modalElement);
  
  // Add event listeners for closing the modal
  modalElement.querySelectorAll('.close-modal').forEach(button => {
    button.addEventListener('click', () => {
      modalElement.classList.add('opacity-0', 'transition-opacity', 'duration-300');
      setTimeout(() => modalElement.remove(), 300);
    });
  });
  
  // Add event listener for "View in Explorer" button
  modalElement.querySelector('.view-explorer').addEventListener('click', () => {
    alert(`სიმულაციის რეჟიმი: ტრანზაქცია ${tx.id} იხილეთ Solana ექსპლორერში`);
  });
}

// Function to render transaction statistics
function renderTransactionStats() {
  const statsContainer = document.getElementById('transaction-stats');
  if (!statsContainer) return;
  
  const stats = transactionStats.last24Hours;
  
  statsContainer.innerHTML = `
    <div class="grid grid-cols-2 gap-3 text-sm">
      <div>
        <div class="text-gray-400 text-xs">ტრანზაქციების რაოდენობა</div>
        <div class="font-medium">${stats.total}</div>
      </div>
      <div>
        <div class="text-gray-400 text-xs">წარმატების მაჩვენებელი</div>
        <div class="font-medium">${Math.round(stats.successful / stats.total * 100)}%</div>
      </div>
      <div>
        <div class="text-gray-400 text-xs">ჯამური მოგება</div>
        <div class="font-medium price-up">${stats.profitSol.toFixed(2)} SOL</div>
      </div>
      <div>
        <div class="text-gray-400 text-xs">საშუალო შესრულების დრო</div>
        <div class="font-medium">${stats.averageExecTime} მწმ</div>
      </div>
    </div>
  `;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Render transaction table
  renderTransactionTable('transaction-table-body');
  
  // Render transaction statistics
  renderTransactionStats();
  
  // Setup interval to update timestamps
  setInterval(() => {
    document.querySelectorAll('.transaction-row').forEach(row => {
      const txId = row.getAttribute('data-tx-id');
      const tx = transactionHistory.find(tx => tx.id === txId);
      if (tx) {
        const timeCell = row.querySelector('td:first-child');
        if (timeCell) {
          timeCell.textContent = formatTimestamp(tx.timestamp);
        }
      }
    });
  }, 60000); // Update every minute
  
  // Add event listener for full history button
  const fullHistoryBtn = document.querySelector('button.btn-neo');
  if (fullHistoryBtn && fullHistoryBtn.textContent.includes('სრული ისტორია')) {
    fullHistoryBtn.addEventListener('click', function() {
      const transactionTable = document.getElementById('transaction-table-body');
      if (transactionTable) {
        renderTransactionTable('transaction-table-body', transactionHistory, transactionHistory.length);
      }
    });
  }
});
