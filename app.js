const $=x=>document.getElementById(x),F=x=>(+x).toFixed(3),E=1e-8;
function V(){return{mode:$("mode").value,L:+$("L").value,W:+$("W").value,BL:+$("BL").value,BW:+$("BW").value,G:+$("G").value,K:+$("K").value,J:+$("J").value,MIN:+$("MIN").value}}
function rng(seed){return()=>((seed=Math.imul(1664525,seed)+1013904223|0)>>>0)/4294967296}
function rowsN(v){return Math.ceil((v.W+v.G)/(v.BW+v.G))}
function pack(ps,v){let bins=[];[...ps].sort((a,b)=>b.len-a.len).forEach(p=>{let bi=-1,br=1e99;bins.forEach((b,i)=>{let used=b.reduce((s,x)=>s+x.len,0)+Math.max(0,b.length-1)*v.K,rem=v.BL-used-(b.length?v.K:0)-p.len;if(rem>=-E&&rem<br){br=rem;bi=i}});bi<0?bins.push([p]):bins[bi].push(p)});return bins}
function regular(v,x){return Math.round(x/v.J)*v.J}
function makeTrial(v,R,rand,t){
 let rows=[],ps=[];
 for(let r=0;r<R;r++){
   let n=Math.ceil(v.L/v.BL);
   // explore 2–4 pieces; extra joints are allowed in new-deck mode to improve material yield
   if(v.mode==="new" && t>20)n=Math.min(4,Math.max(n,2+(rand()<.78?1:0)));
   let cuts=[],left=v.L;
   for(let i=0;i<n-1;i++){
     let minLeft=v.MIN*(n-i-1), hi=Math.min(v.BL,left-minLeft), lo=Math.max(v.MIN,left-v.BL*(n-i-1));
     if(hi<lo)return null;
     let x=lo+(hi-lo)*rand();
     // favor useful complement lengths and centimeter precision
     if(rand()<.55)x=Math.min(hi,Math.max(lo,v.BL-(v.L-v.BL)));
     x=Math.round(x*100)/100;
     if(v.mode==="existing")x=regular(v,x);
     cuts.push(x);left-=x;
   }
   let lens=[...cuts,+left.toFixed(3)];
   if(lens.some(x=>x<v.MIN-E||x>v.BL+E))return null;
   // shuffle order for stagger appearance
   if(r%2)lens.reverse();
   let pos=0,c=[];let rowps=lens.map((len,i)=>{pos+=len;if(i<lens.length-1)c.push(+pos.toFixed(3));let p={row:r+1,label:`${r+1}${String.fromCharCode(65+i)}`,len:+len.toFixed(3)};ps.push(p);return p});
   rows.push({row:r+1,ps:rowps,c});
 }
 let bins=pack(ps,v),util=100*R*v.L/(bins.length*v.BL);
 return{rows,ps,bins,util,R}
}
function solve(v){
 let R=rowsN(v),rand=rng(220922),best=null;
 // deterministic baseline + broad seeded search
 for(let t=0;t<1800;t++){let q=makeTrial(v,R,rand,t);if(!q)continue;if(!best||q.bins.length<best.bins.length||(q.bins.length===best.bins.length&&q.util>best.util))best=q}
 if(!best)return null;
 let S=[];for(let x=0;x<=v.L+E;x+=v.J)S.push(x);
 best.extra=[...new Set(best.rows.flatMap(r=>r.c).filter(x=>!S.some(s=>Math.abs(s-x)<.011)).map(x=>x.toFixed(3)))].map(Number).sort((a,b)=>a-b);
 return best
}
function verify(v,p){
 let e=[];if(p.rows.length!==p.R)e.push("מספר השורות");
 p.rows.forEach(r=>{if(Math.abs(r.ps.reduce((s,x)=>s+x.len,0)-v.L)>.002)e.push(`סכום שורה ${r.row}`);if(r.c.length!==r.ps.length-1)e.push(`חיבורים שורה ${r.row}`);r.ps.forEach(x=>{if(x.len<v.MIN-E||x.len>v.BL+E)e.push(`חתיכה ${x.label}`)})});
 if(p.bins.flat().length!==p.ps.length)e.push("שיבוץ חתיכות");
 p.bins.forEach((b,i)=>{let u=b.reduce((s,x)=>s+x.len,0)+Math.max(0,b.length-1)*v.K;if(u>v.BL+.002)e.push(`לוח ${i+1}`)});
 if(Math.abs(p.ps.reduce((s,x)=>s+x.len,0)-p.R*v.L)>.01)e.push("מאזן חומר");return e
}
function render(){let v=V(),p=solve(v),o=$("out");if(!p){o.innerHTML='<div class="card warn">לא נמצא פתרון.</div>';return}let er=verify(v,p),d=p.R*v.L,lower=Math.ceil(d/v.BL),gap=p.bins.length-lower,kerf=p.bins.reduce((s,b)=>s+Math.max(0,b.length-1)*v.K,0),scrap=p.bins.length*v.BL-d-kerf,nom=p.R*v.BW+(p.R-1)*v.G,last=v.BW-Math.max(0,nom-v.W);
 let h=`<div class="card"><h2>אימות</h2>${er.length?`<div class="warn">❌ התוכנית נפסלה: ${er.join(" | ")}</div>`:`<div class="ok">✅ כל בדיקות מאזן החומר עברו</div>`}</div><div class="card"><h2>סיכום</h2><div class="stats"><div class="stat">שורות<br><b>${p.R}</b></div><div class="stat">לוחות בפועל<br><b>${p.bins.length}</b></div><div class="stat">חסם תחתון תיאורטי<br><b>${lower}</b></div><div class="stat">פער מהחסם<br><b>${gap}</b></div><div class="stat">ניצול<br><b>${p.util.toFixed(2)}%</b></div><div class="stat">Kerf<br><b>${F(kerf)} מ׳</b></div><div class="stat">שארית<br><b>${F(Math.max(0,scrap))} מ׳</b></div></div><p>🎯 המטרה תמיד 100%. ${gap===0?'<b>הגענו לחסם התיאורטי במספר הלוחות.</b>':`נמצא פתרון במרחק ${gap} לוח/ות מהחסם התיאורטי; לכן האפליקציה לא טוענת עדיין שזה האופטימום המתמטי.`}</p><p>פריסת רוחב ${F(nom)} מ׳ · לוח קצה משוער ${F(last)} מ׳</p></div>`;
 h+=`<div class="card"><h2>תמיכות חיבור</h2><p>מרווח קורות בסיס מקסימלי: ${F(v.J)} מ׳.</p>${v.mode==="new"?`<p><b>נקודות תמיכה נוספות שנגזרו מהחיתוכים:</b> ${p.extra.length?p.extra.map(F).join(" / "):"לא נדרשו"}</p>`:"<p>מצב תשתית קיימת.</p>"}<small>נקודות התמיכה אינן אישור קונסטרוקטיבי.</small></div><div class="card"><h2>תוכנית שורות — ${p.R}</h2>`;
 p.rows.forEach(r=>h+=`<b>שורה ${r.row}</b><div class="row">${r.ps.map(x=>`<div class="p" style="width:${100*x.len/v.L}%">${x.label} ${F(x.len)}</div>`).join("")}</div><small>${r.ps.map(x=>F(x.len)).join(" + ")} = ${F(v.L)} · חיבורים: ${r.c.map(F).join(" / ")}</small><br>`);
 h+=`</div><div class="card"><h2>תוכנית חיתוך</h2>`;p.bins.forEach((b,i)=>{let k=Math.max(0,b.length-1)*v.K,rem=v.BL-b.reduce((s,x)=>s+x.len,0)-k;h+=`<h3>לוח #${i+1}</h3><div class="stock">${b.map(x=>`<div class="p" style="width:${100*x.len/v.BL}%">${x.label} ${F(x.len)}</div>`).join("")}</div><small>${b.map(x=>`${F(x.len)} → ${x.label}`).join(" | ")} · Kerf ${F(k)} · שארית ${F(Math.max(0,rem))}</small>`});o.innerHTML=h+"</div>"}
$("calc").onclick=render;render();