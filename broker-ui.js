/**
 * Broker UI - მოდული საბროკეროების ინტერფეისისთვის Solana MEV Dashboard-ზე
 * აკავშირებს brokers.js მოდულს დაშბორდის ვიზუალურ ელემენტებთან
 */

// DOM ელემენტების კეში
const brokerUI = {
  // DOM ელემენტების მისამართები
  elements: {
    // სელექტები
    tokenPairSelect: document.getElementById('broker-token-pair'),
    
    // ყიდვის მხარე
    bestBuyDexEl: document.getElementById('best-buy-dex'),
    bestBuyPriceEl: document.getElementById('best-buy-price'),
    bestBuyFeeEl: document.getElementById('best-buy-fee'),
    bestBuyGasEl: document.getElementById('best-buy-gas'),
    bestBuyMinEl: document.getElementById('best-buy-min'),
    
    // გაყიდვის მხარე
    bestSellDexEl: document.getElementById('best-sell-dex'),
    bestSellPriceEl: document.getElementById('best-sell-price'),
    bestSellFeeEl: document.getElementById('best-sell-fee'),
    bestSellGasEl: document.getElementById('best-sell-gas'),
    bestSellMinEl: document.getElementById('best-sell-min'),
    
    // არბიტრაჟის პანელი
    arbProfitPercentEl: document.getElementById('arb-profit-percent'),
    arbBuyDexEl: document.getElementById('arb-buy-dex'),
    arbSellDexEl: document.getElementById('arb-sell-dex'),
    arbMinAmountEl: document.getElementById('arb-min-amount'),
    arbNetProfitEl: document.getElementById('arb-net-profit'),
    executeArbButton: document.getElementById('execute-arbitrage'),
    
    // გაზის სტატუსის პანელი
    gasStatusEl: document.getElementById('gas-status'),
    avgSavingsEl: document.getElementById('avg-savings'),
    lastUpdateEl: document.getElementById('broker-last-update')
  },
  
  // მიმდინარე სელექტირებული წყვილი
  currentPair: 'SOL_USDC',
  
  // კეშირებული ინფორმაცია
  cache: {
    recommendations: {},
    lastUpdate: 0
  },
  
  // ინტერფეისის ინიციალიზაცია
  initialize() {
    console.log('Initializing broker UI module...');
    
    // ელემენტების რეფერენსების ინიციალიზაცია
    this.cacheElements();
    
    // მოვუსმინოთ წყვილის ცვლილებას
    if (this.elements.tokenPairSelect) {
      this.elements.tokenPairSelect.addEventListener('change', () => {
        this.currentPair = this.elements.tokenPairSelect.value;
        this.updateBrokerUI(this.currentPair);
      });
    }
    
    // მოვუსმინოთ არბიტრაჟის ღილაკს
    if (this.elements.executeArbButton) {
      this.elements.executeArbButton.addEventListener('click', () => {
        this.executeArbitrage();
      });
    }
    
    // მოვუსმინოთ ახალი არბიტრაჟის შესაძლებლობის მოვლენას
    window.addEventListener('broker-arbitrage-opportunity', (event) => {
      if (event.detail) {
        // განვაახლოთ ინტერფეისი, თუ ეს შესაძლებლობა არის ჩვენთვის საინტერესო წყვილისთვის
        if (event.detail.pair === this.currentPair) {
          this.highlightOpportunity(event.detail);
        }
        
        // შეტყობინების ჩვენება მნიშვნელოვანი შესაძლებლობისთვის
        if (parseFloat(event.detail.profitPercent) > 1.0) {
          this.showNotification(`${event.detail.baseToken}/${event.detail.quoteToken} - ${event.detail.profitPercent}% მოგება`);
        }
      }
    });
    
    // საწყისი განახლება
    this.updateBrokerUI(this.currentPair);
    
    // პერიოდული განახლება ყოველ 30 წამში
    setInterval(() => {
      this.updateBrokerUI(this.currentPair);
    }, 30 * 1000);
    
    return true;
  },
  
  // DOM ელემენტების ხელახლა შენახვა
  cacheElements() {
    this.elements = {
      // სელექტები
      tokenPairSelect: document.getElementById('broker-token-pair'),
      
      // ყიდვის მხარე
      bestBuyDexEl: document.getElementById('best-buy-dex'),
      bestBuyPriceEl: document.getElementById('best-buy-price'),
      bestBuyFeeEl: document.getElementById('best-buy-fee'),
      bestBuyGasEl: document.getElementById('best-buy-gas'),
      bestBuyMinEl: document.getElementById('best-buy-min'),
      
      // გაყიდვის მხარე
      bestSellDexEl: document.getElementById('best-sell-dex'),
      bestSellPriceEl: document.getElementById('best-sell-price'),
      bestSellFeeEl: document.getElementById('best-sell-fee'),
      bestSellGasEl: document.getElementById('best-sell-gas'),
      bestSellMinEl: document.getElementById('best-sell-min'),
      
      // არბიტრაჟის პანელი
      arbProfitPercentEl: document.getElementById('arb-profit-percent'),
      arbBuyDexEl: document.getElementById('arb-buy-dex'),
      arbSellDexEl: document.getElementById('arb-sell-dex'),
      arbMinAmountEl: document.getElementById('arb-min-amount'),
      arbNetProfitEl: document.getElementById('arb-net-profit'),
      executeArbButton: document.getElementById('execute-arbitrage'),
      
      // გაზის სტატუსის პანელი
      gasStatusEl: document.getElementById('gas-status'),
      avgSavingsEl: document.getElementById('avg-savings'),
      lastUpdateEl: document.getElementById('broker-last-update')
    };
  },
  
  // ინტერფეისის განახლება კონკრეტული წყვილისთვის
  updateBrokerUI(pairKey) {
    console.log(`Updating broker UI for ${pairKey}...`);
    
    // შევამოწმოთ, თუ ბროკერების სერვისი ხელმისაწვდომია
    if (!window.brokerService) {
      console.warn('Broker service not available yet');
      setTimeout(() => this.updateBrokerUI(pairKey), 1000);
      return;
    }
    
    // კეშირება და წყვილების დავალიდურება
    const [baseToken, quoteToken] = pairKey.split('_');
    
    // გავანახლოთ გაზის მდგომარეობა
    this.updateGasStatus();
    
    // მივიღოთ საუკეთესო რეკომენდაციები ამ წყვილისთვის
    const recommendation = window.brokerService.getBestDexRecommendation(baseToken, quoteToken);
    
    if (!recommendation) {
      console.warn(`No recommendation available for ${pairKey}`);
      return;
    }
    
    // კეშირება
    this.cache.recommendations[pairKey] = recommendation;
    this.cache.lastUpdate = Date.now();
    
    // განვაახლოთ ინტერფეისი ახალი მონაცემებით
    this.renderRecommendation(recommendation);
    
    // განვაახლოთ ბოლო განახლების დრო
    this.updateLastUpdateTime();
    
    return recommendation;
  },
  
  // საუკეთესო საბროკეროების რეკომენდაციების ჩვენება ინტერფეისზე
  renderRecommendation(recommendation) {
    // ყიდვის მხარე
    if (this.elements.bestBuyDexEl) {
      this.elements.bestBuyDexEl.textContent = recommendation.bestBuy.dex;
    }
    
    if (this.elements.bestBuyPriceEl) {
      const [baseToken, quoteToken] = recommendation.pair.split('_');
      this.elements.bestBuyPriceEl.textContent = `${recommendation.bestBuy.price} ${quoteToken}`;
    }
    
    if (this.elements.bestBuyFeeEl) {
      this.elements.bestBuyFeeEl.textContent = recommendation.bestBuy.fee;
    }
    
    if (this.elements.bestBuyGasEl) {
      this.elements.bestBuyGasEl.textContent = `${recommendation.bestBuy.gas} SOL`;
    }
    
    if (this.elements.bestBuyMinEl) {
      const [baseToken, quoteToken] = recommendation.pair.split('_');
      this.elements.bestBuyMinEl.textContent = `0.01 ${baseToken}`;
    }
    
    // გაყიდვის მხარე
    if (this.elements.bestSellDexEl) {
      this.elements.bestSellDexEl.textContent = recommendation.bestSell.dex;
    }
    
    if (this.elements.bestSellPriceEl) {
      const [baseToken, quoteToken] = recommendation.pair.split('_');
      this.elements.bestSellPriceEl.textContent = `${recommendation.bestSell.price} ${quoteToken}`;
    }
    
    if (this.elements.bestSellFeeEl) {
      this.elements.bestSellFeeEl.textContent = recommendation.bestSell.fee;
    }
    
    if (this.elements.bestSellGasEl) {
      this.elements.bestSellGasEl.textContent = `${recommendation.bestSell.gas} SOL`;
    }
    
    if (this.elements.bestSellMinEl) {
      const [baseToken, quoteToken] = recommendation.pair.split('_');
      this.elements.bestSellMinEl.textContent = `0.1 ${baseToken}`;
    }
    
    // საშუალო დანაზოგი
    if (this.elements.avgSavingsEl) {
      this.elements.avgSavingsEl.textContent = recommendation.averageSavings;
    }
    
    // არბიტრაჟის პანელი
    if (recommendation.bestArbitrage) {
      this.renderArbitragePanel(recommendation);
    } else {
      this.hideArbitragePanel();
    }
  },
  
  // არბიტრაჟის პანელის ჩვენება
  renderArbitragePanel(recommendation) {
    const arb = recommendation.bestArbitrage;
    
    if (!arb) return;
    
    // აქტიური არბიტრაჟის ინფორმაცია
    if (this.elements.arbProfitPercentEl) {
      this.elements.arbProfitPercentEl.textContent = `+${arb.profitPercent}`;
    }
    
    if (this.elements.arbBuyDexEl) {
      this.elements.arbBuyDexEl.textContent = arb.buyDex;
    }
    
    if (this.elements.arbSellDexEl) {
      this.elements.arbSellDexEl.textContent = arb.sellDex;
    }
    
    if (this.elements.arbMinAmountEl) {
      const [baseToken, quoteToken] = recommendation.pair.split('_');
      this.elements.arbMinAmountEl.textContent = `${arb.minAmount} ${baseToken}`;
    }
    
    if (this.elements.arbNetProfitEl) {
      this.elements.arbNetProfitEl.textContent = arb.profitPercent;
    }
    
    // გამოვაჩინოთ პანელი
    const panel = document.getElementById('arbitrage-opportunity-panel');
    if (panel) {
      panel.style.display = 'block';
    }
    
    // განვაახლოთ ღილაკის მდგომარეობა
    if (this.elements.executeArbButton) {
      const profitPercent = parseFloat(arb.profitPercent);
      
      if (profitPercent < 0.5) {
        this.elements.executeArbButton.disabled = true;
        this.elements.executeArbButton.classList.add('opacity-50');
        this.elements.executeArbButton.textContent = 'მოგება ძალიან დაბალია';
      } else {
        this.elements.executeArbButton.disabled = false;
        this.elements.executeArbButton.classList.remove('opacity-50');
        this.elements.executeArbButton.textContent = 'შესრულება';
      }
    }
  },
  
  // არბიტრაჟის პანელის დამალვა
  hideArbitragePanel() {
    const panel = document.getElementById('arbitrage-opportunity-panel');
    if (panel) {
      panel.style.display = 'none';
    }
  },
  
  // გაზის მდგომარეობის განახლება
  updateGasStatus() {
    if (!window.brokerService || !window.brokerService.gasOptimization) {
      return;
    }
    
    const gasStatus = window.brokerService.gasOptimization;
    
    // განვსაზღვროთ ფერი და ტექსტი
    let gasStatusText, gasStatusColor;
    
    switch(gasStatus.congestionLevel) {
      case 'low':
        gasStatusText = 'დაბალი';
        gasStatusColor = 'text-green-400';
        break;
      case 'high':
        gasStatusText = 'მაღალი - მომატებულია';
        gasStatusColor = 'text-red-400';
        break;
      default:
        gasStatusText = 'ნორმალური';
        gasStatusColor = 'text-blue-400';
    }
    
    // განვაახლოთ გაზის მდგომარეობის ელემენტი
    if (this.elements.gasStatusEl) {
      this.elements.gasStatusEl.textContent = gasStatusText;
      
      // წავშალოთ ძველი კლასები და დავამატოთ ახალი
      this.elements.gasStatusEl.className = 'text-sm font-medium';
      this.elements.gasStatusEl.classList.add(gasStatusColor);
    }
  },
  
  // ბოლო განახლების დროის განახლება
  updateLastUpdateTime() {
    if (!this.elements.lastUpdateEl) return;
    
    const now = Date.now();
    const lastUpdate = this.cache.lastUpdate;
    const diffSeconds = Math.floor((now - lastUpdate) / 1000);
    
    let timeText;
    
    if (diffSeconds < 5) {
      timeText = 'ახლახანს';
    } else if (diffSeconds < 60) {
      timeText = `${diffSeconds} წმ წინ`;
    } else {
      const diffMinutes = Math.floor(diffSeconds / 60);
      timeText = `${diffMinutes} წთ წინ`;
    }
    
    this.elements.lastUpdateEl.textContent = timeText;
  },
  
  // არბიტრაჟის შესრულება
  executeArbitrage() {
    console.log('Executing arbitrage opportunity...');
    
    // მივიღოთ მიმდინარე წყვილის რეკომენდაცია
    const recommendation = this.cache.recommendations[this.currentPair];
    
    if (!recommendation || !recommendation.bestArbitrage) {
      console.warn('No valid arbitrage opportunity available');
      this.showNotification('არ არსებობს აქტიური არბიტრაჟის შესაძლებლობა', 'error');
      return;
    }
    
    const arb = recommendation.bestArbitrage;
    const [baseToken, quoteToken] = this.currentPair.split('_');
    
    // არბიტრაჟის შესრულების სიმულაცია
    this.showNotification('არბიტრაჟის შესრულება...', 'info');
    
    // თუ ტრანზაქციების ძრავა არსებობს, გამოვიყენოთ ის
    if (window.transactionsEngine) {
      // მინიმალური თანხის გამოთვლა
      const minAmount = parseFloat(arb.minAmount);
      // დავამრგვალოთ მინიმალურ თანხას დამატებული ბუფერი
      const amount = Math.ceil(minAmount * 1.2 * 100) / 100;
      
      const opportunity = {
        id: `manual_arb_${Date.now()}`,
        pair: this.currentPair,
        baseToken: baseToken,
        quoteToken: quoteToken,
        buyDex: arb.buyDex.toLowerCase(),
        sellDex: arb.sellDex.toLowerCase(),
        amount: amount,
        expectedProfitPercent: parseFloat(arb.profitPercent),
        source: 'manual',
        timestamp: Date.now()
      };
      
      // შევასრულოთ ტრანზაქცია
      window.transactionsEngine.executeOpportunity(opportunity)
        .then(result => {
          if (result.success) {
            this.showNotification(`არბიტრაჟი წარმატებით შესრულდა! მოგება: ${result.profit} ${baseToken}`, 'success');
            
            // განვაახლოთ ინტერფეისი გარკვეული დაყოვნების შემდეგ
            setTimeout(() => {
              this.updateBrokerUI(this.currentPair);
            }, 2000);
          } else {
            this.showNotification(`შეცდომა შესრულებისას: ${result.error}`, 'error');
          }
        })
        .catch(error => {
          console.error('Error executing arbitrage:', error);
          this.showNotification('შეცდომა არბიტრაჟის შესრულებისას', 'error');
        });
    } else {
      // სიმულირებული შესრულება, თუ ტრანზაქციების ძრავა არ არსებობს
      setTimeout(() => {
        const success = Math.random() > 0.2; // 80% წარმატების შანსი
        
        if (success) {
          const profit = (parseFloat(arb.profitPercent) * 10).toFixed(3);
          this.showNotification(`არბიტრაჟი წარმატებით შესრულდა! მოგება: ${profit} ${baseToken}`, 'success');
        } else {
          this.showNotification('შეცდომა არბიტრაჟის შესრულებისას: ბაზრის პირობები შეიცვალა', 'error');
        }
        
        // განვაახლოთ ინტერფეისი
        this.updateBrokerUI(this.currentPair);
      }, 1500);
    }
  },
  
  // მნიშვნელოვანი არბიტრაჟის შესაძლებლობების ხაზგასმა
  highlightOpportunity(opportunity) {
    console.log('Highlighting new opportunity:', opportunity);
    
    // თუ პანელი არ ჩანს, გამოვაჩინოთ
    const panel = document.getElementById('arbitrage-opportunity-panel');
    if (panel) {
      panel.style.display = 'block';
    }
    
    // ვიზუალური ეფექტი ახალი შესაძლებლობისთვის
    panel.classList.add('animate-pulse');
    
    // გარკვეული დროის შემდეგ ეფექტის მოხსნა
    setTimeout(() => {
      panel.classList.remove('animate-pulse');
    }, 2000);
    
    // რეკომენდაციების განახლება
    const [baseToken, quoteToken] = opportunity.pair.split('_');
    this.updateBrokerUI(opportunity.pair);
  },
  
  // შეტყობინების ჩვენება
  showNotification(message, type = 'info') {
    console.log(`Notification (${type}): ${message}`);
    
    // ფერის გამოთვლა ტიპის მიხედვით
    let bgColor, textColor;
    
    switch(type) {
      case 'success':
        bgColor = 'bg-green-500';
        textColor = 'text-white';
        break;
      case 'error':
        bgColor = 'bg-red-500';
        textColor = 'text-white';
        break;
      case 'warning':
        bgColor = 'bg-yellow-500';
        textColor = 'text-gray-900';
        break;
      default:
        bgColor = 'bg-blue-500';
        textColor = 'text-white';
    }
    
    // შეტყობინების ელემენტის შექმნა
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${bgColor} ${textColor} px-4 py-3 rounded-lg shadow-lg z-50 transition-all duration-500 transform translate-x-full opacity-0`;
    notification.innerHTML = `
      <div class="flex items-center">
        <span class="mr-2">${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
        <span>${message}</span>
      </div>
    `;
    
    // შეტყობინების დამატება დოკუმენტში
    document.body.appendChild(notification);
    
    // ანიმაციის დამატება
    setTimeout(() => {
      notification.classList.remove('translate-x-full', 'opacity-0');
    }, 10);
    
    // შეტყობინების გაქრობა გარკვეული დროის შემდეგ
    setTimeout(() => {
      notification.classList.add('translate-x-full', 'opacity-0');
      
      // ელემენტის წაშლა ანიმაციის დასრულების შემდეგ
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, 4000);
  }
};

// მოდულის ინიციალიზაცია გვერდის ჩატვირთვისას
document.addEventListener('DOMContentLoaded', function() {
  // გვერდის ჩატვირთვის 1.5 წამის შემდეგ ინიციალიზაცია brokers.js-ის დასრულების შემდეგ
  setTimeout(() => {
    brokerUI.initialize();
    
    // მოდულის მიბმა გლობალურ ობიექტზე
    window.brokerUI = brokerUI;
    
    console.log('Broker UI module initialized');
  }, 1500);
});
