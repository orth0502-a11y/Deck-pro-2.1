const $=x=>document.getElementById(x),F=x=>(+x).toFixed(3),E=1e-8;
function V(){return{L:+$("L").value,W:+$("W").value,BL:+$("BL").value,BW:+$("BWcm").value/100,G:+$("Gmm").value/1000,K:+$("Kmm").value/1000,MIN:+$("MINcm").value/100,EDGE:+$("EDGEcm").value/100,LINE:+$("LINEcm").value/100,N:+$("N").value}}
function R(v){return Math.ceil((v.W+v.G)/(v.BW+v.G))}
function pack(ps,v){let bins=[];[...ps].sort((a,b)=>b.len-a.len).forEach(p=>{let bi=-1,br=1e99;bins.forEach((b,i)=>{let used=b.reduce((s,x)=>s+x.len,0)+Math.max(0,b.length-1)*v.K, rem=v.BL-used-(b.length?v.K:0)-p.len;if(rem>=-E&&rem<br){br=rem;bi=i}});bi<0?bins.push([p]):bins[bi].push(p)});return bins}
function variance(a){let m=a.reduce((s,x)=>s+x,0)/a.length;return a.reduce((s,x)=>s+(x-m)**2,0)/a.length}
function genLineSets(v){
 let sets=[],step=.05;
 // Generate 2–5 master joint lines. Edge distances are hard constraints; near-equal spacing is scored, not forced.
 for(let n=2;n<=5;n++){
   let ideal=(v.L-2*v.EDGE)/(n-1);
   for(let shift=-.35;shift<=.3501;shift+=.05){
     let first=v.EDGE+shift;if(first<v.EDGE-E)continue;
     let last=v.L-first;if(last>v.L-v.EDGE+E)continue;
     let lines=[];
     for(let i=0;i<n;i++)lines.push(first+i*(last-first)/(n-1));
     lines=lines.map(x=>Math.round(x/step)*step);
     if(lines[0]<v.EDGE-E||v.L-lines.at(-1)<v.EDGE-E)continue;
     if(lines.slice(1).some((x,i)=>x-lines[i]<v.LINE-E))continue;
     sets.push(lines)
   }
 }
 // asymmetrical perturbations around balanced layouts to let material efficiency compete with appearance
 let base=[...sets];
 base.forEach(lines=>{
   for(let j=1;j<lines.length-1;j++)for(let d of [-.20,-.10,.10,.20]){
     let q=[...lines];q[j]=Math.round((q[j]+d)*20)/20;
     if(q[0]>=v.EDGE-E&&v.L-q.at(-1)>=v.EDGE-E&&q.slice(1).every((x,i)=>x-q[i]>=v.LINE-E))sets.push(q)
   }
 });
 let seen=new Set();return sets.filter(x=>{let k=x.map(F).join("|");if(seen.has(k))return false;seen.add(k);return true}).slice(0,500)
}
function patterns(lines,v){
 // alternating use of master lines: A uses 0,2,4...; B uses 1,3...
 let out=[];
 for(let parity=0;parity<2;parity++){
   let c=lines.filter((_,i)=>i%2===parity);
   if(!c.length)continue;
   let pts=[0,...c,v.L],ls=pts.slice(1).map((x,i)=>x-pts[i]);
   if(ls.every(x=>x>=v.MIN-E&&x<=v.BL+E))out.push({type:parity?"B":"A",c,ls})
 }
 return out.length===2?out:null
}
function build(lines,v){
 let pats=patterns(lines,v);if(!pats)return null;let rows=[],ps=[],rn=R(v);
 for(let r=0;r<rn;r++){let P=pats[r%2],rp=P.ls.map((len,i)=>{let p={row:r+1,label:`${r+1}${String.fromCharCode(65+i)}`,len:+len.toFixed(3)};ps.push(p);return p});rows.push({row:r+1,type:P.type,c:P.c,ps:rp})}
 let bins=pack(ps,v),d=rn*v.L,util=100*d/(bins.length*v.BL);
 let gaps=[lines[0],...lines.slice(1).map((x,i)=>x-lines[i]),v.L-lines.at(-1)];
 let visual=variance(gaps),edge=Math.abs(lines[0]-(v.L-lines.at(-1)));
 return{lines,pats,rows,ps,bins,rn,util,visual,edge,gaps}
}
function verify(q,v){let e=[];q.rows.forEach(r=>{if(Math.abs(r.ps.reduce((s,x)=>s+x.len,0)-v.L)>.002)e.push("row");if(r.ps.some(x=>x.len<v.MIN-E||x.len>v.BL+E))e.push("piece")});q.bins.forEach(b=>{let u=b.reduce((s,x)=>s+x.len,0)+Math.max(0,b.length-1)*v.K;if(u>v.BL+.002)e.push("stock")});if(q.bins.flat().length!==q.ps.length)e.push("assign");return !e.length}
function solve(v){
 let all=[];for(let lines of genLineSets(v)){let q=build(lines,v);if(q&&verify(q,v))all.push(q)}
 // Pareto-ish multi-agent selection: material, visual balance, fewer lines, symmetric edge, compromise
 let agents=[
  q=>[q.bins.length,-q.util,q.visual,q.lines.length],
  q=>[q.visual,q.bins.length,-q.util,q.lines.length],
  q=>[q.lines.length,q.bins.length,q.visual,-q.util],
  q=>[q.edge,q.visual,q.bins.length,-q.util],
  q=>[q.bins.length,q.visual,q.lines.length,q.edge]
 ];
 function cmp(score){return(a,b)=>{let A=score(a),B=score(b);for(let i=0;i<A.length;i++)if(Math.abs(A[i]-B[i])>1e-9)return A[i]-B[i];return 0}}
 let chosen=[],seen=new Set();
 for(let score of agents){for(let q of [...all].sort(cmp(score)).slice(0,12)){let k=q.lines.map(F).join("|");if(!seen.has(k)){seen.add(k);chosen.push(q)}}}
 // remove clearly dominated material options unless visually materially different
 chosen.sort((a,b)=>a.bins.length-b.bins.length||a.visual-b.visual);
 let diverse=[];for(let q of chosen){if(diverse.some(x=>x.bins.length===q.bins.length&&Math.abs(x.visual-q.visual)<.002&&x.lines.length===q.lines.length))continue;diverse.push(q)}
 return diverse.slice(0,v.N)
}
function render(){
 let v=V(),sol=solve(v),o=$("out");if(!sol.length){o.innerHTML='<div class="card"><b>לא נמצאו פתרונות חוקיים במגבלות האלו.</b></div>';return}
 let demand=R(v)*v.L,lb=Math.ceil(demand/v.BL),h=`<div class="card"><h2>נמצאו ${sol.length} פתרונות רלוונטיים</h2><p>מספר שורות: <b>${R(v)}</b> · חסם אורך תיאורטי: <b>${lb}</b> לוחות. אין כרגע דירוג "מנצח" — כל חלופה מוצגת עם היתרונות שלה.</p></div>`;
 sol.forEach((q,ix)=>{
  let kerf=q.bins.reduce((s,b)=>s+Math.max(0,b.length-1)*v.K,0),scrap=q.bins.length*v.BL-demand-kerf;
  h+=`<div class="card solution"><h2>פתרון ${ix+1}</h2><span class="tag">${q.bins.length} לוחות</span><span class="tag">${q.util.toFixed(2)}% ניצול</span><span class="tag">${q.lines.length} קווי חיבור</span><span class="tag">שארית ${F(Math.max(0,scrap))} מ׳</span>
  <p><b>קווי חיבור:</b> ${q.lines.map(F).join(" / ")} מ׳</p><p><b>מרווחים:</b> ${q.gaps.map(F).join(" / ")} מ׳</p>
  <p><b>A:</b> ${q.pats[0].ls.map(F).join(" + ")} · <b>B:</b> ${q.pats[1].ls.map(F).join(" + ")}</p>
  <div class="deck">`;
  q.rows.forEach(r=>h+=`<div class="r">${r.ps.map(x=>`<div class="pc" style="width:${100*x.len/v.L}%">${r.type}${x.label}</div>`).join("")}</div>`);
  h+=`</div><details><summary>תוכנית חיתוך מלאה</summary>`;
  q.bins.forEach((b,i)=>{let k=Math.max(0,b.length-1)*v.K,rem=v.BL-b.reduce((s,x)=>s+x.len,0)-k;h+=`<b>לוח #${i+1}</b><div class="stock">${b.map(x=>`<div class="sp" style="width:${100*x.len/v.BL}%">${x.label} ${F(x.len)}</div>`).join("")}</div><small>${b.map(x=>`${F(x.len)}→${x.label}`).join(" | ")} · kerf ${F(k)} · שארית ${F(Math.max(0,rem))}</small><br>`});
  h+=`</details></div>`;
 });
 o.innerHTML=h
}
$("calc").onclick=render;render();