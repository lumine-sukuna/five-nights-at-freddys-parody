import { useEffect, useRef } from 'react';
import { Animatronic, CAMERAS } from '../types';

interface CctvViewProps {
  currentCamId: string;
  animatronics: Animatronic[];
  glitchLevel: number; // 0 to 100%
  cameraGlitching: boolean;
}

export default function CctvView({
  currentCamId,
  animatronics,
  glitchLevel,
  cameraGlitching
}: CctvViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set dimensions
    canvas.width = 640;
    canvas.height = 360;

    // Clear background (dark grayish green CCTV scan zone)
    ctx.fillStyle = '#060a08';
    ctx.fillRect(0, 0, 640, 360);

    // If camera is glitching, draw heavy static noise
    if (cameraGlitching || glitchLevel > 80) {
      drawStaticNoise(ctx, 1.0);
      drawCrtScanlines(ctx);
      drawStaticHUD(ctx, currentCamId);
      return;
    }

    // Draw grid environment vector background based on CAM ID
    drawCamRoomBackground(ctx, currentCamId);

    // Find animatronics present in this room
    const presentAnimatronics = animatronics.filter(a => a.currentCam === currentCamId);

    // Draw active characters
    presentAnimatronics.forEach((anim, idx) => {
      // Offset if multiple animatronics are in the same room
      const xOffset = presentAnimatronics.length > 1 ? (idx - 0.5) * 120 : 0;
      drawAnimatronicSilhouette(ctx, anim, xOffset);
    });

    // Draw static noise layers blending (faint analog glitching)
    if (glitchLevel > 0) {
      drawStaticNoise(ctx, glitchLevel / 120);
    } else {
      drawStaticNoise(ctx, 0.05); // faint background fuzz
    }

    // Scanlines & CRT filters
    drawCrtScanlines(ctx);

    // DRAW CAMERA HUD
    drawCctvHUD(ctx, currentCamId, glitchLevel);
  }, [currentCamId, animatronics, glitchLevel, cameraGlitching]);

  // Analog white noise generator
  const drawStaticNoise = (ctx: CanvasRenderingContext2D, opacity: number) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    const imgData = ctx.createImageData(640, 360);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const grey = Math.floor(Math.random() * 255);
      data[i] = grey;
      data[i + 1] = grey;
      data[i + 2] = grey;
      data[i + 3] = 255;
    }
    // Render off-screen or blend
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 640;
    noiseCanvas.height = 360;
    noiseCanvas.getContext('2d')?.putImageData(imgData, 0, 0);

    ctx.drawImage(noiseCanvas, 0, 0);
    ctx.restore();
  };

  // Static overlay when camera is offline or glitching completely
  const drawStaticHUD = (ctx: CanvasRenderingContext2D, camId: string) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, 640, 360);

    ctx.fillStyle = '#ff3333';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ СИГНАЛ ВТРАЧЕНО (GLITCH OUT)', 320, 160);

    ctx.fillStyle = '#00ff33';
    ctx.font = '14px monospace';
    ctx.fillText('Скиньте перевантаження або перевірте КАМ 8', 320, 210);

    ctx.strokeStyle = '#ff3333';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, 560, 280);
  };

  // Draw scenic wireframe room elements for retro feel
  const drawCamRoomBackground = (ctx: CanvasRenderingContext2D, camId: string) => {
    ctx.strokeStyle = '#1e3020';
    ctx.lineWidth = 2;

    switch (camId) {
      case 'STAGE':
        // Stage floor, curtains, microphone stand
        ctx.beginPath();
        ctx.moveTo(50, 280);
        ctx.lineTo(590, 280);
        ctx.stroke();

        // Left & Right columns
        ctx.strokeRect(40, 50, 40, 230);
        ctx.strokeRect(560, 50, 40, 230);

        // Curtains wireframe loops
        ctx.beginPath();
        for (let x = 60; x <= 580; x += 60) {
          ctx.arc(x, 50, 40, 0, Math.PI, false);
        }
        ctx.stroke();

        // Empty microphone
        ctx.beginPath();
        ctx.moveTo(320, 280);
        ctx.lineTo(320, 210);
        ctx.arc(320, 205, 5, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'DINING':
        // Abandoned Party Tables covered with plates
        for (let i = 0; i < 3; i++) {
          const x = 120 + i * 180;
          ctx.strokeRect(x, 240, 140, 60);
          // Table legs
          ctx.beginPath();
          ctx.moveTo(x + 20, 300); ctx.lineTo(x + 20, 330);
          ctx.moveTo(x + 120, 300); ctx.lineTo(x + 120, 330);
          ctx.stroke();
          // Small candle cylinders
          ctx.strokeRect(x + 60, 220, 20, 20);
        }
        break;

      case 'ARCADE':
        // Neon Game cabinets outline in the shadows
        for (let i = 0; i < 4; i++) {
          const x = 80 + i * 130;
          ctx.beginPath();
          ctx.moveTo(x, 320);
          ctx.lineTo(x, 180);
          ctx.lineTo(x + 40, 140);
          ctx.lineTo(x + 80, 140);
          ctx.lineTo(x + 80, 320);
          ctx.closePath();
          ctx.stroke();

          // Screen box
          ctx.strokeRect(x + 15, 170, 50, 40);
          // Joy controllers
          ctx.beginPath();
          ctx.arc(x + 30, 230, 4, 0, Math.PI * 2);
          ctx.arc(x + 55, 230, 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;

      case 'KIDS_PLAY':
        // Carousel or ball pit frame & dangling star toys
        ctx.strokeRect(100, 300, 440, 40); // Pit wall
        ctx.beginPath();
        ctx.arc(320, 100, 120, Math.PI, 0); // Carousel dome
        ctx.stroke();
        // Support beam
        ctx.beginPath();
        ctx.moveTo(320, 100);
        ctx.lineTo(320, 300);
        ctx.stroke();
        // Dangling stars
        for (let x of [150, 220, 420, 490]) {
          ctx.beginPath();
          ctx.moveTo(x, 60);
          ctx.lineTo(x, 140);
          ctx.stroke();
          ctx.strokeRect(x - 5, 140, 10, 10);
        }
        break;

      case 'BACKSTAGE':
        // Shelves filled with spare animatronic heads
        ctx.strokeRect(60, 80, 520, 220); // Shelf frame
        ctx.beginPath();
        ctx.moveTo(60, 150); ctx.lineTo(580, 150);
        ctx.moveTo(60, 220); ctx.lineTo(580, 220);
        ctx.stroke();
        // Outline of a spare bear head on shelf
        ctx.beginPath();
        ctx.arc(150, 120, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeRect(144, 95, 12, 8); // Top hat
        break;

      case 'VENT_L':
      case 'VENT_R':
        // Symmetrical industrial square vent tunnels
        ctx.save();
        ctx.strokeStyle = '#3a4a3e';
        ctx.lineWidth = 1.5;
        // Inner depth square
        ctx.strokeRect(160, 90, 320, 180);
        ctx.strokeRect(260, 140, 120, 80);
        // Connect corners for perspective illusion
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(160, 90); ctx.lineTo(260, 140);
        ctx.moveTo(640, 0); ctx.lineTo(480, 90); ctx.lineTo(380, 140);
        ctx.moveTo(0, 360); ctx.lineTo(160, 270); ctx.lineTo(260, 220);
        ctx.moveTo(640, 360); ctx.lineTo(480, 270); ctx.lineTo(380, 220);
        ctx.stroke();
        ctx.restore();
        break;

      case 'PRIZE':
        // Sealed giant lockbox with vertical power wires
        ctx.strokeRect(220, 120, 200, 200);
        // Ribbon ties
        ctx.beginPath();
        ctx.moveTo(320, 120); ctx.lineTo(320, 320);
        ctx.moveTo(220, 220); ctx.lineTo(420, 220);
        ctx.stroke();
        // Warning signage logo
        ctx.strokeRect(280, 140, 80, 40);
        ctx.fillText('WARNING', 290, 164);
        break;
    }
  };

  // Draw procedural scary robot vector based on character config
  const drawAnimatronicSilhouette = (ctx: CanvasRenderingContext2D, anim: Animatronic, offset: number) => {
    const cx = 320 + offset;
    const cy = 210;

    ctx.save();
    // Render spooky, distorted high contrast shape matching avatar
    ctx.shadowColor = anim.avatarColor;
    ctx.shadowBlur = 15;

    // Outer color styling
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.strokeStyle = anim.avatarColor;
    ctx.lineWidth = 3;

    if (anim.id === 'BLINKY') {
      // Draw big bulky teddy bear silhouette
      ctx.beginPath();
      // Head
      ctx.arc(cx, cy - 30, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Ears
      ctx.beginPath();
      ctx.arc(cx - 35, cy - 65, 14, 0, Math.PI * 2);
      ctx.arc(cx + 35, cy - 65, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Top hat
      ctx.fillStyle = '#050505';
      ctx.fillRect(cx - 20, cy - 100, 40, 30);
      ctx.fillRect(cx - 30, cy - 70, 60, 6);

      // Chest body
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 50, 60, 80, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Terrifying glowing red eye points staring directly at the frame!
      ctx.shadowColor = '#ff0000';
      ctx.fillStyle = '#ff3333';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx - 14, cy - 35, 6, 0, Math.PI * 2);
      ctx.arc(cx + 14, cy - 35, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Tiny white pinprick pupils
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 14, cy - 35, 1.5, 0, Math.PI * 2);
      ctx.arc(cx + 14, cy - 35, 1.5, 0, Math.PI * 2);
      ctx.fill();

    } else if (anim.id === 'ZIGGY') {
      // Ziggy rabbit silhouette with tall pointed ears
      ctx.beginPath();
      // Head
      ctx.arc(cx, cy - 25, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Long structural rabbit ears pointing up, one slightly bent
      ctx.beginPath();
      ctx.moveTo(cx - 22, cy - 55);
      ctx.lineTo(cx - 26, cy - 130);
      ctx.lineTo(cx - 8, cy - 130);
      ctx.lineTo(cx - 8, cy - 55);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + 8, cy - 55);
      // Bent ear segment
      ctx.lineTo(cx + 12, cy - 110);
      ctx.lineTo(cx + 35, cy - 135);
      ctx.lineTo(cx + 42, cy - 120);
      ctx.lineTo(cx + 22, cy - 100);
      ctx.lineTo(cx + 22, cy - 55);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Body
      ctx.beginPath();
      ctx.ellipse(cx, cy + 60, 52, 75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Purple glowing eyes
      ctx.shadowColor = '#d63031';
      ctx.fillStyle = '#a29bfe';
      ctx.beginPath();
      ctx.arc(cx - 12, cy - 30, 5, 0, Math.PI * 2);
      ctx.arc(cx + 12, cy - 30, 5, 0, Math.PI * 2);
      ctx.fill();

    } else if (anim.id === 'SIRENA') {
      // Siren horned siren-bird-girl
      ctx.beginPath();
      ctx.arc(cx, cy - 20, 33, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Left-right megaphones speakers as horns!
      // Left speaker cone
      ctx.beginPath();
      ctx.moveTo(cx - 25, cy - 35);
      ctx.lineTo(cx - 65, cy - 65);
      ctx.lineTo(cx - 55, cy - 80);
      ctx.lineTo(cx - 20, cy - 48);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right speaker cone
      ctx.beginPath();
      ctx.moveTo(cx + 25, cy - 35);
      ctx.lineTo(cx + 65, cy - 65);
      ctx.lineTo(cx + 55, cy - 80);
      ctx.lineTo(cx + 20, cy - 48);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Angelic wings contour
      ctx.beginPath();
      ctx.moveTo(cx - 45, cy + 20);
      ctx.lineTo(cx - 110, cy - 10);
      ctx.lineTo(cx - 52, cy + 80);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + 45, cy + 20);
      ctx.lineTo(cx + 110, cy - 10);
      ctx.lineTo(cx + 52, cy + 80);
      ctx.closePath();
      ctx.stroke();

      // Bright neon cyan glowing eyes
      ctx.shadowColor = '#00ffaa';
      ctx.fillStyle = '#55efc4';
      ctx.beginPath();
      ctx.arc(cx - 10, cy - 25, 6, 0, Math.PI * 2);
      ctx.arc(cx + 10, cy - 25, 6, 0, Math.PI * 2);
      ctx.fill();

    } else if (anim.id === 'GLITCHER') {
      // The Glitcher scary security puppet drone
      // Floating long slender head
      ctx.beginPath();
      ctx.ellipse(cx, cy - 40, 26, 42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Metallic frame neck lines
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy + 2);
      ctx.lineTo(cx - 12, cy + 40);
      ctx.lineTo(cx + 12, cy + 40);
      ctx.lineTo(cx + 4, cy + 2);
      ctx.closePath();
      ctx.stroke();

      // Hanging cables
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy + 20);
      ctx.bezierCurveTo(cx - 30, cy + 80, cx - 10, cy + 120, cx - 25, cy + 150);
      ctx.moveTo(cx + 16, cy + 20);
      ctx.bezierCurveTo(cx + 10, cy + 70, cx + 30, cy + 110, cx + 18, cy + 150);
      ctx.stroke();

      // Glitched orange glowing double optics
      ctx.shadowColor = '#e17055';
      ctx.fillStyle = '#ff7675';
      ctx.beginPath();
      ctx.arc(cx - 10, cy - 44, 4, 0, Math.PI * 2);
      ctx.arc(cx + 10, cy - 44, 4, 0, Math.PI * 2);
      // Double forehead optics
      ctx.arc(cx, cy - 60, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  const drawCrtScanlines = (ctx: CanvasRenderingContext2D) => {
    // Top-to-bottom dark screen scanline effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let y = 0; y < 360; y += 4) {
      ctx.fillRect(0, y, 640, 2);
    }

    // Rolling interference bar
    const barY = (Date.now() / 15) % 400;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, barY - 20, 640, 20);
    ctx.fillRect(0, barY - 140, 640, 10);
  };

  const drawCctvHUD = (ctx: CanvasRenderingContext2D, camId: string, glitch: number) => {
    const camName = CAMERAS.find(c => c.id === camId)?.nameUk || camId;

    ctx.save();
    // Glowing green CRT borders text
    ctx.shadowColor = '#00ff33';
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#00ff66';
    ctx.font = '14px "JetBrains Mono", monospace';

    // Top left text
    ctx.fillText('🔴 LIVE FEED', 30, 40);
    ctx.fillText(`MUTE AUDIO: FILTER ACTIVE`, 30, 62);

    // Dynamic Time
    const today = new Date();
    const timeStr = today.toISOString().split('T')[0] + ' ' + today.toTimeString().split(' ')[0];
    ctx.fillText(timeStr, 30, 84);

    // Top Right CAM labels
    ctx.textAlign = 'right';
    ctx.font = 'bold 18px "JetBrains Mono", monospace';
    ctx.fillText(camName, 610, 40);

    // Signal status indicator
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillText(`СИГНАЛ: ${Math.max(0, 100 - Math.round(glitch))}%`, 610, 65);

    // Corners indicators brackets
    ctx.strokeStyle = '#00ff33';
    ctx.lineWidth = 2;
    // Top-Left corner
    ctx.beginPath();
    ctx.moveTo(15, 30); ctx.lineTo(15, 15); ctx.lineTo(30, 15);
    // Top-Right
    ctx.moveTo(625, 30); ctx.lineTo(625, 15); ctx.lineTo(610, 15);
    // Bottom-Left
    ctx.moveTo(15, 330); ctx.lineTo(15, 345); ctx.lineTo(30, 345);
    // Bottom-Right
    ctx.moveTo(625, 330); ctx.lineTo(625, 345); ctx.lineTo(610, 345);
    ctx.stroke();

    ctx.restore();
  };

  return (
    <div className="w-full h-full relative border-4 border-slate-950 rounded bg-zinc-950 shadow-inner flex items-center justify-center">
      <canvas
        id="cctv-viewer-canvas"
        ref={canvasRef}
        className="w-full aspect-[16/9] object-contain block bg-[#030605]"
      />
    </div>
  );
}
