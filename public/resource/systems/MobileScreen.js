/**
 * MobileScreen — поведение игры на телефонах и планшетах.
 *
 *  - В вертикальной ориентации поверх игры показывается заглушка
 *    «Поверните устройство» (разметка — в index.html, стили — в
 *    resource/core/screen.css), а сама игра и звук ставятся на паузу.
 *  - По первому касанию (там, где браузер это разрешает — Android Chrome,
 *    iPad Safari) игра переходит в полноэкранный режим и фиксирует
 *    горизонтальную ориентацию. На iPhone Safari полноэкранный режим для
 *    страниц не поддерживается — там работает только заглушка.
 *  - После поворота экрана и появления/скрытия адресной строки размер
 *    холста пересчитывается принудительно (iOS сообщает новый размер
 *    с задержкой).
 */
(function () {
  const PORTRAIT_QUERY = '(orientation: portrait) and (pointer: coarse)';
  const TOUCH_QUERY = '(pointer: coarse)';

  function install(game) {
    const portrait = window.matchMedia(PORTRAIT_QUERY);
    let pausedByOrientation = false;

    function refreshSize() {
      // несколько попыток: браузер может отдать итоговый размер не сразу
      [50, 250, 600].forEach(function (delay) {
        setTimeout(function () { game.scale.refresh(); }, delay);
      });
    }

    function applyOrientation() {
      const audioContext = game.sound && game.sound.context;

      if (portrait.matches && !pausedByOrientation) {
        pausedByOrientation = true;
        game.pause();
        if (audioContext && audioContext.state === 'running') audioContext.suspend();
      } else if (!portrait.matches && pausedByOrientation) {
        pausedByOrientation = false;
        game.resume();
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();
      }
      refreshSize();
    }

    if (portrait.addEventListener) portrait.addEventListener('change', applyOrientation);
    else if (portrait.addListener) portrait.addListener(applyOrientation);

    window.addEventListener('orientationchange', refreshSize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', refreshSize);

    game.events.once('ready', applyOrientation);

    // ---- полноэкранный режим + фиксация ориентации ----------------------
    const isTouch = window.matchMedia(TOUCH_QUERY).matches;
    const isInstalledApp = window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
    const root = document.documentElement;
    const canFullscreen = document.fullscreenEnabled && root.requestFullscreen;

    if (isTouch && !isInstalledApp && canFullscreen) {
      const enterFullscreen = function () {
        if (document.fullscreenElement) return;
        root.requestFullscreen({ navigationUI: 'hide' })
          .then(function () {
            if (screen.orientation && screen.orientation.lock) {
              return screen.orientation.lock('landscape');
            }
            return null;
          })
          .catch(function () { /* браузер отказал — играем как есть */ })
          .then(refreshSize);
      };
      // Только один раз: если игрок сам вышел из полноэкранного режима,
      // не навязываем его снова.
      document.addEventListener('pointerup', enterFullscreen, { once: true });
    }
  }

  window.VN.systems.MobileScreen = { install: install };
})();
