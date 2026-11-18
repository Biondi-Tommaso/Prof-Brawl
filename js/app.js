/**
 * PROF BRAWL - Logica principale SPA, Archivio Figurine JSON e Lightbox 3D
 */

document.addEventListener('DOMContentLoaded', () => {
  // === RIFERIMENTI DOM ===
  const navLinks = document.querySelectorAll('.nav-link');
  const routeLinks = document.querySelectorAll('[data-route]');
  const pageSections = document.querySelectorAll('.page-section');
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const mainNav = document.getElementById('main-nav');

  // Sezione Figurine
  const yearSelect = document.getElementById('year-select');
  const figurineGrid = document.getElementById('figurine-grid');
  const figurineStatus = document.getElementById('figurine-status');
  const cardsCounter = document.getElementById('cards-counter');

  // Modale Lightbox
  const modal = document.getElementById('card-modal');
  const modalFlipper = document.getElementById('modal-card-flipper');
  const modalImgFront = document.getElementById('modal-img-front');
  const modalImgBack = document.getElementById('modal-img-back');
  const modalCardMeta = document.getElementById('modal-card-meta');
  const modalCardTitle = document.getElementById('modal-card-title');
  const modalFlipBtn = document.getElementById('modal-flip-btn');
  const modalPrevBtn = document.getElementById('modal-prev-btn');
  const modalNextBtn = document.getElementById('modal-next-btn');

  // === STATO APPLICAZIONE ===
  const VALID_ROUTES = ['home', 'figurine', 'come-giocare', 'come-comprare'];
  let allCards = [];
  let currentYearCards = [];
  let activeModalIndex = 0;

  // =========================================================================
  // 1. ROUTER SPA LEGGERO (HASH ROUTING)
  // =========================================================================
  function navigateTo(route) {
    const targetRoute = VALID_ROUTES.includes(route) ? route : 'home';

    // Mostra solo la sezione attiva
    pageSections.forEach((section) => {
      const isMatch = section.id === `page-${targetRoute}`;
      section.hidden = !isMatch;
      section.classList.toggle('active', isMatch);
    });

    // Aggiorna stato attivo nei bottoni della navbar
    navLinks.forEach((link) => {
      link.classList.toggle('active', link.dataset.route === targetRoute);
    });

    // Chiudi menu mobile dopo il click
    mainNav.classList.remove('is-open');
    mobileToggle.setAttribute('aria-expanded', 'false');

    // Torna in cima alla pagina
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleHashChange() {
    const hashRoute = window.location.hash.replace('#', '');
    navigateTo(hashRoute || 'home');
  }

  // Intercetta i click sui link con attributo data-route
  routeLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const route = link.dataset.route;
      if (window.location.hash !== `#${route}`) {
        window.location.hash = route;
      } else {
        navigateTo(route);
      }
    });
  });

  // Toggle menu mobile
  mobileToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('is-open');
    mobileToggle.setAttribute('aria-expanded', String(isOpen));
  });

  window.addEventListener('hashchange', handleHashChange);
  handleHashChange();

  // =========================================================================
  // 2. CARICAMENTO DATI FIGURINE DA JSON
  // =========================================================================
  async function loadFigurineData() {
    showStatus('Caricamento archivio figurine in corso...');

    try {
      const response = await fetch('data/figurine.json');
      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }

      const data = await response.json();
      allCards = Array.isArray(data.figurine) ? data.figurine : [];

      if (allCards.length === 0) {
        showStatus('Nessuna figurina trovata nel file data/figurine.json.');
        return;
      }

      hideStatus();
      populateYearSelector();
    } catch (error) {
      console.error('Errore nel caricamento delle figurine:', error);
      showStatus(
        'Impossibile caricare il file data/figurine.json. Assicurati di aprire il sito tramite un server locale (es. Live Server) o su un hosting web.'
      );
    }
  }

  function showStatus(message) {
    figurineStatus.textContent = message;
    figurineStatus.hidden = false;
  }

  function hideStatus() {
    figurineStatus.hidden = true;
  }

  // =========================================================================
  // 3. SELETTORE ANNO & RENDER GRIGLIA 25 FIGURINE
  // =========================================================================
  function populateYearSelector() {
    // Estrae gli anni unici in ordine decrescente (es. 2025, 2024...)
    const years = [...new Set(allCards.map((card) => card.anno))].sort((a, b) => b - a);

    yearSelect.innerHTML = '';
    years.forEach((year) => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = `Edizione ${year}`;
      yearSelect.appendChild(option);
    });

    if (years.length > 0) {
      renderCardsByYear(years[0]);
    }
  }

  yearSelect.addEventListener('change', (e) => {
    renderCardsByYear(Number(e.target.value));
  });

  function renderCardsByYear(year) {
    currentYearCards = allCards
      .filter((card) => Number(card.anno) === Number(year))
      .sort((a, b) => a.numero - b.numero);

    cardsCounter.textContent = `${currentYearCards.length} figurine`;
    figurineGrid.innerHTML = '';

    currentYearCards.forEach((card, index) => {
      const cardEl = document.createElement('article');
      cardEl.className = 'figurina-item';
      cardEl.setAttribute('tabindex', '0');
      cardEl.setAttribute('role', 'button');
      cardEl.setAttribute('aria-label', `Apri figurina #${card.numero} - ${card.nome}`);

      cardEl.innerHTML = `
        <div class="card-3d-wrapper">
          <div class="card-3d-inner">
            <div class="card-face card-face--front">
              <img src="${card.fronte}" alt="${card.nome} - Fronte" loading="lazy" />
            </div>
            <div class="card-face card-face--back">
              <img src="${card.retro}" alt="${card.nome} - Retro" loading="lazy" />
            </div>
          </div>
        </div>
        <div class="figurina-caption">
          <span class="figurina-num">#${String(card.numero).padStart(2, '0')}</span>
          <span class="figurina-name">${card.nome}</span>
        </div>
      `;

      // Apertura modale a schermo intero al click o con Invio
      cardEl.addEventListener('click', () => openModal(index));
      cardEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(index);
        }
      });

      figurineGrid.appendChild(cardEl);
    });
  }

  // =========================================================================
  // 4. MODALE / LIGHTBOX A SCHERMO INTERO
  // =========================================================================
  function openModal(index) {
    activeModalIndex = index;
    updateModalContent();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    modalFlipper.classList.remove('is-flipped');
  }

  function updateModalContent() {
    const card = currentYearCards[activeModalIndex];
    if (!card) return;

    // Resetta lato mostrato sul fronte quando si cambia carta
    modalFlipper.classList.remove('is-flipped');

    modalImgFront.src = card.fronte;
    modalImgFront.alt = `${card.nome} - Fronte`;
    modalImgBack.src = card.retro;
    modalImgBack.alt = `${card.nome} - Retro`;

    modalCardMeta.textContent = `Anno ${card.anno} • Figurina #${String(card.numero).padStart(2, '0')} di ${currentYearCards.length}`;
    modalCardTitle.textContent = card.nome;
  }

  function toggleModalFlip() {
    modalFlipper.classList.toggle('is-flipped');
  }

  function showPrevCard() {
    activeModalIndex = (activeModalIndex - 1 + currentYearCards.length) % currentYearCards.length;
    updateModalContent();
  }

  function showNextCard() {
    activeModalIndex = (activeModalIndex + 1) % currentYearCards.length;
    updateModalContent();
  }

  // Eventi modale
  modalFlipBtn.addEventListener('click', toggleModalFlip);
  modalFlipper.addEventListener('click', toggleModalFlip);
  modalPrevBtn.addEventListener('click', showPrevCard);
  modalNextBtn.addEventListener('click', showNextCard);

  modal.addEventListener('click', (e) => {
    if (e.target.dataset.closeModal === 'true') {
      closeModal();
    }
  });

  // Supporto tastiera nella modale (Esc, Frecce, Spazio per girare)
  document.addEventListener('keydown', (e) => {
    if (modal.hidden) return;

    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft') showPrevCard();
    if (e.key === 'ArrowRight') showNextCard();
    if (e.key === ' ') {
      e.preventDefault();
      toggleModalFlip();
    }
  });

  // Avvio iniziale caricamento dati
  loadFigurineData();
});