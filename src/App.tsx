import { useEffect, useState } from 'react';
import { GameState, SavedProgress } from './types';
import { soundEngine } from './utils/audio';
import GameUI from './components/GameUI';
import UnityScriptsViewer from './components/UnityScriptsViewer';
import { Shield, Volume2, Gamepad2, Info, FileCode, Check, RefreshCw, Star, Trash2 } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'nocturnal_terror_saves_v2';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [selectedNight, setSelectedNight] = useState<number>(1);
  const [progress, setProgress] = useState<SavedProgress>({
    unlockedNight: 1,
    highscoreSeconds: 0
  });

  const [soundUnlocked, setSoundUnlocked] = useState<boolean>(false);

  // Load savings progress
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.unlockedNight) {
          setProgress(parsed);
          setSelectedNight(parsed.unlockedNight);
        }
      }
    } catch (e) {
      console.warn("Storage failed to load, using default progress:", e);
    }
  }, []);

  const saveProgress = (updated: SavedProgress) => {
    setProgress(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}
  };

  const handleSoundUnlock = () => {
    soundEngine.init();
    soundEngine.playLight();
    setSoundUnlocked(true);
  };

  const startNewGame = () => {
    handleSoundUnlock();
    setSelectedNight(1);
    setGameState(GameState.PLAYING);
  };

  const continueGame = () => {
    handleSoundUnlock();
    setSelectedNight(progress.unlockedNight);
    setGameState(GameState.PLAYING);
  };

  const startCustomNight = (n: number) => {
    handleSoundUnlock();
    setSelectedNight(n);
    setGameState(GameState.PLAYING);
  };

  const handleVictory = () => {
    // Escalate unlocked nights
    const nextUnlocked = Math.min(6, progress.unlockedNight + 1);
    const updated = {
      unlockedNight: nextUnlocked,
      highscoreSeconds: Math.max(progress.highscoreSeconds, 300)
    };
    saveProgress(updated);
    setGameState(GameState.MENU);
    setSelectedNight(nextUnlocked);
  };

  const resetProgress = () => {
    if (confirm("Ви дійсно бажаєте повністю скинути ігровий прогрес до першої ночі?")) {
      const resetState = { unlockedNight: 1, highscoreSeconds: 0 };
      saveProgress(resetState);
      setSelectedNight(1);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] flex flex-col font-sans select-none relative overflow-x-hidden">
      {/* Dynamic hardware CRT Scanline Overlay from Elegant Dark theme */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03]" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 4px, 3px 100%' }}></div>

      {/* Decorative analog depth vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/60 to-[#050505] z-0 pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-4 py-6 flex-1 flex flex-col justify-between z-10 relative">

        {/* Global Hub Navigation Header */}
        <header className="flex justify-between items-center border-b border-[#1a1a1a] pb-4 mb-4 font-mono">
          <div className="flex items-center gap-3">
            <span className="p-1.5 bg-red-950/30 border border-red-900/40 rounded text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <Shield className="h-5 w-5 animate-pulse" />
            </span>
            <div>
              <h1 className="text-sm font-bold tracking-[0.15em] text-[#e0e0e0] uppercase">
                NOCTURNAL TERROR: ABANDONED HUB
              </h1>
              <p className="text-[9px] text-gray-500 tracking-widest uppercase mt-0.5">
                Night Ops Telemetry // PROTOCOL-09
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Playable sound verification controller badge */}
            {!soundUnlocked ? (
              <button
                id="btn-unlock-sound-header"
                onClick={handleSoundUnlock}
                className="flex items-center gap-2 bg-yellow-950/20 hover:bg-yellow-900/30 text-yellow-500 border border-yellow-500/30 px-3 py-1.5 rounded text-[10px] tracking-wider transition font-mono cursor-pointer"
              >
                <Volume2 className="h-4 w-4 animate-bounce" />
                <span>УВІМКНУТИ ЗВУК</span>
              </button>
            ) : (
              <span className="text-[9px] font-mono text-green-500 bg-green-950/20 border border-green-500/30 px-3 py-1.5 rounded flex items-center gap-2 tracking-wider animate-signal">
                <Check className="h-3 w-3 animate-ping" />
                ЗВУКОВИЙ СУБ-МОДУЛЬ АКТИВНИЙ
              </span>
            )}

            {gameState !== GameState.MENU && (
              <button
                id="btn-return-menu-header"
                onClick={() => setGameState(GameState.MENU)}
                className="text-xs bg-[#0a0a0a] border border-[#1a1a1a] hover:border-gray-700 hover:bg-black px-3 py-1.5 rounded transition cursor-pointer font-mono text-gray-400 hover:text-[#e0e0e0]"
              >
                Вийти в Меню
              </button>
            )}
          </div>
        </header>

        {/* Main Render Section */}
        <main className="flex-1 flex flex-col justify-center my-4">
          {gameState === GameState.PLAYING && (
            <div className="animate-fade-in relative">
              <GameUI
                night={selectedNight}
                onVictory={handleVictory}
                onExitMenu={() => setGameState(GameState.MENU)}
              />
            </div>
          )}

          {gameState === GameState.MENU && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch animate-fade-in font-mono">
              {/* Left Column: Cyber-Retro Cassette Start Screen */}
              <div className="lg:col-span-12 xl:col-span-5 bg-[#0a0a0a] border-2 border-[#1a1a1a] rounded-lg p-6 flex flex-col justify-between shadow-[0_0_30px_rgba(0,0,0,1)] relative">
                {/* Glitch logo container */}
                <div className="mb-6 relative">
                  <div className="text-[10px] font-mono text-red-500/80 tracking-[0.2em] mb-1.5 font-bold uppercase">
                    Facility Core v2.04 // ON_LINE
                  </div>
                  <h1 className="text-4xl font-black font-mono tracking-tighter text-[#e0e0e0] uppercase select-none">
                    НІЧНИЙ ЖАХ
                  </h1>
                  <h2 className="text-sm font-bold font-mono tracking-widest text-red-500 uppercase flex items-center gap-2 mt-1">
                    Занедбаний Хаб 
                    <span className="w-2.5 h-2.5 bg-red-600 rounded-full inline-block animate-pulse shadow-[0_0_8px_#dc2626]" />
                  </h2>
                  <p className="text-xs text-gray-400 font-sans mt-4 leading-relaxed">
                    Розважальний центр закрито внаслідок збою мікропроцесорів та зникнення нічного сторожа. 
                    Виживіть 6 нічних змін з 12 до 6 ранку за допомогою планшета камер та важких протипожежних дверей. 
                    Слідкуйте за залишком електроенергії!
                  </p>
                </div>

                {/* Core Action Menu Buttons Selection */}
                <div className="space-y-3 my-6 font-mono">
                  {/* Play Main Night Start */}
                  <button
                    id="btn-new-game"
                    onClick={startNewGame}
                    className="w-full bg-red-950/20 hover:bg-red-900/30 text-red-500 border border-red-500/50 font-bold py-3 rounded flex items-center justify-center gap-3 transition shadow-[0_0_15px_rgba(239,68,68,0.1)] text-xs tracking-widest uppercase cursor-pointer"
                  >
                    <Gamepad2 className="h-4 w-4" />
                    <span>НОВА ГРА (ОФІС А)</span>
                  </button>

                  {/* Continue Saved Level */}
                  <button
                    id="btn-continue-game"
                    onClick={continueGame}
                    className="w-full bg-[#121212] hover:bg-zinc-900 text-gray-300 border border-[#222] font-bold py-3 rounded flex items-center justify-center gap-3 transition text-xs tracking-widest uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="h-4 w-4 text-green-500" />
                    <span>ПРОДОВЖИТИ НІЧ {progress.unlockedNight}</span>
                  </button>

                  {/* Open Unity script viewers section */}
                  <button
                    id="btn-view-unity-scripts"
                    onClick={() => setGameState(GameState.UNITY_CODE)}
                    className="w-full bg-[#0a0a0a] hover:bg-[#121212] text-gray-400 hover:text-gray-300 border border-[#1a1a1a] font-bold py-3 rounded flex items-center justify-center gap-3 transition text-xs tracking-widest uppercase cursor-pointer"
                  >
                    <FileCode className="h-4 w-4 text-gray-500" />
                    <span>ПЕРЕГЛЯНУТИ ШАБЛОНИ C# UNITY</span>
                  </button>
                </div>

                {/* Levels selector (1 to 6) list row */}
                <div className="border border-[#1a1a1a] bg-black rounded p-3.5">
                  <p className="text-[9px] font-mono text-gray-500 tracking-[0.2em] mb-3 text-center uppercase font-bold">
                    СЕКТОРНИЙ ВИБІР ЗМІНИ (1-6)
                  </p>
                  <div className="grid grid-cols-6 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((n) => {
                      const isUnlocked = n <= progress.unlockedNight;
                      return (
                        <button
                          key={n}
                          id={`btn-select-night-${n}`}
                          onClick={() => {
                            if (isUnlocked) startCustomNight(n);
                            else alert(`Ніч ${n} ще заблокована! Пройдіть попередні зміни.`);
                          }}
                          className={`py-2 rounded font-mono text-xs font-bold transition flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                            isUnlocked
                              ? selectedNight === n
                                ? 'bg-red-950/40 border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                                : 'bg-[#121212] border-[#222] hover:bg-zinc-900 hover:border-zinc-700 text-gray-300'
                              : 'bg-black border-[#111] text-gray-700 cursor-not-allowed opacity-30'
                          }`}
                        >
                          <span>{n}</span>
                          {n === 6 && isUnlocked && <Star className="h-2.5 w-2.5 text-red-500 animate-pulse" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Erase values data */}
                <div className="mt-4 pt-4 border-t border-[#1a1a1a] flex justify-between items-center text-[10px] font-mono text-gray-550 uppercase tracking-wider">
                  <span>HighScore: {progress.highscoreSeconds > 0 ? `${progress.highscoreSeconds}с виживання` : 'немає'}</span>
                  {progress.unlockedNight > 1 && (
                    <button
                      id="btn-reset-saves"
                      onClick={resetProgress}
                      className="text-red-500/80 hover:text-red-500 flex items-center gap-1 transition cursor-pointer font-bold text-[9px] tracking-wider"
                    >
                      <Trash2 className="h-3 w-3" />
                      Скинути Прогрес
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Characters Intel (Bestiary) and Instructions */}
              <div className="lg:col-span-12 xl:col-span-7 space-y-4 flex flex-col justify-between font-mono">
                {/* Visual game control notes */}
                <div className="bg-[#0a0a0a] border-2 border-[#1a1a1a] rounded-lg p-5 shadow-[0_0_20px_rgba(0,0,0,1)]">
                  <h3 className="text-xs font-bold font-mono tracking-[0.2em] text-red-500/90 flex items-center gap-2 uppercase">
                    <Info className="h-4 w-4 text-red-500" />
                    Інструкція з виживання (Tactical Data)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs leading-relaxed text-[#c0c0c0]">
                    <div className="space-y-1">
                      <p className="font-mono text-gray-300 uppercase tracking-wider text-[11px] font-bold">💻 Робоче Місце:</p>
                      <p className="text-gray-400">• Рухайте мишкою вліво/вправо по екрану, щоб дивитись навколо офісу.</p>
                      <p className="text-gray-400">• Натискайте кнопки біля дверей для закриття заслінок та ліхтарів.</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-mono text-gray-300 uppercase tracking-wider text-[11px] font-bold">📡 Супутникові камери:</p>
                      <p className="text-gray-400">• Тисніть велику кнопку внизу, щоб підняти планшет камер.</p>
                      <p className="text-gray-400">• Вибирайте камери на мапі праворуч для відстеження аніматроніків у реальному часі.</p>
                    </div>
                  </div>
                  <div className="mt-3.5 p-2.5 bg-yellow-950/10 border border-yellow-500/30 text-[10px] text-yellow-500 uppercase font-mono rounded flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-ping shrink-0" />
                    <span>⚡ Рівень утилізації енергії зростає з кожною піднятою заслінкою двері або увімкненим світлом!</span>
                  </div>
                </div>

                {/* Cyber bestiary card models catalog list */}
                <div className="bg-[#0a0a0a] border-2 border-[#1a1a1a] rounded-lg p-5 shadow-[0_0_20px_rgba(0,0,0,1)] flex-1 flex flex-col justify-between">
                  <h3 className="text-xs font-bold font-mono tracking-[0.2em] text-[#e0e0e0] uppercase mb-3">
                    Хаб аніматроніків (Threat Core Intel)
                  </h3>

                  <div className="space-y-3 flex-1 overflow-y-auto pr-1 max-h-[240px]">
                    {[
                      {
                        name: 'Blinky (Ведмідь)',
                        color: 'text-red-500',
                        bg: 'border-red-900/20 bg-red-950/5',
                        role: 'Mascot Solo',
                        text: 'Активується першим. Повільно марширує лівим проходом. Коли в кімнаті горить світло, його тінь видно у лівому вікні. Швидко закрийте Ліві двері!'
                      },
                      {
                        name: 'Ziggy (Кролик)',
                        color: 'text-purple-450',
                        bg: 'border-purple-900/20 bg-purple-950/5',
                        role: 'Speed Reroute',
                        text: 'Спринтер, що біжить правою вентиляцією. Щойно чути залізний звук скреготу - миттєво тисніть ЛІХТАР справа або одразу закривайте Праві двері!'
                      },
                      {
                        name: 'Hexa Sirena (Сирена)',
                        color: 'text-green-500',
                        bg: 'border-green-900/20 bg-green-950/5',
                        role: 'Tech Saboteur',
                        text: 'Скритна пташка. Йде лівим ходом. Її наближення супроводжується сильними білими шумами звʼязку та падінням сигналу на сусідніх камерах.'
                      },
                      {
                        name: 'Glitcher (Секретна Тінь)',
                        color: 'text-yellow-500',
                        bg: 'border-yellow-900/20 bg-yellow-950/5',
                        role: 'Drone Alert',
                        text: 'Ховається на задньому складі сувенірів (КАМ 8). Завжди переглядайте КАМ 8 на планшеті, і тисніть "Перевантажити", оскільки його збій 100% означає смерть.'
                      }
                    ].map((bot, idx) => (
                      <div key={idx} className={`p-3 rounded border flex flex-col justify-between leading-normal ${bot.bg}`}>
                        <div className="flex justify-between items-center font-mono">
                          <span className={`text-[11px] font-bold tracking-wider ${bot.color}`}>{bot.name.toUpperCase()}</span>
                          <span className="text-[8px] text-gray-400 border border-gray-800 px-1.5 py-0.5 rounded tracking-widest uppercase">{bot.role}</span>
                        </div>
                        <p className="text-[11px] text-[#b0b0b0] mt-1.5 font-sans leading-relaxed">{bot.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {gameState === GameState.UNITY_CODE && (
            <div className="space-y-4 animate-fade-in">
              {/* Back to main action button */}
              <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-lg p-3">
                <span className="text-xs text-slate-300 font-sans">
                  Перегляньте та скопіюйте чисті, документовані скрипти на мові <strong>C# (.cs)</strong> для вашої власної 3D гри в <strong>Unity 2022+ / 2023+</strong>.
                </span>
                <button
                  id="btn-exit-code-viewer"
                  onClick={() => setGameState(GameState.MENU)}
                  className="bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-mono font-bold px-4 py-2 rounded transition shadow cursor-pointer uppercase shrink-0"
                >
                  Повернутись в Меню
                </button>
              </div>

              {/* Unity C# component renderer */}
              <UnityScriptsViewer />
            </div>
          )}
        </main>

        {/* Global Footer info labels */}
        <footer className="mt-4 pt-4 border-t border-slate-900 text-center font-mono text-[10px] text-slate-600 flex flex-col md:flex-row justify-between gap-2">
          <span>🎮 Ігровий проект: Нічний Жах в Neon Oasis (Five Nights clone)</span>
          <span>Розроблено за допомогою React + Three.js + Unity C# Export API</span>
        </footer>

      </div>
    </div>
  );
}
