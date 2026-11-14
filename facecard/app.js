/* Face Card */
(function(){
const $=id=>document.getElementById(id);
const clamp=(v,a=28,b=97)=>Math.round(Math.max(a,Math.min(b,v)));
const today=()=>new Date().toISOString().slice(0,10);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

function load(){try{return JSON.parse(localStorage.getItem('fc_state'))||null}catch(e){return null}}
function save(){try{localStorage.setItem('fc_state',JSON.stringify(state))}catch(e){}}
let state={xp:0,last:null};

/* ---------- L'Oréal-only catalog ---------- */
const P={
  ffWash:{brand:"Kiehl's",div:"L'Oréal Luxe",name:"Facial Fuel Energizing Face Wash",why:"Cuts oil without stripping. Built for guys who hate long routines.",fixes:["oil","blemish"]},
  ufCleanser:{brand:"Kiehl's",div:"L'Oréal Luxe",name:"Ultra Facial Cleanser",why:"Gentle foam that won't leave dry skin tight.",fixes:["hydration"]},
  yttpCleanser:{brand:"Youth to the People",div:"L'Oréal Luxe",name:"Superfood Cleanser",why:"Gel cleanser with kale and green tea. Clean, not squeaky.",fixes:["oil","radiance"]},
  gelCream:{brand:"Kiehl's",div:"L'Oréal Luxe",name:"Ultra Facial Oil-Free Gel Cream",why:"Water-light moisture for oily skin. No greasy film.",fixes:["oil","hydration"]},
  ufCream:{brand:"Kiehl's",div:"L'Oréal Luxe",name:"Ultra Facial Cream",why:"The classic 24-hour moisturizer for dry, flaky patches.",fixes:["hydration"]},
  ffMoist:{brand:"Kiehl's",div:"L'Oréal Luxe",name:"Facial Fuel Energizing Moisture Treatment",why:"Lightweight daily moisturizer from the men's line.",fixes:["hydration","radiance"]},
  spf:{brand:"Kiehl's",div:"L'Oréal Luxe",name:"Ultra Light Daily UV Defense SPF 50",why:"Sunscreen every morning. Stops marks from getting darker.",fixes:["even"]},
  drgSun:{brand:"Dr.G",div:"L'Oréal",name:"Green Mild Up Sun+ SPF 50+",why:"Mineral SPF that's easy on reactive skin.",fixes:["redness","even"]},
  pressClear:{brand:"Medik8",div:"L'Oréal Luxe",name:"Press & Clear",why:"Salicylic acid (BHA) that unclogs pores. Start every other night.",fixes:["blemish","pores"]},
  drgRed:{brand:"Dr.G",div:"L'Oréal",name:"Red Blemish Clear Soothing Cream",why:"Calms redness and irritation with cica.",fixes:["redness"]},
  mandelic:{brand:"Youth to the People",div:"L'Oréal Luxe",name:"Mandelic Acid + Superfood Unity Exfoliant",why:"Gentle AHA for bumpy texture. 2 to 3 nights a week.",fixes:["texture","pores"]},
  darkSpot:{brand:"Kiehl's",div:"L'Oréal Luxe",name:"Clearly Corrective Dark Spot Solution",why:"Vitamin C serum that fades post-breakout marks.",fixes:["even","radiance"]},
  b5:{brand:"Medik8",div:"L'Oréal Luxe",name:"Hydr8 B5 Intense",why:"Hyaluronic acid serum. Hydration without heaviness.",fixes:["hydration"]},
  rareEarth:{brand:"Kiehl's",div:"L'Oréal Luxe",name:"Rare Earth Deep Pore Cleansing Masque",why:"Clay mask that pulls out oil. 10 minutes, once a week.",fixes:["pores","oil"]},
  dreamMask:{brand:"Youth to the People",div:"L'Oréal Luxe",name:"Superberry Hydrate + Glow Dream Mask",why:"Overnight mask for dull, dehydrated skin.",fixes:["radiance","hydration"]}
};

function buildRoutine(type,weak,goal,acne){
  const focus=goal||weak;
  const cleanser = type==="dry"?P.ufCleanser : (type==="oily"||acne>=1)?P.ffWash : P.yttpCleanser;
  const moist = type==="dry"?P.ufCream : type==="oily"?P.gelCream : P.ffMoist;
  const sun = focus==="redness"?P.drgSun:P.spf;
  const treat={blemish:P.pressClear,pores:P.pressClear,oil:P.pressClear,redness:P.drgRed,texture:P.mandelic,even:P.darkSpot}[focus]||P.pressClear;
  const am=[["Cleanse",cleanser,10]];
  if(focus==="even"||weak==="radiance") am.push(["Treat",P.darkSpot,15]);
  if(type==="dry"||type==="combo"||weak==="hydration") am.push(["Hydrate",P.b5,10]);
  am.push(["Moisturize",moist,10],["Protect",sun,25]);
  const pm=[["Cleanse",cleanser,10]];
  if(focus!=="even") pm.push(["Treat",treat,20]); else pm.push(["Treat",acne>=1?P.pressClear:P.mandelic,20]);
  pm.push(["Moisturize",focus==="redness"?P.drgRed:moist,10]);
  const wk=[["Mask",(type==="dry"||focus==="redness"||weak==="radiance")?P.dreamMask:P.rareEarth,30]];
  if(type!=="dry"&&focus!=="texture"&&focus!=="redness") wk.push(["Resurface",P.mandelic,20]);
  return {am,pm,wk};
}

const TIERS=[
  [0,"Fully Cooked","Bro your pores are filing a complaint. Good news: nowhere to go but up."],
  [45,"Medium Rare","Salvageable. A real routine for two weeks changes this a lot."],
  [60,"Mid","Not cooked, not glazed. The most fixable rank there is."],
  [72,"Clear-ish","Solid base. One or two tweaks and you're cooking (the good kind)."],
  [82,"Glazed","Skin's doing its job. Protect it, mainly with SPF."],
  [91,"Face Card","Never declines. Keep the routine and stop touching your face."]
];
const LEVELS=["NPC","Side Character","Main Character","Skin Arc","Glazed","Face Card","Final Boss"];
function tierFor(s){let t=TIERS[0];for(const x of TIERS) if(s>=x[0]) t=x;return t}

/* ---------- zone analysis (3:4 centered crop, like the face map) ---------- */
const ZONES={
  forehead:{x:[.30,.70],y:[.12,.27],cx:.5,cy:.235,label:"Forehead"},
  nose:{x:[.43,.57],y:[.45,.62],cx:.5,cy:.5,label:"Nose"},
  lcheek:{x:[.14,.35],y:[.50,.68],cx:.325,cy:.56,label:"L cheek"},
  rcheek:{x:[.65,.86],y:[.50,.68],cx:.675,cy:.56,label:"R cheek"},
  chin:{x:[.38,.62],y:[.84,.97],cx:.5,cy:.78,label:"Chin"}
};
function cropRect(w,h){const r=3/4;if(w/h>r){const cw=h*r;return [(w-cw)/2,0,cw,h]}const ch=w/r;return [0,(h-ch)/2,w,ch]}
const isSkin=(r,g,b,Y)=>{const cb=128-.168736*r-.331264*g+.5*b,cr=128+.5*r-.418688*g-.081312*b;return cr>=128&&cr<=182&&cb>=70&&cb<=136&&Y>35&&Y<248&&r>g};
const _cv=document.createElement('canvas');_cv.width=150;_cv.height=200;
const _cx=_cv.getContext('2d',{willReadFrequently:true});

/* returns {zones, pins, box} or null when no face is found */
function analyzeBlob(img){
  const iw=img.naturalWidth||img.videoWidth,ih=img.naturalHeight||img.videoHeight;if(!iw||!ih) return null;
  const W=150,H=200,[sx,sy,sw,sh]=cropRect(iw,ih);
  _cx.drawImage(img,sx,sy,sw,sh,0,0,W,H);
  const d=_cx.getImageData(0,0,W,H).data,L=new Float32Array(W*H),skin=new Uint8Array(W*H);
  const xs=[],ys=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const k=y*W+x,i=k*4,r=d[i],g=d[i+1],b=d[i+2],Y=.299*r+.587*g+.114*b;L[k]=Y;
    if(isSkin(r,g,b,Y)){skin[k]=1;if(x>W*.1&&x<W*.9){xs.push(x);ys.push(y)}}
  }
  if(xs.length<W*H*.04) return null;
  xs.sort((a,b)=>a-b);ys.sort((a,b)=>a-b);
  const q=(a,p)=>a[Math.floor(p*(a.length-1))];
  const bx=q(xs,.06),bw=q(xs,.94)-bx,by=q(ys,.03);
  if(bw<W*.2) return null;
  const bh=Math.min(bw*1.38,H-by);
  const out={},pins={};let readable=0;
  for(const [key,z] of Object.entries(ZONES)){
    const x0=Math.max(1,Math.round(bx+z.x[0]*bw)),x1=Math.min(W-2,Math.round(bx+z.x[1]*bw));
    const y0=Math.max(1,Math.round(by+z.y[0]*bh)),y1=Math.min(H-2,Math.round(by+z.y[1]*bh));
    pins[key]={cx:(x0+x1)/2/W,cy:(y0+y1)/2/H};
    let tot=0,n=0,rg=0,sY=0,sY2=0,shine=0,lap=0;const rgs=[];
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const k=y*W+x,i=k*4,r=d[i],g=d[i+1],b=d[i+2],Y=L[k];tot++;
      if(Y>222&&Math.max(r,g,b)-Math.min(r,g,b)<45){shine++;continue}
      if(!skin[k]) continue;
      n++;rg+=r-g;rgs.push(r-g);sY+=Y;sY2+=Y*Y;
      lap+=Math.abs(4*Y-L[k-1]-L[k+1]-L[k-W]-L[k+W]);
    }
    if(!(tot&&(n+shine)>=tot*.2&&n>6)){out[key]=null;continue}
    readable++;
    const mRG=rg/n,mY=sY/n;let spots=0;for(const v of rgs) if(v>mRG+22) spots++;
    out[key]={redness:mRG,shine:shine/(n+shine),lap:lap/n,std:Math.sqrt(Math.max(0,sY2/n-mY*mY)),meanY:mY,spots:spots/n};
  }
  return readable>=2?{zones:out,pins,box:{x:bx/W,y:by/H,w:bw/W,h:bh/H}}:null;
}

/* per-zone sign scores */
function zoneSigns(z){return{
  blemish:clamp(100-z.spots*900),
  pores:clamp(100-(z.lap-3)*6),
  oil:clamp(100-z.shine*380),
  redness:clamp(100-(z.redness-40)*1.8),
  texture:clamp(100-(z.lap-3)*7),
  even:clamp(100-(z.std-10)*2),
  radiance:clamp(88-(z.std/(z.meanY+1)-.04)*400)
}}
const avg=a=>{a=a.filter(v=>v!=null);return a.length?a.reduce((x,y)=>x+y,0)/a.length:null};

function score(zones,kind){
  const s={};let zs=null;
  const fb={blemish:78,pores:72,oil:70,redness:76,texture:74,even:76,radiance:70};
  if(zones){
    zs={};const zf=kind==="mp"?zoneSignsMP:zoneSigns;for(const k in zones) zs[k]=zones[k]?zf(zones[k]):null;
    const pick=(sign,keys)=>avg(keys.map(k=>zs[k]&&zs[k][sign]));
    s.blemish=pick("blemish",["forehead","lcheek","rcheek","chin"]);
    s.pores=pick("pores",["nose","lcheek","rcheek"]);
    s.oil=pick("oil",["forehead","nose"]);
    s.redness=pick("redness",["lcheek","rcheek","nose"]);
    s.texture=pick("texture",["lcheek","rcheek"]);
    s.even=pick("even",["lcheek","rcheek","forehead"]);
    s.radiance=pick("radiance",["lcheek","rcheek"]);
  }
  for(const k in fb) if(s[k]==null) s[k]=fb[k];
  s.hydration=clamp(58+(s.texture-60)*.45+(s.radiance-60)*.3);
  for(const k in s) s[k]=Math.round(s[k]);
  const W={blemish:.2,pores:.1,oil:.12,redness:.12,texture:.12,even:.12,radiance:.1,hydration:.12};
  let total=0;for(const k in W) total+=s[k]*W[k];
  return {s,total:Math.round(total),zs};
}
/* skin type, focus and breakout level come from the scan itself */
function derive(s){
  const type=s.oil<62?"oily":(s.oil<74&&s.hydration<66)?"combo":s.hydration<60?"dry":"normal";
  const fixable=["blemish","pores","oil","redness","texture","even"];
  const goal=fixable.slice().sort((a,b)=>s[a]-s[b])[0];
  const acne=s.blemish<60?2:s.blemish<75?1:0;
  return {type,goal,acne};
}
function skinAgeOf(total){return Math.max(13,Math.min(45,Math.round(16+(85-total)/3)))}

/* ---------- render ---------- */
const SIGNS=[["blemish","Blemishes"],["pores","Pores"],["oil","Oil control"],["redness","Redness"],["texture","Texture"],["even","Dark marks"],["radiance","Radiance"],["hydration","Hydration"]];
const NAME=Object.fromEntries(SIGNS);
const ZONE_SIGNS={forehead:["oil","blemish"],nose:["pores","oil"],lcheek:["redness","texture","blemish"],rcheek:["redness","texture","blemish"],chin:["blemish"]};
const SAMPLE_ZONES={forehead:{oil:56,blemish:74},nose:{pores:52,oil:48},lcheek:{redness:63,texture:70,blemish:69},rcheek:{redness:67,texture:72,blemish:71},chin:{blemish:58}};
let result=null,tab="am",photoURL=null;
function color(v){return "var(--ink)"}
function hex(v){return "#0A0A0A"}

const FACE_SVG=`<svg class="ph" viewBox="0 0 150 200" aria-hidden="true"><rect width="150" height="200" fill="var(--sunk)"/><ellipse cx="75" cy="102" rx="46" ry="62" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 4"/><path d="M60 92q4-4 8 0M82 92q4-4 8 0M70 122q5 4 10 0" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-linecap="round"/></svg>`;

function renderMap(r){
  const fm=$('facemap');let worstAll=null;
  fm.innerHTML=(r.photo&&photoURL)?`<img src="${photoURL}" alt="Your selfie with analyzed zones">`:FACE_SVG;
  for(const [k,z] of Object.entries(ZONES)){
    let worst=null;
    const vals=r.zs?r.zs[k]:SAMPLE_ZONES[k];
    if(!vals) continue;
    for(const sg of ZONE_SIGNS[k]){const v=vals[sg];if(v!=null&&(!worst||v<worst[1])) worst=[sg,v]}
    if(!worst) continue;
    if(!worstAll||worst[1]<worstAll.v) worstAll={k,v:worst[1]};
    const pp=r.pins&&r.pins[k]?r.pins[k]:z,cx=r.mirrored?1-pp.cx:pp.cx,cy=pp.cy;
    const el=document.createElement('div');el.className="pin"+(cx<.45?" l":"");
    el.style.left=(cx*100)+"%";el.style.top=(cy*100)+"%";
    el.dataset.k=k;
    el.innerHTML=`<i style="background:${hex(worst[1])}"></i><span hidden>${NAME[worst[0]].toLowerCase()} ${worst[1]}</span>`;
    fm.appendChild(el);
  }
  if(worstAll){const w=fm.querySelector(`.pin[data-k="${worstAll.k}"] span`);if(w) w.hidden=false}
}

function renderEmpty(){
  result=null;
  $('srcBadge').textContent="no scan yet";
  $('scoreNum').textContent="–";$('ringArc').style.strokeDashoffset="276.46";
  $('tier').textContent="no scan yet";$('roast').textContent="turn on your camera and scan to get your card.";
  $('skinAge').textContent="–";$('skinAgeTxt').textContent="shows up after your first scan.";
  $('stats').innerHTML=SIGNS.map(([k,lab])=>`<div class="stat"><span>${lab.toLowerCase()}</span><span class="v">–</span><div class="bar"><i style="width:0"></i></div></div>`).join("");
  $('weak').hidden=true;$('toRoutine').hidden=true;document.querySelector('.share').hidden=true;
  $('facemap').innerHTML=FACE_SVG;
  $('skinType').textContent="no routine yet";
  $('loadout').innerHTML='<p class="empty" style="grid-column:1/-1">scan your face first. your routine builds itself from the result.</p><a class="btn" href="#solo" style="justify-self:start;text-decoration:none">go scan</a>';
}
function renderResult(r,isSample){
  $('weak').hidden=false;$('toRoutine').hidden=false;document.querySelector('.share').hidden=false;
  result=r;
  $('srcBadge').textContent=isSample?"sample":r.photo?"camera scan":"ANSWERS ONLY";
  $('scoreNum').textContent=r.total;
  $('ringArc').style.strokeDashoffset=String(276.46*(1-r.total/100));
  const t=tierFor(r.total);$('tier').textContent=t[1];$('roast').textContent=t[2];
  const sa=skinAgeOf(r.total);
  $('skinAge').textContent=sa;
  $('skinAgeTxt').textContent=sa<=18?"Fresh. Your skin looks its age or younger.":sa<=24?"A few years of wear showing. Very fixable.":"Your skin is acting way older than it should. The routine below fixes that.";
  $('stats').innerHTML=SIGNS.map(([k,lab])=>`<div class="stat"><span>${lab}</span><span class="v">${r.s[k]}</span><div class="bar"><i style="width:${r.s[k]}%;background:${color(r.s[k])}"></i></div></div>`).join("");
  const weakest=SIGNS.slice().sort((a,b)=>r.s[a[0]]-r.s[b[0]])[0];
  $('weak').innerHTML=`weakest sign: <b>${weakest[1].toLowerCase()}</b>. your routine targets ${NAME[r.goal].toLowerCase()}${r.goal!==weakest[0]?` and covers ${weakest[1].toLowerCase()} too`:""}.`;
  $('shareText').textContent=shareLine();
  $('skinType').textContent=`loadout for ${r.type} skin · focus: ${NAME[r.goal].toLowerCase()}`;
  r.routine=buildRoutine(r.type,weakest[0],r.goal,r.acne);
  renderMap(r);renderLoadout();
}
function shareLine(){if(!result) return "";return `I scored ${result.total} (${tierFor(result.total)[1]}) on Face Card. Skin age ${skinAgeOf(result.total)}. ${levelName()}. Your move.`}

function renderLoadout(){
  if(!result) return;
  $('loadout').innerHTML=result.routine[tab].map(([slot,p,xp],i)=>`<article class="item">
    <div class="slot"><span class="label">${tab==="wk"?"Weekly":"Step "+(i+1)} · ${slot}</span><span class="label">+${xp} XP</span></div>
    <div class="brand"><b>${esc(p.brand)}</b><span>${esc(p.div)}</span></div>
    <div><h3>${esc(p.name)}</h3><p>${esc(p.why)}</p></div>
    <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center">
      <span class="fix">Targets: ${p.fixes.map(f=>NAME[f].toLowerCase()).join(", ")}</span>
      <a href="https://www.google.com/search?q=${encodeURIComponent(p.brand+" "+p.name)}" target="_blank" rel="noopener">Find it →</a>
    </div>
  </article>`).join("");
  ["am","pm","wk"].forEach(k=>$('tab-'+k).setAttribute('aria-pressed',String(k===tab)));
}
["am","pm","wk"].forEach(k=>$('tab-'+k).addEventListener('click',()=>{tab=k;renderLoadout()}));

function levelOf(xp){return Math.floor(xp/200)+1}
function levelName(){const l=levelOf(state.xp);return `LV ${l} · ${LEVELS[Math.min(l-1,LEVELS.length-1)]}`}
function renderHUD(){
  $('lvl').textContent=levelName();
  const into=state.xp%200;$('xpfill').style.width=(into/2)+"%";$('xptext').textContent=`${into} / 200 XP`;
}


let tt;function toast(m){const t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),1800)}

$('copyBtn').addEventListener('click',()=>{
  const txt=$('shareText').textContent;
  const sel=()=>{const r=document.createRange();r.selectNodeContents($('shareText'));const s=getSelection();s.removeAllRanges();s.addRange(r);toast("selected. copy it manually.")};
  try{navigator.clipboard.writeText(txt).then(()=>toast("copied. go flex."),sel)}catch(e){sel()}
});


/* ================= face mapping ================= */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const median=a=>{const b=a.filter(v=>v!=null).sort((x,y)=>x-y);if(!b.length) return null;const m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2};
const WEIGHTS={blemish:.2,pores:.1,oil:.12,redness:.12,texture:.12,even:.12,radiance:.1,hydration:.12};
function totalOf(s){let t=0;for(const k in WEIGHTS) t+=s[k]*WEIGHTS[k];return Math.round(t)}

const MP_VER="0.10.14";
const MP_MODEL="https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
let landmarker=null,mpState="idle"; // idle | loading | ready | failed
async function loadLandmarker(){
  if(mpState!=="idle") return;
  mpState="loading";
  try{
    const vision=await import(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}/vision_bundle.mjs`);
    const files=await vision.FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}/wasm`);
    const opts=d=>({baseOptions:{modelAssetPath:MP_MODEL,delegate:d},runningMode:"IMAGE",numFaces:1});
    try{landmarker=await vision.FaceLandmarker.createFromOptions(files,opts("GPU"))}
    catch(e){landmarker=await vision.FaceLandmarker.createFromOptions(files,opts("CPU"))}
    mpState="ready";
  }catch(e){console.warn("Face mapping failed to load, using basic mode.",e);mpState="failed"}
}
window.__fcSetLandmarker=l=>{landmarker=l;mpState=l?"ready":"failed"}; // test hook

// MediaPipe face mesh points used to place each zone
const LM={top:10,mid:151,glab:9,bridge:6,tip:4,lcheek:50,rcheek:280,lside:234,rside:454,lip:17,chin:152};
const _fc=document.createElement('canvas'),_fx=_fc.getContext('2d',{willReadFrequently:true});

function analyzeMP(src){
  const iw=src.naturalWidth||src.videoWidth,ih=src.naturalHeight||src.videoHeight;if(!iw||!ih) return null;
  let out;try{out=landmarker.detect(src)}catch(e){return null}
  const L=out&&out.faceLandmarks&&out.faceLandmarks[0];if(!L||L.length<455) return null;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const p of L){const x=p.x*iw,y=p.y*ih;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  x0=Math.max(0,x0);y0=Math.max(0,y0);x1=Math.min(iw,x1);y1=Math.min(ih,y1);
  const fwPx=x1-x0,fhPx=y1-y0;
  if(fwPx<Math.min(iw,ih)*.18) return {tooFar:true};
  // redraw the face at a fixed size so close and far faces are measured the same way
  const S=220/fwPx,W=220,H=Math.max(10,Math.round(fhPx*S));
  _fc.width=W;_fc.height=H;_fx.drawImage(src,x0,y0,fwPx,fhPx,0,0,W,H);
  const d=_fx.getImageData(0,0,W,H).data;
  const Y=new Float32Array(W*H);for(let k=0;k<W*H;k++) Y[k]=.299*d[k*4]+.587*d[k*4+1]+.114*d[k*4+2];
  const c=i=>({x:(L[i].x*iw-x0)*S,y:(L[i].y*ih-y0)*S});
  const fw=Math.abs(c(LM.rside).x-c(LM.lside).x)||W*.9;
  const top=c(LM.top),glab=c(LM.glab),mid=c(LM.mid),bridge=c(LM.bridge),tip=c(LM.tip),lc=c(LM.lcheek),rc=c(LM.rcheek),lip=c(LM.lip),chin=c(LM.chin);
  const R=(cx,cy,w,h)=>({x0:Math.max(1,Math.round(cx-w/2)),x1:Math.min(W-2,Math.round(cx+w/2)),y0:Math.max(1,Math.round(cy-h/2)),y1:Math.min(H-2,Math.round(cy+h/2)),cx,cy});
  const rects={
    forehead:R(mid.x,(top.y+glab.y)/2,fw*.42,Math.max(6,(glab.y-top.y)*.5)),
    nose:R((bridge.x+tip.x)/2,bridge.y+(tip.y-bridge.y)*.6,fw*.12,Math.max(6,(tip.y-bridge.y)*.5)),
    lcheek:R(lc.x,lc.y,fw*.18,fw*.16),
    rcheek:R(rc.x,rc.y,fw*.18,fw*.16),
    chin:R(chin.x,lip.y+(chin.y-lip.y)*.55,fw*.22,Math.max(6,(chin.y-lip.y)*.35))
  };
  // pass 1: the face's own baseline redness, so skin tone and lighting don't count against you
  const all=[];
  for(const r of Object.values(rects)) for(let y=r.y0;y<=r.y1;y+=2) for(let x=r.x0;x<=r.x1;x+=2){
    const i=(y*W+x)*4,R_=d[i],G=d[i+1],B=d[i+2];if(Y[y*W+x]<30) continue;all.push((R_-G)/(R_+G+B+1))}
  if(all.length<40) return null;
  const cf=median(all);
  const [sx,sy,sw,sh]=cropRect(iw,ih);
  const zones={},pins={};
  for(const [k,r] of Object.entries(rects)){
    let n=0,shine=0,cs=0,spots=0,sY=0,sY2=0,lap=0,sat=0;
    for(let y=r.y0;y<=r.y1;y++)for(let x=r.x0;x<=r.x1;x++){
      const q=y*W+x,i=q*4,R_=d[i],G=d[i+1],B=d[i+2],yy=Y[q];
      if(yy<30) continue;
      const mx=Math.max(R_,G,B),mn=Math.min(R_,G,B),st=(mx-mn)/(mx+1);
      if(yy>215&&st<.18){shine++;continue}
      const ch=(R_-G)/(R_+G+B+1);
      n++;cs+=ch;if(ch>cf+.05) spots++;sY+=yy;sY2+=yy*yy;sat+=st;
      lap+=Math.abs(4*yy-Y[q-1]-Y[q+1]-Y[q-W]-Y[q+W]);
    }
    pins[k]={cx:(x0+r.cx/S-sx)/sw,cy:(y0+r.cy/S-sy)/sh};
    if(n<12){zones[k]=null;continue}
    const mY=sY/n;
    zones[k]={red:cs/n-cf,cAbs:cs/n,spots:spots/n,shine:shine/(n+shine),lap:lap/n,cv:Math.sqrt(Math.max(0,sY2/n-mY*mY))/(mY+1),meanY:mY,sat:sat/n};
  }
  if(Object.values(zones).filter(Boolean).length<3) return null;
  return {zones,pins,kind:"mp"};
}
function zoneSignsMP(z){return{
  blemish:clamp(98-z.spots*420),
  pores:clamp(100-(z.lap-2.2)*9),
  oil:clamp(98-z.shine*400),
  redness:clamp(94-Math.max(0,z.red)*700-Math.max(0,z.cAbs-.16)*250),
  texture:clamp(100-(z.lap-2)*10),
  even:clamp(100-(z.cv-.04)*450),
  radiance:clamp(92-(z.cv-.04)*300-Math.max(0,.3-z.sat)*80) // no absolute brightness, so skin tone doesn't count against you
}}
function analyze(src){
  if(mpState==="ready"&&landmarker) return analyzeMP(src);
  const r=analyzeBlob(src);return r?{...r,kind:"blob"}:null;
}

/* ================= camera ================= */
let scanning=false;
const cam={stream:null,img:null,timer:null,live:null,
  attach(where){
    const slot=$('camSlot-'+where);
    if(slot&&$('camStage').parentNode!==slot){slot.appendChild($('camStage'));if(this.stream) $('camVid').play().catch(()=>{})}
    this.paint()},
  async start(){
    loadLandmarker();
    $('camMsg').textContent="starting camera…";
    try{
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia) throw new Error("no camera api");
      this.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:960},height:{ideal:1280}},audio:false});
      const v=$('camVid');v.srcObject=this.stream;await v.play();
      this.img=null;$('camShot').hidden=true;
      clearInterval(this.timer);this.timer=setInterval(()=>this.sample(),350);
    }catch(e){
      this.stream=null;
      const denied=e&&(e.name==="NotAllowedError"||e.name==="SecurityError");
      $('camStart').hidden=!denied;$('snapBtn').hidden=false;
      $('camMsg').textContent=denied?"camera access was blocked. allow it in your browser's site settings and try again, or take a selfie instead.":"live video isn't available here. take a selfie with your front camera instead.";
    }
    this.paint();
  },
  stop(){clearInterval(this.timer);this.timer=null;if(this.stream){this.stream.getTracks().forEach(t=>t.stop());this.stream=null}this.paint()},
  source(){const v=$('camVid');if(this.stream&&v.videoWidth) return v;return this.img},
  sample(){
    if(scanning) return;
    const src=this.source();if(!src) return;
    const z=analyze(src);this.lastRes=z&&z.zones?z:null;
    if(typeof duel!=="undefined") duel.local(this.lastRes,src===$('camVid'));
    const o=$('camOverlay'),x=o.getContext('2d');x.clearRect(0,0,o.width,o.height);
    const found=!!(z&&z.zones);
    $('camStage').classList.toggle('found',found);
    if(!found){
      this.live=null;
      $('liveScore').textContent=z&&z.tooFar?"come closer":mpState==="loading"?"loading…":"finding you…";
      return;
    }
    this.live=score(z.zones,z.kind).total;$('liveScore').textContent=this.live;
    const m=src===$('camVid');
    for(const k in z.pins){const p=z.pins[k];if(!z.zones[k]) continue;
      x.beginPath();x.arc((m?1-p.cx:p.cx)*o.width,p.cy*o.height,4,0,7);x.fillStyle="#fff";x.shadowColor="rgba(255,255,255,.9)";x.shadowBlur=12;x.fill()}
  },
  paint(){
    const on=!!(this.stream||this.img);
    $('camOff').hidden=on;$('camLive').hidden=!on;$('camVid').hidden=!this.stream;
  },
  grab(w=300,h=400,q=.85,skipDark=false){
    const src=this.source();if(!src) return null;
    if(src.tagName==="VIDEO"&&(src.readyState<2||src.paused)){src.play().catch(()=>{});if(skipDark) return null}
    const iw=src.naturalWidth||src.videoWidth,ih=src.naturalHeight||src.videoHeight,[sx,sy,sw,sh]=cropRect(iw,ih);
    const cv=document.createElement('canvas');cv.width=w;cv.height=h;const x=cv.getContext('2d');
    if(src===$('camVid')){x.translate(w,0);x.scale(-1,1)}
    x.drawImage(src,sx,sy,sw,sh,0,0,w,h);
    if(skipDark){try{const d=x.getImageData(0,0,w,h).data;let t=0;for(let i=0;i<d.length;i+=64) t+=d[i]+d[i+1]+d[i+2];if(t/(d.length/64)/3<10) return null}catch(e){}}
    try{return cv.toDataURL("image/jpeg",q)}catch(e){return null}
  }
};
$('camStart').addEventListener('click',()=>cam.start());
$('snapInput').addEventListener('change',e=>{
  const f=e.target.files&&e.target.files[0];if(!f) return;
  loadLandmarker();
  const url=URL.createObjectURL(f),img=new Image();
  img.onload=()=>{cam.img=img;$('camShot').src=url;$('camShot').hidden=false;cam.paint();cam.sample()};
  img.onerror=()=>toast("couldn't read that picture. try again.");
  img.src=url;e.target.value="";
});
$('camLive').addEventListener('click',()=>{if(cam.img) $('snapInput').click()});

/* a scan = about a second of frames, median of each sign, so one blurry frame can't tank you */
async function runScan(){
  const src=cam.source();
  if(!src){toast("turn on the camera first.");return null}
  if(mpState==="loading"){toast("face mapping is still loading. one sec.");return null}
  scanning=true;$('liveScore').textContent="hold still…";
  const got=[];
  const isImg=src.tagName==="IMG",until=Date.now()+1200;
  do{
    const r=analyze(src);if(r&&r.zones) got.push(r);
    if(isImg) break;
    await sleep(140);
  }while(Date.now()<until&&cam.source()===src);
  scanning=false;
  if(!got.length){toast("can't find your face. face a window or lamp and come a bit closer.");return null}
  const scored=got.map(g=>score(g.zones,g.kind));
  const s={};for(const [k] of SIGNS) s[k]=Math.round(median(scored.map(x=>x.s[k])));
  const zs={};for(const z of Object.keys(ZONES)){
    const per=scored.map(x=>x.zs&&x.zs[z]).filter(Boolean);
    if(!per.length){zs[z]=null;continue}
    zs[z]={};for(const k of Object.keys(per[0])) zs[z][k]=Math.round(median(per.map(p=>p[k])));
  }
  photoURL=cam.grab();
  return {s,total:totalOf(s),zs,pins:got[got.length-1].pins,mirrored:src===$('camVid'),...derive(s),photo:true};
}

$('scanForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=e.submitter||$('scanForm').querySelector('button[type=submit]');btn.disabled=true;
  const r=await runScan();btn.disabled=false;if(!r) return;
  const before=levelOf(state.xp);
  state.xp+=50;state.last={...r,zs:null,photo:false,fromPhoto:true};save();
  renderResult(r,false);renderHUD();
  live.recordScan(r.total);
  toast(levelOf(state.xp)>before?"level up: "+levelName():"+50 xp · scan saved");
  if(window.matchMedia('(max-width:860px)').matches) $('results').scrollIntoView({behavior:"smooth",block:"start"});
});

/* ================= accounts, ladder, duels (Supabase) ================= */
const CFG=window.FACECARD_CONFIG||{};
const CONFIGURED=!!(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY&&!/YOUR-/.test(CFG.SUPABASE_URL+CFG.SUPABASE_ANON_KEY));
const sb=CONFIGURED&&window.supabase?window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY):null;
const USER_RE=/^[a-z0-9_]{3,20}$/;
const ELO_RANKS=[[0,"rookie"],[950,"contender"],[1050,"clear-ish"],[1150,"glazed"],[1275,"face card"],[1400,"skin slayer"]];
function eloRank(e){let r=ELO_RANKS[0][1];for(const [m,n] of ELO_RANKS) if(e>=m) r=n;return r}
const errText=e=>(e&&(e.message||e.error_description||e.details))||"something went wrong";

const live={
  me:null,skew:0,
  async init(){
    if(!sb){
      $('authNote').hidden=false;
      $('authNote').textContent=CONFIGURED?"couldn't load the login library. check your connection and refresh.":"this site isn't connected to its database yet. follow SETUP.md to finish setup.";
      $('authBtn').disabled=true;
      $('ladder').innerHTML='<p class="empty">the ladder shows up once the site is connected.</p>';
      route();return;
    }
    sb.auth.onAuthStateChange((ev,session)=>{setTimeout(()=>this.onSession(session),0)});
    const {data}=await sb.auth.getSession();
    await this.onSession(data.session);
  },
  uid:null,
  async recheck(){this.me=null;const {data}=await sb.auth.getSession();await this.onSession(data.session,true)},
  async onSession(session,force){
    const uid=session&&session.user?session.user.id:null;
    if(!force&&uid&&this.me&&this.uid===uid) return;
    this.uid=uid;const seq=this.seq=(this.seq||0)+1;
    const prof=uid?(await sb.from('profiles').select('*').eq('owner',uid).maybeSingle()).data:null;
    if(seq!==this.seq) return; // a newer login event already took over
    if(!prof){
      this.me=null;duel.reset();setAccount();$('authPass').value="";
      const s0=load();state={xp:0,last:null,...(s0&&!s0.owner?s0:{})};renderHUD();
      renderEmpty();route();return;
    }
    const p=prof;
    this.me=p;$('authPass').value="";
    const s0=load();state=s0&&s0.owner===uid?s0:{owner:uid,xp:p.xp,last:null};
    state.owner=uid;state.xp=p.xp;save();renderHUD();
    if(state.last&&state.last.fromPhoto){renderResult({...state.last,zs:null,photo:false,pins:null},false);$('srcBadge').textContent="last scan"} else renderEmpty();
    setAccount();
    this.syncClock();
    this.watchMe();this.loadLadder();
    if(!location.hash||location.hash==="#login"){location.hash=pendingView||"home"} else route();
  },
  async syncClock(){
    const t0=Date.now();const {data}=await sb.rpc('server_now');const t1=Date.now();
    if(data) this.skew=new Date(data).getTime()-(t0+t1)/2;
  },
  now(){return Date.now()+this.skew},
  meChan:null,ladderChan:null,
  watchMe(){
    if(this.meChan) sb.removeChannel(this.meChan);
    this.meChan=sb.channel('me-'+this.me.id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles',filter:'id=eq.'+this.me.id},pl=>{
      const before=levelOf(state.xp);this.me={...this.me,...pl.new};state.xp=this.me.xp;save();renderHUD();setAccount();
      if(levelOf(state.xp)>before) toast("level up: "+levelName());
    }).subscribe();
    if(!this.ladderChan){
      let t;this.ladderChan=sb.channel('ladder').on('postgres_changes',{event:'*',schema:'public',table:'profiles'},()=>{clearTimeout(t);t=setTimeout(()=>this.loadLadder(),400)}).subscribe();
    }
  },
  async refreshMe(){
    if(!sb||!this.me) return;
    const {data}=await sb.from('profiles').select('*').eq('id',this.me.id).maybeSingle();
    if(!data) return;
    const before=levelOf(state.xp);this.me=data;state.xp=data.xp;save();renderHUD();setAccount();
    if(levelOf(state.xp)>before) toast("level up: "+levelName());
  },
  async loadLadder(){
    const {data,error}=await sb.from('profiles').select('id,username,elo,wins,losses,best').order('elo',{ascending:false}).order('best',{ascending:false}).limit(50);
    if(error){$('ladder').innerHTML='<p class="empty"></p>';$('ladder').firstChild.textContent="couldn't load the ladder: "+errText(error);return}
    renderLadder(data||[]);
  },
  async recordScan(total){
    if(!sb||!this.me) return;
    const {data,error}=await sb.rpc('record_scan',{p_score:total});
    if(error){if(/log in first/.test(errText(error))) return this.recheck();toast("scan saved here, but not to your account: "+errText(error));return}
    if(data){this.me={...this.me,...data};state.xp=data.xp;save();renderHUD();setAccount()}
    this.loadLadder();
  },
  async join(u,pw,name){
    let {data}=await sb.auth.getSession();
    if(!data.session){
      const r=await sb.auth.signInAnonymously();
      if(r.error) return {error:/anonymous/i.test(r.error.message)?{message:"turn on anonymous sign-ins in supabase (SETUP.md step 3)."}:r.error};
    }
    const {data:p,error}=await sb.rpc('join_group',{p_user:u,p_pass:pw,p_name:name});
    if(error) return {error};
    await this.onSession((await sb.auth.getSession()).data.session,true);
    return {data:p};
  },
  async signOut(){await sb.auth.signOut()}
};

function renderLadder(rows){
  const el=$('ladder');
  if(!rows.length){el.innerHTML='<p class="empty">nobody on the ladder yet. win a duel to get on it.</p>';return}
  const tb=document.createElement('table');
  tb.innerHTML='<thead><tr><th>#</th><th>player</th><th>elo</th><th>rank</th><th>w–l</th><th>best scan</th></tr></thead><tbody></tbody>';
  const body=tb.querySelector('tbody');
  rows.forEach((r,i)=>{
    const tr=document.createElement('tr');if(live.me&&r.id===live.me.id) tr.className="me";
    tr.innerHTML=`<td class="pos">${i+1}</td><td><div class="who"><span></span></div></td><td class="elo">${r.elo|0}</td><td>${eloRank(r.elo)}</td><td>${r.wins|0}–${r.losses|0}</td><td>${r.best?r.best:"–"}</td>`;
    tr.querySelector('.who span').textContent=r.username+(live.me&&r.id===live.me.id?" (you)":"");
    body.appendChild(tr);
  });
  el.innerHTML="";el.appendChild(tb);
}

function setAccount(){
  const me=live.me;document.body.classList.toggle('out',!me);
  $('loginLink').hidden=!!me;$('acctName').hidden=!me;$('logoutBtn').hidden=!me;
  if(me) $('acctName').textContent=`${me.username} · ${me.elo} elo`;
}
$('logoutBtn').addEventListener('click',async()=>{await live.signOut();location.hash="home"});

/* ---------- group login form ---------- */
function setAuthMode(){}
function authErr(m){$('authErr').textContent=m;$('authErr').hidden=false}
try{const n=localStorage.getItem('fc_name');if(n) $('authName').value=n}catch(e){}
$('authForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!sb) return;
  const u=$('authUser').value.trim(),pw=$('authPass').value,name=$('authName').value.trim().toLowerCase();
  if(!u||!pw) return authErr("enter the group username and password.");
  if(!USER_RE.test(name)) return authErr("pick a player name: 3–20 letters, numbers or _.");
  $('authBtn').disabled=true;$('authErr').hidden=true;
  try{
    const {error}=await live.join(u,pw,name);
    if(error){const m=errText(error);authErr(/rate|too many/i.test(m)?"too many logins at once. wait a minute and try again.":m)}
    else{try{localStorage.setItem('fc_name',name)}catch(e){}toast(`welcome, ${name}.`)}
  }finally{$('authBtn').disabled=false}
});

/* ---------- what shows in the popups and the end report ---------- */
const POP_WORD={blemish:"breakout",pores:"pores",oil:"shiny",redness:"red",texture:"bumpy",even:"marks",radiance:"dull",hydration:"dry"};
const ZONE_WORD={forehead:"forehead",nose:"nose",lcheek:"cheek",rcheek:"cheek",chin:"chin"};
const WHY={blemish:"active breakouts and clogged spots",pores:"pores showing, mostly nose and cheeks",oil:"shine building up on the t-zone",redness:"redness and irritation, usually the cheeks",texture:"bumpy, uneven surface",even:"dark marks and uneven tone",radiance:"skin looking dull and tired",hydration:"skin looking dry or dehydrated"};
const FIX={blemish:["pressClear"],pores:["pressClear","rareEarth"],oil:["ffWash","gelCream","rareEarth"],redness:["drgRed","drgSun"],texture:["mandelic"],even:["darkSpot","spf"],radiance:["dreamMask","darkSpot"],hydration:["b5","ufCream"]};
/* worst sign in each zone, for the popups. x/y are where it shows on the picture people see */
function flagsFrom(res,mirrored){
  if(!res||!res.zones) return [];
  const {zs}=score(res.zones,res.kind);const out=[];
  for(const z of Object.keys(ZONE_SIGNS)){
    const v=zs&&zs[z];const p=res.pins&&res.pins[z];if(!v||!p) continue;
    let worst=null;for(const sg of ZONE_SIGNS[z]) if(v[sg]!=null&&(!worst||v[sg]<worst[1])) worst=[sg,v[sg]];
    if(worst&&worst[1]<80) out.push({z,sign:worst[0],v:worst[1],x:mirrored?1-p.cx:p.cx,y:p.cy});
  }
  const seen=new Set();
  return out.sort((a,b)=>a.v-b.v).filter(f=>!seen.has(f.sign)&&seen.add(f.sign)).slice(0,3);
}
function drawPops(box,flags){
  if(!box) return;
  const keep=new Set();
  for(const f of flags||[]){
    if(!(f.x>.04&&f.x<.96&&f.y>.08&&f.y<.98)) continue;
    keep.add(f.z);
    let el=box.querySelector(`[data-z="${f.z}"]`);
    const label=`${POP_WORD[f.sign]||f.sign} · ${f.v}`;
    if(!el){el=document.createElement('span');el.className="pop";el.dataset.z=f.z;box.appendChild(el)}
    else if(el.dataset.sign!==f.sign){el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump')}
    el.dataset.sign=f.sign;el.textContent=label;el.style.left=(f.x*100)+"%";el.style.top=(f.y*100)+"%";
  }
  box.querySelectorAll('.pop').forEach(el=>{if(!keep.has(el.dataset.z)) el.remove()});
}
function picksFor(s){
  const all=Object.keys(FIX).filter(k=>s[k]!=null).sort((a,b)=>s[a]-s[b]);
  let weak=all.filter(k=>s[k]<85).slice(0,3);if(!weak.length) weak=all.slice(0,1);
  const used=new Set(),out=[];
  for(const k of weak){const key=FIX[k].find(x=>!used.has(x));if(key){used.add(key);out.push({sign:k,p:P[key]})}}
  return {weak,picks:out};
}

/* ---------- duels ---------- */
const duel={
  m:null,players:[],chan:null,poll:null,ticker:null,finishing:0,waitingSince:0,locked:false,result:null,
  peers:{},finals:{},chanReady:false,sender:null,myScan:null,myFlags:[],chanStatus:"",dbMissing:false,dbTick:0,dbPoll:null,lastVia:"",lastSeen:0,
  reset(){this.leaveLocal()},
  async rpc(name,args){
    const {data,error}=await sb.rpc(name,args);
    if(error){if(/log in first/.test(errText(error))){toast("you logged in on another device.");live.recheck();return null}toast(errText(error));return null}
    return data;
  },
  async enter(m){
    if(!m) return;
    if(this.m&&this.m.id!==m.id) this.unwatch();
    this.m=m;this.locked=false;this.result=null;this.waitingSince=Date.now();this.peers={};this.finals={};this.myScan=null;
    $('duelReport').hidden=true;$('duelReport').innerHTML="";$('tileMe').classList.remove('win','lead');
    $('duelLobby').hidden=true;$('duelRoom').hidden=false;
    if(!cam.source()) toast("turn on your camera so they can see you.");
    $('codebox').hidden=m.is_public;$('duelCode').textContent=m.code;
    try{localStorage.setItem('fc_match',m.id)}catch(e){}
    this.watch();await this.refresh();
    if(!this.ticker) this.ticker=setInterval(()=>this.tick(),250);
  },
  watch(){
    const id=this.m.id;
    this.chanReady=false;
    this.chan=sb.channel('match-'+id,{config:{broadcast:{self:false}}})
      .on('postgres_changes',{event:'*',schema:'public',table:'matches',filter:'id=eq.'+id},()=>this.refresh())
      .on('postgres_changes',{event:'*',schema:'public',table:'match_players',filter:'match_id=eq.'+id},()=>this.refresh())
      .on('broadcast',{event:'frame'},({payload})=>this.onFrame(payload))
      .on('broadcast',{event:'final'},({payload})=>this.onFinal(payload))
      .subscribe(st=>{this.chanStatus=st;this.chanReady=st==="SUBSCRIBED"});
    clearInterval(this.sender);this.sender=setInterval(()=>this.sendFrame(),500);
    clearInterval(this.dbPoll);this.dbPoll=setInterval(()=>this.pullFrames(),1000);
    this.poll=setInterval(()=>this.refresh(),2000); // backup for anything realtime misses (like someone leaving)
  },
  unwatch(){if(this.chan){sb.removeChannel(this.chan);this.chan=null}clearInterval(this.poll);this.poll=null;clearInterval(this.sender);this.sender=null;clearInterval(this.dbPoll);this.dbPoll=null;this.chanReady=false;this.chanStatus=""},
  /* faces: about 2 small snapshots a second go to the other players in this duel. nothing is saved. */
  sendFrame(){
    if(!this.m||!live.me||this.m.status==="done"||this.players.length<2) return;
    const img=cam.grab(180,240,.6,true);if(!img) return;
    const payload={pid:live.me.id,img,score:cam.live,flags:this.myFlags};
    if(this.chan&&this.chanReady) this.chan.send({type:'broadcast',event:'frame',payload});
    // backup route through the database, about once a second, for networks where the live link doesn't get through
    if(!this.dbMissing&&(this.dbTick++%2===0)){
      sb.rpc('push_frame',{p_match:this.m.id,p_img:img,p_score:cam.live==null?null:cam.live,p_flags:this.myFlags}).then(({error})=>{
        if(error&&/push_frame|function|schema cache/i.test(errText(error))) this.dbMissing=true;
      });
    }
  },
  async pullFrames(){
    if(!this.m||this.dbMissing||this.m.status==="done"||this.players.length<2) return;
    const {data,error}=await sb.from('match_frames').select('user_id,img,score,flags,updated_at').eq('match_id',this.m.id);
    if(error){if(/match_frames|relation|schema cache/i.test(errText(error))) this.dbMissing=true;return}
    for(const r of data||[]){
      if(r.user_id===live.me.id) continue;
      const at=new Date(r.updated_at).getTime(),cur=this.peers[r.user_id];
      if(live.now()-at>5000) continue;                  // old snapshot
      if(cur&&cur.via==="live"&&Date.now()-cur.t<1500) continue; // live link is already faster
      if(cur&&cur.dbAt===at) continue;
      this.onFrame({pid:r.user_id,img:r.img,score:r.score,flags:r.flags},"backup",at);
    }
  },
  onFrame(p,via="live",dbAt=0){
    if(!p||typeof p.pid!=="string"||!this.players.some(x=>x.user_id===p.pid)) return;
    if(typeof p.img!=="string"||!p.img.startsWith("data:image/jpeg")||p.img.length>200000) return;
    this.peers[p.pid]={img:p.img,score:Number.isFinite(p.score)?Math.round(p.score):null,flags:Array.isArray(p.flags)?p.flags.slice(0,3):[],t:Date.now(),via,dbAt};
    this.lastVia=via;this.lastSeen=Date.now();
    this.updateTile(p.pid);
  },
  onFinal(p){
    if(!p||typeof p.pid!=="string"||typeof p.img!=="string"||!p.img.startsWith("data:image/jpeg")||p.img.length>300000) return;
    this.finals[p.pid]={img:p.img};
    if(this.m&&this.m.status==="done") this.renderReport();
  },
  local(res,mirrored){
    if(!this.m) return;
    this.myFlags=flagsFrom(res,mirrored).map(f=>({z:f.z,sign:f.sign,v:f.v,x:+f.x.toFixed(3),y:+f.y.toFixed(3)}));
    drawPops($('popsMe'),this.myFlags);
    $('meScore').textContent=cam.live==null?"–":cam.live;
  },
  renderTiles(){
    const box=$('oppTiles'),others=this.players.filter(p=>p.user_id!==live.me.id);
    box.querySelectorAll('.tile').forEach(t=>{if(!others.some(o=>o.user_id===t.dataset.pid)) t.remove()});
    for(const o of others){
      let t=box.querySelector(`.tile[data-pid="${o.user_id}"]`);
      if(!t){t=document.createElement('div');t.className="tile";t.dataset.pid=o.user_id;
        t.innerHTML='<div class="stale">waiting for their camera…</div><img alt="" hidden><div class="pops" aria-hidden="true"></div><div class="tag"><span></span><b>–</b></div>';
        box.appendChild(t)}
      t.querySelector('.tag span').textContent=o.profiles.username;
      t.classList.toggle('win',this.m.status==="done"&&!!o.won);
      this.updateTile(o.user_id);
    }
    let ph=box.querySelector('.tile.empty');
    if(!others.length&&!ph){ph=document.createElement('div');ph.className="tile empty";
      ph.innerHTML='<div class="radar" aria-hidden="true"><i></i><i></i><i></i><span class="me"></span></div><b>'+(this.m.is_public?"finding you an opponent":"waiting for an opponent")+'<span class="dots"><i>.</i><i>.</i><i>.</i></span></b><span class="ptime">0:00</span>';
      box.appendChild(ph)}
    if(others.length&&ph) ph.remove();
    $('tileMe').classList.toggle('win',this.m.status==="done"&&!!(this.players.find(p=>p.user_id===live.me.id)||{}).won);
  },
  updateTile(pid){
    const t=$('oppTiles').querySelector(`.tile[data-pid="${pid}"]`);if(!t) return;
    const f=this.peers[pid],row=this.players.find(p=>p.user_id===pid)||{};
    const img=t.querySelector('img'),stale=t.querySelector('.stale');
    const fresh=f&&Date.now()-f.t<4000;
    if(f&&img.src!==f.img) img.src=f.img;
    img.hidden=!f;stale.hidden=!!fresh;
    stale.textContent=f?"camera paused":"waiting for their camera…";
    if(f) stale.hidden=fresh;
    const shown=this.m&&this.m.status==="done"?row.score:(row.score!=null&&this.m.status==="live"?"locked":f&&f.score!=null?f.score:"–");
    t.querySelector('.tag b').textContent=shown==null?"–":shown;
    drawPops(t.querySelector('.pops'),this.m&&this.m.status==="done"?[]:(fresh?f.flags:[]));
  },
  linkStatus(){
    const el=$('linkStatus');if(!el) return;
    let t="";
    if(this.m&&this.m.status!=="done"&&this.players.length>=2){
      if(!cam.source()) t="turn on your camera so they can see you.";
      else if(Date.now()-this.lastSeen<3000) t=this.lastVia==="live"?"seeing them live.":"seeing them through the backup route (about once a second).";
      else if(this.dbMissing&&!this.chanReady) t="can't reach them. the live link is "+(this.chanStatus||"off").toLowerCase().replace(/_/g," ")+" and the backup route isn't set up yet (run update-1.sql in supabase).";
      else t="no picture from them yet. make sure their camera is on and they're on the duel tab, in front of the window (not a background tab).";
    }
    el.textContent=t;el.hidden=!t;
  },
  renderReport(){
    const box=$('duelReport');if(!this.m||this.m.status!=="done") return;
    const me=live.me.id,ordered=this.players.slice().sort((a,b)=>(b.score??-1)-(a.score??-1));
    const mine=this.myScan||(cam.lastRes?(()=>{const sc=score(cam.lastRes.zones,cam.lastRes.kind);return {s:sc.s,total:sc.total}})():null);
    let html='<h3>'+(this.result&&this.result.won?"you won.":"good fight.")+'</h3><div class="finals">';
    for(const p of ordered){
      const img=p.user_id===me?(this.myFinal||cam.grab()):(this.finals[p.user_id]||this.peers[p.user_id]||{}).img;
      html+=`<div class="final${p.won?" win":""}">${img?`<img alt="" src="${img}">`:""}<div class="tag"><span data-n="${p.user_id}"></span><b>${p.score??"–"}</b></div></div>`;
    }
    html+='</div>';
    if(mine){
      const {weak,picks}=picksFor(mine.s);
      html+='<h3>what held you back</h3><div class="weakrows">'+weak.map(k=>`<div class="weakrow"><span>${NAME[k].toLowerCase()}</span><b>${mine.s[k]}</b><div class="bar"><i style="width:${mine.s[k]}%"></i></div><small>${WHY[k]}</small></div>`).join("")+'</div>';
      html+='<h3>fix it with</h3><div class="recs">'+picks.map(({sign,p})=>`<article class="item"><div class="brand"><b>${esc(p.brand)}</b><span>${esc(p.div)}</span></div><div><h3 style="font-size:16px">${esc(p.name)}</h3><p>${esc(p.why)}</p></div><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><span class="fix">for your ${NAME[sign].toLowerCase()}</span><a href="https://www.google.com/search?q=${encodeURIComponent(p.brand+" "+p.name)}" target="_blank" rel="noopener">find it →</a></div></article>`).join("")+'</div>';
      html+='<a class="btn ghost" href="#routine" style="justify-self:start;text-decoration:none">see my full routine</a>';
    }else html+='<p class="fine">you didn\'t lock in a scan this round, so there\'s no breakdown. lock in next round to get your fixes.</p>';
    box.innerHTML=html;
    box.querySelectorAll('[data-n]').forEach(el=>{const p=this.players.find(x=>x.user_id===el.dataset.n);el.textContent=p?p.profiles.username+(p.user_id===me?" (you)":""):""});
    box.hidden=false;
  },
  leaveLocal(){
    this.unwatch();clearInterval(this.ticker);this.ticker=null;this.m=null;this.players=[];this.result=null;this.peers={};this.finals={};
    $('oppTiles').innerHTML="";$('duelReport').hidden=true;$('arena').hidden=false;drawPops($('popsMe'),[]);
    try{localStorage.removeItem('fc_match')}catch(e){}
    $('duelLobby').hidden=false;$('duelRoom').hidden=true;
  },
  async refresh(){
    if(!this.m) return;
    const id=this.m.id;
    const [{data:m},{data:ps}]=await Promise.all([
      sb.from('matches').select('*').eq('id',id).maybeSingle(),
      sb.from('match_players').select('user_id,score,won,elo_delta,joined_at,profiles(username,elo)').eq('match_id',id).order('joined_at')
    ]);
    if(!this.m||this.m.id!==id) return;
    if(!m){toast("that duel closed.");this.leaveLocal();return}
    const wasDone=this.m.status==="done";
    this.m=m;this.players=ps||[];
    const mine=this.players.find(p=>p.user_id===live.me.id);
    if(mine&&mine.score!=null) this.locked=true;
    if(m.status==="done"&&!wasDone) this.showResult();
    this.render();this.tick();
  },
  showResult(){
    const mine=this.players.find(p=>p.user_id===live.me.id)||{};
    const scored=this.players.filter(p=>p.score!=null).sort((a,b)=>b.score-a.score);
    const top=scored[0];
    let msg;
    if(scored.length<2) msg="not enough people locked in. no elo change.";
    else if(mine.score==null) msg=`you didn't lock in. ${mine.elo_delta>=0?"+":""}${mine.elo_delta||0} elo.`;
    else if(mine.won) msg=(scored.filter(p=>p.won).length>1?`tie at ${mine.score}. shared w.`:`you mogged the lobby with ${mine.score}.`)+` +${mine.elo_delta} elo, +100 xp.`;
    else msg=`got mogged. ${top.profiles.username} hit ${top.score}, you hit ${mine.score}. ${mine.elo_delta} elo, +25 xp.`;
    this.result={won:!!mine.won,msg};
    live.refreshMe();live.loadLadder();
    toast(mine.won?"w. +100 xp":"l. run it back");
  },
  render(){
    this.renderTiles();
    $('arena').hidden=this.m.status==="done";
    if(this.m.status==="done") this.renderReport(); else $('duelReport').hidden=true;
    const box=$('players');box.innerHTML="";
    const st=this.m.status;
    this.players.forEach(p=>{
      const row=document.createElement('div');row.className="player"+(st==="done"&&p.won?" win":"");
      row.innerHTML='<span class="av"></span><div class="nm"></div><div class="st"></div>';
      const nm=row.querySelector('.nm');nm.textContent=p.profiles.username+(p.user_id===live.me.id?" (you)":"");
      const sm=document.createElement('small');sm.textContent=p.profiles.elo+" elo";nm.appendChild(sm);
      let s="ready";
      if(st==="live") s=p.score!=null?(p.user_id===live.me.id?`locked in · ${p.score}`:"locked in"):"scanning…";
      if(st==="done") s=p.score!=null?`${p.won?"win · ":""}${p.score}  ${p.elo_delta>=0?"+":""}${p.elo_delta}`:`no scan  ${p.elo_delta>=0?"+":""}${p.elo_delta||0}`;
      row.querySelector('.st').textContent=s;
      box.appendChild(row);
    });
    if(st==="waiting"&&this.players.length<2){
      const g=document.createElement('div');g.className="player ghostrow";
      g.innerHTML='<span class="av"></span><div class="nm">waiting for an opponent…</div><div class="st"></div>';box.appendChild(g);
    }
  },
  tick(){
    if(!this.m) return;
    const m=this.m,now=live.now(),n=this.players.length;
    const start=m.start_at?new Date(m.start_at).getTime():0,end=m.end_at?new Date(m.end_at).getTime():0;
    const waiting=m.status==="waiting"&&n<2;
    $('clock').hidden=waiting;
    for(const pid in this.peers) if(Date.now()-this.peers[pid].t>4000&&Date.now()-this.peers[pid].t<4400) this.updateTile(pid);
    $('startRound').hidden=m.status!=="waiting";$('startRound').disabled=n<2;
    $('lockIn').hidden=m.status!=="live";$('lockIn').disabled=!(m.status==="live"&&now>=start&&now<=end&&!this.locked);
    $('rematch').hidden=m.status!=="done";$('rematch').textContent=m.next_code?"join the rematch":"rematch";
    $('clock').classList.toggle('live',m.status==="live"&&now>=start);
    this.linkStatus();
    if(waiting){const t=Math.floor((Date.now()-this.waitingSince)/1000),pt=$('oppTiles').querySelector('.ptime');if(pt) pt.textContent=`${Math.floor(t/60)}:${String(t%60).padStart(2,"0")}`;return}
    if(m.status==="waiting"){$('clockBig').textContent=n;$('clockTxt').textContent=`${n} players in. anyone can start the round.`}
    else if(m.status==="live"){
      if(now<start){$('clockBig').textContent=Math.ceil((start-now)/1000);$('clockTxt').textContent="get your face in the light…"}
      else if(now<=end){$('clockBig').textContent=Math.ceil((end-now)/1000)+"s";$('clockTxt').textContent=this.locked?"locked in. waiting on everyone else.":"hit lock in when your score looks right."}
      else{$('clockBig').textContent="0s";$('clockTxt').textContent="time. tallying…";
        if(now>end+3500&&Date.now()-this.finishing>1500){this.finishing=Date.now();sb.rpc('finish_match',{p_match:m.id}).then(()=>this.refresh())}}
    }else if(m.status==="done"){
      $('clockBig').textContent=this.result?(this.result.won?"W":"L"):"–";
      $('clockTxt').textContent=this.result?this.result.msg:"round over.";
    }
  }
};
$('quickMatch').addEventListener('click',async()=>duel.enter(await duel.rpc('quick_match')));
$('createDuel').addEventListener('click',async()=>duel.enter(await duel.rpc('create_match',{p_public:false})));
const joinByCode=async()=>{
  const code=$('joinCode').value.trim().toLowerCase();
  if(!/^[a-z0-9]{4}$/.test(code)){toast("codes are 4 letters or numbers.");return}
  duel.enter(await duel.rpc('join_match',{p_code:code}));
};
$('joinDuel').addEventListener('click',joinByCode);
$('joinCode').addEventListener('keydown',e=>{if(e.key==="Enter") joinByCode()});
$('startRound').addEventListener('click',async()=>{const m=await duel.rpc('start_match',{p_match:duel.m.id});if(m){duel.m=m;duel.tick()}});
$('leaveDuel').addEventListener('click',async()=>{if(duel.m) await sb.rpc('leave_match',{p_match:duel.m.id});duel.leaveLocal()});
$('rematch').addEventListener('click',async()=>duel.enter(await duel.rpc('rematch',{p_match:duel.m.id})));
$('copyCode').addEventListener('click',()=>{
  const t=`face card duel code: ${duel.m?duel.m.code:""}`;
  try{navigator.clipboard.writeText(t).then(()=>toast("code copied. send it."),()=>toast("code: "+duel.m.code))}catch(e){toast("code: "+duel.m.code)}
});
$('lockIn').addEventListener('click',async()=>{
  if(!duel.m||duel.locked) return;
  $('lockIn').disabled=true;
  const r=await runScan();
  if(!r){duel.tick();return}
  const m=await duel.rpc('submit_score',{p_match:duel.m.id,p_score:r.total});
  if(!m){duel.tick();return}
  duel.locked=true;duel.myScan=r;duel.myFinal=photoURL;
  if(duel.chan&&duel.chanReady&&photoURL) duel.chan.send({type:'broadcast',event:'final',payload:{pid:live.me.id,img:photoURL}});
  state.last={...r,zs:null,photo:false,fromPhoto:true};save();
  renderResult(r,false);$('srcBadge').textContent="duel scan";
  toast("locked in: "+r.total);
  duel.refresh();
});
async function resumeDuel(){
  let id=null;try{id=localStorage.getItem('fc_match')}catch(e){}
  if(!id||!live.me||duel.m) return;
  const {data:m}=await sb.from('matches').select('*').eq('id',id).maybeSingle();
  if(!m||m.status==="done"){try{localStorage.removeItem('fc_match')}catch(e){}return}
  const {data:p}=await sb.from('match_players').select('user_id').eq('match_id',id).eq('user_id',live.me.id).maybeSingle();
  if(p) duel.enter(m);
}

/* ================= views ================= */
const VIEWS=["home","login","solo","duel","routine"],GATED=["home","solo","duel","routine"];
let pendingView=null;
function show(v){
  if(!VIEWS.includes(v)) v="home";
  if(GATED.includes(v)&&!live.me){pendingView=v;v="login"}
  VIEWS.forEach(k=>{$('view-'+k).hidden=k!==v});
  document.querySelectorAll('.nav a').forEach(a=>{if(a.dataset.v===v) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current')});
  if(v==="solo") cam.attach("solo"); else if(v==="duel"){cam.attach("duel");resumeDuel()} else cam.stop();
  if(v==="duel"&&sb&&live.me) live.loadLadder();
  if(v==="login") setTimeout(()=>{try{$('authUser').focus()}catch(e){}},50);
  window.scrollTo(0,0);
}
function route(){show(location.hash.slice(1)||"home")}
$('logoutBtn').title="log out of this device";
window.addEventListener('hashchange',route);

/* scroll reveal fallback for browsers without CSS scroll timelines */
(function(){
  if(window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  if(window.CSS&&CSS.supports&&CSS.supports('animation-timeline','view()')) return;
  if(!('IntersectionObserver' in window)) return;
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');e.target.classList.remove('pre');io.unobserve(e.target)}}),{threshold:.15});
  const arm=()=>document.querySelectorAll('#view-home .reveal').forEach(el=>{
    if(el.classList.contains('in')) return;
    if(el.getBoundingClientRect().top>innerHeight*.9){
      el.classList.add('pre');
      const par=el.parentElement;el.style.transitionDelay=(/signs|ranks|steps/.test(par.className)?[...par.children].indexOf(el)*60:0)+'ms';
      requestAnimationFrame(()=>el.classList.add('in'));io.observe(el)}
  });
  window.addEventListener('hashchange',()=>setTimeout(arm,30));arm();
})();

renderHUD();renderEmpty();setAccount();show("login");
live.init();
})();
