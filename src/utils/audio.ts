// Procedural audio synthesizer using Web Audio API for an authentic 90s CCTV atmosphere
class SoundEngine {
  private ctx: AudioContext | null = null;
  private ambientNode: OscillatorNode[] = [];
  private ambientGains: GainNode[] = [];
  private phoneTimer: any = null;
  private phoneOsc: OscillatorNode | null = null;
  private phoneGain: GainNode | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Deep disturbing hum representing the office ambient tone
  startAmbient() {
    this.init();
    if (!this.ctx) return;
    this.stopAmbient();

    try {
      // 55Hz Low hum + 110Hz sub-hum with slight panning or modulation
      const o1 = this.ctx.createOscillator();
      const o2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      o1.type = 'sawtooth';
      o1.frequency.setValueAtTime(53, this.ctx.currentTime); // Off-grid frequency for tension
      o2.type = 'triangle';
      o2.frequency.setValueAtTime(107, this.ctx.currentTime);

      // Filter to cut off highs
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, this.ctx.currentTime);
      filter.Q.setValueAtTime(5, this.ctx.currentTime);

      gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime);

      o1.connect(filter);
      o2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      o1.start();
      o2.start();

      this.ambientNode = [o1, o2];
      this.ambientGains = [gainNode];

      // Occasional faint pipe hiss / air conditioning wind noise
      this.playWindNoise();
    } catch (e) {
      console.warn("Audio context failed to start ambient:", e);
    }
  }

  stopAmbient() {
    this.ambientNode.forEach(n => {
      try { n.stop(); } catch(e){}
    });
    this.ambientNode = [];
    this.ambientGains = [];
  }

  // Generates randomized draft wind / static noise
  private playWindNoise() {
    if (!this.ctx || this.ambientNode.length === 0) return;
    try {
      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(180, this.ctx.currentTime);
      filter.Q.setValueAtTime(0.8, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.015, this.ctx.currentTime);

      // Modulate frequency to simulate gusts
      const modulator = this.ctx.createOscillator();
      modulator.frequency.setValueAtTime(0.25, this.ctx.currentTime); // extremely slow
      const modGain = this.ctx.createGain();
      modGain.gain.setValueAtTime(50, this.ctx.currentTime);

      modulator.connect(modGain);
      modGain.connect(filter.frequency);
      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      modulator.start();
      whiteNoise.start();

      // Loop this wind occasionally
      setTimeout(() => {
        try {
          modulator.stop();
          whiteNoise.stop();
        }catch(e){}
        if (this.ambientNode.length > 0) this.playWindNoise();
      }, 12000);
    } catch (e) {}
  }

  // Click / toggle light switch
  playLight() {
    this.init();
    if (!this.ctx) return;
    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(800, this.ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.05);

      g.gain.setValueAtTime(0.05, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + 0.06);

      // Short electrical buzz
      const buzz = this.ctx.createOscillator();
      const buzzG = this.ctx.createGain();
      buzz.type = 'sawtooth';
      buzz.frequency.setValueAtTime(120, this.ctx.currentTime);
      buzzG.gain.setValueAtTime(0.02, this.ctx.currentTime);
      buzzG.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      
      buzz.connect(buzzG);
      buzzG.connect(this.ctx.destination);
      buzz.start();
      buzz.stop(this.ctx.currentTime + 0.15);
    } catch (e) {}
  }

  // Door slide closing sound (pneumatic hiss + heavy metal drop)
  playDoor() {
    this.init();
    if (!this.ctx) return;
    try {
      // 1. Pneumatic hiss (white noise decaying)
      const bufferSize = 0.5 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const hiss = this.ctx.createBufferSource();
      hiss.buffer = noiseBuffer;
      const hissGain = this.ctx.createGain();
      hissGain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      hissGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(1000, this.ctx.currentTime);

      hiss.connect(f);
      f.connect(hissGain);
      hissGain.connect(this.ctx.destination);
      hiss.start();

      // 2. Heavy Clunk (low sine thump)
      const thud = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(130, this.ctx.currentTime);
      thud.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.35);

      thudGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      thudGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

      thud.connect(thudGain);
      thudGain.connect(this.ctx.destination);
      thud.start();
      thud.stop(this.ctx.currentTime + 0.45);
    } catch(e) {}
  }

  // Camera monitor static glitch beep clicking sound
  playCctvSwitch() {
    this.init();
    if (!this.ctx) return;
    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(180, this.ctx.currentTime);
      o.frequency.setValueAtTime(260, this.ctx.currentTime + 0.04);

      g.gain.setValueAtTime(0.04, this.ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.08);

      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + 0.09);
    } catch(e) {}
  }

  // Heavy metal animatronic footstep
  playFootstep() {
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(20, this.ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.32);

      // Low pass metallic echo
      const delay = this.ctx.createDelay();
      delay.delayTime.setValueAtTime(0.08, this.ctx.currentTime);
      const delayGain = this.ctx.createGain();
      delayGain.gain.setValueAtTime(0.085, this.ctx.currentTime);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      // Simple slapback echo for a "huge hollow building" feel
      gain.connect(delay);
      delay.connect(delayGain);
      delayGain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    } catch(e){}
  }

  // Danger Warning Beeps (when energy is < 15%)
  playWarningBeeps() {
    this.init();
    if (!this.ctx) return;
    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(1200, this.ctx.currentTime);
      g.gain.setValueAtTime(0.05, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + 0.22);
    } catch(e){}
  }

  // TERRIFING JUMPSCARE SCREECH (Oscillators mixed with brutal white noise logic)
  playScreamer() {
    this.init();
    if (!this.ctx) return;
    try {
      this.stopAmbient();
      this.stopPhone();

      const time = this.ctx.currentTime;

      // Master gain for screamer limit
      const masterG = this.ctx.createGain();
      masterG.gain.setValueAtTime(0.45, time); // Extremely loud, but safe

      // 1. Extreme distorted white noise
      const bufferSize = 2.5 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      // Bandpass sweep to give it "guttural roar" feel
      const nFilter = this.ctx.createBiquadFilter();
      nFilter.type = 'peaking';
      nFilter.frequency.setValueAtTime(250, time);
      nFilter.frequency.exponentialRampToValueAtTime(900, time + 1.2);
      nFilter.Q.setValueAtTime(12, time);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.4, time);
      nGain.gain.exponentialRampToValueAtTime(0.001, time + 2.0);

      noiseSource.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(masterG);

      // 2. High metallic oscillator screech
      const o1 = this.ctx.createOscillator();
      const o2 = this.ctx.createOscillator();
      const o3 = this.ctx.createOscillator();

      o1.type = 'sawtooth';
      o1.frequency.setValueAtTime(280, time);
      o1.frequency.linearRampToValueAtTime(700, time + 0.5);
      o1.frequency.linearRampToValueAtTime(150, time + 1.8);

      o2.type = 'square';
      o2.frequency.setValueAtTime(320, time);
      o2.frequency.linearRampToValueAtTime(1100, time + 0.6);
      o2.frequency.linearRampToValueAtTime(190, time + 1.9);

      // High ring pitch
      o3.type = 'sawtooth';
      o3.frequency.setValueAtTime(4500, time);
      o3.frequency.linearRampToValueAtTime(3800, time + 2.2);

      const oscG = this.ctx.createGain();
      oscG.gain.setValueAtTime(0.25, time);
      oscG.gain.exponentialRampToValueAtTime(0.001, time + 2.2);

      o1.connect(oscG);
      o2.connect(oscG);
      o3.connect(oscG);
      oscG.connect(masterG);

      masterG.connect(this.ctx.destination);

      noiseSource.start(time);
      o1.start(time);
      o2.start(time);
      o3.start(time);

      noiseSource.stop(time + 2.4);
      o1.stop(time + 2.4);
      o2.stop(time + 2.4);
      o3.stop(time + 2.4);
    } catch(e) {}
  }

  // Power Outage sequence sound
  playPowerOut() {
    this.init();
    if (!this.ctx) return;
    try {
      this.stopAmbient();
      // Low synth power-line hum winding down to zero
      const time = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, time);
      osc.frequency.linearRampToValueAtTime(10, time + 2.5);

      gain.gain.setValueAtTime(0.12, time);
      gain.gain.linearRampToValueAtTime(0.0001, time + 2.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(time + 2.6);

      // Mechanical relay switch pop
      setTimeout(() => {
        this.playLight();
      }, 2500);
    } catch (e) {}
  }

  // Distantly playing creepy "Toreador March" music box tune when power is out in the dark
  playCreepyMusicBox() {
    this.init();
    if (!this.ctx) return;
    try {
      const themeNotes = [
        392, 440, 392, 349, 392, 440, 523, 440, 392, 349, 293, // A simplified march tune
        349, 293, 311, 349, 392, 523, 494, 392, 349, 392, 261
      ];
      const duration = 0.4;
      let time = this.ctx.currentTime;

      const masterG = this.ctx.createGain();
      masterG.gain.setValueAtTime(0.08, time); // Echoey and faint

      // Reverb/delay emulator
      const delay = this.ctx.createDelay();
      delay.delayTime.setValueAtTime(0.15, time);
      const delayGain = this.ctx.createGain();
      delayGain.gain.setValueAtTime(0.4, time);

      masterG.connect(this.ctx.destination);
      masterG.connect(delay);
      delay.connect(delayGain);
      delayGain.connect(this.ctx.destination);

      themeNotes.forEach((note, index) => {
        if (!this.ctx) return;
        const noteTime = time + index * duration * 1.5;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Music box metallic sine/square texture
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note, noteTime);

        // Slow decay
        gain.gain.setValueAtTime(0.1, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + duration * 1.8);

        osc.connect(gain);
        gain.connect(masterG);

        osc.start(noteTime);
        osc.stop(noteTime + duration * 2.0);
      });
    } catch(e){}
  }

  // AM Victory sound - Chime, children cheering
  playVictory() {
    this.init();
    if (!this.ctx) return;
    try {
      this.stopAmbient();
      const time = this.ctx.currentTime;

      // Retro clock chime (high sine bells)
      const chimes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C
      chimes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const noteTime = time + idx * 0.4;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();

        o.type = 'sine';
        o.frequency.setValueAtTime(freq, noteTime);
        g.gain.setValueAtTime(0.1, noteTime);
        g.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.8);

        o.connect(g);
        g.connect(this.ctx.destination);
        o.start(noteTime);
        o.stop(noteTime + 0.9);
      });

      // Joyous chime flourish
      setTimeout(() => {
        if (!this.ctx) return;
        const horn = this.ctx.createOscillator();
        const hG = this.ctx.createGain();
        horn.type = 'sawtooth';
        horn.frequency.setValueAtTime(523.25, this.ctx.currentTime);
        horn.frequency.linearRampToValueAtTime(1046.50, this.ctx.currentTime + 1.5);
        
        hG.gain.setValueAtTime(0.04, this.ctx.currentTime);
        hG.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.8);

        horn.connect(hG);
        hG.connect(this.ctx.destination);
        horn.start();
        horn.stop(this.ctx.currentTime + 2.0);
      }, 1600);
    } catch(e) {}
  }

  // Pre-recorded messages from cassettes (Ukrainian phone calls)
  playPhone(night: number, onSubtitle: (text: string) => void) {
    this.init();
    if (!this.ctx) return;
    this.stopPhone();

    let playTime = 0;
    const subtitles: { time: number; text: string }[] = [];

    // Different recordings/texts of mysterious manager / old night-watchman for each night
    if (night === 1) {
      subtitles.push(
        { time: 1, text: "📞 *ОТРИМАНО ГОЛОСОВИЙ ЗАПИС №1*" },
        { time: 4, text: "Гей! Привіт! Емм, вітаю тебе на новій посаді охоронця." },
        { time: 8, text: "Я записую ці касети, бо працював тут за контрактом до тебе." },
        { time: 12, text: "Тут насправді безпечно... ну, майже безпечно, якщо дотримуватись правил." },
        { time: 16, text: "Розважальний центр закрили у 98-му через певні... несправності систем." },
        { time: 20, text: "Ти вже помітив аніматроніків? Наші пухнасті друзі: Блінкі, Зіггі, Сирена та системний дрон." },
        { time: 25, text: "Головна річ - ЕНЕРГІЯ. Генератор слабкий. Не тримай двері зачиненими просто так!" },
        { time: 30, text: "Блінкі (ведмідь) зазвичай активується першим. Він іде лівим коридором." },
        { time: 35, text: "Засвіти ліхтар у дверях, щоб перевірити, чи немає нікого. Удачі, друже!" },
        { time: 40, text: "📞 *КАСЕТУ СКОПІЙОВАНО З АРХІВУ*" }
      );
    } else if (night === 2) {
      subtitles.push(
        { time: 1, text: "📞 *ОТРИМАНО ГОЛОСОВИЙ ЗАПИС №2*" },
        { time: 4, text: "Привіт знову! Сподіваюсь, перша ніч минула без інцидентів." },
        { time: 8, text: "Слухай, маю попередити про Зайця Зіггі. Він у залі автоматів (КАМ 3)." },
        { time: 13, text: "Цей заєць неймовірно швидкий! Коли почуєш залізний скрегіт - він біжить правій двері." },
        { time: 18, text: "Ти повинен зреагувати за секунду і бахнути правою кнопкою закриття дверей!" },
        { time: 23, text: "І не забувай: камери захищають твій офіс лише якщо ти стежиш за маршрутами." },
        { time: 27, text: "Якщо бачиш їх перед очима - не зволікай. Перевіряй світло регулярно!" },
        { time: 32, text: "Бережи енергію. Бувай." }
      );
    } else if (night === 3) {
      subtitles.push(
        { time: 1, text: "📞 *ОТРИМАНО ГОЛОСОВИЙ ЗАПИС №3*" },
        { time: 4, text: "О, ти досі живий? П-п-пробач, я хотів сказати, що ти чудово справляєшся." },
        { time: 8, text: "Сьогодні активується Хекса Сирена. На камері 6 вона виглядає птахом з ріжками." },
        { time: 13, text: "Вона обожнює повзати у вентиляційних трубах. Ліва сторона офісу." },
        { time: 18, text: "Якщо почуєш дивні радіозавади або дзижчання - вона вже у лівому вентиляційному вікні." },
        { time: 23, text: "Клацай лівим світлом обов'язково. Якщо вона там - миттєво закривай ліву створку!" },
        { time: 28, text: "Ах так, не забувай поглядати на КАМ 8 - Куточок Тіней. Будь обережний." }
      );
    } else if (night === 4) {
      subtitles.push(
        { time: 1, text: "📞 *ОТРИМАНО ГОЛОСОВИЙ ЗАПИС №4*" },
        { time: 4, text: "Ніч чотири... Справи стають серйознішими. Поговоримо про Куточок Тіней (КАМ 8)." },
        { time: 9, text: "Там ховається Глітчер. Це колишній дрон безпеки, тепер він поламаний і дикий." },
        { time: 14, text: "Він ненавидить, коли його не контролюють. Ти зобов'язаний заходити на КАМ 8 періодично!" },
        { time: 19, text: "Якщо закинути цю камеру, він почне виповзати. Спочатку зникає з коробки..." },
        { time: 24, text: "А потім біжить прямо в офіс повз будь-які двері і ламає твою систему камер!" },
        { time: 29, text: "Просто поглядай на КАМ 8 хоча б раз на 15 секунд і тримай ситуацію під контролем." },
        { time: 34, text: "Тримайся, залишилось не так багато." }
      );
    } else if (night === 5) {
      subtitles.push(
        { time: 1, text: "📞 *ОТРИМАНО ГОЛОСОВИЙ ЗАПИС №5*" },
        { time: 4, text: "Слухай мене уважно. Це може бути мій останній запис." },
        { time: 8, text: "Сьогодні вони шалено агресивні. Всі четверо будуть атакувати одночасно." },
        { time: 13, text: "Вони знають, що ти там. Не витрачай енергію ні на що зайве!" },
        { time: 18, text: "Тільки швидкі перевірки. Клацнути камеру 8, перевірити світло зліва/справа, закрити якщо треба." },
        { time: 23, text: "Якщо вимкнеться світло... генератор вимкнеться повністю... і почне грати колискова." },
        { time: 28, text: "Сподівайся, що в цей момент годинник покаже 6 ранку. Хай береже тебе Бог." }
      );
    } else {
      subtitles.push(
        { time: 1, text: "📞 *ПОПЕРЕДЖЕННЯ СИСТЕМИ: АНОМАЛЬНА НІЧ 6*" },
        { time: 5, text: "Помилка завантаження касети... Тільки статичний крик металу." },
        { time: 10, text: "Аніматроніки працюють в режимі екстремального перенавантаження AI = 20." },
        { time: 15, text: "Швидкість та лють максимальні. Виживи, якщо твої нерви з міцного заліза!" }
      );
    }

    // Play retro radio-static background
    if (this.ctx) {
      try {
        const time = this.ctx.currentTime;
        const phoneOsc = this.ctx.createOscillator();
        const phoneGain = this.ctx.createGain();

        // High frequency filtered sine to mimic phone audio distortion
        phoneOsc.type = 'triangle';
        phoneOsc.frequency.setValueAtTime(450, time);

        // Modulator for speech-like wobbling
        const speechMod = this.ctx.createOscillator();
        speechMod.frequency.setValueAtTime(4, time);
        const speechModGain = this.ctx.createGain();
        speechModGain.gain.setValueAtTime(50, time);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, time);
        filter.Q.setValueAtTime(1.5, time);

        phoneGain.gain.setValueAtTime(0.02, time);

        speechMod.connect(speechModGain);
        speechModGain.connect(phoneOsc.frequency);
        phoneOsc.connect(filter);
        filter.connect(phoneGain);
        phoneGain.connect(this.ctx.destination);

        speechMod.start();
        phoneOsc.start();

        this.phoneOsc = phoneOsc;
        this.phoneGain = phoneGain;
      } catch (e) {}
    }

    // Interval timers to publish subtitles
    subtitles.forEach(sub => {
      this.phoneTimer = setTimeout(() => {
        onSubtitle(sub.text);
        if (this.ctx && this.phoneOsc) {
          // Play a click sound on subtitle update
          try {
            const beep = this.ctx.createOscillator();
            const beepG = this.ctx.createGain();
            beep.type = 'sine';
            beep.frequency.setValueAtTime(500, this.ctx.currentTime);
            beepG.gain.setValueAtTime(0.005, this.ctx.currentTime);
            beepG.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.05);
            beep.connect(beepG);
            beepG.connect(this.ctx.destination);
            beep.start();
            beep.stop(this.ctx.currentTime + 0.06);
          } catch(err){}
        }
      }, sub.time * 1000);
    });

    // Stop phone audio after 45s
    setTimeout(() => {
      this.stopPhone();
    }, 45000);
  }

  stopPhone() {
    if (this.phoneTimer) {
      clearTimeout(this.phoneTimer);
      this.phoneTimer = null;
    }
    if (this.phoneOsc) {
      try { this.phoneOsc.stop(); } catch(e){}
      this.phoneOsc = null;
    }
    this.phoneGain = null;
  }
}

export const soundEngine = new SoundEngine();
export default soundEngine;
