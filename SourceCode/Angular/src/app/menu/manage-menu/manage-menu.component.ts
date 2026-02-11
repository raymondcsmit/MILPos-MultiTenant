import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from '@core/services/toastr.service';
import { MenuService } from '@core/services/menu.service';
import { MenuItem } from '@core/domain-classes/menu-item';
import { BaseComponent } from '../../base.component';

@Component({
  selector: 'app-manage-menu',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule
  ],
  templateUrl: './manage-menu.component.html',
  styleUrls: ['./manage-menu.component.scss']
})
export class ManageMenuComponent extends BaseComponent implements OnInit {
  menuForm: FormGroup;
  isEditMode = false;
  menuId: string | null = null;
  parentMenuItems: MenuItem[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private menuService: MenuService,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {
    super();
    this.menuForm = this.fb.group({
      title: ['', Validators.required],
      path: [''],
      icon: [''],
      parentId: [null],
      order: [0],
      isActive: [true],
      isVisible: [true]
    });
  }

  ngOnInit(): void {
    this.getParents();
    this.sub$.sink = this.route.params.subscribe(params => {
      this.menuId = params['id'];
      if (this.menuId) {
        this.isEditMode = true;
        this.loadMenu(this.menuId);
      }
    });
  }

  getParents() {
    this.menuService.getMenuItems().subscribe(menus => {
      this.parentMenuItems = this.flattenMenus(menus).filter(m => m.id !== this.menuId);
    });
  }

  flattenMenus(menus: MenuItem[]): MenuItem[] {
    let flat: MenuItem[] = [];
    menus.forEach(menu => {
      flat.push(menu);
      if (menu.children && menu.children.length > 0) {
        flat = flat.concat(this.flattenMenus(menu.children));
      }
    });
    return flat;
  }

  loadMenu(id: string) {
    // Ideally get single menu item, but getAll works too for now or implement getById in service
    // Assuming getAll and find
    this.menuService.getMenuItems().subscribe(menus => {
        const flat = this.flattenMenus(menus);
        const menu = flat.find(m => m.id === id);
        if (menu) {
            this.menuForm.patchValue({
                title: menu.title,
                path: menu.path,
                icon: menu.icon,
                parentId: menu.parentId,
                order: menu.order,
                isActive: menu.isActive,
                isVisible: menu.isVisible
            });
            // If it has children, disable parentId change? Maybe validation logic
        }
    });
  }

  onSubmit() {
    if (this.menuForm.valid) {
      const menu: MenuItem = {
        id: this.menuId ? this.menuId : '',
        ...this.menuForm.value,
        children: [],
        canView: true, 
        canCreate: true,
        canEdit: true, 
        canDelete: true
      };

      if (this.isEditMode && this.menuId) {
        this.sub$.sink = this.menuService.updateMenuItem(this.menuId, menu).subscribe(() => {
          this.toastr.success(this.translate.instant('Menu Updated Successfully'));
          this.router.navigate(['/menus']);
          this.menuService.refreshUserMenu();
        }, () => {
            this.toastr.error('Failed to update menu');
        });
      } else {
        this.sub$.sink = this.menuService.addMenuItem(menu).subscribe(() => {
          this.toastr.success(this.translate.instant('Menu Created Successfully'));
          this.router.navigate(['/menus']);
          this.menuService.refreshUserMenu();
        }, () => {
             this.toastr.error('Failed to create menu');
        });
      }
    } else {
        this.menuForm.markAllAsTouched();
    }
  }
}
