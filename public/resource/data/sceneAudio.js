/** Музыка/эффекты меню и мини-игр. Формат тот же, что в storyAudio.js. */
window.VN.data.sceneAudio = {
  // С общим коэффициентом музыки 0.8 итоговый уровень главного меню равен 0.7.
  MainMenuScene: { music: { path: 'music/menu_Music_1.mp3', volume: 0.7 / 0.8, loop: true } },
  PauseScene: { music: { path: 'music/music_menu_2.mp3', loop: true } },
  GameScene1: { music: null, transition: {
    type: 'fadeout',
    duration: 1,
    delay: 0,
    },
    sounds: [{ path: 'voice_and_sound/scene1_gameplay1_new/gameplay1_rasskazchik.mp3', loop: false }]
  },
  // Озвучку правил игр 2 и 5 проигрывают сами сцены (их можно прервать).
  GameScene2: { music: { path: 'music/music_gameplay_2.mp3', loop: true } },
  GameScene3: {
    music: { path: 'music/music_gameplay_3.mp3', loop: true },
    // Общий файл всех реплик рассказчика; на экране правил нужны первые 2 с.
    sounds: [{ path: 'voice_and_sound/scene3_gameplay3/GAMEPLAY3_NEW/gameplay_scene_3_rasskazchik_all.mp3', duration: 2 }]
  },
  GameScene4: {
    music: { path: 'music/music_gameplay_4.mp3', loop: true },
    sounds: [{ path: 'voice_and_sound/scene4_gameplay4/gameplay_scene_4_rasskazchik1.mp3', loop: false }],
    // Экран 0 — правила; экран 1 — победа.
    screens: [
      {},
      { sounds: [{ path: 'voice_and_sound/scene4_gameplay4/gameplay_scene_4_rasskazchik.mp3', loop: false }] }
    ]
  },
  QuoteMinigameScene: {
    music: { path: 'music/music_gameplay_5.mp3', loop: true },
    sounds: [{ path: 'voice_and_sound/scene5_gameplay5/gameplay/gameplay_scene_5_rasskazchik.mp3', loop: false }]
  },
  PlaceholderMinigameScene: { music: null },
  // Настройки продолжают музыку того меню, из которого были открыты.
};
