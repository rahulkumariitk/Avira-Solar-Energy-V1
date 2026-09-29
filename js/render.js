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
