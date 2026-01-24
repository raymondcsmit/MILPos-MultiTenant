import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { ProductService } from './product.service';
import { Product } from '@core/domain-classes/product';
import { ProductResourceParameter } from '@core/domain-classes/product-resource-parameter';

export const ProductsResolver: ResolveFn<Product[]> = (route: ActivatedRouteSnapshot) => {
  const productService = inject(ProductService);
  const productResource = new ProductResourceParameter();
  const productType = route.data['productType'];
  if (productType) {
    productResource.productType = productType;
  }
  return productService.getProductsDropdown(productResource);
};
