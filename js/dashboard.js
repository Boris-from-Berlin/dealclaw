/* ===== DEALCLAW DASHBOARD ===== */

(function() {
  'use strict';

  // ===== TAB SWITCHING =====
  var currentTab = 'overview';

  window.switchDashTab = function(tab) {
    currentTab = tab;
    // Update tab buttons
    document.querySelectorAll('.dash-tab').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    // Update panels
    document.querySelectorAll('.dash-panel').forEach(function(panel) {
      panel.classList.toggle('active', panel.id === 'panel-' + tab);
    });
    // Load panel data
    loadPanel(tab);
  };

  function loadPanel(tab) {
    switch(tab) {
      case 'overview': loadOverview(); break;
      case 'deals': loadTrades(); break;
      case 'trades': loadTrades(); break;
      case 'wallet': loadWallet(); break;
      case 'agent': loadAgent(); break;
      case 'settings': loadSettings(); break;
    }
  }

  // ===== TRANSLATION HELPER =====
  function t(key) {
    var lang = (typeof getPreferredLanguage === 'function') ? getPreferredLanguage() : 'en';
    var dict = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
    return dict[key] || (translations && translations.en && translations.en[key]) || key;
  }

  // ===== OVERVIEW =====
  function loadOverview() {
    var role = (typeof currentRole !== 'undefined') ? currentRole : (localStorage.getItem('dealclaw_role') || 'seller');
    DealClawAPI.getStats(role).then(function(stats) {
      var el = document.getElementById('overviewStats');
      if (!el) return;

      var html = '';
      if (role === 'seller') {
        html += '<div class="stat-card"><div class="stat-icon">&#x1F4E6;</div><div class="stat-value">' + (stats.listings || 0) + '</div><div class="stat-label">' + t('dashSellerListings') + '</div></div>';
        html += '<div class="stat-card"><div class="stat-icon">&#x1F4B5;</div><div class="stat-value">' + (stats.revenue || 0) + ' USD</div><div class="stat-label">' + t('dashSellerRevenue') + '</div></div>';
        html += '<div class="stat-card"><div class="stat-icon">&#x1F525;</div><div class="stat-value">' + (stats.activeDeals || 0) + '</div><div class="stat-label">' + t('dashSellerActiveDeals') + '</div></div>';
      } else {
        html += '<div class="stat-card"><div class="stat-icon">&#x1F6D2;</div><div class="stat-value">' + (stats.purchases || 0) + '</div><div class="stat-label">' + t('dashBuyerPurchases') + '</div></div>';
        html += '<div class="stat-card"><div class="stat-icon">&#x1F4B0;</div><div class="stat-value">' + (stats.savings || 0) + ' USD</div><div class="stat-label">' + t('dashBuyerSavings') + '</div></div>';
        html += '<div class="stat-card"><div class="stat-icon">&#x1F4E8;</div><div class="stat-value">' + (stats.openOffers || 0) + '</div><div class="stat-label">' + t('dashBuyerOpenOffers') + '</div></div>';
      }
      html += '<div class="stat-card"><div class="stat-icon">&#x2B50;</div><div class="stat-value">' + (stats.reputation || 0).toFixed(1) + '</div><div class="stat-label">' + t('dashReputation') + '</div></div>';
      el.innerHTML = html;
    });

    // Agent status
    DealClawAPI.getAgent().then(function(agent) {
      var el = document.getElementById('agentStatus');
      if (!el) return;
      el.innerHTML = '' +
        '<h3>' + t('dashAgentStatus') + '</h3>' +
        '<div class="agent-status-row"><span class="agent-status-label">' + t('dashAgentName') + '</span><span class="agent-status-value">' + (agent.name || 'MyDealBot') + '</span></div>' +
        '<div class="agent-status-row"><span class="agent-status-label">' + t('dashAgentMode') + '</span><span class="agent-status-value">' + (agent.mode || 'autonomous') + '</span></div>' +
        '<div class="agent-status-row"><span class="agent-status-label">' + t('dashBudget') + '</span><span class="agent-status-value">' + (agent.budget || 0) + ' USD</span></div>' +
        '<div class="agent-status-row"><span class="agent-status-label">' + t('dashReputation') + '</span><span class="agent-status-value">&#x2B50; ' + (agent.reputation || 0).toFixed(1) + '</span></div>';
    });

    // Recent activity
    DealClawAPI.getTrades().then(function(trades) {
      var el = document.getElementById('recentActivity');
      if (!el) return;
      var recent = trades.slice(-3).reverse();
      var html = '<h3>' + t('dashRecentActivity') + '</h3>';
      if (recent.length === 0) {
        html += '<div class="empty-state" style="padding:1rem;"><p>' + t('dashNoActivity') + '</p></div>';
      } else {
        recent.forEach(function(trade) {
          var icon = trade.type === 'buy' ? '&#x1F6D2;' : '&#x1F4E6;';
          var date = new Date(trade.date).toLocaleDateString();
          html += '<div class="activity-item">';
          html += '<div class="activity-icon">' + icon + '</div>';
          html += '<div class="activity-text"><div class="activity-title">' + trade.item + ' — ' + trade.price + ' USD</div>';
          html += '<div class="activity-time">' + date + '</div></div>';
          html += '</div>';
        });
      }
      el.innerHTML = html;
    });
  }

  // ===== TRADES =====
  var tradeFilter = 'all';

  window.filterTrades = function(filter) {
    tradeFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderTrades();
  };

  function loadTrades() {
    renderTrades();
  }

  function renderTrades() {
    DealClawAPI.getTrades().then(function(trades) {
      var filtered = trades;
      if (tradeFilter !== 'all') {
        filtered = trades.filter(function(t) { return t.status === tradeFilter; });
      }

      var el = document.getElementById('tradesList');
      if (!el) return;

      if (filtered.length === 0) {
        el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#x1F4CB;</div><h3>' + t('dashNoTrades') + '</h3><p>' + t('dashNoTradesDesc') + '</p><a href="/demo.html" class="btn btn-primary btn-sm mt-2">' + t('navTryDemo') + '</a></div>';
        return;
      }

      var html = '';
      filtered.reverse().forEach(function(trade) {
        var typeIcon = trade.type === 'buy' ? '&#x1F6D2;' : '&#x1F4E6;';
        var date = new Date(trade.date).toLocaleDateString();
        html += '<div class="trade-card">';
        html += '<div class="trade-info"><div class="trade-item-name">' + typeIcon + ' ' + trade.item + '</div>';
        html += '<div class="trade-meta">' + (trade.counterpart || '') + ' &middot; ' + date + '</div></div>';
        html += '<div class="trade-right"><div class="trade-price">' + trade.price + ' USD</div>';
        html += '<span class="trade-status ' + trade.status + '">' + trade.status + '</span></div>';
        html += '</div>';
      });
      el.innerHTML = html;
    });
  }

  // ===== WALLET =====
  function loadWallet() {
    DealClawAPI.getWallet().then(function(wallet) {
      var balEl = document.getElementById('walletBalance');
      if (balEl) {
        balEl.textContent = (wallet.balance || 0) + ' USD';
      }

      var txEl = document.getElementById('walletTransactions');
      if (!txEl) return;

      if (!wallet.transactions || wallet.transactions.length === 0) {
        txEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#x1F4B3;</div><h3>' + t('dashNoTransactions') + '</h3><p>' + t('dashNoTransactionsDesc') + '</p></div>';
        return;
      }

      var html = '';
      wallet.transactions.slice().reverse().forEach(function(tx) {
        var date = new Date(tx.date).toLocaleDateString();
        var cls = tx.type === 'credit' ? 'credit' : (tx.type === 'fee' ? 'fee' : 'debit');
        var prefix = tx.type === 'credit' ? '+' : '-';
        html += '<div class="tx-item">';
        html += '<div><div class="tx-desc">' + tx.desc + '</div><div class="tx-date">' + date + '</div></div>';
        html += '<div class="tx-amount ' + cls + '">' + prefix + tx.amount + ' USD</div>';
        html += '</div>';
      });
      txEl.innerHTML = html;
    });
  }

  // ===== AGENT CONFIG =====
  function loadAgent() {
    DealClawAPI.getAgent().then(function(agent) {
      var nameInput = document.getElementById('agentName');
      var budgetInput = document.getElementById('agentBudget');
      var modeSelect = document.getElementById('agentMode');

      if (nameInput) nameInput.value = agent.name || 'MyDealBot';
      if (budgetInput) budgetInput.value = agent.budget || 500;
      if (modeSelect) modeSelect.value = agent.mode || 'autonomous';

      // Categories
      var catEl = document.getElementById('agentCategories');
      if (catEl) {
        var cats = agent.categories || ['Electronics'];
        catEl.innerHTML = cats.map(function(c) {
          return '<span style="display:inline-block;padding:0.3rem 0.8rem;background:var(--accent-light);color:var(--accent);border-radius:20px;font-size:0.8rem;font-weight:600;margin:0.2rem;">' + c + '</span>';
        }).join('');
      }

      // Stats
      var repEl = document.getElementById('agentRepDisplay');
      if (repEl) repEl.textContent = '&#x2B50; ' + (agent.reputation || 0).toFixed(1);
      var tradesEl = document.getElementById('agentTradesDisplay');
      if (tradesEl) tradesEl.textContent = agent.totalTrades || 0;
    });
  }

  window.saveAgentConfig = function() {
    var name = document.getElementById('agentName').value;
    var budget = parseInt(document.getElementById('agentBudget').value) || 500;
    var mode = document.getElementById('agentMode').value;

    DealClawAPI.getAgent().then(function(agent) {
      agent.name = name;
      agent.budget = budget;
      agent.mode = mode;
      return DealClawAPI.saveAgent(agent);
    }).then(function() {
      var btn = document.getElementById('saveAgentBtn');
      if (btn) {
        btn.textContent = '&#x2705; ' + t('dashSaved');
        setTimeout(function() { btn.textContent = t('dashSaveAgent'); }, 2000);
      }
    });
  };

  // ===== SETTINGS =====
  function loadSettings() {
    var user = DealClawAuth.getUser();
    var emailEl = document.getElementById('settingsEmail');
    if (emailEl && user) emailEl.textContent = user.email;

    // Notification toggles
    var notifTrade = document.getElementById('notifTrade');
    var notifAgent = document.getElementById('notifAgent');
    if (notifTrade) {
      var prefs = JSON.parse(localStorage.getItem('dealclaw_notif_prefs') || '{"trade":true,"agent":true}');
      notifTrade.classList.toggle('on', prefs.trade);
      notifAgent.classList.toggle('on', prefs.agent);
    }
  }

  window.toggleNotif = function(type) {
    var prefs = JSON.parse(localStorage.getItem('dealclaw_notif_prefs') || '{"trade":true,"agent":true}');
    prefs[type] = !prefs[type];
    localStorage.setItem('dealclaw_notif_prefs', JSON.stringify(prefs));

    var el = document.getElementById(type === 'trade' ? 'notifTrade' : 'notifAgent');
    if (el) el.classList.toggle('on', prefs[type]);
  };

  // ===== INIT =====
  function initDashboard() {
    // Load initial tab
    loadOverview();

    // Show user email in header
    var user = DealClawAuth.getUser();
    var emailEl = document.getElementById('dashUserEmail');
    if (emailEl && user) emailEl.textContent = user.email;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
  } else {
    initDashboard();
  }

})();
