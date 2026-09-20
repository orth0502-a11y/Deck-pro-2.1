const $=x=>document.getElementById(x),F=x=>(+x).toFixed(3),E=1e-9;
function V(){return{L:+$("L").value,W:+$("W").value,BL:+$("BL").value,BW:+$("BW").value/100,G:+$("G").value/1000,K:+$("K").value/1000,MIN:+$("MIN").value/100,EDGE:+$("EDGE").value/100,MAX:+$("MAX").value,WIDE:$("wide").checked}}
function rows(v){return Math.ceil((v.W+v.G)/(v.BW+v.G))}
function pack(ps,v){let bs=[];[...ps].sort((a,b)=>b.len-a.len).forEach(p=>{let bi=-1,br=1e99;bs.forEach((b,i)=>{let u=b.reduce((s,x)=>s+x.len,0)+Math.max(0,b.length-1)*v.K,rem=v.BL-u-(b.length?v.K:0)-p.len;if(rem>=-E&&rem<br){br=rem;bi=i}});bi<0?bs.push([p]):bs[bi].push(p)});return bs}
function variance(a){let m=a.reduce((s,x)=>s+x,0)/a.length;return a.reduce((s,x)=>s+(x-m)**2,0)/a.length}
function build(lines,v,label){
 let A=lines.filter((_,i)=>i%2===0),B=lines.filter((_,i)=>i%2===1);
 if(lines.length && (!A.length||!B.length)) return null; // one master line cannot alternate A/B meaningfully; handled separately
 function ls(c){let p=[0,...c,v.L];return p.slice(1).map((x,i)=>+(x-p[i]).toFixed(3))}
 let LA=lines.length?ls(A):[v.L], LB=lines.length?ls(B):[v.L];
 if([...LA,...LB].some(x=>x<v.MIN-E||x>v.BL+E))return null;
 let R=rows(v),rs=[],ps=[];
 for(let r=0;r<R;r++){let Ls=r%2?LB:LA,type=r%2?"B":"A",rp=Ls.map((len,i)=>{let p={row:r+1,label:`${r+1}${String.fromCharCode(65+i)}`,len};ps.push(p);return p});rs.push({type,ps:rp})}
 let bins=pack(ps,v),d=R*v.L,g=lines.length?[lines[0],...lines.slice(1).map((x,i)=>x-lines[i]),v.L-lines.at(-1)]:[v.L];
 return{family:lines.length,label,lines,LA,LB,R,rs,ps,bins,util:100*d/(bins.length*v.BL),gaps:g,visual:variance(g),edge:lines.length?Math.abs(g[0]-g.at(-1)):0}
}
function oneLine(v,x){ // Alternate: odd rows joint at x, even rows mirrored joint at L-x => two visible master positions unless centered
 let y=v.L-x, lines=[...new Set([+x.toFixed(3),+y.toFixed(3)])].sort((a,b)=>a-b);
 let LA=[x,v.L-x],LB=[v.L-x,x];if([...LA,...LB].some(z=>z<v.MIN-E||z>v.BL+E))return null;
 let R=rows(v),rs=[],ps=[];for(let r=0;r<R;r++){let Ls=r%2?LB:LA,type=r%2?"B":"A",rp=Ls.map((len,i)=>{let p={row:r+1,label:`${r+1}${String.fromCharCode(65+i)}`,len:+len.toFixed(3)};ps.push(p);return p});rs.push({type,ps:rp})}
 let bins=pack(ps,v),d=R*v.L,g=[Math.min(x,y),Math.abs(y-x),Math.min(x,y)].filter(z=>z>E);
 return{family:1,label:"משפחה: חיבור אחד בכל שורה",lines,LA,LB,R,rs,ps,bins,util:100*d/(bins.length*v.BL),gaps:g,visual:variance(g),edge:0}
}
function candidates(v){
 let all=[];
 // 0-joint agent: MUST exist whenever one stock board spans a row.
 if(v.L<=v.BL+E){let q=build([],v,"No-Joint Agent — ללא חיבורים");if(q)all.push(q)}
 // 1-joint-per-row family, mirrored A/B.
 for(let x=v.EDGE;x<=v.L/2+E;x+=.05){let q=oneLine(v,+x.toFixed(2));if(q)all.push(q)}
 // 2+ master-line families: balanced bases + independent perturbations.
 for(let n=2;n<=v.MAX;n++){
   let usable=v.L-2*v.EDGE;if(usable<=0)continue;
   for(let shift=0;shift<=.6+E;shift+=.10){
     let first=v.EDGE+shift,last=v.L-v.EDGE-shift;if(last<=first)continue;
     let base=Array.from({length:n},(_,i)=>first+i*(last-first)/(n-1));
     for(let d=-.30;d<=.3001;d+=.10){
       let q=base.map((x,i)=>+(x+(i>0&&i<n-1?d*((i%2)?1:-1):0)).toFixed(2));
       if(q[0]<v.EDGE-E||v.L-q.at(-1)<v.EDGE-E||q.slice(1).some((x,i)=>x<=q[i]+E))continue;
       let z=build(q,v,`${n}-Line Agent`);if(z)all.push(z)
     }
   }
 }
 // de-duplicate geometry
 let seen=new Set();return all.filter(q=>{let k=q.family+"|"+q.lines.map(F).join("|")+"|"+q.LA.map(F).join(",")+"|"+q.LB.map(F).join(",");if(seen.has(k))return false;seen.add(k);return true})
}
function validate(q,v){if(q.rs.some(r=>Math.abs(r.ps.reduce((s,x)=>s+x.len,0)-v.L)>.002))return false;if(q.ps.some(x=>x.len<v.MIN-E||x.len>v.BL+E))return false;if(q.bins.flat().length!==q.ps.length)return false;return q.bins.every(b=>b.reduce((s,x)=>s+x.len,0)+Math.max(0,b.length-1)*v.K<=v.BL+.002)}
function select(P,v){
 let byFam=new Map();P.forEach(q=>{if(!byFam.has(q.family))byFam.set(q.family,[]);byFam.get(q.family).push(q)});
 let chosen=[];
 for(let [fam,a] of [...byFam.entries()].sort((a,b)=>a[0]-b[0])){
   a.sort((x,y)=>x.bins.length-y.bins.length||x.visual-y.visual||y.util-x.util);
   let bestMat=[...a].sort((x,y)=>x.bins.length-y.bins.length||y.util-x.util)[0];
   let bestVis=[...a].sort((x,y)=>x.visual-y.visual||x.bins.length-y.bins.length)[0];
   let bestEdge=[...a].sort((x,y)=>x.edge-y.edge||x.bins.length-y.bins.length)[0];
   [[bestMat,"Material Agent"],[bestVis,"Visual Agent"],[bestEdge,"Geometry Agent"]].forEach(([q,r])=>{if(q&&!chosen.some(x=>x===q))chosen.push(Object.assign({},q,{reason:r}))})
 }
 // absolute specialists
 let no=P.find(q=>q.family===0);if(no&&!chosen.some(x=>x.family===0))chosen.unshift({...no,reason:"No-Joint Agent"});
 let min=[...P].sort((a,b)=>a.family-b.family||a.bins.length-b.bins.length)[0];if(min&&!chosen.some(x=>x===min))chosen.unshift({...min,reason:"Minimum-Joints Agent"});
 return chosen.slice(0,v.WIDE?50:18)
}
function render(){let v=V(),P=candidates(v).filter(q=>validate(q,v)),C=select(P,v),o=$("out"),R=rows(v),d=R*v.L,lb=Math.ceil(d/v.BL);
 let fam=[...new Set(P.map(x=>x.family))].sort((a,b)=>a-b);let h=`<div class="card"><h2>בדיקת מנוע</h2><p>שורות: <b>${R}</b> · נבדקו <b>${P.length}</b> פתרונות חוקיים · משפחות שנמצאו: <b>${fam.join(", ")}</b> קווי חיבור.</p><p>חסם אורך בלבד: <b>${lb}</b> לוחות.</p>${v.L<=v.BL?'<p><b>✓ בדיקת No-Joint הופעלה כי לוח גלם אחד יכול לכסות שורה שלמה.</b></p>':''}</div>`;
 C.forEach((q,i)=>{let kerf=q.bins.reduce((s,b)=>s+Math.max(0,b.length-1)*v.K,0),scr=q.bins.length*v.BL-d-kerf,off=q.bins.map(b=>v.BL-b.reduce((s,x)=>s+x.len,0)-Math.max(0,b.length-1)*v.K),useful=off.filter(x=>x>=v.MIN).reduce((s,x)=>s+x,0),waste=off.filter(x=>x<v.MIN).reduce((s,x)=>s+x,0);
 h+=`<div class="card solution"><h2>פתרון ${i+1} — ${q.family===0?"ללא חיבורים":q.family+" קווי/משפחת חיבור"}</h2><p><b>הסוכן:</b> ${q.reason} · <b>מקור:</b> ${q.label}</p><span class="tag">${q.bins.length} לוחות</span><span class="tag">${q.util.toFixed(2)}% ניצול</span><span class="tag">${q.family===0?0:q.lines.length} קווים נראים</span><span class="tag">שארית ${F(Math.max(0,scr))} מ׳</span>
 <p><b>קווים:</b> ${q.lines.length?q.lines.map(F).join(" / "):"אין"}<br><b>A:</b> ${q.LA.map(F).join(" + ")}<br><b>B:</b> ${q.LB.map(F).join(" + ")}</p><p><b>שארית שימושית (≥ חתיכה מינ׳):</b> ${F(useful)} מ׳ · <b>שארית קצרה:</b> ${F(waste)} מ׳</p><div class="deck">`;
 q.rs.forEach(r=>h+=`<div class="r">${r.ps.map(x=>`<div class="pc" style="width:${100*x.len/v.L}%">${r.type}${x.label}</div>`).join("")}</div>`);
 h+=`</div><details><summary>תוכנית חיתוך</summary>`;q.bins.forEach((b,j)=>{let k=Math.max(0,b.length-1)*v.K,rem=v.BL-b.reduce((s,x)=>s+x.len,0)-k;h+=`<b>#${j+1}</b><div class="stock">${b.map(x=>`<div class="sp" style="width:${100*x.len/v.BL}%">${x.label} ${F(x.len)}</div>`).join("")}</div><small>${b.map(x=>`${F(x.len)}→${x.label}`).join(" | ")} · kerf ${F(k)} · שארית ${F(Math.max(0,rem))}</small><br>`});h+=`</details></div>`});o.innerHTML=h}
$("go").onclick=render;$("wide").onchange=render;render();