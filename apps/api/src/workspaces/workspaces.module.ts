import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { WorkspaceMemberGuard } from '../auth/guards/workspace-member.guard'
import { NotificationsModule } from '../notifications/notifications.module'
import { WorkspacesController } from './workspaces.controller'
import { WorkspacesService } from './workspaces.service'

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, JwtAuthGuard, WorkspaceMemberGuard, RolesGuard],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
