/*
 * PanPan Bakery — design prototype behaviour (shared by all 3 directions).
 * Vanilla JS, no dependencies, works from file://.
 * Everything is wired through data-* attributes so each direction only
 * changes markup + CSS, never the logic.
 */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // Format a number as Vietnamese currency: 350000 -> "350.000đ"
  function vnd(n) {
    var s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return s + 'đ';
  }

  /* ---------------- Cart count (demo state kept in sessionStorage) ---------------- */
  var COUNT_KEY = 'panpan-demo-cart-count';
  function getCount() {
    var v = null;
    try { v = sessionStorage.getItem(COUNT_KEY); } catch (e) { /* storage blocked */ }
    return v === null ? 3 : parseInt(v, 10) || 0;
  }
  function setCount(n) {
    try { sessionStorage.setItem(COUNT_KEY, String(n)); } catch (e) { /* ignore */ }
    $$('[data-cart-count]').forEach(function (el) {
      el.textContent = n;
      el.classList.remove('is-bumped');
      void el.offsetWidth; // restart CSS animation
      el.classList.add('is-bumped');
    });
  }
  $$('[data-cart-count]').forEach(function (el) { el.textContent = getCount(); });

  /* ---------------- Toast ---------------- */
  var toastTimer;
  function toast(msg) {
    var el = $('[data-toast]');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('data-toast', '');
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    var text = $('[data-toast-text]', el);
    (text || el).textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-visible'); }, 2600);
  }

  /* ---------------- Mobile navigation ---------------- */
  $$('[data-nav-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var nav = $('[data-nav]');
      if (!nav) return;
      var open = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('nav-open', open);
    });
  });

  /* ---------------- Favourite buttons ---------------- */
  $$('[data-fav]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      toast(on ? 'Đã lưu vào danh sách yêu thích' : 'Đã bỏ khỏi danh sách yêu thích');
    });
  });

  /* ---------------- Quick add from product cards ---------------- */
  $$('[data-quick-add]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      setCount(getCount() + 1);
      toast('Đã thêm “' + (btn.getAttribute('data-quick-add') || 'sản phẩm') + '” vào giỏ');
    });
  });

  /* ---------------- Home: filter + sort + search ---------------- */
  var grid = $('[data-product-grid]');
  if (grid) {
    var cards = $$('[data-product]', grid);
    var state = { category: 'all', price: 'all', size: 'all', flavor: 'all', sort: 'popular', q: '' };

    try {
      var q = new URLSearchParams(window.location.search).get('q');
      if (q) {
        state.q = q.trim().toLowerCase();
        $$('[data-search] input').forEach(function (i) { i.value = q; });
      }
    } catch (e) { /* old browser */ }

    var inRange = function (price, range) {
      if (range === 'all') return true;
      var parts = range.split('-');
      var min = parseInt(parts[0], 10) || 0;
      var max = parts[1] ? parseInt(parts[1], 10) : Infinity;
      return price >= min && price < max;
    };

    var apply = function () {
      var visible = cards.filter(function (c) {
        var d = c.dataset;
        var name = (d.name || c.textContent).toLowerCase();
        var ok =
          (state.category === 'all' || d.category === state.category) &&
          inRange(parseInt(d.price, 10), state.price) &&
          (state.size === 'all' || (d.sizes || '').split(',').indexOf(state.size) > -1) &&
          (state.flavor === 'all' || (d.flavor || '').split(',').indexOf(state.flavor) > -1) &&
          (!state.q || name.indexOf(state.q) > -1);
        c.hidden = !ok;
        return ok;
      });

      var sorted = visible.slice().sort(function (a, b) {
        var pa = parseInt(a.dataset.price, 10), pb = parseInt(b.dataset.price, 10);
        if (state.sort === 'price-asc') return pa - pb;
        if (state.sort === 'price-desc') return pb - pa;
        if (state.sort === 'new') return (parseInt(b.dataset.new || 0, 10)) - (parseInt(a.dataset.new || 0, 10));
        return (parseInt(a.dataset.popular || 99, 10)) - (parseInt(b.dataset.popular || 99, 10));
      });
      sorted.forEach(function (c) { grid.appendChild(c); });

      $$('[data-result-count]').forEach(function (el) { el.textContent = visible.length; });
      var empty = $('[data-empty]');
      if (empty) empty.hidden = visible.length !== 0;

      // keep chips + selects in sync with state
      $$('[data-filter-chip]').forEach(function (chip) {
        var on = state[chip.dataset.name] === chip.dataset.value;
        chip.classList.toggle('is-active', on);
        chip.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      $$('[data-filter]').forEach(function (sel) {
        if (sel.value !== state[sel.dataset.filter]) sel.value = state[sel.dataset.filter];
      });
      $$('[data-sort]').forEach(function (sel) { sel.value = state.sort; });
    };

    $$('[data-filter]').forEach(function (sel) {
      sel.addEventListener('change', function () { state[sel.dataset.filter] = sel.value; apply(); });
    });
    $$('[data-sort]').forEach(function (sel) {
      sel.addEventListener('change', function () { state.sort = sel.value; apply(); });
    });
    $$('[data-filter-chip]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var name = chip.dataset.name;
        state[name] = state[name] === chip.dataset.value && chip.dataset.value !== 'all' ? 'all' : chip.dataset.value;
        apply();
      });
    });
    // Category tiles on the home page can pre-filter the grid
    $$('[data-category-link]').forEach(function (a) {
      a.addEventListener('click', function () {
        state.category = a.getAttribute('data-category-link');
        apply();
      });
    });
    $$('[data-filter-reset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state = { category: 'all', price: 'all', size: 'all', flavor: 'all', sort: state.sort, q: '' };
        $$('[data-search] input').forEach(function (i) { i.value = ''; });
        apply();
      });
    });
    $$('[data-filter-panel-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var panel = $('[data-filter-panel]');
        if (!panel) return;
        var open = panel.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
    $$('[data-search]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        state.q = ($('input', form).value || '').trim().toLowerCase();
        apply();
        var target = $('#san-pham') || grid;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    apply();
  } else {
    // Other pages: search sends the user to the home page grid
    $$('[data-search]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = ($('input', form).value || '').trim();
        window.location.href = 'index.html' + (v ? '?q=' + encodeURIComponent(v) : '') + '#san-pham';
      });
    });
  }

  /* ---------------- Product page ---------------- */
  var form = $('[data-product-form]');
  if (form) {
    // Gallery
    var main = $('[data-gallery-main]');
    $$('[data-gallery-thumb]').forEach(function (t) {
      t.addEventListener('click', function () {
        if (main) {
          main.src = t.getAttribute('data-src');
          main.alt = t.getAttribute('data-alt') || main.alt;
        }
        $$('[data-gallery-thumb]').forEach(function (x) {
          x.classList.toggle('is-active', x === t);
          x.setAttribute('aria-current', x === t ? 'true' : 'false');
        });
      });
    });

    // Delivery date chips: next 7 days
    var chipsBox = $('[data-date-chips]');
    var DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    var CUTOFF_HOUR = 14; // same-day orders accepted until 14:00
    var now = new Date();
    if (chipsBox) {
      for (var i = 0; i < 7; i++) {
        var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
        var dd = ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2);
        var top = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : DAYS[d.getDay()];
        var disabled = i === 0 && now.getHours() >= CUTOFF_HOUR;
        var id = 'pp-date-' + i;
        var label = document.createElement('label');
        label.className = 'date-chip' + (disabled ? ' is-disabled' : '');
        label.setAttribute('for', id);
        label.innerHTML =
          '<input type="radio" name="date" id="' + id + '" value="' + dd + '/' + d.getFullYear() + '" data-offset="' + i + '"' +
          (disabled ? ' disabled' : '') + (i === 1 ? ' checked' : '') + '>' +
          '<span class="date-chip__day">' + top + '</span>' +
          '<span class="date-chip__date">' + dd + '</span>' +
          (disabled ? '<span class="date-chip__note">Hết nhận</span>' : '');
        chipsBox.appendChild(label);
      }
    }
    var otherDate = $('[data-date-other]');
    if (otherDate) {
      var t2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      otherDate.min = t2.getFullYear() + '-' + ('0' + (t2.getMonth() + 1)).slice(-2) + '-' + ('0' + t2.getDate()).slice(-2);
      otherDate.addEventListener('change', function () {
        $$('input[name="date"]', form).forEach(function (r) { r.checked = false; });
        updateSlots();
        update();
      });
    }

    // Disable time slots that start less than 3 hours from now when "today" is picked
    var updateSlots = function () {
      var picked = $('input[name="date"]:checked', form);
      var isToday = picked && picked.getAttribute('data-offset') === '0';
      $$('input[name="slot"]', form).forEach(function (s) {
        var start = parseInt(s.getAttribute('data-start'), 10);
        var off = isToday && start < now.getHours() + 3;
        s.disabled = off;
        if (off && s.checked) s.checked = false;
        var l = s.closest('label');
        if (l) l.classList.toggle('is-disabled', off);
      });
    };

    // Price calculation
    var update = function () {
      var size = $('input[name="size"]:checked', form);
      var base = size ? parseInt(size.getAttribute('data-price'), 10) : 0;
      var flavor = $('input[name="flavor"]:checked', form);
      var extra = flavor ? parseInt(flavor.getAttribute('data-price') || 0, 10) : 0;
      $$('input[name="addon"]:checked', form).forEach(function (a) { extra += parseInt(a.getAttribute('data-price') || 0, 10); });
      var qtyInput = $('[data-qty-input]', form);
      var qty = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;
      var total = (base + extra) * qty;
      $$('[data-total]').forEach(function (el) { el.textContent = vnd(total); });
      $$('[data-base-price]').forEach(function (el) { el.textContent = vnd(base); });
      $$('[data-size-label]').forEach(function (el) { el.textContent = size ? size.getAttribute('data-label') || size.value : ''; });
      var pickedDate = $('input[name="date"]:checked', form);
      var slot = $('input[name="slot"]:checked', form);
      var dateText = pickedDate ? pickedDate.value : (otherDate && otherDate.value ? otherDate.value.split('-').reverse().join('/') : '');
      $$('[data-delivery-summary]').forEach(function (el) {
        el.textContent = dateText && slot ? dateText + ' · ' + slot.value : 'Chưa chọn ngày & giờ giao';
      });
    };

    // Message counter + live preview on the cake
    var msg = $('[data-message]', form);
    if (msg) {
      var max = parseInt(msg.getAttribute('maxlength') || 30, 10);
      var preview = $('[data-message-preview]');
      var fallback = preview ? preview.textContent : '';
      var onMsg = function () {
        $$('[data-message-count]').forEach(function (el) { el.textContent = msg.value.length + '/' + max; });
        if (preview) {
          preview.textContent = msg.value.trim() || fallback;
          preview.classList.toggle('is-placeholder', !msg.value.trim());
        }
      };
      msg.addEventListener('input', onMsg);
      onMsg();
    }

    // Quantity stepper
    var qi = $('[data-qty-input]', form);
    $$('[data-qty-minus]', form).forEach(function (b) {
      b.addEventListener('click', function () { qi.value = Math.max(1, (parseInt(qi.value, 10) || 1) - 1); update(); });
    });
    $$('[data-qty-plus]', form).forEach(function (b) {
      b.addEventListener('click', function () { qi.value = Math.min(20, (parseInt(qi.value, 10) || 1) + 1); update(); });
    });

    // Delivery vs pickup
    var fulfil = function () {
      var f = $('input[name="fulfil"]:checked', form);
      var pickup = f && f.value === 'pickup';
      $$('[data-delivery-only]').forEach(function (el) { el.hidden = pickup; });
      $$('[data-pickup-only]').forEach(function (el) { el.hidden = !pickup; });
    };

    form.addEventListener('change', function (e) {
      if (e.target.name === 'date') { if (otherDate) otherDate.value = ''; updateSlots(); }
      if (e.target.name === 'fulfil') fulfil();
      update();
    });

    // Tabs (description / ingredients / storage / reviews)
    $$('[data-tabs]').forEach(function (tabs) {
      var btns = $$('[data-tab]', tabs);
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          btns.forEach(function (x) {
            var on = x === b;
            x.classList.toggle('is-active', on);
            x.setAttribute('aria-selected', on ? 'true' : 'false');
            var p = document.getElementById(x.getAttribute('data-tab'));
            if (p) p.hidden = !on;
          });
        });
      });
    });

    // Add to cart (validates date + slot)
    var submit = function (e) {
      e.preventDefault();
      var err = $('[data-form-error]');
      var hasDate = $('input[name="date"]:checked', form) || (otherDate && otherDate.value);
      var hasSlot = $('input[name="slot"]:checked', form);
      var pickup = ($('input[name="fulfil"]:checked', form) || {}).value === 'pickup';
      if (!hasDate || (!hasSlot && !pickup)) {
        if (err) { err.hidden = false; err.textContent = 'Bạn vui lòng chọn ngày và khung giờ nhận bánh nhé.'; }
        var target = $('[data-delivery-block]') || form;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (err) err.hidden = true;
      var qty = qi ? Math.max(1, parseInt(qi.value, 10) || 1) : 1;
      setCount(getCount() + qty);
      toast('Đã thêm bánh vào giỏ — xem giỏ hàng để đặt nhé!');
    };
    form.addEventListener('submit', submit);
    $$('[data-add-to-cart]').forEach(function (b) {
      if (b.form !== form) b.addEventListener('click', submit); // sticky bar button outside the form
    });

    // Sticky mobile buy bar appears once the main button scrolls out of view
    var sticky = $('[data-sticky-buy]');
    var mainBtn = $('[data-add-to-cart-main]');
    if (sticky && mainBtn && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        sticky.classList.toggle('is-visible', !entries[0].isIntersecting && entries[0].boundingClientRect.top < 0);
      }).observe(mainBtn);
    }

    updateSlots();
    fulfil();
    update();
  }

  /* ---------------- Cart page ---------------- */
  var cart = $('[data-cart]');
  if (cart) {
    var FREE_SHIP = 500000, FEE = 25000;
    var discountRate = 0;

    var recalc = function () {
      var lines = $$('[data-line]', cart);
      var subtotal = 0, items = 0;
      lines.forEach(function (line) {
        var q = parseInt($('[data-qty-input]', line).value, 10) || 1;
        var lt = parseInt(line.getAttribute('data-unit'), 10) * q;
        subtotal += lt;
        items += q;
        $$('[data-line-total]', line).forEach(function (el) { el.textContent = vnd(lt); });
      });
      var ship = subtotal >= FREE_SHIP || subtotal === 0 ? 0 : FEE;
      var discount = Math.min(Math.round(subtotal * discountRate / 1000) * 1000, 50000);
      $$('[data-subtotal]').forEach(function (el) { el.textContent = vnd(subtotal); });
      $$('[data-shipping]').forEach(function (el) { el.textContent = ship === 0 ? 'Miễn phí' : vnd(ship); });
      $$('[data-discount]').forEach(function (el) { el.textContent = '−' + vnd(discount); });
      $$('[data-discount-row]').forEach(function (el) { el.hidden = discount === 0; });
      $$('[data-grand-total]').forEach(function (el) { el.textContent = vnd(subtotal + ship - discount); });
      $$('[data-item-count]').forEach(function (el) { el.textContent = items; });
      var left = Math.max(0, FREE_SHIP - subtotal);
      $$('[data-freeship-bar]').forEach(function (el) { el.style.width = Math.min(100, subtotal / FREE_SHIP * 100) + '%'; });
      $$('[data-freeship-text]').forEach(function (el) {
        el.innerHTML = left > 0
          ? 'Mua thêm <strong>' + vnd(left) + '</strong> để được miễn phí giao hàng'
          : 'Tuyệt! Đơn của bạn được <strong>miễn phí giao hàng</strong> nội thành';
      });
      setCount(items);
      var empty = lines.length === 0;
      $$('[data-cart-empty]').forEach(function (el) { el.hidden = !empty; });
      $$('[data-cart-filled]').forEach(function (el) { el.hidden = empty; });
    };

    cart.addEventListener('click', function (e) {
      var line = e.target.closest('[data-line]');
      if (!line) return;
      var input = $('[data-qty-input]', line);
      if (e.target.closest('[data-qty-minus]')) input.value = Math.max(1, (parseInt(input.value, 10) || 1) - 1);
      if (e.target.closest('[data-qty-plus]')) input.value = Math.min(20, (parseInt(input.value, 10) || 1) + 1);
      if (e.target.closest('[data-remove]')) {
        line.classList.add('is-removing');
        setTimeout(function () { line.remove(); recalc(); }, 220);
        toast('Đã xoá sản phẩm khỏi giỏ');
        return;
      }
      recalc();
    });
    cart.addEventListener('change', recalc);

    // Upsell: add a simple line from <template data-line-template>
    var tpl = $('template[data-line-template]');
    $$('[data-upsell-add]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var name = btn.getAttribute('data-upsell-add');
        var price = parseInt(btn.getAttribute('data-price'), 10);
        var list = $('[data-lines]', cart) || cart;
        var existing = $$('[data-line]', list).filter(function (l) { return l.getAttribute('data-name') === name; })[0];
        if (existing) {
          var inp = $('[data-qty-input]', existing);
          inp.value = (parseInt(inp.value, 10) || 1) + 1;
        } else if (tpl) {
          var node = tpl.content.firstElementChild.cloneNode(true);
          node.setAttribute('data-unit', price);
          node.setAttribute('data-name', name);
          $$('[data-line-name]', node).forEach(function (el) { el.textContent = name; });
          $$('[data-line-unit]', node).forEach(function (el) { el.textContent = vnd(price); });
          var img = $('img', node);
          if (img && btn.getAttribute('data-img')) { img.src = btn.getAttribute('data-img'); img.alt = name; }
          list.appendChild(node);
        }
        recalc();
        toast('Đã thêm “' + name + '” vào giỏ');
      });
    });

    var promo = $('[data-promo-form]');
    if (promo) {
      promo.addEventListener('submit', function (e) {
        e.preventDefault();
        var code = ($('input', promo).value || '').trim().toUpperCase();
        var note = $('[data-promo-note]');
        if (code === 'PANPAN10') {
          discountRate = 0.1;
          if (note) { note.textContent = 'Đã áp dụng mã PANPAN10: giảm 10% (tối đa 50.000đ).'; note.className = 'promo-note is-ok'; }
        } else {
          discountRate = 0;
          if (note) { note.textContent = 'Mã chưa đúng. Thử “PANPAN10” cho đơn đầu tiên nhé.'; note.className = 'promo-note is-error'; }
        }
        recalc();
      });
    }

    $$('[data-checkout]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        toast('Đây là bản thiết kế mẫu — bước thanh toán sẽ làm ở giai đoạn sau.');
      });
    });

    recalc();
  }
})();
