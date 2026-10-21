// Run only against the local demo emulator. Never writes production.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const dep = createRequire(path.join(process.env.IGM_TEST_TOOLS, 'package.json'));
const {initializeTestEnvironment, assertSucceeds, assertFails} = dep('@firebase/rules-unit-testing');
const {doc, collection, getDocs, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot} = dep('firebase/firestore');
const projectId = 'demo-igm-preservation';
const root = `http://127.0.0.1:8085/v1/projects/${projectId}/databases/(default)/documents`;
async function request(url, options={}) {
  assert(url.startsWith(root));
  const response = await fetch(url, options);
  if(!response.ok) throw Error(`Emulator HTTP ${response.status}: ${await response.text()}`);
  return response.json();
}
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value==='object'
  ? Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])) : value;
async function main(){
  const env = await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8085,rules:fs.readFileSync('firestore.rules','utf8')}});
  const collections = ['activities','igm_entries','igm_custom_clients'];
  const reports=[];
  try {
    for(const name of collections){
      const backup=JSON.parse(fs.readFileSync(path.join(process.env.IGM_BACKUP_DIR,name+'.json'),'utf8').replace(/^\uFEFF/,''));
      assert.equal(backup.documentCount,backup.documents.length);
      const ids=new Set();
      for(const record of backup.documents){
        const prefix=`projects/igm-tracker/databases/(default)/documents/${name}/`;
        assert(record.name.startsWith(prefix));
        const id=record.name.slice(prefix.length); assert(!id.includes('/') && !ids.has(id)); ids.add(id);
        await request(`${root}/${name}/${encodeURIComponent(id)}`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:record.fields})});
      }
      const restored=await request(`${root}/${name}?pageSize=1000`,{headers:{Authorization:'Bearer owner'}});
      assert.equal(restored.documents.length,backup.documentCount);
      const restoredMap=new Map(restored.documents.map(d=>[d.name.split('/').pop(),d.fields]));
      for(const original of backup.documents) assert.deepEqual(canonical(restoredMap.get(original.name.split('/').pop())),canonical(original.fields));
      reports.push(`${name}: restored ${ids.size} documents; every ID and typed field matches`);
    }
    const claims={email:'jayprakashrajkund@gmail.com',email_verified:true,firebase:{sign_in_provider:'google.com'}};
    const owner=env.authenticatedContext('verified-owner',claims).firestore();
    const others=[env.unauthenticatedContext().firestore(),env.authenticatedContext('other',{...claims,email:'other@example.com'}).firestore(),env.authenticatedContext('unverified',{...claims,email_verified:false}).firestore(),env.authenticatedContext('wrong-provider',{...claims,firebase:{sign_in_provider:'password'}}).firestore()];
    for(const name of collections){
      await assertSucceeds(getDocs(collection(owner,name)));
      for(const db of others){
        await assertFails(getDocs(collection(db,name)));
        await assertFails(setDoc(doc(db,name,'blocked-test'),{notes:'blocked'}));
        await assertFails(updateDoc(doc(db,name,'blocked-test'),{notes:'blocked'}));
        await assertFails(deleteDoc(doc(db,name,'blocked-test')));
      }
    }
    for(const name of collections.slice(1)) await assertFails(setDoc(doc(owner,name,'blocked-legacy-write'),{notes:'blocked'}));
    await assertFails(setDoc(doc(owner,'unapproved_collection','test'),{notes:'blocked'}));
    const test=doc(owner,'activities','phase1-synthetic');
    const original={account:'LOCAL TEST ONLY',actType:'Visit',notes:'Original note <b>literal</b>',dateStr:'2020-01-02',ts:1578000000000,followupDate:'2026-10-21',legacyField:'preserve'};
    await assertSucceeds(setDoc(test,original));
    const second=env.authenticatedContext('verified-owner',claims).firestore();
    const synced=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{unsub();reject(Error('Sync timed out'));},10000);const unsub=onSnapshot(doc(second,'activities','phase1-synthetic'),snap=>{if(snap.data()?.notes==='Edited note'){clearTimeout(timer);unsub();resolve();}},reject);});
    await assertSucceeds(updateDoc(test,{notes:'Edited note',followupDate:'2026-10-22',updatedAt:Date.now()}));
    await synced;
    const edited=(await getDoc(test)).data();
    assert.equal(edited.ts,original.ts); assert.equal(edited.dateStr,original.dateStr); assert.equal(edited.legacyField,'preserve'); assert.equal(edited.followupDate,'2026-10-22');
    await assertSucceeds(deleteDoc(test));
    reports.push('Rules: owner reads all three collections; other/signed-out/unverified/wrong-provider identities denied reads and all writes; legacy writes denied.');
    reports.push('Synthetic logging, editing, date/legacy-field preservation, follow-up update, deletion and second-client realtime sync: PASS.');
    fs.writeFileSync(path.join(process.env.IGM_BACKUP_DIR,'restore-test-results.txt'),reports.join('\n'));
    console.log(reports.join('\n'));
  } finally { await env.cleanup(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
