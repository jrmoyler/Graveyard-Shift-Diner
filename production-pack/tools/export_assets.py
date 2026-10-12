"""Reproducible sprite extraction, registration, atlas and preview exports.
Uses the generated PNG artwork as source; does not redraw character anatomy.
Requires Pillow, NumPy and SciPy. Run from any directory.
"""
from pathlib import Path
import json, shutil, hashlib
import numpy as np
from scipy.ndimage import label, find_objects, binary_dilation
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'source-art'
RUN=ROOT/'runtime'
MAN=[]
RESAMPLE=Image.Resampling.LANCZOS

NEW={
'dot-walk':'exec-818d5d4e-e0d5-4841-bf03-3b4ee6c713f7.png',
'hands-corrected':'exec-0bcbc617-75ad-4099-9bd2-266312760545.png',
'dot-idle':'exec-109a1698-6288-497f-8047-d1c4e9d4f0e8.png',
'dot-serve-rejected':'exec-a6ebeb04-a1d6-42e3-87ca-74e566161ae0.png',
'dot-pour':'exec-55b42b5a-4870-4736-a2ac-2b6c03f58198.png',
'dot-inspect':'exec-bb961cc6-a285-4493-98f5-6fa6dc5d0a60.png',
'dot-refuse':'exec-bc25f4ad-d522-4414-a024-f14389ae99a8.png',
'dot-flinch':'exec-a951a615-bd61-4448-97f2-a39e4c1af2c8.png',
'seated-humans':'exec-01eaaf37-374f-42ec-b038-fa5882fee84e.png',
'seated-creatures':'exec-ed18e432-6f63-4285-b9be-5c04da25bbb3.png',
'upgrades-staff':'exec-dcf3bbe7-beba-409c-8453-f4d2e961c485.png',
'environment-modules':'exec-65fe67d3-5987-4eaa-b8f6-5567d08052ec.png',
'effects-isolated':'exec-bb6f9c6a-b133-459b-8fd9-2c41b6b1e58a.png',
'diner-rear':'exec-2faf0f69-6dd3-438a-82ad-00b41a208e1f.png',
'dot-serve':'exec-acdefdf2-4f72-43c9-81b8-54680d4d34ed.png',
'title-keyart':'exec-79d66ce4-ad0c-4900-8c5f-e570b03fdfb1.png'}

def record(path,kind,**data):
    im=Image.open(path)
    MAN.append(dict(id=path.stem,path=str(path.relative_to(ROOT)),kind=kind,
        width=im.width,height=im.height,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),**data))

def save(im,path,kind,**data):
    path.parent.mkdir(parents=True,exist_ok=True);im.save(path);record(path,kind,**data)

def parts(file,cols,rows,minarea=80):
    """Group connected alpha components by nearest sheet slot.
    Component-based boundaries avoid chopping art that spills over a grid line.
    Tiny detached islands are excluded; preserved sources remain untouched.
    """
    im=Image.open(file).convert('RGBA')
    a=np.array(im);labs,n=label(a[:,:,3]>12)
    sizes=np.bincount(labs.ravel());objs=find_objects(labs)
    groups=[[] for _ in range(cols*rows)]
    for j,box in enumerate(objs):
        if box is None or sizes[j+1]<minarea:continue
        cy=(box[0].start+box[0].stop)/2
        cx=(box[1].start+box[1].stop)/2
        c=min(cols-1,max(0,int(cx/im.width*cols)))
        r=min(rows-1,max(0,int(cy/im.height*rows)))
        groups[r*cols+c].append(j+1)
    result=[]
    for group in groups:
        if not group:raise ValueError(f'Empty slot: {file}')
        m=np.isin(labs,group)
        # Keep antialiased edge pixels around the selected islands.
        m=binary_dilation(m,iterations=3)
        out=a.copy();out[:,:,3]=np.where(m,a[:,:,3],0)
        out[out[:,:,3]<3,3]=0
        p=Image.fromarray(out)
        bbox=p.getchannel('A').point(lambda v:255 if v>12 else 0).getbbox()
        result.append(p.crop(bbox))
    return result

def fit(p,size=512,margin=24,pivot='bottom',scale=None):
    scale=scale or min((size-2*margin)/p.width,(size-2*margin)/p.height)
    q=p.resize((round(p.width*scale),round(p.height*scale)),RESAMPLE)
    out=Image.new('RGBA',(size,size))
    # Foot-center registration resists shifts caused by an extending arm.
    if pivot=='foot':
        a=np.array(p)[:,:,3];ys,xs=np.where(a[int(p.height*.88):,:]>24)
        footx=float(np.median(xs)) if len(xs) else p.width/2
        x=round(size/2-footx*scale);y=size-margin-q.height
    else:x=(size-q.width)//2;y=size-margin-q.height if pivot=='bottom' else (size-q.height)//2
    if x<margin//2 or x+q.width>size-margin//2:
        x=max(6,min(x,size-q.width-6))
    out.alpha_composite(q,(x,y))
    return out

humans=['earl','vonda','pruitt-a','pruitt-b','coach-hale','ines','ricky','postal-worker','mechanic','salesman','warehouse-worker','librarian']
creatures=['hollow-driver','fog-kin','under-sleeper','lamp-moth','reflection-twin','pale-hitcher']
recipes=[
('original-9/human-customers-12.png',4,3,humans,'characters/standing','foot'),
('original-9/creature-disguises-6.png',3,2,creatures,'characters/standing','foot'),
('new/seated-humans.png',4,3,humans,'characters/seated','bottom'),
('new/seated-creatures.png',3,2,creatures,'characters/seated','bottom'),
('original-9/diner-props-12.png',4,3,['napkin-dispenser','pie-case','burners-4','register','guide-closed','guide-open','lantern-lit','lantern-out','coffee-pot','coffee-cup','salt-pepper','door-bell'],'props','center'),
('original-9/dishes-8.png',4,2,['coffee','apple-pie','breakfast','pancakes','grilled-cheese-soup','burger-fries','chili','meatloaf'],'food','center'),
('new/hands-corrected.png',2,2,['hand-normal','hand-extra-knuckles','glove-normal','glove-extra-knuckles'],'tells','center'),
('new/upgrades-staff.png',3,2,['hired-cook-idle','hired-cook-work','night-manager','mirror','burner-upgrade','jukebox'],'upgrades','bottom'),
('new/environment-modules.png',3,2,['booth','service-tray','exterior-car','door-closed','door-open','fluorescent-fixture'],'environment/modules','bottom'),
('new/effects-isolated.png',3,2,['coffee-steam','cold-breath','sleeve-dust','wet-footprints','door-fog','lantern-flame'],'effects','center')]

def export():
    generated=ROOT.parents[1]/'generated_images'
    for k,f in NEW.items():
        if not (SRC/'new'/f'{k}.png').exists():shutil.copy2(generated/f,SRC/'new'/f'{k}.png')
    for f,c,r,names,dest,pivot in recipes:
        seq=parts(SRC/f,c,r,minarea=20 if dest=='effects' else 80)
        for name,p in zip(names,seq):
            image=fit(p,pivot=pivot)
            save(image,RUN/dest/f'{name}.png','sprite',origin=[.5,.953125] if pivot!='center' else [.5,.5],
                 source=f'source-art/{f}',export='component extraction and uniform fit')
            if dest=='characters/standing':
                # Head/costume source parts retained for modular assembly; no invented anatomy.
                for part,rect in [('head',(0,0,p.width,round(p.height*.31))),
                                  ('costume',(0,round(p.height*.28),p.width,round(p.height*.78)))]:
                    save(fit(p.crop(rect),size=256,pivot='center'),RUN/'characters/parts'/name/f'{part}.png','swap-source',
                         source=f'source-art/{f}',assembly_review='Head/costume crops require sockets in consuming rig')
    clips={}
    for action,cols,rows in [('idle',4,1),('walk',4,2),('serve',2,2),('pour',4,1),('inspect',2,2),('refuse',2,2),('flinch',2,2)]:
        seq=parts(SRC/'new'/f'dot-{action}.png',cols,rows)
        # One global scale per whole animation. Upright opening pose anchors height.
        scale=min(430/seq[0].height,468/max(p.width for p in seq),468/max(p.height for p in seq))
        frames=[fit(p,pivot='foot',scale=scale) for p in seq]
        atlas=Image.new('RGBA',(512*len(frames),512))
        for i,f in enumerate(frames):
            path=RUN/'animations/dot'/action/f'{i:02}.png'
            save(f,path,'animation-frame',origin=[.5,.953125],source=f'source-art/new/dot-{action}.png')
            atlas.alpha_composite(f,(i*512,0))
        atlaspath=RUN/'animations/dot'/f'{action}.png'
        save(atlas,atlaspath,'spritesheet',frame_width=512,frame_height=512,frame_count=len(frames))
        order=list(range(len(frames)))
        # Walk is a generated source loop; do not claim physical locomotion QA.
        if action=='idle':order=[0,1,2,3,2,1]
        if action=='inspect':order=[0,1,2,2,3]
        fps={'idle':3,'walk':8,'serve':6,'pour':4,'inspect':5,'refuse':6,'flinch':7}[action]
        clips[action]=dict(texture=action,frameWidth=512,frameHeight=512,frames=order,frameRate=fps,repeat=-1 if action in ['idle','walk'] else 0,
                           origin=[.5,.953125],review='Generated animation; cross-clip body-scale and loop continuity reviewed in asset viewer, final game integration pending')
        # APNG preserves full alpha; GIF is only a flattened convenience preview.
        pngframes=[frames[i] for i in order]
        pngframes[0].save(ROOT/'previews'/f'dot-{action}.apng',save_all=True,append_images=pngframes[1:],
                         duration=round(1000/fps),loop=0,disposal=0,blend=0)
        bgframes=[]
        for f in pngframes:
            bg=Image.new('RGBA',(512,512),'#0E1418');bg.alpha_composite(f);bgframes.append(bg.convert('RGB'))
        bgframes[0].save(ROOT/'previews'/f'dot-{action}.gif',save_all=True,append_images=bgframes[1:],duration=round(1000/fps),loop=0)
    (RUN/'animations/dot/clips.json').write_text(json.dumps(clips,indent=2))
    # Cropping source framing margins is a noncreative export; sources stay intact.
    for name in ['diner-rear','title-keyart']:
        im=Image.open(SRC/'new'/f'{name}.png')
        if name=='diner-rear':im=im.crop((0,143,im.width,763))
        save(im,RUN/'environment'/f'{name}.png','background',source=f'source-art/new/{name}.png')
    im=Image.open(SRC/'original-9/diner-six-table-background.png')
    save(im.crop((0,143,im.width,763)),RUN/'environment/diner-original.png','background',
         source='source-art/original-9/diner-six-table-background.png')
    # Stable neon states: exact code-authored fixture geometry, shared viewBox.
    path='M36 112 H144 V154 Q144 180 90 180 Q36 180 36 154 Z M144 126 H157 Q180 126 174 151 Q171 164 144 164 M24 190 H156 M63 96 C43 74 79 63 61 35 M102 96 C80 71 121 58 101 24'
    for name,col,op in [('lit','#E63946',1),('flicker','#E63946',.3),('out','#5B3A29',1)]:
        svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220"><path d="{path}" fill="none" stroke="#0E1418" stroke-width="12"/><path d="{path}" fill="none" stroke="{col}" opacity="{op}" stroke-width="5" stroke-linecap="round"/></svg>'
        p=RUN/'effects'/f'neon-{name}.svg';p.write_text(svg)
    (ROOT/'sprite-manifest.json').write_text(json.dumps(MAN,indent=2))
    print(json.dumps({'sprites':len(MAN),'clips':len(clips),'original_sheets':9,'new_sheets':len(NEW)}))

if __name__=='__main__':export()
