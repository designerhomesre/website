/**
 * DESIGNER HOMES — Book storefront renderer (browser only)
 * Reads window.BOOKS_CONFIG (js/books-config.js) and renders the /books page.
 * No framework. Prices/entitlements are display-only here; the SERVER re-verifies
 * everything at checkout. Buttons are disabled until a product is purchasable.
 */
(function () {
  'use strict';
  var CFG = window.BOOKS_CONFIG;
  if (!CFG) { console.error('books-config.js failed to load'); return; }

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var byPath = function (obj, path) {
    return path.split('.').reduce(function (o, k) { return (o == null ? undefined : o[k]); }, obj);
  };
  var isPlaceholder = function (v) { return typeof v === 'string' && v.indexOf('__PLACEHOLDER__') !== -1; };
  var clean = function (v) { return isPlaceholder(v) ? v.replace('__PLACEHOLDER__', '').trim() : v; };
  var phTag = function (v) { return isPlaceholder(v) ? ' <span class="books-placeholder">Placeholder</span>' : ''; };

  // ---- 1. Fill [data-content] text nodes from config.content ----
  document.querySelectorAll('[data-content]').forEach(function (el) {
    var raw = byPath(CFG.content, el.getAttribute('data-content'));
    if (raw == null) return;
    el.innerHTML = esc(clean(raw)) + phTag(raw);
  });

  // ---- 2. Themes + workbook includes ----
  var themesEl = document.getElementById('synopsis-themes');
  if (themesEl && CFG.content.synopsis.themes) {
    themesEl.innerHTML = CFG.content.synopsis.themes.map(function (t) {
      return '<li class="books-chip">' + esc(clean(t)) + '</li>';
    }).join('');
  }
  var wbInc = document.getElementById('workbook-includes');
  if (wbInc && CFG.content.workbook.includes) {
    wbInc.innerHTML = CFG.content.workbook.includes.map(function (t) {
      return '<li>' + esc(clean(t)) + phTag(t) + '</li>';
    }).join('');
  }

  // ---- 3. Processing notice (exact required language) ----
  var proc = document.getElementById('books-processing-notice');
  if (proc) proc.textContent = CFG.store.processingNotice;

  // ---- 4. Product cards ----
  function stockBadge(p) {
    if (p.soldOut) return '<div class="books-stock books-stock--out">Sold out</div>';
    if (typeof p.inventory === 'number') {
      if (p.inventory <= 0) return p.allowBackorder
        ? '<div class="books-stock books-stock--low">Available on back-order</div>'
        : '<div class="books-stock books-stock--out">Sold out</div>';
      if (p.inventory <= CFG.store.lowInventoryThreshold)
        return '<div class="books-stock books-stock--low">Only ' + p.inventory + ' left</div>';
      return '<div class="books-stock books-stock--in">In stock</div>';
    }
    return '<div class="books-stock books-stock--in">Available to order</div>';
  }

  function priceHtml(p) {
    var price = CFG.formatPrice(p.priceCents);
    if (price && p.published) return '<div class="books-card-price">' + price + '</div>';
    return '<div class="books-card-price"><span class="bk-soon">Pricing coming soon</span></div>';
  }

  function includesHtml(p) {
    var items = (p.includes || []).map(function (x) {
      var digital = /pdf|e-book|ebook|digital/i.test(x);
      return '<li' + (digital ? ' class="bk-digital"' : '') + '>' + esc(x) + '</li>';
    });
    return '<ul class="books-includes">' + items.join('') + '</ul>';
  }

  function cardHtml(p) {
    var purchasable = CFG.isPurchasable(p);
    var featured = p.featured ? ' books-card--featured' : '';
    var cover = p.coverImage
      ? '<img src="' + esc(p.coverImage) + '" alt="' + esc(p.coverAlt || p.shortName) + '" width="300" height="200" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">' +
        '<span class="bk-ph" style="display:none;">Cover artwork<br>coming soon</span>'
      : '<span class="bk-ph">Cover artwork<br>coming soon</span>';

    var digitalNote = (p.entitlements && (p.entitlements.ebook || p.entitlements.workbookPdf))
      ? '<p class="books-shipnote">★ Includes complimentary digital bonus' +
        (p.entitlements.ebook && p.entitlements.workbookPdf ? 'es (e-book + fillable workbook PDF)' :
          (p.entitlements.ebook ? ' (e-book)' : ' (fillable workbook PDF)')) +
        ', delivered by email after purchase.</p>'
      : '';

    var shipLine = p.physical
      ? '<p class="books-shipnote">Ships from Durham, NC. ' + esc(CFG.store.processingNotice.split('.')[0]) + '.</p>'
      : '<p class="books-shipnote">Digital delivery by email after purchase.</p>';

    var btn = purchasable
      ? '<button class="btn btn-primary books-buy" data-product="' + esc(p.id) + '">Add to Order</button>'
      : '<button class="btn btn-primary" disabled aria-disabled="true" title="Not yet available for purchase">Coming Soon</button>';

    return '' +
      '<article class="books-card' + featured + '" aria-labelledby="prod-' + esc(p.id) + '">' +
        (p.badge ? '<p class="books-card-badge">' + esc(p.badge) + '</p>' : '') +
        '<div class="books-card-cover">' + cover + '</div>' +
        '<div class="books-card-body">' +
          '<span class="books-card-format">' + esc(p.format) + '</span>' +
          '<h3 class="books-card-name" id="prod-' + esc(p.id) + '">' + esc(clean(p.shortName || p.name)) + '</h3>' +
          priceHtml(p) +
          '<p class="books-card-desc">' + esc(clean(p.shortDescription)) + phTag(p.shortDescription) + '</p>' +
          includesHtml(p) +
          digitalNote +
          stockBadge(p) +
          (purchasable
            ? '<div class="books-qty"><label for="qty-' + esc(p.id) + '">Qty</label>' +
              '<input type="number" id="qty-' + esc(p.id) + '" min="1" max="20" value="1" inputmode="numeric"></div>'
            : '') +
          btn +
          shipLine +
        '</div>' +
      '</article>';
  }

  var grid = document.getElementById('books-products');
  if (grid) {
    // Featured (combo) first, then the rest in config order.
    var ordered = CFG.products.slice().sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); });
    grid.innerHTML = ordered.map(cardHtml).join('');
  }

  // ---- 5. FAQ accordion ----
  var faqEl = document.getElementById('books-faq');
  if (faqEl && CFG.faqs) {
    faqEl.innerHTML = CFG.faqs.map(function (f, i) {
      return '' +
        '<div class="books-faq-item">' +
          '<button class="books-faq-q" aria-expanded="false" aria-controls="faq-a-' + i + '" id="faq-q-' + i + '">' + esc(clean(f.q)) + '</button>' +
          '<div class="books-faq-a" id="faq-a-' + i + '" role="region" aria-labelledby="faq-q-' + i + '"><p>' + esc(clean(f.a)) + phTag(f.a) + '</p></div>' +
        '</div>';
    }).join('');
    faqEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.books-faq-q');
      if (!btn) return;
      var item = btn.parentElement;
      var open = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // ---- 6. Checkout wiring (server does the real work in Phase 2) ----
  if (grid) {
    grid.addEventListener('click', function (e) {
      var btn = e.target.closest('.books-buy');
      if (!btn) return;
      var id = btn.getAttribute('data-product');
      var qtyEl = document.getElementById('qty-' + id);
      var qty = Math.max(1, Math.min(20, parseInt(qtyEl && qtyEl.value, 10) || 1));
      startCheckout(id, qty, btn);
    });
  }

  function startCheckout(productId, qty, btn) {
    var original = btn.textContent;
    btn.disabled = true; btn.textContent = 'Redirecting…';
    // Send only product id + quantity. The server looks up the real price
    // and entitlements from books-config.js — the browser total is never trusted.
    fetch('/api/create-book-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ productId: productId, quantity: qty }] })
    }).then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.url) { window.location.href = data.url; }
        else { throw new Error(data && data.error ? data.error : 'Checkout unavailable'); }
      })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = original;
        alert('Sorry — checkout is not available yet. ' + (err.message || ''));
      });
  }

  // ---- 7. Structured data (Book) ----
  try {
    var memoir = CFG.getProduct('memoir-paperback');
    var offers = CFG.products.filter(CFG.isPurchasable).map(function (p) {
      return { '@type': 'Offer', name: clean(p.shortName), price: (p.priceCents / 100).toFixed(2),
        priceCurrency: 'USD', availability: 'https://schema.org/InStock' };
    });
    var ld = {
      '@context': 'https://schema.org', '@type': 'Book',
      name: clean(CFG.content.hero.headline),
      author: { '@type': 'Person', name: clean(CFG.content.hero.authorLine).replace(/^by\s+/i, '') },
      description: clean(CFG.content.synopsis.body).slice(0, 300)
    };
    if (offers.length) ld.offers = offers;
    var tag = document.getElementById('books-jsonld');
    if (tag) tag.textContent = JSON.stringify(ld);
  } catch (e) { /* non-fatal */ }
})();
