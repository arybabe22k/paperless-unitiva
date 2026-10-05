export const apps = [
 {id:'academico',name:'Académico',description:'Matrículas, requerimentos e percurso académico',icon:'▤',roles:['ALUNO','SECRETARIA','ADMIN'],kind:'Requerimento'},
 {id:'financeiro',name:'Financeiro',description:'Facturas e registos de pagamento',icon:'◈',roles:['FINANCEIRO','ADMIN'],kind:'Factura'},
 {id:'rh',name:'Recursos Humanos',description:'Contratos e processos individuais',icon:'♧',roles:['RH','ADMIN'],kind:'Contrato'},
 {id:'transporte',name:'Transporte e Frota',description:'Viaturas e requisições de transporte',icon:'▱',roles:['TRANSPORTE','ADMIN'],kind:'Requisição de viatura'},
 {id:'servicos',name:'Serviços Gerais',description:'Ordens de serviço e operação diária',icon:'⊞',roles:['SERVICOS','ADMIN'],kind:'Ordem de serviço'},
 {id:'biblioteca',name:'Biblioteca e Arquivo',description:'Catálogo e registo documental',icon:'▥',roles:['BIBLIOTECA','ADMIN'],kind:'Registo de acervo'}
];
export const profiles = [
 {id:'admin',name:'Administrador',role:'ADMIN'},
 {id:'aluno',name:'Estudante · 240001',role:'ALUNO',studentId:'s1'},
 {id:'divida',name:'Estudante · 240002',role:'ALUNO',studentId:'s2'},
 {id:'calouro',name:'Estudante · 260001',role:'ALUNO',studentId:'s3'},
 ...['SECRETARIA','FINANCEIRO','RH','TRANSPORTE','SERVICOS','BIBLIOTECA'].map(role=>({id:role.toLowerCase(),name:role==='SECRETARIA'?'Secretaria':apps.find(a=>a.roles.includes(role))?.name,role}))
];
export const courses = [
 {id:1,name:'Introdução à Programação',year:1,semester:1,cents:150000,requires:[]},
 {id:2,name:'Matemática I',year:1,semester:1,cents:150000,requires:[]},
 {id:3,name:'Programação I',year:1,semester:2,cents:180000,requires:[1]},
 {id:4,name:'Matemática II',year:1,semester:2,cents:150000,requires:[2]},
 {id:5,name:'Estruturas de Dados',year:2,semester:1,cents:200000,requires:[3]},
 {id:6,name:'Arquitectura de Computadores',year:2,semester:1,cents:180000,requires:[]},
 {id:7,name:'Bases de Dados',year:2,semester:2,cents:200000,requires:[5]},
 {id:8,name:'Redes de Computadores',year:2,semester:2,cents:180000,requires:[]},
 {id:9,name:'Engenharia de Software',year:3,semester:1,cents:220000,requires:[7]},
 {id:10,name:'Sistemas Distribuídos',year:4,semester:1,cents:220000,requires:[8]}
];
export function seed(){return {cycle:{parity:1,year:'2026/2027'},students:[
 {id:'s1',code:'240001',name:'Estudante · 240001',course:'Sistemas e Redes Computacionais',year:2,semester:1,lastYear:1,lastSemester:2,approved:[1,4],debtCents:0,bankAvailable:true},
 {id:'s2',code:'240002',name:'Estudante · 240002',course:'Informática de Gestão',year:2,semester:1,lastYear:1,lastSemester:2,approved:[1,2,3,4],debtCents:350000,bankAvailable:true},
 {id:'s3',code:'260001',name:'Estudante · 260001',course:'Sistemas e Redes Computacionais',year:1,semester:1,lastYear:null,lastSemester:null,approved:[],debtCents:0,bankAvailable:true}
 ],records:demoRecords(),audit:[]};}
function demoRecords(){
 const samples=[
 ['academico','Declaração de frequência','Pedido de declaração para o ano lectivo 2026/2027.','SECRETARIA_FACULDADE','aluno',0],
 ['academico','Certificado de habilitações','Processo encaminhado para registo académico.','REGISTO_ACADEMICO','admin',0],
 ['financeiro','Propina de Outubro','Factura de propina para acompanhamento financeiro.','EMITIDA','admin',450000],
 ['financeiro','Taxa de biblioteca','Registo de pagamento para acompanhamento administrativo.','PAGAMENTO_REGISTADO','admin',25000],
 ['rh','Contrato de docente','Contrato em revisão pelo departamento.','DEPARTAMENTO','admin',0],
 ['rh','Renovação de contrato','Renovação na etapa de revisão pela direcção.','DIRECCAO','admin',0],
 ['transporte','Visita de estudo','Requisição de viatura para uma visita académica.','PENDENTE','admin',0],
 ['transporte','Deslocação institucional','Requisição aprovada pelo responsável.','APROVADA','admin',0],
 ['servicos','Iluminação da Sala B12','Ordem para verificar e reparar a iluminação.','ABERTA','admin',0],
 ['servicos','Preparação do auditório','Preparação de espaço para um evento académico.','ATRIBUIDA','admin',0],
 ['biblioteca','Regulamento académico','Metadados de documento institucional. Sem ficheiro associado.','CATALOGADO','admin',0],
 ['biblioteca','Relatório de investigação','Metadados de um trabalho académico. Sem ficheiro associado.','CATALOGADO','admin',0]
 ];
 return samples.map(([module,title,description,status,owner,amountCents],i)=>({id:'demo-'+(i+1),module,title,description,status,owner,amountCents,createdAt:new Date(Date.now()-i*3600000).toISOString()}));
}
