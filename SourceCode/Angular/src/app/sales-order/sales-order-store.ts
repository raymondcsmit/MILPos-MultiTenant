import { inject } from "@angular/core";
import { CommonError } from "@core/error-handler/common-error";
import { TranslationService } from "@core/services/translation.service";
import { tapResponse } from "@ngrx/operators";
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from "@ngrx/signals";
import { rxMethod } from "@ngrx/signals/rxjs-interop";
import { debounceTime, distinctUntilChanged, pipe, switchMap, tap } from "rxjs";
import { HttpResponse } from "@angular/common/http";
import { toObservable } from "@angular/core/rxjs-interop";
import { SalesOrder } from "@core/domain-classes/sales-order";
import { SalesOrderResourceParameter } from "@core/domain-classes/sales-order-resource-parameter";
import { SalesOrderStatusEnum } from "@core/domain-classes/sales-order-status";
import { SalesOrderService } from "./sales-order.service";
import { ResponseHeader } from "@core/domain-classes/response-header";
import { ToastrService } from "@core/services/toastr.service";

type SalesOrderState = {
  salesOrders: SalesOrder[];
  isLoading: boolean;
  loadList: boolean;
  salesOrderResourceParameter: SalesOrderResourceParameter;
  commonError: CommonError | null;
  isAddUpdate: boolean;
  isAllowPayment: boolean;
  currentItem: SalesOrder | null;
};

export const initialSalesOrderState: SalesOrderState = {
  salesOrders: [],
  isLoading: false,
  loadList: false,
  isAddUpdate: false,
  salesOrderResourceParameter: {
    orderNumber: '',
    customerName: '',
    soCreatedDate: null,
    customerId: '',
    isSalesOrderRequest: false,
    fromDate: null,
    toDate: null,
    productId: '',
    productName: '',
    status: SalesOrderStatusEnum.All,
    locationId: '',
    pageSize: 30,
    orderBy: 'soCreatedDate asc',
    fields: '',
    searchQuery: '',
    skip: 0,
    totalCount: 0,
    name: '',
    paymentStatus: null,
    deliveryStatus: null
  },
  commonError: null,
  isAllowPayment: false,
  currentItem: null
};

export const SalesOrderStore = signalStore(
  { providedIn: 'root' },
  withState(initialSalesOrderState),
  withComputed(({ }) => ({
  })),
  withMethods((store, salesOrderService = inject(SalesOrderService),
    toastrService = inject(ToastrService),
    translationService = inject(TranslationService)) => ({
      loadByQuery: rxMethod<SalesOrderResourceParameter>(
        pipe(
          debounceTime(300),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((resourceParam: SalesOrderResourceParameter) => {
            return salesOrderService.getAllSalesOrder(resourceParam).pipe(
              tapResponse({
                next: (salesOrdersWithHeader: HttpResponse<SalesOrder[]>) => {
                  const headerValue = salesOrdersWithHeader?.headers?.get('X-Pagination');
                  const paginationParam = headerValue
                    ? JSON.parse(headerValue) as ResponseHeader
                    : new ResponseHeader();
                  const newSalesOrderResourceParameter = {
                    ...resourceParam,
                    ...paginationParam,
                  };
                  patchState(store, {
                    salesOrders: salesOrdersWithHeader.body ? [...salesOrdersWithHeader.body] : [],
                    isLoading: false,
                    commonError: null,
                    loadList: false,
                    isAddUpdate: false,
                    salesOrderResourceParameter: { ...newSalesOrderResourceParameter }
                  })
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
      deleteSalesOrderById: rxMethod<string>(
        pipe(
          distinctUntilChanged(),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((id: string) => {
            return salesOrderService.deleteSalesOrder(id).pipe(
              tapResponse({
                next: () => {
                  toastrService.success(translationService.getValue('SALES_ORDER_DELETED_SUCCESSFULLY'));
                  patchState(store, { isLoading: false, loadList: true });
                },
                error: (err: CommonError) => {
                  patchState(store, { commonError: err, isLoading: false });
                },
              })
            );
          })
        )
      ),
      markAsDelivered: rxMethod<string>(
        pipe(
          distinctUntilChanged(),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((id: string) => {
            return salesOrderService.markasdelivered(id).pipe(
              tapResponse({
                next: () => {
                  toastrService.success(translationService.getValue('SALES_ORDER_UPDATED_SUCCESSFULLY'));
                  patchState(store, { isLoading: false, loadList: true });
                },
                error: (err: CommonError) => {
                  patchState(store, { commonError: err, isLoading: false });
                },
              })
            );
          })
        )
      ),
      addUpdateSalesOrder: rxMethod<SalesOrder>(
        pipe(
          distinctUntilChanged(),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((salesOrder: SalesOrder) => {
            if (salesOrder.id) {
              return salesOrderService.updateSalesOrder(salesOrder).pipe(
                tapResponse({
                  next: () => {
                    toastrService.success(translationService.getValue('SALES_ORDER_UPDATED_SUCCESSFULLY'));
                    patchState(store, { isLoading: false, loadList: true, isAddUpdate: true });
                  },
                  error: (err: CommonError) => {
                    patchState(store, { commonError: err, isLoading: false });
                  },
                })
              );
            } else {
              return salesOrderService.addSalesOrder(salesOrder).pipe(
                tapResponse({
                  next: (createdSalesOrder: SalesOrder) => {
                    toastrService.success(translationService.getValue('SALES_ORDER_ADDED_SUCCESSFULLY'));
                    patchState(store, { isLoading: false, loadList: true, currentItem: createdSalesOrder, isAllowPayment: salesOrder.isAllowPayment, isAddUpdate: true });
                  },
                  error: (err: CommonError) => {
                    patchState(store, { commonError: err, isLoading: false });
                  },
                })
              );
            }
          })
        )
      ),
      loadSalesOrderFromReturn() {
        this.loadByQuery(store.salesOrderResourceParameter());
      },
      resetIsAllowPayment() {
        patchState(store, { isAllowPayment: false });
      },
      resetCurrentItem() {
        patchState(store, { currentItem: null });
      }
    })),
  withHooks({
    onInit(store) {
      toObservable(store.loadList).subscribe((flag) => {
        if (flag) {
          store.loadByQuery(store.salesOrderResourceParameter());
        }
      });
      store.loadByQuery(store.salesOrderResourceParameter());
    },
  }),
);
