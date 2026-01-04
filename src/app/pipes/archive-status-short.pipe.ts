import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'archiveStatusShort',
  standalone: true,
  pure: false
})
export class ArchiveStatusShortPipe implements PipeTransform {
  constructor(private translate: TranslateService) {}

  transform(status: string): string {
    if (!status) return '';
    
    const lowercaseStatus = status.toLowerCase();
    const key = `archive_status_short.${lowercaseStatus}`;
    
    return this.translate.instant(key);
  }
}
