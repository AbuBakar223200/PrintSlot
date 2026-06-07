import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * ZodValidationPipe — validates request body against a Zod schema.
 *
 * Usage:
 * ```
 * @Body(new ZodValidationPipe(CreateOrderSchema)) dto: CreateOrderDto
 * ```
 *
 * Returns 400 with field-level error messages on validation failure.
 * Per coding standard: never use class-validator — Zod only.
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map(
          (err) => `${err.path.join('.')}: ${err.message}`,
        );
        throw new BadRequestException(messages.join('; '));
      }
      throw new BadRequestException('Validation failed');
    }
  }
}
