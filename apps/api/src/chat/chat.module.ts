import { Module } from '@nestjs/common'
import { ChatService } from './chat.service'
import { ChatController } from './chat.controller'
import { AuthModule } from '../auth/auth.module'
import { CacheModule } from '../cache/cache.module'

@Module({
  imports: [AuthModule, CacheModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
