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

  // ---- кнопки-иконки ------------------------------------------------------

  /**
   * Единые размеры кнопок-иконок (в пикселях макета) — одинаковые во всех
   * сценах: сюжет, мини-игры, настройки. На телефоне (isCompact) кнопки
   * крупнее, чтобы по ним было удобно попадать пальцем.
   */
  const UI_BUTTONS = {
    desktop: { pause: 150, next: 150, back: 96, history: 70, close: 60 },
    compact: { pause: 190, next: 230, back: 160, history: 150, close: 160 },
  };
  // Центр кнопки паузы — от левого верхнего угла области без выреза.
  const PAUSE_POSITION = {
    desktop: { left: 104, top: 100 },
    compact: { left: 125, top: 120 },
  };
  // Центр стрелки «далее» на плашках мини-игр — точка макета 1920×1080,
  // отсчитывается от центра экрана (см. fromCenter).
  const HINT_NEXT_CENTER = { x: 1675, y: 900 };

  function buttonSize(scene, kind) {
    return UI_BUTTONS[isCompact(scene) ? 'compact' : 'desktop'][kind];
  }

  /** Кнопка паузы: единый размер и место у левого верхнего угла. */
  function pinPauseButton(scene, button) {
    onLayout(scene, (v, ui) => {
      if (!isAlive(button)) return;
      const mode = isCompact(scene) ? 'compact' : 'desktop';
      const size = UI_BUTTONS[mode].pause;
      button
        .setOrigin(0.5)
        .setDisplaySize(size, size)
        .setPosition(ui.x + PAUSE_POSITION[mode].left, ui.y + PAUSE_POSITION[mode].top);
    });
    return button;
  }

  /**
   * Точка макета (x, y в пикселях 1920×1080), привязанная к ЦЕНТРУ экрана:
   * на любых пропорциях она на том же расстоянии от центра, что в макете.
   * Так плашки правил/победы/проигрыша и их кнопки не разъезжаются на
   * широких телефонах и планшетах (при привязке к краям — разъезжались).
   */
  function fromCenter(visible, x, y) {
    return {
      x: visible.centerX + (x - SAFE_WIDTH / 2),
      y: visible.centerY + (y - SAFE_HEIGHT / 2),
    };
  }

  /**
   * Стрелка «далее» на плашках мини-игр (правила, подсказки, победа):
   * единый размер, центр в одном и том же месте относительно центра экрана.
   * Кнопка может иметь любой origin — ставим её по центру.
   */
  function nextArrowCenter(visible) {
    return fromCenter(visible, HINT_NEXT_CENTER.x, HINT_NEXT_CENTER.y);
  }

  function placeNextArrow(scene, arrow, visible) {
    if (!isAlive(arrow)) return arrow;
    const size = buttonSize(scene, 'next');
    const { x: cx, y: cy } = nextArrowCenter(visible);
    arrow
      .setDisplaySize(size, size)
      .setPosition(cx + (arrow.originX - 0.5) * size, cy + (arrow.originY - 0.5) * size);
    return arrow;
  }

  // ---- диалоговая плашка ---------------------------------------------------

  /**
   * Колонка имени на картинке dialog_text_bg.webp (1592 px в ширину):
   * внутренний край левой рамки — x≈32, вертикальная черта — x≈400.
   * Возвращает центр колонки и ширину для текста с отступом margin
   * от рамки и от черты.
   */
  function dialogueNameColumn(panel, margin) {
    const left = panel.x + panel.width * (32 / 1592);
    const right = panel.x + panel.width * (400 / 1592);
    return { x: (left + right) / 2, wrap: right - left - margin * 2 };
  }

  /**
   * Раскладка диалоговой плашки — одна для сюжетных сцен и для реплик в
   * мини-играх: плашка, имя (центр колонки, origin 0.5/0), текст реплики
   * (левый верхний угол), кнопки «далее» и «назад» (центры). Координаты —
   * в группе, прижатой к нижнему краю экрана (по вертикали — макет 1080).
   * size/minSize — размер шрифта и нижний предел при подгонке под плашку.
   */
  function dialogueLayout(scene, ui) {
    const nextSize = buttonSize(scene, 'next');
    const backSize = buttonSize(scene, 'back');
    let panel, name, text, next, back;
    if (isCompact(scene)) {
      // Мобильный макет: плашка почти во всю ширину экрана, крупный текст,
      // кнопки под палец. «Далее» и «Назад» заходят на края плашки.
      const panelLeft = ui.x + ui.width * 0.076;
      const panelRight = ui.right - ui.width * 0.062;
      panel = { x: panelLeft, y: 688, width: panelRight - panelLeft, height: 340 };
      // «Далее» — по центру высоты плашки, на её правом краю.
      next = { x: ui.right - 176, y: panel.y + panel.height / 2, size: nextSize };
      back = { x: ui.x + 189, y: 930, size: backSize };
      const dividerX = panel.x + panel.width * 0.275;
      // Имя — посередине между рамкой и чертой, чуть ниже верхней грани,
      // чтобы не залезать на рамку.
      name = { ...dialogueNameColumn(panel, 20), y: panel.y + 95, size: 56, minSize: 36 };
      const textX = dividerX + 60;
      // Текст реплики немного опущен от верхней грани плашки.
      const textTop = 60;
      text = {
        x: textX,
        y: panel.y + textTop,
        size: 48,
        minSize: 36,
        lineSpacing: -2,
        wrap: next.x - next.size / 2 - 30 - textX,
        maxHeight: panel.height - textTop - 40,
      };
    } else {
      // Плашка диалога — по дизайну задан её ПРАВЫЙ ВЕРХНИЙ угол:
      // 8.63% от правого края макета, 68.58% от верхнего края,
      // фиксированный размер 1580.17 x 314.3px.
      const width = 1580.17;
      const height = 314.3;
      panel = { x: SAFE_WIDTH - SAFE_WIDTH * 0.0863 - width, y: SAFE_HEIGHT * 0.6858, width: width, height: height };
      // Имя героя: посередине между рамкой и чертой, верх — на 25% высоты плашки.
      name = { ...dialogueNameColumn(panel, 15), y: panel.y + height * 0.25, size: 40, minSize: 28 };
      // Текст реплики: 29.185% / 25% от плашки, ширина 922px.
      text = {
        x: panel.x + width * 0.291848345431,
        y: panel.y + height * 0.25,
        size: 32,
        minSize: 26,
        lineSpacing: -2,
        wrap: 922,
        maxHeight: height * 0.62,
      };
      // «Далее» — левый верхний угол на 85.417% / 76.389%, размер 150;
      // «Назад» — на 6.77% / 86.389%, размер 96. x/y — центр кнопки.
      next = { x: SAFE_WIDTH * 0.8541666667 + 75, y: SAFE_HEIGHT * 0.7638888889 + 75, size: nextSize };
      back = { x: SAFE_WIDTH * 0.0677 + 48, y: SAFE_HEIGHT * 0.8638888889 + 48, size: backSize };
    }
    return { panel, name, text, next, back };
  }

  /** Уменьшает шрифт text, пока tooBig() — не ниже minSize. Возвращает размер. */
  function fitFontSize(text, size, minSize, tooBig) {
    text.setFontSize(size);
    while (size > minSize && tooBig()) {
      size -= 2;
      text.setFontSize(size);
    }
    return size;
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
   *
   * options.fillFrom — Phaser.Geom.Rectangle (в координатах картинки) с
   * «пустым» участком фона (например, дерево без карты). Вместо зеркал
   * этот участок растягивается под весь экран позади фона, так что
   * полосы у края заполнены тем же фоном без отражений.
   */
  function addBackground(scene, key, options) {
    options = options || {};
    const keep = options.keep || null;
    const fillFrom = options.fillFrom || null;

    // Подложка из участка фона — лежит позади основной картинки.
    const backdrop = fillFrom
      ? scene.add.image(0, 0, '__DEFAULT').setOrigin(0, 0).setVisible(false)
      : null;
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

    const handle = { stage: stage, image: image, backdrop: backdrop, key: null };

    function relayout(v) {
      if (!handle.key) {
        mirrors.forEach(function (m) { m.setVisible(false); });
        if (backdrop) backdrop.setVisible(false);
        return;
      }
      const t = computeBackgroundTransform(v, keep);
      stage.setPosition(t.x, t.y).setScale(t.zoom);
      if (backdrop) {
        mirrors.forEach(function (m) { m.setVisible(false); });
        // По вертикали совпадаем с фоном, чтобы доски продолжались без сдвига;
        // выходим за него только если фон не закрывает экран по высоте.
        const top = Math.min(v.y, t.y);
        const bottom = Math.max(v.bottom, t.y + SAFE_HEIGHT * t.zoom);
        backdrop
          .setPosition(v.x, top)
          .setDisplaySize(v.width, bottom - top)
          .setVisible(!t.covers);
      } else {
        mirrors.forEach(function (m) { m.setVisible(!t.covers); });
      }
    }

    function backdropFrame(textureKey) {
      const texture = scene.textures.get(textureKey);
      const name = '__layoutFill';
      if (!texture.has(name)) {
        texture.add(name, 0, fillFrom.x, fillFrom.y, fillFrom.width, fillFrom.height);
      }
      return name;
    }

    handle.setTexture = function (textureKey) {
      if (textureKey && scene.textures.exists(textureKey)) {
        handle.key = textureKey;
        // Кадр '__BASE' (вся картинка) — явно: после добавления кадра
        // подложки (fillFrom) Phaser считает кадром по умолчанию именно его.
        image.setTexture(textureKey, '__BASE').setDisplaySize(SAFE_WIDTH, SAFE_HEIGHT).setVisible(true);
        mirrors.forEach(function (m) {
          m.setTexture(textureKey, '__BASE').setDisplaySize(SAFE_WIDTH, SAFE_HEIGHT);
        });
        if (backdrop) backdrop.setTexture(textureKey, backdropFrame(textureKey));
      } else {
        handle.key = null;
        image.setVisible(false);
      }
      relayout(getVisibleRect(scene));
      return handle;
    };

    handle.setDepth = function (depth) {
      stage.setDepth(depth);
      if (backdrop) backdrop.setDepth(depth);
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
  // ---- меню (главное и пауза) ---------------------------------------------

  /**
   * Раскладка экрана меню — одна для главного меню и меню паузы: слева
   * кнопки (slots — левый верхний угол и размер), справа вывеска (logo),
   * fontSize — размер подписей кнопок. На компьютере — по startStyle,
   * на телефоне (isCompact) — по мобильному макету: кнопки и вывеска крупнее.
   */
  function menuLayout(scene, ui) {
    const style = window.VN.data.startStyle;
    if (isCompact(scene)) {
      // Мобильный макет: доли ширины экрана, высоты — в пикселях макета.
      const x = ui.x + ui.width * 0.1036;
      const width = ui.width * 0.2726;
      return {
        slots: [118, 393, 655].map((y) => ({ x, y, width, height: 223 })),
        logo: { x: ui.x + ui.width * 0.529, y: 183, width: 825, height: 432 },
        fontSize: 79,
      };
    }
    const t = style.title;
    return {
      slots: style.buttons.map((slot) => ({
        x: SAFE_WIDTH * slot.xFrac, y: SAFE_HEIGHT * slot.yFrac, width: slot.width, height: slot.height,
      })),
      logo: { x: SAFE_WIDTH * t.xFrac, y: SAFE_HEIGHT * t.yFrac, width: t.width, height: t.height },
      fontSize: parseInt(style.buttonFontSize, 10),
    };
  }

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
    UI_BUTTONS: UI_BUTTONS,
    buttonSize: buttonSize,
    pinPauseButton: pinPauseButton,
    dialogueLayout: dialogueLayout,
    menuLayout: menuLayout,
    fitFontSize: fitFontSize,
    fromCenter: fromCenter,
    nextArrowCenter: nextArrowCenter,
    placeNextArrow: placeNextArrow,
    attach: attach,
    onLayout: onLayout,
    pin: pin,
    fill: fill,
    addBackground: addBackground,
    computeBackgroundTransform: computeBackgroundTransform,
  };
})();
