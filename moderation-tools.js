/* =====================================================================
   NSW Mathematics Moderation Portfolios — shared moderation tools
   ---------------------------------------------------------------------
   1. Professional judgement mode: hides every moderation decision,
      presents the work samples as "Sample 1, 2, 3…" in a shuffled
      order, lets the teacher record an on-balance judgement and notes,
      then reveals the moderated level for comparison.
   2. Print this sample: prints only the sample currently on screen
      (in judgement mode, without the decision unless it was revealed).
   3. Print whole portfolio.

   How a portfolio opts in (no other changes needed):
     <script src="moderation-tools.js" data-scale="cgs|es1" defer></script>
   Mark-up the tool reads:
     [data-mod-sample]        one student work sample
        data-mod-level        Extensive | Thorough | Sound | Basic | Elementary
        data-mod-student      student name
        data-mod-open         page JS that brings the sample on screen
     [data-mod-group]         wrapper holding several samples of one level
     .mod-decision            decision content inside a sample
     .mod-gdecision           decision content belonging to a whole group
     .mod-neutral             level-coloured chrome to grey out while judging
     .mod-nav                 native level tabs (hidden while judging)
     .mod-matrix              comparison matrix (hidden until all revealed)
   Built-in decision selectors are also honoured: .grade-badge,
   .teacher-banner, .teacher-check, .rubber-stamp.
   ===================================================================== */
(function () {
  "use strict";

  var script = document.currentScript;
  var SCALE = (script && script.getAttribute("data-scale")) || "cgs";

  var LEVELS = {
    Extensive: { color: "#7e22ce", tint: "#f3e8ff", text: "Extensive knowledge and skills, readily applied. Very high competence in the processes and skills, applied to new situations." },
    Thorough: { color: "#047857", tint: "#d1fae5", text: "Thorough knowledge and skills and a high level of competence in the processes and skills, applied to most situations." },
    Sound: { color: "#1d4ed8", tint: "#dbeafe", text: "Sound knowledge and skills in the main areas of content and an adequate level of competence in the processes and skills." },
    Basic: { color: "#b45309", tint: "#fef3c7", text: "Basic knowledge and skills and a limited level of competence in the processes and skills." },
    Elementary: { color: "#be123c", tint: "#ffe4e6", text: "Elementary knowledge and skills in few areas of the content and very limited competence in some of the processes and skills." }
  };
  var ORDER = SCALE === "es1" ? ["Thorough", "Sound", "Basic"] : ["Extensive", "Thorough", "Sound", "Basic", "Elementary"];
  var DECISION = ".mod-decision, .grade-badge, .teacher-banner, .teacher-check, .rubber-stamp, .teacher-mark";

  var KEY = "modtools:" + location.pathname.split("/").pop();
  var store = {
    get: function () { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } },
    set: function (v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* storage blocked: state lives in memory */ } }
  };

  var state = { judging: false, order: [], current: null, judgements: {}, notes: {}, revealed: {} };
  var samples = [];
  var ui = {};

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function run(code) { if (!code) return; try { (new Function(code))(); } catch (e) { /* page function missing */ } }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function isVisible(n) { return !!(n && (n.offsetWidth || n.offsetHeight || n.getClientRects().length)); }
  function sampleById(id) { for (var i = 0; i < samples.length; i++) if (samples[i].id === id) return samples[i]; return null; }
  function save() { store.set({ order: state.order, judgements: state.judgements, notes: state.notes, revealed: state.revealed, judging: state.judging }); }

  /* ---------------------------------------------------------------- styles */
  var CSS = [
    ".mod-bar{font-family:Inter,system-ui,sans-serif;background:#fff;border-bottom:1px solid #e2e8f0;box-shadow:0 2px 6px rgba(15,23,42,.08);position:relative;z-index:35}",
    "@media (min-height:700px) and (min-width:768px){.mod-bar.mod-sticky{position:sticky}}",
    ".mod-bar-in{max-width:80rem;margin:0 auto;padding:10px 16px;display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px}",
    ".mod-label{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#475569}",
    ".mod-seg{display:inline-flex;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden}",
    ".mod-seg button{font:600 12px Inter,system-ui,sans-serif;padding:7px 12px;background:#f8fafc;color:#334155;border:0;cursor:pointer}",
    ".mod-seg button+button{border-left:1px solid #cbd5e1}",
    ".mod-seg button[aria-pressed=true]{background:#002B49;color:#fff}",
    ".mod-btn{font:600 12px Inter,system-ui,sans-serif;padding:7px 12px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;cursor:pointer;display:inline-flex;align-items:center;gap:6px}",
    ".mod-btn:hover{background:#f1f5f9}.mod-btn:disabled{opacity:.45;cursor:not-allowed}",
    ".mod-btn.primary{background:#002B49;border-color:#002B49;color:#fff}.mod-btn.primary:hover{background:#0c4a6e}",
    ".mod-spacer{flex:1}",
    ".mod-picker{display:none;width:100%;align-items:center;flex-wrap:wrap;gap:6px;padding-top:8px;border-top:1px dashed #e2e8f0}",
    "body.mod-judge .mod-picker{display:flex}",
    ".mod-chip{font:600 12px Inter,system-ui,sans-serif;padding:6px 10px;border-radius:999px;border:1px solid #cbd5e1;background:#fff;color:#334155;cursor:pointer;display:inline-flex;align-items:center;gap:6px}",
    ".mod-chip[aria-current=true]{background:#002B49;border-color:#002B49;color:#fff}",
    ".mod-chip .dot{width:8px;height:8px;border-radius:50%;background:#cbd5e1}",
    ".mod-chip.judged .dot{background:#0ea5e9}.mod-chip.revealed .dot{background:#16a34a}",
    ".mod-progress{font-size:12px;color:#475569;margin-left:auto}",
    ".mod-card{font-family:Inter,system-ui,sans-serif;background:#fff;border:2px solid #002B49;border-radius:14px;padding:16px 18px;margin:0 0 18px;box-shadow:0 4px 14px rgba(0,43,73,.08)}",
    ".mod-card h3{margin:0 0 4px;font-size:17px;font-weight:800;color:#002B49}",
    ".mod-card p.lead{margin:0 0 12px;font-size:13px;color:#475569;line-height:1.5}",
    ".mod-levels{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:12px}",
    ".mod-level{text-align:left;border:2px solid #e2e8f0;border-radius:10px;padding:8px 10px;background:#fff;cursor:pointer;font-family:inherit}",
    ".mod-level b{display:block;font-size:13px;margin-bottom:2px}",
    ".mod-level span{display:block;font-size:11px;line-height:1.35;color:#475569}",
    ".mod-level[aria-pressed=true]{box-shadow:0 0 0 3px rgba(0,43,73,.15)}",
    ".mod-notes{width:100%;box-sizing:border-box;min-height:70px;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font:13px/1.45 Inter,system-ui,sans-serif;resize:vertical}",
    ".mod-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px}",
    ".mod-result{margin-top:12px;padding:10px 12px;border-radius:10px;font-size:13px;line-height:1.5}",
    ".mod-hint{font-size:12px;color:#64748b}",
    /* judgement mode: hide decisions and anything that names the level */
    "body.mod-judge .mod-nav, body.mod-judge .mod-matrix{display:none !important}",
    "body.mod-judge [data-mod-sample]:not(.mod-is-revealed) :is(" + DECISION + "){display:none !important}",
    "body.mod-judge [data-mod-group]:not(.mod-group-revealed) .mod-gdecision{display:none !important}",
    "body.mod-judge [data-mod-sample]:not(.mod-is-revealed) .mod-neutral, body.mod-judge [data-mod-sample]:not(.mod-is-revealed).mod-neutral{background:#334155 !important;border-color:#94a3b8 !important;color:#fff !important}",
    "body.mod-judge [data-mod-sample]:not(.mod-is-revealed) .mod-neutral *{color:inherit !important;border-color:#94a3b8 !important}",
    ".mod-anon{display:none}",
    "body.mod-judge [data-mod-sample]:not(.mod-is-revealed) .mod-anon{display:block}",
    /* printing: everything prints from a dedicated, scaled copy (see "printing" below) */
    "#mod-print-root{display:none}",
    "body.mod-printing > *:not(#mod-print-root){display:none !important}",
    "body.mod-printing{background:#fff !important;padding:0 !important;margin:0 !important;min-height:0 !important}",
    "body.mod-printing #mod-print-root{display:block}",
    "#mod-print-root .mod-print-sheet{box-sizing:border-box;padding:0 4px;background:#fff}",
    "#mod-print-root .mod-print-sheet + .mod-print-sheet{break-before:page}",
    "#mod-print-root .tab-content{break-after:auto !important;page-break-after:auto !important;display:block !important}",
    "#mod-print-root [class*='min-h-[']{min-height:0 !important}",
    "#mod-print-root *{box-shadow:none !important}",
    "#mod-print-root .sticky-note{transform:none !important}",
    "#mod-print-root .mod-keep{break-inside:avoid;page-break-inside:avoid}",
    "#mod-print-root .mod-linear .lg\\:grid-cols-12{display:block !important}",
    "#mod-print-root .mod-linear .lg\\:grid-cols-12 > * + *{margin-top:20px}",
    "#mod-print-root .mod-linear .absolute.\\-top-3{position:static !important;display:inline-block;transform:none;margin:0 0 6px}",
    "#mod-print-root h1,#mod-print-root h2,#mod-print-root h3,#mod-print-root h4,#mod-print-root .mod-print-head{break-after:avoid;page-break-after:avoid}",
    ".mod-print-head{font-family:Inter,system-ui,sans-serif;border-bottom:2px solid #0f172a;padding:0 0 8px;margin:0 0 14px;color:#0f172a}",
    ".mod-print-head h2{font-size:17px;font-weight:800;margin:0}.mod-print-head p{font-size:12px;margin:2px 0 0;color:#334155}",
    ".mod-print-judge{margin-top:10px;font-size:13px}",
    ".mod-print-judge .boxes span{display:inline-block;border:1.5px solid #0f172a;border-radius:4px;padding:3px 12px;margin:4px 8px 8px 0}",
    ".mod-print-judge .lines{border-bottom:1px solid #94a3b8;height:24px}",
    ".mod-print-result{margin-top:8px;padding:8px 10px;border:1.5px solid #0f172a;border-radius:8px;font-size:13px}",
    "@media print{",
    "  @page{size:A4 portrait;margin:10mm}",
    "  html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}",
    "  .mod-bar{display:none !important}",
    "}"
  ].join("\n");

  /* ----------------------------------------------------------- discovery */
  function collect() {
    samples = Array.prototype.map.call(document.querySelectorAll("[data-mod-sample]"), function (n, i) {
      if (!n.id) n.id = "mod-sample-" + (i + 1);
      return { id: n.id, el: n, level: n.getAttribute("data-mod-level"), student: n.getAttribute("data-mod-student") || "", open: n.getAttribute("data-mod-open") };
    });
  }

  function currentVisibleSample() {
    for (var i = 0; i < samples.length; i++) if (isVisible(samples[i].el)) return samples[i];
    return null;
  }

  /* ----------------------------------------------------------- toolbar */
  function buildBar() {
    var bar = el("div", { "class": "mod-bar no-print", role: "region", "aria-label": "Moderation tools" });
    bar.innerHTML =
      '<div class="mod-bar-in">' +
      '<span class="mod-label">Moderation decisions</span>' +
      '<div class="mod-seg" role="group" aria-label="Moderation decisions">' +
      '<button type="button" data-act="show" aria-pressed="true">Shown</button>' +
      '<button type="button" data-act="judge" aria-pressed="false">Hidden &ndash; make my own judgement first</button>' +
      "</div>" +
      '<span class="mod-spacer"></span>' +
      '<button type="button" class="mod-btn" data-act="print-one" title="Print only the sample on screen, fitted to A4">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/></svg>' +
      "Print this sample</button>" +
      '<button type="button" class="mod-btn" data-act="print-all" title="Print every sample in this portfolio, each starting on a new A4 page">Print all samples</button>' +
      '<div class="mod-picker" aria-label="Work samples">' +
      '<span class="mod-label">Samples</span><span data-role="chips"></span>' +
      '<button type="button" class="mod-btn" data-act="reshuffle" title="Present the samples in a new random order">Reshuffle</button>' +
      '<button type="button" class="mod-btn" data-act="reveal-all">Reveal all decisions</button>' +
      '<button type="button" class="mod-btn" data-act="reset" title="Clear my judgements and notes">Clear my judgements</button>' +
      '<span class="mod-progress" data-role="progress"></span>' +
      "</div></div>";

    var header = document.querySelector("body > header");
    if (header && header.nextSibling) header.parentNode.insertBefore(bar, header.nextSibling);
    else document.body.insertBefore(bar, document.body.firstChild);
    // keep the toolbar just under a sticky page header so it is always reachable
    var place = function () {
      var sticky = header && getComputedStyle(header).position === "sticky";
      bar.classList.add("mod-sticky");
      var top = sticky ? header.offsetHeight : 0;
      bar.style.top = top + "px";
      // a sticky level-tab bar sits under the toolbar instead of behind it
      document.querySelectorAll(".mod-nav").forEach(function (nav) {
        if (getComputedStyle(nav).position === "sticky") nav.style.top = (top + (getComputedStyle(bar).position === "sticky" ? bar.offsetHeight : 0)) + "px";
      });
    };
    place();
    ui.place = place;
    window.addEventListener("resize", place);

    bar.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act],[data-sample]");
      if (!b) return;
      var act = b.getAttribute("data-act");
      if (b.hasAttribute("data-sample")) { showSample(b.getAttribute("data-sample")); return scrollToCard(); }
      if (act === "show") setJudging(false);
      if (act === "judge") setJudging(true);
      if (act === "print-one") printOne();
      if (act === "print-all") printAll();
      if (act === "reshuffle") { state.order = shuffle(samples.map(function (s) { return s.id; })); save(); render(); showSample(state.order[0]); }
      if (act === "reveal-all") { samples.forEach(function (s) { state.revealed[s.id] = true; }); save(); render(); }
      if (act === "reset") {
        if (!confirm("Clear your judgements, notes and revealed decisions for this portfolio?")) return;
        state.judgements = {}; state.notes = {}; state.revealed = {}; save(); render();
      }
    });
    ui.bar = bar;
    ui.chips = bar.querySelector('[data-role="chips"]');
    ui.progress = bar.querySelector('[data-role="progress"]');
  }

  /* ----------------------------------------------------------- judgement card */
  function buildCard() {
    var card = el("section", { "class": "mod-card", "aria-live": "polite" });
    card.addEventListener("click", function (e) {
      var lv = e.target.closest("[data-level]");
      if (lv) { state.judgements[state.current] = lv.getAttribute("data-level"); save(); render(); return; }
      var b = e.target.closest("[data-act]");
      if (!b) return;
      var act = b.getAttribute("data-act");
      if (act === "reveal") { state.revealed[state.current] = true; save(); render(); }
      if (act === "hide") { delete state.revealed[state.current]; save(); render(); }
      if (act === "next") { var i = state.order.indexOf(state.current); showSample(state.order[(i + 1) % state.order.length]); scrollToCard(); }
    });
    card.addEventListener("input", function (e) {
      if (e.target.classList.contains("mod-notes")) { state.notes[state.current] = e.target.value; save(); }
    });
    ui.card = card;
  }

  function cardHTML(s) {
    var n = state.order.indexOf(s.id) + 1, total = state.order.length;
    var mine = state.judgements[s.id], revealed = !!state.revealed[s.id];
    var levels = ORDER.map(function (L) {
      var c = LEVELS[L], on = mine === L;
      return '<button type="button" class="mod-level" data-level="' + L + '" aria-pressed="' + on + '" style="' +
        (on ? "border-color:" + c.color + ";background:" + c.tint : "") + '"><b style="color:' + c.color + '">' + L + "</b><span>" + c.text + "</span></button>";
    }).join("");
    var result = "";
    if (revealed) {
      var a = ORDER.indexOf(s.level), m = ORDER.indexOf(mine), c = LEVELS[s.level] || LEVELS.Sound;
      var verdict = !mine ? "You revealed this sample without recording a judgement."
        : a === m ? "Your judgement matches the moderated level."
        : "Your judgement was <b>" + esc(mine) + "</b> &mdash; " + Math.abs(a - m) + " level" + (Math.abs(a - m) > 1 ? "s" : "") + (m < a ? " higher" : " lower") + " than the moderated level. Read the rationale below and discuss the evidence that separates the two.";
      result = '<div class="mod-result" style="background:' + c.tint + ";border:1px solid " + c.color + '">' +
        "<b>Moderated as: <span style=\"color:" + c.color + '">' + esc(s.level) + "</span></b>" + (s.student ? " &middot; " + esc(s.student) : "") + "<br>" + verdict + "</div>";
    }
    return "<h3>Sample " + n + " of " + total + " &mdash; what is your on-balance judgement?</h3>" +
      '<p class="lead">Look closely at the work sample and teacher-recorded evidence below. Choose the description that best matches the evidence as a whole, note the evidence that decided it, then reveal the moderation decision.</p>' +
      '<div class="mod-levels" role="group" aria-label="Your judgement">' + levels + "</div>" +
      '<label class="mod-label" for="mod-notes-' + s.id + '">Evidence for my judgement</label>' +
      '<textarea class="mod-notes" id="mod-notes-' + s.id + '" placeholder="e.g. Uses taught routines accurately; explains thinking when prompted…">' + esc(state.notes[s.id] || "") + "</textarea>" +
      '<div class="mod-actions">' +
      (revealed
        ? '<button type="button" class="mod-btn" data-act="hide">Hide decision again</button>'
        : '<button type="button" class="mod-btn primary" data-act="reveal">Reveal moderation decision</button>') +
      '<button type="button" class="mod-btn" data-act="next">Next sample &rarr;</button>' +
      '<span class="mod-hint">' + (mine ? "Judgement recorded: " + esc(mine) : "No judgement chosen yet") + "</span>" +
      "</div>" + result;
  }

  /* ----------------------------------------------------------- render */
  function render() {
    document.body.classList.toggle("mod-judge", state.judging);
    if (ui.place) ui.place();
    document.querySelectorAll("#annotations-status-text, #annotationBtnText").forEach(function (t) {
      t.textContent = state.judging ? "Show judgements" : "Hide judgements";
    });
    ui.bar.querySelectorAll(".mod-seg button").forEach(function (b) {
      b.setAttribute("aria-pressed", String((b.getAttribute("data-act") === "judge") === state.judging));
    });

    var revealedCount = 0, judgedCount = 0;
    samples.forEach(function (s) {
      var r = !!state.revealed[s.id];
      if (r) revealedCount++;
      if (state.judgements[s.id]) judgedCount++;
      s.el.classList.toggle("mod-is-revealed", r);
    });
    document.body.classList.toggle("mod-all-revealed", samples.length > 0 && revealedCount === samples.length);

    // group-level decisions follow the sample being viewed
    var cur = sampleById(state.current);
    document.querySelectorAll("[data-mod-group]").forEach(function (g) {
      g.classList.toggle("mod-group-revealed", !!(cur && g.contains(cur.el) && state.revealed[cur.id]));
    });

    ui.chips.innerHTML = state.order.map(function (id, i) {
      var cls = "mod-chip" + (state.judgements[id] ? " judged" : "") + (state.revealed[id] ? " revealed" : "");
      return '<button type="button" class="' + cls + '" data-sample="' + id + '" aria-current="' + (id === state.current) + '"><span class="dot"></span>Sample ' + (i + 1) + "</button>";
    }).join(" ");
    ui.progress.textContent = judgedCount + " of " + samples.length + " judged · " + revealedCount + " revealed";

    if (state.judging && cur) {
      ui.card.innerHTML = cardHTML(cur);
      if (ui.card.nextElementSibling !== cur.el) cur.el.parentNode.insertBefore(ui.card, cur.el);
      ui.card.style.display = "";
    } else {
      ui.card.style.display = "none";
    }
  }

  function scrollToCard() {
    if (!ui.card || ui.card.style.display === "none") return;
    var bottom = ui.bar.getBoundingClientRect().bottom;
    var top = ui.card.getBoundingClientRect().top + window.scrollY - Math.max(bottom, 0) - 12;
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
  }

  function showSample(id) {
    var s = sampleById(id);
    if (!s) return;
    state.current = id;
    run(s.open);
    render();
  }

  function setJudging(on) {
    var starting = on && !state.judging;
    state.judging = on;
    if (on) {
      // every time decisions are hidden, start with all of them hidden again
      if (starting) state.revealed = {};
      if (!state.order.length || state.order.length !== samples.length) state.order = shuffle(samples.map(function (s) { return s.id; }));
      var vis = currentVisibleSample();
      if (!state.current) state.current = state.order[0];
      save();
      showSample(state.current || (vis && vis.id));
      scrollToCard();
    } else {
      save();
      var c = sampleById(state.current);
      if (c) run(c.open);
      render();
    }
  }

  /* ----------------------------------------------------------- printing
     Printing builds a separate copy of what is being printed (#mod-print-root),
     lays it out at a fixed desktop width so it looks the same on every screen,
     then scales it to fit A4 portrait:
       - one page whenever it fits at a readable size;
       - otherwise over as few pages as needed, never splitting a card, table
         row, note or other part across a page break.
     It is used by Print this sample, Print all samples, the portfolio's own
     Print buttons and the browser's own Print command (Ctrl/Cmd + P). */
  var A4 = { w: 718, h: 1035 };       // printable area of A4 at 10 mm margins, in CSS px (with a little safety)
  var LAYOUT_W = 900;                 // width the sample is laid out at before scaling
  var MATRIX_W = 1100;                // matrices are wide tables
  var MIN_ONE_PAGE = 0.6;             // smallest scale accepted to keep a sample on one page
  var MIN_MULTI = 0.68;               // smallest scale used to save a page on longer samples
  var PART = ".rounded,.rounded-md,.rounded-lg,.rounded-xl,.rounded-2xl,.rounded-t-xl,.rounded-b-xl,.sticky-note,.where-next," +
             ".teacher-banner,.mod-print-head,table,tr,li,p,svg,img,h3,h4,pre,blockquote,[class*='border-l-']";
  var printCleanup = null;
  var nativePrint = window.print.bind(window);

  // Tailwind's sm/md/lg rules only apply on wide screens, but a printed page is
  // narrow. Copy them, scoped to the print copy, so print matches the desktop layout.
  function desktopRules() {
    var out = [];
    function split(sel) {
      var parts = [], depth = 0, cur = "";
      for (var i = 0; i < sel.length; i++) {
        var c = sel[i];
        if (c === "(" || c === "[") depth++;
        if (c === ")" || c === "]") depth--;
        if (c === "," && depth === 0) { parts.push(cur); cur = ""; } else cur += c;
      }
      parts.push(cur);
      return parts.map(function (p) { return "#mod-print-root " + p.trim(); }).join(",");
    }
    function walk(rules, inWide) {
      for (var i = 0; i < rules.length; i++) {
        var r = rules[i];
        if (r.type === 4) {
          var t = (r.conditionText || (r.media && r.media.mediaText) || "");
          var m = /min-width:\s*(\d+)px/.exec(t);
          if (m && +m[1] <= 1024 && !/max-width|print/.test(t)) walk(r.cssRules, true);
        } else if (r.type === 1 && inWide) {
          out.push(split(r.selectorText) + "{" + r.style.cssText + "}");
        }
      }
    }
    Array.prototype.forEach.call(document.styleSheets, function (sh) {
      try { walk(sh.cssRules, false); } catch (e) { /* cross-origin sheet (fonts) */ }
    });
    return out.join("\n");
  }

  // A copy of an element that can sit beside the original without clashing.
  function copyOf(node) {
    var c = node.cloneNode(true);
    var map = {};
    [c].concat(Array.prototype.slice.call(c.querySelectorAll("[id]"))).forEach(function (n) {
      if (!n.id) return;
      map[n.id] = n.id + "-print";
      n.id = map[n.id];
    });
    c.querySelectorAll("*").forEach(function (n) {
      Array.prototype.forEach.call(n.attributes, function (a) {
        if (/url\(#|^#/.test(a.value)) {
          var v = a.value.replace(/url\(#([^)]+)\)/g, function (m, id) { return map[id] ? "url(#" + map[id] + ")" : m; })
                         .replace(/^#(.+)$/, function (m, id) { return map[id] ? "#" + map[id] : m; });
          if (v !== a.value) n.setAttribute(a.name, v);
        }
      });
    });
    c.classList.remove("hidden");
    c.style.display = "block";
    return c;
  }

  function headFor(s, kind) {
    var title = ((document.querySelector("h1") || {}).textContent || document.title).trim();
    var date = new Date().toLocaleDateString("en-AU");
    var html = "<h2>" + esc(title) + "</h2>";
    if (kind === "matrix") return html + "<p>Moderation matrix &middot; printed " + date + "</p>";
    if (!s) return html + "<p>Printed " + date + "</p>";
    if (!state.judging) return html + "<p>" + esc(s.student) + " &mdash; " + esc(s.level) + " &middot; printed " + date + "</p>";
    var n = state.order.indexOf(s.id) + 1, mine = state.judgements[s.id], notes = state.notes[s.id];
    html += "<p>Sample " + n + " of " + state.order.length + " &middot; printed " + date + "</p>";
    if (state.revealed[s.id]) {
      return html + '<div class="mod-print-result"><b>Moderated as: ' + esc(s.level) + "</b>" + (s.student ? " &middot; " + esc(s.student) : "") +
        (mine ? "<br>My judgement: " + esc(mine) : "") + (notes ? "<br>My evidence: " + esc(notes) : "") + "</div>";
    }
    return html + '<div class="mod-print-judge"><b>Teacher judgement (circle one):</b><div class="boxes">' +
      ORDER.map(function (L) { return "<span>" + L + "</span>"; }).join("") + "</div>" +
      "<b>Evidence that decided it:</b>" + (notes ? "<div>" + esc(notes) + "</div>" : '<div class="lines"></div><div class="lines"></div><div class="lines"></div>') + "</div>";
  }

  function sheetFor(target, s, kind, root) {
    var sheet = el("div", { "class": "mod-print-sheet" });
    if (target.closest(".hide-annotations")) sheet.classList.add("hide-annotations");
    var head = el("div", { "class": "mod-print-head" }, headFor(s, kind));
    sheet.appendChild(head);
    sheet.appendChild(copyOf(target));
    root.appendChild(sheet);
    return sheet;
  }

  // Scale one sheet to A4, preferring a single page.
  function measure(sheet, width) {
    sheet.style.zoom = "1";
    sheet.style.width = width + "px";
    return { w: Math.max(width, sheet.scrollWidth), h: sheet.getBoundingClientRect().height };
  }
  function fit(sheet, width) {
    var m = measure(sheet, width);
    var z = A4.w / m.w, keepUpTo = 0.92;
    if (m.h * z > A4.h) {
      if (m.h * MIN_ONE_PAGE <= A4.h) {
        z = A4.h / m.h;                                      // shrink a little to keep it on one page
      } else {
        // Too long for one page: stack the columns so the page breaks fall cleanly
        // between parts, then use as few pages as a readable size allows.
        sheet.classList.add("mod-linear");
        m = measure(sheet, width);
        z = A4.w / m.w;
        var pages = Math.ceil((m.h * z) / (A4.h * 0.9));
        var fewer = ((pages - 1) * A4.h * 0.88) / m.h;
        if (pages > 1 && fewer >= MIN_MULTI && fewer < z) z = fewer;
        keepUpTo = 0.75;
      }
    }
    // Mark the parts that must not be split across pages. Anything too tall has to break.
    var limit = (A4.h * keepUpTo) / z;
    sheet.querySelectorAll(PART).forEach(function (n) {
      if (n.getBoundingClientRect().height < limit) n.classList.add("mod-keep");
    });
    sheet.style.zoom = String(Math.floor(z * 1000) / 1000);
    return { pages: Math.ceil((m.h * z) / A4.h), scale: z, linear: sheet.classList.contains("mod-linear") };
  }

  function visibleMatrix() {
    var ms = document.querySelectorAll(".mod-matrix");
    for (var i = 0; i < ms.length; i++) if (isVisible(ms[i])) return ms[i];
    return null;
  }

  // what: "one" (the sample or matrix on screen), "all", or "matrix"
  function preparePrint(what) {
    if (printCleanup) printCleanup();
    // decide what to print while the page is still showing normally
    var jobs = [];
    if (what === "all") {
      (state.judging ? state.order.map(sampleById) : samples).forEach(function (s) { jobs.push([s.el, s, "sample"]); });
      var mx = document.querySelector(".mod-matrix");
      if (mx && !state.judging) jobs.push([mx, null, "matrix"]);
    } else {
      var s = what === "matrix" ? null : (state.judging ? sampleById(state.current) : currentVisibleSample());
      var target = s ? s.el : (visibleMatrix() || (what === "matrix" ? document.querySelector(".mod-matrix") : null));
      if (!target) target = document.querySelector("main") || document.body.firstElementChild;
      jobs.push([target, s, s ? "sample" : (target.classList.contains("mod-matrix") ? "matrix" : "page")]);
    }
    var root = el("div", { id: "mod-print-root" });
    var style = el("style", { "data-mod-print": "" }, desktopRules());
    document.head.appendChild(style);
    document.body.appendChild(root);
    document.body.classList.add("mod-printing");
    var report = jobs.map(function (j) { return fit(sheetFor(j[0], j[1], j[2], root), j[2] === "matrix" ? MATRIX_W : LAYOUT_W); });

    printCleanup = function () {
      document.body.classList.remove("mod-printing");
      if (root.parentNode) root.parentNode.removeChild(root);
      if (style.parentNode) style.parentNode.removeChild(style);
      printCleanup = null;
    };
    return report;
  }

  function printOne() { preparePrint("one"); nativePrint(); armCleanupFallback(); }
  function printAll() { preparePrint("all"); nativePrint(); armCleanupFallback(); }
  function printMatrix() { preparePrint("matrix"); nativePrint(); armCleanupFallback(); }

  // The portfolios' own "Hide Teacher Marks" buttons switch the Hidden option on
  // and off, so every portfolio hides the whole decision the same way.
  function rewireHideButtons() {
    document.querySelectorAll("[onclick]").forEach(function (b) {
      if (!/toggleAnnotations\(\)/.test(b.getAttribute("onclick"))) return;
      b.removeAttribute("onclick");
      b.title = "Hide or show the teacher's marks and moderation decisions";
      b.addEventListener("click", function (e) { e.preventDefault(); setJudging(!state.judging); });
    });
  }

  // The portfolios' own Print buttons use the same engine.
  function rewirePrintButtons() {
    document.querySelectorAll("[onclick]").forEach(function (b) {
      if (!/window\.print\(\)/.test(b.getAttribute("onclick"))) return;
      b.removeAttribute("onclick");
      b.addEventListener("click", function (e) {
        e.preventDefault();
        if (b.closest(".mod-matrix")) printMatrix();
        else if (/portfolio/i.test(b.textContent)) printAll();
        else printOne();
      });
    });
  }

  // Browsers fire afterprint when the dialog closes; if one doesn't, tidy up on
  // the next click or key press instead (never while the dialog is open).
  function armCleanupFallback() {
    var once = function () {
      document.removeEventListener("pointerdown", once, true);
      document.removeEventListener("keydown", once, true);
      if (printCleanup) printCleanup();
    };
    setTimeout(function () {
      document.addEventListener("pointerdown", once, true);
      document.addEventListener("keydown", once, true);
    }, 0);
  }
  // Ctrl/Cmd + P or the browser menu: print what is on screen, nicely.
  window.addEventListener("beforeprint", function () { if (!printCleanup) preparePrint("one"); });
  window.addEventListener("afterprint", function () { if (printCleanup) printCleanup(); });

  /* ----------------------------------------------------------- start */
  function init() {
    collect();
    if (!samples.length) return;
    var style = el("style", null, CSS);
    document.head.appendChild(style);
    buildBar();
    buildCard();

    var saved = store.get();
    state.judgements = saved.judgements || {};
    state.notes = saved.notes || {};
    state.revealed = {};
    var ids = samples.map(function (s) { return s.id; });
    var ok = saved.order && saved.order.length === ids.length && saved.order.every(function (id) { return ids.indexOf(id) > -1; });
    state.order = ok ? saved.order : shuffle(ids);

    // ?judge=1 in the link opens the portfolio straight into judgement mode
    var wantJudge = /[?&]judge=1\b/.test(location.search) || !!saved.judging;
    render();
    rewirePrintButtons();
    rewireHideButtons();
    render();
    if (wantJudge) setJudging(true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.ModerationTools = { judge: function () { setJudging(true); }, show: function () { setJudging(false); }, printSample: printOne, printAll: printAll, preparePrint: preparePrint, cleanupPrint: function () { if (printCleanup) printCleanup(); } };
})();
