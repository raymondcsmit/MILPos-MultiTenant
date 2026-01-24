import { Component, OnInit } from '@angular/core';
import { VariantService } from '../variants.service';
import { Variant } from '@core/domain-classes/variant';
import { MatDialog } from '@angular/material/dialog';
import { ManageVariantsComponent } from '../manage-variants/manage-variants.component';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { ToastrService } from '@core/services/toastr.service';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-variants-list',
  templateUrl: './variants-list.component.html',
  styleUrls: ['./variants-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    NgClass
  ]
})
export class VariantsListComponent extends BaseComponent implements OnInit {
  variants: Variant[] = [];
  displayedColumns: string[] = ['action', 'name', 'variantItems'];

  constructor(
    private dialog: MatDialog,
    private variantService: VariantService,
    private commonDialogService: CommonDialogService,
    private toastrService: ToastrService) {
    super();

  }

  ngOnInit(): void {
    this.getVariants();
  }

  getVariants(): void {
    this.sub$.sink = this.variantService.getVariants().subscribe((c) => {
      this.variants = c
    });
  }

  manageVariant(variant: Variant | null): void {
    let dialogRef = this.dialog.open(ManageVariantsComponent, {
      width: '350px',
      data: Object.assign({}, variant)
    });
    dialogRef.afterClosed().subscribe(data => {
      if (data) {
        this.getVariants();
      }
    })
  }


  deleteVariant(variant: Variant): void {
    const areU = this.translationService.getValue('ARE_YOU_SURE_YOU_WANT_TO_DELETE');
    this.sub$.sink = this.commonDialogService.deleteConformationDialog(`${areU} :: ${variant.name}`).subscribe(isTrue => {
      if (isTrue) {
        this.sub$.sink = this.variantService.deleteVariant(variant.id ?? '').subscribe(() => {
          this.toastrService.success(this.translationService.getValue('VARIANT_DELETED_SUCCESSFULLY'));
          this.getVariants();
        });
      }
    })
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.variants.indexOf(row);
  }
}
