const CACHE = 'planner-v47', FONTS = 'planner-fonts';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== FONTS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    if (r.mode === 'navigate') {
      e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); return res; })
        .catch(() => caches.match('./index.html')));
      return;
    }
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; })));
  } else if (/(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.host)) {
    e.respondWith(caches.open(FONTS).then(c => c.match(r).then(m => {
      const f = fetch(r).then(res => { c.put(r, res.clone()); return res; }).catch(() => m);
      return m || f;
    })));
  }
});
const AR = new Intl.NumberFormat('ar-EG');
function capOpts(d) {
  let body;
  if (d.paused) {
    const s = Math.max(0, Math.ceil((d.left || 0) / 1000)), ss = s % 60;
    body = 'متوقفة مؤقتًا · باقي ' + AR.format(Math.floor(s / 60)) + ':' + (ss < 10 ? '٠' : '') + AR.format(ss);
  } else {
    const m = Math.max(1, Math.ceil((d.end - Date.now()) / 60000));
    let t = ''; try { t = new Date(d.end).toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' }); } catch (x) {}
    body = 'باقي ' + AR.format(m) + (m > 2 && m < 11 ? ' دقائق' : ' دقيقة') + (t ? ' · تنتهي ' + t : '');
  }
  return { tag: 'cap-run', body, silent: true, renotify: false, requireInteraction: true, lang: 'ar', dir: 'rtl', icon: 'icon-192.png', badge: 'icon-192.png',
    timestamp: d.paused ? Date.now() : d.end, data: d,
    actions: [{ action: d.paused ? 'cap-resume' : 'cap-pause', title: d.paused ? '▶ استئناف' : '❚❚ إيقاف مؤقت' }, { action: 'cap-stop', title: '■ إنهاء' }] };
}
function tell(msg) { return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => { list.forEach(c => c.postMessage(msg)); return list; }); }
self.addEventListener('notificationclose', e => {
  const d = e.notification.data || {};
  if (d.cap) e.waitUntil(tell({ capClosed: 1 }));
});
self.addEventListener('notificationclick', e => {
  const n = e.notification, d = n.data || {}, act = e.action || '';
  if (d.cap && (act === 'cap-pause' || act === 'cap-resume')) {
    const at = Date.now(), nd = Object.assign({}, d);
    if (act === 'cap-pause') { nd.left = Math.max(0, d.end - at); nd.paused = true; } else { nd.end = at + (d.left || 0); nd.paused = false; }
    e.waitUntil(Promise.all([self.registration.showNotification(n.title, capOpts(nd)), tell({ capAction: act, at })]));
    return;
  }
  e.notification.close();
  if (d.cap && act === 'cap-stop') {
    e.waitUntil(tell({ capAction: act, at: Date.now() }).then(list => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      return self.clients.openWindow('./#todo');
    }));
    return;
  }
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./#todo');
  }));
});
