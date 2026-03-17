# Qualis Explorer - Desafio Agora Sabemos

Este projeto atende aos requisitos do desafio técnico para a vaga de Desenvolvedor(a) na "Agora Sabemos", permitindo a importação massiva (Big Data) e exploração da base do QUALIS CAPES.

## Decisões Técnicas de Arquitetura

O grande desafio desta aplicação foi lidar com a ingestão da planilha `.csv` ou `.xlsx` da CAPES que ultrapassa 30.000 linhas.

1. **Fire-and-Forget & Storage Temporário (`upload.controller.ts`)**: No backend, para evitar bloqueio e *Timeout* no Frontend de arquivos pesados, o controller recebe a requisição salvando temporariamente no disco rígido e retorna imediatamente um `HTTP 202 Accepted`.
2. **Streaming Assíncrono (`csv-parser`)**: Utilizei `fs.createReadStream` conectada ao pacote `csv-parser` para processar as 30 mil linhas *sob demanda*. Usamos uma técnica de fatiamento onde os registros são empilhados na memória até um `BATCH_SIZE` de 500 linhas.
3. **Yield Event Loop**: Após processar e submeter 500 registros para o SQLite, introduzi um `setImmediate` `await new Promise(...)` para devolver oxigênio para a thread principal do NestJS, não travando o servidor para outros endpoints e requisições concorrentes.
4. **Transação Otimizada (`prisma.$transaction`)**: As inserções ocorrem em lote no SQLite. Usei os modificadores `connectOrCreate` e blouquei erros com `.catch(null)` simulando `skipDuplicates`, para garantir a resiliência caso os registros capes enviem linhas duplicadas ou o ISSN da revista/área já existam no banco.

## 🚀 Instruções de Setup Local

Siga os passos abaixo para executar a aplicação completa na sua máquina. Certifique-se de possuir o **Node.js v18 ou superior** instalado.

### 1. Clonar o Repositório
```bash
git clone https://github.com/willianfigueiredodev/explorer.git
cd explorer
```

### 2. Configurar o Backend (NestJS + Prisma + SQLite)
Abra um terminal e acesse a pasta do servidor:
```bash
cd server

# 1. Instale todas as dependências
npm install

# 2. Inicialize o banco de dados (SQLite) e rode as migrations
npx prisma migrate dev --name init

# 3. Inicie o servidor em modo de desenvolvimento
npm run start:dev
```
A API Backend começará a rodar em `http://localhost:3000`.

### 3. Configurar o Frontend (React + Vite)
Abra um **novo** terminal (mantenha o backend rodando) e vá para a pasta da interface web:
```bash
cd web

# 1. Instale todas as dependências do Frontend
npm install

# 2. Inicie o servidor Vite
npm run dev
```
A Interface Web estará disponível em `http://localhost:5173`.

---

## 🗄️ Acessando o Banco de Dados (Prisma Studio)
Durante o desenvolvimento ou verificação, você pode checar se a carga gigantesca de dados do CSV entrou corretamente no SQLite. Para isso, o Prisma fornece uma interface gráfica nativa:

No terminal da pasta `server`, digite:
```bash
npx prisma studio
```
O portal se abrirá no seu navegador em `http://localhost:5555`. Lá você pode visualizar, filtrar e apagar os dados nas tabelas `Area`, `Journal` e `Classification`.

---

## 💡 Como Testar a Aplicação?
1. Acesse o Frontend (`http://localhost:5173`).
2. Utilize a área de **Upload** para selecionar o arquivo original `.csv` ou `.xlsx` da Qualis Capes. Recomenda-se buscar a tabela "Eventos Qualis" ou "Periódicos" no site da Capes Sucupira.
3. Clique em **"Iniciar Ingestão Big Data"**.
4. O Backend aceitará o arquivo instantaneamente e o processará em *background* para não travar a aplicação (mesmo com bases de 40.000 linhas).
5. Selecione uma **Área de Avaliação** no seletor para que os dados surjam gradualmente no *Dashboard Glassmorphism*.

## 🛠️ Tecnologias Utilizadas
**Frontend:**
- React (Vite)
- TypeScript
- CSS Vanilla (Glassmorphism e Animações nativas)
- React Dropzone

**Backend:**
- NestJS (Node.js)
- TypeScript
- Prisma ORM
- SQLite (Banco Relacional em Arquivo)
- Streams (csv-parser) para manipulação de grandes arquivos assincronamente

---

## 👨‍💻 Desenvolvedor
Desenvolvido com dedicação por **Willian Figueiredo**.
[LinkedIn](https://www.linkedin.com/in/willianfigueiredodev/) • [GitHub](https://github.com/willianfigueiredodev)
