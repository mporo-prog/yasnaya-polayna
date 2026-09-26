/**
 * Аудио сюжетных сцен, в том же порядке, что storyBackgrounds/storyLines.
 * Пути — относительно resource/sound; все времена — в секундах.
 * music: null — затухание до тишины; без поля music — продолжать текущую музыку.
 * Реальные записи пока не назначены. Пример заполнения есть в docs/audio.md.
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
      { sounds: [] }, // Экран 1
      { sounds: [] }, // Экран 2; можно также задать music и transition
      { sounds: [] }, // Экран 3
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
