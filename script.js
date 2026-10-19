'use strict';
const $=id=>document.getElementById(id),on=(i,e,f)=>$(i).addEventListener(e,f),V=(x,y,z)=>new THREE.Vector3(x,y,z),clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
if(typeof THREE==='undefined'){const e=$('err');e.hidden=false;e.textContent='Three.js の読み込みに失敗しました。ネットワーク接続、または cdnjs.cloudflare.com へのアクセス制限を確認してください。';throw new Error('THREE missing');}
const EPS=1e-9;
/* ================= 数学：凸多面体＝多角形(面)の配列 ================= */
// 面の法線(Newell法)
function faceNormal(f){const n=V(0,0,0);f.forEach((p,i)=>{const q=f[(i+1)%f.length];n.x+=(p.y-q.y)*(p.z+q.z);n.y+=(p.z-q.z)*(p.x+q.x);n.z+=(p.x-q.x)*(p.y+q.y)});return n.normalize();}
// 全ての面の法線が外向きになるよう頂点順を揃える
function orient(F){const o=V(0,0,0);let k=0;F.forEach(f=>f.forEach(p=>{o.add(p);k++}));o.divideScalar(k);
 return F.map(f=>{const g=V(0,0,0);f.forEach(p=>g.add(p));g.divideScalar(f.length);const r=faceNormal(f).dot(g.sub(o))<0?f.slice().reverse():f.slice();r.cap=f.cap;r.col=f.col;return r;});}
// 体積：重心を基準にした符号付き四面体の総和
function volume(F){const o=V(0,0,0);let k=0;F.forEach(f=>f.forEach(p=>{o.add(p);k++}));o.divideScalar(k);let v=0;
 F.forEach(f=>{for(let i=1;i<f.length-1;i++){const a=f[0].clone().sub(o),b=f[i].clone().sub(o),c=f[i+1].clone().sub(o);v+=a.dot(b.cross(c))/6}});return Math.abs(v);}
// 直方体・四角錐の面を作る(底面中心が原点、y上向き)
function boxFaces(w,h,d){const x=w/2,z=d/2,p=[V(-x,0,-z),V(x,0,-z),V(x,0,z),V(-x,0,z),V(-x,h,-z),V(x,h,-z),V(x,h,z),V(-x,h,z)];
 return [[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]].map(f=>f.map(i=>p[i].clone()));}
function pyrFaces(w,h,d){const x=w/2,z=d/2,b=[V(-x,0,-z),V(x,0,-z),V(x,0,z),V(-x,0,z)],a=V(0,h,0);
 return [b.map(p=>p.clone())].concat(b.map((p,i)=>[p.clone(),b[(i+1)%4].clone(),a.clone()]));}
// 平面 n·x=c で凸多面体を2つに分割。返値{a:上側,b:下側,cap:切断面多角形}／交わらなければnull
function clipSolid(F,n,c){const f=p=>n.dot(p)-c,side=[[],[]];let pts=[];
 for(const poly of F){const s=[[],[]];
  for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=f(a),db=f(b);
   if(da>=-EPS)s[0].push(a);if(da<=EPS)s[1].push(a);
   if(Math.abs(da)<=EPS)pts.push(a);
   else if(da*db<0&&Math.abs(db)>EPS){const q=a.clone().lerp(b,da/(da-db));s[0].push(q);s[1].push(q);pts.push(q)}}
  s.forEach((x,k)=>{if(x.length>=3){const y=x.slice();y.cap=poly.cap;y.col=poly.col;side[k].push(y)}});}
 if(side[0].length<1||side[1].length<1)return null;
 const u=[];pts.forEach(p=>{if(!u.some(q=>q.distanceTo(p)<1e-7))u.push(p.clone())});if(u.length<3)return null;
 const g=V(0,0,0);u.forEach(p=>g.add(p));g.divideScalar(u.length);const e1=u[0].clone().sub(g).normalize(),e2=n.clone().cross(e1);
 u.sort((p,q)=>Math.atan2(p.clone().sub(g).dot(e2),p.clone().sub(g).dot(e1))-Math.atan2(q.clone().sub(g).dot(e2),q.clone().sub(g).dot(e1)));
 const cap=u;cap.cap=true;cap.col=0xff9f43;
 return{a:orient(side[0].concat([cap])),b:orient(side[1].concat([cap])),cap};}
/* ================= 3D基盤 ================= */
const scene=new THREE.Scene();scene.background=new THREE.Color(0xf4f6f8);
const cv=$('c'),renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true}),cam=new THREE.PerspectiveCamera(45,1,.1,200);
scene.add(new THREE.AmbientLight(0xffffff,.75));const dl=new THREE.DirectionalLight(0xffffff,.55);dl.position.set(5,10,7);scene.add(dl);
const gA=new THREE.Group(),gB=new THREE.Group(),gT=new THREE.Group(),gP=new THREE.Group();scene.add(gA,gB,gT,gP);
const T=V(0,1.5,0),HOME={th:.7,ph:1.05,r:14};let cs={...HOME};
function placeCam(){cam.position.set(T.x+cs.r*Math.sin(cs.ph)*Math.sin(cs.th),T.y+cs.r*Math.cos(cs.ph),T.z+cs.r*Math.sin(cs.ph)*Math.cos(cs.th));cam.lookAt(T);}
function resize(){const r=$('view').getBoundingClientRect();renderer.setSize(r.width,r.height,false);cam.aspect=r.width/Math.max(r.height,1);cam.updateProjectionMatrix();}
new ResizeObserver(resize).observe($('view'));resize();placeCam();
(function loop(){requestAnimationFrame(loop);renderer.render(scene,cam)})();
// グループ内オブジェクトを破棄(メモリ増加防止)
function clearG(g){g.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose()});while(g.children.length)g.remove(g.children[0]);}
// 面配列から色付きメッシュ+輪郭線を生成
function makeSolid(s,opacity,hideCap,hi){const pos=[],col=[],tri=[];
 s.faces.forEach((f,fi)=>{if(f.cap&&hideCap)return;const c=new THREE.Color(f.col||s.color);
  for(let k=1;k<f.length-1;k++){[f[0],f[k],f[k+1]].forEach(p=>{pos.push(p.x,p.y,p.z);col.push(c.r,c.g,c.b)});tri.push(fi)}});
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.computeVertexNormals();
 const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity}));
 const ep=[];s.faces.forEach(f=>f.forEach((p,k)=>{const q=f[(k+1)%f.length];ep.push(p.x,p.y,p.z,q.x,q.y,q.z)}));
 const eg=new THREE.BufferGeometry();eg.setAttribute('position',new THREE.Float32BufferAttribute(ep,3));
 m.add(new THREE.LineSegments(eg,new THREE.LineBasicMaterial({color:hi?0xe11d48:0x1f2937})));s.mesh=m;s.tri=tri;return m;}
const lineOf=(pts,color)=>{const g=new THREE.BufferGeometry().setFromPoints(pts);return new THREE.Line(g,new THREE.LineBasicMaterial({color}))};
/* ================= モードA：ピラミッド ================= */
let lock='h',stepN=0;const P={w:$('w'),d:$('d'),h:$('h'),t:$('t')};let H=3,TH=45;
// 入力値の整合：高さ指定なら傾斜角を、傾斜角指定なら高さを計算(tanθ=h÷(d/2))
function syncA(){const w=+P.w.value,d=+P.d.value;
 if(lock==='h'){H=+P.h.value;TH=Math.atan2(H,d/2)*180/Math.PI;P.t.value=TH}else{TH=+P.t.value;H=d/2*Math.tan(TH*Math.PI/180);P.h.value=H}
 P.h.disabled=lock!=='h';P.t.disabled=lock==='h';
 $('ow').value=w.toFixed(1);$('od').value=d.toFixed(1);$('oh').value=H.toFixed(2);$('ot').value=TH.toFixed(1)+'°';
 const s=Math.hypot(H,d/2),A=w*d,Vv=A*H/3,Vw=A*s/3;
 $('res').innerHTML=`底面積 ${w.toFixed(1)}×${d.toFixed(1)} = <b>${A.toFixed(2)}</b><br>垂直な高さ h = <b>${H.toFixed(2)}</b>／斜面の長さ s = ${s.toFixed(2)}<br>体積 V = 底面積×h÷3 = <b>${Vv.toFixed(2)}</b><br><span class="bad">s を高さと誤認すると V' = ${Vw.toFixed(2)}（${(Vw-Vv).toFixed(2)} 大きすぎる）</span>`;
 buildA(w,d,H,TH);showSteps();}
function buildA(w,d,h,t){clearG(gA);const s={faces:orient(pyrFaces(w,h,d)),color:0xb9c6ff};s.faces[0].col=0x7aa2ff;
 const m=makeSolid(s,.35,false,false);gA.add(m);const z=d/2;
 gA.add(lineOf([V(0,0,0),V(0,h,0)],0xe11d48),lineOf([V(0,0,0),V(0,0,z)],0x2563eb),lineOf([V(0,h,0),V(0,0,z)],0xf59e0b));
 const tg=new THREE.BufferGeometry().setFromPoints([V(0,0,0),V(0,h,0),V(0,0,z)]);
 gA.add(new THREE.Mesh(tg,new THREE.MeshBasicMaterial({color:0x34c38f,transparent:true,opacity:.35,side:THREE.DoubleSide})));
 const k=Math.min(.4,h/4,z/4);gA.add(lineOf([V(0,0,k),V(0,k,k),V(0,k,0)],0x1f2937)); // 直角マーク
 const r=Math.min(z,h)*.35,arc=[],tr=t*Math.PI/180;for(let i=0;i<=20;i++){const a=tr*i/20;arc.push(V(0,r*Math.sin(a),z-r*Math.cos(a)))}
 gA.add(lineOf(arc,0x7c3aed)); // θ：辺の中点で、底面(水平距離)と斜面のなす角
}
function showSteps(){const d=+P.d.value,t=TH*Math.PI/180,L=[
 `① 分かっている長さ：水平距離 d/2 = ${(d/2).toFixed(2)}、角 θ = ${TH.toFixed(1)}°（辺の中点で底面と斜面のなす角）`,
 `② 求めたい長さ：垂直な高さ h（赤い線分）`,
 `③ 使う三角比：tanθ = 対辺÷隣辺 = h ÷ (d/2)（θの対辺が h、隣辺が水平距離）`,
 `④ 式：h = (d/2) × tanθ = ${(d/2).toFixed(2)} × tan${TH.toFixed(1)}°`,
 `⑤ 結果：h = ${((d/2)*Math.tan(t)).toFixed(2)}`];
 $('steps').innerHTML=L.slice(0,stepN).map(x=>`<li>${x}</li>`).join('');}
on('calc','click',()=>{stepN=2;showSteps()});on('hint','click',()=>{stepN=Math.max(stepN,3);showSteps()});
on('formula','click',()=>{stepN=Math.max(stepN,4);showSteps()});on('ans','click',()=>{stepN=5;showSteps()});
on('predBtn','click',()=>{const v=parseFloat($('pred').value),w=+P.w.value,d=+P.d.value,real=w*d*H/3;
 $('predOut').textContent=isNaN(v)?'予想の数値を入力してください。':`予想 ${v.toFixed(2)}／計算値 ${real.toFixed(2)}／差 ${(v-real).toFixed(2)}`});
Object.values(P).forEach(e=>e.addEventListener('input',syncA));
on('lockH','change',()=>{lock='h';syncA()});on('lockT','change',()=>{lock='t';syncA()});
/* ================= モードB：切断 ================= */
const COL={orig:0x9aa7b8,A:0x4f8cff,B:0x34c38f},ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
let mode='A',tool='rot',solids=[],hist=[],sel=-1,sepOn=false,lastN=V(0,1,0),lastCut=null,plan=null,pts3=[],showCap=true,rub=null;
const msg=(t,bad)=>{$('planInfo').innerHTML=bad?`<span class="bad">${t}</span>`:t};
// 初期立体を作る
function initSolid(){const k=$('shape').value;const f=k==='cube'?boxFaces(3,3,3):k==='cuboid'?boxFaces(4,2.5,3):pyrFaces(4,3.5,4);
 solids=[{faces:orient(f),color:COL.orig,part:0}];hist=[];sel=-1;sepOn=false;lastCut=null;clearPlan();rebuildB();}
function rebuildB(){clearG(gB);solids.forEach((s,i)=>{const m=makeSolid(s,i===sel?1:.85,!showCap,i===sel);
 m.position.copy(sepOn?lastN.clone().multiplyScalar(.5*s.part):V(0,0,0));gB.add(m)});showB();}
function showB(){const v0=lastCut?lastCut.v0:null;let h=solids.map((s,i)=>`立体${i+1}${i===sel?'(選択中)':''}：体積 ${volume(s.faces).toFixed(3)}`).join('<br>');
 if(lastCut){const c=lastCut,sum=c.vA+c.vB;h+=`<hr>切断前 ${c.v0.toFixed(3)}／A(青) ${c.vA.toFixed(3)}／B(緑) ${c.vB.toFixed(3)}<br>A+B = ${sum.toFixed(3)}、差 ${Math.abs(sum-c.v0).toExponential(1)} ✔<br>切断面：${c.cap.length}角形、辺の長さ ${c.cap.map((p,i)=>p.distanceTo(c.cap[(i+1)%c.cap.length]).toFixed(2)).join(', ')}`}
 $('resB').innerHTML=h;}
// 画面座標→Raycaster→立体表面の点(頂点に近ければスナップ)
function pick(e){const r=cv.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,cam);
 const hs=ray.intersectObjects(solids.map(s=>s.mesh));if(!hs.length)return null;const h=hs[0],s=solids.find(x=>x.mesh===h.object),p=h.point.clone().sub(s.mesh.position);
 for(const f of s.faces)for(const q of f)if(q.distanceTo(p)<.25)p.copy(q);return{s,fi:s.tri[h.faceIndex],p};}
function mark(p){const m=new THREE.Mesh(new THREE.SphereGeometry(.07),new THREE.MeshBasicMaterial({color:0xe11d48}));m.position.copy(p);gT.add(m);}
function clearPlan(){clearG(gT);clearG(gP);plan=null;pts3=[];rub=null;$('cutBtn').disabled=true;}
// 切断面のプレビュー(半透明の平面と切断多角形)
function showPlan(s,n,c,label){const r=clipSolid(s.faces,n,c);clearG(gP);
 if(!r){plan=null;$('cutBtn').disabled=true;return msg('この平面は立体と交わりません（切断面が作れません）。',1)}
 const q=new THREE.Mesh(new THREE.PlaneGeometry(9,9),new THREE.MeshBasicMaterial({color:0xf59e0b,transparent:true,opacity:.2,side:THREE.DoubleSide}));
 q.quaternion.setFromUnitVectors(V(0,0,1),n);q.position.copy(n).multiplyScalar(c);gP.add(q);
 const g=new THREE.BufferGeometry().setFromPoints(r.cap.flatMap((p,i,a)=>i>1?[a[0],a[i-1],p]:[]));
 gP.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xff9f43,transparent:true,opacity:.7,side:THREE.DoubleSide})));
 plan={s,n,c};$('cutBtn').disabled=false;msg(`${label}　切断面は${r.cap.length}角形。「切断する」で確定します。`);}
// 方法A：線が乗る面を基準に、面の法線方向(奥行き)へ延長した平面 n=(線の方向)×(面の法線)
function finishLine(b){const a=drag.a;if(!a||!b)return msg('始点・終点を立体の表面上に置いてください。',1);
 if(a.s!==b.s||a.fi!==b.fi)return msg('始点と終点は同じ面の上に置いてください。',1);
 const d=b.p.clone().sub(a.p);if(d.length()<.05)return msg('線が短すぎます。',1);
 const n=d.cross(faceNormal(a.s.faces[a.fi])).normalize();showPlan(a.s,n,n.dot(a.p),`基準面：面${a.fi+1}`);}
// 方法B：3点を通る平面
function addPt(h){if(!h)return msg('立体の表面上の点を選んでください。',1);if(pts3.length&&pts3[0].s!==h.s)return msg('3点は同じ立体上で選んでください。',1);
 setSep(false);pts3.push(h);mark(h.p);if(pts3.length<3)return msg(`点 ${pts3.length}/3 を選択しました。`);
 const [p0,p1,p2]=pts3.map(x=>x.p),n=p1.clone().sub(p0).cross(p2.clone().sub(p0));
 if(n.length()<1e-6){msg('3点が一直線上です。選び直してください。',1);clearPlan();return}
 n.normalize();const s=pts3[0].s;showPlan(s,n,n.dot(p0),'3点を通る平面');}
// 切断の確定：2つの閉じた立体へ分割し、体積の和で検証
function doCut(){if(!plan)return;const s=plan.s,r=clipSolid(s.faces,plan.n,plan.c);if(!r)return;
 const v0=volume(s.faces),vA=volume(r.a),vB=volume(r.b);
 if(Math.abs(vA+vB-v0)>1e-6*Math.max(v0,1))return msg(`切断処理の異常を検出（A+B=${(vA+vB).toFixed(4)}、元=${v0.toFixed(4)}）。切断を取り消しました。`,1);
 hist.push({solids:solids.slice(),lastCut,lastN:lastN.clone()});
 solids=solids.filter(x=>x!==s).concat([{faces:r.a,color:COL.A,part:1},{faces:r.b,color:COL.B,part:-1}]);
 lastN=plan.n.clone();lastCut={v0,vA,vB,cap:r.cap};sel=-1;sepOn=false;clearPlan();rebuildB();msg('切断しました。2つの立体に分かれました（体積の和は一致）。');}
function setSep(v){if(sepOn!==v&&(v===false||lastCut)){sepOn=v;rebuildB()}}
on('cutBtn','click',doCut);on('sepBtn','click',()=>{if(!lastCut)return msg('先に切断してください。',1);setSep(!sepOn)});
on('undoBtn','click',()=>{const h=hist.pop();if(!h)return msg('これ以上戻せません。',1);solids=h.solids;lastCut=h.lastCut;lastN=h.lastN;sel=-1;sepOn=false;clearPlan();rebuildB();});
on('capChk','change',e=>{showCap=e.target.checked;rebuildB()});on('shape','change',initSolid);
function setTool(t){tool=t;clearPlan();['Rot','Line','Pts'].forEach(k=>$('t'+k).classList.toggle('on',('t'+k)==={rot:'tRot',line:'tLine',pts:'tPts'}[t]));
 msg({rot:'回転・選択モード：ドラッグで回転、タップで立体を選択。',line:'線を引くモード：立体の面の上でドラッグ（回転は無効）。',pts:'3点モード：立体の頂点・辺・面をタップして3点を選択（ドラッグで回転できます）。'}[t]);helpText();}
on('tRot','click',()=>setTool('rot'));on('tLine','click',()=>setTool('line'));on('tPts','click',()=>setTool('pts'));
/* ================= 入力操作(回転・ズーム・描画) ================= */
const ptr=new Map();let drag=null,pz=0;const d2=()=>{const a=[...ptr.values()];return Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1])||1};
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptr.set(e.pointerId,[e.clientX,e.clientY]);if(ptr.size===2){pz=d2();drag=null;return}
 drag={mv:0,a:null};if(mode==='B'&&tool==='line'){setSep(false);clearPlan();drag.a=pick(e);if(drag.a)mark(drag.a.p);else msg('始点が立体の表面にありません。',1)}});
cv.addEventListener('pointermove',e=>{if(!ptr.has(e.pointerId))return;const o=ptr.get(e.pointerId);ptr.set(e.pointerId,[e.clientX,e.clientY]);
 if(ptr.size===2){const z=d2();cs.r=clamp(cs.r*pz/z,5,40);pz=z;placeCam();return}if(!drag)return;drag.mv+=Math.abs(e.clientX-o[0])+Math.abs(e.clientY-o[1]);
 if(drag.a){const b=pick(e);if(rub){gT.remove(rub);rub.geometry.dispose()}rub=b?lineOf([drag.a.p,b.p],0xe11d48):null;if(rub)gT.add(rub)}
 else{cs.th-=(e.clientX-o[0])*.01;cs.ph=clamp(cs.ph-(e.clientY-o[1])*.01,.1,3.04);placeCam()}});
cv.addEventListener('pointerup',e=>{ptr.delete(e.pointerId);if(!drag)return;
 if(drag.a)finishLine(pick(e));else if(mode==='B'&&drag.mv<6){if(tool==='pts')addPt(pick(e));else if(tool==='rot'){const h=pick(e);sel=h?solids.indexOf(h.s):-1;rebuildB()}}drag=null});
cv.addEventListener('pointercancel',e=>{ptr.delete(e.pointerId);drag=null});
cv.addEventListener('wheel',e=>{e.preventDefault();cs.r=clamp(cs.r*(1+Math.sign(e.deltaY)*.08),5,40);placeCam()},{passive:false});
on('home','click',()=>{cs={...HOME};placeCam()});
on('reset','click',()=>{cs={...HOME};placeCam();if(mode==='A'){P.w.value=4;P.d.value=4;P.h.value=3;P.t.value=45;lock='h';$('lockH').checked=true;stepN=0;$('pred').value='';$('predOut').textContent='';syncA()}else{setTool('rot');initSolid()}});
/* ================= タブ・ミッション ================= */
function helpText(){$('help').textContent=mode==='A'?'ドラッグで回転／ホイール・ピンチで拡大縮小。スライダーで寸法を変えてみよう。':'「切断線を引く」か「3点」を選び、プレビューを確認して「切断する」。';}
function setMode(m){mode=m;$('tabA').classList.toggle('on',m==='A');$('tabB').classList.toggle('on',m==='B');$('pA').hidden=m!=='A';$('pB').hidden=m!=='B';gA.visible=m==='A';gB.visible=gT.visible=gP.visible=m==='B';
 cs={...HOME};placeCam();helpText();if(m==='B'&&!solids.length)initSolid();mi=MS.findIndex(x=>x.m===m);showM();}
on('tabA','click',()=>setMode('A'));on('tabB','click',()=>setMode('B'));
const MS=[{m:'A',q:'【ミッション1】底面の大きさを変えずに、高さを2倍にすると体積はどうなる？',h:'V＝底面積×高さ÷3。底面積は変わりません。',a:'2倍になります（体積は高さに比例）。スライダーで確かめよう。'},
{m:'A',q:'【ミッション2】四角錐の高さと側面の斜めの長さは同じだろうか？',h:'断面の直角三角形で、斜辺はどの線分？',a:'同じではありません。s＝√(h²＋(d/2)²)＞h。体積には s でなく垂直な高さ h を使います。'},
{m:'B',q:'【ミッション3】立方体を斜めに切ると、切断面は必ず四角形になるだろうか？',h:'3点の選び方をいろいろ変えて切ってみよう。',a:'必ずではありません。三角形〜六角形になります。'},
{m:'B',q:'【ミッション4】切断した2つの立体の体積の合計は、切断前とどう関係するだろうか？',h:'切断後の体積表示を見比べよう。',a:'等しくなります（誤差範囲）。切断しても体積の総和は変わりません。'},
{m:'B',q:'【ミッション5】切断面の頂点の高さを求めるには、どの直角三角形に注目すればよいだろうか？',h:'その頂点の真下の底面上の点を考えよう。',a:'頂点・その真下の点・底面上の基準点を結ぶ直角三角形。高さ＝水平距離×tanθ。'}];
let mi=0;function showM(){$('mq').textContent=MS[mi].q;$('mIn').value='';$('mOut').textContent='';}
on('mPred','click',()=>{$('mOut').textContent=$('mIn').value.trim()?'予想を記録しました。操作して確かめよう。':'先に予想を入力してください。'});
on('mHint','click',()=>$('mOut').textContent='ヒント：'+MS[mi].h);on('mAns','click',()=>$('mOut').textContent='結果：'+MS[mi].a);
on('mNext','click',()=>{const l=MS.map((x,i)=>x.m===mode?i:-1).filter(i=>i>=0);mi=l[(l.indexOf(mi)+1)%l.length];showM()});
syncA();setMode('A');
