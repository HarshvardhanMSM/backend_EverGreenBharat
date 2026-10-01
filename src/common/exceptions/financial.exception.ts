import { HttpException, HttpStatus } from '@nestjs/common';
import { FinancialErrorCode } from '../enums/financial-error-code.enum';

export class FinancialException extends HttpException {
  constructor(
    public readonly errorCode: FinancialErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: Record<string, any>,
  ) {
    super(
      {
        success: false,
        statusCode: status,
        errorCode,
        message,
        details: details || null,
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }
}
