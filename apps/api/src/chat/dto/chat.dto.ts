import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message!: string

  @IsOptional()
  @IsString()
  sessionId?: string
}
