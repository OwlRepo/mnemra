import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { RolesGuard } from './roles.guard'

function fakeContext(role?: 'owner' | 'admin' | 'member'): ExecutionContext {
  const req: any = {
    workspaceMember: role ? { workspaceId: 'ws-1', role } : undefined,
  }
  const handler = () => undefined
  const klass = class TestClass {}
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => handler,
    getClass: () => klass,
  } as unknown as ExecutionContext
}

describe('RolesGuard', () => {
  it('allows when the workspace role matches the required owner role', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['owner']),
    }
    const guard = new RolesGuard(reflector as any)

    expect(guard.canActivate(fakeContext('owner'))).toBe(true)
  })

  it('allows admin when owner or admin is required', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['owner', 'admin']),
    }
    const guard = new RolesGuard(reflector as any)

    expect(guard.canActivate(fakeContext('admin'))).toBe(true)
  })

  it('denies a member when owner or admin is required', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['owner', 'admin']),
    }
    const guard = new RolesGuard(reflector as any)

    expect(() => guard.canActivate(fakeContext('member'))).toThrow(ForbiddenException)
  })

  it('allows when no roles metadata exists', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    }
    const guard = new RolesGuard(reflector as any)

    expect(guard.canActivate(fakeContext())).toBe(true)
  })

  it('denies when workspace member context is absent but roles are required', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['owner']),
    }
    const guard = new RolesGuard(reflector as any)

    expect(() => guard.canActivate(fakeContext())).toThrow(ForbiddenException)
  })
})
