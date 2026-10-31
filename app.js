(function () {
'use strict';
var OPEN_END = 2026;
var DISPLAY = { 'Man Utd': 'Manchester United', 'Man City': 'Manchester City', 'PSG': 'Paris Saint-Germain' };
var ALIASES = {
  'Man Utd': ['man utd', 'man united', 'manchester utd', 'united', 'mufc'],
  'Man City': ['man city', 'city', 'mcfc'],
  'PSG': ['paris', 'paris sg'],
  'Tottenham': ['spurs', 'tottenham hotspur', 'thfc'],
  'Inter Milan': ['inter', 'internazionale'],
  'AC Milan': ['milan'],
  'Bayern Munich': ['bayern', 'fc bayern'],
  'Borussia Dortmund': ['dortmund', 'bvb'],
  'Atlético Madrid': ['atletico', 'atleti'],
  'Bayer Leverkusen': ['leverkusen'],
  'Borussia Mönchengladbach': ['gladbach'],
  'Wolves': ['wolverhampton'],
  'Newcastle': ['newcastle united', 'nufc'],
  'West Ham': ['west ham united'],
  'Barcelona': ['barca', 'fc barcelona'],
  'Juventus': ['juve'],
  'Sporting CP': ['sporting lisbon', 'sporting'],
  'RB Salzburg': ['salzburg', 'red bull salzburg'],
  'RB Leipzig': ['leipzig'],
  'Leicester': ['leicester city'],
  'Nottingham Forest': ['forest'],
  'Crystal Palace': ['palace'],
  'Brighton': ['brighton and hove albion'],
  'LA Galaxy': ['galaxy', 'los angeles galaxy'],
  'LAFC': ['los angeles fc'],
  'NYCFC': ['new york city'],
  'Inter Miami': ['miami'],
  'Aston Villa': ['villa'],
  'Leeds': ['leeds united'],
  'Blackburn': ['blackburn rovers'],
  'Bolton': ['bolton wanderers'],
  'Stoke': ['stoke city'],
  'Hull': ['hull city'],
  'Swansea': ['swansea city'],
  'Norwich': ['norwich city'],
  'West Brom': ['west bromwich albion', 'wba'],
  'Derby': ['derby county'],
  'QPR': ['queens park rangers'],
  'Birmingham': ['birmingham city'],
  'Cardiff': ['cardiff city'],
  'Coventry': ['coventry city'],
  'Sheffield United': ['sheff utd', 'blades']
};

function norm(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[øØ]/g, 'o').replace(/[æÆ]/g, 'ae').replace(/ß/g, 'ss').replace(/[łŁ]/g, 'l').replace(/[đĐ]/g, 'd').replace(/[ıİ]/g, 'i')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function disp(c) { return DISPLAY[c] || c; }
function yy(y) { return String(y % 100).padStart(2, '0'); }
function season(y) { return yy(y) + '/' + yy(y + 1); }
function span(s, e) {
  var a = Math.floor(s + 1e-9), b = Math.ceil(e - 1e-9) - 1;
  return b <= a ? season(a) : season(a) + '–' + season(b);
}
function initials(n) {
  var w = n.replace(/['’]/g, '').split(/[\s-]+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : n.slice(0, 2)).toUpperCase();
}

/* ---------- squad data ---------- */
var players = [];
RAW.split('\n').forEach(function (line) {
  line = line.trim();
  var bar = line.indexOf('|');
  if (!line || bar < 0) return;
  var name = line.slice(0, bar).trim(), spells = [];
  line.slice(bar + 1).split(';').forEach(function (part) {
    var m = part.trim().match(/^(.+?)\s+(\d{4}(?:\.\d+)?)-(\d{4}(?:\.\d+)?)?$/);
    if (m) spells.push({ club: m[1], s: +m[2], e: m[3] ? +m[3] : OPEN_END });
  });
  if (spells.length) players.push({ id: players.length, name: name, spells: spells, key: norm(name) });
});
var clubMap = new Map();
players.forEach(function (p) {
  p.spells.forEach(function (sp) {
    if (!clubMap.has(sp.club)) clubMap.set(sp.club, []);
    clubMap.get(sp.club).push({ p: p.id, s: sp.s, e: sp.e });
  });
});
var adj = players.map(function () { return new Map(); });
function link(a, b, c) { var s = adj[a].get(b); if (!s) { s = new Set(); adj[a].set(b, s); } s.add(c); }
clubMap.forEach(function (list, club) {
  for (var a = 0; a < list.length; a++) for (var b = a + 1; b < list.length; b++) {
    var x = list[a], y = list[b];
    if (x.p !== y.p && x.s < y.e && y.s < x.e) { link(x.p, y.p, club); link(y.p, x.p, club); }
  }
});
var clubs = Array.from(clubMap.keys()).map(function (c) {
  return { c: c, keys: [norm(disp(c)), norm(c)].concat((ALIASES[c] || []).map(norm)) };
});

function together(p, q, club) {
  var best = null;
  players[p].spells.forEach(function (a) {
    if (a.club !== club) return;
    players[q].spells.forEach(function (b) {
      if (b.club !== club) return;
      var s = Math.max(a.s, b.s), e = Math.min(a.e, b.e);
      if (s < e && (!best || e - s > best.e - best.s)) best = { s: s, e: e };
    });
  });
  return best;
}
function spellsAt(p, club) { return players[p].spells.filter(function (s) { return s.club === club; }); }

function bfs(from, banned) {
  var n = players.length, dist = new Array(n).fill(-1), prev = new Array(n), q = [from];
  dist[from] = 0;
  for (var h = 0; h < q.length; h++) {
    var u = q[h];
    adj[u].forEach(function (cl, v) {
      if (dist[v] !== -1 || (banned && banned.has(v))) return;
      dist[v] = dist[u] + 1; prev[v] = { u: u, club: cl.values().next().value }; q.push(v);
    });
  }
  return { dist: dist, prev: prev };
}
function route(from, to) {
  var r = bfs(from);
  if (r.dist[to] < 0) return null;
  var out = [{ t: 'p', id: to }], v = to;
  while (v !== from) { var pr = r.prev[v]; out.unshift({ t: 'c', club: pr.club }); out.unshift({ t: 'p', id: pr.u }); v = pr.u; }
  return out;
}

/* ---------- puzzles ---------- */
function hashStr(s) { var h = 2166136261 >>> 0; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rngFrom(seed) {
  var a = seed >>> 0;
  return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
var pool = players.filter(function (p) { return adj[p.id].size >= 8; }).map(function (p) { return p.id; });
function makePuzzle(rng, par) {
  for (var tries = 0; tries < 300; tries++) {
    var s = pool[Math.floor(rng() * pool.length)];
    var d = bfs(s).dist;
    var c = pool.filter(function (t) { return d[t] === par; });
    if (c.length) return { start: s, target: c[Math.floor(rng() * c.length)], par: par };
  }
  return par > 2 ? makePuzzle(rng, par - 1) : { start: pool[0], target: pool[1], par: bfs(pool[0]).dist[pool[1]] };
}
function pad(n) { return String(n).padStart(2, '0'); }
function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
var today = new Date();
var TODAY = dayKey(today);
var DAILY_NO = Math.max(1, Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(2026, 9, 30)) / 864e5) + 1);
var yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
var YESTERDAY = dayKey(yesterday);

/* ---------- storage ---------- */
var STORE = 'six-passes-v1';
var store = {};
try { store = JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { store = {}; }
function save() { try { localStorage.setItem(STORE, JSON.stringify(store)); } catch (e) {} }
store.stats = store.stats || { played: 0, streak: 0, last: '' };
function fresh(p, key) {
  return { key: key, start: p.start, target: p.target, par: p.par, chain: [{ t: 'p', id: p.start }], misses: 0, hints: 0, status: 'playing', hint: null };
}
function valid(g) {
  return g && Array.isArray(g.chain) && g.chain.length && players[g.start] && players[g.target] &&
    g.chain.every(function (x) { return x.t === 'p' ? !!players[x.id] : clubMap.has(x.club); });
}
var games = {};
games.daily = valid(store.daily) && store.daily.key === TODAY ? store.daily : fresh(makePuzzle(rngFrom(hashStr('six-passes:' + TODAY)), 3), TODAY);
var freePar = store.freePar || 3;
games.free = valid(store.free) ? store.free : fresh(makePuzzle(rngFrom(Date.now()), freePar), 'free');
var mode = store.mode === 'free' ? 'free' : 'daily';
var G = games[mode];
function persist() { store.daily = games.daily; store.free = games.free; store.mode = mode; store.freePar = freePar; save(); }

/* ---------- game helpers ---------- */
function last() { return G.chain[G.chain.length - 1]; }
function expecting() { return last().t === 'p' ? 'club' : 'player'; }
function current() { for (var i = G.chain.length - 1; i >= 0; i--) if (G.chain[i].t === 'p') return G.chain[i].id; }
function inChain() { var s = new Set(); G.chain.forEach(function (x) { if (x.t === 'p') s.add(x.id); }); return s; }
function passes() { return G.chain.filter(function (x) { return x.t === 'p'; }).length - 1; }
function nm(id) { return players[id].name; }

var $ = function (id) { return document.getElementById(id); };
var input = $('guess'), sugg = $('suggest'), msgEl = $('msg');
var results = [], active = 0, giveArmed = 0;

function say(text, bad) { msgEl.textContent = text || ''; msgEl.className = 'msg' + (bad ? ' bad' : ''); }
function booked(text) {
  G.misses++; say(text, true);
  input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
  persist(); renderScore();
}
function moved() {
  G.hint = null; input.value = ''; results = []; renderSuggest(); say('');
  persist(); render();
  if (G.status === 'playing') input.focus();
}

function playClub(club) {
  var p = current();
  if (!spellsAt(p, club).length) { booked(nm(p) + ' never played for ' + disp(club) + '.'); return; }
  G.chain.push({ t: 'c', club: club }); moved();
}
function playPlayer(q) {
  var club = last().club, p = current();
  if (q === p) { say('That’s ' + nm(p) + '. Pick a teammate.'); return; }
  if (inChain().has(q)) { say(nm(q) + ' is already in your move.'); return; }
  if (!together(p, q, club)) {
    var at = spellsAt(q, club);
    booked(at.length
      ? nm(q) + ' was at ' + disp(club) + ' in ' + at.map(function (s) { return span(s.s, s.e); }).join(' and ') + ', not alongside ' + nm(p) + '.'
      : nm(q) + ' never played for ' + disp(club) + '.');
    return;
  }
  G.chain.push({ t: 'p', id: q });
  if (q === G.target) finish('won');
  moved();
}
function finish(status) {
  G.status = status;
  if (G === games.daily) {
    var st = store.stats;
    st.played++;
    st.streak = status === 'won' ? (st.last === YESTERDAY || st.last === TODAY ? st.streak + 1 : 1) : 0;
    st.last = status === 'won' ? TODAY : st.last;
  }
}
function pick(item) { if (!item || G.status !== 'playing') return; item.t === 'c' ? playClub(item.club) : playPlayer(item.id); }

function search(q) {
  q = norm(q);
  if (!q) return [];
  function score(keys) {
    var best = 9;
    keys.forEach(function (k) {
      var s = k === q ? 0 : k.indexOf(q) === 0 ? 1 : (' ' + k).indexOf(' ' + q) >= 0 ? 2 : k.indexOf(q) >= 0 ? 3 : 9;
      if (s < best) best = s;
    });
    return best;
  }
  var out = [];
  if (expecting() === 'club') {
    clubs.forEach(function (c) { var s = score(c.keys); if (s < 9) out.push({ t: 'c', club: c.c, label: disp(c.c), s: s }); });
  } else {
    players.forEach(function (p) { var s = score([p.key]); if (s < 9) out.push({ t: 'p', id: p.id, label: p.name, s: s }); });
  }
  out.sort(function (a, b) { return a.s - b.s || a.label.localeCompare(b.label); });
  return out.slice(0, 6);
}

function giveHint() {
  if (G.status !== 'playing') return;
  var p = current(), banned = inChain();
  var d = bfs(G.target, banned).dist, best = null, bd = Infinity;
  if (expecting() === 'club') {
    adj[p].forEach(function (cl, v) {
      if (banned.has(v) && v !== G.target) return;
      var dv = v === G.target ? 0 : d[v];
      if (dv >= 0 && dv < bd) { bd = dv; best = cl.values().next().value; }
    });
    if (best === null) { say('No route left from here. Undo a step and try another way.', true); return; }
    G.hint = { t: 'c', club: best };
  } else {
    var club = last().club;
    adj[p].forEach(function (cl, v) {
      if (!cl.has(club) || (banned.has(v) && v !== G.target)) return;
      var dv = v === G.target ? 0 : d[v];
      if (dv >= 0 && dv < bd) { bd = dv; best = v; }
    });
    if (best === null) { say('No route through ' + disp(club) + '. Undo and pick another club.', true); return; }
    G.hint = { t: 'p', id: best };
  }
  G.hints++; say(''); persist(); render();
}

/* ---------- render ---------- */
function renderTop() {
  $('subline').textContent = mode === 'daily'
    ? 'Daily #' + DAILY_NO + ' · ' + today.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + (store.stats.streak ? ' · Streak ' + store.stats.streak : '')
    : 'Free play · Par ' + G.par;
  $('modeDaily').setAttribute('aria-pressed', mode === 'daily');
  $('modeFree').setAttribute('aria-pressed', mode === 'free');
  $('freebar').hidden = mode !== 'free';
  Array.prototype.forEach.call(document.querySelectorAll('#parChips button'), function (b) { b.setAttribute('aria-pressed', +b.dataset.par === freePar); });
}
function side(cls, lbl, id) {
  return '<div class="side ' + cls + '"><span class="lbl">' + lbl + '</span><span class="badge" aria-hidden="true">' + esc(initials(nm(id))) + '</span><span class="nm">' + esc(nm(id)) + '</span></div>';
}
function renderFixture() {
  $('fixture').innerHTML = side('from', 'Start', G.start) +
    '<div class="centre"><div class="ring"><b>' + G.par + '</b><small>Par</small></div></div>' + side('to', 'Target', G.target);
}
function renderScore() {
  var cards = '';
  for (var i = 0; i < Math.min(G.misses, 8); i++) cards += '<i class="yc"></i>';
  $('scoreline').innerHTML = '<span>Passes <b>' + passes() + '</b></span>' +
    '<span>Cards <b>' + G.misses + '</b>' + (cards ? '<span class="cards" aria-hidden="true">' + cards + '</span>' : '') + '</span>' +
    '<span>Hints <b>' + G.hints + '</b></span>';
}
function chainHTML(items, withGhost) {
  var h = '';
  items.forEach(function (x, i) {
    if (x.t === 'p') {
      var cls = i === 0 ? 'start' : x.id === G.target ? 'goal' : '';
      var tag = i === 0 ? 'Start' : x.id === G.target ? 'Target' : '';
      h += '<li class="p ' + cls + '"><span class="badge" aria-hidden="true">' + esc(initials(nm(x.id))) + '</span><span class="nm">' + esc(nm(x.id)) + '</span>' + (tag ? '<span class="tag">' + tag + '</span>' : '') + '</li>';
    } else {
      var prev = items[i - 1].id, next = items[i + 1], when;
      if (next) { var o = together(prev, next.id, x.club); when = 'Together ' + span(o.s, o.e); }
      else when = 'There ' + spellsAt(prev, x.club).map(function (s) { return span(s.s, s.e); }).join(', ');
      h += '<li class="c' + (next ? '' : ' pending') + '"><span class="club"><b>' + esc(disp(x.club)) + '</b><span>' + when + '</span></span></li>';
    }
  });
  if (withGhost) h += '<li class="p ghost"><span class="badge" aria-hidden="true">' + esc(initials(nm(G.target))) + '</span><span class="nm">' + esc(nm(G.target)) + '</span><span class="tag">Target</span></li>';
  return h;
}
function renderChain() { $('chain').innerHTML = chainHTML(G.chain, G.status === 'playing'); }
function renderPlay() {
  var playing = G.status === 'playing';
  $('play').hidden = !playing;
  if (!playing) return;
  var p = current();
  if (expecting() === 'club') {
    $('prompt').innerHTML = 'Name a club <b>' + esc(nm(p)) + '</b> played for';
    input.placeholder = 'Search clubs';
  } else {
    $('prompt').innerHTML = 'Who played with <b>' + esc(nm(p)) + '</b> at <b>' + esc(disp(last().club)) + '</b>?';
    input.placeholder = 'Search players';
  }
  $('undoBtn').disabled = G.chain.length < 2;
  var hl = $('hintline');
  if (G.hint) {
    var label = G.hint.t === 'c' ? disp(G.hint.club) : nm(G.hint.id);
    hl.innerHTML = 'Hint: try <button type="button" id="hintPlay">' + esc(label) + '</button>';
    hl.hidden = false;
  } else hl.hidden = true;
  if (!giveArmed) $('giveBtn').textContent = 'Give up';
}
function shareText() {
  var head = 'Six Passes · ' + (G === games.daily ? 'Daily #' + DAILY_NO : 'Free play') + '\n' + nm(G.start) + ' → ' + nm(G.target) + '\n';
  if (G.status === 'won') {
    return head + new Array(passes() + 1).join('⚽') + ' ' + passes() + ' passes (par ' + G.par + ')\n' + G.misses + ' yellow card' + (G.misses === 1 ? '' : 's') + ' · ' + G.hints + ' hint' + (G.hints === 1 ? '' : 's') + SITE_TAIL;
  }
  return head + 'Gave up after ' + passes() + ' passes (par ' + G.par + ')' + SITE_TAIL;
}
var SITE = !!window.SIX_SITE;
var CAN_SHARE = SITE && typeof navigator.share === 'function';
var SITE_TAIL = SITE ? '\n' + location.origin : '';
function renderResult() {
  var r = $('result');
  if (G.status === 'playing') { r.hidden = true; return; }
  r.hidden = false;
  var h, diff = passes() - G.par;
  if (G.status === 'won') {
    var pill = diff <= 0 ? '<span class="pill">On par</span>' : '<span class="pill over">' + diff + ' over par</span>';
    h = '<p class="eyebrow">Full time</p><div class="final"><span class="big">' + passes() + '</span><span class="unit">' + (passes() === 1 ? 'pass' : 'passes') + '</span>' + pill + '</div>' +
      '<p class="meta">Par ' + G.par + ' · ' + G.misses + ' yellow card' + (G.misses === 1 ? '' : 's') + ' · ' + G.hints + ' hint' + (G.hints === 1 ? '' : 's') + '</p>';
  } else {
    var rt = route(G.start, G.target);
    h = '<p class="eyebrow">Abandoned</p><div class="final"><span class="unit">You gave up</span></div><h3>Quickest route</h3><ol class="chain">' + chainHTML(rt, false) + '</ol>';
  }
  h += '<div class="actions"><button type="button" class="btn primary" id="copyBtn">' + (CAN_SHARE ? 'Share result' : 'Copy result') + '</button><button type="button" class="btn" id="againBtn">' + (mode === 'daily' ? 'Try free play' : 'New pair') + '</button></div><textarea id="shareFallback" readonly hidden></textarea>';
  r.innerHTML = h;
}
function renderSuggest() {
  if (!results.length) { sugg.hidden = true; sugg.innerHTML = ''; return; }
  sugg.hidden = false;
  sugg.innerHTML = results.map(function (r, i) {
    return '<li><button type="button" role="option" data-i="' + i + '" class="' + (i === active ? 'active' : '') + '">' + esc(r.label) + '<small>' + (r.t === 'c' ? 'Club' : 'Player') + '</small></button></li>';
  }).join('');
}
function renderFoot() { $('foot').textContent = players.length + ' players and ' + clubMap.size + ' clubs, hand-compiled up to the 2025/26 season. Loans and mid-season moves are approximate.'; }
function render() { renderTop(); renderFixture(); renderScore(); renderChain(); renderPlay(); renderResult(); }

/* ---------- events ---------- */
input.addEventListener('input', function () { results = search(input.value); active = 0; renderSuggest(); });
input.addEventListener('keydown', function (e) {
  if (e.key === 'ArrowDown' && results.length) { active = (active + 1) % results.length; renderSuggest(); e.preventDefault(); }
  else if (e.key === 'ArrowUp' && results.length) { active = (active - 1 + results.length) % results.length; renderSuggest(); e.preventDefault(); }
  else if (e.key === 'Enter') {
    e.preventDefault();
    if (results.length) pick(results[active]);
    else if (input.value.trim()) say('Nothing matches “' + input.value.trim() + '”. Pick a name from the list.', true);
  }
});
sugg.addEventListener('mousedown', function (e) { e.preventDefault(); });
sugg.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) pick(results[+b.dataset.i]); });
$('hintline').addEventListener('click', function (e) { if (e.target.id === 'hintPlay') pick(G.hint); });
$('undoBtn').addEventListener('click', function () { if (G.chain.length > 1 && G.status === 'playing') { G.chain.pop(); moved(); } });
$('hintBtn').addEventListener('click', giveHint);
$('giveBtn').addEventListener('click', function () {
  if (!giveArmed) {
    giveArmed = setTimeout(function () { giveArmed = 0; $('giveBtn').textContent = 'Give up'; }, 4000);
    this.textContent = 'Tap again'; return;
  }
  clearTimeout(giveArmed); giveArmed = 0;
  finish('gaveup'); moved();
});
function newFree() { games.free = fresh(makePuzzle(rngFrom(Date.now() ^ Math.floor(Math.random() * 1e9)), freePar), 'free'); G = games.free; say(''); input.value = ''; results = []; renderSuggest(); persist(); render(); }
function setMode(m) { mode = m; G = games[m]; say(''); input.value = ''; results = []; renderSuggest(); persist(); render(); }
$('modeDaily').addEventListener('click', function () { setMode('daily'); });
$('modeFree').addEventListener('click', function () { setMode('free'); });
$('newPair').addEventListener('click', newFree);
$('parChips').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; freePar = +b.dataset.par; newFree(); });
$('result').addEventListener('click', function (e) {
  if (e.target.id === 'againBtn') { if (mode === 'daily') setMode('free'); else newFree(); }
  if (e.target.id === 'copyBtn') {
    var text = shareText(), btn = e.target;
    var fallback = function () { var t = $('shareFallback'); t.value = text; t.hidden = false; t.focus(); t.select(); btn.textContent = 'Select and copy'; };
    if (CAN_SHARE) {
      navigator.share({ text: text }).catch(function (err) { if (!err || err.name !== 'AbortError') fallback(); });
      return;
    }
    try {
      navigator.clipboard.writeText(text).then(function () { btn.textContent = 'Copied'; }, fallback);
    } catch (err) { fallback(); }
  }
});

renderFoot();
render();
})();
