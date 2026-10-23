export const DIRECTORY_COLLECTIONS = ['accounts','directoryImports','activityLinks'];
export const normalizeName = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g,'');
export function aliasesFor(account){
  return new Set([account.name,...String(account.source?.['Names consolidated'] || '').split(';')].map(normalizeName).filter(Boolean));
}
export function candidateAccounts(entry, accounts){
  const name = normalizeName(entry.account);
  return accounts.filter(a=>aliasesFor(a).has(name));
}
export function validateDirectoryImport(data){
  if(data?.format !== 'igm-directory-staging-v1' || !/^[a-f0-9]{64}$/.test(data.sourceSHA256 || '') || !Array.isArray(data.accounts) || !data.accounts.length || data.accounts.length>400) throw Error('Choose a prepared IGM directory file with up to 400 accounts.');
  const ids=new Set(),lineIds=new Set();
  let salesLines=0,followups=0,history=0,total=0,repeated=0;
  for(const a of data.accounts){
    if(!/^A\d{3,}$/.test(a.id || '') || ids.has(a.id) || typeof a.name!=='string' || !a.name.trim() || a.source?.['Account ID']!==a.id) throw Error('Invalid or duplicate account ID.');
    ids.add(a.id);
    for(const key of ['contacts','locations','sales','historicalFollowups','workbookActivityReferences']) if(!Array.isArray(a[key])) throw Error(`Missing ${key} for ${a.id}.`);
    for(const r of [...a.sales,...a.historicalFollowups,...a.workbookActivityReferences]) if(r['Account ID']!==a.id) throw Error(`Account reference mismatch in ${a.id}.`);
    for(const r of a.sales){
      if(typeof r['Net extended ($)']!=='number' || !Number.isFinite(r['Net extended ($)']) || !Number.isInteger(r.sourceRow) || r.sourceLineKey!==`${data.sourceSHA256}:${r.sourceRow}` || lineIds.has(r.sourceLineKey)) throw Error('Invalid or repeated source line identifier.');
      lineIds.add(r.sourceLineKey); total+=r['Net extended ($)']; if(r.duplicateReviewRequired) repeated++;
    }
    if(new TextEncoder().encode(JSON.stringify(a)).length>700000) throw Error(`${a.id} is too large for a safe import.`);
    salesLines+=a.sales.length; followups+=a.historicalFollowups.length; history+=a.workbookActivityReferences.length;
  }
  if(new TextEncoder().encode(JSON.stringify(data)).length>6000000) throw Error('Import file is too large.');
  return {accounts:ids.size,salesLines,followups,history,total:Math.round(total*100)/100,repeated};
}
