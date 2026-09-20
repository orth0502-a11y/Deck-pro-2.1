const $=x=>document.getElementById(x),F=x=>(+x).toFixed(3),E=1e-9;
function V(){return{L:+$("L").value,W:+$("W").value,BL:+$("BL").value,BW:+$("BW").value/100,G:+$("G").value/1000,K:+$("K").value/1000,MIN:+$("MIN").value/100,EDGE:+$("EDGE").value/100,MAX:+$("MAX").value,SHOW:+$("SHOW").value,ALL:$("all").checked}}
function nr(v){return Math.ceil((v.W+v.G)/(v.BW+v.G))}
function pack(ps,v){let bs=[];[...ps].sort((a,b)=>b.len-a.len).forEach(p=>{let bi=-1,br=1e99;bs.forEach((b,i)=>{let u=b.reduce((s,x)=>s+x.len,0)+Math.max(0,b.length-1)*v.K,rem=v.BL-u-(b.length?v.K:0)-p.len;if(rem>=-E&&rem<br){br=rem;bi=i}});bi<0?bs.push([p]):bs[bi].push(p)});return bs}
function variance(a){let m=a.reduce((s,x)=>s+x,0)/a.length;return a.reduce((s,x)=>s+(x-m)**2,0)/a.length}
function key(q){return q.lines.map(F).join("|")}
function make(lines,v){
 let A=lines.filter((_,i)=>i%2===0),B=lines.filter((_,i)=>i%2===1);if(!A.length||!B.length)return null;
 function lens(c){let p=[0,...c,v.L];return p.slice(1).map((x,i)=>+(x-p[i]).toFixed(3))}
 let LA=lens(A),LB=lens(B);if([...LA,...LB].some(x=>x<v.MIN-E||x>v.BL+E))return null;
 let R=nr(v),rows=[],ps=[];for(let r=0;r<R;r++){let c=r%2?B:A,Ls=r%2?LB:LA,type=r%2?"B":"A",rp=Ls.map((len,i)=>{let p={row:r+1,label:`${r+1}${String.fromCharCode(65+i)}`,len};ps.push(p);return p});rows.push({type,c,ps:rp})}
 let bins=pack(ps,v),d=R*v.L,g=[lines[0],...lines.slice(1).map((x,i)=>x-lines[i]),v.L-lines.at(-1)];
 return{lines,A,B,LA,LB,R,rows,ps,bins,util:100*d/(bins.length*v.BL),visual:variance(g),edge:Math.abs(g[0]-g.at(-1)),gaps:g}
}
function pool(v){
 let out=[],seen=new Set(),step=.10;
 // Exhaustive-ish structured families from 2 up to MAX master lines.
 for(let n=2;n<=v.MAX;n++){
   let span=v.L-2*v.EDGE,base=span/(n-1);
   for(let e1=0;e1<=.8+E;e1+=step){
    let first=v.EDGE+e1,last=v.L-v.EDGE-e1;if(last<=first)continue;
    let lines=Array.from({length:n},(_,i)=>first+i*(last-first)/(n-1));
    for(let j=-4;j<=4;j++){
      let q=lines.map((x,i)=>x+(i>0&&i<n-1?j*.05*((i%2)?1:-1):0)).map(x=>Math.round(x*100)/100);
      if(q[0]<v.EDGE-E||v.L-q.at(-1)<v.EDGE-E||q.slice(1).some((x,i)=>x-q[i]<v.MIN*.5))continue;
      let z=make(q,v);if(z&&!seen.has(key(z))){seen.add(key(z));out.push(z)}
    }
   }
 }
 // Two-line specialist: broad independent search; this is deliberately not tied to equal spacing.
 for(let a=v.EDGE;a<=v.L-v.EDGE-v.MIN;a+=.05)for(let b=a+v.MIN;b<=v.L-v.EDGE+E;b+=.05){let z=make([+a.toFixed(2),+b.toFixed(2)],v);if(z&&!seen.has(key(z))){seen.add(key(z));out.push(z)}}
 return out
}
function dominates(a,b){return a.bins.length<=b.bins.length&&a.lines.length<=b.lines.length&&a.visual<=b.visual+E&&a.edge<=b.edge+E&&(a.bins.length<b.bins.length||a.lines.length<b.lines.length||a.visual<b.visual-E||a.edge<b.edge-E)}
function pareto(P){return P.filter((q,i)=>!P.some((x,j)=>j!==i&&dominates(x,q)))}
function pick(P,v){
 const agents=[
  ["מינימום קווי חיבור",q=>[q.lines.length,q.bins.length,q.visual]],
  ["ניצול חומר",q=>[q.bins.length,-q.util,q.lines.length,q.visual]],
  ["איזון ויזואלי",q=>[q.visual,q.edge,q.bins.length,q.lines.length]],
  ["סימטריית קצוות",q=>[q.edge,q.visual,q.bins.length,q.lines.length]],
  ["פתרון מאוזן",q=>[q.bins.length,q.lines.length,q.visual,q.edge]]
 ];
 function cmp(fn){return(a,b)=>{let A=fn(a),B=fn(b);for(let i=0;i<A.length;i++)if(Math.abs(A[i]-B[i])>E)return A[i]-B[i];return 0}}
 let got=[],seen=new Set();
 agents.forEach(([name,fn])=>{[...P].sort(cmp(fn)).slice(0,v.ALL?12:4).forEach(q=>{let k=key(q);if(!seen.has(k)){seen.add(k);got.push({...q,reason:name})}})});
 // Explorer: maximize geometric difference from selected solutions.
 let rest=P.filter(q=>!seen.has(key(q)));while(rest.length&&got.length<(v.ALL?Math.min(40,P.length):Math.max(v.SHOW,10))){rest.sort((a,b)=>{let da=Math.min(...got.map(x=>Math.abs(x.lines.length-a.lines.length)+Math.abs(x.visual-a.visual)+Math.abs(x.bins.length-a.bins.length)));let db=Math.min(...got.map(x=>Math.abs(x.lines.length-b.lines.length)+Math.abs(x.visual-b.visual)+Math.abs(x.bins.length-b.bins.length)));return db-da});let q=rest.shift();seen.add(key(q));got.push({...q,reason:"Explorer — חלופה שונה"})}
 return got.slice(0,v.ALL?40:v.SHOW)
}
function solve(v){let P=pool(v),front=pareto(P),chosen=pick(front.length?front:P,v);return{P,front,chosen}}
function render(){let v=V(),S=solve(v),o=$("out"),d=nr(v)*v.L,lb=Math.ceil(d/v.BL);let h=`<div class="card"><h2>מנוע החיפוש</h2><p>נבדקו <b>${S.P.length}</b> תצורות חוקיות · חזית Pareto: <b>${S.front.length}</b> · מוצגות: <b>${S.chosen.length}</b>.</p><p>שורות: <b>${nr(v)}</b> · חסם אורך תיאורטי: <b>${lb}</b> לוחות.</p></div>`;
 S.chosen.forEach((q,i)=>{let kerf=q.bins.reduce((s,b)=>s+Math.max(0,b.length-1)*v.K,0),scr=q.bins.length*v.BL-d-kerf;
 h+=`<div class="card solution"><h2>פתרון ${i+1}</h2><p><b>למה הוא כאן:</b> ${q.reason}</p><div class="tags"><span class="tag">${q.lines.length} קווי חיבור</span><span class="tag">${q.bins.length} לוחות</span><span class="tag">${q.util.toFixed(2)}% ניצול</span><span class="tag">שארית ${F(Math.max(0,scr))} מ׳</span></div><p><b>קווים:</b> ${q.lines.map(F).join(" / ")} מ׳</p><p><b>מרווחים:</b> ${q.gaps.map(F).join(" / ")} מ׳</p><p><b>A:</b> ${q.LA.map(F).join(" + ")}<br><b>B:</b> ${q.LB.map(F).join(" + ")}</p><div class="deck">`;
 q.rows.forEach(r=>h+=`<div class="r">${r.ps.map(x=>`<div class="pc" style="width:${100*x.len/v.L}%">${r.type}${x.label}</div>`).join("")}</div>`);
 h+=`</div><details><summary>תוכנית חיתוך מלאה</summary>`;q.bins.forEach((b,j)=>{let k=Math.max(0,b.length-1)*v.K,rem=v.BL-b.reduce((s,x)=>s+x.len,0)-k;h+=`<b>לוח #${j+1}</b><div class="stock">${b.map(x=>`<div class="sp" style="width:${100*x.len/v.BL}%">${x.label} ${F(x.len)}</div>`).join("")}</div><small>${b.map(x=>`${F(x.len)}→${x.label}`).join(" | ")} · kerf ${F(k)} · שארית ${F(Math.max(0,rem))}</small><br>`});h+=`</details></div>`});o.innerHTML=h}
$("go").onclick=render;$("all").onchange=render;render();