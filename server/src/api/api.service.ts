import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiService {
  constructor(private prisma: PrismaService) {}

  async getAreas() {
    return this.prisma.area.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getAllJournals(page: number, limit: number) {
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.prisma.journal.findMany({
        skip,
        take: limit,
        orderBy: { title: 'asc' }
      }),
      this.prisma.journal.count()
    ]);

    return { data, total, page, limit };
  }

  async getJournalsByArea(areaId: string, estrato: string | undefined, page: number, limit: number) {
    const skip = (page - 1) * limit;
    
    const where: any = { areaId };
    if (estrato) {
      where.estrato = estrato;
    }

    const [classifications, total] = await Promise.all([
      this.prisma.classification.findMany({
        where,
        include: {
          journal: true,
        },
        skip,
        take: limit,
        orderBy: {
            journal: { title: 'asc' }
        }
      }),
      this.prisma.classification.count({ where })
    ]);

    // Map to a flatter structure suitable for frontend tables
    const data = classifications.map(c => ({
      id: c.journal.id,
      issn: c.journal.issn,
      title: c.journal.title,
      estrato: c.estrato,
    }));

    return { data, total, page, limit };
  }

  async getDistribution(areaId: string) {
    const distribution = await this.prisma.classification.groupBy({
      by: ['estrato'],
      where: { areaId },
      _count: {
        _all: true,
      },
      orderBy: {
        estrato: 'asc',
      },
    });

    return distribution.map(d => ({
      estrato: d.estrato,
      count: d._count._all,
    }));
  }
}
