/* ===========================================================
   RENDER — builds the Projects gallery and Solar Guides (blog)
   from the JSON files in /assests.
   To add a project or post, edit the JSON only — no HTML needed.
=========================================================== */

const PROJECTS_URL = './assests/projects.json';
const BLOG_URL = './assests/blog_post.json';
const INSTAGRAM_URL = 'https://www.instagram.com/avirasolarenergy';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cityOf = loc => String(loc || '').split(',')[0].trim();
const kwOf = name => { const m = String(name).match(/(\d+(?:\.\d+)?)\s*kw/i); return m ? m[1] + ' kW' : ''; };

async function loadJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

/* ---------- Projects ---------- */
let PROJECTS = [];

function projectMedia(p) {
  if (p.type === 'youtube') {
    return `<iframe src="https://www.youtube.com/embed/${esc(p.youtubeId)}" title="${esc(p.name)}" loading="lazy" allowfullscreen></iframe>`;
  }
  if (p.type === 'video') {
    return `<video src="${esc(p.image)}" controls preload="metadata"></video>`;
  }
  if (p.type === 'reel') {
    const insta = p.reelPlatform === 'instagram';
    return `<a class="reel ${insta ? 'insta' : 'fb'}" href="${esc(p.reelUrl)}" target="_blank" rel="noopener"><span>▶</span>View ${insta ? 'Instagram' : 'Facebook'} reel</a>`;
  }
  return `<img src="${esc(p.image)}" alt="${esc(p.name)} in ${esc(p.location)}" loading="lazy">`;
}

function renderProjects(filter = 'all') {
  const grid = document.getElementById('projGrid');
  const list = PROJECTS.filter(p => filter === 'all' || cityOf(p.location) === filter);
  grid.innerHTML = list.map(p => {
    const kw = kwOf(p.name);
    const interactive = p.type === 'youtube' || p.type === 'video' || p.type === 'reel';
    return `
    <article class="proj${interactive ? ' media' : ''}">
      ${projectMedia(p)}
      <div class="info">
        <h4>${esc(p.name)}</h4>
        <div class="meta">${kw ? `<span class="kw">${kw}</span>` : ''}<span>${esc(cityOf(p.location))}</span></div>
      </div>
    </article>`;
  }).join('') || '<p class="muted">No projects to show here yet.</p>';
}

function renderFilters() {
  const cities = [...new Set(PROJECTS.map(p => cityOf(p.location)).filter(Boolean))];
  const box = document.getElementById('filters');
  box.innerHTML = ['all', ...cities].map((c, i) =>
    `<button class="chip${i === 0 ? ' active' : ''}" data-f="${esc(c)}">${c === 'all' ? 'All' : esc(c)}</button>`).join('');
  box.querySelectorAll('.chip').forEach(chip => chip.addEventListener('click', () => {
    box.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
    chip.classList.add('active');
    renderProjects(chip.dataset.f);
  }));
}

/* ---------- Solar guides (blog) ---------- */
let POSTS = [];

function renderBlog() {
  const grid = document.getElementById('blogGrid');
  grid.innerHTML = POSTS.map((p, i) => `
    <button class="post" data-post="${i}">
      <div class="img">${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : ''}</div>
      <div class="body">
        <span class="cat">${esc(p.category)}</span>
        <h4>${esc(p.title)}</h4>
        <p>${esc(p.excerpt)}</p>
        <span class="more">Read guide →</span>
      </div>
    </button>`).join('');
  grid.querySelectorAll('[data-post]').forEach(b => b.addEventListener('click', () => openBlogPost(+b.dataset.post)));
}

function openBlogPost(i) {
  const p = POSTS[i];
  if (!p) return;
  document.getElementById('blogModalBody').innerHTML = `
    ${p.image ? `<img class="post-hero" src="${esc(p.image)}" alt="">` : ''}
    <span class="cat">${esc(p.category)}</span>
    <h3>${esc(p.title)}</h3>
    <div class="post-content">${esc(p.content)}</div>
    <a class="btn btn-primary" href="#contact" data-close-blog>Talk to a solar expert →</a>`;
  document.querySelectorAll('#blogModal [data-close-blog]').forEach(el => el.addEventListener('click', closeBlogModal));
  document.getElementById('blogModal').classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeBlogModal() {
  document.getElementById('blogModal').classList.remove('show');
  document.body.style.overflow = '';
}
window.closeBlogModal = closeBlogModal;
document.querySelectorAll('#blogModal [data-close-blog]').forEach(el => el.addEventListener('click', closeBlogModal));
document.getElementById('blogModal').addEventListener('click', e => { if (e.target.id === 'blogModal') closeBlogModal(); });

/* ---------- Load ---------- */
loadJSON(PROJECTS_URL)
  .then(data => { PROJECTS = data; renderFilters(); renderProjects(); })
  .catch(err => {
    console.error(err);
    document.getElementById('projGrid').innerHTML = `<p class="muted">See our latest installations on <a href="${INSTAGRAM_URL}" target="_blank" rel="noopener">Instagram</a>.</p>`;
  });

loadJSON(BLOG_URL)
  .then(data => { POSTS = data; renderBlog(); })
  .catch(err => { console.error(err); document.getElementById('guides').hidden = true; });

/* ---------- Partners (brands, banks, sales) ---------- */
const PARTNERS_URL = './assests/partners.json';
const CAREERS_URL = './assests/careers.json';
const LOGO_DIR = './assests/images/partners/';
const SKIP_WORDS = new Set(['and', 'pvt', 'ltd', 'the', '&']);

function monogram(name) {
  let words = String(name).split(/\s+/).filter(w => !SKIP_WORDS.has(w.toLowerCase()));
  if (words.length >= 4) words = words.filter(w => w.toLowerCase() !== 'of');   // State Bank of India → SBI
  if (words.length >= 3) return words.slice(0, 3).map(w => w[0]).join('').toUpperCase(); // Bank of India → BOI
  if (words[0] && words[0].length <= 4 && words[0] === words[0].toUpperCase()) return words[0];
  if (words.length === 2) return (words[0][0] + words[1][0]).toUpperCase();
  return String(words[0] || '?').slice(0, 2).toUpperCase();
}

function brandTile(item) {
  const logo = item.logo ? (item.logo.includes('/') ? item.logo : LOGO_DIR + item.logo) : '';
  return `
    <div class="brand-tile${logo ? ' has-logo' : ''}">
      <div class="brand-mark">
        ${logo ? `<img src="${esc(logo)}" alt="${esc(item.name)} logo" loading="lazy" onerror="this.parentNode.parentNode.classList.remove('has-logo');this.remove()">` : ''}
        <span class="mono" aria-hidden="true">${esc(monogram(item.name))}</span>
      </div>
      <span class="brand-name">${esc(item.name)}</span>
      ${item.note ? `<span class="brand-note">${esc(item.note)}</span>` : ''}
    </div>`;
}

const telHref = phone => 'tel:' + String(phone).replace(/[^\d+]/g, '');
const waHref = (phone, msg) => 'https://wa.me/' + String(phone).replace(/\D/g, '') + (msg ? '?text=' + encodeURIComponent(msg) : '');

function renderPartners(data) {
  const groups = document.getElementById('brandGroups');
  groups.innerHTML = (data.brands || []).map(g => `
    <div class="brand-group cat-${esc(g.id)} reveal">
      <h3 class="net-title"><svg><use href="#${esc(g.icon || 'i-check')}"/></svg>${esc(g.title)}</h3>
      <div class="brand-tiles">${g.items.map(brandTile).join('')}</div>
    </div>`).join('');

  const banks = data.banks || [];
  if (banks.length) document.getElementById('bankTiles').innerHTML = banks.map(brandTile).join('');
  else document.getElementById('bankBlock').hidden = true;


  document.getElementById('salesList').innerHTML = (data.sales || []).map(p => `
    <li><span class="mono sm" aria-hidden="true">${esc(monogram(p.name))}</span>
      <span><b>${esc(p.name)}</b><small>${esc(p.phone)}</small></span>
      <span class="contact-btns">
        <a href="${telHref(p.phone)}" aria-label="Call ${esc(p.name)}"><svg><use href="#i-phone"/></svg></a>
        <a class="wa" href="${waHref(p.phone, 'Hi, I found you on the Avira Solar website. I am interested in rooftop solar.')}" target="_blank" rel="noopener" aria-label="WhatsApp ${esc(p.name)}"><svg><use href="#i-wa"/></svg></a>
      </span></li>`).join('');

  if (window.observeReveal) observeReveal(document.getElementById('partners'));
}

/* ---------- Careers ---------- */
function renderCareers(jobs) {
  const grid = document.getElementById('jobGrid');
  grid.innerHTML = jobs.map(j => {
    const applyMsg = `Hello Avira Solar, I would like to apply for the ${j.title} position.\nName:\nPhone:\nCity:\nExperience:`;
    const mail = `mailto:contact@aviragroup.co.in?subject=${encodeURIComponent('Application - ' + j.title)}`;
    return `
    <article class="job reveal">
      <div class="job-top">
        <h3>${esc(j.title)}</h3>
        ${j.type ? `<span class="job-type">${esc(j.type)}</span>` : ''}
      </div>
      ${j.location ? `<p class="job-loc"><svg><use href="#i-pin"/></svg>${esc(j.location)}</p>` : ''}
      <p class="job-sum">${esc(j.summary)}</p>
      ${j.points && j.points.length ? `<ul>${j.points.map(pt => `<li>${esc(pt)}</li>`).join('')}</ul>` : ''}
      <div class="job-actions">
        <a class="btn btn-primary" href="${waHref(WHATSAPP_NUMBER, applyMsg)}" target="_blank" rel="noopener"><svg><use href="#i-wa"/></svg>Apply on WhatsApp</a>
        <a class="btn btn-ghost" href="${mail}"><svg><use href="#i-mail"/></svg>Email CV</a>
      </div>
    </article>`;
  }).join('');
  if (window.observeReveal) observeReveal(grid);
}

loadJSON(PARTNERS_URL)
  .then(renderPartners)
  .catch(err => { console.error(err); ['partners', 'network'].forEach(id => document.getElementById(id).hidden = true); });

loadJSON(CAREERS_URL)
  .then(jobs => jobs.length ? renderCareers(jobs) : (document.getElementById('careers').hidden = true))
  .catch(err => { console.error(err); document.getElementById('careers').hidden = true; });
