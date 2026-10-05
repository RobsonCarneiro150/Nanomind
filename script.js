/* ==========================================================================
   Nanomind: script.js
   JavaScript puro, sem dependências. Carregado com `defer` no <head>.
   Faz apenas: menu mobile, destaque do menu, contadores, formulário e WhatsApp.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------------------------------------------------------------------
     CONFIGURAÇÃO: o que você provavelmente vai querer editar
     --------------------------------------------------------------------- */
  const CONFIG = {
    whatsappNumber: '5511945403785',          // DDI + DDD + número, só dígitos
    whatsappFallbackText: 'Olá, Nanomind! Gostaria de saber como a automação pode ajudar minha empresa.',
    // Se o action do formulário ainda tiver algum destes textos, o envio é bloqueado
    // e o visitante é levado ao WhatsApp em vez de perder o contato.
    placeholderMarkers: ['SEU_ID_AQUI', 'SUA_ACCESS_KEY'],
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
     Ano no rodapé
     --------------------------------------------------------------------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------------------
     Cabeçalho: ganha borda ao rolar a página
     --------------------------------------------------------------------- */
  const header = $('.site-header');
  if (header) {
    const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  /* ---------------------------------------------------------------------
     Menu mobile
     --------------------------------------------------------------------- */
  const toggle = $('.nav-toggle');
  const nav = $('#site-nav');

  if (toggle && nav && header) {
    const setMenu = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    };
    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

    toggle.addEventListener('click', () => setMenu(!isOpen()));
    nav.addEventListener('click', (event) => { if (event.target.closest('a')) setMenu(false); });
    document.addEventListener('click', (event) => { if (isOpen() && !header.contains(event.target)) setMenu(false); });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) { setMenu(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (event) => {
      if (event.matches) setMenu(false);
    });
  }

  /* ---------------------------------------------------------------------
     Menu: destaca o link da seção que está na tela
     --------------------------------------------------------------------- */
  if ('IntersectionObserver' in window) {
    const links = $$('.nav__list a[href^="#"]:not(.btn)');
    const linkById = new Map(links.map((link) => [link.getAttribute('href').slice(1), link]));

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => link.removeAttribute('aria-current'));
        const active = linkById.get(entry.target.id); // o hero não tem link: limpa o destaque
        if (active) active.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    $$('main section[id]').forEach((section) => sectionObserver.observe(section));
  }

  /* ---------------------------------------------------------------------
     Contadores dos cases (ex.: −85%). Sem JS, o número final já está no HTML.
     --------------------------------------------------------------------- */
  const counters = $$('[data-count]');

  if (counters.length && 'IntersectionObserver' in window && !prefersReducedMotion) {
    const render = (el, value) => {
      el.textContent = `${el.dataset.prefix || ''}${value}${el.dataset.suffix || ''}`;
    };

    const animate = (el) => {
      const end = Number(el.dataset.count);
      const duration = 1200;
      const startTime = performance.now();

      const step = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        render(el, Math.round(end * eased));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const counterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        animate(entry.target);
      });
    }, { threshold: 0.6 });

    counters.forEach((el) => { render(el, 0); counterObserver.observe(el); });
  }

  /* ---------------------------------------------------------------------
     Formulário de contato (Formspree ou Web3Forms) + fallback WhatsApp
     --------------------------------------------------------------------- */
  const form = $('#contact-form');
  const statusEl = $('#form-status');
  const whatsappBtn = $('#whatsapp-btn');

  const setStatus = (message, state = '') => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.dataset.state = state;
  };

  const whatsappUrl = (text) =>
    `https://api.whatsapp.com/send?phone=${CONFIG.whatsappNumber}&text=${encodeURIComponent(text)}`;

  // Monta a mensagem com o que o visitante já preencheu (nada é obrigatório aqui)
  const buildWhatsappMessage = () => {
    if (!form) return CONFIG.whatsappFallbackText;

    const value = (name) => (form.elements[name]?.value || '').trim();
    const nome = value('nome');
    const email = value('email');
    const telefone = value('telefone');
    const mensagem = value('mensagem');

    if (!nome && !email && !telefone && !mensagem) return CONFIG.whatsappFallbackText;

    const lines = [nome ? `Olá, Nanomind! Meu nome é ${nome}.` : 'Olá, Nanomind!'];
    if (mensagem) lines.push('', 'Preciso de ajuda com:', mensagem);
    if (email || telefone) lines.push('');
    if (email) lines.push(`E-mail: ${email}`);
    if (telefone) lines.push(`WhatsApp/telefone: ${telefone}`);
    return lines.join('\n');
  };

  const openWhatsapp = () => window.open(whatsappUrl(buildWhatsappMessage()), '_blank', 'noopener');

  if (whatsappBtn) whatsappBtn.addEventListener('click', openWhatsapp);

  if (form) {
    const submitBtn = $('[type="submit"]', form);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      // Campo isca: se um robô preencheu, finge que deu certo e não envia
      const honeypot = form.elements._gotcha;
      if (honeypot && honeypot.value) { form.reset(); return; }

      // Formulário ainda sem ID/chave configurados
      if (CONFIG.placeholderMarkers.some((marker) => form.action.includes(marker))) {
        console.warn('[Nanomind] Configure o action do formulário (Formspree ou Web3Forms) no index.html.');
        setStatus('O envio por formulário está indisponível no momento. Use o botão "Continuar no WhatsApp".', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
      setStatus('Enviando…', 'loading');

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' },
        });
        // Formspree responde { ok: true }; Web3Forms responde { success: true }
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) {
          throw new Error(data.message || data.error || `HTTP ${response.status}`);
        }

        form.reset();
        setStatus('Mensagem enviada! Retornaremos o contato em breve.', 'success');
      } catch (error) {
        console.error('[Nanomind] Falha ao enviar o formulário:', error);
        setStatus('Não foi possível enviar agora. Tente novamente ou continue pelo WhatsApp.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
      }
    });
  }
})();
