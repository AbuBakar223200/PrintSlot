import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ColorMode, PaperSize, type OrderPriceResult } from '@printslot/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { PreviewPriceDto } from './dto/preview-price.dto';

type NumberLike = number | string | { toString(): string };

interface PriceRates {
  colorRate: NumberLike;
  bwRate: NumberLike;
  a3Surcharge: NumberLike;
  duplexDiscount: NumberLike;
}

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
      throw new BadRequestException('Shop is not active');
    }

    return this.calculatePrice(dto.files, shop);
  }

  calculatePrice(
    files: PreviewPriceDto['files'],
    rates: PriceRates,
  ): OrderPriceResult {
    const colorRate = this.toNumber(rates.colorRate, 'colorRate');
    const bwRate = this.toNumber(rates.bwRate, 'bwRate');
    const a3Surcharge = this.toNumber(rates.a3Surcharge, 'a3Surcharge');
    const duplexDiscount = this.toNumber(
      rates.duplexDiscount,
      'duplexDiscount',
    );

    const pricedFiles = files.map((file) => {
      const resolvedPages = this.resolvePages(
        file.pageRange,
        file.detectedPages,
      );
      const printedPages = resolvedPages * file.copies;
      const rate = file.colorMode === ColorMode.COLOR ? colorRate : bwRate;
      const base = printedPages * rate;
      const surcharge =
        file.paperSize === PaperSize.A3 ? printedPages * a3Surcharge : 0;
      const body = file.duplex ? base * (1 - duplexDiscount) : base;
      const subtotalPrice = this.roundCurrency(body + surcharge);

      return {
        resolvedPages,
        subtotalPrice,
        colorPages: file.colorMode === ColorMode.COLOR ? printedPages : 0,
        bwPages: file.colorMode === ColorMode.BW ? printedPages : 0,
      };
    });

    return {
      files: pricedFiles,
      totalPrice: this.roundCurrency(
        pricedFiles.reduce((sum, file) => sum + file.subtotalPrice, 0),
      ),
      totalPages: pricedFiles.reduce(
        (sum, file) => sum + file.colorPages + file.bwPages,
        0,
      ),
      colorPages: pricedFiles.reduce((sum, file) => sum + file.colorPages, 0),
      bwPages: pricedFiles.reduce((sum, file) => sum + file.bwPages, 0),
    };
  }

  private resolvePages(pageRange: string | undefined, detectedPages: number) {
    if (!pageRange) {
      return detectedPages;
    }

    const pages = new Set<number>();

    for (const rawPart of pageRange.split(',')) {
      const part = rawPart.trim();
      if (!part) {
        throw new BadRequestException('Invalid page range');
      }

      if (part.includes('-')) {
        const bounds = part.split('-').map((value) => value.trim());
        if (bounds.length !== 2) {
          throw new BadRequestException('Invalid page range');
        }

        const start = this.parsePageNumber(bounds[0], detectedPages);
        const end = this.parsePageNumber(bounds[1], detectedPages);

        if (start > end) {
          throw new BadRequestException('Invalid page range');
        }

        for (let page = start; page <= end; page += 1) {
          pages.add(page);
        }
      } else {
        pages.add(this.parsePageNumber(part, detectedPages));
      }
    }

    if (pages.size === 0) {
      throw new BadRequestException('Invalid page range');
    }

    return pages.size;
  }

  private parsePageNumber(value: string, detectedPages: number) {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException('Invalid page range');
    }

    const page = Number(value);
    if (page < 1 || page > detectedPages) {
      throw new BadRequestException('Page range exceeds detected pages');
    }

    return page;
  }

  private toNumber(value: NumberLike, field: string) {
    const numericValue = Number(value.toString());
    if (!Number.isFinite(numericValue)) {
      throw new BadRequestException(`Invalid shop ${field}`);
    }

    return numericValue;
  }

  private roundCurrency(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
