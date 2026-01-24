export interface TaxReport {
  inputGstTotal: number;
  inputGstReturnTotal: number;
  outputGstTotal: number;
  outputGstReturnTotal: number;
  netTaxPayable: number;
  status: string;
  inputTaxes: ChildTax[];
  outputTaxes: ChildTax[];
}

export interface ChildTax {
  taxName: string;
  amount: number;
}
