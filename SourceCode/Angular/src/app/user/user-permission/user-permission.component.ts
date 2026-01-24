import { Component, OnInit } from '@angular/core';
import { Page } from '@core/domain-classes/page';
import { ActionService } from '@core/services/action.service';
import { PageService } from '@core/services/page.service';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from '@core/services/toastr.service';
import { User } from '@core/domain-classes/user';
import { UserService } from '../user.service';
import { UserPermissionPresentationComponent } from '../user-permission-presentation/user-permission-presentation.component';
import { BaseComponent } from '../../base.component';

@Component({
  selector: 'app-user-permission',
  templateUrl: './user-permission.component.html',
  styleUrls: ['./user-permission.component.scss'],
  standalone: true,
  imports: [
    UserPermissionPresentationComponent
  ]
})
export class UserPermissionComponent extends BaseComponent implements OnInit {
  pages!: Page[];
  user!: User;

  constructor(
    private activeRoute: ActivatedRoute,
    private router: Router,
    private toastrService: ToastrService,
    private pageService: PageService,
    private actionService: ActionService,
    private userService: UserService) {
    super();
  }

  ngOnInit(): void {
    this.sub$.sink = this.activeRoute.data.subscribe(
      (data: any) => {
        this.user = data.user;
      });

    const getActionRequest = this.actionService.getAll();
    const getPageRequest = this.pageService.getAll();
    forkJoin({ getActionRequest, getPageRequest }).subscribe(response => {
      this.pages = response.getPageRequest;
      this.pages = this.pages.map((p: any) => {
        const pageActions = response.getActionRequest.filter(c => c.pageId == p.id);
        const result = Object.assign({}, p, { pageActions: pageActions });
        return result;
      })
    })
  }

  manageUserClaimAction(user: User): void {
    this.sub$.sink = this.userService.updateUserClaim(user.userClaims ?? [], user.id ?? '').subscribe(() => {
      this.toastrService.success(this.translationService.getValue('USER_PERMISSION_UPDATED_SUCCESSFULLY'));
      this.router.navigate(['/users']);
    })
  }
}
