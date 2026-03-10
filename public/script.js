let weddingDate;
let countdownInterval;
let configData;
const CONFIG_API_ENDPOINT = '/api/config';
const SUBMIT_FORM_ENDPOINT = '/api/submit-form';

/**
 * Flower image animation – final positions (after full scroll).
 * Edit only this object to change where each flower ends up.
 * - Left-side flowers: left = distance from left edge in %. top or bottom = vertical in %.
 * - Right-side flowers: left = position (100 - left = % from right edge). Use 85–92 to keep inside; lower = more margin from right.
 */
const FLOWER_FINAL_POSITIONS = {
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
  '.p-br-2': { left: 85, bottom: 26 },
  '.p-br-1': { left: 75, bottom: 0 },
};

async function fetchConfig() {
  try {
    const response = await fetch(CONFIG_API_ENDPOINT);
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
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
  }
}

function cleanupCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
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
      const selectedAlcohol = Array.from(checkboxes)
        .map((cb) => cb.value)
        .join(', ');

      try {
        const response = await fetch(SUBMIT_FORM_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            guest_name: guestName,
            attendance: attendance,
            partner_name: partnerName,
            alcohol_preference: selectedAlcohol,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
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

document.addEventListener('DOMContentLoaded', initGuestSurvey);

document.addEventListener('DOMContentLoaded', initCountdown);
document.addEventListener('DOMContentLoaded', initScrollAnimations);
document.addEventListener('DOMContentLoaded', createFallingPetals);
document.addEventListener('DOMContentLoaded', () => {
  initFlowerAnimation();
});
window.addEventListener('beforeunload', cleanupCountdown);

function initScrollAnimations() {
  const facesContainer = document.querySelector('.faces-container');
  const namesBoard = document.querySelector('.names-board');

  [facesContainer, namesBoard].forEach((el) => {
    if (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity 1s ease-out, transform 1s ease-out';
    }
  });

  setTimeout(() => {
    [facesContainer, namesBoard].forEach((el) => {
      if (el) {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }
    });
  }, 300);
}

function createFallingPetals() {
  const petalColors = ['#ffb7c5', '#ffc0cb', '#ffd1dc', '#ffe4e1', '#fff0f5'];

  function createPetal() {
    const petal = document.createElement('div');
    petal.classList.add('petal');

    const size = Math.random() * 13 + 12;
    const left = Math.random() * 100;
    const delay = Math.random() * 2;
    const duration = Math.random() * 6 + 6;
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
    `;

    document.body.appendChild(petal);

    setTimeout(
      () => {
        petal.remove();
      },
      (duration + delay) * 1000
    );
  }

  setInterval(createPetal, 400);
}

function initFlowerAnimation() {
  const firstSection = document.querySelector('.first-section');
  const closingSection = document.querySelector('.closing-section');
  const croppedFlowers = document.querySelectorAll('.cropped-flower');
  let isClosingPhase = false;
  let closingProgress = 0;

  if (!firstSection) return;

  function cssPositionToPercent(value, size) {
    if (value === 'auto' || !value) return 0;
    if (value.endsWith('%')) return parseFloat(value);
    if (value.endsWith('px')) return (parseFloat(value) / size) * 100;
    return 0;
  }

  /* Only selector and useTop. Start positions are read from CSS (styles.css). */
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
    { selector: '.p-br-2', useTop: false },
    { selector: '.p-br-1', useTop: false },
  ];

  const leftFlowers = [];
  const rightFlowers = [];
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

    if (usesLeft) {
      leftFlowers.push(flowerData);
    } else if (usesRight) {
      rightFlowers.push(flowerData);
    }
  });

  const defaultEdgePosition = 3;
  const defaultRightEdgePosition = 97;
  const defaultScale = 0.75;

  allFlowerData.forEach((flower) => {
    const targetPos = FLOWER_FINAL_POSITIONS[flower.selector] || null;

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
      flower.targetX = flower.usesLeft
        ? defaultEdgePosition
        : defaultRightEdgePosition;
      flower.targetY = flower.startY;
    } else {
      flower.targetX = flower.startX;
      flower.targetY = flower.startY;
    }
  });

  function updateAnimations() {
    const scrollY = window.scrollY;
    const sectionHeight = firstSection.offsetHeight;
    const documentHeight = document.body.scrollHeight - window.innerHeight;

    // Phase 1: First section (flowers at original positions)
    // Phase 2: Middle sections (flowers at final positions)
    // Phase 3: Closing section (flowers return to original positions)

    // Calculate progress for each phase
    const firstSectionProgress = Math.min(scrollY / sectionHeight, 1);

    // Detect when entering closing section (last 100vh of scroll)
    const closingSectionTop = closingSection?.offsetTop || 0;
    const closingSectionProgress = Math.min(
      Math.max(
        (scrollY + window.innerHeight - closingSectionTop) / window.innerHeight,
        0
      ),
      1
    );

    // Determine which phase we're in
    let phase1Progress, phase2Progress, phase3Progress;

    if (closingSectionProgress > 0) {
      // Phase 3: Closing section - flowers return to original
      isClosingPhase = true;
      phase1Progress = 0;
      phase2Progress = 0;
      phase3Progress = closingSectionProgress;
    } else {
      // Phase 1 & 2: Normal animation
      isClosingPhase = false;
      phase1Progress = firstSectionProgress;
      phase2Progress = 1;
      phase3Progress = 0;
    }

    allFlowerData.forEach((flower) => {
      if (flower.isCropped) {
        // Cropped flowers: fade out during phases 1-2, fade in during phase 3
        let currentOpacity;
        if (isClosingPhase) {
          currentOpacity = phase3Progress;
        } else {
          const fadeProgress = Math.min(phase1Progress / 0.7, 1);
          currentOpacity = 1 - fadeProgress;
        }
        flower.element.style.opacity = currentOpacity.toFixed(3);
        return;
      }

      // Calculate position based on current phase
      let currentX, currentY, currentScale;

      if (isClosingPhase) {
        // Phase 3: Interpolate from final position back to original
        currentX =
          flower.targetX + (flower.startX - flower.targetX) * phase3Progress;
        currentY =
          flower.targetY + (flower.startY - flower.targetY) * phase3Progress;
        currentScale = defaultScale + (1 - defaultScale) * phase3Progress;
      } else {
        // Phases 1-2: Normal animation from original to final
        currentX =
          flower.startX + (flower.targetX - flower.startX) * phase1Progress;
        currentY =
          flower.startY + (flower.targetY - flower.startY) * phase1Progress;
        currentScale = 1 - (1 - defaultScale) * phase1Progress;
      }

      // Apply position
      flower.element.style.removeProperty('left');
      flower.element.style.removeProperty('right');
      flower.element.style.removeProperty('top');
      flower.element.style.removeProperty('bottom');

      if (flower.usesLeft) {
        flower.element.style.setProperty('left', `${currentX}%`, 'important');
      } else if (flower.usesRight) {
        flower.element.style.setProperty(
          'right',
          `${100 - currentX}%`,
          'important'
        );
      }

      if (flower.useTop) {
        flower.element.style.setProperty('top', `${currentY}%`, 'important');
      } else {
        flower.element.style.setProperty('bottom', `${currentY}%`, 'important');
      }

      flower.element.style.setProperty(
        'transform',
        `scale(${currentScale})`,
        'important'
      );
    });

    // Animate closing text when in phase 3
    if (closingSection && phase3Progress > 0.2) {
      const closingText = closingSection.querySelector('.closing-text');
      if (closingText && !closingText.classList.contains('visible')) {
        closingText.classList.add('visible');
      }
    }
  }

  window.addEventListener('scroll', updateAnimations, { passive: true });

  updateAnimations();
}
