import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PluginMetadata, DependencyCheck } from '../../../services/plugins.service';

@Component({
  selector: 'app-plugin-card',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './plugin-card.component.html',
  styleUrls: ['./plugin-card.component.scss']
})
export class PluginCardComponent {
  @Input() plugin!: PluginMetadata;
  @Input() isActive: boolean = false;
  @Input() dependencyStatus: DependencyCheck | null = null;

  @Output() activateClick = new EventEmitter<void>();
  @Output() deactivateClick = new EventEmitter<void>();
  @Output() deleteClick = new EventEmitter<void>();

  onActivate(): void {
    this.activateClick.emit();
  }

  onDeactivate(): void {
    this.deactivateClick.emit();
  }

  onDelete(): void {
    this.deleteClick.emit();
  }
}
