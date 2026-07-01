/* =============================================
   NT Ilona – Paieškos rezultatų puslapis
   ============================================= */

'use strict';

// ─── Duomenų įkėlimas ────────────────────────────────────────────────────────

let PROPERTIES = [];

async function loadData() {
  try {
    const res = await fetch('data/properties.json');
    if (!res.ok) throw new Error();
    PROPERTIES = await res.json();
  } catch {
    console.warn('Nepavyko įkelti data/properties.json');
  }
}

// ─── URL parametrai ───────────────────────────────────────────────────────────

const params = new URLSearchParams(location.search);
const hashParams = new URLSearchParams(location.hash.slice(1));
const P = {
  tab:   hashParams.get('tab')   || params.get('tab')   || 'pirkti',
  vieta: hashParams.get('vieta') || params.get('vieta') || '',
  tipas: hashParams.get('tipas') || params.get('tipas') || '',
  kaina: parseInt(hashParams.get('kaina') || params.get('kaina'), 10) || 0,
  id:    parseInt(hashParams.get('id')    || params.get('id'),    10) || 0,
};

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  typeFilter:    P.tab,
  locationFilter: P.vieta || null,
  maxPrice:      P.kaina  || null,
  activeFilter:  P.tipas  || 'visi',
  visibleCount:  9,
  galleryIndex:  0,
};

// ─── DOM ─────────────────────────────────────────────────────────────────────

const dom = {
  listings:       document.getElementById('listings'),
  loadMore:       document.getElementById('loadMore'),
  noResults:      document.getElementById('noResults'),
  resultsTitle:   document.getElementById('resultsTitle'),
  resultsCount:   document.getElementById('resultsCount'),
  scrollTop:      document.getElementById('scrollTop'),
  year:           document.getElementById('year'),
  modalOverlay:        document.getElementById('modalOverlay'),
  modalClose:          document.getElementById('modalClose'),
  modalGalleryImg:     document.getElementById('modalGalleryImg'),
  modalGalleryPrev:    document.getElementById('modalGalleryPrev'),
  modalGalleryNext:    document.getElementById('modalGalleryNext'),
  modalGalleryCounter: document.getElementById('modalGalleryCounter'),
  modalGalleryThumbs:  document.getElementById('modalGalleryThumbs'),
  modalBadge:          document.getElementById('modalBadge'),
  modalPrice:          document.getElementById('modalPrice'),
  modalPriceSqm:       document.getElementById('modalPriceSqm'),
  modalTitle:          document.getElementById('modalTitle'),
  modalLocation:       document.getElementById('modalLocation'),
  modalTable:          document.getElementById('modalTable'),
  modalDesc:           document.getElementById('modalDesc'),
  modalContact:        document.getElementById('modalContact'),
  modalFav:            document.getElementById('modalFav'),
};

// ─── Utils ────────────────────────────────────────────────────────────────────

function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

function propCity(prop) {
  return (prop.location || '').split(',')[0].trim().toLowerCase();
}

function parsePrice(str) {
  if (!str) return null;
  const n = parseInt(str.replace(/[\s\u00a0]/g, '').replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? null : n;
}

function fmtNum(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// ─── Filtering ────────────────────────────────────────────────────────────────

function getFilteredPool() {
  let pool = PROPERTIES.filter(p => !p.status || p.status === 'active');

  if (state.typeFilter === 'pirkti')  pool = pool.filter(p => p.type === 'pirkti');
  if (state.typeFilter === 'nuomoti') pool = pool.filter(p => p.type === 'nuomoti');
  if (state.locationFilter) pool = pool.filter(p => propCity(p) === state.locationFilter);
  if (state.maxPrice)       pool = pool.filter(p => { const n = parsePrice(p.price); return n !== null && n <= state.maxPrice; });
  if (state.activeFilter !== 'visi') pool = pool.filter(p => p.category === state.activeFilter);

  return pool;
}

// ─── Results title ────────────────────────────────────────────────────────────

const CAT_LT = { butas: 'Butai', namas: 'Namai', sklypas: 'Sklypai', komercinis: 'Komercinis NT' };

function buildTitle() {
  const parts = [state.typeFilter === 'nuomoti' ? 'Nuomoti' : 'Pirkti'];
  if (state.locationFilter) {
    const city = PROPERTIES.find(p => propCity(p) === state.locationFilter);
    parts.push((city?.location || '').split(',')[0].trim() || state.locationFilter);
  }
  if (state.activeFilter !== 'visi') parts.push(CAT_LT[state.activeFilter] || state.activeFilter);
  if (state.maxPrice) parts.push(`iki ${fmtNum(state.maxPrice)} €${state.typeFilter === 'nuomoti' ? '/mėn.' : ''}`);
  return parts.join(' · ');
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function buildCard(prop) {
  const badgeClass = prop.type === 'pirkti' ? 'badge--pirkti' : 'badge--nuomoti';
  const badgeText  = prop.type === 'pirkti' ? 'Parduodama' : 'Nuomojama';
  const metaRooms  = prop.rooms ? `<span>🚪 ${sanitize(prop.rooms)} kamb.</span>` : '';
  const metaFloor  = prop.floor ? `<span>🏢 ${sanitize(prop.floor)} aukštas</span>` : '';

  const card = document.createElement('article');
  card.className = 'property-card fade-in';
  card.setAttribute('aria-label', sanitize(prop.title));

  card.innerHTML = `
    <div class="property-card__image">
      <img class="property-card__img"
        src="${sanitize(prop.images[0])}" alt="${sanitize(prop.title)}"
        loading="lazy" decoding="async" width="600" height="375" />
      ${prop.new ? `<span class="property-card__badge badge--pirkti" style="background:#e53e3e">Naujas</span>` : ''}
      <span class="property-card__badge ${badgeClass}" style="${prop.new ? 'left:auto;right:12px' : ''}">${badgeText}</span>
      <button class="property-card__share" data-id="${prop.id}" aria-label="Dalintis">🔗</button>
    </div>
    <div class="property-card__body">
      <p class="property-card__price">${sanitize(prop.price)}</p>
      <h3 class="property-card__title">${sanitize(prop.title)}</h3>
      <p class="property-card__location">📍 ${sanitize(prop.location)}</p>
      <div class="property-card__meta">
        <span>📐 ${sanitize(prop.area)}</span>
        ${metaRooms}${metaFloor}
      </div>
      <button class="property-card__details" data-id="${prop.id}">Žiūrėti detaliau →</button>
    </div>`;

  card.querySelector('.property-card__details').addEventListener('click', () => openModal(prop));
  card.querySelector('.property-card__img').addEventListener('click', () => openModal(prop));
  card.querySelector('.property-card__share').addEventListener('click', e => {
    e.stopPropagation();
    shareProp(prop);
  });

  return card;
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderResults() {
  const pool = getFilteredPool();
  const visible = pool.slice(0, state.visibleCount);

  dom.resultsTitle.textContent = buildTitle();
  dom.resultsCount.textContent = pool.length
    ? `Rasta ${pool.length} skelbim${pool.length === 1 ? 'as' : pool.length < 10 ? 'ai' : 'ų'}`
    : '';

  dom.noResults.hidden  = pool.length > 0;
  dom.loadMore.hidden   = state.visibleCount >= pool.length;
  dom.listings.innerHTML = '';

  visible.forEach((prop, i) => {
    const card = buildCard(prop);
    card.style.transitionDelay = `${i * 50}ms`;
    dom.listings.appendChild(card);
  });

  requestAnimationFrame(() => {
    dom.listings.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
  });
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

function initFilterBar() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    if (btn.dataset.filter === state.activeFilter) btn.classList.add('active');
    else btn.classList.remove('active');

    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeFilter = btn.dataset.filter;
      state.visibleCount = 9;
      renderResults();
    });
  });
}

// ─── Load more ────────────────────────────────────────────────────────────────

dom.loadMore.addEventListener('click', () => {
  state.visibleCount += 6;
  renderResults();
});

// ─── Refinement bar ───────────────────────────────────────────────────────────

function populateRefineDropdowns() {
  const pool = PROPERTIES.filter(p => (!p.status || p.status === 'active') && p.type === state.typeFilter);

  const cities = [...new Set(pool.map(p => propCity(p)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'lt'));
  const vietaEl = document.getElementById('srVieta');
  vietaEl.innerHTML = '<option value="">Miestas / rajonas</option>' +
    cities.map(c => {
      const label = (pool.find(p => propCity(p) === c)?.location || '').split(',')[0].trim();
      return `<option value="${c}"${c === state.locationFilter ? ' selected' : ''}>${sanitize(label)}</option>`;
    }).join('');

  const cats = [...new Set(pool.map(p => p.category).filter(Boolean))];
  const catLT2 = { butas: 'Butas', namas: 'Namas', sklypas: 'Sklypas', komercinis: 'Komercinis' };
  const tipasEl = document.getElementById('srTipas');
  tipasEl.innerHTML = '<option value="">NT tipas</option>' +
    cats.map(c => `<option value="${c}"${c === state.activeFilter ? ' selected' : ''}>${catLT2[c] || c}</option>`).join('');

  const prices = pool.map(p => parsePrice(p.price)).filter(n => n !== null);
  const maxVal  = prices.length ? Math.max(...prices) : 0;
  const isRent  = state.typeFilter === 'nuomoti';
  const brackets = isRent
    ? [300, 500, 700, 1000, 1500, 2000, 3000]
    : [50000, 75000, 100000, 150000, 200000, 300000, 400000, 500000, 700000, 1000000];

  const kainaEl = document.getElementById('srKaina');
  kainaEl.innerHTML = '<option value="">Maksimali kaina</option>' +
    brackets.filter(b => !maxVal || b <= maxVal * 1.15)
      .map(b => {
        const label = isRent ? `iki ${fmtNum(b)} €/mėn.` : `iki ${fmtNum(b)} €`;
        return `<option value="${b}"${b === state.maxPrice ? ' selected' : ''}>${label}</option>`;
      }).join('');
}

function initRefineBar() {
  // Set active tab
  document.querySelectorAll('.search-refine__tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === state.typeFilter);
    btn.addEventListener('click', () => {
      document.querySelectorAll('.search-refine__tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.typeFilter = btn.dataset.tab;
      populateRefineDropdowns();
    });
  });

  populateRefineDropdowns();

  // Search button → update state and re-render (no page navigation)
  document.getElementById('srBtn').addEventListener('click', () => {
    const v = document.getElementById('srVieta').value;
    const t = document.getElementById('srTipas').value;
    const k = document.getElementById('srKaina').value;

    state.locationFilter = v || null;
    state.activeFilter   = t || 'visi';
    state.maxPrice       = k ? parseInt(k, 10) : null;
    state.visibleCount   = 9;

    // Keep filter-bar buttons in sync
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.filter === state.activeFilter);
    });

    // Update URL hash for shareability (no reload)
    const p = new URLSearchParams();
    p.set('tab', state.typeFilter);
    if (v) p.set('vieta', v);
    if (t) p.set('tipas', t);
    if (k) p.set('kaina', k);
    history.replaceState(null, '', location.pathname + '#' + p.toString());

    renderResults();
  });
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function openModal(prop) {
  const badgeText  = prop.type === 'pirkti' ? 'Parduodama' : 'Nuomojama';
  const badgeColor = prop.type === 'pirkti' ? 'var(--clr-primary)' : 'var(--clr-accent)';

  state.galleryIndex = 0;
  renderGallery(prop);

  dom.modalBadge.textContent        = badgeText;
  dom.modalBadge.style.background   = badgeColor;
  dom.modalPrice.textContent        = prop.price;
  dom.modalPriceSqm.textContent     = prop.pricePerSqm ? `${prop.pricePerSqm} · ${prop.area}` : prop.area;
  dom.modalTitle.textContent        = prop.title;
  dom.modalLocation.textContent     = '📍 ' + (prop.address || prop.location);

  const CAT2 = { butas: 'Butas', namas: 'Namas', sklypas: 'Sklypas', komercinis: 'Komercinis NT' };
  const rows = [
    ['Tipas',              CAT2[prop.category] || prop.category],
    ['Pardavimas / nuoma', prop.type === 'pirkti' ? 'Pardavimas' : 'Nuoma'],
    ['Plotas',             prop.area],
    ['Kambariai',          prop.rooms],
    ['Aukštas',            prop.floor],
    ['Statybos metai',     prop.year],
    ['Šildymas',           prop.heating],
    ['Energetinė klasė',   prop.energy],
    ['Būklė',              prop.condition],
    ['Įrengimas',          prop.equipment],
  ];
  dom.modalTable.innerHTML = rows.filter(([, v]) => v)
    .map(([k, v]) => `<tr><td>${sanitize(k)}</td><td>${sanitize(v)}</td></tr>`).join('');
  dom.modalDesc.innerHTML = `<p>${sanitize(prop.desc || '')}</p>`;

  dom.modalFav.onclick = () => shareProp(prop);
  dom.modalContact.onclick = (e) => { e.preventDefault(); openContactPopup(prop); };

  dom.modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  dom.modalClose.focus();
}

function renderGallery(prop) {
  const imgs = prop.images;
  dom.modalGalleryImg.src = imgs[0];
  dom.modalGalleryImg.alt = prop.title;
  dom.modalGalleryCounter.textContent = `1 / ${imgs.length}`;

  dom.modalGalleryThumbs.innerHTML = '';
  imgs.forEach((src, i) => {
    const btn = document.createElement('button');
    btn.className = `modal__gallery-thumb${i === 0 ? ' active' : ''}`;
    btn.setAttribute('aria-label', `${i + 1}. nuotrauka`);
    btn.setAttribute('aria-pressed', String(i === 0));
    btn.innerHTML = `<img src="${sanitize(src.replace('w=900', 'w=180'))}" alt="" loading="lazy" decoding="async" />`;
    btn.addEventListener('click', () => setGalleryImage(prop, i));
    dom.modalGalleryThumbs.appendChild(btn);
  });

  const single = imgs.length <= 1;
  dom.modalGalleryPrev.hidden = single;
  dom.modalGalleryNext.hidden = single;
  dom.modalGalleryCounter.hidden = single;

  dom.modalGalleryPrev.onclick = () => setGalleryImage(prop, (state.galleryIndex - 1 + imgs.length) % imgs.length);
  dom.modalGalleryNext.onclick = () => setGalleryImage(prop, (state.galleryIndex + 1) % imgs.length);
  dom.modalGalleryImg.parentElement.onkeydown = e => {
    if (e.key === 'ArrowLeft') dom.modalGalleryPrev.click();
    if (e.key === 'ArrowRight') dom.modalGalleryNext.click();
  };
}

function setGalleryImage(prop, index) {
  state.galleryIndex = index;
  const img = dom.modalGalleryImg;
  img.classList.add('switching');
  setTimeout(() => {
    img.onload = img.onerror = () => img.classList.remove('switching');
    img.src = prop.images[index];
    if (img.complete) img.classList.remove('switching');
  }, 160);
  dom.modalGalleryCounter.textContent = `${index + 1} / ${prop.images.length}`;
  dom.modalGalleryThumbs.querySelectorAll('.modal__gallery-thumb').forEach((th, i) => {
    const active = i === index;
    th.classList.toggle('active', active);
    th.setAttribute('aria-pressed', String(active));
    if (active) th.scrollIntoView({ inline: 'nearest', behavior: 'smooth' });
  });
}

function openContactPopup(prop) {
  const old = document.getElementById('contactPopup');
  if (old) old.remove();

  const shareUrl = (() => { const u = new URL('./search', location.href); u.hash = 'id=' + prop.id; return u.toString(); })();

  const popup = document.createElement('div');
  popup.id = 'contactPopup';
  popup.className = 'contact-popup';
  popup.innerHTML = `
    <div class="contact-popup__card" role="dialog" aria-modal="true">
      <button class="contact-popup__close" aria-label="Uždaryti">✕</button>
      <h3 class="contact-popup__title">Susisiekite</h3>
      <p class="contact-popup__prop">${sanitize(prop.title)} &ndash; ${sanitize(prop.price)}</p>
      <div class="contact-popup__item">
        <span class="contact-popup__icon">📞</span>
        <div class="contact-popup__info">
          <div class="contact-popup__label">Telefonas</div>
          <div class="contact-popup__value">+370 600 00 000</div>
        </div>
        <div class="contact-popup__btns">
          <button class="contact-popup__btn" data-copy="+37060000000">📋 Kopijuoti</button>
          <a class="contact-popup__btn contact-popup__btn--action" href="tel:+37060000000">📞 Skambinti</a>
        </div>
      </div>
      <div class="contact-popup__item">
        <span class="contact-popup__icon">✉️</span>
        <div class="contact-popup__info">
          <div class="contact-popup__label">El. paštas</div>
          <div class="contact-popup__value">ilona@ntilona.lt</div>
        </div>
        <div class="contact-popup__btns">
          <button class="contact-popup__btn" data-copy="ilona@ntilona.lt">📋 Kopijuoti</button>
          <a class="contact-popup__btn contact-popup__btn--action" href="mailto:ilona@ntilona.lt">✉️ Rašyti</a>
        </div>
      </div>
      <div class="contact-popup__divider"></div>
      <button class="btn btn--primary contact-popup__form-btn">📝 Siųsti užklausa</button>
    </div>`;
  document.body.appendChild(popup);

  popup.querySelector('.contact-popup__close').addEventListener('click', () => popup.remove());
  popup.addEventListener('click', e => { if (e.target === popup) popup.remove(); });

  popup.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.copy)
        .then(() => showToast('Nukopijuota!'))
        .catch(() => showToast('Nepavyko nukopijuoti'));
    });
  });

  popup.querySelector('.contact-popup__form-btn').addEventListener('click', () => {
    const msg = `Sveiki,\n\nDomina objektas: ${prop.title} \u2013 ${prop.price}\n${shareUrl}`;
    sessionStorage.setItem('ntilona_contact_msg', msg);
    popup.remove();
    const dest = new URL('index.html', location.href);
    dest.hash = 'kontaktai';
    location.href = dest.toString();
  });

  const escH = e => { if (e.key === 'Escape') { popup.remove(); document.removeEventListener('keydown', escH); } };
  document.addEventListener('keydown', escH);
  popup.querySelector('.contact-popup__close').focus();
}

function openLightbox(src, alt) {
  let lb = document.getElementById('lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.innerHTML = '<img id="lightboxImg" alt="" />';
    lb.addEventListener('click', () => lb.classList.remove('open'));
    document.body.appendChild(lb);
  }
  const img = document.getElementById('lightboxImg');
  img.src = src.replace('w=900', 'w=1600');
  img.alt = alt || '';
  lb.classList.add('open');
}

function shareProp(prop) {
  const shareUrl = new URL('./search', location.href);
  shareUrl.hash = 'id=' + prop.id;
  const url  = shareUrl.toString();
  const text = `${prop.title} – ${prop.price}`;
  if (navigator.share) {
    navigator.share({ title: prop.title, text, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url)
      .then(() => showToast('Nuoroda nukopijuota!'))
      .catch(() => showToast('Nepavyko nukopijuoti'));
  }
}

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 2500);
}

function closeModal() {
  dom.modalOverlay.classList.remove('open');
  dom.modalOverlay.addEventListener('transitionend', () => { document.body.style.overflow = ''; }, { once: true });
}

function initModal() {
  dom.modalClose.addEventListener('click', closeModal);
  dom.modalOverlay.addEventListener('click', e => { if (e.target === dom.modalOverlay) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (document.getElementById('contactPopup')) { document.getElementById('contactPopup').remove(); return; }
      const lb = document.getElementById('lightbox');
      if (lb && lb.classList.contains('open')) { lb.classList.remove('open'); return; }
      closeModal();
    }
  });
  dom.modalGalleryImg.addEventListener('click', () => {
    openLightbox(dom.modalGalleryImg.src, dom.modalGalleryImg.alt);
  });
}

// ─── Header / Burger ─────────────────────────────────────────────────────────

function initHeader() {
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
    document.getElementById('scrollTop').classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  const burger = document.getElementById('burger');
  const nav    = document.getElementById('nav');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });
  document.addEventListener('click', e => {
    if (nav.classList.contains('open') && !nav.contains(e.target) && !burger.contains(e.target)) {
      nav.classList.remove('open'); burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false'); document.body.style.overflow = '';
    }
  });
}

function initScrollTop() {
  document.getElementById('scrollTop').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  if (document.getElementById('year')) document.getElementById('year').textContent = new Date().getFullYear();
  initHeader();
  initScrollTop();
  await loadData();
  initRefineBar();
  initFilterBar();
  initModal();
  renderResults();
  if (P.id) {
    const prop = PROPERTIES.find(p => p.id === P.id);
    if (prop) openModal(prop);
  }
}

document.addEventListener('DOMContentLoaded', init);
