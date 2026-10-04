/* ===========================================================
   HELP & SUPPORT FORM
   Complaints, service requests, questions and feedback.
   Sends to the same Google Apps Script as the other forms
   (SHEET_URL in main.js), into the "Support Form" sheet tab.

   Safety net: if the "Support Form" tab isn't set up yet (or the
   script rejects it), the request is re-sent to the existing
   "Contact Form" tab with every detail packed into the message,
   so you still get the email and nothing is lost.
=========================================================== */

(function () {
  const SUPPORT_SHEET = 'Support Form';
  const FALLBACK_SHEET = 'Contact Form';
  const EXISTING_TYPES = ['Complaint', 'Service / Repair', 'Question – Existing system'];

  const form = document.getElementById('supportForm');
  if (!form) return;
  const done = document.getElementById('supportDone');
  const msg = document.getElementById('sMsg');
  const msgCount = document.getElementById('sMsgCount');
  const typeErr = document.getElementById('reqTypeErr');

  const PLACEHOLDERS = {
    'Complaint': 'What went wrong? When did it start? Any error shown on the inverter?',
    'Service / Repair': 'What do you need? e.g. panel cleaning, inverter fault, site visit…',
    'Question – Existing system': 'Ask anything about your installed system, subsidy, net meter or bill…',
    'Question – New connection': 'Ask about system size, price, subsidy, loan, timelines…',
    'Feedback': 'Tell us what you liked and what we could do better…'
  };

  const selectedType = () => (form.querySelector('input[name=reqType]:checked') || {}).value || '';

  /* ---------- show / hide the extra fields per request type ---------- */
  function updateType() {
    const t = selectedType();
    form.querySelectorAll('.cond').forEach(block => {
      block.hidden = !block.dataset.show.split('|').includes(t);
    });
    if (t) {
      msg.placeholder = PLACEHOLDERS[t] || msg.placeholder;
      typeErr.classList.remove('show');
      form.querySelector('.req-types').classList.remove('invalid');
    }
  }
  form.querySelectorAll('input[name=reqType]').forEach(r => r.addEventListener('change', updateType));

  msg.addEventListener('input', () => { msgCount.textContent = `${msg.value.length} / ${msg.maxLength}`; });

  /* ---------- validation ---------- */
  const fields = ['sName', 'sPhone', 'sEmail', 'sCity', 'sMsg'].map(id => document.getElementById(id));
  fields.forEach(el => el.addEventListener('input', () => el.closest('.field').classList.remove('invalid')));

  function validate() {
    let firstBad = null;
    if (!selectedType()) {
      typeErr.classList.add('show');
      form.querySelector('.req-types').classList.add('invalid');
      firstBad = form.querySelector('input[name=reqType]');
    }
    fields.forEach(el => {
      el.value = el.value.trim();
      const ok = el.checkValidity() && !(el.required && el.value.length < (el.minLength > 0 ? el.minLength : 1));
      el.closest('.field').classList.toggle('invalid', !ok);
      if (!ok && !firstBad) firstBad = el;
    });
    if (firstBad) {
      firstBad.closest('.field, fieldset').scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => firstBad.focus({ preventScroll: true }), 300);
    }
    return !firstBad;
  }

  /* ---------- reference number: AVS-YYMMDD-XXXX ---------- */
  function makeTicket() {
    const d = new Date();
    const ymd = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0/O/1/I to avoid confusion on the phone
    let code = '';
    const rnd = new Uint32Array(4);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(rnd) : rnd.forEach((_, i) => rnd[i] = Math.random() * 1e9);
    rnd.forEach(n => code += chars[n % chars.length]);
    return `AVS-${ymd}-${code}`;
  }

  function collect() {
    const type = selectedType();
    const existing = EXISTING_TYPES.includes(type);
    const val = id => document.getElementById(id).value.trim();
    const rating = (form.querySelector('input[name=sRating]:checked') || {}).value || '';
    const urgent = existing && document.getElementById('sUrgent').checked;
    return {
      sheet_name: SUPPORT_SHEET,
      ticket_id: makeTicket(),
      request_type: type,
      priority: urgent ? 'URGENT' : 'Normal',
      name: val('sName'),
      phone: val('sPhone'),
      email: val('sEmail'),
      city: val('sCity'),
      system_size: existing ? val('sKw') : '',
      installed_on: existing ? val('sInstalled') : '',
      customer_ref: existing ? val('sRef') : '',
      issue_type: existing ? val('sIssue') : '',
      rating: type === 'Feedback' && rating ? rating + '/5' : '',
      message: val('sMsg'),
      submitted_at: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    };
  }

  /* Pack every detail into one readable block (used for the fallback + WhatsApp) */
  function summary(d) {
    return [
      `[SUPPORT · ${d.request_type}${d.priority === 'URGENT' ? ' · URGENT' : ''}]`,
      `Ref: ${d.ticket_id}`,
      d.system_size && `System: ${d.system_size}`,
      d.installed_on && `Installed: ${d.installed_on}`,
      d.customer_ref && `Invoice/consumer no: ${d.customer_ref}`,
      d.issue_type && `Issue: ${d.issue_type}`,
      d.rating && `Rating: ${d.rating}`,
      `Message: ${d.message}`
    ].filter(Boolean).join('\n');
  }

  async function send(d) {
    try {
      await submitLeadToSheet(d, 2);
      return 'support';
    } catch (e) {
      console.warn('Support Form tab failed, falling back to Contact Form:', e);
      await submitLeadToSheet({
        sheet_name: FALLBACK_SHEET,
        name: d.name,
        email: d.email,
        phone: d.phone,
        city: d.city,
        monthly_bill: '',
        property_type: `SUPPORT – ${d.request_type}${d.priority === 'URGENT' ? ' (URGENT)' : ''}`,
        message: summary(d)
      }, 2);
      return 'fallback';
    }
  }

  /* ---------- submit ---------- */
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validate()) return;

    const d = collect();
    const btn = form.querySelector('[type=submit]');
    const label = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    const waText = `Hello Avira Solar,\n${summary(d)}\nName: ${d.name}\nMobile: ${d.phone}\nCity: ${d.city}`;
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`;

    try {
      await send(d);
      if (typeof submittedLead !== 'undefined') submittedLead = true;   // no exit popup after this
      if (window.gtag) gtag('event', 'support_request', { request_type: d.request_type, priority: d.priority });
      showDone(d, waUrl);
    } catch (err) {
      console.error(err);
      toast('Could not submit right now. Tap "WhatsApp" below to send it instead, or call +91 85294 19240.', true);
      showSendFallback(waUrl);
    } finally {
      btn.disabled = false;
      btn.innerHTML = label;
    }
  });

  function showSendFallback(waUrl) {
    let a = form.querySelector('.wa-fallback');
    if (!a) {
      a = document.createElement('a');
      a.className = 'btn btn-ghost wa-fallback';
      a.target = '_blank';
      a.rel = 'noopener';
      a.innerHTML = '<svg><use href="#i-wa"/></svg>Send this request on WhatsApp';
      form.querySelector('[type=submit]').after(a);
    }
    a.href = waUrl;
  }

  function showDone(d, waUrl) {
    document.getElementById('ticketNo').textContent = d.ticket_id;
    document.getElementById('doneWa').href = waUrl;
    const notes = {
      'Feedback': 'Thank you for taking the time to share your feedback.',
      'Question – New connection': 'A solar expert will call you back with answers, usually within 1 working day.'
    };
    document.getElementById('doneNote').textContent = d.priority === 'URGENT'
      ? 'Marked as urgent — our service team will prioritise your call-back.'
      : (notes[d.request_type] || 'Our service team will call you back, usually within 1 working day.');
    form.hidden = true;
    done.hidden = false;
    done.scrollIntoView({ behavior: 'smooth', block: 'center' });
    done.focus({ preventScroll: true });
  }

  document.getElementById('supportAgain').addEventListener('click', () => {
    form.reset();
    msgCount.textContent = `0 / ${msg.maxLength}`;
    form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
    const fb = form.querySelector('.wa-fallback');
    if (fb) fb.remove();
    updateType();
    done.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('copyTicket').addEventListener('click', async e => {
    const text = document.getElementById('ticketNo').textContent;
    try { await navigator.clipboard.writeText(text); }
    catch {
      const r = document.createRange(); r.selectNodeContents(document.getElementById('ticketNo'));
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); document.execCommand('copy'); sel.removeAllRanges();
    }
    e.target.textContent = 'Copied ✓';
    setTimeout(() => e.target.textContent = 'Copy', 1800);
  });

  /* Links like #support-complaint pre-select a request type */
  function fromHash() {
    const m = location.hash.match(/^#support-(complaint|service|existing|new|feedback)$/);
    if (!m) return;
    const map = { complaint: 'Complaint', service: 'Service / Repair', existing: 'Question – Existing system', new: 'Question – New connection', feedback: 'Feedback' };
    const r = form.querySelector(`input[name=reqType][value="${map[m[1]]}"]`);
    if (r) { r.checked = true; updateType(); document.getElementById('support').scrollIntoView(); }
  }
  addEventListener('hashchange', fromHash);
  fromHash();
})();
