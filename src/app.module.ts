import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { TrackedUser, DailyProgress } from './common/entities';
import { UserModule } from './user/user.module';
import { BotModule } from './bot/bot.module';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'data/bot.sqlite',
      entities: [TrackedUser, DailyProgress],
      synchronize: true,
      logging: false,
    }),

    ScheduleModule.forRoot(),

    UserModule,
    BotModule,
    SchedulerModule,
  ],
})
export class AppModule {}
