// GSAP
(function () {

  gsap.registerPlugin(ScrollTrigger);
  gsap.registerPlugin(CustomEase);

  CustomEase.create('accordion-close', 'M0,0 C0,1 0.584,1 1,1');

  // ── Nav: shrink + hide/show on scroll ──────────────────────────
  var nav = document.querySelector('.nav_component');
  var brand = document.querySelector('.nav_brand');
  var cont = document.querySelector('.nav_container');

  if (nav && brand && cont) {

    // ── Config ─────────────────────────────────────────────────
    var SHRINK_AT = 80;   // px – nav shrinks past this point
    var HIDE_AT = 300;  // px – nav hides past this point
    var HIDE_AFTER = 60;   // px – must scroll down this far before nav hides
    var REVEAL_UP = 40;   // px – must scroll up this far before nav reappears
    // ───────────────────────────────────────────────────────────

    var lastY = window.scrollY;
    var revealFromY = null;
    var hideFromY = null; // where downward scroll began
    var tick = false;

    function mobile() {
      return !window.matchMedia('(min-width: 768px)').matches;
    }

    function setShrunk(on) {
      nav.classList.toggle('is-shrunk', on);
      brand.classList.toggle('is-shrunk', on);
      cont.classList.toggle('is-shrunk', on);
    }

    function update() {
      tick = false;

      if (window.lenis && window.lenis.__suppressNavHide) {
        lastY = window.scrollY;
        return;
      }

      var y = window.scrollY;
      var dy = y - lastY;
      lastY = y;

      if (mobile()) {
        setShrunk(false);
        nav.classList.remove('is-hidden');
        revealFromY = null;
        return;
      }

      if (y < SHRINK_AT) {
        // Zone 1 – full nav, always visible
        setShrunk(false);
        nav.classList.remove('is-hidden');
        revealFromY = null;

      } else if (y < HIDE_AT) {
        // Zone 2 – shrunk, always visible
        setShrunk(true);
        nav.classList.remove('is-hidden');
        revealFromY = null;

      } else {
        // Zone 3 – shrunk, hide/show based on direction
        setShrunk(true);

        if (dy > 0) {
          // Scrolling down → only hide after HIDE_AFTER px of downward intent
          if (hideFromY === null) hideFromY = y;
          if (y - hideFromY >= HIDE_AFTER) {
            nav.classList.add('is-hidden');
          }
          revealFromY = null;
        } else if (dy < 0) {
          // Scrolling up → only reveal after REVEAL_UP px of upward intent
          if (revealFromY === null) revealFromY = y;
          if (revealFromY - y >= REVEAL_UP) {
            nav.classList.remove('is-hidden');
          }
          hideFromY = null;
        }
      }
    }

    // Expose for other modules (modals, loaders, etc.)
    window.__nav = {
      revealShrunk: function () {
        setShrunk(true);
        nav.classList.remove('is-hidden');
        revealFromY = null;
        lastY = window.scrollY;
      }
    };

    // Correct state if the user lands/refreshes mid-page
    (function () {
      if (mobile()) return;
      if (window.scrollY >= SHRINK_AT) setShrunk(true);
    }());

    window.addEventListener('scroll', function () {
      if (!tick) { requestAnimationFrame(update); tick = true; }
    }, { passive: true });

    window.addEventListener('resize', function () {
      if (mobile()) { setShrunk(false); nav.classList.remove('is-hidden'); }
    });
  }

  // ── Config ──────────────────────────────────────────────────────
  var DURATION = 0.8;         // base animation duration (seconds)
  var EASE = 'power3.out';  // easing for all animations
  var STAGGER = 0.08;        // base stagger gap between children
  // ────────────────────────────────────────────────────────────────

  // ── data-load: fade in to target opacity ────────────────────────
  document.querySelectorAll('[data-load]').forEach(function (el) {
    var targetOpacity = parseFloat(el.getAttribute('data-load'));
    if (isNaN(targetOpacity)) return;

    var triggerLine = window.innerHeight * 0.80;
    var inView = el.getBoundingClientRect().top < triggerLine;

    if (inView) {
      gsap.from(el, {
        opacity: 0,
        duration: DURATION,
        ease: EASE,
        onComplete: function () { gsap.set(el, { clearProps: 'opacity' }); }
      });
    } else {
      gsap.set(el, { opacity: 0 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: function () {
          gsap.to(el, {
            opacity: targetOpacity,
            duration: DURATION * 1.5,   // scroll-triggered gets a slightly longer fade
            ease: EASE,
            onComplete: function () { gsap.set(el, { clearProps: 'opacity' }); }
          });
        },
      });
    }
  });

  // ── Scroll-reveal: stagger [data-animate] children into view ───
  function runAnimations() {
    document.querySelectorAll('[data-animate]').forEach(function (el) {
      var v = el.getAttribute('data-animate');

      if (v === 'horizontal' || v === 'vertical') {
        var prop = v === 'horizontal' ? 'scaleX' : 'scaleY';
        gsap.set(el, { [prop]: 0 });
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          once: true,
          onEnter: function () {
            gsap.to(el, {
              [prop]: 1,
              duration: DURATION * 1.35,  // slightly longer than a fade — scale reads faster
              delay: DURATION * 0.5,
              ease: EASE
            });
          },
        });
        return;
      }

      var t = v === 'self' ? [el] : v
        ? Array.from(el.querySelectorAll(v))
        : Array.from(el.children);
      if (!t.length) return;

      var triggerLine = window.innerHeight * 0.85;
      var inView = t.filter(function (e) { return e.getBoundingClientRect().top < triggerLine; });
      var queued = t.filter(function (e) { return e.getBoundingClientRect().top >= triggerLine; });

      if (inView.length) {
        gsap.from(inView, {
          opacity: 0,
          y: 30,
          duration: DURATION,
          ease: EASE,
          stagger: STAGGER,
          onComplete: function () {
            gsap.set(inView, { clearProps: 'transform' });
          },
        });
      }

      if (queued.length) {
        gsap.set(queued, { opacity: 0, y: 30 });
        ScrollTrigger.batch(queued, {
          start: 'top 90%',
          once: true,
          onEnter: function (batch) {
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              duration: DURATION * 1.5,   // scroll-triggered gets the same longer window as data-load
              ease: EASE,
              stagger: STAGGER * 1.5,     // queued items spread a little wider
              onComplete: function () {
                gsap.set(batch, { clearProps: 'transform' });
              },
            });
          },
        });
      }
    });
  }

  // Handle hash on load — scroll first, THEN init animations
  var hash = location.hash.slice(1);
  var hashTarget = hash ? document.getElementById(hash) : null;

  if (hashTarget) {
    requestAnimationFrame(function () {
      if (window.lenis) {
        // Shrink nav immediately — before any scroll or reveal
        if (window.__nav) window.__nav.revealShrunk();
        window.lenis.__suppressNavHide = true;
        window.lenis.scrollTo(hashTarget, {
          offset: -32,
          duration: 0.01,
          onComplete: function () {
            window.lenis.__suppressNavHide = false;
            ScrollTrigger.refresh();
            runAnimations();
          }
        });
      } else {
        window.scrollTo({ top: hashTarget.offsetTop - 32 });
        ScrollTrigger.refresh();
        runAnimations();
      }
    });
  } else {
    runAnimations();
  }

})();

// LENIS
(function () {
  var lenis = new Lenis({
    lerp: 0.25,
    wheelMultiplier: 1,
    smoothWheel: true,
    smoothTouch: false,
  });

  function raf(time) {
    lenis.raf(time);
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.update();
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  window.lenis = lenis;
})();

// MODAL
document.addEventListener('click', function (e) {
  var open = e.target.closest('[data-modal-open]');
  if (open) {
    e.preventDefault();
    var modal = document.getElementById(open.getAttribute('data-modal-open') || 'contact-modal');
    if (modal) { modal.showModal(); window.lenis.stop(); }
  }
  if (e.target.closest('[data-modal-close]')) {
    var modal = e.target.closest('dialog');
    if (modal) { modal.close(); window.lenis.start(); }
  }
});
document.querySelectorAll('dialog').forEach(function (d) {
  d.addEventListener('click', function (e) {
    if (e.target === d) { d.close(); window.lenis.start(); }
  });
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && document.querySelector('dialog[open]')) {
    window.lenis.start();
  }
});

// HERO VIDEO
(function () {
  var container = document.querySelector('[data-player-src]');
  if (!container) return;

  var video = container.querySelector('video');
  if (!video) return;

  video.src = container.getAttribute('data-player-src');
  video.muted = true;
  video.loop = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  if (typeof video.disableRemotePlayback !== 'undefined') {
    video.disableRemotePlayback = true;
  }

  video.addEventListener('canplaythrough', function () {
    container.setAttribute('data-player-activated', 'true');
  }, { once: true });

  video.play().catch(function () {
    video.addEventListener('canplaythrough', function () {
      video.play().catch(function () { });
    }, { once: true });
  });

  // Click anywhere on the hero to pause/resume
  container.addEventListener('click', function () {
    if (video.paused) { video.play().catch(function () { }); }
    else { video.pause(); }
  });
})();

// TICKER — GSAP
(function () {
  if (typeof gsap === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var SPEED = 35;
  var STOP = { timeScale: 0, duration: 0.5, ease: 'power2.out', overwrite: 'auto' };
  var RESUME = { timeScale: 1, duration: 0.5, ease: 'power2.in', overwrite: 'auto' };

  var tweens = new Map();
  var lastWidths = new Map();

  function buildTween(track) {
    gsap.set(track, { x: 0 });
    return gsap.to(track, {
      x: '-50%',
      duration: SPEED,
      ease: 'none',
      repeat: -1
    });
  }

  function initTicker(wrapper) {
    var track = wrapper.querySelector('.ticker_track');
    if (!track) return;

    var prev = tweens.get(track);
    if (prev) prev.kill();

    track.querySelectorAll('.ticker_list[aria-hidden]').forEach(function (el) { el.remove(); });
    var original = track.querySelector('.ticker_list');
    if (!original) return;
    var clone = original.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
    lastWidths.set(track, original.offsetWidth);

    var tween = buildTween(track);
    tweens.set(track, tween);

    var hovered = false;
    wrapper.addEventListener('mouseover', function (e) {
      if (hovered) return;
      if (!e.target.closest('.ticker_item')) return;
      hovered = true;
      gsap.to(tween, STOP);
    });
    wrapper.addEventListener('mouseout', function (e) {
      if (!hovered) return;
      if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.ticker_item')) return;
      hovered = false;
      gsap.to(tween, RESUME);
    });

    wrapper.addEventListener('focusin', function (e) {
      if (!e.target.closest('.ticker_item')) return;
      gsap.to(tween, STOP);
    });
    wrapper.addEventListener('focusout', function (e) {
      if (e.relatedTarget && wrapper.contains(e.relatedTarget)) return;
      gsap.to(tween, RESUME);
    });
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      document.querySelectorAll('.ticker_wrapper').forEach(function (wrapper) {
        var track = wrapper.querySelector('.ticker_track');
        if (!track) return;
        var original = track.querySelector('.ticker_list:not([aria-hidden])');
        if (!original) return;
        var w = original.offsetWidth;
        if (lastWidths.get(track) === w) return;
        initTicker(wrapper);
      });
    }, 200);
  });

  function init() {
    document.querySelectorAll('.ticker_wrapper').forEach(initTicker);
  }

  init();
})();

// ACCORDION
(function () {
  function init() {
    document.documentElement.classList.add('js-accordions-ready');

    const S = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    document.querySelectorAll('.accordion_item').forEach(item => {
      const top = item.querySelector('.accordion_top');
      const bot = item.querySelector('.accordion_bottom');
      const icon = item.querySelector('.accordion_icon-wrapper');
      if (!top || !bot || !icon) return;

      if (!item.id) {
        const h = item.querySelector('h1,h2,h3,h4,h5,h6');
        if (h) item.id = S(h.textContent.trim());
      }
      const cid = item.id ? item.id + '-panel' : '';
      if (cid && !bot.id) bot.id = cid;
      if (cid) top.setAttribute('aria-controls', cid);
      bot.setAttribute('role', 'region');
      top.setAttribute('aria-expanded', 'false');
      bot.setAttribute('aria-hidden', 'true');

      const divider = bot.querySelector('[data-animate="horizontal"]');
      const eyebrow = bot.querySelector('.accordion_bottom-tagline-wrapper');
      const content = bot.querySelector('.accordion_bottom-content');
      const button = bot.querySelector('.accordion_button-wrapper');

      const staggerEls = [
        ...(eyebrow ? [eyebrow] : []),
        ...(content ? Array.from(content.children) : []),
        ...(button ? [button] : []),
      ];

      gsap.set(bot, { height: 0 });
      gsap.set(staggerEls, { opacity: 0, y: 20 });
      if (divider) gsap.set(divider, { scaleX: 0 });

      const tl = gsap.timeline({ paused: true });

      tl.fromTo(bot,
        { height: 0 },
        { height: () => bot.scrollHeight, duration: 0.5, ease: 'power2.out' },
        0)
        .fromTo(divider || [],
          { scaleX: 0 },
          { scaleX: 1, duration: 0.5, ease: 'power2.out' },
          0.05)
        .fromTo(staggerEls,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power4.out',
            stagger: { each: 0.1, from: 'start' }
          },
          0.15);

      tl.eventCallback('onComplete', function () {
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      });
      tl.eventCallback('onReverseComplete', function () {
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      });

      let isAnimating = false;

      function open() {
        if (isAnimating) return;
        isAnimating = true;

        top.setAttribute('aria-expanded', 'true');
        bot.setAttribute('aria-hidden', 'false');
        icon.classList.add('is-open');

        gsap.set(staggerEls, { opacity: 0, y: 20 });
        gsap.set(bot, { height: 0 });
        if (divider) gsap.set(divider, { scaleX: 0 });

        gsap.timeline({ onComplete: function () { if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh(); } })
          .to(bot, { height: bot.scrollHeight, duration: 0.5, ease: 'power2.out' }, 0)
          .to(divider || [], { scaleX: 1, duration: 0.5, ease: 'power2.out' }, 0.05)
          .to(staggerEls, { opacity: 1, y: 0, duration: .75, ease: 'power2.out', stagger: { each: 0.08, from: 'start' }, onComplete: function () { isAnimating = false; } }, 0.1);

        requestAnimationFrame(function () {
          if (window.lenis) {
            window.lenis.__suppressNavHide = true;
            window.lenis.scrollTo(item, {
              offset: -32,
              duration: 1,
              ease: 'power2.out',
              onComplete: function () {
                window.lenis.__suppressNavHide = false;
                if (window.__nav && window.scrollY >= window.__nav.THRESHOLD) {
                  window.__nav.revealShrunk();
                }
              }
            });
          } else {
            item.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }

      function close() {
        //if (isAnimating) return;
        isAnimating = true;

        top.setAttribute('aria-expanded', 'false');
        bot.setAttribute('aria-hidden', 'true');
        icon.classList.remove('is-open');

        gsap.timeline({ onComplete: function () { if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh(); } })
          .to(staggerEls, { opacity: 0, y: 20, duration: 0.25, ease: 'power2.in', stagger: 0 }, 0)
          .to(divider || [], { scaleX: 0, duration: 0.25, ease: 'power2.in' }, 0)
          .to(bot, { height: 0, duration: 0.4, ease: 'power4.inOut', onComplete: function () { isAnimating = false; } }, 0.15);
      }

      top.addEventListener('click', () => {
        const isOpen = top.getAttribute('aria-expanded') === 'true';
        isOpen ? close() : open();
      });

      top.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); top.click(); }
      });

      if (item.dataset.startOpen === 'true') {
        top.setAttribute('aria-expanded', 'true');
        bot.setAttribute('aria-hidden', 'false');
        icon.classList.add('is-open');
        tl.progress(1);
      }
    });

    // Open accordion if hash matches an accordion item
    var H = location.hash.slice(1);
    if (H) {
      var target = document.getElementById(H);
      if (target && target.classList.contains('accordion_item')) {
        var tp = target.querySelector('.accordion_top');
        if (tp) tp.click();
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

// FOOTER
(function () {
  var el = document.getElementById("footer-year");
  if (el) el.textContent = (new Date()).getFullYear();
})();