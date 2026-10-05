import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';import {webcrypto} from 'node:crypto';
test('HTML autónomo: login, notas, edição, matrícula e isolamento entre perfis',async()=>{
 const html=await readFile('UniTiva_Paperless.html','utf8'),script=html.match(/<script type="module">([\s\S]*)<\/script>/)[1];
 const store=new Map();const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const context=vm.createContext({console,crypto:webcrypto,structuredClone,URLSearchParams,localStorage:storage,sessionStorage:storage,atob,TextDecoder,TextEncoder,indexedDB:mockIndexedDB()});
 const beforeClient=script.slice(0,script.indexOf("const root=document.querySelector"));vm.runInContext(beforeClient,context);
 const call=(path,method='GET',body={})=>vm.runInContext(`demoApi(${JSON.stringify(path)},${JSON.stringify(method)},${JSON.stringify(body)})`,context);
 await call('/auth/login','POST',{username:'admin',password:'SenhaInicial123!'});assert.equal((await call('/me')).apps.length,6);
 const boss=await call('/users','POST',{username:'direccao',name:'Direcção',role:'ADMIN',faculty:'Central',department:'Direcção',jobTitle:'Director',password:'SenhaSuperior123!'});await call('/users/admin','PATCH',{username:'admin',name:'Administrador',role:'ADMIN',faculty:'Central',department:'Administração',jobTitle:'Administrador',superiorId:boss.id});const r=await call('/records','POST',{module:'servicos',title:'Ordem de teste',description:'Dados fictícios'});
 assert.match(r.code,/^SG-\d{2}-/);
 await assert.rejects(()=>call('/records/'+r.id+'/advance','PATCH'),/autorização/);await call('/auth/login','POST',{username:'direccao',password:'SenhaSuperior123!'});await call('/records/'+r.id+'/approval','PATCH',{decision:'APROVADO'});await call('/auth/login','POST',{username:'admin',password:'SenhaInicial123!'});
 assert.equal((await call('/records/'+r.id+'/advance','PATCH')).status,'ATRIBUIDA');
 await call('/records/'+r.id+'/notes','POST',{note:'Equipa atribuída.'});assert.equal((await call('/records/'+r.id+'/activity'))[0].note,'Equipa atribuída.');
 assert.equal((await call('/records/'+r.id,'PATCH',{title:'Título corrigido',description:'Nova descrição'})).title,'Título corrigido');
 const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1cAAAAASUVORK5CYII=';
 const file=await call('/records/'+r.id+'/files','POST',{name:'imagem.png',dataBase64:png});assert.equal(file.mime,'image/png');
 assert.equal((await call('/records/'+r.id+'/files/'+file.id)).dataBase64,png);
 assert.equal((await call('/files')).length,1);
 await assert.rejects(()=>call('/records/'+r.id+'/files','POST',{name:'falso.pdf',dataBase64:png}),/Formato/);
 await call('/users','POST',{username:'aluno',name:'Estudante',role:'ALUNO',studentId:'s1',faculty:'Engenharias',department:'Estudantes',jobTitle:'Estudante',password:'SenhaEstudante123!'});await call('/auth/logout','POST');await call('/auth/login','POST',{username:'aluno',password:'SenhaEstudante123!'});assert.equal((await call('/me')).apps.length,1);
 await assert.rejects(()=>call('/records/'+r.id+'/files/'+file.id));
 assert.equal((await call('/files')).length,0);
 await assert.rejects(()=>call('/records/'+r.id+'/notes','POST',{note:'Sem acesso'}));
 const op=await call('/matricula/opcoes');assert.equal(op.regular.length,2);const enrollment=await call('/matricula/submeter','POST',{ids:[6,2]});assert.equal(enrollment.amountCents,330000);
 await assert.rejects(()=>call('/matricula/submeter','POST',{ids:[6,2]}),/Já existe/);
 await call('/demo/student','POST',{scenario:'offline'});await assert.rejects(()=>call('/matricula/opcoes'),/indisponível/);
 assert.ok(store.has('unitiva-prototype-v2'));
});

function mockIndexedDB(){
 const items=new Map();const db={createObjectStore(){},close(){},transaction(){const tx={};tx.objectStore=()=>({get:id=>request(()=>items.get(id)),put:value=>request(()=>items.set(value.id,value)),delete:id=>request(()=>items.delete(id))});function request(fn){const r={};queueMicrotask(()=>{r.result=fn();r.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.());});return r;}return tx;}};
 return {open(){const r={result:db};queueMicrotask(()=>{r.onupgradeneeded?.();r.onsuccess?.();});return r;}};
}
