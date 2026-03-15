/* ===== DEALCLAW DEMO — AI Chat + MCP Simulation ===== */
/* Simulates the user's OWN AI assistant connected to DealClaw via MCP */

(function() {
  'use strict';

  // ===== HTML ESCAPE =====
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ===== STATE =====
  var state = {
    phase: 'welcome',
    mode: null,
    query: '',
    budget: 0,
    selectedListing: null,
    finalPrice: 0,
    fee: 0,
    sellerReceives: 0,
    paymentMethod: null,
    inputEnabled: false
  };

  // ===== DEMO DATA =====
  var listings = {
    buy: [
      {
        name: 'NVIDIA RTX 4090 24GB',
        seller: '@TechSeller42',
        price: 950,
        rating: 4.8,
        condition: 'Like New',
        desc: 'Used for 3 months only. Original box, all cables included. Well maintained, runs cool under load. Great for gaming or professional work.',
        specs: ['24GB GDDR6X', 'PCIe 4.0', '450W TDP'],
        img: 'img/gpu1.jpg',
        trades: 47,
        joined: 'Oct 2025'
      },
      {
        name: 'RTX 4090 ASUS ROG Strix',
        seller: '@GPUKing',
        price: 1020,
        rating: 4.5,
        condition: 'New',
        desc: 'Brand new, sealed. ROG Strix OC Edition with triple-fan cooler. EU warranty until 2028.',
        specs: ['24GB GDDR6X', 'OC Edition', '3x Fans'],
        img: 'img/gpu2.jpg',
        trades: 23,
        joined: 'Jan 2026'
      },
      {
        name: 'RTX 4090 Founders Edition',
        seller: '@HardwarePro88',
        price: 870,
        rating: 4.2,
        condition: 'Good',
        desc: 'Well maintained, cleaned regularly. Slight coil whine under heavy load. Thermal paste replaced last month.',
        specs: ['24GB GDDR6X', 'Reference Design', '2-Slot'],
        img: 'img/gpu3.jpg',
        trades: 89,
        joined: 'Aug 2025'
      }
    ],
    sell: [
      {
        name: 'MacBook Pro M3 Max',
        buyer: '@DevStartup',
        price: 1800,
        rating: 4.7,
        desc: 'Looking for 36GB+ RAM, good condition or better. Need for ML development. Fast closing preferred.',
        specs: ['36GB+ RAM', '1TB+ SSD', 'Space Black pref.'],
        img: 'img/macbook1.jpg',
        trades: 31,
        joined: 'Sep 2025'
      },
      {
        name: 'MacBook Pro M3 Max',
        buyer: '@DesignStudio',
        price: 1650,
        rating: 4.9,
        desc: 'Any storage size OK. Must have good display, no dead pixels. Will pay immediately upon verification.',
        specs: ['Any RAM', 'Good Display', 'Quick Payment'],
        img: 'img/macbook2.jpg',
        trades: 112,
        joined: 'Mar 2025'
      },
      {
        name: 'MacBook Pro M3 Max',
        buyer: '@RemoteWorker',
        price: 1720,
        rating: 4.4,
        desc: 'Need for video editing. Prefer 48GB model but 36GB also OK. Must include charger and original box.',
        specs: ['48GB pref.', 'w/ Charger', 'Original Box'],
        img: 'img/macbook3.jpg',
        trades: 8,
        joined: 'Jan 2026'
      }
    ]
  };

  // ===== DOM =====
  var messagesEl, suggestionsEl, inputEl, sendBtn;

  function init() {
    messagesEl = document.getElementById('demoMessages');
    suggestionsEl = document.getElementById('demoSuggestions');
    inputEl = document.getElementById('demoInput');
    sendBtn = document.getElementById('demoSend');
    if (!messagesEl || !inputEl) return;

    // Input handling
    sendBtn.addEventListener('click', handleSend);
    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });

    startDemo();
  }

  // ===== TRANSLATION =====
  function t(key) {
    var lang = (typeof getPreferredLanguage === 'function') ? getPreferredLanguage() : 'en';
    var dict = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
    return dict[key] || (translations && translations.en && translations.en[key]) || key;
  }

  // ===== SCROLL =====
  function scrollToBottom() {
    setTimeout(function() { messagesEl.scrollTop = messagesEl.scrollHeight; }, 60);
  }

  // ===== INPUT CONTROL =====
  function enableInput(placeholder) {
    state.inputEnabled = true;
    inputEl.disabled = false;
    sendBtn.disabled = false;
    if (placeholder) inputEl.placeholder = placeholder;
    inputEl.focus();
  }

  function disableInput() {
    state.inputEnabled = false;
    inputEl.disabled = true;
    sendBtn.disabled = true;
    inputEl.value = '';
  }

  // ===== MESSAGE HELPERS =====
  function addAiMsg(html, delay) {
    return new Promise(function(resolve) {
      var typing = document.createElement('div');
      typing.className = 'typing-indicator';
      typing.innerHTML = '<span></span><span></span><span></span>';
      messagesEl.appendChild(typing);
      scrollToBottom();

      setTimeout(function() {
        typing.remove();
        var div = document.createElement('div');
        div.className = 'chat-msg ai';
        div.innerHTML = html;
        messagesEl.appendChild(div);
        scrollToBottom();
        resolve();
      }, delay || 700);
    });
  }

  function addUserMsg(text) {
    var div = document.createElement('div');
    div.className = 'chat-msg user';
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function addToolCall(toolName, statusText, loading) {
    var div = document.createElement('div');
    div.className = 'tool-call' + (loading ? ' loading' : '');
    div.innerHTML = '<span class="tool-icon">\u2699\uFE0F</span>' +
      '<span class="tool-name">dealclaw:' + toolName + '</span>' +
      '<span class="tool-status">' + statusText + '</span>';
    messagesEl.appendChild(div);
    scrollToBottom();
    return div;
  }

  function updateToolCall(el, statusText) {
    el.classList.remove('loading');
    el.querySelector('.tool-status').textContent = statusText;
  }

  function addSystemMsg(text) {
    var div = document.createElement('div');
    div.className = 'chat-msg system';
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  // ===== SUGGESTIONS =====
  function showSuggestions(items) {
    suggestionsEl.innerHTML = '';
    items.forEach(function(item) {
      var btn = document.createElement('button');
      btn.className = 'demo-suggestion';
      btn.textContent = item.label;
      btn.onclick = function() {
        inputEl.value = item.text || item.label;
        handleSend();
      };
      suggestionsEl.appendChild(btn);
    });
  }

  function clearSuggestions() {
    suggestionsEl.innerHTML = '';
  }

  // ===== INPUT HANDLER =====
  function handleSend() {
    var text = inputEl.value.trim();
    if (!text || !state.inputEnabled) return;

    addUserMsg(text);
    disableInput();
    clearSuggestions();

    switch (state.phase) {
      case 'welcome':
        processWelcomeInput(text);
        break;
      case 'results':
        processResultsInput(text);
        break;
      case 'detail':
        processDetailInput(text);
        break;
      case 'payment':
        processPaymentInput(text);
        break;
      case 'confirm-delivery':
        processDeliveryInput(text);
        break;
      case 'summary':
        processRestartInput(text);
        break;
      default:
        break;
    }
  }

  // ===== DEMO FLOW =====
  function startDemo() {
    disableInput();
    state.phase = 'welcome';

    addAiMsg(t('demoAiWelcome'), 500)
    .then(function() {
      return addAiMsg(t('demoAiWelcomeDesc'), 600);
    })
    .then(function() {
      return addAiMsg(t('demoAiTryIt'), 500);
    })
    .then(function() {
      enableInput(t('demoInputPlaceholder'));
      showSuggestions([
        { label: t('demoSuggestBuy'), text: t('demoSuggestBuy') },
        { label: t('demoSuggestSell'), text: t('demoSuggestSell') },
        { label: t('demoSuggestMonitor'), text: t('demoSuggestMonitor') }
      ]);
    })
    .catch(function(err) {
      console.error('DealClaw Demo Error:', err);
      messagesEl.innerHTML = '<div class="chat-msg ai" style="color:var(--accent);">Demo failed to load. Please refresh with Ctrl+Shift+R.</div>';
      enableInput(t('demoInputPlaceholder'));
    });
  }

  function processWelcomeInput(text) {
    var lower = text.toLowerCase();
    // Detect buy or sell intent
    var isSell = lower.indexOf('sell') >= 0 || lower.indexOf('verkauf') >= 0 || lower.indexOf('vend') >= 0;
    state.mode = isSell ? 'sell' : 'buy';
    state.query = text;

    if (state.mode === 'buy') {
      // Extract budget if mentioned
      var priceMatch = text.match(/(\d[\d.,]*)\s*[\$\u20AC]/);
      if (!priceMatch) priceMatch = text.match(/under\s*(\d[\d.,]*)|unter\s*(\d[\d.,]*)|below\s*(\d[\d.,]*)/i);
      state.budget = priceMatch ? parseInt((priceMatch[1] || priceMatch[2] || priceMatch[3]).replace(/[.,]/g, '')) : 1000;
    } else {
      var minMatch = text.match(/(\d[\d.,]*)\s*[\$\u20AC]/);
      state.budget = minMatch ? parseInt(minMatch[1].replace(/[.,]/g, '')) : 1500;
    }

    doSearch();
  }

  // ===== SEARCH =====
  function doSearch() {
    state.phase = 'search';

    addAiMsg(t('demoAiSearching'), 500)
    .then(function() {
      var toolEl = addToolCall('search_listings', t('demoToolSearching'), true);
      return new Promise(function(resolve) {
        setTimeout(function() {
          updateToolCall(toolEl, '\u2713 ' + t('demoToolDone'));
          resolve();
        }, 1500);
      });
    })
    .then(function() {
      showResults();
    });
  }

  function showResults() {
    state.phase = 'results';
    var isBuy = state.mode === 'buy';
    var items = isBuy ? listings.buy : listings.sell;
    var bestIdx = isBuy ? 2 : 0;

    var html = t('demoAiFoundResults').replace('{n}', items.length);
    html += '<div class="demo-listings">';
    items.forEach(function(item, i) {
      html += buildListingCard(item, i, isBuy, i === bestIdx);
    });
    html += '</div>';

    addAiMsg(html, 600)
    .then(function() {
      return addAiMsg(t('demoAiAskInterest'), 500);
    })
    .then(function() {
      enableInput(t('demoInputBrowse'));
      showSuggestions([
        { label: t('demoSuggestDetail'), text: t('demoSuggestDetail') },
        { label: t('demoSuggestCompare'), text: t('demoSuggestCompare') },
        { label: t('demoSuggestOffer'), text: t('demoSuggestOffer') }
      ]);
    });
  }

  function processResultsInput(text) {
    var lower = text.toLowerCase();
    var isBuy = state.mode === 'buy';
    var items = isBuy ? listings.buy : listings.sell;
    var bestIdx = isBuy ? 2 : 0;

    // User wants to compare
    var wantsCompare = lower.indexOf('compare') >= 0 || lower.indexOf('vergleich') >= 0 ||
                       lower.indexOf('difference') >= 0 || lower.indexOf('unterschied') >= 0;
    if (wantsCompare) {
      doCompare(items, isBuy);
      return;
    }

    // User wants to see details or pick a specific one
    state.selectedListing = items[bestIdx];
    doShowDetail();
  }

  // ===== COMPARE =====
  function doCompare(items, isBuy) {
    var toolEl = addToolCall('get_listing', t('demoToolComparing'), true);

    new Promise(function(resolve) {
      setTimeout(function() {
        updateToolCall(toolEl, '\u2713 ' + t('demoToolDone'));
        resolve();
      }, 1000);
    })
    .then(function() {
      var html = '<table style="width:100%;font-size:0.78rem;border-collapse:collapse;margin:0.5rem 0;">';
      html += '<tr style="border-bottom:1px solid var(--border);font-weight:700;"><td style="padding:0.4rem 0.5rem;">' + t('demoCompName') + '</td>';
      items.forEach(function(item) {
        html += '<td style="padding:0.4rem 0.3rem;">' + item.name.split(' ').slice(-2).join(' ') + '</td>';
      });
      html += '</tr><tr style="border-bottom:1px solid var(--border);"><td style="padding:0.4rem 0.5rem;">' + t('demoCompPrice') + '</td>';
      items.forEach(function(item) {
        html += '<td style="padding:0.4rem 0.3rem;font-weight:700;color:var(--accent);">' + item.price + ' USD</td>';
      });
      html += '</tr><tr style="border-bottom:1px solid var(--border);"><td style="padding:0.4rem 0.5rem;">' + t('demoCompCondition') + '</td>';
      items.forEach(function(item) {
        html += '<td style="padding:0.4rem 0.3rem;">' + (item.condition || '-') + '</td>';
      });
      html += '</tr><tr><td style="padding:0.4rem 0.5rem;">' + t('demoCompSeller') + '</td>';
      items.forEach(function(item) {
        var cp = isBuy ? item.seller : item.buyer;
        html += '<td style="padding:0.4rem 0.3rem;">' + cp + ' \u2B50' + item.rating + '</td>';
      });
      html += '</tr></table>';
      return addAiMsg(html, 500);
    })
    .then(function() {
      var bestIdx = isBuy ? 2 : 0;
      var best = items[bestIdx];
      return addAiMsg(t('demoAiCompareResult').replace('{name}', best.name).replace('{price}', best.price), 500);
    })
    .then(function() {
      var bestIdx = isBuy ? 2 : 0;
      state.selectedListing = items[bestIdx];
      enableInput(t('demoInputDetail'));
      showSuggestions([
        { label: t('demoSuggestDetail'), text: t('demoSuggestDetail') },
        { label: t('demoSuggestOffer'), text: t('demoSuggestOffer') }
      ]);
    });
  }

  // ===== PRODUCT DETAIL =====
  function doShowDetail() {
    state.phase = 'detail';
    var item = state.selectedListing;
    var isBuy = state.mode === 'buy';
    var counterpart = isBuy ? item.seller : item.buyer;

    var toolEl = addToolCall('get_listing', item.name + '...', true);

    new Promise(function(resolve) {
      setTimeout(function() {
        updateToolCall(toolEl, '\u2713 ' + t('demoToolLoaded'));
        resolve();
      }, 800);
    })
    .then(function() {
      return addAiMsg(t('demoAiDetailIntro').replace('{name}', item.name).replace('{counterpart}', counterpart) + buildProductDetail(item, isBuy), 600);
    })
    .then(function() {
      return addAiMsg(t('demoAiDetailAsk'), 500);
    })
    .then(function() {
      enableInput(t('demoInputDecide'));
      showSuggestions([
        { label: t('demoSuggestOffer'), text: t('demoSuggestOffer') },
        { label: t('demoSuggestAccept'), text: t('demoSuggestAccept') },
        { label: t('demoSuggestAskSeller'), text: t('demoSuggestAskSeller') }
      ]);
    });
  }

  function buildProductDetail(item, isBuy) {
    var counterpart = isBuy ? item.seller : item.buyer;
    var html = '<div class="demo-product-detail">';
    html += '<div class="demo-product-hero">';
    html += '<img src="' + escapeHtml(item.img) + '" alt="' + escapeHtml(item.name) + '">';
    if (item.condition) html += '<span class="badge-condition badge-condition--' + escapeHtml(item.condition.toLowerCase().replace(/\s+/g, '')) + '">' + escapeHtml(item.condition) + '</span>';
    html += '</div>';
    html += '<div class="demo-product-info">';
    html += '<div class="demo-product-title">' + escapeHtml(item.name) + '</div>';
    html += '<div class="demo-product-price">' + escapeHtml(String(item.price)) + ' USD</div>';
    html += '<div class="demo-product-desc">' + escapeHtml(item.desc) + '</div>';
    html += '<div class="demo-listing-specs">';
    item.specs.forEach(function(spec) {
      html += '<span class="demo-spec-tag">' + escapeHtml(spec) + '</span>';
    });
    html += '</div>';
    html += '<div class="demo-product-seller">';
    html += '<div class="demo-product-seller-row">';
    html += '<span class="demo-product-seller-name">' + escapeHtml(counterpart) + '</span>';
    html += '<span class="demo-listing-rating">\u2B50 ' + escapeHtml(String(item.rating)) + '</span>';
    html += '</div>';
    html += '<div class="demo-product-seller-stats">';
    html += '<span>' + escapeHtml(String(item.trades)) + ' trades</span>';
    html += '<span>Joined ' + escapeHtml(item.joined) + '</span>';
    html += '</div></div></div></div>';
    return html;
  }

  function processDetailInput(text) {
    var lower = text.toLowerCase();

    // User asks the seller a question
    var asksQuestion = lower.indexOf('ask') >= 0 || lower.indexOf('frag') >= 0 ||
                       lower.indexOf('question') >= 0 || lower.indexOf('contact') >= 0 ||
                       lower.indexOf('kontakt') >= 0;
    if (asksQuestion) {
      doAskSeller();
      return;
    }

    // User accepts listed price
    var wantsAccept = lower.indexOf('accept') >= 0 || lower.indexOf('akzept') >= 0 ||
                      lower.indexOf('listed') >= 0 || lower.indexOf('listen') >= 0 ||
                      lower.indexOf('take') >= 0 || lower.indexOf('nehm') >= 0;
    if (wantsAccept) {
      state.finalPrice = state.selectedListing.price;
      doPaymentChoice();
      return;
    }

    // Default: negotiate
    doNegotiateFromDetail();
  }

  function doAskSeller() {
    var item = state.selectedListing;
    var isBuy = state.mode === 'buy';
    var counterpart = isBuy ? item.seller : item.buyer;

    var toolEl = addToolCall('send_message', counterpart + '...', true);

    new Promise(function(resolve) {
      setTimeout(function() {
        updateToolCall(toolEl, '\u2713 ' + t('demoToolMessageSent'));
        resolve();
      }, 1000);
    })
    .then(function() {
      return addAiMsg(t('demoAiSellerQuestion').replace('{counterpart}', counterpart), 600);
    })
    .then(function() {
      return new Promise(function(resolve) { setTimeout(resolve, 1500); });
    })
    .then(function() {
      return addAiMsg(t('demoAiSellerReply').replace('{counterpart}', counterpart), 700);
    })
    .then(function() {
      return addAiMsg(t('demoAiAfterReply'), 500);
    })
    .then(function() {
      enableInput(t('demoInputDecide'));
      showSuggestions([
        { label: t('demoSuggestOffer'), text: t('demoSuggestOffer') },
        { label: t('demoSuggestAccept'), text: t('demoSuggestAccept') }
      ]);
    });
  }

  // ===== PAYMENT CHOICE =====
  function doPaymentChoice() {
    state.phase = 'payment';
    state.fee = Math.round(state.finalPrice * 0.01);
    state.sellerReceives = state.finalPrice - state.fee;

    addAiMsg(t('demoAiPaymentAsk').replace('{price}', state.finalPrice), 500)
    .then(function() {
      enableInput(t('demoInputPayment'));
      showSuggestions([
        { label: 'ClawCoins', text: 'ClawCoins' },
        { label: 'PayPal', text: 'PayPal' },
        { label: t('demoSuggestCard'), text: t('demoSuggestCard') }
      ]);
    });
  }

  function processPaymentInput(text) {
    var lower = text.toLowerCase();
    if (lower.indexOf('paypal') >= 0) {
      state.paymentMethod = 'PayPal';
    } else if (lower.indexOf('card') >= 0 || lower.indexOf('karte') >= 0 || lower.indexOf('kredit') >= 0 || lower.indexOf('credit') >= 0) {
      state.paymentMethod = 'Credit Card';
    } else {
      state.paymentMethod = 'ClawCoins';
    }

    var toolEl = addToolCall('process_payment', state.paymentMethod + ' \u2192 ' + state.finalPrice + ' USD', true);

    new Promise(function(resolve) {
      setTimeout(function() {
        updateToolCall(toolEl, '\u2713 ' + t('demoToolPaymentOk'));
        resolve();
      }, 1200);
    })
    .then(function() {
      return addAiMsg(t('demoAiPaymentConfirm').replace('{method}', state.paymentMethod).replace('{price}', state.finalPrice), 500);
    })
    .then(function() {
      doEscrow();
    });
  }

  // Negotiate then go to payment
  function doNegotiateFromDetail() {
    state.phase = 'negotiate';
    var listing = state.selectedListing;
    var isBuy = state.mode === 'buy';
    var startPrice = listing.price;
    var myOffer = isBuy ? Math.round(startPrice * 0.88) : Math.round(startPrice * 1.08);
    var counterOffer = isBuy ? Math.round(startPrice * 0.96) : Math.round(startPrice * 1.02);
    var finalPrice = isBuy ? Math.round(startPrice * 0.93) : Math.round(startPrice * 1.05);

    addAiMsg(t('demoAiNegotiateStart'), 400)
    .then(function() {
      var toolEl = addToolCall('make_offer', myOffer + ' USD ...', true);
      return new Promise(function(resolve) {
        setTimeout(function() {
          updateToolCall(toolEl, '\u2713 ' + t('demoToolOfferSent'));
          resolve();
        }, 1200);
      });
    })
    .then(function() {
      var counterpart = isBuy ? listing.seller : listing.buyer;
      return addAiMsg(t('demoAiOfferSent').replace('{price}', myOffer).replace('{counterpart}', counterpart), 600);
    })
    .then(function() {
      var toolEl2 = addToolCall('check_negotiation', t('demoToolWaiting'), true);
      return new Promise(function(resolve) {
        setTimeout(function() {
          updateToolCall(toolEl2, '\u2713 ' + t('demoToolCounterReceived'));
          resolve();
        }, 1800);
      });
    })
    .then(function() {
      var counterpart = isBuy ? listing.seller : listing.buyer;
      return addAiMsg(t('demoAiCounterOffer').replace('{counterpart}', counterpart).replace('{price}', counterOffer), 500);
    })
    .then(function() {
      var toolEl3 = addToolCall('accept_trade', finalPrice + ' USD', true);
      return new Promise(function(resolve) {
        setTimeout(function() {
          updateToolCall(toolEl3, '\u2713 ' + t('demoToolDealClosed'));
          resolve();
        }, 1200);
      });
    })
    .then(function() {
      state.finalPrice = finalPrice;
      addSystemMsg('\u2705 ' + t('demoAiDealAgreed').replace('{price}', finalPrice));
      return addAiMsg(t('demoAiDealDone').replace('{price}', finalPrice), 500);
    })
    .then(function() {
      doPaymentChoice();
    });
  }

  // ===== ESCROW =====
  function doEscrow() {
    state.phase = 'escrow';

    var toolEl = addToolCall('get_trade_status', t('demoToolEscrow'), true);
    setTimeout(function() {
      updateToolCall(toolEl, '\u2713 ' + t('demoToolEscrowLocked'));
    }, 1000);

    new Promise(function(resolve) { setTimeout(resolve, 1200); })
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
      return addAiMsg(t('demoAiEscrowDone') + walletHtml, 600);
    })
    .then(function() {
      doDelivery();
    });
  }

  // ===== DELIVERY =====
  function doDelivery() {
    state.phase = 'delivery';

    addAiMsg(t('demoAiDeliveryStart'), 500)
    .then(function() {
      var toolEl = addToolCall('get_trade_status', t('demoToolTracking'), true);
      return new Promise(function(resolve) {
        setTimeout(function() {
          updateToolCall(toolEl, '\u2713 ' + t('demoToolShipped'));
          resolve();
        }, 1200);
      });
    })
    .then(function() {
      var progHtml = '<div class="delivery-progress"><div class="delivery-progress-bar" id="deliveryBar"></div></div>';
      return addAiMsg(t('demoAiDeliveryTracking') + progHtml, 400);
    })
    .then(function() {
      var bar = document.getElementById('deliveryBar');
      if (bar) {
        setTimeout(function() { bar.style.width = '35%'; }, 200);
        setTimeout(function() { bar.style.width = '70%'; }, 900);
        setTimeout(function() { bar.style.width = '100%'; }, 1600);
      }
      return new Promise(function(resolve) { setTimeout(resolve, 2200); });
    })
    .then(function() {
      addSystemMsg('\u{1F4E6} ' + t('demoAiArrived'));
      state.phase = 'confirm-delivery';
      return addAiMsg(t('demoAiConfirmAsk'), 500);
    })
    .then(function() {
      enableInput(t('demoInputConfirm'));
      showSuggestions([
        { label: t('demoSuggestConfirm'), text: t('demoSuggestConfirm') }
      ]);
    });
  }

  function processDeliveryInput(text) {
    var toolEl = addToolCall('confirm_delivery', '...', true);
    setTimeout(function() {
      updateToolCall(toolEl, '\u2713 ' + t('demoToolConfirmed'));
    }, 800);

    new Promise(function(resolve) { setTimeout(resolve, 1000); })
    .then(function() {
      addSystemMsg('\u2705 ' + t('demoDeliveryConfirmed'));
      doSummary();
    });
  }

  // ===== SUMMARY =====
  function doSummary() {
    state.phase = 'summary';

    addAiMsg(t('demoAiComplete'), 500)
    .then(function() {
      var summaryHtml = '<div class="demo-summary">';
      summaryHtml += '<div class="demo-summary-header">';
      summaryHtml += '<h3>' + t('demoSummaryTitle') + '</h3>';
      summaryHtml += '<p>' + state.selectedListing.name + '</p>';
      summaryHtml += '</div>';
      summaryHtml += '<div class="demo-summary-stats">';
      summaryHtml += '<div class="demo-stat"><div class="demo-stat-value">' + state.finalPrice + ' USD</div><div class="demo-stat-label">' + t('demoFinalPrice') + '</div></div>';
      summaryHtml += '<div class="demo-stat"><div class="demo-stat-value">' + state.fee + ' USD</div><div class="demo-stat-label">' + t('demoPlatformFee') + '</div></div>';
      summaryHtml += '<div class="demo-stat"><div class="demo-stat-value">\u2B50 +1</div><div class="demo-stat-label">' + t('demoReputation') + '</div></div>';
      summaryHtml += '<div class="demo-stat"><div class="demo-stat-value">&lt;2 min</div><div class="demo-stat-label">' + t('demoTotalTime') + '</div></div>';
      summaryHtml += '</div></div>';

      var div = document.createElement('div');
      div.className = 'chat-msg ai';
      div.innerHTML = summaryHtml;
      messagesEl.appendChild(div);
      scrollToBottom();

      saveDemoData();

      return addAiMsg(t('demoAiNextSteps'), 600);
    })
    .then(function() {
      // CTA
      var ctaHtml = '<div class="demo-cta">';
      var isLoggedIn = localStorage.getItem('dealclaw_token');
      if (isLoggedIn) {
        ctaHtml += '<a href="/dashboard.html" class="btn btn-primary">' + t('demoGoToDashboard') + '</a>';
      } else {
        ctaHtml += '<a href="/login.html" class="btn btn-primary">' + t('demoCreateAccount') + '</a>';
        ctaHtml += '<a href="/" class="btn btn-secondary">' + t('demoBackToHome') + '</a>';
      }
      ctaHtml += '</div>';

      var div = document.createElement('div');
      div.className = 'chat-msg ai';
      div.innerHTML = ctaHtml;
      messagesEl.appendChild(div);
      scrollToBottom();

      enableInput(t('demoInputRestart'));
      showSuggestions([
        { label: t('demoSuggestRestart'), text: t('demoSuggestRestart') }
      ]);
    });
  }

  function processRestartInput(text) {
    state.phase = 'welcome';
    state.mode = null;
    state.query = '';
    state.budget = 0;
    state.selectedListing = null;
    state.finalPrice = 0;
    state.fee = 0;
    state.sellerReceives = 0;
    state.paymentMethod = null;
    messagesEl.innerHTML = '';
    startDemo();
  }

  // ===== CARD BUILDERS =====
  function buildListingCard(item, i, isBuy, isBest) {
    var counterpart = isBuy ? item.seller : item.buyer;
    var html = '<div class="demo-listing-card' + (isBest ? ' recommended' : '') + '">';
    html += '<div class="demo-listing-img">';
    html += '<img src="' + escapeHtml(item.img) + '" alt="' + escapeHtml(item.name) + '" loading="lazy">';
    if (isBest) html += '<span class="badge-rec">' + t('demoBestMatch') + '</span>';
    if (item.condition) html += '<span class="badge-condition badge-condition--' + escapeHtml(item.condition.toLowerCase().replace(/\s+/g, '')) + '">' + escapeHtml(item.condition) + '</span>';
    html += '</div>';
    html += '<div class="demo-listing-content">';
    html += '<div class="demo-listing-header">';
    html += '<div class="demo-listing-name">' + escapeHtml(item.name) + '</div>';
    html += '<div class="demo-listing-price">' + escapeHtml(String(item.price)) + ' USD</div>';
    html += '</div>';
    html += '<div class="demo-listing-desc">' + escapeHtml(item.desc) + '</div>';
    html += '<div class="demo-listing-specs">';
    item.specs.forEach(function(spec) {
      html += '<span class="demo-spec-tag">' + escapeHtml(spec) + '</span>';
    });
    html += '</div>';
    html += '<div class="demo-listing-meta">';
    html += '<span class="demo-listing-seller">' + escapeHtml(counterpart) + '</span>';
    html += '<span class="demo-listing-rating">\u2B50 ' + escapeHtml(String(item.rating)) + '</span>';
    html += '<span class="demo-listing-trades">' + escapeHtml(String(item.trades)) + ' trades</span>';
    html += '</div></div></div>';
    return html;
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
    var trades = JSON.parse(localStorage.getItem('dealclaw_demo_trades') || '[]');
    trades.push(trade);
    localStorage.setItem('dealclaw_demo_trades', JSON.stringify(trades));
    localStorage.setItem('dealclaw_demo_completed', 'true');
  }

  // ===== INIT =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
