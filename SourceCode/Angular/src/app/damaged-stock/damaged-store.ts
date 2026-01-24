import { inject } from '@angular/core';
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
import {
  debounceTime,
  distinctUntilChanged,
  pipe,
  switchMap,
  tap,
} from 'rxjs';
import { HttpResponse } from '@angular/common/http';
import { toObservable } from '@angular/core/rxjs-interop';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { DamagedStock } from '@core/domain-classes/damaged-stock';
import { DamagedStockResourceParameter } from '@core/domain-classes/damaged-stock-resource-parameter';
import { DamagedStockService } from './damaged-stock.service';

type DamagedStockState = {
  damagedStocks: DamagedStock[];
  isLoading: boolean;
  isDeleted: boolean;
  damagedStockResourceParameter: DamagedStockResourceParameter;
  commonError: CommonError | null;
  isAddUpdate: boolean;
  currentDamagedStock: DamagedStock | null;
};

export const initialDamagedStockState: DamagedStockState = {
  damagedStocks: [],
  isLoading: false,
  isDeleted: false,
  isAddUpdate: false,
  currentDamagedStock: null,
  damagedStockResourceParameter: {
    id: '',
    locationId: '',
    damagedDate: null,
    productId: '',
    pageSize: 15,
    orderBy: 'damagedDate asc',
    fields: '',
    searchQuery: '',
    skip: 0,
    totalCount: 0,
    name: '',
  },
  commonError: null,
};

export const DamagedStore = signalStore(
  { providedIn: 'root' },
  withState(initialDamagedStockState),
  withComputed(({ }) => ({})),
  withMethods(
    (
      store,
      damagedStockService = inject(DamagedStockService),
      toastrService = inject(ToastrService),
      translationService = inject(TranslationService)
    ) => ({
      loadByQuery: rxMethod<DamagedStockResourceParameter>(
        pipe(
          debounceTime(300),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((resourceParam: DamagedStockResourceParameter) => {
            return damagedStockService.getDamagedStocks(resourceParam).pipe(
              tapResponse({
                next: (
                  damagedStockWithHeader: HttpResponse<DamagedStock[]>
                ) => {
                  if (damagedStockWithHeader && damagedStockWithHeader.headers.get('X-Pagination')) {
                    const paginationParam = JSON.parse(
                      damagedStockWithHeader.headers.get('X-Pagination') ?? '{}'
                    ) as ResponseHeader;
                    const newDamagedStockResourceParameter = {
                      ...resourceParam,
                      ...paginationParam,
                    };
                    patchState(store, {
                      damagedStocks: damagedStockWithHeader.body ? [...damagedStockWithHeader.body] : [],
                      isLoading: false,
                      commonError: null,
                      isDeleted: false,
                      damagedStockResourceParameter: {
                        ...newDamagedStockResourceParameter,
                      },
                      isAddUpdate: false,
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

      addUpdateDamagedStock: rxMethod<DamagedStock>(
        pipe(
          distinctUntilChanged(),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((damagedStock: DamagedStock) => {
            return damagedStockService.addDamagedStock(damagedStock).pipe(
              tapResponse({
                next: (newDamagedStock: DamagedStock) => {
                  patchState(store, { damagedStocks: [...store.damagedStocks(), { ...newDamagedStock }], isDeleted: true, isLoading: false, isAddUpdate: true, currentDamagedStock: { ...newDamagedStock } });
                  toastrService.success(
                    translationService.getValue(
                      'DAMAGE_STOCK_ADDED_SUCCESSFULLY'
                    )
                  );
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
    })
  ),
  withHooks({
    onInit(store) {
      toObservable(store.isDeleted).subscribe((flag) => {
        if (flag) {
          store.loadByQuery(store.damagedStockResourceParameter());
        }
      });
      store.loadByQuery(store.damagedStockResourceParameter());
    },
  })
);
