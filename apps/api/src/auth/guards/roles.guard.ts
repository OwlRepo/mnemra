import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import type { WorkspaceMemberContext } from './workspace-member.guard'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Array<'owner' | 'admin' | 'member'>>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const req = context.switchToHttp().getRequest()
    const workspaceMember: WorkspaceMemberContext | undefined = req.workspaceMember

    if (!workspaceMember || !requiredRoles.includes(workspaceMember.role)) {
      throw new ForbiddenException('Insufficient workspace role')
    }

    return true
  }
}
