# NT Ilona (ilona-nt)

Static real-estate brokerage website (plain HTML/CSS/vanilla JS, no framework),
deployed via GitHub Pages at `hanibalas7x7.github.io/ilona-nt`. Content is
Lithuanian-language.

## Stack
- No bundler/framework. `npm run dev` just serves the static files
  (`npx serve . -p 3000`). `npm run build` only runs
  `scripts/compress-images.mjs` (sharp-based image compression from
  `images-raw/` → `images/`, WebP output) — it does NOT bundle JS/CSS.
- Pages: `index.html` (home/listings), `search.html` (search results),
  `admin/index.html` (CMS). JS split by page: `js/main.js`, `js/search.js`,
  `admin/admin.js`.
- Content lives in `data/*.json` (`properties.json`, `testimonials.json`,
  `contact.json`, `about.json`) — edited through the admin panel, not meant to
  be hand-edited beyond seed/placeholder data.

## Admin panel is a client-side-only CMS backed by the GitHub API
This is the key thing to understand before touching `admin/admin.js`:
- There is no backend server. The admin panel calls the **GitHub Contents API**
  directly from the browser to read/write `data/*.json` files (and commit them)
  using a **GitHub Personal Access Token the user pastes in once**.
- The password is never sent anywhere: it's hashed with PBKDF2 and the hash is
  itself committed to the repo at `admin/.pwdhash` (so login works from any
  device by comparing against the GitHub-hosted hash). The PAT is encrypted
  client-side with AES-GCM (key derived from the admin password via PBKDF2) and
  the ciphertext is committed to `admin/.ghtoken`.
- **This means `admin/.pwdhash` and `admin/.ghtoken` are *expected* to be
  public/committed files** — they are not leaked secrets to scrub; the whole
  design relies on the ciphertext being safe to publish because it's useless
  without the admin password. Don't "fix" this by deleting them or moving them
  out of git — that would break login from new devices.
- Pending review submissions, settings, etc. all follow the same pattern: write
  JSON back to GitHub via `PUT /repos/{owner}/{repo}/contents/{path}` with a
  `sha` read first (standard GitHub API update-in-place flow).

## Build/deploy
```bash
npm install
npm run build   # only compresses images-raw/ -> images/
```
No separate deploy step beyond committing — GitHub Pages serves the repo
directly (check Pages settings/branch before assuming a build step is missing).
