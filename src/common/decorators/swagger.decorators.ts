import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiResponseDto, PaginatedResponseDto } from '../dto/api-response.dto';
import {
  BadRequestErrorDto,
  ForbiddenErrorDto,
  InternalServerErrorDto,
  NotFoundErrorDto,
  UnauthorizedErrorDto,
} from '../dto/error-response.dto';

interface StandardErrorOptions {
  isProtected?: boolean;
  includeNotFound?: boolean;
}

export const ApiCustomResponse = <TModel extends Type<any>>(
  model: TModel,
  status = 200,
  description = 'Operation successful',
) => {
  return applyDecorators(
    ApiExtraModels(ApiResponseDto, model),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              data: { $ref: getSchemaPath(model) },
            },
          },
        ],
      },
    }),
  );
};

export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
  description = 'Paginated list retrieved successfully',
) => {
  return applyDecorators(
    ApiExtraModels(PaginatedResponseDto, model),
    ApiResponse({
      status: 200,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
            },
          },
        ],
      },
    }),
  );
};

export const ApiFileUpload = (
  fieldName = 'file',
  description = 'File upload payload',
) => {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      description,
      schema: {
        type: 'object',
        properties: {
          [fieldName]: {
            type: 'string',
            format: 'binary',
          },
        },
        required: [fieldName],
      },
    }),
  );
};

export const ApiStandardErrorResponses = (
  options: StandardErrorOptions = {},
) => {
  const decorators: Array<
    ClassDecorator | MethodDecorator | PropertyDecorator
  > = [
    ApiBadRequestResponse({
      description: 'Bad Request - Validation or parameter error',
      type: BadRequestErrorDto,
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal Server Error',
      type: InternalServerErrorDto,
    }),
  ];

  if (options.isProtected) {
    decorators.push(
      ApiBearerAuth('JWT-auth'),
      ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing authentication token',
        type: UnauthorizedErrorDto,
      }),
      ApiForbiddenResponse({
        description: 'Forbidden - Insufficient permissions',
        type: ForbiddenErrorDto,
      }),
    );
  }

  if (options.includeNotFound) {
    decorators.push(
      ApiNotFoundResponse({
        description: 'Not Found - Resource does not exist',
        type: NotFoundErrorDto,
      }),
    );
  }

  return applyDecorators(...decorators);
};
