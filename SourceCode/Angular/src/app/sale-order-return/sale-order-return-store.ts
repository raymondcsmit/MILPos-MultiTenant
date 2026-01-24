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
import { SalesOrderService } from "../sales-order/sales-order.service";
import { ResponseHeader } from "@core/domain-classes/response-header";
import { ToastrService } from "@core/services/toastr.service";

type SalesOrderReturnState = {
  salesOrders: SalesOrder[];
  isLoading: boolean;
  loadList: boolean;
  salesOrderResourceParameter: SalesOrderResourceParameter;
  commonError: CommonError | null;
  isAddUpdate: boolean;
};

export const initialSalesOrderReturnState: SalesOrderReturnState = {
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
    status: SalesOrderStatusEnum.Return,
    locationId: '',
    pageSize: 30,
    orderBy: 'modifiedDate asc',
    fields: '',
    searchQuery: '',
    skip: 0,
    totalCount: 0,
    name: '',
    deliveryStatus: null,
    paymentStatus: null
  },
  commonError: null
};

export const SalesOrderReturnStore = signalStore(
  { providedIn: 'root' },
  withState(initialSalesOrderReturnState),
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
                  if (salesOrdersWithHeader && salesOrdersWithHeader.headers.get('X-Pagination')) {
                    const paginationParam = JSON.parse(
                      salesOrdersWithHeader.headers.get('X-Pagination') ?? '{}'
                    ) as ResponseHeader;
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
      addUpdateSalesOrderReturn: rxMethod<SalesOrder>(
        pipe(
          distinctUntilChanged(),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((salesOrder: SalesOrder) => {
            return salesOrderService.updateSalesOrderReturn(salesOrder).pipe(
              tapResponse({
                next: () => {
                  toastrService.success(translationService.getValue('SALES_ORDER_RETURN_ADDED_SUCCESSFULLY'));
                  patchState(store, { isLoading: false, loadList: true, isAddUpdate: true });
                },
                error: (err: CommonError) => {
                  patchState(store, { commonError: err, isLoading: false });
                },
              })
            );
          })
        )
      ),
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
