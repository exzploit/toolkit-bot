/* ===========================================================================
   Toolkit v4 — searchable home, favorites/recents, client-first tools.
   Server round-trips only where a browser genuinely can't do the work.
   =========================================================================== */
const tg = window.Telegram?.WebApp;
try { tg?.ready(); tg?.expand(); } catch (_) {}
const INIT_DATA = tg?.initData || "";
const USER = tg?.initDataUnsafe?.user || null;

/* ---------- prefs ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
};
let favorites = store.get("tk_favs", []);
let recents = store.get("tk_recents", []);
let soundOn = store.get("tk_sound", true);

/* ---------- haptics / sound / toast ---------- */
function haptic(k = "light") { try { tg?.HapticFeedback?.impactOccurred(k); } catch (_) {} }
function notify(k = "success") { try { tg?.HapticFeedback?.notificationOccurred(k); } catch (_) {} }
const SFX = {}; ["click", "success", "error", "coin", "dice"].forEach(n => SFX[n] = new Audio(`assets/sfx/${n}.wav`));
function play(n) { if (!soundOn) return; try { const a = SFX[n]?.cloneNode(); if (a) { a.volume = .35; a.play().catch(() => {}); } } catch (_) {} }
function toast(msg, kind = "") {
  const host = $("#toast-host"); const el = document.createElement("div");
  el.className = "toast " + kind; el.textContent = msg; host.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .25s"; setTimeout(() => el.remove(), 250); }, 1800);
}

/* ---------- dom helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function copy(txt) { try { navigator.clipboard.writeText(txt); } catch (_) {} play("success"); notify(); toast("Copied", "ok"); }
function body() { return $("#detail-body"); }
function setStatus(html, cls = "") { const s = $("#tool-status"); if (s) { s.className = "status " + cls; s.innerHTML = html; } }
const spin = () => `<span class="spinner"></span>`;

/* ---------- API ---------- */
async function api(path, bodyObj) {
  const r = await fetch(`/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Init-Data": INIT_DATA },
    body: JSON.stringify(bodyObj || {}),
  });
  if (r.status === 401) throw new Error("Open this app from inside Telegram.");
  return r.json();
}

/* =========================================================================
   TOOL REGISTRY   (cat: tools|network|media|dev|text)
   ========================================================================= */
const TOOLS = [
  // --- TOOLS ---
  { id: "password", cat: "tools", icon: "key-round", name: "Password", sub: "Strong password generator", kw: "random secure", render: rPassword },
  { id: "vault", cat: "tools", icon: "lock", name: "Secure Vault", sub: "Encrypt files in-browser", kw: "aes encrypt decrypt", render: rVault },
  { id: "qr", cat: "tools", icon: "qr-code", name: "QR Code", sub: "Text or link → QR", kw: "barcode", render: rQR },
  { id: "hashgen", cat: "tools", icon: "hash", name: "Hash Generator", sub: "MD5 / SHA-1 / SHA-256 / 512", kw: "checksum digest", render: rHashGen },
  { id: "hashcrack", cat: "tools", icon: "fingerprint", name: "Hash Cracker", sub: "Test hash vs common list", kw: "md5 sha reverse", render: rHashCrack },
  { id: "decision", cat: "tools", icon: "dices", name: "Decision", sub: "Coin flip / dice roll", kw: "random coin dice", render: rDecision },
  { id: "tts", cat: "tools", icon: "mic", name: "Text to Speech", sub: "Voice message to your chat", kw: "voice speak audio", render: rTTS },

  // --- DEV ---
  { id: "base64", cat: "dev", icon: "binary", name: "Base64", sub: "Encode / decode", kw: "encode decode", render: rBase64 },
  { id: "json", cat: "dev", icon: "braces", name: "JSON Format", sub: "Pretty-print & validate", kw: "beautify minify", render: rJSON },
  { id: "jwt", cat: "dev", icon: "shield-check", name: "JWT Decoder", sub: "Inspect a JSON Web Token", kw: "token auth", render: rJWT },
  { id: "urlcode", cat: "dev", icon: "link", name: "URL Encode", sub: "Percent-encode / decode", kw: "uri escape", render: rUrlCode },
  { id: "timestamp", cat: "dev", icon: "clock", name: "Timestamp", sub: "Unix ⇄ human time", kw: "epoch unix date", render: rTimestamp },
  { id: "uuid", cat: "dev", icon: "shuffle", name: "UUID", sub: "Generate UUID v4", kw: "guid random id", render: rUUID },
  { id: "color", cat: "dev", icon: "palette", name: "Color", sub: "HEX ⇄ RGB ⇄ HSL", kw: "colour convert", render: rColor },

  // --- TEXT ---
  { id: "text", cat: "text", icon: "type", name: "Text Styles", sub: "Fancy, Zalgo, flip, leet", kw: "font unicode", render: rText },
  { id: "morse", cat: "text", icon: "radio", name: "Morse", sub: "Text ⇄ Morse code", kw: "dot dash", render: rMorse },
  { id: "caseconv", cat: "text", icon: "case-sensitive", name: "Case Convert", sub: "UPPER / lower / Title / camel", kw: "uppercase snake kebab", render: rCase },
  { id: "counter", cat: "text", icon: "pilcrow", name: "Word Count", sub: "Chars, words, lines", kw: "length statistics", render: rCounter },

  // --- NETWORK ---
  { id: "subnet", cat: "network", icon: "network", name: "Subnet Calc", sub: "IPv4/IPv6 CIDR breakdown", kw: "cidr netmask ip", render: rSubnet },
  { id: "portscan", cat: "network", icon: "scan-search", name: "Port Probe", sub: "Common open ports on a host", kw: "scan tcp", render: rPortscan },
  { id: "domain", cat: "network", icon: "globe", name: "Domain Info", sub: "DNS + WHOIS/RDAP", kw: "dns whois mx", render: rDomain },
  { id: "ipinfo", cat: "network", icon: "map-pin", name: "IP Info", sub: "Geolocation & ASN", kw: "geoip location", render: rIP },
  { id: "inspect", cat: "network", icon: "search-code", name: "URL Inspector", sub: "Status, server, IP, title", kw: "headers redirect", render: rInspect },
  { id: "phone", cat: "network", icon: "phone", name: "Phone Lookup", sub: "Carrier, region, timezone", kw: "number osint", render: rPhone },
  { id: "username", cat: "network", icon: "users", name: "Username Check", sub: "Across public platforms", kw: "social osint", render: rUsername },
  { id: "dork", cat: "network", icon: "search", name: "Dork Builder", sub: "Google recon queries", kw: "osint google", render: rDork },
  { id: "breach", cat: "network", icon: "shield-alert", name: "Breach Check", sub: "Email via HaveIBeenPwned", kw: "leak pwned", render: rBreach },
  { id: "tgprofile", cat: "network", icon: "send", name: "Telegram Profile", sub: "Public t.me preview", kw: "osint lookup", render: rTgProfile },

  // --- MEDIA ---
  { id: "download", cat: "media", icon: "download", name: "Downloader", sub: "YouTube / Instagram / TikTok", kw: "video yt ig", render: rDownload },
  { id: "exif", cat: "media", icon: "image-off", name: "EXIF Stripper", sub: "Remove photo metadata", kw: "gps privacy image", render: rExif },
];
const byId = id => TOOLS.find(t => t.id === id);
const CATS = { tools: "Tools", dev: "Developer", text: "Text", network: "Network", media: "Media" };

/* =========================================================================
   NAVIGATION / HOME
   ========================================================================= */
function show(view) {
  for (const v of ["home", "detail", "settings"]) $(`#${v}-view`).classList.toggle("hidden", v !== view);
}
function iconsRefresh() { try { lucide.createIcons(); } catch (_) {} }

function cardHTML(t) {
  const fav = favorites.includes(t.id) ? " is-fav" : "";
  return `<button class="card-btn${fav}" data-tool="${t.id}" data-cat="${t.cat}">
    <i data-lucide="star" class="fav-star"></i>
    <span class="ico"><i data-lucide="${t.icon}"></i></span>
    <span class="name">${esc(t.name)}</span>
    <span class="sub">${esc(t.sub)}</span>
  </button>`;
}
function wireCards(root) {
  root.querySelectorAll(".card-btn").forEach(b => b.addEventListener("click", () => openTool(b.dataset.tool)));
}
function section(title, tools, extra = "") {
  if (!tools.length) return "";
  return `<div class="sec-title">${esc(title)} <span class="count">${tools.length}</span>${extra}</div>
          <div class="grid">${tools.map(cardHTML).join("")}</div>`;
}

function renderHome() {
  show("home"); $("#view-title").textContent = "Toolkit";
  const q = $("#search").value.trim().toLowerCase();
  const host = $("#home-sections");

  if (q) {
    const hits = TOOLS.filter(t => (t.name + " " + t.sub + " " + t.kw + " " + CATS[t.cat]).toLowerCase().includes(q));
    host.innerHTML = hits.length ? section(`Results`, hits)
      : `<div class="empty"><i data-lucide="search-x"></i><div>No tools match “${esc(q)}”</div></div>`;
    wireCards(host); iconsRefresh(); return;
  }

  let html = "";
  const favTools = favorites.map(byId).filter(Boolean);
  const recTools = recents.map(byId).filter(Boolean).filter(t => !favorites.includes(t.id));
  if (favTools.length) html += section("★ Favorites", favTools);
  if (recTools.length) html += section("Recent", recTools.slice(0, 4));
  for (const [cat, label] of Object.entries(CATS)) {
    html += section(label, TOOLS.filter(t => t.cat === cat));
  }
  host.innerHTML = html;
  wireCards(host); iconsRefresh();
}

function openTool(id) {
  const t = byId(id); if (!t) return;
  play("click"); haptic("medium");
  recents = [id, ...recents.filter(x => x !== id)].slice(0, 8); store.set("tk_recents", recents);
  show("detail");
  $("#view-title").textContent = t.name;
  $("#detail-title").textContent = t.name;
  $("#detail-desc").textContent = t.sub;
  const favBtn = $("#btn-fav"); favBtn.classList.toggle("on", favorites.includes(id));
  favBtn.onclick = () => {
    const on = favorites.includes(id);
    favorites = on ? favorites.filter(x => x !== id) : [id, ...favorites];
    store.set("tk_favs", favorites); favBtn.classList.toggle("on", !on);
    play("click"); haptic(); toast(on ? "Removed from favorites" : "Added to favorites");
  };
  body().innerHTML = ""; t.render(body()); iconsRefresh(); window.scrollTo(0, 0);
}

$("#search").addEventListener("input", renderHome);
$("#btn-back").addEventListener("click", () => { play("click"); haptic(); renderHome(); });
$("#btn-settings").addEventListener("click", () => { play("click"); haptic(); renderSettings(); });

/* ---------- generic form helper ---------- */
function form(fieldsHTML, btnLabel, onRun, icon = "play") {
  body().innerHTML = `<div class="card">${fieldsHTML}
    <button class="btn" id="run-btn"><i data-lucide="${icon}"></i> ${esc(btnLabel)}</button>
    <div id="tool-status"></div><div id="tool-result" class="result"></div></div>`;
  $("#run-btn").addEventListener("click", async () => {
    play("click"); haptic();
    try { await onRun(); } catch (e) { setStatus("❌ " + esc(e.message || "Failed"), "err"); play("error"); }
  });
  iconsRefresh();
}
const rowsHTML = o => `<div class="rows">${Object.entries(o).map(([k, v]) => `<div class="row"><span class="k">${esc(k)}</span><span class="v">${v}</span></div>`).join("")}</div>`;
function resultCard(inner) { $("#tool-result").innerHTML = `<div class="card">${inner}</div>`; iconsRefresh(); }
function copyBtn(text, label = "Copy") { return `<button class="btn ghost sm" data-copy="${esc(text)}"><i data-lucide="copy"></i> ${label}</button>`; }
document.addEventListener("click", e => { const b = e.target.closest("[data-copy]"); if (b) copy(b.getAttribute("data-copy")); });

/* =========================================================================
   CLIENT TOOLS
   ========================================================================= */
function rPassword(c) {
  c.innerHTML = `<div class="card">
    <div class="big-out" id="pw">············</div>
    <p class="muted center" id="pw-meta"></p>
    <div class="field" style="margin-top:14px"><div class="slider-row"><input type="range" id="pwlen" min="6" max="48" value="18"><b id="pwlv">18</b></div></div>
    <div class="switch-row"><span>Uppercase A-Z</span><input type="checkbox" class="sw" id="pwup" checked></div>
    <div class="switch-row"><span>Numbers 0-9</span><input type="checkbox" class="sw" id="pwnum" checked></div>
    <div class="switch-row"><span>Symbols !@#</span><input type="checkbox" class="sw" id="pwsym" checked></div>
    <div class="btn-row" style="margin-top:14px"><button class="btn" id="pwgen"><i data-lucide="refresh-cw"></i> Generate</button><button class="btn ghost" id="pwcopy" style="flex:0 0 52px"><i data-lucide="copy"></i></button></div></div>`;
  const gen = () => {
    const len = +$("#pwlen").value; let pool = "abcdefghijklmnopqrstuvwxyz";
    if ($("#pwup").checked) pool += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if ($("#pwnum").checked) pool += "0123456789";
    if ($("#pwsym").checked) pool += "!@#$%^&*()-_=+[]{};:,.?";
    const a = new Uint32Array(len); crypto.getRandomValues(a);
    const pw = Array.from(a, n => pool[n % pool.length]).join("");
    $("#pw").textContent = pw; $("#pw-meta").textContent = `${len} chars · ~${Math.round(len * Math.log2(pool.length))} bits of entropy`;
  };
  $("#pwlen").addEventListener("input", e => { $("#pwlv").textContent = e.target.value; gen(); });
  ["pwup", "pwnum", "pwsym"].forEach(id => $("#" + id).addEventListener("change", gen));
  $("#pwgen").addEventListener("click", () => { haptic(); play("success"); gen(); });
  $("#pwcopy").addEventListener("click", () => copy($("#pw").textContent));
  gen();
}

function rQR(c) {
  form(`<div class="field"><label>Text or URL</label><input type="text" id="qrin" placeholder="https://…"></div>`, "Generate", () => {
    const v = $("#qrin").value.trim(); if (!v) return;
    $("#tool-result").innerHTML = `<div class="qr-out" id="qrout"></div>`;
    new QRCode($("#qrout"), { text: v, width: 230, height: 230, correctLevel: QRCode.CorrectLevel.H });
    play("success"); notify();
  }, "qr-code");
}

/* ---- hashing (SubtleCrypto + tiny MD5) ---- */
async function sha(algo, str) {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function md5(s){function rl(n,c){return(n<<c)|(n>>>(32-c))}function au(x,y){var l=(x&0xFFFF)+(y&0xFFFF),m=(x>>16)+(y>>16)+(l>>16);return(m<<16)|(l&0xFFFF)}function cmn(q,a,b,x,s,t){return au(rl(au(au(a,q),au(x,t)),s),b)}function ff(a,b,c,d,x,s,t){return cmn((b&c)|(~b&d),a,b,x,s,t)}function gg(a,b,c,d,x,s,t){return cmn((b&d)|(c&~d),a,b,x,s,t)}function hh(a,b,c,d,x,s,t){return cmn(b^c^d,a,b,x,s,t)}function ii(a,b,c,d,x,s,t){return cmn(c^(b|~d),a,b,x,s,t)}function tb(str){var n=str.length,b=[],i;for(i=0;i<n*8;i+=8)b[i>>5]|=(str.charCodeAt(i/8)&0xFF)<<(i%32);return b}var x=tb(unescape(encodeURIComponent(s))),len=s?unescape(encodeURIComponent(s)).length*8:0;x[len>>5]|=0x80<<(len%32);x[(((len+64)>>>9)<<4)+14]=len;var a=1732584193,b=-271733879,c=-1732584194,d=271733878,i;for(i=0;i<x.length;i+=16){var oa=a,ob=b,oc=c,od=d;a=ff(a,b,c,d,x[i],7,-680876936);d=ff(d,a,b,c,x[i+1],12,-389564586);c=ff(c,d,a,b,x[i+2],17,606105819);b=ff(b,c,d,a,x[i+3],22,-1044525330);a=ff(a,b,c,d,x[i+4],7,-176418897);d=ff(d,a,b,c,x[i+5],12,1200080426);c=ff(c,d,a,b,x[i+6],17,-1473231341);b=ff(b,c,d,a,x[i+7],22,-45705983);a=ff(a,b,c,d,x[i+8],7,1770035416);d=ff(d,a,b,c,x[i+9],12,-1958414417);c=ff(c,d,a,b,x[i+10],17,-42063);b=ff(b,c,d,a,x[i+11],22,-1990404162);a=ff(a,b,c,d,x[i+12],7,1804603682);d=ff(d,a,b,c,x[i+13],12,-40341101);c=ff(c,d,a,b,x[i+14],17,-1502002290);b=ff(b,c,d,a,x[i+15],22,1236535329);a=gg(a,b,c,d,x[i+1],5,-165796510);d=gg(d,a,b,c,x[i+6],9,-1069501632);c=gg(c,d,a,b,x[i+11],14,643717713);b=gg(b,c,d,a,x[i],20,-373897302);a=gg(a,b,c,d,x[i+5],5,-701558691);d=gg(d,a,b,c,x[i+10],9,38016083);c=gg(c,d,a,b,x[i+15],14,-660478335);b=gg(b,c,d,a,x[i+4],20,-405537848);a=gg(a,b,c,d,x[i+9],5,568446438);d=gg(d,a,b,c,x[i+14],9,-1019803690);c=gg(c,d,a,b,x[i+3],14,-187363961);b=gg(b,c,d,a,x[i+8],20,1163531501);a=gg(a,b,c,d,x[i+13],5,-1444681467);d=gg(d,a,b,c,x[i+2],9,-51403784);c=gg(c,d,a,b,x[i+7],14,1735328473);b=gg(b,c,d,a,x[i+12],20,-1926607734);a=hh(a,b,c,d,x[i+5],4,-378558);d=hh(d,a,b,c,x[i+8],11,-2022574463);c=hh(c,d,a,b,x[i+11],16,1839030562);b=hh(b,c,d,a,x[i+14],23,-35309556);a=hh(a,b,c,d,x[i+1],4,-1530992060);d=hh(d,a,b,c,x[i+4],11,1272893353);c=hh(c,d,a,b,x[i+7],16,-155497632);b=hh(b,c,d,a,x[i+10],23,-1094730640);a=hh(a,b,c,d,x[i+13],4,681279174);d=hh(d,a,b,c,x[i],11,-358537222);c=hh(c,d,a,b,x[i+3],16,-722521979);b=hh(b,c,d,a,x[i+6],23,76029189);a=hh(a,b,c,d,x[i+9],4,-640364487);d=hh(d,a,b,c,x[i+12],11,-421815835);c=hh(c,d,a,b,x[i+15],16,530742520);b=hh(b,c,d,a,x[i+2],23,-995338651);a=ii(a,b,c,d,x[i],6,-198630844);d=ii(d,a,b,c,x[i+7],10,1126891415);c=ii(c,d,a,b,x[i+14],15,-1416354905);b=ii(b,c,d,a,x[i+5],21,-57434055);a=ii(a,b,c,d,x[i+12],6,1700485571);d=ii(d,a,b,c,x[i+3],10,-1894986606);c=ii(c,d,a,b,x[i+10],15,-1051523);b=ii(b,c,d,a,x[i+1],21,-2054922799);a=ii(a,b,c,d,x[i+8],6,1873313359);d=ii(d,a,b,c,x[i+15],10,-30611744);c=ii(c,d,a,b,x[i+6],15,-1560198380);b=ii(b,c,d,a,x[i+13],21,1309151649);a=ii(a,b,c,d,x[i+4],6,-145523070);d=ii(d,a,b,c,x[i+11],10,-1120210379);c=ii(c,d,a,b,x[i+2],15,718787259);b=ii(b,c,d,a,x[i+9],21,-343485551);a=au(a,oa);b=au(b,ob);c=au(c,oc);d=au(d,od)}function rh(n){var s="",j;for(j=0;j<4;j++)s+=((n>>(j*8+4))&0x0F).toString(16)+((n>>(j*8))&0x0F).toString(16);return s}return rh(a)+rh(b)+rh(c)+rh(d)}

function rHashGen(c) {
  form(`<div class="field"><label>Text</label><textarea id="hgin" placeholder="Anything…"></textarea></div>`, "Hash", async () => {
    const v = $("#hgin").value;
    const [m, s1, s2, s5] = [md5(v), await sha("SHA-1", v), await sha("SHA-256", v), await sha("SHA-512", v)];
    resultCard(rowsHTML({
      MD5: `<span class="v mono">${m}</span>`, "SHA-1": `<span class="v mono">${s1}</span>`,
      "SHA-256": `<span class="v mono">${s2}</span>`, "SHA-512": `<span class="v mono" style="font-size:11px">${s5}</span>`,
    }) + `<div class="btn-row" style="margin-top:14px">${copyBtn(s2, "Copy SHA-256")}</div>`);
    play("success");
  }, "hash");
}
const COMMON_PW = ["123456","password","123456789","12345678","12345","qwerty","abc123","111111","1234567","iloveyou","admin","welcome","monkey","letmein","dragon","football","root","toor","qwerty123","password1","sunshine","princess"];
function rHashCrack(c) {
  form(`<div class="field"><label>Hash (MD5 / SHA-1 / SHA-256)</label><input type="text" class="mono" id="hcin" placeholder="5f4dcc3b5aa765d61d8327deb882cf99"></div>`, "Crack", async () => {
    const h = $("#hcin").value.trim().toLowerCase();
    const algo = { 32: "MD5", 40: "SHA-1", 64: "SHA-256" }[h.length];
    if (!algo || !/^[0-9a-f]+$/.test(h)) { setStatus("❌ Not a valid MD5/SHA-1/SHA-256 hash", "err"); return; }
    let found = null;
    for (const w of COMMON_PW) {
      const g = algo === "MD5" ? md5(w) : await sha(algo, w);
      if (g === h) { found = w; break; }
    }
    resultCard(rowsHTML({ Algorithm: algo, Result: found ? `<span class="pill ok">${esc(found)}</span>` : `<span class="pill warn">not in common list</span>` })
      + `<p class="muted" style="margin-top:10px">Small demo dictionary (${COMMON_PW.length} common passwords), not a real cracker.</p>`);
    play(found ? "success" : "error");
  }, "fingerprint");
}

function rDecision(c) {
  c.innerHTML = `<div class="card center"><div class="dice" id="dice">🎲</div><div class="btn-row"><button class="btn" id="dc">🪙 Coin</button><button class="btn ghost" id="dd">🎲 Dice</button></div></div>`;
  const run = async type => {
    haptic("medium"); const d = $("#dice");
    const faces = type === "coin" ? ["🌕", "🌑"] : ["⚀","⚁","⚂","⚃","⚄","⚅"];
    let dl = 55;
    for (let i = 0; i < 14; i++) { d.innerHTML = faces[Math.floor(Math.random() * faces.length)]; play(type); haptic("light"); await new Promise(r => setTimeout(r, dl)); dl += 18; }
    const res = type === "coin" ? (Math.random() < .5 ? "Heads" : "Tails") : (1 + Math.floor(Math.random() * 6));
    const f = type === "coin" ? (res === "Heads" ? "🌕" : "🌑") : faces[res - 1];
    d.innerHTML = `${f}<div class="res">${res}</div>`; notify(); play("success");
  };
  $("#dc").addEventListener("click", () => run("coin")); $("#dd").addEventListener("click", () => run("dice"));
}

/* ---- DEV ---- */
function rBase64(c) {
  form(`<div class="seg" id="b64seg"><button data-m="enc" class="active">Encode</button><button data-m="dec">Decode</button></div>
    <div class="field"><textarea id="b64in" class="mono" placeholder="Input…"></textarea></div>`, "Convert", () => {
    const m = $("#b64seg .active").dataset.m, v = $("#b64in").value;
    let out; try { out = m === "enc" ? btoa(unescape(encodeURIComponent(v))) : decodeURIComponent(escape(atob(v.trim()))); }
    catch (_) { setStatus("❌ Invalid Base64", "err"); return; }
    resultCard(`<div class="out-area">${esc(out)}</div><div class="btn-row" style="margin-top:12px">${copyBtn(out)}</div>`); play("success");
  }, "binary");
  segWire("b64seg");
}
function rJSON(c) {
  form(`<div class="field"><textarea id="jin" class="mono" placeholder='{"hello":"world"}'></textarea></div>
    <div class="seg" id="jseg"><button data-m="pretty" class="active">Pretty</button><button data-m="min">Minify</button></div>`, "Format", () => {
    let obj; try { obj = JSON.parse($("#jin").value); } catch (e) { setStatus("❌ " + esc(e.message), "err"); play("error"); return; }
    const m = $("#jseg .active").dataset.m;
    const out = m === "pretty" ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
    resultCard(`<span class="pill ok">valid</span><div class="out-area" style="margin-top:10px">${esc(out)}</div><div class="btn-row" style="margin-top:12px">${copyBtn(out)}</div>`); play("success");
  }, "braces");
  segWire("jseg");
}
function rJWT(c) {
  form(`<div class="field"><textarea id="jwtin" class="mono" placeholder="eyJhbGciOi…"></textarea></div>`, "Decode", () => {
    const parts = $("#jwtin").value.trim().split(".");
    if (parts.length < 2) { setStatus("❌ Not a JWT", "err"); return; }
    const dec = p => { try { return JSON.stringify(JSON.parse(decodeURIComponent(escape(atob(p.replace(/-/g,"+").replace(/_/g,"/"))))), null, 2); } catch (_) { return null; } };
    const head = dec(parts[0]), payload = dec(parts[1]);
    if (!payload) { setStatus("❌ Could not decode", "err"); return; }
    let exp = ""; try { const p = JSON.parse(payload); if (p.exp) { const d = new Date(p.exp * 1000); exp = `<p class="muted" style="margin-top:8px">Expires: ${d.toLocaleString()} ${d < new Date() ? '· <span class="pill err">expired</span>' : '· <span class="pill ok">valid</span>'}</p>`; } } catch (_) {}
    resultCard(`<label>Header</label><div class="out-area">${esc(head)}</div><label style="margin-top:12px">Payload</label><div class="out-area">${esc(payload)}</div>${exp}<p class="muted" style="margin-top:8px">Signature not verified (decoder only).</p>`); play("success");
  }, "shield-check");
}
function rUrlCode(c) {
  form(`<div class="seg" id="useg"><button data-m="enc" class="active">Encode</button><button data-m="dec">Decode</button></div>
    <div class="field"><textarea id="uin" class="mono" placeholder="Input…"></textarea></div>`, "Convert", () => {
    const m = $("#useg .active").dataset.m, v = $("#uin").value;
    let out; try { out = m === "enc" ? encodeURIComponent(v) : decodeURIComponent(v); } catch (_) { setStatus("❌ Invalid input", "err"); return; }
    resultCard(`<div class="out-area">${esc(out)}</div><div class="btn-row" style="margin-top:12px">${copyBtn(out)}</div>`); play("success");
  }, "link");
  segWire("useg");
}
function rTimestamp(c) {
  const now = Math.floor(Date.now() / 1000);
  form(`<div class="field"><label>Unix timestamp (seconds)</label><input type="text" class="mono" id="tsin" value="${now}"></div>`, "Convert", () => {
    let v = $("#tsin").value.trim(); let n = Number(v); if (v.length >= 13) n = n / 1000;
    if (!isFinite(n)) { setStatus("❌ Enter a number", "err"); return; }
    const d = new Date(n * 1000);
    resultCard(rowsHTML({ Local: d.toLocaleString(), UTC: d.toUTCString(), ISO: `<span class="v mono" style="font-size:12px">${d.toISOString()}</span>`, Relative: relTime(n * 1000) }));
    play("success");
  }, "clock");
  const box = document.createElement("div"); box.className = "card"; box.innerHTML = `<p class="muted center">Now: <b class="mono">${now}</b> ${copyBtn(String(now), "Copy")}</p>`; body().appendChild(box); iconsRefresh();
}
function relTime(ms) { const s = (ms - Date.now()) / 1000; const a = Math.abs(s); const u = a < 60 ? [s, "sec"] : a < 3600 ? [s / 60, "min"] : a < 86400 ? [s / 3600, "hour"] : [s / 86400, "day"]; return `${Math.round(Math.abs(u[0]))} ${u[1]}${Math.abs(u[0]) >= 2 ? "s" : ""} ${s < 0 ? "ago" : "from now"}`; }
function rUUID(c) {
  const gen = () => (crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, ch => { const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16; const v = ch === "x" ? r : (r & 0x3 | 0x8); return v.toString(16); }));
  c.innerHTML = `<div class="card"><div class="big-out" id="uout" style="font-size:16px"></div><div class="btn-row" style="margin-top:14px"><button class="btn" id="unew"><i data-lucide="refresh-cw"></i> New</button><button class="btn ghost" id="ucopy" style="flex:0 0 52px"><i data-lucide="copy"></i></button></div></div>`;
  const set = () => $("#uout").textContent = gen();
  $("#unew").addEventListener("click", () => { haptic(); play("success"); set(); });
  $("#ucopy").addEventListener("click", () => copy($("#uout").textContent));
  set();
}
function rColor(c) {
  form(`<div class="field"><label>Color (hex, rgb, or pick)</label><div style="display:flex;gap:10px"><input type="text" id="cin" placeholder="#3b82f6" value="#3b82f6"><input type="color" id="cpick" value="#3b82f6" style="width:52px;height:50px;padding:4px;border-radius:12px;border:1px solid var(--border);background:var(--bg-2)"></div></div>`, "Convert", () => doColor($("#cin").value));
  $("#cpick").addEventListener("input", e => { $("#cin").value = e.target.value; doColor(e.target.value); });
  function doColor(v) {
    const rgb = parseColor(v); if (!rgb) { setStatus("❌ Unrecognized color", "err"); return; }
    const [r, g, b] = rgb; const hex = "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
    const hsl = rgbToHsl(r, g, b);
    $("#cpick").value = hex;
    resultCard(`<div style="height:60px;border-radius:12px;background:${hex};border:1px solid var(--border);margin-bottom:12px"></div>` +
      rowsHTML({ HEX: `<span class="v mono">${hex}</span>`, RGB: `<span class="v mono">rgb(${r}, ${g}, ${b})</span>`, HSL: `<span class="v mono">hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)</span>` }));
    play("success");
  }
}
function parseColor(v) { v = v.trim(); let m = v.match(/^#?([0-9a-f]{6})$/i); if (m) { const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; } m = v.match(/^#?([0-9a-f]{3})$/i); if (m) return m[1].split("").map(x => parseInt(x + x, 16)); m = v.match(/rgba?\(([^)]+)\)/i); if (m) { const p = m[1].split(",").map(x => parseInt(x)); if (p.length >= 3) return p.slice(0, 3); } return null; }
function rgbToHsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0, l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]; }

/* ---- TEXT ---- */
function rText(c) {
  form(`<div class="field"><textarea id="txin" placeholder="Type something…"></textarea></div>
    <div class="seg" id="txseg"><button data-m="fancy" class="active">Fancy</button><button data-m="zalgo">Zalgo</button><button data-m="flip">Flip</button><button data-m="leet">Leet</button></div>`, "Transform", () => {
    const m = $("#txseg .active").dataset.m, s = $("#txin").value;
    const out = ({ fancy: toFancy, zalgo: toZalgo, flip: toFlip, leet: toLeet })[m](s);
    resultCard(`<div class="out-area">${esc(out)}</div><div class="btn-row" style="margin-top:12px">${copyBtn(out)}</div>`); play("success");
  }, "sparkles");
  segWire("txseg");
}
const toFancy = s => s.replace(/[a-zA-Z]/g, c => { const u = c <= "Z"; return String.fromCodePoint(0x1d5d4 + (u ? 0 : 26) + (c.toLowerCase().charCodeAt(0) - 97)); });
const toFlip = s => { const m = "abcdefghijklmnopqrstuvwxyz".split("").reduce((o, ch, i) => (o[ch] = "ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz"[i], o), {}); return s.toLowerCase().split("").map(c => m[c] || c).reverse().join(""); };
const toLeet = s => s.replace(/[aeiostlAEIOSTL]/g, c => ({ a: "4", e: "3", i: "1", o: "0", s: "5", t: "7", l: "1" }[c.toLowerCase()] || c));
const toZalgo = s => { const mk = [..."̍̎̄̅̿̑̆̐͒͗̕"]; return s.split("").map(c => c + Array.from({ length: 3 }, () => mk[Math.floor(Math.random() * mk.length)]).join("")).join(""); };
function rMorse(c) {
  form(`<div class="field"><label>Text or Morse</label><textarea id="min" placeholder="hello / .... . .-.. .-.. ---"></textarea></div>`, "Translate", () => {
    const v = $("#min").value.trim(); let out;
    if (/^[.\-/\s]+$/.test(v)) out = v.split(" ").map(x => MR[x] ?? (x === "/" ? " " : "")).join("");
    else out = v.toUpperCase().split("").map(ch => M[ch] ?? "").join(" ");
    resultCard(`<div class="out-area">${esc(out) || "—"}</div><div class="btn-row" style="margin-top:12px">${copyBtn(out)}</div>`); play("success");
  }, "arrow-right-left");
}
const M = { A:".-",B:"-...",C:"-.-.",D:"-..",E:".",F:"..-.",G:"--.",H:"....",I:"..",J:".---",K:"-.-",L:".-..",M:"--",N:"-.",O:"---",P:".--.",Q:"--.-",R:".-.",S:"...",T:"-",U:"..-",V:"...-",W:".--",X:"-..-",Y:"-.--",Z:"--..","0":"-----","1":".----","2":"..---","3":"...--","4":"....-","5":".....","6":"-....","7":"--...","8":"---..","9":"----.",".":".-.-.-",",":"--..--","?":"..--..","!":"-.-.--","/":"-..-."," ":"/" };
const MR = Object.fromEntries(Object.entries(M).map(([k, v]) => [v, k]));
function rCase(c) {
  form(`<div class="field"><textarea id="cin2" placeholder="Some Text Here"></textarea></div>
    <div class="seg" id="cseg"><button data-m="upper" class="active">UPPER</button><button data-m="lower">lower</button><button data-m="title">Title</button><button data-m="camel">camel</button><button data-m="snake">snake</button><button data-m="kebab">kebab</button></div>`, "Convert", () => {
    const m = $("#cseg .active").dataset.m, s = $("#cin2").value;
    const words = s.trim().split(/\s+/);
    const out = { upper: s.toUpperCase(), lower: s.toLowerCase(),
      title: s.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()),
      camel: words.map((w, i) => i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()).join(""),
      snake: words.map(w => w.toLowerCase()).join("_"), kebab: words.map(w => w.toLowerCase()).join("-") }[m];
    resultCard(`<div class="out-area">${esc(out)}</div><div class="btn-row" style="margin-top:12px">${copyBtn(out)}</div>`); play("success");
  }, "case-sensitive");
  segWire("cseg");
}
function rCounter(c) {
  c.innerHTML = `<div class="card"><div class="field"><textarea id="ctin" placeholder="Paste or type text…" style="min-height:140px"></textarea></div><div id="ctres"></div></div>`;
  const upd = () => { const s = $("#ctin").value; const words = s.trim() ? s.trim().split(/\s+/).length : 0;
    $("#ctres").innerHTML = rowsHTML({ Characters: s.length, "Characters (no spaces)": s.replace(/\s/g, "").length, Words: words, Lines: s ? s.split(/\n/).length : 0 }); };
  $("#ctin").addEventListener("input", upd); upd();
}

function segWire(id) { const seg = $("#" + id); seg.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { seg.querySelector(".active").classList.remove("active"); b.classList.add("active"); play("click"); haptic(); })); }

/* client subnet calc */
function rSubnet(c) {
  form(`<div class="field"><label>IP / CIDR</label><input type="text" class="mono" id="snin" placeholder="192.168.1.0/24"></div>`, "Calculate", () => {
    const r = subnetCalc($("#snin").value.trim());
    if (!r) { setStatus("❌ Enter a valid IPv4 CIDR, e.g. 10.0.0.0/24", "err"); play("error"); return; }
    resultCard(rowsHTML({ Network: `<span class="v mono">${r.network}</span>`, Netmask: `<span class="v mono">${r.mask}</span>`, Broadcast: `<span class="v mono">${r.broadcast}</span>`, "First host": `<span class="v mono">${r.first}</span>`, "Last host": `<span class="v mono">${r.last}</span>`, "Usable hosts": r.usable.toLocaleString(), Total: r.total.toLocaleString() })); play("success");
  }, "network");
}
function subnetCalc(s) {
  const m = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/); if (!m) return null;
  const o = m.slice(1, 5).map(Number), p = +m[5]; if (o.some(x => x > 255) || p > 32) return null;
  const ip = (o[0] << 24 | o[1] << 16 | o[2] << 8 | o[3]) >>> 0;
  const mask = p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0;
  const net = (ip & mask) >>> 0, bc = (net | (~mask >>> 0)) >>> 0, total = Math.pow(2, 32 - p);
  const fmt = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
  return { network: fmt(net), mask: fmt(mask), broadcast: fmt(bc), first: fmt(p >= 31 ? net : net + 1), last: fmt(p >= 31 ? bc : bc - 1), usable: p >= 31 ? total : Math.max(total - 2, 0), total };
}
/* client dork builder */
function rDork(c) {
  form(`<div class="field"><label>Domain</label><input type="text" id="dkin" placeholder="example.com"></div>
    <div class="field"><label>Type</label><select id="dkkind"><option value="files">Documents</option><option value="login">Login pages</option><option value="directory">Open directories</option><option value="subdomains">Subdomains</option><option value="config">Config files</option></select></div>`, "Build", () => {
    const d = $("#dkin").value.trim().toLowerCase(); if (!d) { setStatus("❌ Enter a domain", "err"); return; }
    const t = { files: `site:${d} (filetype:pdf OR filetype:docx OR filetype:xlsx)`, login: `site:${d} (inurl:login OR inurl:admin)`, directory: `site:${d} intitle:"index of"`, subdomains: `site:*.${d} -www`, config: `site:${d} (ext:env OR ext:ini OR ext:conf OR ext:bak)` }[$("#dkkind").value];
    resultCard(`<div class="out-area">${esc(t)}</div><div class="btn-row" style="margin-top:12px"><a class="btn sm" href="https://www.google.com/search?q=${encodeURIComponent(t)}" target="_blank"><i data-lucide="external-link"></i> Search</a>${copyBtn(t)}</div>`); play("success");
  }, "search");
}

/* =========================================================================
   SERVER TOOLS
   ========================================================================= */
function serverRun(statusMsg, fn) { setStatus(spin() + " " + statusMsg); return fn(); }

function rVault(c) {
  let file = null;
  c.innerHTML = `<div class="card">
    <div class="upload" id="vdrop"><i data-lucide="file-up"></i><div id="vname">Choose a file</div></div>
    <input type="file" id="vfile" hidden>
    <div class="field" style="margin-top:14px"><input type="password" id="vpw" placeholder="Password"></div>
    <div class="btn-row"><button class="btn" id="venc"><i data-lucide="lock"></i> Encrypt</button><button class="btn ghost" id="vdec"><i data-lucide="unlock"></i> Decrypt</button></div>
    <div id="tool-status"></div><p class="muted" style="margin-top:12px">Runs entirely in your browser — file & password never leave your device.</p></div>`;
  $("#vdrop").onclick = () => $("#vfile").click();
  $("#vfile").onchange = e => { file = e.target.files[0]; if (file) { $("#vname").textContent = file.name; $("#vdrop").classList.add("active"); play("success"); } };
  const run = async mode => {
    if (!file) return setStatus("Pick a file first", "err"); const pw = $("#vpw").value; if (!pw) return setStatus("Enter a password", "err");
    setStatus(spin() + " Working…");
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const out = mode === "enc" ? await vEnc(buf, pw) : await vDec(buf, pw);
      const name = mode === "enc" ? file.name + ".vault" : file.name.replace(/\.vault$/, "") || "decrypted";
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([out])); a.download = name; a.click();
      setStatus("✅ Saved " + esc(name), "ok"); play("success"); notify(); toast("Saved " + name, "ok");
    } catch (_) { setStatus("❌ " + (mode === "dec" ? "Wrong password or corrupt file" : "Failed"), "err"); play("error"); }
  };
  $("#venc").onclick = () => run("enc"); $("#vdec").onclick = () => run("dec"); iconsRefresh();
}
async function vKey(pw, salt) { const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]); return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 200000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]); }
async function vEnc(data, pw) { const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await vKey(pw, salt), data)); const out = new Uint8Array(28 + ct.length); out.set(salt); out.set(iv, 16); out.set(ct, 28); return out; }
async function vDec(data, pw) { return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: data.slice(16, 28) }, await vKey(pw, data.slice(0, 16)), data.slice(28))); }

function rTTS(c) {
  form(`<div class="field"><textarea id="ttsin" placeholder="Text to speak…"></textarea></div>
    <div class="field"><select id="ttslang"><option value="en">English</option><option value="ro">Română</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option></select></div>`, "Speak in chat", async () => {
    await serverRun("Generating…", async () => {
      const d = await api("tts", { text: $("#ttsin").value, lang: $("#ttslang").value });
      if (d.success) { setStatus("✅ Sent to your chat", "ok"); play("success"); notify(); toast("Sent to chat", "ok"); }
      else setStatus("❌ " + esc(d.error || "Failed"), "err");
    });
  }, "mic");
}
function rPortscan(c) {
  form(`<div class="field"><label>Host or IP</label><input type="text" class="mono" id="psin" placeholder="example.com"></div>`, "Scan", async () => {
    await serverRun("Scanning…", async () => {
      const d = await api("portscan", { target: $("#psin").value });
      if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus(`${d.open_count} open`, d.open_count ? "ok" : "");
      resultCard(d.ports.map(p => `<div class="row"><span class="k">${p.port} · ${esc(p.service)}</span><span class="v">${p.open ? '<span class="pill ok">open</span>' : '<span class="pill err">closed</span>'}</span></div>`).join("").replace(/^/, '<div class="rows">') + "</div>"); play("success");
    });
  }, "scan-search");
}
function rDomain(c) {
  form(`<div class="field"><label>Domain</label><input type="text" class="mono" id="dmin" placeholder="example.com"></div>`, "Lookup", async () => {
    await serverRun("Querying DNS…", async () => {
      const d = await api("domain", { domain: $("#dmin").value }); if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus(""); const dns = d.dns || {}, w = d.whois;
      let html = rowsHTML({ A: esc((dns.A || []).join(", ") || "—"), AAAA: esc((dns.AAAA || []).join(", ") || "—"), MX: esc((dns.MX || []).join(", ") || "—"), NS: esc((dns.NS || []).join(", ") || "—") });
      if (w) html += `</div></div><div class="card"><div class="rows">` + Object.entries({ Registrar: w.registrar, Status: w.status, Created: w.created, Expires: w.expires }).map(([k, v]) => `<div class="row"><span class="k">${k}</span><span class="v">${esc(v)}</span></div>`).join("");
      resultCard(html); play("success");
    });
  }, "globe");
}
function rIP(c) {
  form(`<div class="field"><label>IP (blank = server's view)</label><input type="text" class="mono" id="ipin" placeholder="8.8.8.8"></div>`, "Lookup", async () => {
    await serverRun("Looking up…", async () => {
      const d = await api("ipinfo", { ip: $("#ipin").value }); if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus(""); resultCard(rowsHTML({ IP: `<span class="v mono">${esc(d.query)}</span>`, Location: esc([d.city, d.regionName, d.country].filter(Boolean).join(", ")), ISP: esc(d.isp), ASN: esc(d.as), Timezone: esc(d.timezone) })); play("success");
    });
  }, "map-pin");
}
function rInspect(c) {
  form(`<div class="field"><label>URL</label><input type="text" class="mono" id="inin" placeholder="https://…"></div>`, "Inspect", async () => {
    await serverRun("Fetching…", async () => {
      const d = await api("inspect", { url: $("#inin").value }); if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus(""); resultCard(rowsHTML({ "Final URL": `<span class="v mono" style="font-size:12px">${esc(d.final_url)}</span>`, Status: `${d.status} ${d.secure ? '<span class="pill ok">secure</span>' : '<span class="pill warn">insecure</span>'}`, IP: `<span class="v mono">${esc(d.ip)}</span>`, Server: esc(d.server), Title: esc(d.title || "—") })); play("success");
    });
  }, "search-code");
}
function rPhone(c) {
  form(`<div class="field"><label>Phone (with +country code)</label><input type="tel" class="mono" id="phin" placeholder="+1 415 555 2671"></div>`, "Lookup", async () => {
    await serverRun("Looking up…", async () => {
      const d = await api("phone", { number: $("#phin").value }); if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus(""); resultCard(rowsHTML({ Number: `<span class="v mono">${esc(d.formatted)}</span>`, Region: esc(d.region), Carrier: esc(d.carrier), Timezone: esc(d.timezone), Type: esc(d.line_type) })); play("success");
    });
  }, "phone");
}
function rUsername(c) {
  form(`<div class="field"><label>Username</label><input type="text" id="unin" placeholder="octocat"></div>`, "Check", async () => {
    await serverRun("Checking platforms…", async () => {
      const d = await api("username", { username: $("#unin").value }); if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus(""); const pill = s => s === "likely_taken" ? '<span class="pill ok">found</span>' : s === "available" ? '<span class="pill warn">free</span>' : '<span class="pill info">?</span>';
      resultCard(`<div class="rows">` + d.results.map(r => `<div class="row"><span class="k"><a href="${esc(r.url)}" target="_blank">${esc(r.platform)}</a></span><span class="v">${pill(r.state)}</span></div>`).join("") + `</div><p class="muted" style="margin-top:10px">${esc(d.note)}</p>`); play("success");
    });
  }, "users");
}
function rBreach(c) {
  form(`<div class="field"><label>Email</label><input type="email" class="mono" id="brin" placeholder="you@example.com"></div>`, "Check", async () => {
    await serverRun("Querying HIBP…", async () => {
      const d = await api("breach", { email: $("#brin").value }); if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus(""); if (!d.breaches.length) { resultCard(`<p class="status ok">✅ No known breaches</p>`); play("success"); return; }
      resultCard(`<p class="status err">🚨 Found in ${d.breaches.length} breaches</p><div class="rows">` + d.breaches.map(b => `<div class="row"><span class="k">${esc(b.name)}</span><span class="v">${esc(b.date || "")}</span></div>`).join("") + `</div>`); play("error"); notify("warning");
    });
  }, "shield-alert");
}
function rTgProfile(c) {
  form(`<div class="field"><label>Telegram username</label><input type="text" id="tpin" placeholder="@durov"></div>`, "Lookup", async () => {
    await serverRun("Fetching…", async () => {
      const d = await api("tgprofile", { username: $("#tpin").value }); if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus(""); resultCard(`<div class="center">${d.photo ? `<img src="${esc(d.photo)}" style="width:84px;height:84px;border-radius:50%;object-fit:cover">` : ""}<h3 style="margin:10px 0 2px">${esc(d.display_name)}</h3><p class="muted">${esc(d.username)}</p><p style="margin-top:10px">${esc(d.description)}</p>${d.extra ? `<p class="muted" style="margin-top:8px">${esc(d.extra)}</p>` : ""}</div>`); play("success");
    });
  }, "send");
}
function rDownload(c) {
  c.innerHTML = `<div class="card"><div class="field"><label>Video / post URL</label><input type="text" class="mono" id="dlin" placeholder="https://youtube.com/watch?v=…"></div>
    <button class="btn" id="dlbtn"><i data-lucide="download"></i> Fetch</button><div id="tool-status"></div><div id="tool-result" class="result"></div>
    <p class="muted" style="margin-top:12px">Works with YouTube, Instagram, TikTok and more. Only download content you have rights to.</p></div>`;
  $("#dlbtn").onclick = async () => {
    play("click"); haptic(); setStatus(spin() + " Resolving…");
    try { const d = await api("media", { url: $("#dlin").value }); if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus(""); resultCard(`${d.thumbnail ? `<img src="${esc(d.thumbnail)}" class="thumb">` : ""}<div class="v" style="text-align:left">${esc(d.title)}</div><a class="btn" style="margin-top:12px" href="${esc(d.url)}" target="_blank" download><i data-lucide="download"></i> Open / Save</a>`); play("success"); notify();
    } catch (e) { setStatus("❌ " + esc(e.message), "err"); play("error"); }
  }; iconsRefresh();
}
function rExif(c) {
  let file = null;
  c.innerHTML = `<div class="card"><div class="upload" id="exdrop"><i data-lucide="image-up"></i><div id="exname">Choose a photo</div></div><input type="file" id="exfile" accept="image/*" hidden><button class="btn" id="exbtn" style="margin-top:14px"><i data-lucide="eraser"></i> Strip metadata</button><div id="tool-status"></div><p class="muted" style="margin-top:12px">The cleaned copy is sent to your Telegram chat.</p></div>`;
  $("#exdrop").onclick = () => $("#exfile").click();
  $("#exfile").onchange = e => { file = e.target.files[0]; if (file) { $("#exname").textContent = file.name; $("#exdrop").classList.add("active"); play("success"); } };
  $("#exbtn").onclick = async () => {
    if (!file) return setStatus("Pick an image first", "err"); play("click"); haptic(); setStatus(spin() + " Working…");
    const fd = new FormData(); fd.append("initData", INIT_DATA); fd.append("file", file);
    try { const r = await fetch("/api/exif", { method: "POST", body: fd }); const d = await r.json();
      if (d.success) { setStatus("✅ Sent to your chat", "ok"); play("success"); notify(); toast("Sent to chat", "ok"); } else setStatus("❌ " + esc(d.error || "Failed"), "err");
    } catch (e) { setStatus("❌ " + esc(e.message), "err"); play("error"); }
  }; iconsRefresh();
}

/* =========================================================================
   SETTINGS
   ========================================================================= */
function renderSettings() {
  show("settings"); $("#view-title").textContent = "Settings";
  const v = $("#settings-view");
  v.innerHTML = `<div style="margin:6px 0 18px"></div>
    <div class="group">
      <div class="switch-row"><span>Sound effects</span><input type="checkbox" class="sw" id="setsound" ${soundOn ? "checked" : ""}></div>
    </div>
    <div class="group">
      <div class="list-row" id="setclearfav"><span>Clear favorites</span><i data-lucide="star-off"></i></div>
      <div class="list-row" id="setclearrec"><span>Clear recents</span><i data-lucide="history"></i></div>
    </div>
    <div class="group"><div class="list-row" id="setclose"><span style="color:var(--err)">Close app</span><i data-lucide="log-out"></i></div></div>
    <p class="foot">Toolkit v4 ${USER ? "· " + esc(USER.first_name) : ""}<br>self-hosted · ${TOOLS.length} tools</p>`;
  $("#setsound").onchange = e => { soundOn = e.target.checked; store.set("tk_sound", soundOn); if (soundOn) play("click"); };
  $("#setclearfav").onclick = () => { favorites = []; store.set("tk_favs", []); toast("Favorites cleared"); haptic(); };
  $("#setclearrec").onclick = () => { recents = []; store.set("tk_recents", []); toast("Recents cleared"); haptic(); };
  $("#setclose").onclick = () => { try { tg?.close(); } catch (_) {} };
  iconsRefresh();
}

/* ---------- boot ---------- */
function applyTheme() { document.body.classList.toggle("dark", tg?.colorScheme === "dark"); }
applyTheme(); tg?.onEvent?.("themeChanged", applyTheme);
renderHome();
if ("serviceWorker" in navigator) { navigator.serviceWorker.register("sw.js").catch(() => {}); }
