const $=x=>document.getElementById(x),F=x=>(+x).toFixed(3),E=1e-9;let SOL=[],DEBUG={};
function V(){return{b:+$("bottom").value,l:+$("leftH").value,t:+$("top").value,d:+$("diag").value,r:+$("rightH").value,BL:+$("BL").value,BW:+$("BW").value/100,G:+$("G").value/1000,K:+$("K").value/1000,MIN:+$("MIN").value/100,EDGE:+$("EDGE").value/100,MAX:+$("MAX").value}}
function geometry(v){let calc=Math.hypot(v.b-v.t,v.l-v.r);return{calc,ok:Math.abs(calc-v.d)<=.03}}
function rows(v){let pitch=v.BW+v.G,n=Math.ceil((v.l+v.G)/pitch),a=[];for(let i=0;i<n;i++){let y=Math.min(i*pitch,v.l),len;if(y<=v.r+E)len=v.b;else{let u=(y-v.r)/(v.l-v.r);len=v.b-u*(v.b-v.t)}a.push({row:i+1,y,len:+Math.max(v.t,len).toFixed(3)})}return a}
function rowCuts(r,lines,type,v){
 // A uses even-index master lines; B uses odd-index master lines.
 // A master line is simply ignored once the diagonal has shortened that row before it.
 let subset=lines.filter((_,i)=>(type==="A"?i%2===0:i%2===1))
   .filter(x=>x>v.EDGE-E && x<r.len-v.EDGE+E);
 let pts=[0,...subset,r.len],parts=[];for(let i=1;i<pts.length;i++)parts.push(+(pts[i]-pts[i-1]).toFixed(3));
 if(parts.some(x=>x>v.BL+E))return{ok:false,why:"long"};
 if(parts.some(x=>x<v.MIN-E))return{ok:false,why:"short"};
 return{ok:true,parts,used:subset}
}
function pack(ps,v){let bins=[];[...ps].sort((a,b)=>b.len-a.len).forEach(p=>{let bi=-1,best=1e9;bins.forEach((b,i)=>{let used=b.reduce((s,x)=>s+x.len,0)+Math.max(0,b.length-1)*v.K,rem=v.BL-used-(b.length?v.K:0)-p.len;if(rem>=-E&&rem<best){best=rem;bi=i}});bi<0?bins.push([p]):bins[bi].push(p)});return bins}
function build(rs,lines,v){
 let ps=[],rr=[],actual=0;for(let i=0;i<rs.length;i++){let type=i%2===0?"A":"B",c=rowCuts(rs[i],lines,type,v);if(!c.ok)return{bad:c.why};actual+=c.used.length;let p=c.parts.map((len,j)=>({row:i+1,label:`${i+1}${String.fromCharCode(65+j)}`,len}));ps.push(...p);rr.push({...rs[i],type,ps:p,used:c.used})}
 let bins=pack(ps,v),total=rs.reduce((s,x)=>s+x.len,0),kerf=bins.reduce((s,b)=>s+Math.max(0,b.length-1)*v.K,0),offs=bins.map(b=>v.BL-b.reduce((s,x)=>s+x.len,0)-Math.max(0,b.length-1)*v.K);
 return{lines,rr,bins,total,actual,util:100*total/(bins.length*v.BL),rem:bins.length*v.BL-total-kerf,use:offs.filter(x=>x>=v.MIN).reduce((s,x)=>s+x,0),waste:offs.filter(x=>x<v.MIN).reduce((s,x)=>s+x,0)}
}
function generateLines(n,v,step){
 let out=[],min=v.EDGE,max=v.b-v.EDGE;if(max<=min)return out;
 // broad independent families + fine shifts around balanced geometry
 let base=Array.from({length:n},(_,i)=>min+(i+1)*(max-min)/(n+1));
 let deltas=step===.1?[-.5,-.3,-.1,0,.1,.3,.5]:[-.12,-.08,-.04,0,.04,.08,.12];
 for(let shift of deltas)for(let skew of deltas){
   let L=base.map((x,i)=>+(x+shift+skew*(i-(n-1)/2)).toFixed(2));
   if(L[0]<min-E||L.at(-1)>max+E||L.slice(1).some((x,i)=>x<=L[i]+.05))continue;out.push(L)
 }
 // edge-anchored candidates help small 2/3-line families
 for(let s=0;s<=.8+E;s+=step){let first=min+s,last=max-s;if(last<=first)continue;out.push(Array.from({length:n},(_,i)=>+(first+i*(last-first)/(n-1)).toFixed(2)))}
 let seen=new Set();return out.filter(L=>{let k=L.join("|");if(seen.has(k))return false;seen.add(k);return true})
}
function candidates(rs,v){
 DEBUG={};let all=[];
 if(rs.every(r=>r.len<=v.BL+E)){let q=build(rs,[],v);if(!q.bad)all.push(q)}
 for(let n=2;n<=v.MAX;n++){
   DEBUG[n]={tested:0,long:0,short:0,legal:0};
   let broad=generateLines(n,v,.1),legal=[];
   for(let L of broad){DEBUG[n].tested++;let q=build(rs,L,v);if(q.bad){DEBUG[n][q.bad]++;continue}DEBUG[n].legal++;legal.push(q);all.push(q)}
   // fine tuning around best broad candidates
   legal.sort((a,b)=>a.bins.length-b.bins.length||b.util-a.util);
   for(let seed of legal.slice(0,6)){for(let d=-.12;d<=.1201;d+=.02){let L=seed.lines.map((x,i)=>+(x+d*((i%2)?1:-1)).toFixed(2));if(L[0]<v.EDGE-E||L.at(-1)>v.b-v.EDGE+E||L.slice(1).some((x,i)=>x<=L[i]+.03))continue;let q=build(rs,L,v);if(!q.bad)all.push(q)}}
 }
 let seen=new Set();return all.filter(q=>{let k=q.lines.map(F).join("|")+"#"+q.rr.map(r=>r.ps.map(p=>F(p.len)).join("+")).join("|")+"#"+q.bins.length;if(seen.has(k))return false;seen.add(k);return true})
}
function balance(q,v){if(!q.lines.length)return 0;let g=[q.lines[0],...q.lines.slice(1).map((x,i)=>x-q.lines[i]),v.b-q.lines.at(-1)],m=g.reduce((s,x)=>s+x,0)/g.length;return g.reduce((s,x)=>s+(x-m)**2,0)}
function choose(P,v){
 let fam=new Map();P.forEach(q=>{let n=q.lines.length;if(!fam.has(n))fam.set(n,[]);fam.get(n).push(q)});let raw=[];
 for(let [n,a] of [...fam.entries()].sort((a,b)=>a[0]-b[0])){raw.push([...a].sort((x,y)=>x.bins.length-y.bins.length||y.util-x.util)[0]);raw.push([...a].sort((x,y)=>balance(x,v)-balance(y,v)||x.bins.length-y.bins.length)[0])}
 let seen=new Set();return raw.filter(Boolean).filter(q=>{let k=q.lines.map(F).join("|")+"#"+q.bins.length;if(seen.has(k))return false;seen.add(k);return true}).slice(0,18)
}
function shapeSVG(v){let W=640,H=280,p=20,sx=(W-2*p)/v.b,sy=(H-2*p)/v.l,P=[[0,0],[v.b,0],[v.b,v.r],[v.t,v.l],[0,v.l]].map(([x,y])=>`${p+x*sx},${H-p-y*sy}`).join(" ");return `<svg class="shape" viewBox="0 0 ${W} ${H}"><polygon points="${P}" fill="none" stroke="black" stroke-width="3"/></svg>`}
function full(q,v){
 let h='<h3>שרטוט החיפוי</h3><div class="deck">';q.rr.slice().reverse().forEach(r=>{h+=`<div class="row" style="width:${100*r.len/v.b}%">${r.ps.map(p=>`<div class="piece" style="width:${100*p.len/r.len}%">${r.type}${p.label}</div>`).join("")}</div>`});h+='</div>';
 h+='<h3>אורכי שורות וחיתוכים</h3><p>'+q.rr.map(r=>`שורה ${r.row} (${r.type}): ${r.ps.map(p=>F(p.len)).join(" + ")}`).join(" · ")+'</p><h3>תוכנית חיתוך</h3>';
 q.bins.forEach((b,j)=>{let kerf=Math.max(0,b.length-1)*v.K,rem=v.BL-b.reduce((s,x)=>s+x.len,0)-kerf;h+=`<b>לוח ${j+1}</b><div class="stock">${b.map(x=>`<div class="sp" style="width:${100*x.len/v.BL}%">${x.label} ${F(x.len)}</div>`).join("")}</div><small>${b.map(x=>`${F(x.len)} → ${x.label}`).join(" | ")} · שארית ${F(Math.max(0,rem))}</small><br>`});return h
}
function render(){
 let v=V(),g=geometry(v),rs=rows(v),P=candidates(rs,v);SOL=choose(P,v);
 $("shapeOut").innerHTML=`<div class="card"><h2>בדיקת הצורה</h2>${shapeSVG(v)}<p>אלכסון שהוזן: <b>${F(v.d)}</b> מ׳ · לפי יתר המידות: <b>${F(g.calc)}</b> מ׳ · ${g.ok?"✓ תקין":"⚠ בדוק מידות"}</p><p><b>${rs.length}</b> שורות · חתיכה מינימלית: <b>${Math.round(v.MIN*100)} ס״מ</b> · שתי וערב מופעל.</p></div>`;
 let h='<div class="card"><h2>חלופות חיפוי</h2><p class="muted">קו חיבור נשאר ישר וקבוע; כשהאלכסון מקצר שורה לפני הקו, אותה שורה פשוט אינה משתמשת בו.</p></div>';
 SOL.forEach((q,i)=>h+=`<div class="card solution" onclick="tog(${i})"><h2>חלופה ${i+1} — ${q.lines.length?q.lines.length+" קווי חיבור":"ללא חיבורים"}</h2><span class="tag">${q.bins.length} לוחות</span><span class="tag">${q.util.toFixed(2)}% ניצול</span><span class="tag">${q.lines.length} קווים</span><span class="tag">${q.actual} חיבורים בפועל</span><span class="tag">שארית ${F(Math.max(0,q.rem))} מ׳</span><p><b>מיקומי הקווים:</b> ${q.lines.length?q.lines.map(F).join(" / "):"אין"}<br><b>שארית שימושית:</b> ${F(q.use)} מ׳ · <b>שארית קצרה:</b> ${F(q.waste)} מ׳</p><div id="d${i}" class="hidden" onclick="event.stopPropagation()">${full(q,v)}</div></div>`);
 if(!SOL.length)h+='<div class="card"><b>לא נמצאה חלופה חוקית בהגדרות הנוכחיות.</b></div>';
 $("out").innerHTML=h
}
window.tog=i=>$("d"+i).classList.toggle("hidden");$("go").onclick=render;render();