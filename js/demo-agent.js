/* ===== DEALCLAW DEMO AGENT — Scenario Engine ===== */

(function() {
  'use strict';

  // ===== STATE =====
  var state = {
    step: 0,
    mode: null,        // 'buy' or 'sell'
    query: '',
    budget: 500,
    selectedListing: null,
    finalPrice: 0,
    fee: 0,
    sellerReceives: 0,
    demoTrade: null
  };

  var TOTAL_STEPS = 8;

  // ===== DEMO DATA =====
  var listings = {
    buy: [
      { name: 'RTX 4090 24GB', seller: '@TechSeller42', price: 950, rating: 4.8 },
      { name: 'RTX 4090 ASUS ROG', seller: '@GPUKing', price: 1020, rating: 4.5 },
      { name: 'RTX 4090 FE', seller: '@CryptoMiner88', price: 870, rating: 4.2 }
    ],
    sell: [
      { name: 'MacBook Pro M3 Max', buyer: '@DevStartup', price: 1800, rating: 4.7 },
      { name: 'MacBook Pro M3 Max', buyer: '@DesignStudio', price: 1650, rating: 4.9 },
      { name: 'MacBook Pro M3 Max', buyer: '@RemoteWorker', price: 1720, rating: 4.4 }
    ]
  };

  // ===== DOM HELPERS =====
  var messagesEl, actionsEl, progressEl;

  function init() {
    messagesEl = document.getElementById('demoMessages');
    actionsEl = document.getElementById('demoActions');
    progressEl = document.getElementById('demoProgress');

    if (!messagesEl || !actionsEl || !progressEl) return;

    runStep(0);
  }

  function t(key) {
    var lang = (typeof getPreferredLanguage === 'function') ? getPreferredLanguage() : 'en';
    var dict = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
    return dict[key] || (translations && translations.en && translations.en[key]) || key;
  }

  function clearActions() {
    actionsEl.innerHTML = '';
  }

  function clearMessages() {
    messagesEl.innerHTML = '';
  }

  function updateProgress() {
    var steps = progressEl.querySelectorAll('.demo-progress-step');
    for (var i = 0; i < steps.length; i++) {
      steps[i].className = 'demo-progress-step';
      if (i < state.step) steps[i].classList.add('done');
      else if (i === state.step) steps[i].classList.add('active');
    }
    // Update step label
    var labelEl = document.getElementById('demoStepLabel');
    if (labelEl) {
      labelEl.textContent = t('demoStep') + ' ' + (state.step + 1) + '/' + TOTAL_STEPS;
    }
  }

  function scrollToBottom() {
    setTimeout(function() {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 50);
  }

  function addBotMsg(html, delay) {
    return new Promise(function(resolve) {
      // Show typing
      var typing = document.createElement('div');
      typing.className = 'typing-indicator';
      typing.innerHTML = '<span></span><span></span><span></span>';
      messagesEl.appendChild(typing);
      scrollToBottom();

      setTimeout(function() {
        typing.remove();
        var div = document.createElement('div');
        div.className = 'chat-msg bot';
        div.innerHTML = html;
        messagesEl.appendChild(div);
        scrollToBottom();
        resolve();
      }, delay || 800);
    });
  }

  function addUserMsg(text) {
    var div = document.createElement('div');
    div.className = 'chat-msg user';
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function addSystemMsg(text) {
    var div = document.createElement('div');
    div.className = 'chat-msg system';
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function showChoices(choices, callback) {
    clearActions();
    var wrapper = document.createElement('div');
    wrapper.className = 'demo-choices';
    choices.forEach(function(choice) {
      var btn = document.createElement('button');
      btn.className = 'demo-choice';
      btn.innerHTML = choice.label;
      btn.onclick = function() {
        wrapper.querySelectorAll('.demo-choice').forEach(function(b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        callback(choice.value);
      };
      wrapper.appendChild(btn);
    });
    actionsEl.appendChild(wrapper);
  }

  function showContinue(label, callback) {
    var btn = document.createElement('button');
    btn.className = 'demo-continue';
    btn.innerHTML = label || t('demoContinue');
    btn.onclick = function() {
      btn.disabled = true;
      callback();
    };
    actionsEl.appendChild(btn);
  }

  function showSlider(min, max, initial, labelKey, callback) {
    clearActions();
    var group = document.createElement('div');
    group.className = 'demo-slider-group';

    var labelRow = document.createElement('div');
    labelRow.className = 'demo-slider-label';
    labelRow.innerHTML = '<span>' + t(labelKey) + '</span><span class="demo-slider-value">' + initial + ' USD</span>';

    var slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'demo-slider';
    slider.min = min;
    slider.max = max;
    slider.value = initial;
    slider.step = 50;

    var valueEl = labelRow.querySelector('.demo-slider-value');
    slider.oninput = function() {
      valueEl.textContent = slider.value + ' USD';
    };

    group.appendChild(labelRow);
    group.appendChild(slider);
    actionsEl.appendChild(group);

    showContinue(t('demoContinue'), function() {
      callback(parseInt(slider.value));
    });
  }

  // ===== SCENARIO STEPS =====
  function runStep(step) {
    state.step = step;
    updateProgress();

    switch(step) {
      case 0: stepWelcome(); break;
      case 1: stepParameters(); break;
      case 2: stepSearch(); break;
      case 3: stepMatch(); break;
      case 4: stepNegotiate(); break;
      case 5: stepEscrow(); break;
      case 6: stepDelivery(); break;
      case 7: stepSummary(); break;
    }
  }

  // --- Step 0: Welcome ---
  function stepWelcome() {
    addBotMsg('&#x1F44B; ' + t('demoWelcome'), 500)
    .then(function() {
      return addBotMsg(t('demoWelcomeDesc'), 600);
    })
    .then(function() {
      showChoices([
        { label: '&#x1F6D2; ' + t('demoBuy'), value: 'buy' },
        { label: '&#x1F4E6; ' + t('demoSell'), value: 'sell' }
      ], function(mode) {
        state.mode = mode;
        addUserMsg(mode === 'buy' ? t('demoBuy') : t('demoSell'));
        setTimeout(function() { runStep(1); }, 400);
      });
    });
  }

  // --- Step 1: Parameters ---
  function stepParameters() {
    clearActions();
    if (state.mode === 'buy') {
      addBotMsg(t('demoParamBuy'), 600)
      .then(function() {
        addUserMsg(t('demoParamBuyQuery'));
        state.query = 'RTX 4090';
        return addBotMsg(t('demoParamBudget'), 600);
      })
      .then(function() {
        showSlider(200, 2000, 900, 'demoBudgetLabel', function(val) {
          state.budget = val;
          addUserMsg(val + ' USD');
          setTimeout(function() { runStep(2); }, 400);
        });
      });
    } else {
      addBotMsg(t('demoParamSell'), 600)
      .then(function() {
        addUserMsg(t('demoParamSellQuery'));
        state.query = 'MacBook Pro M3 Max';
        return addBotMsg(t('demoParamMinPrice'), 600);
      })
      .then(function() {
        showSlider(500, 3000, 1500, 'demoMinPriceLabel', function(val) {
          state.budget = val;
          addUserMsg(val + ' USD');
          setTimeout(function() { runStep(2); }, 400);
        });
      });
    }
  }

  // --- Step 2: Search ---
  function stepSearch() {
    clearActions();
    addBotMsg('&#x1F50D; ' + t('demoSearching'), 500)
    .then(function() {
      return new Promise(function(resolve) { setTimeout(resolve, 1200); });
    })
    .then(function() {
      addSystemMsg(t('demoSearchComplete'));
      var items = state.mode === 'buy' ? listings.buy : listings.sell;
      var html = '<strong>' + t('demoFoundListings').replace('{n}', items.length) + '</strong>';
      html += '<div class="demo-listings">';
      items.forEach(function(item, i) {
        var best = i === (state.mode === 'buy' ? 2 : 0);
        html += '<div class="demo-listing' + (best ? ' recommended' : '') + '" data-idx="' + i + '">';
        html += '<div class="demo-listing-info">';
        html += '<div class="demo-listing-name">' + item.name + (best ? '<span class="badge-rec">' + t('demoBestMatch') + '</span>' : '') + '</div>';
        html += '<div class="demo-listing-seller">' + (state.mode === 'buy' ? item.seller : item.buyer) + ' &#x2B50; ' + item.rating + '</div>';
        html += '</div>';
        html += '<div class="demo-listing-price">' + item.price + ' USD</div>';
        html += '</div>';
      });
      html += '</div>';
      return addBotMsg(html, 800);
    })
    .then(function() {
      showContinue(t('demoContinue'), function() { runStep(3); });
    });
  }

  // --- Step 3: Match ---
  function stepMatch() {
    clearActions();
    var items = state.mode === 'buy' ? listings.buy : listings.sell;
    var bestIdx = state.mode === 'buy' ? 2 : 0;
    var best = items[bestIdx];
    state.selectedListing = best;

    var counterpart = state.mode === 'buy' ? best.seller : best.buyer;
    addBotMsg('&#x2705; ' + t('demoMatchFound').replace('{name}', best.name).replace('{counterpart}', counterpart).replace('{price}', best.price), 600)
    .then(function() {
      return addBotMsg(t('demoMatchAsk'), 600);
    })
    .then(function() {
      showChoices([
        { label: '&#x1F91D; ' + t('demoNegotiate'), value: 'negotiate' },
        { label: '&#x26A1; ' + t('demoAcceptNow'), value: 'accept' }
      ], function(choice) {
        addUserMsg(choice === 'negotiate' ? t('demoNegotiate') : t('demoAcceptNow'));
        if (choice === 'accept') {
          state.finalPrice = state.selectedListing.price;
        }
        setTimeout(function() { runStep(4); }, 400);
      });
    });
  }

  // --- Step 4: Negotiate ---
  function stepNegotiate() {
    clearActions();
    var listing = state.selectedListing;
    var startPrice = listing.price;
    var targetPrice;

    if (state.mode === 'buy') {
      targetPrice = Math.round(startPrice * 0.93);
    } else {
      targetPrice = Math.round(startPrice * 1.05);
    }

    if (state.finalPrice) {
      // User chose accept-now
      addBotMsg(t('demoAccepted').replace('{price}', state.finalPrice), 600)
      .then(function() {
        state.fee = Math.round(state.finalPrice * 0.01);
        state.sellerReceives = state.finalPrice - state.fee;
        showContinue(t('demoContinue'), function() { runStep(5); });
      });
      return;
    }

    addBotMsg('&#x1F4AC; ' + t('demoNegotiating'), 600)
    .then(function() {
      return addNegotiationRound(1, startPrice, targetPrice);
    });
  }

  function addNegotiationRound(round, currentPrice, targetPrice) {
    var isBuy = state.mode === 'buy';
    var buyerName = isBuy ? t('demoYourAgent') : (state.selectedListing.buyer || '@Buyer');
    var sellerName = isBuy ? (state.selectedListing.seller || '@Seller') : t('demoYourAgent');

    return new Promise(function(resolve) {
      if (round === 1) {
        var offer1 = isBuy ? Math.round(currentPrice * 0.88) : Math.round(currentPrice * 1.08);
        var line1 = document.createElement('div');
        line1.className = 'negotiation-line';
        line1.innerHTML = '<span class="agent-name ' + (isBuy ? 'agent-buyer' : 'agent-seller') + '">' + (isBuy ? buyerName : sellerName) + ':</span> "' + t('demoOffer').replace('{price}', offer1) + '"';
        setTimeout(function() {
          messagesEl.appendChild(line1);
          scrollToBottom();

          var counter1 = isBuy ? Math.round(currentPrice * 0.96) : Math.round(currentPrice * 1.02);
          var line2 = document.createElement('div');
          line2.className = 'negotiation-line';
          line2.innerHTML = '<span class="agent-name ' + (isBuy ? 'agent-seller' : 'agent-buyer') + '">' + (isBuy ? sellerName : buyerName) + ':</span> "' + t('demoCounter').replace('{price}', counter1) + '"';

          setTimeout(function() {
            messagesEl.appendChild(line2);
            scrollToBottom();

            // Final agreement
            var agreed = targetPrice;
            setTimeout(function() {
              state.finalPrice = agreed;
              state.fee = Math.round(agreed * 0.01);
              state.sellerReceives = agreed - state.fee;
              addSystemMsg('&#x1F91D; ' + t('demoAgreed').replace('{price}', agreed));

              showContinue(t('demoContinue'), function() { runStep(5); });
              resolve();
            }, 800);
          }, 1000);
        }, 800);
      }
    });
  }

  // --- Step 5: Escrow ---
  function stepEscrow() {
    clearActions();
    addBotMsg('&#x1F512; ' + t('demoEscrowLocking'), 600)
    .then(function() {
      var walletHtml = '<div class="demo-wallet">';
      walletHtml += '<div class="demo-wallet-row"><span class="demo-wallet-label">' + t('demoTradeAmount') + '</span><span class="demo-wallet-value">' + state.finalPrice + ' USD</span></div>';
      walletHtml += '<div class="demo-wallet-row"><span class="demo-wallet-label">' + t('demoPlatformFee') + ' (1%)</span><span class="demo-wallet-value accent">' + state.fee + ' USD</span></div>';
      if (state.mode === 'buy') {
        walletHtml += '<div class="demo-wallet-row"><span class="demo-wallet-label">' + t('demoYouPay') + '</span><span class="demo-wallet-value">' + state.finalPrice + ' USD</span></div>';
      } else {
        walletHtml += '<div class="demo-wallet-row"><span class="demo-wallet-label">' + t('demoYouReceive') + '</span><span class="demo-wallet-value success">' + state.sellerReceives + ' USD</span></div>';
      }
      walletHtml += '</div>';
      return addBotMsg(walletHtml, 800);
    })
    .then(function() {
      return addBotMsg('&#x2705; ' + t('demoEscrowLocked'), 600);
    })
    .then(function() {
      showContinue(t('demoContinue'), function() { runStep(6); });
    });
  }

  // --- Step 6: Delivery ---
  function stepDelivery() {
    clearActions();
    addBotMsg('&#x1F4E6; ' + t('demoDeliveryStart'), 600)
    .then(function() {
      var progHtml = '<div class="delivery-progress"><div class="delivery-progress-bar" id="deliveryBar"></div></div>';
      progHtml += '<div style="font-size:0.8rem;color:var(--text-light);margin-top:0.3rem;">' + t('demoDeliveryTracking') + '</div>';
      return addBotMsg(progHtml, 500);
    })
    .then(function() {
      // Animate progress bar
      var bar = document.getElementById('deliveryBar');
      if (bar) {
        setTimeout(function() { bar.style.width = '30%'; }, 200);
        setTimeout(function() { bar.style.width = '65%'; }, 1000);
        setTimeout(function() { bar.style.width = '100%'; }, 1800);
      }
      return new Promise(function(resolve) { setTimeout(resolve, 2500); });
    })
    .then(function() {
      return addBotMsg(t('demoDeliveryArrived'), 500);
    })
    .then(function() {
      showChoices([
        { label: '&#x2705; ' + t('demoConfirmDelivery'), value: 'confirm' }
      ], function() {
        addUserMsg(t('demoConfirmDelivery'));
        addSystemMsg(t('demoDeliveryConfirmed'));
        setTimeout(function() { runStep(7); }, 600);
      });
    });
  }

  // --- Step 7: Summary ---
  function stepSummary() {
    clearActions();
    addBotMsg('&#x1F389; ' + t('demoComplete'), 600)
    .then(function() {
      var summaryHtml = '<div class="demo-summary">';
      summaryHtml += '<div class="demo-summary-header">';
      summaryHtml += '<h3>' + t('demoSummaryTitle') + '</h3>';
      summaryHtml += '<p>' + state.selectedListing.name + '</p>';
      summaryHtml += '</div>';
      summaryHtml += '<div class="demo-summary-stats">';
      summaryHtml += '<div class="demo-stat"><div class="demo-stat-value">' + state.finalPrice + ' USD</div><div class="demo-stat-label">' + t('demoFinalPrice') + '</div></div>';
      summaryHtml += '<div class="demo-stat"><div class="demo-stat-value">' + state.fee + ' USD</div><div class="demo-stat-label">' + t('demoPlatformFee') + '</div></div>';
      summaryHtml += '<div class="demo-stat"><div class="demo-stat-value">&#x2B50; +1</div><div class="demo-stat-label">' + t('demoReputation') + '</div></div>';
      summaryHtml += '<div class="demo-stat"><div class="demo-stat-value">&lt;2 min</div><div class="demo-stat-label">' + t('demoTotalTime') + '</div></div>';
      summaryHtml += '</div>';
      summaryHtml += '</div>';

      var div = document.createElement('div');
      div.className = 'chat-msg bot';
      div.innerHTML = summaryHtml;
      messagesEl.appendChild(div);
      scrollToBottom();

      // Save demo data to localStorage
      saveDemoData();

      // Show CTA buttons
      var ctaDiv = document.createElement('div');
      ctaDiv.className = 'demo-summary-cta';
      ctaDiv.style.padding = '1.5rem';

      var isLoggedIn = localStorage.getItem('dealclaw_token');
      if (isLoggedIn) {
        ctaDiv.innerHTML = '<a href="/dashboard.html" class="btn btn-primary" style="flex:1;text-align:center;">' + t('demoGoToDashboard') + '</a>';
      } else {
        ctaDiv.innerHTML = '<a href="/login.html" class="btn btn-primary" style="flex:1;text-align:center;">' + t('demoCreateAccount') + '</a>' +
          '<a href="/" class="btn btn-secondary" style="flex:1;text-align:center;">' + t('demoBackToHome') + '</a>';
      }
      actionsEl.appendChild(ctaDiv);

      // Restart option
      var restartBtn = document.createElement('button');
      restartBtn.className = 'btn btn-ghost btn-sm';
      restartBtn.style.width = '100%';
      restartBtn.style.marginTop = '0.5rem';
      restartBtn.innerHTML = '&#x1F504; ' + t('demoRestart');
      restartBtn.onclick = function() {
        state.step = 0;
        state.mode = null;
        state.query = '';
        state.budget = 500;
        state.selectedListing = null;
        state.finalPrice = 0;
        state.fee = 0;
        state.sellerReceives = 0;
        clearMessages();
        clearActions();
        runStep(0);
      };
      actionsEl.appendChild(restartBtn);
    });
  }

  // ===== SAVE DEMO DATA =====
  function saveDemoData() {
    var trade = {
      id: 'DEMO-' + Date.now(),
      type: state.mode,
      item: state.selectedListing.name,
      counterpart: state.mode === 'buy' ? state.selectedListing.seller : state.selectedListing.buyer,
      price: state.finalPrice,
      fee: state.fee,
      status: 'completed',
      date: new Date().toISOString()
    };
    state.demoTrade = trade;

    // Save trade
    var trades = JSON.parse(localStorage.getItem('dealclaw_demo_trades') || '[]');
    trades.push(trade);
    localStorage.setItem('dealclaw_demo_trades', JSON.stringify(trades));

    // Save wallet
    var wallet = JSON.parse(localStorage.getItem('dealclaw_demo_wallet') || '{"balance":1000,"transactions":[]}');
    if (state.mode === 'buy') {
      wallet.balance -= state.finalPrice;
      wallet.transactions.push({ type: 'debit', amount: state.finalPrice, desc: 'Purchased ' + trade.item, date: trade.date });
    } else {
      wallet.balance += state.sellerReceives;
      wallet.transactions.push({ type: 'credit', amount: state.sellerReceives, desc: 'Sold ' + trade.item, date: trade.date });
    }
    wallet.transactions.push({ type: 'fee', amount: state.fee, desc: 'Platform fee (1%)', date: trade.date });
    localStorage.setItem('dealclaw_demo_wallet', JSON.stringify(wallet));

    // Save agent config
    var agent = JSON.parse(localStorage.getItem('dealclaw_demo_agent') || 'null');
    if (!agent) {
      agent = {
        name: 'MyDealBot',
        budget: state.budget,
        categories: [state.mode === 'buy' ? 'Electronics' : 'Laptops'],
        mode: 'autonomous',
        reputation: 1,
        totalTrades: 0
      };
    }
    agent.totalTrades = (agent.totalTrades || 0) + 1;
    agent.reputation = Math.min(5, agent.reputation + 0.2);
    localStorage.setItem('dealclaw_demo_agent', JSON.stringify(agent));

    // Mark demo as completed
    localStorage.setItem('dealclaw_demo_completed', 'true');
  }

  // ===== INIT =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
