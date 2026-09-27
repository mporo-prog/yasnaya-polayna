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
      { sounds: [{path: "voice_and_sound/screen1_scene1_rasskazchik.wav", loop: false}] }, // Экран 1
      { sounds: [{path: "voice_and_sound/screen2_scene1_sadovnik1.wav", loop: false,transition: {type: 'fadeout', duration: 0.1, delay: 0 }}]}, // Экран 2; можно также задать music и transition
      { sounds: [{path: "voice_and_sound/screen2_scene1_posetitel1.mp3", loop: false,transition: {type: 'fadeout', duration: 0.1, delay: 0 }}] }, // Экран 3
      { sounds: [{path: "voice_and_sound/screen2_scene1_sadovnik2.wav", loop: false,transition: {type: 'fadeout', duration: 0.1, delay: 0 }}] },
      { sounds: [{path: "voice_and_sound/screen2_scene1_posetitel2.mp3", loop: false,transition: {type: 'fadeout', duration: 0.1, delay: 0 }}] },
      { sounds: [{path: "voice_and_sound/screen_3_scene_1_sadovnik.wav", loop: false,transition: {type: 'fadeout', duration: 0.1, delay: 0 }}] },
    ],
  },
  // Сюжетная сцена 2
  { music: null, sounds: [], screens: [{ sounds: [] }, { sounds: [] }, { sounds: [] }] },
  // Сюжетная сцена 3
  { music: null, sounds: [], screens: [{ sounds: [] }, { sounds: [] }, { sounds: [] }] },
  // Сюжетная сцена 4
  { music: null, sounds: [], screens: [{ sounds: [] }, { sounds: [] }, { sounds: [] }] },
  // Сюжетная сцена 5
  { music: null, sounds: [], screens: [{ sounds: [] }, { sounds: [] }, { sounds: [] }] },
  // Сюжетная сцена 6
  { music: null, sounds: [], screens: [{ sounds: [] }, { sounds: [] }, { sounds: [] }] },
];
