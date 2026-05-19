import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  ListNotificationsSchema,
  type ListNotificationsDto,
} from './dto/list-notifications.dto';
import type { User } from '@prisma/client';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /notifications?page&limit&unreadOnly
   * Returns paginated notification list scoped to current user only.
   */
  @Get()
  list(
    @Query(new ZodValidationPipe(ListNotificationsSchema))
    query: ListNotificationsDto,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.listForUser(
      user.id,
      query.page,
      query.limit,
      query.unreadOnly,
    );
  }

  /**
   * PATCH /notifications/read-all
   * Marks all of current user's notifications as read.
   * Must be defined BEFORE /:id/read to avoid route conflict.
   */
  @Patch('read-all')
  markAllRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllRead(user.id);
  }

  /**
   * PATCH /notifications/:id/read
   * Marks one notification as read. 403 if not owned by current user.
   */
  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.markRead(id, user.id);
  }
}
