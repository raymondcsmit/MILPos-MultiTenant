import { AbstractControl, ValidationErrors } from "@angular/forms";


export function discountValidator(control: AbstractControl): ValidationErrors | null {
  const discount = control.get('discountPercentage')?.value ?? 0;
  const discountType = control.get('discountType')?.value;
  const quantity = control.get('quantity')?.value ?? 0;
  const unitPrice = control.get('unitPrice')?.value ?? 0;

  if (discountType === 'fixed' && discount < 0) {
    return { invalidFixedDiscount: true };
  }
  if (discountType === 'fixed' && discount > 0) {
    const subTotal = quantity * unitPrice;
    if (discount > subTotal) {
      return { invalidFixedDiscount: true };
    }
    return null;
  }

  if (discountType === 'percentage' && (discount < 0 || discount > 100)) {
    return { invalidPercentageDiscount: true };
  }

  return null;
}
