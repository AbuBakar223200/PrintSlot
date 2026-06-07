import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ColorMode, PaperSize, type OrderPriceResult } from '@printslot/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { PreviewPriceDto } from './dto/preview-price.dto';
import { parsePageRange } from './utils/pageRange';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async previewPrice(dto: PreviewPriceDto): Promise<OrderPriceResult> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: dto.shopId },
      select: {
        status: true,
        colorRate: true,
        bwRate: true,
        a3Surcharge: true,
        duplexDiscount: true,
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.status !== 'ACTIVE') {
      throw new BadRequestException('Shop is not currently accepting orders.');
    }

    return this.calculatePrice(dto.files, shop);
  }

  calculatePrice(
    files: PreviewPriceDto['files'],
    rates: {
      colorRate: any;
      bwRate: any;
      a3Surcharge: any;
      duplexDiscount: any;
    },
  ): OrderPriceResult {
    const colorRate = new Prisma.Decimal(rates.colorRate.toString());
    const bwRate = new Prisma.Decimal(rates.bwRate.toString());
    const a3Surcharge = new Prisma.Decimal(rates.a3Surcharge.toString());
    const duplexDiscount = new Prisma.Decimal(rates.duplexDiscount.toString());

    const pricedFiles = files.map((file) => {
      if (file.detectedPages <= 0) {
        throw new BadRequestException('File has no pages');
      }

      // 1. Resolve pages using pageRange parser
      let resolvedPages: number;
      try {
        const pagesList = parsePageRange(file.pageRange, file.detectedPages);
        resolvedPages = file.pageRange ? pagesList.length : file.detectedPages;
      } catch (e: any) {
        throw new BadRequestException(e.message || 'Invalid page range');
      }

      if (resolvedPages <= 0) {
        throw new BadRequestException('File has no resolved pages');
      }

      const totalPrintedPages = resolvedPages * file.copies;

      // 2. Base rate lookup
      const rate = file.colorMode === ColorMode.COLOR ? colorRate : bwRate;

      // base = resolvedPages × copies × rate
      const base = rate.mul(totalPrintedPages);

      // surcharge = paperSize === 'A3' ? resolvedPages × copies × shop.a3Surcharge : 0
      const surcharge =
        file.paperSize === PaperSize.A3
          ? a3Surcharge.mul(totalPrintedPages)
          : new Prisma.Decimal(0);

      // body = duplex ? base × (1 − shop.duplexDiscount) : base
      const duplexMultiplier = new Prisma.Decimal(1).sub(duplexDiscount);
      const body = file.duplex ? base.mul(duplexMultiplier) : base;

      // subtotal = body + surcharge
      const subtotalDecimal = body.add(surcharge);
      const subtotalPrice = this.roundDecimal(subtotalDecimal);

      const isColor = file.colorMode === ColorMode.COLOR;
      return {
        resolvedPages,
        subtotalPrice,
        colorPages: isColor ? totalPrintedPages : 0,
        bwPages: !isColor ? totalPrintedPages : 0,
      };
    });

    const totalPrice = this.roundDecimal(
      pricedFiles.reduce(
        (sum, file) => sum.add(new Prisma.Decimal(file.subtotalPrice)),
        new Prisma.Decimal(0),
      ),
    );

    const totalPages = pricedFiles.reduce(
      (sum, file) => sum + file.colorPages + file.bwPages,
      0,
    );

    const colorPages = pricedFiles.reduce((sum, file) => sum + file.colorPages, 0);
    const bwPages = pricedFiles.reduce((sum, file) => sum + file.bwPages, 0);

    return {
      files: pricedFiles,
      totalPrice,
      totalPages,
      colorPages,
      bwPages,
    };
  }

  private roundDecimal(decimal: Prisma.Decimal): number {
    return Math.round(decimal.toNumber() * 100) / 100;
  }
}
