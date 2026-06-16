import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role, type User } from '@printslot/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssignStaffDto, AssignStaffSchema } from './dto/assign-staff.dto';
import { StaffService } from './staff.service';

@Controller('shops/:id/staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @Roles(Role.SHOP_OWNER)
  async assignStaff(
    @Param('id') shopId: string,
    @Body(new ZodValidationPipe(AssignStaffSchema)) dto: AssignStaffDto,
    @CurrentUser() user: { id: string },
  ): Promise<User> {
    return this.staffService.assignStaff(shopId, dto.email, user.id);
  }

  @Delete(':userId')
  @Roles(Role.SHOP_OWNER)
  async removeStaff(
    @Param('id') shopId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: { id: string },
  ): Promise<User> {
    return this.staffService.removeStaff(shopId, userId, user.id);
  }

  @Get()
  @Roles(Role.SHOP_OWNER)
  async listStaff(
    @Param('id') shopId: string,
    @CurrentUser() user: { id: string },
  ): Promise<User[]> {
    return this.staffService.listStaff(shopId, user.id);
  }
}
