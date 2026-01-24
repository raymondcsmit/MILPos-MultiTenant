import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-error-msg',
  standalone: true,
  imports: [RouterModule, TranslateModule],
  templateUrl: './error-msg.component.html',
  styleUrl: './error-msg.component.scss'
})
export class ErrorMsgComponent implements OnInit, OnDestroy {
  errorCode: string = '';
  route: ActivatedRoute = inject(ActivatedRoute);
  productionUrl: string = '';
  sub: Subscription = new Subscription();

  ngOnInit(): void {
    this.sub = this.route.queryParams.subscribe((params) => {
      if (params['errorCode']) {
        this.errorCode = params['errorCode'];
        this.productionUrl = params['production_url'] || '';
      }
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
