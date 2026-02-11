import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTreeFlatDataSource, MatTreeFlattener, MatTreeModule } from '@angular/material/tree';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MenuItem } from '@core/domain-classes/menu-item';
import { MenuService } from '@core/services/menu.service';
import { Router, RouterModule } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from '@core/services/toastr.service';
import { BaseComponent } from '../../base.component';

interface FlatNode {
  expandable: boolean;
  name: string;
  level: number;
  id: string;
  tenantId?: string;
  isGlobal: boolean;
  original: MenuItem;
}

@Component({
  selector: 'app-menu-list',
  standalone: true,
  imports: [
    CommonModule, 
    MatTreeModule, 
    MatIconModule, 
    MatButtonModule, 
    MatMenuModule,
    RouterModule,
    TranslateModule
  ],
  templateUrl: './menu-list.component.html',
  styleUrls: ['./menu-list.component.scss']
})
export class MenuListComponent extends BaseComponent implements OnInit {
  
  private _transformer = (node: MenuItem, level: number): FlatNode => {
    return {
      expandable: !!node.children && node.children.length > 0,
      name: node.title,
      level: level,
      id: node.id,
      tenantId: node.tenantId,
      isGlobal: !node.tenantId, // Assuming !tenantId means Global
      original: node
    };
  };

  treeControl = new FlatTreeControl<FlatNode>(
    node => node.level,
    node => node.expandable,
  );

  treeFlattener = new MatTreeFlattener<MenuItem, FlatNode>(
    this._transformer,
    node => node.level,
    node => node.expandable,
    node => node.children,
  );

  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

  constructor(
    private menuService: MenuService,
    private router: Router,
    private toastr: ToastrService
  ) {
    super();
  }

  ngOnInit(): void {
    this.loadMenus();
  }

  loadMenus() {
    this.sub$.sink = this.menuService.getMenuItems().subscribe((menus: MenuItem[]) => {
      this.dataSource.data = menus;
    });
  }

  hasChild = (_: number, node: FlatNode) => node.expandable;

  deleteMenu(node: FlatNode) {
    if (confirm('Are you sure you want to delete this menu item?')) {
        this.sub$.sink = this.menuService.deleteMenuItem(node.id).subscribe(() => {
            this.toastr.success('Menu deleted successfully');
            this.loadMenus();
            // Refresh user menu side bar
            this.menuService.refreshUserMenu();
        }, () => {
            this.toastr.error('Failed to delete menu');
        });
    }
  }

  manageMenu(id?: string) {
    if (id) {
        this.router.navigate(['/menus/manage', id]);
    } else {
        this.router.navigate(['/menus/manage']);
    }
  }
}
