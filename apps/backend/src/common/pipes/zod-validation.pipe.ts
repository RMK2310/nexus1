import { PipeTransform, ArgumentMetadata, BadRequestException } from "@nestjs/common";
import { Schema } from "zod";

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: Schema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    // Only validate request body
    if (metadata.type !== "body") {
      return value;
    }
    
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error: any) {
      throw new BadRequestException({
        statusCode: 400,
        message: "Input validation failed",
        errors: error.errors?.map((e: any) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
  }
}
