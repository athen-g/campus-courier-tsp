const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
let building,selected=['entrance'],result=null;
function el(tag,attrs={},text){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
function label(id){return building.nodes[id].label;}
function invalidate(){result=null;for(const id of ['time','saved'])$(id).textContent='—';$('order').textContent='';$('instructions').replaceChildren();$('status').textContent='Stops changed. Plan the round trip again.';draw();}
function options(){const f=Number($('pick-floor').value);$('destination').replaceChildren();for(const n of Object.values(building.nodes)){if(n.floor!==f||['corridor','landing','stairs','lift'].includes(n.kind)||selected.includes(n.id))continue;const o=document.createElement('option');o.value=n.id;o.textContent=n.label;$('destination').append(o);}$('add').disabled=!$('destination').options.length;}
function list(){const ol=$('stops');ol.replaceChildren();selected.forEach((id,i)=>{const li=document.createElement('li'),s=document.createElement('span'),b=document.createElement('button');s.textContent=`${i===0?'DISPATCH':String(i).padStart(2,'0')} / ${label(id)}`;b.textContent='×';b.setAttribute('aria-label',`Remove ${label(id)}`);b.onclick=()=>{selected.splice(i,1);invalidate();list();};li.append(s,b);ol.append(li);});$('count').textContent=selected.length;options();}
function draw(){if(!building)return;const svg=$('blueprint');svg.replaceChildren();const all=$('view').value==='all',level=Number($('view').value),angle=Number($('rotation').value)*Math.PI/180,sep=Number($('separation').value);
const visible=f=>all||f===level;
function project(x,y,f){const xx=(x-78)*Math.cos(angle)-y*Math.sin(angle),yy=(x-78)*Math.sin(angle)+y*Math.cos(angle);return [540+xx*5,all?800+yy*1.4-f*sep*1.4:440+yy*4];}
const point=(x,y,f)=>project(x,y,f).join(',');
function line(a,b,color,width=1,dash=''){svg.append(el('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:color,'stroke-width':width,'stroke-dasharray':dash}));}
function text(x,y,f,t,size=11,color='#eaeaea'){const [px,py]=project(x,y,f);svg.append(el('text',{x:px,y:py,fill:color,'font-size':size},t));}
function rectangle(x,y,w,h,f,color='#555',fill='#0a0a0a',dash=''){svg.append(el('polygon',{points:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([a,b])=>point(a,b,f)).join(' '),fill,stroke:color,'stroke-width':1,'stroke-dasharray':dash}));}
if(all)for(const x of [52,104])for(const y of [-22,22])line(project(x,y,0),project(x,y,5),'#444',1,'4 5');
for(let f=0;f<6;f++){
 if(!visible(f))continue;
 rectangle(0,-30,building.widths[f],60,f,'#aaa','none');
 text(0,-43,f,f===0?'G / ENTRANCE + OFFICE + TWO WORKSHOPS':`0${f} / LEVEL ${f}`,13);
 for(const e of building.edges){const a=building.nodes[e.a],b=building.nodes[e.b];if(a.floor===f&&b.floor===f&&e.kind==='walk')line(project(a.x,a.y,f),project(b.x,b.y,f),'#353535',1);}
 for(const room of building.spaces){if(room.floor!==f)continue;
  const balcony=room.kind==='balcony';
  rectangle(room.x,room.y,room.w,room.h,f,balcony?'#999':'#777',balcony?'none':'#0a0a0a',balcony?'3 3':'');
  let short=room.id.match(/^\d{3}$/)?room.id:({stairs:'STAIRS',lift:'LIFT',common:room.label.startsWith('Boys')?'BCR':'LCR',balcony:'BALCONY',principal:'PO',drawing:'DR',shop:'PS',entrance:'ENTRY',office:'OFFICE',workshop:room.id==='workshop'?'WORKSHOP':'WS'}[room.kind]||room.label);
  const t=el('text',{x:project(room.x+room.w/2,room.y+room.h/2,f)[0],y:project(room.x+room.w/2,room.y+room.h/2,f)[1],'text-anchor':'middle',fill:'#eaeaea','font-size':all?8:11},short);t.append(el('title',{},room.label));svg.append(t);
 }
 if(f===0){line(project(86,-29,f),project(86,29,f),'#e61919',2,'5 4');text(75,40,f,'NO DIRECT OFFICE → WORKSHOP ACCESS',9,'#e61919');}
}
if(result)for(const leg of result.legs)for(let i=0;i<leg.path.length-1;i++){const a=building.nodes[leg.path[i]],b=building.nodes[leg.path[i+1]];if(visible(a.floor)&&visible(b.floor))line(project(a.x,a.y,a.floor),project(b.x,b.y,b.floor),'#e61919',4);}
selected.forEach((id,i)=>{const n=building.nodes[id];if(!visible(n.floor))return;const [x,y]=project(n.x,n.y,n.floor),g=el('g');g.append(el('circle',{cx:x,cy:y,r:9,fill:'#0a0a0a',stroke:'#e61919','stroke-width':2}),el('text',{x,y:y+3,'text-anchor':'middle',fill:'#fff','font-size':9},i),el('title',{},label(id)));svg.append(g);});
svg.append(el('text',{x:20,y:28,fill:'#aaa','font-size':11},all?'EXPLODED AXONOMETRIC / SIX LEVELS':'FLOOR DETAIL / '+(level===0?'GROUND':level)));
svg.append(el('text',{x:20,y:880,fill:'#888','font-size':11},'WEST ←  / STAIRS SOUTH · LIFTS NORTH /  → EAST'));
}
async function plan(){if(selected.length<2){$('status').textContent='Add at least two destinations.';return;}$('plan').disabled=true;try{const r=await fetch('/api/indoor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stops:selected,travel:$('travel').value,revision:building.revision})});const data=await r.json();if(!r.ok)throw Error(data.error);
if(data.revision!==building.revision)throw Error('The server is using an older floor layout. Restart server.py and reload this page.');
const edges=new Set(building.edges.map(e=>[e.a,e.b].sort().join('|')));
for(const leg of data.legs)for(let i=1;i<leg.path.length;i++)if(!edges.has([leg.path[i-1],leg.path[i]].sort().join('|')))throw Error('Route does not match the displayed building. Reload the planner.');
result=data;$('time').textContent=(result.seconds/60).toFixed(1)+' min';$('saved').textContent=Math.max(0,100*(1-result.seconds/result.baseline_seconds)).toFixed(1)+'%';$('order').textContent=result.order.map(label).join(' → ');$('instructions').replaceChildren();for(const leg of result.legs){const li=document.createElement('li');const important=leg.path.filter(id=>!['corridor','landing'].includes(building.nodes[id].kind));li.textContent=important.map(label).join(' → ')+` (${Math.round(leg.seconds)} s)`;$('instructions').append(li);}$('status').textContent='Round trip ready. Red lines show actual corridor and vertical connections.';draw();}catch(e){result=null;draw();$('status').textContent=e.message;}finally{$('plan').disabled=false;}}
$('plan').onclick=plan;$('pick-floor').onchange=options;$('add').onclick=()=>{const id=$('destination').value;if(!id)return;if(selected.length>=25){$('status').textContent='Maximum 25 destinations.';return;}selected.push(id);invalidate();list();};$('load-destinations').onclick=()=>{
 const floor=Number($('pick-floor').value);
 const choices=Object.values(building.nodes).filter(n=>n.floor===floor&&!['corridor','landing','stairs','lift'].includes(n.kind));
 const additions=choices.filter(n=>!selected.includes(n.id));
 if(selected.length+additions.length>25){$('status').textContent='This would exceed 25 destinations. Clear the list or remove stops first.';return;}
 selected.push(...additions.map(n=>n.id));invalidate();list();
 $('status').textContent=additions.length?`Added ${additions.length} destinations from ${floor===0?'ground floor':'floor '+floor}. Plan when ready.`:'All destinations on this floor are already selected.';
};
$('clear').onclick=()=>{selected=[];invalidate();list();};$('travel').onchange=invalidate;for(const id of ['view','rotation','separation'])$(id).oninput=draw;$('reset').onclick=()=>{$('rotation').value=-12;$('separation').value=78;$('view').value='all';draw();};
try {
  building=JSON.parse($('building-data').textContent);
  for(let i=0;i<6;i++){const o=document.createElement('option');o.value=i;o.textContent=i===0?'Ground floor':'Floor '+i;$('pick-floor').append(o);}
  list();draw();$('status').textContent='Choose a floor and destination, then add it to the delivery list.';
} catch(e){$('status').textContent='Building initialization failed: '+e.message;console.error(e);}
