"""Asset demonstration MP4, not a gameplay recording."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import subprocess,json
ROOT=Path(__file__).resolve().parents[1];W,H,FPS=1280,720,24;DUR=18
font=ImageFont.truetype(str(ROOT/'runtime/fonts/IBMPlexMono-Regular.ttf'),24)
display=ImageFont.truetype(str(ROOT/'runtime/fonts/Pacifico-Regular.ttf'),58)
bg=Image.open(ROOT/'runtime/environment/diner-original.png').convert('RGB').resize((1280,475))
title=Image.open(ROOT/'runtime/environment/title-keyart.png').convert('RGB').resize((W,H))
clips=json.loads((ROOT/'runtime/animations/dot/clips.json').read_text())
seq=list(clips);cache={}
for name,c in clips.items():
 for i in set(c['frames']):cache[(name,i)]=Image.open(ROOT/'runtime/animations/dot'/name/f'{i:02}.png').convert('RGBA').resize((340,340))
cmd=['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
 '-i',str(ROOT/'runtime/audio/music-jukebox.wav'),'-t',str(DUR),'-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p',
 '-af','volume=0.45','-c:a','aac','-b:a','160k','-movflags','+faststart',str(ROOT/'previews/F033-Asset-Preview.mp4')]
p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for f in range(DUR*FPS):
 t=f/FPS
 if t<3:
  frame=title.copy();over=Image.new('RGB',(620,H),'#0E1418');frame.paste(Image.blend(frame.crop((0,0,620,H)),over,.6),(0,0));d=ImageDraw.Draw(frame)
  d.text((40,110),'Graveyard Shift',font=display,fill='#E8F5E1');d.text((40,190),'Diner',font=display,fill='#E8F5E1')
  d.text((40,340),'F033 / Asset production preview',font=font,fill='#C9CED6');d.text((40,390),'Original art + sprite exports',font=font,fill='#C9CED6')
 else:
  name=seq[min(6,int((t-3)/2))]
  c=clips[name];idx=c['frames'][int((t-3)*c['frameRate'])%len(c['frames'])]
  frame=Image.new('RGB',(W,H),'#0E1418');frame.paste(bg,(0,110));sprite=cache[(name,idx)]
  frame.paste(sprite,(855,307),sprite);d=ImageDraw.Draw(frame)
  d.text((24,28),'GRAVEYARD SHIFT DINER',font=font,fill='#E8F5E1')
  d.text((24,642),name.upper()+' / '+str(c['frameRate'])+' FPS',font=font,fill='#E8F5E1')
  d.text((24,681),'Asset demonstration — not gameplay footage',font=ImageFont.truetype(str(ROOT/'runtime/fonts/IBMPlexMono-Regular.ttf'),18),fill='#7D8A8F')
 p.stdin.write(frame.tobytes())
p.stdin.close();code=p.wait()
if code:raise SystemExit(code)
print('Preview MP4 rendered:',DUR,'seconds')
