/* =========================================================
   ПИВБАР — interactions
   Reveal on scroll, parallax, sticky header, live menu render
   ========================================================= */

(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const staticPreview = new URLSearchParams(window.location.search).has('static');
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const header = $('#header');
  const burger = $('#burger');
  const mobileMenu = $('#mobileMenu');
  const progress = $('#scrollProgress');

  /* ---------- helpers ---------- */

  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));

  const safeColor = (value) =>
    /^#[0-9a-f]{3,8}$/i.test(String(value)) ? value : '#e3a43c';

  const formatDate = (iso) => {
    const date = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long'
    }).format(date);
  };

  /* ---------- render taps + stage from content.js ---------- */

  const data = window.PIVBAR_DATA || {};
  const tapGrid = $('#tapGrid');

  if (tapGrid && Array.isArray(data.taps) && data.taps.length) {
    tapGrid.innerHTML = data.taps.slice(0, 6).map((tap, index) => `
      <article class="tap reveal" style="--i:${index};--beer:${safeColor(tap.color)}">
        <div class="tap__top">
          <span class="tap__num">${String(index + 1).padStart(2, '0')}</span>
          <span class="tap__abv">${escapeHtml(tap.abv || '')}</span>
        </div>
        <h3 class="tap__name">${escapeHtml(tap.name || '')}</h3>
        <p class="tap__style">${escapeHtml(tap.style || '')}</p>
        <div class="tap__foot">
          <span class="tap__live">на кране</span>
          <span>свежая варка</span>
        </div>
      </article>
    `).join('');
  } else if (tapGrid) {
    tapGrid.innerHTML = '<p class="noscript-note">Меню обновляется. Актуальные краны — в ВКонтакте.</p>';
  }

  const updatedLabel = $('#updatedLabel');
  const updatedDate = data.updated ? formatDate(data.updated) : '';
  if (updatedLabel) {
    updatedLabel.textContent = updatedDate
      ? `Обновлено ${updatedDate}`
      : 'Обновляем каждую неделю';
  }

  const stageCard = $('#stageCard');
  if (stageCard && data.stage) {
    const { day, time, title, text, tags } = data.stage;
    const dayEl = $('.stage__day', stageCard);
    const timeEl = $('.stage__time', stageCard);
    const titleEl = $('.stage__title', stageCard);
    const textEl = $('.stage__text', stageCard);
    const tagsEl = $('.stage__tags', stageCard);

    if (dayEl && day) dayEl.textContent = day;
    if (timeEl && time) timeEl.textContent = time;
    if (titleEl && title) titleEl.textContent = title;
    if (textEl && text) textEl.textContent = text;
    if (tagsEl && Array.isArray(tags) && tags.length) {
      tagsEl.innerHTML = tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('');
    }
  }

  /* ---------- reveal on scroll ---------- */

  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -7% 0px'
    });

    revealEls.forEach((el) => {
      if (reduceMotion || staticPreview) {
        el.classList.add('is-in');
      } else {
        revealObserver.observe(el);
      }
    });
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- header + progress + parallax ---------- */

  const parallaxEls = $$('[data-parallax]');
  let lastScrollY = window.scrollY;
  let menuOpen = false;
  let frameQueued = false;

  const updateHeader = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);

    if (!menuOpen) {
      if (y > lastScrollY && y > 460) {
        header.classList.add('is-hidden');
      } else {
        header.classList.remove('is-hidden');
      }
    }
    lastScrollY = y;
  };

  const updateProgress = () => {
    if (!progress) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    progress.style.width = `${(ratio * 100).toFixed(2)}%`;
  };

  const updateParallax = () => {
    if (!parallaxEls.length) return;

    if (reduceMotion || window.innerWidth < 760) {
      parallaxEls.forEach((el) => el.style.setProperty('--py', '0px'));
      return;
    }

    const vh = window.innerHeight;
    parallaxEls.forEach((el) => {
      const parent = el.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      if (rect.bottom < -240 || rect.top > vh + 240) return;

      const speed = parseFloat(el.dataset.parallax) || 0;
      const offset = (rect.top + rect.height / 2 - vh / 2) * speed;
      const clamped = Math.max(-120, Math.min(120, offset));
      el.style.setProperty('--py', `${clamped.toFixed(1)}px`);
    });
  };

  const onScroll = () => {
    if (frameQueued) return;
    frameQueued = true;
    window.requestAnimationFrame(() => {
      updateHeader();
      updateProgress();
      updateParallax();
      frameQueued = false;
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  updateHeader();
  updateProgress();
  updateParallax();

  /* ---------- mobile menu ---------- */

  const closeMenu = () => {
    if (!mobileMenu || !burger) return;
    menuOpen = false;
    mobileMenu.classList.remove('is-open');
    header.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    document.body.classList.remove('menu-open');
    document.body.style.overflow = '';
  };

  const openMenu = () => {
    if (!mobileMenu || !burger) return;
    menuOpen = true;
    mobileMenu.classList.add('is-open');
    header.classList.add('menu-open');
    header.classList.remove('is-hidden');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Закрыть меню');
    document.body.classList.add('menu-open');
    document.body.style.overflow = 'hidden';
  };

  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      if (menuOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    $$('a', mobileMenu).forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuOpen) closeMenu();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 900 && menuOpen) closeMenu();
    }, { passive: true });
  }

  /* ---------- order form modal ---------- */

  const orderModal = $('#orderModal');
  const formBody = $('#orderFormBody');
  const formTemplate = $('#yaFormTemplate');
  const formUrl = 'https://forms.yandex.ru/u/6afb127cb9e5ca882335b0e7/';

  // A page opened from disk (file://) has the "null" origin, and Yandex Forms
  // refuses to be framed there (CSP frame-ancestors). Open the form in a separate
  // popup window on top of the page instead — that always works. Same for browsers
  // without <dialog> support.
  const openFormPopup = () => {
    const width = Math.min(820, window.screen.availWidth - 40);
    const height = Math.min(760, window.screen.availHeight - 40);
    const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
    const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));
    const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
    const win = window.open(formUrl, 'yandex-order-form', features);
    if (win) {
      win.opener = null;
      win.focus();
    }
  };

  if (orderModal && typeof orderModal.showModal === 'function' && window.location.protocol !== 'file:') {
    let formLoaded = false;

    // Insert the original Yandex embed snippet only on first open, so the form
    // doesn't slow down the initial page load.
    const loadForm = () => {
      if (formLoaded || !formBody || !formTemplate) return;
      formLoaded = true;

      const fragment = formTemplate.content.cloneNode(true);
      const embedScript = fragment.querySelector('script');
      if (embedScript) {
        const activeScript = document.createElement('script');
        activeScript.src = embedScript.src;
        activeScript.async = true;
        embedScript.replaceWith(activeScript);
      }
      formBody.appendChild(fragment);
    };

    const closeOrderModal = () => {
      if (orderModal.open) orderModal.close();
    };

    $$('[data-cta]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        closeMenu();
        loadForm();
        orderModal.showModal();
        document.body.classList.add('modal-open');
      });
    });

    $$('[data-close-modal]', orderModal).forEach((button) => {
      button.addEventListener('click', closeOrderModal);
    });

    orderModal.addEventListener('close', () => {
      document.body.classList.remove('modal-open');
    });
  } else {
    $$('[data-cta]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        closeMenu();
        openFormPopup();
      });
    });
  }

  /* ---------- hero intro ---------- */

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => document.body.classList.add('is-loaded'));
  });

  /* ---------- close menu when clicking outside ---------- */

  document.addEventListener('click', (event) => {
    if (!menuOpen || !mobileMenu || !header) return;
    if (!mobileMenu.contains(event.target) && !burger.contains(event.target)) {
      closeMenu();
    }
  });
})();
