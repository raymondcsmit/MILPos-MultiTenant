import { inject } from '@angular/core';
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
import { debounceTime, distinctUntilChanged, EMPTY, pipe, switchMap, tap } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { CommonError } from '@core/error-handler/common-error';
import { TranslationService } from '@core/services/translation.service';
import { Router } from '@angular/router';
import { PayRoll } from './pay-roll';
import { PayRollService } from './pay-roll.service';
import { PayRollResourceParameter } from './pay-roll-list/pay-roll-resource-parameter';
import { HttpResponse } from '@angular/common/http';
import { ResponseHeader } from '@core/domain-classes/response-header';

type PayRollState = {
  payRolls: PayRoll[];
  payRoll: PayRoll | null;
  isLoading: boolean;
  loadList: boolean;
  payRollResourceParameter: PayRollResourceParameter;
  isAddUpdate: boolean;
  commonError: CommonError | null;
};

export const initialPayRollState: PayRollState = {
  payRolls: [],
  payRoll: null,
  isLoading: false,
  loadList: false,
  payRollResourceParameter: {
    fromDate: null,
    toDate: null,
    employeeId: '',
    branchId: '',
    pageSize: 30,
    orderBy: 'salaryDate desc',
    fields: '',
    searchQuery: '',
    skip: 0,
    totalCount: 0,
    name: '',
  },
  isAddUpdate: false,
  commonError: null,
};

export const PayRollStore = signalStore(
  { providedIn: 'root' },
  withState(initialPayRollState),
  withComputed(({}) => ({})),
  withMethods(
    (
      store,
      payRollService = inject(PayRollService),
      toastrService = inject(ToastrService),
      translationService = inject(TranslationService),
      router = inject(Router)
    ) => ({
      loadByQuery: rxMethod<PayRollResourceParameter>(
        pipe(
          debounceTime(300),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((resourceParam: PayRollResourceParameter) => {
            return payRollService.getAllPayRoll(resourceParam).pipe(
              tapResponse({
                next: (payRollsWithHeader: HttpResponse<PayRoll[]>) => {
                  if (payRollsWithHeader && payRollsWithHeader.headers.get('X-Pagination')) {
                    const paginationParam = JSON.parse(
                      payRollsWithHeader.headers.get('X-Pagination') ?? '{}'
                    ) as ResponseHeader;

                    const newPayRollResourceParameter = {
                      ...resourceParam,
                      ...paginationParam,
                    };
                    patchState(store, {
                      payRolls:
                        payRollsWithHeader.body && payRollsWithHeader.body.length > 0
                          ? [...payRollsWithHeader.body]
                          : [],
                      isLoading: false,
                      commonError: null,
                      loadList: false,
                      isAddUpdate: false,
                      payRollResourceParameter: { ...newPayRollResourceParameter },
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

      addPayRoll: rxMethod<FormData>(
        pipe(
          distinctUntilChanged(),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((formData: FormData) => {
            if (formData) {
              return payRollService.addPayRoll(formData).pipe(
                tapResponse({
                  next: () => {
                    toastrService.success(
                      translationService.getValue('PAY_ROLL_CREATED_SUCCESSFULLY')
                    );
                    patchState(store, {
                      isLoading: false,
                      loadList: true,
                      isAddUpdate: true,
                    });
                    router.navigate(['/pay-roll/list']);
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
        patchState(store, { payRoll: null });
      },
    })
  ),
  withHooks({
    onInit(store) {
      toObservable(store.loadList).subscribe((flag) => {
        if (flag) {
          store.loadByQuery(store.payRollResourceParameter());
        }
      });
      store.loadByQuery(store.payRollResourceParameter());
    },
  })
);
