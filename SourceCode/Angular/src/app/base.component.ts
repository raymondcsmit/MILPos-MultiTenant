import { Direction } from '@angular/cdk/bidi';
import { Component, inject, OnDestroy } from '@angular/core';
import { TranslationService } from '@core/services/translation.service';
import { SubSink } from 'subsink';

@Component({
  selector: 'app-base',
  template: ``,
  standalone: false
})
export class BaseComponent implements OnDestroy {
  sub$: SubSink;
  langDir: Direction = 'ltr';
  translationService = inject(TranslationService);
  constructor() {
    this.sub$ = new SubSink();
  }


  public get CurrentDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }


  public get FromDate(): Date {
    return new Date(this.CurrentDate.getFullYear(), this.CurrentDate.getMonth(), this.CurrentDate.getDate() - 30)
  }

  public get ToDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }


  getLangDir() {
    this.sub$.sink = this.translationService.lanDir$.subscribe(
      (c: string) => {
        if (c == 'ltr') {
          this.langDir = c;
        } else if (c == 'rtl') {
          this.langDir = c;
        }
      }
    );
  }

  ngOnDestroy(): void {
    this.sub$.unsubscribe();
  }
}
