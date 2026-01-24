import { NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-brand-drawer',
  imports: [
    MatCardModule,
    MatIconModule,
    NgClass,
    TranslateModule
  ],
  templateUrl: './brand-drawer.html',
  styleUrl: './brand-drawer.scss'
})
export class BrandDrawer {
  @Input() isOpen = false;
  @Input() brands: any[] = [];
  @Input() selectedBrandId: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() select = new EventEmitter<string>();
  baseUrl = environment.apiUrl;

  constructor() { }

  onBrandSelected(brandId: string) {
    this.select.emit(brandId);
    this.close.emit();
  }
}
