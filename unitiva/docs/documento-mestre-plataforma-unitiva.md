# Documento Mestre — Plataforma UNITIVA
### Matrícula Académica + Solução Paperless Institucional

Este é o documento único de referência do projecto. Reúne tudo o que foi decidido e especificado até agora — visão, enquadramento legal, arquitectura, infraestrutura, modelo de dados, endpoints, cronograma e critérios de aceitação — para que qualquer pessoa (nova na equipa ou não) consiga orientar-se sem precisar de abrir os documentos anteriores.

---

## Índice

0. [Como usar este documento](#0)
1. [Visão Geral e Decisões Fundamentais](#1)
2. [Enquadramento Legal](#2)
3. [Arquitectura Geral — Núcleo Partilhado + Apps (estilo Odoo)](#3)
4. [Infraestrutura e Segurança](#4)
5. [Módulo — Académico (inclui Matrícula)](#5)
6. [Módulo — Financeiro](#6)
7. [Módulo — RH](#7)
8. [Módulo — Transporte/Frota](#8)
9. [Módulo — Serviços Gerais](#9)
10. [Módulo — Biblioteca e Arquivo](#10)
11. [Princípio Transversal — Documentação Total](#11)
12. [Equipa Proposta](#12)
13. [Cronograma Consolidado](#13)
14. [Testes e Critérios de Aceitação](#14)
15. [Riscos e Mitigações](#15)
16. [Glossário Rápido](#16)
17. [Anexos e Documentos Complementares](#17)

---

<a name="0"></a>
## 0. Como usar este documento

- Se és novo no projecto: lê as secções 1 a 4 primeiro (visão, legal, arquitectura, infraestrutura) — dão o "porquê" antes do "como".
- Se vais implementar um módulo específico: vai directo à secção correspondente (5 a 10) — cada uma é autossuficiente, com modelo de dados e endpoints próprios.
- Se precisas de decidir algo novo: confere primeiro a secção 1 (decisões fechadas) para não reabrir o que já foi acordado.
- Os ficheiros de apoio (seed SQL de rotas, proposta formal em .docx, diagramas visuais) estão listados na secção 17 e não precisam de ser lidos para perceber o projecto — só para detalhe operacional ou apresentação.

---

<a name="1"></a>
## 1. Visão Geral e Decisões Fundamentais

**O que é:** uma plataforma única para a UNITIVA que cobre (a) o motor de matrícula/inscrição académica já em produção e (b) uma solução paperless institucional que estende esse mesmo portal a todos os processos administrativos da universidade.

**Motivação central:** reduzir custo e tempo de processos — não modernização pela modernização. Princípio reforçado ao longo do projecto: **nada deve acontecer sem deixar rasto digital** (ver secção 11).

**Decisões já fechadas:**

| Decisão | Valor |
|---|---|
| Hospedagem | Nuvem — AWS, região af-south-1 (Cidade do Cabo) |
| Filosofia de licenciamento | Open source auto-hospedado |
| Escala | ~400 utilizadores, sem picos fortes — dimensionar para disponibilidade e segurança, não para volume bruto |
| Âmbito | 6 módulos: Académico (com Chancelaria/Secretaria/Registo Académico/Secretarias de Faculdade), Financeiro, RH, Transporte/Frota, Serviços Gerais, Biblioteca/Arquivo |
| Arquitectura | Núcleo partilhado + módulos como "apps" instaláveis, à semelhança do Odoo |
| Stack aplicacional | Spring Boot ou Node.js/Express · React + Tailwind · PostgreSQL |
| Identidade | Keycloak (SSO único) |
| EDMS / OCR | Papermerge ou OpenKM |
| Workflow / BPM | Camunda (só nos módulos que precisam de aprovação formal) |
| Assinatura electrónica | Documenso (níveis simples/avançado) + integração INTIC (nível qualificado) |
| Resiliência/infra | Redis, 2 instâncias de API, réplicas de leitura PostgreSQL |

---

<a name="2"></a>
## 2. Enquadramento Legal

A base legal que torna esta solução viável é a **Lei nº 3/2017, de 9 de Janeiro — Lei das Transacções Electrónicas (LTE)**, em vigor em Moçambique desde 2017.

- O documento electrónico tem, por lei, **o mesmo efeito jurídico do documento em papel** e **constitui prova em juízo**.
- A LTE reconhece **três níveis de assinatura electrónica**: simples, avançada, qualificada. O nível a aplicar depende do peso do documento (ver tabela de "Documentação Total" na secção 11).
- O **Decreto nº 3/2019** regulamenta a certificação digital; o **INTIC** é a Autoridade Certificadora Raiz do Estado.
- Está em preparação (2026) uma **Lei de Protecção de Dados Pessoais** própria (hoje tratada nos artigos 63º-65º da LTE) — relevante sobretudo para o módulo RH (dados salariais) e Académico (dados pessoais de alunos).
- A exigência de **facturação electrónica junto da Autoridade Tributária** ainda não foi confirmada para a instituição — a confirmar antes de fechar o módulo Financeiro.

---

<a name="3"></a>
## 3. Arquitectura Geral — Núcleo Partilhado + Apps (estilo Odoo)

Os seis módulos não são seis sistemas ligados por API — são **seis "apps" sobre um único núcleo partilhado**, a mesma lógica do Odoo: instala-se o que se precisa, mas todas as apps partilham utilizadores, permissões e registo de actividade.

```
┌───────────────────────────────────────────────────────────┐
│                    NÚCLEO PARTILHADO                        │
│  Utilizadores/Papéis (Keycloak) · Registo de Apps instaladas │
│  Chatter/Log de Actividade (por registo, em toda a app)      │
│  Motor de Documentos (EDMS) · Motor de Workflow (Camunda)     │
│  Notificações · Pesquisa global                              │
└───────────────────────────────────────────────────────────┘
     │         │        │           │            │          │
[Académico][Financeiro][RH][Transporte/Frota][Serv.Gerais][Biblioteca]
```

- **App Launcher** único no portal — grelha de ícones (como o painel inicial do Odoo); o utilizador só vê as apps a que o seu papel dá acesso.
- Cada registo de qualquer app tem um **"chatter"**: histórico automático de quem fez o quê e quando — independente de o módulo usar ou não workflow/assinatura formal.
- Camada de integração liga-se ao que já existe (motor de matrícula) por API, sem obrigar substituição.

**Diagrama de fluxo de dados, sequências e diagrama ER completos** estão no documento visual `arquitetura-fluxo-dados-matricula.html` (secção 17).

---

<a name="4"></a>
## 4. Infraestrutura e Segurança

Dimensionada para ~400 utilizadores sem picos fortes — investimento concentrado em segurança e disponibilidade, não em capacidade bruta.

```
Utilizadores → WAF/CDN → Load Balancer (2 instâncias de API)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
            Redis      PostgreSQL Primário   S3 (documentos,
       (sessões/cache/   + Réplicas de        cifrado SSE-KMS)
         rate limit)      leitura (1-2)
```

**Load balancing:** health checks activos, sessões sem estado (vivem no Redis), TLS terminado no LB, deploy sem downtime (rolling).

**Redis — três usos separados por prefixo de chave:**
| Uso | Chave | TTL |
|---|---|---|
| Sessões/JWT | `sess:{userId}` | 30 min |
| Cache de leitura | `cache:cadeiras:{paridade}` | 60-300s |
| Rate limiting | `rl:{ip/userId}:{endpoint}` | janela de 60s |

**Rate limiting por sensibilidade:**
| Endpoint | Limite |
|---|---|
| Login | 5 tentativas / 15 min |
| Submissão de matrícula | 3 / min |
| Leituras gerais | 60 / min |
| Endpoints RH/financeiro | 20 / min + auditoria |
| API pública | 10 / min por IP |

**Base de dados:** RDS PostgreSQL multi-AZ (primário só para escritas), 1-2 réplicas de leitura (uma dedicada a relatórios/RH), PgBouncer para connection pooling, backups diários + PITR (retenção ≥30 dias). Regra de consistência: leitura imediatamente após escrita do próprio utilizador vai sempre ao primário.

**Segurança:** TLS em trânsito, cifragem em repouso (RDS + S3 via SSE-KMS), BD/Redis só em subnets privadas, segredos no Secrets Manager (nunca em variáveis de ambiente em texto simples), log de auditoria imutável para acessos a RH/financeiro, WAF com regras OWASP Top 10, princípio do menor privilégio por papel.

**Dimensionamento de referência:** 2× instâncias de API (2 vCPU/4GB), PostgreSQL primário 2 vCPU/8GB multi-AZ, Redis pequeno (cache.t4g.small) — sem necessidade de auto-scaling agressivo para este volume.

*(Diagramas completos desta secção: `infraestrutura-seguranca-plataforma.html`, secção 17)*

---

<a name="5"></a>
## 5. Módulo — Académico (inclui Matrícula)

### 5.1 Estrutura orgânica

```
Chancelaria                    → assina o que exige nível QUALIFICADO (diplomas, graus)
   ▲
Secretaria (central)
   ▲
Registo Académico              → histórico oficial (alimentado pela matrícula)
   ▲
Secretaria de cada Faculdade   → primeiro ponto de contacto do aluno
```

### 5.2 Faculdades e cursos (catálogo real)

| Faculdade | Licenciaturas |
|---|---|
| Direito | Direito |
| Economia e Ciências Empresariais | Gestão de Empresas · Gestão Financeira e Bancária · Economia Monetária e Seguros · Economia · Contabilidade e Auditoria · Gestão de Recursos Humanos · Marketing e Publicidade · Ciências de Comunicação · Administração Pública e Autárquica |
| Engenharias, Arquitectura e Planeamento Físico | Engenharia Civil · Engenharia Mecânica · Engenharia de Minas · Informática de Gestão · Arquitectura e Planeamento Físico · Geologia Aplicada · Sistemas e Redes Computacionais |
| Ciências de Saúde | Medicina Geral · Enfermagem Geral · Farmácia · Administração e Gestão Hospitalar · Psicologia Clínica · Psicologia Social e do Trabalho |

### 5.3 Fluxo de acesso e trava financeira (motor de matrícula)

1. Login com código de estudante (6 dígitos) + senha.
2. Calouro (1º Ano/1º Semestre) → bloqueado, matrícula manual na secretaria.
3. **Trava financeira (prioridade 0):** consulta ao Banco Externo — `saldo_devedor > 0` bloqueia tudo excepto "Imprimir Boleto de Dívida"; `saldo == 0` sincroniza o Banco Interno e liberta o fluxo (e efectiva qualquer matrícula PENDENTE).

### 5.4 Motor de regras académicas

- **Paridade:** só são oferecidas cadeiras cuja paridade (Par/Ímpar) coincide com o ciclo actual do portal.
- **Barreira de ciclo:** para o 3º Ano exige 100% do 1º Ano concluído; para o 4º Ano exige 100% do 2º Ano.
- **Sequência lógica (PPL):** o aluno só avança um semestre lógico de cada vez; se o semestre lógico não bater com o ciclo actual do portal, o Grupo 1 fica vazio e só há acesso a cadeiras em atraso.
- **Precedência:** cadeira B exigindo A não aprovada → B bloqueada por precedência, A injectada no Grupo 2 (atrasos) já marcada.
- **Interface:** Grupo 1 (regulares, travado) e Grupo 2 (atrasos, opcional) — desmarcar uma cadeira do Grupo 2 que seja precedência de uma do Grupo 1 desmarca automaticamente essa Regular.

### 5.5 Modelo de dados

```sql
-- Núcleo académico/matrícula
CREATE TABLE faculdades (id SERIAL PRIMARY KEY, nome VARCHAR(150) UNIQUE NOT NULL, secretaria_responsavel VARCHAR(100));
CREATE TABLE cursos (id SERIAL PRIMARY KEY, faculdade_id INT REFERENCES faculdades(id), nome VARCHAR(150) NOT NULL, grau VARCHAR(30) DEFAULT 'LICENCIATURA');

CREATE TABLE alunos (
  id SERIAL PRIMARY KEY, codigo_estudante CHAR(6) UNIQUE NOT NULL, senha_hash TEXT NOT NULL,
  curso_id INT REFERENCES cursos(id),
  ano_curricular_atual INT NOT NULL, semestre_curricular_atual INT NOT NULL,
  ultimo_semestre_concluido_ano INT, ultimo_semestre_concluido_semestre INT,
  status VARCHAR(20) DEFAULT 'ACTIVO'
);

CREATE TABLE cadeiras (
  id SERIAL PRIMARY KEY, curso_id INT REFERENCES cursos(id), codigo VARCHAR(20) UNIQUE NOT NULL,
  nome VARCHAR(150) NOT NULL, ano_curricular INT NOT NULL, semestre INT NOT NULL, taxa NUMERIC(12,2) NOT NULL
);
CREATE TABLE precedencias (cadeira_id INT REFERENCES cadeiras(id), cadeira_precedente_id INT REFERENCES cadeiras(id), PRIMARY KEY (cadeira_id, cadeira_precedente_id));
CREATE TABLE historico_academico (id SERIAL PRIMARY KEY, aluno_id INT REFERENCES alunos(id), cadeira_id INT REFERENCES cadeiras(id), resultado VARCHAR(10) NOT NULL, ano_lectivo VARCHAR(9) NOT NULL, UNIQUE(aluno_id, cadeira_id, ano_lectivo));
CREATE TABLE configuracao_ciclo (id INT PRIMARY KEY DEFAULT 1, paridade_actual VARCHAR(10) NOT NULL, ano_lectivo_actual VARCHAR(9) NOT NULL);
CREATE TABLE pendencias_financeiras (id SERIAL PRIMARY KEY, aluno_id INT REFERENCES alunos(id), saldo_devedor NUMERIC(12,2) DEFAULT 0, actualizado_em TIMESTAMP DEFAULT now());

CREATE TABLE matriculas (id SERIAL PRIMARY KEY, aluno_id INT REFERENCES alunos(id), ano_lectivo VARCHAR(9), paridade VARCHAR(10), valor_total NUMERIC(12,2), status VARCHAR(20) DEFAULT 'PENDENTE', criado_em TIMESTAMP DEFAULT now());
CREATE TABLE matricula_itens (id SERIAL PRIMARY KEY, matricula_id INT REFERENCES matriculas(id), cadeira_id INT REFERENCES cadeiras(id), grupo VARCHAR(10), bloqueada_precedencia BOOLEAN DEFAULT FALSE);
CREATE TABLE boletos (id SERIAL PRIMARY KEY, matricula_id INT REFERENCES matriculas(id) UNIQUE, valor NUMERIC(12,2), pdf_path TEXT, emitido_em TIMESTAMP DEFAULT now());

-- Documentos académicos (requerimentos, certificados) — extensão paperless
CREATE TABLE tipos_documento (id SERIAL PRIMARY KEY, nome VARCHAR(100) NOT NULL, nivel_assinatura VARCHAR(20) NOT NULL);
CREATE TABLE processos_documentais (
  id SERIAL PRIMARY KEY, aluno_id INT REFERENCES alunos(id), tipo_documento_id INT REFERENCES tipos_documento(id),
  faculdade_id INT REFERENCES faculdades(id), estagio_actual VARCHAR(30) DEFAULT 'SECRETARIA_FACULDADE',
  status VARCHAR(30) DEFAULT 'SUBMETIDO', workflow_instance_id VARCHAR(64), documento_final_s3_key TEXT, criado_em TIMESTAMP DEFAULT now()
);
CREATE TABLE assinaturas (id SERIAL PRIMARY KEY, processo_id INT REFERENCES processos_documentais(id), assinante_id INT, nivel VARCHAR(20), certificado_ref TEXT, assinado_em TIMESTAMP);
```

### 5.6 Endpoints principais

| Endpoint | Descrição |
|---|---|
| `POST /auth/login` | Autentica, aplica trava financeira, devolve JWT com claim de acesso |
| `GET /matricula/opcoes` | Grupo 1/Grupo 2 já processados pelo motor de regras |
| `POST /matricula/simular` | Recalcula valor total (revalida dependências) |
| `POST /matricula/submeter` | Grava matrícula PENDENTE, gera boleto |
| `POST /documentos` | Submete requerimento/certificado, arranca workflow |
| `GET /documentos/{id}/status` | Acompanha estágio actual |
| `POST /documentos/{id}/assinar` | Aciona assinatura no nível exigido pelo tipo de documento |

---

<a name="6"></a>
## 6. Módulo — Financeiro

```sql
CREATE TABLE facturas (id SERIAL PRIMARY KEY, numero VARCHAR(30) UNIQUE, entidade_tipo VARCHAR(20), entidade_id INT, valor NUMERIC(12,2), descricao TEXT, status VARCHAR(20) DEFAULT 'EMITIDA', documento_s3_key TEXT, criado_em TIMESTAMP DEFAULT now());
CREATE TABLE recibos (id SERIAL PRIMARY KEY, factura_id INT REFERENCES facturas(id), valor_pago NUMERIC(12,2), metodo_pagamento VARCHAR(30), referencia_banco_externo TEXT, documento_s3_key TEXT, emitido_em TIMESTAMP DEFAULT now());
CREATE TABLE conciliacoes (id SERIAL PRIMARY KEY, periodo VARCHAR(7), total_esperado NUMERIC(14,2), total_confirmado NUMERIC(14,2), divergencias JSONB, gerado_em TIMESTAMP DEFAULT now());
```
- Job de conciliação diário cruza `recibos.referencia_banco_externo` com os eventos do Banco Externo já usado na matrícula. **Divergências nunca são resolvidas automaticamente** — ficam para revisão humana.
- Nível de assinatura por defeito: **avançada**.
- Endpoints: `POST /financeiro/facturas`, `POST /financeiro/facturas/{id}/recibo`, `GET /financeiro/conciliacao/{periodo}`.

---

<a name="7"></a>
## 7. Módulo — RH

```sql
CREATE TABLE funcionarios (id SERIAL PRIMARY KEY, nome VARCHAR(150), numero_funcionario VARCHAR(20) UNIQUE, departamento VARCHAR(80), keycloak_user_id VARCHAR(64) UNIQUE);
CREATE TABLE contratos (id SERIAL PRIMARY KEY, funcionario_id INT REFERENCES funcionarios(id), tipo VARCHAR(40), data_inicio DATE, data_fim DATE, documento_s3_key TEXT, workflow_instance_id VARCHAR(64), status VARCHAR(20) DEFAULT 'RASCUNHO');
CREATE TABLE processos_individuais (id SERIAL PRIMARY KEY, funcionario_id INT REFERENCES funcionarios(id), tipo_evento VARCHAR(40), descricao TEXT, documento_s3_key TEXT, criado_em TIMESTAMP DEFAULT now());
CREATE TABLE log_acessos_rh (id SERIAL PRIMARY KEY, acedido_por INT NOT NULL, processo_id INT REFERENCES processos_individuais(id), acedido_em TIMESTAMP DEFAULT now(), ip VARCHAR(45));
```
- Fluxo BPMN simples: Departamento → Direcção → Assinatura (nível avançado).
- Toda a leitura de `processos_individuais` grava entrada em `log_acessos_rh` — obrigatório dado o carácter sensível dos dados.
- Papel `RH` isolado do papel `SECRETARIA`.
- Endpoints: `POST /rh/contratos`, `GET /rh/funcionarios/{id}/processo` (audita acesso), `POST /rh/processos/{id}/eventos`.

---

<a name="8"></a>
## 8. Módulo — Transporte/Frota

Cobre veículos institucionais, manutenção, peças, combustível **e** as rotas de transporte de estudantes (as carrinhas geridas aqui são para o transporte dos estudantes).

```sql
CREATE TABLE veiculos (id SERIAL PRIMARY KEY, matricula VARCHAR(20) UNIQUE, marca_modelo VARCHAR(100), ano INT, departamento_afecto VARCHAR(80), estado VARCHAR(20) DEFAULT 'ACTIVO');
CREATE TABLE requisicoes_viatura (id SERIAL PRIMARY KEY, veiculo_id INT REFERENCES veiculos(id), solicitante_id INT, motivo TEXT, data_saida TIMESTAMP, data_regresso_prevista TIMESTAMP, data_regresso_real TIMESTAMP, km_saida INT, km_regresso INT, status VARCHAR(20) DEFAULT 'PENDENTE');
CREATE TABLE pecas_inventario (id SERIAL PRIMARY KEY, nome VARCHAR(120), quantidade_stock INT DEFAULT 0, quantidade_minima INT DEFAULT 0, custo_unitario NUMERIC(10,2));
CREATE TABLE manutencoes (id SERIAL PRIMARY KEY, veiculo_id INT REFERENCES veiculos(id), tipo VARCHAR(30), descricao TEXT, pecas_usadas JSONB, custo_total NUMERIC(12,2), data_inicio DATE, data_fim DATE, documento_s3_key TEXT, status VARCHAR(20) DEFAULT 'AGENDADA');
CREATE TABLE abastecimentos (id SERIAL PRIMARY KEY, veiculo_id INT REFERENCES veiculos(id), litros NUMERIC(8,2), custo NUMERIC(10,2), km_no_abastecimento INT, motorista_id INT, abastecido_em TIMESTAMP DEFAULT now());

-- Rotas de transporte de estudantes
CREATE TABLE motoristas (id SERIAL PRIMARY KEY, nome VARCHAR(100) NOT NULL, contacto VARCHAR(20));
CREATE TABLE rotas (id SERIAL PRIMARY KEY, codigo VARCHAR(10) NOT NULL, nome VARCHAR(100) NOT NULL, turno VARCHAR(20) NOT NULL, UNIQUE(codigo, turno, nome));
CREATE TABLE rota_atribuicoes (id SERIAL PRIMARY KEY, rota_id INT REFERENCES rotas(id), motorista_id INT REFERENCES motoristas(id), veiculo_id INT REFERENCES veiculos(id));
```
- Registar `manutencao` com `pecas_usadas` decrementa `pecas_inventario.quantidade_stock`; abaixo de `quantidade_minima` dispara alerta.
- `requisicoes_viatura` segue workflow curto (Solicitante → Responsável de Transporte); sem assinatura formal.
- Código de rota não é único por si só — combinação `codigo+turno+nome` identifica a rota (ex.: rota "101" é Mapandane no turno das 6h e Nkobe no das 10h).
- 17 rotas / 16 motoristas / 16 viaturas reais já levantados e transformados em seed SQL (ver secção 17).
- Portal do aluno pode, mais adiante, expor vista de **consulta** de rotas/horários (não gestão).
- Endpoints: `POST /transporte/veiculos`, `POST /transporte/requisicoes`, `PATCH /transporte/requisicoes/{id}/aprovar`, `POST /transporte/manutencoes`, `POST /transporte/abastecimentos`, `GET /transporte/pecas/alertas`.

---

<a name="9"></a>
## 9. Módulo — Serviços Gerais

Pessoal operacional (limpeza e afins) — trata da **operação do dia-a-dia**, distinto do RH (que trata do vínculo contratual).

```sql
CREATE TABLE equipas_servicos_gerais (id SERIAL PRIMARY KEY, nome VARCHAR(80), responsavel_id INT REFERENCES funcionarios(id));
CREATE TABLE escalas (id SERIAL PRIMARY KEY, equipa_id INT REFERENCES equipas_servicos_gerais(id), funcionario_id INT REFERENCES funcionarios(id), data DATE, turno VARCHAR(20));
CREATE TABLE ordens_servico (id SERIAL PRIMARY KEY, solicitante_id INT, tipo VARCHAR(40), local VARCHAR(120), descricao TEXT, equipa_id INT REFERENCES equipas_servicos_gerais(id), status VARCHAR(20) DEFAULT 'ABERTA', criado_em TIMESTAMP DEFAULT now(), concluido_em TIMESTAMP);
```
- **Não** usa o Camunda — volume não justifica; usa apenas o chatter automático do núcleo (secção 11) para cumprir a "Documentação Total".
- Endpoints: `POST /servicos-gerais/ordens`, `PATCH /servicos-gerais/ordens/{id}/atribuir`, `PATCH /servicos-gerais/ordens/{id}/concluir`, `GET /servicos-gerais/escalas?data=`.

---

<a name="10"></a>
## 10. Módulo — Biblioteca e Arquivo

Único módulo cujo problema central é **digitalizar o que já existe**, não só parar de gerar papel novo.

```sql
CREATE TABLE acervo (
  id SERIAL PRIMARY KEY, titulo VARCHAR(250), tipo VARCHAR(30), origem_fisica VARCHAR(100),
  documento_s3_key TEXT, texto_ocr TSVECTOR, qualidade_ocr NUMERIC(5,2), digitalizado_em TIMESTAMP
);
CREATE INDEX idx_acervo_ocr ON acervo USING GIN (texto_ocr);
```
- Pipeline: scanner → S3 → fila OCR (Papermerge) → indexação full-text.
- Priorizar por valor de uso, não ordem cronológica.
- Controlo de qualidade por amostragem, meta ≥95% de precisão OCR.
- Endpoints: `POST /biblioteca/acervo/upload`, `GET /biblioteca/pesquisa?q=`, `GET /biblioteca/acervo/{id}`.

---

<a name="11"></a>
## 11. Princípio Transversal — Documentação Total

A motivação de reduzir papel só se cumpre se **nenhuma acção em nenhum módulo acontecer sem rasto digital**. Três níveis, para não exigir o mesmo peso em todo o lado:

| Nível | Exige | Exemplos |
|---|---|---|
| Documento com valor jurídico | PDF + assinatura electrónica no nível correcto + arquivo no EDMS | Certificados, contratos, diplomas, facturas |
| Registo transaccional auditável | Entrada na tabela do módulo + chatter automático (quem/quando/quê), sem PDF nem assinatura | Requisição de viatura, ordem de serviço, escala |
| Evento de sistema | Log técnico (observabilidade da infraestrutura) | Login, alteração de permissão, erro de sincronização |

Isto é o que permite a módulos "leves" (Transporte, Serviços Gerais) não usarem Camunda nem assinatura formal e, ainda assim, cumprirem o princípio geral — porque herdam o chatter do núcleo partilhado (secção 3).

---

<a name="12"></a>
## 12. Equipa Proposta

| Papel | Dedicação | Foco |
|---|---|---|
| Tech lead / arquitecto | Full-time | Coerência entre módulos e núcleo partilhado |
| Backend (Spring Boot/Node) | 1-2 pessoas full-time | Serviços por módulo |
| Frontend (React) | 1 pessoa full-time | App Launcher + telas por módulo |
| DevOps/Infra | Part-time (pico na Fase 0) | Terraform, CI/CD, observabilidade |
| Ponto focal por departamento | Part-time na respectiva fase | Validação de fluxos reais, gestão de mudança |

---

<a name="13"></a>
## 13. Cronograma Consolidado

| Semana | Entregável |
|---|---|
| 1-2 | Terraform (VPC, RDS, Redis, S3) — ambiente `dev` |
| 3-4 | Keycloak em produção; migração da autenticação da matrícula |
| 5-6 | EDMS + Camunda standalone |
| 7-10 | Académico: fluxos Secretaria de Faculdade → Central → Registo → Chancelaria; catálogo de faculdades/cursos carregado |
| 11-12 | Portal de auto-atendimento académico |
| 13-16 | Financeiro |
| 17-20 | RH |
| 21-23 | Transporte/Frota (incl. rotas de estudantes) |
| 24-25 | Serviços Gerais |
| 26-29 | Biblioteca/Arquivo (digitalização + OCR) |
| 30-33 | Consolidação: formação, métricas de adopção, descontinuação faseada do papel |

---

<a name="14"></a>
## 14. Testes e Critérios de Aceitação

| Tipo | Foco |
|---|---|
| Unitários | Motor de regras académico, job de conciliação financeira, cálculo de rate limit |
| Integração | Fluxo completo por módulo: submissão → workflow (quando aplicável) → assinatura (quando aplicável) → arquivo |
| Carga | 400 utilizadores concorrentes simulados no dia de abertura de matrículas |
| Segurança | Token de ALUNO nunca alcança endpoints de RH; teste de intrusão básico ao WAF/rate limit |
| Qualidade OCR | Amostragem por lote, ≥95% de precisão |

**Critério final de aceitação da plataforma** — cumprido quando, para os seis módulos:
- o fluxo funciona ponta-a-ponta sem intervenção manual em papel;
- cada acção está documentada no nível correcto (secção 11);
- existe pelo menos um relatório/dashboard usável sem apoio técnico;
- o período de coexistência com o papel decorreu sem incidente crítico;
- o responsável de mudança do departamento confirma a adopção;
- teste de carga com 400 utilizadores simulados sem degradação;
- teste de segurança simulado (acesso cruzado entre papéis) bloqueado e auditado.

---

<a name="15"></a>
## 15. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Conectividade/energia instável fora dos grandes centros | Submissão com cache local e sincronização posterior nos pontos mais expostos |
| Resistência cultural do staff | Gestão de mudança dedicada, período de coexistência de 2-4 semanas por fase |
| Facturação electrónica não confirmada | Confirmar junto da Autoridade Tributária antes de fechar o módulo Financeiro |
| Futura Lei de Protecção de Dados Pessoais | Desenhar controlo de acesso e retenção já alinhado ao espírito da LTE |
| Banco Externo indisponível no login | Circuit breaker + fallback conservador (nunca liberar por omissão) |
| Estado de checkboxes divergente cliente/servidor (matrícula) | Revalidação total no endpoint de submissão |
| Inconsistências nos dados de origem (ex.: rotas de transporte) | Validação humana por amostragem antes de gravar em definitivo |

---

<a name="16"></a>
## 16. Glossário Rápido

- **LTE** — Lei das Transacções Electrónicas (Lei 3/2017).
- **INTIC** — Instituto Nacional de Tecnologias de Informação e Comunicação, Autoridade Certificadora Raiz.
- **EDMS** — Electronic Document Management System (repositório documental).
- **BPM/BPMN** — motor/ notação de modelação de fluxos de aprovação (Camunda).
- **PPL** — Próximo Passo Lógico (regra de sequência de semestres na matrícula).
- **Chatter** — histórico automático de actividade por registo, herdado do núcleo partilhado.

---

<a name="17"></a>
## 17. Anexos e Documentos Complementares

| Documento | Conteúdo |
|---|---|
| `plano-implementacao-sistema-matricula.md` | Primeira versão detalhada do motor de matrícula (arquitectura em camadas, testes) |
| `arquitetura-fluxo-dados-matricula.html` | Diagramas visuais: fluxo de dados completo, sequências de login/submissão, ER |
| `investigacao-solucao-paperless.md` | Levantamento legal e tecnológico prévio à proposta |
| `proposta-paperless-unitiva.docx` | Proposta formal institucional (para apresentação à direcção) |
| `plano-execucao-tecnico-paperless.md` | Plano de execução técnico por fase, migração de dados, DoD |
| `infraestrutura-seguranca-plataforma.html` | Diagramas de infraestrutura, Redis, rate limiting, segurança |
| `plano-implementacao-completo-plataforma.md` | Versão anterior deste documento mestre (v2, antes da consolidação final) |
| `seed-rotas-transporte.sql` | Dados reais de rotas/motoristas/viaturas do transporte de estudantes |

Este documento mestre substitui a necessidade de consultar os anteriores para uma visão geral — os anexos ficam como detalhe de apoio ou para apresentação (caso do .docx e dos .html).
