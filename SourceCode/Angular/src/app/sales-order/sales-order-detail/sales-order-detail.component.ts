import { HttpResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { Location, NgClass } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CompanyProfile } from '@core/domain-classes/company-profile';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderItem } from '@core/domain-classes/sales-order-item';
import { SecurityService } from '@core/security/security.service';
import { ClonerService } from '@core/services/clone.service';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '@environments/environment';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { PaymentMethodPipe } from '@shared/pipes/payment-method.pipe';
import { SalesOrderInvoiceComponent } from '@shared/sales-order-invoice/sales-order-invoice.component';
import { BaseComponent } from '../../base.component';
import { TranslateModule } from '@ngx-translate/core';
import { PaymentStatusPipe } from '@shared/pipes/payment-status.pipe';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { PaymentTypePipe } from '@shared/pipes/payment-type.pipe';

@Component({
  selector: 'app-sales-order-detail',
  templateUrl: './sales-order-detail.component.html',
  styleUrls: ['./sales-order-detail.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    HasClaimDirective,
    CustomCurrencyPipe,
    UTCToLocalTime,
    PaymentMethodPipe,
    SalesOrderInvoiceComponent,
    TranslateModule,
    PaymentStatusPipe,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    NgClass,
    PaymentTypePipe
  ]
})
export class SalesOrderDetailComponent extends BaseComponent {
  currentDate: Date = this.CurrentDate;
  quantitesErrormsg: string = '';
  errorMsg: string = '';
  companyProfile!: CompanyProfile | null;
  salesOrder: SalesOrder | null = null;
  salesOrderItems!: SalesOrderItem[];
  salesOrderReturnsItems: SalesOrderItem[] = [];
  salesOrderForInvoice!: SalesOrder | null;
  isSendEmail = false;
  baseUrl = environment.apiUrl;
  constructor(
    private routes: ActivatedRoute,
    private clonerService: ClonerService,
    private location: Location,
    private securityService: SecurityService,
    private dialog: MatDialog
  ) {
    super();
    this.isSendEmail = false;
  }

  ngOnInit(): void {
    this.getSalesOrderById();
    this.subScribeCompanyProfile();
  }

  subScribeCompanyProfile() {
    this.securityService.companyProfile.subscribe((data) => {
      this.companyProfile = data;
    });
  }

  getSalesOrderById() {
    let sales = this.routes.snapshot.data['salesorder'];
    this.salesOrder = this.clonerService.deepClone<SalesOrder>(sales);
    this.salesOrder.totalQuantity = this.salesOrder.salesOrderItems
      .map((item) =>
        item.status == 1 ? -1 * item.quantity : item.quantity
      )
      .reduce((prev, next) => prev + next);
    this.salesOrderItems = this.salesOrder.salesOrderItems.filter(
      (c) => c.status == 0
    );
    this.salesOrderReturnsItems = this.salesOrder.salesOrderItems.filter(
      (c) => c.status == 1
    );
  }

  generateInvoice() {
    let soForInvoice = this.clonerService.deepClone<SalesOrder>(
      this.salesOrder
    );
    soForInvoice.salesOrderItems.map((c) => {
      c.unitName = c.unitConversation?.name;
      return c;
    });
    this.salesOrderForInvoice = soForInvoice;
  };

  sendEmail() {
    this.isSendEmail = true;
    let soForInvoice = this.clonerService.deepClone<SalesOrder>(
      this.salesOrder
    );
    soForInvoice.salesOrderItems.map((c) => {
      c.unitName = c.unitConversation?.name;
      return c;
    });
    this.salesOrderForInvoice = soForInvoice;
  }

  onEmailBlob(event: string) {
    const dialogRef = this.dialog.open(SendEmailComponent, {
      data: Object.assign({}, { blob: event, name: `${this.salesOrderForInvoice?.orderNumber}.pdf`, contentType: 'application/pdf', subject: `${this.salesOrderForInvoice?.orderNumber}::${this.translationService.getValue('SALES_ORDER')}` }),
      minWidth: '40vw',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.salesOrderForInvoice = null;
      this.isSendEmail = false;
    });
  }

  // calulateTax() {
  //   const totalQuantity = this.purchaseOrder.totalQuantity;
  //   const unitPrice = this.purchaseOrder.pricePerUnit;
  //   const tax = this.purchaseOrder.tax;
  //   const totalAmountWithTax = totalQuantity * unitPrice;
  //   let totalAmount = 0;
  //   if (tax && tax !== 0) {
  //     totalAmount = totalAmountWithTax + (totalAmountWithTax * tax) / 100;
  //     totalAmount = parseFloat(totalAmount.toFixed(2));
  //   } else {
  //     if (totalAmountWithTax) {
  //       totalAmount = totalAmountWithTax;
  //     } else {
  //       totalAmount = 0;
  //     }
  //   }
  //   return totalAmount;
  // }

  // downloadAttachment(attachement: PurchaseOrderAttachment) {
  //   this.sub$.sink = this.purchaseOrderService.downloadAttachment(attachement.id)
  //     .subscribe(
  //       (event) => {
  //         if (event.type === HttpEventType.Response) {
  //           this.downloadFile(event, attachement.name);
  //         }
  //       },
  //       (error) => {
  //         this.toastrService.error(this.translationService.getValue('ERROR_WHILE_DOWNLOADING_DOCUMENT'));
  //       }
  //     );
  // }

  private downloadFile(data: HttpResponse<Blob>, name: string) {
    const downloadedFile = new Blob([data.body ?? ''], { type: data.body?.type });
    const a = document.createElement('a');
    a.setAttribute('style', 'display:none;');
    document.body.appendChild(a);
    a.download = name;
    a.href = URL.createObjectURL(downloadedFile);
    a.target = '_blank';
    a.click();
    document.body.removeChild(a);
  }

  cancel() {
    this.location.back();
  }
}
