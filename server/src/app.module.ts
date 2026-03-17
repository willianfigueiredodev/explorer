import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UploadModule } from './upload/upload.module';
import { ApiModule } from './api/api.module';

@Module({
  imports: [PrismaModule, UploadModule, ApiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
