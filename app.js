
const $=x=>document.getElementById(x), F=x=>(+x).toFixed(3), eps=1e-8;
function V(){return{mode:$("mode").value,L:+$("L").value,W:+$("W").value,BL:+$("BL").value,BW:+$("BW").value,G:+$("G").value,K:+$("K").value,J:+$("J").value,MIN:+$("MIN").value,MAXEX:+$("MAXEX").value}}
function rowCount(v){return Math.ceil((v.W+v.G)/(v.BW+v.G))}
function regularSupports(v){let a=[0];for(let x=v.J;x<v.L-eps;x+=v.J)a.push(+x.toFixed(3));a.push(v.L);return a}
function uniq(a){return [...new Set(a.map(x=>(+x).toFixed(3)))].map(Number).sort((a,b)=>a-b)}
function segments(L,c){let z=[0,...c,L];return z.slice(1).map((x,i)=>+(x-z[i]).toFixed(3))}
function valid(v,c){let s=segments(v.L,c);return s.every(x=>x>=v.MIN-eps&&x<=v.BL+eps)}
function makeCandidateCuts(v,offset,free=false){
  let n=Math.ceil(v.L/v.BL), c=[];
  for(let i=1;i<n;i++){
    let target=i*v.L/n+offset;
    if(free){
      // New deck: allow an exact connection support where material optimization wants it.
      target=Math.max(v.MIN,Math.min(v.L-v.MIN,target));
      c.push(+target.toFixed(3));
    } else {
      let ss=regularSupports(v).filter(x=>x>=v.MIN&&x<=v.L-v.MIN);
      let x=ss.sort((a,b)=>Math.abs(a-target)-Math.abs(b-target))[0]; if(x!=null)c.push(x);
    }
  }
  return uniq(c);
}
function patterns(v){
  let arr=[], step=Math.max(.05,Math.min(v.J/4,.10));
  for(let off=-v.BL/2;off<=v.BL/2+eps;off+=step){
    let c=makeCandidateCuts(v,off,v.mode==="new");
    if(valid(v,c))arr.push(c);
  }
  // Material-friendly patterns: try stock length and complements as joint locations.
  if(v.mode==="new"){
    for(let x=v.MIN;x<v.L-v.MIN;x+=step){
      let c=[];let pos=x;
      while(v.L-pos>v.BL+eps){c.push(+pos.toFixed(3));pos+=Math.min(v.BL,v.L-pos-v.MIN)}
      if(c.length<Math.ceil(v.L/v.BL)-1){while(c.length<Math.ceil(v.L/v.BL)-1)c.push(+(v.L-(Math.ceil(v.L/v.BL)-1-c.length)*v.BL).toFixed(3))}
      c=uniq(c.filter(q=>q>v.MIN-eps&&q<v.L-v.MIN+eps));if(valid(v,c))arr.push(c)
    }
  }
  let seen=new Set();return arr.filter(c=>{let k=c.join(',');if(seen.has(k))return false;seen.add(k);return true}).slice(0,180);
}
function packFFD(pieces,v){
 let bins=[];
 [...pieces].sort((a,b)=>b.len-a.len).forEach(p=>{
   let best=-1,remBest=1e9;
   bins.forEach((b,i)=>{let used=b.reduce((s,x)=>s+x.len,0)+Math.max(0,b.length-1)*v.K;let rem=v.BL-used-(b.length?v.K:0)-p.len;if(rem>=-eps&&rem<remBest){remBest=rem;best=i}});
   if(best<0)bins.push([p]);else bins[best].push(p);
 });
 return bins;
}
function build(v,A,B,nr){
 let rows=[],all=[];
 for(let r=0;r<nr;r++){let c=r%2?B:A,s=segments(v.L,c);if(!valid(v,c))return null;
   let ps=s.map((len,i)=>({row:r+1,label:`${r+1}${String.fromCharCode(65+i)}`,len}));
   rows.push({row:r+1,c,ps});all.push(...ps)
 }
 let bins=packFFD(all,v), sum=all.reduce((s,p)=>s+p.len,0), util=100*sum/(bins.length*v.BL);
 return{rows,all,bins,util,nr,extra:uniq([...A,...B].filter(x=>!regularSupports(v).some(q=>Math.abs(q-x)<.002)))}
}
function search(v){
 let nr=rowCount(v), ps=patterns(v), best=null;
 // Limit pair search but still examine alternating A/B layouts.
 for(let i=0;i<ps.length;i++)for(let j=0;j<ps.length;j++){
   let q=build(v,ps[i],ps[j],nr);if(!q)continue;
   if(v.mode==="new"&&q.extra.length>v.MAXEX)continue;
   if(!best || q.bins.length<best.bins.length || (q.bins.length===best.bins.length&&q.util>best.util+eps) || (q.bins.length===best.bins.length&&Math.abs(q.util-best.util)<eps&&q.extra.length<best.extra.length))best=q;
 }
 return best;
}
function render(){
 let v=V(),p=search(v),o=$("out");if(!p){o.innerHTML='<div class="card warn">לא נמצאה תוכנית חוקית במגבלות שהוזנו.</div>';return}
 let theoretical=Math.ceil((p.nr*v.L)/(v.BL));let totalStock=p.bins.length*v.BL, useful=p.nr*v.L;
 let kerf=p.bins.reduce((s,b)=>s+Math.max(0,b.length-1)*v.K,0), scrap=totalStock-useful-kerf;
 let widthNom=p.nr*v.BW+(p.nr-1)*v.G, lastWidth=v.BW-Math.max(0,widthNom-v.W);
 let h=`<div class="card"><h2>סיכום</h2><div class="stats">
 <div class="stat">שורות<br><b>${p.nr}</b></div><div class="stat">לוחות גלם<br><b>${p.bins.length}</b></div><div class="stat">מינימום אורכי תיאורטי<br><b>${theoretical}</b></div>
 <div class="stat">ניצול אורכי<br><b>${p.util.toFixed(2)}%</b></div><div class="stat">Kerf כולל<br><b>${F(kerf)} מ׳</b></div><div class="stat">שארית אורכית<br><b>${F(Math.max(0,scrap))} מ׳</b></div></div>
 <p class="good">🎯 המנוע תמיד מכוון ל־100%; התוצאה המוצגת היא הטובה ביותר שנמצאה בחיפוש הנוכחי.</p>
 <p>רוחב מחושב: ${F(widthNom)} מ׳ · רוחב לוח קצה משוער: <b>${F(lastWidth)} מ׳</b></p></div>`;
 h+=`<div class="card"><h2>תכנון תשתית וחיבורים</h2><p>קורות בסיס: מרווח מקסימלי ${F(v.J)} מ׳.</p>`;
 if(v.mode==="new") h+=p.extra.length?`<p><b>קורות חיבור מיוחדות מוצעות (${p.extra.length}):</b> ${p.extra.map(F).join(' / ')} מ׳ מתחילת הדק.</p>`:`<p class="good">לא נדרשו קורות חיבור מיוחדות מעבר לגריד הבסיס בתוכנית שנבחרה.</p>`;
 else h+=`<p>מצב תשתית קיימת: החיבורים מוגבלים לגריד הקורות שהוזן.</p>`;
 h+=`<p class="muted">קורות החיבור כאן הן נקודות תמיכה נדרשות לחיבורי הלוחות; חתכים, מפתחים, עיגון ונשיאת עומס אינם אישור קונסטרוקטיבי.</p></div>`;
 h+=`<div class="card"><h2>תוכנית שורות — ${p.nr} שורות</h2>`;
 p.rows.forEach(r=>{h+=`<div><b>שורה ${r.row}</b><div class="rowbar">${r.ps.map(x=>`<div class="piece" style="width:${100*x.len/v.L}%">${x.label} ${F(x.len)}</div>`).join('')}</div><small>מידות חיתוך: ${r.ps.map(x=>F(x.len)).join(' + ')} = ${F(v.L)} מ׳ · חיבורים מהתחלה: ${r.c.map(F).join(' / ')}</small></div>`});
 h+=`</div><div class="card"><h2>תוכנית חיתוך לפי לוח גלם</h2>`;
 p.bins.forEach((b,i)=>{let cuts=b.length,used=b.reduce((s,x)=>s+x.len,0),k=Math.max(0,b.length-1)*v.K,rem=v.BL-used-k;
   h+=`<h3>לוח #${i+1} — ${F(v.BL)} מ׳</h3><div class="stockbar">${b.map(x=>`<div class="piece" style="width:${100*x.len/v.BL}%">${x.label} ${F(x.len)}</div>`).join('')}</div>
   <p>${b.map(x=>`<b>${F(x.len)}</b> → ${x.label} (שורה ${x.row})`).join(' &nbsp; | &nbsp; ')}<br><small>Kerf מחושב: ${F(k)} מ׳ · שארית זמינה: <b>${F(Math.max(0,rem))} מ׳</b></small></p>`});
 h+='</div>';o.innerHTML=h;
}
$("calc").onclick=render;render();
