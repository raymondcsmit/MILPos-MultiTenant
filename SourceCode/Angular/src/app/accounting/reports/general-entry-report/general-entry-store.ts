import { inject } from "@angular/core";
import { CommonError } from "@core/error-handler/common-error";
import { tapResponse } from "@ngrx/operators";
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from "@ngrx/signals";
import { rxMethod } from "@ngrx/signals/rxjs-interop";
import { debounceTime, pipe, switchMap, tap } from "rxjs";
import { HttpResponse } from "@angular/common/http";
import { toObservable } from "@angular/core/rxjs-interop";
import { ResponseHeader } from "@core/domain-classes/response-header";
import { GeneralEntry } from "./general-entry";
import { GeneralEntryResourceParameter } from "./general-entry-resource-parameter";
import { ReportService } from "../report.service";

type GeneralEntryState = {
  generalEntrys: GeneralEntry[];
  isLoading: boolean;
  loadList: boolean;
  generalEntryResourceParameter: GeneralEntryResourceParameter;
  commonError: CommonError | null;
  isAddUpdate: boolean;
  isAllowPayment: boolean;
  currentItem: GeneralEntry | null;
};

export const initialGeneralEntryState: GeneralEntryState = {
  generalEntrys: [],
  isLoading: false,
  loadList: false,
  isAddUpdate: false,
  generalEntryResourceParameter: {
    transactionNumber: '',
    branchId: '',
    financialYearId: '',
    fromDate: null,
    toDate: null,
    pageSize: 30,
    orderBy: 'createdDate desc',
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

export const GeneralEntryStore = signalStore(
  { providedIn: 'root' },
  withState(initialGeneralEntryState),
  withComputed(({ }) => ({
  })),
  withMethods((store, reportService = inject(ReportService)) => ({
    loadByQuery: rxMethod<GeneralEntryResourceParameter>(
      pipe(
        debounceTime(300),
        tap(() => patchState(store, { isLoading: true })),
        switchMap((resourceParam: GeneralEntryResourceParameter) => {
          return reportService.getAllGeneralEntry(resourceParam).pipe(
            tapResponse({
              next: (generalEntrysWithHeader: HttpResponse<GeneralEntry[]>) => {


                if (generalEntrysWithHeader && generalEntrysWithHeader.headers.get('X-Pagination')) {
                  const paginationParam = JSON.parse(
                    generalEntrysWithHeader.headers.get('X-Pagination') ?? '{}'
                  ) as ResponseHeader;


                  const newGeneralEntryResourceParameter = {
                    ...resourceParam,
                    ...paginationParam,
                  };
                  patchState(store, {
                    generalEntrys: generalEntrysWithHeader.body && generalEntrysWithHeader.body.length > 0 ? [...generalEntrysWithHeader.body] : [],
                    isLoading: false,
                    commonError: null,
                    loadList: false,
                    isAddUpdate: false,
                    generalEntryResourceParameter: { ...newGeneralEntryResourceParameter }
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
          store.loadByQuery(store.generalEntryResourceParameter());
        }
      });
      store.loadByQuery(store.generalEntryResourceParameter());
    },

  }),
);
