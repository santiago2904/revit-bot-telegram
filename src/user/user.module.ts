import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackedUser, DailyProgress } from '../common/entities';
import { UserService } from './user.service';

@Module({
  imports: [TypeOrmModule.forFeature([TrackedUser, DailyProgress])],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
