import { inject } from "@angular/core";
import { Product } from "@core/domain-classes/product";
import { ProductResourceParameter, ProductType } from "@core/domain-classes/product-resource-parameter";
import { CommonError } from "@core/error-handler/common-error";
import { TranslationService } from "@core/services/translation.service";
import { tapResponse } from "@ngrx/operators";
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from "@ngrx/signals";
import { rxMethod } from "@ngrx/signals/rxjs-interop";
import { debounceTime, distinctUntilChanged, pipe, switchMap, tap } from "rxjs";
import { ProductService } from "./product.service";
import { HttpResponse } from "@angular/common/http";
import { toObservable } from "@angular/core/rxjs-interop";
import { ResponseHeader } from "@core/domain-classes/response-header";
import { ToastrService } from "@core/services/toastr.service";

type ProductState = {
  products: Product[];
  isLoading: boolean;
  isDeleted: boolean;
  productResourceParameter: ProductResourceParameter,
  commonError: CommonError | null;
  isAddUpdate: boolean;
};

export const initialProductState: ProductState = {
  products: [],
  isLoading: false,
  isDeleted: false,
  isAddUpdate: false,
  productResourceParameter: {
    name: '',
    unitId: '',
    barcode: '',
    categoryId: '',
    brandId: '',
    id: '',
    productType: ProductType.MainProduct,
    parentId: '',
    locationId: '',
    isBarcodeGenerated: false,
    pageSize: 15,
    orderBy: 'createdDate asc',
    fields: '',
    searchQuery: '',
    skip: 0,
    totalCount: 0
  },
  commonError: null
};

export const ProductStore = signalStore(
  { providedIn: 'root' },
  withState(initialProductState),
  withComputed(({ }) => ({
  })),
  withMethods((store, productService = inject(ProductService),
    toastrService = inject(ToastrService),
    translationService = inject(TranslationService)) => ({
      loadByQuery: rxMethod<ProductResourceParameter>(
        pipe(
          debounceTime(300),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((resourceParam: ProductResourceParameter) => {
            return productService.getProducts(resourceParam).pipe(
              tapResponse({
                next: (productsWithHeader: HttpResponse<Product[]>) => {
                  if (productsWithHeader && productsWithHeader.headers.get('X-Pagination')) {
                    const paginationParam = JSON.parse(
                      productsWithHeader.headers.get('X-Pagination') ?? '{}'
                    ) as ResponseHeader;
                    const newProductResourceParameter = {
                      ...resourceParam,
                      ...paginationParam,
                    };
                    patchState(store, {
                      products: productsWithHeader.body ? [...productsWithHeader.body] : [],
                      isLoading: false,
                      isAddUpdate: false,
                      commonError: null,
                      isDeleted: false,
                      productResourceParameter: { ...newProductResourceParameter }
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
      deleteProductById: rxMethod<string>(
        pipe(
          distinctUntilChanged(),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((productId: string) => {
            return productService.deleteProudct(productId).pipe(
              tapResponse({
                next: () => {
                  toastrService.success(translationService.getValue('PRODUCT_DELETED_SUCCESSFULLY'));
                  patchState(store,
                    {
                      isLoading: false,
                      isDeleted: true
                    });
                },
                error: (err: CommonError) => {
                  patchState(store, { commonError: err, isLoading: false });
                },
              })
            );
          })
        )
      ),
      addUpdateProduct: rxMethod<Product>(
        pipe(
          distinctUntilChanged(),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((product: Product) => {
            if (product.id) {
              return productService.updateProudct(product.id, product).pipe(
                tapResponse({
                  next: () => {
                    toastrService.success(translationService.getValue('PRODUCT_SAVED_SUCCESSFULLY'));
                    patchState(store,
                      {
                        isLoading: false,
                        isDeleted: true,
                        isAddUpdate: true
                      });
                  },
                  error: (err: CommonError) => {
                    patchState(store,
                      {
                        commonError: err,
                        isLoading: false
                      });
                  },
                })
              );
            } else {
              return productService.addProudct(product).pipe(
                tapResponse({
                  next: () => {
                    toastrService.success(translationService.getValue('PRODUCT_SAVED_SUCCESSFULLY'));
                    patchState(store,
                      {
                        isLoading: false,
                        isDeleted: true,
                        isAddUpdate: true
                      });
                  },
                  error: (err: CommonError) => {
                    patchState(store,
                      {
                        commonError: err,
                        isLoading: false
                      });
                  },
                })
              );
            }
          })
        )
      )
    })),
  withHooks({
    onInit(store) {
      toObservable(store.isDeleted).subscribe((flag) => {
        if (flag) {
          store.loadByQuery(store.productResourceParameter());
        }
      });
      store.loadByQuery(store.productResourceParameter());
    },
  }),
);
