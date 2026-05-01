let weddingDate;
let configData;
const CONFIG_API_ENDPOINT = '/api/config';
const SUBMIT_FORM_ENDPOINT = '/api/submit-form';

/* Performance optimization utilities */
const isMobile = () => window.innerWidth <= 767;
const isSmallMobile = () => window.innerWidth <= 375;

const requestAnimationFrameThrottle = (callback) => {
  let ticking = false;
  return function (...args) {
    if (!ticking) {
      requestAnimationFrame(() => {
        callback.apply(this, args);
        ticking = false;
      });
      ticking = true;
    }
  };
};

/* Reduce animation frequency on mobile */
const getAnimationInterval = () => (isMobile() ? 1000 : 400);
const getFlowerScale = () => (isSmallMobile() ? 1.3 : isMobile() ? 1.4 : 1);
const getFlowerFinalScale = () =>
  isSmallMobile() ? 1.4 : isMobile() ? 1.5 : 0.75;

/**
 * Flower image animation – final positions (after full scroll).
 * Edit only this object to change where each flower ends up.
 * - Left-side flowers: left = distance from left edge in %. top or bottom = vertical in %.
 * - Right-side flowers: left = position (100 - left = % from right edge). Use 85–92 to keep inside; lower = more margin from right.
 */
const DESKTOP_FINAL_POSITIONS = {
  /* Top-left (use top) */
  '.p-tl-c1': { left: 3, top: 2 },
  '.p-tl-1': { left: 0, top: 20 },
  '.p-tl-2': { left: 8, top: 3 },
  '.p-tl-3': { left: 12, top: 40 },
  /* Bottom-left (use bottom) */
  '.p-bl-c1': { left: 3, bottom: 2 },
  '.p-bl-c2': { left: 15, bottom: 12 },
  '.p-bl-1': { left: 0, bottom: 17 },
  '.p-bl-2': { left: 11, bottom: 0 },
  /* Top-right (use top) – use lower "left" value to keep flowers inside (right edge = (100-left)%) */
  '.p-tr-c2': { left: 80, top: 2 },
  '.p-tr-2': { left: 82, top: 3 },
  '.p-tr-c1': { left: 80, top: 22 },
  '.p-tr-1': { left: 75, top: 27 },
  /* Bottom-right (use bottom) */
  '.p-br-c1': { left: 80, bottom: 2 },
  '.p-br-c2': { left: 72, bottom: 15 },
  '.p-br-2': { left: 85, bottom: 26 },
  '.p-br-1': { left: 75, bottom: 0 },
};

/* Mobile final positions - adjusted to keep flowers within screen bounds */
/* Note: left values represent position from left edge, so right edge = 100 - left - flowerWidth% (approx) */
const MOBILE_FINAL_POSITIONS = {
  /* Top-left (use top) - stay near original positions */
  '.p-tl-c1': { left: 6, top: 3 },
  '.p-tl-1': { left: 4, top: 20 },
  '.p-tl-2': { left: 10, top: 4 },
  '.p-tl-3': { left: 13, top: 40 },
  /* Bottom-left (use bottom) */
  '.p-bl-c1': { left: 6, bottom: 3 },
  '.p-bl-c2': { left: 16, bottom: 12 },
  '.p-bl-1': { left: 6, bottom: 17 },
  '.p-bl-2': { left: 13, bottom: 2 },
  /* Top-right (use top) - positioned closer to right edge */
  '.p-tr-c2': { left: 88, top: 3 },
  '.p-tr-2': { left: 90, top: 4 },
  '.p-tr-c1': { left: 86, top: 22 },
  '.p-tr-1': { left: 84, top: 28 },
  /* Bottom-right (use bottom) */
  '.p-br-c1': { left: 88, bottom: 3 },
  '.p-br-c2': { left: 85, bottom: 15 },
  '.p-br-2': { left: 86, bottom: 27 },
  '.p-br-1': { left: 82, bottom: 2 },
};

async function fetchConfig() {
  try {
    const response = await fetch('/config.json');
    const data = await response.json();
    configData = data;
    weddingDate = new Date(data.weddingDate).getTime();
    return true;
  } catch (error) {
    console.error('Failed to fetch config:', error);
    return false;
  }
}

function updateCountdown() {
  if (!weddingDate) return;

  const now = new Date().getTime();
  const timeRemaining = weddingDate - now;

  if (timeRemaining <= 0) {
    document.getElementById('days').textContent = '0';
    document.getElementById('hours').textContent = '0';
    document.getElementById('minutes').textContent = '0';
    document.getElementById('seconds').textContent = '0';
    return;
  }

  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

  document.getElementById('days').textContent = String(days).padStart(2, '0');
  document.getElementById('hours').textContent = String(hours).padStart(2, '0');
  document.getElementById('minutes').textContent = String(minutes).padStart(
    2,
    '0'
  );
  document.getElementById('seconds').textContent = String(seconds).padStart(
    2,
    '0'
  );
}

async function initCountdown() {
  const configLoaded = await fetchConfig();
  if (configLoaded) {
    loadMap();
    loadSecondDayMap();
    updateCountdown();
    setInterval(updateCountdown, 1000);
  }
}

function loadSecondDayMap() {
  const mapContainer = document.getElementById('mapContainerSecondDay');
  if (mapContainer && configData?.secondDayLocation?.yandexMapUrl) {
    const width = configData.secondDayLocation.mapDimensions?.width || 580;
    const height = configData.secondDayLocation.mapDimensions?.height || 346;
    mapContainer.innerHTML = `
      <iframe
        src="${configData.secondDayLocation.yandexMapUrl}"
        width="${width}"
        height="${height}"
        frameborder="0"
        allowfullscreen="true"
        style="position: relative"
      ></iframe>
    `;
  }
}

function loadMap() {
  const mapContainer = document.getElementById('mapContainer');
  if (mapContainer && configData?.location?.yandexMapUrl) {
    const width = configData.location.mapDimensions?.width || 580;
    const height = configData.location.mapDimensions?.height || 346;
    mapContainer.innerHTML = `
      <iframe
        src="${configData.location.yandexMapUrl}"
        width="${width}"
        height="${height}"
        frameborder="0"
        allowfullscreen="true"
        style="position: relative"
      ></iframe>
    `;
  }
}

function initGuestSurvey() {
  const form = document.getElementById('guestSurveyForm');
  const attendanceSelect = document.getElementById('attendance');
  const partnerNameGroup = document.querySelector('.partner-name-group');
  const formSuccess = document.getElementById('formSuccess');
  const formError = document.getElementById('formError');

  if (attendanceSelect) {
    attendanceSelect.addEventListener('change', function () {
      if (this.value === 'yes_with_partner') {
        partnerNameGroup.classList.remove('partner-group-hidden');
        setTimeout(() => {
          const partnerInput = document.getElementById('partnerName');
          if (partnerInput) partnerInput.focus();
        }, 100);
      } else {
        partnerNameGroup.classList.add('partner-group-hidden');
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const guestName = form.querySelector('#guestName').value.trim();
      const attendance = form.querySelector('#attendance').value;
      const partnerName = form.querySelector('#partnerName').value.trim();

      if (!guestName) {
        alert('Калі ласка, увядзіце імя і прозвішча');
        return;
      }

      if (!attendance) {
        alert('Калі ласка, выберыце, ці плануеце вы прысутнічаць');
        return;
      }

      if (attendance === 'yes_with_partner' && !partnerName) {
        alert('Калі ласка, увядзіце імя і прозвішча вашай пары');
        return;
      }

      if (formError) formError.classList.add('form-message-hidden');

      const checkboxes = form.querySelectorAll(
        'input[name="alcohol_preference"]:checked'
      );
      const secondDayAttendance = form.querySelector('#attendanceSecondDay').value;

      if (!secondDayAttendance) {
        alert('Калі ласка, выберыце, ці плануеце вы прысутнічаць на другі дзень');
        return;
      }

      const selectedAlcohol = Array.from(checkboxes)
        .map((cb) => cb.value)
        .join(', ');

      try {
        const formspreeEndpoint = configData?.formspreeEndpoint || form.action;
        const response = await fetch(formspreeEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            guest_name: guestName,
            attendance: attendance,
            partner_name: partnerName,
            alcohol_preference: selectedAlcohol,
            second_day_attendance: secondDayAttendance,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          if (formSuccess) formSuccess.classList.remove('form-message-hidden');
          if (formError) formError.classList.add('form-message-hidden');
          form.reset();
          if (partnerNameGroup)
            partnerNameGroup.classList.add('partner-group-hidden');
        } else {
          throw new Error('Form submission failed');
        }
      } catch (error) {
        console.error('Form submission error:', error);
        if (formSuccess) formSuccess.classList.add('form-message-hidden');
        if (formError) formError.classList.remove('form-message-hidden');
      }
    });
  }
}

function initScrollIndicator() {
  const scrollIndicator = document.querySelector('.scroll-indicator');
  if (!scrollIndicator) return;

  const scrollDown = () => {
    window.scrollBy({ top: window.innerHeight * 0.5, behavior: 'smooth' });
  };

  scrollIndicator.addEventListener('click', scrollDown);
  scrollIndicator.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      scrollDown();
    }
  });

  const scrollWrapper = scrollIndicator.closest('.fixed, .absolute');
  if (!scrollWrapper) return;

  const firstSection = document.querySelector('.first-section');
  if (!firstSection) return;

  const toggleVisibility = () => {
    const firstSectionBottom =
      firstSection.offsetTop + firstSection.offsetHeight;
    if (window.scrollY > firstSectionBottom * 0.3) {
      scrollWrapper.style.opacity = '0';
      scrollWrapper.style.pointerEvents = 'none';
    } else {
      scrollWrapper.style.opacity = '';
      scrollWrapper.style.pointerEvents = '';
    }
  };

  window.addEventListener('scroll', toggleVisibility, { passive: true });
  toggleVisibility();
}

document.addEventListener('DOMContentLoaded', () => {
  initGuestSurvey();
  initCountdown();
  createFallingPetals();
  initFlowerAnimation();
  initScrollIndicator();

  const closingText = document.querySelector('.closing-text');
  const closingSection = document.querySelector('.closing-section');

  if (closingText && closingSection) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            closingText.classList.add('visible');
          }
        });
      },
      { rootMargin: '-10% 0px', threshold: 0.5 }
    );
    observer.observe(closingSection);
  }

  const sections = document.querySelectorAll(
    'section:not(.first-section):not(.closing-section)'
  );
  sections.forEach((section) => {
    section.classList.add('section-visible');
  });
});

function createFallingPetals() {
  const petalColors = ['#ffb7c5', '#ffc0cb', '#ffd1dc', '#ffe4e1', '#fff0f5'];

  function createPetal() {
    const mobileOptimize = isMobile();

    const petal = document.createElement('div');
    petal.classList.add('petal');

    const size = mobileOptimize
      ? Math.random() * 8 + 8
      : Math.random() * 13 + 12;
    const left = Math.random() * 100;
    const delay = mobileOptimize ? Math.random() * 4 : Math.random() * 2;
    const duration = mobileOptimize
      ? Math.random() * 10 + 10
      : Math.random() * 6 + 6;
    const rotation = Math.random() * 360;
    const color = petalColors[Math.floor(Math.random() * petalColors.length)];
    const fallDistance = window.innerHeight + 50;

    petal.style.cssText = `
      left: ${left}vw;
      width: ${size}px;
      height: ${size}px;
      animation: fall ${duration}s linear ${delay}s forwards;
      background: ${color};
      border-radius: 100% 0% 100% 0%;
      transform: rotate(${rotation}deg);
      --fall-distance: ${fallDistance}px;
      will-change: transform, opacity;
      ${mobileOptimize ? 'contain: layout style paint;' : ''}
    `;

    document.body.appendChild(petal);

    setTimeout(
      () => {
        petal.remove();
      },
      (duration + delay) * 1000
    );
  }

  setInterval(createPetal, getAnimationInterval());
}

function initFlowerAnimation() {
  const firstSection = document.querySelector('.first-section');
  const closingSection = document.querySelector('.closing-section');

  if (!firstSection) return;

  function cssPositionToPercent(value, size) {
    if (value === 'auto' || !value) return 0;
    if (value.endsWith('%')) return parseFloat(value);
    if (value.endsWith('px')) return (parseFloat(value) / size) * 100;
    return 0;
  }

  const flowerConfigs = [
    { selector: '.p-tl-c1', useTop: true },
    { selector: '.p-tl-1', useTop: true },
    { selector: '.p-tl-2', useTop: true },
    { selector: '.p-tl-3', useTop: true },
    { selector: '.p-bl-c1', useTop: false },
    { selector: '.p-bl-c2', useTop: false },
    { selector: '.p-bl-1', useTop: false },
    { selector: '.p-bl-2', useTop: false },
    { selector: '.p-tr-c2', useTop: true },
    { selector: '.p-tr-2', useTop: true },
    { selector: '.p-tr-c1', useTop: true },
    { selector: '.p-tr-1', useTop: true },
    { selector: '.p-br-c1', useTop: false },
    { selector: '.p-br-c2', useTop: false },
    { selector: '.p-br-2', useTop: false },
    { selector: '.p-br-1', useTop: false },
  ];

  const allFlowerData = [];

  flowerConfigs.forEach((config) => {
    const flower = document.querySelector(config.selector);
    if (!flower) return;

    const parent =
      flower.closest('.corner-group') || flower.offsetParent || document.body;
    const parentWidth = parent.offsetWidth || window.innerWidth;
    const parentHeight = parent.offsetHeight || window.innerHeight;
    const cs = getComputedStyle(flower);

    const leftPercent = cssPositionToPercent(cs.left, parentWidth);
    const rightPercent = cssPositionToPercent(cs.right, parentWidth);
    const topPercent = cssPositionToPercent(cs.top, parentHeight);
    const bottomPercent = cssPositionToPercent(cs.bottom, parentHeight);

    const usesLeft = cs.left !== 'auto';
    const startX = usesLeft ? leftPercent : 100 - rightPercent;
    const startY = config.useTop ? topPercent : bottomPercent;

    const isCropped = flower.classList.contains('cropped-flower');

    const flowerData = {
      element: flower,
      selector: config.selector,
      usesLeft,
      usesRight: !usesLeft,
      useTop: config.useTop,
      isCropped,
      startX,
      startY,
    };

    allFlowerData.push(flowerData);
  });

  const scaleConfig = getScaleConfig();

  allFlowerData.forEach((flower) => {
    const finalPositions = isMobile()
      ? MOBILE_FINAL_POSITIONS
      : DESKTOP_FINAL_POSITIONS;
    const targetPos = finalPositions[flower.selector] || null;

    if (targetPos) {
      flower.targetX = targetPos.left;
      if (flower.useTop && targetPos.top !== undefined) {
        flower.targetY = targetPos.top;
      } else if (!flower.useTop && targetPos.bottom !== undefined) {
        flower.targetY = targetPos.bottom;
      } else {
        flower.targetY =
          targetPos.top !== undefined ? targetPos.top : flower.startY;
      }
    } else if (!flower.isCropped) {
      flower.targetX = flower.usesLeft ? 3 : 97;
      flower.targetY = flower.startY;
    } else {
      flower.targetX = flower.startX;
      flower.targetY = flower.startY;
    }
  });

  setupFlowerScroll(allFlowerData, scaleConfig, firstSection, closingSection);
}

function getScaleConfig() {
  return {
    initial: getFlowerScale(),
    default: getFlowerFinalScale(),
  };
}

function setupFlowerScroll(
  allFlowerData,
  scaleConfig,
  firstSection,
  closingSection
) {
  const { initial, default: defaultScale } = scaleConfig;
  const mobileOptimize = isMobile();

  function updateAnimations() {
    const scrollY = window.scrollY;
    const sectionHeight = firstSection?.offsetHeight || window.innerHeight;
    const closingSectionTop = closingSection?.offsetTop || 0;

    const firstSectionProgress = Math.min(scrollY / sectionHeight, 1);

    const closingSectionProgress = Math.min(
      Math.max(
        (scrollY + window.innerHeight - closingSectionTop) / window.innerHeight,
        0
      ),
      1
    );

    const isClosingPhase = closingSectionProgress > 0;
    const phase1Progress = isClosingPhase ? 0 : firstSectionProgress;
    const phase3Progress = isClosingPhase ? closingSectionProgress : 0;

    allFlowerData.forEach((flower) => {
      if (flower.isCropped) {
        const currentOpacity = isClosingPhase
          ? phase3Progress
          : 1 - Math.min(phase1Progress / 0.7, 1);
        flower.element.style.opacity = currentOpacity.toFixed(3);
        return;
      }

      let currentX, currentY, currentScale;

      if (isClosingPhase) {
        currentX =
          flower.targetX + (flower.startX - flower.targetX) * phase3Progress;
        currentY =
          flower.targetY + (flower.startY - flower.targetY) * phase3Progress;
        currentScale = defaultScale + (initial - defaultScale) * phase3Progress;
      } else {
        currentX =
          flower.startX + (flower.targetX - flower.startX) * phase1Progress;
        currentY =
          flower.startY + (flower.targetY - flower.startY) * phase1Progress;
        currentScale = initial - (initial - defaultScale) * phase1Progress;
      }

      if (
        !mobileOptimize ||
        !flower.lastValues ||
        Math.abs(currentX - flower.lastValues.x) > 0.1 ||
        Math.abs(currentY - flower.lastValues.y) > 0.1 ||
        Math.abs(currentScale - flower.lastValues.scale) > 0.01
      ) {
        updateFlowerPosition(flower, currentX, currentY, currentScale);
        flower.lastValues = { x: currentX, y: currentY, scale: currentScale };
      }
    });
  }

  function updateFlowerPosition(flower, x, y, scale) {
    flower.element.style.removeProperty('left');
    flower.element.style.removeProperty('right');
    flower.element.style.removeProperty('top');
    flower.element.style.removeProperty('bottom');

    if (flower.usesLeft) {
      flower.element.style.setProperty('left', `${x}%`, 'important');
    } else if (flower.usesRight) {
      flower.element.style.setProperty('right', `${100 - x}%`, 'important');
    }

    if (flower.useTop) {
      flower.element.style.setProperty('top', `${y}%`, 'important');
    } else {
      flower.element.style.setProperty('bottom', `${y}%`, 'important');
    }

    flower.element.style.setProperty(
      'transform',
      `scale(${scale})`,
      'important'
    );
  }

  const throttledUpdate = requestAnimationFrameThrottle(updateAnimations);

  window.addEventListener('scroll', throttledUpdate, { passive: true });

  allFlowerData.forEach((flower) => {
    if (!flower.isCropped) {
      flower.element.style.opacity = '1';
      flower.element.style.setProperty(
        'transform',
        `scale(${initial})`,
        'important'
      );
    }
  });

  updateAnimations();
}
