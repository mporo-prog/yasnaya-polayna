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
    music: { path: 'voice_and_sound/test_ptica_zvuki.mp3', loop: true }, // { path: 'music/theme.mp3', volume: 0.8, loop: true }
    transition: {
    type: 'crossfade',
    fadeOutDuration: 1,
    fadeInDuration: 1,
    fadeOutDelay: 0,
    fadeInDelay: 0.5,
  },
    transitionSound: null, // { path: 'ui/transition.mp3', volume: 0.6, delay: 0 }
    sounds: [], // Звуки при входе в сцену, например { path: 'voice_and_sound/intro.mp3' }
    screens: [
      { voice: { path: 'voice_and_sound/screen1_scene1_rasskazchik.wav', delay: 4, margin: 1}, sounds: [] }, // реплика 1 — 4с
      { voice: { path: 'voice_and_sound/screen2_scene1_sadovnik1.wav', delay: 3.2, margin: 0.9}, sounds: [] }, // Экран 2; 
      { voice: 'voice_and_sound/screen2_scene1_posetitel1.mp3', sounds: [] }, // Экран 3
      { voice: 'voice_and_sound/screen2_scene1_sadovnik2.wav', sounds: [] },
      { voice: 'voice_and_sound/screen2_scene1_posetitel2.mp3', sounds: [] },
      { voice: {path: 'voice_and_sound/screen_3_scene_1_sadovnik.wav', delay: 2, margin: 0.9}, sounds: [] },
    ],
  },
  // Сюжетная сцена 2
  {
    music: { path: 'voice_and_sound/plot1_background_2.wav', loop: true }, // { path: 'music/theme.mp3', volume: 0.8, loop: true }
    transition: {
    type: 'crossfade',
    fadeOutDuration: 1,
    fadeInDuration: 1,
    fadeOutDelay: 0,
    fadeInDelay: 0.5,
  },
    transitionSound: null, // { path: 'ui/transition.mp3', volume: 0.6, delay: 0 }
    sounds: [], // Звуки при входе в сцену, например { path: 'voice_and_sound/intro.mp3' }
    screens: [
      { voice: { path: 'voice_and_sound/plot1_background_2.wav'}, sounds: [] },
      { voice: { path: 'voice_and_sound/screen_1_1_scene2_posetitel1.mp3'}, sounds: [] },
      { voice: { path: 'voice_and_sound/screen_1_1_scene_2_boy.wav'}, sounds: [] },
      { voice: 'voice_and_sound/screen_1_1_scene_2_posetitel2.wav', sounds: [] },
      { voice: 'voice_and_sound/screen_1_1_scene_2_boy2.wav', sounds: [] },
      { voice: 'voice_and_sound/screen_1_1_scene_2_posetitel3.mp3', sounds: [] },
      { voice: {path: 'voice_and_sound/screen_1_1_scene_2_boy3.wav'}, sounds: [] },
      { voice: {path: 'voice_and_sound/screen_1_1_scene_2_posetitel3.wav'}, sounds: [] },
      { voice: {path: 'voice_and_sound/screen_1_1_scene_2_boy4.wav'}, sounds: [] },
      { voice: {path: 'voice_and_sound/screen2_scene2_posetitel.mp3'}, sounds: [] },
      { voice: {path: 'voice_and_sound/screen_2_1_scene_2_posetitel.wav'}, sounds: [] },
      { voice: {path: 'voice_and_sound/screen_3_scene_2_veter_beg.wav'}, sounds: [] },
      { voice: {path: 'voice_and_sound/screen_4_scene_2_posetitel.wav'}, sounds: [] },
      { voice: {path: 'voice_and_sound/screen5_scene2_posetitel.wav'}, sounds: [] },
    ],
  },
  // Сюжетная сцена 3
  {
    music: { path: 'voice_and_sound/plot3_background.wav', loop: true }, // { path: 'music/theme.mp3', volume: 0.8, loop: true }
    transition: {
    type: 'crossfade',
    fadeOutDuration: 1,
    fadeInDuration: 1,
    fadeOutDelay: 0,
    fadeInDelay: 0.5,
  },
    transitionSound: null, // { path: 'ui/transition.mp3', volume: 0.6, delay: 0 }
    sounds: [], // Звуки при входе в сцену, например { path: 'voice_and_sound/intro.mp3' }
    screens: [
      { voice: { path: 'voice_and_sound/screen_1_scene_3_posetitel.wav'}, sounds: [] },
      { voice: { path: 'voice_and_sound/screen_1_scene_3_sofia1.wav'}, sounds: [] },
      { voice: { path: 'voice_and_sound/screen_1_scene_3_posetitel2.wav'}, sounds: [] },
      { voice: { path: 'voice_and_sound/screen_1_scene_3_sofia2.wav', margin: 1.5}, sounds: [] },
      { voice: { path: 'voice_and_sound/screen_2_scene_3_posetitel.wav'}, sounds: [] },
    ],
  },
  // Сюжетная сцена 4
  {
    music: null, // { path: 'music/theme.mp3', volume: 0.8, loop: true }
    transition: {
    type: 'crossfade',
    fadeOutDuration: 1,
    fadeInDuration: 1,
    fadeOutDelay: 0,
    fadeInDelay: 0.5,
  },
    transitionSound: null, // { path: 'ui/transition.mp3', volume: 0.6, delay: 0 }
    sounds: [], // Звуки при входе в сцену, например { path: 'voice_and_sound/intro.mp3' }
    screens: [
      { voice: { path: 'voice_and_sound/screen1_scene4_secretary.wav'}, sounds: [] },
      { voice: { path: 'voice_and_sound/screen1_scene4_posetitel.wav'}, sounds: [] },
    ],
  },
  // Сюжетная сцена 5
  {
    music: null, // { path: 'music/theme.mp3', volume: 0.8, loop: true }
    transition: {
    type: 'crossfade',
    fadeOutDuration: 1,
    fadeInDuration: 1,
    fadeOutDelay: 0,
    fadeInDelay: 0.5,
  },
    transitionSound: null, // { path: 'ui/transition.mp3', volume: 0.6, delay: 0 }
    sounds: [], // Звуки при входе в сцену, например { path: 'voice_and_sound/intro.mp3' }
    screens: [
      { voice: { path: 'voice_and_sound/screen1_scene5_boy.wav'}, sounds: [] },
      { voice: { path: 'voice_and_sound/screen1_scene5_posetitel.wav'}, sounds: [] },
      { voice: { path: 'voice_and_sound/screen2_scene5_tolstoy.wav'}, sounds: [] },
      { voice: { path: 'voice_and_sound/screen2_scene5_posetitel.wav',}, sounds: [] },
      { voice: { path: 'voice_and_sound/screen2_scene5_tolstoy2.wav'}, sounds: [] },
      { voice: { path: 'voice_and_sound/screen2_scene5_posetitel2.wav'}, sounds: [] },
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
    fadeInDelay: 0.5,
  },
    transitionSound: null, // { path: 'ui/transition.mp3', volume: 0.6, delay: 0 }
    sounds: [], // Звуки при входе в сцену, например { path: 'voice_and_sound/intro.mp3' }
    screens: [
      { voice: { path: 'voice_and_sound/screen1_scene6_tolstoy.wav'}, sounds: [] },
    ],
  },
];