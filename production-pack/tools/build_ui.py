"""Exact editable SVG game UI, with fonts outlined for portable rendering."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
import json
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'runtime/ui';OUT.mkdir(parents=True,exist_ok=True)
INK='#0E1418';WHITE='#E8F5E1';TEAL='#2F6F73';CHROME='#C9CED6';RED='#E63946';FOG='#7D8A8F';PAPER='#E8E3D7'
FONTS={k:TTFont(ROOT/'runtime/fonts'/f) for k,f in [('mono','IBMPlexMono-Regular.ttf'),('display','Pacifico-Regular.ttf')]}
def text(s,x,y,size=24,color=WHITE,font='mono'):
 f=FONTS[font];gs=f.getGlyphSet();cm=f.getBestCmap();scale=size/f['head'].unitsPerEm;advance=0;paths=[]
 for c in s:
  g=cm.get(ord(c),'.notdef');pen=SVGPathPen(gs);gs[g].draw(pen)
  paths.append(f'<path d="{pen.getCommands()}" transform="translate({x+advance*scale:.3f},{y}) scale({scale:.6f},{-scale:.6f})" fill="{color}"/>')
  advance+=f['hmtx'][g][0]
 return ''.join(paths)
def rect(x,y,w,h,fill=INK,stroke=FOG,r=4):
 return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
def svg(name,w,h,body):
 p=OUT/(name+'.svg');p.parent.mkdir(parents=True,exist_ok=True)
 p.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{name}">{body}</svg>')
def button(label,x,y,w=260,state='default',danger=False):
 fill=RED if danger else TEAL;line=CHROME;opacity=1
 if state=='hover':line=WHITE
 if state=='pressed':fill=INK
 if state=='disabled':fill='#273035';line='#4C585C';opacity=.5
 b=rect(x,y,w,56,fill,line)+text(label,x+18,y+36,20)
 if state=='focus':b+=f'<rect x="{x-4}" y="{y-4}" width="{w+8}" height="64" rx="6" fill="none" stroke="{WHITE}" stroke-width="2"/>'
 return f'<g opacity="{opacity}">{b}</g>'
ICONS={
'hands':'M20 52V28Q20 24 24 24Q28 24 28 28V38V16Q28 12 32 12Q36 12 36 16V36V20Q36 16 40 16Q44 16 44 20V38V26Q44 22 48 22Q52 22 52 26V48Q52 62 36 62Q26 62 20 52L10 42Q6 36 12 32Z',
'reflection':'M12 8H52V58H12Z M22 22L42 42 M22 42L42 22',
'question':'M12 12H52V42H34L22 54V42H12Z M26 24Q26 16 34 18Q42 20 34 28L32 32 M32 36V38',
'salt':'M22 10H42V18H22Z M18 18H46L50 56H14Z M28 12V14 M36 12V14',
'coffee':'M10 26H44V44Q44 58 28 58Q10 58 10 44Z M44 30H52Q62 40 44 46 M24 18Q18 12 24 6 M34 18Q28 12 34 6',
'cash':'M6 14H58V50H6Z M24 32A8 8 0 1 0 40 32A8 8 0 1 0 24 32 M12 22V42 M52 22V42',
'clock':'M8 32A24 24 0 1 0 56 32A24 24 0 1 0 8 32 M32 14V32L44 40',
'lantern':'M24 14V8H40V14 M20 18H44L50 54H14Z M22 56H42 M30 44Q22 36 32 26Q42 38 34 44Z',
'reputation':'M32 6L40 22L58 24L44 38L48 56L32 48L16 56L20 38L6 24L24 22Z',
'refuse':'M8 32A24 24 0 1 0 56 32A24 24 0 1 0 8 32 M16 16L48 48',
'serve':'M8 44H56 M12 40Q14 18 32 18Q50 18 52 40Z M28 14H36',
'pause':'M20 12V52 M44 12V52',
'car':'M10 26L18 16H44L52 26V46H8V26Z M18 46V54 M46 46V54 M18 34H22 M42 34H46',
'footprints':'M18 10Q26 8 28 20L24 40H12L10 26Z M40 24Q48 22 50 36L46 56H34L32 40Z',
'coins':'M8 30A14 14 0 1 0 36 30A14 14 0 1 0 8 30 M30 38A14 14 0 1 0 58 38',
'blink':'M8 32Q32 10 56 32Q32 54 8 32Z M26 32A6 6 0 1 0 38 32A6 6 0 1 0 26 32'}
def icon(name,color=WHITE):
 return f'<path d="{ICONS[name]}" fill="none" stroke="{color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
def build():
 for name in ICONS:svg('icons/'+name,64,64,icon(name))
 for label in ['Serve','Refuse','Hands','Reflection','Question','Salt','Coffee','Continue','Pause','Start shift']:
  for state in ['default','hover','focus','pressed','disabled']:
   svg('buttons/'+label.lower().replace(' ','-')+'-'+state,272,72,button(label,6,8,260,state,label=='Refuse'))
 # Portable outlines ensure exact label shapes even if game font loading is delayed.
 svg('dot-badge',150,60,rect(2,2,146,56,PAPER,CHROME)+text('DOT',41,42,36,INK))
 svg('title-wordmark',1120,240,text('Graveyard Shift',20,104,88,WHITE,'display')+text('Diner',20,205,96,WHITE,'display'))
 svg('order-ticket',300,420,rect(2,2,296,416,PAPER,CHROME,0)+text('TABLE 03',24,44,24,INK)+text('ORDER 018',24,84,18,INK)+
     text('Breakfast plate',24,150,20,INK)+text('Coffee',24,190,20,INK)+text('TOTAL  $18.00',24,270,20,INK)+text('WAITING  42s',24,326,20,INK)+text('TAKE ORDER',24,384,20,TEAL))
 svg('receipt-panel',620,720,rect(2,2,616,716,PAPER,CHROME,0)+text('SHIFT RECEIPT',36,62,38,INK,'display')+
     ''.join(text(s,36,140+i*54,24,INK) for i,s in enumerate(['NIGHT 01 / 05:00 AM','Sales            $240','Tips              $36','Refusals          -$0','Rent             $180','Cash balance     $216','Lanterns remaining  3']))+text('SAMPLE VALUES',36,660,18,FOG))
 svg('hud-desktop',1280,110,rect(2,2,1276,106,INK,CHROME)+text('$120  / RENT $180',24,44,24)+text('NIGHT 01',24,82,18,FOG)+text('11:00 PM',535,64,36)+text('REPUTATION 60',965,44,20)+text('LANTERNS 3',1000,82,20))
 svg('hud-mobile',390,138,rect(2,2,386,134,INK,CHROME)+text('11:00 PM',20,40,28)+text('NIGHT 01',240,38,18)+text('$120 / RENT $180',20,82,20)+text('REP 60',20,116,18)+text('LANTERNS 3',205,116,18))
 svg('inspector',780,620,rect(2,2,776,616,INK,CHROME)+text('TABLE 03 / INSPECT',28,48,28)+text('One clue is not a verdict.',28,86,18,FOG)+
     ''.join(button(s,28+(i%2)*374,130+(i//2)*82,346) for i,s in enumerate(['Hands','Reflection','Question','Salt','Coffee']))+
     text('Each inspection takes 4 seconds.',28,416,20)+button('Serve',28,480,346)+button('Refuse',402,480,346,danger=True))
 svg('patience-ring',96,96,'<circle cx="48" cy="48" r="38" fill="none" stroke="#273035" stroke-width="8"/><circle cx="48" cy="48" r="38" fill="none" stroke="'+WHITE+'" stroke-width="8" stroke-dasharray="179 60" transform="rotate(-90 48 48)"/>'+text('45',30,56,24))
 for label,title in [('shift-start','The night begins'),('darkness','The diner goes dark'),('fired','Your shift is over'),('pause','Paused')]:
  svg('panels/'+label,780,400,rect(2,2,776,396,INK,CHROME)+text(title,40,100,48,WHITE,'display')+text('Marrow Falls / Graveyard Shift Diner',40,180,20,FOG)+button('Continue',40,280,300))
 for id,name,price in [('mirror','Counter mirror',150),('bell','Door bell',80),('burners','Extra burners',200),('salt','Table salt',60),('cook','Hired cook',250)]:
  svg('upgrades/'+id,440,240,rect(2,2,436,236,INK,CHROME)+text(name,24,60,32,WHITE,'display')+text('$'+str(price),24,115,30)+button('Purchase',24,154,390))
 settings=['Flicker off','Grain off','Subtitles','Slow patience','High contrast','Reduced motion']
 svg('settings',660,620,rect(2,2,656,616,INK,CHROME)+text('Settings',28,64,40,WHITE,'display')+
     ''.join(rect(30,110+i*65,32,32,TEAL,WHITE)+text(s,82,137+i*65,22) for i,s in enumerate(settings)))
 svg('guide-page-template',760,680,rect(2,2,756,676,PAPER,CHROME,0)+text('FIELD NOTES',36,62,36,INK)+
     text('Observed evidence',36,140,26,INK)+text('Two independent tells matter.',36,198,20,INK)+
     text('A familiar face can mislead.',36,248,20,INK)+text('Record exceptions for regulars.',36,298,20,INK)+
     text('Select a creature entry in the viewer.',36,570,20,TEAL))
 (OUT/'ui-manifest.json').write_text(json.dumps({'format':'SVG with outlined exact typography','font_sources':['Pacifico-Regular.ttf','IBMPlexMono-Regular.ttf'],
      'assets':[str(p.relative_to(ROOT)) for p in sorted(OUT.rglob('*.svg'))]},indent=2))
 print('UI SVG assets:',len(list(OUT.rglob('*.svg'))))
if __name__=='__main__':build()
