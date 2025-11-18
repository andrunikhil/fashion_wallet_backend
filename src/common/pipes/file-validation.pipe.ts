import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import {
  FileUploadValidator,
  FileValidationOptions,
} from '../validators/file-upload.validator';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private readonly options: FileValidationOptions) {}

  async transform(value: Express.Multer.File, metadata: ArgumentMetadata) {
    await FileUploadValidator.validateFile(value, this.options);
    return value;
  }
}

@Injectable()
export class FilesValidationPipe implements PipeTransform {
  constructor(private readonly options: FileValidationOptions) {}

  async transform(value: Express.Multer.File[], metadata: ArgumentMetadata) {
    if (!Array.isArray(value)) {
      return value;
    }

    for (const file of value) {
      await FileUploadValidator.validateFile(file, this.options);
    }

    return value;
  }
}
