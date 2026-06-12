import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Animatronic } from '../types';

interface ThreeSceneProps {
  leftDoorClosed: boolean;
  rightDoorClosed: boolean;
  leftLightOn: boolean;
  rightLightOn: boolean;
  animatronics: Animatronic[];
  jumpscareActive: boolean;
  jumpscareId: string | null;
  powerOut: boolean;
}

export default function ThreeScene({
  leftDoorClosed,
  rightDoorClosed,
  leftLightOn,
  rightLightOn,
  animatronics,
  jumpscareActive,
  jumpscareId,
  powerOut
}: ThreeSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const leftDoorRef = useRef<THREE.Mesh | null>(null);
  const rightDoorRef = useRef<THREE.Mesh | null>(null);
  const leftLightObjRef = useRef<THREE.SpotLight | null>(null);
  const rightLightObjRef = useRef<THREE.SpotLight | null>(null);

  // Animatronic placeholders in the scene
  const blinkyModelRef = useRef<THREE.Group | null>(null);
  const ziggyModelRef = useRef<THREE.Group | null>(null);
  const sirenaModelRef = useRef<THREE.Group | null>(null);

  // Monitor screen glow light
  const screenLightRef = useRef<THREE.PointLight | null>(null);

  // Office ambient low-intensity red/blue emergency lights
  const emergencyLightRef = useRef<THREE.PointLight | null>(null);

  // Panning interaction
  const [mouseX, setMouseX] = useState<number>(0);
  const requestRef = useRef<number | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Track mouse coordinates over the container
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mountRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    // Normalize coordinates to [-1, 1]
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    setMouseX(x);
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Initial Scene Setup
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);
    scene.fog = new THREE.FogExp2(0x030305, 0.08);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 100);
    camera.position.set(0, 0, 1.5); // centered in the office chair
    cameraRef.current = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // 4. Create the Office Geometry (Walls, floor, ceiling)
    const officeGroup = new THREE.Group();

    // Floor (industrial dark grid tile)
    const floorGeo = new THREE.BoxGeometry(10, 0.1, 8);
    const checkeredCanvas = document.createElement('canvas');
    checkeredCanvas.width = 128;
    checkeredCanvas.height = 128;
    const ctx = checkeredCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#101016';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#222230';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillRect(64, 64, 64, 64);
    }
    const floorTex = new THREE.CanvasTexture(checkeredCanvas);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(5, 4);

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.6,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -1.5, 0);
    floor.receiveShadow = true;
    officeGroup.add(floor);

    // Ceiling
    const ceilingGeo = new THREE.PlaneGeometry(10, 8);
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.9 });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 2.5, 0);
    officeGroup.add(ceiling);

    // Front Wall (with monitoring screens & metal beams)
    const wallFrontGeo = new THREE.BoxGeometry(10, 4, 0.2);
    const wallFrontMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.8 });
    const wallFront = new THREE.Mesh(wallFrontGeo, wallFrontMat);
    wallFront.position.set(0, 0.5, -3.9);
    wallFront.receiveShadow = true;
    officeGroup.add(wallFront);

    // Left Wall
    const wallLeftGeo = new THREE.BoxGeometry(0.2, 4, 8);
    const wallLeftMat = new THREE.MeshStandardMaterial({ color: 0x15151c, roughness: 0.8 });
    const wallLeft = new THREE.Mesh(wallLeftGeo, wallLeftMat);
    wallLeft.position.set(-4.9, 0.5, 0);
    wallLeft.receiveShadow = true;
    officeGroup.add(wallLeft);

    // Right Wall
    const wallRightGeo = new THREE.BoxGeometry(0.2, 4, 8);
    const wallRightMat = new THREE.MeshStandardMaterial({ color: 0x15151c, roughness: 0.8 });
    const wallRight = new THREE.Mesh(wallRightGeo, wallRightMat);
    wallRight.position.set(4.9, 0.5, 0);
    wallRight.receiveShadow = true;
    officeGroup.add(wallRight);

    // 5. Office Desk and Prop details
    const deskGeo = new THREE.BoxGeometry(5, 0.8, 1.8);
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x2e1d11, roughness: 0.5, metalness: 0.1 });
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.set(0, -1.1, -2.5);
    desk.castShadow = true;
    desk.receiveShadow = true;
    officeGroup.add(desk);

    // Retro PC Monitor (The camera feedback monitor)
    const monitorGeo = new THREE.BoxGeometry(1.2, 0.9, 0.8);
    const monitorMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.3 });
    const monitor = new THREE.Mesh(monitorGeo, monitorMat);
    monitor.position.set(0, -0.25, -2.5);
    monitor.castShadow = true;
    officeGroup.add(monitor);

    // Laptop/crt screen face
    const screenGeo = new THREE.PlaneGeometry(1.0, 0.75);
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 128;
    screenCanvas.height = 128;
    const sCtx = screenCanvas.getContext('2d');
    if (sCtx) {
      // Draw standard green CRT command prompt mock lines
      sCtx.fillStyle = '#020e03';
      sCtx.fillRect(0, 0, 128, 128);
      sCtx.fillStyle = '#00ff33';
      sCtx.font = '8px monospace';
      sCtx.fillText('SYS ONLINE', 10, 20);
      sCtx.fillText('GRID L: 100%', 10, 35);
      sCtx.fillText('CAM FEED: STANDBY', 10, 50);
      sCtx.fillText('ALERT_LOW_POWER_METER', 10, 75);
      sCtx.fillStyle = '#005511';
      sCtx.fillRect(10, 90, 108, 15);
    }
    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, -0.25, -2.09);
    officeGroup.add(screen);

    // Fan prop (spins)
    const fanStandGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8);
    const fanStandMat = new THREE.MeshStandardMaterial({ color: 0x33333f, metalness: 0.8, roughness: 0.4 });
    const fanStand = new THREE.Mesh(fanStandGeo, fanStandMat);
    fanStand.position.set(1.4, -0.4, -2.2);
    officeGroup.add(fanStand);

    const fanBladesGroup = new THREE.Group();
    fanBladesGroup.position.set(1.4, -0.1, -2.1);
    const fanCenterGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const fanCenter = new THREE.Mesh(fanCenterGeo, fanStandMat);
    fanBladesGroup.add(fanCenter);

    for (let i = 0; i < 3; i++) {
      const bladeGeo = new THREE.BoxGeometry(0.4, 0.08, 0.02);
      const blade = new THREE.Mesh(bladeGeo, fanStandMat);
      blade.rotation.z = (i * Math.PI * 2) / 3;
      blade.position.set(Math.cos(blade.rotation.z) * 0.2, Math.sin(blade.rotation.z) * 0.2, 0);
      fanBladesGroup.add(blade);
    }
    officeGroup.add(fanBladesGroup);

    // Soda can
    const canGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.24, 8);
    const canMat = new THREE.MeshStandardMaterial({ color: 0xbb1111, metalness: 0.9, roughness: 0.1 });
    const can = new THREE.Mesh(canGeo, canMat);
    can.position.set(-1.2, -0.6, -2.1);
    officeGroup.add(can);

    // Posters on the front wall
    const posterGeo = new THREE.PlaneGeometry(1.6, 1.2);
    const posterCanvas = document.createElement('canvas');
    posterCanvas.width = 256;
    posterCanvas.height = 192;
    const pCtx = posterCanvas.getContext('2d');
    if (pCtx) {
      pCtx.fillStyle = '#bb8822';
      pCtx.fillRect(0, 0, 256, 192);
      // Striped border
      pCtx.strokeStyle = '#ffcc00';
      pCtx.lineWidth = 6;
      pCtx.strokeRect(6, 6, 244, 180);
      // Fun letters
      pCtx.fillStyle = '#ff0044';
      pCtx.font = 'bold 20px "Courier New"';
      pCtx.fillText("NEON OASIS", 35, 45);
      pCtx.fillStyle = '#111';
      pCtx.font = '12px "Courier New"';
      pCtx.fillText("FUN PLACE FOR KIDS!", 35, 75);
      // Cute smiley bear
      pCtx.fillStyle = '#111';
      pCtx.beginPath();
      pCtx.arc(128, 125, 30, 0, Math.PI * 2);
      pCtx.fill();
      // Eyes
      pCtx.fillStyle = '#00ff33';
      pCtx.beginPath();
      pCtx.arc(115, 120, 5, 0, Math.PI * 2);
      pCtx.arc(141, 120, 5, 0, Math.PI * 2);
      pCtx.fill();
    }
    const posterTex = new THREE.CanvasTexture(posterCanvas);
    const posterMat = new THREE.MeshStandardMaterial({ map: posterTex, roughness: 0.9 });
    const poster = new THREE.Mesh(posterGeo, posterMat);
    poster.position.set(-1.8, 0.6, -3.78);
    officeGroup.add(poster);

    // 6. Left and Right sliding Door frames
    // Left Doorway
    const frameLGeo = new THREE.BoxGeometry(0.1, 2.5, 1.4);
    const frameLMat = new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.9 });
    const frameL = new THREE.Mesh(frameLGeo, frameLMat);
    frameL.position.set(-4.8, -0.25, -0.4);
    officeGroup.add(frameL);

    // Dynamic Left Door Slab
    const doorLGeo = new THREE.BoxGeometry(0.08, 2.5, 1.35);
    const doorLMat = new THREE.MeshStandardMaterial({
      color: 0x444455,
      metalness: 0.7,
      roughness: 0.3
    });
    const doorLeft = new THREE.Mesh(doorLGeo, doorLMat);
    // starts CLOSED or OPEN
    doorLeft.position.set(-4.77, leftDoorClosed ? -0.25 : 2.5, -0.4);
    officeGroup.add(doorLeft);
    leftDoorRef.current = doorLeft;

    // Right Doorway
    const frameRGeo = new THREE.BoxGeometry(0.1, 2.5, 1.4);
    const frameRMat = new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.9 });
    const frameR = new THREE.Mesh(frameRGeo, frameRMat);
    frameR.position.set(4.8, -0.25, -0.4);
    officeGroup.add(frameR);

    // Dynamic Right Door Slab
    const doorRight = new THREE.Mesh(doorLGeo, doorLMat);
    doorRight.position.set(4.77, rightDoorClosed ? -0.25 : 2.5, -0.4);
    officeGroup.add(doorRight);
    rightDoorRef.current = doorRight;

    // 7. Hallway & Office Lighting Setup
    // Tiny blinking office light
    const officeLight = new THREE.PointLight(0xf0e6d2, 0.4, 6);
    officeLight.position.set(0, 1.8, -1.0);
    officeLight.castShadow = true;
    officeGroup.add(officeLight);

    // Screen green light source
    const scrLight = new THREE.PointLight(0x00ff33, 0.5, 4);
    scrLight.position.set(0, -0.2, -2.1);
    officeGroup.add(scrLight);
    screenLightRef.current = scrLight;

    // Red emergency lighting blinking
    const emgLight = new THREE.PointLight(0xff0606, 0.0, 5);
    emgLight.position.set(0, 1.5, 0.5);
    officeGroup.add(emgLight);
    emergencyLightRef.current = emgLight;

    // Left Hallway light (Spotlight from left hallway into the door/window)
    const hallwayLightL = new THREE.SpotLight(0xffeedd, leftLightOn ? 18.0 : 0.0, 12, Math.PI / 4, 0.5, 1);
    hallwayLightL.position.set(-7, 0.5, -0.4);
    hallwayLightL.target.position.set(-4.5, -0.8, -0.4);
    officeGroup.add(hallwayLightL);
    officeGroup.add(hallwayLightL.target);
    leftLightObjRef.current = hallwayLightL;

    // Right Hallway light
    const hallwayLightR = new THREE.SpotLight(0xffeedd, rightLightOn ? 18.0 : 0.0, 12, Math.PI / 4, 0.5, 1);
    hallwayLightR.position.set(7, 0.5, -0.4);
    hallwayLightR.target.position.set(4.5, -0.8, -0.4);
    officeGroup.add(hallwayLightR);
    officeGroup.add(hallwayLightR.target);
    rightLightObjRef.current = hallwayLightR;

    scene.add(officeGroup);

    // 8. ANIMATRONIC 3D MODELLING (Simplistic low-poly scary robot parts)
    // BLINKY THE BEAR MODEL (Spooky silhouette outside Left Window)
    const blinkyG = new THREE.Group();
    // Head cube/sphere
    const headB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x3d2719, roughness: 0.8 }));
    headB.position.set(0, 0.5, 0);
    // Spooky glowing eyes (red spheres with raw emission!)
    const eyeLens = new THREE.SphereGeometry(0.04, 8, 8);
    const redEmission = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const eyeLB = new THREE.Mesh(eyeLens, redEmission);
    eyeLB.position.set(-0.15, 0.55, 0.23);
    const eyeRB = new THREE.Mesh(eyeLens, redEmission);
    eyeRB.position.set(0.15, 0.55, 0.23);
    headB.add(eyeLB);
    headB.add(eyeRB);
    // Ears
    const earGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8);
    earGeo.rotateX(Math.PI / 2);
    const earLB = new THREE.Mesh(earGeo, new THREE.MeshStandardMaterial({ color: 0x241107 }));
    earLB.position.set(-0.3, 0.85, 0.05);
    const earRB = new THREE.Mesh(earGeo, new THREE.MeshStandardMaterial({ color: 0x241107 }));
    earRB.position.set(0.3, 0.85, 0.05);
    blinkyG.add(earLB);
    blinkyG.add(earRB);
    // Body chest
    const chestB = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.6), new THREE.MeshStandardMaterial({ color: 0x3d2719 }));
    chestB.position.set(0, -0.3, 0);
    blinkyG.add(headB);
    blinkyG.add(chestB);
    // Position outside left window/door frame in the hallway
    blinkyG.position.set(-5.6, -0.35, -0.4); // hidden or visible outside left
    blinkyG.rotation.y = Math.PI / 2;
    blinkyG.visible = false;
    scene.add(blinkyG);
    blinkyModelRef.current = blinkyG;

    // ZIGGY THE RABBIT MODEL (Outside Right Doorway)
    const ziggyG = new THREE.Group();
    // Head with jaw
    const headZ = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.48, 0.44), new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.7 }));
    headZ.position.set(0, 0.5, 0);
    // Purple/blue glowing eyes
    const purpleMat = new THREE.MeshBasicMaterial({ color: 0xa29bfe });
    const eyeLZ = new THREE.Mesh(eyeLens, purpleMat);
    eyeLZ.position.set(-0.13, 0.56, 0.21);
    const eyeRZ = new THREE.Mesh(eyeLens, purpleMat);
    eyeRZ.position.set(0.13, 0.56, 0.21);
    headZ.add(eyeLZ);
    headZ.add(eyeRZ);
    // Long ears
    const earZGeo = new THREE.BoxGeometry(0.08, 0.5, 0.08);
    const earLZ = new THREE.Mesh(earZGeo, new THREE.MeshStandardMaterial({ color: 0x2d3436 }));
    earLZ.position.set(-0.18, 0.9, 0.0);
    const earRZ = new THREE.Mesh(earZGeo, new THREE.MeshStandardMaterial({ color: 0x2d3436 }));
    earRZ.position.set(0.18, 0.9, 0.0);
    ziggyG.add(earLZ);
    ziggyG.add(earRZ);

    const chestZ = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x3f3f4e }));
    chestZ.position.set(0, -0.3, 0);
    ziggyG.add(headZ);
    ziggyG.add(chestZ);
    // Position outside right doorway
    ziggyG.position.set(5.6, -0.35, -0.4);
    ziggyG.rotation.y = -Math.PI / 2;
    ziggyG.visible = false;
    scene.add(ziggyG);
    ziggyModelRef.current = ziggyG;

    // SIRENA THE SIREN BI-HORN WINGED MASCOT (CAM 6 Vent or hallway)
    const sirenaG = new THREE.Group();
    const headS = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xffeaa7, roughness: 0.8 }));
    headS.position.set(0, 0.5, 0);
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa });
    const eyeLS = new THREE.Mesh(eyeLens, greenMat);
    eyeLS.position.set(-0.12, 0.54, 0.19);
    const eyeRS = new THREE.Mesh(eyeLens, greenMat);
    eyeRS.position.set(0.12, 0.54, 0.19);
    headS.add(eyeLS);
    headS.add(eyeRS);
    // Siren audio horns on coordinates
    const hornGeo = new THREE.CylinderGeometry(0.05, 0.15, 0.26, 8);
    hornGeo.rotateX(Math.PI / 2);
    const hornLS = new THREE.Mesh(hornGeo, new THREE.MeshStandardMaterial({ color: 0xd63031 }));
    hornLS.position.set(-0.25, 0.72, 0.05);
    const hornRS = new THREE.Mesh(hornGeo, new THREE.MeshStandardMaterial({ color: 0xd63031 }));
    hornRS.position.set(0.25, 0.72, 0.05);
    sirenaG.add(hornLS);
    sirenaG.add(hornRS);

    const chestS = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.0, 0.44), new THREE.MeshStandardMaterial({ color: 0xfbcf33 }));
    chestS.position.set(0, -0.3, 0);
    sirenaG.add(headS);
    sirenaG.add(chestS);
    sirenaG.position.set(-5.6, -0.35, 1.2); // further out, visible under left light venting
    sirenaG.rotation.y = Math.PI / 2;
    sirenaG.visible = false;
    scene.add(sirenaG);
    sirenaModelRef.current = sirenaG;

    // 9. ANIMATION LOOP
    let fanAngle = 0;
    let alarmTimer = 0;

    const animate = () => {
      // Rotate FAN prop rapidly
      if (!powerOut) {
        fanAngle += 0.35;
        fanBladesGroup.rotation.z = fanAngle;
      }

      // Blink front computer text glow
      if (!powerOut && scrLight) {
        scrLight.intensity = 0.5 + Math.sin(Date.now() * 0.005) * 0.15;
      }

      // Smooth sliding transition for left and right Doors
      // doorLeft
      if (leftDoorRef.current) {
        const targetY = leftDoorClosed ? -0.25 : 2.5;
        doorLeft.position.y += (targetY - doorLeft.position.y) * 0.16;
      }
      // doorRight
      if (rightDoorRef.current) {
        const targetY = rightDoorClosed ? -0.25 : 2.5;
        doorRight.position.y += (targetY - doorRight.position.y) * 0.16;
      }

      // Camera Yaw Panning look-at
      if (cameraRef.current && !jumpscareActive) {
        // Map mouseX (-1 to 1) safely to yaw rotation between -0.9 and +0.9 radians (approx 50 degrees left/right)
        const targetRotationY = -mouseX * 0.9;
        cameraRef.current.rotation.y += (targetRotationY - cameraRef.current.rotation.y) * 0.08;
      }

      // Unlocked alert blinking warning light when power outage is commencing
      if (powerOut) {
        if (officeLight) officeLight.intensity = 0;
        if (scrLight) scrLight.intensity = 0;
        if (emergencyLightRef.current) {
          // Glow faint amber/dark red decay
          emergencyLightRef.current.intensity = Math.max(0, 0.3 - (Date.now() % 4000) / 12000);
        }
      } else {
        // Red lights flashing when animatronic is right inside doorways as threat level is extremely high
        const activeAnimNear = animatronics.some(a => a.currentCam === 'OFFICE_L' || a.currentCam === 'OFFICE_R');
        if (activeAnimNear) {
          alarmTimer += 0.08;
          if (emergencyLightRef.current) {
            emergencyLightRef.current.intensity = (Math.sin(alarmTimer * 3) > 0) ? 0.35 : 0;
          }
        } else {
          if (emergencyLightRef.current) {
            emergencyLightRef.current.intensity = 0;
          }
        }
      }

      // RED JUMPSCARE VIOLENT camera shaking & popups
      if (jumpscareActive && cameraRef.current) {
        cameraRef.current.position.x = (Math.random() - 0.5) * 0.5;
        cameraRef.current.position.y = (Math.random() - 0.5) * 0.5;
        cameraRef.current.position.z = 1.0 + (Math.random() * 0.2); // zoom in close
        cameraRef.current.lookAt(0, 0.1, -1.0);
      }

      renderer.render(scene, camera);
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    // 10. Handle window resize
    const handleResize = () => {
      if (!mountRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup resources
    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        try { mountRef.current.removeChild(renderer.domElement); } catch (e){}
      }
      // dispose geometries/materials safely
      officeGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    };
  }, []);

  // Sync state transitions securely from props (Doors closing, Lights turning on, and Animatronic near visibility)
  useEffect(() => {
    if (powerOut) {
      if (leftLightObjRef.current) leftLightObjRef.current.intensity = 0;
      if (rightLightObjRef.current) rightLightObjRef.current.intensity = 0;
      if (blinkyModelRef.current) blinkyModelRef.current.visible = false;
      if (ziggyModelRef.current) ziggyModelRef.current.visible = false;
      if (sirenaModelRef.current) sirenaModelRef.current.visible = false;
      return;
    }

    // Left Hallway light toggling and rendering silhouetted Blinky
    if (leftLightObjRef.current) {
      leftLightObjRef.current.intensity = leftLightOn ? 18.0 : 0.0;
    }
    // Right Hallway light toggling
    if (rightLightObjRef.current) {
      rightLightObjRef.current.intensity = rightLightOn ? 18.0 : 0.0;
    }

    // Animatronic positions visibility filter. Let's toggle their visibility in the doorways!
    // BLINKY position CAM OFFICE_L
    const blinkyNear = animatronics.find(a => a.id === 'BLINKY')?.currentCam === 'OFFICE_L';
    if (blinkyModelRef.current) {
      // ONLY visible under Left hallway light! Or very faint red dots if dark
      blinkyModelRef.current.visible = blinkyNear && (leftLightOn || Math.random() < 0.05);
      if (leftLightOn && blinkyNear) {
        blinkyModelRef.current.position.set(-4.5, -0.35, -0.4); // moves closer into full window frame
      } else {
        blinkyModelRef.current.position.set(-5.6, -0.35, -0.4);
      }
    }

    // ZIGGY position CAM OFFICE_R
    const ziggyNear = animatronics.find(a => a.id === 'ZIGGY')?.currentCam === 'OFFICE_R';
    if (ziggyModelRef.current) {
      ziggyModelRef.current.visible = ziggyNear && (rightLightOn || Math.random() < 0.05);
      if (rightLightOn && ziggyNear) {
        ziggyModelRef.current.position.set(4.5, -0.35, -0.4);
      } else {
        ziggyModelRef.current.position.set(5.6, -0.35, -0.4);
      }
    }

    // SIRENA position venting in Left door/vent CAM OFFICE_L (siren sounds near vent window)
    const sirenaNear = animatronics.find(a => a.id === 'SIRENA')?.currentCam === 'OFFICE_L';
    if (sirenaModelRef.current) {
      sirenaModelRef.current.visible = sirenaNear && (leftLightOn || Math.random() < 0.05);
      if (leftLightOn && sirenaNear) {
        sirenaModelRef.current.position.set(-4.5, -0.15, 0.4);
      } else {
        sirenaModelRef.current.position.set(-5.6, -0.15, 0.4);
      }
    }
  }, [leftLightOn, rightLightOn, animatronics, powerOut, leftDoorClosed, rightDoorClosed]);

  return (
    <div
      id="three-canvas-container"
      ref={mountRef}
      onMouseMove={handleMouseMove}
      className="w-full h-full relative cursor-crosshair overflow-hidden border-2 border-slate-900 bg-black rounded shadow-2xl"
    >
      {/* Interactive Helper Overlay cues */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none text-center bg-black/60 px-3 py-1 rounded border border-slate-800 backdrop-blur text-xs font-mono tracking-wider text-slate-400">
        🖱️ Рухайте мишкою вліво/вправо для огляду офісу
      </div>

      {leftLightOn && animatronics.find(a => a.id === 'BLINKY')?.currentCam === 'OFFICE_L' && (
        <div className="absolute top-4 left-4 bg-red-950/80 text-red-400 font-mono text-xs px-2 py-1 rounded border border-red-800 animate-pulse">
          ⚠️ СИЛУЕТ БІЛЯ ЛІВОГО ВІКНА!
        </div>
      )}

      {rightLightOn && animatronics.find(a => a.id === 'ZIGGY')?.currentCam === 'OFFICE_R' && (
        <div className="absolute top-4 right-4 bg-red-950/80 text-red-400 font-mono text-xs px-2 py-1 rounded border border-red-800 animate-pulse">
          ⚠️ СИЛУЕТ БІЛЯ ПРАВОГО ВІКНА!
        </div>
      )}

      {/* Screen CRT Distortion Overlay scanning lines */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_10%,rgba(0,0,0,0.55)_90%)] mix-blend-overlay z-10" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] z-20" />
    </div>
  );
}
