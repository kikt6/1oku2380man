// 自動シミュレーション検証: node sim.js [N] [birthYear]
const fs=require('fs');
const s=fs.readFileSync(__dirname+'/index.html','utf8');const m=s.match(/<script>([\s\S]*)<\/script>/);
const eng=m[1].split('// ===== 状態 =====')[0];
const f=new Function('window','document','localStorage',eng+';return {newLife,stepYearAll,autoResolve,shadowLife,lifeTitle,rarity,facsOf}');
const E=f({}, {}, {});
const N=+process.argv[2]||1000,BY=+process.argv[3]||2024;
function life(by){const L=E.newLife(true,null,null,by);while(L.alive&&L.age<125){const d=E.stepYearAll(L);if(d)E.autoResolve(L,d);if(!L.alive)break;L.age++}return L}
const med=a=>{const b=[...a].sort((x,y)=>x-y);return b[Math.floor(b.length/2)]};
const ages=[],joy=[],net=[],inc=[],ranks={},causes={},jobs={},edu={},dup=[],odd=[],consec=[];let married=0,kids=0,uni=0,neg=0,oku=0,suicide=0,kidsN=0,divorce=0,poorCnt=0,ronin=0,avgEv=0;
const oddRe=/地元の地元|のの|。。|undefined|NaN|null|\[object|  |、、|をを|にに|でで/;
for(let i=0;i<N;i++){const L=life(BY);ages.push(L.age);joy.push(L.st.j);const nn=L.assets-L.debt;net.push(nn);inc.push(L.lifetime);const r=E.rarity(L).rank;ranks[r]=(ranks[r]||0)+1;causes[L.cause]=(causes[L.cause]||0)+1;jobs[L.job]=(jobs[L.job]||0)+1;edu[L.edu||"?"]=(edu[L.edu||"?"]||0)+1;
  if(L.married||L.divorced||L.flags.widowed||L.mar)married++;if(L.kids.length)kids++;kidsN+=L.kids.length;if(L.univ)uni++;if(nn<0)neg++;if(nn>=10000)oku++;if(L.cause==="自殺")suicide++;if(L.divorced)divorce++;if(L.flags.poor)poorCnt++;if(L.flags.roninN)ronin++;avgEv+=L.events.length;
  const seen=new Map();let prev=null;L.events.forEach(e=>{if(!e.t)return;if(oddRe.test(e.t))odd.push(e.t.slice(0,80));const k=e.t.slice(0,40);seen.set(k,(seen.get(k)||0)+1);if(prev&&prev.t===e.t)consec.push(e.t.slice(0,60));prev=e});
  seen.forEach((v,k)=>{if(v>=3)dup.push(k+' x'+v)});
  if(L.univ&&!/類/.test(L.fac)&&!E.facsOf(L.univ.name).includes(L.fac))odd.push('FAC '+L.univ.name+' '+L.fac);
}
const pct=(x)=>Math.round(x/N*1000)/10;
console.log(`N=${N} birth=${BY}`);
console.log(`寿命 中央値${med(ages)} 平均${(ages.reduce((a,b)=>a+b,0)/N).toFixed(1)}  <20歳:${pct(ages.filter(a=>a<20).length)}% 100+:${pct(ages.filter(a=>a>=100).length)}%`);
console.log(`幸福度 中央値${med(joy)}  資産 中央値${med(net)}万  マイナス:${pct(neg)}%  1億+:${pct(oku)}%  生涯年収中央値${med(inc)}万`);
console.log(`結婚経験:${pct(married)}% 離婚:${pct(divorce)}% 子あり:${pct(kids)}% 平均子数${(kidsN/N).toFixed(2)} 大学:${pct(uni)}% 浪人:${pct(ronin)}% 貧困:${pct(poorCnt)}% 自殺:${pct(suicide)}% 平均イベント数${(avgEv/N).toFixed(0)}`);
console.log('レア度',JSON.stringify(ranks));
console.log('学歴',JSON.stringify(edu));
console.log('死因',Object.entries(causes).sort((a,b)=>b[1]-a[1]).slice(0,12).map(x=>x.join(':')).join(' '));
console.log('最後の職業',Object.entries(jobs).sort((a,b)=>b[1]-a[1]).slice(0,15).map(x=>x.join(':')).join(' '));
const cnt=a=>{const c={};a.forEach(x=>c[x]=(c[x]||0)+1);return Object.entries(c).sort((x,y)=>y[1]-x[1])};
console.log('不自然な文:',odd.length,cnt(odd).slice(0,10));
console.log('同一文の連続:',consec.length,cnt(consec).slice(0,8));
console.log('同一文3回以上(人生内):',dup.length,cnt(dup).slice(0,12));
