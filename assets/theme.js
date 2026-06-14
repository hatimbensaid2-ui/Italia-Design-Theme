/* ============================================================
   ITALIA DESIGN — THEME JS
   ============================================================ */

'use strict';

/* ---- Header heights + scroll state ---- */
(function () {
  const siteTop = document.querySelector('.site-top');
  const header = document.querySelector('.site-header');
  if (!siteTop || !header) return;

  const root = document.documentElement;
  const announcement = document.querySelector('.announcement-bar');
  const measure = () => {
    root.style.setProperty('--site-top-h', siteTop.offsetHeight + 'px');
    root.style.setProperty('--header-h', header.offsetHeight + 'px');
    root.style.setProperty('--announcement-h', (announcement ? announcement.offsetHeight : 0) + 'px');
  };
  measure();
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('load', measure);

  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
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

  // Collapsible sub-menus — expand only when the parent is tapped
  menu.querySelectorAll('.mobile-menu-toggle').forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      var item = toggle.closest('.mobile-menu-item--has-sub');
      var isOpen = item.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });
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

/* ---- Footer collapsible tabs (mobile only) ---- */
document.addEventListener('click', function (e) {
  const title = e.target.closest('.footer-col--toggle .footer-col__title');
  if (!title) return;
  if (window.matchMedia('(min-width: 681px)').matches) return; // desktop: always open
  title.parentElement.classList.toggle('is-open');
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

/* ---- Product Gallery (swipe track + thumbnails) ---- */
(function () {
  const track = document.getElementById('product-gallery-track');
  const thumbs = Array.from(document.querySelectorAll('.product-gallery__thumb'));
  if (!track) return;
  const slides = Array.from(track.querySelectorAll('.product-gallery__slide'));

  function setActive(i) {
    thumbs.forEach(t => t.classList.remove('active'));
    thumbs[i] && thumbs[i].classList.add('active');
  }

  // Click a thumbnail → scroll the track to that image
  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      const i = parseInt(thumb.dataset.index, 10) || 0;
      const slide = slides[i];
      if (slide) track.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
      setActive(i);
    });
  });

  // Swiping the track → highlight the matching thumbnail
  let raf;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      setActive(i);
    });
  }, { passive: true });

  setActive(0);
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

/* ============================================================
   PHOTO REVIEWS LIGHTBOX
   ============================================================ */
(function () {
  function buildStars(rating) {
    var html = '';
    for (var i = 1; i <= 5; i++) {
      html += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="' + (i > rating ? 'star--empty' : '') + '"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>';
    }
    return html;
  }

  document.querySelectorAll('[data-reviews-section]').forEach(function (section) {
    var id = section.getAttribute('data-reviews-section');
    var modal = document.getElementById('review-modal-' + id);
    if (!modal) return;

    var imgEl = modal.querySelector('.review-modal__img');
    var prevBtn = modal.querySelector('[data-review-prev]');
    var nextBtn = modal.querySelector('[data-review-next]');
    var thumbsEl = modal.querySelector('.review-modal__thumbs');
    var images = [];
    var current = 0;

    function show(i) {
      if (!images.length) return;
      current = (i + images.length) % images.length;
      imgEl.src = images[current];
      thumbsEl.querySelectorAll('img').forEach(function (t, idx) {
        t.classList.toggle('active', idx === current);
      });
    }

    function openReview(card) {
      modal.querySelector('.review-modal__name').textContent = card.dataset.name || '';
      modal.querySelector('.review-modal__verified').style.display = card.dataset.verified === 'true' ? 'inline-flex' : 'none';
      modal.querySelector('.review-modal__date').textContent = card.dataset.date || '';
      modal.querySelector('.review-modal__stars').innerHTML = buildStars(parseInt(card.dataset.rating, 10) || 5);
      modal.querySelector('.review-modal__text').textContent = card.dataset.text || '';
      var fitting = modal.querySelector('.review-modal__fitting');
      fitting.textContent = card.dataset.fitting || '';

      var prodTitle = card.dataset.productTitle;
      var prodWrap = modal.querySelector('.review-modal__product');
      if (prodTitle) {
        prodWrap.style.display = 'flex';
        prodWrap.href = card.dataset.productUrl || '#';
        modal.querySelector('.review-modal__product-name').textContent = prodTitle;
        var pimg = prodWrap.querySelector('.review-modal__product-thumb img');
        if (card.dataset.productImage) { pimg.src = card.dataset.productImage; pimg.style.display = 'block'; }
        else { pimg.style.display = 'none'; }
      } else {
        prodWrap.style.display = 'none';
      }

      images = (card.dataset.images || '').split('||').filter(Boolean);
      thumbsEl.innerHTML = '';
      if (images.length > 1) {
        images.forEach(function (src, idx) {
          var t = document.createElement('img');
          t.src = src;
          t.addEventListener('click', function (e) { e.stopPropagation(); show(idx); });
          thumbsEl.appendChild(t);
        });
        prevBtn.classList.remove('is-hidden');
        nextBtn.classList.remove('is-hidden');
      } else {
        prevBtn.classList.add('is-hidden');
        nextBtn.classList.add('is-hidden');
      }
      show(0);

      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    section.querySelectorAll('[data-review]').forEach(function (card) {
      card.addEventListener('click', function () { openReview(card); });
    });

    modal.querySelectorAll('[data-review-close]').forEach(function (el) {
      el.addEventListener('click', close);
    });
    if (prevBtn) prevBtn.addEventListener('click', function (e) { e.stopPropagation(); show(current - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function (e) { e.stopPropagation(); show(current + 1); });
    document.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
  });
})();
