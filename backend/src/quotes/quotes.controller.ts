import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthenticatedUser, QuotesService } from './quotes.service';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: Role;
  };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Roles(Role.PROVIDER, Role.ADMIN)
  @Get('clients')
  listClients() {
    return this.quotesService.listClients();
  }

  @Roles(Role.PROVIDER)
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateQuoteDto,
  ) {
    return this.quotesService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.quotesService.findAllForUser(req.user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.quotesService.findOne(id, req.user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateQuoteStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.quotesService.updateStatus(id, dto.status, req.user);
  }

  @Roles(Role.PROVIDER)
  @Delete(':id')
  removeDraft(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.quotesService.removeDraft(id, req.user.userId);
  }

  @Get(':id/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @Req() req: { user: AuthenticatedUser },
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, reference } = await this.quotesService.generatePdf(
      id,
      req.user,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${reference}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}