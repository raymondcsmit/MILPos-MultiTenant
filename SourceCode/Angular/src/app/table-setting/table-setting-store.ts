import { computed, inject } from '@angular/core';
import { CommonError } from '@core/error-handler/common-error';
import { TranslationService } from '@core/services/translation.service';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { ToastrService } from '@core/services/toastr.service';
import { distinctUntilChanged, pipe, switchMap, tap } from 'rxjs';
import { TableSetting } from '@core/domain-classes/table-setting';
import { TableSettingsService } from '@core/services/table-setting.service';
import { CustomerTableSettings } from '../customer/customer-table-settings';
import { SupplierTableSettings } from '../supplier/supplier-table-settings';
import { PurchaseOrderTableSettings } from '../purchase-order/purchase-order-table-settings';
import { SaleOrderTableSettings } from '../sales-order/sale-order-table-settings';
import { ProductTableSettings } from '../product/product-table-settings';
import { TransactionTableSettings } from '../accounting/transaction/transaction-table-settings';

type TableSettingsState = {
  customersTableSetting: TableSetting | null;
  suppliersTableSetting: TableSetting | null;
  purchaseOrdersTableSetting: TableSetting | null;
  transactionsTableSetting: TableSetting | null;
  saleOrdersTableSetting: TableSetting | null;
  productsTableSetting: TableSetting | null;
  isLoading: boolean;
  commonError: CommonError | null;
  isTableSettingAdded: boolean;
  screenName: string;
};

export const initialCustomerState: TableSettingsState = {
  customersTableSetting: null,
  suppliersTableSetting: null,
  purchaseOrdersTableSetting: null,
  transactionsTableSetting: null,
  saleOrdersTableSetting: null,
  productsTableSetting: null,
  isLoading: false,
  commonError: null,
  isTableSettingAdded: false,
  screenName: '',
};

export const TableSettingsStore = signalStore(
  { providedIn: 'root' },
  withState(initialCustomerState),
  withComputed(
    ({
      customersTableSetting,
      suppliersTableSetting,
      purchaseOrdersTableSetting,
      transactionsTableSetting,
      saleOrdersTableSetting,
      productsTableSetting,
    }) => ({
      customersTableSettingsVisible: computed(() => {
        const customersTableSettings = customersTableSetting();
        return customersTableSettings && customersTableSettings.settings?.length > 0
          ? customersTableSettings.settings.filter((c) => c.isVisible)
          : [...CustomerTableSettings];
      }),
      suppliersTableSettingsVisible: computed(() => {
        const suppliersTableSettings = suppliersTableSetting();
        return suppliersTableSettings && suppliersTableSettings.settings.length > 0
          ? suppliersTableSettings.settings.filter((c) => c.isVisible)
          : [...SupplierTableSettings];
      }),
      purchaseOrdersTableSettingsVisible: computed(() => {
        const purchaseOrderTableSettings = purchaseOrdersTableSetting();
        return purchaseOrderTableSettings && purchaseOrderTableSettings.settings.length > 0
          ? purchaseOrderTableSettings.settings.filter((c) => c.isVisible)
          : [...PurchaseOrderTableSettings];
      }),
      transactionsTableSettingsVisible: computed(() => {
        const transactionsTableSettings = transactionsTableSetting();
        return transactionsTableSettings && transactionsTableSettings.settings.length > 0
          ? transactionsTableSettings.settings.filter((c) => c.isVisible)
          : [...TransactionTableSettings];
      }),

      saleOrdersTableSettingsVisible: computed(() => {
        const saleOrdersTableSettings = saleOrdersTableSetting();
        return saleOrdersTableSettings && saleOrdersTableSettings.settings.length > 0
          ? saleOrdersTableSettings.settings.filter((c) => c.isVisible)
          : [...SaleOrderTableSettings];
      }),
      productsTableSettingsVisible: computed(() => {
        const productsTableSettings = productsTableSetting();
        return productsTableSettings && productsTableSettings.settings.length > 0
          ? productsTableSettings.settings.filter((c) => c.isVisible)
          : [...ProductTableSettings];
      }),
    })
  ),
  withMethods(
    (
      store,
      tableSettingsService = inject(TableSettingsService),
      toastrService = inject(ToastrService),
      translationService = inject(TranslationService)
    ) => ({
      loadTableSettingsByQuery: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { isLoading: true })),
          switchMap((screenName: string) => {
            return tableSettingsService.getTableSettings(screenName).pipe(
              tapResponse({
                next: (tableSettings: TableSetting) => {
                  if (tableSettings.screenName) {
                    if (tableSettings.screenName === 'Customers') {
                      const settings = tableSettings.settings.sort(
                        (a, b) => a.orderNumber - b.orderNumber
                      );
                      patchState(store, {
                        customersTableSetting: { ...tableSettings, settings: [...settings] },
                        isLoading: false,
                        commonError: null,
                        screenName: tableSettings.screenName,
                      });
                    } else if (tableSettings.screenName === 'Suppliers') {
                      const settings = tableSettings.settings.sort(
                        (a, b) => a.orderNumber - b.orderNumber
                      );
                      patchState(store, {
                        suppliersTableSetting: { ...tableSettings, settings: [...settings] },
                        isLoading: false,
                        commonError: null,
                        screenName: tableSettings.screenName,
                      });
                    } else if (tableSettings.screenName === 'PurchaseOrders') {
                      const settings = tableSettings.settings.sort(
                        (a, b) => a.orderNumber - b.orderNumber
                      );
                      patchState(store, {
                        purchaseOrdersTableSetting: { ...tableSettings, settings: [...settings] },
                        isLoading: false,
                        commonError: null,
                        screenName: tableSettings.screenName,
                      });
                    } else if (tableSettings.screenName === 'Transaction') {
                      const settings = tableSettings.settings.sort(
                        (a, b) => a.orderNumber - b.orderNumber
                      );
                      patchState(store, {
                        transactionsTableSetting: { ...tableSettings, settings: [...settings] },
                        isLoading: false,
                        commonError: null,
                        screenName: tableSettings.screenName,
                      });
                    } else if (tableSettings.screenName === 'SaleOrders') {
                      const settings = tableSettings.settings.sort(
                        (a, b) => a.orderNumber - b.orderNumber
                      );
                      patchState(store, {
                        saleOrdersTableSetting: { ...tableSettings, settings: [...settings] },
                        isLoading: false,
                        commonError: null,
                        screenName: tableSettings.screenName,
                      });
                    } else if (tableSettings.screenName === 'Products') {
                      const settings = tableSettings.settings.sort(
                        (a, b) => a.orderNumber - b.orderNumber
                      );
                      patchState(store, {
                        productsTableSetting: { ...tableSettings, settings: [...settings] },
                        isLoading: false,
                        commonError: null,
                        screenName: tableSettings.screenName,
                      });
                    }
                  } else {
                    if (screenName === 'Customers') {
                      const newTableSetting: TableSetting = {
                        id: 0,
                        screenName: screenName,
                        settings: [...CustomerTableSettings],
                      };
                      patchState(store, {
                        customersTableSetting: { ...newTableSetting },
                        isLoading: false,
                        commonError: null,
                        screenName: screenName,
                      });
                    } else if (screenName === 'Suppliers') {
                      const newTableSetting: TableSetting = {
                        id: 0,
                        screenName: screenName,
                        settings: [...SupplierTableSettings],
                      };
                      patchState(store, {
                        suppliersTableSetting: { ...newTableSetting },
                        isLoading: false,
                        commonError: null,
                        screenName: screenName,
                      });
                    } else if (screenName === 'PurchaseOrders') {
                      const newTableSetting: TableSetting = {
                        id: 0,
                        screenName: screenName,
                        settings: [...PurchaseOrderTableSettings],
                      };
                      patchState(store, {
                        purchaseOrdersTableSetting: { ...newTableSetting },
                        isLoading: false,
                        commonError: null,
                        screenName: screenName,
                      });
                    } else if (screenName === 'Transaction') {
                      const newTableSetting: TableSetting = {
                        id: 0,
                        screenName: screenName,
                        settings: [...TransactionTableSettings],
                      };
                      patchState(store, {
                        transactionsTableSetting: { ...newTableSetting },
                        isLoading: false,
                        commonError: null,
                        screenName: screenName,
                      });
                    } else if (screenName === 'SaleOrders') {
                      const newTableSetting: TableSetting = {
                        id: 0,
                        screenName: screenName,
                        settings: [...SaleOrderTableSettings],
                      };
                      patchState(store, {
                        saleOrdersTableSetting: { ...newTableSetting },
                        isLoading: false,
                        commonError: null,
                        screenName: screenName,
                      });
                    } else if (screenName === 'Products') {
                      const newTableSetting: TableSetting = {
                        id: 0,
                        screenName: screenName,
                        settings: [...ProductTableSettings],
                      };
                      patchState(store, {
                        productsTableSetting: { ...newTableSetting },
                        isLoading: false,
                        commonError: null,
                        screenName: screenName,
                      });
                    }
                  }
                },
                error: (err: CommonError) => {
                  patchState(store, { commonError: err, isLoading: false });
                  console.error(err);
                },
              })
            );
          })
        )
      ),
      loadTableSettingByScreenName(screenName: string) {
        if (screenName == 'Customers' && store.customersTableSetting() == null) {
          this.loadTableSettingsByQuery(screenName);
        } else if (screenName == 'Suppliers' && store.suppliersTableSetting() == null) {
          this.loadTableSettingsByQuery(screenName);
        } else if (screenName == 'PurchaseOrders' && store.purchaseOrdersTableSetting() == null) {
          this.loadTableSettingsByQuery(screenName);
        } else if (screenName == 'Transaction' && store.transactionsTableSetting() == null) {
          this.loadTableSettingsByQuery(screenName);
        } else if (screenName == 'SaleOrders' && store.saleOrdersTableSetting() == null) {
          this.loadTableSettingsByQuery(screenName);
        } else if (screenName == 'Products' && store.productsTableSetting() == null) {
          this.loadTableSettingsByQuery(screenName);
        }
      },
      saveTableSettings: rxMethod<TableSetting>(
        pipe(
          distinctUntilChanged(),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((tableSetting: TableSetting) => {
            return tableSettingsService.saveTableSettings(tableSetting).pipe(
              tapResponse({
                next: (tableSettings: TableSetting) => {
                  toastrService.success(
                    translationService.getValue('TABLESETTINGS_SAVE_SUCCESSFULLY')
                  );
                  const settings = tableSettings.settings.sort(
                    (a, b) => a.orderNumber - b.orderNumber
                  );
                  if (tableSettings.screenName === 'Customers') {
                    patchState(store, {
                      customersTableSetting: { ...tableSettings, settings: [...settings] },
                      isLoading: false,
                      commonError: null,
                      isTableSettingAdded: true,
                      screenName: tableSettings.screenName,
                    });
                  } else if (tableSettings.screenName === 'Suppliers') {
                    patchState(store, {
                      suppliersTableSetting: { ...tableSettings, settings: [...settings] },
                      isLoading: false,
                      commonError: null,
                      isTableSettingAdded: true,
                      screenName: tableSettings.screenName,
                    });
                  } else if (tableSettings.screenName === 'PurchaseOrders') {
                    patchState(store, {
                      purchaseOrdersTableSetting: { ...tableSettings, settings: [...settings] },
                      isLoading: false,
                      commonError: null,
                      isTableSettingAdded: true,
                      screenName: tableSettings.screenName,
                    });
                  } else if (tableSettings.screenName === 'Transaction') {
                    patchState(store, {
                      transactionsTableSetting: { ...tableSettings, settings: [...settings] },
                      isLoading: false,
                      commonError: null,
                      isTableSettingAdded: true,
                      screenName: tableSettings.screenName,
                    });
                  } else if (tableSettings.screenName === 'SaleOrders') {
                    patchState(store, {
                      saleOrdersTableSetting: { ...tableSettings, settings: [...settings] },
                      isLoading: false,
                      commonError: null,
                      isTableSettingAdded: true,
                      screenName: tableSettings.screenName,
                    });
                  } else if (tableSettings.screenName === 'Products') {
                    patchState(store, {
                      productsTableSetting: { ...tableSettings, settings: [...settings] },
                      isLoading: false,
                      commonError: null,
                      isTableSettingAdded: true,
                      screenName: tableSettings.screenName,
                    });
                  }
                },
                error: (err: CommonError) => {
                  patchState(store, { commonError: err, isLoading: false });
                },
              })
            );
          })
        )
      ),
      updateTableSettingAdded() {
        patchState(store, { isTableSettingAdded: false });
      },
    })
  ),
  withHooks({})
);
