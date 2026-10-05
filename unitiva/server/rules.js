export class DomainError extends Error {constructor(message,status=422){super(message);this.status=status;}}
export function gate(student){
 if(!student.bankAvailable) throw new DomainError('Serviço financeiro indisponível. O acesso à matrícula fica bloqueado.',503);
 if(student.debtCents>0) throw new DomainError('Existe dívida pendente. Consulte o aviso de dívida.',423);
 if(student.year===1&&student.semester===1) throw new DomainError('A primeira matrícula será feita presencialmente na secretaria.',423);
}
export function options(student,cycle,catalog){
 gate(student);
 const target=student.lastSemester===1?{year:student.lastYear,semester:2}:{year:(student.lastYear??0)+1,semester:1};
 const approved=new Set(student.approved);
 const completeYear=y=>catalog.filter(c=>c.year===y).every(c=>approved.has(c.id));
 const barrier=target.year===3&&!completeYear(1)||target.year>=4&&!completeYear(2);
 const regular=catalog.filter(c=>!barrier&&target.semester===cycle.parity&&c.year===target.year&&c.semester===target.semester&&!approved.has(c.id));
 const decorate=c=>({...c,blocked:c.requires.some(id=>!approved.has(id)),missing:c.requires.filter(id=>!approved.has(id)).map(id=>catalog.find(x=>x.id===id)?.name)});
 const backlog=catalog.filter(c=>c.semester===cycle.parity&&!approved.has(c.id)&&(c.year<target.year||c.year===target.year&&c.semester<target.semester));
 return {regular:regular.map(decorate),backlog:backlog.map(decorate),target,barrier:!!barrier,cycle};
}
export function simulate(student,cycle,catalog,ids){
 if(!Array.isArray(ids)||ids.length===0||ids.some(x=>!Number.isInteger(x))||new Set(ids).size!==ids.length)throw new DomainError('Seleccione cadeiras válidas, sem repetições.');
 const offered=options(student,cycle,catalog);const eligible=[...offered.regular,...offered.backlog];
 const selected=ids.map(id=>eligible.find(c=>c.id===id));
 if(selected.some(c=>!c||c.blocked)) throw new DomainError('Selecção inválida: verifique paridade, precedências e barreiras de ciclo.');
 if(offered.regular.some(c=>!c.blocked&&!ids.includes(c.id)))throw new DomainError('As cadeiras regulares elegíveis são obrigatórias.');
 return {items:selected,totalCents:selected.reduce((s,c)=>s+c.cents,0)};
}
