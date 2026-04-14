import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CompanyProfile } from '@core/domain-classes/company-profile';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderItem } from '@core/domain-classes/sales-order-item';
import { SecurityService } from '@core/security/security.service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { PaymentStatusPipe } from '@shared/pipes/payment-status.pipe';

@Component({
  selector: 'app-sales-order-invoice',
  templateUrl: './sales-order-invoice.component.html',
  styleUrls: ['./sales-order-invoice.component.scss'],
  standalone: true,
  imports: [
    MatIconModule,
    MatDialogModule,
    MatButtonModule,
    TranslateModule,
    UTCToLocalTime,
    CustomCurrencyPipe,
    PaymentStatusPipe,
  ]
})
export class SalesOrderInvoiceComponent implements OnInit, OnChanges {
  @Input() salesOrder!: SalesOrder | null;
  @Input() sendEmail!: boolean;
  @Output() emailBlob: EventEmitter<string> = new EventEmitter<string>();
  isquatation: boolean = false;
  isVisible = false;
  salesOrderForInvoice!: SalesOrder | null;
  companyProfile!: CompanyProfile | null;
  salesOrderItems!: SalesOrderItem[];
  salesOrderReturnsItems!: SalesOrderItem[];

  constructor(private securityService: SecurityService) { }

  ngOnInit(): void {
    this.subScribeCompanyProfile();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['salesOrder']) {
      if (this.salesOrder) {
        this.isquatation = this.salesOrder.isSalesOrderRequest;
        this.salesOrder.totalQuantity = this.salesOrder.salesOrderItems.map(item => item.status == 0 ? item.quantity : (-1) * item.quantity).reduce((prev, next) => prev + next);
        this.salesOrderItems = this.salesOrder.salesOrderItems.filter(c => c.status == 0);
        this.salesOrderReturnsItems = this.salesOrder.salesOrderItems.filter(c => c.status == 1);
        this.salesOrderForInvoice = this.salesOrder;
        this.salesOrder = null;
      }
    }
    if (changes['sendEmail']?.currentValue) {
      this.isVisible = true;
      setTimeout(() => {
        this.emailInvoice();
      }, 1000);
    } else {
      this.isVisible = true;
      setTimeout(() => {
        this.printInvoice();
      }, 1000);
    }
  }

  subScribeCompanyProfile() {
    this.securityService.companyProfile.subscribe(data => {
      this.companyProfile = data;
    });
  }

  printInvoice() {
    this.isVisible = false;
    let name = this.salesOrderForInvoice?.orderNumber ?? '';
    let printContents = document.getElementById('salesOrderForInvoice')?.innerHTML;

    if (!printContents) {
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>${name}</title>
            <style>
            @page { size: auto;  margin: 0mm;  margin-top:60px; }

            @media print {
              * {
                font-family: "Hind-Vadodara", sans-serif;
                -webkit-print-color-adjust: exact;
              }
            }
            tr{
              border: 1px solid #000;
              border-spacing: 2px;
            }
            table {
              border-collapse: collapse;
            }
            th, td {
              padding: 5px;
            }
            </style>
          </head>
          <body>${printContents}</body>
        </html>
      `);
      doc.close();

      iframe.contentWindow?.focus();
      
      // Allow images to load
      setTimeout(() => {
        iframe.contentWindow?.print();
        // Remove iframe after print dialog closes (or a reasonable timeout)
        // Note: In many browsers print() blocks, but not always. 
        // We use a safe timeout or just leave it (it's hidden/empty)
        setTimeout(() => {
           document.body.removeChild(iframe);
        }, 1000);
      }, 500); 
    }
  }

  emailInvoice() {
    let printContents = document.getElementById('salesOrderForInvoice') as HTMLElement;
    if (!printContents) {
      this.isVisible = false;
      console.error('Content not found!');
      return;
    }

    html2canvas(printContents).then((canvas) => {
      this.isVisible = false;
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'PNG', 0, 20, imgWidth, imgHeight);

      // Get PDF as Blob
      // const pdfBlob = pdf.output('blob');
      const base64String = pdf.output('datauristring').split(',')[1]; // Extract Base64 portion
      this.emailBlob.emit(base64String);

    });
  }

}
