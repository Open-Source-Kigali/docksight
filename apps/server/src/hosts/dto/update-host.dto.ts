import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export const HOST_DISPLAY_NAME_MAX_LENGTH = 64;

export class UpdateHostDto {
  @ApiProperty({
    example: 'prod-web-1',
    minLength: 1,
    maxLength: HOST_DISPLAY_NAME_MAX_LENGTH,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Display name must not be empty' })
  @MaxLength(HOST_DISPLAY_NAME_MAX_LENGTH, {
    message: `Display name must be at most ${HOST_DISPLAY_NAME_MAX_LENGTH} characters`,
  })
  displayName!: string;
}
