#!/usr/bin/env node
// IronWolves Newsletter build script.
// Reads digests/*.md, data/events.json, memes/memes.json and writes a static site to site/.
// No dependencies: Node 18+ only.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIGEST_DIR = path.join(ROOT, 'digests');
const OUT_DIR = path.join(ROOT, 'site');
const SRC_DIR = path.join(ROOT, 'src');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'config.json'), 'utf8'));

// ---------- helpers ----------
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function slug(s) {
  return s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
// Minimal inline markdown: **bold**, `code`, [text](url), bare URLs.
function inline(md) {
  let s = esc(md);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/(^|[^"'>])(https?:\/\/[^\s<]+)/g, (m, pre, url) => `${pre}<a href="${url}" target="_blank" rel="noopener">${url}</a>`);
  return s;
}
function stripMd(md) {
  return md.replace(/\*\*/g, '').replace(/`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
}
function firstUrl(text) {
  const m = text.match(/https?:\/\/[^\s)>\]]+/);
  return m ? m[0] : null;
}

// ---------- digest parsing ----------
// Expected shape (from the scheduler prompt):
//   First line: "<date> — N items" (free text)
//   Optional "> **Today's big item:** ..." blockquote
//   "## Category" headers, each followed by "- **Headline**" bullets, a sentence line, a link line.
function parseDigest(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const dateMatch = path.basename(file).match(/(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch ? dateMatch[1] : null;
  const lines = raw.split('\n');

  let intro = '';
  let hero = '';
  const categories = [];
  let cat = null;
  let item = null;

  const flushItem = () => {
    if (item && cat) {
      item.link = item.link || firstUrl(item.body.join(' ')) || null;
      // Remove bare link lines from the body so the sentence stays clean.
      item.body = item.body.filter(l => !/^\s*<?https?:\/\/\S+>?\s*$/.test(l));
      item.sentence = item.body.join(' ').replace(/\s+/g, ' ').trim();
      cat.items.push(item);
    }
    item = null;
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) { continue; }
    if (t.startsWith('## ')) {
      flushItem();
      cat = { name: t.slice(3).trim(), id: '', items: [] };
      cat.id = slug(cat.name);
      categories.push(cat);
      continue;
    }
    if (t.startsWith('# ')) { intro = intro || t.slice(2).trim(); continue; }
    if (t.startsWith('>')) {
      hero += (hero ? ' ' : '') + t.replace(/^>\s?/, '').trim();
      continue;
    }
    if (/^[-*]\s+/.test(t)) {
      flushItem();
      if (!cat) { cat = { name: 'Digest', id: 'digest', items: [] }; categories.push(cat); }
      const text = t.replace(/^[-*]\s+/, '');
      const bold = text.match(/^\*\*(.+?)\*\*\s*(.*)$/);
      item = {
        headline: bold ? bold[1].trim() : stripMd(text),
        body: bold && bold[2] ? [bold[2]] : [],
        link: null
      };
      continue;
    }
    if (item) { item.body.push(t); continue; }
    if (!cat && !intro) { intro = t; continue; }
  }
  flushItem();

  const itemCount = categories.reduce((n, c) => n + c.items.length, 0);
  hero = hero.replace(/^\*\*Today'?s big item:?\*\*:?\s*/i, '').replace(/^Today'?s big item:?\s*/i, '');
  return {
    date,
    intro: stripMd(intro),
    hero: hero ? stripMd(hero) : '',
    heroHtml: hero ? inline(hero) : '',
    itemCount,
    categories: categories.filter(c => c.items.length).map(c => ({
      name: c.name, id: c.id,
      items: c.items.map(i => ({
        headline: stripMd(i.headline),
        sentence: stripMd(i.sentence),
        sentenceHtml: inline(i.sentence),
        link: i.link
      }))
    }))
  };
}

// ---------- ISO week ----------
function isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ---------- build ----------
function build() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT_DIR, 'memes'), { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, 'assets'), { recursive: true });

  const digestFiles = fs.existsSync(DIGEST_DIR)
    ? fs.readdirSync(DIGEST_DIR).filter(f => /^ai-digest-\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort()
    : [];
  const digests = digestFiles.map(f => parseDigest(path.join(DIGEST_DIR, f))).filter(d => d.date);

  const events = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'events.json'), 'utf8')).events || [];
  const memesJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'memes', 'memes.json'), 'utf8'));
  const memes = (memesJson.memes || [])
    .filter(m => {
      const ok = fs.existsSync(path.join(ROOT, 'memes', m.file));
      if (!ok) console.warn(`warn: meme file missing, skipped: ${m.file}`);
      return ok;
    })
    .sort((a, b) => a.week.localeCompare(b.week));
  for (const m of memes) {
    fs.copyFileSync(path.join(ROOT, 'memes', m.file), path.join(OUT_DIR, 'memes', m.file));
  }
  for (const a of fs.readdirSync(path.join(ROOT, 'assets'))) {
    fs.copyFileSync(path.join(ROOT, 'assets', a), path.join(OUT_DIR, 'assets', a));
  }

  const now = new Date();
  const data = {
    generatedAt: now.toISOString(),
    buildWeek: isoWeek(now),
    team: config.team,
    repoUrl: config.repoUrl,
    submitMemeUrl: config.repoUrl ? `${config.repoUrl}/issues/new?template=meme.yml` : null,
    submitEventUrl: config.repoUrl ? `${config.repoUrl}/edit/main/data/events.json` : null,
    digests,
    events,
    memes
  };

  // Page: template + inlined CSS/JS/data so it works from file:// as well as Pages.
  const tpl = fs.readFileSync(path.join(SRC_DIR, 'template.html'), 'utf8');
  const css = fs.readFileSync(path.join(SRC_DIR, 'styles.css'), 'utf8');
  const js = fs.readFileSync(path.join(SRC_DIR, 'app.js'), 'utf8');
  const latest = digests[digests.length - 1];
  const html = tpl
    .replace('/*__CSS__*/', () => css)
    .replace('/*__JS__*/', () => js)
    .replace('/*__DATA__*/', () => JSON.stringify(data).replace(/<\/script/gi, '<\\/script'))
    .replace(/__TEAM__/g, esc(config.team))
    .replace(/__DESCRIPTION__/g, esc(latest ? `${config.team} AI digest for ${latest.date}: ${latest.hero || latest.intro}` : `${config.team} daily AI digest`));
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html);
  fs.writeFileSync(path.join(OUT_DIR, 'data.json'), JSON.stringify(data, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, '.nojekyll'), '');

  // RSS feed: one entry per digest.
  const site = config.siteUrl || '';
  const rssItems = digests.slice().reverse().slice(0, 30).map(d => {
    const body = d.categories.map(c =>
      `<h3>${esc(c.name)}</h3><ul>` + c.items.map(i =>
        `<li><b>${esc(i.headline)}</b> ${esc(i.sentence)}${i.link ? ` <a href="${esc(i.link)}">link</a>` : ''}</li>`).join('') + '</ul>').join('');
    return `  <item>
    <title>${esc(`${config.team} AI digest ${d.date}`)}</title>
    <link>${esc(`${site}/#${d.date}`)}</link>
    <guid isPermaLink="false">${esc(`${config.team}-digest-${d.date}`)}</guid>
    <pubDate>${new Date(`${d.date}T07:00:00Z`).toUTCString()}</pubDate>
    <description><![CDATA[${d.hero ? `<p><b>Big item:</b> ${esc(d.hero)}</p>` : ''}${body}]]></description>
  </item>`;
  }).join('\n');
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${esc(config.team)} AI digest</title>
  <link>${esc(site || 'https://example.invalid')}</link>
  <description>Daily AI digest for the ${esc(config.team)} squad.</description>
  <language>en</language>
  <lastBuildDate>${now.toUTCString()}</lastBuildDate>
${rssItems}
</channel>
</rss>
`;
  fs.writeFileSync(path.join(OUT_DIR, 'feed.xml'), rss);

  console.log(`built site/: ${digests.length} digest(s), ${events.length} event(s), ${memes.length} meme(s)`);
  if (latest) console.log(`latest digest: ${latest.date} (${latest.itemCount} items, ${latest.categories.length} categories)`);
}

build();
