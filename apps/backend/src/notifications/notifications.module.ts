import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsEvents } from './notifications.events';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsEvents],
  exports: [NotificationsService],
})
export class NotificationsModule {}
