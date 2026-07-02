/* ==========================================
   NT Ilona – ntilona.lt – Pagrindinis JS
   ========================================== */

'use strict';

// ─── Duomenys ────────────────────────────────────────────────────────────────

let PROPERTIES = [];

// PROPERTIES_PLACEHOLDER_START – šis masyvas naudojamas tik kaip atsarginis
const FALLBACK_PROPERTIES = [
  {
    id: 1,
    type: 'pirkti',
    category: 'butas',
    title: '3 k. butas Antakalnyje',
    address: 'Antakalnio g. 42, Vilnius',
    location: 'Vilnius, Antakalnis',
    price: '185 000 €',
    pricePerSqm: '2 500 €/m²',
    area: '74 m²',
    rooms: '3',
    floor: '4/6',
    year: '2005',
    heating: 'Centrinis',
    energy: 'B',
    condition: 'Puiki',
    equipment: 'Pilnai įrengtas',
    desc: 'Erdvus, šviesos kupinas 3 kambarių butas Antakalnyje. Atliktas kokybiškas remontas 2022 m.: nauji langai, parketo grindys, moderni virtuvė su buitine technika. Šalia – Neries upė, parkai, mokyklos ir parduotuvės. Puikus pasirinkimas šeimai ar investicijai.',
    new: true,
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=80',
      'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=900&q=80',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=80',
      'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=900&q=80',
    ],
  },
  {
    id: 2,
    type: 'pirkti',
    category: 'namas',
    title: 'Modernus namas Santarikėse',
    address: 'Santariškių g. 15, Vilnius',
    location: 'Vilnius, Santariškės',
    price: '420 000 €',
    pricePerSqm: '2 333 €/m²',
    area: '180 m²',
    rooms: '5',
    floor: '2 aukštai',
    year: '2021',
    heating: 'Šilumos siurblys',
    energy: 'A+',
    condition: 'Puiki',
    equipment: 'Pilnai įrengtas',
    desc: 'Modernus 2 aukštų namas Santarikėse, pastatytas 2021 m. Atviro plano erdvės, šilumos siurblys, rekuperacija, garažas 2 automobiliams. Aptverta teritorija, erdvi terasa, žaidimų aikštelė. Rami vieta šeimoms.',
    new: false,
    images: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80',
      'https://images.unsplash.com/photo-1600607686527-6fb886090705?w=900&q=80',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=80',
    ],
  },
  {
    id: 3,
    type: 'nuomoti',
    category: 'butas',
    title: '1 k. butas Žvėryne',
    address: 'Žvejų g. 8, Vilnius',
    location: 'Vilnius, Žvėrynas',
    price: '650 €/mėn.',
    pricePerSqm: '17 €/m²',
    area: '38 m²',
    rooms: '1',
    floor: '2/4',
    year: '1998',
    heating: 'Centrinis',
    energy: 'C',
    condition: 'Gera',
    equipment: 'Visiškai įrengtas',
    desc: 'Jaukus 1 kambario butas prestižiniame Žvėryno rajone. Visiškai įrengtas – su nauja virtuve, vonios kambario įranga ir baldais. Rami, žalia aplinka, šalia miesto centro. Tinka nuolatiniam gyvenimui ar trumpalaikei nuomai.',
    new: true,
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&q=80',
      'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=900&q=80',
      'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=900&q=80',
    ],
  },
  {
    id: 4,
    type: 'pirkti',
    category: 'butas',
    title: '2 k. butas Kauno senamiestyje',
    address: 'Laisvės al. 52, Kaunas',
    location: 'Kaunas, Senamiestis',
    price: '115 000 €',
    pricePerSqm: '1 983 €/m²',
    area: '58 m²',
    rooms: '2',
    floor: '3/5',
    year: '1965',
    heating: 'Centrinis',
    energy: 'D',
    condition: 'Gera',
    equipment: 'Dalinai įrengtas',
    desc: 'Dviejų kambarių butas istoriniame Kauno senamiestyje, Laisvės alėjoje. Aukštos lubos, autentiška architektūra, unikalus miesto vaizdas iš langų. Netoli universitetų, kavinių ir verslo centro. Atliktas kosmetinis remontas.',
    new: false,
    images: [
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&q=80',
      'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=900&q=80',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=80',
      'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=900&q=80',
    ],
  },
  {
    id: 5,
    type: 'pirkti',
    category: 'sklypas',
    title: 'Sklypas prie Neries',
    address: 'Verkių g., Vilnius',
    location: 'Vilnius, Verkiai',
    price: '95 000 €',
    pricePerSqm: '79 €/m²',
    area: '1 200 m²',
    rooms: null,
    floor: null,
    year: null,
    heating: null,
    energy: null,
    condition: 'Tvarkingas',
    equipment: 'Komunikacijos šalia',
    desc: 'Puikus sklypas Verkiuose, šalia Neries upės ir miško. Lygus reljefas, elektra, vandentiekis ir kanalizacija šalia. Tinka gyvenamojo namo ar kotedžų kvartalui statyti. Rami, gamtinga vieta Vilniaus pakraštyje.',
    new: false,
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=900&q=80',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&q=80',
      'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=900&q=80',
      'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=900&q=80',
    ],
  },
  {
    id: 6,
    type: 'pirkti',
    category: 'komercinis',
    title: 'Biuro patalpos centre',
    address: 'Gedimino pr. 20, Vilnius',
    location: 'Vilnius, Senamiestis',
    price: '250 000 €',
    pricePerSqm: '2 083 €/m²',
    area: '120 m²',
    rooms: null,
    floor: '2/4',
    year: '2010',
    heating: 'Centrinis',
    energy: 'B',
    condition: 'Puiki',
    equipment: 'Pilnai įrengtas',
    desc: 'Reprezentatyvios biuro patalpos Vilniaus senamiestyje, Gedimino prospekte. Atviras planas – galima pertvarkyti pagal poreikius. Erdvus bendras koridorius, liftas, parkavimas, sandėliavimo patalpa. Puiki vieta prestižiniam verslui.',
    new: true,
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&q=80',
      'https://images.unsplash.com/photo-1497366754035-f200968a2a8a?w=900&q=80',
      'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=900&q=80',
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&q=80',
    ],
  },
  {
    id: 7,
    type: 'nuomoti',
    category: 'butas',
    title: '2 k. butas Šiauliuose',
    address: 'Tilžės g. 18, Šiauliai',
    location: 'Šiauliai, Centras',
    price: '350 €/mėn.',
    pricePerSqm: '7 €/m²',
    area: '52 m²',
    rooms: '2',
    floor: '1/3',
    year: '1985',
    heating: 'Centrinis',
    energy: 'E',
    condition: 'Vidutinė',
    equipment: 'Dalinai įrengtas',
    desc: 'Dviejų kambarių butas Šiaulių centre, 3 minutės pėsčiomis iki centrinės gatvės. Švari daugiaaukštė, atliktas vidutinis remontas, yra balkonas ir rūsys. Patogus susisiekimas su visais miesto rajonais.',
    new: false,
    images: [
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900&q=80',
      'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=900&q=80',
      'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=900&q=80',
      'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=900&q=80',
    ],
  },
  {
    id: 8,
    type: 'pirkti',
    category: 'namas',
    title: 'Kotedžas Palangoje',
    address: 'Jūratės g. 5, Palanga',
    location: 'Palanga, Pajūris',
    price: '310 000 €',
    pricePerSqm: '2 214 €/m²',
    area: '140 m²',
    rooms: '4',
    floor: '2 aukštai',
    year: '2019',
    heating: 'Šilumos siurblys',
    energy: 'A',
    condition: 'Puiki',
    equipment: 'Pilnai įrengtas',
    desc: 'Moderni kotedžo tipo namo dalis Palangoje, 800 m iki jūros. Šildoma grindimis, A energetinė klasė, erdvi terasa, privati zona. Puikiai tinka tiek nuolatiniam gyvenimui, tiek sezoniniams nuomininkams. Investicija su pajūrio nuomos potencialu.',
    new: true,
    images: [
      'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=900&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80',
      'https://images.unsplash.com/photo-1600607686527-6fb886090705?w=900&q=80',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80',
    ],
  },
];
// PROPERTIES_PLACEHOLDER_END

async function loadData() {
  try {
    const res = await fetch('data/properties.json?v=' + Date.now(), { cache: 'no-cache' });
    if (!res.ok) throw new Error('fetch failed');
    PROPERTIES = await res.json();
  } catch {
    console.warn('Nepavyko įkelti data/properties.json – naudojami numatytieji duomenys.');
    PROPERTIES = FALLBACK_PROPERTIES;
  }
}

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  activeFilter: 'visi',
  typeFilter: 'all',
  locationFilter: null,
  maxPrice: null,
  visibleCount: 6,
  activeTab: 'pirkti',
  testimonialIndex: 0,
  galleryIndex: 0,
};

// ─── DOM references ───────────────────────────────────────────────────────────

const dom = {
  header:          document.getElementById('header'),
  burger:          document.getElementById('burger'),
  nav:             document.getElementById('nav'),
  listings:        document.getElementById('listings'),
  loadMore:        document.getElementById('loadMore'),
  searchBtn:       document.getElementById('searchBtn'),
  contactForm:     document.getElementById('contactForm'),
  formSuccess:     document.getElementById('formSuccess'),
  scrollTop:       document.getElementById('scrollTop'),
  year:            document.getElementById('year'),
  testimonialTrack: document.getElementById('testimonialTrack'),
  testimonialDots:  document.getElementById('testimonialDots'),
  modalOverlay:        document.getElementById('modalOverlay'),
  modal:               document.getElementById('modal'),
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
  div.textContent = str;
  return div.innerHTML;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Header ───────────────────────────────────────────────────────────────────

function initHeader() {
  const onScroll = () => {
    dom.header.classList.toggle('scrolled', window.scrollY > 40);
    dom.scrollTop.classList.toggle('visible', window.scrollY > 400);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ─── Burger / Mobile nav ─────────────────────────────────────────────────────

function initBurger() {
  dom.burger.addEventListener('click', () => {
    const open = dom.nav.classList.toggle('open');
    dom.burger.classList.toggle('open', open);
    dom.burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  // Close nav on link click
  dom.nav.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', closeNav);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (dom.nav.classList.contains('open') &&
        !dom.nav.contains(e.target) &&
        !dom.burger.contains(e.target)) {
      closeNav();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.nav.classList.contains('open')) {
      closeNav();
      dom.burger.focus();
    }
  });
}

function closeNav() {
  dom.nav.classList.remove('open');
  dom.burger.classList.remove('open');
  dom.burger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

// ─── Active nav link on scroll ────────────────────────────────────────────────

function initNavHighlight() {
  const sections = document.querySelectorAll('section[id]');
  const links = dom.nav.querySelectorAll('.nav__link[href^="#"]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        const active = dom.nav.querySelector(`.nav__link[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => observer.observe(s));
}

// ─── Counter animation ────────────────────────────────────────────────────────

function animateCounters() {
  const counters = document.querySelectorAll('.stat__number[data-target]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);

      const el = entry.target;
      const target = parseInt(el.dataset.target, 10);
      const duration = 1800;
      const start = performance.now();

      const tick = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutQuart
        const ease = 1 - Math.pow(1 - progress, 4);
        el.textContent = Math.round(target * ease);
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target;
      };

      requestAnimationFrame(tick);
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
}

// ─── Search dropdowns (dynamic from data) ────────────────────────────────────

const CAT_LT = { butas: 'Butas', namas: 'Namas', sklypas: 'Sklypas', komercinis: 'Komercinis' };

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

function populateSearchDropdowns() {
  const tab  = state.activeTab || 'pirkti';
  const pool = PROPERTIES.filter(p => (!p.status || p.status === 'active') && p.type === tab);

  // ── Vieta ──
  const cities = [...new Set(pool.map(p => propCity(p)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'lt'));
  const vietaEl = document.getElementById('vieta');
  const prevVieta = vietaEl.value;
  vietaEl.innerHTML = '<option value="">Miestas / rajonas</option>' +
    cities.map(c => {
      const label = (pool.find(p => propCity(p) === c)?.location || '').split(',')[0].trim();
      return `<option value="${c}">${sanitize(label)}</option>`;
    }).join('');
  if (cities.includes(prevVieta)) vietaEl.value = prevVieta;

  // ── Tipas ──
  const cats = [...new Set(pool.map(p => p.category).filter(Boolean))];
  const tipasEl = document.getElementById('tipas');
  const prevTipas = tipasEl.value;
  tipasEl.innerHTML = '<option value="">NT tipas</option>' +
    cats.map(c => `<option value="${c}">${CAT_LT[c] || c}</option>`).join('');
  if (cats.includes(prevTipas)) tipasEl.value = prevTipas;

  // ── Kaina ──
  const prices = pool.map(p => parsePrice(p.price)).filter(n => n !== null);
  if (!prices.length) return;
  const maxVal = Math.max(...prices);
  const isRent = tab === 'nuomoti';

  const brackets = isRent
    ? [300, 500, 700, 1000, 1500, 2000, 3000]
    : [50000, 75000, 100000, 150000, 200000, 300000, 400000, 500000, 700000, 1000000];

  const kainaEl = document.getElementById('kaina');
  const prevKaina = kainaEl.value;
  kainaEl.innerHTML = '<option value="">Maksimali kaina</option>' +
    brackets
      .filter(b => b <= maxVal * 1.15)
      .map(b => {
        const label = isRent
          ? `iki ${fmtNum(b)} €/mėn.`
          : `iki ${fmtNum(b)} €`;
        return `<option value="${b}">${label}</option>`;
      }).join('');
  if (prevKaina && kainaEl.querySelector(`option[value="${prevKaina}"]`)) kainaEl.value = prevKaina;
}

// ─── Search tabs ──────────────────────────────────────────────────────────────

function initSearchTabs() {
  document.querySelectorAll('.search-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.search-tab').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      state.activeTab = btn.dataset.tab;  // tik išsaugomas pasirinkimas
      populateSearchDropdowns();          // atnaujinti pasirinkimus pagal tipą
    });
  });
}

// ─── Listings ────────────────────────────────────────────────────────────────

function buildCard(prop) {
  const badgeClass = prop.type === 'pirkti' ? 'badge--pirkti' : 'badge--nuomoti';
  const badgeText  = prop.type === 'pirkti' ? 'Parduodama' : 'Nuomojama';

  const card = document.createElement('article');
  card.className = 'property-card fade-in';
  card.dataset.category = prop.category;
  card.setAttribute('aria-label', sanitize(prop.title));

  const metaRooms = prop.rooms !== '—'
    ? `<span>🚪 ${sanitize(prop.rooms)} kamb.</span>` : '';
  const metaFloor = prop.floor !== '—'
    ? `<span>🏢 ${sanitize(prop.floor)} aukštas</span>` : '';

  card.innerHTML = `
    <div class="property-card__image">
      <img
        class="property-card__img"
        src="${sanitize(prop.images[0])}"
        alt="${sanitize(prop.title)}"
        loading="lazy"
        decoding="async"
        width="600"
        height="375"
      />
      ${prop.new ? `<span class="property-card__badge badge--pirkti" style="background:#e53e3e">Naujas</span>` : ''}
      <span class="property-card__badge ${badgeClass}" style="${prop.new ? 'left:auto;right:12px' : ''}">${badgeText}</span>
      <button
        class="property-card__share"
        data-id="${prop.id}"
        aria-label="Dalintis"
      >🔗</button>
    </div>
    <div class="property-card__body">
      <p class="property-card__price">${sanitize(prop.price)}</p>
      <h3 class="property-card__title">${sanitize(prop.title)}</h3>
      <p class="property-card__location">📍 ${sanitize(prop.location)}</p>
      <div class="property-card__meta">
        <span>📐 ${sanitize(prop.area)}</span>
        ${metaRooms}
        ${metaFloor}
      </div>
      <button class="property-card__details" data-id="${prop.id}" aria-label="Peržiūrėti ${sanitize(prop.title)} detales">Žiūrėti detaliau →</button>
    </div>
  `;

  card.querySelector('.property-card__details').addEventListener('click', function () {
    openModal(prop);
  });

  card.querySelector('.property-card__img').addEventListener('click', function () {
    openModal(prop);
  });

  card.querySelector('.property-card__share').addEventListener('click', function (e) {
    e.stopPropagation();
    shareProp(prop);
  });

  return card;
}

function renderListings() {
  let pool;
  if (state.typeFilter === 'parduoti') {
    pool = PROPERTIES.filter(p => p.status === 'sold' || p.status === 'rented');
  } else {
    pool = PROPERTIES.filter(p => !p.status || p.status === 'active');
    if (state.typeFilter === 'pirkti')  pool = pool.filter(p => p.type === 'pirkti');
    if (state.typeFilter === 'nuomoti') pool = pool.filter(p => p.type === 'nuomoti');
  }

  if (state.locationFilter) {
    pool = pool.filter(p => propCity(p) === state.locationFilter);
  }
  if (state.maxPrice) {
    pool = pool.filter(p => {
      const n = parsePrice(p.price);
      return n !== null && n <= state.maxPrice;
    });
  }

  const filtered = (state.activeFilter === 'visi'
    ? pool
    : pool.filter(p => p.category === state.activeFilter))
    .slice().sort((a, b) => {
      // new:true pirma, tada naujausias ID
      if (b.new && !a.new) return 1;
      if (a.new && !b.new) return -1;
      return b.id - a.id;
    });

  const visible = filtered.slice(0, state.visibleCount);

  dom.listings.innerHTML = '';
  visible.forEach((prop, i) => {
    const card = buildCard(prop);
    card.style.transitionDelay = `${i * 60}ms`;
    dom.listings.appendChild(card);
  });

  // Trigger fade-in
  requestAnimationFrame(() => {
    dom.listings.querySelectorAll('.fade-in').forEach(el => {
      el.classList.add('visible');
    });
  });

  dom.loadMore.hidden = state.visibleCount >= filtered.length;
}

function initFilter() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeFilter = btn.dataset.filter;
      state.typeFilter   = 'all';  // reset tipo filtro kai keičiama kategorija
      state.visibleCount = 6;
      renderListings();
    });
  });
}

function initLoadMore() {
  dom.loadMore.addEventListener('click', () => {
    state.visibleCount += 3;
    renderListings();
    // Scroll to newly added cards smoothly
    const cards = dom.listings.querySelectorAll('.property-card');
    if (cards.length > 0) {
      cards[cards.length - 3]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function openModal(prop) {
  const badgeText  = prop.type === 'pirkti' ? 'Parduodama' : 'Nuomojama';
  const badgeColor = prop.type === 'pirkti' ? 'var(--clr-primary)' : 'var(--clr-accent)';

  // Gallery
  state.galleryIndex = 0;
  renderGallery(prop);

  dom.modalBadge.textContent = badgeText;
  dom.modalBadge.style.background = badgeColor;
  dom.modalPrice.textContent = prop.price;
  dom.modalPriceSqm.textContent = prop.pricePerSqm ? `${prop.pricePerSqm} · ${prop.area}` : prop.area;
  dom.modalTitle.textContent = prop.title;
  dom.modalLocation.textContent = '📍 ' + (prop.address || prop.location);

  // Detail table rows
  const CATEGORY_LT = { butas: 'Butas', namas: 'Namas', sklypas: 'Sklypas', komercinis: 'Komercinis NT' };
  const rows = [
    ['Tipas',              CATEGORY_LT[prop.category] || prop.category],
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

  dom.modalTable.innerHTML = rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td>${sanitize(k)}</td><td>${sanitize(v)}</td></tr>`)
    .join('');

  dom.modalDesc.innerHTML = `<p>${sanitize(prop.desc || '')}</p>`;

  dom.modalFav.onclick = () => shareProp(prop);

  dom.modalContact.onclick = (e) => { e.preventDefault(); openContactPopup(prop); };

  dom.modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  dom.modalClose.focus();
}

function renderGallery(prop) {
  const imgs = prop.images;

  // Main image – show immediately without fade on first load
  dom.modalGalleryImg.src = imgs[0];
  dom.modalGalleryImg.alt = prop.title;
  dom.modalGalleryCounter.textContent = `1 / ${imgs.length}`;

  // Thumbnails
  dom.modalGalleryThumbs.innerHTML = '';
  imgs.forEach((src, i) => {
    const btn = document.createElement('button');
    btn.className = `modal__gallery-thumb${i === 0 ? ' active' : ''}`;
    btn.setAttribute('aria-label', `${i + 1}. nuotrauka`);
    btn.setAttribute('aria-pressed', String(i === 0));
    const thumbSrc = src.replace('w=900', 'w=180');
    btn.innerHTML = `<img src="${sanitize(thumbSrc)}" alt="" loading="lazy" decoding="async" />`;
    btn.addEventListener('click', () => setGalleryImage(prop, i));
    dom.modalGalleryThumbs.appendChild(btn);
  });

  // Arrows
  const single = imgs.length <= 1;
  dom.modalGalleryPrev.hidden = single;
  dom.modalGalleryNext.hidden = single;
  dom.modalGalleryCounter.hidden = single;

  dom.modalGalleryPrev.onclick = () => {
    const next = (state.galleryIndex - 1 + imgs.length) % imgs.length;
    setGalleryImage(prop, next);
  };
  dom.modalGalleryNext.onclick = () => {
    const next = (state.galleryIndex + 1) % imgs.length;
    setGalleryImage(prop, next);
  };

  // Keyboard navigation inside gallery
  dom.modalGalleryImg.parentElement.onkeydown = (e) => {
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
    popup.remove();
    closeModal();
    document.getElementById('zinute').value = msg;
    setTimeout(() => document.getElementById('kontaktai').scrollIntoView({ behavior: 'smooth' }), 80);
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
  dom.modalOverlay.addEventListener('transitionend', () => {
    document.body.style.overflow = '';
  }, { once: true });
}

function initModal() {
  dom.modalClose.addEventListener('click', closeModal);
  dom.modalOverlay.addEventListener('click', (e) => {
    if (e.target === dom.modalOverlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (document.getElementById('contactPopup')) { document.getElementById('contactPopup').remove(); return; }
      const lb = document.getElementById('lightbox');
      if (lb && lb.classList.contains('open')) { lb.classList.remove('open'); return; }
      if (!dom.modalOverlay.hidden) closeModal();
    }
  });
  dom.modalGalleryImg.addEventListener('click', () => {
    openLightbox(dom.modalGalleryImg.src, dom.modalGalleryImg.alt);
  });
}

// ─── Search ───────────────────────────────────────────────────────────────────

function initSearch() {
  dom.searchBtn.addEventListener('click', () => {
    const p = new URLSearchParams();
    p.set('tab', state.activeTab || 'pirkti');
    const vieta = document.getElementById('vieta').value;
    const tipas = document.getElementById('tipas').value;
    const kaina = document.getElementById('kaina').value;
    if (vieta) p.set('vieta', vieta);
    if (tipas) p.set('tipas', tipas);
    if (kaina) p.set('kaina', kaina);
    const dest = new URL('./search', location.href);
    dest.hash = p.toString();
    location.href = dest.toString();
  });
}

// ─── Testimonials (dynamic) ──────────────────────────────────────────────────────────────────────────

let TESTIMONIALS = [];

async function loadTestimonials() {
  try {
    const res = await fetch('data/testimonials.json?v=' + Date.now(), { cache: 'no-cache' });
    if (!res.ok) throw new Error();
    TESTIMONIALS = (await res.json()).filter(t => t.status === 'approved');
  } catch {
    TESTIMONIALS = [];
  }
}

function renderTestimonials() {
  if (!TESTIMONIALS.length) return;
  dom.testimonialTrack.innerHTML = TESTIMONIALS.map(t => {
    const stars = '★'.repeat(t.rating) + '☆'.repeat(5 - t.rating);
    return `
      <article class="testimonial-card">
        <div class="testimonial-card__stars" aria-label="${t.rating} iš 5 žvaiguždžių">${stars}</div>
        <p class="testimonial-card__text">„${sanitize(t.text)}“</p>
        <div class="testimonial-card__author">
          <div class="testimonial-card__avatar" aria-hidden="true">${sanitize(t.initials || t.name.slice(0,2).toUpperCase())}</div>
          <div>
            <strong>${sanitize(t.name)}</strong>
            <span>${sanitize(t.location)}</span>
          </div>
        </div>
      </article>`;
  }).join('');
}

function initReviewForm() {
  const overlay  = document.getElementById('reviewOverlay');
  const closeBtn = document.getElementById('reviewClose');
  const openBtn  = document.getElementById('btnLeaveReview');
  if (!overlay || !openBtn) return;

  let rating = 0;

  function openReview() {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    // Reset state
    document.getElementById('reviewFormWrap').classList.remove('hidden');
    document.getElementById('reviewSuccess').classList.add('hidden');
    document.getElementById('reviewForm').reset();
    document.getElementById('reviewFormError').classList.add('hidden');
    rating = 0;
    overlay.querySelectorAll('.review-stars-row button').forEach(b => b.classList.remove('lit'));
  }

  function closeReview() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  openBtn.addEventListener('click', openReview);
  closeBtn.addEventListener('click', closeReview);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeReview(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeReview();
  });

  // Star rating
  const starBtns = overlay.querySelectorAll('.review-stars-row button');
  starBtns.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      const n = +btn.dataset.star;
      starBtns.forEach(b => b.classList.toggle('lit', +b.dataset.star <= n));
    });
    btn.addEventListener('click', () => {
      rating = +btn.dataset.star;
      starBtns.forEach(b => b.classList.toggle('lit', +b.dataset.star <= rating));
    });
  });
  overlay.querySelector('.review-stars-row').addEventListener('mouseleave', () => {
    starBtns.forEach(b => b.classList.toggle('lit', +b.dataset.star <= rating));
  });

  // Submit
  document.getElementById('reviewForm').addEventListener('submit', e => {
    e.preventDefault();
    const name  = document.getElementById('reviewName').value.trim();
    const city  = document.getElementById('reviewCity').value.trim();
    const text  = document.getElementById('reviewText').value.trim();
    const errEl = document.getElementById('reviewFormError');

    if (!name)     { errEl.textContent = 'Prašome įvesti vardą.';       errEl.classList.remove('hidden'); return; }
    if (!text)     { errEl.textContent = 'Parašykite atsiliepimu.';     errEl.classList.remove('hidden'); return; }
    if (rating < 1){ errEl.textContent = 'Pasirinkite įvertinimą.';     errEl.classList.remove('hidden'); return; }
    errEl.classList.add('hidden');

    const review = {
      id: Date.now(),
      name,
      location: city,
      initials: name.split(' ').slice(0,2).map(w => w[0]?.toUpperCase() || '').join(''),
      rating,
      text,
      status: 'pending',
      submitted: new Date().toISOString(),
    };

    const pending = JSON.parse(localStorage.getItem('ntilona_pending_reviews') || '[]');
    pending.push(review);
    localStorage.setItem('ntilona_pending_reviews', JSON.stringify(pending));

    document.getElementById('reviewFormWrap').classList.add('hidden');
    const successEl = document.getElementById('reviewSuccess');
    successEl.classList.remove('hidden');
    // Auto-close after 4 s
    const autoClose = setTimeout(() => closeReview(), 4000);
    document.getElementById('reviewSuccessClose').onclick = () => { clearTimeout(autoClose); closeReview(); };
  });
}

// ─── Testimonials slider ─────────────────────────────────────────────────────

function initTestimonials() {
  const cards = dom.testimonialTrack.querySelectorAll('.testimonial-card');
  const total = cards.length;

  function getPerPage() {
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 640)  return 2;
    return 1;
  }

  function updateSlider() {
    const perPage = getPerPage();
    const maxIndex = Math.max(0, total - perPage);
    if (state.testimonialIndex > maxIndex) {
      state.testimonialIndex = maxIndex;
    }

    const cardWidth = dom.testimonialTrack.querySelector('.testimonial-card').offsetWidth + 28;
    dom.testimonialTrack.style.transform = `translateX(-${state.testimonialIndex * cardWidth}px)`;
    updateDots(perPage);
  }

  function updateDots(perPage) {
    dom.testimonialDots.innerHTML = '';
    const dotCount = Math.max(1, total - perPage + 1);

    for (let i = 0; i < dotCount; i++) {
      const btn = document.createElement('button');
      btn.className = `dot${i === state.testimonialIndex ? ' active' : ''}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-label', `${i + 1}. atsiliepimai`);
      btn.setAttribute('aria-selected', String(i === state.testimonialIndex));

      btn.addEventListener('click', () => {
        state.testimonialIndex = i;
        updateSlider();
      });

      dom.testimonialDots.appendChild(btn);
    }
  }

  // Auto-advance
  let autoTimer = setInterval(() => {
    const perPage = getPerPage();
    const maxIndex = Math.max(0, total - perPage);
    state.testimonialIndex = state.testimonialIndex >= maxIndex ? 0 : state.testimonialIndex + 1;
    updateSlider();
  }, 5000);

  // Pause on hover
  dom.testimonialTrack.addEventListener('mouseenter', () => clearInterval(autoTimer));
  dom.testimonialTrack.addEventListener('mouseleave', () => {
    autoTimer = setInterval(() => {
      const perPage = getPerPage();
      const maxIndex = Math.max(0, total - perPage);
      state.testimonialIndex = state.testimonialIndex >= maxIndex ? 0 : state.testimonialIndex + 1;
      updateSlider();
    }, 5000);
  });

  // Touch / swipe
  let touchStartX = 0;
  dom.testimonialTrack.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  dom.testimonialTrack.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      const perPage = getPerPage();
      const maxIndex = Math.max(0, total - perPage);
      if (diff > 0 && state.testimonialIndex < maxIndex) state.testimonialIndex++;
      if (diff < 0 && state.testimonialIndex > 0)        state.testimonialIndex--;
      updateSlider();
    }
  }, { passive: true });

  window.addEventListener('resize', debounce(updateSlider, 200));
  updateSlider();
}

// ─── Contact form ─────────────────────────────────────────────────────────────

function initContactForm() {
  const savedMsg = sessionStorage.getItem('ntilona_contact_msg');
  if (savedMsg) {
    const el = document.getElementById('zinute');
    if (el) el.value = savedMsg;
    sessionStorage.removeItem('ntilona_contact_msg');
  }

  dom.contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const btn = dom.contactForm.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Siunčiama...';

    // Simulate async send
    setTimeout(() => {
      dom.contactForm.reset();
      dom.formSuccess.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Siųsti žinutę';
      dom.formSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      setTimeout(() => {
        dom.formSuccess.hidden = true;
      }, 8000);
    }, 1200);
  });

  // Live validation
  ['name', 'email', 'zinute'].forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener('blur', () => validateField(id));
    input.addEventListener('input', () => {
      if (input.classList.contains('error')) validateField(id);
    });
  });
}

function validateField(id) {
  const input  = document.getElementById(id);
  const error  = document.getElementById(`${id}Error`);
  let   msg    = '';

  if (id === 'name') {
    if (!input.value.trim()) msg = 'Prašome įvesti vardą.';
    else if (input.value.trim().length < 2) msg = 'Vardas per trumpas.';
  }

  if (id === 'email') {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!input.value.trim()) msg = 'Prašome įvesti el. paštą.';
    else if (!emailRe.test(input.value.trim())) msg = 'Neteisingas el. pašto formatas.';
  }

  if (id === 'zinute') {
    if (!input.value.trim()) msg = 'Prašome parašyti žinutę.';
    else if (input.value.trim().length < 10) msg = 'Žinutė per trumpa (min. 10 simbolių).';
  }

  if (error) error.textContent = msg;
  input.classList.toggle('error', !!msg);
  return !msg;
}

function validateForm() {
  const fieldsOk = ['name', 'email', 'zinute'].map(validateField).every(Boolean);

  const sutinku = document.getElementById('sutinku');
  const sutinkuError = document.getElementById('sutinkuError');
  const checkOk = sutinku.checked;

  if (sutinkuError) {
    sutinkuError.textContent = checkOk ? '' : 'Reikia sutikti su privatumo politika.';
  }

  return fieldsOk && checkOk;
}

// ─── Scroll to top ────────────────────────────────────────────────────────────

function initScrollTop() {
  dom.scrollTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ─── Fade-in on scroll ────────────────────────────────────────────────────────

function initFadeIn() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  // Observe service cards, about section, contact section
  document.querySelectorAll('.service-card, .about, .contact').forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
  });
}

// ─── Footer year ─────────────────────────────────────────────────────────────

function setYear() {
  if (dom.year) dom.year.textContent = new Date().getFullYear();
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  await loadData();
  setYear();
  initHeader();
  initBurger();
  initNavHighlight();
  animateCounters();
  initSearchTabs();
  populateSearchDropdowns();
  initFilter();
  renderListings();
  initLoadMore();
  initSearch();
  await loadTestimonials();
  renderTestimonials();
  initTestimonials();
  initReviewForm();
  initContactForm();
  initScrollTop();
  initFadeIn();
  initModal();
}

document.addEventListener('DOMContentLoaded', () => { init(); });
