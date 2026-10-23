const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const dep=createRequire(path.join(process.env.IGM_TEST_TOOLS,'package.json'));
const {initializeTestEnvironment,assertFails,assertSucceeds}=dep('@firebase/rules-unit-testing');
const {collection,getDocs,doc,getDoc,setDoc,updateDoc,deleteDoc}=dep('firebase/firestore');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
async function main(){
  const {validateDirectoryImport,candidateAccounts}=await import('../directory-model.mjs');
  const payload=JSON.parse(fs.readFileSync(process.env.IGM_DIRECTORY_FILE,'utf8'));
  assert.deepEqual(validateDirectoryImport(payload),{accounts:174,salesLines:299,followups:27,history:101,total:720264.82,repeated:14});
  const duplicate=structuredClone(payload);duplicate.accounts.push(duplicate.accounts[0]);assert.throws(()=>validateDirectoryImport(duplicate));
  const wrongRef=structuredClone(payload);wrongRef.accounts[0].sales[0]['Account ID']='A999';assert.throws(()=>validateDirectoryImport(wrongRef));
  assert.equal(candidateAccounts({account:'IMG Stone Work'},payload.accounts).length,0);
  assert.equal(candidateAccounts({account:'ABC Custom Granite'},payload.accounts)[0].id,'A005');
  const env=await initializeTestEnvironment({projectId:'demo-igm-preservation',firestore:{host:'127.0.0.1',port:8085,rules:fs.readFileSync('firestore.rules','utf8')}});
  try{
    const claims={email:'jayprakashrajkund@gmail.com',email_verified:true,firebase:{sign_in_provider:'google.com'}};
    const owner=env.authenticatedContext('owner-test',claims).firestore();
    const denied=[env.unauthenticatedContext().firestore(),env.authenticatedContext('other',{...claims,email:'other@example.com'}).firestore(),env.authenticatedContext('unverified',{...claims,email_verified:false}).firestore()];
    for(const name of ['accounts','directoryImports','activityLinks']){
      await assertSucceeds(getDocs(collection(owner,name)));
      for(const db of denied){await assertFails(getDocs(collection(db,name)));await assertFails(setDoc(doc(db,name,'forbidden'),{accountId:'A005'}));await assertFails(updateDoc(doc(db,name,'forbidden'),{accountId:'A005'}));await assertFails(deleteDoc(doc(db,name,'forbidden')));}
      await assertFails(deleteDoc(doc(owner,name,'forbidden')));
    }
    const actual=await getDocs(collection(owner,'accounts'));assert.equal(actual.size,174);
    for(const a of payload.accounts){const got=actual.docs.find(d=>d.id===a.id).data();for(const key of Object.keys(a))assert.deepEqual(canonical(got[key]),canonical(a[key]));}
    const receipt=await getDoc(doc(owner,'directoryImports',payload.sourceSHA256));assert(receipt.exists());assert.equal(receipt.data().salesLines,299);
    for(const name of ['activities','igm_entries','igm_custom_clients']){
      const backup=JSON.parse(fs.readFileSync(path.join(process.env.IGM_BACKUP_DIR,name+'.json'),'utf8').replace(/^\uFEFF/,''));
      const response=await fetch(`http://127.0.0.1:8085/v1/projects/demo-igm-preservation/databases/(default)/documents/${name}?pageSize=1000`,{headers:{Authorization:'Bearer owner'}});
      const restored=(await response.json()).documents;assert.equal(restored.length,backup.documentCount);
      const map=new Map(restored.map(d=>[d.name.split('/').pop(),d.fields]));
      for(const d of backup.documents)assert.deepEqual(canonical(map.get(d.name.split('/').pop())),canonical(d.fields));
    }
    console.log('PASS: full imported directory equals source; 174 accounts, 299 lines, 27 follow-ups, 101 references; original 164 documents unchanged; unauthorized reads/writes and owner deletions denied; duplicate-ID and wrong-reference files rejected; uncertain name stays unlinked.');
  }finally{await env.cleanup();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
