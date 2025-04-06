/**
 * Performance optimizations for Solana MEV Dashboard
 * Implements resource loading optimization and better rendering
 */

// Performance monitoring
const perfMetrics = {
  pageLoadStart: Date.now(),
  firstContentfulPaint: 0,
  domInteractive: 0,
  resourcesLoaded: 0,
  apiCallTimes: {},
  renderTimes: {}
};

// PerformanceObserver to monitor loading metrics
if (window.PerformanceObserver) {
  const perfObserver = new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
        perfMetrics.firstContentfulPaint = entry.startTime;
      }
    }
    updatePerformanceInfo();
  });
  
  perfObserver.observe({ entryTypes: ['paint', 'resource', 'navigation'] });
}

// Lazy loading for images and heavy components
function setupLazyLoading() {
  // Use native lazy loading for images
  document.querySelectorAll('img[data-src]').forEach(img => {
    img.setAttribute('loading', 'lazy');
    img.src = img.dataset.src;
  });
  
  // Use Intersection Observer for custom lazy components
  if (window.IntersectionObserver) {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          if (element.dataset.lazyComponent) {
            loadComponent(element.dataset.lazyComponent, element);
            observer.unobserve(element);
          }
        }
      });
    }, options);
    
    document.querySelectorAll('[data-lazy-component]').forEach(element => {
      observer.observe(element);
    });
  }
}

// Resource loading optimization
function optimizeResourceLoading() {
  // Preconnect to important domains
  const domains = ['fonts.googleapis.com', 'fonts.gstatic.com', 'api.coingecko.com'];
  
  domains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = `https://${domain}`;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
  
  // Preload critical resources
  const criticalResources = [
    { type: 'script', path: 'prices.js' },
    { type: 'style', path: 'styles.css' }
  ];
  
  criticalResources.forEach(resource => {
    const preload = document.createElement('link');
    preload.rel = 'preload';
    preload.href = resource.path;
    preload.as = resource.type;
    document.head.appendChild(preload);
  });
  
  // Defer non-critical scripts
  document.querySelectorAll('script[data-defer]').forEach(script => {
    script.defer = true;
  });
}

// Batch DOM updates for better performance
const batchUpdates = {
  queue: [],
  timeout: null,
  
  add(fn) {
    this.queue.push(fn);
    if (!this.timeout) {
      this.timeout = requestAnimationFrame(() => this.process());
    }
  },
  
  process() {
    const startTime = performance.now();
    
    // Execute all queued updates
    while (this.queue.length > 0) {
      const update = this.queue.shift();
      update();
    }
    
    this.timeout = null;
    const endTime = performance.now();
    console.debug(`Batch updates processed in ${(endTime - startTime).toFixed(2)}ms`);
  }
};

// Memory management - clean up unused event listeners and references
const cleanupRegistry = {
  listeners: [],
  
  register(element, eventType, handler) {
    element.addEventListener(eventType, handler);
    this.listeners.push({ element, eventType, handler });
    return handler;
  },
  
  unregisterByElement(element) {
    this.listeners = this.listeners.filter(item => {
      if (item.element === element) {
        item.element.removeEventListener(item.eventType, item.handler);
        return false;
      }
      return true;
    });
  },
  
  cleanup() {
    this.listeners.forEach(item => {
      item.element.removeEventListener(item.eventType, item.handler);
    });
    this.listeners = [];
  }
};

// Update performance info in the UI
function updatePerformanceInfo() {
  const perfInfoElement = document.getElementById('performance-metrics');
  if (!perfInfoElement) return;
  
  perfMetrics.domInteractive = Date.now() - perfMetrics.pageLoadStart;
  
  perfInfoElement.innerHTML = `
    <div class="text-xs text-purple-400 mt-1">
      <div>ინტერაქტიული ჩატვირთვა: ${perfMetrics.domInteractive}ms</div>
      <div>პირველი კონტენტი: ${perfMetrics.firstContentfulPaint}ms</div>
    </div>
  `;
}

// Cache commonly used data to minimize recalculations
const dataCache = {
  storage: new Map(),
  maxAge: 30000, // 30 seconds default TTL
  
  set(key, data, ttl = this.maxAge) {
    this.storage.set(key, {
      data,
      expires: Date.now() + ttl
    });
  },
  
  get(key) {
    const item = this.storage.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.storage.delete(key);
      return null;
    }
    
    return item.data;
  },
  
  invalidate(key) {
    this.storage.delete(key);
  },
  
  invalidateAll() {
    this.storage.clear();
  }
};

// Resource prioritization
function prioritizeResources() {
  // Delay low-priority resources
  document.querySelectorAll('[data-priority="low"]').forEach(element => {
    if (element.tagName === 'SCRIPT') {
      element.setAttribute('defer', '');
    } else if (element.tagName === 'LINK' && element.rel === 'stylesheet') {
      element.setAttribute('media', 'print');
      setTimeout(() => {
        element.setAttribute('media', 'all');
      }, 2000);
    }
  });
  
  // Load critical CSS inline
  const criticalCSS = `
    .glass { backdrop-filter: blur(10px); }
    .price-up { color: #10b981; }
    .price-down { color: #ef4444; }
  `;
  
  const styleElement = document.createElement('style');
  styleElement.textContent = criticalCSS;
  document.head.appendChild(styleElement);
}

// Initialize optimizations
document.addEventListener('DOMContentLoaded', function() {
  // Apply performance optimizations
  setupLazyLoading();
  optimizeResourceLoading();
  prioritizeResources();
  
  // Add performance monitoring panel
  const footer = document.querySelector('footer');
  if (footer) {
    const perfPanel = document.createElement('div');
    perfPanel.id = 'performance-metrics';
    perfPanel.className = 'text-xs text-gray-400 mt-2';
    perfPanel.textContent = 'მიმდინარეობს წარმადობის გაზომვა...';
    footer.appendChild(perfPanel);
  }
  
  // Register cleanup on page unload
  window.addEventListener('beforeunload', () => {
    cleanupRegistry.cleanup();
    dataCache.invalidateAll();
  });
  
  // Update performance metrics after 2 seconds
  setTimeout(updatePerformanceInfo, 2000);
  
  console.debug('Performance optimizations initialized');
});

// Expose utilities for other scripts
window.perfUtils = {
  batchUpdates,
  dataCache,
  cleanupRegistry,
  updatePerformanceInfo
};
