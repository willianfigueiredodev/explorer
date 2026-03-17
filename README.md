# Qualis Explorer - Desafio Agora Sabemos

Este projeto atende aos requisitos do desafio técnico para a vaga de Desenvolvedor(a) na "Agora Sabemos", permitindo a importação massiva (Big Data) e exploração da base do QUALIS CAPES.

## Decisões Técnicas de Arquitetura

O grande desafio desta aplicação foi lidar com a ingestão da planilha `.csv` ou `.xlsx` da CAPES que ultrapassa 30.000 linhas.

1. **Fire-and-Forget & Storage Temporário (`upload.controller.ts`)**: No backend, para evitar bloqueio e *Timeout* no Frontend de arquivos pesados, o controller recebe a requisição salvando temporariamente no disco rígido e retorna imediatamente um `HTTP 202 Accepted`.
2. **Streaming Assíncrono (`csv-parser`)**: Utilizei `fs.createReadStream` conectada ao pacote `csv-parser` para processar as 30 mil linhas *sob demanda*. Usamos uma técnica de fatiamento onde os registros são empilhados na memória até um `BATCH_SIZE` de 500 linhas.
3. **Yield Event Loop**: Após processar e submeter 500 registros para o SQLite, introduzi um `setImmediate` `await new Promise(...)` para devolver oxigênio para a thread principal do NestJS, não travando o servidor para outros endpoints e requisições concorrentes.
4. **Transação Otimizada (`prisma.$transaction`)**: As inserções ocorrem em lote no SQLite. Usei os modificadores `connectOrCreate` e blouquei erros com `.catch(null)` simulando `skipDuplicates`, para garantir a resiliência caso os registros capes enviem linhas duplicadas ou o ISSN da revista/área já existam no banco.

## Instruções de Setup (Local)

Para rodar a aplicação em seu ambiente local, certifique-se de possuir o Node.js v18 ou superior.

### 1. Iniciar o Servidor Backend (NestJS)
```bash
cd server
npm install
# Vai criar/sincronizar a base de dados SQLite limpa
npx prisma db push --force-reset
npm run start:dev
```
A API rodará em `http://localhost:3000`.

### 2. Iniciar o Frontend (React Vite)
Em um novo terminal:
```bash
cd web
npm install
npm run dev
```
O frontend estará acessível em `http://localhost:5173`. Em seguida acesse a UI e anexe a planilha da Capes.

## O que eu faria diferente com mais tempo?
- **Fila e Mensageria (Redis + RabbitMQ / BullMQ)**: Se houvesse acesso fácil a infraestutura containerizada, aplicaria um Job Worker externo. O App enviaria o arquivo pro S3/MinIO e o Worker pegaria para processamento assíncrono longe da Thread da UI.
- **Cache**: Implementaria caching no backend para acelaração de listagem nas consultas recorrentes como `/api/areas` e métricas.
- **Testes Unitários**: Criaria a base de Testes do NestJS cobrindo a resiliência do Upload.
- **Paginação Completa**: Incluiria no React uma tabela baseada em Prisma Pagination (cursor-based) com Next e Previous para carregar o milhão de revistas gradualmente na UI de forma mais leve.
