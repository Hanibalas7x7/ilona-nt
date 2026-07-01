/* =============================================
   NT Ilona – Admin puslapis
   ============================================= */

'use strict';

const DATA_PATH         = '../data/properties.json';
const REVIEWS_PATH      = '../data/testimonials.json';
const PASS_KEY          = 'ntilona_admin_hash';
const GH_KEY            = 'ntilona_gh_config';
const LOCAL_KEY         = 'ntilona_properties_draft';
const PENDING_KEY       = 'ntilona_pending_reviews';
const HASH_GH_PATH      = 'admin/.pwdhash';          // slaptažodžio hash GitHub repozitorijoje
const HASH_ON_GH_KEY    = 'ntilona_hash_on_gh';      // žyma: ar hash jau įkeltas į GitHub

// ── State ───────────────────────────────────────────────────────────────────

const S = {
  properties: [],
  filter: 'all',
  editingId: null,
  unsaved: false,
  ghConfig: { owner: '', repo: '', branch: 'main', token: '' },
  fileSha: null,
  testimonials: [],
  reviewsSha: null,
};

// Image manager state
let formImages = []; // { url: string, preview?: string, uploading?: boolean }
let formNewId  = null; // pre-generated ID for new listings (keeps image folder consistent)

// ── Kainos formatavimo pagalbinės funkcijos ───────────────────────────────────
function parseEurAmount(str) {
  const n = parseInt((str || '').replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? null : n;
}
function formatEur(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + ' \u20ac';
}
function autoCalcPriceSqm() {
  const isRent = document.getElementById('fieldType').value === 'nuomoti';
  if (isRent) { document.getElementById('fieldPriceSqm').value = ''; return; }
  const price = parseEurAmount(document.getElementById('fieldPrice').value);
  const areaStr = (document.getElementById('fieldArea').value || '').replace(',', '.');
  const area  = parseFloat(areaStr.replace(/[^\d.]/g, ''));
  if (price && area > 0) {
    document.getElementById('fieldPriceSqm').value = formatEur(Math.round(price / area)) + '/m\u00b2';
  }
}

// ── Slaptažodžio maišos funkcijos (PBKDF2 + druska) ─────────────────────────

async function hashPassword(password, saltB64 = null) {
  const enc = new TextEncoder();
  if (!saltB64) {
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    saltB64 = btoa(String.fromCharCode(...saltBytes));
  }
  const saltBytes = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 150000, hash: 'SHA-256' },
    key, 256
  );
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(bits)));
  return `${saltB64}:${hashB64}`;
}

async function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false; // senasis formatas
  const [saltB64] = stored.split(':');
  const computed = await hashPassword(password, saltB64);
  return computed === stored;
}

// Brute-force apsauga
const _loginAttempts = { count: 0, lockedUntil: 0 };
function checkLoginThrottle() {
  if (Date.now() < _loginAttempts.lockedUntil) {
    const sek = Math.ceil((_loginAttempts.lockedUntil - Date.now()) / 1000);
    return `Per daug bandymų. Palaukite ${sek}s.`;
  }
  return null;
}
function recordFailedLogin() {
  _loginAttempts.count++;
  if (_loginAttempts.count >= 5) {
    _loginAttempts.lockedUntil = Date.now() + 30000; // 30s
    _loginAttempts.count = 0;
  }
}

// ── UTF-8 saugus base64 kodavimas (GitHub API) ───────────────────────────────

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  const binStr = Array.from(bytes, b => String.fromCodePoint(b)).join('');
  return btoa(binStr);
}

// ── Auth ─────────────────────────────────────────────────────────────────────

function isLoggedIn() {
  return sessionStorage.getItem('ntilona_session') === '1';
}

// Gauna slaptažodžio hash iš GitHub – tik jei žinome, kad jis ten yra
async function fetchHashFromGitHub() {
  if (!localStorage.getItem(HASH_ON_GH_KEY)) return null; // failas dar neįkeltas – neklausiame
  const cfg = S.ghConfig;
  if (!cfg.owner || !cfg.repo) return null;
  try {
    const branch = cfg.branch || 'main';
    const res = await fetch(
      `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${branch}/${HASH_GH_PATH}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text.includes(':') ? text : null;
  } catch { return null; }
}

// Išsaugo hash į GitHub
async function saveHashToGitHub(hash) {
  const { owner, repo, branch, token } = S.ghConfig;
  if (!owner || !repo || !token) return false;
  try {
    let sha;
    const check = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${HASH_GH_PATH}`,
      { headers: ghHeaders() }
    );
    if (check.ok) sha = (await check.json()).sha;
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${HASH_GH_PATH}`,
      {
        method: 'PUT',
        headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Admin: atnaujintas slaptažodis',
          content: btoa(hash),
          branch: branch || 'main',
          ...(sha ? { sha } : {}),
        }),
      }
    );
    if (!res.ok) return false;
    localStorage.setItem(HASH_ON_GH_KEY, '1'); // pažymime: hash yra GitHub
    return true;
  } catch { return false; }
}

async function showLoginScreen() {
  // GitHub hash naudojamas TIK jei localStorage tuščias (naujas įrenginys)
  if (!localStorage.getItem(PASS_KEY)) {
    const ghHash = await fetchHashFromGitHub();
    if (ghHash) localStorage.setItem(PASS_KEY, ghHash);
  }

  const hasHash = !!localStorage.getItem(PASS_KEY);
  document.getElementById('setupForm').classList.toggle('hidden', hasHash);
  document.getElementById('loginForm').classList.toggle('hidden', !hasHash);
}

document.getElementById('setupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const owner = document.getElementById('setupOwner').value.trim();
  const repo  = document.getElementById('setupRepo').value.trim();
  const token = document.getElementById('setupToken').value.trim();
  const p1    = document.getElementById('setupPass').value;
  const p2    = document.getElementById('setupPass2').value;
  const err   = document.getElementById('setupError');
  const btn   = e.target.querySelector('[type=submit]');

  if (!owner || !repo)   { showError(err, 'Įveskite GitHub vartotoją ir repozitorijos pavadinimą.'); return; }
  if (!token)            { showError(err, 'Įveskite GitHub Personal Access Token.'); return; }
  if (p1 !== p2)         { showError(err, 'Slaptažodžiai nesutampa.'); return; }
  if (p1.length < 6)     { showError(err, 'Slaptažodis per trumpas (min. 6 simboliai).'); return; }

  // Tikriname tokeną per GitHub API
  btn.disabled = true;
  btn.textContent = 'Tikrinama...';
  try {
    const check = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!check.ok) {
      showError(err, 'Neteisingas tokenas arba repozitorija nerasta. Patikrinkite duomenis.');
      return;
    }
  } catch {
    showError(err, 'Nepavyko patikrinti tokeno. Patikrinkite interneto ryšį.');
    return;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Nustatyti slaptažodį';
  }

  // Tokenas teisingas — išsaugome konfigūraciją ir slaptažodį
  S.ghConfig = { owner, repo, branch: 'main', token };
  localStorage.setItem(GH_KEY, JSON.stringify(S.ghConfig));

  const hash = await hashPassword(p1);
  localStorage.setItem(PASS_KEY, hash);
  sessionStorage.setItem('ntilona_session', '1');
  hideError(err);
  await enterAdmin();
  saveHashToGitHub(hash); // išsaugome į GitHub fone
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pass = document.getElementById('loginPass').value;
  const err  = document.getElementById('loginError');
  const throttle = checkLoginThrottle();
  if (throttle) { showError(err, throttle); return; }
  const stored = localStorage.getItem(PASS_KEY);
  const ok = stored && await verifyPassword(pass, stored);
  if (!ok) {
    recordFailedLogin();
    showError(err, 'Neteisingas slaptažodis.');
    document.getElementById('loginPass').value = '';
    return;
  }
  hideError(err);
  sessionStorage.setItem('ntilona_session', '1');
  await enterAdmin();
});

document.getElementById('forgotPassLink').addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem(PASS_KEY);
  localStorage.removeItem(HASH_ON_GH_KEY);
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('setupForm').classList.remove('hidden');
  // Užpildome owner/repo jei jau žinome
  const cfg = S.ghConfig;
  if (cfg.owner) document.getElementById('setupOwner').value = cfg.owner;
  if (cfg.repo)  document.getElementById('setupRepo').value  = cfg.repo;
});

function doLogout() {
  if (!S.unsaved || confirm('Yra neišsaugotų pakeitimų. Atsijungti?')) {
    sessionStorage.removeItem('ntilona_session');
    location.reload();
  }
}
document.getElementById('btnLogout').addEventListener('click', doLogout);
document.getElementById('btnLogoutSettings').addEventListener('click', doLogout);

// ── Enter admin ───────────────────────────────────────────────────────────────

async function enterAdmin() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('adminScreen').classList.remove('hidden');

  // Load GitHub config
  const stored = localStorage.getItem(GH_KEY);
  if (stored) S.ghConfig = { ...S.ghConfig, ...JSON.parse(stored) };

  // Load properties & testimonials in parallel
  await Promise.all([loadProperties(), loadTestimonialsAdmin()]);
  renderTable();
  updateCounts();
  renderReviewsSection();
  initSectionNav();
}

// ── Load properties ───────────────────────────────────────────────────────────

async function loadProperties() {
  // Try GitHub first (gets SHA needed for updates)
  if (S.ghConfig.owner && S.ghConfig.repo && S.ghConfig.token) {
    try {
      const res = await ghGetFile();
      if (res.ok) {
        const data = await res.json();
        S.fileSha = data.sha;
        const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
        S.properties = JSON.parse(content);
        return;
      }
    } catch { /* fall through */ }
  }

  // Try local relative path (works when served over HTTP)
  try {
    const res = await fetch(DATA_PATH);
    if (res.ok) {
      S.properties = await res.json();
      return;
    }
  } catch { /* fall through */ }

  // Use draft from localStorage if available
  const draft = localStorage.getItem(LOCAL_KEY);
  if (draft) S.properties = JSON.parse(draft);
}

// ── GitHub API ────────────────────────────────────────────────────────────────

function ghUrl() {
  const { owner, repo, branch } = S.ghConfig;
  const b = branch || 'main';
  return `https://api.github.com/repos/${owner}/${repo}/contents/data/properties.json?ref=${b}`;
}

function ghHeaders() {
  return {
    'Authorization': `Bearer ${S.ghConfig.token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function ghGetFile() {
  return fetch(ghUrl(), { headers: ghHeaders() });
}

async function saveToGitHub() {
  const btn = document.getElementById('btnSaveGh');
  const msg = document.getElementById('saveStatusMsg');
  const { owner, repo, token } = S.ghConfig;

  if (!owner || !repo || !token) {
    showStatusMsg('Pirmiausia sukonfigūruokite GitHub nustatymus (⚙️ Nustatymai).', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Siunčiama...';
  hideStatusMsg();

  try {
    // Refresh SHA
    const getRes = await ghGetFile();
    if (getRes.ok) {
      const d = await getRes.json();
      S.fileSha = d.sha;
    }

    const jsonStr  = JSON.stringify(S.properties, null, 2);
    const content  = toBase64(jsonStr);
    const branch   = S.ghConfig.branch || 'main';

    const body = {
      message: `Admin: atnaujinti skelbimai ${new Date().toISOString().slice(0, 10)}`,
      content,
      branch,
      ...(S.fileSha ? { sha: S.fileSha } : {}),
    };

    const putRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/data/properties.json`,
      { method: 'PUT', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );

    if (!putRes.ok) {
      const err = await putRes.json();
      throw new Error(err.message || putRes.statusText);
    }

    const result = await putRes.json();
    S.fileSha = result.content?.sha || S.fileSha;

    setUnsaved(false);
    showStatusMsg('✅ Išsaugota į GitHub! Cloudflare Pages pradės perkurti svetainę.', 'success');
    localStorage.removeItem(LOCAL_KEY);
  } catch (err) {
    showStatusMsg(`❌ Klaida: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Išsaugoti į GitHub';
  }
}

// ── Export JSON ───────────────────────────────────────────────────────────────

function exportJSON() {
  const blob = new Blob([JSON.stringify(S.properties, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'properties.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Testimonials (Admin) ──────────────────────────────────────────────────────

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function loadTestimonialsAdmin() {
  if (S.ghConfig.owner && S.ghConfig.repo && S.ghConfig.token) {
    try {
      const { owner, repo, branch } = S.ghConfig;
      const b = branch || 'main';
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/data/testimonials.json?ref=${b}`,
        { headers: ghHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        S.reviewsSha = data.sha;
        S.testimonials = JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))));
        return;
      }
    } catch { /* fall through */ }
  }
  try {
    const res = await fetch(REVIEWS_PATH);
    if (res.ok) S.testimonials = await res.json();
  } catch { S.testimonials = []; }
}

async function saveTestimonialsToGitHub() {
  const { owner, repo, token, branch } = S.ghConfig;
  if (!owner || !repo || !token) throw new Error('GitHub nesukonfigūruotas');

  const b = branch || 'main';
  try {
    const getRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/data/testimonials.json?ref=${b}`,
      { headers: ghHeaders() }
    );
    if (getRes.ok) { const d = await getRes.json(); S.reviewsSha = d.sha; }
  } catch { /* use existing SHA */ }

  const body = {
    message: `Admin: atnaujinti atsiliepimai ${new Date().toISOString().slice(0, 10)}`,
    content: toBase64(JSON.stringify(S.testimonials, null, 2)),
    branch: b,
    ...(S.reviewsSha ? { sha: S.reviewsSha } : {}),
  };

  const putRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/data/testimonials.json`,
    { method: 'PUT', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  if (!putRes.ok) { const err = await putRes.json(); throw new Error(err.message || putRes.statusText); }
  const result = await putRes.json();
  S.reviewsSha = result.content?.sha || S.reviewsSha;
}

function updatePendingBadge(count) {
  const badge = document.getElementById('pendingBadge');
  if (!badge) return;
  if (count > 0) { badge.textContent = count; badge.classList.remove('hidden'); }
  else { badge.classList.add('hidden'); }
}

function renderReviewsSection() {
  const pending  = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
  const approved = S.testimonials.filter(t => t.status === 'approved');

  const pCount = document.getElementById('pendingCount');
  const aCount = document.getElementById('approvedCount');
  if (pCount) pCount.textContent = pending.length;
  if (aCount) aCount.textContent = approved.length;
  updatePendingBadge(pending.length);

  const pendingList = document.getElementById('pendingList');
  if (pendingList) {
    pendingList.innerHTML = !pending.length
      ? '<p class="review-empty">Laukiančių atsiliepimų nėra.</p>'
      : pending.map(r => `
        <div class="review-card">
          <div class="review-card__stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
          <p class="review-card__text">${escHtml(r.text)}</p>
          <div class="review-card__meta">
            <strong>${escHtml(r.name)}</strong>
            ${r.location ? ` · ${escHtml(r.location)}` : ''}
            <small style="color:#999;margin-left:8px">${new Date(r.submitted || Date.now()).toLocaleDateString('lt-LT')}</small>
          </div>
          <div class="review-card__actions">
            <button class="btn btn-success btn-sm" onclick="approveReview(${r.id})">✅ Patvirtinti</button>
            <button class="btn btn-danger  btn-sm" onclick="rejectReview(${r.id})">❌ Atmesti</button>
          </div>
        </div>`).join('');
  }

  const approvedList = document.getElementById('approvedList');
  if (approvedList) {
    approvedList.innerHTML = !approved.length
      ? '<p class="review-empty">Patvirtintų atsiliepimų nėra.</p>'
      : approved.map(t => `
        <div class="review-card">
          <div class="review-card__stars">${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)}</div>
          <p class="review-card__text">${escHtml(t.text)}</p>
          <div class="review-card__meta">
            <strong>${escHtml(t.name)}</strong>
            ${t.location ? ` · ${escHtml(t.location)}` : ''}
          </div>
          <div class="review-card__actions">
            <button class="btn btn-danger btn-sm" onclick="deleteTestimonial(${t.id})">🗑 Ištrinti</button>
          </div>
        </div>`).join('');
  }
}

async function approveReview(id) {
  const msg = document.getElementById('reviewsStatusMsg');
  const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
  const idx = pending.findIndex(r => r.id === id);
  if (idx === -1) return;

  const review = { ...pending[idx], status: 'approved' };
  delete review.submitted;
  S.testimonials.push(review);
  pending.splice(idx, 1);
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));

  try {
    await saveTestimonialsToGitHub();
    renderReviewsSection();
    if (msg) { msg.textContent = '✅ Atsiliepimas patvirtintas ir išsaugotas.'; msg.className = 'status-msg status-msg--success'; msg.classList.remove('hidden'); setTimeout(() => msg.classList.add('hidden'), 4000); }
  } catch (e) {
    S.testimonials.pop();
    pending.splice(idx, 0, { ...review, submitted: review.submitted, status: 'pending' });
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    if (msg) { msg.textContent = `❌ Klaida: ${e.message}`; msg.className = 'status-msg status-msg--error'; msg.classList.remove('hidden'); }
  }
}

function rejectReview(id) {
  if (!confirm('Atmesti šį atsiliepimą?')) return;
  const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]').filter(r => r.id !== id);
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  renderReviewsSection();
}

async function deleteTestimonial(id) {
  if (!confirm('Ištrinti šį atsiliepimą?')) return;
  const msg = document.getElementById('reviewsStatusMsg');
  const backup = S.testimonials.find(t => t.id === id);
  S.testimonials = S.testimonials.filter(t => t.id !== id);
  try {
    await saveTestimonialsToGitHub();
    renderReviewsSection();
    if (msg) { msg.textContent = '✅ Atsiliepimas ištrintas.'; msg.className = 'status-msg status-msg--success'; msg.classList.remove('hidden'); setTimeout(() => msg.classList.add('hidden'), 4000); }
  } catch (e) {
    if (backup) S.testimonials.push(backup);
    if (msg) { msg.textContent = `❌ Klaida: ${e.message}`; msg.className = 'status-msg status-msg--error'; msg.classList.remove('hidden'); }
  }
}

function initSectionNav() {
  document.querySelectorAll('.section-nav__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.section-nav__btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const section = btn.dataset.section;
      document.getElementById('sectionProps').classList.toggle('hidden',    section !== 'props');
      document.getElementById('sectionReviews').classList.toggle('hidden',  section !== 'reviews');
    });
  });
}

// ── Render table ──────────────────────────────────────────────────────────────

const STATUS_LT = { active: 'Aktyvus', sold: 'Parduota', rented: 'Išnuomota', hidden: 'Paslėptas' };

function renderTable() {
  const body = document.getElementById('propTableBody');
  const empty = document.getElementById('emptyMsg');

  const rows = S.filter === 'all'
    ? S.properties
    : S.properties.filter(p => (p.status || 'active') === S.filter);

  if (rows.length === 0) {
    body.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  body.innerHTML = rows.map(p => {
    const status = p.status || 'active';
    const thumb  = (p.images && p.images[0]) ? p.images[0].replace('w=900', 'w=120') : '';
    const catLT  = { butas: 'Butas', namas: 'Namas', sklypas: 'Sklypas', komercinis: 'Komercinis' };

    return `
      <tr data-id="${p.id}">
        <td style="color:var(--clr-muted);font-size:.82rem">#${p.id}</td>
        <td>
          ${thumb ? `<img class="prop-thumb" src="${esc(thumb)}" alt="" loading="lazy" />` : '<div class="prop-thumb"></div>'}
        </td>
        <td>
          <div class="prop-title">${esc(p.title)}${p.new ? ' <span class="new-badge">Nauja</span>' : ''}</div>
          <div style="font-size:.8rem;color:var(--clr-muted)">${esc(p.location || '')}</div>
        </td>
        <td style="font-size:.82rem">${esc(catLT[p.category] || p.category)} · ${p.type === 'pirkti' ? 'Pardav.' : 'Nuoma'}</td>
        <td class="prop-price">${esc(p.price)}</td>
        <td>
          <select class="status-select" data-val="${status}" data-id="${p.id}" aria-label="Statusas">
            ${Object.entries(STATUS_LT).map(([v, l]) =>
              `<option value="${v}"${v === status ? ' selected' : ''}>${l}</option>`
            ).join('')}
          </select>
        </td>
        <td>
          <div class="row-actions">
            <button class="btn-icon" data-action="edit" data-id="${p.id}" title="Redaguoti">✏️</button>
            <button class="btn-icon btn-icon--danger" data-action="delete" data-id="${p.id}" title="Ištrinti">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  // Status change
  body.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', function () {
      const id = parseInt(this.dataset.id, 10);
      const prop = S.properties.find(p => p.id === id);
      if (prop) {
        prop.status = this.value;
        this.dataset.val = this.value;
        saveDraft();
        setUnsaved(true);
        updateCounts();
      }
    });
  });

  // Edit / delete
  body.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.dataset.id, 10);
      if (this.dataset.action === 'edit')   openForm(id);
      if (this.dataset.action === 'delete') confirmDelete(id);
    });
  });
}

function updateCounts() {
  const counts = { all: 0, active: 0, sold: 0, rented: 0, hidden: 0 };
  S.properties.forEach(p => {
    const s = p.status || 'active';
    counts.all++;
    if (counts[s] !== undefined) counts[s]++;
  });
  Object.entries(counts).forEach(([k, v]) => {
    const el = document.getElementById(`count${k.charAt(0).toUpperCase() + k.slice(1)}`);
    if (el) el.textContent = v || '';
  });
}

// ── Filter tabs ───────────────────────────────────────────────────────────────

document.querySelectorAll('.filter-tab').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.filter-tab').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    this.classList.add('active');
    this.setAttribute('aria-selected', 'true');
    S.filter = this.dataset.filter;
    renderTable();
  });
});

// ── Add / Edit form ───────────────────────────────────────────────────────────

function openForm(id = null) {
  S.editingId = id;
  formNewId   = id === null ? nextId() : null; // pre-generate ID for folder naming
  const prop = id !== null ? S.properties.find(p => p.id === id) : null;
  const isEdit = !!prop;

  document.getElementById('formModalTitle').textContent = isEdit ? 'Redaguoti skelbimą' : 'Naujas skelbimas';

  const fields = {
    fieldId:        prop ? prop.id : '',
    fieldTitle:     prop ? prop.title : '',
    fieldType:      prop ? prop.type : 'pirkti',
    fieldCategory:  prop ? prop.category : 'butas',
    fieldStatus:    prop ? (prop.status || 'active') : 'active',
    fieldNew:       prop ? !!prop.new : false,
    fieldPrice:     prop ? prop.price : '',
    fieldPriceSqm:  prop ? (prop.pricePerSqm || '') : '',
    fieldArea:      prop ? prop.area : '',
    fieldRooms:     prop ? (prop.rooms || '') : '',
    fieldFloor:     prop ? (prop.floor || '') : '',
    fieldAddress:   prop ? (prop.address || '') : '',
    fieldLocation:  prop ? (prop.location || '') : '',
    fieldYear:      prop ? (prop.year || '') : '',
    fieldHeating:   prop ? (prop.heating || '') : '',
    fieldEnergy:    prop ? (prop.energy || '') : '',
    fieldCondition: prop ? (prop.condition || '') : '',
    fieldEquipment: prop ? (prop.equipment || '') : '',
    fieldDesc:      prop ? (prop.desc || '') : '',
  };

  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = val;
    else el.value = val;
  });

  // Images handled by image manager
  initFormImages(prop ? (prop.images || []) : []);
  document.getElementById('uploadStatus').classList.add('hidden');

  hideError(document.getElementById('formError'));
  showModal('formModal');

  // Price field auto-format (run once per form open to avoid duplicate listeners)
  const fp = document.getElementById('fieldPrice');
  const fa = document.getElementById('fieldArea');
  const ft = document.getElementById('fieldType');
  fp.onblur = function() {
    const n = parseEurAmount(this.value);
    if (n) {
      const isRent = ft.value === 'nuomoti';
      this.value = formatEur(n) + (isRent ? '/mėn.' : '');
      autoCalcPriceSqm();
    }
  };
  fa.onblur = autoCalcPriceSqm;
  ft.onchange = function() {
    // Re-format price suffix when switching between sale/rental
    const n = parseEurAmount(fp.value);
    if (n) {
      fp.value = formatEur(n) + (this.value === 'nuomoti' ? '/mėn.' : '');
    }
    autoCalcPriceSqm();
  };
}

document.getElementById('btnAdd').addEventListener('click', () => openForm(null));
document.getElementById('formCancelBtn').addEventListener('click', () => closeModal('formModal'));
document.getElementById('formModalClose').addEventListener('click', () => closeModal('formModal'));

document.getElementById('propForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const err = document.getElementById('formError');

  const title   = document.getElementById('fieldTitle').value.trim();
  const isRent  = document.getElementById('fieldType').value === 'nuomoti';
  const rawPrice = document.getElementById('fieldPrice').value.trim();
  const area    = document.getElementById('fieldArea').value.trim();

  if (!title)    { showError(err, 'Pavadinimas privalomas.'); return; }
  if (!rawPrice) { showError(err, 'Kaina privaloma.'); return; }
  if (!area)     { showError(err, 'Plotas privalomas.'); return; }
  hideError(err);

  // Normalizuojame kainą: pridedame € ir /mėn. jei trūksta
  const priceNum = parseEurAmount(rawPrice);
  const price = priceNum
    ? formatEur(priceNum) + (isRent ? '/mėn.' : '')
    : rawPrice; // jei neišparsavo – paliekame kaip yra

  const images = formImages.map(i => i.url).filter(Boolean);

  const updated = {
    id:          S.editingId !== null ? S.editingId : formNewId,
    status:      document.getElementById('fieldStatus').value,
    type:        document.getElementById('fieldType').value,
    category:    document.getElementById('fieldCategory').value,
    title,
    address:     document.getElementById('fieldAddress').value.trim() || null,
    location:    document.getElementById('fieldLocation').value.trim() || null,
    price,
    pricePerSqm: document.getElementById('fieldPriceSqm').value.trim() || null,
    area,
    rooms:       document.getElementById('fieldRooms').value.trim() || null,
    floor:       document.getElementById('fieldFloor').value.trim() || null,
    year:        document.getElementById('fieldYear').value.trim() || null,
    heating:     document.getElementById('fieldHeating').value.trim() || null,
    energy:      document.getElementById('fieldEnergy').value.trim() || null,
    condition:   document.getElementById('fieldCondition').value.trim() || null,
    equipment:   document.getElementById('fieldEquipment').value.trim() || null,
    desc:        document.getElementById('fieldDesc').value.trim() || null,
    new:         document.getElementById('fieldNew').checked,
    images,
  };

  if (S.editingId !== null) {
    const idx = S.properties.findIndex(p => p.id === S.editingId);
    if (idx !== -1) S.properties[idx] = updated;
  } else {
    S.properties.push(updated);
  }

  closeModal('formModal');
  saveDraft();
  setUnsaved(true);
  renderTable();
  updateCounts();
});

function nextId() {
  return S.properties.length > 0 ? Math.max(...S.properties.map(p => p.id)) + 1 : 1;
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function deleteFileFromGitHub(path) {
  const { owner, repo, branch, token } = S.ghConfig;
  if (!owner || !repo || !token) return;
  try {
    const check = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers: ghHeaders() }
    );
    if (!check.ok) return; // file doesn't exist – skip
    const { sha } = await check.json();
    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'DELETE',
        headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Admin: ištrinta nuotrauka ${path}`, sha, branch: branch || 'main' }),
      }
    );
  } catch { /* ignoruojame klaidas atskirų failų trynimui */ }
}

async function deletePropertyImages(images) {
  if (!images || !images.length) return;
  const ghImages = images.filter(u => u && !u.startsWith('http'));
  await Promise.all(ghImages.map(path => deleteFileFromGitHub(path)));
}

function confirmDelete(id) {
  const prop = S.properties.find(p => p.id === id);
  if (!prop) return;
  document.getElementById('confirmMsg').textContent = `Ištrinti skelbimą „${prop.title}"?`;
  showModal('confirmModal');

  const btnYes = document.getElementById('confirmYes');
  const btnNo  = document.getElementById('confirmNo');

  const cleanup = () => {
    btnYes.removeEventListener('click', onYes);
    btnNo.removeEventListener('click', onNo);
  };

  const onYes = async () => {
    const prop = S.properties.find(p => p.id === id);
    S.properties = S.properties.filter(p => p.id !== id);
    saveDraft();
    setUnsaved(true);
    renderTable();
    updateCounts();
    closeModal('confirmModal');
    cleanup();
    // Trinti nuotraukas iš GitHub fone (nekliudo pagrindiniam srautui)
    if (prop && prop.images) deletePropertyImages(prop.images);
  };

  const onNo = () => { closeModal('confirmModal'); cleanup(); };

  btnYes.addEventListener('click', onYes, { once: true });
  btnNo.addEventListener('click',  onNo,  { once: true });
}

// ── Settings ──────────────────────────────────────────────────────────────────

document.getElementById('btnSettings').addEventListener('click', () => {
  document.getElementById('ghOwner').value  = S.ghConfig.owner;
  document.getElementById('ghRepo').value   = S.ghConfig.repo;
  document.getElementById('ghBranch').value = S.ghConfig.branch || 'main';
  document.getElementById('ghToken').value  = S.ghConfig.token;
  hideError(document.getElementById('settingsError'));
  hideError(document.getElementById('chgPassMsg'));
  document.getElementById('chgPassOld').value = '';
  document.getElementById('chgPassNew').value = '';
  showModal('settingsModal');
});

document.getElementById('settingsSaveBtn').addEventListener('click', () => {
  S.ghConfig = {
    owner:  document.getElementById('ghOwner').value.trim(),
    repo:   document.getElementById('ghRepo').value.trim(),
    branch: document.getElementById('ghBranch').value.trim() || 'main',
    token:  document.getElementById('ghToken').value.trim(),
  };
  // Store without token to minimize exposure; token stored separately
  localStorage.setItem(GH_KEY, JSON.stringify({
    owner: S.ghConfig.owner,
    repo:  S.ghConfig.repo,
    branch: S.ghConfig.branch,
    token: S.ghConfig.token,
  }));
  closeModal('settingsModal');
  showStatusMsg('✅ Nustatymai išsaugoti.', 'success');
});

document.getElementById('settingsCancelBtn').addEventListener('click', () => closeModal('settingsModal'));
document.getElementById('settingsClose').addEventListener('click', () => closeModal('settingsModal'));

document.getElementById('btnChangePass').addEventListener('click', async () => {
  const oldPass  = document.getElementById('chgPassOld').value;
  const newPass  = document.getElementById('chgPassNew').value;
  const msg      = document.getElementById('chgPassMsg');
  const btn      = document.getElementById('btnChangePass');

  if (!oldPass || !newPass) { showError(msg, 'Užpildykite abu laukus.'); return; }
  if (newPass.length < 6)   { showError(msg, 'Naujas slaptažodis per trumpas (min. 6).'); return; }
  if (newPass === oldPass)   { showError(msg, 'Naujas slaptažodis negali sutapti su senu.'); return; }

  btn.disabled = true;
  btn.textContent = 'Tikrinama...';
  try {
    const stored = localStorage.getItem(PASS_KEY);
    if (!(await verifyPassword(oldPass, stored))) {
      showError(msg, 'Dabartinis slaptažodis neteisingas.');
      return;
    }
    btn.textContent = 'Saugoma...';
    const newHash = await hashPassword(newPass);
    localStorage.setItem(PASS_KEY, newHash);
    await saveHashToGitHub(newHash);
    msg.textContent = '✅ Slaptažodis pakeistas.';
    msg.classList.remove('hidden');
    msg.style.color = 'var(--clr-success)';
    document.getElementById('chgPassOld').value = '';
    document.getElementById('chgPassNew').value = '';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Keisti slaptažodį';
  }
});

// ── Save / Export buttons ─────────────────────────────────────────────────────

document.getElementById('btnSaveGh').addEventListener('click', saveToGitHub);
document.getElementById('btnExport').addEventListener('click', exportJSON);

// ── Draft / unsaved indicator ─────────────────────────────────────────────────

function saveDraft() {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(S.properties));
}

function setUnsaved(val) {
  S.unsaved = val;
  document.getElementById('unsavedBadge').classList.toggle('hidden', !val);
}

// ── Status message ────────────────────────────────────────────────────────────

function showStatusMsg(text, type = 'success') {
  const el = document.getElementById('saveStatusMsg');
  el.textContent = text;
  el.className = `status-msg ${type}`;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 7000);
}

function hideStatusMsg() {
  document.getElementById('saveStatusMsg').classList.add('hidden');
}

// ── Modal helpers ─────────────────────────────────────────────────────────────

function showModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.body.style.overflow = '';
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    ['formModal', 'settingsModal', 'confirmModal'].forEach(id => closeModal(id));
  }
});

// ── Error helpers ─────────────────────────────────────────────────────────────

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
  el.style.color = '';
}

function hideError(el) {
  el.textContent = '';
  el.classList.add('hidden');
}

// ── Escape HTML ───────────────────────────────────────────────────────────────

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Image manager ────────────────────────────────────────────────────────────

function initFormImages(images) {
  formImages = (images || []).map(url => ({ url }));
  renderFormImages();
}

function renderFormImages() {
  const list = document.getElementById('imgPreviewList');
  if (!formImages.length) {
    list.innerHTML = '<p class="img-empty">Dar nėra nuotraukų</p>';
    return;
  }
  list.innerHTML = formImages.map((img, i) => `
    <div class="img-thumb-wrap${img.uploading ? ' uploading' : ''}" data-idx="${i}">
      <img src="${img.preview || esc(img.url)}" alt="nuotrauka ${i + 1}" />
      ${img.uploading ? '<div class="img-spinner">⌛</div>' : ''}
      <button type="button" class="img-remove" data-idx="${i}" aria-label="Pašalinti">✕</button>
      <span class="img-num">${i + 1}</span>
    </div>`).join('');

  list.querySelectorAll('.img-remove').forEach(btn => {
    btn.addEventListener('click', function () {
      const idx = parseInt(this.dataset.idx, 10);
      if (formImages[idx].preview) URL.revokeObjectURL(formImages[idx].preview);
      formImages.splice(idx, 1);
      renderFormImages();
    });
  });
}

async function compressImage(file, maxWidth = 1400, quality = 0.83) {
  return new Promise(resolve => {
    const img    = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      const scale  = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => { URL.revokeObjectURL(objUrl); resolve(blob); }, 'image/jpeg', quality);
    };
    img.src = objUrl;
  });
}

function blobToBase64(blob) {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(',')[1]);
    r.readAsDataURL(blob);
  });
}

async function uploadFileToGitHub(base64, path) {
  const { owner, repo, branch, token } = S.ghConfig;
  let sha;
  try {
    const check = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers: ghHeaders() }
    );
    if (check.ok) sha = (await check.json()).sha;
  } catch { /* new file */ }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Admin: nuotrauka ${path}`,
        content: base64,
        branch: branch || 'main',
        ...(sha ? { sha } : {}),
      }),
    }
  );
  if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
}

async function handleImageFiles(files) {
  const statusEl = document.getElementById('uploadStatus');
  const hasGh    = S.ghConfig.owner && S.ghConfig.repo && S.ghConfig.token;
  const id       = S.editingId !== null ? S.editingId : formNewId;
  const folder   = `images/obj${id}`;
  const startIdx = formImages.length;

  // Add placeholders immediately so user sees previews
  Array.from(files).forEach(f => {
    formImages.push({ url: '', preview: URL.createObjectURL(f), uploading: hasGh });
  });
  renderFormImages();

  for (let i = 0; i < files.length; i++) {
    const idx      = startIdx + i;
    const fileName = `${idx + 1}.jpg`;
    const path     = `${folder}/${fileName}`;

    statusEl.textContent = `Kompresuojama ${i + 1}/${files.length}...`;
    statusEl.classList.remove('hidden');

    const blob = await compressImage(files[i]);

    if (hasGh) {
      try {
        statusEl.textContent = `Įkeliama į GitHub ${i + 1}/${files.length}...`;
        const b64 = await blobToBase64(blob);
        await uploadFileToGitHub(b64, path);
        formImages[idx] = { url: path, uploading: false };
      } catch (err) {
        formImages[idx].uploading = false;
        showStatusMsg(`❌ Klaida įkeliant ${fileName}: ${err.message}`, 'error');
      }
    } else {
      formImages[idx] = { url: path, uploading: false };
    }
    renderFormImages();
  }

  if (!hasGh) {
    statusEl.innerHTML = '⚠️ GitHub nesukonfigūruotas – keliai išsaugoti, bet nuotraukos neįkeltos. Sukonfigūruokite ⚙️ Nustatymuose.';
    statusEl.style.color = '#d97706';
    statusEl.classList.remove('hidden');
  } else {
    statusEl.textContent = `✅ Įkelta ${files.length} nuotrauk${files.length === 1 ? 'a' : 'os'} → ${folder}/`;
    statusEl.style.color = '';
    setTimeout(() => statusEl.classList.add('hidden'), 4000);
  }
}

// File picker
document.getElementById('btnPickImages').addEventListener('click', () => {
  document.getElementById('imgFileInput').click();
});
document.getElementById('imgFileInput').addEventListener('change', function () {
  if (this.files.length) handleImageFiles(Array.from(this.files));
  this.value = ''; // reset so same file can be re-selected
});

// Drag & drop
const dropZone = document.getElementById('imgDropZone');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  if (files.length) handleImageFiles(files);
});

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  // Įkeliame GitHub config anksčiau, kad showLoginScreen galėtų fetch hash
  const storedCfg = localStorage.getItem(GH_KEY);
  if (storedCfg) S.ghConfig = { ...S.ghConfig, ...JSON.parse(storedCfg) };

  if (isLoggedIn()) {
    await enterAdmin();
  } else {
    await showLoginScreen();
  }
}

init();
