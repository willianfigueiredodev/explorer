import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    @Post()
    @HttpCode(HttpStatus.ACCEPTED)
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (req, file, cb) => {
                const fs = require('fs');
                const path = './temp';
                if (!fs.existsSync(path)) {
                    fs.mkdirSync(path, { recursive: true });
                }
                cb(null, path);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
            },
        }),
    }))
    uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Nenhum arquivo foi enviado.');
        }

        const allowedMimeTypes = [
            'text/csv',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
        ];

        // Accept CSV by mimetype or extension
        if (!allowedMimeTypes.includes(file.mimetype) && !file.originalname.endsWith('.csv')) {
            throw new BadRequestException('Formato de arquivo inválido. Envie apenas .csv ou .xlsx');
        }

        // Fire-and-Forget: Start background process without blocking
        this.uploadService.processFileBackground(file.path).catch(error => {
            console.error('Erro no processamento em background:', error);
        });

        // Return HTTP 202 Accepted immediately
        return {
            success: true,
            message: 'Arquivo recebido com sucesso. O processamento foi iniciado no servidor.',
            status: 'processing'
        };
    }

    @Get('data')
    async getData(){
        return this.uploadService.getData();
    }
}