import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { PageHelper } from '@core/domain-classes/page-helper';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms'
import { TextEditorComponent } from '../text-editor/text-editor.component';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-page-help-preview',
  templateUrl: './page-help-preview.component.html',
  styleUrls: ['./page-help-preview.component.scss'],
  standalone: true,
  imports: [
    MatDialogModule,
    MatIconModule,
    ReactiveFormsModule,
    TextEditorComponent,
    HasClaimDirective,
    MatButtonModule,
    MatCardModule
  ]
})
export class PageHelpPreviewComponent implements OnInit {
  helperForm!: FormGroup;
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PageHelper,
    private dialogRef: MatDialogRef<PageHelpPreviewComponent>,
    private router: Router,
    private matDialogRef: MatDialog,
    private fb: FormBuilder
  ) {
  }

  ngOnInit(): void {
    this.helperForm = this.fb.group({
      description: [{ value: '', disabled: true }],
    });
    this.helperForm.get('description')?.setValue(this.data.description);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  editPageHelper() {
    this.matDialogRef.closeAll();
    this.router.navigate(['/page-helper/manage/', this.data.id]);
  }
}
