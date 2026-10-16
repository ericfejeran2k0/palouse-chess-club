/* Palouse Chess Club — site behavior.
   Meeting dates, events and puzzles come from window.CLUB (club-data.js),
   which is built from the files in _data/ and _config.yml. */
(function () {
  "use strict";

  var CLUB = window.CLUB || { meetings: {}, events: [], puzzles: [] };
  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS_AHEAD = 6;

  /* ---------- Menu button (phones) ---------- */
  var menuButton = document.querySelector(".menu-button");
  var nav = document.getElementById("site-nav");
  if (menuButton && nav) {
    menuButton.addEventListener("click", function () {
      var open = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
  }

  /* ---------- Date helpers ---------- */
  function parseDate(str) {
    var p = String(str).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function dateKey(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function atTime(d, hhmm) {
    var p = String(hhmm || "23:59").split(":");
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), +p[0], +(p[1] || 0));
  }
  function sameDay(a, b) { return dateKey(a) === dateKey(b); }
  function fmt(d, opts) { return d.toLocaleDateString("en-US", opts); }
  function longDate(d) { return fmt(d, { weekday: "long", month: "long", day: "numeric" }); }

  /* The nth given weekday of a month, e.g. the 3rd Saturday. */
  function nthWeekday(year, month, weekday, n) {
    var first = new Date(year, month, 1);
    var day = 1 + ((weekday - first.getDay() + 7) % 7) + (n - 1) * 7;
    var d = new Date(year, month, day);
    return d.getMonth() === month ? d : null;
  }

  /* ---------- Build the list of upcoming events ---------- */
  function upcomingEvents() {
    var m = CLUB.meetings;
    var loc = CLUB.location || {};
    var regularPlace = [loc.name, loc.room].filter(Boolean).join(", ");
    var weekday = WEEKDAYS.indexOf(m.weekday);
    var now = new Date();
    var byDate = {};
    var list = [];

    for (var i = 0; i <= MONTHS_AHEAD; i++) {
      var month = new Date(now.getFullYear(), now.getMonth() + i, 1);
      (m.weeksOfMonth || []).forEach(function (n) {
        var d = nthWeekday(month.getFullYear(), month.getMonth(), weekday, n);
        if (!d) return;
        var ev = {
          date: d, regular: true, title: "Club meeting", time: m.timeText,
          location: regularPlace, end: atTime(d, m.endTime), start: atTime(d, m.startTime)
        };
        byDate[dateKey(d)] = ev;
        list.push(ev);
      });
    }

    (CLUB.events || []).forEach(function (e) {
      if (!e.date) return;
      var d = parseDate(e.date);
      var match = byDate[dateKey(d)];
      if (match) {
        // A special entry on a regular meeting day changes or cancels that meeting.
        if (e.cancel) { match.cancelled = true; match.note = e.title; }
        else {
          match.title = e.title || match.title;
          if (e.time) { match.time = e.time; match.timeChanged = true; }
          if (e.location) match.location = e.location;
          match.description = e.description;
          match.link = e.link;
          match.changed = true;
        }
        return;
      }
      list.push({
        date: d, special: !e.cancel, cancelled: !!e.cancel, title: e.title, time: e.time,
        location: e.location, description: e.description, link: e.link, end: atTime(d, "23:59")
      });
    });

    return list
      .filter(function (ev) { return ev.end >= now; })
      .sort(function (a, b) { return a.date - b.date; });
  }

  /* ---------- Rendering helpers ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function relativeDay(d) {
    var today = new Date();
    var tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    if (sameDay(d, today)) return "Today!";
    if (sameDay(d, tomorrow)) return "Tomorrow!";
    var days = Math.round((d - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
    return days <= 13 ? "In " + days + " days" : "";
  }

  function eventCard(ev) {
    var card = el("article", "event" + (ev.special || ev.changed ? " is-special" : "") + (ev.cancelled ? " is-cancelled" : ""));
    var date = el("div", "event-date");
    date.appendChild(el("span", "event-month", fmt(ev.date, { month: "short" })));
    date.appendChild(el("span", "event-day", String(ev.date.getDate())));
    date.appendChild(el("span", "event-weekday", fmt(ev.date, { weekday: "short" })));
    card.appendChild(date);

    var body = el("div", "event-body");
    var tags = el("div", "event-tags");
    if (ev.cancelled) tags.appendChild(el("span", "tag tag-cancelled", "Cancelled"));
    else if (ev.special) tags.appendChild(el("span", "tag tag-special", "Special event"));
    else if (ev.changed) tags.appendChild(el("span", "tag tag-special", "Updated"));
    var rel = relativeDay(ev.date);
    if (rel && !ev.cancelled) tags.appendChild(el("span", "tag tag-soon", rel));
    if (tags.childNodes.length) body.appendChild(tags);

    body.appendChild(el("h3", "event-title", ev.cancelled && ev.regular ? "Club meeting" : ev.title));
    if (ev.cancelled && ev.note && ev.regular) body.appendChild(el("p", "event-note", ev.note));
    if (!ev.cancelled) {
      var meta = [ev.time, ev.location].filter(Boolean).join(" · ");
      if (meta) body.appendChild(el("p", "event-meta", meta));
      if (ev.description) body.appendChild(el("p", "event-desc", ev.description));
      if (ev.link) {
        var a = el("a", "event-link", "More info →");
        a.href = ev.link;
        body.appendChild(a);
      }
    }
    card.appendChild(body);
    return card;
  }

  /* ---------- Next meeting (home page) ---------- */
  function renderNextMeeting(box) {
    var events = upcomingEvents();
    var next = events.filter(function (e) { return e.regular && !e.cancelled; })[0];
    if (!next) return;
    var skipped = events.filter(function (e) { return e.regular && e.cancelled && e.date < next.date; });
    var now = new Date();
    var live = next.start <= now && now <= next.end;

    box.querySelector("[data-next-date]").textContent = longDate(next.date);
    var badge = box.querySelector("[data-next-badge]");
    var rel = live ? "Happening now!" : relativeDay(next.date);
    badge.textContent = rel;
    badge.hidden = !rel;
    box.querySelector("[data-next-time]").textContent = next.time;
    box.querySelector("[data-next-place]").textContent = next.location;
    var extra = box.querySelector("[data-next-note]");
    var notes = [];
    if (next.changed && next.title !== "Club meeting") notes.push(next.title);
    skipped.forEach(function (s) { notes.push(fmt(s.date, { month: "short", day: "numeric" }) + ": " + (s.note || "No meeting") + "."); });
    if (notes.length) { extra.textContent = notes.join(" "); extra.hidden = false; }
  }

  /* ---------- Event lists ---------- */
  function renderList(container) {
    var limit = parseInt(container.getAttribute("data-limit") || "0", 10);
    var grouped = container.hasAttribute("data-group-by-month");
    var events = upcomingEvents();
    if (limit) events = events.slice(0, limit);
    container.textContent = "";
    var lastMonth = "";
    events.forEach(function (ev) {
      var month = fmt(ev.date, { month: "long", year: "numeric" });
      if (grouped && month !== lastMonth) {
        container.appendChild(el("h2", "month-heading", month));
        lastMonth = month;
      }
      container.appendChild(eventCard(ev));
    });
  }

  document.querySelectorAll("[data-next-meeting]").forEach(renderNextMeeting);
  document.querySelectorAll("[data-event-list]").forEach(renderList);

  /* ---------- Weekly puzzle choice (shared with boards.js) ---------- */
  // Puzzle #1 was shown the week of Monday, Oct 12, 2026. A new one appears every Monday.
  var FIRST_WEEK = Date.UTC(2026, 9, 12);
  window.ClubPuzzle = {
    current: function () {
      var list = CLUB.puzzles || [];
      if (!list.length) return null;
      var t = new Date();
      var days = Math.floor((Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) - FIRST_WEEK) / 86400000);
      var week = Math.floor(days / 7);
      var index = ((week % list.length) + list.length) % list.length;
      var monday = new Date(FIRST_WEEK + week * 7 * 86400000);
      var weekOf = new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate());
      return { puzzle: list[index], number: index + 1, weekOf: weekOf };
    }
  };
  document.querySelectorAll("[data-puzzle-title]").forEach(function (n) {
    var c = window.ClubPuzzle.current();
    if (c) n.textContent = c.puzzle.title;
  });
  document.querySelectorAll("[data-puzzle-task]").forEach(function (n) {
    var c = window.ClubPuzzle.current();
    if (c) n.textContent = c.puzzle.task;
  });

  /* ---------- Photo viewer ---------- */
  var gallery = document.querySelector("[data-gallery]");
  var viewer = document.querySelector("[data-viewer]");
  if (gallery && viewer && viewer.showModal) {
    var links = Array.prototype.slice.call(gallery.querySelectorAll("a"));
    var img = viewer.querySelector("img");
    var counter = viewer.querySelector("[data-counter]");
    var current = 0;
    var show = function (i) {
      current = (i + links.length) % links.length;
      img.src = links[current].href;
      counter.textContent = (current + 1) + " of " + links.length;
    };
    links.forEach(function (a, i) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        show(i);
        viewer.showModal();
      });
    });
    viewer.querySelector("[data-prev]").addEventListener("click", function () { show(current - 1); });
    viewer.querySelector("[data-next]").addEventListener("click", function () { show(current + 1); });
    viewer.querySelector("[data-close]").addEventListener("click", function () { viewer.close(); });
    viewer.addEventListener("click", function (e) { if (e.target === viewer) viewer.close(); });
    viewer.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });
    var touchX = null;
    viewer.addEventListener("touchstart", function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    viewer.addEventListener("touchend", function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      touchX = null;
    });
  }
})();
