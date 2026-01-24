import { inject } from "@angular/core";
import { CommonError } from "@core/error-handler/common-error";
import { tapResponse } from "@ngrx/operators";
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from "@ngrx/signals";
import { rxMethod } from "@ngrx/signals/rxjs-interop";
import { debounceTime, pipe, switchMap, tap } from "rxjs";
import { HttpResponse } from "@angular/common/http";
import { toObservable } from "@angular/core/rxjs-interop";
import { ResponseHeader } from "@core/domain-classes/response-header";
import { CustomerSalesOrder } from "./customer-sales-order-list/customer-sales-order";
import { CustomerSalesOrderResourceParameter } from "./customer-sales-order-list/customer-sales-order-resource-parameter";
import { CustomerSalesOrderService } from "./customer-sales-order.service";

type CustomerSalesOrderState = {
  customerSalesOrders: CustomerSalesOrder[];
  isLoading: boolean;
  loadList: boolean;
  customerSalesOrderResourceParameter: CustomerSalesOrderResourceParameter;
  commonError: CommonError | null;
  isAddUpdate: boolean;
  isAllowPayment: boolean;
  currentItem: CustomerSalesOrder | null;
};

export const initialCustomerSalesOrderState: CustomerSalesOrderState = {
  customerSalesOrders: [],
  isLoading: false,
  loadList: false,
  isAddUpdate: false,
  customerSalesOrderResourceParameter: {
    fromDate: null,
    toDate: null,
    customerId: '',
    customerName: '',
    orderNumber: '',
    paymentStatus: '',
    soCreatedDate: null,
    pageSize: 30,
    orderBy: 'soCreatedDate desc',
    fields: '',
    searchQuery: '',
    skip: 0,
    totalCount: 0,
    name: '',
  },
  commonError: null,
  isAllowPayment: false,
  currentItem: null
};

export const CustomerSalesOrderStore = signalStore(
  { providedIn: 'root' },
  withState(initialCustomerSalesOrderState),
  withComputed(({ }) => ({
  })),
  withMethods((store, customerSalesOrderService = inject(CustomerSalesOrderService)) => ({
    loadByQuery: rxMethod<CustomerSalesOrderResourceParameter>(
      pipe(
        debounceTime(300),
        tap(() => patchState(store, { isLoading: true })),
        switchMap((resourceParam: CustomerSalesOrderResourceParameter) => {
          return customerSalesOrderService.getAllCustomerSalesOrder(resourceParam).pipe(
            tapResponse({
              next: (customerSalesOrdersWithHeader: HttpResponse<CustomerSalesOrder[]>) => {
                if (customerSalesOrdersWithHeader && customerSalesOrdersWithHeader.headers.get('X-Pagination')) {
                  const paginationParam = JSON.parse(
                    customerSalesOrdersWithHeader.headers.get('X-Pagination') ?? '{}'
                  ) as ResponseHeader;
                  const newCustomerSalesOrderResourceParameter = {
                    ...resourceParam,
                    ...paginationParam,
                  };
                  patchState(store, {
                    customerSalesOrders: customerSalesOrdersWithHeader.body ? [...customerSalesOrdersWithHeader.body] : [],
                    isLoading: false,
                    commonError: null,
                    loadList: false,
                    isAddUpdate: false,
                    customerSalesOrderResourceParameter: { ...newCustomerSalesOrderResourceParameter }
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
    resetCurrentItem() {
      patchState(store, { currentItem: null });
    },
  })),
  withHooks({
    onInit(store) {
      toObservable(store.loadList).subscribe((flag) => {
        if (flag) {
          store.loadByQuery(store.customerSalesOrderResourceParameter());
        }
      });
      store.loadByQuery(store.customerSalesOrderResourceParameter());
    },

  }),
);
