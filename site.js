/* Westmont Sterling: request forms and the pressure washing estimator. No tracking, no third-party code.
   The only network request is the form post, made when a visitor presses submit. */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

  /* ---------- Request forms ---------- */
  function setSource(form) {
    var src = form.querySelector('input[name="source_page"]');
    if (src) src.value = window.location.href;
  }

  function showError(form, message, field) {
    var box = form.querySelector('.form-error');
    if (box) { box.hidden = false; box.textContent = message; }
    if (field) field.focus();
  }

  function showDone(form) {
    var done = doc.createElement('div');
    done.className = 'form-done';
    done.setAttribute('role', 'status');
    done.setAttribute('tabindex', '-1');
    var p1 = doc.createElement('p');
    var strong = doc.createElement('strong');
    strong.textContent = 'Received.';
    p1.appendChild(strong);
    p1.appendChild(doc.createTextNode(' Kyle Reynolds replies within one business day.'));
    var p2 = doc.createElement('p');
    var again = doc.createElement('button');
    again.type = 'button';
    again.className = 'link-btn';
    again.textContent = 'Send another request';
    again.addEventListener('click', function () {
      form.reset();
      setSource(form);
      var btn = form.querySelector('[type="submit"]');
      if (btn) { btn.disabled = false; btn.textContent = btn.getAttribute('data-label') || btn.textContent; }
      done.parentNode.removeChild(done);
      form.hidden = false;
      var first = form.querySelector('input:not([type="hidden"]):not([name="bot-field"]), select, textarea');
      if (first) first.focus();
    });
    p2.appendChild(again);
    // The post is sent no-cors, so the receiver's answer cannot be read; give the visitor a fallback.
    var p3 = doc.createElement('p');
    p3.appendChild(doc.createTextNode('No reply within one business day? Email '));
    var mail = doc.createElement('a');
    mail.href = 'mailto:hello@westmontsterlingcommercial.com';
    mail.textContent = 'hello@westmontsterlingcommercial.com';
    p3.appendChild(mail);
    p3.appendChild(doc.createTextNode('.'));
    done.appendChild(p1);
    done.appendChild(p3);
    done.appendChild(p2);
    form.hidden = true;
    form.parentNode.insertBefore(done, form.nextSibling);
    done.focus();
  }

  function setupForm(form) {
    setSource(form);
    var email = form.querySelector('input[name="email"]');
    var phone = form.querySelector('input[name="phone"]');
    var name = form.querySelector('input[name="name"]');
    // With the script on, email or phone is enough (the call form needs a phone); with it off, the browser requires email.
    if (email) email.removeAttribute('required');
    form.setAttribute('novalidate', '');
    var btn = form.querySelector('[type="submit"]');
    if (btn) btn.setAttribute('data-label', btn.textContent);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var box = form.querySelector('.form-error');
      if (box) box.hidden = true;
      var hasEmail = email && email.value.trim() !== '';
      var hasPhone = phone && phone.value.trim() !== '';
      if (!name || name.value.trim() === '') { showError(form, 'Please add your name.', name); return; }
      if (form.getAttribute('name') === 'call-request' && !hasPhone) { showError(form, 'Please add a phone number so Kyle can call you.', phone); return; }
      if (!hasEmail && !hasPhone) { showError(form, 'Please add an email or a phone number so Kyle can reply.', email || phone); return; }
      if (hasEmail && !email.checkValidity()) { showError(form, 'Please check the email address.', email); return; }

      var honey = form.querySelector('input[name="bot-field"]');
      if (honey && honey.value) { showDone(form); return; }

      setSource(form);
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      var body = new URLSearchParams(new FormData(form)).toString();
      fetch(form.action, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
      }).then(function () {
        showDone(form);
      }).catch(function () {
        form.submit();
      });
    });
  }

  each(doc.querySelectorAll('form[data-request]'), setupForm);

  /* ---------- Pressure washing estimator (published Phoenix rates) ---------- */
  var est = doc.getElementById('estimator');
  if (!est) return;

  var RATE = { sqftLow: 0.15, sqftHigh: 0.35, padLow: 75, padHigh: 250, laneLow: 150, laneHigh: 400, minimum: 190 };
  var NOTE = 'Estimate from published Phoenix rates. Your price comes from the local crew within two business days after they see your photos.';
  var out = doc.getElementById('est-output');
  var per = doc.getElementById('est-per');
  var send = doc.getElementById('est-send');
  var current = '';

  function val(id, min) {
    var el = doc.getElementById(id);
    var n = parseFloat(el && el.value);
    if (!isFinite(n) || n < 0) n = 0;
    if (min && n < min) n = min;
    return n;
  }
  function plural(n, one, many) { return n === 1 ? one : many; }

  function calc() {
    var sqft = val('est-sqft');
    var pads = Math.round(val('est-pads'));
    var lanes = Math.round(val('est-lanes'));
    var sites = Math.max(1, Math.round(val('est-sites', 1)));
    if (sqft === 0 && pads === 0 && lanes === 0) {
      out.textContent = money(RATE.minimum * sites) + ' minimum';
      per.textContent = 'Add square feet, pads or lanes to see a range for your sites.';
      send.disabled = true;
      current = '';
      return;
    }
    if (pads > 0 && sqft === 0 && lanes === 0) {
      out.textContent = 'Quoted with a lane or a walk';
      per.textContent = 'A dumpster pad is priced together with a drive-thru lane or sidewalk work.';
      send.disabled = true;
      current = '';
      return;
    }
    var lowSite = Math.max(RATE.minimum, sqft * RATE.sqftLow + pads * RATE.padLow + lanes * RATE.laneLow);
    var highSite = Math.max(RATE.minimum, sqft * RATE.sqftHigh + pads * RATE.padHigh + lanes * RATE.laneHigh);
    var low = Math.round(lowSite * sites);
    var high = Math.round(highSite * sites);
    var range = low === high ? money(low) : money(low) + ' to ' + money(high);
    var scope = sites === 1 ? 'for one site' : 'across ' + sites + ' sites';
    out.textContent = range;
    per.textContent = 'per visit, ' + scope;
    var parts = [];
    if (sqft) parts.push(Math.round(sqft).toLocaleString('en-US') + ' sq ft of sidewalk and flatwork');
    if (pads) parts.push(pads + ' dumpster ' + plural(pads, 'pad', 'pads'));
    if (lanes) parts.push(lanes + ' drive-thru ' + plural(lanes, 'lane', 'lanes'));
    current = 'Pressure washing estimate: ' + range + ' per visit ' + scope + ' (' + parts.join(', ') +
      (sites === 1 ? '' : ' per site') + '). ' + NOTE;
    send.disabled = false;
  }

  est.hidden = false;
  each(est.querySelectorAll('input'), function (input) { input.addEventListener('input', calc); });
  calc();

  send.addEventListener('click', function () {
    if (!current) return;
    var form = doc.getElementById('quote-form');
    if (!form) return;
    var field = form.querySelector('[name="estimate"]');
    if (field) field.value = current;
    var sitesField = form.querySelector('[name="sites_count"]');
    if (sitesField) sitesField.value = String(Math.max(1, Math.round(val('est-sites', 1))));
    var washing = form.querySelector('[name="service_pressure_washing"]');
    if (washing) washing.checked = true;
    var target = doc.getElementById('quote') || form;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    var nameField = form.querySelector('[name="name"]');
    if (nameField) {
      window.setTimeout(function () { nameField.focus({ preventScroll: true }); }, reduceMotion ? 0 : 450);
    }
  });
})();
