// Cambiare il numero quando cambia l'elenco dei file precaricati, cosi' il nuovo service
// worker scarica di nuovo tutto e cancella la cache vecchia.
const CACHE_NAME = 'dm-toolkit-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/base.css',
  './css/components.css',
  './css/layout.css',
  './favicon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-48.png',
];

// Dati del Compendio, generatori, schermo del DM...: vengono letti con fetch solo quando si
// apre la sezione che li usa. Senza precaricarli, offline funzionavano solo le parti gia'
// aperte almeno una volta con internet.
const DATA_FILES = [
  'dm_screen_2014.json', 'dm_screen_2024.json', 'sane_prices.json', 'tabelle.json', 'velocita.json',
  'srd_5_1_equipment.json', 'srd_5_1_magic_items.json', 'srd_5_1_monsters.json', 'srd_5_1_rules.json', 'srd_5_1_spells.json',
  'srd_5_2_1_equipment.json', 'srd_5_2_1_magic_items.json', 'srd_5_2_1_monsters.json', 'srd_5_2_1_rules.json', 'srd_5_2_1_spells.json',
].map((f) => './data/' + f);

const FONTS_CSS = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&family=JetBrains+Mono:wght@400;500&display=swap';

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

// I font veri (woff2) sono elencati dentro il CSS di Google Fonts: si scaricano da li'.
const _fontFiles = async (cache) => {
  try {
    const res = await fetch(FONTS_CSS);
    if (!res.ok) return;
    await cache.put(FONTS_CSS, res.clone());
    const css = await res.text();
    const urls = [...css.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]);
    await Promise.all(urls.map((u) => cache.add(u).catch(() => {})));
  } catch (e) {}
};

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const scripts = await _scriptsFromIndex();
    // Un file per volta invece di cache.addAll: con addAll un solo file non raggiungibile
    // (es. un CDN momentaneamente giu') annullava tutto il precaricamento.
    await Promise.all([...APP_SHELL, ...DATA_FILES, ...scripts].map((u) => cache.add(u).catch(() => {})));
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
const _soloRete = (url) => /(^|\.)googleapis\.com$/.test(url.hostname) && url.hostname !== 'fonts.googleapis.com'
  || /firebaseio\.com$|firebasedatabase\.app$|accounts\.google\.com$/.test(url.hostname);

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (_soloRete(new URL(event.request.url))) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
