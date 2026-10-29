/* নোটিশ বোর্ড — নতুন ডিজাইনের রেন্ডারার।
   main.js-এর পরে লোড হয় এবং নোটিশ তালিকা ও বিস্তারিত পেজ নতুন ডিজাইনে সাজায়।
   ডেটা আগের মতোই assets/notices-data.js থেকে আসে। */
(function () {
  var NS = window.NOTICES || [];

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : s;
    return d.innerHTML.replace(/"/g, '&quot;');
  }
  function safeHref(u) {
    u = String(u || '').trim();
    return /^\s*(javascript|data|vbscript):/i.test(u) ? '#' : esc(u);
  }
  function dateText(n) { return n.date.d + ' ' + n.date.m + ', ' + n.date.y; }

  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>';

  /* ---------- তালিকা পেজ ---------- */
  function cardHTML(n) {
    return '<article class="sn-card" data-category="' + esc(n.category) + '">' +
      '<h3 class="sn-title">' + esc(n.title) + '</h3>' +
      '<p class="sn-excerpt">' + esc(n.excerpt) + '</p>' +
      '<div class="sn-foot">' +
        '<a class="sn-btn" href="notice-detail.html?id=' + encodeURIComponent(n.id) + '">' + ARROW + '<span>বিস্তারিত</span></a>' +
        '<span class="sn-date">' + esc(dateText(n)) + '</span>' +
      '</div></article>';
  }

  function initList() {
    var grid = document.getElementById('noticeGrid');
    if (!grid || !NS.length) return;
    grid.classList.add('sn-grid');

    // main.js-এর পুরনো ফিল্টার/সার্চ হ্যান্ডলার সরিয়ে নতুন করে বসানো
    var filters = [].slice.call(document.querySelectorAll('.gfilter')).map(function (b) {
      var c = b.cloneNode(true); b.parentNode.replaceChild(c, b); return c;
    });
    var input = document.getElementById('noticeSearch');
    if (input) { var ci = input.cloneNode(true); input.parentNode.replaceChild(ci, input); input = ci; }

    function render() {
      var active = document.querySelector('.gfilter.active');
      var cat = active ? active.getAttribute('data-filter') : 'all';
      var q = (input && input.value || '').trim().toLowerCase();
      var list = NS.filter(function (n) {
        var catOk = cat === 'all' || n.category === cat;
        var qOk = !q || n.title.toLowerCase().indexOf(q) > -1 || n.excerpt.toLowerCase().indexOf(q) > -1;
        return catOk && qOk;
      });
      grid.innerHTML = list.length
        ? list.map(cardHTML).join('')
        : '<p class="sn-empty">এই মুহূর্তে কোনো নোটিশ পাওয়া যায়নি।</p>';
    }

    filters.forEach(function (b) {
      b.addEventListener('click', function () {
        filters.forEach(function (f) { f.classList.remove('active'); });
        b.classList.add('active');
        render();
      });
    });
    if (input) input.addEventListener('input', render);
    render();
  }

  /* ---------- বিস্তারিত পেজ ---------- */
  function blockHTML(b) {
    switch (b.type) {
      case 'p':    return '<p>' + esc(b.text) + '</p>';
      case 'h':    return '<div class="sn-h"><span>' + esc(b.icon || '') + '</span>' + esc(b.text) + '</div>';
      case 'list': return '<ul class="sn-list">' + b.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>';
      case 'note': return '<div class="sn-note' + (b.style === 'info' ? ' info' : '') + '"><span>' + esc(b.icon || 'ℹ️') + '</span><p>' + esc(b.text) + '</p></div>';
      case 'seats':return '<div class="sn-seats">' + b.items.map(function (i) { return '<div class="sn-seat"><i></i>' + esc(i.label) + ' — ' + esc(i.value) + '</div>'; }).join('') + '</div>';
      case 'link': return '<div class="sn-actions"><a href="' + safeHref(b.href) + '">' + esc(b.label) + '</a></div>';
      default:     return '';
    }
  }

  function initDetail() {
    var root = document.getElementById('noticeDetailRoot');
    if (!root) return;
    var id = new URLSearchParams(location.search).get('id');
    var n = NS.filter(function (x) { return x.id === id; })[0];
    if (!n) return; // খুঁজে না পেলে main.js-এর "নোটিশটি পাওয়া যায়নি" বার্তাই থাকবে

    var blocks = (n.body || []).slice();
    if (blocks[0] && blocks[0].type === 'p' && String(blocks[0].text).slice(0, 40) === String(n.excerpt || '').slice(0, 40)) {
      blocks.shift(); // সারসংক্ষেপের সঙ্গে হুবহু মিললে প্রথম অনুচ্ছেদ আর দ্বিতীয়বার দেখানো হবে না
    }

    root.classList.remove('notice-detail-wrap');
    root.classList.add('sn-detail');
    root.innerHTML =
      '<div class="sn-detail-head">' +
        '<h1>' + esc(n.title) + '</h1>' +
        '<span class="sn-date-chip">' + CAL + esc(dateText(n)) + '</span>' +
      '</div>' +
      '<div class="sn-detail-body">' +
        (n.excerpt ? '<div class="sn-intro">' + esc(n.excerpt) + '</div>' : '') +
        blocks.map(blockHTML).join('') +
      '</div>';
  }

  function run() { initList(); initDetail(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else setTimeout(run, 0);
})();
