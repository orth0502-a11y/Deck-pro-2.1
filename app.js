const $=x=>document.getElementById(x),F=x=>(+x).toFixed(3),E=1e-8;
function V(){return{mode:$("mode").value,L:+$("L").value,W:+$("W").value,BL:+$("BL").value,BW:+$("BWcm").value/100,G:+$("Gmm").value/1000,K:+$("Kmm").value/1000,J:+$("Jcm").value/100,MIN:+$("MINcm").value/100,ST:+$("STcm").value/100}}
function nr(v){return Math.ceil((v.W+v.G)/(v.BW+v.G))}
function pack(ps,v){let bs=[];[...ps].sort((a,b)=>b.len-a.len).forEach(p=>{let q=-1,rr=1e9;bs.forEach((b,i)=>{let u=b.reduce((s,x)=>s+x.len,0)+Math.max(0,b.length-1)*v.K,rem=v.BL-u-(b.length?v.K:0)-p.len;if(rem>=-E&&rem<rr){rr=rem;q=i}});q<0?bs.push([p]):bs[q].push(p)});return bs}
function legalExisting(c,v){return c.every(x=>Math.abs(x/v.J-Math.round(x/v.J))<.026)}
function candidates(v){
 let out=[],step=.05;
 // 3-piece rows = two perfectly straight joint lines per A/B pattern
 for(let x=v.MIN;x<=v.L-2*v.MIN+E;x+=step)for(let y=x+v.MIN;y<=v.L-v.MIN+E;y+=step){
   let ls=[x,y-x,v.L-y].map(x=>+x.toFixed(3));if(Math.max(...ls)>v.BL+E)continue;
   let c=[+x.toFixed(3),+y.toFixed(3)];if(v.mode==="existing"&&!legalExisting(c,v))continue;
   let test=pack(ls.flatMap((z,i)=>Array(10).fill({len:z})),v).length;
   out.push({ls,c,test})
 }
 out.sort((a,b)=>a.test-b.test);return out.slice(0,90)
}
function stagger(A,B,v){return A.c.every(a=>B.c.every(b=>Math.abs(a-b)>=v.ST-E))}
function build(v,A,B,R){
 let rows=[],ps=[];for(let r=0;r<R;r++){let P=r%2?B:A,pos=0;let rp=P.ls.map((len,i)=>{pos+=len;let p={row:r+1,label:`${r+1}${String.fromCharCode(65+i)}`,len};ps.push(p);return p});rows.push({row:r+1,type:r%2?"B":"A",ps:rp,c:P.c})}
 let bins=pack(ps,v);return{A,B,R,rows,ps,bins,util:100*R*v.L/(bins.length*v.BL)}
}
function solve(v){let R=nr(v),C=candidates(v),best=null;for(let i=0;i<C.length;i++)for(let j=0;j<C.length;j++){if(i===j||!stagger(C[i],C[j],v))continue;let q=build(v,C[i],C[j],R);if(!best||q.bins.length<best.bins.length||(q.bins.length===best.bins.length&&q.util>best.util))best=q}return best}
function verify(v,p){
 let e=[];if(!p)return["לא נמצא זוג תבניות A/B חוקי"];let Ac=p.rows.filter(r=>r.type==="A"),Bc=p.rows.filter(r=>r.type==="B");
 if(!Ac.every(r=>JSON.stringify(r.c)===JSON.stringify(p.A.c)))e.push("קווי A אינם ישרים");if(!Bc.every(r=>JSON.stringify(r.c)===JSON.stringify(p.B.c)))e.push("קווי B אינם ישרים");
 p.rows.forEach(r=>{if(Math.abs(r.ps.reduce((s,x)=>s+x.len,0)-v.L)>.002)e.push(`שורה ${r.row}`);if(r.ps.some(x=>x.len<v.MIN-E||x.len>v.BL+E))e.push(`חתיכה לא חוקית בשורה ${r.row}`)});
 p.bins.forEach((b,i)=>{let u=b.reduce((s,x)=>s+x.len,0)+Math.max(0,b.length-1)*v.K;if(u>v.BL+.002)e.push(`לוח גלם ${i+1} חורג`)});
 if(p.bins.flat().length!==p.ps.length)e.push("חתיכה חסרה");return e
}
function render(){let v=V(),p=solve(v),o=$("out"),er=verify(v,p);if(!p){o.innerHTML=`<div class="card bad">❌ ${er.join(" | ")}</div>`;return}
 let d=p.R*v.L,lb=Math.ceil(d/v.BL),kerf=p.bins.reduce((s,b)=>s+Math.max(0,b.length-1)*v.K,0),scrap=p.bins.length*v.BL-d-kerf,nom=p.R*v.BW+(p.R-1)*v.G,last=v.BW-Math.max(0,nom-v.W);
 let h=`<div class="card"><h2>אימות גיאומטריה</h2>${er.length?`<div class="bad">❌ נפסל: ${er.join(" | ")}</div>`:`<div class="ok">✅ A/B ישרים ואחידים — כל שורות A זהות וכל שורות B זהות</div>`}<p><b>A:</b> חיבורים ${p.A.c.map(F).join(" / ")} · חיתוכים ${p.A.ls.map(F).join(" + ")}</p><p><b>B:</b> חיבורים ${p.B.c.map(F).join(" / ")} · חיתוכים ${p.B.ls.map(F).join(" + ")}</p></div>
 <div class="card"><h2>סיכום</h2><div class="stats"><div class="stat">שורות<br><b>${p.R}</b></div><div class="stat">לוחות גלם<br><b>${p.bins.length}</b></div><div class="stat">חסם אורך בלבד<br><b>${lb}</b></div><div class="stat">ניצול<br><b>${p.util.toFixed(2)}%</b></div><div class="stat">Kerf<br><b>${F(kerf)}</b></div><div class="stat">שארית<br><b>${F(Math.max(0,scrap))}</b></div></div><p>פריסת רוחב ${F(nom)} מ׳ · לוח קצה ${F(last)} מ׳</p></div>
 <div class="card"><h2>מבט על — החיבורים חייבים להיראות כקווים ישרים</h2><div class="deck">`;
 p.rows.forEach(r=>h+=`<div class="r">${r.ps.map(x=>`<div class="pc" style="width:${100*x.len/v.L}%">${r.type}${x.label}</div>`).join("")}</div>`);h+=`</div><small>שורות A/B מתחלפות. הקווים האנכיים הם חיבורי קצה, לא חיבורים אלכסוניים.</small></div>`;
 let joints=[...new Set([...p.A.c,...p.B.c].map(F))].map(Number).sort((a,b)=>a-b);h+=`<div class="card"><h2>תשתית לחיבורים</h2><p><b>קווי חיבור ישרים נדרשים:</b> ${joints.map(F).join(" / ")} מ׳</p><p>בין קווי החיבור משלימים קורות כך שאף מרווח לא יעבור ${F(v.J)} מ׳.</p><small>תכנון מיקום בלבד — לא אישור קונסטרוקטיבי.</small></div><div class="card"><h2>חיתוך לפי לוח גלם</h2>`;
 p.bins.forEach((b,i)=>{let k=Math.max(0,b.length-1)*v.K,rem=v.BL-b.reduce((s,x)=>s+x.len,0)-k;h+=`<b>#${i+1}</b><div class="stock">${b.map(x=>`<div class="sp" style="width:${100*x.len/v.BL}%">${x.label} ${F(x.len)}</div>`).join("")}</div><small>${b.map(x=>`${F(x.len)}→${x.label}`).join(" | ")} · kerf ${F(k)} · שארית ${F(Math.max(0,rem))}</small><br>`});o.innerHTML=h+"</div>"}
$("calc").onclick=render;render();