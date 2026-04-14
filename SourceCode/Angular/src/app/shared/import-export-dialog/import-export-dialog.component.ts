import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule } from '@ngx-translate/core';
import { ImportExportService, ImportResult, ImportError } from '@core/services/import-export.service';
import { ToastrService } from '@core/services/toastr.service';

export interface ImportDialogData {
  entityType: string;
  entityName: string;
}

@Component({
  selector: 'app-import-export-dialog',
  templateUrl: './import-export-dialog.component.html',
  styleUrls: ['./import-export-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    MatDividerModule,
    TranslateModule
  ]
})
export class ImportExportDialogComponent {
  selectedFile: File | null = null;
  fileName: string = '';
  isProcessing: boolean = false;
  showErrors: boolean = false;
  errors: ImportError[] = [];
  displayedColumns: string[] = ['rowNumber', 'fieldName', 'errorMessage'];

  constructor(
    public dialogRef: MatDialogRef<ImportExportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ImportDialogData,
    private importExportService: ImportExportService,
    private toastrService: ToastrService
  ) {}

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (this.importExportService.isValidFile(file)) {
        this.selectedFile = file;
        this.fileName = file.name;
        this.showErrors = false;
        this.errors = [];
      } else {
        this.toastrService.error('Please select a valid CSV or Excel file');
        this.selectedFile = null;
        this.fileName = '';
      }
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (this.importExportService.isValidFile(file)) {
        this.selectedFile = file;
        this.fileName = file.name;
        this.showErrors = false;
        this.errors = [];
      } else {
        this.toastrService.error('Please select a valid CSV or Excel file');
      }
    }
  }

  importFile(): void {
    if (!this.selectedFile) {
      this.toastrService.warning('Please select a file first');
      return;
    }

    this.isProcessing = true;
    this.showErrors = false;
    this.errors = [];

    this.importExportService.importData(this.data.entityType, this.selectedFile)
      .subscribe({
        next: (result: ImportResult) => {
          this.isProcessing = false;
          
          if (result.success) {
            this.toastrService.success(
              `Successfully imported ${result.successCount} of ${result.totalRecords} records`
            );
            this.dialogRef.close(true);
          } else {
            this.toastrService.error(
              `Import completed with ${result.failureCount} errors`
            );
            this.errors = result.errors;
            this.showErrors = true;
          }
        },
        error: (error) => {
          this.isProcessing = false;
          this.toastrService.error('Import failed: ' + error.message);
        }
      });
  }

  downloadTemplate(format: 'csv' | 'excel'): void {
    this.importExportService.downloadTemplate(this.data.entityType, format)
      .subscribe({
        next: (blob: Blob) => {
          const fileName = `${this.data.entityName}_Template.${format === 'excel' ? 'xlsx' : 'csv'}`;
          this.importExportService.downloadFile(blob, fileName);
          this.toastrService.success('Template downloaded successfully');
        },
        error: (error) => {
          this.toastrService.error('Failed to download template: ' + error.message);
        }
      });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
