const $ = id => document.getElementById(id);
let stops = [], result = null;
const ns = 'http://www.w3.org/2000/svg';
function node(tag, attrs, text) {
  const el = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  if (text !== undefined) el.textContent = text;
  return el;
}
function invalidate() {
  result = null; $('results').hidden = true;
  for (const key of ['distance','saving','runtime']) $(key).textContent = '—';
  $('saving-note').textContent = 'RUN THE PLANNER';
  $('status').textContent = `${stops.length} stops. Plan again after changes.`;
}
function renderStops() {
  $('stops').replaceChildren();
  stops.forEach((s,i) => {
    const li = document.createElement('li'), number = document.createElement('span');
    number.textContent = String(i).padStart(2,'0');
    const label = document.createElement('div'); label.textContent = s.name;
    const coords = document.createElement('small');
    coords.textContent = `${i===0?'DISPATCH / ':''}${s.x}, ${s.y} m`; label.append(coords);
    const remove = document.createElement('button'); remove.textContent = '×';
    remove.setAttribute('aria-label',`Remove ${s.name}`);
    remove.onclick = () => {stops.splice(i,1); invalidate(); renderStops(); drawMap();};
    li.append(number,label,remove); $('stops').append(li);
  });
}
function drawMap() {
  const svg = $('map'); svg.replaceChildren();
  const px = s => 50+s.x*.98, py = s => 50+s.y*.68;
  for (let i=0;i<=1000;i+=100) {
    svg.append(node('line',{x1:50+i*.98,y1:50,x2:50+i*.98,y2:730,stroke:'#d4d4cc'}));
    svg.append(node('line',{x1:50,y1:50+i*.68,x2:1030,y2:50+i*.68,stroke:'#d4d4cc'}));
  }
  svg.append(node('text',{x:50,y:25,'font-family':'monospace','font-size':13},'Y ↓ / X →   COORDINATE GRID IN METRES'));
  if(result) {
    const route=result[$('route-view').value].route;
    svg.append(node('polyline',{points:route.map(i=>`${px(stops[i])},${py(stops[i])}`).join(' '),fill:'none',stroke:'#e61919','stroke-width':4}));
  }
  stops.forEach((s,i)=>{
    svg.append(node(i===0?'rect':'circle',i===0?{x:px(s)-9,y:py(s)-9,width:18,height:18,fill:'#111'}:{cx:px(s),cy:py(s),r:9,fill:'#f4f4f0',stroke:'#111','stroke-width':3}));
    const right = s.x>820;
    svg.append(node('text',{x:px(s)+(right?-15:15),y:py(s)-14,'text-anchor':right?'end':'start','font-family':'monospace','font-size':15,'font-weight':700},`${i} / ${s.name}`));
  });
}
function drawChart() {
  const svg=$('chart'), h=result.history; svg.replaceChildren();
  const lo=Math.min(...h.map(v=>v.distance)), hi=Math.max(...h.map(v=>v.distance));
  const px=i=>80+i*490/Math.max(1,h.length-1), py=v=>200-(v-lo)*150/Math.max(1,hi-lo);
  svg.append(node('line',{x1:80,y1:200,x2:570,y2:200,stroke:'#111'}));
  svg.append(node('polyline',{points:h.map((v,i)=>`${px(i)},${py(v.distance)}`).join(' '),fill:'none',stroke:'#e61919','stroke-width':3}));
  for(const [v,y] of [[hi,50],[lo,200]]) svg.append(node('text',{x:8,y,'font-family':'monospace','font-size':12},v.toFixed(0)+' m'));
  svg.append(node('text',{x:80,y:237,'font-family':'monospace','font-size':12},`Iteration 0 → ${h.length-1}`));
}
function showResult() {
  $('results').hidden=false;
  $('distance').textContent=result.optimized.distance.toFixed(1);
  $('saving').textContent=result.saving_percent.toFixed(1)+'%';
  $('saving-note').textContent=(result.baseline.distance-result.optimized.distance).toFixed(1)+' METRES SAVED';
  $('runtime').textContent=result.runtime_ms.toFixed(1);
  $('comparison').replaceChildren();
  for(const [key,name,role] of [['baseline','Input order','Unplanned baseline'],['nearest','Nearest neighbor','Greedy baseline'],['beam','Local Beam Search','Swap neighborhood'],['optimized','Beam + 2-opt','Final route']]) {
    const tr=document.createElement('tr');
    for(const t of [name,result[key].distance.toFixed(2),role]) {const td=document.createElement('td');td.textContent=t;tr.append(td);}
    $('comparison').append(tr);
  }
  $('verification').textContent=result.exact?`Exact check: ${result.exact.distance.toFixed(2)} m. Final gap: ${Math.max(0,result.gap_percent).toFixed(3)}%. Exhaustive verification is available up to 9 stops.`:'Heuristic result. Exact verification is skipped above 9 stops; global optimality is not established.';
  $('route-text').textContent=result.optimized.route.map(i=>stops[i].name).join(' → ');
  $('legs').replaceChildren();
  for(const leg of result.legs) {const li=document.createElement('li');li.textContent=`${stops[leg.from].name} → ${stops[leg.to].name}: ${leg.distance.toFixed(2)} m`;$('legs').append(li);}
  $('search-note').textContent=`${result.history.length-1} beam iterations; ${result.evaluations} candidate evaluations; stopped because: ${result.stop_reason}. 2-opt accepted ${result.two_opt_history.length} moves.`;
  $('status').textContent='Round trip ready. Every stop is visited once, then dispatch is revisited.';
  drawMap(); drawChart();
}
async function loadDemo() {
  try {const response=await fetch('/api/demo');if(!response.ok)throw Error('Could not load campus.');stops=(await response.json()).stops;invalidate();renderStops();drawMap();}
  catch(e){$('status').textContent=e.message;}
}
$('demo').onclick=loadDemo;
$('clear').onclick=()=>{stops=[];invalidate();renderStops();drawMap();};
$('route-view').onchange=drawMap;
for (const key of ['beam','iterations','seed']) $(key).oninput = () => {
  invalidate(); drawMap();
};
$('add-form').onsubmit=e=>{
  e.preventDefault();const s={name:$('name').value.trim(),x:Number($('x').value),y:Number($('y').value)};
  if(!s.name){$('status').textContent='Enter a stop name.';return;}
  if(stops.length>=25){$('status').textContent='The planner supports at most 25 stops.';return;}
  if(stops.some(v=>v.x===s.x&&v.y===s.y)){$('status').textContent='That coordinate already has a stop.';return;}
  stops.push(s);invalidate();renderStops();drawMap();$('name').value='';
};
$('solve').onclick=async()=>{
  const controls = [...document.querySelectorAll('button,input,select')];
  controls.forEach(el=>el.disabled=true);
  $('status').textContent='Searching candidate tours…';
  try {
    const response=await fetch('/api/solve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stops,beam:Number($('beam').value),iterations:Number($('iterations').value),seed:Number($('seed').value)})});
    const data=await response.json();if(!response.ok)throw Error(data.error||'Search failed.');result=data;showResult();
  }catch(e){$('status').textContent=e.message;}
  finally{controls.forEach(el=>el.disabled=false);}
};
$('export').onclick=()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='campus-courier-result.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
loadDemo();
