/* ==========================================================================
   ASTRA — SHARED RUNTIME
   One implementation of every behaviour the site repeats: theme, navigation,
   cursor, starfield, toasts, tab cloaking, the panic key, update checks,
   broadcasts and the fullscreen frame overlay.

   Load it once per page, after the markup:
       <script src="astra.js" defer></script>

   Pages opt out of individual features with body attributes, e.g.
       <body data-astra-cursor="off" data-astra-stars="off">

   Public API (window.Astra):
       Astra.theme.get() / .set('dark'|'light') / .toggle()
       Astra.toast(message, { duration })
       Astra.cloak('drive'|'classroom'|'docs'|'reset')
       Astra.cloak({ title, favicon })
       Astra.cursor.hide() / .show()
       Astra.openFrame({ url, title }) / Astra.closeFrame()
       Astra.mountTiles(element, items)
       Astra.ready(fn)
   ========================================================================== */

(function () {
  "use strict";

  /* ---------------------------------------------------------------- CONFIG */

  var CONFIG = {
    /* Where the panic key sends you. */
    panicKey: "]",
    panicUrl: "https://www.google.com",

    /* How often to poll for a redeployed page / new broadcast (ms). */
    updateInterval: 45000,
    broadcastInterval: 20000,

    /* Broadcast source. See the security note in README.md: this bin id and
       key ship to every visitor, so treat the bin as public data. The read is
       attempted WITHOUT the key first — make the bin public in jsonbin and the
       key stops being needed here at all. */
    broadcastBin: "6a0fb2fb6610dd3ae8858731",
    broadcastKey: "$2a$10$dmsG1/GXWAA5tim8ejcE8uKD75pB.KxZxZDzIAb4AdPcJAU93f9nK"
  };

  /* Site navigation — the single source of truth. Every page renders its nav
     from this list, so adding a page here adds it everywhere at once. */
  var NAV = [
    { label: "Home", href: "index.html", hero: false },
    { label: "Games", href: "games.html" },
    { label: "Tools", href: "tools.html" },
    { label: "Apps", href: "apps.html" },
    { label: "Gallery", href: "gallery.html" },
    { label: "Weather", href: "weathermap.html" },
    { label: "FluidCam", href: "fluidcam.html" }
  ];

  /* Tab-cloak presets, shared by the Apps utility bar and the Tools cloaker. */
  var CLOAKS = {
    drive: {
      title: "My Drive - Google Drive",
      favicon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png",
      note: "Cloaked as Google Drive"
    },
    classroom: {
      title: "Classes",
      favicon: "https://ssl.gstatic.com/classroom/favicon.png",
      note: "Cloaked as Google Classroom"
    },
    docs: {
      title: "Documents - Google Docs",
      favicon: "https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico",
      note: "Cloaked as Google Docs"
    }
  };

  var STORE = {
    theme: "astra-theme",
    cloak: "astra-cloak",
    notepad: "astra-notepad",
    broadcastSeen: "astra-broadcast-seen"
  };

  /* ----------------------------------------------------------- SMALL UTILS */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function store(key, value) {
    try {
      if (arguments.length === 1) return localStorage.getItem(key);
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) {
      /* Private browsing / disabled storage — features degrade, nothing breaks. */
    }
    return null;
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function hasFinePointer() {
    return window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  /* Reads `data-astra-<name>` from <body>; features are on unless set to "off". */
  function enabled(name) {
    var value = document.body.getAttribute("data-astra-" + name);
    return value !== "off" && value !== "false";
  }

  function isTypingTarget(node) {
    if (!node) return false;
    var tag = node.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable;
  }

  /* Current page filename, normalised so "/", "" and "/index.html" all match. */
  function currentPage() {
    var name = window.location.pathname.split("/").pop();
    return name === "" ? "index.html" : name;
  }

  var readyQueue = [];
  var isReady = false;

  function ready(fn) {
    if (isReady) fn();
    else readyQueue.push(fn);
  }

  /* -------------------------------------------------------------- 1. THEME */

  var Theme = {
    get: function () {
      return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    },
    set: function (mode) {
      var next = mode === "dark" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      store(STORE.theme, next);
      document.dispatchEvent(new CustomEvent("astra:themechange", { detail: { theme: next } }));
      return next;
    },
    toggle: function () {
      return Theme.set(Theme.get() === "dark" ? "light" : "dark");
    }
  };

  function initTheme() {
    /* The inline snippet in each <head> already applied the stored theme to
       avoid a flash; this just makes sure the attribute is always present. */
    Theme.set(store(STORE.theme) === "light" ? "light" : "dark");
  }

  /* --------------------------------------------------------- 2. NAVIGATION */

  function buildNav(mount, variant) {
    var page = currentPage();
    var bar = el("div", "nav-bar nav-bar--" + variant);
    bar.setAttribute("role", "navigation");
    bar.setAttribute("aria-label", "Site");

    if (variant === "fixed") {
      var brand = el("a", "nav-brand", "Astra");
      brand.href = "index.html";
      bar.appendChild(brand);
      bar.appendChild(el("div", "nav-divider"));
    }

    NAV.forEach(function (item) {
      if (variant === "hero" && item.hero === false) return;
      var link = el("a", "nav-link", item.label);
      link.href = item.href;
      if (item.href === page) link.setAttribute("aria-current", "page");
      bar.appendChild(link);
    });

    var toggle = el("button", "nav-icon-btn", "◑");
    toggle.type = "button";
    toggle.id = "theme-toggle";
    toggle.title = "Toggle light / dark theme";
    toggle.setAttribute("aria-label", "Toggle light or dark theme");
    toggle.addEventListener("click", function () {
      Theme.toggle();
    });
    bar.appendChild(toggle);

    mount.appendChild(bar);
  }

  function initNav() {
    var fixed = document.querySelector("[data-astra-nav-mount]");
    if (fixed) buildNav(fixed, "fixed");

    var hero = document.querySelector("[data-astra-hero-nav-mount]");
    if (hero) buildNav(hero, "hero");
  }

  /* ------------------------------------------------------------- 3. CURSOR */

  var Cursor = {
    node: null,
    hide: function () {
      if (Cursor.node) Cursor.node.classList.add("is-hidden");
    },
    show: function () {
      if (Cursor.node) Cursor.node.classList.remove("is-hidden");
    }
  };

  /* Elements that get the enlarged "hover" cursor. */
  var HOVER_TARGETS = "a, button, .tile, [role='button'], input, select, textarea, label";
  /* Elements that get the shrunken precision dot. */
  var PRECISE_TARGETS = "[data-cursor='precise'], img, input[type='range']";

  var pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  function trackPointer() {
    document.addEventListener(
      "mousemove",
      function (e) {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
      },
      { passive: true }
    );
  }

  function initCursor() {
    /* No custom cursor on touch devices or for reduced-motion visitors: the
       trailing lerp is motion, and on touch there is nothing to trail. */
    if (!enabled("cursor") || !hasFinePointer() || prefersReducedMotion()) return;

    var node = el("div", "cursor");
    node.setAttribute("aria-hidden", "true");
    document.body.appendChild(node);
    Cursor.node = node;
    document.documentElement.classList.add("astra-cursor");

    var pos = { x: pointer.x, y: pointer.y };

    (function animate() {
      pos.x += (pointer.x - pos.x) * 0.15;
      pos.y += (pointer.y - pos.y) * 0.15;
      node.style.transform = "translate3d(" + pos.x + "px," + pos.y + "px,0) translate(-50%,-50%)";
      requestAnimationFrame(animate);
    })();

    /* Event delegation instead of per-element listeners, so dynamically added
       markup (tool panels, gallery tiles, toasts) works with no rebinding. */
    document.addEventListener("mouseover", function (e) {
      var target = e.target;
      if (target.closest && target.closest(PRECISE_TARGETS)) node.classList.add("is-precise");
      else if (target.closest && target.closest(HOVER_TARGETS)) node.classList.add("is-hover");
    });

    document.addEventListener("mouseout", function (e) {
      var target = e.target;
      if (!target.closest) return;
      if (target.closest(PRECISE_TARGETS)) node.classList.remove("is-precise");
      if (target.closest(HOVER_TARGETS)) node.classList.remove("is-hover");
    });

    /* Regions that own their own cursor (maps, embedded apps). */
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest(".native-cursor")) Cursor.hide();
      else Cursor.show();
    });

    document.addEventListener("mouseleave", Cursor.hide);
    document.addEventListener("mouseenter", Cursor.show);
  }

  /* ---------------------------------------------------------- 4. STARFIELD */

  function initStars() {
    var canvas = document.getElementById("bg-canvas");
    if (!canvas || !enabled("stars")) return;

    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var still = prefersReducedMotion();
    var width = 0;
    var height = 0;
    var stars = [];
    var fill = "rgba(255,255,255,0.8)";

    function readStarColor() {
      var styles = getComputedStyle(document.documentElement);
      var rgb = (styles.getPropertyValue("--star-rgb") || "255,255,255").trim();
      var alpha = (styles.getPropertyValue("--star-alpha") || "0.8").trim();
      fill = "rgba(" + rgb + "," + alpha + ")";
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var count = Math.min(Math.floor((width * height) / 6000), 420);
      stars = [];
      for (var i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 1.4 + 0.2,
          speed: Math.random() * 0.5 + 0.1,
          alpha: Math.random() * 0.6 + 0.4
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      var px = still ? 0 : (pointer.x - width / 2) * 0.02;
      var py = still ? 0 : (pointer.y - height / 2) * 0.02;

      for (var i = 0; i < stars.length; i++) {
        var star = stars[i];
        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(star.x + px, star.y + py, star.size, 0, Math.PI * 2);
        ctx.fill();

        if (!still) {
          star.y -= star.speed;
          if (star.y < -5) {
            star.y = height + 5;
            star.x = Math.random() * width;
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    var running = true;

    function loop() {
      if (running) draw();
      requestAnimationFrame(loop);
    }

    readStarColor();
    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("astra:themechange", readStarColor);
    /* Don't burn frames on a tab nobody is looking at. */
    document.addEventListener("visibilitychange", function () {
      running = !document.hidden;
    });

    if (still) draw();
    else loop();
  }

  /* ------------------------------------------------------------- 5. TOASTS */

  var toastStack = null;

  function toast(message, options) {
    var opts = options || {};
    if (!toastStack) {
      toastStack = el("div", "toast-stack");
      toastStack.setAttribute("role", "status");
      toastStack.setAttribute("aria-live", "polite");
      document.body.appendChild(toastStack);
    }

    var node = el("div", "toast", message);
    toastStack.appendChild(node);
    requestAnimationFrame(function () {
      node.classList.add("is-visible");
    });

    var life = opts.duration || 2600;
    setTimeout(function () {
      node.classList.remove("is-visible");
      setTimeout(function () {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, 400);
    }, life);

    return node;
  }

  /* ---------------------------------------------------- 6. TAB CLOAK ------ */

  var pageTitle = document.title;

  function faviconLink() {
    var link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = el("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    return link;
  }

  var defaultFavicon = null;

  function cloak(which) {
    if (defaultFavicon === null) defaultFavicon = faviconLink().getAttribute("href") || "favicon.svg";

    /* Custom cloak: Astra.cloak({ title, favicon }) */
    if (which && typeof which === "object") {
      if (which.title) document.title = which.title;
      if (which.favicon) faviconLink().href = which.favicon;
      store(STORE.cloak, JSON.stringify({ title: which.title || "", favicon: which.favicon || "" }));
      return;
    }

    if (!which || which === "reset" || which === "default") {
      document.title = pageTitle;
      faviconLink().href = defaultFavicon;
      store(STORE.cloak, null);
      toast("Cloak reset");
      return;
    }

    var preset = CLOAKS[which];
    if (!preset) return;
    document.title = preset.title;
    faviconLink().href = preset.favicon;
    store(STORE.cloak, which);
    toast(preset.note);
  }

  /* Re-applies the saved cloak on every page so it survives navigation — the
     old per-page cloakers forgot the moment you clicked a link. */
  function restoreCloak() {
    defaultFavicon = faviconLink().getAttribute("href") || "favicon.svg";
    var saved = store(STORE.cloak);
    if (!saved) return;

    if (CLOAKS[saved]) {
      document.title = CLOAKS[saved].title;
      faviconLink().href = CLOAKS[saved].favicon;
      return;
    }

    try {
      var custom = JSON.parse(saved);
      if (custom && custom.title) document.title = custom.title;
      if (custom && custom.favicon) faviconLink().href = custom.favicon;
    } catch (e) {
      store(STORE.cloak, null);
    }
  }

  /* ---------------------------------------------------------- 7. PANIC KEY */

  function initPanic() {
    if (!enabled("panic")) return;
    document.addEventListener("keydown", function (e) {
      /* Never fire while the visitor is typing — the old handler hijacked "]"
         inside the notepad and every text field. */
      if (isTypingTarget(document.activeElement)) return;
      if (e.key !== CONFIG.panicKey || e.metaKey || e.ctrlKey || e.altKey) return;
      window.location.replace(CONFIG.panicUrl);
    });
  }

  /* ------------------------------------------------------ 8. FRAME OVERLAY */

  var frame = { overlay: null, iframe: null, title: null, openBtn: null, lastFocus: null };

  function buildFrame() {
    var overlay = el("div", "frame-overlay native-cursor");
    overlay.id = "astra-frame";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Embedded app");

    var bar = el("div", "frame-bar");
    var title = el("div", "frame-title", "App");
    var actions = el("div", "frame-actions");

    var openBtn = el("a", "btn btn--sm btn--ghost", "Open in new tab");
    openBtn.target = "_blank";
    openBtn.rel = "noopener noreferrer";

    var close = el("button", "close-btn");
    close.type = "button";
    close.innerHTML = "&times;";
    close.title = "Close (Esc)";
    close.setAttribute("aria-label", "Close embedded app");
    close.addEventListener("click", closeFrame);

    actions.appendChild(openBtn);
    actions.appendChild(close);
    bar.appendChild(title);
    bar.appendChild(actions);

    var body = el("div", "frame-body");
    var iframe = el("iframe");
    iframe.setAttribute("title", "Embedded app");
    iframe.setAttribute(
      "allow",
      "fullscreen; clipboard-read; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    );
    body.appendChild(iframe);

    overlay.appendChild(bar);
    overlay.appendChild(body);
    document.body.appendChild(overlay);

    frame.overlay = overlay;
    frame.iframe = iframe;
    frame.title = title;
    frame.openBtn = openBtn;
    return frame;
  }

  function openFrame(options) {
    if (!options || !options.url) return;
    if (!frame.overlay) buildFrame();

    frame.lastFocus = document.activeElement;
    frame.title.textContent = options.title || "App";
    frame.openBtn.href = options.url;
    frame.iframe.src = options.url;
    frame.overlay.classList.add("is-active");
    document.body.classList.add("frame-open");
    Cursor.hide();
    frame.overlay.querySelector(".close-btn").focus();
  }

  function closeFrame() {
    if (!frame.overlay || !frame.overlay.classList.contains("is-active")) return;
    frame.overlay.classList.remove("is-active");
    document.body.classList.remove("frame-open");
    Cursor.show();
    /* Wait for the fade before tearing down the iframe. */
    setTimeout(function () {
      frame.iframe.src = "";
    }, 400);
    if (frame.lastFocus && frame.lastFocus.focus) frame.lastFocus.focus();
  }

  function initFrameKeys() {
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeFrame();
    });
  }

  /* --------------------------------------------------------- 9. TILE GRIDS */

  /* Renders the Apps / Games grids from a data array so both pages look and
     behave identically. items: { label, url, icon, glyph, external } */
  function mountTiles(mount, items) {
    if (!mount) return;
    mount.innerHTML = "";

    items.forEach(function (item) {
      var tile = el(item.external ? "a" : "button", "tile");

      if (item.external) {
        tile.href = item.url;
        tile.target = "_blank";
        tile.rel = "noopener noreferrer";
      } else {
        tile.type = "button";
        tile.addEventListener("click", function () {
          openFrame({ url: item.url, title: item.label });
        });
      }

      if (item.icon) {
        var img = el("img", "tile__icon");
        img.src = item.icon;
        img.alt = "";
        img.loading = "lazy";
        if (item.invert) img.style.filter = "invert(1)";
        /* Fall back to the letter badge if a remote logo fails to load. */
        img.addEventListener("error", function () {
          var glyph = el("div", "tile__glyph", item.label.charAt(0).toUpperCase());
          img.replaceWith(glyph);
        });
        tile.appendChild(img);
      } else {
        tile.appendChild(el("div", "tile__glyph", (item.glyph || item.label.charAt(0)).toUpperCase()));
      }

      tile.appendChild(el("span", "tile__label", item.label));
      tile.setAttribute("aria-label", item.label + (item.external ? " (opens in a new tab)" : ""));
      mount.appendChild(tile);
    });
  }

  /* ----------------------------------------------------- 10. UPDATE CHECKER */

  function initUpdateChecker() {
    if (!enabled("updates")) return;
    if (window.location.protocol === "file:") return;

    var known = null;
    var shown = false;

    function version(response) {
      return response.headers.get("Last-Modified") || response.headers.get("ETag");
    }

    function check() {
      fetch(window.location.href.split("?")[0] + "?t=" + Date.now(), {
        method: "HEAD",
        cache: "no-store"
      })
        .then(function (response) {
          var current = version(response);
          if (!current) return;
          if (known === null) {
            known = current;
            return;
          }
          if (current !== known) {
            known = current;
            showBanner();
          }
        })
        .catch(function () {
          /* Offline or blocked — try again on the next tick. */
        });
    }

    function showBanner() {
      if (shown) return;
      shown = true;

      var banner = el("div", "update-banner");
      banner.setAttribute("role", "status");
      banner.appendChild(el("span", null, "✨ A new version of this page is available"));

      var reload = el("button", "btn btn--sm btn--primary", "Reload");
      reload.type = "button";
      reload.addEventListener("click", function () {
        window.location.reload();
      });

      var close = el("button", "push-card__close");
      close.type = "button";
      close.innerHTML = "&times;";
      close.setAttribute("aria-label", "Dismiss update notice");
      close.addEventListener("click", function () {
        banner.classList.remove("is-visible");
        setTimeout(function () {
          if (banner.parentNode) banner.parentNode.removeChild(banner);
        }, 400);
        shown = false;
      });

      banner.appendChild(reload);
      banner.appendChild(close);
      document.body.appendChild(banner);
      requestAnimationFrame(function () {
        banner.classList.add("is-visible");
      });
    }

    check();
    setInterval(check, CONFIG.updateInterval);
  }

  /* -------------------------------------------------------- 11. BROADCASTS */

  function initBroadcast() {
    if (!enabled("broadcast")) return;
    if (window.location.protocol === "file:") return;

    var base = "https://api.jsonbin.io/v3/b/" + CONFIG.broadcastBin + "/latest?meta=false";

    function read() {
      /* Try the unauthenticated read first. If the bin is public this never
         sends the key at all. */
      return fetch(base + "&t=" + Date.now(), { cache: "no-store" })
        .then(function (response) {
          if (response.ok) return response.json();
          return fetch(base + "&t=" + Date.now(), {
            cache: "no-store",
            headers: { "X-Master-Key": CONFIG.broadcastKey }
          }).then(function (r) {
            return r.ok ? r.json() : null;
          });
        })
        .catch(function () {
          return null;
        });
    }

    function check() {
      read().then(function (data) {
        var message = data && typeof data.message === "string" ? data.message.trim() : "";
        if (!message || message === "null") {
          store(STORE.broadcastSeen, null);
          return;
        }
        if (message === store(STORE.broadcastSeen)) return;
        store(STORE.broadcastSeen, message);
        showBroadcast(message);
      });
    }

    check();
    setInterval(check, CONFIG.broadcastInterval);
  }

  function showBroadcast(message) {
    var existing = document.getElementById("astra-broadcast");
    if (existing) existing.parentNode.removeChild(existing);

    var card = el("div", "push-card");
    card.id = "astra-broadcast";
    card.setAttribute("role", "status");

    var head = el("div", "push-card__head");
    head.appendChild(el("span", "push-card__tag", "System Broadcast"));

    var close = el("button", "push-card__close");
    close.type = "button";
    close.innerHTML = "&times;";
    close.setAttribute("aria-label", "Dismiss broadcast");
    close.addEventListener("click", function () {
      card.classList.remove("is-visible");
      setTimeout(function () {
        if (card.parentNode) card.parentNode.removeChild(card);
      }, 400);
    });
    head.appendChild(close);

    card.appendChild(head);
    /* textContent, not innerHTML — the broadcast body is remote data and must
       never be able to inject markup into the page. */
    card.appendChild(el("div", "push-card__body", message));

    document.body.appendChild(card);
    requestAnimationFrame(function () {
      card.classList.add("is-visible");
    });
  }

  /* ------------------------------------------------------------ 12. LOADER */

  function initLoader() {
    var loader = document.getElementById("loading-screen");
    var content = document.querySelector("[data-astra-reveal]");

    function reveal() {
      if (loader) loader.classList.add("is-hidden");
      if (content) content.classList.add("is-loaded");
    }

    if (!loader && !content) return;

    if (document.readyState === "complete") setTimeout(reveal, prefersReducedMotion() ? 0 : 600);
    else
      window.addEventListener("load", function () {
        setTimeout(reveal, prefersReducedMotion() ? 0 : 600);
      });

    /* Never leave a visitor stuck behind the loader if an asset hangs. */
    setTimeout(reveal, 4000);
  }

  /* -------------------------------------------------------------- 13. BOOT */

  function boot() {
    initTheme();
    restoreCloak();
    trackPointer();
    initNav();
    initCursor();
    initStars();
    initPanic();
    initFrameKeys();
    initLoader();
    initUpdateChecker();
    initBroadcast();

    isReady = true;
    readyQueue.forEach(function (fn) {
      try {
        fn();
      } catch (e) {
        console.error("Astra: ready handler failed", e);
      }
    });
    readyQueue.length = 0;
  }

  window.Astra = {
    config: CONFIG,
    nav: NAV,
    cloaks: CLOAKS,
    storeKeys: STORE,
    theme: Theme,
    toast: toast,
    cloak: cloak,
    cursor: Cursor,
    openFrame: openFrame,
    closeFrame: closeFrame,
    mountTiles: mountTiles,
    pointer: pointer,
    ready: ready,
    prefersReducedMotion: prefersReducedMotion
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
