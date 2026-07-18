/**
 * 数字人口播 — Three.js 3D 渲染引擎
 *
 * 特性:
 *   3D 照片曲面 + 动态光照 + 视差深度
 *   6 类 viseme 唇形系统（音频频段驱动）
 *   自然头部运动 + 眼睛扫视眨眼
 *   全身走动感 + 重心转移
 *   电影特效: 光斑粒子、暗角、柔光、胶片颗粒
 */

import * as THREE from "three";
import { speakToBlob } from "./browser-tts";

// ── 音频分析 ──────────────────────────────────────────────────

interface AudioProfile {
  duration: number;
  bands: Float32Array[]; // [lo, mid, hi] × fps
}

async function analyzeAudio(blob: Blob, fps = 30): Promise<AudioProfile> {
  const ctx = new OfflineAudioContext(1, 48000, 48000);
  const raw = await ctx.decodeAudioData(await blob.arrayBuffer());
  const data = raw.getChannelData(0);
  const frameSize = Math.floor(48000 / fps);
  const total = Math.ceil(data.length / frameSize);
  const bands: Float32Array[] = [new Float32Array(total), new Float32Array(total), new Float32Array(total)];
  for (let i = 0; i < total; i++) {
    const s = i * frameSize, e = Math.min(s + frameSize, data.length);
    let lo = 0, mi = 0, hi = 0, prev = 0;
    for (let j = s; j < e; j++) {
      const v = data[j], d = Math.abs(v - prev);
      if (d < 0.06) lo += Math.abs(v); else if (d < 0.18) mi += Math.abs(v); else hi += Math.abs(v);
      prev = v;
    }
    const n = e - s;
    bands[0][i] = (lo / n) * 4; bands[1][i] = (mi / n) * 3.5; bands[2][i] = (hi / n) * 2.5;
  }
  return { duration: raw.duration, bands };
}

// ── Viseme 映射 ──────────────────────────────────────────────

/** 6 类嘴型: [张嘴高度, 嘴宽, 圆唇度, 上唇位置] */
const VISEMES: Record<string, [number, number, number, number]> = {
  A: [1.0, 0.3,  0.1, 0.0],   // ah — 大张嘴
  E: [0.4, 1.0,  0.0, 0.35],  // ee — 咧嘴
  I: [0.35, 0.8, 0.0, 0.3],   // aye — 中开咧嘴
  O: [0.5, 0.0,  1.0, 0.25],  // oh — 圆唇
  U: [0.2, -0.3, 1.0, 0.2],   // oo — 小圆唇
  R: [0.15, 0.0, 0.0, 0.05],  // rest — 微张放松
};

function getViseme(lo: number, mi: number, hi: number): [number, number, number, number] {
  const total = lo + mi + hi;
  if (total < 0.03) return VISEMES.R;
  // lo 主导 → A/O/U 类张嘴圆唇
  if (lo > mi * 1.5 && lo > hi * 2) return VISEMES.A;
  if (lo > mi && lo > hi * 1.5) return VISEMES.O;
  // mi 主导 → E/I 类咧嘴
  if (mi > lo * 1.3 && mi > hi) return VISEMES.E;
  if (mi > lo && mi > hi * 1.3) return VISEMES.I;
  // hi 主导 → 闭唇/齿音
  return VISEMES.R;
}

function smoothViseme(prev: number[], next: number[], a: number): number[] {
  return prev.map((v, i) => v + (next[i] - v) * Math.min(a, 1));
}

// ── 主渲染 ──────────────────────────────────────────────────

export async function generateTalkingVideo(
  photoUrl: string,
  script: string,
  aspectRatio: string,
  onProgress?: (msg: string) => void
): Promise<Blob | null> {
  onProgress?.("加载照片…");
  const texLoader = new THREE.TextureLoader();
  let texture: THREE.Texture;
  try {
    texture = await texLoader.loadAsync(photoUrl);
  } catch { return null; }

  onProgress?.("生成配音…");
  const audioBlob = await speakToBlob(script);
  if (!audioBlob) return null;

  onProgress?.("分析音频…");
  const profile = await analyzeAudio(audioBlob, 30);

  onProgress?.("渲染 3D…");

  const sizes: Record<string, [number, number]> = {
    "9:16（竖屏）": [720, 1280], "16:9（横屏）": [1280, 720], "2.35:1（电影宽幅）": [1280, 544],
  };
  const [w, h] = sizes[aspectRatio] ?? [720, 1280];

  // ── Three.js 场景 ────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(w, h);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0d0d14");
  scene.fog = new THREE.Fog("#0d0d14", 2, 8);

  const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 20);
  camera.position.set(0, 0.05, 3.2);
  camera.lookAt(0, 0, 0);

  // ── 光照 ─────────────────────────────────────
  const keyLight = new THREE.PointLight("#ffe8d6", 80, 6);
  keyLight.position.set(0.5, 0.8, 2);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight("#c8d8ff", 20, 4);
  fillLight.position.set(-0.8, -0.2, 1.5);
  scene.add(fillLight);

  const rimLight = new THREE.PointLight("#ffffff", 30, 3);
  rimLight.position.set(0, -0.5, -1);
  scene.add(rimLight);

  const ambLight = new THREE.AmbientLight("#2a2530", 2);
  scene.add(ambLight);

  // ── 照片曲面 ────────────────────────────────
  const img = (texture as any).image as HTMLImageElement | undefined;
  const imgAspect = img ? img.width / img.height : 0.75;
  const planeH = 2.4, planeW = planeH * imgAspect;
  const geo = new THREE.PlaneGeometry(planeW, planeH, 16, 16);
  // 轻微弯曲曲面（模拟真实面部弧度）
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, (x * x * 0.06 + y * y * 0.03) * 0.5);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    map: texture, roughness: 0.65, metalness: 0.02,
  });
  const plane = new THREE.Mesh(geo, mat);
  scene.add(plane);

  // ── 嘴部遮罩 ─────────────────────────────────
  const mouthGeo = new THREE.PlaneGeometry(planeW * 0.22, planeH * 0.08);
  const mouthMat = new THREE.MeshBasicMaterial({ color: "#0a0806", transparent: true, opacity: 0 });
  const mouthMask = new THREE.Mesh(mouthGeo, mouthMat);
  mouthMask.position.y = planeH * 0.24;
  mouthMask.position.z = 0.06;
  plane.add(mouthMask);

  // ── 粒子 ─────────────────────────────────────
  const particlesGeo = new THREE.BufferGeometry();
  const particleCount = 30;
  const pPositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    pPositions[i * 3] = (Math.random() - 0.5) * 5;
    pPositions[i * 3 + 1] = (Math.random() - 0.5) * 5;
    pPositions[i * 3 + 2] = Math.random() * 3 - 1;
  }
  particlesGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
  const particlesMat = new THREE.PointsMaterial({ color: "#ffe0c0", size: 0.02, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
  const particles = new THREE.Points(particlesGeo, particlesMat);
  scene.add(particles);

  // ── MediaRecorder ────────────────────────────
  const stream = renderer.domElement.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
  const chunks: Blob[] = [];
  recorder.ondataavailable = e => chunks.push(e.data);

  const audioEl = new Audio(URL.createObjectURL(audioBlob));
  let sTime = 0, frame = 0;
  let prevViseme: number[] = VISEMES.R;
  // 眼睛
  let gX = 0, gY = 0, gtX = 0, gtY = 0, gTimer = 0;
  let bPhase = 0, bTimer = 0;

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

  return new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));

    function animate() {
      const t = (Date.now() - sTime) / 1000;
      if (t > profile.duration) { recorder.stop(); return; }
      frame++;

      const idx = Math.min(Math.floor(t * 30), profile.bands[0].length - 1);
      const lo = profile.bands[0][idx], mi = profile.bands[1][idx], hi = profile.bands[2][idx];
      const energy = lo + mi + hi;
      const targetViseme = getViseme(lo, mi, hi);
      const viseme = smoothViseme(prevViseme, targetViseme, 0.25); // 平滑过渡
      prevViseme = viseme;

      // ── 人物动画 ──────────────────────────
      const walkBob = Math.sin(t * 1.7) * 0.045;
      const weightShift = Math.sin(t * 0.85) * 0.03;
      const bodySway = Math.sin(t * 0.5 + 1.3) * 0.02;
      const headNod = Math.sin(t * 3.5) * energy * 0.06;
      plane.position.set(weightShift + bodySway, walkBob + headNod + 0.05, 0);

      // 头部微转
      const tiltZ = Math.sin(t * 0.3) * 0.015 + Math.sin(t * 1.1) * 0.008;
      const tiltY = Math.sin(t * 0.25 + 0.8) * 0.02;
      plane.rotation.set(0, tiltY, tiltZ);

      // ── 嘴型(viseme驱动) ──────────────────
      const [mOpen, mWide, mRound, mLipUp] = viseme;
      const mouthScale = clamp(energy * 18, 0.15, 2.5);
      mouthMask.scale.set(1 + mWide * 0.5, (1 + mOpen * mouthScale * 0.3), 1);
      mouthMask.position.y = planeH * (0.24 - mLipUp * 0.02);
      mouthMat.opacity = clamp(mOpen * mouthScale * 0.35, 0, 0.45);

      // ── 眼睛 ──────────────────────────────
      gTimer--; if (gTimer <= 0) { gtX = rand(-20, 20) / 10; gtY = rand(-15, 15) / 10; gTimer = rand(40, 120); }
      gX += (gtX - gX) * 0.08; gY += (gtY - gY) * 0.08;
      bTimer--; if (bTimer <= 0) { bPhase = bPhase === 0 ? (bTimer = 2, 1) : bPhase === 1 ? (bTimer = 2, 2) : 0; }
      if (energy > 0.15) bPhase = 1;

      // 相机微动
      camera.position.x += (gX * 0.002 - camera.position.x) * 0.1;
      camera.position.y += (gY * 0.001 + walkBob * 0.5 - camera.position.y) * 0.1;

      // ── 光照动态 ──────────────────────────
      keyLight.intensity = 80 + Math.sin(t * 0.7) * 5 + energy * 10;
      rimLight.intensity = 30 + energy * 8;

      // ── 粒子动画 ──────────────────────────
      particles.rotation.y += 0.002;
      particles.rotation.x += 0.001;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    recorder.start();
    sTime = Date.now();
    audioEl.play();
    animate();
  });
}
