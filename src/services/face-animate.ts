/**
 * 数字人口播 — 自然行为引擎
 *
 * 核心逻辑（不是随机，是真实的说话行为模式）:
 *   句间停顿 → 眨眼 + 微点头（短语边界）
 *   长停顿   → 视线移开"思考" + 重心转移
 *   语速快   → 抑制眨眼（专注状态）
 *   重音     → 眉毛微抬 + 头微前倾
 *   不说话   → 逐渐回到休息姿态
 */

import * as THREE from "three";
import { speakToBlob } from "./browser-tts";

// ── 音频分析 ──────────────────────────────────────────────────

interface AudioProfile {
  duration: number;
  bands: Float32Array[];
  onsets: Float32Array;    // 音节起始
  silence: Float32Array;   // 静音标记
}

async function analyzeAudio(blob: Blob, fps = 30): Promise<AudioProfile> {
  const c = new OfflineAudioContext(1, 48000, 48000);
  const buf = await c.decodeAudioData(await blob.arrayBuffer());
  const d = buf.getChannelData(0);
  const fz = Math.floor(48000 / fps);
  const total = Math.ceil(d.length / fz);
  const B = [new Float32Array(total), new Float32Array(total), new Float32Array(total)];
  const O = new Float32Array(total);
  const S = new Float32Array(total);
  let prevE = 0, silentFrames = 0;

  for (let i = 0; i < total; i++) {
    const s = i * fz, e = Math.min(s + fz, d.length);
    let lo = 0, mi = 0, hi = 0, pr = 0;
    for (let j = s; j < e; j++) {
      const v = d[j], df = Math.abs(v - pr);
      if (df < 0.06) lo += Math.abs(v); else if (df < 0.18) mi += Math.abs(v); else hi += Math.abs(v); pr = v;
    }
    const n = e - s;
    B[0][i] = lo / n * 4; B[1][i] = mi / n * 3.5; B[2][i] = hi / n * 2.5;
    const curE = B[0][i] + B[1][i] + B[2][i];
    O[i] = curE > prevE * 1.8 ? 1 : 0;
    // 静音检测: 连续低能量
    if (curE < 0.025) { silentFrames++; } else { silentFrames = 0; }
    S[i] = silentFrames;
    prevE = curE;
  }
  return { duration: buf.duration, bands: B, onsets: O, silence: S };
}

// ── 弹簧 ──────────────────────────────────────────────────────

class Sp { p=0;v=0;t=0;constructor(readonly k:number, readonly d:number){}
  up(dt:number){this.v+=(this.t-this.p)*this.k*dt;this.v*=this.d;this.p+=this.v*dt;return this.p}
}

// ── Viseme ────────────────────────────────────────────────────

type Vis=[number,number,number,number];
const V: Record<string,Vis>={ A:[1,.3,.1,0],E:[.4,1,0,.35],I:[.35,.8,0,.3],O:[.5,0,1,.25],U:[.2,-.3,1,.2],R:[.15,0,0,.05] };
function vis(lo:number,mi:number,hi:number):Vis{
  const t=lo+mi+hi; if(t<.03)return V.R;
  if(lo>mi*1.5&&lo>hi*2)return V.A; if(lo>mi&&lo>hi*1.5)return V.O;
  if(mi>lo*1.3&&mi>hi)return V.E; if(mi>lo&&mi>hi*1.3)return V.I;
  return V.R;
}

// ── 主函数 ──────────────────────────────────────────────────

export async function generateTalkingVideo(
  photoUrl: string, script: string, aspectRatio: string,
  onProgress?: (msg: string) => void
): Promise<Blob | null> {
  onProgress?.("加载…");
  const ld = new THREE.TextureLoader();
  let tex: THREE.Texture;
  try { tex = await ld.loadAsync(photoUrl); } catch { return null; }

  onProgress?.("配音…");
  const audioBlob = await speakToBlob(script);
  if (!audioBlob) return null;

  onProgress?.("分析音频…");
  const P = await analyzeAudio(audioBlob, 30);

  onProgress?.("渲染…");
  const sz: Record<string,[number,number]>={ "9:16（竖屏）":[720,1280],"16:9（横屏）":[1280,720],"2.35:1（电影宽幅）":[1280,544] };
  const [W,H]=sz[aspectRatio]??[720,1280];

  const r = new THREE.WebGLRenderer({ antialias:true });
  r.setSize(W,H);r.setPixelRatio(1);r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1;r.outputColorSpace=THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(28,W/H,.1,20);cam.position.set(0,.02,3.8);cam.lookAt(0,-.08,0);

  // 摄影棚
  const wG=()=>{ const c=document.createElement("canvas");c.width=256;c.height=256;const x=c.getContext("2d")!,
    g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,"#3a3040");g.addColorStop(.4,"#2a2430");g.addColorStop(1,"#1a1820");
    x.fillStyle=g;x.fillRect(0,0,256,256);return new THREE.CanvasTexture(c); };
  const w=new THREE.Mesh(new THREE.PlaneGeometry(12,8),new THREE.MeshBasicMaterial({map:wG()}));w.position.set(0,1.5,-3);scene.add(w);
  const fG=()=>{ const c=document.createElement("canvas");c.width=256;c.height=64;const x=c.getContext("2d")!,
    g=x.createLinearGradient(0,0,0,64);g.addColorStop(0,"#141218");g.addColorStop(1,"#0c0a10");
    x.fillStyle=g;x.fillRect(0,0,256,64);return new THREE.CanvasTexture(c); };
  const f=new THREE.Mesh(new THREE.PlaneGeometry(12,4),new THREE.MeshBasicMaterial({map:fG()}));f.position.set(0,-1.8,-2);f.rotation.x=-Math.PI/3;scene.add(f);

  // 灯光
  const key=new THREE.PointLight("#ffe8d0",75,7);key.position.set(.7,1,2.5);scene.add(key);
  const fill=new THREE.PointLight("#c8d8ff",16,5);fill.position.set(-.6,-.2,1.8);scene.add(fill);
  const rim=new THREE.PointLight("#fff",28,4);rim.position.set(0,-.7,-1);scene.add(rim);
  scene.add(new THREE.AmbientLight("#2a2535",2));

  // 照片
  const im=(tex as any).image as HTMLImageElement|undefined;
  const rat=im?im.width/im.height:.7;
  const hH=2.2,hW=hH*rat;

  // 身体层级
  const bodyPivot=new THREE.Group();scene.add(bodyPivot);
  const neck=new THREE.Group();neck.position.y=-hH*.4;bodyPivot.add(neck);
  const head=new THREE.Group();head.position.y=hH*.4;neck.add(head);

  const hGeo=new THREE.PlaneGeometry(hW,hH,24,24);
  const hp=hGeo.attributes.position;
  for(let i=0;i<hp.count;i++){const x=hp.getX(i),y=hp.getY(i);hp.setZ(i,(x*x*.05+y*y*.025)*.3);}
  hGeo.computeVertexNormals();
  head.add(new THREE.Mesh(hGeo,new THREE.MeshStandardMaterial({map:tex,roughness:.55,metalness:.01})));

  // 嘴
  const mouth=new THREE.Group();mouth.position.y=hH*.21;mouth.position.z=.06;head.add(mouth);
  const cG=new THREE.PlaneGeometry(hW*.14,hH*.05);const cM=new THREE.MeshBasicMaterial({color:"#050201",transparent:true,opacity:0});const cav=new THREE.Mesh(cG,cM);mouth.add(cav);
  const tG=new THREE.PlaneGeometry(hW*.11,hH*.02);const tM=new THREE.MeshBasicMaterial({color:"#ece5db",transparent:true,opacity:0});const tee=new THREE.Mesh(tG,tM);tee.position.y=hH*.006;tee.position.z=.005;mouth.add(tee);
  const uG=new THREE.PlaneGeometry(hW*.15,hH*.016);const uM=new THREE.MeshBasicMaterial({color:"#1c110c",transparent:true,opacity:0});const uL=new THREE.Mesh(uG,uM);uL.position.y=hH*.012;uL.position.z=.004;mouth.add(uL);

  // 肩+躯干+手臂
  const sh=new THREE.Group();sh.position.y=-hH*.44;bodyPivot.add(sh);
  const sG=new THREE.PlaneGeometry(hW*2,hH*.38);const sp=sG.attributes.position;
  for(let i=0;i<sp.count;i++){sp.setZ(i,-.1-Math.abs(sp.getX(i))*.14);}sG.computeVertexNormals();
  sh.add(new THREE.Mesh(sG,new THREE.MeshStandardMaterial({color:"#1c1a1a",roughness:.88,transparent:true,opacity:.6})));
  const to=new THREE.Group();to.position.y=-hH*.68;bodyPivot.add(to);
  const tG2=new THREE.PlaneGeometry(hW*1.3,hH*.5);const tp=tG2.attributes.position;
  for(let i=0;i<tp.count;i++){tp.setZ(i,-.15-Math.abs(tp.getX(i))*.11);}tG2.computeVertexNormals();
  to.add(new THREE.Mesh(tG2,new THREE.MeshStandardMaterial({color:"#1a1818",roughness:.9,transparent:true,opacity:.5})));
  const aG=new THREE.CylinderGeometry(.05,.06,hH*.32,8);const aM=new THREE.MeshStandardMaterial({color:"#1c1a1a",roughness:.85,transparent:true,opacity:.5});
  const aL=new THREE.Group(),aR=new THREE.Group();aL.position.set(-hW*.68,-hH*.52,-.05);aR.position.set(hW*.68,-hH*.52,-.05);bodyPivot.add(aL);bodyPivot.add(aR);
  aL.add(new THREE.Mesh(aG,aM));aR.add(new THREE.Mesh(aG,aM));

  // 眼睛高光
  const eH=new THREE.Group();eH.position.set(0,hH*.12,.07);head.add(eH);
  const hlG=new THREE.SphereGeometry(.012,8,8),hlM=new THREE.MeshBasicMaterial({color:"#fff"});
  const hL=new THREE.Mesh(hlG,hlM);hL.position.set(-hW*.07,0,0);eH.add(hL);
  const hR=new THREE.Mesh(hlG,hlM);hR.position.set(hW*.07,0,0);eH.add(hR);

  // 粒子
  const pN=30,pA=new Float32Array(pN*3);
  for(let i=0;i<pN;i++){pA[i*3]=(Math.random()-.5)*7;pA[i*3+1]=(Math.random()-.5)*7;pA[i*3+2]=Math.random()*5-1.5;}
  const pG=new THREE.BufferGeometry();pG.setAttribute("position",new THREE.BufferAttribute(pA,3));
  const pt=new THREE.Points(pG,new THREE.PointsMaterial({color:"#ffe0c0",size:.016,transparent:true,opacity:.35,blending:THREE.AdditiveBlending}));scene.add(pt);

  // ── 录制 ─────────────────────────────────
  const stream=r.domElement.captureStream(30);
  const rec=new MediaRecorder(stream,{mimeType:"video/webm;codecs=vp9"});
  const chunks:Blob[]=[];rec.ondataavailable=e=>chunks.push(e.data);
  const audio=new Audio(URL.createObjectURL(audioBlob));

  // ── 行为状态机 ────────────────────────
  let pV:number[]=V.R;                        // 前一帧viseme
  let gazeX=0,gazeY=0;                       // 当前视线偏移
  let gazeType:"camera"|"thinking"|"returning"="camera";
  let gazeTimer=0;                            // 距下次视线转移
  let blinkSuppress=false;                     // 说话中抑制眨眼
  let weightShiftDir=0;                       // 重心偏移方向
  let weightShiftTimer=0;                     // 距下次重心转移
  let settleProgress=0;                       // 休息姿态渐进 [0-1]

  const S={
    neckY:new Sp(10,.8),neckT:new Sp(7,.76),nod:new Sp(14,.73),bob:new Sp(5,.84),
    breath:new Sp(3,.88),mouthO:new Sp(22,.68),mouthW:new Sp(19,.7),brow:new Sp(11,.78),
    armSwing:new Sp(4,.85),lean:new Sp(4,.86),settle:new Sp(2,.92),
  };

  let st=0,fr=0;
  const ra=(a:number,b:number)=>a+Math.floor(Math.random()*(b-a+1));

  return new Promise(resolve=>{
    rec.onstop=()=>resolve(new Blob(chunks,{type:"video/webm"}));

    function anim(){
      const t=(Date.now()-st)/1000; if(t>P.duration+.5){rec.stop();return;}
      fr++;const dt=Math.min(1/30,.05);
      const i=Math.min(Math.floor(t*30),P.bands[0].length-1);
      const lo=P.bands[0][i]??0,mi=P.bands[1][i]??0,hi=P.bands[2][i]??0;
      const on=P.onsets[i]??0,sil=P.silence[i]??0,energy=lo+mi+hi;
      const speaking=energy>.025;
      const longSilence=sil>15;          // >0.5s 停顿
      const phraseEnd=!speaking&&sil>0&&sil<3; // 刚从说话转入停顿

      // ── 行为逻辑层 ────────────────────

      // 1. 休息姿态 — 不说话时逐渐回归
      S.settle.t=speaking?0:1;
      const settle=S.settle.up(dt);

      // 2. 视线 — 长沉默时"思考"看别处，说话时看镜头
      gazeTimer--;
      if(longSilence&&gazeType==="camera"&&gazeTimer<=0){
        gazeType="thinking";gazeTimer=ra(30,90);
      }else if(speaking&&gazeType!=="camera"){
        gazeType="returning";gazeTimer=ra(8,20);
      }else if(gazeTimer<=0&&gazeType==="returning"){
        gazeType="camera";gazeTimer=ra(60,180);
      }else if(gazeTimer<=0&&gazeType==="camera"){
        gazeType="camera";gazeTimer=ra(60,180);
      }
      const gazeTargetX=gazeType==="thinking"?ra(-6,6):gazeType==="returning"?0:0;
      const gazeTargetY=gazeType==="thinking"?ra(-3,3):0;
      gazeX+=(gazeTargetX-gazeX)*.06;gazeY+=(gazeTargetY-gazeY)*.06;

      // 3. 眨眼 — 句末眨眼，说话中抑制
      if(phraseEnd){
        // 短语结束立刻眨眼
        if(Math.random()<.4){/*触发眨眼*/}
      }
      if(speaking&&energy>.06){blinkSuppress=true;}else{blinkSuppress=false;}
      // 简化眨眼: 随机 + 句末触发
      const shouldBlink=(!blinkSuppress&&fr%ra(60,180)===0)||(phraseEnd&&Math.random()<.6);

      // 4. 重心转移 — 每 8-15 秒换一次
      weightShiftTimer--;
      if(weightShiftTimer<=0&&settle>.5){
        weightShiftDir=(Math.random()-.5)*2;weightShiftTimer=ra(240,450);
      }
      S.lean.t=weightShiftDir*.02*(1-settle);

      // 5. 呼吸 — 始终在，说话时被部分抑制
      S.breath.t=Math.sin(t*1.55)*.5*(1-speaking*.4);

      // 6. 身体微动
      S.bob.t=Math.sin(t*.9)*.02+Math.sin(t*1.6)*.015;

      // 7. 点头 — 只在音节起始时
      if(on>.5&&speaking){S.nod.t=-.03;}else{S.nod.t*=.88;}

      // 8. 颈
      S.neckY.t=Math.sin(t*.42+1.1)*.01+S.bob.p*.4;
      S.neckT.t=Math.sin(t*.28)*.015+Math.sin(t*.7)*.007;

      // 9. 嘴
      const tv=vis(lo,mi,hi);
      const cv=pV.map((v,j)=>v+(tv[j]-v)*.28);pV=cv;
      const[mO,mW]=cv;
      S.mouthO.t=speaking?mO*Math.min(energy*18,2.2):0;
      S.mouthW.t=speaking?mW:0;

      // 10. 眉 — 重音时微抬
      S.brow.t=(energy>.07&&speaking)?1:0;

      // 11. 手臂 — 轻微摆动
      S.armSwing.t=Math.sin(t*1.4)*.025*(1-settle*.6);

      // 更新弹簧
      for(const s of Object.values(S))s.update(dt);

      // ── 应用动画 ────────────────────────

      // 休息姿态 → 整体变小+下移
      const settleScale=1-settle*.03;
      bodyPivot.scale.set(settleScale,settleScale,settleScale);
      bodyPivot.position.y=settle*-.06;
      bodyPivot.rotation.z=S.lean.p;

      // 呼吸
      sh.position.y=-hH*.44+S.breath.p*.03;
      sh.scale.set(1+S.breath.p*.02,1,1);

      // 躯干
      to.position.y=-hH*.68+S.breath.p*.035;

      // 手臂
      aL.rotation.z=S.armSwing.p;aR.rotation.z=-S.armSwing.p;

      // 颈+头
      neck.position.set(S.lean.p*.25,S.bob.p+S.neckY.p,0);
      neck.rotation.set(0,S.neckT.p,0);
      head.rotation.set(S.nod.p,S.neckT.p*.2,S.neckT.p*.4);

      // 嘴
      const ms=Math.max(.03,S.mouthO.p);
      cav.scale.set(1+S.mouthW.p*.45,ms,1);cM.opacity=Math.min(ms*.4,.45);
      tee.scale.set(1+S.mouthW.p*.3,Math.min(ms*.5,1),1);tM.opacity=ms>.22?Math.min(ms*.3,.5):0;
      uL.scale.set(1+S.mouthW.p*.35,Math.min(ms*.25,1),1);uM.opacity=ms>.16?Math.min(ms*.2,.35):0;

      // 眼睛高光
      eH.position.y=hH*.12+(shouldBlink?-.01:0);
      eH.scale.set(shouldBlink?.06:1,1,1);

      // 相机
      cam.position.x+=(gazeX*.001-cam.position.x)*.08;
      cam.position.y+=(gazeY*.0008+S.bob.p*.2-cam.position.y)*.08;

      // 光照
      key.intensity=75+S.brow.p*5;rim.intensity=28+energy*6;

      pt.rotation.y+=.001;pt.rotation.x+=.0006;

      r.render(scene,cam);requestAnimationFrame(anim);
    }

    rec.start();st=Date.now();audio.play();anim();
  });
}
