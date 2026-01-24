import { inject } from "@angular/core";
import { CommonError } from "@core/error-handler/common-error";
import { tapResponse } from "@ngrx/operators";
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from "@ngrx/signals";
import { rxMethod } from "@ngrx/signals/rxjs-interop";
import { debounceTime, pipe, switchMap, tap } from "rxjs";
import { HttpResponse } from "@angular/common/http";
import { toObservable } from "@angular/core/rxjs-interop";
import { ResponseHeader } from "@core/domain-classes/response-header";
import { Transaction } from "./transaction";
import { TransactionResourceParameter } from "./transaction-list/transaction-resource-parameter";
import { TransactionService } from "./transaction.service";

type TransactionState = {
  transactions: Transaction[];
  isLoading: boolean;
  loadList: boolean;
  transactionResourceParameter: TransactionResourceParameter;
  commonError: CommonError | null;
  isAddUpdate: boolean;
  isAllowPayment: boolean;
  currentItem: Transaction | null;
};

export const initialTransactionState: TransactionState = {
  transactions: [],
  isLoading: false,
  loadList: false,
  isAddUpdate: false,
  transactionResourceParameter: {
    fromDate: null,
    toDate: null,
    transactionNumber: '',
    referenceNumber: '',
    paymentStatus: '',
    status: '',
    transactionType: '',
    branchId: '',
    pageSize: 30,
    orderBy: 'transactionDate desc',
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

export const TransactionStore = signalStore(
  { providedIn: 'root' },
  withState(initialTransactionState),
  withComputed(({ }) => ({
  })),
  withMethods((store, transactionService = inject(TransactionService)) => ({
    loadByQuery: rxMethod<TransactionResourceParameter>(
      pipe(
        debounceTime(300),
        tap(() => patchState(store, { isLoading: true })),
        switchMap((resourceParam: TransactionResourceParameter) => {
          return transactionService.getAllTransaction(resourceParam).pipe(
            tapResponse({
              next: (transactionsWithHeader: HttpResponse<Transaction[]>) => {

                if (transactionsWithHeader && transactionsWithHeader.headers.get('X-Pagination')) {
                  const paginationParam = JSON.parse(
                    transactionsWithHeader.headers.get('X-Pagination') ?? '{}'
                  ) as ResponseHeader;

                  const newTransactionResourceParameter = {
                    ...resourceParam,
                    ...paginationParam,
                  };
                  patchState(store, {
                    transactions: transactionsWithHeader.body && transactionsWithHeader.body.length > 0 ? [...transactionsWithHeader.body] : [],
                    isLoading: false,
                    commonError: null,
                    loadList: false,
                    isAddUpdate: false,
                    transactionResourceParameter: { ...newTransactionResourceParameter }
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
          store.loadByQuery(store.transactionResourceParameter());
        }
      });
      store.loadByQuery(store.transactionResourceParameter());
    },

  }),
);
