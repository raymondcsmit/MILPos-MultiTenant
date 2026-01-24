import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { BarcodeModel } from '@core/domain-classes/bar-code-generator';
import { TranslateModule } from '@ngx-translate/core';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import JsBarcode from 'jsbarcode';

@Component({
  selector: 'app-generate-barcode',
  imports: [
    CustomCurrencyPipe,
    TranslateModule,
    DatePipe
  ],
  providers: [CustomCurrencyPipe],
  templateUrl: './generate-barcode.component.html',
  styleUrls: ['./generate-barcode.component.scss']
})
export class GenerateBarcodeComponent implements OnInit {
  isLoading = false;
  @Input() barCodeData!: BarcodeModel | null;
  generateBarcode!: BarcodeModel | null;

  constructor() { }

  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['barCodeData']) {
      this.generateBarcode = this.barCodeData;
      this.barCodeData = null;

      if (this.generateBarcode && this.generateBarcode?.products?.length > 0) {
        for (let index = 0; index < this.generateBarcode.products.length; index++) {
          const element = this.generateBarcode.products[index];
          this.generateBarcode.products[index].noOfLabelsAarry = Array(element.noOfLabels).fill(0).map((x, i) => i);
        }
        this.isLoading = true;
        setTimeout(() => {
          this.printInvoice();
        }, 1000);
      }

    }
  }

  printInvoice() {
    this.isLoading = false;
    let name = 'Labels';
    let printContents, popupWin;
    if (this.generateBarcode) {
      for (let index = 0; index < this.generateBarcode.products.length; index++) {
        const element = this.generateBarcode.products[index];
        for (let noOfLabelsIndex = 0; noOfLabelsIndex < this.generateBarcode.products[index].noOfLabelsAarry.length; noOfLabelsIndex++) {
          const id = `#product-${element.productId}-${noOfLabelsIndex}`;
          JsBarcode(id, element.barCode, {
            height: 20,
            fontSize: 10
          });
        }
      }
    }

    printContents = document.getElementById('generateBarcode')?.innerHTML;
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

}



