import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'translateWithParams',
  standalone: true,
  pure: false
})
export class TranslateWithParamsPipe implements PipeTransform {
  constructor(private translate: TranslateService) {}

  transform(key: string, params?: string[]): string {
    if (!key) return '';
    
    // Get the translated string
    let translatedText = this.translate.instant(key);
    
    // If no params, return as is
    if (!params || params.length === 0) {
      return translatedText;
    }
    
    // Replace placeholders {0}, {1}, {2}, etc. with actual values
    params.forEach((param, index) => {
      const placeholder = `{${index}}`;
      translatedText = translatedText.replace(placeholder, param);
    });
    
    return translatedText;
  }
}
