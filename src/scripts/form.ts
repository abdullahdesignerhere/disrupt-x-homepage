// Demo form: inline validation, errors tied to fields with aria-describedby and aria-invalid,
// focus moves to the first error. A valid submit sends nothing and shows a status message.
export function initForm() {
  const form = document.querySelector<HTMLFormElement>('[data-form]');
  if (!form) return;
  const status = form.querySelector<HTMLElement>('#formStatus')!;
  const inputs = [...form.querySelectorAll<HTMLInputElement>('input')];
  const emailOk = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

  function check(input: HTMLInputElement) {
    const v = input.value.trim();
    const bad = !v || (input.type === 'email' && !emailOk(v));
    const err = form!.querySelector<HTMLElement>(`#err-${input.name}`)!;
    input.setAttribute('aria-invalid', String(bad));
    err.textContent = bad ? input.dataset.error ?? '' : '';
    return !bad;
  }

  inputs.forEach((i) => {
    i.addEventListener('blur', () => i.value && check(i));
    i.addEventListener('input', () => i.getAttribute('aria-invalid') === 'true' && check(i));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.classList.remove('is-error');
    status.textContent = '';
    const bad = inputs.filter((i) => !check(i));
    if (bad.length) {
      status.classList.add('is-error');
      status.textContent = form.dataset.summary ?? '';
      bad[0].focus();
      return;
    }
    status.textContent = form.dataset.success ?? '';
  });
}
