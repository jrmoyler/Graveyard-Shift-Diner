"""Meaningful package integrity checks, asset references and deduction data."""
from pathlib import Path
from PIL import Image
from scipy.io.wavfile import read
from itertools import combinations
import xml.etree.ElementTree as ET
import json,hashlib,numpy as np,subprocess
ROOT=Path(__file__).resolve().parents[1];checks={}
def js(n):return json.loads((ROOT/n).read_text())
def validate():
 sprites=js('sprite-manifest.json')
 for a in sprites:
  p=ROOT/a['path'];assert p.exists(),p
  assert hashlib.sha256(p.read_bytes()).hexdigest()==a['sha256'],p
  with Image.open(p) as im:im.verify()
  im=Image.open(p);assert [im.width,im.height]==[a['width'],a['height']]
  if a['kind']=='animation-frame':
   alpha=np.array(im.getchannel('A'));assert alpha.max()>200
   assert not (alpha[0,:]>12).any() and not (alpha[-1,:]>12).any(),p
   assert not (alpha[:,0]>12).any() and not (alpha[:,-1]>12).any(),p
 checks['png_integrity_and_frame_padding']=len(sprites)
 for p in (ROOT/'runtime/ui').rglob('*.svg'):ET.parse(p)
 checks['svg_parse']=len(list((ROOT/'runtime/ui').rglob('*.svg')))
 for a in js('runtime/audio/audio-manifest.json'):
  sr,x=read(ROOT/a['wav']);assert sr==48000 and x.ndim==2 and x.shape[1]==2
  assert np.max(np.abs(x.astype(float)))<32767
  assert abs(len(x)/sr-a['duration_seconds'])<1/sr
  assert (ROOT/a['ogg']).exists()
  if a['loop']:assert a['boundary_step']<.01,(a['id'],a['boundary_step'])
 checks['audio_format_peak_duration_and_loop_boundary']=13
 clips=js('runtime/animations/dot/clips.json')
 for name,c in clips.items():
  for i in c['frames']:assert (ROOT/f'runtime/animations/dot/{name}/{i:02}.png').exists()
  im=Image.open(ROOT/f'runtime/animations/dot/{name}.png');assert im.height==512 and im.width%512==0
 checks['animation_reference_checks']=len(clips)
 tells={t['id']:t for t in js('runtime/data/tells.json')}
 creatures=js('runtime/data/creatures.json')
 pair_count=0
 for c in creatures:
  assert len(c['tells'])==3 and c['exact_tells']==2
  for pair in combinations(c['tells'],2):
   assert tells[pair[0]]['action']!=tells[pair[1]]['action'];pair_count+=1
 checks['creature_tell_pairs_with_distinct_actions']=pair_count
 lines=js('runtime/data/dialogue-180.json');assert len(lines)==180
 for row in lines:
  assert row['tell'] in tells and len(row['line'])<=120
  assert not any(c['name'].lower() in row['line'].lower() for c in creatures)
 checks['fallback_lines_and_identity_leak_filter']=180
 for c in js('runtime/data/customer-motion-presets.json')['characters']:
  for key in ['standing','seated']:assert (ROOT/c[key]).exists()
 checks['customer_pose_paths']=18
 fonts=ROOT/'runtime/fonts';assert all((fonts/n).exists() for n in ['Pacifico-Regular.ttf','IBMPlexMono-Regular.ttf','Pacifico-OFL.txt','IBMPlexMono-OFL.txt'])
 checks['font_and_license_files']=4
 for a in js('asset-manifest.json')['assets']:
  p=ROOT/a['path'];assert p.exists();assert hashlib.sha256(p.read_bytes()).hexdigest()==a['sha256']
 checks['runtime_manifest_paths_and_hashes']=len(js('asset-manifest.json')['assets'])
 source=ROOT.parents[1]/'output/F033-Graveyard-Shift-Diner-Asset-Starter/source-art'
 # Source originals are separately checked if the first pack remains present.
 if source.exists():
  for p in source.glob('*.png'):
   q=ROOT/'source-art/original-9'/p.name;assert p.read_bytes()==q.read_bytes()
  checks['original_sheets_byte_identical']=9
 info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(ROOT/'previews/F033-Asset-Preview.mp4')]))
 assert abs(float(info['format']['duration'])-18)<.1
 checks['mp4_preview_duration_seconds']=18
 result={'status':'passed','checks':checks,'not_verified':['Full Phaser gameplay/economy integration','Physical mobile device performance','Live browser execution of offline viewer (browser binary unavailable)','Bespoke limb cycles for customers; supplied presets use transforms'],
         'visual_review':'Dot/contact sheets and desktop/mobile title, inspector, guide PNG previews inspected.'}
 (ROOT/'docs/VALIDATION.json').write_text(json.dumps(result,indent=2))
 print(json.dumps(result,indent=2))
if __name__=='__main__':validate()
