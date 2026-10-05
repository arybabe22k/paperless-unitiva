// Validação partilhada por Node e pela demonstração autónoma.
export const MAX_FILE_BYTES=5*1024*1024;
export const MAX_RECORD_BYTES=20*1024*1024;
export const MAX_RECORD_FILES=20;
export function validateUpload(name,bytes){
 if(typeof name!=='string'||!name.trim()||name.length>180||/[\\/\x00-\x1f\x7f]/.test(name))throw Error('Nome de ficheiro inválido.');
 if(!(bytes instanceof Uint8Array)||!bytes.length)throw Error('O ficheiro está vazio.');
 if(bytes.length>MAX_FILE_BYTES)throw Error('Cada ficheiro pode ter até 5 MB.');
 const extension=name.split('.').pop().toLowerCase();
 const prefix=values=>values.every((n,i)=>bytes[i]===n);
 let mime;
 if(extension==='pdf'&&prefix([37,80,68,70,45]))mime='application/pdf';
 else if(extension==='png'&&prefix([137,80,78,71,13,10,26,10]))mime='image/png';
 else if(['jpg','jpeg'].includes(extension)&&prefix([255,216,255]))mime='image/jpeg';
 else if(extension==='docx'&&prefix([80,75,3,4])){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),entries=[];
  for(let i=0;i+46<=bytes.length;i++)if(bytes[i]===80&&bytes[i+1]===75&&bytes[i+2]===1&&bytes[i+3]===2){
   const length=view.getUint16(i+28,true),extra=view.getUint16(i+30,true),comment=view.getUint16(i+32,true);
   if(i+46+length+extra+comment>bytes.length)throw Error('Documento Word inválido.');
   entries.push(new TextDecoder().decode(bytes.subarray(i+46,i+46+length)));i+=45+length+extra+comment;
  }
  if(!entries.includes('[Content_Types].xml')||!entries.includes('word/document.xml')||entries.some(n=>/vbaProject\.bin$/i.test(n)))throw Error('O ficheiro não é um documento DOCX aceite.');
  mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
 }
 if(!mime)throw Error('Formato inválido. Escolha PDF, DOCX, PNG ou JPG; o conteúdo deve corresponder à extensão.');
 return {name:name.trim(),mime,size:bytes.length};
}
export function checkRecordQuota(files,newBytes){if(files.length>=MAX_RECORD_FILES)throw Error('Um registo pode ter até 20 anexos.');if(files.reduce((n,f)=>n+f.size,0)+newBytes>MAX_RECORD_BYTES)throw Error('Os anexos deste registo podem ocupar até 20 MB.');}
