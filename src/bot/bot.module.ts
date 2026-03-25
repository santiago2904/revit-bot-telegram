import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { UserModule } from '../user/user.module';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [UserModule, GeminiModule],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
