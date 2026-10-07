#!/usr/bin/env node
// Make a captioned, silent visual tour from the app's own pixel drawing code.
// This is a rendered tour, not a screen recording or a recording of live gameplay.
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {createCanvas} = require('@napi-rs/canvas');
const {loadMap} = require('./load-map.cjs');
const FONT = process.env.ZORK_VIDEO_FONT || 'Liberation Sans';
const root = path.resolve(__dirname, '../..');
const output = path.resolve(process.argv[2] || path.join(root, 'out/walkthrough'));
fs.mkdirSync(output, {recursive:true});
const app = loadMap();
if(app.errors.length) throw new Error(app.errors.map(e=>e.message).join('\n'));
const d=app.document, S=JSON.parse(d.querySelector('#state').textContent);
const base=app.getCanvas(d.querySelector('.wl-base'));
const locations=Object.fromEntries([...d.querySelectorAll('.hot[data-id]')].map(el=>[el.dataset.id, {
 x:(parseFloat(el.style.left)+parseFloat(el.style.width)/2)/2,
 y:(parseFloat(el.style.top)+parseFloat(el.style.height)/2)/2
}]));
const chapters=[
 {title:'A complete expedition', kicker:'ZORK I · THE RECORDED MAP', body:['350 / 350 points','624 moves · no deaths', '86 mapped locations'], note:'The AI played. The map recorded what it found.', ids:[], duration:8},
 {title:'Start at the white house', kicker:'01 · HOUSE & FOREST', body:['Explore the forest and attic.', 'Gather the lamp, sword and tools.', 'The Living Room becomes home base.'], ids:['west-of-house','kitchen','attic','living-room'], duration:8},
 {title:'Open the underground', kicker:'02 · TROLL, MAZE & CYCLOPS', body:['Defeat the troll and chart the maze.', 'The Cyclops passage gives a way home.', 'Light and safe routes matter.'], ids:['troll-room','cyclops-room','living-room'], duration:8},
 {title:'Drain the reservoir', kicker:'03 · DAM & WATERWORKS', body:['The dam changes the route.', 'Recover the trunk and trident.', 'Bank the haul: 114 points.'], ids:['dam','reservoir','atlantis-room'], duration:8},
 {title:'Solve the temple route', kicker:'04 · TORCH, BELL & BOOK', body:['The temple journey leads to Hades.', 'Return with the coffin and skull.', 'The score reaches 189.'], ids:['temple','altar','entrance-to-hades'], duration:8},
 {title:'Cross the rainbow', kicker:'05 · RAINBOW & RIVER', body:['Claim the pot of gold.', 'Navigate the river for the emerald.', 'Dig for the scarab: 234 points.'], ids:['end-of-rainbow','sandy-beach','sandy-cave'], duration:8},
 {title:'Recover the stolen treasures', kicker:'06 · THE THIEF', body:['The thief falls late in the run.', 'Recover the egg and other treasures.', 'The canary brings the score to 297.'], ids:['treasure-room','forest-path'], duration:8},
 {title:'Finish in the coal mine', kicker:'07 · THE FINAL TREASURES', body:['Use the basket and machine.', 'Bring home diamond, bracelet and jade.', 'Bank the torch again: 350 points.'], ids:['shaft-room','gas-room','machine-room'], duration:8},
 {title:'Explore the record yourself', kicker:'THE FINAL CHECKPOINT', body:['World · 3D · ASCII · Chart', 'Replay discoveries and inspect rooms.', 'The saved run stops before the barrow.'], note:'This is a map and recorded expedition, not a playable game.', ids:[], duration:8}
];
function wrap(g,text,maxWidth) {const words=text.split(' '),out=[];let line='';for(const word of words){const candidate=line?line+' '+word:word;if(g.measureText(candidate).width>maxWidth&&line){out.push(line);line=word;}else line=candidate;}if(line)out.push(line);return out;}
function crop(ids) {const points=ids.map(id=>locations[id]).filter(Boolean);if(!points.length)return {x:0,y:0,w:base.width,h:base.height};const xs=points.map(p=>p.x),ys=points.map(p=>p.y);let w=Math.max(320,Math.max(...xs)-Math.min(...xs)+150),h=Math.max(240,Math.max(...ys)-Math.min(...ys)+130);let x=(Math.min(...xs)+Math.max(...xs))/2-w/2,y=(Math.min(...ys)+Math.max(...ys))/2-h/2;x=Math.max(0,Math.min(base.width-w,x));y=Math.max(0,Math.min(base.height-h,y));return {x,y,w,h};}
chapters.forEach((chapter,index)=>{
 const canvas=createCanvas(1280,720),g=canvas.getContext('2d');g.fillStyle='#0b1113';g.fillRect(0,0,1280,720);
 g.fillStyle='#ffb627';g.font='bold 17px "'+FONT+'"' ;g.fillText(chapter.kicker,44,66);
 g.font='bold 41px "'+FONT+'"' ;g.fillStyle='#f0f5ef';let y=137;for(const line of wrap(g,chapter.title,382)){g.fillText(line,44,y);y+=47;}
 y+=36;g.font='24px "'+FONT+'"' ;g.fillStyle='#c4d2c9';for(const line of chapter.body){for(const row of wrap(g,line,366)){g.fillText(row,44,y);y+=34;}y+=18;}
 if(chapter.note){g.font='18px "'+FONT+'"' ;g.fillStyle='#8ca19a';let ny=568;for(const row of wrap(g,chapter.note,367)){g.fillText(row,44,ny);ny+=25;}}
 const c=crop(chapter.ids),box={x:447,y:34,w:797,h:603};
 g.save();g.beginPath();g.roundRect(box.x,box.y,box.w,box.h,16);g.clip();g.fillStyle='#111b1e';g.fillRect(box.x,box.y,box.w,box.h);
 const scale=Math.min(box.w/c.w,box.h/c.h),dw=c.w*scale,dh=c.h*scale,dx=box.x+(box.w-dw)/2,dy=box.y+(box.h-dh)/2;
 g.imageSmoothingEnabled=false;g.drawImage(base,c.x,c.y,c.w,c.h,dx,dy,dw,dh);
 const labels=[];
 for(const id of chapter.ids){const p=locations[id];if(!p)continue;const x=dx+(p.x-c.x)*scale,yy=dy+(p.y-c.y)*scale;g.strokeStyle='#ffb627';g.lineWidth=2;g.beginPath();g.arc(x,yy,13,0,Math.PI*2);g.stroke();const name=S.rooms[id].name;g.font='bold 14px "'+FONT+'"' ;const w=g.measureText(name).width+16,tx=Math.max(box.x+8,Math.min(box.x+box.w-w-8,x-w/2));let ty=Math.min(box.y+box.h-30,yy+20);for(let tries=0;tries<10&&labels.some(r=>tx<r.x+r.w&&tx+w>r.x&&ty<r.y+26&&ty+24>r.y);tries++)ty=Math.max(box.y+8,ty-28);labels.push({x:tx,y:ty,w});g.fillStyle='#0b1113ee';g.fillRect(tx,ty,w,24);g.fillStyle='#ffe1a0';g.fillText(name,tx+8,ty+17);}
 g.restore();g.strokeStyle='#2a3a35';g.lineWidth=1;g.strokeRect(44,663,1200,1);
 g.fillStyle='#8ca19a';g.font='16px "'+FONT+'"' ;g.fillText('Rendered map tour · recorded expedition · no live gameplay',44,694);g.fillStyle='#ffb627';g.fillText(String(index+1).padStart(2,'0')+' / 09',1160,694);
 fs.writeFileSync(path.join(output,`chapter-${index+1}.png`),canvas.toBuffer('image/png'));
});
fs.copyFileSync(path.join(output,'chapter-1.png'),path.join(output,'zork-map-preview.png'));
fs.writeFileSync(path.join(output,'pixel-world.png'),base.toBuffer('image/png'));
const playlist=chapters.map((c,i)=>`file 'chapter-${i+1}.png'\nduration ${c.duration}`).join('\n')+"\nfile 'chapter-9.png'\n";
fs.writeFileSync(path.join(output,'chapters.txt'),playlist);
fs.writeFileSync(path.join(output,'walkthrough-transcript.txt'),chapters.map((c,i)=>`${String(i*8).padStart(2,'0')}–${String((i+1)*8).padStart(2,'0')} seconds: ${c.title}\n${c.body.join(' ')}${c.note?' '+c.note:''}`).join('\n\n')+'\n\nThis silent, captioned video is a rendered tour of the original 2D canvas artwork, not a browser screen recording or fresh gameplay. The interactive 3D view is in the HTML, not demonstrated in this video.\n');
app.close();
const result=spawnSync('ffmpeg',['-y','-loglevel','warning','-f','concat','-safe','0','-i',path.join(output,'chapters.txt'),'-vf','fps=24,tpad=stop_mode=clone:stop_duration=1','-t','72','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',path.join(output,'zork-map-walkthrough.mp4')],{stdio:'inherit'});
if(result.error) {console.error('PNG chapters and transcript are ready; install ffmpeg to encode MP4.');process.exitCode=1;}
else if(result.status!==0)process.exitCode=result.status;
else console.log('Saved 72-second rendered tour, preview, original canvas and transcript to '+output);
