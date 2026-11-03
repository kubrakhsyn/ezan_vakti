(() => {
  'use strict';

  /* ---------- Ayarlar ---------- */
  const METHOD = 13; // 13 = Diyanet İşleri Başkanlığı (Türkiye)
  // Kerahat süreleri (dakika, yaklaşık). İstersen buradan değiştirebilirsin.
  const KERAHAT = { gunes: 45, istiva: 45, gurub: 45 };

  const PR = [['Fajr','İmsak'],['Sunrise','Güneş'],['Dhuhr','Öğle'],['Asr','İkindi'],['Maghrib','Akşam'],['Isha','Yatsı']];
  const HIJRI = ['Muharrem','Safer','Rebiülevvel','Rebiülahir','Cemaziyelevvel','Cemaziyelahir','Recep','Şaban','Ramazan','Şevval','Zilkade','Zilhicce'];
  const NAMAZ = ['Sabah','Öğle','İkindi','Akşam','Yatsı'];

  /* ---------- Yardımcılar ---------- */
  const $ = (s) => document.querySelector(s);
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const LS = {
    get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  const fmtDate = (d) => d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  /* ---------- Servis çalışanı (çevrimdışı) ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  const page = document.body.dataset.page;
  $('#date').textContent = fmtDate(new Date());

  if (page === 'home') initHome(); else initTrack();

  /* =====================================================
     ANA SAYFA: ezan vakitleri
     ===================================================== */
  function initHome() {
    let cities = LS.get('ezan_cities', []);
    let active = LS.get('ezan_active', null);
    let cache = LS.get('ezan_cache', {});
    let T = null;            // bugünün vakitleri
    let shownDate = '';
    let timer = null;

    const cityKey = (c) => `${c.name}|${c.country}`;
    const activeCity = () => cities.find((c) => cityKey(c) === active) || cities[0] || null;
    const saveCache = () => LS.set('ezan_cache', cache);

    function prune() {
      const limit = iso(addDays(new Date(), -3));
      for (const k of Object.keys(cache)) {
        for (const d of Object.keys(cache[k])) if (d < limit) delete cache[k][d];
      }
    }

    async function fetchMonth(city, y, m) {
      const url = `https://api.aladhan.com/v1/calendarByCity/${y}/${m}?city=${encodeURIComponent(city.name)}&country=${encodeURIComponent(city.country)}&method=${METHOD}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error('http');
      const j = await r.json();
      if (j.code !== 200 || !Array.isArray(j.data)) throw new Error('data');
      const key = cityKey(city);
      cache[key] = cache[key] || {};
      for (const it of j.data) {
        const [dd, mm, yy] = it.date.gregorian.date.split('-');
        const o = {};
        for (const [k] of PR) o[k] = String(it.timings[k]).slice(0, 5);
        const h = it.date.hijri;
        o.hijri = `${parseInt(h.day, 10)} ${HIJRI[Number(h.month.number) - 1]} ${h.year}`;
        cache[key][`${yy}-${mm}-${dd}`] = o;
      }
      prune();
      saveCache();
    }

    // Verilen gün önbellekte yoksa, o ayın tamamını bir kerede çeker.
    async function ensure(city, d) {
      const key = cityKey(city);
      if (cache[key] && cache[key][iso(d)]) return true;
      if (!navigator.onLine) return false;
      try { await fetchMonth(city, d.getFullYear(), d.getMonth() + 1); } catch { return false; }
      return !!(cache[key] && cache[key][iso(d)]);
    }

    const toDate = (base, hhmm, addMin = 0) => {
      const [h, m] = hhmm.split(':').map(Number);
      const d = new Date(base); d.setHours(h, m + addMin, 0, 0); return d;
    };
    const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

    /* ---- Çizim ---- */
    function renderChips() {
      const ac = activeCity();
      $('#chips').innerHTML =
        cities.map((c) => `<button class="chip ${ac && cityKey(c) === cityKey(ac) ? 'active' : ''}" data-k="${esc(cityKey(c))}">${esc(c.name)}</button>`).join('') +
        `<button class="chip add" id="addChip">＋ Şehir</button>`;
    }

    async function render() {
      clearInterval(timer);
      const now = new Date();
      shownDate = iso(now);
      $('#date').textContent = fmtDate(now);
      renderChips();

      const city = activeCity();
      ['hero', 'times', 'kerahat', 'empty'].forEach((id) => $('#' + id).hidden = true);
      $('#status').innerHTML = '';

      if (!city) {
        $('#emptyMsg').textContent = 'Başlamak için bir şehir ekle.';
        $('#empty').hidden = false;
        $('#hijri').textContent = '';
        return;
      }

      const ok = await ensure(city, now);
      ensure(city, addDays(now, 1)); // yarının imsak vakti için (ay sonunda gerekli)
      T = cache[cityKey(city)] && cache[cityKey(city)][iso(now)];

      if (!ok || !T) {
        $('#emptyMsg').textContent = navigator.onLine
          ? 'Vakitler alınamadı. Şehir adını kontrol et ya da biraz sonra tekrar dene.'
          : 'İnternet yok ve bu gün için kayıtlı veri bulunamadı. Bir kere internete bağlanman yeterli.';
        $('#emptyBtn').textContent = 'Tekrar dene';
        $('#empty').hidden = false;
        $('#hijri').textContent = '';
        return;
      }

      $('#hijri').textContent = T.hijri || '';
      $('#times').innerHTML = PR.map(([k, n]) =>
        `<div class="row ${k === 'Sunrise' ? 'minor' : ''}" data-k="${k}"><span class="n">${n}</span><span class="t">${T[k]}</span></div>`
      ).join('');

      const dh = toDate(now, T.Dhuhr), mg = toDate(now, T.Maghrib), sr = toDate(now, T.Sunrise);
      const ranges = [
        { n: 'Güneş doğarken', a: sr, b: toDate(now, T.Sunrise, KERAHAT.gunes) },
        { n: 'Öğleye doğru (istiva)', a: toDate(now, T.Dhuhr, -KERAHAT.istiva), b: dh },
        { n: 'Güneş batarken', a: toDate(now, T.Maghrib, -KERAHAT.gurub), b: mg }
      ];
      $('#kerahat').innerHTML = `<h3>Kerahat vakitleri <small>(yaklaşık)</small></h3>` +
        ranges.map((r, i) => `<div class="krow" data-i="${i}"><span>${r.n}</span><span class="t">${hm(r.a)} – ${hm(r.b)}</span></div>`).join('') +
        `<p class="knote">Bu vakitlerde nafile namaz kılınmaz.</p>`;
      render.ranges = ranges;

      ['hero', 'times', 'kerahat'].forEach((id) => $('#' + id).hidden = false);
      const age = LS.get('ezan_last_fetch_' + cityKey(city), null);
      $('#status').innerHTML = `${esc(city.name)} · Diyanet hesaplaması · çevrimdışı çalışır · <a href="#" id="refresh">yenile</a>`;
      tick();
      timer = setInterval(tick, 1000);
    }

    function tick() {
      const now = new Date();
      if (iso(now) !== shownDate) { render(); return; }
      const city = activeCity();
      const ev = PR.map(([k, n]) => ({ k, n, d: toDate(now, T[k]) }));
      let next = ev.find((e) => e.d > now);
      if (!next) {
        const tt = cache[cityKey(city)] && cache[cityKey(city)][iso(addDays(now, 1))];
        if (tt) next = { k: 'Fajr', n: 'İmsak', d: toDate(addDays(now, 1), tt.Fajr) };
      }
      const cur = [...ev].reverse().find((e) => e.d <= now);

      if (next) {
        const s = Math.max(0, Math.floor((next.d - now) / 1000));
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
        $('#heroName').textContent = next.n;
        $('#heroTime').textContent = hm(next.d);
        $('#heroCount').textContent = `${pad(h)}:${pad(m)}:${pad(sec)} kaldı`;
      } else {
        $('#heroName').textContent = 'Yarın imsak';
        $('#heroTime').textContent = '--:--';
        $('#heroCount').textContent = 'Yarının verisi için bir kere internete bağlan';
      }
      document.querySelectorAll('#times .row').forEach((r) => {
        r.classList.toggle('now', !!cur && r.dataset.k === cur.k);
        r.classList.toggle('next', !!next && next.k === r.dataset.k && next.d.getDate() === now.getDate());
      });
      (render.ranges || []).forEach((r, i) => {
        const el = document.querySelector(`.krow[data-i="${i}"]`);
        if (el) el.classList.toggle('on', now >= r.a && now < r.b);
      });
    }

    /* ---- Şehir yönetimi ---- */
    const dlg = $('#cityDlg');
    function renderCityList() {
      $('#cityList').innerHTML = cities.length
        ? cities.map((c) => `<li><span>${esc(c.name)} <small>${esc(c.country)}</small></span><button type="button" data-del="${esc(cityKey(c))}">Sil</button></li>`).join('')
        : '<li><small>Henüz şehir yok.</small></li>';
    }
    function openDlg() { renderCityList(); $('#cityMsg').textContent = ''; dlg.showModal(); }

    $('#cityClose').addEventListener('click', () => dlg.close());
    $('#cityList').addEventListener('click', (e) => {
      const k = e.target.dataset.del; if (!k) return;
      cities = cities.filter((c) => cityKey(c) !== k);
      delete cache[k]; saveCache();
      if (active === k) active = cities[0] ? cityKey(cities[0]) : null;
      LS.set('ezan_cities', cities); LS.set('ezan_active', active);
      renderCityList(); render();
    });
    $('#cityForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('#cityName').value.trim();
      const country = $('#cityCountry').value.trim() || 'Turkey';
      if (!name) return;
      const city = { name, country };
      $('#cityMsg').textContent = 'Vakitler alınıyor…';
      $('#cityAdd').disabled = true;
      try {
        const n = new Date();
        await fetchMonth(city, n.getFullYear(), n.getMonth() + 1);
      } catch {
        $('#cityMsg').textContent = navigator.onLine
          ? 'Şehir bulunamadı. Adı İngilizce/ASCII yazmayı dene (örn. Istanbul, Izmir).'
          : 'İnternet yok. Şehir eklemek için bağlanman gerek.';
        $('#cityAdd').disabled = false;
        return;
      }
      $('#cityAdd').disabled = false;
      if (!cities.some((c) => cityKey(c) === cityKey(city))) cities.push(city);
      active = cityKey(city);
      LS.set('ezan_cities', cities); LS.set('ezan_active', active);
      $('#cityName').value = '';
      dlg.close();
      render();
    });

    $('#chips').addEventListener('click', (e) => {
      if (e.target.id === 'addChip') return openDlg();
      const k = e.target.dataset.k; if (!k) return;
      active = k; LS.set('ezan_active', active); render();
    });
    $('#emptyBtn').addEventListener('click', () => {
      if (!activeCity()) openDlg(); else render();
    });
    document.addEventListener('click', async (e) => {
      if (e.target.id !== 'refresh') return;
      e.preventDefault();
      const city = activeCity(); if (!city) return;
      if (!navigator.onLine) { $('#status').textContent = 'İnternet yok, kayıtlı veri kullanılıyor.'; return; }
      $('#status').textContent = 'Yenileniyor…';
      try { const n = new Date(); await fetchMonth(city, n.getFullYear(), n.getMonth() + 1); } catch {}
      render();
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && T && iso(new Date()) !== shownDate) render(); });

    render();
  }

  /* =====================================================
     TAKİP SAYFASI: kılınan namazlar
     ===================================================== */
  function initTrack() {
    let log = LS.get('ezan_kilinan', {});   // { "2026-11-04": [true,false,true,false,false] }
    let days = 30;

    const get = (k) => log[k] || [false, false, false, false, false];
    const count = (k) => get(k).filter(Boolean).length;

    function toggle(k, i) {
      const a = [...get(k)]; a[i] = !a[i];
      if (a.some(Boolean)) log[k] = a; else delete log[k];
      LS.set('ezan_kilinan', log);
      render();
    }

    function label(i, d) {
      if (i === 0) return 'Bugün';
      if (i === 1) return 'Dün';
      return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' });
    }

    function render() {
      const today = new Date(), tk = iso(today);
      $('#date').textContent = fmtDate(today);

      // Bugün
      const t = get(tk);
      $('#today').innerHTML =
        `<div class="today-title"><b>Bugün</b><span>${count(tk)}/5 vakit</span></div>` +
        `<div class="prayers">` + NAMAZ.map((n, i) =>
          `<button class="pray ${t[i] ? 'done' : ''}" data-k="${tk}" data-i="${i}"><div class="c">✓</div>${n}</button>`
        ).join('') + `</div>`;

      // İstatistik
      let week = 0;
      for (let i = 0; i < 7; i++) week += count(iso(addDays(today, -i)));
      let streak = 0, i0 = count(tk) === 5 ? 0 : 1;
      for (let i = i0; i < 3650; i++) { if (count(iso(addDays(today, -i))) === 5) streak++; else break; }
      const total = Object.values(log).reduce((s, a) => s + a.filter(Boolean).length, 0);
      $('#stats').innerHTML =
        `<div><b>${week}/35</b><span>Son 7 gün</span></div>` +
        `<div><b>${streak}</b><span>Tam gün serisi</span></div>` +
        `<div><b>${total}</b><span>Toplam vakit</span></div>`;

      // Geçmiş
      let html = `<div class="hhead"><div class="dots">${NAMAZ.map((n) => `<span>${n.slice(0, 2)}</span>`).join('')}</div><span style="width:34px"></span></div>`;
      for (let i = 1; i <= days; i++) {
        const d = addDays(today, -i), k = iso(d), a = get(k);
        html += `<div class="hrow"><span class="d">${label(i, d)}</span><div class="dots">` +
          a.map((v, j) => `<button class="dot ${v ? 'done' : ''}" data-k="${k}" data-i="${j}" aria-label="${NAMAZ[j]}">✓</button>`).join('') +
          `</div><span class="k">${count(k)}/5</span></div>`;
      }
      $('#history').innerHTML = html;
      $('#moreBtn').hidden = days >= 365;
    }

    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-k][data-i]'); if (!b) return;
      toggle(b.dataset.k, Number(b.dataset.i));
    });
    $('#moreBtn').addEventListener('click', () => { days = Math.min(365, days + 30); render(); });

    $('#exportBtn').addEventListener('click', async () => {
      const txt = JSON.stringify(log);
      try { await navigator.clipboard.writeText(txt); $('#status').textContent = 'Yedek panoya kopyalandı. Notlar gibi bir yere yapıştırıp sakla.'; }
      catch { window.prompt('Yedeği kopyala:', txt); }
    });
    $('#importBtn').addEventListener('click', () => {
      const txt = window.prompt('Yedeği buraya yapıştır:');
      if (!txt) return;
      try {
        const data = JSON.parse(txt);
        for (const [k, v] of Object.entries(data)) if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Array.isArray(v) && v.length === 5) log[k] = v.map(Boolean);
        LS.set('ezan_kilinan', log); render();
        $('#status').textContent = 'Yedek yüklendi.';
      } catch { $('#status').textContent = 'Yedek okunamadı.'; }
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

    render();
  }
})();
