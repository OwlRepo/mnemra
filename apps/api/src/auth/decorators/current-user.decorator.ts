import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export interface CurrentUserContext {
  userId: string
  email: string
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): CurrentUserContext => {
    const req = ctx.switchToHttp().getRequest()
    return req.user
  },
)
