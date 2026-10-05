# Hospedar UniTiva Paperless para testes internos

O pacote está preparado para publicação; não contém servidor publicado nem credenciais pré-configuradas. Use dados sintéticos e um grupo limitado de colegas. Limitações internas no README.

## Servidor e domínio

Utilize Linux com Docker Engine e Compose, por exemplo uma instância EC2 na AWS. Aponte o DNS do domínio para o IP público. Autorize portas 80 e 443 e limite o acesso administrativo. Não exponha a porta 3001 à Internet.

Extraia o pacote, entre em unitiva, copie `.env.example` para `.env` e defina PUBLIC_DOMAIN com o domínio, sem https:// nem caminho. Caddy termina HTTPS e encaminha para a aplicação. Referências: https://caddyserver.com/docs/automatic-https e https://docs.docker.com/compose/how-tos/use-secrets/.

## Criar contas antes do arranque

Crie `secrets/user-password.txt` com um editor seguro: senha única de pelo menos 12 caracteres. Não coloque senhas em comandos, ZIP ou repositório.

```bash
mkdir -p secrets
chmod 700 secrets
# Crie secrets/user-password.txt com um editor seguro.
chmod 600 secrets/user-password.txt
# O contentor de criação de contas precisa de ler o ficheiro.
docker compose --profile setup run --rm --user root provision --username aristides --name "Aristides" --role ADMIN
```

Após criar o primeiro administrador e iniciar a aplicação, entre no portal e abra **Utilizadores**. Crie as contas dos colegas com senhas individuais, faculdade (ou unidade central), departamento, cargo, perfil de acesso e superior hierárquico. Perfis disponíveis: ADMIN, ALUNO, SECRETARIA, FINANCEIRO, RH, TRANSPORTE, SERVICOS e BIBLIOTECA. ALUNO requer a ficha sintética s1, s2 ou s3.

Antes de criar processos com a conta administrativa, edite-a para preencher a estrutura orgânica e associar um superior activo. Pode criar outra conta ADMIN para a direcção. Nenhuma pessoa pode ser seu próprio superior e ciclos hierárquicos são recusados. A conta de direcção pode permanecer sem superior até se configurar a chefia; nesse caso, não cria processos de funcionário.

Em **Utilizadores**, o administrador também poderá editar dados, redefinir senhas e desactivar contas. A desactivação revoga o acesso da sessão no próximo pedido. Não há recuperação automática de senha. Apague o ficheiro secreto usado na criação inicial. Senhas não devem ser partilhadas nem guardadas no ZIP.

As notificações são internas: abra **Notificações** para consultar alterações. Não há envio por email nem notificações push. Seguidores e menções só aceitam contas com acesso ao processo. A chefia aprova ou rejeita na página do processo, com motivo obrigatório para rejeição. Alterações ao título, descrição ou valor voltam a pedir aprovação.

O serviço provision usa root apenas para ler o segredo restrito. Após provisionar, ajuste a propriedade dos ficheiros para o utilizador da aplicação:

```bash
docker compose --profile setup run --rm --user root --entrypoint sh provision -c 'chown -R node:node /app/data'
docker compose up -d --build app web
docker compose ps
docker compose logs --tail=100 app web
```

## Validar antes de convidar colegas

Abra https://SEU_DOMINIO e confirme:

1. Sem sessão não consulta processos/anexos; não aparece escolha livre de perfis.
2. Contas limitadas não acedem a módulos restritos ou documentos de outro estudante.
3. Dois colegas criam processos com códigos distintos, preservados após edição.
4. Documento carregado fica disponível para outra conta autorizada no mesmo processo.
5. Após `docker compose restart app`, dados/códigos/anexos permanecem e é preciso relogin.
6. Pagamento é registo manual; matrícula continua pendente.

Não hospede UniTiva_Paperless.html como substituto do servidor: guarda dados e contas apenas no navegador.

## Persistência e manutenção

Volumes app_data, caddy_data e caddy_config persistem dados e TLS. Não execute `docker compose down -v`: elimina os volumes. Nunca distribua ficheiros de contas/dados no pacote.

Apenas uma instância da aplicação. Para backup, pare app, copie o conteúdo completo de app_data (prototype.json e users.json), proteja a cópia e reinicie. Teste restauração antes de convidar colegas. O nome histórico prototype.json mantém compatibilidade e não aparece nas telas. users.json contém hashes restritos.

Actualizações: backup, `npm test`, depois `docker compose up -d --build app`. Preserve o volume. Códigos em falta são migrados; códigos existentes preservados e duplicados impedem arranque.

O lock de instância é removido no encerramento normal e recuperado quando o PID antigo já não existe. Se o arranque indicar arquivo em uso após falha, confirme ausência de outra instância antes de remover lock antigo.

## Senha sem Docker, apenas local

Node 22+. No PowerShell, crie secrets\user-password.txt com um editor:

```powershell
$env:UNITIVA_USER_PASSWORD_FILE = "secrets\user-password.txt"
node server/manage-users.js --username aristides --name "Aristides" --role ADMIN
Remove-Item Env:UNITIVA_USER_PASSWORD_FILE
Remove-Item "secrets\user-password.txt"
Remove-Item Env:ACCESS_MODE -ErrorAction SilentlyContinue
npm start
```

Abra http://localhost:3001. Produção exige PUBLIC_ORIGIN HTTPS. Sessões ficam em memória e terminam no reinício. Não há envio de convites: distribua URL e credenciais individuais por canais internos adequados.
