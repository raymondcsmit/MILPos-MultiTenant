import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Unit } from '@core/domain-classes/unit';
import { UnitConversationService } from '@core/services/unit-conversation.service';
import { Observable } from 'rxjs';

export const salesOrderUnitResolver: ResolveFn<Unit[]> = (): Observable<Unit[]> => {
  const unitConversationService = inject(UnitConversationService);
  
  return unitConversationService.getAll();
};
