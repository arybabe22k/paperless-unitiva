import test from 'node:test';import assert from 'node:assert/strict';import {validateUpload,checkRecordQuota,MAX_FILE_BYTES} from '../server/uploads.js';
test('Anexos: formato real, nome, tamanho e limite por processo',()=>{
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1cAAAAASUVORK5CYII=','base64');assert.equal(validateUpload('comprovativo.png',png).mime,'image/png');
 assert.throws(()=>validateUpload('documento.pdf',png),/Formato inválido/);
 assert.throws(()=>validateUpload('../foto.png',png),/Nome/);
 assert.throws(()=>validateUpload('ficheiro.svg',Buffer.from('<svg/>')),/Formato/);
 assert.throws(()=>validateUpload('ficheiro.png',new Uint8Array()),/vazio/);
 assert.throws(()=>validateUpload('ficheiro.png',new Uint8Array(MAX_FILE_BYTES+1)),/5 MB/);
 assert.throws(()=>validateUpload('ficheiro.docx',Buffer.from('PK\x03\x04ZIP falso')),/DOCX/);
 assert.throws(()=>checkRecordQuota(Array.from({length:20},()=>({size:1})),1),/20 anexos/);
 assert.throws(()=>checkRecordQuota([{size:20*1024*1024}],1),/20 MB/);
});
