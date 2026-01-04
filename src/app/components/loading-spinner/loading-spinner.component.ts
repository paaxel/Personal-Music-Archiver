import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { LoaderService } from '../../services/loader.service';

/**
 * Global loading spinner component
 * Controlled via LoaderService observable
 */
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [],
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.scss']
})
export class LoadingSpinnerComponent implements AfterViewInit {
  @ViewChild("loaderModal", { static: true })
  loaderModal: ElementRef;

  constructor(private loaderService: LoaderService) {
  }

  ngAfterViewInit(): void {
    this.listenEvents();
  }

  private listenEvents(): void {
    this.loaderService.messages.subscribe(m => {
      if(m != null){
        if (m.show) {
          this.showModal();
        } else {
          this.hideModal();
        }
      }      
    });
  }

  showModal(): void {
    this.loaderModal.nativeElement.style.display = 'flex';
  }

  hideModal(): void {
    this.loaderModal.nativeElement.style.display = 'none';
  }
}
