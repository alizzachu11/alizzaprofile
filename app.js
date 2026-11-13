// Conditional Popover API polyfill
if (!Object.hasOwn(HTMLElement.prototype, "popover")) {
  import("https://unpkg.com/@oddbird/popover-polyfill@latest/dist/popover.min.js");
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let userMotionPaused = false;

function isMotionActive() {
  return !prefersReducedMotion.matches && !userMotionPaused;
}

// ---------------------------------------------------------------------------
// 1. Responsive Popover Navbar (ResizeObserver measurement)
// ---------------------------------------------------------------------------
const header = document.getElementById("site-header");
const headerInner = header?.querySelector(".header-inner");
const menu = document.getElementById("site-menu");
const menuButton = header?.querySelector(".menu-button");
let lastCollapsedWidth = 0;

function syncNavbarLayout() {
  if (!header || !headerInner || !menu || !menuButton) return;
  const isWide = header.classList.contains("is-wide");
  const currentWidth = headerInner.clientWidth;

  if (!isWide && currentWidth <= lastCollapsedWidth) return;

  const wasOpen = menu.matches(":popover-open, .\\:popover-open");
  header.classList.add("is-measuring", "is-wide");
  menu.removeAttribute("popover");

  const fitsInline = headerInner.scrollWidth <= headerInner.clientWidth;
  if (fitsInline) {
    menuButton.setAttribute("aria-expanded", "false");
  } else {
    header.classList.remove("is-wide");
    menu.setAttribute("popover", "auto");
    lastCollapsedWidth = currentWidth;
    if (wasOpen && typeof menu.showPopover === "function") {
      try {
        menu.showPopover();
      } catch {}
    }
  }

  requestAnimationFrame(() => header.classList.remove("is-measuring"));
}

if (header && headerInner && menu) {
  syncNavbarLayout();
  const navObserver = new ResizeObserver(syncNavbarLayout);
  navObserver.observe(header);
  navObserver.observe(menu);

  menu.addEventListener("toggle", (event) => {
    menuButton?.setAttribute("aria-expanded", String(event.newState === "open"));
  });

  menu.addEventListener("click", (event) => {
    const link = event.target.closest("a[href^='#']");
    if (link && !header.classList.contains("is-wide") && typeof menu.hidePopover === "function") {
      try {
        menu.hidePopover();
      } catch {}
    }
  });
}

// ---------------------------------------------------------------------------
// 2. Flowing Wave Ribbons, Constellation Mesh & Click Shockwave Canvas
// ---------------------------------------------------------------------------
const canvas = document.getElementById("neural-canvas");
const ctx = canvas?.getContext("2d");
const cursorRing = document.getElementById("cursor-ring");

let particles = [];
const shockwaves = [];
const shootingLasers = [];
let rafId = null;
let phase = 0;
let lastScrollY = window.scrollY;
let scrollVelocity = 0;

const targetPointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.35, active: false };
const smoothPointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.35 };

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const count = Math.min(84, Math.max(30, Math.floor((window.innerWidth * window.innerHeight) / 18500)));
  particles = Array.from({ length: count }, (_, i) => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.55,
    vy: (Math.random() - 0.5) * 0.55,
    r: i % 5 === 0 ? 2.6 : 1.4,
    isPink: i % 3 !== 0,
  }));
}

function spawnShockwave(x, y) {
  if (!isMotionActive()) return;
  shockwaves.push({ x, y, r: 8, maxR: 165, alpha: 0.72 });
}

function drawFlowWave(w, h, yBase, amplitude, freq, speedOffset, color, lineWidth) {
  ctx.beginPath();
  const step = 28;
  for (let x = 0; x <= w + step; x += step) {
    const pointerInfluence = targetPointer.active
      ? Math.exp(-Math.pow((x - smoothPointer.x) / 240, 2)) * ((smoothPointer.y - yBase) * 0.24)
      : 0;
    const y =
      yBase +
      Math.sin(x * freq + phase * speedOffset) * amplitude +
      Math.cos(x * freq * 0.5 - phase * speedOffset * 0.7) * (amplitude * 0.4) +
      pointerInfluence;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawCanvasFrame(animate = true) {
  if (!canvas || !ctx) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);

  if (animate) {
    // Smooth spring lerp for pointer glow & ring
    smoothPointer.x += (targetPointer.x - smoothPointer.x) * 0.14;
    smoothPointer.y += (targetPointer.y - smoothPointer.y) * 0.14;

    if (targetPointer.active) {
      document.documentElement.style.setProperty("--pointer-x", `${smoothPointer.x.toFixed(1)}px`);
      document.documentElement.style.setProperty("--pointer-y", `${smoothPointer.y.toFixed(1)}px`);
      if (cursorRing) {
        const ringHalf = cursorRing.offsetWidth / 2 || 18;
        cursorRing.style.transform = `translate3d(${(smoothPointer.x - ringHalf).toFixed(1)}px, ${(smoothPointer.y - ringHalf).toFixed(1)}px, 0)`;
      }
    }

    // Damped scroll velocity feeds energy wave flow
    const dy = window.scrollY - lastScrollY;
    lastScrollY = window.scrollY;
    scrollVelocity = scrollVelocity * 0.88 + Math.min(24, Math.abs(dy)) * 0.12;
    phase += 0.018 + scrollVelocity * 0.004;

    // Occasional diagonal shooting alpha beam
    if (Math.random() < 0.015 && shootingLasers.length < 3) {
      const fromLeft = Math.random() > 0.5;
      shootingLasers.push({
        x: fromLeft ? -80 : w + 80,
        y: Math.random() * h * 0.7,
        vx: (fromLeft ? 1 : -1) * (10 + Math.random() * 6),
        vy: 3.5 + Math.random() * 3,
        life: 1,
      });
    }
  }

  // 3 flowing energy ribbons
  drawFlowWave(w, h, h * 0.3, 34, 0.0036, 1.0, "rgba(255, 31, 168, 0.14)", 1.3);
  drawFlowWave(w, h, h * 0.52, 42, 0.0028, -0.85, "rgba(212, 214, 227, 0.08)", 1.0);
  drawFlowWave(w, h, h * 0.76, 28, 0.0042, 1.3, "rgba(255, 112, 206, 0.12)", 1.2);

  // Shooting alpha lasers
  for (let i = shootingLasers.length - 1; i >= 0; i--) {
    const beam = shootingLasers[i];
    if (animate) {
      beam.x += beam.vx;
      beam.y += beam.vy;
      beam.life -= 0.014;
    }
    const grad = ctx.createLinearGradient(beam.x, beam.y, beam.x - beam.vx * 10, beam.y - beam.vy * 10);
    grad.addColorStop(0, `rgba(255, 112, 206, ${Math.max(0, beam.life * 0.8)})`);
    grad.addColorStop(1, "rgba(255, 31, 168, 0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(beam.x, beam.y);
    ctx.lineTo(beam.x - beam.vx * 10, beam.y - beam.vy * 10);
    ctx.stroke();
    if (beam.life <= 0) shootingLasers.splice(i, 1);
  }

  // Particles
  const speedBoost = 1 + scrollVelocity * 0.18;
  for (const p of particles) {
    if (animate) {
      p.x += p.vx * speedBoost;
      p.y += p.vy * speedBoost;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      if (targetPointer.active) {
        const dx = smoothPointer.x - p.x;
        const dy = smoothPointer.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 14 && dist < 210) {
          p.x += (dx / dist) * 0.45;
          p.y += (dy / dist) * 0.45;
        }
      }
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.isPink ? "rgba(255, 46, 196, 0.78)" : "rgba(232, 232, 245, 0.56)";
    ctx.fill();
  }

  // Constellation edges
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i];
      const b = particles[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 140) {
        const alpha = (1 - d / 140) * 0.26;
        ctx.strokeStyle =
          a.isPink || b.isPink ? `rgba(255, 31, 168, ${alpha})` : `rgba(206, 208, 226, ${alpha * 0.7})`;
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    if (targetPointer.active) {
      const p = particles[i];
      const dp = Math.hypot(smoothPointer.x - p.x, smoothPointer.y - p.y);
      if (dp < 175) {
        ctx.strokeStyle = `rgba(255, 112, 206, ${(1 - dp / 175) * 0.48})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(smoothPointer.x, smoothPointer.y);
        ctx.stroke();
      }
    }
  }

  // Click shockwaves
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    if (animate) {
      sw.r += 4.5;
      sw.alpha *= 0.93;
    }
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 46, 196, ${sw.alpha})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    if (sw.alpha < 0.03 || sw.r >= sw.maxR) shockwaves.splice(i, 1);
  }
}

function startCanvasLoop() {
  if (rafId !== null) return;
  const tick = () => {
    if (!isMotionActive()) {
      rafId = null;
      return;
    }
    drawCanvasFrame(true);
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

function stopCanvasLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  drawCanvasFrame(false);
}

if (canvas && ctx) {
  resizeCanvas();
  window.addEventListener("resize", () => {
    resizeCanvas();
    if (!isMotionActive()) drawCanvasFrame(false);
  });

  if (isMotionActive()) startCanvasLoop();
  else drawCanvasFrame(false);
}

// ---------------------------------------------------------------------------
// 3. Motion Pause/Play Control + Pointer Tilt, Spotlight Borders & Magnetic CTAs
// ---------------------------------------------------------------------------
const motionToggle = document.getElementById("motion-toggle");
const motionToggleLabel = document.getElementById("motion-toggle-label");

function updateMotionState() {
  const paused = !isMotionActive();
  document.documentElement.classList.toggle("is-motion-paused", paused);
  if (motionToggleLabel) {
    motionToggleLabel.textContent = userMotionPaused ? "Play motion" : "Pause motion";
  }
  if (paused) {
    stopCanvasLoop();
    for (const el of document.querySelectorAll(".tilt-card, .magnetic")) {
      el.style.transform = "";
    }
  } else {
    startCanvasLoop();
  }
}

motionToggle?.addEventListener("click", () => {
  userMotionPaused = !userMotionPaused;
  updateMotionState();
});

prefersReducedMotion.addEventListener("change", updateMotionState);

if (window.matchMedia("(pointer: fine)").matches) {
  window.addEventListener(
    "pointermove",
    (event) => {
      targetPointer.x = event.clientX;
      targetPointer.y = event.clientY;
      targetPointer.active = true;
    },
    { passive: true }
  );

  window.addEventListener("pointerdown", (event) => {
    spawnShockwave(event.clientX, event.clientY);
  });

  document.addEventListener("pointerover", (event) => {
    if (!cursorRing) return;
    const interactive = event.target.closest("a, button, .exp-card");
    cursorRing.classList.toggle("is-hovering", Boolean(interactive));
  });

  for (const card of document.querySelectorAll(".spotlight-card, .tilt-card")) {
    const intensity = Number(card.getAttribute("data-tilt-intensity") || "7");
    const isTilt = card.classList.contains("tilt-card");

    card.addEventListener("pointermove", (event) => {
      if (!isMotionActive()) return;
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const px = x / rect.width;
      const py = y / rect.height;

      card.style.setProperty("--mx", `${x.toFixed(1)}px`);
      card.style.setProperty("--my", `${y.toFixed(1)}px`);

      if (isTilt) {
        const rx = (0.5 - py) * intensity;
        const ry = (px - 0.5) * intensity;
        card.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-3px)`;
        card.style.setProperty("--glare-x", `${(px * 100).toFixed(1)}%`);
        card.style.setProperty("--glare-y", `${(py * 100).toFixed(1)}%`);
      }
    });

    card.addEventListener("pointerleave", () => {
      if (isTilt) card.style.transform = "";
    });
  }

  for (const btn of document.querySelectorAll(".magnetic")) {
    btn.addEventListener("pointermove", (event) => {
      if (!isMotionActive()) return;
      const rect = btn.getBoundingClientRect();
      const dx = (event.clientX - (rect.left + rect.width / 2)) * 0.2;
      const dy = (event.clientY - (rect.top + rect.height / 2)) * 0.2;
      btn.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    });
    btn.addEventListener("pointerleave", () => {
      btn.style.transform = "";
    });
  }
}

// ---------------------------------------------------------------------------
// 4. Interactive Hero Role Switcher
// ---------------------------------------------------------------------------
const rolePills = Array.from(document.querySelectorAll(".role-pill[data-role-preview]"));
const heroLead = document.getElementById("hero-dynamic-lead");
const roleCopyMap = {
  lead: 'Connecting global Web3 innovation with Thailand’s builders, founders, and local communities — forging high-signal networks across <span class="neon-accent">Web3, AI &amp; Avalanche</span>.',
  builder: 'Supporting <span class="neon-accent">Avalanche ecosystem growth</span> in Thailand as Team1 Collaborator — turning global protocols into thriving local builder communities.',
  founder: 'Co-Founder of <span class="neon-accent">The Mutual Thailand</span> &amp; Owner of <span class="neon-accent">Yapper Club</span> — uniting founders, creators, and high-signal Web3 conversations.',
};

function setHeroRole(pill) {
  const key = pill.dataset.rolePreview;
  if (!key || !roleCopyMap[key]) return;
  for (const p of rolePills) p.classList.toggle("is-active", p === pill);
  if (heroLead) {
    heroLead.innerHTML = roleCopyMap[key];
    if (isMotionActive() && typeof heroLead.animate === "function") {
      heroLead.animate(
        [
          { opacity: 0.4, transform: "translateY(6px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );
    }
  }
}

for (const pill of rolePills) {
  pill.addEventListener("click", () => setHeroRole(pill));
}

// ---------------------------------------------------------------------------
// 5. Scoped View Transition + Live Role Signal Inspector + Expertise Filter
// ---------------------------------------------------------------------------
const supportsScopedTransition = "startViewTransition" in Element.prototype;

function runWithScopedTransition(scopeEl, updateDOM) {
  if (!scopeEl || !supportsScopedTransition || !isMotionActive()) {
    updateDOM();
    return;
  }
  const transition = scopeEl.startViewTransition(() => {
    updateDOM();
  });
  transition.ready.catch(() => {});
}

const roleSignals = {
  mutual: {
    title: "Co-Founder | The Mutual Thailand",
    summary:
      "High-trust community architecture uniting founders, builders, AI innovators, and business leaders in Thailand.",
    pillars: [
      "Strategic Networking",
      "Founder & Builder Relations",
      "Community Building & Engagement",
      "Cross-Community Collaboration",
    ],
  },
  team1: {
    title: "Team1 Thailand Collaborator | Avalanche Ecosystem",
    summary:
      "Expanding Avalanche visibility in Thailand while connecting international Web3 teams with local builders and creators.",
    pillars: [
      "Ecosystem Growth",
      "Thai Market Engagement",
      "Cross-Community Collaboration",
      "X Spaces & Community Events",
    ],
  },
  yapper: {
    title: "Owner | Yapper Club",
    summary:
      "Curating community-driven Web3 conversations, interactive spaces, and high-engagement knowledge sharing.",
    pillars: [
      "Content Strategy",
      "Community Building & Engagement",
      "X Spaces & Community Events",
    ],
  },
  builder: {
    title: "Web3 Community Builder & Content Creator",
    summary:
      "Delivering accessible Thai-language insights across blockchain, DeFi, and emerging Web3 ecosystems since 2022.",
    pillars: [
      "Content Strategy",
      "Thai Market Engagement",
      "X Spaces & Community Events",
      "Ecosystem Growth",
    ],
  },
};

const inspectorPanel = document.getElementById("signal-inspector");
const inspectorBody = document.getElementById("inspector-body");
const inspectorTitle = document.getElementById("inspector-title");
const inspectorSummary = document.getElementById("inspector-summary");
const inspectorPillars = document.getElementById("inspector-pillars");
const expCards = Array.from(document.querySelectorAll(".exp-card[data-role-id]"));

function selectRoleCard(card) {
  const roleId = card.dataset.roleId;
  const data = roleId ? roleSignals[roleId] : null;
  if (!data) return;

  for (const c of expCards) {
    c.classList.toggle("is-selected", c === card);
  }

  const updateInspector = () => {
    if (inspectorTitle) inspectorTitle.textContent = data.title;
    if (inspectorSummary) inspectorSummary.textContent = data.summary;
    if (inspectorPillars) {
      inspectorPillars.innerHTML = "";
      for (const item of data.pillars) {
        const li = document.createElement("li");
        li.textContent = item;
        inspectorPillars.appendChild(li);
      }
    }
  };

  runWithScopedTransition(inspectorPanel, updateInspector);
  if (!supportsScopedTransition && isMotionActive() && inspectorBody && typeof inspectorBody.animate === "function") {
    inspectorBody.animate(
      [
        { opacity: 0.35, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
    );
  }
}

for (const card of expCards) {
  card.addEventListener("click", () => selectRoleCard(card));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectRoleCard(card);
    }
  });
}

const filterNodes = Array.from(document.querySelectorAll(".exp-node[data-filter]"));
const filterStatus = document.getElementById("filter-status");

function applyExpertiseFilter(filterKey, labelText) {
  let matchCount = 0;
  let firstMatch = null;
  for (const card of expCards) {
    const tags = (card.dataset.tags || "").split(/\s+/);
    const matches = filterKey === "all" || tags.includes(filterKey);
    card.classList.toggle("is-highlighted", filterKey !== "all" && matches);
    card.classList.toggle("is-dimmed", filterKey !== "all" && !matches);
    if (matches) {
      matchCount += 1;
      if (!firstMatch) firstMatch = card;
    }
  }

  for (const node of filterNodes) {
    node.setAttribute("aria-pressed", String(node.dataset.filter === filterKey));
  }

  if (firstMatch && filterKey !== "all") {
    selectRoleCard(firstMatch);
  }

  if (filterStatus) {
    filterStatus.textContent = "";
    if (filterKey === "all") {
      filterStatus.textContent = "All 4 leadership & ecosystem roles active.";
    } else {
      const msg = document.createTextNode(
        `Spotlighted ${matchCount} matching ${matchCount === 1 ? "role" : "roles"} for ${labelText} — `
      );
      const jump = document.createElement("a");
      jump.href = "#experience";
      jump.textContent = "View Experience Deck ↑";
      jump.style.color = "var(--neon-bright)";
      filterStatus.append(msg, jump);
    }
  }
}

for (const node of filterNodes) {
  node.addEventListener("click", () => {
    const key = node.dataset.filter || "all";
    const label = node.querySelector("span:last-child")?.textContent?.trim() || key;
    applyExpertiseFilter(key, label);
  });
}

// ---------------------------------------------------------------------------
// 6. Interactive Ecosystem Orbit Synchronization (Section 04)
// ---------------------------------------------------------------------------
const orbitSats = Array.from(document.querySelectorAll(".orbit-sat[data-aff]"));
const affCards = Array.from(document.querySelectorAll(".affiliation-card[data-aff]"));

function selectAffiliation(affKey) {
  for (const sat of orbitSats) {
    sat.classList.toggle("is-active", sat.dataset.aff === affKey);
  }
  for (const card of affCards) {
    card.classList.toggle("is-active", card.dataset.aff === affKey);
  }
}

for (const sat of orbitSats) {
  sat.addEventListener("click", () => {
    if (sat.dataset.aff) selectAffiliation(sat.dataset.aff);
  });
}

for (const card of affCards) {
  card.querySelector(".aff-card-trigger")?.addEventListener("click", () => {
    if (card.dataset.aff) selectAffiliation(card.dataset.aff);
  });
}

// ---------------------------------------------------------------------------
// 7. Scrollspy, Scroll-Laser Fallback, Parallax Fallback & Reveal Fallback
// ---------------------------------------------------------------------------
const navLinks = Array.from(document.querySelectorAll("[data-nav-link]"));
const spySections = navLinks
  .map((l) => document.getElementById(l.getAttribute("href")?.slice(1) || ""))
  .filter(Boolean);

if (spySections.length > 0 && "IntersectionObserver" in window) {
  const ratios = new Map();
  const spyObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
      }
      let activeId = null;
      let topRatio = 0;
      for (const sec of spySections) {
        const r = ratios.get(sec.id) ?? 0;
        if (r > topRatio) {
          topRatio = r;
          activeId = sec.id;
        }
      }
      for (const link of navLinks) {
        if (activeId && link.getAttribute("href") === `#${activeId}`) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      }
    },
    { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75] }
  );
  for (const sec of spySections) spyObserver.observe(sec);
}

const scrollLaser = document.getElementById("scroll-laser");
if (scrollLaser && !CSS.supports("animation-timeline", "scroll()")) {
  const updateLaser = () => {
    if (!isMotionActive()) {
      scrollLaser.style.transform = "scaleX(0)";
      return;
    }
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scrollLaser.style.transform = `scaleX(${Math.min(1, window.scrollY / max)})`;
  };
  window.addEventListener("scroll", updateLaser, { passive: true });
  updateLaser();
}

const parallaxWrapper = document.querySelector(".parallax-wrapper");
const parallaxLayers = Array.from(document.querySelectorAll(".parallax-layer"));
const desktopParallaxQuery = window.matchMedia("(min-width: 54rem)");
if (
  parallaxWrapper &&
  parallaxLayers.length > 0 &&
  !CSS.supports("(animation-timeline: view()) and (animation-range: entry)") &&
  !prefersReducedMotion.matches
) {
  const onParallaxScroll = () => {
    if (!isMotionActive() || !desktopParallaxQuery.matches) {
      for (const layer of parallaxLayers) layer.style.transform = "";
      return;
    }
    const rect = parallaxWrapper.getBoundingClientRect();
    const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
    if (progress >= 0 && progress <= 1) {
      parallaxLayers.forEach((layer, idx) => {
        const shift = (0.5 - progress) * (idx === 0 ? 32 : 58);
        layer.style.transform = `translateY(${shift.toFixed(1)}px)`;
      });
    }
  };
  const pObs = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) {
      window.addEventListener("scroll", onParallaxScroll, { passive: true });
      onParallaxScroll();
    } else {
      window.removeEventListener("scroll", onParallaxScroll);
    }
  });
  pObs.observe(parallaxWrapper);
}

if (
  !CSS.supports("(animation-timeline: view()) and (animation-range: entry)") &&
  !prefersReducedMotion.matches &&
  "IntersectionObserver" in window
) {
  const reveals = Array.from(document.querySelectorAll(".reveal"));
  const revObs = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.remove("js-reveal-pending");
          entry.target.classList.add("js-reveal-visible");
          obs.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.1 }
  );
  for (const el of reveals) {
    el.classList.add("js-reveal-pending");
    revObs.observe(el);
  }
}

// ---------------------------------------------------------------------------
// 8. Clipboard Toast, Modal Dialog & Export PDF
// ---------------------------------------------------------------------------
const toastRegion = document.getElementById("toast-region");
let toastTimer;

function showToast(message) {
  if (!toastRegion) return;
  toastRegion.innerHTML = "";
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastRegion.appendChild(toast);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastRegion.innerHTML = "";
  }, 2400);
}

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`COPIED // ${label.toUpperCase()}: ${text}`);
  } catch {
    showToast(`READY // ${text}`);
  }
}

for (const btn of document.querySelectorAll("[data-copy]")) {
  btn.addEventListener("click", () => {
    const val = btn.getAttribute("data-copy");
    const label = btn.getAttribute("data-label") || "handle";
    if (val) copyText(val, label);
  });
}

const connectDialog = document.getElementById("connect-dialog");
const openDialogBtn = document.getElementById("open-connect-dialog");
const closeDialogBtn = document.getElementById("close-connect-dialog");
const copyBioBtn = document.getElementById("copy-bio-btn");
const speakerBioText = document.getElementById("speaker-bio-text");

if (connectDialog && openDialogBtn && closeDialogBtn) {
  openDialogBtn.addEventListener("click", () => connectDialog.showModal());
  closeDialogBtn.addEventListener("click", () => connectDialog.close());
  connectDialog.addEventListener("click", (event) => {
    if (event.target === connectDialog) connectDialog.close();
  });
}

copyBioBtn?.addEventListener("click", () => {
  if (speakerBioText) {
    copyText(speakerBioText.textContent.trim().replace(/\s+/g, " "), "speaker bio");
  }
});

document.getElementById("print-profile")?.addEventListener("click", () => {
  window.print();
});
