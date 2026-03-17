import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as csvParser from 'csv-parser';
import * as xlsx from 'xlsx';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private prisma: PrismaService) { }

  async processFileBackground(filePath: string) {
    this.logger.log(`Iniciando ingestão background do arquivo: ${filePath}`);

    try {
      if (filePath.toLowerCase().endsWith('.csv')) {
        await this.processCsvStream(filePath);
      } else if (filePath.match(/\.(xlsx|xls)$/i)) {
        await this.processXlsxChunked(filePath);
      } else {
        throw new BadRequestException('Formato de arquivo não suportado.');
      }
      this.logger.log(`Ingestão concluída com sucesso para: ${filePath}`);
    } catch (error) {
      this.logger.error(`Falha ao processar arquivo ${filePath}:`, error);
    } finally {
      // Clean up: Ensure temporary file is deleted from disk
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          this.logger.log(`Arquivo temporário limpo do disco: ${filePath}`);
        }
      } catch (err) {
        this.logger.warn(`Não foi possível apagar o arquivo temp ${filePath}`, err);
      }
    }
  }

  private processCsvStream(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let batch: any[] = [];
      let totalProcessed = 0;
      const BATCH_SIZE = 500;

      const parser = (csvParser as any).default || csvParser;
      const stream = fs.createReadStream(filePath)
        .pipe(parser({ separator: ';' }))
        .on('data', async (rawRow) => {
          // Flatten and normalize keys to avoid weird whitespace/BOM issues from government CSVs
          const row: Record<string, any> = {};
          for (const key of Object.keys(rawRow)) {
            row[key.trim()] = rawRow[key];
          }

          const issn = this.findColumn(row, ['issn']);
          const title = this.findColumn(row, ['título', 'titulo', 'periodico', 'tulo']);
          const areaName = this.findColumn(row, ['área de avaliação', 'área', 'rea']);
          const estrato = this.findColumn(row, ['estrato', 'qualis']);

          // Skip incomplete rows
          if (!issn || !title || !areaName || !estrato) {
            return;
          }

          batch.push({
            issn: String(issn).trim(),
            title: String(title).trim(),
            areaName: String(areaName).toUpperCase().trim(),
            estrato: String(estrato).toUpperCase().trim()
          });

          // Control memory pressure: pause read stream
          if (batch.length >= BATCH_SIZE) {
            stream.pause();

            await this.insertBatch(batch);
            totalProcessed += batch.length;
            this.logger.log(`Inseridos ${totalProcessed} registros...`);

            // Clear current batch
            batch = [];

            // Yield Event-Loop: relieve Node.js synchronous stack to avoid blocking
            await new Promise((res) => setImmediate(res));

            stream.resume();
          }
        })
        .on('end', async () => {
          // Flush remaining items smaller than BATCH_SIZE
          if (batch.length > 0) {
            await this.insertBatch(batch);
            totalProcessed += batch.length;
          }
          this.logger.log(`[Processamento em Lotes] Finalizado! Total de ${totalProcessed} revistas salvas.`);
          resolve();
        })
        .on('error', (error) => {
          this.logger.error('Erro de leitura na Stream CSV: ', error);
          reject(error);
        });
    });
  }

  private async processXlsxChunked(filePath: string): Promise<void> {
    this.logger.log(`Processando XLSX: ${filePath}`);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheetName], { defval: '' });

    let totalProcessed = 0;
    let batch: any[] = [];
    const BATCH_SIZE = 500;

    for (const rawRow of data) {
      // Flatten keys to normalize potential spaces
      const row: Record<string, any> = {};
      for (const key of Object.keys(rawRow)) {
        row[key.trim()] = rawRow[key];
      }

      const issn = this.findColumn(row, ['issn']);
      const title = this.findColumn(row, ['título', 'titulo', 'periodico', 'tulo']);
      const areaName = this.findColumn(row, ['área de avaliação', 'área', 'rea']);
      const estrato = this.findColumn(row, ['estrato', 'qualis']);

      if (!issn || !title || !areaName || !estrato) {
        continue;
      }

      batch.push({
        issn: String(issn).trim(),
        title: String(title).trim(),
        areaName: String(areaName).toUpperCase().trim(),
        estrato: String(estrato).toUpperCase().trim()
      });

      if (batch.length >= BATCH_SIZE) {
        await this.insertBatch(batch);
        totalProcessed += batch.length;
        this.logger.log(`[XLSX] Inseridos ${totalProcessed} registros...`);
        batch = [];
        
        // Yield Event Loop
        await new Promise((res) => setImmediate(res));
      }
    }

    if (batch.length > 0) {
      await this.insertBatch(batch);
      totalProcessed += batch.length;
    }
    this.logger.log(`[XLSX] Finalizado! Total de ${totalProcessed} revistas salvas.`);
  }

  private async insertBatch(batch: any[]) {
    // Optimize SQLite commits via prisma.$transaction() using connectOrCreate
    // Catch handles and ignores duplicate constraint violations seamlessly

    await this.prisma.$transaction(async (tx) => {
      for (const item of batch) {
        await tx.classification.create({
          data: {
            estrato: item.estrato,
            journal: {
              connectOrCreate: {
                where: { issn: item.issn },
                create: { issn: item.issn, title: item.title },
              },
            },
            area: {
              connectOrCreate: {
                where: { name: item.areaName },
                create: { name: item.areaName },
              },
            },
          },
        }).catch(() => {
          // Ignore duplicate records (if journal and area already have this classification)
          return null;
        });
      }
    });
  }


  private findColumn(row: Record<string, unknown>, possibleNames: string[]): string | null {
    for (const key of Object.keys(row)) {
      const lowerKey = key.toLowerCase();

      if (possibleNames.some(name => lowerKey.includes(name))) {
        return String(row[key]);
      }
    }
    return null;
  }

  async getData() {
    return this.prisma.classification.findMany({
      include: {
        journal: true,
        area: true,
      },
      take: 100,
    });
  }
}