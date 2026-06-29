import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { WorkspaceMemberGuard } from '../auth/guards/workspace-member.guard'
import { KnowledgeBasesController } from './knowledge-bases.controller'
import { KnowledgeBasesService } from './knowledge-bases.service'

@Module({
  imports: [AuthModule],
  controllers: [KnowledgeBasesController],
  providers: [KnowledgeBasesService, JwtAuthGuard, WorkspaceMemberGuard, RolesGuard],
  exports: [KnowledgeBasesService],
})
export class KnowledgeBasesModule {}
