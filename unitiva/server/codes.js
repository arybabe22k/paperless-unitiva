const prefixes={academico:'ACA',financeiro:'FIN',rh:'RH',transporte:'TRP',servicos:'SG',biblioteca:'BIB'};
export function assignProcessCode(state,record){
 state.counters??={};const year=new Date(record.createdAt||Date.now()).getFullYear();
 const prefix=record.type==='MATRICULA'?'MAT':prefixes[record.module];
 if(!prefix||!Number.isInteger(year))throw Error('Não foi possível atribuir código ao processo.');
 const key=prefix+'-'+year,base=prefix+'-'+String(year).slice(-2)+'-';
 const used=new Set(state.records.map(r=>r.code).filter(Boolean));
 let number=state.counters[key]||0;
 for(const code of used)if(code.startsWith(base))number=Math.max(number,Number(code.slice(base.length))||0);
 if(!record.code){do{number++;record.code=base+String(number).padStart(4,'0');}while(used.has(record.code));}
 else if(record.code.startsWith(base))number=Math.max(number,Number(record.code.slice(base.length))||0);
 state.counters[key]=number;return record.code;
}
export function ensureProcessCodes(state){
 for(const r of state.records)if(r.code?.startsWith('UTV-')){r.legacyCode=r.code;delete r.code;}
 const seen=new Set();for(const r of state.records){if(r.code){if(seen.has(r.code))throw Error('Código de processo duplicado: '+r.code);seen.add(r.code);}}
 for(const r of [...state.records].reverse())assignProcessCode(state,r);
 return state;
}
