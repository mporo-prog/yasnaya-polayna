/**
 * Аудио сюжетных сцен, в том же порядке, что storyBackgrounds/storyLines.
 * Пути — относительно resource/sound; все времена — в секундах.
 * music: null — затухание до тишины; без поля music — продолжать текущую музыку.
 * Один элемент screens соответствует одной реплике в storyLines.
 * Пример заполнения есть в docs/audio.md.
 */
window.VN.data.storyAudio = [
  // Сюжетная сцена 1
  {
    music: { path: 'voice_and_sound/scene1_gameplay1_new/plot1_background_1.mp3', loop: true }, // { path: 'music/theme.mp3', volume: 0.8, loop: true }
    transition: {
    type: 'crossfade',
    fadeOutDuration: 1,
    fadeInDuration: 1,
    fadeOutDelay: 0,
    fadeInDelay: 1,
  },
    transitionSound: null, // { path: 'ui/transition.mp3', volume: 0.6, delay: 0 }
    sounds: [], // Звуки при входе в сцену, например { path: 'voice_and_sound/intro.mp3' }
    screens: [
      { voice: { path: 'voice_and_sound/scene1_gameplay1_new/screen1_scene1_rasskazchik.mp3',}, sounds: [] }, // реплика 1 — 4с
      { voice: { path: 'voice_and_sound/scene1_gameplay1_new/screen2_scene1_sadovnik1.mp3', delay: 1, margin: 1}, sounds: [] }, // Экран 2;
      { voice: 'voice_and_sound/screen2_scene1_posetitel1.mp3', sounds: [] }, // Экран 3
      { voice: 'voice_and_sound/scene1_gameplay1_new/screen2_scene1_sadovnik2.mp3', sounds: [] },
      { voice: 'voice_and_sound/screen2_scene1_posetitel2.mp3', sounds: [] },
      { voice: {path: 'voice_and_sound/scene1_gameplay1_new/screen_3_scene_1_sadovnik.mp3', delay: 2, margin: 0.9}, sounds: [] },
    ],
  },
  // Сюжетная сцена 2
  {
    music: { path: 'voice_and_sound/scene2_gameplay2/plot1_background_2.mp3', loop: true }, // { path: 'music/theme.mp3', volume: 0.8, loop: true }
    transition: {
    type: 'crossfade',
    fadeOutDuration: 1,
    fadeInDuration: 1,
    fadeOutDelay: 0,
    fadeInDelay: 1,
  },
    transitionSound: {
      path: 'ui/swipe.mp3', // Отдельный эффект перехода
      volume: 1,
      delay: 0,                // Проиграть сразу при входе
    },
    sounds: [], // Звуки при входе в сцену, например { path: 'voice_and_sound/intro.mp3' }
    screens: [
      { voice: { path: 'voice_and_sound/scene2_gameplay2/plot1_background_2.mp3'}, sounds: [] },
      { voice: { path: 'voice_and_sound/scene2_gameplay2/screen_1_1_scene2_posetitel1.mp3'}, sounds: [] },
      { voice: { path: 'voice_and_sound/scene2_gameplay2/screen_1_1_scene_2_boy.mp3'}, sounds: [] },
      { voice: 'voice_and_sound/scene2_gameplay2/screen_1_1_scene_2_posetitel2.mp3', sounds: [] },
      { voice: 'voice_and_sound/scene2_gameplay2/screen_1_1_scene_2_boy2.mp3', sounds: [] },
      { voice: 'voice_and_sound/scene2_gameplay2/screen_1_1_scene_2_posetitel3.mp3', sounds: [] },
      { voice: {path: 'voice_and_sound/scene2_gameplay2/screen_1_1_scene_2_boy3.mp3'}, sounds: [] },
      { voice: {path: 'voice_and_sound/scene2_gameplay2/screen_1_1_scene_2_posetitel3_alt.mp3'}, sounds: [] },
      { voice: {path: 'voice_and_sound/scene2_gameplay2/screen_1_1_scene_2_boy4.mp3'}, sounds: [] },
      { voice: {path: 'voice_and_sound/scene2_gameplay2/screen2_scene2_posetitel.mp3'}, sounds: [] },
      { voice: {path: 'voice_and_sound/scene2_gameplay2/new_veter/screen_2_1_scene_2_posetitel.mp3'}, sounds: [] },
      { voice: {path: 'voice_and_sound/scene2_gameplay2/screen_3_scene_2_veter_beg.mp3'}, sounds: [] },
      { voice: {path: 'voice_and_sound/scene2_gameplay2/screen_4_scene_2_posetitel.mp3'}, sounds: [] },
      { voice: {path: 'voice_and_sound/scene2_gameplay2/screen5_scene2_posetitel.mp3'}, sounds: [] },
    ],
  },
  // Сюжетная сцена 3
  {
    // Уровень самого WAV поднят на 18 дБ для баланса с фоном сцены 4.
    music: { path: 'voice_and_sound/scene3_gameplay3/plot/plot3_background.mp3', loop: true }, // { path: 'music/theme.mp3', volume: 0.8, loop: true }
    transition: {
    type: 'crossfade',
    fadeOutDuration: 1,
    fadeInDuration: 1,
    fadeOutDelay: 0,
    fadeInDelay: 1,
  },
    transitionSound: {
      path: 'ui/swipe.mp3', // Отдельный эффект перехода
      volume: 1,
      delay: 0,                // Проиграть сразу при входе
    },
    sounds: [], // Звуки при входе в сцену, например { path: 'voice_and_sound/intro.mp3' }
    screens: [
      { voice: { path: 'voice_and_sound/scene3_gameplay3/plot/screen_1_scene_3_posetitel.mp3'}, sounds: [] },
      { voice: { path: 'voice_and_sound/scene3_gameplay3/plot/screen_1_scene_3_sofia1.mp3'}, sounds: [] },
      { voice: { path: 'voice_and_sound/scene3_gameplay3/plot/screen_1_scene_3_posetitel2.mp3'}, sounds: [] },
      { voice: { path: 'voice_and_sound/scene3_gameplay3/plot/screen_1_scene_3_sofia2.mp3', margin: 1.5}, sounds: [] },
      { voice: { path: 'voice_and_sound/scene3_gameplay3/plot/screen_2_scene_3_posetitel.mp3'}, sounds: [] },
    ],
  },
  // Сюжетная сцена 4
  {
    music: { path: 'voice_and_sound/scene4_gameplay4/plot4_background.mp3', loop: true },
    transition: {
    type: 'crossfade',
    fadeOutDuration: 1,
    fadeInDuration: 1,
    fadeOutDelay: 0,
    fadeInDelay: 1,
  },
    transitionSound: {
      path: 'ui/swipe.mp3', // Отдельный эффект перехода
      volume: 1,
      delay: 0,                // Проиграть сразу при входе
    },
    sounds: [], // Звуки при входе в сцену, например { path: 'voice_and_sound/intro.mp3' }
    screens: [
      { voice: { path: 'voice_and_sound/scene4_gameplay4/screen1_scene4_secretary.mp3'}, sounds: [] },
      { voice: { path: 'voice_and_sound/scene4_gameplay4/screen1_scene4_posetitel.mp3'}, sounds: [] },
    ],
  },
  // Сюжетная сцена 5
  {
    // До появления Толстого — тот же фон, что в сцене 4.
    music: { path: 'voice_and_sound/scene4_gameplay4/plot4_background.mp3', loop: true },
    transition: {
    type: 'crossfade',
    fadeOutDuration: 1,
    fadeInDuration: 1,
    fadeOutDelay: 0,
    fadeInDelay: 1,
  },
    transitionSound: {
      path: 'ui/swipe.mp3', // Отдельный эффект перехода
      volume: 1,
      delay: 0,                // Проиграть сразу при входе
    },
    sounds: [], // Звуки при входе в сцену, например { path: 'voice_and_sound/intro.mp3' }
    screens: [
      { voice: { path: 'voice_and_sound/scene5_gameplay5/plot/screen1_scene5_boy.mp3'}, sounds: [] },
      { voice: { path: 'voice_and_sound/scene5_gameplay5/plot/screen1_scene5_posetitel.mp3'}, sounds: [] },
      {
        // С первой реплики Толстого фон меняется.
        music: { path: 'voice_and_sound/scene5_gameplay5/plot/plot5_screen2_scene5_background2.mp3', loop: true },
        voice: { path: 'voice_and_sound/scene5_gameplay5/plot/screen2_scene5_tolstoy.mp3'},
        sounds: [],
      },
      { voice: { path: 'voice_and_sound/scene5_gameplay5/plot/screen2_scene5_posetitel.mp3',}, sounds: [] },
      { voice: { path: 'voice_and_sound/scene5_gameplay5/plot/screen2_scene5_tolstoy2.mp3'}, sounds: [] },
      { voice: { path: 'voice_and_sound/scene5_gameplay5/plot/screen2_scene5_posetitel2.mp3'}, sounds: [] },
    ],
  },
  // Сюжетная сцена 6
  {
    music: { path: 'music/music_menu_2.mp3', volume: 0.2, loop: true },
    transition: {
    type: 'crossfade',
    fadeOutDuration: 1,
    fadeInDuration: 1,
    fadeOutDelay: 0,
    fadeInDelay: 1,
  },
    transitionSound: {
      path: 'ui/swipe.mp3', // Отдельный эффект перехода
      volume: 1,
      delay: 0,                // Проиграть сразу при входе
    },
    sounds: [], // Звуки при входе в сцену, например { path: 'voice_and_sound/intro.mp3' }
    screens: [
      { voice: { path: 'voice_and_sound/screen6_gameplay6/screen1_scene6_tolstoy.mp3', delay: 0, margin: 2}, sounds: [] },
    ],
  },
];
