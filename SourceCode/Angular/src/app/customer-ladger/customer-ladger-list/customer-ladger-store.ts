import { inject } from '@angular/core';
import { CommonError } from '@core/error-handler/common-error';
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
import { debounceTime, distinctUntilChanged, EMPTY, pipe, switchMap, tap } from 'rxjs';
import { HttpResponse } from '@angular/common/http';
import { toObservable } from '@angular/core/rxjs-interop';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { CustomerLadger } from '../customer-ladger';
import { CustomerLadgerResourceParameter } from './customer-ladger-resource-parameter';
import { CustomerLadgerService } from '../customer-ladger.service';
import { CustomerLadgerHistory } from '../customer-ladger-history';
import { TranslationService } from '@core/services/translation.service';
import { Router } from '@angular/router';
import { ToastrService } from '@core/services/toastr.service';

type CustomerSalesOrderState = {
  customerLadgers: CustomerLadger[];
  isLoading: boolean;
  loadList: boolean;
  customerLadgerResourceParameter: CustomerLadgerResourceParameter;
  commonError: CommonError | null;
  isAddUpdate: boolean;
  isAllowPayment: boolean;
  currentItem: CustomerLadger | null;
};

export const initialCustomerSalesOrderState: CustomerSalesOrderState = {
  customerLadgers: [],
  isLoading: false,
  loadList: false,
  isAddUpdate: false,
  customerLadgerResourceParameter: {
    reference: '',
    accountId: '',
    accountDate: null,
    locationId: '',
    customerId: '',
    pageSize: 30,
    orderBy: 'date desc',
    fields: '',
    searchQuery: '',
    skip: 0,
    totalCount: 0,
    name: '',
  },
  commonError: null,
  isAllowPayment: false,
  currentItem: null,
};

export const CustomerLadgerStore = signalStore(
  { providedIn: 'root' },
  withState(initialCustomerSalesOrderState),
  withComputed(({}) => ({})),
  withMethods(
    (
      store,
      customerLadgerService = inject(CustomerLadgerService),
      toastrService = inject(ToastrService),
      translationService = inject(TranslationService),
      router = inject(Router)
    ) => ({
      loadByQuery: rxMethod<CustomerLadgerResourceParameter>(
        pipe(
          debounceTime(300),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((resourceParam: CustomerLadgerResourceParameter) => {
            return customerLadgerService.getCustomerLadgers(resourceParam).pipe(
              tapResponse({
                next: (customerLadgersWithHeader: HttpResponse<CustomerLadger[]>) => {
                  if (
                    customerLadgersWithHeader &&
                    customerLadgersWithHeader.headers.get('X-Pagination')
                  ) {
                    const paginationParam = JSON.parse(
                      customerLadgersWithHeader.headers.get('X-Pagination') ?? '{}'
                    ) as ResponseHeader;
                    const newCustomerLadgerResourceParameter = {
                      ...resourceParam,
                      ...paginationParam,
                    };
                    patchState(store, {
                      customerLadgers: customerLadgersWithHeader.body
                        ? [...customerLadgersWithHeader.body]
                        : [],
                      isLoading: false,
                      commonError: null,
                      loadList: false,
                      isAddUpdate: false,
                      customerLadgerResourceParameter: { ...newCustomerLadgerResourceParameter },
                    });
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
      addCustomerLadger: rxMethod<CustomerLadgerHistory>(
        pipe(
          distinctUntilChanged(),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((customerLadgerHistory: CustomerLadgerHistory) => {
            if (customerLadgerHistory) {
              return customerLadgerService.addCustomerLadgerHistory(customerLadgerHistory).pipe(
                tapResponse({
                  next: () => {
                    toastrService.success(
                      translationService.getValue('CUSTOMER_LADGER_SAVED_SUCCESSFULLY')
                    );
                    patchState(store, {
                      isLoading: false,
                      loadList: true,
                      isAddUpdate: true,
                    });
                  },
                  error: (err: CommonError) => {
                    patchState(store, { commonError: err, isLoading: false });
                  },
                })
              );
            }
            patchState(store, { isLoading: false });
            return EMPTY;
          })
        )
      ),
      resetCurrentItem() {
        patchState(store, { currentItem: null });
      },
    })
  ),
  withHooks({
    onInit(store) {
      toObservable(store.loadList).subscribe((flag) => {
        if (flag) {
          store.loadByQuery(store.customerLadgerResourceParameter());
        }
      });
      store.loadByQuery(store.customerLadgerResourceParameter());
    },
  })
);
