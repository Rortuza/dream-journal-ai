// theme logic
const THEME_KEY = "dj_theme"; // "day" or "night"

function setTheme(t){
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem(THEME_KEY, t);
}
function inferThemeFromClock(){
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (prefersDark) return "night";
  const h = new Date().getHours();
  return (h >= 7 && h <= 18) ? "day" : "night";
}
function applyInitialTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved ? saved : inferThemeFromClock();
  setTheme(theme);
}
applyInitialTheme();
setInterval(()=>{
  const saved = localStorage.getItem(THEME_KEY);
  if(!saved){ setTheme(inferThemeFromClock()); }
}, 15 * 60 * 1000);

const btn = document.getElementById("theme-toggle");
if(btn){
  btn.onclick = ()=>{
    const current = document.documentElement.getAttribute("data-theme") || "day";
    const next = current === "night" ? "day" : "night";
    setTheme(next);
  };
}
