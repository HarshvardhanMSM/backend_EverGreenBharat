import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Indicates failure state',
    example: false,
  })
  success: boolean = false;

  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number = 400;

  @ApiProperty({
    description: 'Error message description or validation errors array',
    example: 'Invalid input parameters',
  })
  message: string | string[] = 'Invalid input parameters';

  @ApiProperty({
    description: 'Error classification or HTTP error title',
    example: 'Bad Request',
  })
  error: string = 'Bad Request';

  @ApiProperty({
    description: 'ISO-8601 timestamp when error occurred',
    example: '2026-07-29T13:12:00.000Z',
  })
  timestamp: string = new Date().toISOString();

  @ApiProperty({
    description: 'Request URI path',
    example: '/api/resource',
  })
  path: string = '/api/resource';
}

export class BadRequestErrorDto extends ErrorResponseDto {
  @ApiProperty({ example: false })
  override success: boolean = false;

  @ApiProperty({ example: 400 })
  override statusCode: number = 400;

  @ApiProperty({
    example: [
      'email must be a valid email address',
      'password must be at least 8 characters long',
    ],
  })
  override message: string | string[] = ['email must be a valid email address'];

  @ApiProperty({ example: 'Bad Request' })
  override error: string = 'Bad Request';
}

export class UnauthorizedErrorDto extends ErrorResponseDto {
  @ApiProperty({ example: false })
  override success: boolean = false;

  @ApiProperty({ example: 401 })
  override statusCode: number = 401;

  @ApiProperty({ example: 'Unauthorized access or invalid bearer token' })
  override message: string = 'Unauthorized access or invalid bearer token';

  @ApiProperty({ example: 'Unauthorized' })
  override error: string = 'Unauthorized';
}

export class ForbiddenErrorDto extends ErrorResponseDto {
  @ApiProperty({ example: false })
  override success: boolean = false;

  @ApiProperty({ example: 403 })
  override statusCode: number = 403;

  @ApiProperty({ example: 'You do not have permission to perform this action' })
  override message: string =
    'You do not have permission to perform this action';

  @ApiProperty({ example: 'Forbidden' })
  override error: string = 'Forbidden';
}

export class NotFoundErrorDto extends ErrorResponseDto {
  @ApiProperty({ example: false })
  override success: boolean = false;

  @ApiProperty({ example: 404 })
  override statusCode: number = 404;

  @ApiProperty({ example: 'Requested resource was not found' })
  override message: string = 'Requested resource was not found';

  @ApiProperty({ example: 'Not Found' })
  override error: string = 'Not Found';
}

export class ConflictErrorDto extends ErrorResponseDto {
  @ApiProperty({ example: false })
  override success: boolean = false;

  @ApiProperty({ example: 409 })
  override statusCode: number = 409;

  @ApiProperty({
    example: 'Resource already exists or state conflict occurred',
  })
  override message: string =
    'Resource already exists or state conflict occurred';

  @ApiProperty({ example: 'Conflict' })
  override error: string = 'Conflict';
}

export class UnprocessableEntityErrorDto extends ErrorResponseDto {
  @ApiProperty({ example: false })
  override success: boolean = false;

  @ApiProperty({ example: 422 })
  override statusCode: number = 422;

  @ApiProperty({ example: 'Validation failed for semantic constraints' })
  override message: string = 'Validation failed for semantic constraints';

  @ApiProperty({ example: 'Unprocessable Entity' })
  override error: string = 'Unprocessable Entity';
}

export class InternalServerErrorDto extends ErrorResponseDto {
  @ApiProperty({ example: false })
  override success: boolean = false;

  @ApiProperty({ example: 500 })
  override statusCode: number = 500;

  @ApiProperty({ example: 'An internal server error occurred' })
  override message: string = 'An internal server error occurred';

  @ApiProperty({ example: 'Internal Server Error' })
  override error: string = 'Internal Server Error';
}
