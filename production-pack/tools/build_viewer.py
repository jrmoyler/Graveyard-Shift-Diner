"""Offline asset viewer and linked guide pages. No CDN or API required."""
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'))
from build_ui import text,rect,svg,INK,PAPER,CHROME,FOG,TEAL
def build():
 data={}
 for p in (ROOT/'runtime/data').glob('*.json'):data[p.stem]=json.loads(p.read_text())
 data['clips']=json.loads((ROOT/'runtime/animations/dot/clips.json').read_text())
 data['audio']=json.loads((ROOT/'runtime/audio/audio-manifest.json').read_text())
 data['sprites']=json.loads((ROOT/'sprite-manifest.json').read_text())
 data['ui']=json.loads((ROOT/'runtime/ui/ui-manifest.json').read_text())['assets']
 for c in data['creatures']:
  body=rect(2,2,756,676,PAPER,CHROME,0)+text(c['name'],28,72,42,INK,'display')+text('MARROW FALLS / FIELD NOTES',28,116,18,FOG)
  for i,tell in enumerate(c['tells']):
   label=tell.replace('-',' ').capitalize()
   body+=text(str(i+1)+'. '+label,28,195+i*72,23,INK)
  body+=text('Two independent tells. Never just one.',28,470,20,INK)+text('Record harmless exceptions for regulars.',28,526,20,TEAL)
  svg('guide/'+c['id'],760,680,body)
 for id in ['earl','vonda','pruitt-twins','coach-hale','ines','ricky']:
  r=next(r for r in data['regulars'] if r['id']==id)
  label=(r['false_tell'] or 'No fixed exception').replace('-',' ')
  body=rect(2,2,756,676,PAPER,CHROME,0)+text(id.replace('-',' ').title(),28,72,44,INK,'display')+text('REGULAR / OBSERVATION RECORD',28,120,20,FOG)
  body+=text('Known exception:',28,210,24,INK)+text(label,28,255,23,INK)+text('A false tell is not a verdict.',28,355,22,TEAL)+text('Remember the person, not only the clue.',28,420,20,INK)
  svg('guide/regular-'+id,760,680,body)
 data['ui']=[str(p.relative_to(ROOT)) for p in sorted((ROOT/'runtime/ui').rglob('*.svg'))]
 (ROOT/'viewer/data.js').parent.mkdir(parents=True,exist_ok=True)
 (ROOT/'viewer/data.js').write_text('window.F033_DATA='+json.dumps(data,ensure_ascii=False)+';')
 print('Offline viewer data and guide pages written.')
if __name__=='__main__':build()
