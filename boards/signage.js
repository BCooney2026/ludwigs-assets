/*
  LUDWIG'S SIGNAGE PLAYER (shared by every board)
  ------------------------------------------------------------------
  Same player as the Rocco's boards, with Ludwig's own IDs and prices.
  - Prices come from the price feed (Google Sheet + Apps Script) by
    Sheet ID, L001 and up. Never type prices into a board.
  - Until the feed exists (FEED_URL empty), the board runs on FALLBACK
    below. Once the feed is live, FALLBACK is only for a TV that has
    never been online.
  - The last good feed is kept on the TV, so a Wi-Fi drop never blanks
    the screen. Refreshes every 2 minutes.
  - 86 (tablet): RS.isSoldOut(id) is true for items marked "Sold out
    today". The feed's soldOut list only counts on its own soldOutDate,
    so a TV that kept yesterday's feed overnight ignores it.
  - Add / remove (tablet): RS.removed holds the IDs taken off the menu.
    RS.items is every item in the feed, so a board can show new ones.
  - Scales the 1920x1080 stage to any screen, drifts a few pixels every
    10 minutes (burn-in), reloads at 4 am to pick up changes.
*/
(function () {
  "use strict";

  // Apps Script web app URL + "?feed=1". Empty = no feed yet, FALLBACK only.
  const FEED_URL = "";
  const STORE_KEY = "ludwigs_signage_feed_v1";
  const TZ = "America/New_York";

  // Prices as of the Nov 2026 menus (Sandwich_Menu_26.doc, the pizza board,
  // LudwigsPizzaMenu2023.pdf). Items with no price (specialty pizza names,
  // stromboli flavors, Italian Dinners) are not listed: they show no price.
  const FALLBACK = {
    // Pizza: build your own, toppings, crusts, specialty price
    L001: "$9.00",                        // Three Cheese, Small 10"
    L002: "$13.50",                       // Three Cheese, Large 16"
    L003: "$12.00",                       // Boardwalk Extra Thin Crust 16"
    L004: "Small $1.50 / Large $2.50",    // Toppings, each
    L005: "Small $1.50 / Large $2.50",    // Whole Grain crust, add
    L006: "$4.00",                        // Gluten Free crust, add (Small only)
    L007: "Small $13.00 / Large $21.95",  // Every specialty pizza
    // Sandwiches #1 to #17 (L040 to L056), add chicken, extras
    L040: "$13.00", L041: "$14.00", L042: "$13.00", L043: "$11.00", L044: "$14.00",
    L045: "$11.00", L046: "$11.00", L047: "$12.00", L048: "$12.00", L049: "$14.00",
    L050: "$13.00", L051: "$12.00", L052: "$14.00", L053: "$14.00", L054: "$13.00",
    L055: "$14.00", L056: "$14.00",
    L057: "$4.00",                        // Add chicken (#4, #7, #9)
    // Strombolis
    L060: "$13.95",                       // Every stromboli (pre-made, frozen)
    L061: "$2.00",                        // Upcharge on the "+$2" strombolis
    // Pasta Specialties (Talluto's)
    L092: "$10.99", L093: "$10.99", L094: "$10.99", L095: "$13.99"
  };

  const RS = window.RS = {
    prices: Object.assign({}, FALLBACK),
    settings: { soup: "", banner: "", soupList: [] },
    removed: {},
    soldOut: {},
    soldOutDate: "",
    items: [],
    TZ: TZ
  };

  RS.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  };

  /** "$16.95" -> 16<sup>95</sup> ; "$19.00" -> 19<sup>00</sup> (always show the cents). */
  RS.money = function (str) {
    return RS.esc(str).replace(/\$?(\d+)\.(\d{2})/g, (m, d, c) => d + "<sup>" + c + "</sup>");
  };
  RS.price = function (id) { return RS.removed[id] ? "" : (RS.prices[id] || ""); };
  RS.isRemoved = function (id) { return !!RS.removed[id]; };
  // Preview only: &test86=L040,L052 shows those items as sold out.
  const TEST86 = (new URLSearchParams(location.search).get("test86") || "").split(",").filter(Boolean);
  RS.isSoldOut = function (id) {
    return TEST86.indexOf(id) >= 0 || (!!RS.soldOut[id] && RS.soldOutDate === RS.today());
  };
  RS.p = function (id) { return RS.money(RS.price(id)); };

  /** Pull one size out of a multi-size price: RS.size("L007", "Large"). */
  RS.size = function (id, label) {
    const part = RS.price(id).split("/").map(s => s.trim()).find(s => s.toLowerCase().indexOf(label.toLowerCase()) === 0);
    return part ? part.replace(/^[A-Za-z]+\s+/, "") : "";
  };

  /** 1 = Monday ... 7 = Sunday, in the shop's time zone. */
  RS.weekday = function () {
    const d = new Date().toLocaleDateString("en-US", { timeZone: TZ, weekday: "short" });
    return { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[d] || 1;
  };
  RS.today = function () { // yyyy-mm-dd in the shop's time zone
    return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
  };

  /* ---------- stage ---------- */
  // Fit the stage to what the TV actually shows. Some kiosk browsers report a
  // page twice the size of the screen, so measure the visible area
  // (visualViewport) and center on that.
  function scale() {
    const st = document.querySelector(".stage");
    const vv = window.visualViewport;
    const w = vv ? vv.width : window.innerWidth;
    const h = vv ? vv.height : window.innerHeight;
    const s = Math.min(w / 1920, h / 1080);
    st.style.left = ((vv ? vv.offsetLeft : 0) + w / 2) + "px";
    st.style.top = ((vv ? vv.offsetTop : 0) + h / 2) + "px";
    st.style.transform = "translate(-50%, -50%) scale(" + s + ")";
    // ?debug=1 shows what the TV reports, for troubleshooting a new screen.
    if (/[?&]debug=1/.test(location.search)) {
      let d = document.getElementById("rsdebug");
      if (!d) { d = document.createElement("div"); d.id = "rsdebug"; d.style.cssText = "position:fixed;left:10px;top:10px;z-index:99;background:#ff0;color:#000;font:bold 28px monospace;padding:10px"; document.body.appendChild(d); }
      d.textContent = "inner " + innerWidth + "x" + innerHeight + " | vv " + (vv ? Math.round(vv.width) + "x" + Math.round(vv.height) + " zoom " + vv.scale : "none") + " | dpr " + devicePixelRatio + " | screen " + screen.width + "x" + screen.height;
    }
  }
  let drift = 0;
  function nudge() {
    const offs = [[0,0],[3,2],[-3,2],[3,-2],[-3,-2],[0,3]];
    drift = (drift + 1) % offs.length;
    const st = document.querySelector(".stage");
    st.style.marginLeft = offs[drift][0] + "px";
    st.style.marginTop = offs[drift][1] + "px";
  }

  /* ---------- feed ---------- */
  function apply(feed) {
    if (!feed || !Array.isArray(feed.items)) return false;
    const next = Object.assign({}, FALLBACK);
    feed.items.forEach(it => { if (it && it.id && it.price) next[it.id] = String(it.price).trim(); });
    const removed = {};
    (Array.isArray(feed.removed) ? feed.removed : []).forEach(id => { if (id) removed[id] = true; });
    RS.prices = next;
    RS.removed = removed;
    const soldOut = {};
    (Array.isArray(feed.soldOut) ? feed.soldOut : []).forEach(id => { if (id) soldOut[id] = true; });
    RS.soldOut = soldOut;
    RS.soldOutDate = String(feed.soldOutDate || "");
    RS.items = feed.items.filter(it => it && it.id);
    RS.settings = Object.assign({ soup: "", banner: "", soupList: [] }, feed.settings || {});
    return true;
  }

  /**
   * RS.start(render): render() draws the board. It runs once right away
   * (last good prices), again whenever fresh prices arrive.
   */
  RS.start = function (render) {
    scale();
    window.addEventListener("resize", scale);
    if (window.visualViewport) { visualViewport.addEventListener("resize", scale); visualViewport.addEventListener("scroll", scale); }
    setTimeout(scale, 1500); // kiosk browsers sometimes settle their size late
    if (FEED_URL) { try { apply(JSON.parse(localStorage.getItem(STORE_KEY) || "null")); } catch (e) {} }
    render();
    if (FEED_URL) {
      const load = () => fetch(FEED_URL, { cache: "no-store" })
        .then(r => r.json())
        .then(feed => {
          if (!apply(feed)) return;
          try { localStorage.setItem(STORE_KEY, JSON.stringify(feed)); } catch (e) {}
          render();
        })
        .catch(() => { /* keep the last good prices */ });
      load();
      setInterval(load, 2 * 60 * 1000);
    }
    setInterval(nudge, 10 * 60 * 1000);
    setInterval(() => {
      const h = Number(new Date().toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hour12: false }));
      if (h === 4 && performance.now() > 2 * 3600 * 1000) location.reload();
    }, 30 * 60 * 1000);
  };
})();
