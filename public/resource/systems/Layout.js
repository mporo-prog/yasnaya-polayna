/**
 * Layout — адаптивная раскладка поверх Phaser.Scale.EXPAND.
 *
 * Как это устроено
 * ----------------
 * Игра по-прежнему рисуется в координатах макета 1920×1080 — это
 * «безопасная зона»: всё, что в ней, видно на любом экране.
 *
 * Режим EXPAND растягивает холст на весь экран и добавляет «поля»:
 *   - экран шире 16:9 (телефоны 19.5:9, 20:9, ультраширокие мониторы) —
 *     поля слева и справа;
 *   - экран уже 16:9 (планшеты 4:3, ноутбуки 16:10) — поля сверху и снизу.
 *
 * Этот модуль:
 *   1. ставит камеру так, чтобы безопасная зона 0..1920 × 0..1080 была
 *      ровно по центру экрана (поэтому координаты в сценах менять не нужно);
 *   2. умеет «прибивать» элементы к краям видимой области (кнопки паузы,
 *      меню, закрыть) с учётом выреза/чёлки телефона (safe-area-inset);
 *   3. растягивает сплошные подложки/затемнения на всю видимую область;
 *   4. растягивает фон-картинку 1920×1080 на весь экран (с лёгкой
 *      обрезкой краёв), не обрезая указанную важную область (keep).
 *      Если важную область не обрезать никак — оставшиеся полосы
 *      заполняются зеркальным отражением того же фона.
 *
 * Все функции сами подписываются на изменение размера окна / поворот
 * экрана и сами отписываются, когда сцена завершается.
 */
(function () {
  const SAFE_WIDTH = 1920;
  const SAFE_HEIGHT = 1080;

  // Максимальное увеличение фона. Больше — начинается заметная потеря
  // качества картинки 1920×1080.
  const MAX_BACKGROUND_ZOOM = 1.4;

  // ---- геометрия --------------------------------------------------------

  /**
   * Видимая область экрана в координатах макета (мира).
   * На экране 16:9 это ровно { x: 0, y: 0, width: 1920, height: 1080 }.
   * На 20:9 — например { x: -210, y: 0, width: 2340, height: 1080 }.
   */
  function getVisibleRect(scene) {
    const base = scene.scale.baseSize;
    const width = base.width || SAFE_WIDTH;
    const height = base.height || SAFE_HEIGHT;
    return new Phaser.Geom.Rectangle(
      (SAFE_WIDTH - width) / 2,
      (SAFE_HEIGHT - height) / 2,
      width,
      height
    );
  }

  /** Отступы системных вырезов (чёлка, скругления, «полоска» iOS) в CSS-пикселях. */
  function readCssSafeInsets() {
    if (typeof document === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };
    const style = getComputedStyle(document.documentElement);
    const read = (name) => parseFloat(style.getPropertyValue(name)) || 0;
    return {
      top: read('--safe-top'),
      right: read('--safe-right'),
      bottom: read('--safe-bottom'),
      left: read('--safe-left'),
    };
  }

  /**
   * Отступы вырезов, пересчитанные в координаты мира. Учитываем, что холст
   * может не доходить до края окна (тогда вырез его не перекрывает).
   */
  function getSafeInsets(scene) {
    const css = readCssSafeInsets();
    const bounds = scene.scale.canvasBounds;
    const displayWidth = scene.scale.displaySize.width || 1;
    const k = scene.scale.baseSize.width / displayWidth; // CSS px -> мировые единицы
    const gapLeft = Math.max(0, bounds.left);
    const gapTop = Math.max(0, bounds.top);
    const gapRight = Math.max(0, window.innerWidth - bounds.right);
    const gapBottom = Math.max(0, window.innerHeight - bounds.bottom);
    return {
      top: Math.max(0, css.top - gapTop) * k,
      right: Math.max(0, css.right - gapRight) * k,
      bottom: Math.max(0, css.bottom - gapBottom) * k,
      left: Math.max(0, css.left - gapLeft) * k,
    };
  }

  /** Видимая область без системных вырезов — сюда ставим кнопки интерфейса. */
  function getUiRect(scene) {
    const v = getVisibleRect(scene);
    const inset = getSafeInsets(scene);
    return new Phaser.Geom.Rectangle(
      v.x + inset.left,
      v.y + inset.top,
      v.width - inset.left - inset.right,
      v.height - inset.top - inset.bottom
    );
  }

  /**
   * Телефон: холст ниже COMPACT_MAX_CSS_HEIGHT CSS-пикселей. На таком экране
   * сцены включают «компактную» раскладку по мобильным макетам — крупный
   * текст и кнопки под палец.
   */
  const COMPACT_MAX_CSS_HEIGHT = 600;

  function isCompact(scene) {
    const cssHeight = scene.scale.displaySize.height || window.innerHeight;
    return cssHeight < COMPACT_MAX_CSS_HEIGHT;
  }

  // ---- подписка сцены на изменения размера ------------------------------

  function isAlive(obj) {
    return obj && obj.scene;
  }

  function getState(scene) {
    if (scene.__layout) return scene.__layout;

    const state = { handlers: [] };
    scene.__layout = state;

    const apply = () => applyLayout(scene);
    scene.scale.on('resize', apply);
    // Сцена могла «спать» (sleep) во время поворота экрана — при пробуждении
    // пересчитываем на всякий случай.
    scene.events.on('wake', apply);
    scene.events.once('shutdown', () => {
      scene.scale.off('resize', apply);
      scene.events.off('wake', apply);
      scene.__layout = null;
    });

    updateCamera(scene);
    return state;
  }

  function updateCamera(scene) {
    const cam = scene.cameras.main;
    const base = scene.scale.baseSize;
    const v = getVisibleRect(scene);
    // В Phaser 3.80 камера в режиме EXPAND не всегда сама меняет размер
    // после второго и последующих resize — выставляем явно.
    cam.setSize(base.width, base.height);
    cam.setScroll(v.x, v.y);
  }

  function applyLayout(scene) {
    const state = scene.__layout;
    if (!state) return;
    updateCamera(scene);
    const v = getVisibleRect(scene);
    const ui = getUiRect(scene);
    state.handlers.forEach((handler) => handler(v, ui));
  }

  /**
   * Регистрирует функцию раскладки: вызывается сразу и после каждого
   * изменения размера. fn(visibleRect, uiRect).
   */
  function onLayout(scene, fn) {
    const state = getState(scene);
    state.handlers.push(fn);
    fn(getVisibleRect(scene), getUiRect(scene));
    return fn;
  }

  /** Центрирует камеру на безопасной зоне (достаточно для сцен без «прилипающих» элементов). */
  function attach(scene) {
    getState(scene);
  }

  // ---- «прилипание» к краям ---------------------------------------------

  /**
   * Прибивает объект к краю видимой области (с учётом выреза).
   * Отступы задаются в пикселях макета — от соответствующего края:
   *
   *   pin(scene, btn, { left: 100, top: 90 })     // левый верхний угол
   *   pin(scene, btn, { right: 95, top: 45 })     // правый верхний угол
   *   pin(scene, text, { centerX: 0, bottom: 60 })// по центру снизу
   *
   * Не указанная ось остаётся как есть (в координатах макета).
   */
  function pin(scene, obj, anchor) {
    onLayout(scene, (v, ui) => {
      if (!isAlive(obj)) return;
      let x = obj.x;
      let y = obj.y;
      if (anchor.left != null) x = ui.left + anchor.left;
      else if (anchor.right != null) x = ui.right - anchor.right;
      else if (anchor.centerX != null) x = ui.centerX + anchor.centerX;
      if (anchor.top != null) y = ui.top + anchor.top;
      else if (anchor.bottom != null) y = ui.bottom - anchor.bottom;
      else if (anchor.centerY != null) y = ui.centerY + anchor.centerY;
      obj.setPosition(x, y);
    });
    return obj;
  }

  /**
   * Растягивает прямоугольник/зону на всю видимую область (подложки,
   * затемнения, перехватчики кликов). Объект должен лежать в мировых
   * координатах (или в контейнере в точке 0,0 без масштаба).
   *
   * options.top / options.bottom — можно растянуть только часть экрана,
   * например стол от y=540 до нижнего края: fill(scene, table, { top: 540 }).
   */
  function fill(scene, obj, options) {
    options = options || {};
    onLayout(scene, (v) => {
      if (!isAlive(obj)) return;
      const top = options.top != null ? options.top : v.y;
      const bottom = options.bottom != null ? options.bottom : v.bottom;
      const left = options.left != null ? options.left : v.x;
      const right = options.right != null ? options.right : v.right;
      obj.setOrigin(0, 0);
      obj.setPosition(left, top);
      obj.setSize(right - left, bottom - top);
      if (obj.setDisplaySize && obj.type !== 'Rectangle' && obj.type !== 'Zone') {
        obj.setDisplaySize(right - left, bottom - top);
      }
    });
    return obj;
  }

  // ---- фон-картинка ---------------------------------------------------------

  /**
   * Подбирает масштаб и позицию фона 1920×1080 под видимую область.
   * keep — прямоугольник в координатах картинки, который нельзя обрезать.
   */
  function computeBackgroundTransform(v, keep) {
    const cover = Math.max(v.width / SAFE_WIDTH, v.height / SAFE_HEIGHT);
    let zoom = Math.min(cover, MAX_BACKGROUND_ZOOM);
    if (keep) {
      zoom = Math.min(zoom, v.width / keep.width, v.height / keep.height);
    }
    zoom = Math.max(1, zoom);

    function axis(vMin, vSize, full, keepMin, keepMax) {
      const size = full * zoom;
      let pos = vMin + (vSize - size) / 2; // по центру
      let lo = -Infinity;
      let hi = Infinity;
      if (size >= vSize) {
        // картинка закрывает экран — не показываем её край
        lo = vMin + vSize - size;
        hi = vMin;
      }
      if (keep) {
        // важная область должна остаться в кадре — у неё приоритет
        const keepLo = vMin - keepMin * zoom;
        const keepHi = vMin + vSize - keepMax * zoom;
        lo = Math.max(lo, keepLo);
        hi = Math.min(hi, keepHi);
        if (lo > hi) { lo = keepLo; hi = keepHi; }
      }
      return Phaser.Math.Clamp(pos, lo, hi);
    }

    return {
      zoom: zoom,
      x: axis(v.x, v.width, SAFE_WIDTH, keep ? keep.left : 0, keep ? keep.right : 0),
      y: axis(v.y, v.height, SAFE_HEIGHT, keep ? keep.top : 0, keep ? keep.bottom : 0),
      covers: zoom >= cover - 0.001,
    };
  }

  /**
   * Добавляет фон-картинку, растянутую на весь экран.
   *
   * Возвращает объект:
   *   stage   — контейнер фона. Всё, что «стоит на фоне» (птицы на ветках),
   *             добавляйте в него в координатах картинки 1920×1080 — оно
   *             будет двигаться и масштабироваться вместе с фоном.
   *   image   — сама картинка;
   *   setTexture(key) — сменить фон (например, в сюжетной сцене).
   *
   * options.keep — Phaser.Geom.Rectangle (в координатах картинки), который
   * нельзя обрезать ни на каком экране. Если из-за него фон не может
   * закрыть весь экран, оставшиеся полосы у края заполняются зеркальным
   * отражением картинки — переход получается бесшовным.
   */
  function addBackground(scene, key, options) {
    options = options || {};
    const keep = options.keep || null;

    const image = scene.add.image(0, 0, '__DEFAULT').setOrigin(0, 0);
    // Зеркальные копии по четырём сторонам — видны только в полосах.
    const mirrors = [
      { x: -SAFE_WIDTH, y: 0, flipX: true, flipY: false },
      { x: SAFE_WIDTH, y: 0, flipX: true, flipY: false },
      { x: 0, y: -SAFE_HEIGHT, flipX: false, flipY: true },
      { x: 0, y: SAFE_HEIGHT, flipX: false, flipY: true },
    ].map(function (m) {
      return scene.add.image(m.x, m.y, '__DEFAULT')
        .setOrigin(0, 0)
        .setFlip(m.flipX, m.flipY)
        .setVisible(false);
    });
    const stage = scene.add.container(0, 0, mirrors.concat([image]));

    const handle = { stage: stage, image: image, key: null };

    function relayout(v) {
      if (!handle.key) {
        mirrors.forEach(function (m) { m.setVisible(false); });
        return;
      }
      const t = computeBackgroundTransform(v, keep);
      stage.setPosition(t.x, t.y).setScale(t.zoom);
      mirrors.forEach(function (m) { m.setVisible(!t.covers); });
    }

    handle.setTexture = function (textureKey) {
      if (textureKey && scene.textures.exists(textureKey)) {
        handle.key = textureKey;
        image.setTexture(textureKey).setDisplaySize(SAFE_WIDTH, SAFE_HEIGHT).setVisible(true);
        mirrors.forEach(function (m) {
          m.setTexture(textureKey).setDisplaySize(SAFE_WIDTH, SAFE_HEIGHT);
        });
      } else {
        handle.key = null;
        image.setVisible(false);
      }
      relayout(getVisibleRect(scene));
      return handle;
    };

    handle.setDepth = function (depth) {
      stage.setDepth(depth);
      return handle;
    };

    onLayout(scene, relayout);
    handle.setTexture(key);
    return handle;
  }

  /**
   * Настройки масштабирования для new Phaser.Game({ scale: ... }).
   * Одни и те же для основной игры и отдельных страниц мини-игр.
   */
  function getScaleConfig(parent) {
    return {
      parent: parent,
      mode: Phaser.Scale.EXPAND,
      width: SAFE_WIDTH,
      height: SAFE_HEIGHT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    };
  }

  window.VN.systems.Layout = {
    SAFE_WIDTH: SAFE_WIDTH,
    SAFE_HEIGHT: SAFE_HEIGHT,
    getScaleConfig: getScaleConfig,
    getVisibleRect: getVisibleRect,
    getUiRect: getUiRect,
    getSafeInsets: getSafeInsets,
    isCompact: isCompact,
    attach: attach,
    onLayout: onLayout,
    pin: pin,
    fill: fill,
    addBackground: addBackground,
    computeBackgroundTransform: computeBackgroundTransform,
  };
})();
