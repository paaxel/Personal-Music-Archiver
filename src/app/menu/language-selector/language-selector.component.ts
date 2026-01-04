import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { SetLanguageService } from '../../util/set-language.service';

interface Language {
  code: string;
  name: string;
  flag: string;
}

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './language-selector.component.html',
  styleUrls: ['./language-selector.component.scss']
})
export class LanguageSelectorComponent implements OnInit {
  visible: boolean = false;
  currentLanguage: string | null;

  languages: Language[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' }
  ];

  constructor(private languageService: SetLanguageService, private cdr: ChangeDetectorRef) {
    this.currentLanguage = this.languageService.getCurrentLang()
  }

  ngOnInit(): void {
    this.currentLanguage = this.languageService.getCurrentLang()

    // Listen for language selector event from Electron
    if (typeof window !== 'undefined' && (window as any).electronMenuAPI?.onShowLanguage) {
      (window as any).electronMenuAPI.onShowLanguage(() => {
        this.show()
        this.cdr.detectChanges()
      });
    }
  }

  show(): void {
    this.visible = true;
  }

  close(): void {
    this.visible = false;
  }

  selectLanguage(langCode: string): void {
    this.languageService.changeLanguage(langCode);
    this.currentLanguage = langCode;
    this.close();
  }

  getCurrentLanguageName(): string {
    const lang = this.languages.find(l => l.code === this.currentLanguage);
    return lang ? lang.name : 'English';
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
