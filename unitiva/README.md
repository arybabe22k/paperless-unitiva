# UniTiva Paperless — v0.5

Plataforma de processos e documentos preparada para testes internos por Aristides e os departamentos da UniTiva. Mantém a interface aprovada e a identidade inspirada no site institucional.

## Alterações

- Login individual; administrador cria, edita, desactiva contas e redefine senhas.
- Faculdade/unidade, departamento, cargo e superior por funcionário. Hierarquias cíclicas são recusadas.
- Processos criados por funcionários exigem superior activo e ficam pendentes de autorização. O criador não pode aprovar o próprio processo; editar título, descrição ou valor exige nova aprovação. O superior designado permanece responsável por processos já criados, mesmo que a chefia do funcionário seja alterada.
- Seguidores e menções `@utilizador` no histórico, com notificações internas de alterações, notas, anexos e etapas. Seguir ou mencionar não concede acesso a documentos restritos.
- Permissões por módulo e por faculdade/departamento nos novos processos. Administradores e superior designado mantêm acesso.
- Layout adaptado para celulares, navegação horizontal e formulários em coluna única.
- Referências antigas são encurtadas no arranque; a referência anterior fica em `legacyCode`. Novos códigos permanecem estáveis após edições.

- Telas públicas sem etiquetas de protótipo ou demonstração.
- Código permanente por processo: `ACA-26-0001`. Prefixos ACA, MAT, FIN, RH, TRP, SG e BIB identificam a área; contadores por área/ano persistem. Registos antigos sem código recebem código no arranque.
- Hospedagem com contas individuais, senhas scrypt, cookies HttpOnly/SameSite e Secure em HTTPS. Permissões aplicadas na API, incluindo documentos.
- Processos, notas, histórico e anexos partilhados no servidor.
- Upload PDF, DOCX, PNG e JPG: 5 MB por ficheiro, 20 ficheiros/20 MB por processo; validação, visualização, descarga e remoção pelo autor ou administrador.
- Docker, volume persistente e Caddy para hospedagem com HTTPS. Consulte [docs/DEPLOY.md](docs/DEPLOY.md).

## Observar a interface sem instalação

Abra `UniTiva_Paperless.html`. Guarda processos apenas no navegador e anexos em IndexedDB. Não partilha dados entre colegas e não substitui a versão hospedada. Na primeira abertura, defina o utilizador e a senha do administrador. As restantes contas serão criadas em Utilizadores. Este login simula o fluxo; a versão hospedada valida credenciais no servidor.

Para preservar dados anteriores, mantém a chave `unitiva-prototype-v2` e a base `unitiva-paperless-files`. Elimine ambas no navegador para limpar os dados locais.

## Executar localmente

Node.js 22 ou superior. Sem dependências npm externas; não precisa de npm install.

```powershell
cd "C:\Users\LXQ\Desktop\Paperless UNITIVA\unitiva"
$env:ACCESS_MODE = "local"
npm start
```

Abra http://localhost:3001. Este modo permite explorar perfis apenas no próprio computador; é recusado fora de 127.0.0.1 e em produção. Para login com senha, crie contas conforme DEPLOY.md, remova ACCESS_MODE e reinicie.

## Limites internos do piloto

Esta versão destina-se a testes internos controlados. A apresentação profissional não significa que as integrações institucionais estejam concluídas. Use dados de teste.

- Dados iniciais, cadeiras e estudantes sintéticos: s1 regular, s2 com dívida, s3 primeiro ano. Sem importação do sistema académico real.
- Matrícula revalida regras, rejeita duplicados e cria pedido pendente. Não efectua pagamento, emite boleto nem activa matrícula. Bloqueio financeiro transversal ainda não implementado.
- Pagamento é confirmação administrativa manual, sem conciliação bancária. Assinatura permanece pendente; sem assinatura electrónica.
- Sem banco, SSO, OCR, EDMS, email ou antivírus. As notificações ficam disponíveis dentro do portal. Validação de formato não inspecciona todo o conteúdo de PDF/Word.
- Armazenamento JSON com anexos base64, gravação atómica e fila de alterações. Apenas uma instância, volume persistente e backups. Sem teste de carga institucional.
- Histórico identifica conta, processo, acção e data; não é imutável contra administradores. Sem cifragem de dados em disco pela aplicação.
- Sessões terminam em 30 minutos ou reinício. Sem recuperação automática de senha ou MFA. O administrador pode alterar senhas e desactivar contas na interface.
- A versão institucional exige os modelos, PostgreSQL e integrações completos previstos no documento mestre.

## Verificação

`npm test` cobre regras académicas, permissões, documentos, sessões, autenticação, origem dos pedidos, códigos em criação concorrente e persistência. `npm run build:standalone` gera o HTML com a mesma interface.

Os testes usam HTTP local e uma implementação de IndexedDB para a opção autónoma. Docker deve ser validado no destino: não foi executado neste ambiente. A validação funcional passou em 10 testes. Não foi possível executar a verificação visual em navegador neste ambiente; confirme o layout nos celulares usados pela equipa.

## Referências

Escopo original: `docs/documento-mestre-plataforma-unitiva.md`. Identidade: https://unitiva.ac.mz/unitiva/. Cabeçalho: cópia do logótipo oficial https://unitiva.ac.mz/unitiva-cn/uploads/2025/06/logo.png. A paleta é uma interpretação, não um manual oficial de marca.
