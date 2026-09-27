(function () {
  "use strict";

  document.documentElement.classList.remove("no-js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var userCalm = false;
  var motionOff = function () { return reduceMotion.matches || userCalm; };
  var motionHandlers = [];
  var onMotion = function (fn) { motionHandlers.push(fn); };
  var fireMotion = function () { motionHandlers.forEach(function (fn) { fn(); }); };
  if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", fireMotion);

  /* Mobile navigation */
  var toggle = document.querySelector("[data-nav-toggle]");
  var nav = document.querySelector("[data-nav]");
  if (toggle && nav) {
    var setOpen = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    };
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* Hero story: stack -> scan -> split -> tagged */
  var story = document.querySelector("[data-story]");
  var storyToggle = document.querySelector("[data-story-toggle]");
  if (story) {
    var steps = [
      { state: "stack", ms: 1500 },
      { state: "scan", ms: 2700 },
      { state: "split", ms: 1800 },
      { state: "tagged", ms: 4200 }
    ];
    var index = 0;
    var timer = null;
    var paused = false;
    var visible = true;

    var show = function (i) {
      index = i;
      story.setAttribute("data-state", steps[i].state);
    };

    var restart = function () {
      story.classList.add("is-fading");
      timer = setTimeout(function () {
        story.classList.add("no-anim");
        show(0);
        void story.offsetWidth;
        story.classList.remove("no-anim");
        story.classList.remove("is-fading");
        schedule();
      }, 500);
    };

    var schedule = function () {
      clearTimeout(timer);
      if (paused || !visible) return;
      timer = setTimeout(function () {
        if (index === steps.length - 1) {
          restart();
        } else {
          show(index + 1);
          schedule();
        }
      }, steps[index].ms);
    };

    var setPaused = function (value) {
      paused = value;
      story.classList.toggle("is-paused", paused);
      if (storyToggle) {
        storyToggle.setAttribute("aria-pressed", String(paused));
        storyToggle.textContent = paused ? "Animation fortsetzen" : "Animation anhalten";
      }
      schedule();
    };

    var applyMotionPreference = function () {
      if (motionOff()) {
        clearTimeout(timer);
        story.classList.remove("is-fading");
        show(steps.length - 1);
        if (storyToggle) storyToggle.hidden = true;
      } else {
        if (storyToggle) storyToggle.hidden = false;
        show(0);
        schedule();
      }
    };

    if (storyToggle) {
      storyToggle.addEventListener("click", function () { setPaused(!paused); });
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (!motionOff()) schedule();
      }, { threshold: 0.15 }).observe(story);
    }

    document.addEventListener("visibilitychange", function () {
      visible = !document.hidden;
      if (!motionOff()) schedule();
    });

    onMotion(applyMotionPreference);
    applyMotionPreference();
  }

  /* Screenshot lightbox */
  var dialog = document.querySelector("[data-lightbox-dialog]");
  var lbMedia = document.querySelector("[data-lightbox-media]");
  var lbImg = document.createElement("img");
  if (lbMedia) lbMedia.appendChild(lbImg);
  var lbCaption = document.querySelector("[data-lightbox-caption]");
  document.querySelectorAll("[data-lightbox]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var src = btn.getAttribute("data-lightbox");
      var thumb = btn.querySelector("img");
      if (!dialog || typeof dialog.showModal !== "function") {
        window.open(src, "_blank", "noopener");
        return;
      }
      lbImg.src = src;
      lbImg.alt = thumb ? thumb.alt : "";
      lbCaption.textContent = btn.getAttribute("data-caption") || "";
      dialog.showModal();
    });
  });
  if (dialog) {
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", function () {
      lbImg.removeAttribute("src");
    });
  }

  /* Impressum / Datenschutz in an iframe dialog */
  var frameDlg = document.getElementById("frame");
  if (frameDlg && typeof frameDlg.showModal === "function") {
    var frameView = document.getElementById("frameView");
    var frameTitle = document.getElementById("frameTitle");
    var frameOpen = document.getElementById("frameOpen");
    var frameReturn = null;

    var openFrame = function (url, title) {
      frameReturn = document.activeElement;
      frameView.src = url;
      frameView.title = title;
      frameTitle.textContent = title;
      frameOpen.href = url;
      frameDlg.showModal();
      document.documentElement.style.overflow = "hidden";
    };

    var closeFrame = function () {
      if (frameDlg.open) frameDlg.close();
    };

    frameDlg.addEventListener("close", function () {
      document.documentElement.style.overflow = "";
      frameView.src = "about:blank";
      frameView.title = "Detailansicht";
      if (frameReturn && typeof frameReturn.focus === "function") frameReturn.focus();
    });
    frameDlg.addEventListener("click", function (e) {
      if (e.target === frameDlg) closeFrame();
    });
    document.getElementById("frameClose").addEventListener("click", closeFrame);
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a[data-frame]");
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      openFrame(a.getAttribute("href"), a.getAttribute("data-frame") || "");
    });
    window.addEventListener("message", function (e) {
      if (e.origin !== location.origin && location.protocol !== "file:") return;
      var data = e.data || {};
      if (data.type === "belegtrennung-close-frame") closeFrame();
      if (data.type === "belegtrennung-goto") {
        closeFrame();
        if (data.hash) {
          var target = document.getElementById(data.hash);
          if (target) target.scrollIntoView();
        }
      }
    });
  }

  if (window.self !== window.top) {
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") parent.postMessage({ type: "belegtrennung-close-frame" }, "*");
    });
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a[href]");
      if (!a) return;
      var href = a.getAttribute("href") || "";
      if (href === "./" || href === "/" || href.indexOf("./#") === 0) {
        e.preventDefault();
        parent.postMessage({ type: "belegtrennung-goto", hash: href.split("#")[1] || "" }, "*");
      }
    });
  }

  /* Contact form → n8n webhook */
  var form = document.getElementById("contactForm");
  if (form) {
    var endpoint = "https://n8n.top-beraternetzwerk.de/webhook/termine";
    var sendBtn = document.getElementById("sendBtn");
    var formStatus = document.getElementById("formStatus");
    var topic = document.getElementById("topic");
    document.querySelectorAll("[data-topic]").forEach(function (a) {
      a.addEventListener("click", function () {
        if (topic) topic.value = a.getAttribute("data-topic");
      });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sendBtn.disabled || !form.reportValidity()) return;
      if (form.elements.website.value) return;
      var email = form.elements.email.value.trim();
      var name = form.elements.name.value.trim();
      var msg = form.elements.message.value.trim();
      var subject = topic.value;
      var page = location.protocol === "https:" ? location.origin + location.pathname : "https://ki-belegtrennung.de/";
      var payload = {
        name: name,
        email: email,
        message: "Anfrage KI-Belegtrennung\nName: " + name + "\nE-Mail: " + email + "\nAnliegen: " + subject + "\nNachricht: " + (msg || "-") + "\nQuelle: KI-Belegtrennung Landingpage\nSeite: " + page,
        source: "ki-belegtrennung-landingpage-request",
        page: page,
        interest: "Anfrage KI-Belegtrennung",
        platform: subject + (msg ? " - " + msg : "")
      };
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 15000);
      sendBtn.disabled = true;
      formStatus.className = "form-status";
      formStatus.textContent = "Wird übermittelt …";
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal
      }).then(function (res) {
        if (!res.ok) throw new Error("request_failed");
        form.reset();
        formStatus.className = "form-status ok";
        if (window.rybbit && typeof window.rybbit.event === "function") window.rybbit.event("kontakt_gesendet");
        formStatus.textContent = "Vielen Dank. Ihre Anfrage wurde übermittelt.";
      }).catch(function () {
        formStatus.className = "form-status err";
        formStatus.textContent = "Wir haben keine Versandbestätigung erhalten. Ihre Eingaben bleiben erhalten. Bitte versuchen Sie es später erneut oder schreiben Sie an rm@kostenmanager.net.";
      }).then(function () {
        clearTimeout(timer);
        sendBtn.disabled = false;
      });
    });
  }

  /* Full-viewport scene. Scroll progress 0→1 drives crossfades inside the sticky stage. */
  var scene = document.querySelector("[data-scene]");
  if (scene) {
    var beats = Array.prototype.slice.call(scene.querySelectorAll(".scene-beat"));
    var bgs = beats.map(function (beat) { return beat.querySelector(".scene-bg"); });
    var veils = beats.map(function (beat) { return beat.querySelector(".scene-veil"); });
    var copies = beats.map(function (beat) { return beat.querySelector(".scene-copy"); });
    var cards = beats.map(function (beat) { return beat.querySelector(".scene-card"); });
    var navButtons = Array.prototype.slice.call(scene.querySelectorAll("[data-goto]"));
    var meter = scene.querySelector("[data-meter]");
    var sheets = scene.querySelector("[data-sheets]");
    var strip = scene.querySelector("[data-strip]");
    var stripBeat = strip ? beats.indexOf(strip.closest(".scene-beat")) : -1;
    var setStrip = function (scan, split, tag) {
      if (!strip) return;
      strip.style.setProperty("--scan", scan.toFixed(3));
      strip.style.setProperty("--split", split.toFixed(3));
      strip.style.setProperty("--tag", tag.toFixed(3));
    };
    var count = beats.length;
    var last = count - 1;
    var inView = true;

    var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
    var progressOf = function () {
      var rect = scene.getBoundingClientRect();
      var span = rect.height - window.innerHeight;
      return span > 0 ? clamp01(-rect.top / span) : 1;
    };

    var renderScene = function () {
      if (!document.documentElement.classList.contains("is-scrub") || document.documentElement.classList.contains("no-js")) return;
      var x = progressOf() * count;
      var active = Math.min(last, Math.max(0, Math.floor(Math.min(x, count - 0.001) + 0.08)));
      for (var i = 0; i < count; i++) {
        var bgIn = i === 0 ? 1 : clamp01((x - (i - 0.32)) / 0.32);
        var bgOut = i === last ? 1 : clamp01((i + 1 - x) / 0.32);
        var bg = Math.min(bgIn, bgOut);
        if (bgs[i]) bgs[i].style.opacity = bg.toFixed(3);
        if (veils[i]) veils[i].style.opacity = bg.toFixed(3);
        var copyIn = i === 0 ? 1 : clamp01((x - (i - 0.12)) / 0.28);
        var copyOut = i === last ? 1 : clamp01((i + 1.12 - x) / 0.28);
        var copyOp = Math.min(copyIn, copyOut);
        if (copies[i]) {
          copies[i].style.opacity = copyOp.toFixed(3);
          var copyDir = x < i + 0.45 ? 1 : -1;
          copies[i].style.transform = "translate3d(0," + ((1 - copyOp) * 18 * copyDir).toFixed(1) + "px,0)";
        }
        var cardIn = clamp01((x - (i + 0.08)) / 0.16);
        var cardOut = i === last ? 1 : i === stripBeat ? clamp01((i + 1.02 - x) / 0.1) : clamp01((i + 0.9 - x) / 0.14);
        var cardOp = Math.min(cardIn, cardOut);
        if (cards[i]) {
          cards[i].style.opacity = cardOp.toFixed(3);
          var cardDir = x < i + 0.5 ? 1 : -1;
          cards[i].style.transform = "translate3d(0," + ((1 - cardOp) * 16 * cardDir).toFixed(1) + "px,0)";
        }
      }
      navButtons.forEach(function (btn, i) {
        if (i === active) btn.setAttribute("aria-current", "step");
        else btn.removeAttribute("aria-current");
      });
      if (meter) meter.style.width = (clamp01(x / count) * 100).toFixed(2) + "%";
      if (sheets) sheets.textContent = String(Math.round(clamp01((x - 1.05) / 0.8) * 17));
      if (stripBeat > -1) {
        var t = x - stripBeat;
        setStrip(clamp01((t - 0.2) / 0.3), clamp01((t - 0.5) / 0.2), clamp01((t - 0.66) / 0.16));
      }
    };

    var clearScene = function () {
      bgs.concat(veils, copies, cards).forEach(function (el) {
        if (!el) return;
        el.style.opacity = "";
        el.style.transform = "";
      });
      navButtons.forEach(function (btn, i) {
        if (i === 0) btn.setAttribute("aria-current", "step");
        else btn.removeAttribute("aria-current");
      });
      if (meter) meter.style.width = "";
      if (sheets) sheets.textContent = "17";
      setStrip(1, 1, 1);
    };

    var enableScrub = function () {
      document.documentElement.classList.add("is-scrub");
      renderScene();
    };
    var disableScrub = function () {
      document.documentElement.classList.remove("is-scrub");
      clearScene();
    };

    navButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = Number(btn.getAttribute("data-goto")) || 0;
        var top = scene.getBoundingClientRect().top + window.scrollY;
        var span = scene.offsetHeight - window.innerHeight;
        var root = document.documentElement;
        var previous = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        window.scrollTo(0, top + Math.max(0, span) * ((i + 0.28) / count));
        root.style.scrollBehavior = previous;
        renderScene();
      });
    });

    var ticking = false;
    var onSceneScroll = function () {
      if (!document.documentElement.classList.contains("is-scrub") || !inView) return;
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        renderScene();
      });
    };

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) renderScene();
      }, { threshold: 0 }).observe(scene);
    }

    if (motionOff()) disableScrub();
    else enableScrub();
    window.addEventListener("scroll", onSceneScroll, { passive: true });
    window.addEventListener("resize", onSceneScroll);
    onMotion(function () {
      if (motionOff()) disableScrub();
      else enableScrub();
    });
  }

  /* One-shot entrance motion for the sections around the scene. */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  var revealObserver = null;
  var revealOn = false;
  var enableReveal = function () {
    if (revealOn || !revealEls.length || motionOff() || !("IntersectionObserver" in window)) return;
    revealOn = true;
    document.documentElement.classList.add("js-reveal");
    revealEls.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.88 && rect.bottom > 48) el.classList.add("is-in");
    });
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) {
      if (!el.classList.contains("is-in")) revealObserver.observe(el);
    });
  };
  var disableReveal = function () {
    revealOn = false;
    document.documentElement.classList.remove("js-reveal");
    if (revealObserver) {
      revealObserver.disconnect();
      revealObserver = null;
    }
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  };
  if (motionOff()) disableReveal();
  else enableReveal();
  onMotion(function () {
    if (motionOff()) disableReveal();
    else enableReveal();
  });

  /* Signals: the four features appear one by one while scrolling */
  var signals = document.querySelector("[data-signals]");
  if (signals) {
    var band = signals.closest(".signals-band");
    var sigItems = Array.prototype.slice.call(signals.querySelectorAll(".signal-list [data-sig]"));
    var sigZones = Array.prototype.slice.call(signals.querySelectorAll(".paper [data-sig]"));
    var setSig = function (upTo, current) {
      sigItems.concat(sigZones).forEach(function (el) {
        var n = Number(el.getAttribute("data-sig"));
        el.classList.toggle("is-on", n <= upTo);
        el.classList.toggle("is-current", n === current);
      });
    };
    var fitsPinned = function () {
      band.classList.remove("is-pinned");
      if (window.innerWidth <= 860) return false;
      return signals.offsetHeight + 48 <= window.innerHeight - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 68);
    };
    var pinned = false;
    var layoutSig = function () {
      if (motionOff()) {
        pinned = false;
        band.classList.remove("is-pinned");
        signals.classList.remove("is-anim");
        setSig(4, 0);
        return;
      }
      pinned = fitsPinned();
      band.classList.toggle("is-pinned", pinned);
      signals.classList.add("is-anim");
      renderSig();
    };
    var renderSig = function () {
      if (motionOff()) return;
      var n;
      if (pinned) {
        var r = band.getBoundingClientRect();
        var span = r.height - window.innerHeight;
        var p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 1;
        n = Math.min(4, Math.floor(p * 5.2));
        setSig(n, p > 0.94 ? 0 : n);
        return;
      }
      n = 0;
      sigItems.forEach(function (li) {
        if (li.getBoundingClientRect().top < window.innerHeight * 0.72) n = Math.max(n, Number(li.getAttribute("data-sig")));
      });
      setSig(n, n);
    };
    var sigTicking = false;
    window.addEventListener("scroll", function () {
      if (sigTicking) return;
      sigTicking = true;
      window.requestAnimationFrame(function () { sigTicking = false; renderSig(); });
    }, { passive: true });
    window.addEventListener("resize", layoutSig);
    onMotion(layoutSig);
    layoutSig();
  }

  /* Consent: choice kept in one cookie, Rybbit only after "granted" */
  var CONSENT = "kb-consent";
  var readConsent = function () {
    var m = document.cookie.match(/(?:^|;\s*)kb-consent=(granted|denied)/);
    return m ? m[1] : "";
  };
  var writeConsent = function (value) {
    document.cookie = CONSENT + "=" + value + "; Max-Age=31536000; Path=/; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
  };
  var rybbitLoaded = false;
  var loadRybbit = function () {
    if (rybbitLoaded || window.self !== window.top) return;
    rybbitLoaded = true;
    var tag = document.createElement("script");
    tag.src = "https://analyse.ki-notch.de/api/script.js";
    tag.setAttribute("data-site-id", "7cf09a852f25");
    tag.defer = true;
    document.head.appendChild(tag);
  };
  if (readConsent() === "granted") loadRybbit();
  var consentBox = document.querySelector("[data-consent]");
  if (consentBox) {
    if (!readConsent()) consentBox.hidden = false;
    Array.prototype.slice.call(consentBox.querySelectorAll("[data-consent-choice]")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var value = btn.getAttribute("data-consent-choice");
        var before = readConsent();
        writeConsent(value);
        consentBox.hidden = true;
        if (value === "granted") loadRybbit();
        else if (before === "granted" && rybbitLoaded) location.reload();
      });
    });
    var consentOpen = document.querySelector("[data-consent-open]");
    if (consentOpen) consentOpen.addEventListener("click", function () {
      consentBox.hidden = false;
      var first = consentBox.querySelector("[data-consent-choice]");
      if (first) first.focus();
    });
  }

  /* Accessibility settings, kept for this visit only */
  var a11y = document.getElementById("a11y");
  var a11yOpen = document.querySelector("[data-a11y-open]");
  if (a11y && a11yOpen && typeof a11y.showModal === "function") {
    var a11yReturn = null;
    var hcBox = a11y.querySelector('[data-a11y="hc"]');
    var motionBox = a11y.querySelector('[data-a11y="motion"]');
    a11yOpen.addEventListener("click", function () {
      a11yReturn = document.activeElement;
      hcBox.checked = document.documentElement.classList.contains("hc");
      motionBox.checked = userCalm;
      a11y.showModal();
    });
    a11y.addEventListener("close", function () { if (a11yReturn) a11yReturn.focus(); });
    a11y.addEventListener("click", function (e) { if (e.target === a11y) a11y.close(); });
    hcBox.addEventListener("change", function () { document.documentElement.classList.toggle("hc", hcBox.checked); });
    motionBox.addEventListener("change", function () {
      userCalm = motionBox.checked;
      document.documentElement.classList.toggle("calm", userCalm);
      fireMotion();
    });
  } else if (a11yOpen) {
    a11yOpen.hidden = true;
  }

  /* Mobile quick access */
  var dock = document.querySelector("[data-dock]");
  if (dock) {
    var call = dock.querySelector("[data-call]");
    if (call) call.href = "tel:" + ["+49", "162", "4194", "748"].join("");
    var contactSection = document.getElementById("kontakt");
    var updateDock = function () {
      var r = contactSection ? contactSection.getBoundingClientRect() : null;
      var navOpen = nav && nav.classList.contains("is-open");
      dock.classList.toggle("is-hidden", !!navOpen || (!!r && r.top < window.innerHeight * 0.6 && r.bottom > 0));
    };
    window.addEventListener("scroll", updateDock, { passive: true });
    if (toggle) toggle.addEventListener("click", function () { setTimeout(updateDock, 0); });
    updateDock();
  }
})();
