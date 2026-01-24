import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[flatdiscountvalidator]'
})
export class FlatDiscountValidatorDirective {
  @Input() maxValue: number | null = null;
  @Input() totalTax: number | null = null;

  constructor(private el: ElementRef, private control: NgControl) { }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    let value = Number(input.value);

    // Prevent negative or zero values
    if (value <= 0) {
      value = 0;
    }


    // Prevent exceeding maxValue if provided
    if (this.maxValue !== null && value >= this.maxValue) {
      value = this.maxValue + Number(this.totalTax ?? 0);
    }
    value = Number(value.toFixed(2))

    this.control.control?.setValue(value == 0 ? null : value, { emitEvent: true });
  }
}
