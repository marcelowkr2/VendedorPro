import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodError, ZodType } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        details: zodErrorToDetails(result.error),
      });
    }
    return result.data;
  }
}

export function zodErrorToDetails(err: ZodError) {
  return err.issues.map((i) => ({
    field: i.path.join('.'),
    message: i.message,
  }));
}