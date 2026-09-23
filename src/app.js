/* IronWolves Daily: client-side rendering of the inlined site data. */
(function () {
  'use strict';
  const DATA = JSON.parse(document.getElementById('site-data').textContent);
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const digests = DATA.digests.slice().sort((a, b) => a.date.localeCompare(b.date));
  const digestByDate = Object.fromEntries(digests.map(d => [d.date, d]));
  const events = DATA.events || [];
  const memes = (DATA.memes || []).slice().sort((a, b) => a.week.localeCompare(b.week));

  // ---------- date helpers ----------
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const TODAY = iso(today);
  const parseIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmtLong = s => parseIso(s).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtShort = s => parseIso(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const daysBetween = (a, b) => Math.round((parseIso(b) - parseIso(a)) / 86400000);
  function isoWeek(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
    return `${date.getUTCFullYear()}-W${pad(week)}`;
  }
  const THIS_WEEK = isoWeek(today);

  // Expand recurring events into concrete dates for a given year range.
  function eventsOn(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return events.filter(e => {
      if (!e.date) return false;
      if (e.recurring === 'yearly') return e.date.slice(5) === `${m}-${d}`;
      return e.date === dateStr;
    }).map(e => ({ ...e, on: dateStr, years: e.recurring === 'yearly' ? Number(y) - Number(e.date.slice(0, 4)) : null }));
  }

  // ---------- theme ----------
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem('iw-theme');
    if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);
  } catch (_) { /* storage unavailable */ }
  $('theme-toggle').addEventListener('click', () => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const current = root.getAttribute('data-theme') || (prefersDark ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('iw-theme', next); } catch (_) { /* ignore */ }
  });

  // ---------- state ----------
  let selectedDate = null;   // digest date shown
  let activeChip = 'all';
  let query = '';
  let calCursor = new Date(today.getFullYear(), today.getMonth(), 1);
  let calDay = TODAY;      // day picked in the calendar tile
  let memeIndex = -1;

  function initialDate() {
    const hash = location.hash.replace('#', '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(hash) && digestByDate[hash]) return hash;
    return digests.length ? digests[digests.length - 1].date : null;
  }

  // ---------- mood ----------
  function renderMood() {
    const wrap = $('logo-wrap');
    const label = $('mood-label');
    const dot = $('mood-dot');
    const latest = digests.length ? digests[digests.length - 1] : null;
    const bdays = eventsOn(TODAY).filter(e => e.type === 'birthday' || e.type === 'anniversary');
    if (bdays.length) {
      wrap.dataset.mood = 'party';
      label.textContent = `🎉 ${bdays.map(e => e.title).join(' · ')}`;
      dot.title = 'Party mode: celebration today';
      return;
    }
    if (!latest) { wrap.dataset.mood = 'stale'; label.textContent = 'No digest yet'; return; }
    const age = daysBetween(latest.date, TODAY);
    if (age <= 0) { wrap.dataset.mood = 'fresh'; label.textContent = 'Fresh digest today'; dot.title = 'Fresh: digest published today'; }
    else if (age === 1) { wrap.dataset.mood = 'fresh'; label.textContent = 'Digest from yesterday'; dot.title = 'Digest from yesterday'; }
    else { wrap.dataset.mood = 'stale'; label.textContent = `Last digest ${age} days ago`; dot.title = `Stale: last digest ${age} days ago`; }
  }

  // ---------- digest ----------
  function renderDigest() {
    const d = selectedDate ? digestByDate[selectedDate] : null;
    const idx = d ? digests.indexOf(d) : -1;
    $('prev-day').disabled = idx <= 0;
    $('next-day').disabled = idx < 0 || idx >= digests.length - 1;

    if (!d) {
      $('day-title').textContent = 'No digest yet';
      $('day-meta').textContent = 'The scheduler has not produced a digest. Check back tomorrow morning.';
      $('hero').hidden = true;
      $('stale-notice').hidden = true;
      $('chips').innerHTML = '';
      $('digest').innerHTML = '<div class="empty">Nothing here yet.</div>';
      return;
    }

    $('day-title').textContent = d.date === TODAY ? 'Today' : fmtLong(d.date).split(',')[0];
    const cats = d.categories.length;
    $('day-meta').textContent = `${fmtLong(d.date)} · ${d.itemCount} item${d.itemCount === 1 ? '' : 's'} in ${cats} categor${cats === 1 ? 'y' : 'ies'} · ~${Math.max(1, Math.ceil(d.itemCount * 12 / 60))} min read`;

    const isLatest = idx === digests.length - 1;
    const age = daysBetween(d.date, TODAY);
    const notice = $('stale-notice');
    if (isLatest && age >= 2) {
      notice.hidden = false;
      notice.textContent = `This is the latest digest, from ${fmtShort(d.date)}. ${age} days without a new one, likely a weekend or holiday.`;
    } else if (!isLatest) {
      notice.hidden = false;
      notice.innerHTML = `You are reading an older digest. <a href="#${esc(digests[digests.length - 1].date)}" data-jump="latest">Jump to the latest</a>.`;
    } else {
      notice.hidden = true;
    }

    if (d.heroHtml) { $('hero').hidden = false; $('hero-text').innerHTML = d.heroHtml; }
    else $('hero').hidden = true;

    // chips
    const chips = [`<button class="chip ${activeChip === 'all' ? 'active' : ''}" data-cat="all" role="listitem">All <span class="n">${d.itemCount}</span></button>`]
      .concat(d.categories.map(c => `<button class="chip ${activeChip === c.id ? 'active' : ''}" data-cat="${esc(c.id)}" role="listitem">${esc(c.name)} <span class="n">${c.items.length}</span></button>`));
    $('chips').innerHTML = chips.join('');

    // body
    const visible = d.categories.filter(c => activeChip === 'all' || c.id === activeChip);
    $('digest').innerHTML = visible.map(c => `
      <section class="cat" id="cat-${esc(c.id)}">
        <h2 class="cat-title">${esc(c.name)} <span class="count">${c.items.length}</span></h2>
        <ul class="items">
          ${c.items.map(i => renderItem(i)).join('')}
        </ul>
      </section>`).join('') || '<div class="empty">No items in this category.</div>';
  }

  function renderItem(i, extra = '') {
    const head = i.link ? `<a href="${esc(i.link)}" target="_blank" rel="noopener">${hl(esc(i.headline))}</a>` : hl(esc(i.headline));
    const src = i.link ? `<a class="src" href="${esc(i.link)}" target="_blank" rel="noopener">${esc(shortUrl(i.link))}</a>` : '';
    return `<li class="item ${extra ? 'search-hit' : ''}">${extra}<h3>${head}</h3><p>${query ? hl(esc(i.sentence)) : i.sentenceHtml}</p>${src}</li>`;
  }
  function shortUrl(u) { try { const x = new URL(u); return x.host.replace(/^www\./, '') + (x.pathname.length > 1 ? x.pathname.replace(/\/$/, '') : ''); } catch (_) { return u; } }
  function hl(text) {
    if (!query) return text;
    const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    return text.replace(re, '<mark>$1</mark>');
  }

  // ---------- search ----------
  function renderSearch() {
    const q = query.toLowerCase();
    $('day-title').textContent = 'Search';
    $('hero').hidden = true;
    $('stale-notice').hidden = true;
    $('prev-day').disabled = true; $('next-day').disabled = true;
    const hits = [];
    for (const d of digests.slice().reverse()) {
      for (const c of d.categories) {
        for (const i of c.items) {
          if ((i.headline + ' ' + i.sentence + ' ' + c.name).toLowerCase().includes(q)) hits.push({ d, c, i });
        }
      }
    }
    $('day-meta').textContent = `${hits.length} result${hits.length === 1 ? '' : 's'} for “${query}” across ${digests.length} digest${digests.length === 1 ? '' : 's'}`;
    $('chips').innerHTML = `<button class="chip active" data-clear="1">Clear search ✕</button>`;
    $('digest').innerHTML = hits.length
      ? `<section class="cat"><ul class="items">${hits.map(h => renderItem(h.i, `<span class="when"><a href="#${esc(h.d.date)}" data-date="${esc(h.d.date)}">${esc(fmtShort(h.d.date))}</a> · ${esc(h.c.name)}</span>`)).join('')}</ul></section>`
      : '<div class="empty">No matches. Try a shorter word.</div>';
  }

  // ---------- calendar ----------
  const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  function renderCalendar() {
    const y = calCursor.getFullYear(), m = calCursor.getMonth();
    $('cal-month').textContent = calCursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const first = new Date(y, m, 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday first
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (const d of DOW) cells.push(`<div class="cal-dow" role="columnheader">${d}</div>`);
    const start = new Date(y, m, 1 - startOffset);
    for (let k = 0; k < 42; k++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + k);
      const ds = iso(d);
      const out = d.getMonth() !== m;
      if (k >= 35 && out) break;
      const evs = eventsOn(ds);
      const hasDigest = !!digestByDate[ds];
      const cls = ['cal-day', out ? 'out' : '', hasDigest ? 'has-digest' : '', ds === TODAY ? 'today' : '', ds === selectedDate && !query ? 'selected' : '', ds === calDay ? 'picked' : ''].filter(Boolean).join(' ');
      const dots = evs.slice(0, 3).map(e => `<i class="dot t-${esc(e.type || 'other')}"></i>`).join('');
      const title = [hasDigest ? 'Digest available' : '', ...evs.map(e => e.title)].filter(Boolean).join('\n');
      cells.push(`<button type="button" class="${cls}" data-day="${ds}" title="${esc(title)}" aria-label="${esc(fmtLong(ds))}${title ? ': ' + esc(title.replace(/\n/g, ', ')) : ''}" role="gridcell">${d.getDate()}${dots ? `<span class="dots">${dots}</span>` : ''}</button>`);
    }
    $('cal-grid').innerHTML = cells.join('');
  }

  function renderDayDetail() {
    const evs = eventsOn(calDay);
    const rel = daysBetween(TODAY, calDay);
    const when = rel === 0 ? 'Today' : rel === 1 ? 'Tomorrow' : rel === -1 ? 'Yesterday' : fmtLong(calDay).split(',')[0];
    const head = `<div class="dd-head"><span class="dd-when">${esc(when)}</span><span class="dd-date">${esc(fmtShort(calDay))}${digestByDate[calDay] ? ' · digest' : ''}</span></div>`;
    const body = evs.length
      ? `<ul class="dd-list">${evs.map(e => {
          const sub = [e.time, e.where, e.who && !e.title.includes(e.who) ? e.who : '', e.years > 0 && e.type === 'anniversary' ? `${e.years} yr${e.years === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ');
          return `<li><i class="dot t-${esc(e.type || 'other')}"></i><span class="ev-title">${esc(e.title)}${sub ? `<span class="ev-sub">${esc(sub)}</span>` : ''}</span></li>`;
        }).join('')}</ul>`
      : '<p class="dd-empty">No events on this day.</p>';
    $('day-detail').innerHTML = head + body;
  }

  function renderUpcoming() {
    const list = [];
    for (let k = 0; k < 120 && list.length < 4; k++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + k);
      for (const e of eventsOn(iso(d))) list.push(e);
    }
    const top = list.slice(0, 4);
    $('upcoming').innerHTML = top.length ? top.map(e => {
      const n = daysBetween(TODAY, e.on);
      const when = n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`;
      const sub = [fmtShort(e.on), e.time, e.where, e.years > 0 && e.type === 'anniversary' ? `${e.years} yr${e.years === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ');
      return `<li><i class="dot t-${esc(e.type || 'other')}"></i><span class="ev-title">${esc(e.title)}<span class="ev-sub">${esc(sub)}</span></span><span class="in ${n <= 2 ? 'soon' : ''}">${when}</span></li>`;
    }).join('') : '<li class="ev-sub">Nothing scheduled in the next four months.</li>';
  }

  // ---------- meme ----------
  function pickMemeIndex() {
    if (!memes.length) return -1;
    let idx = -1;
    memes.forEach((m, i) => { if (m.week <= THIS_WEEK) idx = i; });
    return idx === -1 ? 0 : idx;
  }
  function renderMeme() {
    if (memeIndex < 0) {
      $('meme-week').textContent = '';
      $('meme-img').removeAttribute('src');
      $('meme-caption').textContent = 'No meme yet. Be the first to submit one.';
      $('meme-by').textContent = '';
      $('meme-prev').disabled = $('meme-next').disabled = true;
      return;
    }
    const m = memes[memeIndex];
    $('meme-week').textContent = m.week === THIS_WEEK ? 'This week' : m.week.replace('-W', ' · W');
    $('meme-img').src = `memes/${m.file}`;
    $('meme-img').alt = m.caption || 'Meme of the week';
    $('meme-link').href = `memes/${m.file}`;
    $('meme-caption').textContent = m.caption || '';
    $('meme-by').textContent = m.by ? `Submitted by ${m.by}` : '';
    $('meme-prev').disabled = memeIndex <= 0;
    $('meme-next').disabled = memeIndex >= memes.length - 1;
  }

  // ---------- wiring ----------
  function selectDate(ds, { scroll = false } = {}) {
    if (!digestByDate[ds]) return;
    selectedDate = ds;
    query = ''; $('search').value = '';
    activeChip = 'all';
    if (location.hash !== `#${ds}`) history.replaceState(null, '', `#${ds}`);
    calCursor = new Date(parseIso(ds).getFullYear(), parseIso(ds).getMonth(), 1);
    renderDigest(); renderCalendar();
    if (scroll) $('digest').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('prev-day').addEventListener('click', () => { const i = digests.findIndex(d => d.date === selectedDate); if (i > 0) selectDate(digests[i - 1].date); });
  $('next-day').addEventListener('click', () => { const i = digests.findIndex(d => d.date === selectedDate); if (i >= 0 && i < digests.length - 1) selectDate(digests[i + 1].date); });
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'ArrowLeft') $('prev-day').click();
    if (e.key === 'ArrowRight') $('next-day').click();
    if (e.key === '/') { e.preventDefault(); $('search').focus(); }
  });
  $('chips').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.clear) { query = ''; $('search').value = ''; renderDigest(); renderCalendar(); return; }
    activeChip = b.dataset.cat; renderDigest();
    if (activeChip !== 'all') { const el = document.getElementById(`cat-${activeChip}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  $('stale-notice').addEventListener('click', e => {
    const a = e.target.closest('a[data-jump]'); if (!a) return;
    e.preventDefault(); selectDate(digests[digests.length - 1].date);
  });
  $('digest').addEventListener('click', e => {
    const a = e.target.closest('a[data-date]'); if (!a) return;
    e.preventDefault(); selectDate(a.dataset.date, { scroll: true });
  });
  let searchTimer;
  $('search').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      query = e.target.value.trim();
      if (query.length >= 2) renderSearch(); else { query = ''; renderDigest(); }
      renderCalendar();
    }, 120);
  });
  $('cal-prev').addEventListener('click', () => { calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() - 1, 1); renderCalendar(); });
  $('cal-next').addEventListener('click', () => { calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() + 1, 1); renderCalendar(); });
  $('cal-grid').addEventListener('click', e => {
    const b = e.target.closest('button[data-day]'); if (!b) return;
    calDay = b.dataset.day;
    if (digestByDate[calDay]) selectDate(calDay, { scroll: window.innerWidth < 960 });
    else renderCalendar();
    renderDayDetail();
  });
  $('meme-prev').addEventListener('click', () => { if (memeIndex > 0) { memeIndex--; renderMeme(); } });
  $('meme-next').addEventListener('click', () => { if (memeIndex < memes.length - 1) { memeIndex++; renderMeme(); } });
  window.addEventListener('hashchange', () => { const h = location.hash.replace('#', ''); if (digestByDate[h] && h !== selectedDate) selectDate(h); });

  // links that depend on config
  if (DATA.submitMemeUrl) { $('submit-meme').hidden = false; $('submit-meme').href = DATA.submitMemeUrl; }
  if (DATA.submitEventUrl) { $('add-event').hidden = false; $('add-event').href = DATA.submitEventUrl; }
  if (DATA.repoUrl) { $('footer-repo').hidden = false; $('footer-repo').href = DATA.repoUrl; }
  else document.querySelectorAll('.hidden-if-no-repo').forEach(el => el.hidden = true);
  $('footer-built').textContent = `Last build ${new Date(DATA.generatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`;

  // ---------- boot ----------
  selectedDate = initialDate();
  if (selectedDate) calCursor = new Date(parseIso(selectedDate).getFullYear(), parseIso(selectedDate).getMonth(), 1);
  memeIndex = pickMemeIndex();
  renderMood(); renderDigest(); renderCalendar(); renderDayDetail(); renderUpcoming(); renderMeme();
})();
