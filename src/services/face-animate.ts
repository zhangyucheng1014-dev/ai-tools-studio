/**
 * 数字人口播 — 高保真 3D 人物渲染
 *
 * 人物模型:
 *   颈部关节 + 肩膀线 + 头颅（照片曲面）
 *   嘴部四层结构（上唇/下唇/牙齿/口腔）
 *   眼睛高光反射
 *
 * 动画系统:
 *   弹簧-阻尼物理（非正弦波）→ 更自然的运动
 *   呼吸驱动肩膀起伏 + 躯干微动
 *   音频 viseme 驱动唇形
 *
 * 渲染:
 *   Three.js 3D 场景 + 动态光照 + 电影特效
 */

import * as THREE from "three";
import { speakToBlob } from "./browser-tts";

// ── 音频分析 ──────────────────────────────────────────────────

interface AudioProfile {
  duration: number;
  bands: Float32Array[]; // [lo, mid, hi]
  onsets: Float32Array;  // 音节起始检测
}

async function analyzeAudio(blob: Blob, fps = 30): Promise<AudioProfile> {
  const ctx = new OfflineAudioContext(1, 48000, 48000);
  const raw = await ctx.decodeAudioData(await blob.arrayBuffer());
  const data = raw.getChannelData(0);
  const frameSize = Math.floor(48000 / fps);
  const total = Math.ceil(data.length / frameSize);
  const bands: Float32Array[] = [new Float32Array(total), new Float32Array(total), new Float32Array(total)];
  const onsets = new Float32Array(total);
  let prevEnergy = 0;
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
    const energy = bands[0][i] + bands[1][i] + bands[2][i];
    onsets[i] = energy > prevEnergy * 1.8 ? 1 : 0;
    prevEnergy = energy;
  }
  return { duration: raw.duration, bands, onsets };
}

// ── 弹簧物理 ──────────────────────────────────────────────────

class Spring {
  pos = 0; vel = 0; target = 0;
  constructor(readonly stiffness: number, readonly damping: number) {}
  update(dt: number) {
    const force = (this.target - this.pos) * this.stiffness;
    this.vel += force * dt;
    this.vel *= this.damping;
    this.pos += this.vel * dt;
    return this.pos;
  }
}

// ── Viseme ────────────────────────────────────────────────────

type Viseme = [number, number, number, number]; // [张嘴, 嘴宽, 圆唇, 上唇]

const V: Record<string, Viseme> = {
  A: [1.0, 0.3,  0.1, 0.0],
  E: [0.4, 1.0,  0.0, 0.35],
  I: [0.35, 0.8, 0.0, 0.3],
  O: [0.5, 0.0,  1.0, 0.25],
  U: [0.2, -0.3, 1.0, 0.2],
  R: [0.15, 0.0, 0.0, 0.05],
};

function getViseme(lo: number, mi: number, hi: number): Viseme {
  const t = lo + mi + hi;
  if (t < 0.03) return V.R;
  if (lo > mi * 1.5 && lo > hi * 2) return V.A;
  if (lo > mi && lo > hi * 1.5) return V.O;
  if (mi > lo * 1.3 && mi > hi) return V.E;
  if (mi > lo && mi > hi * 1.3) return V.I;
  return V.R;
}

// ── 主渲染 ──────────────────────────────────────────────────

export async function generateTalkingVideo(
  photoUrl: string,
  script: string,
  aspectRatio: string,
  onProgress?: (msg: string) => void
): Promise<Blob | null> {
  onProgress?.("加载照片…");
  const loader = new THREE.TextureLoader();
  let texture: THREE.Texture;
  try { texture = await loader.loadAsync(photoUrl); } catch { return null; }

  onProgress?.("生成配音…");
  const audioBlob = await speakToBlob(script);
  if (!audioBlob) return null;

  onProgress?.("分析音频…");
  const profile = await analyzeAudio(audioBlob, 30);

  onProgress?.("渲染 3D 人物…");

  const sizes: Record<string, [number, number]> = {
    "9:16（竖屏）": [720, 1280], "16:9（横屏）": [1280, 720], "2.35:1（电影宽幅）": [1280, 544],
  };
  const [w, h] = sizes[aspectRatio] ?? [720, 1280];

  // ── Scene ──────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h); renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0b0b12");
  scene.fog = new THREE.Fog("#0b0b12", 2.5, 9);

  const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 20);
  camera.position.set(0, 0.0, 3.6);
  camera.lookAt(0, -0.05, 0);

  // ── Lights ─────────────────────────────────
  const key = new THREE.PointLight("#ffe4cc", 70, 7);
  key.position.set(0.6, 0.9, 2.2); scene.add(key);
  const fill = new THREE.PointLight("#c0d0ff", 18, 5);
  fill.position.set(-0.7, -0.3, 1.6); scene.add(fill);
  const rim = new THREE.PointLight("#ffffff", 25, 3.5);
  rim.position.set(0, -0.6, -1.2); scene.add(rim);
  const amb = new THREE.AmbientLight("#282430", 1.8);
  scene.add(amb);

  // ── 照片尺寸 ───────────────────────────────
  const img = (texture as any).image as HTMLImageElement | undefined;
  const ratio = img ? img.width / img.height : 0.72;
  const headH = 2.0, headW = headH * ratio;

  // ── 颈部 pivot ─────────────────────────────
  const neckPivot = new THREE.Group();
  neckPivot.position.y = -headH * 0.42;
  scene.add(neckPivot);

  // ── 头部组（挂在颈关节上）────────────────
  const headGroup = new THREE.Group();
  headGroup.position.y = headH * 0.42;
  neckPivot.add(headGroup);

  // 头部曲面
  const headGeo = new THREE.PlaneGeometry(headW, headH, 20, 20);
  const pos = headGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, (x * x * 0.08 + y * y * 0.04) * 0.4);
  }
  headGeo.computeVertexNormals();
  const headMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, metalness: 0.01 });
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headGroup.add(headMesh);

  // ── 嘴部组 ─────────────────────────────────
  const mouthGroup = new THREE.Group();
  mouthGroup.position.y = headH * 0.22;
  mouthGroup.position.z = 0.06;
  headGroup.add(mouthGroup);

  // 口腔（暗部）
  const cavityGeo = new THREE.PlaneGeometry(headW * 0.16, headH * 0.06);
  const cavityMat = new THREE.MeshBasicMaterial({ color: "#060302", transparent: true, opacity: 0 });
  const cavity = new THREE.Mesh(cavityGeo, cavityMat);
  mouthGroup.add(cavity);

  // 牙齿
  const teethGeo = new THREE.PlaneGeometry(headW * 0.13, headH * 0.025);
  const teethMat = new THREE.MeshBasicMaterial({ color: "#e8e0d8", transparent: true, opacity: 0 });
  const teeth = new THREE.Mesh(teethGeo, teethMat);
  teeth.position.y = headH * 0.008;
  teeth.position.z = 0.005;
  mouthGroup.add(teeth);

  // 上唇阴影
  const upperLipGeo = new THREE.PlaneGeometry(headW * 0.17, headH * 0.02);
  const upperLipMat = new THREE.MeshBasicMaterial({ color: "#1a100c", transparent: true, opacity: 0 });
  const upperLip = new THREE.Mesh(upperLipGeo, upperLipMat);
  upperLip.position.y = headH * 0.015;
  upperLip.position.z = 0.003;
  mouthGroup.add(upperLip);

  // ── 肩膀 ───────────────────────────────────
  const shoulderGroup = new THREE.Group();
  shoulderGroup.position.y = -headH * 0.48;
  neckPivot.add(shoulderGroup);

  const shoulderGeo = new THREE.PlaneGeometry(headW * 1.8, headH * 0.35);
  // 弧形肩膀
  const sp = shoulderGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i), y = sp.getY(i);
    sp.setZ(i, -0.08 - Math.abs(x) * 0.15);
  }
  shoulderGeo.computeVertexNormals();
  const shoulderMat = new THREE.MeshStandardMaterial({
    color: "#1a1818", roughness: 0.85, metalness: 0.0, transparent: true, opacity: 0.65,
  });
  const shoulderMesh = new THREE.Mesh(shoulderGeo, shoulderMat);
  shoulderGroup.add(shoulderMesh);

  // ── 高光点（眼睛） ─────────────────────────
  const highlightGroup = new THREE.Group();
  highlightGroup.position.set(0, headH * 0.13, 0.07);
  headGroup.add(highlightGroup);
  const hlGeo = new THREE.SphereGeometry(0.015, 8, 8);
  const hlMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const hlL = new THREE.Mesh(hlGeo, hlMat);
  hlL.position.set(-headW * 0.08, 0, 0); highlightGroup.add(hlL);
  const hlR = new THREE.Mesh(hlGeo, hlMat);
  hlR.position.set(headW * 0.08, 0, 0); highlightGroup.add(hlR);

  // ── 粒子 ──────────────────────────────────
  const pGeo = new THREE.BufferGeometry();
  const n = 40, pArr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pArr[i*3] = (Math.random()-0.5)*6; pArr[i*3+1] = (Math.random()-0.5)*6; pArr[i*3+2] = Math.random()*4-1; }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pArr, 3));
  const pMat = new THREE.PointsMaterial({ color: "#ffe4c0", size: 0.018, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
  const particles = new THREE.Points(pGeo, pMat); scene.add(particles);

  // ── MediaRecorder ──────────────────────────
  const stream = renderer.domElement.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
  const chunks: Blob[] = [];
  recorder.ondataavailable = e => chunks.push(e.data);
  const audioEl = new Audio(URL.createObjectURL(audioBlob));

  // ── 物理弹簧 ──────────────────────────────
  const springs = {
    neckY: new Spring(12, 0.82),
    neckTilt: new Spring(8, 0.78),
    headNod: new Spring(15, 0.75),
    bodyBob: new Spring(6, 0.85),
    shoulderBreath: new Spring(3, 0.9),
    mouthOpen: new Spring(20, 0.7),
    mouthWide: new Spring(18, 0.72),
    browRaise: new Spring(12, 0.8),
  };

  let sTime = 0, frame = 0;
  let prevViseme: number[] = V.R;
  let gX = 0, gY = 0, gtX = 0, gtY = 0, gTimer = 0;
  let bPhase = 0, bTimer = 0;

  return new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));

    function animate() {
      const t = (Date.now() - sTime) / 1000;
      if (t > profile.duration + 0.3) { recorder.stop(); return; }
      frame++;
      const dt = Math.min(1 / 30, 0.05);

      const idx = Math.min(Math.floor(t * 30), profile.bands[0].length - 1);
      const lo = profile.bands[0][idx] ?? 0;
      const mi = profile.bands[1][idx] ?? 0;
      const hi = profile.bands[2][idx] ?? 0;
      const onset = profile.onsets[idx] ?? 0;
      const energy = lo + mi + hi;

      const targetViseme = getViseme(lo, mi, hi);
      const viseme = prevViseme.map((v, i) => v + (targetViseme[i] - v) * 0.3);
      prevViseme = viseme;

      // ── 弹簧驱动动画 ────────────────────
      // 呼吸
      springs.shoulderBreath.target = Math.sin(t * 1.6) * 0.6;
      // 身体重心
      springs.bodyBob.target = Math.sin(t * 0.9) * 0.03 + Math.sin(t * 1.7) * 0.02;
      // 音节起始 → 头微点
      if (onset > 0.5) springs.headNod.target = -0.04;
      else springs.headNod.target *= 0.92;
      // 颈部自然漂移
      springs.neckY.target = Math.sin(t * 0.4 + 1.2) * 0.015 + springs.bodyBob.pos * 0.5;
      springs.neckTilt.target = Math.sin(t * 0.33) * 0.02 + Math.sin(t * 0.8) * 0.01;
      // 嘴型
      const [mOpen, mWide, mRound] = viseme;
      springs.mouthOpen.target = mOpen * Math.min(energy * 22, 2.5);
      springs.mouthWide.target = mWide;
      springs.browRaise.target = energy > 0.08 ? 1 : 0;

      // 更新所有弹簧
      for (const s of Object.values(springs)) s.update(dt);

      // ── 眼睛 ───────────────────────────
      gTimer--; if (gTimer <= 0) { gtX = (Math.random()-0.5)*3; gtY = (Math.random()-0.5)*2; gTimer = rand(40,120); }
      gX += (gtX - gX) * 0.08; gY += (gtY - gY) * 0.08;
      bTimer--; if (bTimer <= 0) { bPhase = bPhase===0 ? (bTimer=2,1) : bPhase===1 ? (bTimer=2,2) : 0; }
      if (energy > 0.15) bPhase = 1;

      // ── 应用动画 ───────────────────────
      // 肩膀 — 呼吸起伏
      shoulderGroup.position.y = -headH * 0.48 + springs.shoulderBreath.pos * 0.04;
      shoulderGroup.scale.set(1 + springs.shoulderBreath.pos * 0.03, 1, 1);

      // 颈关节
      neckPivot.position.set(
        springs.bodyBob.pos * 0.4,
        springs.bodyBob.pos + springs.neckY.pos,
        0
      );
      neckPivot.rotation.set(0, springs.neckTilt.pos, 0);

      // 头部
      headGroup.rotation.set(
        springs.headNod.pos,
        springs.neckTilt.pos * 0.3,
        springs.neckTilt.pos * 0.5
      );

      // 嘴部
      const mouthScale = Math.max(0.05, springs.mouthOpen.pos);
      cavity.scale.set(1 + springs.mouthWide.pos * 0.5, mouthScale, 1);
      cavityMat.opacity = Math.min(mouthScale * 0.5, 0.5);
      teeth.scale.set(1 + springs.mouthWide.pos * 0.4, Math.min(mouthScale * 0.6, 1), 1);
      teethMat.opacity = mouthScale > 0.3 ? Math.min(mouthScale * 0.4, 0.6) : 0;
      upperLip.scale.set(1 + springs.mouthWide.pos * 0.45, Math.min(mouthScale * 0.3, 1), 1);
      upperLipMat.opacity = mouthScale > 0.2 ? Math.min(mouthScale * 0.25, 0.4) : 0;

      // 高光
      highlightGroup.position.y = headH * 0.13 + (bPhase === 1 ? -0.015 : 0);
      highlightGroup.scale.set(bPhase === 1 ? 0.1 : 1, 1, 1);

      // 相机跟随眼睛扫视
      camera.position.x += (gX * 0.0015 - camera.position.x) * 0.1;
      camera.position.y += (gY * 0.001 + springs.bodyBob.pos * 0.3 - camera.position.y) * 0.1;

      // 眉毛驱动光照
      key.intensity = 70 + springs.browRaise.pos * 6;
      rim.intensity = 25 + energy * 8;

      // 粒子
      particles.rotation.y += 0.0015;
      particles.rotation.x += 0.0008;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    recorder.start(); sTime = Date.now(); audioEl.play(); animate();
  });
}

function rand(a: number, b: number) { return Math.floor(Math.random()*(b-a+1))+a; }
