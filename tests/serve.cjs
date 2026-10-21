// Local validation server. Emulator mode is generated in memory, never deployed.
const http=require('node:http'),fs=require('node:fs');
const file=require('node:path').resolve('index.html');
http.createServer((req,res)=>{
  if(!['/','/emulator'].includes(req.url)){res.writeHead(404);return res.end();}
  let html=fs.readFileSync(file,'utf8');
  if(req.url==='/emulator'){
    const mockToken = [Buffer.from(JSON.stringify({alg:'none'})).toString('base64url'),Buffer.from(JSON.stringify({sub:'local-owner',email:'jayprakashrajkund@gmail.com',email_verified:true})).toString('base64url'),''].join('.');
    html=html.replace('getAuth, GoogleAuthProvider','signInWithCredential, connectAuthEmulator, getAuth, GoogleAuthProvider')
      .replace('await signInWithPopup(auth, provider);',`await signInWithCredential(auth, GoogleAuthProvider.credential('${mockToken}'));`)
      .replace('getFirestore, collection','connectFirestoreEmulator, getFirestore, collection')
      .replace('projectId: "igm-tracker"','projectId: "demo-igm-preservation"')
      .replace('const auth = getAuth(fbApp);',`connectFirestoreEmulator(db,'127.0.0.1',8085);\nconst auth = getAuth(fbApp);\nconnectAuthEmulator(auth,'http://127.0.0.1:9099');`)
      .replaceAll('https://firestore.googleapis.com/v1/','http://127.0.0.1:8085/v1/');
  }
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);
}).listen(8766,'127.0.0.1',()=>console.log('Local test app: http://localhost:8766/ ; isolated UI: http://localhost:8766/emulator'));
