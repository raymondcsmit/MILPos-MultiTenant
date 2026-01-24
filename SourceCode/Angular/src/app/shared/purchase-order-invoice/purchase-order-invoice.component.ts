import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CompanyProfile } from '@core/domain-classes/company-profile';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderItem } from '@core/domain-classes/purchase-order-item';
import { SecurityService } from '@core/security/security.service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { TranslateModule } from '@ngx-translate/core';
import { CustomCurrencyPipe } from '../pipes/custome-currency.pipe';
import { PaymentStatusPipe } from '../pipes/payment-status.pipe';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';

@Component({
  selector: 'app-purchase-order-invoice',
  templateUrl: './purchase-order-invoice.component.html',
  styleUrls: ['./purchase-order-invoice.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    CustomCurrencyPipe,
    PaymentStatusPipe,
    UTCToLocalTime
  ]
})
export class PurchaseOrderInvoiceComponent implements OnInit, OnChanges {
  @Input() purchaseOrder!: PurchaseOrder | null;
  @Input() sendEmail!: boolean;
  @Output() emailBlob: EventEmitter<string> = new EventEmitter<string>();
  isquatation: boolean = false;
  purchaseOrderForInvoice!: PurchaseOrder;
  companyProfile!: CompanyProfile | null;
  purchaseOrderItems!: PurchaseOrderItem[];
  purchaseOrderReturnsItems!: PurchaseOrderItem[];
  isVisible = false;
  constructor(private securityService: SecurityService) { }

  ngOnInit(): void {
    this.subScribeCompanyProfile();

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['purchaseOrder']) {
      if (this.purchaseOrder) {
        this.isquatation = this.purchaseOrder.isPurchaseOrderRequest;
        this.purchaseOrder.totalQuantity = this.purchaseOrder.purchaseOrderItems.map(item => item.status == 0 ? item.quantity : (-1) * item.quantity).reduce((prev, next) => prev + next);
        this.purchaseOrderItems = this.purchaseOrder.purchaseOrderItems.filter(c => c.status == 0);
        this.purchaseOrderReturnsItems = this.purchaseOrder.purchaseOrderItems.filter(c => c.status == 1);
        this.purchaseOrderForInvoice = this.purchaseOrder;
        this.purchaseOrder = null;
      }
    }
    if (changes['sendEmail']?.currentValue) {
      this.isVisible = true;
      setTimeout(() => {
        this.emailInvoice();
      }, 1000);
    } else {
      setTimeout(() => {
        this.isVisible = true;
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
    let name = this.purchaseOrderForInvoice.orderNumber;
    let printContents, popupWin;
    printContents = document.getElementById('purchaseOrderInvoice')?.innerHTML;
    popupWin = window.open('', '_blank', 'top=0,left=0,height=100%,width=auto');
    if (popupWin) {
      popupWin.document.open();
      popupWin.document.write(`
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
            <script>
            function loadHandler(){

            var is_chrome = function () { return Boolean(window.chrome); }
        if(is_chrome)
        {
           window.print();
           setTimeout(function(){window.close();}, 1000);
           //give them 10 seconds to print, then close
        }
        else
        {
           window.print();
           window.close();
        }
        }
        </script>
          </head>
      <body onload="loadHandler()">${printContents}</body>
        </html>
    `
      );
      popupWin.document.close();
    }
  }

  emailInvoice() {
    let printContents = document.getElementById('purchaseOrderInvoice') as HTMLElement;
    if (!printContents) {
      console.error('Content not found!');
      this.isVisible = false;
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
