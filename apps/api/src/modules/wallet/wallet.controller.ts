import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role, type WalletTransaction, type WalletTransactionsResult } from '@printslot/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TopupWalletDto, TopupWalletSchema } from './dto/topup-wallet.dto';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @Roles(Role.CUSTOMER)
  async getBalance(@Req() req: any): Promise<{ balance: number }> {
    const balance = await this.walletService.getBalance(req.user.id);
    return { balance };
  }

  @Get('transactions')
  @Roles(Role.CUSTOMER)
  async getTransactions(
    @Req() req: any,
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
  ): Promise<WalletTransactionsResult> {
    const page = pageRaw ? Math.max(1, parseInt(pageRaw, 10)) : 1;
    const limit = limitRaw ? Math.max(1, parseInt(limitRaw, 10)) : 20;

    return this.walletService.getTransactions(req.user.id, page, limit);
  }

  @Post('topup')
  @Roles(Role.SHOP_OWNER, Role.PLATFORM_ADMIN)
  async topup(
    @Req() req: any,
    @Body(new ZodValidationPipe(TopupWalletSchema)) dto: TopupWalletDto,
  ): Promise<WalletTransaction> {
    return this.walletService.adminTopup(req.user.id, dto.userId, dto.amount);
  }

  @Post('topup/gateway')
  @Roles(Role.CUSTOMER)
  async gatewayTopup(): Promise<never> {
    throw new HttpException(
      'Payment gateway integration deferred to Phase 2.',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}
