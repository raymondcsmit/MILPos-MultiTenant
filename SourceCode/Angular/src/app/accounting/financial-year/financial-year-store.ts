import { computed, inject } from '@angular/core';
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
import { debounceTime, distinctUntilChanged, pipe, switchMap, tap } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { CommonError } from '@core/error-handler/common-error';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { Router } from '@angular/router';
import { FinancialYear } from './financial-year';
import { FinancialYearService } from './financial-year.service';

type FinancialYearState = {
  financialYears: FinancialYear[];
  financialYear: FinancialYear | null;
  isLoading: boolean;
  loadList: boolean;
  isAddUpdate: boolean;
  commonError: CommonError | null;
};

export const initialFinancialYearState: FinancialYearState = {
  financialYears: [],
  financialYear: null,
  isLoading: false,
  loadList: false,
  isAddUpdate: false,
  commonError: null,
};

export const FinancialYearStore = signalStore(
  { providedIn: 'root' },
  withState(initialFinancialYearState),
  withComputed(({ financialYears }) => ({
    currentFinancialYear: computed(() => {
      return financialYears().find((fy) => !fy.isClosed);
    })
  })),
  withMethods(
    (
      store,
      financialYearService = inject(FinancialYearService),
      toastrService = inject(ToastrService),
      translationService = inject(TranslationService),
      securityService = inject(SecurityService),
      router = inject(Router)
    ) => ({
      loadFinancialYears: rxMethod<void>(
        pipe(
          debounceTime(300),
          tap(() => patchState(store, { isLoading: true })),
          switchMap(() =>
            financialYearService.getAllFinancialYear().pipe(
              tapResponse({
                next: (financialYears: FinancialYear[]) => {
                  patchState(store, {
                    financialYears: [...financialYears],
                    isLoading: false,
                    commonError: null,
                  });
                  securityService.setFinancialYears(financialYears);
                },
                error: (err: CommonError) => {
                  patchState(store, { commonError: err, isLoading: false });
                  console.error(err);
                },
              })
            )
          )
        )
      ),

      addUpdateFinancialYear: rxMethod<FinancialYear>(
        pipe(
          distinctUntilChanged(),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((financialYear: FinancialYear) => {
            if (financialYear.id) {
              return financialYearService
                .updateFinancialYear(financialYear.id, financialYear)
                .pipe(
                  tapResponse({
                    next: () => {
                      toastrService.success(
                        translationService.getValue(
                          'FINANCIAL_YEAR_UPDATED_SUCCESSFULLY'
                        )
                      );
                      patchState(store, {
                        isLoading: false,
                        loadList: true,
                        isAddUpdate: true,
                      });
                      router.navigate(['/accounting/financial-year']);
                    },
                    error: (err: CommonError) => {
                      patchState(store, { commonError: err, isLoading: false });
                    },
                  })
                );
            } else {
              return financialYearService.addFinancialYear(financialYear).pipe(
                tapResponse({
                  next: () => {
                    toastrService.success(
                      translationService.getValue(
                        'FINANCIAL_YEAR_CREATED_SUCCESSFULLY'
                      )
                    );
                    patchState(store, {
                      isLoading: false,
                      loadList: true,
                      isAddUpdate: true,
                    });
                    router.navigate(['/accounting/financial-year']);
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
      deleteFinancialYearById: rxMethod<string>(
        pipe(
          distinctUntilChanged(),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((financialYearId: string) =>
            financialYearService.deleteFinancialYear(financialYearId).pipe(
              tapResponse({
                next: () => {
                  toastrService.success(
                    translationService.getValue('FINANCIAL_YEAR_DELETED_SUCCESSFULLY')
                  );
                  patchState(store, {
                    financialYears: store.financialYears().filter((w) => w.id !== financialYearId),
                    isLoading: false,
                  });
                },
                error: (err: CommonError) => {
                  patchState(store, { commonError: err, isLoading: false });
                  console.error(err);
                },
              })
            )
          )
        )
      ),
      getFinancialYearById: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { isLoading: true })),
          switchMap((financialYearId: string) =>
            financialYearService.getFinancialYear(financialYearId).pipe(
              tapResponse({
                next: (financialYear: FinancialYear) => {
                  patchState(store, {
                    financialYear: financialYear,
                    isLoading: false,
                    commonError: null,
                  });
                },
                error: (err: CommonError) => {
                  patchState(store, { commonError: err, isLoading: false });
                  console.error(err);
                },
              })
            )
          )
        )
      ),
      resetflag: () => {
        patchState(store, { isAddUpdate: false, loadList: false });
      },
    })
  ),
  withHooks({
    onInit(store, securityService = inject(SecurityService)) {
      toObservable(store.loadList).subscribe((flag) => {
        if (flag) {
          store.loadFinancialYears();
        }
      });
      {
        store.loadFinancialYears();
      }
    },
  })
);
