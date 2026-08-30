import { DragDropDirective } from './drag-drop.directive';
import { TranslateModule } from '@ngx-translate/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('DragDropDirective', () => {
  it('should create an instance', () => {
    const directive = new DragDropDirective();
    expect(directive).toBeTruthy();
  });
});
