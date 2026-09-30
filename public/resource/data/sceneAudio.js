/** Музыка/эффекты меню и мини-игр. Формат тот же, что в storyAudio.js. */
window.VN.data.sceneAudio = {
  MainMenuScene: { music: { path: 'music/menu_Music_1.wav', loop: true } },
  PauseScene: { music: { path: 'music/music_menu_2.wav', loop: true } },
  GameScene1: { music: null, transition: {
    type: 'fadeout',
    duration: 1,
    delay: 0,
    },
    sounds: [{path: "voice_and_sound/gameplay1_rasskazchik.mp3", loop: false}]
  },
  GameScene2: { music: null },
  GameScene3: {
    music: null,
    sounds: [{ path: 'voice_and_sound/game3.wav', loop: false }]
  },
  GameScene4: {
    music: null,
    sounds: [{ path: 'voice_and_sound/game4.wav', loop: false }]
  },
  QuoteMinigameScene: { music: null },
  PlaceholderMinigameScene: { music: null },
  // Настройки продолжают музыку того меню, из которого были открыты.
};
