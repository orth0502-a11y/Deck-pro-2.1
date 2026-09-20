const $=x=>document.getElementById(x),F=x=>(+x).toFixed(3),E=1e-9;
function V(){return{L:+$("L").value,W:+$("W").value,BL:+$("BL").value,BW:+$("BW").value/100,G:+$("G").value/1000,K:+$("K").value/1000,MIN:+$("MIN").value/100,EDGE:+$("EDGE").value/100,MAX:+$("MAX").value,WIDE:$("wide").checked}}
function rows(v){return Math.ceil((v.W+v.G)/(v.BW+v.G))}
function pack(ps,v){let bs=[];[...ps].sort((a,b)=>b.len-a.len).forEach(p=>{let bi=-1,br=1e99;bs.forEach((b,i)=>{let u=b.reduce((s,x)=>s+x.len,0)+Math.max(0,b.length-1)*v.K,rem=v.BL-u-(b.length?v.K:0)-p.len;if(rem>=-E&&rem<br){br=rem;bi=i}});bi<0?bs.push([p]):bs[bi].push(p)});return bs}
function variance(a){let m=a.reduce((s,x)=>s+x,0)/a.length;return a.reduce((s,x)=>s+(x-m)**2,0)/a.length}
function build(lines,v,label){
 let A=lines.filter((_,i)=>i%2===0),B=lines.filter((_,i)=>i%2===1);if(lines.length&&(!A.length||!B.length))return null;
 function ls(c){let p=[0,...c,v.L];return p.slice(1).map((x,i)=>+(x-p[i]).toFixed(3))}
 let LA=lines.length?ls(A):[v.L],LB=lines.length?ls(B):[v.L];if([...LA,...LB].some(x=>x<v.MIN-E||x>v.BL+E))return null;
 let R=rows(v),rs=[],ps=[];for(let r=0;r<R;r++){let Ls=r%2?LB:LA,type=r%2?"B":"A",rp=Ls.map((len,i)=>{let p={row:r+1,label:`${r+1}${String.fromCharCode(65+i)}`,len};ps.push(p);return p});rs.push({type,ps:rp})}
 let bins=pack(ps,v),d=R*v.L,g=lines.length?[lines[0],...lines.slice(1).map((x,i)=>x-lines[i]),v.L-lines.at(-1)]:[v.L];
 return{family:lines.length,label,lines,LA,LB,R,rs,ps,bins,util:100*d/(bins.length*v.BL),gaps:g,visual:variance(g),edge:lines.length?Math.abs(g[0]-g.at(-1)):0}
}
function oneLine(v,x){
 let y=v.L-x,lines=[...new Set([+x.toFixed(3),+y.toFixed(3)])].sort((a,b)=>a-b),LA=[x,v.L-x],LB=[v.L-x,x];
 if([...LA,...LB].some(z=>z<v.MIN-E||z>v.BL+E))return null;let R=rows(v),rs=[],ps=[];
 for(let r=0;r<R;r++){let Ls=r%2?LB:LA,type=r%2?"B":"A",rp=Ls.map((len,i)=>{let p={row:r+1,label:`${r+1}${String.fromCharCode(65+i)}`,len:+len.toFixed(3)};ps.push(p);return p});rs.push({type,ps:rp})}
 let bins=pack(ps,v),d=R*v.L,g=[Math.min(x,y),Math.abs(y-x),Math.min(x,y)].filter(z=>z>E);
 return{family:1,label:"חיבור אחד בכל שורה",lines,LA,LB,R,rs,ps,bins,util:100*d/(bins.length*v.BL),gaps:g,visual:variance(g),edge:0}
}
function candidates(v){
 let all=[];if(v.L<=v.BL+E){let q=build([],v,"ללא חיבורים");if(q)all.push(q)}
 for(let x=v.EDGE;x<=v.L/2+E;x+=.05){let q=oneLine(v,+x.toFixed(2));if(q)all.push(q)}
 for(let n=2;n<=v.MAX;n++){let usable=v.L-2*v.EDGE;if(usable<=0)continue;for(let shift=0;shift<=.6+E;shift+=.10){let first=v.EDGE+shift,last=v.L-v.EDGE-shift;if(last<=first)continue;let base=Array.from({length:n},(_,i)=>first+i*(last-first)/(n-1));for(let d=-.30;d<=.3001;d+=.10){let q=base.map((x,i)=>+(x+(i>0&&i<n-1?d*((i%2)?1:-1):0)).toFixed(2));if(q[0]<v.EDGE-E||v.L-q.at(-1)<v.EDGE-E||q.slice(1).some((x,i)=>x<=q[i]+E))continue;let z=build(q,v,`${n} קווי חיבור`);if(z)all.push(z)}}}
 let seen=new Set();return all.filter(q=>{let k=q.family+"|"+q.lines.map(F).join("|")+"|"+q.LA.map(F).join(",")+"|"+q.LB.map(F).join(",");if(seen.has(k))return false;seen.add(k);return true})
}
function valid(q,v){if(q.rs.some(r=>Math.abs(r.ps.reduce((s,x)=>s+x.len,0)-v.L)>.002))return false;if(q.ps.some(x=>x.len<v.MIN-E||x.len>v.BL+E))return false;if(q.bins.flat().length!==q.ps.length)return false;return q.bins.every(b=>b.reduce((s,x)=>s+x.len,0)+Math.max(0,b.length-1)*v.K<=v.BL+.002)}
function select(P,v){
 let fam=new Map();P.forEach(q=>{if(!fam.has(q.family))fam.set(q.family,[]);fam.get(q.family).push(q)});
 let raw=[];function add(q,r){if(q)raw.push({q,r})}
 for(let [f,a] of [...fam.entries()].sort((a,b)=>a[0]-b[0])){
  add([...a].sort((x,y)=>x.bins.length-y.bins.length||y.util-x.util)[0],"ניצול חומר");
  add([...a].sort((x,y)=>x.visual-y.visual||x.bins.length-y.bins.length)[0],"איזון חזותי");
  add([...a].sort((x,y)=>x.edge-y.edge||x.bins.length-y.bins.length)[0],"פריסת חיבורים");
 }
 add([...P].sort((a,b)=>a.family-b.family||a.bins.length-b.bins.length)[0],"מינימום חיבורים");
 let no=P.find(q=>q.family===0);add(no,"ללא חיבורים");
 let M=new Map();
 raw.forEach(({q,r})=>{let k=q.lines.map(F).join("|")+"#"+q.LA.map(F).join(",")+"#"+q.LB.map(F).join(",")+"#"+q.bins.length;if(!M.has(k))M.set(k,{...q,reasons:new Set()});M.get(k).reasons.add(r)});
 let out=[...M.values()].map(q=>({...q,reason:[...q.reasons].join(" · ")}));
 out.sort((a,b)=>a.family-b.family||a.bins.length-b.bins.length||b.util-a.util||a.visual-b.visual);return out.slice(0,v.WIDE?40:18)
}
function render(){let v=V(),P=candidates(v).filter(q=>valid(q,v)),C=select(P,v),o=$("out"),R=rows(v),d=R*v.L,lb=Math.ceil(d/v.BL);
 let h=`<div class="card"><h2>סיכום החישוב</h2><p><b>${R}</b> שורות חיפוי · <b>${C.length}</b> חלופות שונות להצגה.</p><p>מינימום תיאורטי לפי אורך בלבד: <b>${lb}</b> לוחות.</p>${v.L<=v.BL?'<p>✓ קיימת אפשרות לחיפוי ללא חיבורים והיא נכללת בתוצאות.</p>':''}</div>`;
 C.forEach((q,i)=>{let kerf=q.bins.reduce((s,b)=>s+Math.max(0,b.length-1)*v.K,0),scr=q.bins.length*v.BL-d-kerf,off=q.bins.map(b=>v.BL-b.reduce((s,x)=>s+x.len,0)-Math.max(0,b.length-1)*v.K),useful=off.filter(x=>x>=v.MIN).reduce((s,x)=>s+x,0),waste=off.filter(x=>x<v.MIN).reduce((s,x)=>s+x,0);
 h+=`<div class="card solution"><h2>חלופה ${i+1} — ${q.family===0?"ללא חיבורים":q.family+" קווי חיבור"}</h2><p><b>מתאים במיוחד ל:</b> ${q.reason}</p><span class="tag">${q.bins.length} לוחות</span><span class="tag">${q.util.toFixed(2)}% ניצול</span><span class="tag">${q.family===0?0:q.lines.length} קווים נראים</span><span class="tag">שארית ${F(Math.max(0,scr))} מ׳</span><p><b>מיקומי החיבורים:</b> ${q.lines.length?q.lines.map(F).join(" / "):"אין"}<br><b>שורות A:</b> ${q.LA.map(F).join(" + ")}<br><b>שורות B:</b> ${q.LB.map(F).join(" + ")}</p><p><b>שארית שימושית:</b> ${F(useful)} מ׳ · <b>שארית קצרה:</b> ${F(waste)} מ׳</p><div class="deck">`;
 q.rs.forEach(r=>h+=`<div class="r">${r.ps.map(x=>`<div class="pc" style="width:${100*x.len/v.L}%">${r.type}${x.label}</div>`).join("")}</div>`);
 h+=`</div><details><summary>הצג תוכנית חיתוך</summary>`;q.bins.forEach((b,j)=>{let k=Math.max(0,b.length-1)*v.K,rem=v.BL-b.reduce((s,x)=>s+x.len,0)-k;h+=`<b>לוח ${j+1}</b><div class="stock">${b.map(x=>`<div class="sp" style="width:${100*x.len/v.BL}%">${x.label} ${F(x.len)}</div>`).join("")}</div><small>${b.map(x=>`${F(x.len)} → ${x.label}`).join(" | ")} · חיתוך ${F(k)} · שארית ${F(Math.max(0,rem))}</small><br>`});h+=`</details></div>`});o.innerHTML=h}
$("go").onclick=render;$("wide").onchange=render;render();