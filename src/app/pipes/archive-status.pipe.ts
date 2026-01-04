import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'archiveStatus',
  standalone: true,
  pure: false
})
export class ArchiveStatusPipe implements PipeTransform {
  constructor(private translate: TranslateService) {}

  transform(status: string): string {
    if (!status) return '';
    
    const lowercaseStatus = status.toLowerCase();
    const key = `archive_status.${lowercaseStatus}`;
    
    return this.translate.instant(key);
  }
}
