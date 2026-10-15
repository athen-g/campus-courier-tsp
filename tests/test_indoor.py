import unittest
from indoor import BUILDING,plan
class IndoorTests(unittest.TestCase):
 def test_workshop_requires_first_floor_crossing(self):
  for mode in ['both','stairs','lift']:
   r=plan({'stops':['entrance','workshop'],'travel':mode});p=r['legs'][0]['path']
   self.assertIn('1E',p);self.assertIn('1W',p)
   self.assertLess(p.index('1E'),p.index('1W'))
   self.assertTrue(all(BUILDING['nodes'][k]['floor']<=1 for k in p))
   kinds={k.rsplit('-',1)[-1] for k in p}
   if mode=='stairs':self.assertNotIn('lift',kinds)
   if mode=='lift':self.assertNotIn('stairs',kinds)
 def test_rooms_features_and_round_trip(self):
  for f in range(1,6):
   self.assertTrue(any(n['kind']=='washroom' and n['floor']==f for n in BUILDING['nodes'].values()))
  self.assertEqual(BUILDING['nodes']['101']['label'],'101 / Library')
  self.assertEqual(BUILDING['nodes']['301']['kind'],'lab')
  self.assertEqual(BUILDING['nodes']['302']['kind'],'faculty')
  self.assertEqual(BUILDING['nodes']['303']['kind'],'classroom')
  self.assertEqual(BUILDING['widths'][0],110)
  self.assertLess(BUILDING['widths'][0],BUILDING['widths'][1])
  r=plan({'stops':['entrance','403','507','workshop','2W-common']})
  self.assertEqual(r['order'][0],r['order'][-1]);self.assertEqual(len(set(r['order'][:-1])),5)
  edges={frozenset((e['a'],e['b'])) for e in BUILDING['edges']}
  for leg in r['legs']:
   for a,b in zip(leg['path'],leg['path'][1:]):self.assertIn(frozenset((a,b)),edges)
  self.assertLessEqual(r['seconds'],r['baseline_seconds']+1e-8)
 def test_invalid(self):
  for data in [{},{'stops':['entrance','bad']},{'stops':['office','office']},{'stops':['entrance','office'],'travel':'fly'}]:
   with self.assertRaises(ValueError):plan(data)

 def test_layout_revision_and_east_library(self):
  with self.assertRaises(ValueError):plan({'stops':['entrance','101'],'revision':'old-layout'})
  r=plan({'stops':['entrance','101'],'revision':BUILDING['revision']})
  self.assertEqual(r['revision'],BUILDING['revision'])
  self.assertTrue(all(BUILDING['nodes'][k]['x']>=104 for k in r['legs'][0]['path']))
  for leg in r['legs']:
   for a,b in zip(leg['path'],leg['path'][1:]):
    u,v=BUILDING['nodes'][a],BUILDING['nodes'][b]
    if u['floor']!=v['floor']:
     self.assertEqual((u['x'],u['y']),(v['x'],v['y']))
