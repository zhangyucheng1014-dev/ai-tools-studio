/**
 * 数字人口播 — 电影级引擎
 *
 * 人物: 极轻铰链(0.015) + 微非对称(0.3%) + 微表情
 * 剪辑: 片头大字砸落 + 光斑粒子 + 暖色滤镜 + 宽幅遮罩
 */

import * as THREE from "three";
import { speakToBlob } from "./browser-tts";

interface AudioProfile { duration:number;bands:Float32Array[];onsets:Float32Array;silence:Float32Array }

async function analyzeAudio(blob:Blob,fps=30):Promise<AudioProfile>{
  const c=new OfflineAudioContext(1,48000,48000),buf=await c.decodeAudioData(await blob.arrayBuffer()),d=buf.getChannelData(0);
  const fz=Math.floor(48000/fps),total=Math.ceil(d.length/fz);
  const B=[new Float32Array(total),new Float32Array(total),new Float32Array(total)];
  const O=new Float32Array(total),S=new Float32Array(total);
  let pE=0,sil=0;
  for(let i=0;i<total;i++){
    const st=i*fz,en=Math.min(st+fz,d.length);let lo=0,mi=0,hi=0,pr=0;
    for(let j=st;j<en;j++){const v=d[j],df=Math.abs(v-pr);if(df<.06)lo+=Math.abs(v);else if(df<.18)mi+=Math.abs(v);else hi+=Math.abs(v);pr=v}
    const n=en-st;B[0][i]=lo/n*3.5;B[1][i]=mi/n*3;B[2][i]=hi/n*2.5;
    const cur=B[0][i]+B[1][i]+B[2][i];O[i]=cur>pE*1.8?1:0;sil=cur<.02?sil+1:0;S[i]=sil;pE=cur;
  }
  return{duration:buf.duration,bands:B,onsets:O,silence:S};
}

class Sp{p=0;v=0;t=0;constructor(readonly k:number,readonly d:number){}
  up(dt:number){this.v+=(this.t-this.p)*this.k*dt;this.v*=this.d;this.p+=this.v*dt;return this.p}}

type Vis=[number,number,number,number];
const V:Record<string,Vis>={A:[1,.3,.1,0],E:[.4,1,0,.35],I:[.35,.8,0,.3],O:[.5,0,1,.25],U:[.2,-.3,1,.2],R:[.15,0,0,.05]};
function vis(lo:number,mi:number,hi:number):Vis{const t=lo+mi+hi;if(t<.03)return V.R;if(lo>mi*1.5&&lo>hi*2)return V.A;if(lo>mi&&lo>hi*1.5)return V.O;if(mi>lo*1.3&&mi>hi)return V.E;if(mi>lo&&mi>hi*1.3)return V.I;return V.R}

// ── 文字纹理 ──────────────────────────────────────────────────

function makeTextTexture(text:string,fontSize:number,color:string,bg:string):THREE.CanvasTexture{
  const c=document.createElement("canvas");c.width=512;c.height=256;
  const x=c.getContext("2d")!;x.fillStyle=bg;x.fillRect(0,0,512,256);
  x.fillStyle=color;x.font=`bold ${fontSize}px "PingFang SC","Microsoft YaHei",sans-serif`;x.textAlign="center";x.textBaseline="middle";
  x.fillText(text,256,128);
  return new THREE.CanvasTexture(c);
}

function makeIconTexture(emoji:string):THREE.CanvasTexture{
  const c=document.createElement("canvas");c.width=128;c.height=128;
  const x=c.getContext("2d")!;x.font="80px serif";x.textAlign="center";x.textBaseline="middle";
  x.fillText(emoji,64,64);
  return new THREE.CanvasTexture(c);
}

// ── 主函数 ──────────────────────────────────────────────────

export async function generateTalkingVideo(
  photoUrl:string,script:string,aspectRatio:string,on?:(m:string)=>void
):Promise<Blob|null>{
  on?.("加载…");const ld=new THREE.TextureLoader();let tex:THREE.Texture;
  try{tex=await ld.loadAsync(photoUrl)}catch{return null}
  on?.("配音…");const audioBlob=await speakToBlob(script);if(!audioBlob)return null;
  on?.("分析…");const P=await analyzeAudio(audioBlob,30);
  const sz:Record<string,[number,number]>={"9:16（竖屏）":[720,1280],"16:9（横屏）":[1280,720],"2.35:1（电影宽幅）":[1280,544]};
  const[W,H]=sz[aspectRatio]??[720,1280];
  const isFilm=aspectRatio.includes("2.35");

  const r=new THREE.WebGLRenderer({antialias:true});r.setSize(W,H);r.setPixelRatio(1);r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.1;r.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene();const cam=new THREE.PerspectiveCamera(28,W/H,.1,20);cam.position.set(0,.02,3.6);cam.lookAt(0,-.08,0);

  // 棚
  const wG=()=>{const c=document.createElement("canvas");c.width=256;c.height=256;const x=c.getContext("2d")!,g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,"#3a3040");g.addColorStop(.4,"#2a2430");g.addColorStop(1,"#1a1820");x.fillStyle=g;x.fillRect(0,0,256,256);return new THREE.CanvasTexture(c);};
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(12,8),new THREE.MeshBasicMaterial({map:wG()}))).position.set(0,1.5,-3);
  const fG=()=>{const c=document.createElement("canvas");c.width=256;c.height=64;const x=c.getContext("2d")!,g=x.createLinearGradient(0,0,0,64);g.addColorStop(0,"#141218");g.addColorStop(1,"#0c0a10");x.fillStyle=g;x.fillRect(0,0,256,64);return new THREE.CanvasTexture(c);};
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(12,4),new THREE.MeshBasicMaterial({map:fG()}));fl.position.set(0,-1.8,-2);fl.rotation.x=-Math.PI/3;scene.add(fl);

  const key=new THREE.PointLight("#ffe8d0",75,7);key.position.set(.7,1,2.5);scene.add(key);
  const fill=new THREE.PointLight("#c8d8ff",16,5);fill.position.set(-.6,-.2,1.8);scene.add(fill);
  const rim=new THREE.PointLight("#ffffff",28,4);rim.position.set(0,-.7,-1);scene.add(rim);
  scene.add(new THREE.AmbientLight("#2a2535",2));

  const im=(tex as any).image as HTMLImageElement|undefined;const rat=im?im.width/im.height:.7;const hH=2.2,hW=hH*rat;
  const bodyPivot=new THREE.Group();scene.add(bodyPivot);
  const neck=new THREE.Group();neck.position.y=-hH*.4;bodyPivot.add(neck);
  const head=new THREE.Group();head.position.y=hH*.4;neck.add(head);
  const hGeo=new THREE.PlaneGeometry(hW,hH,24,24);const hp=hGeo.attributes.position;
  for(let i=0;i<hp.count;i++){const x=hp.getX(i),y=hp.getY(i);hp.setZ(i,(x*x*.04+y*y*.025)*.25)}hGeo.computeVertexNormals();
  head.add(new THREE.Mesh(hGeo,new THREE.MeshStandardMaterial({map:tex,roughness:.55,metalness:.01})));

  // 下颌铰链（极轻）
  const jaw=new THREE.Group();jaw.position.y=hH*.18;jaw.position.z=.04;head.add(jaw);
  const mouth=new THREE.Group();jaw.add(mouth);
  const cG=new THREE.PlaneGeometry(hW*.12,hH*.04);const cM=new THREE.MeshBasicMaterial({color:"#050201",transparent:true,opacity:0});const cav=new THREE.Mesh(cG,cM);mouth.add(cav);
  const tG=new THREE.PlaneGeometry(hW*.09,hH*.016);const tM=new THREE.MeshBasicMaterial({color:"#ece5db",transparent:true,opacity:0});const tee=new THREE.Mesh(tG,tM);tee.position.y=hH*.005;tee.position.z=.005;mouth.add(tee);

  // 眼睛高光 — 非对称
  const eyeHL=new THREE.Group();eyeHL.position.set(0,hH*.12,.07);head.add(eyeHL);
  const hlG=new THREE.SphereGeometry(.01,8,8),hlM=new THREE.MeshBasicMaterial({color:"#fff"});
  const hLl=new THREE.Mesh(new THREE.SphereGeometry(.011,8,8),hlM);hLl.position.set(-hW*.065,0,0);eyeHL.add(hLl); // 左眼略大
  const hLr=new THREE.Mesh(new THREE.SphereGeometry(.009,8,8),hlM);hLr.position.set(hW*.065,0,0);eyeHL.add(hLr); // 右眼略小

  const sh=new THREE.Group();sh.position.y=-hH*.44;bodyPivot.add(sh);
  const sG=new THREE.PlaneGeometry(hW*2,hH*.38);const sp=sG.attributes.position;
  for(let i=0;i<sp.count;i++){sp.setZ(i,-.1-Math.abs(sp.getX(i))*.14)}sG.computeVertexNormals();
  sh.add(new THREE.Mesh(sG,new THREE.MeshStandardMaterial({color:"#1c1a1a",roughness:.88,transparent:true,opacity:.6})));
  const to=new THREE.Group();to.position.y=-hH*.68;bodyPivot.add(to);
  const tG2=new THREE.PlaneGeometry(hW*1.3,hH*.5);const tp=tG2.attributes.position;
  for(let i=0;i<tp.count;i++){tp.setZ(i,-.15-Math.abs(tp.getX(i))*.11)}tG2.computeVertexNormals();
  to.add(new THREE.Mesh(tG2,new THREE.MeshStandardMaterial({color:"#1a1818",roughness:.9,transparent:true,opacity:.5})));
  const aG=new THREE.CylinderGeometry(.05,.06,hH*.3,8),aM=new THREE.MeshStandardMaterial({color:"#1c1a1a",roughness:.85,transparent:true,opacity:.5});
  const aL=new THREE.Group(),aR=new THREE.Group();aL.position.set(-hW*.68,-hH*.52,-.05);aR.position.set(hW*.68,-hH*.52,-.05);bodyPivot.add(aL);bodyPivot.add(aR);
  aL.add(new THREE.Mesh(aG,aM));aR.add(new THREE.Mesh(aG,aM));

  // 粒子背景
  const pN=30,pA=new Float32Array(pN*3);
  for(let i=0;i<pN;i++){pA[i*3]=(Math.random()-.5)*7;pA[i*3+1]=(Math.random()-.5)*7;pA[i*3+2]=Math.random()*5-1.5}
  const pG=new THREE.BufferGeometry();pG.setAttribute("position",new THREE.BufferAttribute(pA,3));
  const pt=new THREE.Points(pG,new THREE.PointsMaterial({color:"#ffe0c0",size:.016,transparent:true,opacity:.3,blending:THREE.AdditiveBlending}));scene.add(pt);

  // ── 电影级剪辑元素 ───────────────────

  // 片头大字 — 从天上砸下来
  const titleTex=makeTextTexture("AI 口播",72,"#ffffff","transparent");
  const titlePlane=new THREE.Mesh(
    new THREE.PlaneGeometry(3,1.2),
    new THREE.MeshBasicMaterial({map:titleTex,transparent:true,opacity:.9,depthTest:false,depthWrite:false})
  );
  titlePlane.position.set(0,1.8,1);titlePlane.renderOrder=999;titlePlane.material.depthTest=false;
  scene.add(titlePlane);

  // 浮动图标
  const icons=["✨","🔥","💡","🎯","⚡","💎"];
  const iconMeshes=icons.map((emoji,i)=>{
    const itex=makeIconTexture(emoji);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(.25,.25),new THREE.MeshBasicMaterial({map:itex,transparent:true,opacity:.7,depthTest:false,depthWrite:false}));
    m.position.set((i-icons.length/2)*.4+.2,Math.random()*.8-.4,Math.random()*.5+.5);
    m.renderOrder=998;m.material.depthTest=false;
    scene.add(m);
    return m;
  });

  // ── 录制 ─────────────────────────────────
  const stream=r.domElement.captureStream(30);
  const rec=new MediaRecorder(stream,{mimeType:"video/webm;codecs=vp9"});const chunks:Blob[]=[];rec.ondataavailable=e=>chunks.push(e.data);
  const audio=new Audio(URL.createObjectURL(audioBlob));

  const ra=(a:number,b:number)=>a+Math.floor(Math.random()*(b-a+1));
  let pV:number[]=V.R;
  let gazeX=0,gazeY=0,gazeAway=false,gazeTimer=ra(90,200);
  let blinkCountdown=ra(40,100),blinkLeft=false,blinkFrame=0;
  let wShiftDir=0,wShiftTimer=ra(200,400);
  let saccadeX=0,saccadeY=0,saccadeTimer=0;

  const S={
    neckY:new Sp(10,.8),neckT:new Sp(7,.76),nod:new Sp(14,.73),bob:new Sp(5,.84),
    breath:new Sp(3,.88),mouthO:new Sp(22,.68),mouthW:new Sp(19,.7),
    jawHinge:new Sp(16,.72),browL:new Sp(11,.78),browR:new Sp(11,.78),
    armSwing:new Sp(4,.85),lean:new Sp(4,.86),settle:new Sp(2,.92),
    inhale:new Sp(6,.8),breathSmooth:new Sp(1,.95),
  };

  let st=0,fr=0;

  return new Promise(resolve=>{
    rec.onstop=()=>resolve(new Blob(chunks,{type:"video/webm"}));

    function anim(){
      const t=(Date.now()-st)/1000;if(t>P.duration+.8){rec.stop();return;}
      fr++;const dt=Math.min(1/30,.05);
      const i=Math.min(Math.floor(t*30),P.bands[0].length-1);
      const lo=P.bands[0][i]??0,mi=P.bands[1][i]??0,hi=P.bands[2][i]??0;
      const on=P.onsets[i]??0,sil=P.silence[i]??0,energy=lo+mi+hi;
      const speaking=energy>.025,longSil=sil>15,phraseEnd=!speaking&&sil>0&&sil<3;

      // 片头大字动画 — 0-1.5秒砸落
      if(t<.3){
        titlePlane.position.y=1.8-t*8; // 快速下落
        titlePlane.material.opacity=Math.min(1,t/.15);
      }else if(t<1.5){
        titlePlane.position.y=-.5+Math.sin((t-.3)*6)*.1; // 弹跳
        titlePlane.material.opacity=1-(t-.3)/1.2; // 渐隐
      }else{
        titlePlane.material.opacity=0;
      }

      // 浮动图标
      iconMeshes.forEach((m,i)=>{
        m.position.y+=Math.sin(t*2+i)*.003; // 上下浮动
        m.rotation.z+=.01;
        m.material.opacity=.5+Math.sin(t*3+i)*.3;
      });

      // ── 人物行为（计时器驱动）──────────
      S.settle.t=speaking?0:1;const settle=S.settle.up(dt);
      S.breathSmooth.t=speaking?.4:0;
      S.breath.t=Math.sin(t*1.55)*.5*(1-S.breathSmooth.up(dt)*.6);
      if(speaking&&sil>8)S.inhale.t=.5;else S.inhale.t*=0;
      S.bob.t=Math.sin(t*.9)*.02+Math.sin(t*1.6)*.015;

      gazeTimer--;if(gazeTimer<=0){gazeAway=longSil;gazeTimer=gazeAway?ra(30,90):ra(90,200);}
      const gtX=gazeAway?ra(-6,6):0,gtY=gazeAway?ra(-3,3):0;
      gazeX+=(gtX-gazeX)*.06;gazeY+=(gtY-gazeY)*.06;

      saccadeTimer--;if(saccadeTimer<=0){saccadeX=(Math.random()-.5)*2;saccadeY=(Math.random()-.5)*1.5;saccadeTimer=ra(5,12);}

      blinkCountdown--;if(blinkCountdown<=0){blinkLeft=true;blinkFrame=3;blinkCountdown=ra(40,120);}
      if(blinkFrame>0){blinkFrame--}else{blinkLeft=false;}
      if(speaking&&energy>.08)blinkCountdown+=2;
      if(phraseEnd&&Math.random()<.5){blinkLeft=true;blinkFrame=3;blinkCountdown=ra(40,100);}

      wShiftTimer--;if(wShiftTimer<=0&&settle>.4){wShiftDir=(Math.random()-.5)*2;wShiftTimer=ra(200,400);}
      S.lean.t=wShiftDir*.015*(1-settle);
      if(on>.5&&speaking)S.nod.t=-.025;else S.nod.t*=.9;
      S.neckY.t=Math.sin(t*.42+1.1)*.01+S.bob.p*.4;S.neckT.t=Math.sin(t*.28)*.015+Math.sin(t*.7)*.007;

      const tv=vis(lo,mi,hi);const cv=pV.map((v,j)=>v+(tv[j]-v)*.28);pV=cv;
      const[mO,mW]=cv;
      S.mouthO.t=speaking?mO*Math.min(energy*18,2.2):0;S.mouthW.t=speaking?mW:0;
      S.jawHinge.t=speaking?mO*Math.min(energy*4,.6):0;

      // 眉毛 — 非对称：左眉略活跃
      const browTarget=(energy>.07&&speaking)?1:0;
      S.browL.t=browTarget*1.05;S.browR.t=browTarget*.95;
      S.armSwing.t=Math.sin(t*1.4)*.02*(1-settle*.5);

      for(const s of Object.values(S))s.up(dt);

      // ── 应用 ──────────────────────────
      const ss=1-settle*.025;bodyPivot.scale.set(ss,ss,ss);bodyPivot.position.y=settle*-.04;bodyPivot.rotation.z=S.lean.p;
      sh.position.y=-hH*.44+S.breath.p*.03+S.inhale.p*.03;sh.scale.set(1+S.breath.p*.02+S.inhale.p*.02,1,1);
      to.position.y=-hH*.68+S.breath.p*.03+S.inhale.p*.02;
      aL.rotation.z=S.armSwing.p*1.01;aR.rotation.z=-S.armSwing.p*.99; // 非对称手臂
      neck.position.set(S.lean.p*.2,S.bob.p+S.neckY.p,0);neck.rotation.set(0,S.neckT.p,0);
      head.rotation.set(S.nod.p,S.neckT.p*.2,S.neckT.p*.35-S.lean.p*.25);

      // 下颌铰链 — 极轻旋转(0.015)
      jaw.rotation.x=S.jawHinge.p*.015;

      const ms=Math.max(.03,S.mouthO.p);
      const asymMouth=1+S.mouthW.p*.003; // 0.3% 非对称
      cav.scale.set(1+S.mouthW.p*.4,ms,1);cM.opacity=Math.min(ms*.35,.4);
      tee.scale.set(asymMouth+S.mouthW.p*.22,Math.min(ms*.45,1),1);tM.opacity=ms>.2?Math.min(ms*.25,.45):0;

      // 眼
      const blinkR=blinkLeft&&blinkFrame===1;
      eyeHL.position.y=hH*.12+(blinkLeft?-.008:0)+saccadeY*.0008;
      hLl.scale.set(blinkLeft?.04:1,1,1);hLr.scale.set(blinkR?.04:1,1,1);
      eyeHL.position.x=saccadeX*.001;

      cam.position.x+=(gazeX*.001+saccadeX*.0003-cam.position.x)*.08;
      cam.position.y+=(gazeY*.0008+S.bob.p*.2-cam.position.y)*.08;

      // Ken Burns 缓推
      const zp=P.duration>0?t/P.duration:0;
      cam.position.z+=(3.6-zp*.2-cam.position.z)*.02;

      // 暖色滤镜 — 光照随时间微暖
      key.intensity=75+S.browL.p*5;key.color.setHSL(.12,.9,.55+Math.sin(t*.3)*.02);
      rim.intensity=28+energy*6;
      pt.rotation.y+=.001;pt.rotation.x+=.0006;

      r.render(scene,cam);requestAnimationFrame(anim);
    }

    rec.start();st=Date.now();audio.play();anim();
  });
}
