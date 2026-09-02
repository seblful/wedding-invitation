/**
 * Guest RSVP form.
 *
 * Posts straight to Formspree — the same endpoint in development and in
 * production, so there is no untested path between the two.
 *
 * Nothing here spells out a payload key. A guest without JavaScript posts the
 * form natively, so the keys have to be the `name` attributes in the markup;
 * this module reads them off the form instead of restating them, which is what
 * used to drift — the second-day question was `attendance_second_day` in the
 * HTML and `second_day_attendance` here, so the same answer arrived under two
 * different keys depending on the guest's browser.
 *
 * The one control it does look up by name is the attendance question, because
 * that answer is what makes the partner name mandatory.
 */

const SUBMITTING_LABEL = 'Адпраўка...';

/** The `attendance` value that makes the partner name mandatory. */
const ATTENDING_WITH_PARTNER = 'yes_with_partner';

/** Formspree only answers with JSON when asked; without this it 302s to HTML. */
const FORMSPREE_HEADERS = Object.freeze({
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

/**
 * The error message a field already points at with `aria-describedby`.
 *
 * The markup declares that link once, for screen readers; reading it back is
 * cheaper than maintaining a parallel `data-for` attribute alongside it.
 *
 * @param {Element} field
 * @returns {HTMLElement | null}
 */
function errorElementFor(field) {
  const form = /** @type {{ form?: HTMLFormElement }} */ (field).form;
  if (!form) return null;

  for (const id of (field.getAttribute('aria-describedby') ?? '').split(
    /\s+/
  )) {
    if (!id) continue;
    const element = form.querySelector(`#${id}`);
    if (element instanceof HTMLElement && element.matches('.form-error')) {
      return element;
    }
  }
  return null;
}

/**
 * @param {Element} field
 * @param {boolean} invalid
 */
function setFieldError(field, invalid) {
  errorElementFor(field)?.classList.toggle('active', invalid);

  if (invalid) {
    field.setAttribute('aria-invalid', 'true');
  } else {
    field.removeAttribute('aria-invalid');
  }
}

/** @param {HTMLFormElement} form */
function clearAllErrors(form) {
  for (const error of form.querySelectorAll('.form-error')) {
    error.classList.remove('active');
  }
  for (const field of form.querySelectorAll('[aria-invalid]')) {
    field.removeAttribute('aria-invalid');
  }
}

/**
 * Every named control on the form, once per name.
 *
 * @param {HTMLFormElement} form
 * @returns {Element[]}
 */
function namedControls(form) {
  const seen = new Set();
  const controls = [];

  for (const element of form.elements) {
    const { name } = /** @type {{ name?: string }} */ (element);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    controls.push(element);
  }

  return controls;
}

/**
 * The payload, read out of the form exactly as the browser would post it.
 *
 * @param {HTMLFormElement} form
 * @returns {Record<string, string>}
 */
function readPayload(form) {
  const data = new FormData(form);

  /** @type {Record<string, string>} */
  const values = {};
  for (const control of namedControls(form)) {
    const { name } = /** @type {HTMLInputElement} */ (control);
    // `getAll` covers the alcohol checkbox group. An unchecked group yields
    // '' rather than dropping the key, so every question reaches Formspree.
    values[name] = data
      .getAll(name)
      .map((value) => String(value).trim())
      .filter(Boolean)
      .join(', ');
  }

  return values;
}

/**
 * Every required control the guest left empty.
 *
 * `required` is read live off the element, so the conditional partner rule
 * lives in exactly one place — the `change` handler that toggles it — rather
 * than being restated as a validation special case.
 *
 * @param {HTMLFormElement} form
 * @param {Record<string, string>} values
 * @returns {Element[]}
 */
function missingRequired(form, values) {
  return namedControls(form).filter((control) => {
    const { name, required } = /** @type {HTMLInputElement} */ (control);
    return required && !values[name];
  });
}

/**
 * @param {string} endpoint
 * @param {Record<string, string>} payload
 * @returns {Promise<boolean>} whether Formspree accepted the submission
 */
async function submitToFormspree(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: FORMSPREE_HEADERS,
    body: JSON.stringify(payload),
  });

  if (response.ok) return true;

  // Surface the reason in the console; guests get the generic message.
  const detail = await response.text().catch(() => '');
  console.error(`Formspree rejected the RSVP (${response.status}):`, detail);
  return false;
}

/**
 * Wires up validation, the conditional partner field and submission.
 *
 * @param {Document | HTMLElement} [root]
 * @returns {() => void} teardown
 */
export function initRsvpForm(root = document) {
  const form = root.querySelector('#guestSurveyForm');
  if (!(form instanceof HTMLFormElement)) return () => {};

  /** Every listener this adds, so the teardown can take them all back off. */
  const listeners = [];

  /**
   * @param {EventTarget} target
   * @param {string} type
   * @param {EventListener} handler
   */
  const listen = (target, type, handler) => {
    target.addEventListener(type, handler);
    listeners.push(() => target.removeEventListener(type, handler));
  };

  const attendanceSelect = form.elements.namedItem('attendance');
  const partnerGroup = form.querySelector('.partner-name-group');
  // Found through the group this module already toggles, rather than by its
  // payload key — that key belongs to the markup alone.
  const partnerInput = partnerGroup?.querySelector('input');
  const submitButton = form.querySelector('.form-submit-btn');
  const successMessage = form.querySelector('#formSuccess');
  const errorMessage = form.querySelector('#formError');

  let isSubmitting = false;

  /** @param {boolean} visible */
  const setPartnerVisible = (visible) => {
    partnerGroup?.classList.toggle('partner-group-hidden', !visible);
    if (partnerInput instanceof HTMLInputElement) {
      // This property is the whole conditional rule: `missingRequired` reads
      // it back at submit time.
      partnerInput.required = visible;
      if (visible) partnerInput.focus();
      else setFieldError(partnerInput, false);
    }
  };

  /**
   * Shows or hides one of the two result banners.
   *
   * Revealing one also moves focus to it: the banner sits below the submit
   * button, so on a phone the outcome was often off-screen, and a screen
   * reader had nothing pulling it to the announcement.
   *
   * @param {HTMLElement | null} element
   * @param {boolean} visible
   */
  const setMessageVisible = (element, visible) => {
    if (!element) return;
    element.classList.toggle('form-message-hidden', !visible);
    if (!visible) return;
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  if (attendanceSelect instanceof HTMLSelectElement) {
    listen(attendanceSelect, 'change', () => {
      setFieldError(attendanceSelect, false);
      setPartnerVisible(attendanceSelect.value === ATTENDING_WITH_PARTNER);
    });
  }

  // Clearing on input gives immediate feedback that the field is now fine.
  // Only the controls the markup gave an error message to can show one.
  for (const control of namedControls(form)) {
    if (!errorElementFor(control)) continue;
    const clear = () => setFieldError(control, false);
    listen(control, 'input', clear);
    listen(control, 'change', clear);
  }

  listen(form, 'submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    clearAllErrors(form);
    setMessageVisible(
      /** @type {HTMLElement | null} */ (successMessage),
      false
    );
    setMessageVisible(/** @type {HTMLElement | null} */ (errorMessage), false);

    const values = readPayload(form);
    const missing = missingRequired(form, values);

    if (missing.length > 0) {
      for (const control of missing) setFieldError(control, true);
      /** @type {HTMLElement} */ (missing[0]).focus();
      return;
    }

    isSubmitting = true;
    const button = /** @type {HTMLButtonElement | null} */ (submitButton);
    const originalLabel = button?.textContent ?? '';
    if (button) {
      button.disabled = true;
      button.textContent = SUBMITTING_LABEL;
    }

    try {
      const accepted = await submitToFormspree(form.action, values);
      setMessageVisible(
        /** @type {HTMLElement | null} */ (
          accepted ? successMessage : errorMessage
        ),
        true
      );
      if (accepted) {
        form.reset();
        setPartnerVisible(false);
      }
    } catch (error) {
      console.error('RSVP submission failed:', error);
      setMessageVisible(/** @type {HTMLElement | null} */ (errorMessage), true);
    } finally {
      isSubmitting = false;
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    }
  });

  return () => {
    for (const remove of listeners) remove();
    listeners.length = 0;
  };
}
