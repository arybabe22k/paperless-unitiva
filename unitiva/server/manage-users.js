import {readFile,mkdir,writeFile,rename,open,unlink} from 'node:fs/promises';import {resolve,dirname} from 'node:path';import {randomUUID} from 'node:crypto';import {hashPassword} from './auth.js';
const args=process.argv.slice(2),value=flag=>args[args.indexOf(flag)+1];
const username=value('--username'),name=value('--name'),role=value('--role');
if(!args.includes('--username')||!args.includes('--name')||!args.includes('--role'))throw Error('Uso: node server/manage-users.js --username nome --name "Nome completo" --role ADMIN [--student-id s1]. A senha será lida de UNITIVA_USER_PASSWORD ou UNITIVA_USER_PASSWORD_FILE.');
if(!/^[a-z0-9._-]{3,80}$/.test(username)||!name?.trim()||!['ADMIN','ALUNO','SECRETARIA','FINANCEIRO','RH','TRANSPORTE','SERVICOS','BIBLIOTECA'].includes(role))throw Error('Utilizador, nome ou papel inválido.');
let password=process.env.UNITIVA_USER_PASSWORD;if(process.env.UNITIVA_USER_PASSWORD_FILE)password=(await readFile(process.env.UNITIVA_USER_PASSWORD_FILE,'utf8')).trimEnd();
const hashed=await hashPassword(password);const path=process.env.USERS_FILE||resolve('data/users.json');await mkdir(dirname(path),{recursive:true});
const lock=path+'.lock';const handle=await open(lock,'wx',0o600);
try{let users=[];try{users=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}if(users.some(u=>u.username===username))throw Error('Este utilizador já existe.');
const studentId=args.includes('--student-id')?value('--student-id'):undefined;if(role==='ALUNO'&&!['s1','s2','s3'].includes(studentId))throw Error('Associe uma ficha académica existente através de --student-id s1, s2 ou s3.');
users.push({id:randomUUID(),username,name:name.trim(),role,studentId,active:true,password:hashed});await writeFile(path+'.tmp',JSON.stringify(users,null,2),{mode:0o600});await rename(path+'.tmp',path);console.log('Conta criada: '+username+' ('+role+')');}finally{await handle.close();await unlink(lock);}
