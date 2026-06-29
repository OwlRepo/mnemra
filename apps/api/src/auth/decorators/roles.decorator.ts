import { SetMetadata } from '@nestjs/common'

export const ROLES_KEY = 'roles'

export const Roles = (...roles: Array<'owner' | 'admin' | 'member'>) =>
  SetMetadata(ROLES_KEY, roles)
