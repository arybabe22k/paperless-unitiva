import {createServer} from 'node:http';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {apps,profiles,courses} from './catalog.js';
import {options,simulate,DomainError} from './rules.js';
import {assignProcessCode} from './codes.js';
import {audit} from './store.js';
import {validateUpload,checkRecordQuota,MAX_FILE_BYTES} from './uploads.js';
export function createApp(store,config={}){
 const authenticate=config.authenticate;const localAccess=config.allowLocalProfiles===true;
 const secure=config.secureCookies===true;const expectedOrigin=config.origin;const sessionLifetime=30*60*1000;
 const sessions=new Map(),limits=new Map();
 const allowed=(u,m)=>apps.find(a=>a.id===m)?.roles.includes(u.role);
 const visible=(u,r)=>(allowed(u,r.module)||r.approverId===u.id)&&(u.role!=='ALUNO'||r.owner===u.id)&&(u.role==='ADMIN'||!r.department||r.owner===u.id||r.approverId===u.id||(u.department===r.department&&u.faculty===r.faculty));
 const transitions={academico:{SECRETARIA_FACULDADE:'SECRETARIA_CENTRAL',SECRETARIA_CENTRAL:'REGISTO_ACADEMICO',REGISTO_ACADEMICO:'CHANCELARIA',CHANCELARIA:'AGUARDA_ASSINATURA'},financeiro:{EMITIDA:'PAGAMENTO_REGISTADO'},rh:{DEPARTAMENTO:'DIRECCAO',DIRECCAO:'AGUARDA_ASSINATURA'},transporte:{PENDENTE:'APROVADA',APROVADA:'CONCLUIDA'},servicos:{ABERTA:'ATRIBUIDA',ATRIBUIDA:'CONCLUIDA'}};
 return createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),path=url.pathname,method=req.method;
 res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');
 const json=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
 try{
 if(!path.startsWith('/api/')){
 const assets={'/':'index.html','/client/main.js':'client/main.js','/client/style.css':'client/style.css','/client/assets/unitiva-oficial.png':'client/assets/unitiva-oficial.png','/client/assets/unitiva-header.png':'client/assets/unitiva-header.png'};if(!assets[path])return json({error:'Página não encontrada.'},404);
 const bytes=await readFile(resolve(assets[path]));res.writeHead(200,{'Content-Type':path.endsWith('.png')?'image/png':path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' blob: data:; frame-src blob:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"});return res.end(bytes);
 }
 const ip=config.trustProxy?String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',').at(-1).trim():req.socket.remoteAddress,now=Date.now();if(limits.size>10000)for(const [key,item] of limits)if(now-item.at>60000)limits.delete(key);const old=limits.get(ip);const limit=!old||now-old.at>60000?{at:now,n:0}:old;limits.set(ip,limit);if(++limit.n>180)throw new DomainError('Aguarde um minuto antes de tentar novamente.',429);
 const uploading=method==='POST'&&/^\/api\/records\/[^/]+\/files$/.test(path);const bodyLimit=uploading?Math.ceil(MAX_FILE_BYTES*4/3)+2048:65536;
 let body={};if(['POST','PATCH'].includes(method)){let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>bodyLimit)throw new DomainError('Pedido demasiado grande.',413);chunks.push(chunk);}try{body=JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{throw new DomainError('Pedido JSON inválido.',400);}if(!body||Array.isArray(body)||typeof body!=='object')throw new DomainError('Pedido inválido.',400);}
 if(method==='GET'&&path==='/api/health')return json({status:'ok'});
 if(method==='GET'&&path==='/api/auth/config')return json({requiresPassword:!localAccess,profiles:localAccess?profiles:[]});
 if(method==='GET'&&path==='/api/demo/profiles'){if(!localAccess)throw new DomainError('Endpoint não encontrado.',404);return json(profiles);}
 if(expectedOrigin&&['POST','PATCH','DELETE'].includes(method)&&req.headers.origin&&req.headers.origin!==expectedOrigin)throw new DomainError('Origem do pedido não autorizada.',403);
 if(method==='POST'&&path==='/api/auth/login'){
 const key='login:'+ip;const l=limits.get(key);const failures=!l||now-l.at>900000?{at:now,n:0}:l;if(failures.n>=5)throw new DomainError('Aguarde 15 minutos antes de tentar entrar novamente.',429);
 const user=localAccess?profiles.find(p=>p.id===body.profile):await authenticate?.(body.username,body.password);
 if(!user){failures.n++;limits.set(key,failures);throw new DomainError('Utilizador ou senha inválidos.',401);}limits.delete(key);
 for(const [k,v] of sessions)if(v.until<now)sessions.delete(k);const token=randomBytes(32).toString('hex');sessions.set(token,{user,until:now+sessionLifetime});
 if(!localAccess)res.setHeader('Set-Cookie','unitiva_session='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800'+(secure?'; Secure':''));
 await store.mutate(s=>audit(s,user,'system','Iniciou sessão'));return json(localAccess?{token,user}:{user});}
 const cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('unitiva_session='))?.slice('unitiva_session='.length);
 const token=cookie||(localAccess?(req.headers.authorization||'').replace(/^Bearer /,''):'');const session=sessions.get(token);if(!session||session.until<now){sessions.delete(token);throw new DomainError('A sessão terminou. Entre novamente.',401);}let user=session.user;if(config.accounts){user=(await config.accounts.list()).find(u=>u.id===user.id&&u.active!==false);if(!user){sessions.delete(token);throw new DomainError('Conta desactivada.',401);}session.user=user;}
 const directory=async()=>config.accounts?await config.accounts.list():profiles;

 const moduleAccess=m=>{if(!allowed(user,m))throw new DomainError('O seu perfil não tem acesso a este módulo.',403);};
 const student=()=>{if(user.role!=='ALUNO')throw new DomainError('A matrícula está disponível para contas de estudante.',403);return store.read().students.find(s=>s.id===user.studentId);};
 if(method==='POST'&&path==='/api/auth/logout'){sessions.delete(token);res.setHeader('Set-Cookie','unitiva_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'+(secure?'; Secure':''));return json({ok:true});}
 if(path==='/api/users'||/^\/api\/users\/[^/]+$/.test(path)){
 if(user.role!=='ADMIN')throw new DomainError('Apenas o administrador gere utilizadores.',403);
 if(method==='GET')return json(await directory());
 if(method==='POST'||method==='PATCH'){if(!config.accounts)throw new DomainError('Gestão de contas indisponível neste modo.');let saved;try{saved=await config.accounts.save(method==='PATCH'?path.split('/').at(-1):null,body);}catch(e){throw new DomainError(e.message);}await store.mutate(s=>audit(s,user,'system',(method==='POST'?'Criou':'Actualizou')+' utilizador '+saved.username));return json(saved,method==='POST'?201:200);}}
 if(method==='GET'&&path==='/api/directory')return json((await directory()).filter(u=>u.active!==false&&(!url.searchParams.has('recordId')||store.read().records.some(r=>r.id===url.searchParams.get('recordId')&&visible(user,r)&&visible(u,r)))).map(({id,name,username,faculty,department,jobTitle})=>({id,name,username,faculty,department,jobTitle})));
 if(method==='GET'&&path==='/api/notifications')return json((store.read().notifications||[]).filter(n=>n.userId===user.id&&store.read().records.some(r=>r.id===n.recordId&&visible(user,r))));
 if(method==='PATCH'&&path==='/api/notifications/read'){await store.mutate(s=>{for(const n of s.notifications||[])if(n.userId===user.id)n.read=true;});return json({ok:true});}
 const follow=path.match(/^\/api\/records\/([^/]+)\/followers$/);
 if(follow&&method==='POST'){const all=await directory();return json(await store.mutate(s=>{const r=s.records.find(r=>r.id===follow[1]);if(!r||!visible(user,r))throw new DomainError('Registo não encontrado.',404);if(!Array.isArray(body.ids)||body.ids.length>100||body.ids.some(id=>!all.some(u=>u.id===id&&u.active!==false&&visible(u,r))))throw new DomainError('Seleccione apenas utilizadores com acesso ao processo.');r.followers=[...new Set(body.ids)];audit(s,user,r.id,'Actualizou seguidores');return r;}));}
 const approve=path.match(/^\/api\/records\/([^/]+)\/approval$/);
 if(approve&&method==='PATCH')return json(await store.mutate(s=>{const r=s.records.find(r=>r.id===approve[1]);if(!r||!visible(user,r))throw new DomainError('Registo não encontrado.',404);if(r.approverId!==user.id||r.owner===user.id||r.approval!=='PENDENTE')throw new DomainError('A autorização compete ao superior designado.',403);if(!['APROVADO','REJEITADO'].includes(body.decision))throw new DomainError('Decisão inválida.');if(body.decision==='REJEITADO'&&(!body.reason||typeof body.reason!=='string'||body.reason.length>2000))throw new DomainError('Indique o motivo da rejeição.');r.approval=body.decision;r.approvedBy=user.id;r.approvedAt=new Date().toISOString();r.approvalReason=body.reason||'';audit(s,user,r.id,'Autorização: '+r.approval);return r;}));
 if(method==='GET'&&path==='/api/me')return json({user,apps:apps.filter(a=>allowed(user,a.id)||store.read().records.some(r=>r.module===a.id&&r.approverId===user.id)),student:store.read().students.find(s=>s.id===user.studentId)});
 if(method==='GET'&&path==='/api/records'){const mod=url.searchParams.get('module');if(mod)moduleAccess(mod);const records=store.read().records.filter(r=>visible(user,r)&&(!mod||r.module===mod));if(['RH','FINANCEIRO','ADMIN'].includes(user.role))await store.mutate(s=>audit(s,user,'list','Consultou registos autorizados'));return json(records);}
 if(method==='POST'&&path==='/api/records'){const {module,title,description,amount}=body;moduleAccess(module);if(typeof title!=='string'||title.trim().length<3||title.length>150||typeof description!=='string'||description.length>2000)throw new DomainError('Indique título (3–150 caracteres) e descrição (até 2000).');let amountCents=0;if(module==='financeiro'){if(!Number.isFinite(amount)||amount<=0||amount>10000000)throw new DomainError('Indique um valor positivo, até 10 milhões de MT.');amountCents=Math.round(amount*100);}
 const status={academico:'SECRETARIA_FACULDADE',financeiro:'EMITIDA',rh:'DEPARTAMENTO',transporte:'PENDENTE',servicos:'ABERTA',biblioteca:'CATALOGADO'}[module];const boss=(await directory()).find(u=>u.id===user.superiorId&&u.active!==false);if(user.role!=='ALUNO'&&!boss)throw new DomainError('O administrador deve associar um superior activo antes de criar processos.');const r={faculty:user.faculty,department:user.department,approverId:boss?.id,approval:boss?'PENDENTE':undefined,followers:[user.id,...(boss?[boss.id]:[])],id:randomUUID(),module,title:title.trim(),description,amountCents,status,owner:user.id,createdAt:new Date().toISOString()};await store.mutate(s=>{assignProcessCode(s,r);s.records.unshift(r);audit(s,user,r.id,'Criou o registo');});return json(r,201);}


 if(method==='GET'&&path==='/api/files'){const state=store.read();if(['RH','FINANCEIRO','ADMIN'].includes(user.role))await store.mutate(s=>audit(s,user,'files','Consultou o índice de documentos autorizado'));return json((state.files||[]).filter(f=>{const r=state.records.find(r=>r.id===f.recordId);return r&&visible(user,r);}).map(({dataBase64,...meta})=>meta));}
 const fileRoute=path.match(/^\/api\/records\/([^/]+)\/files(?:\/([^/]+))?$/);
 if(fileRoute){
  const recordId=fileRoute[1],fileId=fileRoute[2];
  const access=state=>{const r=state.records.find(r=>r.id===recordId);if(!r||!visible(user,r))throw new DomainError('Registo não encontrado.',404);return r;};
  const current=store.read();access(current);
  const metadata=f=>{const {dataBase64,...meta}=f;return meta;};
  if(method==='GET'&&!fileId)return json((current.files||[]).filter(f=>f.recordId===recordId).map(metadata));
  if(method==='POST'&&!fileId){
   if(typeof body.dataBase64!=='string'||!body.dataBase64.length||body.dataBase64.length>Math.ceil(MAX_FILE_BYTES*4/3)+4||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(body.dataBase64))throw new DomainError('Conteúdo do ficheiro inválido ou demasiado grande.');
   const bytes=Buffer.from(body.dataBase64,'base64');let info;try{info=validateUpload(body.name,bytes);}catch(e){throw new DomainError(e.message);}
   const file=await store.mutate(s=>{access(s);s.files??=[];try{checkRecordQuota(s.files.filter(f=>f.recordId===recordId),info.size);}catch(e){throw new DomainError(e.message);}
    const f={id:randomUUID(),recordId,...info,uploadedBy:user.name,uploadedById:user.id,uploadedAt:new Date().toISOString(),dataBase64:bytes.toString('base64')};s.files.unshift(f);audit(s,user,recordId,'Anexou documento: '+f.name);return metadata(f);});return json(file,201);
  }
  const f=(current.files||[]).find(f=>f.id===fileId&&f.recordId===recordId);if(!f)throw new DomainError('Documento não encontrado.',404);
  if(method==='GET'){if(['rh','financeiro'].includes(current.records.find(r=>r.id===recordId).module))await store.mutate(s=>audit(s,user,recordId,'Consultou documento: '+f.name));return json(f);}
  if(method==='DELETE'){if(user.role!=='ADMIN'&&user.id!==f.uploadedById)throw new DomainError('Só o autor do anexo ou o administrador pode removê-lo.',403);await store.mutate(s=>{access(s);s.files=s.files.filter(x=>x.id!==fileId);audit(s,user,recordId,'Removeu documento: '+f.name);});return json({ok:true});}
 }
 const noteMatch=path.match(/^\/api\/records\/([^/]+)\/notes$/);
 if(method==='POST'&&noteMatch){if(typeof body.note!=='string'||body.note.trim().length<1||body.note.length>2000)throw new DomainError('A nota deve ter entre 1 e 2000 caracteres.');const mentioned=(await directory()).filter(u=>new Set(body.note.match(/@[a-z0-9._-]+/gi)?.map(x=>x.slice(1).toLowerCase())||[]).has(u.username));const note=await store.mutate(s=>{const r=s.records.find(r=>r.id===noteMatch[1]);if(!r||!visible(user,r))throw new DomainError('Registo não encontrado.',404);if(mentioned.some(u=>!visible(u,r)))throw new DomainError('Uma menção não pode dar acesso a um processo restrito.',403);r.followers=[...new Set([...(r.followers||[]),...mentioned.map(u=>u.id)])];audit(s,user,r.id,'Registou uma nota interna');s.audit[0].note=body.note.trim();return s.audit[0];});return json(note,201);}
 const editMatch=path.match(/^\/api\/records\/([^/]+)$/);
 if(method==='PATCH'&&editMatch){const edited=await store.mutate(s=>{const r=s.records.find(r=>r.id===editMatch[1]);if(!r||!visible(user,r))throw new DomainError('Registo não encontrado.',404);if(r.type==='MATRICULA'||user.role==='ALUNO'&&r.status!=='SECRETARIA_FACULDADE')throw new DomainError('Este registo já não permite alterações neste perfil.',403);const {title,description,amount}=body;if(typeof title!=='string'||title.trim().length<3||title.length>150||typeof description!=='string'||!description.trim()||description.length>2000)throw new DomainError('Preencha título (3–150 caracteres) e descrição (1–2000).');let cents=r.amountCents;if(r.module==='financeiro'){if(!Number.isFinite(amount)||amount<=0||amount>10000000)throw new DomainError('Indique um valor positivo válido.');cents=Math.round(amount*100);if(r.status!=='EMITIDA'&&cents!==r.amountCents)throw new DomainError('O valor de um pagamento registado não pode ser alterado.');}const changed=[];if(r.title!==title.trim())changed.push('título');if(r.description!==description)changed.push('descrição');if(cents!==r.amountCents)changed.push('valor');r.title=title.trim();r.description=description;r.amountCents=cents;if(changed.length&&r.approverId)r.approval='PENDENTE';if(changed.length)audit(s,user,r.id,'Alterou '+changed.join(', '));return r;});return json(edited);}
 const activity=path.match(/^\/api\/records\/([^/]+)\/activity$/);
 if(method==='GET'&&activity){const r=store.read().records.find(r=>r.id===activity[1]);if(!r||!visible(user,r))throw new DomainError('Registo não encontrado.',404);if(['rh','financeiro'].includes(r.module))await store.mutate(s=>audit(s,user,r.id,'Consultou histórico'));return json(store.read().audit.filter(a=>a.recordId===r.id));}
 const advance=path.match(/^\/api\/records\/([^/]+)\/advance$/);
 if(method==='PATCH'&&advance){if(user.role==='ALUNO')throw new DomainError('Apenas o departamento responsável pode avançar o processo.',403);const r=await store.mutate(s=>{const r=s.records.find(r=>r.id===advance[1]);if(!r||!visible(user,r))throw new DomainError('Registo não encontrado.',404);if(r.approval&&r.approval!=='APROVADO')throw new DomainError('O processo aguarda autorização do superior.',403);const next=transitions[r.module]?.[r.status];if(!next)throw new DomainError('Não existe uma etapa seguinte disponível.');r.status=next;if(next==='PAGAMENTO_REGISTADO')r.paymentReference='MANUAL-'+randomUUID().slice(0,8);audit(s,user,r.id,next==='PAGAMENTO_REGISTADO'?'Registou confirmação manual de pagamento (sem conciliação bancária)':'Avançou para '+next);return r;});return json(r);}
 if(method==='GET'&&path==='/api/matricula/opcoes')return json(options(student(),store.read().cycle,courses));
 if(method==='POST'&&path==='/api/matricula/simular')return json(simulate(student(),store.read().cycle,courses,body.ids));
 if(method==='POST'&&path==='/api/matricula/submeter'){student();const r=await store.mutate(s=>{const st=s.students.find(x=>x.id===user.studentId);const calc=simulate(st,s.cycle,courses,body.ids);if(s.records.some(r=>r.type==='MATRICULA'&&r.studentId===st.id&&r.cycle===s.cycle.year&&r.parity===s.cycle.parity))throw new DomainError('Já existe uma matrícula para este ciclo.',409);const r={id:randomUUID(),module:'academico',type:'MATRICULA',title:'Matrícula · '+st.code,description:calc.items.map(c=>c.name).join(', '),items:calc.items,amountCents:calc.totalCents,status:'PENDENTE',owner:user.id,studentId:st.id,cycle:s.cycle.year,parity:s.cycle.parity,createdAt:new Date().toISOString()};assignProcessCode(s,r);s.records.unshift(r);audit(s,user,r.id,'Submeteu matrícula; pagamento ainda não confirmado');return r;});return json(r,201);}
 if(method==='GET'&&path==='/api/matricula/divida'){const st=student();return json({code:st.code,debtCents:st.debtCents,notice:'Saldo pendente de regularização. Consulte o departamento financeiro.'});}
 if(method==='POST'&&path==='/api/demo/student'){if(!localAccess)throw new DomainError('Endpoint não encontrado.',404);student();if(!['regular','debt','offline'].includes(body.scenario))throw new DomainError('Cenário inválido.');const st=await store.mutate(s=>{const st=s.students.find(x=>x.id===user.studentId);st.bankAvailable=body.scenario!=='offline';st.debtCents=body.scenario==='debt'?350000:0;audit(s,user,'system','Alterou cenário financeiro de demonstração');return st;});return json(st);}
 throw new DomainError('Endpoint não encontrado.',404);
 }catch(error){if(error instanceof DomainError)return json({error:error.message},error.status);console.error(error);json({error:'Ocorreu um erro. Tente novamente.'},500);}
 });
}
