import { Controller, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserSchema, UpdateUserDto } from './dto/update-user.dto';
import {
  RegisterDeviceSchema,
  RegisterDeviceDto,
} from './dto/register-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { User, UserDevice } from '@printslot/shared';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Body(new ZodValidationPipe(UpdateUserSchema)) dto: UpdateUserDto,
    @CurrentUser() user: User,
  ): Promise<User> {
    return this.usersService.updateProfile(dto, user.id);
  }

  @Patch('me/device')
  @UseGuards(JwtAuthGuard)
  async registerDevice(
    @Body(new ZodValidationPipe(RegisterDeviceSchema)) dto: RegisterDeviceDto,
    @CurrentUser() user: User,
  ): Promise<Pick<UserDevice, 'id' | 'deviceId' | 'updatedAt'>> {
    return this.usersService.registerDevice(dto, user.id);
  }

  @Delete('me/device/:deviceId')
  @UseGuards(JwtAuthGuard)
  async removeDevice(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: User,
  ): Promise<{ success: true }> {
    return this.usersService.removeDevice(deviceId, user.id);
  }
}
