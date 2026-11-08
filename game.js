/**
 * ============================================================================
 * CANAVAR ARABALAR: MAVİ RAMPA MACERASI (#75 Flame Crusher & #18 Game Racing)
 * iPadOS (WebKit/Safari) 60 FPS Optimize 2D Fizik ve Sonsuz Sandbox Motoru
 * ============================================================================
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. SABİTLER VE ARAÇ TASARIM PROFİLLERİ
  // --------------------------------------------------------------------------
  const TRUCK_PROFILES = {
    green75: {
      id: 'green75',
      number: '75',
      name: '#75 FLAME CRUSHER',
      bodyPrimary: '#4ec925',
      bodyLight: '#8cf552',
      bodyDark: '#1f6e0a',
      rimColor: '#e61919',
      rimLight: '#ff4d4d',
      rimDark: '#8c0808',
      flameOuter: '#ff5100',
      flameInner: '#ffd000'
    },
    red18: {
      id: 'red18',
      number: '18',
      name: '#18 GAME RACING',
      bodyPrimary: '#e61919',
      bodyLight: '#ff5252',
      bodyDark: '#8c0808',
      rimColor: '#0066ee',
      rimLight: '#3399ff',
      rimDark: '#00368c',
      stripeColor: '#ffffff',
      accentColor: '#00d9ff'
    }
  };

  const RAMP_TYPES = [
    {
      kind: 'small',
      label: 'MAVİ RAMPA',
      width: 240,
      height: 95,
      boostMultiplier: 1.12,
      upwardKick: 260,
      hasBooster: false
    },
    {
      kind: 'medium',
      label: 'SÜPER MAVİ RAMPA',
      width: 320,
      height: 145,
      boostMultiplier: 1.22,
      upwardKick: 370,
      hasBooster: false
    },
    {
      kind: 'boost',
      label: 'TURBO MAVİ RAMPA',
      width: 340,
      height: 155,
      boostMultiplier: 1.48,
      upwardKick: 430,
      hasBooster: true
    },
    {
      kind: 'mega',
      label: 'MEGA MAVİ RAMPA!',
      width: 430,
      height: 225,
      boostMultiplier: 1.55,
      upwardKick: 560,
      hasBooster: true
    }
  ];

  // --------------------------------------------------------------------------
  // 2. WEB AUDIO API SES SENTEZLEYİCİ (Sıfır Harici Ses Dosyası)
  // --------------------------------------------------------------------------
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.unlocked = false;
      this.engineOsc = null;
      this.engineSub = null;
      this.engineGain = null;
      this.starCombo = 0;
      this.lastStarTime = 0;
      this.lastSmashTime = 0;
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
          this.ctx.resume().catch(() => {});
        }
        if (!this.unlocked && this.ctx.state === 'running') {
          this.unlocked = true;
        }
        return;
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      try {
        this.ctx = new AudioCtx();
        if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
          this.ctx.resume().catch(() => {});
        }
        // iPadOS Safari WebKit sessiz tampon (silent buffer) ile ses kanalını aç
        const silentBuf = this.ctx.createBuffer(1, 1, 22050);
        const src = this.ctx.createBufferSource();
        src.buffer = silentBuf;
        src.connect(this.ctx.destination);
        src.start(0);

        this.setupEngineSound();
        this.unlocked = this.ctx.state === 'running';
      } catch (e) {
        // Ses bağlamı oluşturulamazsa sessiz devam et
      }
    }

    resumeIfNeeded() {
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
        this.ctx.resume().catch(() => {});
      }
    }

    setupEngineSound() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.001, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, now);

      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(46, now);

      this.engineSub = this.ctx.createOscillator();
      this.engineSub.type = 'triangle';
      this.engineSub.frequency.setValueAtTime(23, now);

      this.engineOsc.connect(filter);
      this.engineSub.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start(now);
      this.engineSub.start(now);
    }

    updateEngine(speedRatio, throttleActive, paused) {
      if (!this.ctx || !this.engineGain || !this.engineOsc) return;
      const now = this.ctx.currentTime;
      if (this.muted || paused) {
        this.engineGain.gain.setTargetAtTime(0.0001, now, 0.08);
        return;
      }
      if (throttleActive && (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted')) {
        this.resumeIfNeeded();
      }
      const clampedSpeed = Math.min(Math.max(speedRatio, 0), 1.5);
      const baseFreq = 42 + clampedSpeed * 68 + (throttleActive ? 18 : 0);
      const targetGain = throttleActive ? 0.055 : 0.025;
      this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.06);
      this.engineSub.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.06);
      this.engineGain.gain.setTargetAtTime(targetGain, now, 0.08);
    }

    toggleMute() {
      this.init();
      this.muted = !this.muted;
      return this.muted;
    }

    playHorn() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [330, 415.3, 493.88, 659.25];
      for (let i = 0; i < notes.length; i++) {
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc2.type = 'triangle';
        const start = now + i * 0.085;
        const dur = i === notes.length - 1 ? 0.28 : 0.08;

        osc.frequency.setValueAtTime(notes[i], start);
        osc2.frequency.setValueAtTime(notes[i] * 1.5, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.11, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc2.start(start);
        osc.stop(start + dur + 0.02);
        osc2.stop(start + dur + 0.02);
      }
    }

    playStar() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      if (now - this.lastStarTime > 1.2) {
        this.starCombo = 0;
      }
      this.lastStarTime = now;

      const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];
      const freq = scale[this.starCombo % scale.length];
      this.starCombo++;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.14);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    }

    playRampLaunch(isMega) {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(isMega ? 880 : 620, now + 0.36);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.42);
    }

    playFlipFanfare() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const chord = [523.25, 659.25, 783.99, 1046.5];
      for (let i = 0; i < chord.length; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + i * 0.06;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(chord[i], start);

        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.37);
      }
    }

    playSmash() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      if (now - this.lastSmashTime < 0.07) return;
      this.lastSmashTime = now;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);

      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    }

    playBoing() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.25);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  }

  // --------------------------------------------------------------------------
  // 3. NESNE HAVUZLARI (OBJECT POOLING - iPad 60 FPS GC Koruması)
  // --------------------------------------------------------------------------
  class ParticlePool {
    constructor(size) {
      this.size = size;
      this.items = new Array(size);
      for (let i = 0; i < size; i++) {
        this.items[i] = {
          active: false,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          radius: 4,
          color: '#ffffff',
          alpha: 1,
          life: 0,
          maxLife: 0.5,
          gravity: 0,
          shape: 'circle', // 'circle' | 'star' | 'rect'
          rot: 0,
          vRot: 0
        };
      }
    }

    spawn(x, y, vx, vy, radius, color, maxLife, gravity, shape) {
      for (let i = 0; i < this.size; i++) {
        const p = this.items[i];
        if (!p.active) {
          p.active = true;
          p.x = x;
          p.y = y;
          p.vx = vx;
          p.vy = vy;
          p.radius = radius;
          p.color = color;
          p.alpha = 1;
          p.life = 0;
          p.maxLife = maxLife || 0.5;
          p.gravity = gravity || 0;
          p.shape = shape || 'circle';
          p.rot = Math.random() * Math.PI * 2;
          p.vRot = (Math.random() - 0.5) * 10;
          return p;
        }
      }
      return null;
    }

    updateAndDraw(ctx, dt, camX, camY, viewW, viewH) {
      for (let i = 0; i < this.size; i++) {
        const p = this.items[i];
        if (!p.active) continue;

        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }

        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vRot * dt;
        p.alpha = 1 - p.life / p.maxLife;

        // Ekran dışı temizleme (Off-screen culling)
        const sx = p.x - camX;
        const sy = p.y - camY;
        if (sx < -60 || sx > viewW + 60 || sy < -60 || sy > viewH + 60) {
          if (sx < -200) p.active = false;
          continue;
        }

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(p.rot);
          const s = p.radius * 1.8;
          ctx.fillRect(-s * 0.5, -s * 0.35, s, s * 0.7);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(sx, sy, p.radius * (0.4 + 0.6 * p.alpha), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  class FloatingTextPool {
    constructor(size) {
      this.size = size;
      this.items = new Array(size);
      for (let i = 0; i < size; i++) {
        this.items[i] = {
          active: false,
          x: 0,
          y: 0,
          vy: -80,
          text: '',
          color: '#ffd000',
          life: 0,
          maxLife: 1.0,
          scale: 1,
          withStar: false
        };
      }
    }

    spawn(x, y, text, color, scale, withStar) {
      for (let i = 0; i < this.size; i++) {
        const item = this.items[i];
        if (!item.active) {
          item.active = true;
          item.x = x;
          item.y = y;
          item.vy = -95;
          item.text = text;
          item.color = color || '#ffd000';
          item.life = 0;
          item.maxLife = 1.05;
          item.scale = scale || 1;
          item.withStar = Boolean(withStar);
          return;
        }
      }
    }

    updateAndDraw(ctx, dt, camX, camY, viewW) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      const starSprite = SpriteCache.starSprite;

      for (let i = 0; i < this.size; i++) {
        const item = this.items[i];
        if (!item.active) continue;

        item.life += dt;
        if (item.life >= item.maxLife) {
          item.active = false;
          continue;
        }

        item.y += item.vy * dt;
        item.vy *= 0.96;

        const sx = item.x - camX;
        const sy = item.y - camY;
        if (sx < -150 || sx > viewW + 150) continue;

        const alpha = item.life < 0.7 ? 1 : 1 - (item.life - 0.7) / 0.35;
        ctx.globalAlpha = Math.max(0, alpha);
        const fontSize = Math.round(24 * item.scale);
        ctx.font = `900 ${fontSize}px "Arial Black", sans-serif`;
        ctx.strokeStyle = '#091428';
        ctx.lineWidth = 6;

        if (item.withStar && starSprite && starSprite.canvas) {
          const textW = ctx.measureText(item.text).width;
          const iconSize = Math.round(26 * item.scale);
          const totalOffset = (iconSize + 4) * 0.5;
          const tx = sx - totalOffset;
          ctx.strokeText(item.text, tx, sy);
          ctx.fillStyle = item.color;
          ctx.fillText(item.text, tx, sy);
          ctx.drawImage(
            starSprite.canvas,
            tx + textW * 0.5 + 4,
            sy - iconSize * 0.82,
            iconSize,
            iconSize
          );
        } else {
          ctx.strokeText(item.text, sx, sy);
          ctx.fillStyle = item.color;
          ctx.fillText(item.text, sx, sy);
        }
      }
      ctx.restore();
    }
  }

  // --------------------------------------------------------------------------
  // 4. VEKTÖREL CANAVAR ARABA ÇİZİM MOTORU (#75 YEŞİL & #18 KIRMIZI)
  // --------------------------------------------------------------------------
  const SpriteCache = {
    body75: null,
    body18: null,
    wheelRed: null,
    wheelBlue: null,
    starSprite: null,
    dpr: 1,

    buildAll(dpr) {
      this.dpr = dpr;
      this.body75 = this.createTruckBodySprite('green75', dpr);
      this.body18 = this.createTruckBodySprite('red18', dpr);
      this.wheelRed = this.createWheelSprite(TRUCK_PROFILES.green75, dpr);
      this.wheelBlue = this.createWheelSprite(TRUCK_PROFILES.red18, dpr);
      this.starSprite = this.createStarSprite(dpr);
    },

    createTruckBodySprite(type, dpr) {
      const w = 240;
      const h = 130;
      const c = document.createElement('canvas');
      c.width = w * dpr;
      c.height = h * dpr;
      const ctx = c.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.translate(w * 0.5, h * 0.58);
      drawTruckBodyVector(ctx, type);
      return { canvas: c, width: w, height: h, anchorX: w * 0.5, anchorY: h * 0.58 };
    },

    createWheelSprite(profile, dpr) {
      const size = 104;
      const c = document.createElement('canvas');
      c.width = size * dpr;
      c.height = size * dpr;
      const ctx = c.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.translate(size * 0.5, size * 0.5);
      drawMonsterWheelVector(ctx, 44, profile);
      return { canvas: c, size: size };
    },

    createStarSprite(dpr) {
      const size = 48;
      const c = document.createElement('canvas');
      c.width = size * dpr;
      c.height = size * dpr;
      const ctx = c.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.translate(size * 0.5, size * 0.5);

      ctx.beginPath();
      const spikes = 5;
      const outerR = 19;
      const innerR = 9;
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (i * Math.PI) / spikes - Math.PI / 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = '#ffd700';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ff8800';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(-4, -4, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff9c4';
      ctx.fill();

      return { canvas: c, size: size };
    }
  };

  /**
   * Referans fotoğraflardaki #75 Yeşil Flame Crusher ve #18 Kırmızı Game Racing
   * araçlarının detaylı vektörel gövde ve şasi çizimi
   */
  function drawTruckBodyVector(ctx, type) {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // 1. ALT MEKANİK GRİ KAFES ŞASİ (Her iki araçta da bulunan yüksek gri şasi)
    ctx.fillStyle = '#5c6470';
    ctx.strokeStyle = '#23272e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-72, 4);
    ctx.lineTo(74, 4);
    ctx.lineTo(64, 24);
    ctx.lineTo(-62, 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Şasi iç mekanik çubuklar (Truss detayları)
    ctx.strokeStyle = '#8b94a3';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-54, 7);
    ctx.lineTo(-34, 21);
    ctx.lineTo(-14, 7);
    ctx.lineTo(14, 21);
    ctx.lineTo(34, 7);
    ctx.lineTo(54, 21);
    ctx.stroke();

    // Çamurluk altı siyah amortisör kuleleri
    ctx.fillStyle = '#2d323b';
    ctx.fillRect(-68, -6, 28, 14);
    ctx.fillRect(40, -6, 28, 14);

    if (type === 'green75') {
      // ======================================================================
      // #75 YEŞİL CANAVAR ARABA ("FLAME CRUSHER") - Referans Fotoğraf 1 & 2
      // ======================================================================

      // Arka kasa üstündeki eğimli yedek lastik / türbin modülü (Fotoğraftaki karakteristik parça)
      ctx.save();
      ctx.translate(-64, -30);
      ctx.rotate(-0.18);
      ctx.fillStyle = '#389e19';
      ctx.strokeStyle = '#143b06';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-22, -12, 42, 20, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#6ee344';
      ctx.beginPath();
      ctx.ellipse(0, -6, 13, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Arka siyah roll-bar çapraz demirleri
      ctx.strokeStyle = '#1e2229';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-26, -54);
      ctx.lineTo(-76, -24);
      ctx.moveTo(-42, -24);
      ctx.lineTo(-22, -50);
      ctx.stroke();

      // Ana Metalik Yeşil Baja Kamyonet Gövdesi
      const bodyGrad = ctx.createLinearGradient(0, -60, 0, 12);
      bodyGrad.addColorStop(0, '#88f24e');
      bodyGrad.addColorStop(0.45, '#4ec925');
      bodyGrad.addColorStop(1, '#227509');

      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = '#123805';
      ctx.lineWidth = 3.5;

      ctx.beginPath();
      ctx.moveTo(-92, 4);        // Arka alt tampon
      ctx.lineTo(-96, -22);      // Arka kuyruk çıkıntısı
      ctx.lineTo(-82, -30);      // Arka kasa üstü
      ctx.lineTo(-42, -30);      // Kabin arkası
      ctx.lineTo(-26, -58);      // Tavan arka köşe
      ctx.lineTo(22, -58);       // Tavan ön köşe
      ctx.lineTo(48, -28);       // Ön cam altı / kaput başlangıcı
      ctx.lineTo(94, -20);       // Eğimli agresif burun ucu
      ctx.lineTo(98, -4);        // Ön tampon üstü
      ctx.lineTo(86, 6);         // Ön alt köşe
      ctx.lineTo(68, 6);
      // Ön tekerlek kemeri
      ctx.arc(54, 6, 22, 0, Math.PI, true);
      ctx.lineTo(-32, 6);
      // Arka tekerlek kemeri
      ctx.arc(-54, 6, 22, 0, Math.PI, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Kaput ve Yan Gövde Turuncu-Sarı Alev (Flame) Desenleri
      ctx.fillStyle = '#ff6a00';
      ctx.strokeStyle = '#1a0d00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(92, -16);
      ctx.lineTo(54, -24);
      ctx.lineTo(66, -15);
      ctx.lineTo(40, -16);
      ctx.lineTo(58, -8);
      ctx.lineTo(34, -4);
      ctx.lineTo(88, -5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Alev içi sarı katman
      ctx.fillStyle = '#ffd500';
      ctx.beginPath();
      ctx.moveTo(90, -13);
      ctx.lineTo(64, -18);
      ctx.lineTo(72, -12);
      ctx.lineTo(55, -10);
      ctx.lineTo(86, -7);
      ctx.closePath();
      ctx.fill();

      // Arka çamurluk altı alev şeritleri
      ctx.fillStyle = '#ff7300';
      ctx.beginPath();
      ctx.moveTo(-28, 3);
      ctx.lineTo(-8, -8);
      ctx.lineTo(-16, -1);
      ctx.lineTo(2, -4);
      ctx.lineTo(-10, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ön Siyah Bullbar Tampon ve Far Detayı
      ctx.fillStyle = '#22262e';
      ctx.beginPath();
      ctx.roundRect(88, -16, 13, 22, 4);
      ctx.fill();
      ctx.stroke();

      // Parlak Sarı Ön Far
      ctx.fillStyle = '#fff066';
      ctx.beginPath();
      ctx.roundRect(88, -18, 7, 7, 2);
      ctx.fill();

      // Koyu Renkli Ön ve Yan Camlar
      ctx.fillStyle = '#1b2636';
      ctx.strokeStyle = '#0f1722';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-8, -51);
      ctx.lineTo(19, -51);
      ctx.lineTo(40, -28);
      ctx.lineTo(-8, -28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cam parlama çizgisi
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(14, -48);
      ctx.lineTo(28, -31);
      ctx.stroke();

      // Arka küçük kelebek cam ve ızgara (Louvers)
      ctx.fillStyle = '#1b2636';
      ctx.beginPath();
      ctx.moveTo(-24, -50);
      ctx.lineTo(-13, -50);
      ctx.lineTo(-13, -30);
      ctx.lineTo(-32, -30);
      ctx.closePath();
      ctx.fill();

      // Kapı Üstünde Turuncu "75" Numarası (Fotoğraftaki gibi koyu konturlu)
      ctx.font = '900 26px "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#122406';
      ctx.lineWidth = 5;
      ctx.strokeText('75', 6, -3);
      ctx.fillStyle = '#ff7b00';
      ctx.fillText('75', 6, -3);
    } else {
      // ======================================================================
      // #18 KIRMIZI CANAVAR ARABA ("GAME RACING") - Referans Fotoğraf 1 & 2
      // ======================================================================

      // Arka açık kasa içi siyah zemin (Bed liner)
      ctx.fillStyle = '#1e2229';
      ctx.fillRect(-92, -33, 52, 10);

      // Ana Parlak Kırmızı Pickup Gövdesi
      const redGrad = ctx.createLinearGradient(0, -60, 0, 12);
      redGrad.addColorStop(0, '#ff4d4d');
      redGrad.addColorStop(0.45, '#e61919');
      redGrad.addColorStop(1, '#990808');

      ctx.fillStyle = redGrad;
      ctx.strokeStyle = '#4d0303';
      ctx.lineWidth = 3.5;

      ctx.beginPath();
      ctx.moveTo(-94, 4);        // Arka alt tampon
      ctx.lineTo(-94, -30);      // Düz pickup arka kasa duvarı
      ctx.lineTo(-34, -30);      // Kasa-kabin birleşimi
      ctx.lineTo(-30, -58);      // Kabin arka dik tavanı
      ctx.lineTo(24, -58);       // Tavan önü
      ctx.lineTo(48, -30);       // Ön cam inişi
      ctx.lineTo(94, -25);       // Pickup düz kaput üstü
      ctx.lineTo(96, -2);        // Ön ızgara
      ctx.lineTo(86, 6);
      ctx.lineTo(68, 6);
      // Ön tekerlek kemeri
      ctx.arc(54, 6, 22, 0, Math.PI, true);
      ctx.lineTo(-32, 6);
      // Arka tekerlek kemeri
      ctx.arc(-54, 6, 22, 0, Math.PI, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Arka Kasa Yanındaki Beyaz Diyagonal Yarış Şeritleri (///)
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 3; i++) {
        const sx = -42 + i * 11;
        ctx.beginPath();
        ctx.moveTo(sx, -2);
        ctx.lineTo(sx + 10, -18);
        ctx.lineTo(sx + 16, -18);
        ctx.lineTo(sx + 6, -2);
        ctx.closePath();
        ctx.fill();
      }

      // Kaput Üstü Beyaz Yarış Şeritleri
      ctx.beginPath();
      ctx.moveTo(46, -28);
      ctx.lineTo(64, -26);
      ctx.lineTo(54, -14);
      ctx.lineTo(40, -16);
      ctx.closePath();
      ctx.fill();

      // Ön Çamurluk / Kaput Yanında Daire İçinde "18" Rozeti
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(73, -14, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#cc0000';
      ctx.font = '900 12px "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('18', 73, -10);

      // Yan Gövdede "GAME RACING" Yazısı (Fotoğraftaki gibi kapı ve kasa boyunca)
      ctx.font = '900 11px "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 3.5;
      ctx.strokeText('GAME', 6, -18);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('GAME', 6, -18);

      ctx.strokeText('RACING', -58, -18);
      ctx.fillStyle = '#ffe600';
      ctx.fillText('RACING', -58, -18);

      // Kapı üstündeki siyah-beyaz yarış arması (Fotoğraf 2'deki kare arma)
      ctx.fillStyle = '#181c24';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.fillRect(-4, -14, 14, 12);
      ctx.strokeRect(-4, -14, 14, 12);

      // Çift Bölmeli Koyu Kabin Camları (Kırmızı orta direkli)
      ctx.fillStyle = '#1a2433';
      ctx.strokeStyle = '#0d131c';
      ctx.lineWidth = 2;
      // Arka kabin camı
      ctx.beginPath();
      ctx.roundRect(-25, -51, 18, 20, 3);
      ctx.fill();
      ctx.stroke();
      // Ön kapı camı
      ctx.beginPath();
      ctx.moveTo(-2, -51);
      ctx.lineTo(20, -51);
      ctx.lineTo(40, -31);
      ctx.lineTo(-2, -31);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ön Siyah Izgara ve Farlar
      ctx.fillStyle = '#1e2229';
      ctx.beginPath();
      ctx.roundRect(89, -22, 10, 22, 3);
      ctx.fill();

      ctx.fillStyle = '#dcf5ff';
      ctx.fillRect(88, -21, 6, 7);
    }

    ctx.restore();
  }

  /**
   * Devasa dişli siyah lastikler ve parlak KIRMIZI (#75) veya MAVİ (#18) iç jantlar
   */
  function drawMonsterWheelVector(ctx, radius, profile) {
    ctx.save();

    // 1. Dış Dişli Siyah Lastik Çıkıntıları (12 adet derin diş)
    const lugs = 12;
    ctx.fillStyle = '#1a1d22';
    for (let i = 0; i < lugs; i++) {
      const angle = (i * Math.PI * 2) / lugs;
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.roundRect(-7, -radius - 4, 14, 10, 3);
      ctx.fill();
      ctx.restore();
    }

    // 2. Ana Lastik Gövdesi
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#252930';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#121417';
    ctx.stroke();

    // Lastik yanak kauçuk halkası ve diş izleri
    ctx.beginPath();
    ctx.arc(0, 0, radius - 7, 0, Math.PI * 2);
    ctx.strokeStyle = '#353b45';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 3. Parlak Derin İç Jant (Kırmızı #75 veya Mavi #18)
    const rimR = radius * 0.54;
    ctx.beginPath();
    ctx.arc(0, 0, rimR, 0, Math.PI * 2);
    ctx.fillStyle = profile.rimDark;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = profile.rimLight;
    ctx.stroke();

    // İç jant çanağı
    ctx.beginPath();
    ctx.arc(0, 0, rimR * 0.78, 0, Math.PI * 2);
    ctx.fillStyle = profile.rimColor;
    ctx.fill();

    // Jant kolları / bijon yıldızı (Dönüş hissini güçlendirir)
    ctx.fillStyle = profile.rimLight;
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      const bx = Math.cos(a) * (rimR * 0.48);
      const by = Math.sin(a) * (rimR * 0.48);
      ctx.beginPath();
      ctx.arc(bx, by, 3.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Merkez aks göbeği
    ctx.beginPath();
    ctx.arc(0, 0, rimR * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = '#22262e';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#b0b8c4';
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Dinamik Yay / Süspansiyon Çizimi (Her karede sıkışma miktarına göre esner)
   */
  function drawDynamicSuspension(ctx, topX, topY, bottomX, bottomY, rimColor) {
    ctx.save();
    // Çapraz diferansiyel aks kolu (4-link suspension bar)
    ctx.strokeStyle = '#484f5c';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.lineTo(bottomX, bottomY);
    ctx.stroke();

    // Amortisör iç krom piston mili
    ctx.strokeStyle = '#d8e2ef';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.lineTo(bottomX, bottomY);
    ctx.stroke();

    // Helezon Yay (Coil Spring) - Sıkışmaya göre gerçek zamanlı zikzak
    const coils = 6;
    const dx = bottomX - topX;
    const dy = bottomY - topY;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    const coilWidth = 9;

    ctx.strokeStyle = '#9aa4b5';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    for (let i = 1; i < coils * 2; i++) {
      const t = i / (coils * 2);
      const side = i % 2 === 0 ? 1 : -1;
      const cx = topX + dx * t + px * side * coilWidth;
      const cy = topY + dy * t + py * side * coilWidth;
      ctx.lineTo(cx, cy);
    }
    ctx.lineTo(bottomX, bottomY);
    ctx.stroke();

    // Aks bağlantı somunu
    ctx.fillStyle = rimColor;
    ctx.beginPath();
    ctx.arc(bottomX, bottomY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // 5. CANAVAR ARABA FİZİK SINIFI (Süspansiyon, Havada Takla, Otomatik Düzeltme)
  // --------------------------------------------------------------------------
  class MonsterTruck {
    constructor(profileKey, startX, startY, isAI) {
      this.profileKey = profileKey;
      this.profile = TRUCK_PROFILES[profileKey];
      this.isAI = Boolean(isAI);

      this.x = startX;
      this.y = startY;
      this.vx = 0;
      this.vy = 0;
      this.angle = 0;
      this.vAngle = 0;

      // Tekerlek ve Süspansiyon Parametreleri
      this.wheelBase = 108; // Ön ve arka aks mesafesi (-54 ve +54)
      this.wheelRadius = 44;
      this.restSuspension = 42;
      this.rearSus = this.restSuspension;
      this.frontSus = this.restSuspension;
      this.wheelRot = 0;

      // Durum Bayrakları
      this.grounded = false;
      this.airTime = 0;
      this.cumulativeFlipAngle = 0;
      this.upsideDownTimer = 0;
      this.hornBounceTimer = 0;
      this.nitroActive = false;
      this.lastRampId = -1;
    }

    setProfile(profileKey) {
      this.profileKey = profileKey;
      this.profile = TRUCK_PROFILES[profileKey];
    }

    triggerJump(sound, floatingTexts, particles) {
      if (this.grounded || this.airTime < 0.35) {
        this.vy = Math.min(this.vy, -460);
        this.grounded = false;
        this.rearSus = this.restSuspension + 12;
        this.frontSus = this.restSuspension + 12;
        sound.playBoing();
        floatingTexts.spawn(this.x, this.y - 75, 'HOP!', '#00e5ff', 1.05);
        for (let i = 0; i < 10; i++) {
          particles.spawn(
            this.x + (Math.random() - 0.5) * 80,
            this.y + 45,
            (Math.random() - 0.5) * 160,
            Math.random() * -120,
            6,
            '#00e5ff',
            0.45,
            300,
            'circle'
          );
        }
      } else {
        // Havadayken veya tersken düzeltme & ekstra zıplama desteği
        this.vAngle *= 0.2;
        this.angle = this.angle * 0.3;
        this.vy = Math.min(this.vy, -280);
        sound.playBoing();
      }
    }

    triggerHorn(sound, floatingTexts, particles) {
      this.hornBounceTimer = 0.45;
      if (this.grounded) {
        this.vy = Math.min(this.vy, -190);
      }
      sound.playHorn();
      floatingTexts.spawn(this.x + 20, this.y - 85, 'DÜÜT DÜÜT!', '#ffd000', 1.05);
      const colors = ['#ffd000', '#ff5500', '#00e5ff', '#5ce62e'];
      for (let i = 0; i < 12; i++) {
        particles.spawn(
          this.x + 65,
          this.y - 25,
          80 + Math.random() * 180,
          (Math.random() - 0.7) * 200,
          7,
          colors[i % colors.length],
          0.55,
          200,
          'circle'
        );
      }
    }

    update(dt, input, world, sound, particles, floatingTexts, onFlipCallback) {
      const gravity = 980;
      const maxSpeed = input.nitro ? 1120 : 820;
      const accel = input.nitro ? 1450 : 920;

      this.nitroActive = Boolean(input.nitro);

      if (this.hornBounceTimer > 0) {
        this.hornBounceTimer = Math.max(0, this.hornBounceTimer - dt);
      }

      // 1. İleri / Geri ve Nitro İvmesi
      if (input.gas || input.nitro) {
        if (this.grounded) {
          this.vx += accel * dt;
        } else {
          this.vx += accel * 0.42 * dt;
          // Havada Gaz basılıysa öne veya arkaya dengeli takla torku
          if (input.brake) {
            this.vAngle -= 7.8 * dt;
          } else {
            this.vAngle += 4.2 * dt;
          }
        }
      } else if (input.brake) {
        if (this.grounded) {
          this.vx -= 780 * dt;
        } else {
          // Havada Geri/Takla tuşu hızlı geriye takla (Backflip) attırır!
          this.vAngle -= 8.8 * dt;
        }
      } else if (this.grounded) {
        // Doğal sürtünme
        this.vx *= Math.pow(0.55, dt);
        if (Math.abs(this.vx) < 8) this.vx = 0;
      }

      // Hız sınırlandırma
      if (this.vx > maxSpeed) {
        this.vx += (maxSpeed - this.vx) * 5 * dt;
      }
      if (this.vx < -420) {
        this.vx = -420;
      }

      // Yerçekimi ve Konum Güncellemesi
      this.vy += gravity * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Sol sınır koruması
      if (this.x < 120) {
        this.x = 120;
        if (this.vx < 0) this.vx = 0;
      }

      // Açısal hız sınırı ve dönüş
      this.vAngle = Math.max(-9.5, Math.min(9.5, this.vAngle));
      const prevAngle = this.angle;
      this.angle += this.vAngle * dt;

      // 2. Ön ve Arka Tekerlek Dünya Koordinatları ve Süspansiyon Hesabı
      const cosA = Math.cos(this.angle);
      const sinA = Math.sin(this.angle);
      const halfBase = this.wheelBase * 0.5;

      const rearWheelX = this.x - cosA * halfBase;
      const frontWheelX = this.x + cosA * halfBase;

      const rearSurf = world.getSurfaceInfo(rearWheelX);
      const frontSurf = world.getSurfaceInfo(frontWheelX);

      const rearHubTargetY = rearSurf.y - this.wheelRadius;
      const frontHubTargetY = frontSurf.y - this.wheelRadius;

      const rearMountY = this.y - sinA * halfBase;
      const frontMountY = this.y + sinA * halfBase;

      const rearDist = rearHubTargetY - rearMountY;
      const frontDist = frontHubTargetY - frontMountY;

      const maxExtend = this.restSuspension + 14;
      const minCompress = 18;

      const rearTouching = rearDist <= maxExtend && this.vy >= -180;
      const frontTouching = frontDist <= maxExtend && this.vy >= -180;
      const wasGrounded = this.grounded;
      this.grounded = rearTouching || frontTouching;

      if (this.grounded) {
        // Süspansiyon yay esnemesi
        this.rearSus = Math.max(minCompress, Math.min(maxExtend, rearDist));
        this.frontSus = Math.max(minCompress, Math.min(maxExtend, frontDist));

        // Hedef gövde yüksekliği ve eğimi
        const avgGroundY = (rearHubTargetY + frontHubTargetY) * 0.5 - this.restSuspension;
        const penetration = this.y - avgGroundY;

        if (penetration > 0) {
          // Yay kuvveti ve sönümleme (Spring-Damper)
          this.y -= penetration * Math.min(1, 18 * dt);
          if (this.vy > 0) {
            // Sert inişte tatlı yaylanma ve toz efekti
            if (!wasGrounded && this.vy > 320 && !this.isAI) {
              for (let i = 0; i < 8; i++) {
                particles.spawn(
                  this.x + (Math.random() - 0.5) * 90,
                   avgGroundY + 65,
                  (Math.random() - 0.5) * 180,
                  -40 - Math.random() * 90,
                  6 + Math.random() * 4,
                  '#d9c398',
                  0.45,
                  250,
                  'circle'
                );
              }
            }
            this.vy = -this.vy * 0.15;
            if (Math.abs(this.vy) < 35) this.vy = 0;
          }
        }

        // Zemin/Mavi Rampa eğimine uyum sağlama
        const targetSlopeAngle = Math.atan2(frontSurf.y - rearSurf.y, this.wheelBase);

        // Eğer araç düzse (ters dönmemişse) zemine yumuşakça hizalan
        if (Math.cos(this.angle - targetSlopeAngle) > 0.25) {
          let diff = targetSlopeAngle - this.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          this.angle += diff * Math.min(1, 14 * dt);
          this.vAngle *= Math.pow(0.08, dt);
        }

        // Mavi Rampa Üstündeyken Yokuş Tırmanma Desteği ve Fırlatma (Launch)!
        const activeRamp = frontSurf.ramp || rearSurf.ramp;
        if (activeRamp) {
          // Çocuk gazı az verse bile mavi rampada geriye kaymasın, rahatça tırmansın
          if (input.gas || input.nitro || this.vx > 90) {
            this.vx = Math.max(this.vx, activeRamp.hasBooster ? 680 : 480);
          }
          // Hızlandırıcılı (Turbo) mavi rampalarda otomatik roket ivmesi
          if (activeRamp.hasBooster) {
            this.vx = Math.min(maxSpeed * 1.18, this.vx + 950 * dt);
            this.nitroActive = true;
          }

          // Mavi Rampanın Zirvesinden (Uç Kısmından) Havaya Fırlatma Anı!
          const distToLip = activeRamp.x + activeRamp.width - frontWheelX;
          if (distToLip >= -28 && distToLip <= 42 && this.lastRampId !== activeRamp.id && this.vx > 220) {
            this.lastRampId = activeRamp.id;
            this.vx = Math.max(this.vx * activeRamp.boostMultiplier, 560);
            this.vy = -Math.max(activeRamp.upwardKick, this.vx * 0.58);
            this.vAngle = -1.35; // Havalanırken havalı burun kaldırma
            this.grounded = false;

            if (!this.isAI) {
              sound.playRampLaunch(activeRamp.kind === 'mega');
              floatingTexts.spawn(
                this.x + 30,
                this.y - 70,
                activeRamp.kind === 'mega' ? 'MEGA MAVİ RAMPA!' : 'SÜPER UÇUŞ!',
                '#00e5ff',
                activeRamp.kind === 'mega' ? 1.25 : 1.05
              );
              for (let i = 0; i < 16; i++) {
                particles.spawn(
                  frontWheelX,
                  frontSurf.y,
                  -this.vx * 0.3 + (Math.random() - 0.5) * 180,
                  (Math.random() - 0.5) * 180,
                  7,
                  i % 2 === 0 ? '#00e5ff' : '#ffd000',
                  0.55,
                  150,
                  'circle'
                );
              }
            }
          }
        }

        this.airTime = 0;
        this.cumulativeFlipAngle = 0;
      } else {
        // Havadayken süspansiyonlar tam açılır
        this.rearSus += (maxExtend - this.rearSus) * Math.min(1, 10 * dt);
        this.frontSus += (maxExtend - this.frontSus) * Math.min(1, 10 * dt);
        this.airTime += dt;

        // Havada Takla (360° Flip) Sayacı
        this.cumulativeFlipAngle += this.vAngle * dt;
        if (Math.abs(this.cumulativeFlipAngle) >= Math.PI * 1.82) {
          const isBackflip = this.cumulativeFlipAngle < 0;
          this.cumulativeFlipAngle = 0;
          if (!this.isAI && onFlipCallback) {
            onFlipCallback(isBackflip);
          }
        }
      }

      // 3. OTOMATİK DÜZELTME (AUTO-FLIP): Araç ters dönerse asla Game Over olmaz!
      const isUpsideDown = Math.cos(this.angle) < 0.22 && Math.abs(this.y - (rearSurf.y - 60)) < 95;
      if (isUpsideDown) {
        // Çatı yere değmesin diye koruyucu yastıklama
        const roofFloorY = Math.min(rearSurf.y, frontSurf.y) - 52;
        if (this.y > roofFloorY) {
          this.y = roofFloorY;
          this.vy = Math.min(0, this.vy);
          this.vx *= 0.92;
        }
        this.upsideDownTimer += dt;
        if (this.upsideDownTimer >= 0.75) {
          // Yaylanarak havaya zıplat ve düzelt!
          this.upsideDownTimer = 0;
          this.vy = -440;
          this.angle = 0;
          this.vAngle = 0;
          if (!this.isAI) {
            sound.playBoing();
            floatingTexts.spawn(this.x, this.y - 70, 'OTOMATİK DÜZELDİ!', '#5ce62e', 1.1);
          }
        }
      } else {
        this.upsideDownTimer = 0;
      }

      // Açıyı [-PI, PI] aralığında normalize et
      while (this.angle > Math.PI) this.angle -= Math.PI * 2;
      while (this.angle < -Math.PI) this.angle += Math.PI * 2;

      // Tekerlek dönüş açısı
      const spinSpeed = this.grounded ? this.vx / this.wheelRadius : (input.gas ? 16 : this.vx / this.wheelRadius);
      this.wheelRot += spinSpeed * dt;

      // Nitro ve Egzoz Parçacıkları
      if ((this.nitroActive || (input.gas && Math.random() < 0.45)) && !this.isAI) {
        const exhaustX = this.x - cosA * 92;
        const exhaustY = this.y - sinA * 92;
        const flameColor = this.nitroActive
          ? Math.random() < 0.5
            ? '#00e5ff'
            : '#ffd000'
          : '#ff7700';
        particles.spawn(
          exhaustX,
          exhaustY,
          -cosA * (220 + Math.random() * 140),
          -sinA * 180 + (Math.random() - 0.5) * 70,
          this.nitroActive ? 8 : 5,
          flameColor,
          this.nitroActive ? 0.32 : 0.22,
          -40,
          'circle'
        );
      }
    }

    draw(ctx, camX, camY) {
      const sx = this.x - camX;
      const sy = this.y - camY;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(this.angle);

      const halfBase = this.wheelBase * 0.5;
      const bounceOffset = this.hornBounceTimer > 0 ? Math.sin(this.hornBounceTimer * 35) * 6 : 0;

      // 1. Nitro Roket Alevi (Aktifse egzozdan çıkan Hot Wheels alevi)
      if (this.nitroActive) {
        ctx.save();
        ctx.translate(-95, -8 + bounceOffset);
        const flicker = 0.85 + Math.random() * 0.35;
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(-58 * flicker, 0);
        ctx.lineTo(0, 10);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(-32 * flicker, 0);
        ctx.lineTo(0, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 2. Dinamik Yay ve Amortisörler (Gövde ile Tekerlekler Arasında)
      drawDynamicSuspension(ctx, -halfBase, 4 + bounceOffset, -halfBase, this.rearSus, this.profile.rimColor);
      drawDynamicSuspension(ctx, halfBase, 4 + bounceOffset, halfBase, this.frontSus, this.profile.rimColor);

      // 3. Önbelleklenmiş (Offscreen) veya Vektörel Araç Gövdesi
      const bodySprite = this.profileKey === 'green75' ? SpriteCache.body75 : SpriteCache.body18;
      if (bodySprite && bodySprite.canvas) {
        ctx.drawImage(
          bodySprite.canvas,
          -bodySprite.anchorX,
          -bodySprite.anchorY + bounceOffset,
          bodySprite.width,
          bodySprite.height
        );
      } else {
        ctx.save();
        ctx.translate(0, bounceOffset);
        drawTruckBodyVector(ctx, this.profileKey);
        ctx.restore();
      }

      // 4. Ön ve Arka Dev Tekerlekler (Kırmızı Jant #75 / Mavi Jant #18)
      const wheelSprite = this.profileKey === 'green75' ? SpriteCache.wheelRed : SpriteCache.wheelBlue;
      const wheelPositions = [
        { x: -halfBase, y: this.rearSus },
        { x: halfBase, y: this.frontSus }
      ];

      for (let i = 0; i < 2; i++) {
        const wp = wheelPositions[i];
        ctx.save();
        ctx.translate(wp.x, wp.y);
        ctx.rotate(this.wheelRot);
        if (wheelSprite && wheelSprite.canvas) {
          const halfS = wheelSprite.size * 0.5;
          ctx.drawImage(wheelSprite.canvas, -halfS, -halfS, wheelSprite.size, wheelSprite.size);
        } else {
          drawMonsterWheelVector(ctx, this.wheelRadius, this.profile);
        }
        ctx.restore();
      }

      ctx.restore();
    }
  }

  // --------------------------------------------------------------------------
  // 6. PROSEDÜREL DÜNYA: MAVİ RAMPALAR, YILDIZLAR VE EZİLEBİLİR KUTULAR
  // --------------------------------------------------------------------------
  class ProceduralWorld {
    constructor() {
      this.baseGroundY = 520;
      this.ramps = [];
      this.stars = [];
      this.crates = [];
      this.generatedUpToX = 450;
      this.nextRampId = 1;
    }

    reset(baseGroundY) {
      this.baseGroundY = baseGroundY;
      this.ramps.length = 0;
      this.stars.length = 0;
      this.crates.length = 0;
      this.generatedUpToX = 320;
      this.nextRampId = 1;
      this.ensureGenerated(3200);
    }

    setBaseGroundY(newBaseGroundY) {
      const dy = newBaseGroundY - this.baseGroundY;
      if (Math.abs(dy) < 0.01) return 0;
      this.baseGroundY = newBaseGroundY;
      for (let i = 0; i < this.ramps.length; i++) {
        this.ramps[i].baseY += dy;
      }
      for (let i = 0; i < this.stars.length; i++) {
        this.stars[i].y += dy;
      }
      for (let i = 0; i < this.crates.length; i++) {
        this.crates[i].y += dy;
      }
      return dy;
    }

    getGroundWaveY(x) {
      const gentleWave = Math.sin(x * 0.0018) * 18 + Math.sin(x * 0.0007) * 12;
      return this.baseGroundY + gentleWave;
    }

    /**
     * Verilen X koordinatındaki zemin veya Mavi Rampa yüksekliğini döndürür
     */
    getSurfaceInfo(x) {
      let groundY = this.getGroundWaveY(x);
      let activeRamp = null;

      for (let i = 0; i < this.ramps.length; i++) {
        const r = this.ramps[i];
        const backBevel = Math.max(75, r.height * 0.55);
        if (x >= r.x && x <= r.x + r.width) {
          const t = (x - r.x) / r.width;
          // Yumuşak girişli, yukarı kavisli Hot Wheels Mavi Rampa eğrisi
          const curve = Math.pow(t, 1.35);
          const rampY = r.baseY - curve * r.height;
          if (rampY <= groundY) {
            groundY = rampY;
            activeRamp = r;
          }
          break;
        } else if (x > r.x + r.width && x <= r.x + r.width + backBevel) {
          // Arka kenar yumuşak eğim (bevel/runoff) - geri viteste gelen aracın tek karede sıçramasını önler
          const u = (x - (r.x + r.width)) / backBevel;
          const backT = 1 - u;
          const bevelCurve = backT * backT * (3 - 2 * backT);
          const rampY = r.baseY - bevelCurve * r.height;
          if (rampY <= groundY) {
            groundY = rampY;
          }
          break;
        }
      }

      return { y: groundY, ramp: activeRamp };
    }

    /**
     * Oyuncunun hemen önüne anında Mega Mavi Rampa yerleştirir (Garaj butonu için)
     */
    spawnMegaRampAhead(playerX) {
      const targetX = playerX + 260;
      // Çakışan eski rampaları temizle
      this.ramps = this.ramps.filter((r) => r.x + r.width < targetX - 80 || r.x > targetX + 560);
      const megaDef = RAMP_TYPES[3];
      const baseY = Math.max(
        this.getGroundWaveY(targetX),
        this.getGroundWaveY(targetX + megaDef.width * 0.5),
        this.getGroundWaveY(targetX + megaDef.width)
      );

      const ramp = {
        id: this.nextRampId++,
        x: targetX,
        baseY: baseY,
        width: megaDef.width,
        height: megaDef.height,
        kind: megaDef.kind,
        label: megaDef.label,
        boostMultiplier: megaDef.boostMultiplier,
        upwardKick: megaDef.upwardKick,
        hasBooster: true
      };
      this.ramps.push(ramp);
      this.spawnStarArcForRamp(ramp);
    }

    spawnStarArcForRamp(ramp) {
      const arcCount = ramp.kind === 'mega' ? 9 : 6;
      const startX = ramp.x + ramp.width * 0.75;
      const spanX = ramp.width * 1.45;
      const peakHeight = ramp.height + (ramp.kind === 'mega' ? 190 : 130);

      for (let i = 0; i < arcCount; i++) {
        const u = i / (arcCount - 1);
        const sx = startX + u * spanX;
        const arch = Math.sin(u * Math.PI);
        const sy = ramp.baseY - 45 - arch * peakHeight;
        this.stars.push({
          x: sx,
          y: sy,
          collected: false,
          bobOffset: i * 0.6
        });
      }
    }

    ensureGenerated(targetMaxX) {
      while (this.generatedUpToX < targetMaxX) {
        const isFirst = this.nextRampId === 1;
        const gap = isFirst ? 310 : 360 + Math.random() * 220;
        const rampX = this.generatedUpToX + gap;
        const typeIndex = isFirst
          ? 1
          : this.nextRampId % 4 === 0
            ? 3 // Her 4 rampada bir kesin Mega Mavi Rampa
            : Math.floor(Math.random() * RAMP_TYPES.length);
        const def = RAMP_TYPES[typeIndex];

        const baseY = Math.max(
          this.getGroundWaveY(rampX),
          this.getGroundWaveY(rampX + def.width * 0.5),
          this.getGroundWaveY(rampX + def.width)
        );

        const ramp = {
          id: this.nextRampId++,
          x: rampX,
          baseY: baseY,
          width: def.width,
          height: def.height,
          kind: def.kind,
          label: def.label,
          boostMultiplier: def.boostMultiplier,
          upwardKick: def.upwardKick,
          hasBooster: def.hasBooster
        };
        this.ramps.push(ramp);

        // Rampanın üstüne altın yıldız kemeri diz
        this.spawnStarArcForRamp(ramp);

        // Rampanın iniş bölgesine ezilebilir eğlenceli kutular/variller diz
        const crateBaseX = rampX + def.width + 260 + Math.random() * 140;
        const crateColors = ['#ff8800', '#ff3366', '#4ce619', '#aa44ff'];
        const stackCols = 2 + Math.floor(Math.random() * 2);

        for (let c = 0; c < stackCols; c++) {
          const cx = crateBaseX + c * 46;
          const colGroundY = this.getGroundWaveY(cx);
          const rows = c === 1 ? 2 : 1;
          for (let r = 0; r < rows; r++) {
            this.crates.push({
              x: cx,
              y: colGroundY - 22 - r * 44,
              size: 42,
              color: crateColors[(c + r + this.nextRampId) % crateColors.length],
              smashed: false
            });
          }
        }

        this.generatedUpToX = rampX + def.width + 260;
      }
    }

    /**
     * Ekran gerisinde kalan objeleri bellekten temizle (iPad 60 FPS Culling)
     */
    cullBehind(minX) {
      while (
        this.ramps.length > 0 &&
        this.ramps[0].x + this.ramps[0].width + Math.max(75, this.ramps[0].height * 0.55) < minX
      ) {
        this.ramps.shift();
      }
      while (this.stars.length > 0 && (this.stars[0].x < minX || this.stars[0].collected)) {
        if (this.stars[0].x < minX) {
          this.stars.shift();
        } else {
          break;
        }
      }
      this.stars = this.stars.filter((s) => !s.collected && s.x >= minX);
      this.crates = this.crates.filter((c) => !c.smashed && c.x >= minX);
    }

    /**
     * Mavi Rampaları, Yıldızları, Kutuları ve Hot Wheels Pistini Çiz
     */
    draw(ctx, camX, camY, viewW, viewH, time) {
      // 1. Zemin ve Asfalt/Toprak Stunt Pisti
      ctx.save();
      ctx.beginPath();
      const step = 40;
      const startX = Math.floor(camX / step) * step - step;
      const endX = camX + viewW + step * 2;

      ctx.moveTo(startX - camX, viewH + 50);
      for (let wx = startX; wx <= endX; wx += step) {
        const wave = Math.sin(wx * 0.0018) * 18 + Math.sin(wx * 0.0007) * 12;
        const gy = this.baseGroundY + wave - camY;
        ctx.lineTo(wx - camX, gy);
      }
      ctx.lineTo(endX - camX, viewH + 50);
      ctx.closePath();

      const groundGrad = ctx.createLinearGradient(0, this.baseGroundY - camY, 0, viewH);
      groundGrad.addColorStop(0, '#2a354d');
      groundGrad.addColorStop(0.18, '#1d2538');
      groundGrad.addColorStop(1, '#0d121d');
      ctx.fillStyle = groundGrad;
      ctx.fill();

      // Pist üst şeridi (Hot Wheels turuncu-beyaz bordür şeridi)
      ctx.beginPath();
      for (let wx = startX; wx <= endX; wx += step) {
        const wave = Math.sin(wx * 0.0018) * 18 + Math.sin(wx * 0.0007) * 12;
        const gy = this.baseGroundY + wave - camY;
        if (wx === startX) ctx.moveTo(wx - camX, gy);
        else ctx.lineTo(wx - camX, gy);
      }
      ctx.lineWidth = 12;
      ctx.strokeStyle = '#ff6a00';
      ctx.stroke();

      ctx.lineWidth = 4;
      ctx.strokeStyle = '#ffd000';
      ctx.stroke();
      ctx.restore();

      // 2. PARLAK MAVİ ATLAMA RAMPALARI (Ekran içi Culling ile)
      for (let i = 0; i < this.ramps.length; i++) {
        const r = this.ramps[i];
        const backBevel = Math.max(75, r.height * 0.55);
        if (r.x + r.width + backBevel < camX - 80 || r.x > camX + viewW + 80) continue;

        const rx = r.x - camX;
        const ry = r.baseY - camY;

        ctx.save();

        // Mavi rampa çelik destek ayakları
        ctx.strokeStyle = '#003c8f';
        ctx.lineWidth = 8;
        const struts = 3;
        for (let s = 1; s <= struts; s++) {
          const u = s / struts;
          const sx = rx + u * r.width - 8;
          const topY = ry - Math.pow(u, 1.35) * r.height + 10;
          ctx.beginPath();
          ctx.moveTo(sx, ry + 8);
          ctx.lineTo(sx, topY);
          ctx.stroke();
        }

        // Ana Parlak Mavi Rampa Gövdesi (Arka yumuşak iniş/bevel eğimi ile)
        const rampGrad = ctx.createLinearGradient(rx, ry - r.height, rx + r.width + backBevel, ry);
        rampGrad.addColorStop(0, '#00d9ff');
        rampGrad.addColorStop(0.5, '#0077ff');
        rampGrad.addColorStop(1, '#0040b8');

        ctx.fillStyle = rampGrad;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.moveTo(rx, ry + 6);
        const segs = 14;
        for (let k = 1; k <= segs; k++) {
          const t = k / segs;
          const px = rx + t * r.width;
          const py = ry - Math.pow(t, 1.35) * r.height;
          ctx.lineTo(px, py);
        }
        const bevelSegs = 6;
        for (let k = 1; k <= bevelSegs; k++) {
          const u = k / bevelSegs;
          const backT = 1 - u;
          const bevelCurve = backT * backT * (3 - 2 * backT);
          const px = rx + r.width + u * backBevel;
          const py = ry - bevelCurve * r.height;
          ctx.lineTo(px, py);
        }
        ctx.lineTo(rx + r.width + backBevel, ry + 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Rampa Üstü Hızlandırıcı Oklar (Chevrons)
        const arrowCount = r.kind === 'mega' ? 5 : 3;
        const pulse = Math.floor(time * 8) % arrowCount;
        for (let a = 0; a < arrowCount; a++) {
          const t = (a + 0.8) / (arrowCount + 0.8);
          const ax = rx + t * r.width;
          const ay = ry - Math.pow(t, 1.35) * r.height + 18;
          ctx.fillStyle = a === pulse ? '#ffee00' : '#80ecff';
          ctx.beginPath();
          ctx.moveTo(ax - 12, ay - 8);
          ctx.lineTo(ax + 6, ay - 14);
          ctx.lineTo(ax - 6, ay + 6);
          ctx.closePath();
          ctx.fill();
        }

        // Rampa Yan Etiketi
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 13px "Arial Black", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(r.label, rx + r.width - 12, ry - 10);

        ctx.restore();
      }

      // 3. EZİLEBİLİR RENKLİ KUTULAR
      for (let i = 0; i < this.crates.length; i++) {
        const c = this.crates[i];
        if (c.smashed || c.x < camX - 80 || c.x > camX + viewW + 80) continue;

        const cx = c.x - camX;
        const cy = c.y - camY;
        const hs = c.size * 0.5;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = c.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-hs, -hs, c.size, c.size, 8);
        ctx.fill();
        ctx.stroke();

        // Kutu üstü çapraz bant
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-hs + 6, -hs + 6);
        ctx.lineTo(hs - 6, hs - 6);
        ctx.moveTo(hs - 6, -hs + 6);
        ctx.lineTo(-hs + 6, hs - 6);
        ctx.stroke();
        ctx.restore();
      }

      // 4. HAVADAKİ ALTIN YILDIZLAR
      const starSprite = SpriteCache.starSprite;
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        if (s.collected || s.x < camX - 60 || s.x > camX + viewW + 60) continue;

        const sx = s.x - camX;
        const sy = s.y - camY + Math.sin(time * 4.5 + s.bobOffset) * 6;

        if (starSprite && starSprite.canvas) {
          ctx.drawImage(
            starSprite.canvas,
            sx - starSprite.size * 0.5,
            sy - starSprite.size * 0.5,
            starSprite.size,
            starSprite.size
          );
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // 7. ANA OYUN YÖNETİCİSİ VE 60 FPS OYUN DÖNGÜSÜ
  // --------------------------------------------------------------------------
  class MonsterTruckGame {
    constructor() {
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d', { alpha: false });

      this.dpr = 1;
      this.viewW = window.innerWidth;
      this.viewH = window.innerHeight;

      this.sound = new SoundEngine();
      this.particles = new ParticlePool(200);
      this.floatingTexts = new FloatingTextPool(24);
      this.world = new ProceduralWorld();

      // Skor ve İstatistikler
      this.starsCollected = 0;
      this.flipsCompleted = 0;
      this.paused = false;
      this.buddyMode = true; // İki araba (#75 ve #18) birlikte pistte!
      this.time = 0;

      // Dokunmatik ve Klavye Girdi Durumu
      this.input = {
        gas: false,
        brake: false,
        nitro: false
      };
      this.activePointers = new Map();
      this.activeKeys = new Set();

      // Oyuncu ve Arkadaş (Buddy) Canavar Arabaları (Yan yana net görünüm)
      this.playerTruck = new MonsterTruck('green75', 430, 380, false);
      this.buddyTruck = new MonsterTruck('red18', 195, 380, true);

      // Kamera
      this.camX = 0;
      this.camY = 0;

      // DOM Referansları
      this.domStars = document.getElementById('stat-stars');
      this.domFlips = document.getElementById('stat-flips');
      this.domSpeed = document.getElementById('stat-speed');
      this.domPillStars = document.getElementById('pill-stars');
      this.domPillFlips = document.getElementById('pill-flips');
      this.domStuntBanner = document.getElementById('stunt-banner');
      this.domStuntBannerText = document.getElementById('stunt-banner-text');
      this.domSwitchBtn = document.getElementById('btn-switch-truck');
      this.domBuddyBtn = document.getElementById('btn-buddy-mode');
      this.domBuddyLabel = document.getElementById('buddy-label');
      this.domSoundBtn = document.getElementById('btn-sound');
      this.domSoundIcon = document.getElementById('sound-icon');
      this.domPauseOverlay = document.getElementById('pause-overlay');
      this.domHudTop = document.getElementById('hud-top');
      this.domControlsBottom = document.getElementById('controls-bottom');
      this.lastFocusedBeforePause = null;
      this.bannerTimeout = null;

      this.initResize();
      this.world.reset(this.world.baseGroundY);
      this.playerTruck.y =
        this.world.getSurfaceInfo(this.playerTruck.x).y -
        this.playerTruck.wheelRadius -
        this.playerTruck.restSuspension;
      this.buddyTruck.y =
        this.world.getSurfaceInfo(this.buddyTruck.x).y -
        this.buddyTruck.wheelRadius -
        this.buddyTruck.restSuspension;

      this.bindEvents();
      this.renderGaragePreviews();

      this.lastFrameTime = performance.now();
      requestAnimationFrame((ts) => this.loop(ts));
    }

    pulseStatPill(pillEl) {
      if (!pillEl) return;
      pillEl.classList.remove('stat-pop');
      void pillEl.offsetWidth;
      pillEl.classList.add('stat-pop');
      if (pillEl._popTimer) clearTimeout(pillEl._popTimer);
      pillEl._popTimer = setTimeout(() => {
        pillEl.classList.remove('stat-pop');
      }, 220);
    }

    initResize() {
      // iPad Retina Denge Kuralı: Maksimum DPR = 2
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.viewW = window.innerWidth;
      this.viewH = window.innerHeight;

      this.canvas.width = Math.floor(this.viewW * this.dpr);
      this.canvas.height = Math.floor(this.viewH * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      SpriteCache.buildAll(this.dpr);
      const newGroundY = Math.max(370, Math.min(640, this.viewH * 0.72));
      const dy = this.world.setBaseGroundY(newGroundY);
      if (this.playerTruck && this.buddyTruck && this.world.ramps.length > 0) {
        this.playerTruck.y += dy;
        this.buddyTruck.y += dy;
      }
      this.renderGaragePreviews();
    }

    renderGaragePreviews() {
      const pairs = [
        { canvasId: 'preview-canvas-75', key: 'green75' },
        { canvasId: 'preview-canvas-18', key: 'red18' }
      ];
      const dpr = this.dpr || Math.min(window.devicePixelRatio || 1, 2);
      const logicalW = 240;
      const logicalH = 148;
      for (let i = 0; i < pairs.length; i++) {
        const el = document.getElementById(pairs[i].canvasId);
        if (!el) continue;
        if (el.width !== Math.round(logicalW * dpr) || el.height !== Math.round(logicalH * dpr)) {
          el.width = Math.round(logicalW * dpr);
          el.height = Math.round(logicalH * dpr);
        }
        const pctx = el.getContext('2d');
        pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        pctx.clearRect(0, 0, logicalW, logicalH);

        // Stüdyo zemin temas gölgesi
        pctx.save();
        pctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        pctx.beginPath();
        pctx.ellipse(logicalW * 0.5, logicalH - 16, 86, 10, 0, 0, Math.PI * 2);
        pctx.fill();
        pctx.restore();

        pctx.save();
        pctx.translate(logicalW * 0.5, logicalH * 0.45);
        pctx.scale(0.78, 0.78);
        const prof = TRUCK_PROFILES[pairs[i].key];
        drawDynamicSuspension(pctx, -54, 4, -54, 38, prof.rimColor);
        drawDynamicSuspension(pctx, 54, 4, 54, 38, prof.rimColor);
        drawTruckBodyVector(pctx, pairs[i].key);
        pctx.save();
        pctx.translate(-54, 38);
        drawMonsterWheelVector(pctx, 44, prof);
        pctx.restore();
        pctx.save();
        pctx.translate(54, 38);
        drawMonsterWheelVector(pctx, 44, prof);
        pctx.restore();
        pctx.restore();
      }
    }

    showStuntBanner(text) {
      if (!this.domStuntBanner) return;
      if (this.domStuntBannerText) {
        this.domStuntBannerText.textContent = text;
      } else {
        this.domStuntBanner.textContent = text;
      }
      this.domStuntBanner.classList.add('show');
      if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
      this.bannerTimeout = setTimeout(() => {
        this.domStuntBanner.classList.remove('show');
      }, 1400);
    }

    switchTruck(forceProfileKey) {
      this.sound.init();
      const currentKey = this.playerTruck.profileKey;
      const nextKey = forceProfileKey || (currentKey === 'green75' ? 'red18' : 'green75');
      const otherKey = nextKey === 'green75' ? 'red18' : 'green75';

      this.playerTruck.setProfile(nextKey);
      this.buddyTruck.setProfile(otherKey);

      // Görsel efekt ve ses
      this.sound.playBoing();
      const label = nextKey === 'green75' ? '#75 FLAME CRUSHER!' : '#18 GAME RACING!';
      this.floatingTexts.spawn(this.playerTruck.x, this.playerTruck.y - 85, label, '#ffd000', 1.15);

      const burstColor = nextKey === 'green75' ? '#5ce62e' : '#ff3b3b';
      for (let i = 0; i < 18; i++) {
        const a = (i * Math.PI * 2) / 18;
        this.particles.spawn(
          this.playerTruck.x,
          this.playerTruck.y - 10,
          Math.cos(a) * 220,
          Math.sin(a) * 220,
          8,
          burstColor,
          0.5,
          100,
          'circle'
        );
      }

      // HUD ve Garaj Kartlarını Güncelle
      const is75 = nextKey === 'green75';
      this.domSwitchBtn.classList.toggle('active-green', is75);
      this.domSwitchBtn.classList.toggle('active-red', !is75);

      const card75 = document.getElementById('select-truck-75');
      const card18 = document.getElementById('select-truck-18');
      if (card75) {
        card75.classList.toggle('selected', is75);
        card75.setAttribute('aria-pressed', String(is75));
        const badge75 = card75.querySelector('.truck-select-badge');
        if (badge75) badge75.textContent = is75 ? 'SEÇİLİ ✓' : 'SEÇ';
      }
      if (card18) {
        card18.classList.toggle('selected', !is75);
        card18.setAttribute('aria-pressed', String(!is75));
        const badge18 = card18.querySelector('.truck-select-badge');
        if (badge18) badge18.textContent = !is75 ? 'SEÇİLİ ✓' : 'SEÇ';
      }
    }

    toggleBuddyMode() {
      this.sound.init();
      this.buddyMode = !this.buddyMode;
      if (this.buddyMode) {
        this.buddyTruck.x = this.playerTruck.x - 150;
        this.buddyTruck.y = this.playerTruck.y - 40;
        this.buddyTruck.vx = this.playerTruck.vx;
        this.buddyTruck.vy = -120;
        this.floatingTexts.spawn(this.playerTruck.x, this.playerTruck.y - 80, '2 ARABA YARIŞTA!', '#ff9900', 1.1);
      }
      this.domBuddyBtn.classList.toggle('is-on', this.buddyMode);
      this.domBuddyBtn.setAttribute('aria-pressed', String(this.buddyMode));
      this.domBuddyLabel.textContent = this.buddyMode ? '2 ARABA: AÇIK' : '2 ARABA: KAPALI';
      this.sound.playBoing();
    }

    triggerMegaRamp() {
      this.sound.init();
      this.world.spawnMegaRampAhead(this.playerTruck.x);
      this.togglePause(false);
      this.sound.playRampLaunch(true);
      this.showStuntBanner('MEGA MAVİ RAMPA HAZIR!');
      this.floatingTexts.spawn(this.playerTruck.x + 120, this.playerTruck.y - 95, 'MEGA MAVİ RAMPA!', '#00e5ff', 1.2);
    }

    togglePause(forceState) {
      const nextPaused = typeof forceState === 'boolean' ? forceState : !this.paused;
      if (nextPaused === this.paused) return;
      this.paused = nextPaused;
      this.domPauseOverlay.classList.toggle('hidden', !this.paused);

      if (this.domHudTop) {
        this.domHudTop.toggleAttribute('inert', this.paused);
      }
      if (this.domControlsBottom) {
        this.domControlsBottom.toggleAttribute('inert', this.paused);
      }

      if (this.paused) {
        this.lastFocusedBeforePause =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        this.input.gas = false;
        this.input.brake = false;
        this.input.nitro = false;
        this.activePointers.clear();
        this.activeKeys.clear();
        document.querySelectorAll('.ctrl-btn.pressed').forEach((btn) => btn.classList.remove('pressed'));
        const resumeBtn = document.getElementById('btn-resume');
        if (resumeBtn) {
          resumeBtn.focus({ preventScroll: true });
        }
      } else if (
        this.lastFocusedBeforePause &&
        document.contains(this.lastFocusedBeforePause) &&
        this.lastFocusedBeforePause !== document.body
      ) {
        this.lastFocusedBeforePause.focus({ preventScroll: true });
        this.lastFocusedBeforePause = null;
      }
    }

    bindEvents() {
      window.addEventListener('resize', () => this.initResize());

      // iPad Safari çift dokunuş zoom, büyüteç, uzun basma seçimi ve kaydırma engellemesi
      document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
      document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
      document.addEventListener('contextmenu', (e) => e.preventDefault());
      document.addEventListener('selectstart', (e) => e.preventDefault());

      const gameContainer = document.getElementById('game-container');
      if (gameContainer) {
        gameContainer.addEventListener(
          'touchstart',
          (e) => {
            if (e.touches.length > 1) {
              e.preventDefault();
            }
          },
          { passive: false }
        );
        gameContainer.addEventListener(
          'touchmove',
          (e) => {
            if (!e.target.closest('.pause-overlay')) {
              e.preventDefault();
            }
          },
          { passive: false }
        );
      }

      // iPadOS Safari ses kilidini açma ve sürdürme (pointerdown, pointerup, touchend, click)
      const unlockAudio = () => this.sound.init();
      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('pointerup', unlockAudio, { passive: true });
      window.addEventListener('touchend', unlockAudio, { passive: true });
      window.addEventListener('click', unlockAudio, { passive: true });

      // Çoklu Dokunmatik (Multi-Touch) ve Klavye Buton Yönetimi
      const actionButtons = document.querySelectorAll('.ctrl-btn[data-action]');
      const syncInputState = () => {
        let gas = this.activeKeys.has('gas');
        let brake = this.activeKeys.has('brake');
        let nitro = this.activeKeys.has('nitro');
        for (const act of this.activePointers.values()) {
          if (act === 'gas') gas = true;
          if (act === 'brake') brake = true;
          if (act === 'nitro') nitro = true;
        }
        this.input.gas = gas;
        this.input.brake = brake;
        this.input.nitro = nitro;

        actionButtons.forEach((btn) => {
          const a = btn.getAttribute('data-action');
          if (a === 'jump' || a === 'horn') return;
          const isHeld =
            (a === 'gas' && gas) ||
            (a === 'brake' && brake) ||
            (a === 'nitro' && nitro);
          btn.classList.toggle('pressed', isHeld);
        });
      };

      const clearAllInputs = () => {
        this.activePointers.clear();
        this.activeKeys.clear();
        this.input.gas = false;
        this.input.brake = false;
        this.input.nitro = false;
        actionButtons.forEach((btn) => btn.classList.remove('pressed'));
      };

      const flashInstantButton = (btnId, durationMs = 150) => {
        const el = document.getElementById(btnId);
        if (!el) return;
        el.classList.add('pressed');
        if (el._flashTimer) clearTimeout(el._flashTimer);
        el._flashTimer = setTimeout(() => {
          el.classList.remove('pressed');
        }, durationMs);
      };

      // Sekme değişimi, arka plana atma veya bildirim merkezi açıldığında takılı kalan tuşları temizle
      window.addEventListener('blur', clearAllInputs);
      window.addEventListener('pagehide', clearAllInputs);
      window.addEventListener('pageshow', () => {
        clearAllInputs();
        this.sound.resumeIfNeeded();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden || document.visibilityState !== 'visible') {
          clearAllInputs();
        } else {
          this.sound.resumeIfNeeded();
        }
      });

      actionButtons.forEach((btn) => {
        const action = btn.getAttribute('data-action');
        let lastPointerDownTs = 0;

        btn.addEventListener('pointerdown', (e) => {
          if (e.button !== undefined && e.button !== 0) return;
          lastPointerDownTs = performance.now();
          e.preventDefault();
          this.sound.init();
          if (btn.setPointerCapture) {
            try {
              btn.setPointerCapture(e.pointerId);
            } catch (_) {}
          }

          if (action === 'jump') {
            flashInstantButton('btn-jump', 140);
            this.playerTruck.triggerJump(this.sound, this.floatingTexts, this.particles);
            return;
          }
          if (action === 'horn') {
            flashInstantButton('btn-horn', 180);
            this.playerTruck.triggerHorn(this.sound, this.floatingTexts, this.particles);
            return;
          }

          this.activePointers.set(e.pointerId, action);
          syncInputState();
        });

        // Klavye (Enter/Space) ve Yardımcı Teknoloji (VoiceOver / Switch Control) Desteği
        if (action === 'jump' || action === 'horn') {
          btn.addEventListener('click', (e) => {
            if (performance.now() - lastPointerDownTs < 450) return;
            e.preventDefault();
            this.sound.init();
            if (action === 'jump') {
              flashInstantButton('btn-jump', 140);
              this.playerTruck.triggerJump(this.sound, this.floatingTexts, this.particles);
            } else {
              flashInstantButton('btn-horn', 180);
              this.playerTruck.triggerHorn(this.sound, this.floatingTexts, this.particles);
            }
          });
        }

        const releasePointer = (e) => {
          this.sound.init();
          if (this.activePointers.has(e.pointerId)) {
            this.activePointers.delete(e.pointerId);
            syncInputState();
          }
        };

        btn.addEventListener('pointerup', releasePointer);
        btn.addEventListener('pointercancel', releasePointer);
        btn.addEventListener('lostpointercapture', releasePointer);
      });

      // Hem 0ms gecikmeli dokunmatik (pointerdown) hem de klavye/ekran okuyucu (click) destekli buton bağlayıcı
      const bindFastButton = (el, handler) => {
        if (!el) return;
        let lastPointerTs = 0;
        el.addEventListener('pointerdown', (e) => {
          if (e.button !== undefined && e.button !== 0) return;
          lastPointerTs = performance.now();
          e.preventDefault();
          handler(e);
        });
        el.addEventListener('click', (e) => {
          if (performance.now() - lastPointerTs < 450) return;
          e.preventDefault();
          handler(e);
        });
      };

      // Üst HUD ve Garaj Butonları
      bindFastButton(this.domSwitchBtn, (e) => {
        const badge = e.target.closest ? e.target.closest('[data-truck]') : null;
        const targetKey = badge ? badge.getAttribute('data-truck') : null;
        if (targetKey && targetKey !== this.playerTruck.profileKey) {
          this.switchTruck(targetKey);
        } else {
          this.switchTruck();
        }
      });

      bindFastButton(document.getElementById('btn-hud-ramp'), () => {
        this.triggerMegaRamp();
      });

      bindFastButton(this.domBuddyBtn, () => {
        this.toggleBuddyMode();
      });

      bindFastButton(this.domSoundBtn, () => {
        const muted = this.sound.toggleMute();
        this.domSoundBtn.classList.toggle('is-muted', muted);
        this.domSoundBtn.setAttribute('aria-pressed', String(!muted));
      });

      bindFastButton(document.getElementById('btn-pause'), () => {
        this.togglePause();
      });

      bindFastButton(document.getElementById('btn-close-garage'), () => {
        this.togglePause(false);
      });

      this.domPauseOverlay.addEventListener('pointerdown', (e) => {
        if (e.target === this.domPauseOverlay) {
          e.preventDefault();
          this.togglePause(false);
        }
      });

      bindFastButton(document.getElementById('btn-resume'), () => {
        this.togglePause(false);
      });

      bindFastButton(document.getElementById('btn-spawn-ramp'), () => {
        this.triggerMegaRamp();
      });

      bindFastButton(document.getElementById('select-truck-75'), () => {
        this.switchTruck('green75');
      });

      bindFastButton(document.getElementById('select-truck-18'), () => {
        this.switchTruck('red18');
      });

      // Klavye Desteği (Masaüstü veya iPad Klavyeli Kılıf İçin)
      window.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        this.sound.init();

        if (e.code === 'KeyP' || e.code === 'Escape') {
          e.preventDefault();
          this.togglePause();
          return;
        }

        // Garaj/Duraklatma açıkken sürüş kısayollarını engelle (odaklanmış butonların Enter/Space davranışını bozma)
        if (this.paused) return;

        const focusedOnButton =
          document.activeElement &&
          document.activeElement !== document.body &&
          document.activeElement.tagName === 'BUTTON';

        if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          this.activeKeys.add('gas');
          syncInputState();
        }
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          this.activeKeys.add('brake');
          syncInputState();
        }
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyN') {
          this.activeKeys.add('nitro');
          syncInputState();
        }
        if (
          e.code === 'ArrowUp' ||
          e.code === 'KeyW' ||
          (e.code === 'Space' && !focusedOnButton)
        ) {
          if (e.code === 'Space') e.preventDefault();
          flashInstantButton('btn-jump', 140);
          this.playerTruck.triggerJump(this.sound, this.floatingTexts, this.particles);
        }
        if (e.code === 'KeyH') {
          flashInstantButton('btn-horn', 180);
          this.playerTruck.triggerHorn(this.sound, this.floatingTexts, this.particles);
        }
        if (e.code === 'KeyC') {
          this.switchTruck();
        }
        if (e.code === 'KeyR') {
          this.triggerMegaRamp();
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          this.activeKeys.delete('gas');
          syncInputState();
        }
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          this.activeKeys.delete('brake');
          syncInputState();
        }
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyN') {
          this.activeKeys.delete('nitro');
          syncInputState();
        }
      });
    }

    onPlayerFlip(isBackflip) {
      this.flipsCompleted++;
      this.starsCollected += 5;
      this.domFlips.textContent = String(this.flipsCompleted);
      this.domStars.textContent = String(this.starsCollected);
      this.pulseStatPill(this.domPillFlips);
      this.pulseStatPill(this.domPillStars);

      this.sound.playFlipFanfare();
      const msg = isBackflip ? 'SÜPER TERS TAKLA! +5 YILDIZ' : 'HARİKA ÖN TAKLA! +5 YILDIZ';
      this.showStuntBanner(msg);
      this.floatingTexts.spawn(this.playerTruck.x, this.playerTruck.y - 90, 'TAKLA! +5', '#00e5ff', 1.3, true);

      // Kutlama konfetileri
      const colors = ['#ffd000', '#00e5ff', '#5ce62e', '#ff3b3b', '#ff7700'];
      for (let i = 0; i < 24; i++) {
        const a = (i * Math.PI * 2) / 24;
        this.particles.spawn(
          this.playerTruck.x,
          this.playerTruck.y - 20,
          Math.cos(a) * (140 + Math.random() * 140),
          Math.sin(a) * (140 + Math.random() * 140) - 80,
          7,
          colors[i % colors.length],
          0.75,
          260,
          'rect'
        );
      }
    }

    update(dt) {
      if (this.paused) {
        this.sound.updateEngine(0, false, true);
        return;
      }

      this.time += dt;

      // 1. Oyuncu Arabasını Güncelle
      this.playerTruck.update(
        dt,
        this.input,
        this.world,
        this.sound,
        this.particles,
        this.floatingTexts,
        (isBackflip) => this.onPlayerFlip(isBackflip)
      );

      // 2. İki Araba Modu (Buddy AI) Güncellemesi
      if (this.buddyMode) {
        const distBehind = this.playerTruck.x - this.buddyTruck.x;
        // Eğer çok geride kaldıysa ekran solundan yetişsin
        if (distBehind > this.viewW * 0.85) {
          this.buddyTruck.x = this.playerTruck.x - this.viewW * 0.48;
          this.buddyTruck.y = this.world.getSurfaceInfo(this.buddyTruck.x).y - 90;
          this.buddyTruck.vx = Math.max(400, this.playerTruck.vx);
          this.buddyTruck.angle = 0;
        } else if (distBehind < -this.viewW * 0.65) {
          this.buddyTruck.vx *= 0.92;
        }

        const aiInput = {
          gas: distBehind > 220 && (this.input.gas || this.input.nitro || distBehind > 260),
          brake: distBehind < 180 && this.buddyTruck.vx > this.playerTruck.vx,
          nitro: this.input.nitro && distBehind > 240
        };
        this.buddyTruck.update(dt, aiInput, this.world, this.sound, this.particles, this.floatingTexts, null);
      }

      // 3. Yıldız Toplama ve Kutu Ezme Kontrolleri
      const trucksToCheck = this.buddyMode ? [this.playerTruck, this.buddyTruck] : [this.playerTruck];

      for (let i = 0; i < this.world.stars.length; i++) {
        const s = this.world.stars[i];
        if (s.collected) continue;

        for (let t = 0; t < trucksToCheck.length; t++) {
          const tr = trucksToCheck[t];
          const dx = s.x - tr.x;
          const dy = s.y - tr.y;
          const distSq = dx * dx + dy * dy;

          // Çocuk dostu mıknatıs çekimi (Yaklaşınca yıldızlar arabaya uçar)
          if (distSq < 170 * 170 && distSq > 75 * 75) {
            s.x -= (dx / Math.sqrt(distSq)) * 420 * dt;
            s.y -= (dy / Math.sqrt(distSq)) * 420 * dt;
          } else if (distSq <= 82 * 82) {
            s.collected = true;
            this.starsCollected++;
            this.domStars.textContent = String(this.starsCollected);
            this.pulseStatPill(this.domPillStars);
            this.sound.playStar();
            this.floatingTexts.spawn(s.x, s.y - 20, '+1', '#ffd700', 1.0, true);
            for (let p = 0; p < 6; p++) {
              this.particles.spawn(
                s.x,
                s.y,
                (Math.random() - 0.5) * 180,
                (Math.random() - 0.5) * 180,
                5,
                '#ffe600',
                0.38,
                100,
                'circle'
              );
            }
            break;
          }
        }
      }

      // Ezilebilir Kutular (Arabayı yavaşlatmadan parçalanır!)
      for (let i = 0; i < this.world.crates.length; i++) {
        const c = this.world.crates[i];
        if (c.smashed) continue;

        for (let t = 0; t < trucksToCheck.length; t++) {
          const tr = trucksToCheck[t];
          if (Math.abs(c.x - tr.x) < 92 && Math.abs(c.y - (tr.y + 10)) < 78) {
            c.smashed = true;
            this.starsCollected += 2;
            this.domStars.textContent = String(this.starsCollected);
            this.pulseStatPill(this.domPillStars);
            this.sound.playSmash();
            this.floatingTexts.spawn(c.x, c.y - 30, 'GÜM! +2', c.color, 1.05, true);
            for (let p = 0; p < 10; p++) {
              this.particles.spawn(
                c.x,
                c.y,
                (Math.random() - 0.2) * 280,
                -80 - Math.random() * 240,
                8,
                c.color,
                0.6,
                520,
                'rect'
              );
            }
            break;
          }
        }
      }

      // 4. Kamera Takibi ve Sonsuz Dünya Üretimi / Temizliği
      const targetCamX = Math.max(0, this.playerTruck.x - this.viewW * 0.33);
      const targetCamY = Math.min(0, this.playerTruck.y - this.viewH * 0.48);

      this.camX += (targetCamX - this.camX) * Math.min(1, 10 * dt);
      this.camY += (targetCamY - this.camY) * Math.min(1, 7 * dt);

      this.world.ensureGenerated(this.camX + this.viewW + 1400);
      this.world.cullBehind(this.camX - 600);

      // 5. Motor Sesi ve Hız Göstergesi
      const speedKmh = Math.round(Math.abs(this.playerTruck.vx) * 0.16);
      this.domSpeed.textContent = String(speedKmh);
      this.sound.updateEngine(
        Math.abs(this.playerTruck.vx) / 800,
        this.input.gas || this.input.nitro,
        this.paused
      );
    }

    drawBackground(ctx) {
      // 1. Doygun Hot Wheels Gökyüzü Gradyanı
      const skyGrad = ctx.createLinearGradient(0, 0, 0, this.viewH);
      skyGrad.addColorStop(0, '#0051cc');
      skyGrad.addColorStop(0.55, '#00a2ff');
      skyGrad.addColorStop(1, '#8cf0ff');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, this.viewW, this.viewH);

      // 2. Parlak Güneş
      const sunX = this.viewW * 0.82;
      const sunY = this.viewH * 0.18;
      ctx.fillStyle = 'rgba(255, 240, 128, 0.28)';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 68, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffea55';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 44, 0, Math.PI * 2);
      ctx.fill();

      // 3. Uzak Paralaks Hot Wheels Dev Turuncu Halkalar (Stunt Loops)
      const loopSpacing = 900;
      const parallaxX = this.camX * 0.22;
      const firstLoop = Math.floor(parallaxX / loopSpacing) * loopSpacing;
      for (let lx = firstLoop; lx < parallaxX + this.viewW + loopSpacing; lx += loopSpacing) {
        const sx = lx - parallaxX;
        const sy = this.world.baseGroundY - this.camY * 0.3 - 95;
        ctx.strokeStyle = '#ff7b00';
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.arc(sx, sy, 125, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#ffbb00';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(sx, sy, 125, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 4. Paralaks Yeşil Tepeler
      ctx.fillStyle = '#1b8c42';
      ctx.beginPath();
      const hillStep = 90;
      const pHillX = this.camX * 0.4;
      const startH = Math.floor(pHillX / hillStep) * hillStep - hillStep;
      ctx.moveTo(0, this.viewH);
      for (let hx = startH; hx <= pHillX + this.viewW + hillStep * 2; hx += hillStep) {
        const sx = hx - pHillX;
        const hy =
          this.world.baseGroundY -
          this.camY * 0.45 -
          35 +
          Math.sin(hx * 0.0035) * 45 +
          Math.cos(hx * 0.0015) * 25;
        ctx.lineTo(sx, hy);
      }
      ctx.lineTo(this.viewW, this.viewH);
      ctx.closePath();
      ctx.fill();
    }

    draw(dt) {
      const ctx = this.ctx;
      this.drawBackground(ctx);

      // Dünya, Mavi Rampalar, Yıldızlar ve Kutular
      this.world.draw(ctx, this.camX, this.camY, this.viewW, this.viewH, this.time);

      // İki Araba Modu Açıksa Önce Buddy Arabayı Çiz
      if (this.buddyMode) {
        this.buddyTruck.draw(ctx, this.camX, this.camY);
      }

      // Oyuncunun Canavar Arabasını Çiz
      this.playerTruck.draw(ctx, this.camX, this.camY);

      // Nesne Havuzları (Parçacıklar ve Uçan Skor Yazıları)
      this.particles.updateAndDraw(ctx, dt, this.camX, this.camY, this.viewW, this.viewH);
      this.floatingTexts.updateAndDraw(ctx, dt, this.camX, this.camY, this.viewW);
    }

    loop(timestamp) {
      // Delta time sabitlemesi (Sekme değişimi veya takılmalarda fizik patlamasını önler)
      const rawDt = (timestamp - this.lastFrameTime) / 1000;
      this.lastFrameTime = timestamp;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.033);

      this.update(dt);
      this.draw(dt);

      requestAnimationFrame((ts) => this.loop(ts));
    }
  }

  // Oyunu Başlat
  window.addEventListener('DOMContentLoaded', () => {
    window.__monsterTruckGame = new MonsterTruckGame();
  });
})();
