/**
 * Guest RSVP form.
 *
 * Posts straight to Formspree — the same endpoint in development and in
 * production, so there is no untested path between the two.
 */

const SUBMITTING_LABEL = 'Адпраўка...';

/**
 * The form's fields, keyed by element id.
 *
 * `field` is the name Formspree files the answer under, and it has to be the
 * `name` attribute in the markup: without JavaScript the browser posts the form
 * natively, and the two paths used to disagree about the second-day question
 * (`attendance_second_day` in the HTML, `second_day_attendance` here), so the
 * same answer landed in two different columns depending on the guest's browser.
 *
 * @type {ReadonlyArray<{ id: string, field: string, required: boolean }>}
 */
export const FIELDS = Object.freeze([
  { id: 'guestName', field: 'guest_name', required: true },
  { id: 'attendance', field: 'attendance', required: true },
  // Required only when the guest says they are bringing someone.
  { id: 'partnerName', field: 'partner_name', required: false },
  { id: 'attendanceSecondDay', field: 'attendance_second_day', required: true },
]);

/** Checkbox group; it has a shared `name` rather than a single element id. */
const ALCOHOL_FIELD = 'alcohol_preference';

/** The `#attendance` value that makes the partner name mandatory. */
const ATTENDING_WITH_PARTNER = 'yes_with_partner';

/** Formspree only answers with JSON when asked; without this it 302s to HTML. */
const FORMSPREE_HEADERS = Object.freeze({
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

/**
 * @param {HTMLFormElement} form
 * @param {string} fieldId
 * @returns {HTMLElement | null}
 */
function errorElementFor(form, fieldId) {
  return form.querySelector(`.form-error[data-for="${fieldId}"]`);
}

/**
 * @param {HTMLFormElement} form
 * @param {string} fieldId
 * @param {boolean} invalid
 */
function setFieldError(form, fieldId, invalid) {
  const field = form.querySelector(`#${fieldId}`);
  const error = errorElementFor(form, fieldId);

  error?.classList.toggle('active', invalid);
  if (field instanceof HTMLElement) {
    if (invalid) {
      field.setAttribute('aria-invalid', 'true');
    } else {
      field.removeAttribute('aria-invalid');
    }
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
 * @param {HTMLFormElement} form
 * @returns {{ values: Record<string, string>, invalidFieldIds: string[] }}
 */
function readAndValidate(form) {
  /** @param {string} id */
  const value = (id) =>
    /** @type {HTMLInputElement | HTMLSelectElement | null} */ (
      form.querySelector(`#${id}`)
    )?.value.trim() ?? '';

  /** @type {Record<string, string>} */
  const values = {};
  for (const { id, field } of FIELDS) values[field] = value(id);

  values[ALCOHOL_FIELD] = Array.from(
    form.querySelectorAll(`input[name="${ALCOHOL_FIELD}"]:checked`)
  )
    .map((input) => /** @type {HTMLInputElement} */ (input).value)
    .join(', ');

  const bringingPartner = values.attendance === ATTENDING_WITH_PARTNER;
  const invalidFieldIds = FIELDS.filter(
    ({ id, field, required }) =>
      !values[field] && (required || (id === 'partnerName' && bringingPartner))
  ).map(({ id }) => id);

  return { values, invalidFieldIds };
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
 */
export function initRsvpForm(root = document) {
  const form = root.querySelector('#guestSurveyForm');
  if (!(form instanceof HTMLFormElement)) return;

  const attendanceSelect = form.querySelector('#attendance');
  const partnerGroup = form.querySelector('.partner-name-group');
  const partnerInput = form.querySelector('#partnerName');
  const submitButton = form.querySelector('.form-submit-btn');
  const successMessage = form.querySelector('#formSuccess');
  const errorMessage = form.querySelector('#formError');

  let isSubmitting = false;

  /** @param {boolean} visible */
  const setPartnerVisible = (visible) => {
    partnerGroup?.classList.toggle('partner-group-hidden', !visible);
    if (partnerInput instanceof HTMLInputElement) {
      partnerInput.required = visible;
      if (visible) partnerInput.focus();
      else setFieldError(form, 'partnerName', false);
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
    attendanceSelect.addEventListener('change', () => {
      setFieldError(form, 'attendance', false);
      setPartnerVisible(attendanceSelect.value === ATTENDING_WITH_PARTNER);
    });
  }

  // Clearing on input gives immediate feedback that the field is now fine.
  for (const field of form.querySelectorAll('.form-input, .form-select')) {
    const clear = () => setFieldError(form, field.id, false);
    field.addEventListener('input', clear);
    field.addEventListener('change', clear);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    clearAllErrors(form);
    setMessageVisible(
      /** @type {HTMLElement | null} */ (successMessage),
      false
    );
    setMessageVisible(/** @type {HTMLElement | null} */ (errorMessage), false);

    const { values, invalidFieldIds } = readAndValidate(form);

    if (invalidFieldIds.length > 0) {
      for (const id of invalidFieldIds) setFieldError(form, id, true);
      /** @type {HTMLElement | null} */ (
        form.querySelector(`#${invalidFieldIds[0]}`)
      )?.focus();
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
}
