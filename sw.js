/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
// Cambiare il numero quando cambia l'elenco dei file precaricati, cosi' il nuovo service
// worker scarica di nuovo tutto e cancella la cache vecchia.
const CACHE_NAME = 'dm-toolkit-v38';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/base.css',
  './css/components.css',
  './css/layout.css',
  './css/identita.css', './css/scena.css',
  './favicon.png',
  './favicon.svg',
  './icons/simbolo.svg',
  './icons/simbolo-piccolo.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-48.png',
  // Immagini della campagna di esempio (js/campagna-demo.js)
  ...['tessa', 'orsino', 'cinerea', 'bertrando', 'dalia', 'rocco', 'valmora', 'ardegna', 'tino', 'cripta', 'corvara', 'custodi', 'gilda', 'ilaria', 'grun', 'selvaggia'].map((n) => './img/demo/' + n + '.webp'),
];

// Dati del Compendio, generatori, schermo del DM...: vengono letti con fetch solo quando si
// apre la sezione che li usa. Senza precaricarli, offline funzionavano solo le parti gia'
// aperte almeno una volta con internet.
const DATA_FILES = [
  'dm_screen_2014.json', 'dm_screen_2024.json', 'sane_prices.json', 'tabelle.json', 'velocita.json',
  'srd_5_1_equipment.json', 'srd_5_1_magic_items.json', 'srd_5_1_monsters.json', 'srd_5_1_rules.json', 'srd_5_1_spells.json',
  'srd_5_2_1_equipment.json', 'srd_5_2_1_magic_items.json', 'srd_5_2_1_monsters.json', 'srd_5_2_1_rules.json', 'srd_5_2_1_spells.json',
].map((f) => './data/' + f);

// Font in locale (assets/fonts): quelli dell'app, delle mappe e dei documenti, cosi' offline
// anche le mappe e gli stemmi esportati hanno i caratteri giusti.
const FONT_CSS_LOCALI = ['./assets/fonts/app.css', './assets/fonts/mappe.css', './assets/fonts/documenti.css', './assets/fonts/documenti-base.css'];

// Gli script (js/*.js e librerie da CDN) si leggono direttamente da index.html invece di
// elencarli a mano qui: un nuovo modulo js/ aggiunto alla pagina finisce in cache da solo.
const _scriptsFromIndex = async () => {
  try {
    const html = await (await fetch('./index.html', { cache: 'no-cache' })).text();
    return [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1])
      .filter((src) => !src.includes('accounts.google.com')); // login Google: solo online
  } catch (e) {
    return [];
  }
};

// I font veri (woff2) sono elencati dentro i CSS locali: si leggono da li'.
const _fontFiles = async (cache) => {
  await Promise.all(FONT_CSS_LOCALI.map(async (cssUrl) => {
    try {
      const res = await fetch(cssUrl, { cache: 'no-cache' });
      if (!res.ok) return;
      await cache.put(cssUrl, res.clone());
      const css = await res.text();
      const base = new URL(cssUrl, self.location.href);
      const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map((m) => new URL(m[1].replace(/['"]/g, ''), base).href);
      await Promise.all(urls.map((u) => cache.add(u).catch(() => {})));
    } catch (e) {}
  }));
};

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const scripts = await _scriptsFromIndex();
    // Un file per volta invece di cache.addAll: con addAll un solo file non raggiungibile
    // (es. un CDN momentaneamente giu') annullava tutto il precaricamento.
    await Promise.all([...APP_SHELL, ...DATA_FILES, ...scripts].map((u) => cache.add(new Request(u, { cache: 'no-cache' })).catch(() => {})));
    await _fontFiles(cache);
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Network-first: sempre l'ultima versione quando online, fallback alla cache offline.
// Chiamate alle API (Drive, Firebase, login Google): dati personali e sempre diversi, non vanno
// messi in cache ne' sostituiti offline con index.html. Le immagini su drive.google.com invece
// passano dalla cache come il resto, cosi' le mappe si vedono anche senza internet.
// Dopo una richiesta scaduta la rete è da considerare lenta per un po': gli altri file arrivano
// subito dalla copia salvata (la rete li aggiorna lo stesso in sottofondo), invece di aspettare
// 3 secondi ciascuno.
let _lentaFino = 0;

const _soloRete = (url) => /(^|\.)googleapis\.com$/.test(url.hostname) && url.hostname !== 'fonts.googleapis.com'
  || /firebaseio\.com$|firebasedatabase\.app$|accounts\.google\.com$|^api\.github\.com$/.test(url.hostname);

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (_soloRete(new URL(event.request.url))) return;

  // File dell'app: GitHub Pages li fa tenere al browser fino a 10 minuti (max-age=600), quindi
  // anche online si poteva ricevere la versione vecchia dopo un aggiornamento (e "Aggiorna" del
  // banner non aggiornava niente). 'no-cache' chiede sempre al server se sono cambiati: se no,
  // risponde 304 senza riscaricarli.
  const url = new URL(event.request.url);
  const richiesta = url.origin === self.location.origin ? fetch(event.request.url, { cache: 'no-cache' }) : fetch(event.request);

  // Rete aggiornata in cache solo se la risposta è buona: una pagina d'errore del server (404, 500)
  // non deve prendere il posto della copia buona che serve offline.
  const rete = richiesta.then((response) => {
    if (response.ok || response.type === 'opaque') {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
    }
    return response;
  });
  rete.catch(() => {}); // se vince la cache, un errore di rete arrivato dopo non va segnalato

  // Pagina dell'app solo al posto di una pagina (navigazione), non di un'immagine o di un file di dati.
  const pagina = event.request.mode === 'navigate';
  const dallaCache = () => caches.match(event.request, { ignoreSearch: pagina })
    .then((cached) => cached || (pagina ? caches.match('./index.html') : undefined));

  // Con poco campo la richiesta può restare appesa a lungo senza mai fallire: dopo 3 secondi si usa
  // la copia salvata (se c'è) e intanto la rete, se poi risponde, aggiorna la cache per la prossima volta.
  event.respondWith(new Promise((resolve, reject) => {
    let finito = false;
    const usaCache = () => dallaCache().then((cached) => {
      if (finito) return;
      if (cached) { finito = true; resolve(cached); }
    });
    const timer = setTimeout(() => { _lentaFino = Date.now() + 30000; usaCache(); }, Date.now() < _lentaFino ? 0 : 3000);
    rete.then((response) => {
      if (finito) return;
      clearTimeout(timer);
      _lentaFino = 0; // la rete ha risposto in tempo: di nuovo prima la rete
      // Risposta d'errore del server: meglio la copia buona, se esiste
      if (!response.ok && response.type !== 'opaque') {
        return dallaCache().then((cached) => { if (!finito) { finito = true; resolve(cached || response); } });
      }
      finito = true; resolve(response);
    }, () => {
      clearTimeout(timer);
      dallaCache().then((cached) => {
        if (finito) return;
        finito = true;
        if (cached) resolve(cached); else reject(new TypeError('offline'));
      });
    });
  }));
});
