import { Injectable, NgZone } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";

const SUPPORTED_LANGS: Set<string> = new Set(['it', 'en'])

@Injectable({
  providedIn: 'root'
})
export class SetLanguageService {
    
    constructor(private translate: TranslateService) {
        this.initializeSupportedLanguages();
    }

    private initializeSupportedLanguages(): void {
        this.translate.addLangs(Array.from(SUPPORTED_LANGS));
    }

    inizializeLanguage(): void {
        // Set available languages
        this.translate.addLangs(Array.from(SUPPORTED_LANGS));

        // Set default language
        this.translate.setFallbackLang('en');

        // Check if there's a saved language preference
        const savedLang = localStorage.getItem('preferredLanguage');
        if (savedLang && this.translate.getLangs().includes(savedLang)) {
            this.translate.use(savedLang);
        } else {
            // Use browser language if available, otherwise default to English
            const browserLang = this.translate.getBrowserLang();
            this.translate.use(browserLang && this.translate.getLangs().includes(browserLang) ? browserLang : 'en');
        }

    }

    getCurrentLang(): string | null {
      return this.translate.getCurrentLang();
    }

    changeLanguage(langCode: string): void {
        if (SUPPORTED_LANGS.has(langCode)) {
            this.translate.use(langCode);
            localStorage.setItem('preferredLanguage', langCode);
        }
    }
}