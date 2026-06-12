import { useEffect, useState, useRef } from 'react';
import { GameState, Animatronic, CAMERAS, AnimatronicType } from '../types';
import { soundEngine } from '../utils/audio';
import ThreeScene from './ThreeScene';
import CctvView from './CctvView';
import { Shield, VolumeX, Volume2, ShieldAlert, Zap, Radio, AlertTriangle } from 'lucide-react';

interface GameUIProps {
  night: number;
  onVictory: () => void;
  onExitMenu: () => void;
}

const BASE_ANIMATRONICS: Animatronic[] = [
  {
    id: 'BLINKY',
    name: 'Blinky',
    nameUk: 'Ведмідь Блінкі ( mascot )',
    description: 'Веселий ведмедик із поламаною щелепою та пронизливими червоними сенсорами. Рухається лівим боком.',
    avatarColor: '#ff2222',
    behaviorUk: 'Повільний, але наполегливий. Йде: Сцена -> Обедіння -> Ліва Вент. -> Ліві Двері. Потребує закриття лівих дверей.',
    behaviorEn: 'Slow but persistent. Follows left hallway. Close Left Door when visible under hallway light.',
    currentCam: 'STAGE',
    aiLevel: 3,
    movementTimer: 8,
    path: ['STAGE', 'DINING', 'VENT_L', 'OFFICE_L'],
    attackDoor: 'LEFT',
    lastMoveStatus: 'STATIONARY'
  },
  {
    id: 'ZIGGY',
    name: 'Ziggy',
    nameUk: 'Заєць Зіггі ( speedster )',
    description: 'Швидкісний кролик із деформованими вухами. Його залізні кігті видають гучний скрегіт по залізу.',
    avatarColor: '#a29bfe',
    behaviorUk: 'Надзвичайно швидкий рух. Йде: Автомати -> Права Вент -> Праві Двері. Потребує реакції у закритті правих дверей.',
    behaviorEn: 'Extremely fast logic. Follows right hallway. When you hear a metallic scratch, check right light/door immediately.',
    currentCam: 'ARCADE',
    aiLevel: 2,
    movementTimer: 6,
    path: ['ARCADE', 'VENT_R', 'OFFICE_R'],
    attackDoor: 'RIGHT',
    lastMoveStatus: 'STATIONARY'
  },
  {
    id: 'SIRENA',
    name: 'Sirena',
    nameUk: 'Сирена Хекса ( support )',
    description: 'Птахоподібний робот із аудіо-сиренами замість вух. Поглинає радіосигнали та пригнічує звʼязок.',
    avatarColor: '#55efc4',
    behaviorUk: 'Любить ховатись у глибині. Йде: Сцена -> Дитяча зона -> Ліва вент. Створює звукові перешкоди та дрейфує.',
    behaviorEn: 'Stealthy. Infiltrates via vents. Audio signals static when she gets close. Close left door immediately.',
    currentCam: 'STAGE',
    aiLevel: 2,
    movementTimer: 10,
    path: ['STAGE', 'KIDS_PLAY', 'VENT_L', 'OFFICE_L'],
    attackDoor: 'LEFT',
    lastMoveStatus: 'STATIONARY'
  },
  {
    id: 'GLITCHER',
    name: 'Glitcher',
    nameUk: 'Глітчер ( security drone )',
    description: 'Старий дрон за касою сувенірів. Не витримує відсутності спостереження — ламає камери.',
    avatarColor: '#ff7675',
    behaviorUk: 'Ховається на КАМ 8 (Prize Corner). Якщо ви не переглядаєте цю камеру періодично, він активується і ламає камери.',
    behaviorEn: 'Stays in CAM 8. If ignored, his glitch bar climbs to 100%, causing a total cameras crash and sudden office attack.',
    currentCam: 'PRIZE',
    aiLevel: 4,
    movementTimer: 12,
    path: ['PRIZE'],
    attackDoor: 'CENTER',
    lastMoveStatus: 'STATIONARY'
  }
];

export default function GameUI({ night, onVictory, onExitMenu }: GameUIProps) {
  const [gameState, setGameState] = useState<GameState>(GameState.PLAYING);
  const [power, setPower] = useState<number>(100);
  const [clockHour, setClockHour] = useState<number>(12);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);

  // Office States
  const [leftDoorClosed, setLeftDoorClosed] = useState<boolean>(false);
  const [rightDoorClosed, setRightDoorClosed] = useState<boolean>(false);
  const [leftLightOn, setLeftLightOn] = useState<boolean>(false);
  const [rightLightOn, setRightLightOn] = useState<boolean>(false);

  // CTV Tablet States
  const [tabletOpen, setTabletOpen] = useState<boolean>(false);
  const [selectedCam, setSelectedCam] = useState<string>('STAGE');
  const [glitchLevel, setGlitchLevel] = useState<number>(0);
  const [cameraGlitching, setCameraGlitching] = useState<boolean>(false);

  // Glitcher critical activation progression (0 - 100%)
  const [glitcherMeter, setGlitcherMeter] = useState<number>(5);

  // Audio cassete/narrator lines
  const [phoneSubtitle, setPhoneSubtitle] = useState<string>('');

  // Loaded Animatronics in game session
  const [animatronics, setAnimatronics] = useState<Animatronic[]>(() => {
    // Escalate difficulties scale proportionally based on night selected
    return BASE_ANIMATRONICS.map(a => {
      let calcAi = a.aiLevel;
      if (a.id === 'BLINKY') calcAi = Math.min(20, night * 3.5);
      if (a.id === 'ZIGGY') calcAi = Math.min(20, night * 4.2 - 1.5);
      if (a.id === 'SIRENA') calcAi = Math.min(20, night * 3.1);
      if (a.id === 'GLITCHER') calcAi = Math.min(20, night * 2.8 + 2.5);

      return {
        ...a,
        aiLevel: Math.round(calcAi)
      };
    });
  });

  const [killerName, setKillerName] = useState<string>('');
  const [killerNameEn, setKillerNameEn] = useState<string>('');

  // Core Loop interval
  const gameIntervalRef = useRef<any>(null);

  useEffect(() => {
    // Start procedural hum
    soundEngine.startAmbient();

    // Begin cassava player telephone voice guidance sequence
    soundEngine.playPhone(night, (text) => {
      setPhoneSubtitle(text);
    });

    // Main interval tick (every 1 second)
    gameIntervalRef.current = setInterval(() => {
      tickGame();
    }, 1000);

    return () => {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
      soundEngine.stopAmbient();
      soundEngine.stopPhone();
    };
  }, []);

  // Update sound effects based on interactions
  const toggleLeftDoor = () => {
    if (power <= 0 || gameState !== GameState.PLAYING) return;
    soundEngine.playDoor();
    setLeftDoorClosed(prev => !prev);
  };

  const toggleRightDoor = () => {
    if (power <= 0 || gameState !== GameState.PLAYING) return;
    soundEngine.playDoor();
    setRightDoorClosed(prev => !prev);
  };

  const toggleLeftLight = () => {
    if (power <= 0 || gameState !== GameState.PLAYING) return;
    soundEngine.playLight();
    setLeftLightOn(prev => !prev);
    if (!leftLightOn) setRightLightOn(false); // only one light at once is safe for power lines
  };

  const toggleRightLight = () => {
    if (power <= 0 || gameState !== GameState.PLAYING) return;
    soundEngine.playLight();
    setRightLightOn(prev => !prev);
    if (!rightLightOn) setLeftLightOn(false);
  };

  const toggleTablet = () => {
    if (power <= 0 || gameState !== GameState.PLAYING) return;
    soundEngine.playCctvSwitch();
    setTabletOpen(prev => !prev);
  };

  // Re-read security system frequency to reset Glitcher puppet count
  const resetGlitcherSirenSignal = () => {
    if (power <= 0 || gameState !== GameState.PLAYING) return;
    soundEngine.playCctvSwitch();
    // Reduce Glitcher progress significantly
    setGlitcherMeter(prev => Math.max(5, prev - 45));
    // Brief system glitch animation
    setCameraGlitching(true);
    setTimeout(() => setCameraGlitching(false), 800);
  };

  // Core Tick Logic inside the security hub
  const tickGame = () => {
    let powerOutageHandled = false;

    setSecondsElapsed(prev => {
      const nextSec = prev + 1;
      // 50 seconds equivalent to 1 hour (300 seconds total)
      const currentH = Math.floor(nextSec / 50);

      if (currentH === 0) setClockHour(12);
      else if (currentH <= 6) setClockHour(currentH);

      if (nextSec >= 300) {
        triggerVictoryState();
      }
      return nextSec;
    });

    // Calculate energy drain rate
    setPower(prevPower => {
      let consumersCount = 1; // background room-tone systems, ventilation
      if (leftDoorClosed) consumersCount += 2; // heavy magnets closed
      if (rightDoorClosed) consumersCount += 2;
      if (leftLightOn) consumersCount += 1.5;
      if (rightLightOn) consumersCount += 1.5;
      if (tabletOpen) consumersCount += 1.2;

      const hourlyDrain = consumersCount * 0.17; // proportional load
      const nextPower = Math.max(0, prevPower - hourlyDrain);

      // Warning alarm beeps if power is critical
      if (nextPower < 15 && nextPower > 0 && Math.random() < 0.45) {
        soundEngine.playWarningBeeps();
      }

      if (nextPower <= 0 && !powerOutageHandled) {
        powerOutageHandled = true;
        triggerPowerOutageSequence();
      }
      return nextPower;
    });

    // GLITCHER puppet meter tick
    setGlitcherMeter(prevMeter => {
      // If we are actively looking at CAM 8 (Glitch Room) on the tablet, his meter naturally decays or stays reset
      const isMonitoringCAM8 = tabletOpen && selectedCam === 'PRIZE';
      const increment = isMonitoringCAM8 ? -5.5 : (1.4 + night * 0.42); // increases aggressively on late nights

      const nextMeter = Math.max(0, Math.min(100, prevMeter + increment));

      if (nextMeter >= 100) {
        // Drone breaches system and executes jump scare!
        triggerJumpscareSequence('GLITCHER');
      }

      return nextMeter;
    });

    // Trigger random glitches inside camera monitors based on total difficulty
    if (Math.random() < 0.08) {
      setCameraGlitching(true);
      setTimeout(() => setCameraGlitching(false), 500);
    }

    // ANIMATRONICS RE-CALC ROAMING STEPS
    setAnimatronics(prevAnims => {
      return prevAnims.map(anim => {
        // Non-centered roaming characters (Blinky, Ziggy, Sirena)
        if (anim.id === 'GLITCHER') return anim;

        const nextTimer = anim.movementTimer - 1;

        if (nextTimer <= 0) {
          // Time to roll the dynamic 20-sided dice to move!
          const roll = Math.floor(Math.random() * 20) + 1;
          const successfulMove = roll <= anim.aiLevel;

          if (successfulMove) {
            // Traverse routes
            const currentRouteIdx = anim.path.indexOf(anim.currentCam);
            let nextCam = anim.currentCam;

            if (currentRouteIdx !== -1 && currentRouteIdx < anim.path.length - 1) {
              nextCam = anim.path[currentRouteIdx + 1];
              // Spooky metal moving noise
              if (Math.random() < 0.5) soundEngine.playFootstep();
            }

            return {
              ...anim,
              currentCam: nextCam,
              movementTimer: 8 - (night * 0.5), // resets with shorter intervals on higher nights
              lastMoveStatus: 'MOVED'
            };
          } else {
            return {
              ...anim,
              movementTimer: 8 - (night * 0.5),
              lastMoveStatus: 'STATIONARY'
            };
          }
        }

        return {
          ...anim,
          movementTimer: nextTimer
        };
      });
    });
  };

  // Monitor attacking status and trigger jumpscares upon timer expiry
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    // Check LEFT DOOR vulnerability
    const leftAttacker = animatronics.find(
      a => (a.currentCam === 'OFFICE_L') && (a.id === 'BLINKY' || a.id === 'SIRENA')
    );

    if (leftAttacker) {
      const waitTime = leftAttacker.id === 'BLINKY' ? 6000 : 7500;
      const t = setTimeout(() => {
        // After waiting, check door position
        setLeftDoorClosed(closed => {
          if (closed) {
            // Saved by the door! Retaliate thud and reset animatronic
            soundEngine.playFootstep();
            // Retract robot back to start stage
            setAnimatronics(prev => prev.map(a => {
              if (a.id === leftAttacker.id) {
                return { ...a, currentCam: 'STAGE' };
              }
              return a;
            }));
            return true;
          } else {
            // Caught unshielded! Jumpscare
            triggerJumpscareSequence(leftAttacker.id);
            return false;
          }
        });
      }, waitTime);
      return () => clearTimeout(t);
    }

    // Check RIGHT DOOR vulnerability
    const rightAttacker = animatronics.find(
      a => (a.currentCam === 'OFFICE_R') && (a.id === 'ZIGGY')
    );

    if (rightAttacker) {
      // Extremely fast trigger
      const waitTime = 3800 - (night * 300); // gets incredibly unforgiving on Night 5/6!
      const t = setTimeout(() => {
        setRightDoorClosed(closed => {
          if (closed) {
            soundEngine.playFootstep();
            setAnimatronics(prev => prev.map(a => {
              if (a.id === 'ZIGGY') {
                return { ...a, currentCam: 'ARCADE' };
              }
              return a;
            }));
            return true;
          } else {
            triggerJumpscareSequence('ZIGGY');
            return false;
          }
        });
      }, waitTime);
      return () => clearTimeout(t);
    }
  }, [animatronics, gameState, night]);

  // Out of Power sequence trigger
  const triggerPowerOutageSequence = () => {
    setGameState(GameState.OUTOFPOWER);
    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);

    setLeftDoorClosed(false);
    setRightDoorClosed(false);
    setLeftLightOn(false);
    setRightLightOn(false);
    setTabletOpen(false);

    soundEngine.playPowerOut();

    // Spawn a delayed sequence of creepy box music
    setTimeout(() => {
      soundEngine.playCreepyMusicBox();
    }, 3000);

    // Sudden jumpscare after music musicbox completes (10 to 18 seconds)
    setTimeout(() => {
      triggerJumpscareSequence('BLINKY');
    }, 12000 + Math.random() * 6000);
  };

  // Perform Jump scare
  const triggerJumpscareSequence = (killerID: AnimatronicType) => {
    setGameState(GameState.JUMPSCARED);
    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);

    const killerInfo = BASE_ANIMATRONICS.find(a => a.id === killerID);
    setKillerName(killerInfo?.nameUk || killerID);
    setKillerNameEn(killerInfo?.name || killerID);

    soundEngine.playScreamer();

    // Transition to game over screen tips guide after 2.8 seconds
    setTimeout(() => {
      setGameState(GameState.GAME_OVER);
    }, 2800);
  };

  // 6 AM Victory state
  const triggerVictoryState = () => {
    setGameState(GameState.VICTORY);
    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    soundEngine.playVictory();
  };

  const handleRestart = () => {
    window.location.reload();
  };

  // Renders the jumpscare full frame overlays
  const renderJumpscareOverlay = () => {
    return (
      <div className="absolute inset-0 z-50 bg-[#070101] flex flex-col items-center justify-center animate-ping overflow-hidden">
        {/* Scary blinking giant red vector mask */}
        <div className="text-center select-none scale-150 relative">
          <div className="w-80 h-80 rounded-full border-8 border-red-600 animate-pulse bg-red-950 flex flex-col items-center justify-center relative">
            <div className="flex gap-16 justify-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <div className="w-6 h-6 bg-red-600 rounded-full" />
              </div>
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <div className="w-6 h-6 bg-red-600 rounded-full" />
              </div>
            </div>
            {/* Massive cracked teeth */}
            <div className="w-48 h-12 bg-black mt-12 border-4 border-red-600 flex justify-between px-2 items-center">
              <div className="w-3 h-8 bg-zinc-400 rounded" />
              <div className="w-3 h-8 bg-zinc-200 rounded" />
              <div className="w-3 h-8 bg-zinc-300 rounded" />
              <div className="w-3 h-8 bg-zinc-400 rounded" />
              <div className="w-3 h-8 bg-zinc-200 rounded" />
              <div className="w-3 h-8 bg-zinc-300 rounded" />
            </div>
            {/* Warning lines */}
            <div className="absolute top-4 font-mono font-bold text-lg text-red-500 animate-bounce">
              ⚠️ {killerNameEn.toUpperCase()} DETECTED
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="game-ui-stage" className="w-full aspect-[16/9] min-h-[500px] bg-slate-950 relative flex flex-col overflow-hidden text-slate-100 select-none">
      <div className="flex-1 relative w-full h-full">
        <ThreeScene
          leftDoorClosed={leftDoorClosed}
          rightDoorClosed={rightDoorClosed}
          leftLightOn={leftLightOn}
          rightLightOn={rightLightOn}
          animatronics={animatronics}
          jumpscareActive={gameState === GameState.JUMPSCARED}
          jumpscareId={killerNameEn}
          powerOut={gameState === GameState.OUTOFPOWER}
        />

        {/* 2. Interactive Console Doors buttons and light indicators on left-right edges of the screen */}
        {gameState === GameState.PLAYING && (
          <>
            {/* Left Console Buttons */}
            <div className="absolute left-4 top-1/4 -translate-y-1/2 flex flex-col gap-3 bg-[#1a1a1a] border-2 border-gray-800 p-2 rounded-lg shadow-[0_0_20px_rgba(0,0,0,1)] z-30 font-mono w-22">
              <div className="text-[9px] text-gray-550 text-center uppercase tracking-widest font-bold font-mono">SEC_ZONE_A</div>
              <button
                id="btn-left-door"
                onClick={toggleLeftDoor}
                className="flex-1 min-h-[52px] bg-red-900/10 border border-red-500/40 flex flex-col items-center justify-center p-1 rounded cursor-pointer hover:bg-red-900/35 transition-all"
              >
                <div className="text-[9px] text-red-500 font-bold mb-1.5 tracking-wider">DOOR</div>
                <div className={`w-3.5 h-3.5 rounded-full transition-all duration-350 ${leftDoorClosed ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.9)]' : 'bg-gray-650'}`}></div>
              </button>
              <button
                id="btn-left-light"
                onClick={toggleLeftLight}
                className="flex-1 min-h-[52px] bg-white/5 border border-white/20 flex flex-col items-center justify-center p-1 rounded cursor-pointer hover:bg-white/10 transition-all"
              >
                <div className="text-[9px] text-gray-400 font-bold mb-1.5 tracking-wider font-mono">LIGHT</div>
                <div className={`w-3.5 h-3.5 rounded-full transition-all duration-350 ${leftLightOn ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.9)]' : 'bg-gray-655'}`}></div>
              </button>
            </div>

            {/* Right Console Buttons */}
            <div className="absolute right-4 top-1/4 -translate-y-1/2 flex flex-col gap-3 bg-[#1a1a1a] border-2 border-gray-800 p-2 rounded-lg shadow-[0_0_20px_rgba(0,0,0,1)] z-30 font-mono w-22">
              <div className="text-[9px] text-gray-550 text-center uppercase tracking-widest font-bold font-mono">SEC_ZONE_B</div>
              <button
                id="btn-right-door"
                onClick={toggleRightDoor}
                className="flex-1 min-h-[52px] bg-red-900/10 border border-red-500/40 flex flex-col items-center justify-center p-1 rounded cursor-pointer hover:bg-red-900/35 transition-all"
              >
                <div className="text-[9px] text-red-500 font-bold mb-1.5 tracking-wider">DOOR</div>
                <div className={`w-3.5 h-3.5 rounded-full transition-all duration-350 ${rightDoorClosed ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.9)]' : 'bg-gray-655'}`}></div>
              </button>
              <button
                id="btn-right-light"
                onClick={toggleRightLight}
                className="flex-1 min-h-[52px] bg-white/5 border border-white/15 flex flex-col items-center justify-center p-1 rounded cursor-pointer hover:bg-white/10 transition-all"
              >
                <div className="text-[9px] text-gray-400 font-bold mb-1.5 tracking-wider font-mono">LIGHT</div>
                <div className={`w-3.5 h-3.5 rounded-full transition-all duration-350 ${rightLightOn ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.9)]' : 'bg-gray-655'}`}></div>
              </button>
            </div>
          </>
        )}

        {/* 3. Header Status HUD overlay info (Power level, Clock hour, Night marker) */}
        {gameState === GameState.PLAYING && (() => {
          let usageMode = "LOW";
          let consumersCount = 1;
          if (leftDoorClosed) consumersCount += 2;
          if (rightDoorClosed) consumersCount += 2;
          if (leftLightOn) consumersCount += 1.5;
          if (rightLightOn) consumersCount += 1.5;
          if (tabletOpen) consumersCount += 1.2;

          if (consumersCount > 3.5) {
            usageMode = "HEAVY";
          } else if (consumersCount > 2) {
            usageMode = "MODERATE";
          }

          return (
            <div className="absolute top-4 inset-x-4 pointer-events-none flex justify-between items-start z-30 font-mono">
              {/* Elegant Dark Style Facility Power Status */}
              <div className="bg-[#0a0a0a]/90 border-2 border-[#1a1a1a] p-4 rounded shadow-[0_0_20px_rgba(0,0,0,0.8)] pointer-events-auto flex flex-col gap-1 select-none min-w-[200px]">
                <div className="text-[10px] text-red-500/80 uppercase tracking-[0.2em] font-bold">Facility Power</div>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-green-500 tracking-tighter animate-signal">
                    {Math.round(power)}%
                  </div>
                  <div className="w-24 h-2 bg-gray-900 border border-gray-800 rounded-sm">
                    <div className="h-full bg-green-500 transition-all duration-350" style={{ width: `${Math.round(power)}%` }}></div>
                  </div>
                </div>
                <div className="text-[9px] text-gray-500 uppercase mt-1 tracking-wider">
                  Usage: &gt; &gt; <span className={usageMode === "HEAVY" ? "text-red-500 font-bold" : "text-yellow-500 font-bold"}>{usageMode}</span>
                </div>
              </div>

              {/* Subtitles cassette block */}
              {phoneSubtitle && (
                <div className="max-w-md bg-black/95 border-2 border-[#1a1a1a] px-4 py-2.5 rounded text-xs font-mono text-green-400 shadow-2xl p-2 select-none pointer-events-auto leading-relaxed border-l-4 border-l-red-600">
                  {phoneSubtitle}
                </div>
              )}

              {/* Elegant Dark Time / Night HUD */}
              <div className="bg-[#0a0a0a]/90 border-2 border-[#1a1a1a] p-4 rounded text-right shadow-[0_0_20px_rgba(0,0,0,0.8)] pointer-events-auto flex flex-col select-none">
                <div className="text-4xl font-light tracking-tighter text-[#e0e0e0]">
                  {clockHour === 12 ? '12' : clockHour}:00 <span className="text-lg">AM</span>
                </div>
                <div className="text-[9px] text-gray-550 uppercase tracking-[0.2em] mt-1 font-bold">
                  Night {night} / Protocol 09
                </div>
              </div>
            </div>
          );
        })()}

        {/* 4. Bottom pull-up tablet monitor toggle */}
        {gameState === GameState.PLAYING && (
          <div className="absolute bottom-4 inset-x-0 flex justify-center z-30 font-mono">
            <button
              id="btn-toggle-tablet"
              onClick={toggleTablet}
              className={`w-1/2 py-2.5 flex items-center justify-center gap-3 font-mono text-xs border bg-[#0a0a0a]/95 text-[#e0e0e0] cursor-pointer transition uppercase tracking-[0.2em] font-bold ${
                tabletOpen
                  ? 'border-red-500/50 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.25)]'
                  : 'border-[#1a1a1a] hover:border-red-500/50 hover:text-red-500'
              }`}
            >
              <Shield className={`h-4 w-4 ${tabletOpen ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
              <span>{tabletOpen ? '👇 ЗАКРИТИ ПЛАНШЕТ СЛІДКУВАННЯ' : '👆 ВІДКРИТИ ПЛАНШЕТ СЛІДКУВАННЯ'}</span>
            </button>
          </div>
        )}

        {/* 5. Full-Screen Interactive CCTV tablet monitoring view overlay */}
        {gameState === GameState.PLAYING && tabletOpen && (
          <div className="absolute inset-4 bg-black/95 z-40 flex flex-col p-4 border border-[#1a1a1a] rounded shadow-[0_0_30px_rgba(0,0,0,1)]">
            {/* Tablet Header bar information */}
            <div className="h-10 border-b border-[#1a1a1a] flex justify-between items-center px-1 text-xs font-mono mb-4 text-[#e0e0e0]">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-red-500 animate-pulse animate-signal" />
                <span className="font-bold tracking-[0.15em] text-[#e0e0e0] uppercase">CCTV FEED / OASIS CORE MONITOR</span>
              </div>

              {/* Glitcher alert systems warnings */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-[#121212] border border-[#222] px-3 py-1 rounded">
                  <span className="text-gray-400 uppercase text-[10px]">Криза КАМ 8 (Глітчер):</span>
                  <div className="w-24 bg-[#111] h-2 border border-gray-800 rounded-sm overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        glitcherMeter > 70 ? 'bg-red-650 shadow-[0_0_8px_rgba(220,38,38,1)]' : 'bg-yellow-550'
                      }`}
                      style={{ width: `${glitcherMeter}%` }}
                    />
                  </div>
                  <span className={`font-bold ${glitcherMeter > 70 ? 'text-red-500 animate-pulse font-black' : 'text-yellow-500'}`}>
                    {Math.round(glitcherMeter)}%
                  </span>
                </div>
                {selectedCam === 'PRIZE' && (
                  <button
                    id="btn-reboot-channel"
                    onClick={resetGlitcherSirenSignal}
                    className="bg-red-950/20 hover:bg-red-900/30 text-red-500 border border-red-500/50 px-3 py-1.5 rounded font-bold text-xs uppercase cursor-pointer transition tracking-widest leading-none shadow-[0_0_10px_rgba(239,68,68,0.15)]"
                  >
                    ⚡ Перевантажити Дрон
                  </button>
                )}
              </div>

              <button
                id="btn-close-tablet-header"
                onClick={toggleTablet}
                className="bg-[#121212] border border-[#222] hover:bg-red-950/20 hover:text-red-500 hover:border-red-500/40 px-3  py-1.5 rounded transition cursor-pointer text-gray-400 text-xs font-bold font-mono tracking-widest uppercase"
              >
                Закрити X
              </button>
            </div>

            {/* Layout divided: Camera static feed view (left list block) & Map Blueprint controllers (right list block) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
              {/* Camera Screen Feed rendering context */}
              <div className="lg:col-span-2 relative h-full flex flex-col min-h-0">
                <CctvView
                  currentCamId={selectedCam}
                  animatronics={animatronics}
                  glitchLevel={glitchLevel}
                  cameraGlitching={cameraGlitching}
                />
              </div>

              {/* Blueprint Minimap selection block */}
              <div className="lg:col-span-1 bg-zinc-950 border border-slate-900 rounded p-4 flex flex-col justify-between items-center relative text-slate-200">
                <div className="text-center w-full">
                  <p className="font-mono text-[11px] text-slate-500 tracking-wider uppercase">Проекція Будівлі</p>
                  <p className="font-mono text-xs text-slate-300 font-bold mt-1">
                    {CAMERAS.find(c => c.id === selectedCam)?.name || selectedCam}
                  </p>
                </div>

                {/* Styled blueprint map layout using styled boxes with absolute coordinates representation */}
                <div className="w-full max-w-[280px] aspect-square relative border-2 border-[#1a1a1a] bg-black rounded-lg p-2 flex items-center justify-center my-4 select-none shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
                  {/* Map wires paths decoration render */}
                  <div className="absolute inset-4 border border-[#111] pointer-events-none rounded opacity-30" />

                  {/* CAM STAGE 1 */}
                  <button
                    id="btn-map-cam-STAGE"
                    onClick={() => { setSelectedCam('STAGE'); soundEngine.playCctvSwitch(); }}
                    className={`absolute top-2 left-1/2 -translate-x-1/2 px-2 py-1 font-mono text-[9px] uppercase rounded transition-all cursor-pointer ${
                      selectedCam === 'STAGE' ? 'bg-red-950/50 border border-red-500 text-red-500 font-bold scale-105 shadow-[0_0_8px_rgba(239,68,68,0.25)]' : 'bg-[#0a0a0a] border border-[#1a1a1a] text-gray-400 hover:text-red-500 hover:border-red-500/50 hover:bg-[#121212]'
                    }`}
                  >
                    CAM 1 Stage
                  </button>

                  {/* CAM DINING 2 */}
                  <button
                    id="btn-map-cam-DINING"
                    onClick={() => { setSelectedCam('DINING'); soundEngine.playCctvSwitch(); }}
                    className={`absolute top-18 left-3 px-2 py-1 font-mono text-[9px] uppercase rounded transition-all cursor-pointer ${
                      selectedCam === 'DINING' ? 'bg-red-950/50 border border-red-500 text-red-500 font-bold scale-105 shadow-[0_0_8px_rgba(239,68,68,0.25)]' : 'bg-[#0a0a0a] border border-[#1a1a1a] text-gray-400 hover:text-red-500 hover:border-red-500/50 hover:bg-[#121212]'
                    }`}
                  >
                    CAM 2 Dining
                  </button>

                  {/* CAM ARCADE 3 */}
                  <button
                    id="btn-map-cam-ARCADE"
                    onClick={() => { setSelectedCam('ARCADE'); soundEngine.playCctvSwitch(); }}
                    className={`absolute top-18 right-3 px-2 py-1 font-mono text-[9px] uppercase rounded transition-all cursor-pointer ${
                      selectedCam === 'ARCADE' ? 'bg-red-950/50 border border-red-500 text-red-500 font-bold scale-105 shadow-[0_0_8px_rgba(239,68,68,0.25)]' : 'bg-[#0a0a0a] border border-[#1a1a1a] text-gray-400 hover:text-red-500 hover:border-red-500/50 hover:bg-[#121212]'
                    }`}
                  >
                    CAM 3 Arcade
                  </button>

                  {/* CAM BACKSTAGE 5 */}
                  <button
                    id="btn-map-cam-BACKSTAGE"
                    onClick={() => { setSelectedCam('BACKSTAGE'); soundEngine.playCctvSwitch(); }}
                    className={`absolute top-10 left-10 px-2 py-1 font-mono text-[9px] uppercase rounded transition-all cursor-pointer ${
                      selectedCam === 'BACKSTAGE' ? 'bg-red-950/50 border border-red-500 text-red-500 font-bold scale-105 shadow-[0_0_8px_rgba(239,68,68,0.25)]' : 'bg-[#0a0a0a] border border-[#1a1a1a] text-gray-400 hover:text-red-500 hover:border-red-500/50 hover:bg-[#121212]'
                    }`}
                  >
                    CAM 5 Store
                  </button>

                  {/* CAM KIDS_PLAY 4 */}
                  <button
                    id="btn-map-cam-KIDS_PLAY"
                    onClick={() => { setSelectedCam('KIDS_PLAY'); soundEngine.playCctvSwitch(); }}
                    className={`absolute top-34 left-1/2 -translate-x-1/2 px-2 py-1 font-mono text-[9px] uppercase rounded transition-all cursor-pointer ${
                      selectedCam === 'KIDS_PLAY' ? 'bg-red-950/50 border border-red-500 text-red-500 font-bold scale-105 shadow-[0_0_8px_rgba(239,68,68,0.25)]' : 'bg-[#0a0a0a] border border-[#1a1a1a] text-gray-400 hover:text-red-500 hover:border-red-500/50 hover:bg-[#121212]'
                    }`}
                  >
                    CAM 4 Kids
                  </button>

                  {/* CAM VENT LEFT 6 */}
                  <button
                    id="btn-map-cam-VENT_L"
                    onClick={() => { setSelectedCam('VENT_L'); soundEngine.playCctvSwitch(); }}
                    className={`absolute bottom-16 left-3 px-2 py-1 font-mono text-[9px] uppercase rounded transition-all cursor-pointer ${
                      selectedCam === 'VENT_L' ? 'bg-red-950/50 border border-red-500 text-red-500 font-bold scale-105 shadow-[0_0_8px_rgba(239,68,68,0.25)]' : 'bg-[#0a0a0a] border border-[#1a1a1a] text-gray-400 hover:text-red-500 hover:border-red-500/50 hover:bg-[#121212]'
                    }`}
                  >
                    CAM 6 Vent L
                  </button>

                  {/* CAM VENT RIGHT 7 */}
                  <button
                    id="btn-map-cam-VENT_R"
                    onClick={() => { setSelectedCam('VENT_R'); soundEngine.playCctvSwitch(); }}
                    className={`absolute bottom-16 right-3 px-2 py-1 font-mono text-[9px] uppercase rounded transition-all cursor-pointer ${
                      selectedCam === 'VENT_R' ? 'bg-red-950/50 border border-red-500 text-red-500 font-bold scale-105 shadow-[0_0_8px_rgba(239,68,68,0.25)]' : 'bg-[#0a0a0a] border border-[#1a1a1a] text-gray-400 hover:text-red-500 hover:border-red-500/50 hover:bg-[#121212]'
                    }`}
                  >
                    CAM 7 Vent R
                  </button>

                  {/* CAM PRIZE 8 (Shadows glitched drone) */}
                  <button
                    id="btn-map-cam-PRIZE"
                    onClick={() => { setSelectedCam('PRIZE'); soundEngine.playCctvSwitch(); }}
                    className={`absolute top-24 right-5 px-2 py-1 font-mono text-[9px] uppercase rounded transition-all cursor-pointer ${
                       selectedCam === 'PRIZE' ? 'bg-red-950/60 border border-red-500 text-red-500 font-bold scale-105 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.255)]' : 'bg-[#0a0a0a] border border-[#1a1a1a] text-yellow-500 hover:text-red-500 hover:border-red-500/50 hover:bg-[#121212]'
                    }`}
                  >
                    CAM 8 Shadow
                  </button>

                  {/* OFFICE representation BOX inside center */}
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-[#0c0c0c] border border-[#1a1a1a] px-3.5 py-1.5 rounded text-[8px] text-red-500 font-mono font-bold text-center tracking-widest uppercase shadow">
                    👮 SECURITY ROOM
                  </div>
                </div>

                <div className="text-[10px] font-mono text-slate-400 border border-slate-800 bg-slate-900/40 p-1.5 rounded w-full flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0" />
                  <span>Постійно перевіряйте КАМ 8 (Куточок Тіней) для стримання безпекових збоїв!</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. Jumpscare flashing screen */}
      {gameState === GameState.JUMPSCARED && renderJumpscareOverlay()}

      {/* 7. Game Over Stats state screen representation */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 bg-[#090b0d] z-50 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
          <div className="max-w-xl bg-zinc-950 border border-red-900/50 p-8 rounded shadow-2xl relative border-t-8 border-t-red-600">
            <h1 className="text-4xl font-bold font-mono text-red-600 tracking-wider">ГРА ЗАКІНЧЕНА</h1>
            <p className="text-md text-slate-300 mt-3 font-mono">Вас схопив аніматронік: <strong className="text-red-400">{killerName}</strong></p>

            <div className="bg-red-950/20 border border-red-800/40 p-4 rounded text-left my-6 leading-relaxed">
              <p className="font-bold text-xs text-red-400 font-mono mb-2 uppercase tracking-widest">💡 Підказка щодо виживання:</p>
              <p className="text-xs text-slate-300">
                {killerNameEn === 'BLINKY' && "Ведмідь Блінкі йде лівою стороною (КАМ 6). Коли він стоїть біля кутового вікна кабінету, увімкніть ліве світло, щоб виявити його, та оперативно закрийте ліві двері."}
                {killerNameEn === 'ZIGGY' && "Заєць Зіггі дуже агресивний та миттєво атакує при виявленні металевого скреготу з правої вентиляції (КАМ 7). Тримайте палець біля кнопки закриття правих дверей."}
                {killerNameEn === 'SIRENA' && "Птиця Сирена створює раптові радіозавади та глушить аудіосистеми. Якщо ви чуєте потріскування та гудіння, негайно подивіться в ліве вікно або закрийте ліві двері."}
                {killerNameEn === 'GLITCHER' && "Глітчер активується лише при тривалому ігноруванні КАМ 8 (Куточок Тіні). Періодично дивіться на цю камеру на планшеті та за потреби натискайте кнопку 'Перевантажити'."}
                {!['BLINKY', 'ZIGGY', 'SIRENA', 'GLITCHER'].includes(killerNameEn) && "Зберігайте енергію генератора кабінету. Не тримайте ліхтарики та важкі магнітні двері зачиненими без наявності прямої загрози."}
              </p>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                id="btn-retry-game"
                onClick={handleRestart}
                className="bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-sm px-6 py-2.5 rounded transition cursor-pointer shadow"
              >
                Спробувати Знову 🔄
              </button>
              <button
                id="btn-retry-exit"
                onClick={onExitMenu}
                className="bg-zinc-800 hover:bg-zinc-700 text-slate-300 font-mono text-sm px-6 py-2.5 rounded transition cursor-pointer border border-slate-700"
              >
                Повернутись в Меню
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Success AM Victory stats screen */}
      {gameState === GameState.VICTORY && (
        <div className="absolute inset-0 bg-[#090b0d] z-50 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
          <div className="max-w-xl bg-zinc-950 border border-emerald-900/50 p-8 rounded shadow-2xl relative border-t-8 border-t-emerald-600">
            <div className="text-6xl font-bold font-mono text-emerald-400 animate-bounce">6:00 AM</div>
            <h1 className="text-3xl font-bold font-mono text-slate-100 tracking-wider mt-4">НІЧНУ ЗМІНУ ЗАВЕРШЕНО</h1>
            <p className="text-sm text-slate-400 mt-2 font-mono">Вітаємо! Ви успішно пережили Ніч {night} у закинутому Neon Oasis.</p>

            <div className="bg-emerald-950/20 border border-emerald-900/40 p-4 rounded text-left my-6 leading-relaxed">
              <p className="font-bold text-xs text-emerald-400 font-mono mb-1 uppercase tracking-widest">📝 Робочий звіт:</p>
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside font-mono">
                <li>Рівень загрози: СТАБІЛЬНИЙ</li>
                <li>Падіння генератора: Зупинено о 6:00</li>
                <li>Витрачено електроенергії: 92%</li>
                <li>Наступна зміна: розблокована на розширеному рівні складності!</li>
              </ul>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                id="btn-victory-next"
                onClick={onVictory}
                className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono font-bold text-sm px-8 py-3 rounded transition cursor-pointer shadow"
              >
                Перейти до наступної ночі →
              </button>
              <button
                id="btn-victory-exit"
                onClick={onExitMenu}
                className="bg-zinc-800 hover:bg-zinc-700 text-slate-300 font-mono text-sm px-6 py-3 rounded transition cursor-pointer border border-slate-700"
              >
                В Головне Меню
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
