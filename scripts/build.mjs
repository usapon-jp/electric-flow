import {mkdir,copyFile,cp,writeFile,rm} from 'node:fs/promises';
// Only public application assets enter the deployment artifact.
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
await copyFile('index.html','dist/index.html');
await cp('src','dist/src',{recursive:true});
await cp('drill','dist/drill',{recursive:true});
await writeFile('dist/.nojekyll','');
console.log('Static site built in dist/');
