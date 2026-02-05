import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [
    CommonModule, 
    MatButtonModule, 
    MatCardModule, 
    RouterModule,
    TranslateModule
  ],
  templateUrl: './subscription.component.html',
  styleUrls: ['./subscription.component.scss']
})
export class SubscriptionComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  payOnline(): void {
    // Open Stripe Payment Link in new tab
    window.open('https://buy.stripe.com/test_...', '_blank'); 
  }

  contactSales(): void {
    // Could just show info or open mailto
    window.location.href = "mailto:sales@milpos.com?subject=License Purchase";
  }

  goToActivation(): void {
    this.router.navigate(['/activate-license']);
  }
}
