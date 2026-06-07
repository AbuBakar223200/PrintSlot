import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@printslot/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import {
  UpdateAppConfigDto,
  UpdateAppConfigSchema,
} from './dto/update-app-config.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PLATFORM_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('config')
  getConfig(): Promise<Record<string, string>> {
    return this.adminService.getConfig();
  }

  @Patch('config/:key')
  updateConfig(
    @Param('key') key: string,
    @Body(new ZodValidationPipe(UpdateAppConfigSchema)) dto: UpdateAppConfigDto,
  ): Promise<{ key: string; value: string }> {
    return this.adminService.updateConfig(key, dto.value);
  }

  @Get('analytics')
  getAnalytics() {
    return this.adminService.getPlatformAnalytics();
  }
}
