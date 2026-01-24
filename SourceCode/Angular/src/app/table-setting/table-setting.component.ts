import { Component, inject, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { TableSettingJson } from '../core/domain-classes/table-setting-json';
import { TableSetting } from '../core/domain-classes/table-setting';
import { TranslationService } from '../core/services/translation.service';
import { ToastrService } from '@core/services/toastr.service';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TableSettingsStore } from './table-setting-store';
import { toObservable } from '@angular/core/rxjs-interop';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatCardModule } from "@angular/material/card";

@Component({
  selector: 'app-table-setting',
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    RouterModule,
    PageHelpTextComponent,
    TranslateModule,
    MatCardModule,
    MatButtonModule
],
  templateUrl: './table-setting.component.html',
  styleUrl: './table-setting.component.scss',
})
export class TableSettingComponent implements OnInit {
  tableSettingsForm!: FormGroup;
  tableSettingsStore = inject(TableSettingsStore);
  tableSetting!: TableSetting | null;
  fb = inject(FormBuilder);
  activatedRoute = inject(ActivatedRoute);
  router = inject(Router);
  translationService = inject(TranslationService);
  toastrService = inject(ToastrService);
  screenName = this.activatedRoute.snapshot.paramMap.get('screenName');
  typeOptions = [
    { key: 'text', value: this.translationService.getValue('TEXT') },
    { key: 'datetime', value: this.translationService.getValue('DATETIME') },
    { key: 'bool', value: this.translationService.getValue('BOOL') },
  ];
  constructor() {
    if (this.screenName?.toUpperCase() === 'CUSTOMERS') {
      this.tableSetting = this.tableSettingsStore.customersTableSetting();
    } else if (this.screenName?.toUpperCase() === 'SUPPLIERS') {
      this.tableSetting = this.tableSettingsStore.suppliersTableSetting();
    } else if (this.screenName?.toUpperCase() === 'PURCHASEORDERS') {
      this.tableSetting = this.tableSettingsStore.purchaseOrdersTableSetting();
    } else if (this.screenName?.toUpperCase() === 'TRANSACTION') {
      this.tableSetting = this.tableSettingsStore.transactionsTableSetting();
    } else if (this.screenName?.toUpperCase() === 'SALEORDERS') {
      this.tableSetting = this.tableSettingsStore.saleOrdersTableSetting();
    } else if (this.screenName?.toUpperCase() === 'PRODUCTS') {
      this.tableSetting = this.tableSettingsStore.productsTableSetting();
    }
    this.updateTableSettings();
  }

  get settingsArray(): FormArray {
    return <FormArray>this.tableSettingsForm.get('settingsArray');
  }

  ngOnInit(): void {
    this.createTableSettingsForm();
  }
  onSeetingsClose() {
    if (this.screenName?.toUpperCase() === 'CUSTOMERS') {
      this.router.navigate(['/customer']);
    } else if (this.screenName?.toUpperCase() === 'SUPPLIERS') {
      this.router.navigate(['/supplier']);
    } else if (this.screenName?.toUpperCase() === 'PURCHASEORDERS') {
      this.router.navigate(['/purchase-order/list']);
    } else if (this.screenName?.toUpperCase() === 'TRANSACTION') {
      this.router.navigate(['/accounting/transactions']);
    } else if (this.screenName?.toUpperCase() === 'SALEORDERS') {
      this.router.navigate(['/sales-order/list']);
    } else if (this.screenName?.toUpperCase() === 'PRODUCTS') {
      this.router.navigate(['/products']);
    }
  }
  createTableSettingsForm() {
    this.tableSettingsForm = new FormGroup({
      screenName: new FormControl({ value: this.screenName, disabled: true }, [
        Validators.required,
      ]),
      settingsArray: new FormArray([]),
    });
    if (this.tableSetting != null) {
      this.tableSetting.settings.forEach((tableSeting: TableSettingJson) => {
        this.addTableSetting(tableSeting);
      });
    }
  }

  updateTableSettings() {
    toObservable(this.tableSettingsStore.isTableSettingAdded).subscribe((flag) => {
      if (flag) {
        this.tableSettingsStore.updateTableSettingAdded();
        this.onSeetingsClose();
      }
    });
  }
  addTableSetting(tableSeting: TableSettingJson) {
    this.settingsArray.push(
      this.fb.group({
        key: [tableSeting.key],
        header: [tableSeting.header],
        width: [tableSeting.width, [Validators.required]],
        type: [tableSeting.type],
        isVisible: [tableSeting.isVisible],
        allowSort: [tableSeting.allowSort],
        orderNumber: [tableSeting.orderNumber, [Validators.required]],
      })
    );
  }
  buidlTableSetting() {
    const settings: TableSetting = {
      id: this.tableSetting?.id ?? 0,
      screenName: this.screenName ?? '',
      settings: this.settingsArray.value,
    };
    return settings;
  }
  saveTableSettings() {
    if (this.tableSettingsForm.valid) {
      const anyVisible = this.settingsArray.controls.some((control) => control.get('isVisible')?.value === true);
      if (!anyVisible) {
        this.toastrService.error(this.translationService.getValue('ATLEAST_ONE_COLUMN_SHOULD_BE_VISIBLE'));
        return;
      }

      this.tableSettingsStore.saveTableSettings(this.buidlTableSetting());
    } else {
      this.tableSettingsForm.markAllAsTouched();
    }
  }
}
