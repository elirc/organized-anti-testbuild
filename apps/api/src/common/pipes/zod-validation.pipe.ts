import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { Schema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: Schema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error: any) {
      const issues = error.errors?.map((err: any) => `${err.path.join('.')}: ${err.message}`) || [];
      throw new BadRequestException({
        message: 'Validation failed',
        error: 'BadRequest',
        issues,
      });
    }
  }
}
