/* Toolkit Mini App — talks to the consolidated backend over /api/*.
 * Every API call carries Telegram initData so the server can verify the user. */

const tg = window.Telegram?.WebApp;
try { tg?.ready(); tg?.expand(); } catch (_) {}
const INIT_DATA = tg?.initData || "";
const CHAT_USER = tg?.initDataUnsafe?.user || null;

let lang = localStorage.getItem("tk_lang") || (tg?.initDataUnsafe?.user?.language_code === "ro" ? "ro" : "en");
let soundOn = localStorage.getItem("tk_sound") !== "0";

/* ---------------- i18n ---------------- */
const STR = {
  en: { tools: "Tools", network: "Network", media: "Media", settings: "Settings",
        run: "Run", generate: "Generate", copy: "Copy", copied: "Copied!",
        sentChat: "Sent to your chat", failed: "Something went wrong",
        working: "Working…", openInTelegram: "Open this app inside Telegram to use it." },
  ro: { tools: "Unelte", network: "Rețea", media: "Media", settings: "Setări",
        run: "Pornește", generate: "Generează", copy: "Copiază", copied: "Copiat!",
        sentChat: "Trimis în chat", failed: "Ceva n-a mers",
        working: "Se lucrează…", openInTelegram: "Deschide aplicația în Telegram." },
};
const T = (k) => (STR[lang][k] ?? STR.en[k] ?? k);

/* ---------------- sound + haptics ---------------- */
const SFX = {};
["click", "success", "error", "coin", "dice"].forEach((n) => {
  SFX[n] = new Audio(`assets/sfx/${n}.wav`);
});
function play(n) { if (!soundOn) return; try { const a = SFX[n]?.cloneNode(); if (a) { a.volume = 0.4; a.play().catch(() => {}); } } catch (_) {} }
function haptic(kind = "light") { try { tg?.HapticFeedback?.impactOccurred(kind); } catch (_) {} }
function notify(kind = "success") { try { tg?.HapticFeedback?.notificationOccurred(kind); } catch (_) {} }

/* ---------------- API ---------------- */
async function api(path, body) {
  const r = await fetch(`/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Init-Data": INIT_DATA },
    body: JSON.stringify(body || {}),
  });
  if (r.status === 401) throw new Error(T("openInTelegram"));
  return r.json();
}

/* ---------------- tiny DOM helpers ---------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const body = () => $("#detail-body");
function setStatus(html, cls = "") { const s = $("#tool-status"); if (s) { s.className = "status " + cls; s.innerHTML = html; } }
function spinner() { return `<span class="spinner"></span>`; }
function copyText(txt) { try { navigator.clipboard.writeText(txt); } catch (_) {} play("success"); notify(); }
function esc(s) { return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

/* ======================================================================= *
 *  TOOL REGISTRY
 * ======================================================================= */
const TOOLS = [
  /* ---------- TOOLS tab ---------- */
  { id: "password", tab: "tools", icon: "key-round",
    name: { en: "Password", ro: "Parole" },
    desc: { en: "Generate strong passwords with a secure RNG.", ro: "Parole puternice cu RNG securizat." },
    render: renderPassword },
  { id: "vault", tab: "tools", icon: "lock",
    name: { en: "Secure Vault", ro: "Seif Securizat" },
    desc: { en: "Encrypt files in your browser (AES-256-GCM).", ro: "Criptează fișiere local (AES-256-GCM)." },
    render: renderVault },
  { id: "morse", tab: "tools", icon: "radio",
    name: { en: "Morse", ro: "Morse" },
    desc: { en: "Translate text ⇄ Morse code.", ro: "Text ⇄ cod Morse." },
    render: renderMorse },
  { id: "text", tab: "tools", icon: "type",
    name: { en: "Text Utils", ro: "Text Utils" },
    desc: { en: "Fancy, Zalgo, flip and leetspeak transforms.", ro: "Stiluri, Zalgo, întors, leetspeak." },
    render: renderText },
  { id: "qr", tab: "tools", icon: "qr-code",
    name: { en: "QR Code", ro: "Cod QR" },
    desc: { en: "Turn any text or link into a QR code.", ro: "Transformă text/link în cod QR." },
    render: renderQR },
  { id: "hash", tab: "tools", icon: "fingerprint",
    name: { en: "Hash Cracker", ro: "Hash Cracker" },
    desc: { en: "Identify and test hashes against common passwords.", ro: "Testează hash-uri cu parole comune." },
    render: renderHash },
  { id: "decision", tab: "tools", icon: "dices",
    name: { en: "Decision", ro: "Decizii" },
    desc: { en: "Flip a coin or roll a die.", ro: "Dă cu banul sau zarul." },
    render: renderDecision },
  { id: "tts", tab: "tools", icon: "mic",
    name: { en: "Text to Speech", ro: "Text în Voce" },
    desc: { en: "Get a voice message of any text in your chat.", ro: "Primește un mesaj vocal în chat." },
    render: renderTTS },

  /* ---------- NETWORK tab ---------- */
  { id: "subnet", tab: "network", icon: "network",
    name: { en: "Subnet Calc", ro: "Calc. Subnet" },
    desc: { en: "IPv4/IPv6 CIDR breakdown.", ro: "Detalii CIDR IPv4/IPv6." },
    render: renderSubnet },
  { id: "portscan", tab: "network", icon: "scan-search",
    name: { en: "Port Probe", ro: "Scan Porturi" },
    desc: { en: "Check which common ports are open on a host.", ro: "Verifică porturi comune deschise." },
    render: renderPortscan },
  { id: "domain", tab: "network", icon: "globe",
    name: { en: "Domain Info", ro: "Info Domeniu" },
    desc: { en: "DNS records and WHOIS/RDAP details.", ro: "Înregistrări DNS și WHOIS/RDAP." },
    render: renderDomain },
  { id: "ipinfo", tab: "network", icon: "map-pin",
    name: { en: "IP Info", ro: "Info IP" },
    desc: { en: "Geolocation and ASN for any IP.", ro: "Geolocație și ASN pentru orice IP." },
    render: renderIP },
  { id: "inspect", tab: "network", icon: "search-code",
    name: { en: "URL Inspector", ro: "Inspector URL" },
    desc: { en: "Final URL, status, server and IP.", ro: "URL final, status, server și IP." },
    render: renderInspect },
  { id: "phone", tab: "network", icon: "phone",
    name: { en: "Phone Lookup", ro: "Căutare Telefon" },
    desc: { en: "Carrier, region and timezone metadata.", ro: "Operator, regiune, fus orar." },
    render: renderPhone },
  { id: "username", tab: "network", icon: "users",
    name: { en: "Username Check", ro: "Caută Utilizator" },
    desc: { en: "Heuristic check across public platforms.", ro: "Verificare pe platforme publice." },
    render: renderUsername },
  { id: "dork", tab: "network", icon: "search",
    name: { en: "Dork Builder", ro: "Generator Dork" },
    desc: { en: "Build Google recon search queries.", ro: "Interogări Google de recon." },
    render: renderDork },
  { id: "breach", tab: "network", icon: "shield-alert",
    name: { en: "Breach Check", ro: "Verificare Leak" },
    desc: { en: "Check an email via Have I Been Pwned.", ro: "Verifică email prin HIBP." },
    render: renderBreach },
  { id: "tgprofile", tab: "network", icon: "send",
    name: { en: "Telegram Profile", ro: "Profil Telegram" },
    desc: { en: "Read a public t.me profile preview.", ro: "Citește un profil public t.me." },
    render: renderTgProfile },

  /* ---------- MEDIA tab ---------- */
  { id: "download", tab: "media", icon: "download",
    name: { en: "Downloader", ro: "Descărcări" },
    desc: { en: "Grab video from YouTube, Instagram, TikTok.", ro: "Descarcă de pe YouTube, Instagram, TikTok." },
    render: renderDownload },
  { id: "exif", tab: "media", icon: "image-off",
    name: { en: "EXIF Stripper", ro: "Șterge EXIF" },
    desc: { en: "Remove hidden metadata from photos.", ro: "Elimină metadatele din poze." },
    render: renderExif },
];

/* ======================================================================= *
 *  NAVIGATION
 * ======================================================================= */
let currentTab = "tools";

function renderGrid(tab) {
  currentTab = tab;
  $("#view-title").textContent = T(tab);
  $("#grid-view").classList.remove("hidden");
  $("#detail-view").classList.add("hidden");
  $("#settings-view").classList.add("hidden");
  const grid = $("#tool-grid");
  grid.innerHTML = TOOLS.filter((x) => x.tab === tab).map((x) => `
    <button class="tool-card" data-tool="${x.id}">
      <span class="ico"><i data-lucide="${x.icon}"></i></span>
      <span class="name">${esc(x.name[lang] || x.name.en)}</span>
      <span class="sub">${esc(x.desc[lang] || x.desc.en)}</span>
    </button>`).join("");
  grid.querySelectorAll(".tool-card").forEach((b) =>
    b.addEventListener("click", () => openTool(b.dataset.tool)));
  lucide.createIcons();
}

function openTool(id) {
  play("click"); haptic("medium");
  const tool = TOOLS.find((x) => x.id === id);
  if (!tool) return;
  $("#grid-view").classList.add("hidden");
  $("#settings-view").classList.add("hidden");
  $("#detail-view").classList.remove("hidden");
  $("#detail-title").textContent = tool.name[lang] || tool.name.en;
  $("#detail-desc").textContent = tool.desc[lang] || tool.desc.en;
  body().innerHTML = "";
  tool.render(body());
  lucide.createIcons();
  window.scrollTo(0, 0);
}

function setActiveTab(tab) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
}

document.querySelectorAll(".tab").forEach((t) =>
  t.addEventListener("click", () => {
    play("click"); haptic();
    const tab = t.dataset.tab;
    setActiveTab(tab);
    if (tab === "settings") renderSettings();
    else renderGrid(tab);
  }));

$("#back-btn").addEventListener("click", () => {
  play("click"); haptic();
  if (currentTab === "settings") renderSettings(); else renderGrid(currentTab);
});

/* ======================================================================= *
 *  SHARED FORM BUILDER
 * ======================================================================= */
function form(fields, buttonLabel, onRun, { icon = "play" } = {}) {
  const html = `<div class="card">
    ${fields}
    <button class="btn" id="run-btn"><i data-lucide="${icon}"></i> ${esc(buttonLabel)}</button>
    <div id="tool-status"></div>
    <div id="tool-result" class="result"></div>
  </div>`;
  body().innerHTML = html;
  $("#run-btn").addEventListener("click", async () => {
    play("click"); haptic();
    try { await onRun(); } catch (e) { setStatus(esc(e.message || T("failed")), "err"); play("error"); }
  });
  lucide.createIcons();
}
function rows(obj) {
  return Object.entries(obj).map(([k, v]) =>
    `<div class="row"><span class="k">${esc(k)}</span><span class="v">${v}</span></div>`).join("");
}

/* ======================================================================= *
 *  TOOL RENDERERS — client-side
 * ======================================================================= */
function renderPassword(c) {
  c.innerHTML = `<div class="card">
    <div class="result-code" id="pw">••••••••••••</div>
    <p class="muted" id="pw-meta" style="text-align:center"></p>
    <div class="field" style="margin-top:16px">
      <div class="slider-row"><input type="range" id="pw-len" min="6" max="48" value="16"><b id="pw-lv">16</b></div>
    </div>
    <div class="switch-row"><span>A-Z</span><input type="checkbox" id="pw-up" checked></div>
    <div class="switch-row"><span>0-9</span><input type="checkbox" id="pw-num" checked></div>
    <div class="switch-row"><span>!@#$</span><input type="checkbox" id="pw-sym" checked></div>
    <div class="btn-row" style="margin-top:14px">
      <button class="btn" id="pw-gen"><i data-lucide="refresh-cw"></i> ${T("generate")}</button>
      <button class="btn secondary" id="pw-copy"><i data-lucide="copy"></i></button>
    </div></div>`;
  const gen = () => {
    const len = +$("#pw-len").value;
    let pool = "abcdefghijklmnopqrstuvwxyz";
    if ($("#pw-up").checked) pool += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if ($("#pw-num").checked) pool += "0123456789";
    if ($("#pw-sym").checked) pool += "!@#$%^&*()-_=+[]{};:,.?";
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    const pw = Array.from(arr, (n) => pool[n % pool.length]).join("");
    $("#pw").textContent = pw;
    $("#pw-meta").textContent = `${len} chars · ~${Math.round(len * Math.log2(pool.length))} bits`;
    play("success");
  };
  $("#pw-len").addEventListener("input", (e) => { $("#pw-lv").textContent = e.target.value; gen(); });
  ["pw-up", "pw-num", "pw-sym"].forEach((id) => $("#" + id).addEventListener("change", gen));
  $("#pw-gen").addEventListener("click", () => { haptic(); gen(); });
  $("#pw-copy").addEventListener("click", () => copyText($("#pw").textContent));
  gen();
}

function renderVault(c) {
  let file = null;
  c.innerHTML = `<div class="card">
    <div class="upload" id="vault-drop"><i data-lucide="file-up"></i><div id="vault-name">Choose a file</div></div>
    <input type="file" id="vault-file" hidden>
    <div class="field" style="margin-top:14px"><input type="password" id="vault-pw" placeholder="Password"></div>
    <div class="btn-row">
      <button class="btn" id="vault-enc"><i data-lucide="lock"></i> Encrypt</button>
      <button class="btn secondary" id="vault-dec"><i data-lucide="unlock"></i> Decrypt</button>
    </div>
    <div id="tool-status"></div>
    <p class="muted" style="margin-top:12px">Everything happens in your browser. The file and password never leave your device.</p>
  </div>`;
  $("#vault-drop").addEventListener("click", () => $("#vault-file").click());
  $("#vault-file").addEventListener("change", (e) => {
    file = e.target.files[0];
    if (file) { $("#vault-name").textContent = file.name; $("#vault-drop").classList.add("active"); play("success"); }
  });
  const run = async (mode) => {
    if (!file) return setStatus("Pick a file first", "err");
    const pw = $("#vault-pw").value;
    if (!pw) return setStatus("Enter a password", "err");
    setStatus(spinner() + " " + T("working"));
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const out = mode === "enc" ? await vaultEncrypt(buf, pw) : await vaultDecrypt(buf, pw);
      const name = mode === "enc" ? file.name + ".vault" : file.name.replace(/\.vault$/, "") || "decrypted";
      const url = URL.createObjectURL(new Blob([out]));
      const a = document.createElement("a"); a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
      setStatus("✅ Done — saved " + esc(name), "ok"); play("success"); notify();
    } catch (e) {
      setStatus("❌ " + (mode === "dec" ? "Wrong password or corrupt file" : "Failed"), "err"); play("error");
    }
  };
  $("#vault-enc").addEventListener("click", () => run("enc"));
  $("#vault-dec").addEventListener("click", () => run("dec"));
  lucide.createIcons();
}
async function deriveKey(pw, salt) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 200000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function vaultEncrypt(data, pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pw, salt);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  const out = new Uint8Array(16 + 12 + ct.length);
  out.set(salt, 0); out.set(iv, 16); out.set(ct, 28);
  return out;
}
async function vaultDecrypt(data, pw) {
  const salt = data.slice(0, 16), iv = data.slice(16, 28), ct = data.slice(28);
  const key = await deriveKey(pw, salt);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct));
}

const MORSE = { A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..", 0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.", ".": ".-.-.-", ",": "--..--", "?": "..--..", "!": "-.-.--", "/": "-..-.", " ": "/" };
const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
function renderMorse(c) {
  form(`<div class="field"><label>Text or Morse</label><textarea id="m-in" placeholder="hello / .... . .-.. .-.. ---"></textarea></div>`,
    "Translate", () => {
      const v = $("#m-in").value.trim();
      let out;
      if (/^[.\-/\s]+$/.test(v)) out = v.split(" ").map((x) => MORSE_REV[x] ?? (x === "/" ? " " : "")).join("");
      else out = v.toUpperCase().split("").map((ch) => MORSE[ch] ?? "").join(" ");
      $("#tool-result").innerHTML = `<div class="card"><div class="v" style="text-align:left">${esc(out) || "—"}</div><button class="btn secondary" style="margin-top:12px" id="m-copy"><i data-lucide="copy"></i> ${T("copy")}</button></div>`;
      $("#m-copy").addEventListener("click", () => copyText(out)); lucide.createIcons(); play("success");
    }, { icon: "arrow-right-left" });
}

function renderText(c) {
  form(`<div class="field"><textarea id="tx-in" placeholder="Type something…"></textarea></div>
    <div class="seg" id="tx-seg">
      <button data-m="fancy" class="active">Fancy</button>
      <button data-m="zalgo">Zalgo</button>
      <button data-m="flip">Flip</button>
      <button data-m="leet">Leet</button>
    </div>`, "Transform", () => {
      const mode = $("#tx-seg .active").dataset.m;
      const s = $("#tx-in").value;
      const out = { fancy: toFancy, zalgo: toZalgo, flip: toFlip, leet: toLeet }[mode](s);
      $("#tool-result").innerHTML = `<div class="card"><div class="v" style="text-align:left">${esc(out)}</div><button class="btn secondary" style="margin-top:12px" id="tx-copy"><i data-lucide="copy"></i> ${T("copy")}</button></div>`;
      $("#tx-copy").addEventListener("click", () => copyText(out)); lucide.createIcons(); play("success");
    }, { icon: "sparkles" });
  $("#tx-seg").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    $("#tx-seg .active").classList.remove("active"); b.classList.add("active"); play("click");
  }));
}
function toFancy(s) { const base = 0x1d5d4; return s.replace(/[a-zA-Z]/g, (c) => { const u = c <= "Z"; const i = c.toLowerCase().charCodeAt(0) - 97; return String.fromCodePoint(base + (u ? 0 : 26) + i); }); }
function toFlip(s) { const m = "abcdefghijklmnopqrstuvwxyz".split("").reduce((o, ch, i) => (o[ch] = "ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz"[i], o), {}); return s.toLowerCase().split("").map((c) => m[c] || c).reverse().join(""); }
function toLeet(s) { const m = { a: "4", e: "3", i: "1", o: "0", s: "5", t: "7", l: "1" }; return s.replace(/[aeiostl]/gi, (c) => m[c.toLowerCase()] || c); }
function toZalgo(s) { const marks = [..."̍̎̄̅̿̑̆̐͒͗̕"]; return s.split("").map((c) => c + Array.from({ length: 3 }, () => marks[Math.floor(Math.random() * marks.length)]).join("")).join(""); }

function renderQR(c) {
  form(`<div class="field"><label>Text or URL</label><input type="text" id="qr-in" placeholder="https://…"></div>`,
    T("generate"), () => {
      const v = $("#qr-in").value.trim(); if (!v) return;
      const out = $("#tool-result"); out.innerHTML = `<div id="qr-out"></div>`;
      new QRCode($("#qr-out"), { text: v, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.H });
      play("success"); notify();
    }, { icon: "qr-code" });
}

function renderDecision(c) {
  c.innerHTML = `<div class="card"><div class="dice" id="dice">🎲</div>
    <div class="btn-row"><button class="btn" id="d-coin">🪙 Coin</button><button class="btn secondary" id="d-dice">🎲 Dice</button></div></div>`;
  const run = async (type) => {
    haptic("medium");
    const d = $("#dice");
    const faces = type === "coin" ? ["🌕", "🌑"] : ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    let delay = 60;
    for (let i = 0; i < 14; i++) { d.innerHTML = faces[Math.floor(Math.random() * faces.length)]; play(type); haptic("light"); await new Promise((r) => setTimeout(r, delay)); delay += 18; }
    const res = type === "coin" ? (Math.random() < 0.5 ? "Heads" : "Tails") : (1 + Math.floor(Math.random() * 6));
    const face = type === "coin" ? (res === "Heads" ? "🌕" : "🌑") : faces[res - 1];
    d.innerHTML = `${face}<div class="res">${res}</div>`; notify(); play("success");
  };
  $("#d-coin").addEventListener("click", () => run("coin"));
  $("#d-dice").addEventListener("click", () => run("dice"));
}

/* ======================================================================= *
 *  TOOL RENDERERS — server-backed
 * ======================================================================= */
function renderHash(c) {
  form(`<div class="field"><label>Hash (MD5 / SHA-1 / SHA-256)</label><input type="text" id="h-in" placeholder="5f4dcc3b5aa765d61d8327deb882cf99"></div>`,
    "Crack", async () => {
      setStatus(spinner() + " " + T("working"));
      const d = await api("hash", { hash: $("#h-in").value });
      if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus("");
      $("#tool-result").innerHTML = `<div class="card">${rows({
        Algorithm: esc(d.algorithm),
        Result: d.password ? `<span class="pill ok">${esc(d.password)}</span>` : `<span class="pill warn">not found</span>`,
      })}${d.note ? `<p class="muted" style="margin-top:10px">${esc(d.note)}</p>` : ""}</div>`;
      play(d.password ? "success" : "error");
    }, { icon: "fingerprint" });
}

function renderTTS(c) {
  form(`<div class="field"><textarea id="tts-in" placeholder="Text to speak…"></textarea></div>
    <div class="field"><select id="tts-lang"><option value="en">English</option><option value="ro">Română</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option></select></div>`,
    "Speak in chat", async () => {
      setStatus(spinner() + " " + T("working"));
      const d = await api("tts", { text: $("#tts-in").value, lang: $("#tts-lang").value });
      if (d.success) { setStatus("✅ " + T("sentChat"), "ok"); play("success"); notify(); }
      else setStatus("❌ " + esc(d.error || T("failed")), "err");
    }, { icon: "mic" });
}

function renderSubnet(c) {
  form(`<div class="field"><label>IP / CIDR</label><input type="text" id="sn-in" placeholder="192.168.1.0/24"></div>`,
    "Calculate", async () => {
      setStatus(spinner());
      const d = await api("subnet", { address: $("#sn-in").value });
      if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus("");
      $("#tool-result").innerHTML = `<div class="card">${rows({
        Network: esc(d.network), Netmask: esc(d.netmask), Broadcast: esc(d.broadcast ?? "—"),
        "First host": esc(d.first_host), "Last host": esc(d.last_host),
        "Usable hosts": d.usable_hosts.toLocaleString(), Total: d.total_addresses.toLocaleString(),
      })}</div>`; play("success");
    }, { icon: "network" });
}

function renderPortscan(c) {
  form(`<div class="field"><label>Host or IP</label><input type="text" id="ps-in" placeholder="example.com"></div>`,
    "Scan", async () => {
      setStatus(spinner() + " scanning…");
      const d = await api("portscan", { target: $("#ps-in").value });
      if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus(`${d.open_count} open`, d.open_count ? "ok" : "");
      $("#tool-result").innerHTML = `<div class="card">${d.ports.map((p) =>
        `<div class="row"><span class="k">${p.port} · ${esc(p.service)}</span><span class="v">${p.open ? '<span class="pill ok">open</span>' : '<span class="pill err">closed</span>'}</span></div>`).join("")}</div>`;
      play("success");
    }, { icon: "scan-search" });
}

function renderDomain(c) {
  form(`<div class="field"><label>Domain</label><input type="text" id="dm-in" placeholder="example.com"></div>`,
    "Lookup", async () => {
      setStatus(spinner());
      const d = await api("domain", { domain: $("#dm-in").value });
      if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus("");
      const dns = d.dns || {};
      const w = d.whois;
      $("#tool-result").innerHTML = `<div class="card">${rows({
        A: esc((dns.A || []).join(", ") || "—"), AAAA: esc((dns.AAAA || []).join(", ") || "—"),
        MX: esc((dns.MX || []).join(", ") || "—"), NS: esc((dns.NS || []).join(", ") || "—"),
      })}</div>${w ? `<div class="card">${rows({ Registrar: esc(w.registrar), Status: esc(w.status), Created: esc(w.created), Expires: esc(w.expires) })}</div>` : ""}`;
      play("success");
    }, { icon: "globe" });
}

function renderIP(c) {
  form(`<div class="field"><label>IP (blank = this server's view)</label><input type="text" id="ip-in" placeholder="8.8.8.8"></div>`,
    "Lookup", async () => {
      setStatus(spinner());
      const d = await api("ipinfo", { ip: $("#ip-in").value });
      if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus("");
      $("#tool-result").innerHTML = `<div class="card">${rows({
        IP: esc(d.query), Location: esc([d.city, d.regionName, d.country].filter(Boolean).join(", ")),
        ISP: esc(d.isp), ASN: esc(d.as), Timezone: esc(d.timezone),
      })}</div>`; play("success");
    }, { icon: "map-pin" });
}

function renderInspect(c) {
  form(`<div class="field"><label>URL</label><input type="text" id="in-in" placeholder="https://…"></div>`,
    "Inspect", async () => {
      setStatus(spinner());
      const d = await api("inspect", { url: $("#in-in").value });
      if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus("");
      $("#tool-result").innerHTML = `<div class="card">${rows({
        "Final URL": esc(d.final_url), Status: `${d.status} ${d.secure ? '<span class="pill ok">secure</span>' : '<span class="pill warn">insecure</span>'}`,
        IP: esc(d.ip), Server: esc(d.server), Title: esc(d.title || "—"),
      })}</div>`; play("success");
    }, { icon: "search-code" });
}

function renderPhone(c) {
  form(`<div class="field"><label>Phone (with +country code)</label><input type="tel" id="ph-in" placeholder="+1 415 555 2671"></div>`,
    "Lookup", async () => {
      setStatus(spinner());
      const d = await api("phone", { number: $("#ph-in").value });
      if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus("");
      $("#tool-result").innerHTML = `<div class="card">${rows({
        Number: esc(d.formatted), Region: esc(d.region), Carrier: esc(d.carrier),
        Timezone: esc(d.timezone), Type: esc(d.line_type),
      })}</div>`; play("success");
    }, { icon: "phone" });
}

function renderUsername(c) {
  form(`<div class="field"><label>Username</label><input type="text" id="un-in" placeholder="octocat"></div>`,
    "Check", async () => {
      setStatus(spinner() + " checking…");
      const d = await api("username", { username: $("#un-in").value });
      if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus("");
      const pill = (s) => s === "likely_taken" ? '<span class="pill ok">found</span>' : s === "available" ? '<span class="pill warn">free</span>' : '<span class="pill">?</span>';
      $("#tool-result").innerHTML = `<div class="card">${d.results.map((r) =>
        `<div class="row"><span class="k"><a href="${esc(r.url)}" target="_blank">${esc(r.platform)}</a></span><span class="v">${pill(r.state)}</span></div>`).join("")}</div><p class="muted">${esc(d.note)}</p>`;
      play("success");
    }, { icon: "users" });
}

function renderDork(c) {
  form(`<div class="field"><label>Domain</label><input type="text" id="dk-in" placeholder="example.com"></div>
    <div class="field"><label>Type</label><select id="dk-kind">
      <option value="files">Documents</option><option value="login">Login pages</option>
      <option value="directory">Open directories</option><option value="subdomains">Subdomains</option>
      <option value="config">Config files</option><option value="exposed">Exposed secrets</option>
    </select></div>`, "Build", async () => {
      setStatus(spinner());
      const d = await api("dork", { domain: $("#dk-in").value, kind: $("#dk-kind").value });
      if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus("");
      $("#tool-result").innerHTML = `<div class="card"><div class="v" style="text-align:left;font-family:ui-monospace,monospace">${esc(d.query)}</div>
        <div class="btn-row" style="margin-top:12px"><a class="btn" href="${esc(d.url)}" target="_blank"><i data-lucide="external-link"></i> Search</a>
        <button class="btn secondary" id="dk-copy"><i data-lucide="copy"></i></button></div></div>`;
      $("#dk-copy").addEventListener("click", () => copyText(d.query)); lucide.createIcons(); play("success");
    }, { icon: "search" });
}

function renderBreach(c) {
  form(`<div class="field"><label>Email</label><input type="email" id="br-in" placeholder="you@example.com"></div>`,
    "Check", async () => {
      setStatus(spinner() + " querying HIBP…");
      const d = await api("breach", { email: $("#br-in").value });
      if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus("");
      if (!d.breaches.length) {
        $("#tool-result").innerHTML = `<div class="card"><p class="status ok">✅ No known breaches</p></div>`; play("success"); return;
      }
      $("#tool-result").innerHTML = `<div class="card"><p class="status err">🚨 Found in ${d.breaches.length} breaches</p>${d.breaches.map((b) =>
        `<div class="row"><span class="k">${esc(b.name)}</span><span class="v">${esc(b.date || "")}</span></div>`).join("")}</div>`;
      play("error"); notify("warning");
    }, { icon: "shield-alert" });
}

function renderTgProfile(c) {
  form(`<div class="field"><label>Telegram username</label><input type="text" id="tp-in" placeholder="@durov"></div>`,
    "Lookup", async () => {
      setStatus(spinner());
      const d = await api("tgprofile", { username: $("#tp-in").value });
      if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus("");
      $("#tool-result").innerHTML = `<div class="card" style="text-align:center">
        ${d.photo ? `<img src="${esc(d.photo)}" style="width:84px;height:84px;border-radius:50%;object-fit:cover">` : ""}
        <h3 style="margin:10px 0 2px">${esc(d.display_name)}</h3>
        <p class="muted">${esc(d.username)}</p>
        <p style="margin-top:10px">${esc(d.description)}</p>
        ${d.extra ? `<p class="muted" style="margin-top:8px">${esc(d.extra)}</p>` : ""}</div>`;
      play("success");
    }, { icon: "send" });
}

function renderDownload(c) {
  c.innerHTML = `<div class="card">
    <div class="field"><label>Video / post URL</label><input type="text" id="dl-in" placeholder="https://youtube.com/watch?v=…"></div>
    <button class="btn" id="dl-btn"><i data-lucide="download"></i> Fetch</button>
    <div id="tool-status"></div><div id="tool-result" class="result"></div>
    <p class="muted" style="margin-top:12px">Works with YouTube, Instagram, TikTok and many others. Only download content you have the right to.</p>
  </div>`;
  $("#dl-btn").addEventListener("click", async () => {
    play("click"); haptic();
    setStatus(spinner() + " resolving…");
    try {
      const d = await api("media", { url: $("#dl-in").value });
      if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus("");
      $("#tool-result").innerHTML = `<div class="card">
        ${d.thumbnail ? `<img src="${esc(d.thumbnail)}" style="width:100%;border-radius:12px;margin-bottom:12px">` : ""}
        <div class="v" style="text-align:left">${esc(d.title)}</div>
        <a class="btn" style="margin-top:12px" href="${esc(d.url)}" target="_blank" download><i data-lucide="download"></i> Open / Save</a></div>`;
      lucide.createIcons(); play("success"); notify();
    } catch (e) { setStatus("❌ " + esc(e.message), "err"); play("error"); }
  });
  lucide.createIcons();
}

function renderExif(c) {
  let file = null;
  c.innerHTML = `<div class="card">
    <div class="upload" id="ex-drop"><i data-lucide="image-up"></i><div id="ex-name">Choose a photo</div></div>
    <input type="file" id="ex-file" accept="image/*" hidden>
    <button class="btn" id="ex-btn" style="margin-top:14px"><i data-lucide="eraser"></i> Strip metadata</button>
    <div id="tool-status"></div>
    <p class="muted" style="margin-top:12px">The cleaned copy is sent to your Telegram chat.</p>
  </div>`;
  $("#ex-drop").addEventListener("click", () => $("#ex-file").click());
  $("#ex-file").addEventListener("change", (e) => {
    file = e.target.files[0];
    if (file) { $("#ex-name").textContent = file.name; $("#ex-drop").classList.add("active"); play("success"); }
  });
  $("#ex-btn").addEventListener("click", async () => {
    if (!file) return setStatus("Pick an image first", "err");
    play("click"); haptic();
    setStatus(spinner() + " " + T("working"));
    const fd = new FormData();
    fd.append("initData", INIT_DATA);
    fd.append("file", file);
    try {
      const r = await fetch("/api/exif", { method: "POST", body: fd });
      const d = await r.json();
      if (d.success) { setStatus("✅ " + T("sentChat"), "ok"); play("success"); notify(); }
      else setStatus("❌ " + esc(d.error || T("failed")), "err");
    } catch (e) { setStatus("❌ " + esc(e.message), "err"); play("error"); }
  });
  lucide.createIcons();
}

/* ======================================================================= *
 *  SETTINGS
 * ======================================================================= */
function renderSettings() {
  currentTab = "settings";
  setActiveTab("settings");
  $("#view-title").textContent = T("settings");
  $("#grid-view").classList.add("hidden");
  $("#detail-view").classList.add("hidden");
  const v = $("#settings-view"); v.classList.remove("hidden");
  v.innerHTML = `
    <div class="settings-group">
      <div class="switch-row"><span>Sound effects</span><input type="checkbox" id="set-sound" ${soundOn ? "checked" : ""}></div>
      <div class="list-link" id="set-lang"><span>Language</span><b style="color:var(--accent)">${lang === "ro" ? "Română" : "English"}</b></div>
    </div>
    <div class="settings-group">
      <div class="list-link" id="set-close"><span style="color:var(--err)">Close app</span><i data-lucide="log-out"></i></div>
    </div>
    <p class="footer-note">Toolkit ${CHAT_USER ? "· signed in as " + esc(CHAT_USER.first_name) : ""}<br>v3.0 · self-hosted</p>`;
  $("#set-sound").addEventListener("change", (e) => { soundOn = e.target.checked; localStorage.setItem("tk_sound", soundOn ? "1" : "0"); if (soundOn) play("click"); });
  $("#set-lang").addEventListener("click", () => { lang = lang === "en" ? "ro" : "en"; localStorage.setItem("tk_lang", lang); play("click"); haptic(); renderSettings(); });
  $("#set-close").addEventListener("click", () => { try { tg?.close(); } catch (_) {} });
  lucide.createIcons();
}

/* ---------------- boot ---------------- */
if (tg?.colorScheme === "dark") document.body.classList.add("dark");
tg?.onEvent?.("themeChanged", () => document.body.classList.toggle("dark", tg.colorScheme === "dark"));
setActiveTab("tools");
renderGrid("tools");
