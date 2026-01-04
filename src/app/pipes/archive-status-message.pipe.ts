import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'archiveStatusMessage',
  standalone: true,
  pure: false
})
export class ArchiveStatusMessagePipe implements PipeTransform {
  constructor(private translate: TranslateService) {}

  transform(status: string): string {
    if (!status) return '';
    
    const lowercaseStatus = status.toLowerCase();
    const key = `archive_status_message.${lowercaseStatus}`;
    
    return this.translate.instant(key);
  }
}
