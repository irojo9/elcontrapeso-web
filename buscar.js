// Buscador de /buscar/: filtra en el navegador el índice /buscar/indice.json que genera build.mjs.
(() => {
  const input = document.getElementById('q'), out = document.querySelector('[data-search]'), count = document.querySelector('.search-count');
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  let data = null, timer;
  const load = () => data || (data = fetch('/buscar/indice.json').then((r) => r.json()).then((list) => list.map((a) => ({ ...a, k: norm([a.t, a.e, a.s, a.a, (a.g || []).join(' ')].join(' ')), kt: norm(a.t) }))));
  const run = async () => {
    const q = input.value.trim();
    const url = new URL(location.href);
    if (q) url.searchParams.set('q', q); else url.searchParams.delete('q');
    history.replaceState(null, '', url);
    if (q.length < 2) { out.innerHTML = ''; count.textContent = ''; return; }
    const terms = norm(q).split(/\s+/).filter(Boolean);
    const list = (await load()).filter((a) => terms.every((t) => a.k.includes(t)))
      .map((a) => ({ a, score: terms.reduce((n, t) => n + (a.kt.includes(t) ? 3 : 0), 0) }))
      .sort((x, y) => y.score - x.score || y.a.d.localeCompare(x.a.d)).slice(0, 60);
    count.textContent = list.length ? `${list.length === 60 ? 'Más de 60' : list.length} resultado${list.length === 1 ? '' : 's'}` : 'Sin resultados. Prueba con otras palabras.';
    out.innerHTML = list.map(({ a }) => `<article class="search-item"><p class="kicker">${esc(a.s)} · ${fmt.format(new Date(a.d))}</p><h2><a href="${esc(a.u)}">${esc(a.t)}</a></h2><p>${esc(a.e)}</p><small>${esc(a.a)}</small></article>`).join('');
  };
  input.value = new URL(location.href).searchParams.get('q') || '';
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 180); });
  input.form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  if (input.value) run(); else input.addEventListener('focus', load, { once: true });
})();
