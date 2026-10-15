"""Schematic six-level engineering building and indoor TSP routing."""
import heapq, math, json, hashlib
from tsp import local_beam, two_opt
from tour_utils import cost

def building():
    nodes, edges, spaces = {}, [], []
    def add(key,label,x,y,floor,kind):
        nodes[key]=dict(id=key,label=label,x=x,y=y,floor=floor,kind=kind)
    def link(a,b,kind='walk',seconds=None):
        u,v=nodes[a],nodes[b]
        edges.append(dict(a=a,b=b,kind=kind,seconds=seconds if seconds is not None else math.hypot(u['x']-v['x'],u['y']-v['y'])/1.2))
    def space(key,label,x,y,w,h,f,kind,doorx,doory):
        add(key,label,doorx,doory,f,kind)
        spaces.append(dict(id=key,label=label,x=x,y=y,w=w,h=h,floor=f,kind=kind))
    for f in range(6):
        for side,x in [('W',52),('E',104)]:
            add(f'{f}{side}',f'Level {f} / {side} landing',x,0,f,'landing')
            for kind,y in [('stairs',22),('lift',-22)]:
                key=f'{f}{side}-{kind}';space(key,f'{side} {kind}',x-5,y-7,10,14,f,kind,x,y);link(f'{f}{side}',key)
                if f:link(f'{f-1}{side}-{kind}',key,kind,22 if kind=='stairs' else 12)
        if not f:continue
        # The floor sketch supplies the room types. Numbered rooms alternate
        # south/north across the building; common areas and circulation skip numbers.
        common='balcony' if f in (3,5) else 'common'
        slots=[('Laboratory',0,-30,8,60,'lab'),('Faculty Office',8,18,14,12,'faculty'),
          ('Classroom',8,-30,14,12,'classroom'),('Classroom',22,18,14,12,'classroom'),
          ('Faculty Office',34,-30,12,12,'faculty'),('Boys Washroom',36,18,12,12,'washroom'),
          ('Laboratory',58,-30,14,12,'lab'),('Laboratory',58,18,14,12,'lab'),
          ('Laboratory',72,-30,14,12,'lab'),('Laboratory',72,18,14,12,'lab'),
          ('Laboratory',86,-30,12,12,'lab'),('Laboratory',86,18,12,12,'lab'),
          ('Classroom',110,-30,12,12,'classroom'),('Ladies Washroom',110,18,12,12,'washroom'),
          ('Classroom',122,18,12,12,'classroom'),('Faculty Office',134,-30,14,12,'faculty'),
          ('Classroom',134,18,14,12,'classroom'),('Laboratory',148,-30,8,60,'lab')]
        if f==2:
            slots=[v for i,v in enumerate(slots) if i not in (0,1,3)]
            slots.insert(0,('Staff Washroom',22,18,14,12,'washroom'))
            slots=[('Classroom' if v[1] in (58,72,86) else v[0],*v[1:]) for v in slots]
        if f==1:
            slots=[v for i,v in enumerate(slots) if i not in (0,15,16,17)]
            slots.append(('Drawing Room',0,-18,22,36,'drawing'))
            slots.insert(0,('Library',134,-30,22,60,'library'))
            # Library is 101; remaining numbered spaces follow right-to-left,
            # alternating rows in the same physical bays.
            rest=slots[1:]
            order=[(122,18),(110,-30),(110,18),(86,-30),(86,18),(72,-30),(72,18),(58,-30),(58,18),(34,-30),(36,18),(8,-30),(22,18),(8,18),(0,-18)]
            rest.sort(key=lambda v:order.index((v[1],v[2])))
            slots=slots[:1]+rest
        for index,(name,x,y,w,h,kind) in enumerate(slots,1):
            key=f'{f}{index:02}';cx=x+w/2;dy=0 if h>20 else (15 if y>0 else -15)
            space(key,f'{key} / {name}',x,y,w,h,f,kind,cx,dy)
        for side,x in [('W',22),('E',122)]:
            kind='common' if f==1 else common
            title=('Boys Common Room' if side=='W' else 'Girls Common Room') if kind=='common' else ('West Balcony' if side=='W' else 'East Balcony')
            space(f'{f}{side}-{kind}',title,x,-30,12,12,f,kind,x+6,-15)
        if f==2:space('principal','Principal Office',0,-18,22,36,f,'principal',11,0)
        destinations=[n for n in list(nodes.values()) if n['floor']==f and n['kind'] not in ('landing','stairs','lift','corridor')]
        xs=sorted({52,104}|{n['x'] for n in destinations})
        for i,x in enumerate(xs):
            key=f'{f}-corridor-{i}';add(key,f'Level {f} corridor',x,0,f,'corridor')
            if i:link(f'{f}-corridor-{i-1}',key)
            for n in destinations:
                if n['x']==x:link(key,n['id'])
            for side,sx in [('W',52),('E',104)]:
                if x==sx:link(key,f'{f}{side}')
    space('entrance','Main Entrance',104,-8,6,16,0,'entrance',110,0);link('entrance','0E')
    space('office','Ground Office',91,-22,13,44,0,'office',96,0);link('0E','office')
    space('workshop','Large Workshop',0,-30,46,60,0,'workshop',42,0);link('0W','workshop')
    space('small-workshop','Small Workshop',66,-30,16,60,0,'workshop',62,0);link('0W','small-workshop')
    space('print-shop','Print Shop',58,-30,8,12,0,'shop',62,-15);link('0W','print-shop')
    return dict(nodes=nodes,edges=edges,spaces=spaces,widths=[110,156,156,156,156,156])

BUILDING=building()
BUILDING["revision"] = hashlib.sha256(json.dumps(BUILDING, sort_keys=True).encode()).hexdigest()[:16]
def plan(data):
    if not isinstance(data,dict):raise ValueError('Expected an object.')
    if data.get('revision') not in (None, BUILDING['revision']):
        raise ValueError('Building layout changed. Refresh this page before planning.')
    ids=data.get('stops',[]);mode=data.get('travel','both')
    if not isinstance(ids,list) or not 2<=len(ids)<=25 or any(not isinstance(k,str) or k not in BUILDING['nodes'] for k in ids) or len(set(ids))!=len(ids):raise ValueError('Select 2–25 different destinations.')
    if mode not in ('both','stairs','lift'):raise ValueError('Unknown travel option.')
    graph={k:[] for k in BUILDING['nodes']}
    for edge in BUILDING['edges']:
        if edge['kind'] in ('stairs','lift') and mode!='both' and edge['kind']!=mode:continue
        a,b,w=edge['a'],edge['b'],edge['seconds'];graph[a].append((b,w));graph[b].append((a,w))
    matrix=[];paths={}
    for i,source in enumerate(ids):
        dist={source:0};path={source:[source]};q=[(0,source)]
        while q:
            d,a=heapq.heappop(q)
            if d>dist[a]:continue
            for b,w in graph[a]:
                if d+w<dist.get(b,float('inf')):
                    dist[b]=d+w;path[b]=path[a]+[b];heapq.heappush(q,(d+w,b))
        if any(k not in dist for k in ids):raise ValueError('No route with the selected travel option.')
        matrix.append([dist[k] for k in ids])
        for j,k in enumerate(ids):paths[i,j]=path[k]
    route,history,_,_=local_beam(matrix,6,60,42);route,_=two_opt(route,matrix);closed=list(route)+[0]
    legs=[dict(start=ids[a],end=ids[b],seconds=matrix[a][b],path=paths[a,b]) for a,b in zip(closed,closed[1:])]
    return dict(revision=BUILDING['revision'],order=[ids[i] for i in closed],seconds=cost(route,matrix),legs=legs,history=history,baseline_seconds=cost(tuple(range(len(ids))),matrix))
