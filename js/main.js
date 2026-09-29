/* ===========================================================
   MAIN PAGE SCRIPT
   Navigation, calculator UI, lead forms (Google Sheet),
   service tabs, counters and scroll reveal.
=========================================================== */

const WHATSAPP_NUMBER = "918529419240";
const SHEET_URL = "https://script.google.com/macros/s/AKfycbxzo-3vfpQiO9dDbZJpYSnIfUuLaRwaZ014g6jUmBjR47wq5YixKQa1-RAUzPWSVeit/exec";

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function toast(msg, isError = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('error', isError);
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 4000);
}

/* ---------- Navigation ---------- */
const nav = $('#nav'), navLinks = $('#navLinks'), burger = $('#burger');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 20), { passive: true });
burger.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  burger.setAttribute('aria-expanded', open);
});
$$('#navLinks a').forEach(a => a.addEventListener('click', () => {
  navLinks.classList.remove('open');
  burger.setAttribute('aria-expanded', false);
}));

/* ---------- Counters + scroll reveal ---------- */
const revealObserver = new IntersectionObserver(entries => entries.forEach(en => {
  if (!en.isIntersecting) return;
  en.target.classList.add('in');
  en.target.querySelectorAll('[data-count]').forEach(el => {
    const end = +el.dataset.count, dec = +(el.dataset.dec || 0), suf = el.dataset.suffix || '';
    const t0 = performance.now(), dur = 1600;
    (function tick(t) {
      const p = Math.min(1, (t - t0) / dur), v = end * (1 - Math.pow(1 - p, 3));
      el.textContent = v.toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  });
  revealObserver.unobserve(en.target);
}), { threshold: .15 });
function observeReveal(root = document) {
  root.querySelectorAll('.reveal:not(.in)').forEach(el => revealObserver.observe(el));
}
observeReveal();
// Failsafe: never leave content hidden if the observer is slow or blocked
setTimeout(() => $$('.reveal').forEach(el => el.classList.add('in')), 2500);

/* ---------- Service tabs ---------- */
$$('.tab').forEach(t => t.addEventListener('click', () => {
  $$('.tab').forEach(x => x.classList.remove('active'));
  $$('.svc-panel').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  $('#tab-' + t.dataset.tab).classList.add('active');
}));

/* ---------- Hero quick calculator ---------- */
const qRange = $('#qRange');
function quickCalc() {
  const bill = +qRange.value;
  qRange.style.setProperty('--p', ((bill - qRange.min) / (qRange.max - qRange.min) * 100) + '%');
  const r = calculateSolar({ bill, rate: 7.5, propType: 'residential', roofArea: 0 });
  $('#qBill').textContent = bill.toLocaleString('en-IN');
  $('#qKw').textContent = r.recommendedKw + ' kW';
  $('#qSub').textContent = formatINR(r.subsidy);
  $('#qSave').textContent = formatINR(r.annualSavings);
  $('#qPay').textContent = r.paybackYears + ' yrs';
}
qRange.addEventListener('input', quickCalc);
quickCalc();

/* ---------- Full calculator ---------- */
let lastResult = null;
const ARC = 327;

function runCalculator() {
  const propType = $('input[name=ptype]:checked').value;
  const bill = +$('#cBill').value || 0;
  const rate = +$('#cRate').value || 0;
  const roofArea = +$('#cArea').value || 0;
  const city = $('#cCity').value;
  const roofType = $('#cRoof').value;
  const inBihar = city !== 'Outside Bihar';
  if (bill <= 0 || rate <= 0) return;

  const r = calculateSolar({ bill, rate, propType, roofArea, inBihar });
  lastResult = { bill, rate, propType, roofArea, roofType, city, state: inBihar ? 'Bihar' : 'Outside Bihar', ...r };

  $('#rPct').textContent = r.billReductionPct + '%';
  $('#ringArc').style.strokeDashoffset = ARC - ARC * (r.billReductionPct / 100);
  $('#rBefore').textContent = formatINR(bill);
  $('#rAfter').textContent = formatINR(r.billAfter);
  $('#rKw').textContent = r.recommendedKw + ' kW';
  $('#rPanels').textContent = r.panelsRequired + ' × ' + ASSUMPTIONS.panelWattage + 'W';
  $('#rRoof').textContent = r.roofNeeded + ' sq.ft';
  $('#rCost').textContent = formatINRShort(r.estimatedCost);
  $('#rSub').textContent = r.subsidy ? formatINR(r.subsidy) : 'N/A';
  $('#rNet').textContent = formatINRShort(r.costAfterSubsidy);
  $('#rYear').textContent = formatINR(r.annualSavings);
  $('#rPay').textContent = r.paybackYears + ' yrs';
  $('#r25').textContent = formatINRShort(r.lifetimeSavings);

  let summary = `A <b>${r.recommendedKw} kW</b> ${propType === 'residential' ? 'rooftop' : 'commercial'} system generating about <b>${r.monthlyGeneratedUnits} units</b> a month.`;
  if (r.subsidy) summary += ` Includes <b>${formatINR(r.subsidyCentral)}</b> central${r.subsidyState ? ` + <b>${formatINR(r.subsidyState)}</b> Bihar` : ''} subsidy.`;
  if (r.roofLimited) summary += ' <span class="warn">Sized down to fit your roof area.</span>';
  if (r.exceedsResidential) summary += ` <span class="warn">Above ${ASSUMPTIONS.maxResidentialKw} kW we recommend a commercial system.</span>`;
  $('#rSummary').innerHTML = summary;
}
$$('#calcForm input, #calcForm select').forEach(el => el.addEventListener('input', runCalculator));
runCalculator();

/* ---------- Google Sheet submission ---------- */
class ValidationError extends Error {
  constructor(message) { super(message); this.name = 'ValidationError'; }
}

async function submitLeadToSheet(data, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(SHEET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.success) return result;
      throw new ValidationError(result.error || 'Submission failed.');
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt === maxRetries || error instanceof ValidationError) throw error;
      await new Promise(res => setTimeout(res, 1000 * Math.pow(2, attempt - 1)));
    }
  }
}

async function commonSubmitHandler(form, data) {
  const btn = form.querySelector('[type="submit"]');
  const label = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = 'Submitting…';
  try {
    await submitLeadToSheet(data);
    toast(`Thanks ${data.name}! Our team will contact you shortly.`);
    form.reset();
    return true;
  } catch (e) {
    toast('Could not submit right now. Please call or WhatsApp us on +91 85294 19240.', true);
    return false;
  } finally {
    btn.disabled = false;
    btn.innerHTML = label;
  }
}

/* ---------- Quote modal (calculator quote / general enquiry / service interest) ---------- */
const modal = $('#quoteModal');
let modalContext = { source: 'general', interest: '' };

function openQuoteModal(ctx = {}) {
  modalContext = { source: 'general', interest: '', ...ctx };
  const title = $('#quoteTitle'), sub = $('#quoteSub');
  if (modalContext.source === 'calculator' && lastResult) {
    title.textContent = 'Get this as a formal quote';
    sub.innerHTML = `For your <b>${lastResult.recommendedKw} kW</b> system — our engineer will call you with a detailed quotation.`;
  } else if (modalContext.interest) {
    title.textContent = `Get a quote for ${modalContext.interest}`;
    sub.textContent = 'Share your number and our solar expert will call you back.';
  } else {
    title.textContent = 'Get your free quotation';
    sub.textContent = 'Share your number — our solar expert will send your personalised quote.';
  }
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#leadName').focus(), 60);
}
function closeQuoteModal() {
  modal.classList.remove('show');
  document.body.style.overflow = '';
}
$$('[data-close-modal]').forEach(el => el.addEventListener('click', closeQuoteModal));
modal.addEventListener('click', e => { if (e.target === modal) closeQuoteModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape') { closeQuoteModal(); window.closeBlogModal && closeBlogModal(); } });

$('#quoteBtn').addEventListener('click', () => openQuoteModal({ source: 'calculator' }));
$$('[data-quote]').forEach(el => el.addEventListener('click', e => {
  e.preventDefault();
  openQuoteModal({ interest: el.dataset.quote || '' });
}));

$('#quoteForm').addEventListener('submit', async e => {
  e.preventDefault();
  const name = $('#leadName').value.trim();
  const phone = $('#leadPhone').value.trim();
  const address = $('#leadCity').value.trim();
  let data;
  if (modalContext.source === 'calculator' && lastResult) {
    data = {
      sheet_name: 'Solar Calculator Form',
      name, phone,
      property_type: lastResult.propType,
      roof_area: lastResult.roofArea,
      roof_type: lastResult.roofType,
      monthly_bill: lastResult.bill,
      rate: lastResult.rate,
      state: lastResult.state + (lastResult.city && lastResult.state === 'Bihar' ? ` (${lastResult.city})` : ''),
      recommended_kw: lastResult.recommendedKw,
      panels_required: lastResult.panelsRequired
    };
  } else {
    data = { sheet_name: 'General Inquiry Form', name, phone };
    if (modalContext.interest) data.interest = modalContext.interest;
    if (address) data.address = address;
  }
  submittedLead = true;
  if (await commonSubmitHandler(e.target, data)) closeQuoteModal();
});

/* ---------- Contact form ---------- */
$('#leadForm').addEventListener('submit', async e => {
  e.preventDefault();
  const data = {
    sheet_name: 'Contact Form',
    name: $('#lName').value.trim(),
    email: $('#lEmail').value.trim(),
    phone: $('#lPhone').value.trim(),
    city: $('#lCity').value.trim(),
    monthly_bill: $('#lBill').value,
    property_type: $('#lType').value,
    message: $('#lMsg').value.trim()
  };
  submittedLead = true;
  await commonSubmitHandler(e.target, data);
});

/* ---------- Exit-intent popup (desktop, once per visit) ---------- */
let exitShown = false, submittedLead = false;
document.addEventListener('mouseleave', e => {
  if (e.clientY < 10 && !exitShown && !submittedLead && innerWidth > 900) {
    exitShown = true;
    setTimeout(() => openQuoteModal(), 200);
  }
});

$('#yr').textContent = new Date().getFullYear();
