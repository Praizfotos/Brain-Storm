import { SanitizerConstraint, SanitizerConstraintInterface } from 'class-sanitizer';
import * as sanitizeHtml from 'sanitize-html';

@SanitizerConstraint()
export class StripHtmlSanitizer implements SanitizerConstraintInterface {
  sanitize(value: any): any {
    if (typeof value !== 'string') {
      return value;
    }
    return sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
    });
  }
}
