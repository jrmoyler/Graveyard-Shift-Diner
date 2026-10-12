from pathlib import Path
import sys,json,base64,hashlib
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'))
from build_ui import text,rect,svg,button,WHITE,INK,FOG,CHROME,TEAL,PAPER
def build():
 img=base64.b64encode((ROOT/'runtime/environment/title-keyart.png').read_bytes()).decode()
 bg=f'<image href="data:image/png;base64,{img}" width="1920" height="1080" preserveAspectRatio="xMidYMid slice"/>'
 body=bg+'<rect width="850" height="1080" fill="#0E1418" opacity=".72"/>'
 body+=text('Graveyard Shift',54,275,66,WHITE,'display')+text('Diner',54,390,106,WHITE,'display')
 body+=text('Pour the coffee. Read the tells.',54,475,24)+text('Decide who leaves through the front door.',54,517,24)
 for i,label in enumerate(['Start shift','Continue','Endless','Settings','Credits']):body+=button(label,54,580+i*82,480)
 body+=text('F033 / MARROW FALLS',54,1036,18,FOG);svg('screens/title-desktop',1920,1080,body)
 bg=f'<image href="data:image/png;base64,{img}" x="-605" y="0" width="1498" height="844" preserveAspectRatio="xMidYMid slice"/>'
 body=bg+'<rect width="390" height="844" fill="#0E1418" opacity=".68"/>'
 body+=text('Graveyard Shift',20,155,34,WHITE,'display')+text('Diner',20,223,54,WHITE,'display')
 body+=text('Pour the coffee.',20,286,20)+text('Read the tells.',20,323,20)
 for i,label in enumerate(['Start shift','Continue','Endless','Settings','Credits']):body+=button(label,20,385+i*76,350)
 svg('screens/title-mobile',390,844,body)
 svg('screens/credits',1024,720,rect(2,2,1020,716,INK,CHROME)+text('Credits',40,90,56,WHITE,'display')+
     text('Graveyard Shift Diner / F033',40,166,26)+text('Concept: John-Ross Moyler',40,225,24)+
     text('Collective AI Inc.',40,269,24)+text('Art: generated for this project',40,340,22)+
     text('Audio: original code composition',40,384,22)+text('Fonts: Pacifico / IBM Plex Mono',40,428,22)+
     text('OFL licenses bundled with fonts',40,472,20,FOG)+button('Back',40,600,300))
 # Exact normal/offset projection template. Runtime may also tint real sprite alpha.
 shadow='<path d="M74 152Q51 136 61 113L67 74Q69 63 80 61L79 39Q65 17 84 11Q110 6 110 29L105 58L125 82L152 99L147 109L112 93L107 122L122 168L110 173L89 134L83 177L69 177Z" fill="#080C0F" opacity=".75"/>'
 for name,angle in [('shadow-normal',0),('shadow-offset',8)]:
  svg('tells/'+name,200,200,f'<g transform="rotate({angle} 90 175)">{shadow}</g>')
 # All generated pairs choose separate inspection categories.
 creatures=json.loads((ROOT/'runtime/data/creatures.json').read_text())
 tells={x['id']:x for x in json.loads((ROOT/'runtime/data/tells.json').read_text())}
 for c in creatures:assert len({tells[t]['action'] for t in c['tells']})==3
 paths=[str(p.relative_to(ROOT)) for p in sorted((ROOT/'runtime/ui').rglob('*.svg'))]
 (ROOT/'runtime/ui/ui-manifest.json').write_text(json.dumps({'format':'Editable SVG with outlined typography','assets':paths},indent=2))
 assets=[]
 for p in sorted((ROOT/'runtime').rglob('*')):
  if not p.is_file():continue
  assets.append(dict(id=str(p.relative_to(ROOT/'runtime')).replace('/','__'),path=str(p.relative_to(ROOT)),
      bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
 (ROOT/'asset-manifest.json').write_text(json.dumps({'game':'F033 Graveyard Shift Diner','version':2,'assets':assets,
  'review':'File/format and static visual checks completed; full Phaser gameplay and physical device checks not performed.'},indent=2))
 print('UI assets:',len(paths),'runtime files:',len(assets))
if __name__=='__main__':build()
