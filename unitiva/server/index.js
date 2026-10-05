import {createApp} from './app.js';import {createStore} from './store.js';import {createAuthenticator} from './auth.js';import {open,unlink,readFile,mkdir} from 'node:fs/promises';import {resolve,dirname} from 'node:path';
const production=process.env.NODE_ENV==='production',local=process.env.ACCESS_MODE==='local',origin=process.env.PUBLIC_ORIGIN;
if(production&&(local||!origin||!origin.startsWith('https://')))throw Error('A hospedagem exige PUBLIC_ORIGIN HTTPS e acesso autenticado.');
const host=process.env.HOST||(production?'0.0.0.0':'127.0.0.1');if(local&&host!=='127.0.0.1')throw Error('O acesso local por perfil só pode ser usado no próprio computador.');
const auth=await createAuthenticator();if(!local&&!await auth.ready())throw Error('Crie a primeira conta com server/manage-users.js antes de iniciar. Consulte docs/DEPLOY.md.');
const path=process.env.DATA_FILE||resolve('data/prototype.json');await mkdir(dirname(path),{recursive:true});const lock=path+'.server-lock';
try{const fd=await open(lock,'wx',0o600);await fd.writeFile(String(process.pid));await fd.close();}catch(e){if(e.code!=='EEXIST')throw e;const pid=Number(await readFile(lock,'utf8'));let alive=true;try{process.kill(pid,0);}catch(err){if(err.code==='ESRCH')alive=false;}if(alive)throw Error('O arquivo de dados já está a ser usado. Execute apenas uma instância da aplicação.');await unlink(lock);const fd=await open(lock,'wx',0o600);await fd.writeFile(String(process.pid));await fd.close();}
let server;
try{server=createApp(await createStore(path),{authenticate:auth.authenticate,accounts:auth,allowLocalProfiles:local,secureCookies:production,origin,trustProxy:production});server.listen(Number(process.env.PORT||3001),host,()=>console.log('UniTiva Paperless · porta '+(process.env.PORT||3001)));}catch(e){await unlink(lock);throw e;}
server.on('error',async error=>{await unlink(lock).catch(()=>{});console.error(error);process.exitCode=1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await unlink(lock).catch(()=>{});process.exit(0);}));
