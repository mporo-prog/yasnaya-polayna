export function createDeveloperScreen(entries) {
  const dialog = document.createElement('dialog');
  dialog.className = 'developer-mode';
  dialog.setAttribute('aria-labelledby', 'developer-mode-title');
  dialog.innerHTML = `
    <div class="developer-mode__content">
      <p class="developer-mode__eyebrow">ИНСТРУМЕНТЫ РАЗРАБОТКИ</p>
      <h1 id="developer-mode-title">Режим разработчика</h1>
      <p class="developer-mode__intro">Выберите игровую сцену для запуска с начала или откройте саундтест.</p>
      <div class="developer-mode__scenes"></div>
      <footer>
        <button type="button" class="developer-mode__back">Вернуться в игру</button>
        <span>Ctrl+D или Esc — закрыть</span>
      </footer>
    </div>
  `;

  const screen = {
    onSelect: null,
    onClose: null,
    show: () => dialog.showModal(),
    hide: () => dialog.close(),
    destroy: () => dialog.remove(),
  };
  const list = dialog.querySelector('.developer-mode__scenes');
  entries.forEach((entry, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'developer-mode__scene';
    const number = document.createElement('span');
    number.className = 'developer-mode__number';
    number.textContent = String(index + 1).padStart(2, '0');
    const label = document.createElement('span');
    label.textContent = entry.label;
    const key = document.createElement('small');
    key.textContent = entry.key;
    button.append(number, label, key);
    button.addEventListener('click', () => screen.onSelect?.(entry));
    list.append(button);
  });

  dialog.querySelector('.developer-mode__back').addEventListener('click', () => screen.onClose?.());
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    screen.onClose?.();
  });
  document.body.append(dialog);
  return screen;
}
