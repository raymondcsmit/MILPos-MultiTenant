import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location, NgClass } from '@angular/common';
import { CompanyProfile } from '@core/domain-classes/company-profile';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderItem } from '@core/domain-classes/purchase-order-item';
import { SecurityService } from '@core/security/security.service';
import { ClonerService } from '@core/services/clone.service';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '@environments/environment';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { ReactiveFormsModule } from '@angular/forms';
import { PurchaseOrderInvoiceComponent } from '@shared/purchase-order-invoice/purchase-order-invoice.component';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { PaymentStatusPipe } from '@shared/pipes/payment-status.pipe';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { PaymentMethodPipe } from '@shared/pipes/payment-method.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PaymentTypePipe } from '@shared/pipes/payment-type.pipe';

@Component({
  selector: 'app-purchase-order-detail',
  templateUrl: './purchase-order-detail.component.html',
  styleUrls: ['./purchase-order-detail.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    ReactiveFormsModule,
    PurchaseOrderInvoiceComponent,
    HasClaimDirective,
    UTCToLocalTime,
    PaymentStatusPipe,
    CustomCurrencyPipe,
    PaymentMethodPipe,
    MatCardModule,
    MatButtonModule,
    NgClass,
    MatIconModule,
    PaymentTypePipe
  ]
})
export class PurchaseOrderDetailComponent extends BaseComponent {
  quantitesErrormsg: string = '';
  errorMsg: string = '';
  companyProfile!: CompanyProfile | null;
  isquatation: boolean = false;
  purchaseOrder: PurchaseOrder | null = null;
  purchaseOrderItems: PurchaseOrderItem[] = [];
  purchaseOrderReturnsItems: PurchaseOrderItem[] = [];
  purchaseOrderForInvoice!: PurchaseOrder | null;
  isSendEmail = false;
  baseUrl = environment.apiUrl
  constructor(
    private routes: ActivatedRoute,
    private clonerService: ClonerService,
    private securityService: SecurityService,
    private location: Location,
    private dialog: MatDialog) {
    super();
    this.isSendEmail = false;

  }

  ngOnInit(): void {
    this.getPurchaseOrderById();
    this.subScribeCompanyProfile();
  }

  subScribeCompanyProfile() {
    this.securityService.companyProfile.subscribe(data => {
      this.companyProfile = data;
    });
  }

  getPurchaseOrderById() {
    const purchase = this.routes.snapshot.data['purchaseorder'];
    this.purchaseOrder = this.clonerService.deepClone<PurchaseOrder>(purchase);
    this.purchaseOrder.totalQuantity = this.purchaseOrder.purchaseOrderItems.map(item => item.status == 1 ? -1 * item.quantity : item.quantity).reduce((prev, next) => prev + next);
    this.purchaseOrderItems = this.purchaseOrder.purchaseOrderItems.filter(c => c.status == 0);
    this.purchaseOrderReturnsItems = this.purchaseOrder.purchaseOrderItems.filter(c => c.status == 1);
  }

  generateInvoice() {
    let poForInvoice = this.clonerService.deepClone<PurchaseOrder>(this.purchaseOrder);
    poForInvoice.purchaseOrderItems.map(c => {
      c.unitName = c.unitConversation?.name;
      return c;
    })
    this.purchaseOrderForInvoice = poForInvoice;
  }


  cancel() {
    this.location.back();
  }

  sendEmail() {
    this.isSendEmail = true;
    let poForInvoice = this.clonerService.deepClone<PurchaseOrder>(
      this.purchaseOrder
    );
    poForInvoice.purchaseOrderItems.map((c) => {
      c.unitName = c.unitConversation?.name;
      return c;
    });
    this.purchaseOrderForInvoice = poForInvoice;
  }

  onEmailBlob(event: string) {
    const dialogRef = this.dialog.open(SendEmailComponent, {
      data: Object.assign({}, { blob: event, name: `${this.purchaseOrderForInvoice ? this.purchaseOrderForInvoice.orderNumber : ''}.pdf`, contentType: 'application/pdf', subject: `${this.purchaseOrderForInvoice ? this.purchaseOrderForInvoice.orderNumber : ''}:: ${this.translationService.getValue('PURCHASE_ORDER')}` }),
      // direction: this.langDir,
      minWidth: '40vw',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.purchaseOrderForInvoice = null;
      this.isSendEmail = false;
    });
  }

}
