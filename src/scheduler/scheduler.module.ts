import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { BotModule } from '../bot/bot.module';
import { UserModule } from '../user/user.module';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [BotModule, UserModule, GeminiModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
