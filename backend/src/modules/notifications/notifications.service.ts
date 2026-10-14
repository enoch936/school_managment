import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { paginate } from '../../common/pagination/pagination.dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async listForUser(userId: string, page: number, pageSize: number) {
    const where = { userId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    return { id, read: true };
  }

  async create(input: {
    userId: string;
    type: string;
    title: string;
    body?: string;
    data?: Record<string, unknown>;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        channel: 'IN_APP',
        type: input.type,
        title: input.title,
        body: input.body,
        data: (input.data ?? {}) as object,
        sentAt: new Date(),
      },
    });
    this.gateway.emitToUser(input.userId, 'notification', notification);
    return notification;
  }
}
