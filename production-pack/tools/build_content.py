"""Authored deterministic dialogue, guide content, recipes and state metadata."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'runtime/data';OUT.mkdir(parents=True,exist_ok=True)
def write(n,x):(OUT/n).write_text(json.dumps(x,indent=2,ensure_ascii=False))
LINES={
'no-reflection':"Funny little mirror on that dispenser.|Nothing worth looking at behind me.|I prefer the window to polished metal.|That chrome is cleaner than I expected.|You keep checking that silver box.|There is nothing for me in that mirror.|I sit where the chrome is quiet.|Don't trouble yourself polishing it for me.|The napkins will do. Leave the mirror.|I have no use for another look at myself.",
'cold-coffee':"The warmth never lasts near me.|Cold already. Leave it that way.|I drink it however it arrives.|No steam. That suits me.|You just poured it? I hadn't noticed.|Don't warm the cup again.|The heat goes quickly at this table.|I never ask for a second warming.|Let it cool. It won't take long.|Keep the hot pot away from my hands.",
'knows-name':"Long night, {name}?|You look tired, {name}.|Still pouring, {name}?|Same counter, same {name}.|I knew you'd be here, {name}.|You needn't introduce yourself, {name}.|How's the shift treating you, {name}?|I remember your name, {name}.|That apron belongs to you, {name}.|Good to see you working, {name}.",
'wet-footprints':"My boots have brought the road inside.|Those prints may stay a while.|I wiped my feet. It doesn't help.|The floor won't dry under my chair.|No need to mop around me yet.|Wet soles. It has been a long walk.|I leave more water than I mean to.|The marks follow me indoors.|I know. Those are my bootprints.|Don't waste another towel on the floor.",
'echo-sentence':"{previous_sentence}|You said: {previous_sentence}|Was it: {previous_sentence}|Again: {previous_sentence}|Your words: {previous_sentence}|I heard: {previous_sentence}|Just so: {previous_sentence}|As you put it: {previous_sentence}|You asked: {previous_sentence}|I will repeat it: {previous_sentence}",
'refuses-salt':"No salt for me.|Please leave the shaker elsewhere.|I won't touch the salt.|Take that off my table, please.|The food needs nothing from that shaker.|Not one grain, thank you.|I have no use for salt tonight.|Put the salt back on the counter.|Keep that white shaker away.|I said no salt. I mean it.",
'extra-knuckles':"The glove never fits quite right.|My fingers fold in curious places.|I keep that hand covered.|The seams pull across my fingers.|Don't ask me to take the glove off.|There is another bend beneath the leather.|The cuff hides less than I wish.|That finger bends once more.|I know what you are counting.|My hand has always been difficult to measure.",
'shadow-offset':"Don't mind the shape beside my chair.|The light never finds me squarely.|That shadow is mine, I suppose.|The floor has its own idea of me.|I see you checking the light.|My outline leans a little differently.|The lamp and I don't quite agree.|I don't stand where my shadow points.|There's no reason to follow that dark patch.|Leave the light where it is.",
'usual-first-visit':"The usual, please.|You know my order, surely.|Bring what you always bring me.|No menu. My usual plate.|Same as last time.|The usual coffee and the usual seat.|You remember what I take.|Don't make me name my order again.|Whatever I had before will do.|I've already told you. The usual.",
'drawn-to-neon':"That red light. Leave it on.|I can see the sign from this seat.|May I sit nearer the red tube?|The neon is the only thing I watch.|Don't turn the sign off yet.|I lose my place when that light dims.|Red is easy to follow.|The sign keeps pulling my eye.|A chair below the neon, please.|I came in because of that red light.",
'sleeve-dust':"Don't brush my sleeve.|That pale dust clings to wool.|I've carried this dust for miles.|Leave the powder where it settled.|The sleeve sheds if you touch it.|I know there's dust on my cuff.|It isn't flour. Don't taste it.|That coat has its own dust.|A dry brush won't clear my sleeve.|Keep your apron away from this cuff.",
'never-blinks':"I keep my eyes open.|I haven't closed my eyes all night.|You can stop watching for a blink.|I see better without looking away.|My eyes don't tire as yours do.|The lids can wait.|Nothing passes while I look away.|I have held this gaze for some time.|Yes, I'm still looking.|There's no need to blink just now.",
'duplicate-regular':"You think you've seen me tonight.|The other face isn't my concern.|There may be someone like me nearby.|You keep looking at that other table.|I can't help whom I resemble.|My face has never been unique.|Seat me. Don't keep comparing us.|I know there is another one of us.|You noticed the resemblance quickly.|The person already seated is not my problem.",
'mirrored-hair':"My hair falls to this side.|You remember the part differently.|It is combed the other way tonight.|That side of my face is unfamiliar?|I have changed nothing but the part.|The mirror favors the opposite side.|Look at the hairline if you like.|It is a small difference, isn't it?|The part has always been here for me.|You keep studying which way it falls.",
'wrong-hand':"I use this hand tonight.|The other hand can rest.|You expected me to reach differently.|I sign with this hand now.|This is the hand I'll pay with.|Don't move the cup to the other side.|You remember my hands too well.|I reach across rather than around.|This hand knows what to do.|You noticed which hand moved first.",
'no-car':"I didn't park outside.|There is no car waiting for me.|I came on foot.|You won't find my ride by the lamps.|The road brought me here without a car.|No keys. No vehicle.|I have nothing parked beyond the glass.|Don't look for a car on my account.|No engine carried me tonight.|I'll leave the way I arrived. Walking.",
'cold-breath':"My breath makes clouds even in here.|I brought the cold inside.|That little cloud was my breath.|It never feels warm where I sit.|You can see every breath I take.|The room hasn't warmed my lungs.|Yes, the fog leaves my mouth.|It is cold close to my face.|I don't need an open window to breathe mist.|I suppose you can see my breath clearly.",
'old-coins':"These coins still spend, don't they?|That money has traveled a long time.|I pay with what I carried here.|Don't rub the dates off those coins.|They're older than your register.|Count them. The edges are worn.|I've kept this change for years.|Do you still take old coinage?|The metal has outlasted its markings.|I have no newer money to offer."}
CREATURES=[
('hollow-driver','Hollow Driver',['no-reflection','cold-coffee','knows-name']),
('fog-kin','Fog Kin',['wet-footprints','echo-sentence','refuses-salt']),
('under-sleeper','Under-Sleeper',['extra-knuckles','shadow-offset','usual-first-visit']),
('lamp-moth','Lamp Moth',['drawn-to-neon','sleeve-dust','never-blinks']),
('reflection-twin','Reflection Twin',['duplicate-regular','mirrored-hair','wrong-hand']),
('pale-hitcher','Pale Hitcher',['no-car','cold-breath','old-coins'])]
ACTION={'no-reflection':'reflection','cold-coffee':'coffee','knows-name':'question','wet-footprints':'hands',
'echo-sentence':'question','refuses-salt':'salt','extra-knuckles':'hands','shadow-offset':'reflection',
'usual-first-visit':'question','drawn-to-neon':'question','sleeve-dust':'hands','never-blinks':'reflection',
'duplicate-regular':'reflection','mirrored-hair':'hands','wrong-hand':'question','no-car':'reflection','cold-breath':'coffee','old-coins':'hands'}
# These mappings explicitly resolve the source's five actions versus eighteen tells.
# A reflection action scans polished surfaces, gaze and the exterior window; hands
# scans sleeves/footprints and hairline; question exposes order and handed gestures.
# Consuming UI must retain the label and the category caption below.
LABEL={k:k.replace('-',' ').capitalize() for k in ACTION}
def build():
 lines=[]
 for tell,raw in LINES.items():
  ss=raw.split('|');assert len(ss)==10,(tell,len(ss))
  for i,s in enumerate(ss):lines.append(dict(id=f'{tell}-{i:02}',tell=tell,line=s))
 assert len(lines)==180
 assert all(len(x['line'])<=120 for x in lines)
 write('dialogue-180.json',lines)
 human=["Coffee, and a minute to sit down.","Long road tonight.","The pie looks good.","No rush. Just keep it warm.","I should be home by now.","One plate and I'm back on the road.","That jukebox still works?","Thanks for keeping the lights on.","The weather's turning.","A booth will do.","I have an early start tomorrow.","Leave the menu. I'll make up my mind.","You've been on your feet all night.","Could I have a napkin?","I can wait for the grill.","Just passing through Marrow Falls.","Your coffee's better than the service station's.","There are few lights left on this road.","Something hot, please.","I won't stay past closing.","I know I look tired.","I'll pay at the counter.","It was a quiet drive.","Good to see a familiar face."]
 write('human-small-talk.json',human)
 write('creatures.json',[dict(id=id,name=name,tells=tells,portrait=f'runtime/characters/seated/{id}.png',guide_title=name,exact_tells=2,
  rules_note='Each selected pair maps to different actions in this production mapping.') for id,name,tells in CREATURES])
 write('inspection-actions.json',[dict(id=a,seconds=4,visible_label=l,caption=c) for a,l,c in [
 ('hands','Hands & details','Hands, sleeves, footprints and hairline'),
 ('reflection','Reflection & surroundings','Reflection, shadows, gaze and exterior window'),
 ('question','Ask a question','Speech, order memory, attention and hand preference'),
 ('salt','Offer salt','Acceptance or refusal'),
 ('coffee','Check coffee','Steam, temperature and visible breath')]])
 write('tells.json',[dict(id=k,action=v,label=LABEL[k],caption=LABEL[k],visual_control=k) for k,v in ACTION.items()])
 stories={
 'earl':["Earl takes the booth nearest the door.","He mentions a bridge closure that lengthened his route.","He brings a clipping about the highway.","He asks whether Dot will still be here next week.","He leaves a penciled route around the closure."],
 'vonda':["Vonda finishes a difficult hospital shift.","She explains the eye drops that keep her from blinking.","She orders food for a colleague working late.","She returns the borrowed menu she forgot in her bag.","She promises Dot an empty chair when the week ends."],
 'pruitt-twins':["The twins arrive separately and choose nearby booths.","They joke about being mistaken for each other.","One twin orders for both while the other calls home.","They bring a school photograph showing their matching faces.","They leave together, arguing about whose turn it is to drive."],
 'coach-hale':["Coach asks for the usual and takes the same chair.","He remembers the players who used to stop here.","He leaves a team schedule near the register.","He asks Dot to save a pie for a reunion.","He returns with a photograph of the old team."],
 'ines':["Ines arrives after the late radio show.","She tells Dot about a caller who never speaks.","She shares the weather forecast for the highway.","She dedicates a quiet record to the night workers.","She leaves a note promising a mention of the diner."],
 'ricky':["Ricky comes in wearing an oversized hoodie.","He admits he has missed the last bus.","He offers to sweep the doorway for a meal.","He finds a reliable ride home after the shift.","He thanks Dot and leaves the borrowed broom beside the door."]}
 false={'earl':'refuses-salt','vonda':'never-blinks','pruitt-twins':'duplicate-regular','coach-hale':'usual-first-visit','ines':None,'ricky':None}
 write('regulars.json',[dict(id=k,story_steps=v,false_tell=false[k],false_tell_source='F033 canon' if false[k] else 'No fixed false tell prescribed; retain none',
   individuals=['pruitt-a','pruitt-b'] if k=='pruitt-twins' else [k]) for k,v in stories.items()])
 dishes=[('coffee','Coffee',6,8),('apple-pie','Apple pie',8,10),('breakfast','Breakfast plate',18,22),('pancakes','Pancakes',12,16),
 ('grilled-cheese-soup','Grilled cheese & soup',14,18),('burger-fries','Burger & fries',16,20),('chili','Chili',10,12),('meatloaf','Meatloaf',18,22)]
 write('recipes.json',[dict(id=id,name=name,price=p,cook_seconds=t,icon=f'runtime/food/{id}.png',provenance='Production choice inside F033 price/time ranges') for id,name,p,t in dishes])
 write('tutorial.json',[
 dict(id='order',text="Earl is here. Take his order.",target='earl'),dict(id='cook',text="Start the grill, then serve Earl.",target='burners'),
 dict(id='notice',text="That customer's coffee has no steam.",target='coffee'),dict(id='guide',text="Open the field guide.",target='guide'),
 dict(id='reflect',text="Check the reflection. The guest is missing.",target='reflection'),dict(id='refuse',text="Two independent tells. Refuse service.",target='refuse')])
 write('night-manager.json',dict(appearance='runtime/upgrades/night-manager.png',night=7,event='Three creatures in one rush',
  lines=["You have kept the lamps burning.","The tables are full tonight.","Count what is still yours.","I will wait until you close.","There is work left after the bell."]))
 names=[x[0] for x in CREATURES]+['earl','vonda','pruitt-a','pruitt-b','coach-hale','ines','ricky','postal-worker','mechanic','salesman','warehouse-worker','librarian']
 states={
 'arrive':dict(pose='standing',motion='translate-to-seat',duration_ms=1600),
 'ordering':dict(pose='seated',motion='gentle-breathing',duration_ms=1200),
 'waiting':dict(pose='seated',motion='gentle-breathing',duration_ms=1600),
 'eating':dict(pose='seated',motion='subtle-body-lean',duration_ms=1800),
 'paying':dict(pose='standing',motion='gentle-breathing',duration_ms=900),
 'leave':dict(pose='standing',motion='translate-to-exit',duration_ms=1600),
 'refused':dict(pose='standing',motion='translate-to-exit',duration_ms=1000),
 'lingering':dict(pose='seated',motion='still',duration_ms=2000)}
 write('customer-motion-presets.json',dict(method='Code-driven transforms of exported standing/seated illustrations, NOT bespoke frame-by-frame limb cycles',
    states=states,characters=[dict(id=n,standing=f'runtime/characters/standing/{n}.png',seated=f'runtime/characters/seated/{n}.png') for n in names]))
 write('scene-layout.json',dict(reference_size=[1672,620],table_targets=[dict(id=i+1,x=225+185*i,y=345,width=150,height=130) for i in range(6)],
  door=[38,265],service_counter=[1445,365],note='Proposed normalized interaction anchors; consuming Phaser scene must register against selected background.'))
 print('Content files:',len(list(OUT.glob('*.json'))),'fallback lines:',len(lines))
if __name__=='__main__':build()
