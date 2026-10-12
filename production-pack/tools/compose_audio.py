"""Original deterministic synthesized game audio. No downloaded recordings.
Requires NumPy, SciPy and ffmpeg. 48 kHz, stereo 16-bit WAV plus OGG.
"""
from pathlib import Path
import numpy as np
from scipy.signal import butter,sosfilt
from scipy.io.wavfile import write
import json, subprocess
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'runtime/audio';OUT.mkdir(parents=True,exist_ok=True)
SR=48000;RNG=np.random.default_rng(33033);MAN=[]
def filtered(x,hz,kind='lowpass'):return sosfilt(butter(2,hz,btype=kind,fs=SR,output='sos'),x)
def env(n,attack=.01,release=.08):
 e=np.ones(n);a=min(n//2,max(1,int(attack*SR)));r=min(n//2,max(1,int(release*SR)))
 e[:a]=np.sin(np.linspace(0,np.pi/2,a))**2;e[-r:]=np.cos(np.linspace(0,np.pi/2,r))**2
 return e
def tone(midi,duration,organ=False):
 n=round(duration*SR);t=np.arange(n)/SR;f=440*2**((midi-69)/12)
 partials=[(1,1),(2,.35),(3,.15),(4,.08)] if organ else [(1,1),(2,.14)]
 x=sum(g*np.sin(2*np.pi*f*h*t) for h,g in partials)
 return x*env(n,.008,.11)*(.92+.08*np.sin(2*np.pi*5*t))
def save(name,x,loop=False,caption='',gain=.7):
 if x.ndim==1:x=np.column_stack([x,x])
 x=x-np.mean(x,axis=0);peak=np.max(np.abs(x));x=x/(peak or 1)*gain
 if not loop:x*=env(len(x),.003,.025)[:,None]
 # Loops use periodic render or complete musical cadence; metadata reports boundary.
 pcm=np.clip(x*32767,-32768,32767).astype(np.int16)
 wav=OUT/(name+'.wav');write(wav,SR,pcm)
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-c:a','libvorbis','-q:a','5',str(OUT/(name+'.ogg'))],check=True)
 MAN.append(dict(id=name,wav='runtime/audio/'+name+'.wav',ogg='runtime/audio/'+name+'.ogg',
   duration_seconds=len(x)/SR,sample_rate=SR,channels=2,loop=loop,loop_start=0,loop_end=len(x),
   peak_dbfs=round(20*np.log10(max(np.max(np.abs(pcm))/32768,1e-10)),2),
   boundary_step=round(float(np.max(np.abs(x[-1]-x[0]))),7),caption=caption,
   provenance='Original code composition/synthesis; no sampled recordings or generated service output'))

def music():
 beat=60/72;dur=32*beat;n=round(dur*SR);x=np.zeros((n,2))
 def add(m,start,length,gain=.1,pan=0,organ=True):
  v=tone(m,length*beat,organ)*gain;idx=(round(start*beat*SR)+np.arange(len(v)))%n
  x[idx,0]+=v*np.sqrt((1-pan)/2);x[idx,1]+=v*np.sqrt((1+pan)/2)
 chords=[(48,51,55),(48,51,58),(44,48,51),(46,50,53),(48,51,55),(41,44,48),(43,47,50),(43,47,53)]
 melody=[72,75,74,72,70,67,68,70,72,67,63,65,67,65,62,67]
 for bar,ch in enumerate(chords):
  for b in [0,2]:
   for j,m in enumerate(ch):add(m,bar*4+b,1.8,.07,(j-1)*.25)
  for b in range(4):add(ch[0]-12,bar*4+b,.7,.08,-.25,False)
  add(melody[bar*2],bar*4+.5,.8,.10,.2);add(melody[bar*2+1],bar*4+2.5,.8,.1,.2)
  for b in [1,3]:
   ns=round(.12*SR);v=filtered(RNG.normal(size=ns),3500)*env(ns,.004,.1)*.013
   idx=(round((bar*4+b)*beat*SR)+np.arange(ns))%n
   x[idx]+=v[:,None]
 save('music-jukebox',x,True,'Soft organ jukebox',.5)
 # Exactly integer-period harmonics give a periodic low drone at file boundaries.
 dur=16;t=np.arange(SR*dur)/SR
 x=.6*np.sin(2*np.pi*43.5*t)+.25*np.sin(2*np.pi*65.25*t)+.12*np.sin(2*np.pi*87.0625*t)
 x*=.75+.25*np.cos(2*np.pi*t/16)
 save('music-dread-drone',np.column_stack([x,np.roll(x,120)]),True,'Low tension drone',.38)

def effects():
 def t(sec):return np.arange(round(sec*SR))/SR
 def bell(name,freq):
  z=t(1.6);x=sum(g*np.sin(2*np.pi*f*z)*np.exp(-z*k) for f,g,k in [(freq,1,4),(freq*2.76,.5,6),(freq*5.4,.2,12)])
  save(name,x,False,'Door bell' if name=='sfx-door-bell' else 'Door bell sounds lower and uneven')
 bell('sfx-door-bell',880);bell('sfx-wrong-bell',622.25)
 z=t(2.2);n=filtered(RNG.normal(size=len(z)),6000);x=n*(.09+.06*np.sin(2*np.pi*7*z)**2)
 x+=.09*np.sin(2*np.pi*(500*z+80*z*z));save('sfx-coffee-pour',x,False,'Coffee pours into cup',.45)
 z=t(4);n=RNG.normal(size=len(z));x=filtered(n,8500)*.12
 for k in range(65):
  st=int(RNG.uniform(0,3.9)*SR);nn=min(1000,len(x)-st);x[st:st+nn]+=RNG.uniform(.03,.15)*np.exp(-np.arange(nn)/100)*RNG.normal(size=nn)
 # Crossfade an exact periodic seam for noisy ambience.
 fade=round(.15*SR);x[:fade]=(x[:fade]+x[-fade:])/2;x[-fade:]=x[:fade]
 x[0]=x[-1]=(x[0]+x[-1])/2
 save('sfx-grill-sizzle',x,True,'Grill sizzling',.35)
 z=t(.9);x=np.sin(2*np.pi*1760*z)*np.exp(-z*8)+.2*np.sin(2*np.pi*3520*z)*np.exp(-z*16)
 x+=filtered(RNG.normal(size=len(z)),1600)*np.exp(-z*55)*.18;save('sfx-register',x,False,'Register ding',.55)
 z=t(.55);x=(np.sin(2*np.pi*2250*z)+.5*np.sin(2*np.pi*3570*z))*np.exp(-z*27)
 x+=filtered(RNG.normal(size=len(z)),4500)*np.exp(-z*70)*.2;save('sfx-plate-set',x,False,'Plate touches counter',.35)
 z=t(.85);x=filtered(RNG.normal(size=len(z)),1000)*np.exp(-z*14)
 x+=np.sin(2*np.pi*65*z)*np.exp(-z*9)
 # Ordinary door closure, restrained level, not a jump-scare peak.
 save('sfx-refuse-door',x,False,'Door closes firmly',.48)
 z=t(1.5);x=filtered(RNG.normal(size=len(z)),1800)*(.1+.15*np.sin(2*np.pi*11*z)**4)*(1-z/1.5)
 save('sfx-lantern-gutter',x,False,'Lantern sputters and goes out',.3)
 for name,sec,f,gain,caption in [('sfx-neon-buzz',4,120,.18,'Neon electrical hum'),('amb-fluorescent',4,60,.12,'Fluorescent hum')]:
  z=t(sec);x=np.sin(2*np.pi*f*z)+.2*np.sin(2*np.pi*3*f*z);x*=.85+.15*np.cos(2*np.pi*z/sec)
  save(name,x,True,caption,gain)
 z=t(8);x=sum(RNG.uniform(.02,.12)*np.sin(2*np.pi*(i/8)*z+RNG.uniform(0,6.28)) for i in range(20,350))
 x*=.6+.4*np.cos(2*np.pi*z/8)**2
 save('amb-road-wind',x,True,'Wind along the empty road',.2)

if __name__=='__main__':
 music();effects()
 (OUT/'audio-manifest.json').write_text(json.dumps(MAN,indent=2))
 print(json.dumps({'audio_assets':len(MAN),'loops':sum(x['loop'] for x in MAN)}))
