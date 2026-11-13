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
let activeCat = "all";
let accent = store.get("tk_accent", "teal");
const ACCENTS = { teal: ["#2dd4bf", "#0f2a2a", "#052e2b"], green: ["#3fb950", "#0d2615", "#04140a"], cyan: ["#22d3ee", "#07323f", "#021b23"], amber: ["#f59e0b", "#2a1e05", "#1a1304"], magenta: ["#e879f9", "#2a0f33", "#180820"] };
function applyAccent() { const a = ACCENTS[accent] || ACCENTS.teal; const r = document.documentElement.style; r.setProperty("--accent", a[0]); r.setProperty("--accent-dim", a[1]); r.setProperty("--accent-text", a[2]); }
let lang = store.get("tk_lang", (USER?.language_code === "ro" ? "ro" : "en"));

/* ---------- i18n ---------- */
const UI = {
  en: { search: "Search tools…", all: "All", fav: "★ Favorites", recent: "Recent", results: "Results", noMatch: "No tools match", toolScreen: "Tool", settings: "Settings", sound: "Sound effects", language: "Language", clearFav: "Clear favorites", clearRec: "Clear recents", close: "Close app", tools: "Tools", dev: "Developer", text: "Text", network: "Network", media: "Media", share: "Send to chat", shared: "Sent to your chat" },
  ro: { search: "Caută unelte…", all: "Toate", fav: "★ Favorite", recent: "Recente", results: "Rezultate", noMatch: "Nicio unealtă găsită", toolScreen: "Unealtă", settings: "Setări", sound: "Efecte sonore", language: "Limbă", clearFav: "Șterge favoritele", clearRec: "Șterge recentele", close: "Închide aplicația", tools: "Unelte", dev: "Developer", text: "Text", network: "Rețea", media: "Media", share: "Trimite în chat", shared: "Trimis în chat" },
};
const T = k => (UI[lang] && UI[lang][k]) ?? UI.en[k] ?? k;
const catName = k => T(k);
// Romanian name/sub per tool id: [name, sub]
const RO = {
  password:["Parole","Generator de parole sigure"], vault:["Seif Securizat","Criptează fișiere local"], qr:["Cod QR","Text sau link → QR"], hashgen:["Generator Hash","MD5 / SHA-1 / SHA-256 / 512"], hashcrack:["Spargere Hash","Testează cu parole comune"], decision:["Decizie","Ban sau zar"], pwcheck:["Putere Parolă","Entropie și slăbiciuni"], currency:["Valută","Cursuri live"], passphrase:["Frază-parolă","Parolă din cuvinte ușor de ținut minte"], units:["Conversie Unități","Lungime, masă, temp, date"], datecalc:["Calc. Date","Zile între / adaugă zile"], countdown:["Numărătoare","Timp rămas până la o dată"], calc:["Calculatoare","IMC · Credit · Bacșiș"], fakeid:["Identitate Falsă","Persoană de test aleatorie"], worldclock:["Ceas Mondial","Ora în diferite fusuri"], picker:["Alegere Aleatorie","Alege sau amestecă o listă"], stopwatch:["Cronometru","Cronometru cu ture"], tts:["Text în Voce","Mesaj vocal în chat"],
  base64:["Base64","Codare / decodare"], json:["Format JSON","Formatează și validează"], jwt:["Decodor JWT","Inspectează un token"], urlcode:["Codare URL","Percent-encode / decode"], timestamp:["Timestamp","Unix ⇄ oră umană"], uuid:["UUID","Generează UUID v4"], color:["Culoare","HEX ⇄ RGB ⇄ HSL"], diff:["Diferență Text","Compară două blocuri"], baseconv:["Conversie Bază","bin ⇄ oct ⇄ dec ⇄ hex"], cron:["Explică Cron","Expresie cron → română"], regex:["Tester Regex","Potriviri live & grupuri"], binascii:["Text ⇄ Binar","ASCII în binar / hex"], filechecksum:["Checksum Fișier","Hash pentru orice fișier"], csvjson:["CSV ⇄ JSON","Conversie date tabelare"], validator:["Validator","IBAN & card (Luhn)"], markdown:["Markdown","Previzualizare live"], hashid:["Identificator Hash","Ce tip de hash este?"], escapes:["Escape-uri","HTML / Unicode / Punycode"], basex:["Base32 / Base58","Codare / decodare"], pwned:["Parolă Compromisă","E parola în scurgeri de date?"], hmac:["HMAC","Hash cu cheie (SHA-1/256/384/512)"], bcrypt:["Bcrypt","Hash și verificare parole"], jwtsign:["Semnare JWT","Creează și semnează un token"], textcrypt:["Criptare Text","Criptează / decriptează text (AES-256)"], subdomains:["Căutare Subdomenii","Pasiv, din jurnale de certificate"], cheats:["Pe scurt","Git, bash, vim, regex, SQL, HTTP"], asciiuni:["ASCII / Unicode","Tabel și inspector de caractere"], bitwise:["Calc. Biți","AND, OR, XOR, deplasări"], ports:["Căutare Porturi","Ce rulează pe portul 5432?"], wordfreq:["Frecvență Cuvinte","Cele mai folosite cuvinte"], mdpdf:["Markdown în PDF","Convertește Markdown în PDF"], docscrub:["Curăță Metadate Doc.","PDF și DOCX fără date ascunse"],
  text:["Stiluri Text","Fancy, Zalgo, întors, leet"], morse:["Morse","Text ⇄ cod Morse"], caseconv:["Schimbă Caps","MARE / mic / Titlu / camel"], counter:["Număr Cuvinte","Caractere, cuvinte, linii"], lorem:["Lorem Ipsum","Generator de text demo"], cipher:["Caesar / ROT13","Cifru cu deplasare"], linetools:["Unelte Linii","Sortează, elimină dubluri…"], findreplace:["Caută & Înlocuiește","Înlocuire cu regex"], textanalysis:["Analiză Text","Lizibilitate & cuvinte cheie"], textclean:["Curăță Text","Diacritice, ghilimele, spații"], ciphers:["Cifruri Clasice","Atbash & Vigenère"], aidetect:["Detector AI","Verifică text/fișiere pentru AI"],
  subnet:["Calc. Subnet","Detalii CIDR IPv4/IPv6"], speedtest:["Test Viteză","Viteza conexiunii tale"], portscan:["Scan Porturi","Porturi comune deschise"], domain:["Info Domeniu","DNS + WHOIS/RDAP"], ipinfo:["Info IP","Geolocație și ASN"], inspect:["Inspector URL","Status, server, IP, titlu"], ssl:["Verificare SSL","Expirare certificat & emitent"], dns:["Căutare DNS","Orice tip de înregistrare"], phone:["Căutare Telefon","Operator, regiune, fus"], username:["Caută Utilizator","Pe platforme publice"], dork:["Generator Dork","Interogări Google recon"], breach:["Verificare Leak","Email prin HaveIBeenPwned"], tgprofile:["Profil Telegram","Previzualizare publică t.me"],
  download:["Descărcări","YouTube / Instagram / TikTok"], exif:["Șterge EXIF","Elimină metadatele foto"], exifview:["Vizor EXIF","Vezi metadatele ascunse"], stego:["Steganografie","Ascunde un mesaj în imagine"],
};
const tname = t => (lang === "ro" && RO[t.id]) ? RO[t.id][0] : t.name;
const tsub = t => (lang === "ro" && RO[t.id]) ? RO[t.id][1] : t.sub;

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
async function copyToClipboard(txt) {
  try { await navigator.clipboard.writeText(txt); return true; } catch (_) {}
  try {  // fallback for WebViews that deny the async Clipboard API
    const ta = document.createElement("textarea"); ta.value = txt; ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0"; document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0, txt.length);
    const ok = document.execCommand("copy"); ta.remove(); return ok;
  } catch (_) { return false; }
}
function copy(txt) {
  copyToClipboard(txt).then(ok => {
    if (ok) { play("success"); notify(); toast("Copied", "ok"); }
    else { play("error"); notify("error"); toast("Couldn't copy — select the text and copy it manually", "err"); }
  });
}
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
  { id: "textcrypt", cat: "tools", icon: "file-lock", name: "Text Encrypt", sub: "AES-256 encrypt / decrypt text", kw: "aes gcm password secret message cipher", render: rTextCrypt },
  { id: "qr", cat: "tools", icon: "qr-code", name: "QR Code", sub: "Text or link → QR", kw: "barcode", render: rQR },
  { id: "hashgen", cat: "tools", icon: "hash", name: "Hash Generator", sub: "MD5 / SHA-1 / SHA-256 / 512", kw: "checksum digest", render: rHashGen },
  { id: "hashcrack", cat: "tools", icon: "fingerprint", name: "Hash Cracker", sub: "Test hash vs common list", kw: "md5 sha reverse", render: rHashCrack },
  { id: "decision", cat: "tools", icon: "dices", name: "Decision", sub: "Coin flip / dice roll", kw: "random coin dice", render: rDecision },
  { id: "pwcheck", cat: "tools", icon: "shield", name: "Password Strength", sub: "Entropy & weakness check", kw: "security strong audit", render: rPwCheck },
  { id: "currency", cat: "tools", icon: "banknote", name: "Currency", sub: "Live exchange rates", kw: "money convert forex usd eur", render: rCurrency },
  { id: "passphrase", cat: "tools", icon: "lock-keyhole", name: "Passphrase", sub: "Memorable word-based password", kw: "diceware words secure", render: rPassphrase },
  { id: "pwned", cat: "tools", icon: "shield-x", name: "Pwned Password", sub: "Is a password in known breaches?", kw: "hibp leak breach compromised check", render: rPwned },
  { id: "units", cat: "tools", icon: "ruler", name: "Unit Convert", sub: "Length, mass, temp, data, speed", kw: "metric imperial measure", render: rUnits },
  { id: "datecalc", cat: "tools", icon: "calendar-days", name: "Date Calc", sub: "Days between / add days", kw: "age duration difference", render: rDateCalc },
  { id: "countdown", cat: "tools", icon: "timer", name: "Countdown", sub: "Live countdown to a date", kw: "timer event", render: rCountdown },
  { id: "calc", cat: "tools", icon: "percent", name: "Calculators", sub: "BMI · Loan · Tip", kw: "bmi loan tip math", render: rCalc },
  { id: "fakeid", cat: "tools", icon: "user-round", name: "Fake Identity", sub: "Random test persona", kw: "mock data name address", render: rFakeId },
  { id: "worldclock", cat: "tools", icon: "clock-9", name: "World Clock", sub: "Time across time zones", kw: "timezone utc", render: rWorldClock },
  { id: "picker", cat: "tools", icon: "list-checks", name: "Random Picker", sub: "Pick or shuffle a list", kw: "raffle shuffle choose", render: rPicker },
  { id: "stopwatch", cat: "tools", icon: "watch", name: "Stopwatch", sub: "Timer with laps", kw: "chronometer time", render: rStopwatch },
  { id: "tts", cat: "tools", icon: "mic", name: "Text to Speech", sub: "Voice message to your chat", kw: "voice speak audio", render: rTTS },

  // --- DEV ---
  { id: "base64", cat: "dev", icon: "binary", name: "Base64", sub: "Encode / decode", kw: "encode decode", render: rBase64 },
  { id: "json", cat: "dev", icon: "braces", name: "JSON Format", sub: "Pretty-print & validate", kw: "beautify minify", render: rJSON },
  { id: "jwt", cat: "dev", icon: "shield-check", name: "JWT Decoder", sub: "Inspect a JSON Web Token", kw: "token auth", render: rJWT },
  { id: "urlcode", cat: "dev", icon: "link", name: "URL Encode", sub: "Percent-encode / decode", kw: "uri escape", render: rUrlCode },
  { id: "timestamp", cat: "dev", icon: "clock", name: "Timestamp", sub: "Unix ⇄ human time", kw: "epoch unix date", render: rTimestamp },
  { id: "uuid", cat: "dev", icon: "shuffle", name: "UUID", sub: "Generate UUID v4", kw: "guid random id", render: rUUID },
  { id: "color", cat: "dev", icon: "palette", name: "Color", sub: "HEX ⇄ RGB ⇄ HSL", kw: "colour convert", render: rColor },
  { id: "diff", cat: "dev", icon: "git-compare", name: "Text Diff", sub: "Compare two blocks of text", kw: "compare changes", render: rDiff },
  { id: "baseconv", cat: "dev", icon: "calculator", name: "Base Convert", sub: "bin ⇄ oct ⇄ dec ⇄ hex", kw: "radix binary hexadecimal number", render: rBaseConv },
  { id: "cron", cat: "dev", icon: "calendar-clock", name: "Cron Explainer", sub: "Cron expression → English", kw: "schedule crontab", render: rCron },
  { id: "regex", cat: "dev", icon: "regex", name: "Regex Tester", sub: "Live matches & groups", kw: "regular expression pattern", render: rRegex },
  { id: "binascii", cat: "dev", icon: "file-digit", name: "Text ⇄ Binary", sub: "ASCII to binary / hex", kw: "ascii bits encode", render: rBinAscii },
  { id: "filechecksum", cat: "dev", icon: "file-check", name: "File Checksum", sub: "Hash any file (MD5/SHA)", kw: "hash verify integrity", render: rFileChecksum },
  { id: "csvjson", cat: "dev", icon: "table", name: "CSV ⇄ JSON", sub: "Convert tabular data", kw: "spreadsheet convert", render: rCsvJson },
  { id: "validator", cat: "dev", icon: "badge-check", name: "Validator", sub: "IBAN & card (Luhn)", kw: "checksum credit card", render: rValidator },
  { id: "markdown", cat: "dev", icon: "file-text", name: "Markdown", sub: "Live preview", kw: "md render preview", render: rMarkdown },
  { id: "hashid", cat: "dev", icon: "search-check", name: "Hash Identifier", sub: "What kind of hash is this?", kw: "detect type md5 sha", render: rHashId },
  { id: "escapes", cat: "dev", icon: "ampersand", name: "Escapes", sub: "HTML / Unicode / Punycode", kw: "entities encode escape", render: rEscapes },
  { id: "basex", cat: "dev", icon: "boxes", name: "Base32 / Base58", sub: "Encode / decode", kw: "base32 base58 bitcoin", render: rBaseX },
  { id: "hmac", cat: "dev", icon: "key-square", name: "HMAC", sub: "Keyed hash (SHA-1/256/384/512)", kw: "signature mac authenticate", render: rHmac },
  { id: "bcrypt", cat: "dev", icon: "lock-keyhole", name: "Bcrypt", sub: "Hash & verify passwords", kw: "password hash verify salt", render: rBcrypt },
  { id: "jwtsign", cat: "dev", icon: "stamp", name: "JWT Signer", sub: "Create & sign a token (HS256+)", kw: "jwt token hs256 create sign", render: rJwtSign },
  { id: "cheats", cat: "dev", icon: "book-open", name: "Cheat Sheets", sub: "Git, bash, vim, regex, SQL, HTTP", kw: "reference commands syntax help cheatsheet", render: rCheats },
  { id: "asciiuni", cat: "dev", icon: "languages", name: "ASCII / Unicode", sub: "Table & character inspector", kw: "codepoint utf8 utf-16 character hidden invisible zero-width", render: rAsciiUni },
  { id: "bitwise", cat: "dev", icon: "cpu", name: "Bitwise Calc", sub: "AND, OR, XOR, shifts, rotate", kw: "binary hex shift mask not popcount", render: rBitwise },

  // --- TEXT ---
  { id: "text", cat: "text", icon: "type", name: "Text Styles", sub: "Fancy, Zalgo, flip, leet", kw: "font unicode", render: rText },
  { id: "morse", cat: "text", icon: "radio", name: "Morse", sub: "Text ⇄ Morse code", kw: "dot dash", render: rMorse },
  { id: "caseconv", cat: "text", icon: "case-sensitive", name: "Case Convert", sub: "UPPER / lower / Title / camel", kw: "uppercase snake kebab", render: rCase },
  { id: "counter", cat: "text", icon: "pilcrow", name: "Word Count", sub: "Chars, words, lines", kw: "length statistics", render: rCounter },
  { id: "lorem", cat: "text", icon: "text-quote", name: "Lorem Ipsum", sub: "Placeholder text generator", kw: "dummy filler", render: rLorem },
  { id: "cipher", cat: "text", icon: "replace", name: "Caesar / ROT13", sub: "Shift-cipher encode/decode", kw: "rot13 encrypt", render: rCipher },
  { id: "linetools", cat: "text", icon: "list-ordered", name: "Line Tools", sub: "Sort, dedupe, reverse…", kw: "lines unique blank", render: rLineTools },
  { id: "findreplace", cat: "text", icon: "replace-all", name: "Find & Replace", sub: "Regex-powered replace", kw: "substitute regex", render: rFindReplace },
  { id: "textanalysis", cat: "text", icon: "scan-text", name: "Text Analysis", sub: "Readability & keywords", kw: "flesch density stats", render: rTextAnalysis },
  { id: "textclean", cat: "text", icon: "eraser", name: "Text Cleaner", sub: "Accents, smart quotes, spaces", kw: "diacritics normalize", render: rTextClean },
  { id: "ciphers", cat: "text", icon: "square-asterisk", name: "Classic Ciphers", sub: "Atbash & Vigenère", kw: "vigenere atbash encrypt", render: rCiphers },
  { id: "aidetect", cat: "text", icon: "bot", name: "AI Detector", sub: "Check text/files for AI authorship", kw: "chatgpt gpt detect plagiarism", render: rAiDetect },
  { id: "wordfreq", cat: "text", icon: "bar-chart-horizontal", name: "Word Frequency", sub: "Most-used words & phrases", kw: "count frequency top keywords ngram", render: rWordFreq },

  // --- NETWORK ---
  { id: "subnet", cat: "network", icon: "network", name: "Subnet Calc", sub: "IPv4/IPv6 CIDR breakdown", kw: "cidr netmask ip", render: rSubnet },
  { id: "speedtest", cat: "network", icon: "gauge", name: "Speed Test", sub: "Your connection speed", kw: "bandwidth download ping", render: rSpeedtest },
  { id: "portscan", cat: "network", icon: "scan-search", name: "Port Probe", sub: "Common open ports on a host", kw: "scan tcp", render: rPortscan },
  { id: "domain", cat: "network", icon: "globe", name: "Domain Info", sub: "DNS + WHOIS/RDAP", kw: "dns whois mx", render: rDomain },
  { id: "ipinfo", cat: "network", icon: "map-pin", name: "IP Info", sub: "Geolocation & ASN", kw: "geoip location", render: rIP },
  { id: "inspect", cat: "network", icon: "search-code", name: "URL Inspector", sub: "Status, server, IP, title", kw: "headers redirect", render: rInspect },
  { id: "ssl", cat: "network", icon: "lock", name: "SSL Checker", sub: "Cert expiry & issuer", kw: "https certificate tls", render: rSSL },
  { id: "dns", cat: "network", icon: "list-tree", name: "DNS Lookup", sub: "Any record type", kw: "resolve a mx txt cname", render: rDns },
  { id: "subdomains", cat: "network", icon: "binoculars", name: "Subdomain Finder", sub: "Passive, via certificate logs", kw: "recon enumerate crt.sh certificate transparency osint", render: rSubdomains },
  { id: "ports", cat: "network", icon: "plug", name: "Port Lookup", sub: "What runs on port 5432?", kw: "service tcp udp number well-known", render: rPorts },
  { id: "phone", cat: "network", icon: "phone", name: "Phone Lookup", sub: "Carrier, region, timezone", kw: "number osint", render: rPhone },
  { id: "username", cat: "network", icon: "users", name: "Username Check", sub: "Across public platforms", kw: "social osint", render: rUsername },
  { id: "dork", cat: "network", icon: "search", name: "Dork Builder", sub: "Google recon queries", kw: "osint google", render: rDork },
  { id: "breach", cat: "network", icon: "shield-alert", name: "Breach Check", sub: "Email via HaveIBeenPwned", kw: "leak pwned", render: rBreach },
  { id: "tgprofile", cat: "network", icon: "send", name: "Telegram Profile", sub: "Public t.me preview", kw: "osint lookup", render: rTgProfile },

  // --- MEDIA ---
  { id: "download", cat: "media", icon: "download", name: "Downloader", sub: "YouTube / Instagram / TikTok", kw: "video yt ig", render: rDownload },
  { id: "exif", cat: "media", icon: "image-off", name: "EXIF Stripper", sub: "Remove photo metadata", kw: "gps privacy image", render: rExif },
  { id: "exifview", cat: "media", icon: "scan-eye", name: "EXIF Viewer", sub: "See a photo's hidden metadata", kw: "gps camera inspect", render: rExifView },
  { id: "stego", cat: "media", icon: "image-plus", name: "Steganography", sub: "Hide a message in an image", kw: "secret hidden lsb", render: rStego },
];
const byId = id => TOOLS.find(t => t.id === id);
const CATS = { tools: "Tools", dev: "Developer", text: "Text", network: "Network", media: "Media" };

/* =========================================================================
   NAVIGATION / HOME
   ========================================================================= */
function show(view) {
  for (const v of ["home", "detail", "settings"]) $(`#${v}-view`).classList.toggle("hidden", v !== view);
  try { const bb = tg?.BackButton; if (bb) { view === "home" ? bb.hide() : bb.show(); } } catch (_) {}
}
function iconsRefresh() { try { lucide.createIcons(); } catch (_) {} }

function cardHTML(t) {
  const fav = favorites.includes(t.id) ? " is-fav" : "";
  return `<button class="card-btn${fav}" data-tool="${t.id}" data-cat="${t.cat}">
    <i data-lucide="star" class="fav-star"></i>
    <span class="ico"><i data-lucide="${t.icon}"></i></span>
    <span class="name">${esc(tname(t))}</span>
    <span class="sub">${esc(tsub(t))}</span>
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

const CAT_ICON = { all: "layout-grid", tools: "wrench", dev: "code", text: "type", network: "globe", media: "clapperboard" };
function renderChips() {
  const bar = $("#cat-bar");
  const keys = ["all", ...Object.keys(CATS)];
  bar.innerHTML = keys.map(k =>
    `<button class="chip${activeCat === k ? " active" : ""}" data-cat="${k}"><i data-lucide="${CAT_ICON[k]}"></i> ${esc(catName(k))}</button>`).join("");
  bar.querySelectorAll(".chip").forEach(ch => ch.addEventListener("click", () => {
    activeCat = ch.dataset.cat; $("#search").value = ""; play("click"); haptic();
    renderHome();
    ch.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }));
}

function renderHome() {
  show("home"); $("#view-title").textContent = "Toolkit";
  renderChips();
  const q = $("#search").value.trim().toLowerCase();
  const host = $("#home-sections");

  if (q) {
    const hits = TOOLS.filter(t => (t.name + " " + t.sub + " " + t.kw + " " + tname(t) + " " + tsub(t) + " " + catName(t.cat)).toLowerCase().includes(q));
    host.innerHTML = hits.length ? section(T("results"), hits)
      : `<div class="empty"><i data-lucide="search-x"></i><div>${T("noMatch")} “${esc(q)}”</div></div>`;
    wireCards(host); iconsRefresh(); return;
  }

  // Single category selected → show just that group.
  if (activeCat !== "all") {
    host.innerHTML = section(catName(activeCat), TOOLS.filter(t => t.cat === activeCat));
    wireCards(host); iconsRefresh(); window.scrollTo(0, 0); return;
  }

  // "All" → favorites, recents, then every category.
  let html = "";
  const favTools = favorites.map(byId).filter(Boolean);
  const recTools = recents.map(byId).filter(Boolean).filter(t => !favorites.includes(t.id));
  if (favTools.length) html += section(T("fav"), favTools);
  if (recTools.length) html += section(T("recent"), recTools.slice(0, 4));
  for (const cat of Object.keys(CATS)) {
    html += section(catName(cat), TOOLS.filter(t => t.cat === cat));
  }
  host.innerHTML = html;
  wireCards(host); iconsRefresh();
}

function openTool(id) {
  const t = byId(id); if (!t) return;
  play("click"); haptic("medium");
  recents = [id, ...recents.filter(x => x !== id)].slice(0, 8); store.set("tk_recents", recents);
  show("detail");
  $("#view-title").textContent = tname(t);
  $("#detail-title").textContent = tname(t);
  $("#detail-desc").textContent = tsub(t);
  const favBtn = $("#btn-fav"); favBtn.classList.toggle("on", favorites.includes(id));
  favBtn.onclick = () => {
    const on = favorites.includes(id);
    favorites = on ? favorites.filter(x => x !== id) : [id, ...favorites];
    store.set("tk_favs", favorites); favBtn.classList.toggle("on", !on);
    play("click"); haptic(); toast(on ? "Removed from favorites" : "Added to favorites");
  };
  body().innerHTML = ""; t.render(body()); iconsRefresh(); window.scrollTo(0, 0);
}

$("#search").addEventListener("input", () => { if ($("#search").value.trim()) activeCat = "all"; renderHome(); });
$("#btn-back").addEventListener("click", () => { play("click"); haptic(); renderHome(); });
$("#btn-settings").addEventListener("click", () => {
  play("click"); haptic();
  $("#settings-view").classList.contains("hidden") ? renderSettings() : renderHome();
});
try { tg?.BackButton?.onClick(() => { play("click"); haptic(); renderHome(); }); } catch (_) {}

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
function resultCard(inner, opts = {}) { $("#tool-result").innerHTML = `<div class="card">${inner}</div>`; if (opts.actions !== false) addActions($("#tool-result .card")); iconsRefresh(); }
async function shareToChat(text) {
  if (!text) return; play("click"); haptic();
  try { const d = await api("share", { text }); if (d.success) { toast(T("shared"), "ok"); notify(); } else toast(d.error || "Failed", "err"); }
  catch (e) { toast(e.message || "Failed", "err"); }
}
function downloadText(text, name = "result.txt") {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" })); a.download = name; a.click(); URL.revokeObjectURL(a.href); play("success"); toast("Saved " + name, "ok");
}
function addActions(card) {
  if (!card) return;
  const clone = card.cloneNode(true); clone.querySelectorAll("button,a").forEach(e => e.remove());
  const text = clone.innerText.trim(); if (!text) return;
  const row = document.createElement("div"); row.className = "btn-row"; row.style.marginTop = "12px";
  const s = document.createElement("button"); s.className = "btn ghost sm"; s.innerHTML = `<i data-lucide="send"></i> ${T("share")}`; s.addEventListener("click", () => shareToChat(text));
  const d = document.createElement("button"); d.className = "btn ghost sm"; d.style.flex = "0 0 48px"; d.innerHTML = `<i data-lucide="download"></i>`; d.addEventListener("click", () => downloadText(text));
  row.append(s, d); card.appendChild(row);
}
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
function md5(s,raw){function rl(n,c){return(n<<c)|(n>>>(32-c))}function au(x,y){var l=(x&0xFFFF)+(y&0xFFFF),m=(x>>16)+(y>>16)+(l>>16);return(m<<16)|(l&0xFFFF)}function cmn(q,a,b,x,s,t){return au(rl(au(au(a,q),au(x,t)),s),b)}function ff(a,b,c,d,x,s,t){return cmn((b&c)|(~b&d),a,b,x,s,t)}function gg(a,b,c,d,x,s,t){return cmn((b&d)|(c&~d),a,b,x,s,t)}function hh(a,b,c,d,x,s,t){return cmn(b^c^d,a,b,x,s,t)}function ii(a,b,c,d,x,s,t){return cmn(c^(b|~d),a,b,x,s,t)}function tb(str){var n=str.length,b=[],i;for(i=0;i<n*8;i+=8)b[i>>5]|=(str.charCodeAt(i/8)&0xFF)<<(i%32);return b}var _u=raw?(s||""):unescape(encodeURIComponent(s)),x=tb(_u),len=_u.length*8;x[len>>5]|=0x80<<(len%32);x[(((len+64)>>>9)<<4)+14]=len;var a=1732584193,b=-271733879,c=-1732584194,d=271733878,i;for(i=0;i<x.length;i+=16){var oa=a,ob=b,oc=c,od=d;a=ff(a,b,c,d,x[i],7,-680876936);d=ff(d,a,b,c,x[i+1],12,-389564586);c=ff(c,d,a,b,x[i+2],17,606105819);b=ff(b,c,d,a,x[i+3],22,-1044525330);a=ff(a,b,c,d,x[i+4],7,-176418897);d=ff(d,a,b,c,x[i+5],12,1200080426);c=ff(c,d,a,b,x[i+6],17,-1473231341);b=ff(b,c,d,a,x[i+7],22,-45705983);a=ff(a,b,c,d,x[i+8],7,1770035416);d=ff(d,a,b,c,x[i+9],12,-1958414417);c=ff(c,d,a,b,x[i+10],17,-42063);b=ff(b,c,d,a,x[i+11],22,-1990404162);a=ff(a,b,c,d,x[i+12],7,1804603682);d=ff(d,a,b,c,x[i+13],12,-40341101);c=ff(c,d,a,b,x[i+14],17,-1502002290);b=ff(b,c,d,a,x[i+15],22,1236535329);a=gg(a,b,c,d,x[i+1],5,-165796510);d=gg(d,a,b,c,x[i+6],9,-1069501632);c=gg(c,d,a,b,x[i+11],14,643717713);b=gg(b,c,d,a,x[i],20,-373897302);a=gg(a,b,c,d,x[i+5],5,-701558691);d=gg(d,a,b,c,x[i+10],9,38016083);c=gg(c,d,a,b,x[i+15],14,-660478335);b=gg(b,c,d,a,x[i+4],20,-405537848);a=gg(a,b,c,d,x[i+9],5,568446438);d=gg(d,a,b,c,x[i+14],9,-1019803690);c=gg(c,d,a,b,x[i+3],14,-187363961);b=gg(b,c,d,a,x[i+8],20,1163531501);a=gg(a,b,c,d,x[i+13],5,-1444681467);d=gg(d,a,b,c,x[i+2],9,-51403784);c=gg(c,d,a,b,x[i+7],14,1735328473);b=gg(b,c,d,a,x[i+12],20,-1926607734);a=hh(a,b,c,d,x[i+5],4,-378558);d=hh(d,a,b,c,x[i+8],11,-2022574463);c=hh(c,d,a,b,x[i+11],16,1839030562);b=hh(b,c,d,a,x[i+14],23,-35309556);a=hh(a,b,c,d,x[i+1],4,-1530992060);d=hh(d,a,b,c,x[i+4],11,1272893353);c=hh(c,d,a,b,x[i+7],16,-155497632);b=hh(b,c,d,a,x[i+10],23,-1094730640);a=hh(a,b,c,d,x[i+13],4,681279174);d=hh(d,a,b,c,x[i],11,-358537222);c=hh(c,d,a,b,x[i+3],16,-722521979);b=hh(b,c,d,a,x[i+6],23,76029189);a=hh(a,b,c,d,x[i+9],4,-640364487);d=hh(d,a,b,c,x[i+12],11,-421815835);c=hh(c,d,a,b,x[i+15],16,530742520);b=hh(b,c,d,a,x[i+2],23,-995338651);a=ii(a,b,c,d,x[i],6,-198630844);d=ii(d,a,b,c,x[i+7],10,1126891415);c=ii(c,d,a,b,x[i+14],15,-1416354905);b=ii(b,c,d,a,x[i+5],21,-57434055);a=ii(a,b,c,d,x[i+12],6,1700485571);d=ii(d,a,b,c,x[i+3],10,-1894986606);c=ii(c,d,a,b,x[i+10],15,-1051523);b=ii(b,c,d,a,x[i+1],21,-2054922799);a=ii(a,b,c,d,x[i+8],6,1873313359);d=ii(d,a,b,c,x[i+15],10,-30611744);c=ii(c,d,a,b,x[i+6],15,-1560198380);b=ii(b,c,d,a,x[i+13],21,1309151649);a=ii(a,b,c,d,x[i+4],6,-145523070);d=ii(d,a,b,c,x[i+11],10,-1120210379);c=ii(c,d,a,b,x[i+2],15,718787259);b=ii(b,c,d,a,x[i+9],21,-343485551);a=au(a,oa);b=au(b,ob);c=au(c,oc);d=au(d,od)}function rh(n){var s="",j;for(j=0;j<4;j++)s+=((n>>(j*8+4))&0x0F).toString(16)+((n>>(j*8))&0x0F).toString(16);return s}return rh(a)+rh(b)+rh(c)+rh(d)}

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
   MORE TOOLS (added in v4.1)
   ========================================================================= */

/* ---- Password strength checker ---- */
function rPwCheck(c) {
  c.innerHTML = `<div class="card"><div class="field"><label>Password to test</label><input type="text" class="mono" id="psc" placeholder="Type or paste a password"></div><div id="psc-out"></div></div>`;
  const out = $("#psc-out");
  const upd = () => {
    const pw = $("#psc").value;
    if (!pw) { out.innerHTML = `<p class="muted center">Enter a password to analyze</p>`; return; }
    let pool = 0;
    if (/[a-z]/.test(pw)) pool += 26;
    if (/[A-Z]/.test(pw)) pool += 26;
    if (/[0-9]/.test(pw)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(pw)) pool += 32;
    const bits = Math.round(pw.length * Math.log2(pool || 1));
    const notes = [];
    if (pw.length < 12) notes.push("Too short — aim for 12+ characters");
    if (!/[A-Z]/.test(pw) || !/[a-z]/.test(pw)) notes.push("Mix upper- and lower-case");
    if (!/[0-9]/.test(pw)) notes.push("Add numbers");
    if (!/[^a-zA-Z0-9]/.test(pw)) notes.push("Add symbols");
    if (COMMON_PW.includes(pw.toLowerCase())) notes.push("⚠️ This is a very common password");
    if (/(.)\1{2,}/.test(pw)) notes.push("Avoid repeated characters (aaa, 111)");
    if (/(0123|1234|2345|3456|4567|5678|6789|abcd|qwer)/i.test(pw)) notes.push("Avoid sequences (1234, abcd, qwerty)");
    let label, cls;
    if (COMMON_PW.includes(pw.toLowerCase()) || bits < 28) { label = "Very weak"; cls = "err"; }
    else if (bits < 40) { label = "Weak"; cls = "err"; }
    else if (bits < 60) { label = "Fair"; cls = "warn"; }
    else if (bits < 80) { label = "Good"; cls = "ok"; }
    else { label = "Strong"; cls = "ok"; }
    const pct = Math.min(100, Math.round(bits / 90 * 100));
    out.innerHTML = `<div style="margin-top:4px"><span class="pill ${cls}">${label}</span> <span class="muted">· ~${bits} bits entropy</span></div>
      <div style="height:8px;border-radius:999px;background:var(--bg-2);margin:12px 0;overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--${cls === "ok" ? "ok" : cls === "warn" ? "warn" : "err"});transition:width .25s"></div></div>
      ${notes.length ? `<ul style="margin:8px 0 0 18px;color:var(--hint);font-size:13px;line-height:1.7">${notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : `<p class="status ok">✅ Looks strong</p>`}
      <p class="muted" style="margin-top:10px">Checked entirely in your browser — nothing is sent anywhere.</p>`;
  };
  $("#psc").addEventListener("input", upd); upd();
}

/* ---- Currency converter (fawazahmed0 free API, no key) ---- */
let _curCodes = null;
async function rCurrency(c) {
  form(`<div class="btn-row"><div class="field" style="flex:1"><label>Amount</label><input type="number" id="cur-amt" value="1" class="mono"></div></div>
    <div class="btn-row">
      <div class="field" style="flex:1"><label>From</label><select id="cur-from"></select></div>
      <div class="field" style="flex:1"><label>To</label><select id="cur-to"></select></div>
    </div>`, "Convert", doCur, "banknote");
  const fromSel = $("#cur-from"), toSel = $("#cur-to");
  fromSel.innerHTML = toSel.innerHTML = `<option>loading…</option>`;
  try {
    if (!_curCodes) _curCodes = await (await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.min.json")).json();
    const opts = Object.entries(_curCodes).map(([k, v]) => `<option value="${k}">${k.toUpperCase()} — ${esc(v)}</option>`).join("");
    fromSel.innerHTML = opts; toSel.innerHTML = opts;
    fromSel.value = "usd"; toSel.value = "eur";
  } catch (_) { fromSel.innerHTML = toSel.innerHTML = `<option value="usd">USD</option><option value="eur">EUR</option>`; }
  async function doCur() {
    const from = fromSel.value, to = toSel.value, amt = parseFloat($("#cur-amt").value) || 0;
    await serverRun("Fetching rate…", async () => {
      try {
        const data = await (await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${from}.json`)).json();
        const rate = data[from]?.[to];
        if (rate == null) throw new Error("Pair unavailable");
        setStatus("");
        resultCard(`<div class="big-out">${(amt * rate).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${to.toUpperCase()}</div>
          <p class="muted center">${amt} ${from.toUpperCase()} · rate ${rate.toPrecision(6)} · ${esc(data.date)}</p>`);
        play("success");
      } catch (e) { setStatus("❌ " + esc(e.message || "Failed"), "err"); play("error"); }
    });
  }
}

/* ---- Text diff (line-level LCS) ---- */
function rDiff(c) {
  form(`<div class="field"><label>Original</label><textarea id="df-a" class="mono" placeholder="First text…"></textarea></div>
    <div class="field"><label>Changed</label><textarea id="df-b" class="mono" placeholder="Second text…"></textarea></div>`, "Compare", () => {
    const a = $("#df-a").value.split("\n"), b = $("#df-b").value.split("\n");
    const diff = lcsDiff(a, b);
    let add = 0, del = 0;
    const html = diff.map(d => {
      if (d.t === "+") { add++; return `<div style="background:color-mix(in srgb,var(--ok) 16%,transparent);color:var(--ok);padding:1px 6px;border-radius:4px">+ ${esc(d.v)}</div>`; }
      if (d.t === "-") { del++; return `<div style="background:color-mix(in srgb,var(--err) 16%,transparent);color:var(--err);padding:1px 6px;border-radius:4px">- ${esc(d.v)}</div>`; }
      return `<div style="padding:1px 6px;color:var(--hint)">&nbsp;&nbsp;${esc(d.v)}</div>`;
    }).join("");
    resultCard(`<div style="margin-bottom:10px"><span class="pill ok">+${add}</span> <span class="pill err">-${del}</span></div><div class="out-area">${html || "<span class='muted'>identical</span>"}</div>`);
    play("success");
  }, "git-compare");
}
function lcsDiff(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ t: " ", v: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: "-", v: a[i++] }); }
    else { out.push({ t: "+", v: b[j++] }); }
  }
  while (i < n) out.push({ t: "-", v: a[i++] });
  while (j < m) out.push({ t: "+", v: b[j++] });
  return out;
}

/* ---- Base converter (BigInt) ---- */
function rBaseConv(c) {
  form(`<div class="field"><label>Value</label><input type="text" class="mono" id="bc-in" placeholder="255"></div>
    <div class="field"><label>Input base</label><select id="bc-base"><option value="0">Auto-detect</option><option value="2">Binary (2)</option><option value="8">Octal (8)</option><option value="10" selected>Decimal (10)</option><option value="16">Hex (16)</option></select></div>`, "Convert", () => {
    let s = $("#bc-in").value.trim().toLowerCase().replace(/^0x|^0b|^0o/, "");
    let base = +$("#bc-base").value;
    if (base === 0) base = /^[01]+$/.test(s) ? 2 : /^[0-7]+$/.test(s) ? 8 : /^[0-9a-f]+$/.test(s) && /[a-f]/.test(s) ? 16 : 10;
    const digits = "0123456789abcdef";
    let val = 0n; const B = BigInt(base);
    for (const ch of s) { const d = digits.indexOf(ch); if (d < 0 || d >= base) { setStatus(`❌ "${esc(ch)}" is not valid in base ${base}`, "err"); play("error"); return; } val = val * B + BigInt(d); }
    resultCard(rowsHTML({ Binary: `<span class="v mono">${val.toString(2)}</span>`, Octal: `<span class="v mono">${val.toString(8)}</span>`, Decimal: `<span class="v mono">${val.toString(10)}</span>`, Hex: `<span class="v mono">${val.toString(16).toUpperCase()}</span>` }));
    play("success");
  }, "calculator");
}

/* ---- Cron explainer ---- */
function rCron(c) {
  form(`<div class="field"><label>Cron expression (5 fields)</label><input type="text" class="mono" id="cr-in" placeholder="*/5 * * * *"></div>`, "Explain", () => {
    const txt = explainCron($("#cr-in").value.trim());
    if (!txt) { setStatus("❌ Need 5 fields: minute hour day month weekday", "err"); play("error"); return; }
    resultCard(`<p style="font-size:16px;font-weight:600">${esc(txt)}</p>`); play("success");
  }, "calendar-clock");
}
function explainCron(expr) {
  const f = expr.split(/\s+/); if (f.length !== 5) return null;
  const [mi, ho, dom, mo, dow] = f;
  const DOW = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const MON = ["","January","February","March","April","May","June","July","August","September","October","November","December"];
  const part = (v, kind) => {
    if (v === "*") return null;
    const named = n => kind === "dow" ? (DOW[n % 7] || n) : kind === "mon" ? (MON[n] || n) : n;
    if (/^\*\/(\d+)$/.test(v)) return `every ${RegExp.$1} ${kind}`;
    if (/^\d+(-\d+)$/.test(v)) { const [a, b] = v.split("-"); return `${named(+a)}–${named(+b)}`; }
    if (v.includes(",")) return v.split(",").map(x => named(+x)).join(", ");
    return named(+v);
  };
  let s = "At ";
  const everyMin = mi === "*", everyHr = ho === "*";
  if (/^\*\/(\d+)$/.test(mi) && everyHr) s = `Every ${mi.split("/")[1]} minutes`;
  else if (everyMin && everyHr) s = "Every minute";
  else {
    const m = everyMin ? "every minute" : `minute ${mi}`;
    const h = everyHr ? "every hour" : `hour ${ho}`;
    if (!everyMin && !everyHr) s = `At ${ho.padStart(2, "0")}:${mi.padStart(2, "0")}`;
    else s = `At ${m} past ${h}`;
  }
  if (dom !== "*") s += `, on day-of-month ${part(dom)}`;
  if (mo !== "*") s += `, in ${part(mo, "mon")}`;
  if (dow !== "*") s += `, on ${part(dow, "dow")}`;
  return s + ".";
}

/* ---- Real client-side speed test (Cloudflare) ---- */
function rSpeedtest(c) {
  c.innerHTML = `<div class="card center"><div class="big-out" id="st-main" style="font-size:40px">–</div><p class="muted" id="st-sub">Tap start to measure your connection</p>
    <div id="st-rows" style="margin:14px 0"></div>
    <button class="btn" id="st-go"><i data-lucide="gauge"></i> Start test</button>
    <p class="muted" style="margin-top:10px">Measured against Cloudflare's network, in your browser.</p></div>`;
  iconsRefresh();
  $("#st-go").onclick = async () => {
    const go = $("#st-go"); go.disabled = true; play("click"); haptic();
    const main = $("#st-main"), sub = $("#st-sub"), rows = $("#st-rows");
    // latency
    sub.textContent = "Measuring latency…"; main.textContent = "…";
    let pings = [];
    for (let i = 0; i < 5; i++) { const t = performance.now(); try { await fetch(`https://speed.cloudflare.com/__down?bytes=0&r=${Math.random()}`, { cache: "no-store" }); pings.push(performance.now() - t); } catch (_) {} }
    const ping = pings.length ? Math.min(...pings) : null;
    // download
    sub.textContent = "Measuring download…";
    const dl = await measure("https://speed.cloudflare.com/__down?bytes=25000000", 25000000);
    main.textContent = dl ? dl.toFixed(1) : "—"; sub.innerHTML = `<b>Mbps</b> download`;
    // upload (best effort)
    sub.textContent = "Measuring upload…";
    let up = null;
    try { const blob = new Uint8Array(6000000); const t = performance.now(); await fetch("https://speed.cloudflare.com/__up", { method: "POST", body: blob, cache: "no-store" }); const sec = (performance.now() - t) / 1000; up = (6000000 * 8) / sec / 1e6; } catch (_) {}
    rows.innerHTML = rowsHTML({ "⬇ Download": `<b>${dl ? dl.toFixed(1) : "—"} Mbps</b>`, "⬆ Upload": `${up ? up.toFixed(1) + " Mbps" : "—"}`, "⚡ Latency": `${ping ? Math.round(ping) + " ms" : "—"}` });
    main.textContent = dl ? dl.toFixed(1) : "—"; sub.innerHTML = `<b>Mbps</b> download`;
    go.disabled = false; go.innerHTML = `<i data-lucide="refresh-cw"></i> Test again`; iconsRefresh(); play("success"); notify();
  };
  async function measure(url, bytes) {
    try { const t = performance.now(); const res = await fetch(url + "&r=" + Math.random(), { cache: "no-store" }); const reader = res.body.getReader(); let got = 0; while (true) { const { done, value } = await reader.read(); if (done) break; got += value.length; } const sec = (performance.now() - t) / 1000; return (bytes * 8) / sec / 1e6; } catch (_) { return null; }
  }
}

/* ---- EXIF viewer (client-side via exifr) ---- */
function rExifView(c) {
  let file = null;
  c.innerHTML = `<div class="card"><div class="upload" id="ev-drop"><i data-lucide="scan-eye"></i><div id="ev-name">Choose a photo</div></div><input type="file" id="ev-file" accept="image/*" hidden><div id="ev-out" style="margin-top:14px"></div><p class="muted" style="margin-top:12px">Read entirely in your browser — the photo is never uploaded.</p></div>`;
  iconsRefresh();
  $("#ev-drop").onclick = () => $("#ev-file").click();
  $("#ev-file").onchange = async e => {
    file = e.target.files[0]; if (!file) return;
    $("#ev-name").textContent = file.name; $("#ev-drop").classList.add("active"); play("success");
    const out = $("#ev-out"); out.innerHTML = spin() + " Reading…";
    try {
      const d = await exifr.parse(file, { gps: true, tiff: true, exif: true, ifd0: true });
      if (!d || !Object.keys(d).length) { out.innerHTML = `<p class="status ok">✅ No metadata found — this photo is clean.</p>`; return; }
      const fmt = v => v instanceof Date ? v.toLocaleString() : Array.isArray(v) ? v.join(", ") : typeof v === "number" ? Math.round(v * 1e4) / 1e4 : esc(String(v));
      const pick = {};
      const map = { Make: "Camera make", Model: "Camera model", LensModel: "Lens", DateTimeOriginal: "Taken", ISO: "ISO", FNumber: "Aperture ƒ", ExposureTime: "Shutter", FocalLength: "Focal length", Software: "Software", Orientation: "Orientation" };
      for (const [k, label] of Object.entries(map)) if (d[k] != null) pick[label] = fmt(d[k]);
      if (d.latitude != null && d.longitude != null) {
        pick["📍 GPS"] = `<a href="https://maps.google.com/?q=${d.latitude},${d.longitude}" target="_blank">${d.latitude.toFixed(5)}, ${d.longitude.toFixed(5)}</a>`;
      }
      const extra = Object.keys(d).length;
      out.innerHTML = (d.latitude != null ? `<p class="status err" style="margin-bottom:8px">⚠️ Contains GPS location</p>` : "") +
        rowsHTML(Object.keys(pick).length ? pick : { Fields: extra + " metadata fields" }) +
        `<p class="muted" style="margin-top:10px">${extra} total fields. Use <b>EXIF Stripper</b> to remove them.</p>`;
      notify();
    } catch (err) { out.innerHTML = `<p class="status err">❌ Could not read: ${esc(err.message || "error")}</p>`; }
  };
}

/* =========================================================================
   MORE TOOLS (v5.1)
   ========================================================================= */

/* ---- Passphrase generator ---- */
const WORDS = "able acid acre army atom aunt baby band bank barn bath bean bear beat bell belt bird blue boat bone book boot brave bread brick brief broom brush cabin cable cake camp cane card cave chef city clay clean clear cliff cloud coal coast coin cold cool coral corn crab crane crisp crown cube curl dark dawn deep deer desk diet dire dish dock door dove draw dream drum dusk dust eagle earth east echo edge fair farm fern fire fish flag flame fox frost gate gear gift glow goat gold grape grass green grove hawk hill hint hive holly honey ice iron ivory jade jazz jelly jewel jolly judge keen kind king kite lake lamp leaf lemon lime lion lotus lunar maple march marsh mint mist moon moss navy neon nest noble north oak oasis ocean olive onyx opal orbit otter owl palm peak pearl pine pond pony quartz quick quiet rain reef ridge river robin rock rose ruby sage salt sand sea seed shade shell silk slate snow solar spark spire star stone storm swan tide tiger toad torch trail tulip vine violet wave whale wheat willow wind wolf wood zinc".split(" ");
function rPassphrase(c) {
  c.innerHTML = `<div class="card">
    <div class="big-out" id="pp" style="font-size:18px">· · · ·</div>
    <p class="muted center" id="pp-meta"></p>
    <div class="field" style="margin-top:14px"><div class="slider-row"><input type="range" id="pp-n" min="3" max="8" value="4"><b id="pp-nv">4</b></div></div>
    <div class="switch-row"><span>Capitalize words</span><input type="checkbox" class="sw" id="pp-cap" checked></div>
    <div class="switch-row"><span>Add a number</span><input type="checkbox" class="sw" id="pp-num" checked></div>
    <div class="field" style="margin-top:12px"><label>Separator</label><select id="pp-sep"><option value="-">dash (-)</option><option value=".">dot (.)</option><option value="_">underscore (_)</option><option value=" ">space</option></select></div>
    <div class="btn-row" style="margin-top:14px"><button class="btn" id="pp-gen"><i data-lucide="refresh-cw"></i> Generate</button><button class="btn ghost" id="pp-copy" style="flex:0 0 52px"><i data-lucide="copy"></i></button></div></div>`;
  const gen = () => {
    const n = +$("#pp-n").value, sep = $("#pp-sep").value, cap = $("#pp-cap").checked;
    const picks = Array.from({ length: n }, () => { const w = WORDS[crypto.getRandomValues(new Uint32Array(1))[0] % WORDS.length]; return cap ? w[0].toUpperCase() + w.slice(1) : w; });
    let pass = picks.join(sep);
    if ($("#pp-num").checked) pass += sep + (crypto.getRandomValues(new Uint32Array(1))[0] % 90 + 10);
    $("#pp").textContent = pass;
    $("#pp-meta").textContent = `${n} words · ~${Math.round(n * Math.log2(WORDS.length))}+ bits · easy to remember`;
  };
  $("#pp-n").addEventListener("input", e => { $("#pp-nv").textContent = e.target.value; gen(); });
  ["pp-cap", "pp-num", "pp-sep"].forEach(id => $("#" + id).addEventListener("change", gen));
  $("#pp-gen").addEventListener("click", () => { haptic(); play("success"); gen(); });
  $("#pp-copy").addEventListener("click", () => copy($("#pp").textContent));
  gen();
}

/* ---- Unit converter ---- */
const UNITS = {
  Length: { m: 1, km: 1000, cm: .01, mm: .001, mi: 1609.344, yd: .9144, ft: .3048, in: .0254 },
  Mass: { g: 1, kg: 1000, mg: .001, lb: 453.592, oz: 28.3495, ton: 1e6 },
  Data: { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776, bit: .125 },
  Speed: { "m/s": 1, "km/h": .277778, mph: .44704, knot: .514444, "ft/s": .3048 },
  Temperature: { "°C": "C", "°F": "F", K: "K" },
};
function rUnits(c) {
  form(`<div class="field"><label>Category</label><select id="u-cat">${Object.keys(UNITS).map(k => `<option>${k}</option>`).join("")}</select></div>
    <div class="field"><label>Amount</label><input type="number" class="mono" id="u-amt" value="1"></div>
    <div class="btn-row"><div class="field" style="flex:1"><label>From</label><select id="u-from"></select></div><div class="field" style="flex:1"><label>To</label><select id="u-to"></select></div></div>`, "Convert", doU, "ruler");
  const fill = () => { const cat = $("#u-cat").value, ks = Object.keys(UNITS[cat]); const o = ks.map(k => `<option>${k}</option>`).join(""); $("#u-from").innerHTML = o; $("#u-to").innerHTML = o; $("#u-to").selectedIndex = Math.min(1, ks.length - 1); doU(); };
  $("#u-cat").addEventListener("change", fill);
  function doU() {
    const cat = $("#u-cat").value, amt = parseFloat($("#u-amt").value), from = $("#u-from").value, to = $("#u-to").value;
    if (!isFinite(amt)) return;
    let res;
    if (cat === "Temperature") { let c0 = from === "°C" ? amt : from === "°F" ? (amt - 32) * 5 / 9 : amt - 273.15; res = to === "°C" ? c0 : to === "°F" ? c0 * 9 / 5 + 32 : c0 + 273.15; }
    else res = amt * UNITS[cat][from] / UNITS[cat][to];
    resultCard(`<div class="big-out">${(+res.toPrecision(8)).toLocaleString(undefined, { maximumFractionDigits: 8 })}</div><p class="muted center">${amt} ${esc(from)} = ${(+res.toPrecision(8))} ${esc(to)}</p>`); play("success");
  }
  fill();
}

/* ---- Date calculator ---- */
function rDateCalc(c) {
  const today = new Date().toISOString().slice(0, 10);
  form(`<div class="seg" id="dc-seg"><button data-m="between" class="active">Between dates</button><button data-m="add">Add days</button></div><div id="dc-fields"></div>`, "Calculate", doDC, "calendar-days");
  const seg = $("#dc-seg"); const fields = $("#dc-fields");
  const render = m => { fields.innerHTML = m === "between"
    ? `<div class="field"><label>Start</label><input type="date" id="dc-a" value="${today}"></div><div class="field"><label>End</label><input type="date" id="dc-b" value="${today}"></div>`
    : `<div class="field"><label>Date</label><input type="date" id="dc-a" value="${today}"></div><div class="field"><label>Days to add (negative to subtract)</label><input type="number" class="mono" id="dc-n" value="30"></div>`; };
  seg.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { seg.querySelector(".active").classList.remove("active"); b.classList.add("active"); play("click"); render(b.dataset.m); }));
  render("between");
  function doDC() {
    const m = seg.querySelector(".active").dataset.m;
    if (m === "between") {
      const a = new Date($("#dc-a").value), b = new Date($("#dc-b").value);
      if (isNaN(a) || isNaN(b)) return setStatus("❌ Pick both dates", "err");
      const days = Math.round((b - a) / 864e5);
      resultCard(rowsHTML({ Days: Math.abs(days).toLocaleString(), Weeks: (Math.abs(days) / 7).toFixed(1), Months: (Math.abs(days) / 30.44).toFixed(1), Years: (Math.abs(days) / 365.25).toFixed(2) }));
    } else {
      const a = new Date($("#dc-a").value); const n = parseInt($("#dc-n").value) || 0;
      if (isNaN(a)) return setStatus("❌ Pick a date", "err");
      a.setDate(a.getDate() + n);
      resultCard(`<div class="big-out" style="font-size:18px">${a.toISOString().slice(0, 10)}</div><p class="muted center">${a.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>`);
    }
    play("success");
  }
}

/* ---- Regex tester ---- */
function rRegex(c) {
  c.innerHTML = `<div class="card">
    <div class="field"><label>Pattern</label><input type="text" class="mono" id="rx-p" placeholder="\\\\b\\\\w+@\\\\w+\\\\.\\\\w+"></div>
    <div class="field"><label>Flags</label><input type="text" class="mono" id="rx-f" value="g" placeholder="gi"></div>
    <div class="field"><label>Test text</label><textarea id="rx-t" placeholder="Text to search…"></textarea></div>
    <div id="rx-out"></div></div>`;
  const upd = () => {
    const p = $("#rx-p").value, f = $("#rx-f").value, t = $("#rx-t").value, out = $("#rx-out");
    if (!p) { out.innerHTML = `<p class="muted">Enter a pattern</p>`; return; }
    let re; try { re = new RegExp(p, f.includes("g") ? f : f + "g"); } catch (e) { out.innerHTML = `<p class="status err">❌ ${esc(e.message)}</p>`; return; }
    const matches = [...t.matchAll(re)];
    const hl = esc(t).replace(/\n/g, "<br>");
    let marked = hl, count = matches.length;
    try { marked = esc(t).replace(new RegExp(p, f.includes("g") ? f : f + "g"), m => `<mark style="background:${"var(--accent)"};color:#052e2b;border-radius:3px">${esc(m)}</mark>`).replace(/\n/g, "<br>"); } catch (_) {}
    out.innerHTML = `<div style="margin-bottom:8px"><span class="pill ${count ? "ok" : "warn"}">${count} match${count === 1 ? "" : "es"}</span></div><div class="out-area">${marked || "<span class='muted'>no text</span>"}</div>` +
      (matches.length && matches[0].length > 1 ? `<label style="margin-top:12px">Groups (first match)</label>${rowsHTML(Object.fromEntries(matches[0].slice(1).map((g, i) => [`$${i + 1}`, `<span class="v mono">${esc(g ?? "")}</span>`])))}` : "");
  };
  ["rx-p", "rx-f", "rx-t"].forEach(id => $("#" + id).addEventListener("input", upd)); upd();
}

/* ---- Text ⇄ binary/hex ---- */
function rBinAscii(c) {
  form(`<div class="seg" id="ba-seg"><button data-m="enc" class="active">Text → Binary</button><button data-m="dec">Binary → Text</button></div>
    <div class="field"><label>Format</label><select id="ba-fmt"><option value="bin">Binary</option><option value="hex">Hex</option></select></div>
    <div class="field"><textarea id="ba-in" class="mono" placeholder="Input…"></textarea></div>`, "Convert", () => {
    const m = $("#ba-seg .active").dataset.m, fmt = $("#ba-fmt").value, v = $("#ba-in").value;
    let out;
    try {
      if (m === "enc") out = [...v].map(ch => { const code = ch.codePointAt(0); return fmt === "bin" ? code.toString(2).padStart(8, "0") : code.toString(16).padStart(2, "0"); }).join(" ");
      else { const parts = v.trim().split(/\s+/); out = parts.map(p => String.fromCodePoint(parseInt(p, fmt === "bin" ? 2 : 16))).join(""); }
    } catch (_) { setStatus("❌ Invalid input", "err"); return; }
    resultCard(`<div class="out-area">${esc(out)}</div><div class="btn-row" style="margin-top:12px">${copyBtn(out)}</div>`); play("success");
  }, "file-digit");
  segWire("ba-seg");
}

/* ---- Lorem ipsum ---- */
const LOREM = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum".split(" ");
function rLorem(c) {
  form(`<div class="field"><label>Type</label><select id="lo-t"><option value="para">Paragraphs</option><option value="sent">Sentences</option><option value="word">Words</option></select></div>
    <div class="field"><div class="slider-row"><input type="range" id="lo-n" min="1" max="10" value="3"><b id="lo-nv">3</b></div></div>`, "Generate", () => {
    const n = +$("#lo-n").value, t = $("#lo-t").value;
    const rnd = x => LOREM[Math.floor(Math.random() * LOREM.length)];
    const sentence = () => { const len = 8 + Math.floor(Math.random() * 10); let s = Array.from({ length: len }, rnd).join(" "); return s[0].toUpperCase() + s.slice(1) + "."; };
    const para = () => Array.from({ length: 4 + Math.floor(Math.random() * 3) }, sentence).join(" ");
    let out = t === "para" ? Array.from({ length: n }, para).join("\n\n") : t === "sent" ? Array.from({ length: n }, sentence).join(" ") : Array.from({ length: n }, rnd).join(" ");
    resultCard(`<div class="out-area">${esc(out)}</div><div class="btn-row" style="margin-top:12px">${copyBtn(out)}</div>`); play("success");
  }, "text-quote");
  $("#lo-n").addEventListener("input", e => $("#lo-nv").textContent = e.target.value);
}

/* ---- Caesar / ROT13 ---- */
function rCipher(c) {
  form(`<div class="field"><textarea id="ci-in" placeholder="Text…"></textarea></div>
    <div class="field"><label>Shift <b id="ci-sv" style="color:var(--accent)">13</b> (13 = ROT13)</label><div class="slider-row"><input type="range" id="ci-s" min="0" max="25" value="13"></div></div>`, "Apply", () => {
    const s = (+$("#ci-s").value) % 26, v = $("#ci-in").value;
    const shift = (str, k) => str.replace(/[a-z]/gi, ch => { const base = ch <= "Z" ? 65 : 97; return String.fromCharCode((ch.charCodeAt(0) - base + k + 26) % 26 + base); });
    const enc = shift(v, s), dec = shift(v, -s);
    resultCard(`<label>Encoded (+${s})</label><div class="out-area">${esc(enc)}</div><div class="btn-row" style="margin:10px 0">${copyBtn(enc, "Copy encoded")}</div><label>Decoded (−${s})</label><div class="out-area">${esc(dec)}</div>`); play("success");
  }, "replace");
  $("#ci-s").addEventListener("input", e => $("#ci-sv").textContent = e.target.value);
}

/* ---- File checksum (client-side) ---- */
function rFileChecksum(c) {
  let file = null;
  c.innerHTML = `<div class="card"><div class="upload" id="fc-drop"><i data-lucide="file-check"></i><div id="fc-name">Choose any file</div></div><input type="file" id="fc-file" hidden><div id="fc-out" style="margin-top:14px"></div><p class="muted" style="margin-top:12px">Hashed entirely in your browser — the file is never uploaded.</p></div>`;
  iconsRefresh();
  $("#fc-drop").onclick = () => $("#fc-file").click();
  $("#fc-file").onchange = async e => {
    file = e.target.files[0]; if (!file) return;
    $("#fc-name").textContent = `${file.name} · ${(file.size / 1024).toFixed(1)} KB`; $("#fc-drop").classList.add("active"); play("success");
    const out = $("#fc-out"); out.innerHTML = spin() + " Hashing…";
    try {
      const buf = await file.arrayBuffer();
      const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
      const [s1, s256] = await Promise.all([crypto.subtle.digest("SHA-1", buf), crypto.subtle.digest("SHA-256", buf)]);
      // MD5 over raw bytes (latin1), chunked to avoid call-stack limits
      const u8 = new Uint8Array(buf); let bin = ""; for (let i = 0; i < u8.length; i += 8192) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
      const m = md5(bin, true);
      out.innerHTML = rowsHTML({ MD5: `<span class="v mono">${m}</span>`, "SHA-1": `<span class="v mono">${hex(s1)}</span>`, "SHA-256": `<span class="v mono" style="font-size:11px">${hex(s256)}</span>` }) + `<div class="btn-row" style="margin-top:12px">${copyBtn(hex(s256), "Copy SHA-256")}</div>`;
      iconsRefresh(); notify();
    } catch (err) { out.innerHTML = `<p class="status err">❌ ${esc(err.message || "error")}</p>`; }
  };
}

/* ---- Fake identity generator ---- */
const FN = "Alex Maria Ion Andrei Elena Sofia Luca David Ana Mihai Ioana Gabriel Daria Victor Nina Emil Clara Felix Lena Theo Ruby Noah Mila Leo Ada Max Vera Ivan Lea Omar".split(" ");
const LN = "Pop Ionescu Popescu Stan Dumitru Rusu Novak Kovac Smith Jones Garcia Rossi Muller Chen Kim Silva Novak Horvat Weber Dubois Marin Barbu Cruz Ford Lang Reid Vance Hale".split(" ");
const CITY = ["Bucharest","Cluj","Berlin","Lisbon","Austin","Osaka","Lyon","Milan","Porto","Prague","Oslo","Tallinn","Gdansk","Zurich","Leeds"];
const STREET = ["Oak","Maple","Cedar","Pine","Birch","Elm","Willow","Aspen","Linden","Rowan"];
const DOMAINS = ["example.com","mail.test","inbox.dev","demo.io","sample.net"];
function rnd(a) { return a[crypto.getRandomValues(new Uint32Array(1))[0] % a.length]; }
function rFakeId(c) {
  c.innerHTML = `<div class="card"><div id="fi-out"></div><button class="btn" id="fi-gen" style="margin-top:14px"><i data-lucide="refresh-cw"></i> New identity</button><p class="muted" style="margin-top:12px">Random, fictitious data for testing/forms — not real people.</p></div>`;
  const gen = () => {
    const fn = rnd(FN), ln = rnd(LN), n = crypto.getRandomValues(new Uint32Array(1))[0];
    const user = (fn + ln).toLowerCase() + (n % 1000);
    const id = {
      Name: `${fn} ${ln}`, Username: user, Email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${rnd(DOMAINS)}`,
      Phone: `+40 7${n % 10}${(n % 90 + 10)} ${n % 900 + 100} ${n % 900 + 100}`,
      Address: `${n % 200 + 1} ${rnd(STREET)} St, ${rnd(CITY)}`,
      "Date of birth": `${1970 + n % 35}-${String(n % 12 + 1).padStart(2, "0")}-${String(n % 28 + 1).padStart(2, "0")}`,
    };
    $("#fi-out").innerHTML = rowsHTML(Object.fromEntries(Object.entries(id).map(([k, v]) => [k, `<span class="v mono" style="font-size:13px">${esc(v)}</span>`]))) + `<div class="btn-row" style="margin-top:12px">${copyBtn(Object.entries(id).map(([k, v]) => k + ": " + v).join("\n"), "Copy all")}</div>`;
    iconsRefresh();
  };
  $("#fi-gen").onclick = () => { haptic(); play("success"); gen(); };
  gen();
}

/* ---- Countdown ---- */
let _cdTimer = null;
function rCountdown(c) {
  const def = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 16);
  c.innerHTML = `<div class="card"><div class="field"><label>Target date & time</label><input type="datetime-local" id="cd-in" value="${def}"></div>
    <button class="btn" id="cd-go"><i data-lucide="timer"></i> Start countdown</button>
    <div id="cd-out" style="margin-top:18px"></div></div>`;
  iconsRefresh();
  const tick = target => {
    const out = $("#cd-out"); if (!out) { clearInterval(_cdTimer); return; }
    let s = Math.floor((target - Date.now()) / 1000);
    const past = s < 0; s = Math.abs(s);
    const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    out.innerHTML = `<div class="big-out" style="font-size:30px">${d}d ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}</div><p class="muted center">${past ? "elapsed since" : "remaining until"} ${new Date(target).toLocaleString()}</p>`;
  };
  $("#cd-go").onclick = () => {
    const target = new Date($("#cd-in").value).getTime(); if (isNaN(target)) return;
    play("click"); haptic(); if (_cdTimer) clearInterval(_cdTimer); tick(target); _cdTimer = setInterval(() => tick(target), 1000);
  };
}

/* ---- Calculators (BMI / Loan / Tip) ---- */
function rCalc(c) {
  form(`<div class="seg" id="ca-seg"><button data-m="bmi" class="active">BMI</button><button data-m="loan">Loan</button><button data-m="tip">Tip</button></div><div id="ca-fields"></div>`, "Calculate", doCalc, "percent");
  const seg = $("#ca-seg"), fields = $("#ca-fields");
  const render = m => {
    fields.innerHTML = m === "bmi"
      ? `<div class="btn-row"><div class="field" style="flex:1"><label>Weight (kg)</label><input type="number" class="mono" id="ca-w" value="70"></div><div class="field" style="flex:1"><label>Height (cm)</label><input type="number" class="mono" id="ca-h" value="175"></div></div>`
      : m === "loan"
      ? `<div class="field"><label>Amount</label><input type="number" class="mono" id="ca-amt" value="10000"></div><div class="btn-row"><div class="field" style="flex:1"><label>Rate % / yr</label><input type="number" class="mono" id="ca-rate" value="6.5"></div><div class="field" style="flex:1"><label>Years</label><input type="number" class="mono" id="ca-yrs" value="5"></div></div>`
      : `<div class="field"><label>Bill amount</label><input type="number" class="mono" id="ca-bill" value="50"></div><div class="btn-row"><div class="field" style="flex:1"><label>Tip %</label><input type="number" class="mono" id="ca-pct" value="15"></div><div class="field" style="flex:1"><label>Split</label><input type="number" class="mono" id="ca-ppl" value="1"></div></div>`;
  };
  seg.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { seg.querySelector(".active").classList.remove("active"); b.classList.add("active"); play("click"); render(b.dataset.m); }));
  render("bmi");
  function doCalc() {
    const m = seg.querySelector(".active").dataset.m;
    if (m === "bmi") {
      const w = +$("#ca-w").value, h = +$("#ca-h").value / 100; if (!w || !h) return;
      const bmi = w / (h * h); const cat = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese";
      resultCard(`<div class="big-out">${bmi.toFixed(1)}</div><p class="center"><span class="pill ${bmi < 18.5 || bmi >= 30 ? "warn" : bmi < 25 ? "ok" : "warn"}">${cat}</span></p>`);
    } else if (m === "loan") {
      const p = +$("#ca-amt").value, r = +$("#ca-rate").value / 100 / 12, n = +$("#ca-yrs").value * 12; if (!p || !n) return;
      const pay = r ? p * r / (1 - Math.pow(1 + r, -n)) : p / n; const total = pay * n;
      resultCard(rowsHTML({ "Monthly payment": `<b>${pay.toFixed(2)}</b>`, "Total repaid": total.toFixed(2), "Total interest": (total - p).toFixed(2) }));
    } else {
      const bill = +$("#ca-bill").value, pct = +$("#ca-pct").value, ppl = Math.max(1, +$("#ca-ppl").value); if (!bill) return;
      const tip = bill * pct / 100, total = bill + tip;
      resultCard(rowsHTML({ Tip: tip.toFixed(2), Total: `<b>${total.toFixed(2)}</b>`, [`Per person (${ppl})`]: (total / ppl).toFixed(2) }));
    }
    play("success");
  }
}

/* ---- SSL certificate checker (server) ---- */
function rSSL(c) {
  form(`<div class="field"><label>Hostname</label><input type="text" class="mono" id="ssl-in" placeholder="example.com"></div>`, "Check", async () => {
    await serverRun("Fetching certificate…", async () => {
      const d = await api("ssl", { host: $("#ssl-in").value }); if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus("");
      const dl = d.days_left;
      const badge = d.expired ? `<span class="pill err">expired</span>` : dl != null && dl < 21 ? `<span class="pill warn">${dl}d left</span>` : `<span class="pill ok">${dl}d left</span>`;
      resultCard(rowsHTML({ Host: `<span class="v mono">${esc(d.host)}</span>`, Status: badge, Issuer: esc(d.issuer), Subject: `<span class="v mono" style="font-size:12px">${esc(d.subject)}</span>`, "Valid to": `<span class="v mono" style="font-size:12px">${esc(d.valid_to)}</span>`, "SAN hosts": d.san_count }));
      play(d.expired ? "error" : "success");
    });
  }, "lock");
}

/* ---- CSV ⇄ JSON (client) ---- */
function parseCSVLine(line) { const out = []; let cur = "", q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; } else { if (ch === '"') q = true; else if (ch === ",") { out.push(cur); cur = ""; } else cur += ch; } } out.push(cur); return out; }
function rCsvJson(c) {
  form(`<div class="seg" id="cj-seg"><button data-m="c2j" class="active">CSV → JSON</button><button data-m="j2c">JSON → CSV</button></div>
    <div class="field"><textarea id="cj-in" class="mono" placeholder="Paste CSV or JSON…"></textarea></div>`, "Convert", () => {
    const m = $("#cj-seg .active").dataset.m, v = $("#cj-in").value.trim();
    let out;
    try {
      if (m === "c2j") {
        const lines = v.split(/\r?\n/).filter(l => l.length);
        const head = parseCSVLine(lines[0]);
        const arr = lines.slice(1).map(l => { const f = parseCSVLine(l); return Object.fromEntries(head.map((h, i) => [h, f[i] ?? ""])); });
        out = JSON.stringify(arr, null, 2);
      } else {
        let arr = JSON.parse(v); if (!Array.isArray(arr)) arr = [arr];
        const keys = [...new Set(arr.flatMap(o => Object.keys(o)))];
        const esc2 = x => { x = x == null ? "" : String(x); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
        out = [keys.join(","), ...arr.map(o => keys.map(k => esc2(o[k])).join(","))].join("\n");
      }
    } catch (e) { setStatus("❌ " + esc(e.message), "err"); play("error"); return; }
    resultCard(`<div class="out-area">${esc(out)}</div><div class="btn-row" style="margin-top:12px">${copyBtn(out)}</div>`); play("success");
  }, "table");
  segWire("cj-seg");
}

/* ---- World clock (client) ---- */
let _wcTimer = null;
const WC_ZONES = [["UTC", "UTC"], ["New York", "America/New_York"], ["London", "Europe/London"], ["Bucharest", "Europe/Bucharest"], ["Dubai", "Asia/Dubai"], ["Tokyo", "Asia/Tokyo"], ["Sydney", "Australia/Sydney"], ["Los Angeles", "America/Los_Angeles"]];
function rWorldClock(c) {
  c.innerHTML = `<div class="card"><div class="rows" id="wc-out"></div></div>`;
  const tick = () => {
    const out = $("#wc-out"); if (!out) { clearInterval(_wcTimer); return; }
    const now = new Date();
    out.innerHTML = WC_ZONES.map(([label, tz]) => {
      let t = "—"; try { t = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short" }).format(now); } catch (_) {}
      return `<div class="row"><span class="k">${esc(label)}</span><span class="v mono">${esc(t)}</span></div>`;
    }).join("");
  };
  tick(); if (_wcTimer) clearInterval(_wcTimer); _wcTimer = setInterval(tick, 1000);
}

/* ---- Random picker (client) ---- */
function rPicker(c) {
  c.innerHTML = `<div class="card"><div class="field"><label>Items (one per line)</label><textarea id="pk-in" placeholder="Alice\nBob\nCarol"></textarea></div>
    <div class="btn-row"><button class="btn" id="pk-pick"><i data-lucide="target"></i> Pick one</button><button class="btn ghost" id="pk-shuf"><i data-lucide="shuffle"></i> Shuffle</button></div>
    <div id="pk-out" class="result"></div></div>`;
  iconsRefresh();
  const items = () => $("#pk-in").value.split(/\n/).map(x => x.trim()).filter(Boolean);
  $("#pk-pick").onclick = () => { const a = items(); if (!a.length) return; haptic(); play("success"); const w = a[crypto.getRandomValues(new Uint32Array(1))[0] % a.length]; $("#pk-out").innerHTML = `<div class="big-out" style="font-size:20px">${esc(w)}</div>`; notify(); };
  $("#pk-shuf").onclick = () => { const a = items(); if (!a.length) return; haptic(); play("success"); for (let i = a.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);[a[i], a[j]] = [a[j], a[i]]; } $("#pk-out").innerHTML = `<div class="out-area">${a.map((x, i) => `${i + 1}. ${esc(x)}`).join("\n")}</div>`; };
}

/* ---- Stopwatch (client) ---- */
let _swTimer = null;
function rStopwatch(c) {
  let start = 0, elapsed = 0, running = false, laps = [];
  c.innerHTML = `<div class="card center"><div class="big-out" id="sw-d" style="font-size:40px">00:00.00</div>
    <div class="btn-row" style="margin-top:8px"><button class="btn" id="sw-go"><i data-lucide="play"></i> Start</button><button class="btn ghost" id="sw-lap"><i data-lucide="flag"></i> Lap</button><button class="btn ghost" id="sw-rst" style="flex:0 0 52px"><i data-lucide="rotate-ccw"></i></button></div>
    <div id="sw-laps" class="rows" style="margin-top:14px"></div></div>`;
  iconsRefresh();
  const fmt = ms => { const m = Math.floor(ms / 60000), s = Math.floor(ms % 60000 / 1000), cs = Math.floor(ms % 1000 / 10); return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`; };
  const upd = () => { const d = $("#sw-d"); if (!d) { clearInterval(_swTimer); return; } d.textContent = fmt(elapsed + (running ? Date.now() - start : 0)); };
  $("#sw-go").onclick = () => {
    haptic(); play("click"); running = !running;
    if (running) { start = Date.now(); if (_swTimer) clearInterval(_swTimer); _swTimer = setInterval(upd, 31); $("#sw-go").innerHTML = `<i data-lucide="pause"></i> Pause`; }
    else { elapsed += Date.now() - start; clearInterval(_swTimer); $("#sw-go").innerHTML = `<i data-lucide="play"></i> Start`; }
    iconsRefresh();
  };
  $("#sw-lap").onclick = () => { if (!running && !elapsed) return; haptic(); laps.unshift(fmt(elapsed + (running ? Date.now() - start : 0))); $("#sw-laps").innerHTML = laps.map((l, i) => `<div class="row"><span class="k">Lap ${laps.length - i}</span><span class="v mono">${l}</span></div>`).join(""); };
  $("#sw-rst").onclick = () => { haptic(); play("click"); running = false; elapsed = 0; laps = []; clearInterval(_swTimer); $("#sw-d").textContent = "00:00.00"; $("#sw-laps").innerHTML = ""; $("#sw-go").innerHTML = `<i data-lucide="play"></i> Start`; iconsRefresh(); };
}

/* ---- DNS lookup (server) ---- */
function rDns(c) {
  form(`<div class="field"><label>Domain</label><input type="text" class="mono" id="dn-in" placeholder="example.com"></div>
    <div class="field"><label>Record type</label><select id="dn-t">${["A","AAAA","MX","TXT","CNAME","NS","SOA","CAA","SRV"].map(x => `<option>${x}</option>`).join("")}</select></div>`, "Lookup", async () => {
    await serverRun("Resolving…", async () => {
      const d = await api("dns", { domain: $("#dn-in").value, type: $("#dn-t").value }); if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus("");
      resultCard(d.records.length ? `<label>${esc(d.type)} records</label><div class="out-area">${d.records.map(esc).join("\n")}</div>` : `<p class="muted center">No ${esc(d.type)} records</p>`);
      play("success");
    });
  }, "list-tree");
}

/* ---- Validator (IBAN / card Luhn) ---- */
function ibanValid(v) { v = v.replace(/\s+/g, "").toUpperCase(); if (!/^[A-Z0-9]{15,34}$/.test(v)) return null; const re = v.slice(4) + v.slice(0, 4); let s = ""; for (const ch of re) s += (ch >= "A" && ch <= "Z") ? (ch.charCodeAt(0) - 55).toString() : ch; let rem = 0; for (const d of s) rem = (rem * 10 + (+d)) % 97; return rem === 1; }
function luhnValid(v) { v = v.replace(/\D/g, ""); if (v.length < 12) return null; let sum = 0, alt = false; for (let i = v.length - 1; i >= 0; i--) { let n = +v[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } sum += n; alt = !alt; } return sum % 10 === 0; }
function rValidator(c) {
  form(`<div class="seg" id="vl-seg"><button data-m="iban" class="active">IBAN</button><button data-m="card">Card (Luhn)</button></div>
    <div class="field"><input type="text" class="mono" id="vl-in" placeholder="Enter value…"></div>`, "Validate", () => {
    const m = $("#vl-seg .active").dataset.m, v = $("#vl-in").value;
    const ok = m === "iban" ? ibanValid(v) : luhnValid(v);
    if (ok === null) { setStatus("❌ Doesn't look like a valid " + (m === "iban" ? "IBAN" : "card number"), "err"); play("error"); return; }
    resultCard(`<p class="center">${ok ? '<span class="pill ok">✓ Valid</span>' : '<span class="pill err">✗ Invalid checksum</span>'}</p>`);
    play(ok ? "success" : "error");
  }, "badge-check");
  segWire("vl-seg");
}

/* ---- Markdown preview (client, sanitized) ---- */
function mdToHtml(md) {
  let h = esc(md);
  h = h.replace(/```([\s\S]*?)```/g, (m, c) => `<pre class="out-area" style="margin:8px 0">${c.trim()}</pre>`);
  h = h.replace(/`([^`\n]+)`/g, '<code style="background:var(--bg);padding:1px 5px;border-radius:4px;font-family:var(--mono)">$1</code>');
  for (let i = 6; i >= 1; i--) h = h.replace(new RegExp(`^#{${i}} (.*)$`, "gm"), `<h${i} style="margin:10px 0 6px">$1</h${i}>`);
  h = h.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>");
  h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, u) => /^(https?:|mailto:)/i.test(u) ? `<a href="${u}" target="_blank">${t}</a>` : t);
  h = h.replace(/^(?:- |\* )(.*)$/gm, "<li>$1</li>").replace(/(<li>[\s\S]*?<\/li>)/g, "<ul style='margin:6px 0 6px 18px'>$1</ul>");
  h = h.replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>");
  return h;
}
function rMarkdown(c) {
  c.innerHTML = `<div class="card"><div class="field"><label>Markdown</label><textarea id="md-in" class="mono" style="min-height:140px" placeholder="# Hello\n**bold** and *italic*\n- a list\n[link](https://x.com)"></textarea></div><label>Preview</label><div id="md-out" class="out-area" style="font-family:var(--sans)"></div></div>`;
  const upd = () => { $("#md-out").innerHTML = mdToHtml($("#md-in").value) || "<span class='muted'>…</span>"; };
  $("#md-in").addEventListener("input", upd); upd();
}

/* =========================================================================
   MORE TOOLS (v6) — hash id, text pack, encoding & ciphers, steganography
   ========================================================================= */

/* ---- Hash identifier ---- */
function identifyHash(h) {
  h = h.trim();
  if (/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(h)) return ["bcrypt"];
  if (/^\$argon2(id|i|d)\$/.test(h)) return ["Argon2"];
  if (/^\$6\$/.test(h)) return ["sha512crypt ($6$)"];
  if (/^\$5\$/.test(h)) return ["sha256crypt ($5$)"];
  if (/^\$1\$/.test(h)) return ["md5crypt ($1$)"];
  if (/^[0-9a-f]+$/i.test(h)) {
    const map = { 32: ["MD5", "NTLM", "MD4"], 40: ["SHA-1", "RIPEMD-160"], 56: ["SHA-224", "SHA3-224"], 64: ["SHA-256", "SHA3-256", "BLAKE2s"], 96: ["SHA-384", "SHA3-384"], 128: ["SHA-512", "SHA3-512", "BLAKE2b", "Whirlpool"], 16: ["CRC-64", "MySQL<4.1"] };
    return map[h.length] || null;
  }
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(h) && h.length % 4 === 0) return ["Base64 (encoded, not a raw hash)"];
  return null;
}
function rHashId(c) {
  form(`<div class="field"><label>Hash</label><input type="text" class="mono" id="hi-in" placeholder="paste a hash"></div>`, "Identify", () => {
    const r = identifyHash($("#hi-in").value); if (!r) { setStatus("❌ Unrecognized format", "err"); play("error"); return; }
    resultCard(`<label>Likely type${r.length > 1 ? "s" : ""}</label><div>${r.map(x => `<span class="pill info" style="margin:3px 3px 0 0">${esc(x)}</span>`).join("")}</div>`); play("success");
  }, "search-check");
}

/* ---- Base32 / Base58 ---- */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function b32encode(bytes) { let bits = 0, val = 0, out = ""; for (const b of bytes) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } } if (bits > 0) out += B32[(val << (5 - bits)) & 31]; while (out.length % 8) out += "="; return out; }
function b32decode(str) { str = str.replace(/=+$/, "").toUpperCase(); let bits = 0, val = 0; const out = []; for (const ch of str) { const i = B32.indexOf(ch); if (i < 0) throw new Error("bad"); val = (val << 5) | i; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } } return new Uint8Array(out); }
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function b58encode(bytes) { let zeros = 0; while (zeros < bytes.length && bytes[zeros] === 0) zeros++; const digits = [0]; for (let i = zeros; i < bytes.length; i++) { let carry = bytes[i]; for (let j = 0; j < digits.length; j++) { carry += digits[j] << 8; digits[j] = carry % 58; carry = (carry / 58) | 0; } while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0; } } let out = "1".repeat(zeros); for (let i = digits.length - 1; i >= 0; i--) out += B58[digits[i]]; return out; }
function b58decode(str) { let zeros = 0; while (zeros < str.length && str[zeros] === "1") zeros++; const bytes = [0]; for (let i = zeros; i < str.length; i++) { let carry = B58.indexOf(str[i]); if (carry < 0) throw new Error("bad"); for (let j = 0; j < bytes.length; j++) { carry += bytes[j] * 58; bytes[j] = carry & 255; carry >>= 8; } while (carry) { bytes.push(carry & 255); carry >>= 8; } } const out = new Uint8Array(zeros + bytes.length); for (let i = 0; i < bytes.length; i++) out[zeros + bytes.length - 1 - i] = bytes[i]; return out; }
function rBaseX(c) {
  form(`<div class="field"><label>Base</label><select id="bx-b"><option value="32">Base32</option><option value="58">Base58</option></select></div>
    <div class="seg" id="bx-seg"><button data-m="enc" class="active">Encode</button><button data-m="dec">Decode</button></div>
    <div class="field"><textarea id="bx-in" class="mono" placeholder="Input…"></textarea></div>`, "Convert", () => {
    const base = $("#bx-b").value, m = $("#bx-seg .active").dataset.m, v = $("#bx-in").value;
    let out; try { if (m === "enc") { const by = new TextEncoder().encode(v); out = base === "32" ? b32encode(by) : b58encode(by); } else { out = new TextDecoder().decode(base === "32" ? b32decode(v.trim()) : b58decode(v.trim())); } }
    catch (_) { setStatus("❌ Invalid input", "err"); play("error"); return; }
    resultCard(`<div class="out-area">${esc(out)}</div><div class="btn-row" style="margin-top:12px">${copyBtn(out)}</div>`); play("success");
  }, "boxes");
  segWire("bx-seg");
}

/* ---- Escapes: HTML / Unicode / Punycode ---- */
const puny = (() => {
  const base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700, iBias = 72, iN = 128, maxInt = 2147483647;
  const adapt = (d, n, f) => { d = f ? Math.floor(d / damp) : d >> 1; d += Math.floor(d / n); let k = 0; for (; d > ((base - tMin) * tMax) >> 1; k += base) d = Math.floor(d / (base - tMin)); return Math.floor(k + (base - tMin + 1) * d / (d + skew)); };
  const d2c = d => d + 22 + 75 * (d < 26);
  const c2d = c => c - 48 < 10 ? c - 22 : c - 65 < 26 ? c - 65 : c - 97;
  function decode(input) {
    const out = []; let n = iN, i = 0, bias = iBias; let b = input.lastIndexOf("-");
    for (let j = 0; j < (b < 0 ? 0 : b); j++) out.push(input.charCodeAt(j));
    for (let idx = b < 0 ? 0 : b + 1; idx < input.length;) {
      const oldi = i; for (let w = 1, k = base; ; k += base) { const digit = c2d(input.charCodeAt(idx++)); i += digit * w; const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias; if (digit < t) break; w *= (base - t); }
      const len = out.length + 1; bias = adapt(i - oldi, len, oldi === 0); n += Math.floor(i / len); i %= len; out.splice(i++, 0, n);
    }
    return String.fromCodePoint(...out);
  }
  function encode(str) {
    const input = [...str].map(c => c.codePointAt(0)); const out = []; let n = iN, delta = 0, bias = iBias;
    for (const c of input) if (c < 0x80) out.push(c); let h = out.length; const basic = h; if (basic) out.push(45);
    while (h < input.length) {
      let m = maxInt; for (const c of input) if (c >= n && c < m) m = c;
      delta += (m - n) * (h + 1); n = m;
      for (const c of input) { if (c < n) delta++; if (c === n) { let q = delta; for (let k = base; ; k += base) { const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias; if (q < t) break; out.push(d2c(t + (q - t) % (base - t))); q = Math.floor((q - t) / (base - t)); } out.push(d2c(q)); bias = adapt(delta, h + 1, h === basic); delta = 0; h++; } }
      delta++; n++;
    }
    return String.fromCharCode(...out);
  }
  const toASCII = s => s.split(".").map(l => /[^\x00-\x7f]/.test(l) ? "xn--" + encode(l) : l).join(".");
  const toUnicode = s => s.split(".").map(l => l.toLowerCase().startsWith("xn--") ? decode(l.slice(4)) : l).join(".");
  return { toASCII, toUnicode };
})();
function rEscapes(c) {
  form(`<div class="field"><label>Type</label><select id="es-t"><option value="html">HTML entities</option><option value="uni">Unicode \\u</option><option value="puny">Punycode (domain)</option></select></div>
    <div class="seg" id="es-seg"><button data-m="enc" class="active">Encode</button><button data-m="dec">Decode</button></div>
    <div class="field"><textarea id="es-in" class="mono" placeholder="Input…"></textarea></div>`, "Convert", () => {
    const t = $("#es-t").value, m = $("#es-seg .active").dataset.m, v = $("#es-in").value; let out;
    try {
      if (t === "html") out = m === "enc" ? v.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])) : (() => { const ta = document.createElement("textarea"); ta.innerHTML = v; return ta.value; })();
      else if (t === "uni") out = m === "enc" ? [...v].map(c => { const cp = c.codePointAt(0); return cp > 0xffff ? "\\u{" + cp.toString(16) + "}" : "\\u" + cp.toString(16).padStart(4, "0"); }).join("") : v.replace(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})/gi, (_, a, b) => String.fromCodePoint(parseInt(a || b, 16)));
      else out = m === "enc" ? puny.toASCII(v.trim()) : puny.toUnicode(v.trim());
    } catch (e) { setStatus("❌ " + esc(e.message || "error"), "err"); play("error"); return; }
    resultCard(`<div class="out-area">${esc(out)}</div><div class="btn-row" style="margin-top:12px">${copyBtn(out)}</div>`); play("success");
  }, "ampersand");
  segWire("es-seg");
}

/* ---- Line tools ---- */
function rLineTools(c) {
  c.innerHTML = `<div class="card"><div class="field"><textarea id="lt-in" class="mono" style="min-height:120px" placeholder="One item per line…"></textarea></div>
    <div class="seg" id="lt-ops" style="flex-wrap:wrap">
      <button data-op="sort">Sort ↑</button><button data-op="sortd">Sort ↓</button><button data-op="uniq">Unique</button><button data-op="noblank">No blanks</button><button data-op="rev">Reverse</button><button data-op="trim">Trim</button><button data-op="shuf">Shuffle</button></div>
    <div id="lt-out" class="result"></div></div>`;
  const ops = {
    sort: a => [...a].sort((x, y) => x.localeCompare(y)), sortd: a => [...a].sort((x, y) => y.localeCompare(x)),
    uniq: a => [...new Set(a)], noblank: a => a.filter(l => l.trim()), rev: a => [...a].reverse(),
    trim: a => a.map(l => l.trim()), shuf: a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; },
  };
  $("#lt-ops").querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    play("click"); haptic(); const lines = $("#lt-in").value.split(/\n/); const out = ops[b.dataset.op](lines).join("\n");
    $("#lt-out").innerHTML = `<div class="card"><div class="out-area">${esc(out)}</div><div class="btn-row" style="margin-top:12px">${copyBtn(out)}</div></div>`; iconsRefresh();
  }));
}

/* ---- Find & replace ---- */
function rFindReplace(c) {
  form(`<div class="field"><label>Text</label><textarea id="fr-t" placeholder="Text…"></textarea></div>
    <div class="btn-row"><div class="field" style="flex:1"><label>Find (regex)</label><input class="mono" id="fr-f"></div><div class="field" style="flex:1"><label>Replace</label><input class="mono" id="fr-r"></div></div>
    <div class="field"><label>Flags</label><input class="mono" id="fr-fl" value="g"></div>`, "Replace", () => {
    let re; try { re = new RegExp($("#fr-f").value, $("#fr-fl").value); } catch (e) { setStatus("❌ " + esc(e.message), "err"); play("error"); return; }
    const out = $("#fr-t").value.replace(re, $("#fr-r").value);
    resultCard(`<div class="out-area">${esc(out)}</div><div class="btn-row" style="margin-top:12px">${copyBtn(out)}</div>`); play("success");
  }, "replace-all");
}

/* ---- Text analysis ---- */
function countSyll(w) { w = w.toLowerCase().replace(/[^a-z]/g, ""); if (!w) return 0; const m = w.match(/[aeiouy]+/g); let n = m ? m.length : 1; if (w.endsWith("e")) n--; return Math.max(1, n); }
function rTextAnalysis(c) {
  c.innerHTML = `<div class="card"><div class="field"><textarea id="ta-in" style="min-height:120px" placeholder="Paste text…"></textarea></div><div id="ta-out"></div></div>`;
  const stop = new Set("the a an and or but of to in on for with is are was were be as at by it this that from your you we our".split(" "));
  const upd = () => {
    const t = $("#ta-in").value.trim(); if (!t) { $("#ta-out").innerHTML = `<p class="muted">Enter text to analyze</p>`; return; }
    const words = t.split(/\s+/).filter(Boolean), wc = words.length;
    const sentences = (t.match(/[.!?]+/g) || []).length || 1;
    const syll = words.reduce((s, w) => s + countSyll(w), 0);
    const flesch = 206.835 - 1.015 * (wc / sentences) - 84.6 * (syll / wc);
    const grade = 0.39 * (wc / sentences) + 11.8 * (syll / wc) - 15.59;
    const freq = {}; for (const w of words.map(w => w.toLowerCase().replace(/[^a-z0-9']/g, "")).filter(w => w && !stop.has(w))) freq[w] = (freq[w] || 0) + 1;
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6);
    $("#ta-out").innerHTML = rowsHTML({ Words: wc, Characters: t.length, Sentences: sentences, "Reading time": Math.max(1, Math.round(wc / 200)) + " min", "Flesch ease": flesch.toFixed(0), "Grade level": Math.max(0, grade).toFixed(0) })
      + (top.length ? `<label style="margin-top:12px">Top keywords</label>${rowsHTML(Object.fromEntries(top.map(([k, v]) => [k, v + "×"])))}` : "");
  };
  $("#ta-in").addEventListener("input", upd); upd();
}

/* ---- Text cleaner ---- */
function rTextClean(c) {
  form(`<div class="field"><textarea id="tc-in" placeholder="Text…"></textarea></div>
    <div class="switch-row"><span>Remove accents</span><input type="checkbox" class="sw" id="tc-acc" checked></div>
    <div class="switch-row"><span>Straighten quotes & dashes</span><input type="checkbox" class="sw" id="tc-q" checked></div>
    <div class="switch-row"><span>Collapse spaces</span><input type="checkbox" class="sw" id="tc-sp" checked></div>`, "Clean", () => {
    let s = $("#tc-in").value;
    if ($("#tc-acc").checked) s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if ($("#tc-q").checked) s = s.replace(/[\u2018\u2019\u201B]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-").replace(/\u2026/g, "...");
    if ($("#tc-sp").checked) s = s.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
    resultCard(`<div class="out-area">${esc(s)}</div><div class="btn-row" style="margin-top:12px">${copyBtn(s)}</div>`); play("success");
  }, "eraser");
}

/* ---- Classic ciphers: Atbash & Vigenère ---- */
function atbash(s) { return s.replace(/[a-z]/gi, ch => { const b = ch <= "Z" ? 65 : 97; return String.fromCharCode(b + 25 - (ch.charCodeAt(0) - b)); }); }
function vigenere(s, key, dec) { key = (key || "").replace(/[^a-z]/gi, "").toLowerCase(); if (!key) return s; let ki = 0; return s.replace(/[a-z]/gi, ch => { const b = ch <= "Z" ? 65 : 97; let k = key.charCodeAt(ki % key.length) - 97; if (dec) k = (26 - k) % 26; ki++; return String.fromCharCode((ch.charCodeAt(0) - b + k) % 26 + b); }); }
function rCiphers(c) {
  form(`<div class="seg" id="cp-seg"><button data-m="atbash" class="active">Atbash</button><button data-m="vig">Vigenère</button></div>
    <div class="field hidden" id="cp-key"><label>Key</label><input type="text" id="cp-k" placeholder="SECRET"></div>
    <div class="field"><textarea id="cp-in" placeholder="Text…"></textarea></div>
    <div class="seg" id="cp-dir"><button data-m="enc" class="active">Encode</button><button data-m="dec">Decode</button></div>`, "Apply", () => {
    const mode = $("#cp-seg .active").dataset.m, dir = $("#cp-dir .active").dataset.m, v = $("#cp-in").value;
    const out = mode === "atbash" ? atbash(v) : vigenere(v, $("#cp-k").value, dir === "dec");
    resultCard(`<div class="out-area">${esc(out)}</div><div class="btn-row" style="margin-top:12px">${copyBtn(out)}</div>`); play("success");
  }, "square-asterisk");
  segWire("cp-seg"); segWire("cp-dir");
  $("#cp-seg").querySelectorAll("button").forEach(b => b.addEventListener("click", () => $("#cp-key").classList.toggle("hidden", $("#cp-seg .active").dataset.m !== "vig")));
}

/* ---- Steganography (LSB in PNG) ---- */
function loadImgFile(file) { return new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => rej(new Error("Could not read image")); img.src = URL.createObjectURL(file); }); }
async function stegoCanvas(file) { const img = await loadImgFile(file); const cv = document.createElement("canvas"); cv.width = img.naturalWidth; cv.height = img.naturalHeight; const ctx = cv.getContext("2d"); ctx.drawImage(img, 0, 0); return { cv, ctx }; }
async function stegoHide(file, msg) {
  const { cv, ctx } = await stegoCanvas(file); const id = ctx.getImageData(0, 0, cv.width, cv.height), d = id.data;
  const bytes = new TextEncoder().encode(msg), len = bytes.length;
  const all = Uint8Array.from([(len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255, ...bytes]);
  const totalBits = all.length * 8, cap = Math.floor(d.length / 4) * 3;
  if (totalBits > cap) throw new Error(`Message too big (max ~${Math.floor(cap / 8)} bytes for this image)`);
  let bi = 0; for (let i = 0; i < d.length && bi < totalBits; i++) { if (i % 4 === 3) continue; d[i] = (d[i] & 0xFE) | ((all[bi >> 3] >> (7 - (bi & 7))) & 1); bi++; }
  ctx.putImageData(id, 0, 0); return cv.toDataURL("image/png");
}
async function stegoReveal(file) {
  const { cv, ctx } = await stegoCanvas(file); const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
  const bits = []; for (let i = 0; i < d.length; i++) { if (i % 4 === 3) continue; bits.push(d[i] & 1); }
  const rb = off => { let b = 0; for (let k = 0; k < 8; k++) b = (b << 1) | bits[off + k]; return b; };
  const len = (rb(0) << 24) | (rb(8) << 16) | (rb(16) << 8) | rb(24);
  if (len <= 0 || len > bits.length / 8 - 4) throw new Error("No hidden message found");
  const out = new Uint8Array(len); for (let i = 0; i < len; i++) out[i] = rb(32 + i * 8);
  return new TextDecoder().decode(out);
}
function rStego(c) {
  c.innerHTML = `<div class="card"><div class="seg" id="sg-seg"><button data-m="hide" class="active">Hide</button><button data-m="reveal">Reveal</button></div><div id="sg-body"></div></div>`;
  const seg = $("#sg-seg");
  const render = m => {
    const body = $("#sg-body");
    body.innerHTML = `<div class="upload" id="sg-drop"><i data-lucide="${m === "hide" ? "image-plus" : "scan-eye"}"></i><div id="sg-name">${m === "hide" ? "Choose a cover image" : "Choose a stego image"}</div></div><input type="file" id="sg-file" accept="image/*" hidden>`
      + (m === "hide" ? `<div class="field" style="margin-top:12px"><textarea id="sg-msg" placeholder="Secret message…"></textarea></div><button class="btn" id="sg-go"><i data-lucide="lock"></i> Hide & download PNG</button><p class="muted" style="margin-top:10px">⚠️ Send the result as a <b>File</b>, not a photo — Telegram re-compresses photos and would destroy the hidden data.</p>` : "")
      + `<div id="sg-out" style="margin-top:12px"></div>`;
    let file = null;
    $("#sg-drop").onclick = () => $("#sg-file").click();
    $("#sg-file").onchange = async e => {
      file = e.target.files[0]; if (!file) return; $("#sg-name").textContent = file.name; $("#sg-drop").classList.add("active"); play("success");
      if (m === "reveal") { const out = $("#sg-out"); out.innerHTML = spin() + " Reading…"; try { const msg = await stegoReveal(file); out.innerHTML = `<label>Hidden message</label><div class="out-area">${esc(msg)}</div><div class="btn-row" style="margin-top:12px">${copyBtn(msg)}</div>`; iconsRefresh(); notify(); } catch (err) { out.innerHTML = `<p class="status err">❌ ${esc(err.message)}</p>`; } }
    };
    if (m === "hide") $("#sg-go").onclick = async () => {
      if (!file) return toast("Pick an image first", "err"); const msg = $("#sg-msg").value; if (!msg) return toast("Enter a message", "err");
      play("click"); haptic(); const out = $("#sg-out"); out.innerHTML = spin() + " Encoding…";
      try { const url = await stegoHide(file, msg); const a = document.createElement("a"); a.href = url; a.download = "stego.png"; a.click(); out.innerHTML = `<p class="status ok">✅ Saved stego.png</p>`; play("success"); notify(); }
      catch (err) { out.innerHTML = `<p class="status err">❌ ${esc(err.message)}</p>`; play("error"); }
    };
    iconsRefresh();
  };
  seg.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { seg.querySelector(".active").classList.remove("active"); b.classList.add("active"); play("click"); render(b.dataset.m); }));
  render("hide");
}

/* ---- AI detector (server, multi-provider) ---- */
function rAiDetect(c) {
  let file = null;
  c.innerHTML = `<div class="card">
    <div class="field"><label>Text</label><textarea id="ai-in" style="min-height:120px" placeholder="Paste text to check…"></textarea></div>
    <div class="upload" id="ai-drop"><i data-lucide="file-up"></i><div id="ai-name">…or upload .txt / .pdf / .docx</div></div>
    <input type="file" id="ai-file" accept=".txt,.md,.csv,.pdf,.docx" hidden>
    <button class="btn" id="ai-go" style="margin-top:14px"><i data-lucide="bot"></i> Check</button>
    <div id="tool-status"></div><div id="tool-result" class="result"></div>
    <p class="muted" style="margin-top:12px">⚠️ AI detectors are unreliable — they misclassify both human and AI writing. Treat results as rough estimates, never proof.</p>
  </div>`;
  iconsRefresh();
  $("#ai-drop").onclick = () => $("#ai-file").click();
  $("#ai-file").onchange = e => { file = e.target.files[0]; if (file) { $("#ai-name").textContent = file.name; $("#ai-drop").classList.add("active"); play("success"); } };
  const bar = s => s == null ? `<span class="muted">—</span>` : `<div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:8px;border-radius:999px;background:var(--bg-2);overflow:hidden"><div style="height:100%;width:${Math.round(s * 100)}%;background:${s > .5 ? "var(--err)" : "var(--ok)"}"></div></div><b style="font-family:var(--mono)">${Math.round(s * 100)}%</b></div>`;
  $("#ai-go").onclick = async () => {
    const text = $("#ai-in").value.trim();
    if (!text && !file) return setStatus("Paste text or pick a file", "err");
    play("click"); haptic(); setStatus(spin() + " Running detectors…");
    const fd = new FormData(); fd.append("initData", INIT_DATA); if (text) fd.append("text", text); if (file) fd.append("file", file);
    try {
      const r = await fetch("/api/aidetect", { method: "POST", body: fd }); const d = await r.json();
      if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus("");
      const rows = d.results.map(x => `<div class="row" style="flex-direction:column;align-items:stretch;gap:6px"><span class="k">${esc(x.name)}${x.score == null && x.note ? ` · <i>${esc(x.note)}</i>` : ""}</span>${bar(x.score)}</div>`).join("");
      resultCard(`<div class="rows">${rows}</div>${d.aggregate != null ? `<div style="margin-top:14px"><label>Average · ${d.detectors_used} detector${d.detectors_used === 1 ? "" : "s"}</label>${bar(d.aggregate)}</div>` : ""}<p class="muted" style="margin-top:12px">${esc(d.disclaimer)}</p>${d.delivered ? `<p class="status ok">✅ Report sent to your chat</p>` : ""}`);
      play("success"); notify();
    } catch (e) { setStatus("❌ " + esc(e.message), "err"); play("error"); }
  };
}

/* =========================================================================
   SECURITY PACK (v6.2) — pwned password, HMAC, bcrypt, JWT signer
   All client-side: secrets never leave the device.
   ========================================================================= */
const toHex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
const b64 = bytes => { const u = new Uint8Array(bytes); let s = ""; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(s); };
const b64u = bytes => b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function hmacBytes(algo, key, msg) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: algo }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg)));
}
function safeEqual(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

/* ---- Pwned password (HIBP k-anonymity, fully in-browser) ---- */
function rPwned(c) {
  form(`<div class="field"><label>Password to check</label><input type="password" id="pn-in" autocomplete="off" placeholder="Enter a password"></div>
    <p class="muted">Private by design: the password is hashed in your browser and only the first 5 characters of that hash are sent (k-anonymity). The password itself never leaves your device.</p>`, "Check", async () => {
    const pw = $("#pn-in").value; if (!pw) { setStatus("Enter a password", "err"); return; }
    await serverRun("Checking breach database…", async () => {
      const h = (await sha("SHA-1", pw)).toUpperCase(), prefix = h.slice(0, 5), suffix = h.slice(5);
      let res;
      try { res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`); }
      catch (_) { setStatus("❌ Could not reach the breach database", "err"); play("error"); return; }
      if (!res.ok) { setStatus(`❌ Breach database returned ${res.status}`, "err"); play("error"); return; }
      let count = 0;
      for (const line of (await res.text()).split("\n")) { const [s, n] = line.trim().split(":"); if (s === suffix) { count = parseInt(n, 10) || 0; break; } }
      setStatus("");
      if (count > 0) {
        resultCard(`<p class="status err">🚨 Found in ${count.toLocaleString()} known breaches</p><p class="muted center">Don't use this password anywhere. Anyone can look it up.</p>`);
        play("error"); notify("warning");
      } else {
        resultCard(`<p class="status ok">✅ Not found in known breaches</p><p class="muted center">That's a good sign, not a guarantee — a weak password can still be guessed. Use a long, unique one.</p>`);
        play("success"); notify();
      }
    });
  }, "shield-x");
}

/* ---- HMAC ---- */
function rHmac(c) {
  form(`<div class="field"><label>Algorithm</label><select id="hm-a"><option>SHA-256</option><option>SHA-1</option><option>SHA-384</option><option>SHA-512</option></select></div>
    <div class="field"><label>Secret key</label><input type="text" class="mono" id="hm-k" placeholder="secret"></div>
    <div class="field"><label>Message</label><textarea id="hm-m" class="mono" placeholder="Message…"></textarea></div>
    <div class="field"><label>Verify against (optional)</label><input type="text" class="mono" id="hm-v" placeholder="expected hex or base64"></div>`, "Compute", async () => {
    const key = $("#hm-k").value; if (!key) { setStatus("Enter a secret key", "err"); return; }
    const mac = await hmacBytes($("#hm-a").value, key, $("#hm-m").value), hx = toHex(mac), b = b64(mac);
    const exp = $("#hm-v").value.trim();
    let verdict = "";
    if (exp) { const ok = safeEqual(exp.toLowerCase(), hx) || safeEqual(exp, b); verdict = `<p class="center" style="margin-top:12px">${ok ? '<span class="pill ok">✓ Matches</span>' : '<span class="pill err">✗ Does not match</span>'}</p>`; }
    setStatus("");
    resultCard(rowsHTML({ Hex: `<span class="v mono" style="font-size:12px">${hx}</span>`, Base64: `<span class="v mono" style="font-size:12px">${b}</span>` }) + verdict + `<div class="btn-row" style="margin-top:12px">${copyBtn(hx, "Copy hex")}</div>`);
    play("success");
  }, "key-square");
}

/* ---- Bcrypt (bcryptjs, in-browser) ---- */
function rBcrypt(c) {
  const BC = window.dcodeIO?.bcrypt || window.bcrypt;
  const bcHash = (pw, cost) => new Promise((res, rej) => BC.hash(pw, cost, (e, h) => e ? rej(e) : res(h)));
  const bcCompare = (pw, hash) => new Promise((res, rej) => BC.compare(pw, hash, (e, ok) => e ? rej(e) : res(ok)));
  form(`<div class="seg" id="bc-seg"><button data-m="hash" class="active">Hash</button><button data-m="verify">Verify</button></div>
    <div class="field"><label>Password</label><input type="password" id="bc-pw" autocomplete="off"></div>
    <div id="bc-extra"></div>`, "Run", async () => {
    if (!BC) { setStatus("❌ bcrypt library failed to load (check your connection)", "err"); return; }
    const m = $("#bc-seg .active").dataset.m, pw = $("#bc-pw").value;
    if (!pw) { setStatus("Enter a password", "err"); return; }
    const tooLong = new TextEncoder().encode(pw).length > 72;
    try {
      if (m === "hash") {
        const cost = +$("#bc-cost").value;
        setStatus(spin() + " Hashing (cost " + cost + ")…");
        const h = await bcHash(pw, cost); setStatus("");
        resultCard(`<div class="out-area">${esc(h)}</div>${tooLong ? `<p class="muted" style="margin-top:8px">⚠️ bcrypt only uses the first 72 bytes of a password.</p>` : ""}<div class="btn-row" style="margin-top:12px">${copyBtn(h)}</div>`);
        play("success");
      } else {
        const hash = $("#bc-h").value.trim();
        if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash)) { setStatus("❌ That doesn't look like a bcrypt hash", "err"); return; }
        setStatus(spin() + " Verifying…");
        const ok = await bcCompare(pw, hash); setStatus("");
        resultCard(`<p class="center">${ok ? '<span class="pill ok">✓ Password matches</span>' : '<span class="pill err">✗ Does not match</span>'}</p>`);
        play(ok ? "success" : "error");
      }
    } catch (e) { setStatus("❌ " + esc(e.message || "Failed"), "err"); play("error"); }
  }, "lock-keyhole");
  const extra = m => { $("#bc-extra").innerHTML = m === "hash"
    ? `<div class="field"><label>Cost factor <b id="bc-cv" style="color:var(--accent)">10</b> <span class="muted">(higher = slower & stronger)</span></label><div class="slider-row"><input type="range" id="bc-cost" min="4" max="12" value="10"></div></div>`
    : `<div class="field"><label>Bcrypt hash</label><input type="text" class="mono" id="bc-h" placeholder="$2b$10$…"></div>`;
    if (m === "hash") $("#bc-cost").addEventListener("input", e => $("#bc-cv").textContent = e.target.value); };
  $("#bc-seg").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { $("#bc-seg .active").classList.remove("active"); b.classList.add("active"); play("click"); haptic(); extra(b.dataset.m); }));
  extra("hash");
}

/* ---- JWT signer (HS256/384/512) ---- */
function rJwtSign(c) {
  const now = Math.floor(Date.now() / 1000);
  form(`<div class="field"><label>Algorithm</label><select id="js-a"><option value="HS256">HS256</option><option value="HS384">HS384</option><option value="HS512">HS512</option></select></div>
    <div class="field"><label>Payload (JSON)</label><textarea id="js-p" class="mono" style="min-height:120px">${esc(JSON.stringify({ sub: "1234567890", name: "John Doe", iat: now }, null, 2))}</textarea></div>
    <div class="field"><label>Expires in (minutes, optional)</label><input type="number" class="mono" id="js-e" placeholder="e.g. 60"></div>
    <div class="field"><label>Secret</label><input type="text" class="mono" id="js-s" placeholder="your-256-bit-secret"></div>`, "Sign", async () => {
    const secret = $("#js-s").value; if (!secret) { setStatus("Enter a secret", "err"); return; }
    let payload; try { payload = JSON.parse($("#js-p").value); if (payload === null || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Payload must be a JSON object"); } catch (e) { setStatus("❌ " + esc(e.message), "err"); play("error"); return; }
    const mins = parseFloat($("#js-e").value); if (isFinite(mins) && mins > 0) payload.exp = Math.floor(Date.now() / 1000 + mins * 60);
    const alg = $("#js-a").value, enc = o => b64u(new TextEncoder().encode(JSON.stringify(o)));
    const data = enc({ alg, typ: "JWT" }) + "." + enc(payload);
    const sig = await hmacBytes("SHA-" + alg.slice(2), secret, data);
    const token = data + "." + b64u(sig);
    setStatus("");
    resultCard(`<div class="out-area" style="word-break:break-all">${esc(token)}</div><div class="btn-row" style="margin-top:12px">${copyBtn(token, "Copy token")}</div><p class="muted" style="margin-top:10px">Signed in your browser — the secret never leaves your device. HS* only (RS/ES need a private key).</p>`);
    play("success");
  }, "stamp");
}

/* ---- Text encrypt / decrypt (AES-256-GCM, PBKDF2 — same scheme as the Vault) ---- */
function rTextCrypt(c) {
  form(`<div class="seg" id="tx-seg"><button data-m="enc" class="active">Encrypt</button><button data-m="dec">Decrypt</button></div>
    <div class="field"><label id="tx-lbl">Text to encrypt</label><textarea id="tx-in" class="mono" placeholder="Your message…"></textarea></div>
    <div class="field"><label>Password</label><input type="password" id="tx-pw" autocomplete="off"></div>
    <div class="field" id="tx-conf-wrap"><label>Confirm password</label><input type="password" id="tx-pw2" autocomplete="off"></div>
    <p class="muted">AES-256-GCM with a PBKDF2-derived key (200,000 iterations), entirely in your browser. There is no recovery: if the password is forgotten, the text can't be decrypted.</p>`, "Encrypt", async () => {
    $("#tool-result").innerHTML = "";  // never leave a previous result (esp. decrypted plaintext) under a new attempt
    const m = $("#tx-seg .active").dataset.m, pw = $("#tx-pw").value, v = $("#tx-in").value;
    if (!v.trim()) { setStatus("Enter some text", "err"); return; }
    if (!pw) { setStatus("Enter a password", "err"); return; }
    if (m === "enc") {
      if (pw !== $("#tx-pw2").value) { setStatus("❌ Passwords don't match", "err"); play("error"); return; }
      setStatus(spin() + " Encrypting…");
      const out = "tk1:" + b64(await vEnc(new TextEncoder().encode(v), pw));
      setStatus("");
      resultCard(`<label>Encrypted text</label><div class="out-area" style="word-break:break-all">${esc(out)}</div><div class="btn-row" style="margin-top:12px">${copyBtn(out)}</div>${pw.length < 8 ? `<p class="muted" style="margin-top:10px">⚠️ Short password — anyone holding this text can try to guess it offline. Use a longer one.</p>` : ""}`);
      play("success"); notify();
    } else {
      let bytes;
      try { bytes = Uint8Array.from(atob(v.trim().replace(/^tk1:/, "").replace(/\s+/g, "")), ch => ch.charCodeAt(0)); }
      catch (_) { setStatus("❌ That doesn't look like encrypted text", "err"); play("error"); return; }
      if (bytes.length < 28 + 16) { setStatus("❌ That doesn't look like encrypted text", "err"); play("error"); return; }
      setStatus(spin() + " Decrypting…");
      try {
        const text = new TextDecoder("utf-8", { fatal: true }).decode(await vDec(bytes, pw));
        setStatus("");
        // Plaintext: deliberately NO share/download buttons, so it can't be routed through the server.
        resultCard(`<label>Decrypted text</label><div class="out-area">${esc(text)}</div><div class="btn-row" style="margin-top:12px">${copyBtn(text)}</div><p class="muted" style="margin-top:10px">Decrypted locally — not sent anywhere.</p>`, { actions: false });
        play("success"); notify();
      } catch (_) { setStatus("❌ Wrong password, or the text was altered", "err"); play("error"); }
    }
  }, "lock");
  const seg = $("#tx-seg");
  seg.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    seg.querySelector(".active").classList.remove("active"); b.classList.add("active"); play("click"); haptic();
    const enc = b.dataset.m === "enc";
    $("#tx-conf-wrap").classList.toggle("hidden", !enc);
    $("#tx-lbl").textContent = enc ? "Text to encrypt" : "Encrypted text";
    $("#tx-in").placeholder = enc ? "Your message…" : "Paste encrypted text (tk1:…)";
    $("#run-btn").innerHTML = `<i data-lucide="${enc ? "lock" : "unlock"}"></i> ${enc ? "Encrypt" : "Decrypt"}`;
    setStatus(""); $("#tool-result").innerHTML = ""; iconsRefresh();
  }));
}

/* ---- Subdomain finder (server, passive: certificate-transparency logs) ---- */
function rSubdomains(c) {
  form(`<div class="field"><label>Domain</label><input type="text" class="mono" id="sd-in" placeholder="example.com" autocapitalize="off" autocomplete="off"></div>
    <div class="switch-row"><span>Check which names resolve (DNS)</span><input type="checkbox" class="sw" id="sd-res"></div>
    <p class="muted" style="margin-top:10px">Passive: reads public certificate-transparency logs and never contacts the target. Use it on domains you own or are authorised to assess. Can take up to ~30s.</p>`, "Find", async () => {
    await serverRun("Querying certificate logs…", async () => {
      const d = await api("subdomains", { domain: $("#sd-in").value, resolve: $("#sd-res").checked });
      if (!d.success) return setStatus("❌ " + esc(d.error), "err");
      setStatus("");
      // ips: array = resolved (empty = name exists but has no A record), null = does not resolve, anything else = not checked
      const mark = ips => Array.isArray(ips) ? (ips.length ? "✓ " + ips[0] : "• no A record") : ips === null ? "✗ no DNS" : "";
      const lines = d.names.map(n => d.resolved ? `${n.name}  ${mark(n.ips)}`.trimEnd() : n.name);
      const failed = d.sources.filter(s => !s.ok);
      const notes = [];
      if (failed.length) notes.push(`${failed.map(s => s.name).join(", ")} didn't answer — results may be incomplete. Try again shortly.`);
      if (d.truncated) notes.push("A source returned more data than was read — the list may be incomplete.");
      if (d.count > d.shown) notes.push(`Showing the first ${d.shown.toLocaleString()} of ${d.count.toLocaleString()}.`);
      if (d.resolved && d.shown > d.resolve_limit) notes.push(`DNS was checked for the first ${d.resolve_limit} names only.`);
      const head = `<div style="margin-bottom:10px"><span class="pill ${d.count ? "ok" : "warn"}">${d.count.toLocaleString()} subdomain${d.count === 1 ? "" : "s"}</span>${d.wildcards ? ` <span class="pill info">${d.wildcards} wildcard pattern${d.wildcards === 1 ? "" : "s"}</span>` : ""}</div>`;
      const src = `<div class="rows">${d.sources.map(s => `<div class="row"><span class="k">${esc(s.name)}</span><span class="v">${s.ok ? `<span class="pill ok">${s.count} found</span>` : `<span class="pill warn">${esc(s.error || "failed")}</span>`}</span></div>`).join("")}</div>`;
      resultCard(head + (d.count ? `<div class="out-area">${lines.map(esc).join("\n")}</div>` : `<p class="muted center">No subdomains found in certificate logs for ${esc(d.domain)}.</p>`)
        + `<label style="margin-top:14px">Sources</label>${src}`
        + notes.map(n => `<p class="muted" style="margin-top:8px">⚠️ ${esc(n)}</p>`).join(""));
      play("success"); notify();
    });
  }, "binoculars");
}

/* =========================================================================
   REFERENCE PACK (v7) — cheat sheets, ports, ASCII/Unicode, bitwise, word frequency
   ========================================================================= */
const _scripts = {}, _texts = {};
function loadScript(src) {
  if (_scripts[src]) return _scripts[src];
  _scripts[src] = new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = src; s.onload = res;
    s.onerror = () => { delete _scripts[src]; rej(new Error("Could not load " + src.split("/").pop() + " — check your connection")); };
    document.head.appendChild(s);
  });
  return _scripts[src];
}
async function loadText(path) {
  if (_texts[path]) return _texts[path];
  const r = await fetch(path); if (!r.ok) throw new Error("Could not load " + path);
  return (_texts[path] = await r.text());
}

/* ---- Cheat sheets ---- */
function parseCheats(txt) {
  const topics = []; let topic = null, sec = null;
  for (const raw of txt.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line || /^#\s/.test(line)) continue;
    let m;
    if ((m = line.match(/^@@(\w+)\s+(.+)$/))) { topic = { id: m[1], name: m[2], sections: [] }; topics.push(topic); sec = null; continue; }
    if (!topic) continue;
    if ((m = line.match(/^##\s+(.+)$/))) { sec = { title: m[1], items: [] }; topic.sections.push(sec); continue; }
    const k = line.lastIndexOf(" :: "); if (k < 0 || !sec) continue;
    let desc = line.slice(k + 4), warn = false;
    if (desc.endsWith(" !")) { warn = true; desc = desc.slice(0, -2); }
    sec.items.push({ cmd: line.slice(0, k), desc, warn });
  }
  return topics;
}
async function rCheats(c) {
  c.innerHTML = `<div class="card muted">${spin()} Loading…</div>`;
  let topics;
  try { topics = parseCheats(await loadText("data/cheats.txt")); }
  catch (e) { c.innerHTML = `<div class="card"><p class="status err">❌ ${esc(e.message)}</p></div>`; return; }
  let cur = store.get("tk_cheat_topic", "git"); if (!topics.some(t => t.id === cur)) cur = topics[0].id;
  c.innerHTML = `<div class="seg" id="ch-seg" style="flex-wrap:wrap">${topics.map(t => `<button data-t="${t.id}" class="${t.id === cur ? "active" : ""}">${esc(t.name)}</button>`).join("")}</div>
    <div class="field"><input type="text" id="ch-q" placeholder="Filter this sheet…" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
    <p class="muted" style="margin:-4px 2px 4px">Tap a line to copy it.  ⚠️ marks commands that destroy data.</p><div id="ch-out"></div>`;
  const render = () => {
    const t = topics.find(x => x.id === cur), q = $("#ch-q").value.trim().toLowerCase();
    let html = "";
    for (const s of t.sections) {
      const items = q ? s.items.filter(it => (it.cmd + " " + it.desc).toLowerCase().includes(q)) : s.items;
      if (!items.length) continue;
      html += `<div class="sec-title" style="margin-top:16px">${esc(s.title)}</div><div class="card" style="padding:4px 14px">`
        + items.map(it => `<div class="cs-row" data-copy="${esc(it.cmd)}"><code>${esc(it.cmd)}</code><span>${it.warn ? "⚠️ " : ""}${esc(it.desc)}</span></div>`).join("") + `</div>`;
    }
    $("#ch-out").innerHTML = html || `<div class="empty"><div>No matches in ${esc(t.name)}</div></div>`;
  };
  $("#ch-seg").querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    $("#ch-seg .active").classList.remove("active"); b.classList.add("active"); cur = b.dataset.t; store.set("tk_cheat_topic", cur); play("click"); haptic(); render();
  }));
  $("#ch-q").addEventListener("input", render);
  render();
}

/* ---- Port & service lookup ---- */
function parsePorts(txt) {
  return txt.split("\n").filter(l => l.trim() && !/^#\s/.test(l)).map(l => {
    const f = l.split("|").map(x => x.trim());
    return { port: parseInt(f[0], 10), proto: f[1], service: f[2], desc: f[3], note: f[4] || "" };
  }).filter(p => p.port >= 0 && p.service);
}
const portRange = n => n <= 1023 ? "the well-known (system) range" : n <= 49151 ? "the registered range" : "the dynamic / private range";
async function rPorts(c) {
  c.innerHTML = `<div class="card muted">${spin()} Loading…</div>`;
  let ports;
  try { ports = parsePorts(await loadText("data/ports.txt")); }
  catch (e) { c.innerHTML = `<div class="card"><p class="status err">❌ ${esc(e.message)}</p></div>`; return; }
  c.innerHTML = `<div class="card"><div class="field"><label>Port number, or a service name</label><input type="text" class="mono" id="pt-q" placeholder="5432   or   postgres   or   vpn" autocomplete="off" autocapitalize="off" spellcheck="false"></div><div id="pt-out"></div></div>`;
  const row = p => `<div class="row" style="align-items:flex-start"><span class="k mono" style="min-width:86px;color:var(--accent);font-weight:700">${p.port}<span class="muted" style="font-weight:400">/${esc(p.proto)}</span></span>
    <span class="v" style="text-align:left;flex:1">${esc(p.service)}<div class="muted" style="font-weight:400">${esc(p.desc)}</div>${p.note ? `<div style="font-weight:400;color:var(--warn);font-size:12px">⚠️ ${esc(p.note)}</div>` : ""}</span></div>`;
  const render = () => {
    const q = $("#pt-q").value.trim().toLowerCase(), out = $("#pt-out");
    const num = q.match(/^(?:port\s*)?(\d{1,5})(?:\s*\/\s*(?:tcp|udp))?$/);
    let list, head = "";
    if (num) {
      const n = parseInt(num[1], 10);
      if (n > 65535) { out.innerHTML = `<p class="status err">Ports only go up to 65535</p>`; return; }
      list = ports.filter(p => p.port === n);
      if (!list.length) head = `<p class="muted" style="margin-bottom:8px">Port ${n} isn't in this list. It's in ${portRange(n)}${n > 1023 ? ", where most ports are assigned dynamically or by the application" : ""}.</p>`;
    } else if (q) {
      const words = q.split(/\s+/);
      list = ports.filter(p => { const hay = (p.service + " " + p.desc + " " + p.proto + " " + p.note).toLowerCase(); return words.every(w => hay.includes(w)); });
    } else { list = ports.slice(0, 25); head = `<p class="muted" style="margin-bottom:8px">Showing the first 25 of ${ports.length} ports. Type to search.</p>`; }
    out.innerHTML = head + (list.length ? `<div class="rows">${list.slice(0, 60).map(row).join("")}</div>` + (list.length > 60 ? `<p class="muted">+${list.length - 60} more — narrow your search.</p>` : "")
      : (num ? "" : `<p class="muted">No match.</p>`))
      + `<p class="muted" style="margin-top:12px">Ranges: 0–1023 well-known · 1024–49151 registered · 49152–65535 dynamic.</p>`;
  };
  $("#pt-q").addEventListener("input", render); render();
}

/* ---- ASCII table & Unicode inspector ---- */
const ASCII_CTRL = ["Null","Start of heading","Start of text","End of text","End of transmission","Enquiry","Acknowledge","Bell","Backspace","Horizontal tab","Line feed (newline)","Vertical tab","Form feed","Carriage return","Shift out","Shift in","Data link escape","Device control 1 (XON)","Device control 2","Device control 3 (XOFF)","Device control 4","Negative acknowledge","Synchronous idle","End of transmission block","Cancel","End of medium","Substitute","Escape","File separator","Group separator","Record separator","Unit separator"];
const ASCII_CTRL_ABBR = "NUL SOH STX ETX EOT ENQ ACK BEL BS HT LF VT FF CR SO SI DLE DC1 DC2 DC3 DC4 NAK SYN ETB CAN EM SUB ESC FS GS RS US".split(" ");
const ASCII_PUNCT = { 32: "Space", 33: "Exclamation mark", 34: "Double quote", 35: "Number sign (hash)", 36: "Dollar sign", 37: "Percent sign", 38: "Ampersand", 39: "Apostrophe (single quote)", 40: "Left parenthesis", 41: "Right parenthesis", 42: "Asterisk", 43: "Plus sign", 44: "Comma", 45: "Hyphen-minus", 46: "Full stop (period)", 47: "Slash", 58: "Colon", 59: "Semicolon", 60: "Less-than sign", 61: "Equals sign", 62: "Greater-than sign", 63: "Question mark", 64: "At sign", 91: "Left square bracket", 92: "Backslash", 93: "Right square bracket", 94: "Caret", 95: "Underscore", 96: "Grave accent (backtick)", 123: "Left curly brace", 124: "Vertical bar (pipe)", 125: "Right curly brace", 126: "Tilde" };
function asciiName(n) { if (n < 32) return ASCII_CTRL_ABBR[n] + " — " + ASCII_CTRL[n]; if (n === 127) return "DEL — Delete"; if (ASCII_PUNCT[n]) return ASCII_PUNCT[n]; if (n >= 48 && n <= 57) return "Digit " + String.fromCharCode(n); if (n >= 65 && n <= 90) return "Uppercase " + String.fromCharCode(n); return "Lowercase " + String.fromCharCode(n); }
const INVISIBLE = { 0xA0: "No-break space", 0xAD: "Soft hyphen", 0x200B: "Zero-width space", 0x200C: "Zero-width non-joiner", 0x200D: "Zero-width joiner", 0x200E: "Left-to-right mark", 0x200F: "Right-to-left mark", 0x2028: "Line separator", 0x2029: "Paragraph separator", 0x202A: "LTR embedding", 0x202B: "RTL embedding", 0x202C: "Pop directional formatting", 0x202D: "LTR override", 0x202E: "RTL override", 0x2060: "Word joiner", 0x2066: "LTR isolate", 0x2067: "RTL isolate", 0x2068: "First strong isolate", 0x2069: "Pop directional isolate", 0x3000: "Ideographic space", 0xFEFF: "Zero-width no-break space (BOM)" };
const HIDDEN_RISK = n => n === 0xAD || (n >= 0x200B && n <= 0x200F) || (n >= 0x202A && n <= 0x202E) || n === 0x2060 || (n >= 0x2066 && n <= 0x2069) || n === 0xFEFF;
function uniTest(re) { try { return new RegExp(re, "u"); } catch (_) { return null; } }
const UNI_RE = { C: uniTest("^\\p{C}$"), Z: uniTest("^\\p{Z}$"), M: uniTest("^\\p{M}$"), L: uniTest("^\\p{L}$"), N: uniTest("^\\p{N}$"), P: uniTest("^\\p{P}$"), S: uniTest("^\\p{S}$"), E: uniTest("^\\p{Extended_Pictographic}$") };
function uniCategory(ch) {
  const t = k => UNI_RE[k] && UNI_RE[k].test(ch);
  return t("E") ? "Emoji / pictograph" : t("C") ? "Control / format" : t("Z") ? "Space / separator" : t("M") ? "Combining mark" : t("L") ? "Letter" : t("N") ? "Number" : t("P") ? "Punctuation" : t("S") ? "Symbol" : "Other";
}
function parseInspectInput(v) {
  if (/^\s*(?:(?:U\+|0x)[0-9a-f]{1,6})(?:\s+(?:U\+|0x)[0-9a-f]{1,6})*\s*$/i.test(v))
    return v.trim().split(/\s+/).map(t => parseInt(t.replace(/^U\+|^0x/i, ""), 16)).filter(n => n <= 0x10FFFF && !(n >= 0xD800 && n <= 0xDFFF));
  return Array.from(v).map(ch => ch.codePointAt(0));
}
function rAsciiUni(c) {
  c.innerHTML = `<div class="seg" id="au-seg"><button data-m="table" class="active">ASCII table</button><button data-m="inspect">Inspect text</button></div><div id="au-body"></div>`;
  const body = $("#au-body");
  const showTable = () => {
    body.innerHTML = `<div class="card"><div class="field"><label>Filter by character, number (65 or 0x41) or name</label><input type="text" class="mono" id="au-q" placeholder="A   65   0x41   ampersand" autocomplete="off" autocapitalize="off" spellcheck="false"></div><div style="overflow-x:auto"><table class="mini"><thead><tr><th>Dec</th><th>Hex</th><th>Oct</th><th>Char</th><th>Name</th></tr></thead><tbody id="au-rows"></tbody></table></div><p class="muted" style="margin-top:10px">Tap a row to copy the character.</p></div>`;
    const entries = Array.from({ length: 128 }, (_, n) => ({ n, ch: String.fromCharCode(n), name: asciiName(n) }));
    const render = () => {
      const q = $("#au-q").value.trim(), ql = q.toLowerCase();
      const single = Array.from(q).length === 1;  // one character: match that character or number, not every name containing it
      const list = entries.filter(e => !q || String(e.n) === q || ("0x" + e.n.toString(16)) === ql || e.ch === q || (!single && e.name.toLowerCase().includes(ql)));
      $("#au-rows").innerHTML = list.map(e => {
        const printable = e.n > 32 && e.n < 127, shown = e.n === 32 ? "␠" : printable ? esc(e.ch) : `<span class="muted">${esc(e.n === 127 ? "DEL" : ASCII_CTRL_ABBR[e.n])}</span>`;
        return `<tr data-copy="${esc(printable || e.n === 32 ? e.ch : "\\x" + e.n.toString(16).toUpperCase().padStart(2, "0"))}"><td>${e.n}</td><td>0x${e.n.toString(16).toUpperCase().padStart(2, "0")}</td><td>${e.n.toString(8).padStart(3, "0")}</td><td style="color:var(--accent);font-weight:700">${shown}</td><td style="font-family:var(--sans)">${esc(e.name)}</td></tr>`;
      }).join("") || `<tr><td colspan="5" class="muted">No match</td></tr>`;
    };
    $("#au-q").addEventListener("input", render); render();
  };
  const showInspect = () => {
    body.innerHTML = `<div class="card"><div class="field"><label>Text, or code points like U+1F600</label><textarea id="au-in" class="mono" placeholder="héllo ☕ 😀   or   U+00E9 U+2615"></textarea></div><div id="au-out"></div></div>`;
    const render = () => {
      const v = $("#au-in").value, out = $("#au-out");
      if (!v) { out.innerHTML = `<p class="muted">Paste text to see every character's code point, UTF-8 and UTF-16 encoding. Hidden characters are flagged.</p>`; return; }
      const cps = parseInspectInput(v), shown = cps.slice(0, 300), enc = new TextEncoder();
      const text = String.fromCodePoint(...cps);
      let graphemes = null; try { graphemes = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].length; } catch (_) {}
      const hidden = cps.filter(HIDDEN_RISK).length;
      const rows = shown.map(cp => {
        const ch = String.fromCodePoint(cp), bytes = [...enc.encode(ch)].map(b => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
        const u16 = cp > 0xFFFF ? [0xD800 + ((cp - 0x10000) >> 10), 0xDC00 + ((cp - 0x10000) & 0x3FF)].map(x => x.toString(16).toUpperCase()).join(" ") : cp.toString(16).toUpperCase().padStart(4, "0");
        const special = INVISIBLE[cp] || (cp < 32 || cp === 127 ? asciiName(cp).split(" — ")[0] : null);
        const glyph = special ? `<span class="pill ${HIDDEN_RISK(cp) ? "warn" : "info"}" style="font-size:10px">${esc(special)}</span>` : esc(ch);
        return `<tr data-copy="U+${cp.toString(16).toUpperCase().padStart(4, "0")}"><td style="color:var(--accent);font-weight:700">${glyph}</td><td>U+${cp.toString(16).toUpperCase().padStart(4, "0")}</td><td>${bytes}</td><td>${u16}</td><td>&amp;#${cp};</td><td style="font-family:var(--sans)">${esc(INVISIBLE[cp] || uniCategory(ch))}</td></tr>`;
      }).join("");
      out.innerHTML = `<div style="margin-bottom:10px"><span class="pill info">${cps.length} code point${cps.length === 1 ? "" : "s"}</span> ${graphemes != null && graphemes !== cps.length ? `<span class="pill info">${graphemes} visible character${graphemes === 1 ? "" : "s"}</span> ` : ""}<span class="pill info">${enc.encode(text).length} UTF-8 bytes</span> <span class="pill info">${text.length} UTF-16 units</span> ${hidden ? `<span class="pill warn">⚠️ ${hidden} hidden / invisible</span>` : ""}</div>
        <div style="overflow-x:auto"><table class="mini"><thead><tr><th>Char</th><th>Code point</th><th>UTF-8</th><th>UTF-16</th><th>HTML</th><th>Kind</th></tr></thead><tbody>${rows}</tbody></table></div>${cps.length > 300 ? `<p class="muted">Showing the first 300 of ${cps.length}.</p>` : ""}`;
    };
    $("#au-in").addEventListener("input", render); render();
  };
  const seg = $("#au-seg");
  seg.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { seg.querySelector(".active").classList.remove("active"); b.classList.add("active"); play("click"); haptic(); b.dataset.m === "table" ? showTable() : showInspect(); }));
  showTable();
}

/* ---- Bitwise calculator (BigInt, so 64-bit stays exact) ---- */
function parseBig(s) {
  s = s.trim().replace(/[_\s]/g, ""); let neg = false;
  if (s[0] === "-") { neg = true; s = s.slice(1); } else if (s[0] === "+") s = s.slice(1);
  if (!/^(?:0x[0-9a-f]+|0b[01]+|0o[0-7]+|\d+)$/i.test(s)) throw new Error("Use decimal, 0x… hex, 0b… binary or 0o… octal");
  const v = BigInt(s.toLowerCase()); return neg ? -v : v;
}
function rBitwise(c) {
  form(`<div class="btn-row"><div class="field" style="flex:1"><label>A</label><input type="text" class="mono" id="bw-a" value="0xF0" autocapitalize="off" autocomplete="off"></div><div class="field" style="flex:1"><label>B</label><input type="text" class="mono" id="bw-b" value="0x3C" autocapitalize="off" autocomplete="off"></div></div>
    <div class="btn-row"><div class="field" style="flex:1"><label>Width (bits)</label><select id="bw-w"><option>8</option><option>16</option><option selected>32</option><option>64</option></select></div><div class="field" style="flex:1"><label>Shift / rotate by</label><input type="number" class="mono" id="bw-n" value="1" min="0" max="64"></div></div>
    <p class="muted">Decimal, 0x hex, 0b binary or 0o octal. Negative numbers use two's complement.</p>`, "Calculate", () => {
    const w = parseInt($("#bw-w").value, 10), W = BigInt(w), mask = (1n << W) - 1n, n = Math.max(0, Math.min(64, parseInt($("#bw-n").value, 10) || 0)), N = BigInt(n);
    let a, b;
    try {
      const fit = (v, label) => { if (v < -(1n << (W - 1n)) || v > mask) throw new Error(`${label} doesn't fit in ${w} bits`); return BigInt.asUintN(w, v); };
      a = fit(parseBig($("#bw-a").value), "A"); b = fit(parseBig($("#bw-b").value), "B");
    } catch (e) { setStatus("❌ " + esc(e.message), "err"); play("error"); return; }
    setStatus("");
    const fmt = v => { const u = BigInt.asUintN(w, v), s = BigInt.asIntN(w, v);
      return `<div style="text-align:right"><b class="mono">0x${u.toString(16).toUpperCase().padStart(w / 4, "0")}</b><div class="muted mono">${u}${s < 0n ? " · signed " + s : ""}</div><div class="muted mono" style="word-break:break-all;font-size:11px">${u.toString(2).padStart(w, "0").replace(/(.{4})(?=.)/g, "$1 ")}</div></div>`; };
    const rot = (v, k, left) => { k = BigInt(((k % w) + w) % w); if (k === 0n) return v; return left ? ((v << k) | (v >> (W - k))) & mask : ((v >> k) | (v << (W - k))) & mask; };
    const ops = [["A", a], ["B", b], ["A & B", a & b], ["A | B", a | b], ["A ^ B", a ^ b], ["~A", ~a & mask], [`A << ${n}`, (a << N) & mask], [`A >> ${n} (logical)`, a >> N], [`A >> ${n} (arithmetic)`, BigInt.asUintN(w, BigInt.asIntN(w, a) >> N)], [`Rotate A left ${n}`, rot(a, n, true)], [`Rotate A right ${n}`, rot(a, n, false)]];
    const pop = a.toString(2).replace(/0/g, "").length;
    resultCard(`<div class="rows">${ops.map(([k, v]) => `<div class="row"><span class="k">${esc(k)}</span><span class="v">${fmt(v)}</span></div>`).join("")}<div class="row"><span class="k">Set bits in A</span><span class="v mono">${pop} of ${w}</span></div></div>`);
    play("success");
  }, "cpu");
}

/* ---- Word frequency ---- */
const WF_STOP = new Set(("the a an and or but if of to in on at by for with from as is are was were be been being it its this that these those i you he she we they me him her us them my your his our their not no so than then there here have has had do does did will would can could should may might about into over up out what which who whom when where why how all any some just also very too more most such only own same don't didn't isn't it's i'm you're that's there's can't won't " +
  "și si în in de la cu pe un o este sunt care că ca să sa se nu mai din pentru al ale ai era fi fost dar sau ce cum dacă daca după dupa însă insa lui ei el ea ne vă va le îl il mi ți ti își isi foarte prin până pana către catre între intre fără fara dintre acest această aceasta acesta acești aceste unei unui unor tot toate toți am are avea au voi noi eu tu ele mă ma te").split(/\s+/));
const WF_RE = (() => { try { return new RegExp("[\\p{L}\\p{N}]+(?:['’\\-][\\p{L}\\p{N}]+)*", "gu"); } catch (_) { return /[A-Za-z0-9ăâîșțĂÂÎȘȚ]+(?:['’-][A-Za-z0-9]+)*/g; } })();
function rWordFreq(c) {
  c.innerHTML = `<div class="card">
    <div class="field"><textarea id="wf-in" style="min-height:140px" placeholder="Paste text…"></textarea></div>
    <div class="seg" id="wf-mode"><button data-n="1" class="active">Words</button><button data-n="2">Pairs</button><button data-n="3">Triples</button></div>
    <div class="switch-row"><span>Ignore common words (EN + RO)</span><input type="checkbox" class="sw" id="wf-stop" checked></div>
    <div class="btn-row" style="margin-top:12px">
      <div class="field" style="flex:1"><label>Min length</label><select id="wf-min">${[1, 2, 3, 4, 5, 6].map(x => `<option${x === 2 ? " selected" : ""}>${x}</option>`).join("")}</select></div>
      <div class="field" style="flex:1"><label>Show top</label><select id="wf-top">${[10, 25, 50, 100].map(x => `<option${x === 25 ? " selected" : ""}>${x}</option>`).join("")}</select></div>
      <div class="field" style="flex:1"><label>Sort</label><select id="wf-sort"><option value="count">By count</option><option value="alpha">A–Z</option></select></div></div>
    <div id="wf-out" style="margin-top:6px"></div></div>`;
  let csv = "";
  const render = () => {
    const text = $("#wf-in").value, out = $("#wf-out"), n = parseInt($("#wf-mode .active").dataset.n, 10), ign = $("#wf-stop").checked, min = parseInt($("#wf-min").value, 10), top = parseInt($("#wf-top").value, 10);
    const toks = (text.match(WF_RE) || []).map(w => w.toLocaleLowerCase());
    if (!toks.length) { out.innerHTML = `<p class="muted">Paste some text to count its words.</p>`; csv = ""; return; }
    const counts = new Map(); let counted = 0;
    if (n === 1) { for (const w of toks) { if (w.length < min || (ign && WF_STOP.has(w))) continue; counts.set(w, (counts.get(w) || 0) + 1); counted++; } }
    else for (let i = 0; i + n <= toks.length; i++) {
      const g = toks.slice(i, i + n); if (g.some(w => w.length < min) || (ign && (WF_STOP.has(g[0]) || WF_STOP.has(g[n - 1])))) continue;
      const k = g.join(" "); counts.set(k, (counts.get(k) || 0) + 1); counted++;
    }
    let rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, top);
    if ($("#wf-sort").value === "alpha") rows.sort((a, b) => a[0].localeCompare(b[0]));
    if (!rows.length) { out.innerHTML = `<p class="muted">Nothing left after filtering — try turning off "ignore common words" or lowering the minimum length.</p>`; csv = ""; return; }
    const max = Math.max(...rows.map(r => r[1]));
    csv = "word,count,percent\n" + rows.map(([w, k]) => `"${w.replace(/"/g, '""')}",${k},${(k / counted * 100).toFixed(2)}`).join("\n");
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    out.innerHTML = `<div style="margin-bottom:10px"><span class="pill info">${toks.length} words</span> <span class="pill info">${new Set(toks).size} unique</span> <span class="pill ok">top: ${esc(best[0])} ×${best[1]}</span></div>
      <div class="rows">${rows.map(([w, k]) => `<div class="row" style="flex-direction:column;align-items:stretch;gap:5px"><div style="display:flex;justify-content:space-between;gap:10px"><span class="v mono" style="text-align:left">${esc(w)}</span><span class="k mono">${k} · ${(k / counted * 100).toFixed(1)}%</span></div><div style="height:6px;border-radius:999px;background:var(--bg);overflow:hidden"><div style="height:100%;width:${Math.round(k / max * 100)}%;background:var(--accent)"></div></div></div>`).join("")}</div>
      <div class="btn-row" style="margin-top:14px"><button class="btn ghost sm" id="wf-copy"><i data-lucide="copy"></i> Copy CSV</button><button class="btn ghost sm" id="wf-dl"><i data-lucide="download"></i> Download CSV</button></div>`;
    $("#wf-copy").onclick = () => copy(csv); $("#wf-dl").onclick = () => downloadText(csv, "word-frequency.csv"); iconsRefresh();
  };
  ["wf-in", "wf-stop", "wf-min", "wf-top", "wf-sort"].forEach(id => $("#" + id).addEventListener(id === "wf-in" ? "input" : "change", render));
  $("#wf-mode").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { $("#wf-mode .active").classList.remove("active"); b.classList.add("active"); play("click"); haptic(); render(); }));
  render();
}

/* =========================================================================
   SETTINGS
   ========================================================================= */
function renderSettings() {
  show("settings"); $("#view-title").textContent = T("settings");
  const v = $("#settings-view");
  v.innerHTML = `<div style="margin:6px 0 18px"></div>
    <div class="group">
      <div class="switch-row"><span>${T("sound")}</span><input type="checkbox" class="sw" id="setsound" ${soundOn ? "checked" : ""}></div>
      <div class="list-row" id="setlang"><span>${T("language")}</span><b style="color:var(--accent);font-family:var(--mono)">${lang === "ro" ? "Română" : "English"}</b></div>
      <div class="switch-row"><span>Accent</span><div id="accent-row" style="display:flex;gap:10px">${Object.entries(ACCENTS).map(([k, v]) => `<button data-acc="${k}" style="width:28px;height:28px;border-radius:50%;background:${v[0]};border:2px solid ${accent === k ? "var(--text)" : "transparent"};cursor:pointer"></button>`).join("")}</div></div>
    </div>
    <div class="group">
      <div class="list-row" id="setclearfav"><span>${T("clearFav")}</span><i data-lucide="star-off"></i></div>
      <div class="list-row" id="setclearrec"><span>${T("clearRec")}</span><i data-lucide="history"></i></div>
    </div>
    <div class="group"><div class="list-row" id="setclose"><span style="color:var(--err)">${T("close")}</span><i data-lucide="log-out"></i></div></div>
    <p class="foot">Toolkit v5 ${USER ? "· " + esc(USER.first_name) : ""}<br>self-hosted · ${TOOLS.length} tools</p>`;
  $("#setsound").onchange = e => { soundOn = e.target.checked; store.set("tk_sound", soundOn); if (soundOn) play("click"); };
  $("#setlang").onclick = () => { lang = lang === "en" ? "ro" : "en"; store.set("tk_lang", lang); play("click"); haptic(); applyLang(); renderSettings(); };
  v.querySelectorAll("[data-acc]").forEach(btn => btn.addEventListener("click", () => { accent = btn.dataset.acc; store.set("tk_accent", accent); applyAccent(); play("click"); haptic(); renderSettings(); }));
  $("#setclearfav").onclick = () => { favorites = []; store.set("tk_favs", []); toast(T("clearFav")); haptic(); };
  $("#setclearrec").onclick = () => { recents = []; store.set("tk_recents", []); toast(T("clearRec")); haptic(); };
  $("#setclose").onclick = () => { try { tg?.close(); } catch (_) {} };
  iconsRefresh();
}
function applyLang() { const s = $("#search"); if (s) s.placeholder = T("search"); }

/* ---------- boot ---------- */
function applyTheme() { document.body.classList.toggle("dark", tg?.colorScheme === "dark"); }
applyTheme(); tg?.onEvent?.("themeChanged", applyTheme);
applyAccent();
applyLang();
renderHome();
if ("serviceWorker" in navigator) { navigator.serviceWorker.register("sw.js").catch(() => {}); }
