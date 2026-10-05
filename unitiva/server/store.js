import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {ensureProcessCodes} from './codes.js';
import {seed} from './catalog.js';
export async function createStore(path=resolve('data/prototype.json')){
 let state;try{state=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;state=seed();}
 ensureProcessCodes(state);
 let queue=Promise.resolve();
 const save=async next=>{await mkdir(dirname(path),{recursive:true});const temp=path+'.tmp';await writeFile(temp,JSON.stringify(next,null,2),{mode:0o600});await rename(temp,path);state=next;};
 await save(state);
 return {read:()=>structuredClone(state),mutate(fn){const run=queue.then(async()=>{const next=structuredClone(state);const result=await fn(next);await save(next);return result;});queue=run.catch(()=>{});return run;}};
}
export function audit(state,user,recordId,action){
 const r=state.records.find(r=>r.id===recordId);if(r&&!action.startsWith('Consultou')){state.notifications??=[];for(const userId of new Set([...(r.followers||[]),r.owner,r.approverId].filter(Boolean)))if(userId!==user.id)state.notifications.unshift({id:randomUUID(),userId,recordId,action,at:new Date().toISOString(),read:false});}
state.audit.unshift({id:randomUUID(),actor:user.name,actorId:user.id,role:user.role,recordId,processCode:state.records.find(r=>r.id===recordId)?.code,action,at:new Date().toISOString()});}
