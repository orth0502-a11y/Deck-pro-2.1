const $=x=>document.getElementById(x),F=x=>(+x).toFixed(3),E=1e-9;let SOL=[];
function V(){return{b:+$("bottom").value,l:+$("leftH").value,t:+$("top").value,d:+$("diag").value,r:+$("rightH").value,BL:+$("BL").value,BW:+$("BW").value/100,G:+$("G").value/1000,K:+$("K").value/1000,MIN:+$("MIN").value/100}}
function geometry(v){
 let dx=v.b-v.t,dy=v.l-v.r,calc=Math.hypot(dx,dy),err=Math.abs(calc-v.d);
 return{dx,dy,calc,err,ok:err<=.03}
}
function rows(v){
 let pitch=v.BW+v.G,n=Math.ceil((v.l+v.G)/pitch),a=[];
 for(let i=0;i<n;i++){
  let y=Math.min(i*pitch,v.l),len;
  if(y<=v.r+E) len=v.b;
  else {let u=(y-v.r)/(v.l-v.r);len=v.b-u*(v.b-v.t)}
  a.push({row:i+1,y,len:+Math.max(v.t,len).toFixed(3)})
 }
 return a
}
function split(r,v,mode){
 if(r.len<=v.BL+E)return[{len:r.len}];
 let n=Math.ceil(r.len/v.BL),a=[];
 if(mode==="balanced"){let x=r.len/n;for(let i=0;i<n;i++)a.push({len:+x.toFixed(3)})}
 else {let rem=r.len;while(rem>v.BL+E){a.push({len:v.BL});rem-=v.BL}a.push({len:+rem.toFixed(3)});if(a.some(x=>x.len<v.MIN-E))return split(r,v,"balanced")}
 return a
}
function pack(ps,v){let bins=[];[...ps].sort((a,b)=>b.len-a.len).forEach(p=>{let bi=-1,best=1e9;bins.forEach((b,i)=>{let used=b.reduce((s,x)=>s+x.len,0)+Math.max(0,b.length-1)*v.K,rem=v.BL-used-(b.length?v.K:0)-p.len;if(rem>=-E&&rem<best){best=rem;bi=i}});bi<0?bins.push([p]):bins[bi].push(p)});return bins}
function make(rs,v,mode){
 let ps=[],rr=[];rs.forEach(r=>{let parts=split(r,v,mode).map((x,i)=>({row:r.row,label:`${r.row}${String.fromCharCode(65+i)}`,len:x.len}));ps.push(...parts);rr.push({...r,ps:parts})});
 let bins=pack(ps,v),total=rs.reduce((s,x)=>s+x.len,0),kerf=bins.reduce((s,b)=>s+Math.max(0,b.length-1)*v.K,0),offs=bins.map(b=>v.BL-b.reduce((s,x)=>s+x.len,0)-Math.max(0,b.length-1)*v.K);
 return{rr,ps,bins,total,util:100*total/(bins.length*v.BL),rem:bins.length*v.BL-total-kerf,use:offs.filter(x=>x>=v.MIN).reduce((s,x)=>s+x,0),waste:offs.filter(x=>x<v.MIN).reduce((s,x)=>s+x,0)}
}
function shapeSVG(v){
 let W=640,H=280,p=20,sx=(W-2*p)/v.b,sy=(H-2*p)/v.l;
 let P=[[0,0],[v.b,0],[v.b,v.r],[v.t,v.l],[0,v.l]].map(([x,y])=>`${p+x*sx},${H-p-y*sy}`).join(" ");
 return `<svg class="shape" viewBox="0 0 ${W} ${H}"><polygon points="${P}" fill="none" stroke="black" stroke-width="3"/></svg>`
}
function full(q,v){
 let max=Math.max(...q.rr.map(r=>r.len)),h='<h3>שרטוט החיפוי</h3><div class="deck">';
 q.rr.slice().reverse().forEach(r=>{h+=`<div class="row" style="width:${100*r.len/max}%">${r.ps.map(p=>`<div class="piece" style="width:${100*p.len/r.len}%">${p.label}</div>`).join("")}</div>`});
 h+='</div><h3>אורכי השורות</h3><p>'+q.rr.map(r=>`${r.row}: ${F(r.len)}`).join(" · ")+'</p><h3>תוכנית חיתוך</h3>';
 q.bins.forEach((b,j)=>{let kerf=Math.max(0,b.length-1)*v.K,rem=v.BL-b.reduce((s,x)=>s+x.len,0)-kerf;h+=`<b>לוח ${j+1}</b><div class="stock">${b.map(x=>`<div class="sp" style="width:${100*x.len/v.BL}%">${x.label} ${F(x.len)}</div>`).join("")}</div><small>${b.map(x=>`${F(x.len)} → ${x.label}`).join(" | ")} · שארית ${F(Math.max(0,rem))}</small><br>`});
 return h
}
function render(){
 let v=V(),g=geometry(v),rs=rows(v);
 $("shapeOut").innerHTML=`<div class="card"><h2>בדיקת הצורה</h2>${shapeSVG(v)}<p>אלכסון שהוזן: <b>${F(v.d)}</b> מ׳ · אלכסון לפי שאר המידות: <b>${F(g.calc)}</b> מ׳ · ${g.ok?"✓ המידות תואמות לניסוי":"⚠ יש פער במידות — בדוק את המדידה"}</p><p>מספר שורות: <b>${rs.length}</b> · שורה תחתונה: <b>${F(rs[0].len)}</b> מ׳ · שורה עליונה: <b>${F(rs.at(-1).len)}</b> מ׳.</p></div>`;
 let raw=[make(rs,v,"balanced"),make(rs,v,"end")],seen=new Set();SOL=raw.filter(q=>{let k=q.rr.map(r=>r.ps.map(p=>F(p.len)).join("+")).join("|")+"#"+q.bins.length;if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>a.bins.length-b.bins.length||b.util-a.util);
 let h='<div class="card"><h2>חלופות חיפוי</h2><p class="muted">לחץ על חלופה לפירוט המלא.</p></div>';
 SOL.forEach((q,i)=>h+=`<div class="card solution" onclick="tog(${i})"><h2>חלופה ${i+1}</h2><span class="tag">${q.bins.length} לוחות</span><span class="tag">${q.util.toFixed(2)}% ניצול</span><span class="tag">שארית ${F(Math.max(0,q.rem))} מ׳</span><p><b>שארית שימושית:</b> ${F(q.use)} מ׳ · <b>שארית קצרה:</b> ${F(q.waste)} מ׳</p><div id="d${i}" class="hidden" onclick="event.stopPropagation()">${full(q,v)}</div></div>`);
 $("out").innerHTML=h
}
window.tog=i=>$("d"+i).classList.toggle("hidden");$("go").onclick=render;render();