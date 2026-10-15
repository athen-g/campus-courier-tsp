const $ = id => document.getElementById(id);
let stops = [], result = null, campus = null, campusMode = true;
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
  refreshStopOptions();
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
  const svg=$('map');svg.replaceChildren();svg.setAttribute('viewBox','0 0 1080 800');
  svg.append(node('image',{href:'/wadia-map.svg?v=roads-5',x:0,y:0,width:1080,height:800}));
  const point=([x,y])=>`${30+x},${20+y}`;
  if(result){const route=result[$('route-view').value].route;
    const points=route.slice(0,-1).flatMap((v,i)=>result.road_paths[`${v}-${route[i+1]}`]);
    svg.append(node('polyline',{points:points.map(point).join(' '),fill:'none',stroke:'#e61919','stroke-width':4,'stroke-linejoin':'round'}));}
  stops.forEach((s,i)=>{const x=30+s.x,y=20+s.y;
    svg.append(node('circle',{cx:x,cy:y,r:10,fill:i===0?'#111':'#f4f4f0',stroke:'#111','stroke-width':2}));
    svg.append(node('text',{x,y:y+4,'text-anchor':'middle','font-family':'monospace','font-size':11,fill:i===0?'#fff':'#111','font-weight':700},i));});
}
function refreshStopOptions() {
  const select=$('stop-choice');select.replaceChildren();
  if(!campus)return;
  campus.stops.forEach((s,i)=>{
    if(stops.some(v=>v.x===s.x&&v.y===s.y))return;
    const option=document.createElement('option');option.value=i;option.textContent=s.name;select.append(option);
  });
  select.disabled=select.options.length===0;
  $('add-stop').disabled=select.disabled;
  if(select.disabled){const option=document.createElement('option');option.textContent='All campus stops added';select.append(option);}
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
  $('status').textContent='Round trip ready. Every pickup is serviced once; roads may be retraced on the return to dispatch.';
  drawMap(); drawChart();
}
async function loadDemo() {
  try {
    const response=await fetch('/campus.json',{cache:'no-store'});
    if(!response.ok)throw Error('Could not load campus.');
    campus=await response.json();stops=campus.stops.map(s=>({...s}));campusMode=true;
    invalidate();renderStops();drawMap();$('solve').click();
  } catch(e){$('status').textContent=e.message;}
}
$('demo').onclick=loadDemo;
$('clear').onclick=()=>{stops=[];invalidate();renderStops();drawMap();};
$('route-view').onchange=drawMap;
for (const key of ['beam','iterations','seed']) $(key).oninput = () => {
  invalidate(); drawMap();
};
$('add-form').onsubmit=e=>{
  e.preventDefault();const selected=campus?.stops[Number($('stop-choice').value)];
  if(!selected || stops.some(s=>s.x===selected.x&&s.y===selected.y))return;
  stops.push({...selected});invalidate();renderStops();drawMap();
};
$('solve').onclick=async()=>{
  const controls = [...document.querySelectorAll('button,input,select')];
  controls.forEach(el=>el.disabled=true);
  $('status').textContent='Searching candidate tours…';
  try {
    const response=await fetch('/api/solve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stops,mode:campusMode?"campus":"euclidean",beam:Number($('beam').value),iterations:Number($('iterations').value),seed:Number($('seed').value)})});
    const data=await response.json();if(!response.ok)throw Error(data.error||'Search failed.');result=data;showResult();
  }catch(e){$('status').textContent=e.message;}
  finally{controls.forEach(el=>el.disabled=false);refreshStopOptions();}
};
$('export').onclick=()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='campus-courier-result.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
loadDemo();
