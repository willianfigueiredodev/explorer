import { Controller, Get, Query } from '@nestjs/common';
import { ApiService } from './api.service';

@Controller('api')
export class ApiController {
  constructor(private readonly apiService: ApiService) {}

  @Get('areas')
  getAreas() {
    return this.apiService.getAreas();
  }

  @Get('journals')
  getJournals(
    @Query('areaId') areaId: string,
    @Query('estrato') estrato?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    if (!areaId) {
      return this.apiService.getAllJournals(Number(page), Number(limit));
    }
    return this.apiService.getJournalsByArea(areaId, estrato, Number(page), Number(limit));
  }

  @Get('journals/distribution')
  getDistribution(@Query('areaId') areaId: string) {
    if (!areaId) return [];
    return this.apiService.getDistribution(areaId);
  }
}
