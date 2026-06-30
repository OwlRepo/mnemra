import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { Response } from 'express'
import { ChatService } from './chat.service'
import { CurrentUser, type CurrentUserContext } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { WorkspaceMemberGuard } from '../auth/guards/workspace-member.guard'
import { ChatDto } from './dto/chat.dto'

@Controller('workspaces/:workspaceId/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
  async chat(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: ChatDto,
    @Res() res: Response,
  ) {
    try {
      const { sessionId, sources, stream, cacheStatus, onComplete } = await this.chatService.answer(
        workspaceId,
        user.userId,
        dto.message,
        dto.sessionId,
      )

      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('X-Chat-Sources', encodeURIComponent(JSON.stringify(sources)))
      res.setHeader('X-Chat-Session-Id', sessionId)
      res.setHeader('X-Chat-Cache', cacheStatus)

      const chunks: string[] = []

      for await (const token of stream) {
        chunks.push(token)
        res.write(token)
      }

      res.end()
      await onComplete(chunks.join(''))
    } catch (error) {
      console.error('Chat route failed', error)
      res.write('Assistant could not generate response right now.')
      res.end()
    }
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
  listSessions(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.chatService.listSessions(workspaceId, user.userId)
  }

  @Get('sessions/:sessionId/messages')
  @UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
  getMessages(
    @Param('workspaceId') workspaceId: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.chatService.getMessages(workspaceId, user.userId, sessionId)
  }
}
