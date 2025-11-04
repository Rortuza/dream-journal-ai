// ===== THEME LOGIC =====
const THEME_KEY = "dj_theme"; // "day" or "night"

function setTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem(THEME_KEY, t);
}

function inferThemeFromClock() {
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (prefersDark) return "night";
  const h = new Date().getHours();
  return h >= 7 && h <= 18 ? "day" : "night";
}

function applyInitialTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved ? saved : inferThemeFromClock();
  setTheme(theme);
}

applyInitialTheme();

setInterval(() => {
  const saved = localStorage.getItem(THEME_KEY);
  if (!saved) setTheme(inferThemeFromClock());
}, 15 * 60 * 1000);

const themeBtn = document.getElementById("theme-toggle");
if (themeBtn) {
  themeBtn.onclick = () => {
    const current = document.documentElement.getAttribute("data-theme") || "day";
    const next = current === "night" ? "day" : "night";
    setTheme(next);
  };
}

// ===== VIEW TOGGLING FIX =====
const tabHome = document.getElementById("tab-home");
const tabNew = document.getElementById("tab-new");
const viewHome = document.getElementById("view-home");
const viewNew = document.getElementById("view-new");

function show(which) {
  if (which === "home") {
    viewHome.classList.remove("hidden");
    viewNew.classList.add("hidden");
  } else {
    viewNew.classList.remove("hidden");
    viewHome.classList.add("hidden");
  }
}

// Wire up navigation buttons AFTER DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
  if (tabHome && tabNew) {
    tabHome.onclick = () => show("home");
    tabNew.onclick = () => show("new");
  }
});

// ===== INDEXEDDB STORAGE =====
const DB_NAME = "dreams_static_db";
const DB_VER = 1;
let db;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      const store = d.createObjectStore("entries", {
        keyPath: "id",
        autoIncrement: true,
      });
      store.createIndex("dt", "dt");
    };
    req.onsuccess = (e) => {
      db = e.target.result;
      resolve();
    };
    req.onerror = (e) => reject(e);
  });
}

function addEntry(entry) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("entries", "readwrite");
    tx.objectStore("entries").add(entry).onsuccess = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

function listEntries() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("entries", "readonly");
    const store = tx.objectStore("entries");
    const req = store.getAll();
    req.onsuccess = () =>
      resolve(req.result.sort((a, b) => b.dt.localeCompare(a.dt)));
    req.onerror = (e) => reject(e);
  });
}

// ===== SENTIMENT + EMOTION =====
const POS = ["happy", "love", "peace", "safe", "calm", "laugh"];
const NEG = ["fear", "afraid", "scared", "chase", "die", "doom", "cry"];

function sentiment(text) {
  const t = text.toLowerCase();
  const words = t.match(/[a-z']{2,}/g) || [];
  let score = 0;
  for (const w of words) {
    if (POS.includes(w)) score++;
    if (NEG.includes(w)) score--;
  }
  return Math.max(-1, Math.min(1, score / Math.max(1, words.length / 12)));
}

function nightmareIndex(text, sent) {
  const t = text.toLowerCase();
  const fearHits = (t.match(/fear|scared|chase|doom|die|nightmare/g) || []).length;
  const exclam = (t.match(/!/g) || []).length;
  const neg = Math.max(0, -sent);
  const raw = 40 * neg + 10 * fearHits + 5 * exclam;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

// ===== RENDER ENTRIES =====
const cards = document.getElementById("cards");
function renderList(list) {
  cards.innerHTML = list
    .map(
      (e) => `
    <li class="card" data-id="${e.id}">
      <h3>${e.title}</h3>
      <p class="muted">${e.dt}</p>
      <p>Nightmare index: <strong>${e.ni}</strong> | Sentiment: ${e.sent.toFixed(
        2
      )}</p>
    </li>`
    )
    .join("");
}

// ===== ADD NEW ENTRY FORM =====
const form = document.getElementById("new-form");
form.onsubmit = async (ev) => {
  ev.preventDefault();
  const title = document.getElementById("title").value.trim() || "Untitled";
  const text = document.getElementById("text").value.trim();
  const tags = document.getElementById("tags").value.trim();
  const sent = sentiment(text);
  const ni = nightmareIndex(text, sent);
  const entry = {
    dt: new Date().toISOString().slice(0, 16),
    title,
    text,
    tags,
    sent,
    ni,
  };
  await addEntry(entry);
  const all = await listEntries();
  renderList(all);
  show("home");
  form.reset();
};

// ===== INIT APP =====
openDB().then(async () => {
  const all = await listEntries();
  renderList(all);
});
