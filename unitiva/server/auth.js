import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';import {scrypt as rawScrypt,timingSafeEqual,randomBytes} from 'node:crypto';import {promisify} from 'node:util';import {resolve,dirname} from 'node:path';
const scrypt=promisify(rawScrypt);
export async function hashPassword(password){if(typeof password!=='string'||password.length<12||password.length>256)throw Error('A senha deve ter entre 12 e 256 caracteres.');const salt=randomBytes(16).toString('hex');const hash=await scrypt(password,salt,64);return {salt,hash:hash.toString('hex')};}
export async function createAuthenticator(file=process.env.USERS_FILE||resolve('data/users.json')){
 async function accounts(){try{const users=JSON.parse(await readFile(file,'utf8'));if(!Array.isArray(users))throw Error('Invalid accounts');return users;}catch(e){if(e.code==='ENOENT')return [];throw e;}}
 let queue=Promise.resolve();
 const publicUser=u=>{const {password,...profile}=u;return profile;};
 const list=async()=> (await accounts()).map(publicUser);
 const save=(id,body)=>{const run=queue.then(async()=>{const users=await accounts();const existing=id?users.find(u=>u.id===id):null;if(id&&!existing)throw Error('Utilizador não encontrado.');
 const u={...existing,id:existing?.id||randomBytes(16).toString('hex'),username:String(body.username||'').trim().toLowerCase(),name:String(body.name||'').trim(),role:body.role,faculty:String(body.faculty||'').trim(),department:String(body.department||'').trim(),jobTitle:String(body.jobTitle||'').trim(),superiorId:body.superiorId||null,studentId:body.studentId||existing?.studentId,active:body.active!==false};
 if(!/^[a-z0-9._-]{3,80}$/.test(u.username)||!u.name||u.name.length>150||!['ADMIN','ALUNO','SECRETARIA','FINANCEIRO','RH','TRANSPORTE','SERVICOS','BIBLIOTECA'].includes(u.role))throw Error('Nome, utilizador ou perfil inválido.');
 if([u.faculty,u.department,u.jobTitle].some(v=>!v||v.length>150))throw Error('Indique faculdade, departamento e cargo.');
 if(users.some(x=>x.username===u.username&&x.id!==u.id))throw Error('Este utilizador já existe.');
 if(u.superiorId){let boss=users.find(x=>x.id===u.superiorId&&x.active!==false);if(!boss||boss.role==='ALUNO')throw Error('Superior inválido.');const seen=new Set([u.id]);while(boss){if(seen.has(boss.id))throw Error('A hierarquia não pode conter ciclos.');seen.add(boss.id);boss=users.find(x=>x.id===boss.superiorId);}}
 if(u.role!=='ADMIN'&&u.role!=='ALUNO'&&!u.superiorId)throw Error('Associe um superior a este funcionário.');
 if(u.role==='ALUNO'&&!['s1','s2','s3'].includes(u.studentId))throw Error('Associe uma ficha académica existente.');
 if(existing?.role==='ADMIN'&&(u.role!=='ADMIN'||!u.active)&&!users.some(x=>x.id!==id&&x.role==='ADMIN'&&x.active!==false))throw Error('Mantenha pelo menos um administrador activo.');
 u.password=body.password?await hashPassword(body.password):existing?.password;if(!u.password)throw Error('Defina uma senha inicial.');
 const next=id?users.map(x=>x.id===id?u:x):[...users,u];await mkdir(dirname(file),{recursive:true});await writeFile(file+'.tmp',JSON.stringify(next,null,2),{mode:0o600});await rename(file+'.tmp',file);return publicUser(u);});queue=run.catch(()=>{});return run;};
 return {list,save,ready:async()=> (await accounts()).some(u=>u.active!==false),async authenticate(username,password){
  if(typeof username!=='string'||typeof password!=='string'||password.length>256)return null;
  const user=(await accounts()).find(u=>u.username===username.trim().toLowerCase()&&u.active!==false);
  const computed=await scrypt(password,user?.password?.salt||'constant-time-placeholder',64);
  const stored=user?.password?.hash&&/^[a-f0-9]{128}$/.test(user.password.hash)?Buffer.from(user.password.hash,'hex'):Buffer.alloc(64);
  if(!timingSafeEqual(computed,stored)||!user)return null;
  const {password:secret,...profile}=user;return profile;
 }};
}
