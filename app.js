(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const nav = $('.nav');
  const mast = $('.mast');
  const menuButton = $('.menu-button');
  const modal = $('.modal');
  const toast = $('.toast');
  let toastTimer;

  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  };

  // Menú móvil ------------------------------------------------------------
  const setMenu = (open) => {
    nav?.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    menuButton?.setAttribute('aria-expanded', String(open));
    menuButton?.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  };
  const syncMastHeight = () => {
    if (mast) document.documentElement.style.setProperty('--mast-h', `${mast.getBoundingClientRect().bottom}px`);
  };
  menuButton?.addEventListener('click', () => {
    syncMastHeight();
    setMenu(!nav?.classList.contains('open'));
  });
  $$('.nav a').forEach((link) => link.addEventListener('click', () => setMenu(false)));

  // Marca compacta en la barra fija al hacer scroll --------------------------
  if (mast && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => document.body.classList.toggle('is-stuck', !entry.isIntersecting)).observe(mast);
  }

  // Fecha de la edición y fechas relativas ----------------------------------
  const tz = { timeZone: 'Europe/Madrid' };
  const today = $('[data-today]');
  if (today) {
    const text = new Intl.DateTimeFormat('es-ES', { ...tz, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    today.textContent = text.charAt(0).toUpperCase() + text.slice(1);
  }
  const dayKey = (d) => new Intl.DateTimeFormat('en-CA', tz).format(d);
  const time = new Intl.DateTimeFormat('es-ES', { ...tz, hour: '2-digit', minute: '2-digit' });
  const now = new Date();
  const yesterday = new Date(now.getTime() - 864e5);
  $$('time[data-rel]').forEach((el) => {
    const d = new Date(el.getAttribute('datetime'));
    const minutes = Math.round((now - d) / 6e4);
    if (minutes >= 0 && minutes < 60) el.textContent = minutes <= 1 ? 'Hace un momento' : `Hace ${minutes} min`;
    else if (dayKey(d) === dayKey(now)) el.textContent = `Hoy · ${time.format(d)}`;
    else if (dayKey(d) === dayKey(yesterday)) el.textContent = `Ayer · ${time.format(d)}`;
  });

  // Modal -------------------------------------------------------------------
  let lastFocus;
  const openModal = (title, text) => {
    if (!modal) return;
    $('h2', modal).textContent = title;
    $('p', modal).textContent = text;
    lastFocus = document.activeElement;
    modal.hidden = false;
    $('.modal-close', modal)?.focus();
  };
  const closeModal = () => {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    lastFocus?.focus();
  };
  $('.modal-close')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeModal();
    if (nav?.classList.contains('open')) setMenu(false);
  });

  // Apoyo -------------------------------------------------------------------
  $$('[data-plan]').forEach((button) => {
    button.addEventListener('click', () => {
      const membership = button.dataset.plan === 'membership';
      openModal(
        membership ? 'Suscripción mensual' : 'Aportación puntual',
        membership
          ? 'El pago de la suscripción todavía no está activado. Añade el enlace de Stripe en Panel de administración → Ajustes del sitio.'
          : 'Las aportaciones todavía no están activadas. Añade los enlaces de Stripe en Panel de administración → Ajustes del sitio.',
      );
    });
  });

  const contribute = $('[data-contribute]');
  $$('.amounts button').forEach((button) => {
    button.addEventListener('click', () => {
      $$('.amounts button').forEach((item) => {
        item.classList.toggle('selected', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      });
      if (!contribute) return;
      contribute.textContent = `Aportar ${button.dataset.amount} € →`;
      if (contribute.tagName === 'A' && button.dataset.url) contribute.href = button.dataset.url;
    });
  });

  $$('[data-newsletter]').forEach((button) => {
    button.addEventListener('click', () => showToast('La newsletter estará disponible muy pronto.'));
  });

  $$('[data-login]').forEach((button) => {
    button.addEventListener('click', () => showToast('El acceso para lectores estará disponible muy pronto.'));
  });

  // Compartir -----------------------------------------------------------------
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      showToast('Enlace copiado al portapapeles.');
    } catch {
      showToast('No se pudo copiar el enlace.');
    }
  };
  $$('[data-copy]').forEach((button) => button.addEventListener('click', copyLink));
  $$('[data-share]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: button.dataset.title || document.title, url: location.href });
        } catch { /* cancelado por el usuario */ }
      } else {
        copyLink();
      }
    });
  });

  // Barra de progreso de lectura ------------------------------------------------
  const bar = $('.progress span');
  const copy = $('.copy');
  if (bar && copy) {
    let ticking = false;
    const update = () => {
      const rect = copy.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.6;
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(total, 1)));
      bar.style.transform = `scaleX(${progress})`;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }
  // Tamaño de letra elegido por el lector (se recuerda en este navegador) --------
  const SCALES = [0.9, 1, 1.12, 1.25, 1.4];
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
  };
  let scaleIndex = Math.max(0, SCALES.indexOf(Number(store.get('reader-scale')) || 1));
  const applyScale = () => document.documentElement.style.setProperty('--reader-scale', SCALES[scaleIndex]);
  applyScale();
  $$('[data-font]').forEach((button) => {
    button.addEventListener('click', () => {
      scaleIndex = Math.min(SCALES.length - 1, Math.max(0, scaleIndex + Number(button.dataset.font)));
      applyScale();
      store.set('reader-scale', SCALES[scaleIndex]);
      showToast(`Tamaño del texto: ${Math.round(SCALES[scaleIndex] * 100)} %`);
    });
  });

  // Vídeos de YouTube: se cargan solo al pulsar (la página va más rápida) ------
  $$('.yt-facade').forEach((button) => {
    button.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(button.dataset.yt)}?autoplay=1&rel=0`;
      frame.title = button.getAttribute('aria-label') || 'Vídeo de YouTube';
      frame.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
      frame.allowFullscreen = true;
      frame.style.aspectRatio = button.closest('.is-vertical') ? '9 / 16' : '16 / 9';
      button.replaceWith(frame);
    });
  });

  // Publicaciones de redes sociales: el script de cada red solo se carga si hace falta
  const socialScripts = {
    x: 'https://platform.twitter.com/widgets.js',
    instagram: 'https://www.instagram.com/embed.js',
    tiktok: 'https://www.tiktok.com/embed.js',
  };
  new Set($$('[data-embed]').map((el) => el.dataset.embed)).forEach((kind) => {
    if (!socialScripts[kind]) return;
    const script = document.createElement('script');
    script.src = socialScripts[kind];
    script.async = true;
    document.body.append(script);
  });

  // Banners: si hay varios en el mismo hueco, se muestra uno al azar ------------
  $$('.ad[data-rotate]').forEach((slot) => {
    const items = $$('.ad-item', slot);
    const pick = Math.floor(Math.random() * items.length);
    items.forEach((item, i) => { item.hidden = i !== pick; });
  });

  // Radio en directo ---------------------------------------------------------------
  const radioBar = $('#radio-bar');
  if (radioBar) {
    const audio = $('audio', radioBar);
    const toggle = $('.radio-toggle', radioBar);
    const status = $('.radio-status', radioBar);
    const liveButtons = $$('[data-radio]');
    const session = {
      get: () => { try { return sessionStorage.getItem('radio'); } catch { return null; } },
      set: (v) => { try { sessionStorage.setItem('radio', v); } catch { /* sin almacenamiento */ } },
    };
    const setState = (state) => {
      radioBar.classList.toggle('is-playing', state === 'playing');
      radioBar.classList.toggle('is-loading', state === 'loading');
      toggle.setAttribute('aria-label', state === 'playing' ? 'Pausar' : 'Reproducir');
      status.textContent = state === 'playing' ? 'Sonando en directo' : state === 'loading' ? 'Conectando…' : state === 'error' ? 'No se pudo conectar' : 'En directo · pulsa para escuchar';
      liveButtons.forEach((b) => b.setAttribute('aria-expanded', String(!radioBar.hidden)));
    };
    const play = () => {
      // Se vuelve a pedir el directo para no reproducir audio antiguo del búfer.
      audio.src = radioBar.dataset.stream;
      setState('loading');
      audio.play().then(() => session.set('on')).catch(() => setState('paused'));
    };
    const stop = () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      setState('paused');
    };
    audio.addEventListener('playing', () => setState('playing'));
    audio.addEventListener('error', () => { if (audio.getAttribute('src')) setState('error'); });
    toggle.addEventListener('click', () => (radioBar.classList.contains('is-playing') || radioBar.classList.contains('is-loading') ? stop() : play()));
    $('.radio-close', radioBar).addEventListener('click', () => {
      stop();
      radioBar.hidden = true;
      session.set('off');
      setState('paused');
    });
    liveButtons.forEach((button) => button.addEventListener('click', () => {
      radioBar.hidden = false;
      if (nav?.classList.contains('open')) setMenu(false);
      play();
    }));
    // Al cambiar de página el audio se corta: dejamos el reproductor a mano para seguir.
    if (session.get() === 'on') {
      radioBar.hidden = false;
      setState('paused');
      audio.src = radioBar.dataset.stream;
      audio.play().catch(() => { audio.removeAttribute('src'); setState('paused'); });
    }
  }
})();
