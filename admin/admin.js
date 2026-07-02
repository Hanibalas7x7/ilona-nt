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
const HASH_GH_PATH      = 'admin/.pwdhash';
const TOKEN_GH_PATH     = 'admin/.ghtoken';
const HASH_ON_GH_KEY    = 'ntilona_hash_on_gh';

// Viešos repozitorijos koordinatės – naudojamos hash nuskaitymui naujame įrenginyje
const DEFAULT_GH_OWNER  = 'Hanibalas7x7';
const DEFAULT_GH_REPO   = 'ilona-nt';
const DEFAULT_GH_BRANCH = 'main';
const CONTACT_PATH      = 'data/contact.json';
const ABOUT_PATH        = 'data/about.json';
const ABOUT_PHOTO_PATH  = 'images/about.jpg';

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
  contact: null,
  about: null,
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

// ── Token šifravimas (AES-GCM + PBKDF2) ─────────────────────────────────────

async function encryptToken(password, token) {
  const salt   = crypto.getRandomValues(new Uint8Array(16));
  const iv     = crypto.getRandomValues(new Uint8Array(12));
  const b64    = arr => btoa(String.fromCharCode(...new Uint8Array(arr instanceof ArrayBuffer ? arr : arr)));
  const keyMat = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const key    = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMat, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
  );
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(token));
  return `${b64(salt)}:${b64(iv)}:${b64(enc)}`;
}

async function decryptToken(password, stored) {
  const parts = (stored || '').split(':');
  if (parts.length !== 3) return null;
  const fromB64 = s => new Uint8Array([...atob(s)].map(c => c.charCodeAt(0)));
  const [salt, iv, enc] = parts.map(fromB64);
  try {
    const keyMat = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    const key    = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMat, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    );
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, enc);
    return new TextDecoder().decode(dec);
  } catch { return null; }
}

// ── Auth ─────────────────────────────────────────────────────────────────────

function isLoggedIn() {
  return sessionStorage.getItem('ntilona_session') === '1';
}

// Gauna slaptažodžio hash iš GitHub – tik jei žinome, kad jis ten yra
async function fetchHashFromGitHub() {
  // Visada bandome – sinchronizuojame hash tarp visų įrenginių
  const cfg = S.ghConfig;
  const owner  = cfg.owner  || DEFAULT_GH_OWNER;
  const repo   = cfg.repo   || DEFAULT_GH_REPO;
  const branch = cfg.branch || DEFAULT_GH_BRANCH;
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${HASH_GH_PATH}`,
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

async function fetchEncryptedToken() {
  const owner  = S.ghConfig.owner  || DEFAULT_GH_OWNER;
  const repo   = S.ghConfig.repo   || DEFAULT_GH_REPO;
  const branch = S.ghConfig.branch || DEFAULT_GH_BRANCH;
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${TOKEN_GH_PATH}?_=${Date.now()}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    return (await res.text()).trim() || null;
  } catch { return null; }
}

async function saveTokenToGitHub(password, token) {
  if (!token) return;
  try {
    const encrypted = await encryptToken(password, token);
    await ghPutFile(TOKEN_GH_PATH, encrypted, 'Admin: token sync');
  } catch { /* silent – login still works */ }
}

async function showLoginScreen() {
  // Visada sinchronizuojame hash iš GitHub (veikia tarp visų įrenginių)
  const ghHash = await fetchHashFromGitHub();
  if (ghHash) {
    localStorage.setItem(PASS_KEY, ghHash);
    localStorage.setItem(HASH_ON_GH_KEY, '1');
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
  sessionStorage.setItem('ntilona_hash_snap', localStorage.getItem(PASS_KEY) || '');
  hideError(err);
  await enterAdmin();
  saveHashToGitHub(hash);
  saveTokenToGitHub(p1, token);
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
  sessionStorage.setItem('ntilona_hash_snap', stored);
  await enterAdmin();
  // Token sinchronizacija su GitHub
  const encOnGh = await fetchEncryptedToken();
  if (!S.ghConfig.token && encOnGh) {
    // Naujas įrenginys: iššifruojame ir įkeliame token
    const tok = await decryptToken(pass, encOnGh);
    if (tok) {
      S.ghConfig = {
        owner:  S.ghConfig.owner  || DEFAULT_GH_OWNER,
        repo:   S.ghConfig.repo   || DEFAULT_GH_REPO,
        branch: S.ghConfig.branch || DEFAULT_GH_BRANCH,
        token:  tok,
      };
      localStorage.setItem(GH_KEY, JSON.stringify(S.ghConfig));
    }
  } else if (S.ghConfig.token && !encOnGh) {
    // Esamas įrenginys: pirmą kartą šifruojame ir saugome token į GitHub
    saveTokenToGitHub(pass, S.ghConfig.token);
  }
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
  // Always fill in defaults for owner/repo/branch
  if (!S.ghConfig.owner)  S.ghConfig.owner  = DEFAULT_GH_OWNER;
  if (!S.ghConfig.repo)   S.ghConfig.repo   = DEFAULT_GH_REPO;
  if (!S.ghConfig.branch) S.ghConfig.branch = DEFAULT_GH_BRANCH;

  // Load properties & testimonials in parallel
  await Promise.all([loadProperties(), loadTestimonialsAdmin()]);
  renderTable();
  updateCounts();
  renderReviewsSection();
  initSectionNav();

  // Kas 60s tikriname ar slaptažodis nepasikeitė kitame įrenginyje
  setInterval(async () => {
    if (!isLoggedIn()) return;
    const ghHash = await fetchHashFromGitHub();
    if (ghHash && ghHash !== sessionStorage.getItem('ntilona_hash_snap')) {
      sessionStorage.clear();
      alert('Slaptažodis buvo pakeistas. Prisijunkite iš naujo.');
      location.reload();
    }
  }, 60000);
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
  const h = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (S.ghConfig.token) h['Authorization'] = `Bearer ${S.ghConfig.token}`;
  return h;
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
    btn.textContent = '💾 Išsaugoti pakeitimus į serverį';
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
      document.getElementById('sectionSettings').classList.toggle('hidden', section !== 'settings');
      if (section === 'settings') loadSettingsSection();
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
    const rawThumb = (p.images && p.images[0]) ? p.images[0] : '';
    const thumb  = rawThumb ? (rawThumb.startsWith('http') ? rawThumb.replace('w=900','w=120') : '../' + rawThumb) : '';
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

  // ── Kortelės (mobilus vaizdas) ──
  const cards = document.getElementById('propCards');
  const catLT2 = { butas: 'Butas', namas: 'Namas', sklypas: 'Sklypas', komercinis: 'Komercinis' };
  cards.innerHTML = rows.map(p => {
    const status = p.status || 'active';
    const rawThumb2 = (p.images && p.images[0]) ? p.images[0] : '';
    const thumb  = rawThumb2 ? (rawThumb2.startsWith('http') ? rawThumb2.replace('w=900','w=200') : '../' + rawThumb2) : '';
    const meta   = [esc(p.location || ''), esc(catLT2[p.category] || p.category), p.type === 'pirkti' ? 'Pardavimas' : 'Nuoma']
                    .filter(Boolean).join(' · ');
    return `
      <div class="prop-card" data-id="${p.id}">
        <div class="prop-card__top">
          ${thumb
            ? `<img class="prop-card__thumb" src="${esc(thumb)}" alt="" loading="lazy" />`
            : `<div class="prop-card__thumb--empty"></div>`}
          <div class="prop-card__info">
            <div class="prop-card__title">${esc(p.title)}${p.new ? ' <span class="new-badge">Nauja</span>' : ''}</div>
            <div class="prop-card__meta">${meta}</div>
            <div class="prop-card__price">${esc(p.price)}</div>
          </div>
        </div>
        <div class="prop-card__foot">
          <select class="status-select" data-val="${status}" data-id="${p.id}" aria-label="Statusas">
            ${Object.entries(STATUS_LT).map(([v, l]) =>
              `<option value="${v}"${v === status ? ' selected' : ''}>${l}</option>`
            ).join('')}
          </select>
          <div class="prop-card__actions">
            <button class="btn btn-outline" data-action="edit" data-id="${p.id}">✏️ Redaguoti</button>
            <button class="btn btn-danger" data-action="delete" data-id="${p.id}">🗑️</button>
          </div>
        </div>
      </div>`;
  }).join('');

  // Kortelių event listeners
  cards.querySelectorAll('.status-select').forEach(sel => {
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
  cards.querySelectorAll('[data-action]').forEach(btn => {
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
  for (const path of ghImages) {
    await deleteFileFromGitHub(path);
  }
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

// ── Settings ────────────────────────────────────────────────────────────────

function loadSettingsSection() {
  document.getElementById('chgPassOld').value  = '';
  document.getElementById('chgPassNew').value  = '';
  document.getElementById('chgPassNew2').value = '';
  hideError(document.getElementById('chgPassMsg'));
  hideError(document.getElementById('settingsError'));
  document.getElementById('settingsStatusMsg').classList.add('hidden');

  // Kontaktai
  if (S.contact) {
    document.getElementById('setPhone').value = S.contact.phone || '';
    document.getElementById('setEmail').value = S.contact.email || '';
  } else {
    fetch('../data/contact.json?v=' + Date.now())
      .then(r => r.json())
      .then(c => { S.contact = c; document.getElementById('setPhone').value = c.phone || ''; document.getElementById('setEmail').value = c.email || ''; })
      .catch(() => {});
  }

  // Apie mane
  const loadAbout = (a) => {
    S.about = a;
    document.getElementById('aboutTitle').value   = a.title   || '';
    document.getElementById('aboutText').value    = a.text    || '';
    document.getElementById('aboutBullets').value = a.bullets || '';
    document.getElementById('aboutBadge').value   = a.badge   || '';
    if (a.photo) {
      const prev = document.getElementById('aboutPhotoPreview');
      prev.src = a.photo; prev.style.display = '';
    }
  };
  if (S.about) { loadAbout(S.about); }
  else {
    fetch('../data/about.json?v=' + Date.now())
      .then(r => r.json()).then(loadAbout).catch(() => {});
  }
}

async function ghPutFile(path, content, message) {
  const { owner, repo, token } = S.ghConfig;
  const branch = S.ghConfig.branch || 'main';

  if (!token) throw new Error('GitHub token nesuvestas nustatymuose (⚙️ → GitHub integracija)');

  const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const hdrs = { ...ghHeaders(), 'Content-Type': 'application/json' };

  const fetchSha = async () => {
    const r = await fetch(`${fileUrl}?ref=${branch}&_=${Date.now()}`, { headers: ghHeaders() });
    if (r.ok) { const d = await r.json(); return d.sha; }
    const txt = await r.text().catch(() => r.status);
    console.warn('ghPutFile: SHA fetch failed', r.status, txt);
    return undefined;
  };

  const doPut = async (sha) => {
    const body = { message, content: toBase64(content), branch, ...(sha ? { sha } : {}) };
    return fetch(fileUrl, { method: 'PUT', headers: hdrs, body: JSON.stringify(body) });
  };

  let sha = await fetchSha();
  let res = await doPut(sha);

  if (res.status === 409 || res.status === 422) {
    // Retry with a fresh SHA
    sha = await fetchSha();
    res = await doPut(sha);
  }

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`GitHub ${res.status}: ${e.message || res.statusText}`);
  }
}

async function saveContactToGitHub(contact) {
  await ghPutFile(CONTACT_PATH, JSON.stringify(contact, null, 2), 'Admin: atnaujinti kontaktai');
}

async function saveAboutToGitHub(about) {
  await ghPutFile(ABOUT_PATH, JSON.stringify(about, null, 2), 'Admin: atnaujinta "Apie mane"');
}

async function uploadAboutPhoto(file) {
  const status = document.getElementById('aboutPhotoStatus');
  const preview = document.getElementById('aboutPhotoPreview');
  status.textContent = '⏳ Įkeliama...';

  // Compress with canvas
  const img = await new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => { const i = new Image(); i.onload = () => res(i); i.src = e.target.result; };
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
  const canvas = document.createElement('canvas');
  const MAX = 800;
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  const base64 = dataUrl.split(',')[1];

  const { owner, repo } = S.ghConfig;
  const branch = S.ghConfig.branch || 'main';

  if (!owner || !repo || !S.ghConfig.token) {
    // Preview only, save URL later
    preview.src = dataUrl; preview.style.display = '';
    if (!S.about) S.about = {};
    S.about.photo = dataUrl;
    status.textContent = '⚠️ GitHub nekonfigūruotas – nuotrauka išsaugota laikinai.';
    return;
  }

  // Check existing SHA
  let sha;
  try {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${ABOUT_PHOTO_PATH}?ref=${branch}`, { headers: ghHeaders() });
    if (r.ok) { const d = await r.json(); sha = d.sha; }
  } catch { /* new file */ }

  const body = {
    message: 'Admin: apie nuotrauka',
    content: base64,
    branch,
    ...(sha ? { sha } : {}),
  };
  const putRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${ABOUT_PHOTO_PATH}`,
    { method: 'PUT', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  if (!putRes.ok) { const e = await putRes.json(); throw new Error(e.message || putRes.statusText); }

  // Use GitHub Pages URL
  const photoUrl = `https://${owner}.github.io/${repo}/${ABOUT_PHOTO_PATH}`;
  preview.src = dataUrl; preview.style.display = '';
  if (!S.about) S.about = {};
  S.about.photo = photoUrl;
  status.textContent = '✅ Nuotrauka įkelta į GitHub.';
}

document.getElementById('btnPickAboutPhoto').addEventListener('click', () => {
  document.getElementById('aboutPhotoInput').click();
});
document.getElementById('aboutPhotoInput').addEventListener('change', async function () {
  if (!this.files[0]) return;
  try { await uploadAboutPhoto(this.files[0]); }
  catch (e) { document.getElementById('aboutPhotoStatus').textContent = '❌ ' + e.message; }
});

document.getElementById('btnSettings').addEventListener('click', () => {
  document.getElementById('navSettings').click();
});

document.getElementById('settingsSaveBtn').addEventListener('click', async () => {
  // Token auto-sinchronizuojamas iš GitHub po prisijungimo

  const phone      = document.getElementById('setPhone').value.trim();
  const email      = document.getElementById('setEmail').value.trim();
  const aboutTitle = document.getElementById('aboutTitle').value.trim();
  const msg   = document.getElementById('settingsStatusMsg');
  const btn   = document.getElementById('settingsSaveBtn');

  const showMsg = (text, type) => {
    msg.textContent = text;
    msg.className = `status-msg ${type}`;
    msg.classList.remove('hidden');
    clearTimeout(msg._t);
    msg._t = setTimeout(() => msg.classList.add('hidden'), 5000);
  };

  if ((phone || email || aboutTitle) && S.ghConfig.owner && S.ghConfig.token) {
    const contact = { phone, phoneRaw: phone.replace(/\s/g, ''), email };
    const about   = {
      title:   aboutTitle,
      text:    document.getElementById('aboutText').value.trim(),
      bullets: document.getElementById('aboutBullets').value.trim(),
      badge:   document.getElementById('aboutBadge').value.trim(),
      photo:   S.about?.photo || '',
    };
    S.contact = contact;
    S.about   = about;
    btn.disabled = true;
    btn.textContent = '⏳ Saugoma...';
    try {
      await saveContactToGitHub(contact);
      await saveAboutToGitHub(about);
      showMsg('✅ Nustatymai išsaugoti ir atnaujinti GitHub.', 'success');
    } catch (e) {
      showMsg('❌ GitHub klaida: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Išsaugoti nustatymus';
    }
  } else {
    showMsg('✅ Nustatymai išsaugoti.', 'success');
  }
});

document.getElementById('btnChangePass').addEventListener('click', async () => {
  const oldPass  = document.getElementById('chgPassOld').value;
  const newPass  = document.getElementById('chgPassNew').value;
  const newPass2 = document.getElementById('chgPassNew2').value;
  const msg      = document.getElementById('chgPassMsg');
  const btn      = document.getElementById('btnChangePass');

  if (!oldPass || !newPass || !newPass2) { showError(msg, 'Užpildykite visus laukus.'); return; }
  if (newPass !== newPass2)  { showError(msg, 'Nauji slaptažodžiai nesutampa.'); return; }
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
    // Token peršifruojame su nauju slaptažodžiu
    if (S.ghConfig.token) saveTokenToGitHub(newPass, S.ghConfig.token);
    msg.textContent = '✅ Slaptažodis pakeistas.';
    msg.classList.remove('hidden');
    msg.style.color = 'var(--clr-success)';
    document.getElementById('chgPassOld').value = '';
    document.getElementById('chgPassNew').value = '';
    document.getElementById('chgPassNew2').value = '';
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
    ['formModal', 'confirmModal'].forEach(id => closeModal(id));
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
      <img src="${img.preview || (img.url ? '../' + img.url : '')}" alt="nuotrauka ${i + 1}" />
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
    // 404 is expected for new files — no action needed
  } catch { /* network error */ }

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
        formImages[idx] = { url: path, preview: formImages[idx].preview, uploading: false };
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
