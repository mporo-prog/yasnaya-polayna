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
    music: { path: 'voice_and_sound/scene1_gameplay1_new/plot1_background_1.wav', loop: true }, // { path: 'music/theme.mp3', volume: 0.8, loop: true }
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
      { voice: { path: 'voice_and_sound/scene1_gameplay1_new/screen1_scene1_rasskazchik.wav',}, sounds: [] }, // реплика 1 — 4с
      { voice: { path: 'voice_and_sound/scene1_gameplay1_new/screen2_scene1_sadovnik1.wav', delay: 1, margin: 1}, sounds: [] }, // Экран 2;
      { voice: 'voice_and_sound/screen2_scene1_posetitel1.mp3', sounds: [] }, // Экран 3
      { voice: 'voice_and_sound/scene1_gameplay1_new/screen2_scene1_sadovnik2.wav', sounds: [] },
      { voice: 'voice_and_sound/screen2_scene1_posetitel2.mp3', sounds: [] },
      { voice: {path: 'voice_and_sound/scene1_gameplay1_new/screen_3_scene_1_sadovnik.wav', delay: 2, margin: 0.9}, sounds: [] },
    ],
  },
  // Сюжетная сцена 2
  {
    music: { path: 'voice_and_sound/scene2_gameplay2/plot1_background_2.wav', loop: true }, // { path: 'music/theme.mp3', volume: 0.8, loop: true }
    transition: {
    type: 'crossfade',
    fadeOutDuration: 1,
    fadeInDuration: 1,
    fadeOutDelay: 0,
    fadeInDelay: 1,
  },
    transitionSound: {
      path: 'ui/swipe.wav', // Отдельный эффект перехода
      volume: 1,
      delay: 0,                // Проиграть сразу при входе
    },
    sounds: [], // Звуки при входе в сцену, например { path: 'voice_and_sound/intro.mp3' }
    screens: [
      { voice: { path: 'voice_and_sound/scene2_gameplay2/plot1_background_2.wav'}, sounds: [] },
      { voice: { path: 'voice_and_sound/scene2_gameplay2/screen_1_1_scene2_posetitel1.mp3'}, sounds: [] },
      { voice: { path: 'voice_and_sound/scene2_gameplay2/screen_1_1_scene_2_boy.wav'}, sounds: [] },
      { voice: 'voice_and_sound/scene2_gameplay2/screen_1_1_scene_2_posetitel2.wav', sounds: [] },
      { voice: 'voice_and_sound/scene2_gameplay2/screen_1_1_scene_2_boy2.wav', sounds: [] },
      { voice: 'voice_and_sound/scene2_gameplay2/screen_1_1_scene_2_posetitel3.mp3', sounds: [] },
      { voice: {path: 'voice_and_sound/scene2_gameplay2/screen_1_1_scene_2_boy3.wav'}, sounds: [] },
      { voice: {path: 'voice_and_sound/scene2_gameplay2/screen_1_1_scene_2_posetitel3.wav'}, sounds: [] },
      { voice: {path: 'voice_and_sound/scene2_gameplay2/screen_1_1_scene_2_boy4.wav'}, sounds: [] },
      { voice: {path: 'voice_and_sound/scene2_gameplay2/screen2_scene2_posetitel.mp3'}, sounds: [] },
      { voice: {path: 'voice_and_sound/scene2_gameplay2/new_veter/screen_2_1_scene_2_posetitel.wav'}, sounds: [] },
      { voice: {path: 'voice_and_sound/scene2_gameplay2/screen_3_scene_2_veter_beg.wav'}, sounds: [] },
      { voice: {path: 'voice_and_sound/scene2_gameplay2/screen_4_scene_2_posetitel.wav'}, sounds: [] },
      { voice: {path: 'voice_and_sound/scene2_gameplay2/new_veter/screen5_scene2_posetitel!.wav'}, sounds: [] },
    ],
  },
  // Сюжетная сцена 3
  {
    music: { path: 'voice_and_sound/scene3_gameplay3/plot/plot3_background.wav', loop: true }, // { path: 'music/theme.mp3', volume: 0.8, loop: true }
    transition: {
    type: 'crossfade',
    fadeOutDuration: 1,
    fadeInDuration: 1,
    fadeOutDelay: 0,
    fadeInDelay: 1,
  },
    transitionSound: {
      path: 'ui/swipe.wav', // Отдельный эффект перехода
      volume: 1,
      delay: 0,                // Проиграть сразу при входе
    },
    sounds: [], // Звуки при входе в сцену, например { path: 'voice_and_sound/intro.mp3' }
    screens: [
      { voice: { path: 'voice_and_sound/scene3_gameplay3/plot/screen_1_scene_3_posetitel.wav'}, sounds: [] },
      { voice: { path: 'voice_and_sound/scene3_gameplay3/plot/screen_1_scene_3_sofia1.wav'}, sounds: [] },
      { voice: { path: 'voice_and_sound/scene3_gameplay3/plot/screen_1_scene_3_posetitel2.wav'}, sounds: [] },
      { voice: { path: 'voice_and_sound/scene3_gameplay3/plot/screen_1_scene_3_sofia2.wav', margin: 1.5}, sounds: [] },
      { voice: { path: 'voice_and_sound/scene3_gameplay3/plot/screen_2_scene_3_posetitel.wav'}, sounds: [] },
    ],
  },
  // Сюжетная сцена 4
  {
    // Тот же фон, что в сцене 3.
    music: { path: 'voice_and_sound/scene3_gameplay3/plot/plot3_background.wav', loop: true },
    transition: {
    type: 'crossfade',
    fadeOutDuration: 1,
    fadeInDuration: 1,
    fadeOutDelay: 0,
    fadeInDelay: 1,
  },
    transitionSound: {
      path: 'ui/swipe.wav', // Отдельный эффект перехода
      volume: 1,
      delay: 0,                // Проиграть сразу при входе
    },
    sounds: [], // Звуки при входе в сцену, например { path: 'voice_and_sound/intro.mp3' }
    screens: [
      { voice: { path: 'voice_and_sound/scene4_gameplay4/screen1_scene4_secretary.wav'}, sounds: [] },
      { voice: { path: 'voice_and_sound/scene4_gameplay4/screen1_scene4_posetitel.wav'}, sounds: [] },
    ],
  },
  // Сюжетная сцена 5
  {
    // До появления Толстого — тот же фон, что в сцене 3.
    music: { path: 'voice_and_sound/scene3_gameplay3/plot/plot3_background.wav', loop: true },
    transition: {
    type: 'crossfade',
    fadeOutDuration: 1,
    fadeInDuration: 1,
    fadeOutDelay: 0,
    fadeInDelay: 1,
  },
    transitionSound: {
      path: 'ui/swipe.wav', // Отдельный эффект перехода
      volume: 1,
      delay: 0,                // Проиграть сразу при входе
    },
    sounds: [], // Звуки при входе в сцену, например { path: 'voice_and_sound/intro.mp3' }
    screens: [
      { voice: { path: 'voice_and_sound/scene5_gameplay5/plot/screen1_scene5_boy.wav'}, sounds: [] },
      { voice: { path: 'voice_and_sound/scene5_gameplay5/plot/screen1_scene5_posetitel.wav'}, sounds: [] },
      {
        // С первой реплики Толстого фон меняется.
        music: { path: 'voice_and_sound/scene5_gameplay5/plot/plot5_screen2_scene5_background2.wav', loop: true },
        voice: { path: 'voice_and_sound/scene5_gameplay5/plot/screen2_scene5_tolstoy.wav'},
        sounds: [],
      },
      { voice: { path: 'voice_and_sound/scene5_gameplay5/plot/screen2_scene5_posetitel.wav',}, sounds: [] },
      { voice: { path: 'voice_and_sound/scene5_gameplay5/plot/screen2_scene5_tolstoy2.wav'}, sounds: [] },
      { voice: { path: 'voice_and_sound/scene5_gameplay5/plot/screen2_scene5_posetitel2.wav'}, sounds: [] },
    ],
  },
  // Сюжетная сцена 6
  {
    music: null, // { path: 'music/theme.mp3', volume: 0.8, loop: true }
    transition: {
    type: 'crossfade',
    fadeOutDuration: 1,
    fadeInDuration: 1,
    fadeOutDelay: 0,
    fadeInDelay: 1,
  },
    transitionSound: {
      path: 'ui/swipe.wav', // Отдельный эффект перехода
      volume: 1,
      delay: 0,                // Проиграть сразу при входе
    },
    sounds: [], // Звуки при входе в сцену, например { path: 'voice_and_sound/intro.mp3' }
    screens: [
      { voice: { path: 'voice_and_sound/screen6_gameplay6/screen1_scene6_tolstoy.wav', delay: 0, margin: 2}, sounds: [] },
    ],
  },
];
