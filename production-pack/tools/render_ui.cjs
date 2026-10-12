const fs=require('fs'),path=require('path');
const sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'sharp'):'sharp');
const root=path.resolve(__dirname,'..');
(async()=>{
 const jobs=[['screens/title-desktop',1280],['screens/title-mobile',390],['inspector',780],['guide/hollow-driver',760],['settings',660],['receipt-panel',620]];
 for(const [name,width] of jobs){
  const source=path.join(root,'runtime/ui',name+'.svg');
  await sharp(source).resize({width}).png().toFile(path.join(root,'previews','ui-'+name.replaceAll('/','-')+'.png'));
 }
 console.log('UI preview PNGs:',jobs.length);
})().catch(e=>{console.error(e);process.exit(1)});
