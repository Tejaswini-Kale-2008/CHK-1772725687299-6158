/**
 * CivicResolve – ui.js
 * Loaded as FIRST script in <head> so transitions work immediately.
 * Exposes: showToast(), initSidebar(), hideLoader()
 * Auto-runs: transitions, parallax, scroll-reveal, card tilt, navbar scroll
 */

/* ─── TRANSITION STATE ─── */
var CR = (function() {

  /* ── Curtain element ── */
  function curtain() {
    var el = document.getElementById('cr-curtain');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'cr-curtain';
    el.innerHTML =
      '<div id="cr-curtain-inner" style="text-align:center;color:#fff;opacity:0;' +
      'transition:opacity 0.25s ease 0.15s">' +
      '<div style="font-family:Georgia,serif;font-size:2rem;font-weight:900;' +
      'letter-spacing:-0.01em;margin-bottom:8px">⚖️ CivicResolve</div>' +
      '<div style="font-size:0.8rem;letter-spacing:0.12em;color:rgba(255,255,255,0.5);' +
      'text-transform:uppercase">Government Platform</div></div>';
    document.documentElement.appendChild(el);
    return el;
  }

  /* ── Cover screen (exit) ── */
  function cover(href) {
    var el = curtain();
    el.style.cssText =
      'position:fixed;inset:0;z-index:99999;pointer-events:all;display:flex;' +
      'align-items:center;justify-content:center;' +
      'background:linear-gradient(135deg,#3B0764 0%,#6B21A8 60%,#8B3DC8 100%);' +
      'transform:translateY(100%);' +
      'transition:transform 0.48s cubic-bezier(0.76,0,0.24,1)';
    var inner = document.getElementById('cr-curtain-inner');
    if (inner) inner.style.opacity = '0';

    /* force reflow then animate */
    el.getBoundingClientRect();
    el.style.transform = 'translateY(0)';
    if (inner) setTimeout(function() { inner.style.opacity = '1'; }, 200);
    setTimeout(function() { window.location.href = href; }, 520);
  }

  /* ── Reveal page (entry) ── */
  function reveal() {
    var el = curtain();
    el.style.cssText =
      'position:fixed;inset:0;z-index:99999;pointer-events:none;display:flex;' +
      'align-items:center;justify-content:center;' +
      'background:linear-gradient(135deg,#3B0764 0%,#6B21A8 60%,#8B3DC8 100%);' +
      'transform:translateY(0);' +
      'transition:transform 0.6s cubic-bezier(0.25,1,0.5,1)';
    var inner = document.getElementById('cr-curtain-inner');
    if (inner) inner.style.opacity = '1';

    el.getBoundingClientRect();
    el.style.transform = 'translateY(-100%)';    /* slides UP off screen */
    setTimeout(function() { el.style.display = 'none'; }, 700);
  }

  return { cover: cover, reveal: reveal };
})();

/* ─── INTERCEPT LINKS ─── */
var _navigating = false;   // guard: prevents double-fire

document.addEventListener('click', function(e) {
  if (_navigating) { e.preventDefault(); e.stopPropagation(); return; }

  var link = e.target.closest('a[href]');
  if (!link) return;
  var href = link.getAttribute('href');
  if (!href) return;
  if (href.charAt(0) === '#') return;
  if (href.indexOf('http') === 0 || href.indexOf('//') === 0) return;
  if (href.indexOf('mailto') === 0 || href.indexOf('tel') === 0) return;
  if (link.getAttribute('data-no-tr') !== null) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  // Skip if href resolves to the current page (prevents same-page double effect)
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  var targetPage  = href.split('?')[0].split('#')[0];
  if (targetPage === currentPage || targetPage === '') return;

  e.preventDefault();
  e.stopPropagation();
  _navigating = true;
  CR.cover(href);
}, true);

/* ─── REVEAL ON PAGE LOAD ─── */
window.addEventListener('load', function() {
  setTimeout(function() { CR.reveal(); }, 80);
  /* hide loading screen */
  var ldr = document.getElementById('loading-screen');
  if (ldr) {
    ldr.style.transition = 'opacity 0.35s ease';
    setTimeout(function() {
      ldr.style.opacity = '0';
      setTimeout(function() { ldr.style.display = 'none'; }, 380);
    }, 400);
  }
  /* init everything */
  initParallax();
  initNavbarScroll();
  initScrollReveal();
  initCardTilt();
  initSidebar();
});

/* ─── MOUSE PARALLAX ─── */
function initParallax() {
  var mx = 0, my = 0, cx = 0, cy = 0;
  function lerp(a,b,t){ return a + (b-a)*t; }

  document.addEventListener('mousemove', function(e) {
    mx = (e.clientX / window.innerWidth  - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
  });
  document.addEventListener('mouseleave', function() { mx = 0; my = 0; });

  (function tick() {
    requestAnimationFrame(tick);
    cx = lerp(cx, mx, 0.055);
    cy = lerp(cy, my, 0.055);

    /* canvas background drift */
    var bg = document.getElementById('bg-canvas');
    if (bg) bg.style.transform = 'translate('+cx*16+'px,'+cy*11+'px) scale(1.06)';

    /* elements with data-depth */
    var els = document.querySelectorAll('[data-depth]');
    for (var i = 0; i < els.length; i++) {
      var d = parseFloat(els[i].getAttribute('data-depth')) || 1;
      els[i].style.transform = 'translate('+cx*d*10+'px,'+cy*d*7+'px)';
    }
  })();
}

/* ─── CARD 3D TILT ─── */
function initCardTilt() {
  var cards = document.querySelectorAll('.stat-card');
  for (var i = 0; i < cards.length; i++) {
    (function(card) {
      card.addEventListener('mousemove', function(e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width  - 0.5;
        var y = (e.clientY - r.top)  / r.height - 0.5;
        card.style.transform = 'perspective(700px) rotateY('+(x*10)+'deg) rotateX('+(-y*8)+'deg) translateY(-5px) scale(1.02)';
        card.style.transition = 'box-shadow 0.2s';
        card.style.boxShadow  = '0 20px 45px rgba(107,33,168,0.25)';
      });
      card.addEventListener('mouseleave', function() {
        card.style.transform  = '';
        card.style.boxShadow  = '';
      });
    })(cards[i]);
  }
}

/* ─── NAVBAR SCROLL ─── */
function initNavbarScroll() {
  var nav = document.querySelector('.navbar');
  if (!nav) return;
  window.addEventListener('scroll', function() {
    if (window.scrollY > 30) {
      nav.style.background = 'rgba(255,255,255,0.92)';
      nav.style.boxShadow  = '0 4px 30px rgba(74,14,143,0.14)';
    } else {
      nav.style.background = '';
      nav.style.boxShadow  = '';
    }
  }, { passive: true });
}

/* ─── SCROLL REVEAL ─── */
function initScrollReveal() {
  var items = document.querySelectorAll('.glass,.stat-card,.cat-card,.reveal-item');
  if (!items.length) return;
  /* set initial state */
  for (var i = 0; i < items.length; i++) {
    items[i].style.opacity = '0';
    items[i].style.transform = 'translateY(24px) scale(0.97)';
  }
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry, idx) {
      if (entry.isIntersecting) {
        var el = entry.target;
        var delay = idx % 5 * 70;
        el.style.transition = 'opacity 0.55s ease '+delay+'ms, transform 0.55s cubic-bezier(0.22,1,0.36,1) '+delay+'ms';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0) scale(1)';
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.07, rootMargin: '0px 0px -30px 0px' });
  for (var j = 0; j < items.length; j++) obs.observe(items[j]);
}

/* ─── SIDEBAR ─── */
function initSidebar() {
  var toggle  = document.getElementById('sidebar-toggle');
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  if (!toggle || !sidebar) return;
  toggle.addEventListener('click', function() {
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
  });
  if (overlay) overlay.addEventListener('click', function() {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  });
}

/* ─── TOAST ─── */
function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(function() { t.classList.remove('show'); }, 3200);
}

/* ─── HIDE LOADER (legacy compat) ─── */
function hideLoader() {
  var ldr = document.getElementById('loading-screen');
  if (!ldr) return;
  ldr.style.transition = 'opacity 0.35s';
  ldr.style.opacity = '0';
  setTimeout(function() { ldr.style.display = 'none'; }, 380);
}
