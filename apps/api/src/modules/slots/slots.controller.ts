import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role, type Slot, type SlotTemplate } from '@printslot/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateSlotTemplateDto,
  CreateSlotTemplateSchema,
} from './dto/create-slot-template.dto';
import {
  UpdateSlotTemplateDto,
  UpdateSlotTemplateSchema,
} from './dto/update-slot-template.dto';
import {
  ShopSlotDateSchema,
  UpsertShopSlotDto,
  UpsertShopSlotSchema,
} from './dto/upsert-shop-slot.dto';
import { SlotsService } from './slots.service';

@Controller()
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Post('slots/templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PLATFORM_ADMIN)
  createTemplate(
    @Body(new ZodValidationPipe(CreateSlotTemplateSchema))
    dto: CreateSlotTemplateDto,
  ): Promise<SlotTemplate> {
    return this.slotsService.createTemplate(dto);
  }

  @Get('slots/templates')
  @UseGuards(JwtAuthGuard)
  listTemplates(): Promise<SlotTemplate[]> {
    return this.slotsService.listTemplates();
  }

  @Patch('slots/templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PLATFORM_ADMIN)
  updateTemplate(
    @Param('id') templateId: string,
    @Body(new ZodValidationPipe(UpdateSlotTemplateSchema))
    dto: UpdateSlotTemplateDto,
  ): Promise<SlotTemplate> {
    return this.slotsService.updateTemplate(templateId, dto);
  }

  @Delete('slots/templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PLATFORM_ADMIN)
  deleteTemplate(@Param('id') templateId: string): Promise<{ success: true }> {
    return this.slotsService.deleteTemplate(templateId);
  }

  @Post('shops/:id/slots')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SHOP_OWNER)
  upsertShopSlot(
    @Param('id') shopId: string,
    @Body(new ZodValidationPipe(UpsertShopSlotSchema)) dto: UpsertShopSlotDto,
    @CurrentUser() currentUser: { id: string; shopId?: string | null },
  ): Promise<Slot> {
    return this.slotsService.upsertShopSlot(shopId, dto, currentUser);
  }

  @Get('shops/:id/slots')
  @UseGuards(JwtAuthGuard)
  getOpenSlots(
    @Param('id') shopId: string,
    @Query('date', new ZodValidationPipe(ShopSlotDateSchema)) date: string,
  ): Promise<Slot[]> {
    return this.slotsService.getOpenSlots(shopId, date);
  }

  @Get('shops/:id/slots/active')
  getActiveSlot(@Param('id') shopId: string): Promise<Slot | null> {
    return this.slotsService.getActiveSlot(shopId);
  }
}
