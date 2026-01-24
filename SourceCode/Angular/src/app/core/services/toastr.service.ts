import { inject, Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class ToastrService {
  snackBar = inject(MatSnackBar);

  success(message: string, duration: number = 10000) {
    this.openSnackBar(message, 'success', duration);
  }

  error(message: string, duration: number = 3000) {
    this.openSnackBar(message, 'error', duration);
  }

  info(message: string, duration: number = 3000) {
    this.openSnackBar(message, 'primary', duration);
  }
  warning(message: string, duration: number = 3000) {
    this.openSnackBar(message, 'warning', duration);
  }

  private openSnackBar(message: string, panelClass: string, duration: number) {
    const config: MatSnackBarConfig = {
      duration,
      panelClass: panelClass,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    };
    this.snackBar.open(message, 'Close', config);
  }
}
