import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-category-drawer',
  imports: [
    MatCardModule,
    MatIconModule,
    NgClass,
    TranslateModule
  ],
  templateUrl: './category-drawer.html',
  styleUrl: './category-drawer.scss'
})
export class CategoryDrawer {
  @Input() isOpen = false;
  @Input() categories: any[] = [];
  @Input() selectedCategoryId: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() select = new EventEmitter<string>();

  constructor() { }

  onCategorySelected(categoryId: string) {
    this.select.emit(categoryId);
    this.close.emit();
  }
}
