/* ============================================================
   ITALIA DESIGN — THEME JS
   ============================================================ */

'use strict';

/* ---- Sticky Header ---- */
(function () {
  const header = document.querySelector('.site-header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });
})();

/* ---- Transparent Header scroll effect ---- */
(function () {
  const header = document.querySelector('.site-header--transparent');
  if (!header) return;
  const update = () => header.classList.toggle('scrolled', window.scrollY > 10);
  update();
  window.addEventListener('scroll', update, { passive: true });
})();

/* ---- Mobile Menu ---- */
(function () {
  const btn = document.querySelector('.mobile-menu-btn');
  const menu = document.querySelector('.mobile-menu');
  const overlay = document.querySelector('.mobile-menu-overlay');
  const closeBtn = document.querySelector('.mobile-menu-close');
  if (!btn || !menu) return;

  function openMenu() {
    menu.classList.add('open');
    overlay && overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    menu.classList.remove('open');
    overlay && overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  btn.addEventListener('click', openMenu);
  closeBtn && closeBtn.addEventListener('click', closeMenu);
  overlay && overlay.addEventListener('click', closeMenu);
})();

/* ---- Cart Drawer ---- */
window.CartDrawer = (function () {
  const drawer = document.querySelector('.cart-drawer');
  const overlay = document.querySelector('.cart-drawer__overlay');
  const closeBtn = drawer && drawer.querySelector('.cart-drawer__close');
  const bodyEl = drawer && drawer.querySelector('.cart-drawer__body');
  const countEl = drawer && drawer.querySelector('.cart-drawer__count');
  const subtotalEl = drawer && drawer.querySelector('.cart-subtotal__value');

  const cartTriggers = document.querySelectorAll('[data-cart-open]');
  cartTriggers.forEach(t => t.addEventListener('click', open));

  function open() {
    if (!drawer) return;
    drawer.classList.add('open');
    overlay && overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    refresh();
  }

  function close() {
    if (!drawer) return;
    drawer.classList.remove('open');
    overlay && overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  closeBtn && closeBtn.addEventListener('click', close);
  overlay && overlay.addEventListener('click', close);

  async function refresh() {
    try {
      const res = await fetch('/cart.js');
      const cart = await res.json();
      renderCart(cart);
    } catch (e) { console.error('Cart refresh failed', e); }
  }

  function renderCart(cart) {
    if (!drawer) return;
    updateCountBadge(cart.item_count);
    if (countEl) countEl.textContent = `(${cart.item_count})`;
    if (subtotalEl) subtotalEl.textContent = formatMoney(cart.total_price);

    if (!bodyEl) return;

    if (cart.item_count === 0) {
      bodyEl.innerHTML = `
        <div class="cart-drawer__empty">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 7H4l1-7zM10 14a2 2 0 104 0"/></svg>
          <p>Votre panier est vide</p>
          <button class="btn btn--outline btn--small" onclick="CartDrawer.close()">Continuer mes achats</button>
        </div>`;
      return;
    }

    bodyEl.innerHTML = cart.items.map(item => `
      <div class="cart-item" data-key="${item.key}">
        <a href="${item.url}" class="cart-item__image">
          <img src="${item.image}" alt="${item.product_title}" loading="lazy">
        </a>
        <div class="cart-item__info">
          <a href="${item.url}" class="cart-item__title">${item.product_title}</a>
          ${item.variant_title ? `<div class="cart-item__variant">${item.variant_title}</div>` : ''}
          <div class="cart-item__actions">
            <div class="cart-item__qty">
              <button class="cart-item__qty-btn" data-action="decrease" data-key="${item.key}" data-qty="${item.quantity - 1}">−</button>
              <input class="cart-item__qty-input" type="number" min="0" value="${item.quantity}" data-key="${item.key}" readonly>
              <button class="cart-item__qty-btn" data-action="increase" data-key="${item.key}" data-qty="${item.quantity + 1}">+</button>
            </div>
            <span class="cart-item__price">${formatMoney(item.final_line_price)}</span>
          </div>
          <button class="cart-item__remove" data-key="${item.key}" data-qty="0">Retirer</button>
        </div>
      </div>`).join('');

    bodyEl.querySelectorAll('[data-key]').forEach(el => {
      const key = el.dataset.key;
      const qty = parseInt(el.dataset.qty ?? -1);
      if (qty >= 0) {
        el.addEventListener('click', async () => {
          await updateItem(key, qty);
        });
      }
    });
  }

  async function updateItem(key, quantity) {
    try {
      const res = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ id: key, quantity })
      });
      const cart = await res.json();
      renderCart(cart);
    } catch (e) { console.error('Cart update failed', e); }
  }

  async function addItem(variantId, quantity = 1, properties = {}) {
    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ id: variantId, quantity, properties })
      });
      if (!res.ok) throw new Error('Add to cart failed');
      await refresh();
      open();
      Toast.show('Article ajouté au panier !', 'success');
    } catch (e) {
      Toast.show('Erreur lors de l\'ajout au panier', 'error');
    }
  }

  function updateCountBadge(count) {
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  function formatMoney(cents) {
    return (cents / 100).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2 });
  }

  return { open, close, refresh, addItem };
})();

/* ---- Search Overlay ---- */
(function () {
  const overlay = document.querySelector('.search-overlay');
  const closeBtn = overlay && overlay.querySelector('.search-overlay__close');
  const triggers = document.querySelectorAll('[data-search-open]');
  const input = overlay && overlay.querySelector('.search-overlay__input');

  triggers.forEach(t => t.addEventListener('click', () => {
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    input && setTimeout(() => input.focus(), 100);
  }));

  function close() {
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  closeBtn && closeBtn.addEventListener('click', close);
  overlay && overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
  });
})();

/* ---- Toast ---- */
window.Toast = (function () {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  function show(message, type = '') {
    const toast = document.createElement('div');
    toast.className = `toast ${type ? 'toast--' + type : ''}`;
    toast.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${type === 'success' ? 'M5 13l4 4L19 7' : type === 'error' ? 'M6 18L18 6M6 6l12 12' : 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'}"/>
      </svg>
      <span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 3500);
  }

  return { show };
})();

/* ---- Add to Cart Form ---- */
document.addEventListener('submit', async function (e) {
  if (!e.target.matches('.product-add-form')) return;
  e.preventDefault();

  const form = e.target;
  const btn = form.querySelector('[type="submit"]');
  const variantId = form.querySelector('[name="id"]')?.value;
  const qty = parseInt(form.querySelector('[name="quantity"]')?.value || '1');

  if (!variantId) return;

  btn.classList.add('loading');
  btn.disabled = true;

  await CartDrawer.addItem(variantId, qty);

  btn.classList.remove('loading');
  btn.disabled = false;
});

/* ---- Quantity Buttons (product page) ---- */
document.addEventListener('click', function (e) {
  if (e.target.matches('.product-qty__btn')) {
    const input = e.target.parentElement.querySelector('.product-qty__input');
    if (!input) return;
    let val = parseInt(input.value) || 1;
    const txt = e.target.textContent.trim();
    if (txt === '+') val = Math.min(val + 1, 99);
    if (txt === '−') val = Math.max(val - 1, 1);
    input.value = val;
  }
});

/* ---- Accordion ---- */
document.addEventListener('click', function (e) {
  const trigger = e.target.closest('.accordion-trigger');
  if (!trigger) return;
  const isOpen = trigger.classList.contains('open');
  const parent = trigger.closest('.product-accordion') || document.body;
  parent.querySelectorAll('.accordion-trigger').forEach(t => {
    t.classList.remove('open');
    const c = t.nextElementSibling;
    c && c.classList.remove('open');
  });
  if (!isOpen) {
    trigger.classList.add('open');
    const content = trigger.nextElementSibling;
    content && content.classList.add('open');
  }
});

/* ---- Product Gallery Thumbnails ---- */
(function () {
  const thumbs = document.querySelectorAll('.product-gallery__thumb');
  const mainImg = document.querySelector('.product-gallery__main img');
  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      if (mainImg) mainImg.src = thumb.querySelector('img')?.src || mainImg.src;
    });
  });
  thumbs[0]?.classList.add('active');
})();

/* ---- Reveal on scroll ---- */
(function () {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  els.forEach(el => io.observe(el));
})();

/* ---- Variant selector ---- */
(function () {
  const swatches = document.querySelectorAll('.variant-swatch');
  if (!swatches.length) return;

  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      const group = swatch.closest('.variant-swatches');
      group.querySelectorAll('.variant-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');

      const optionIndex = parseInt(swatch.dataset.optionIndex || '0');
      const value = swatch.dataset.value;
      const selectedEl = swatch.closest('.product-option')?.querySelector('.product-option__selected');
      if (selectedEl) selectedEl.textContent = value;

      updateSelectedVariant();
    });
  });

  function updateSelectedVariant() {
    const selectedValues = [];
    document.querySelectorAll('.variant-swatches').forEach(group => {
      const active = group.querySelector('.variant-swatch.active');
      if (active) selectedValues.push(active.dataset.value);
    });

    const variants = window.productVariants;
    if (!variants) return;

    const match = variants.find(v => {
      const opts = [v.option1, v.option2, v.option3].filter(Boolean);
      return selectedValues.every((val, i) => opts[i] === val);
    });

    if (match) {
      const idInput = document.querySelector('input[name="id"]');
      if (idInput) idInput.value = match.id;

      const priceEl = document.querySelector('.product-info__price');
      if (priceEl) priceEl.textContent = formatMoney(match.price);

      const addBtn = document.querySelector('.product-add-form [type="submit"]');
      if (addBtn) {
        if (match.available) {
          addBtn.disabled = false;
          addBtn.querySelector('.btn-text').textContent = 'Ajouter au panier';
        } else {
          addBtn.disabled = true;
          addBtn.querySelector('.btn-text').textContent = 'Épuisé';
        }
      }
    }
  }

  function formatMoney(cents) {
    return (cents / 100).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2 });
  }
})();
