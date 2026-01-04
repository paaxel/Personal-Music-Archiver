import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit {
  visible: boolean = false;

  constructor(private cdr: ChangeDetectorRef) {
    
  }
  
  ngOnInit(): void {
    // Listen for about dialog event from Electron
    if (typeof window !== 'undefined' && window.electronMenuAPI?.onShowAbout) {
      window.electronMenuAPI.onShowAbout(() => {
        this.show();
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

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
