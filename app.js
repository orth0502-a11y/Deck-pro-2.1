const $=x=>document.getElementById(x),F=x=>(+x).toFixed(3),E=1e-9;let SOL=[];
function V(){return{b:+$("bottom").value,l:+$("leftH").value,t:+$("top").value,d:+$("diag").value,r:+$("rightH").value,BL:+$("BL").value,BW:+$("BW").value/100,G:+$("G").value/1000,K:+$("K").value/1000,MIN:+$("MIN").value/100,EDGE:+$("EDGE").value/100,MAX:+$("MAX").value}}
function geometry(v){let dx=v.b-v.t,dy=v.l-v.r,calc=Math.hypot(dx,dy);return{calc,ok:Math.abs(calc-v.d)<=.03}}
function rows(v){let pitch=v.BW+v.G,n=Math.ceil((v.l+v.G)/pitch),a=[];for(let i=0;i<n;i++){let y=Math.min(i*pitch,v.l),len;if(y<=v.r+E)len=v.b;else{let u=(y-v.r)/(v.l-v.r);len=v.b-u*(v.b-v.t)}a.push({row:i+1,y,len:+Math.max(v.t,len).toFixed(3)})}return a}
function cutsForRow(r,lines,type,v){
 let subset=lines.filter((_,i)=>(type==="A"?i%2===0:i%2===1)).filter(x=>x<r.len-v.EDGE+E && x>v.EDGE-E);
 let pts=[0,...subset,r.len],parts=[];for(let i=1;i<pts.length;i++)parts.push(+(pts[i]-pts[i-1]).toFixed(3));
 if(parts.some(x=>x<v.MIN-E||x>v.BL+E))return null;return{parts,used:subset}
}
function pack(ps,v){let bins=[];[...ps].sort((a,b)=>b.len-a.len).forEach(p=>{let bi=-1,best=1e9;bins.forEach((b,i)=>{let used=b.reduce((s,x)=>s+x.len,0)+Math.max(0,b.length-1)*v.K,rem=v.BL-used-(b.length?v.K:0)-p.len;if(rem>=-E&&rem<best){best=rem;bi=i}});bi<0?bins.push([p]):bins[bi].push(p)});return bins}
function build(rs,lines,v){
 let all=[],rr=[];for(let i=0;i<rs.length;i++){let type=i%2===0?"A":"B",c=cutsForRow(rs[i],lines,type,v);if(!c)return null;let ps=c.parts.map((len,j)=>({row:i+1,label:`${i+1}${String.fromCharCode(65+j)}`,len}));all.push(...ps);rr.push({...rs[i],type,ps,used:c.used})}
 let bins=pack(all,v),total=rs.reduce((s,x)=>s+x.len,0),kerf=bins.reduce((s,b)=>s+Math.max(0,b.length-1)*v.K,0),offs=bins.map(b=>v.BL-b.reduce((s,x)=>s+x.len,0)-Math.max(0,b.length-1)*v.K);
 return{lines,rr,bins,total,util:100*total/(bins.length*v.BL),rem:bins.length*v.BL-total-kerf,use:offs.filter(x=>x>=v.MIN).reduce((s,x)=>s+x,0),waste:offs.filter(x=>x<v.MIN).reduce((s,x)=>s+x,0)}
}
function candidates(rs,v){
 let out=[];
 // Zero-line is legal only if every row fits one stock board.
 if(rs.every(r=>r.len<=v.BL+E)){let q=build(rs,[],v);if(q)out.push(q)}
 // Two-and-weave families: master lines alternate A/B. Search 2..MAX.
 for(let n=2;n<=v.MAX;n++){
   for(let edge=v.EDGE;edge<=v.EDGE+.6+E;edge+=.10){
     let usable=v.b-2*edge;if(usable<=0)continue;
     let base=Array.from({length:n},(_,i)=>edge+i*usable/(n-1));
     for(let d=-.30;d<=.3001;d+=.10){
       let L=base.map((x,i)=>+(x+(i>0&&i<n-1?d*(i%2?1:-1):0)).toFixed(2));
       if(L[0]<v.EDGE-E||v.b-L.at(-1)<v.EDGE-E||L.slice(1).some((x,i)=>x<=L[i]+E))continue;
       let q=build(rs,L,v);if(q)out.push(q)
     }
   }
 }
 let seen=new Set();return out.filter(q=>{let k=q.lines.map(F).join("|")+"#"+q.rr.map(r=>r.ps.map(p=>F(p.len)).join("+")).join("|")+"#"+q.bins.length;if(seen.has(k))return false;seen.add(k);return true})
}
function choose(P){
 let fam=new Map();P.forEach(q=>{let n=q.lines.length;if(!fam.has(n))fam.set(n,[]);fam.get(n).push(q)});
 let out=[];for(let [n,a] of [...fam.entries()].sort((a,b)=>a[0]-b[0])){a.sort((x,y)=>x.bins.length-y.bins.length||y.util-x.util);out.push(a[0]);let balanced=[...a].sort((x,y)=>spacing(x)-spacing(y)||x.bins.length-y.bins.length)[0];if(balanced!==a[0])out.push(balanced)}
 let seen=new Set();return out.filter(q=>{let k=q.lines.map(F).join("|")+"#"+q.bins.length;if(seen.has(k))return false;seen.add(k);return true}).slice(0,14)
}
function spacing(q){if(!q.lines.length)return 0;let g=[q.lines[0],...q.lines.slice(1).map((x,i)=>x-q.lines[i])],m=g.reduce((s,x)=>s+x,0)/g.length;return g.reduce((s,x)=>s+(x-m)**2,0)}
function shapeSVG(v){let W=640,H=280,p=20,sx=(W-2*p)/v.b,sy=(H-2*p)/v.l,P=[[0,0],[v.b,0],[v.b,v.r],[v.t,v.l],[0,v.l]].map(([x,y])=>`${p+x*sx},${H-p-y*sy}`).join(" ");return `<svg class="shape" viewBox="0 0 ${W} ${H}"><polygon points="${P}" fill="none" stroke="black" stroke-width="3"/></svg>`}
function full(q,v){let max=v.b,h='<h3>שרטוט החיפוי</h3><div class="deck">';q.rr.slice().reverse().forEach(r=>{h+=`<div class="row" style="width:${100*r.len/max}%">${r.ps.map(p=>`<div class="piece" style="width:${100*p.len/r.len}%">${r.type}${p.label}</div>`).join("")}</div>`});h+='</div><h3>אורכי שורות וחיתוכים</h3><p>'+q.rr.map(r=>`שורה ${r.row} (${r.type}): ${r.ps.map(p=>F(p.len)).join(" + ")}`).join(" · ")+'</p><h3>תוכנית חיתוך</h3>';q.bins.forEach((b,j)=>{let kerf=Math.max(0,b.length-1)*v.K,rem=v.BL-b.reduce((s,x)=>s+x.len,0)-kerf;h+=`<b>לוח ${j+1}</b><div class="stock">${b.map(x=>`<div class="sp" style="width:${100*x.len/v.BL}%">${x.label} ${F(x.len)}</div>`).join("")}</div><small>${b.map(x=>`${F(x.len)} → ${x.label}`).join(" | ")} · שארית ${F(Math.max(0,rem))}</small><br>`});return h}
function render(){
 let v=V(),g=geometry(v),rs=rows(v),P=candidates(rs,v);SOL=choose(P);
 $("shapeOut").innerHTML=`<div class="card"><h2>בדיקת הצורה</h2>${shapeSVG(v)}<p>אלכסון: <b>${F(v.d)}</b> מ׳ · בדיקה לפי יתר המידות: <b>${F(g.calc)}</b> מ׳ · ${g.ok?"✓ תקין":"⚠ בדוק מידות"}</p><p><b>${rs.length}</b> שורות חיפוי. שתי וערב מופעל כחוק קבוע.</p></div>`;
 let h='<div class="card"><h2>חלופות חיפוי</h2><p class="muted">כל חלופה שומרת על קווי חיבור ישרים ועל שתי וערב A/B. לחץ לפירוט.</p></div>';
 SOL.forEach((q,i)=>h+=`<div class="card solution" onclick="tog(${i})"><h2>חלופה ${i+1} — ${q.lines.length? q.lines.length+" קווי חיבור":"ללא חיבורים"}</h2><span class="tag">${q.bins.length} לוחות</span><span class="tag">${q.util.toFixed(2)}% ניצול</span><span class="tag">${q.lines.length} קווים</span><span class="tag">שארית ${F(Math.max(0,q.rem))} מ׳</span><p><b>מיקומי קווי החיבור:</b> ${q.lines.length?q.lines.map(F).join(" / "):"אין"}<br><b>שארית שימושית:</b> ${F(q.use)} מ׳ · <b>שארית קצרה:</b> ${F(q.waste)} מ׳</p><div id="d${i}" class="hidden" onclick="event.stopPropagation()">${full(q,v)}</div></div>`);
 $("out").innerHTML=h
}
window.tog=i=>$("d"+i).classList.toggle("hidden");$("go").onclick=render;render();