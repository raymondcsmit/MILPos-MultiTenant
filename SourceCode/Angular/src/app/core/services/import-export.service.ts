import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface ImportResult {
  success: boolean;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  errors: ImportError[];
}

export interface ImportError {
  rowNumber: number;
  fieldName: string;
  errorMessage: string;
  rowData?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImportExportService {
  private apiUrl = 'importexport';

  constructor(private http: HttpClient) {}

  /**
   * Import data from file
   */
  importData(entityType: string, file: File): Observable<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post<ImportResult>(
      `${this.apiUrl}/${entityType}/import`,
      formData
    );
  }

  /**
   * Validate import without saving
   */
  validateImport(entityType: string, file: File): Observable<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post<ImportResult>(
      `${this.apiUrl}/${entityType}/validate`,
      formData
    );
  }

  /**
   * Export data to file
   */
  exportData(entityType: string, format: 'csv' | 'excel' = 'excel'): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/${entityType}/export?format=${format}`,
      { responseType: 'blob' }
    );
  }

  /**
   * Download template file
   */
  downloadTemplate(entityType: string, format: 'csv' | 'excel' = 'excel'): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/${entityType}/template?format=${format}`,
      { responseType: 'blob' }
    );
  }

  /**
   * Helper method to download blob as file
   */
  downloadFile(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get file extension from file name
   */
  getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Check if file is valid (CSV or Excel)
   */
  isValidFile(file: File): boolean {
    const ext = this.getFileExtension(file.name);
    return ext === 'csv' || ext === 'xlsx' || ext === 'xls';
  }
}
