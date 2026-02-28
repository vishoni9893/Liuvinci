// ── CART DRAWER — LIU VINCI ──────────────────────────────────────
// Architecture: deals and savings are rendered by Liquid in cart-drawer.liquid
// This file only handles: drawer open/close, Dawn section re-rendering, swipe-to-close

class CartDrawer extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    const overlay = this.querySelector('#CartDrawer-Overlay');
    if (overlay) overlay.addEventListener('click', this.close.bind(this));
    this.setHeaderCartIconAccessibility();
    
    // NEW: Enable swipe-to-close on mobile
    this.initSwipeToClose();
  }

  initSwipeToClose() {
    const drawer = this.querySelector('.drawer__inner');
    if (!drawer) return;
    
    let startY = 0;
    let startTime = 0;
    let currentY = 0;
    let isDragging = false;
    let startScrollTop = 0;
    
    const reset = () => {
      isDragging = false;
      drawer.style.transition = '';
      drawer.style.transform = '';
    };
    
    // Touch start - detect if we should handle swipe
    drawer.addEventListener('touchstart', (e) => {
      const scrollableArea = drawer.querySelector('cart-drawer-items');
      startScrollTop = scrollableArea ? scrollableArea.scrollTop : 0;
      
      startY = e.touches[0].clientY;
      currentY = startY;
      startTime = Date.now();
      
      // Only start dragging if at top of scroll OR on header
      const isAtTop = startScrollTop === 0;
      const isHeader = e.target.closest('.drawer__header');
      
      if (isAtTop || isHeader) {
        isDragging = true;
      }
    }, { passive: true });
    
    // Touch move - track finger and move drawer
    drawer.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      
      currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      
      // Only move drawer if swiping down
      if (deltaY > 0) {
        // Disable transition during drag
        drawer.style.transition = 'none';
        drawer.style.transform = `translateY(${deltaY}px)`;
      } else {
        // Swiping up - cancel drag mode
        isDragging = false;
        drawer.style.transition = '';
        drawer.style.transform = '';
      }
    }, { passive: true });
    
    // Touch end - decide close or snap back
    drawer.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      
      const deltaY = currentY - startY;
      const deltaTime = Date.now() - startTime;
      const velocity = deltaY / deltaTime; // pixels per millisecond
      
      // Re-enable transition
      drawer.style.transition = '';
      
      // Close conditions:
      // 1. Swiped more than 80px down, OR
      // 2. Fast downward flick (velocity > 0.3)
      const shouldClose = deltaY > 80 || velocity > 0.3;
      
      if (shouldClose) {
        this.close();
      } else {
        // Snap back to original position
        drawer.style.transform = '';
      }
      
      isDragging = false;
    }, { passive: true });
    
    // Touch cancel - reset everything
    drawer.addEventListener('touchcancel', reset, { passive: true });
  }

  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector('#cart-icon-bubble');
    if (!cartLink) return;
    cartLink.setAttribute('role', 'button');
    cartLink.setAttribute('aria-haspopup', 'dialog');
    const newCartLink = cartLink.cloneNode(true);
    cartLink.parentNode.replaceChild(newCartLink, cartLink);
    newCartLink.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.open(newCartLink);
    });
    newCartLink.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'SPACE') {
        event.preventDefault();
        this.open(newCartLink);
      }
    });
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) {
      this.setSummaryAccessibility(cartDrawerNote);
    }
    setTimeout(() => {
      this.classList.add('animate', 'active');
    }, 50);
    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = this.classList.contains('is-empty')
          ? this.querySelector('.drawer__inner-empty')
          : document.getElementById('CartDrawer');
        const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true }
    );
    document.body.classList.add('overflow-hidden');
  }

  close() {
    this.classList.remove('active');
    removeTrapFocus(this.activeElement);
    document.body.classList.remove('overflow-hidden');
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');
    if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }
    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute(
        'aria-expanded',
        !event.currentTarget.closest('details').hasAttribute('open')
      );
    });
    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  renderContents(parsedState) {
    this.querySelector('.drawer__inner')?.classList.remove('is-empty');
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);
      if (!sectionElement) return;
      if (parsedState.sections && parsedState.sections[section.id]) {
        sectionElement.innerHTML = this.getSectionInnerHTML(
          parsedState.sections[section.id],
          section.selector
        );
      }
    });
    setTimeout(() => {
      const overlay = this.querySelector('#CartDrawer-Overlay');
      if (overlay) {
        overlay.removeEventListener('click', this.close);
        overlay.addEventListener('click', this.close.bind(this));
      }
      this.open();
    }, 100);
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      { id: 'cart-drawer', selector: '#CartDrawer' },
      { id: 'cart-icon-bubble' },
    ];
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);