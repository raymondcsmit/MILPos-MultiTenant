import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Action } from '@core/domain-classes/action';
import { ActionService } from '@core/services/action.service';
import { ToastrService } from '@core/services/toastr.service';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { BaseComponent } from '../../base.component';

@Component({
  selector: 'app-manage-action',
  templateUrl: './manage-action.component.html',
  styleUrls: ['./manage-action.component.scss'],
  standalone: true,
  imports: [
    MatDialogModule,
    MatIconModule,
    TranslateModule,
    MatButtonModule,
    ReactiveFormsModule,
  ]
})
export class ManageActionComponent extends BaseComponent implements OnInit {
  isEdit: boolean = false;
  actionForm!: UntypedFormGroup;
  isDisabled = true;

  constructor(
    public dialogRef: MatDialogRef<ManageActionComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private actionService: ActionService,
    private toastrService: ToastrService,
    private fb: UntypedFormBuilder) {
    super();

  }
  ngOnInit(): void {
    this.createForm();
    if (this.data.id) {
      this.actionForm.patchValue(this.data);
      this.isEdit = true;
    }
  }
  createForm() {
    this.actionForm = this.fb.group({
      pagename: [{ value: this.data.pagename, disabled: this.isDisabled }],
      name: ['', Validators.required],
      order: ['', [Validators.required]],
      code: ['', [Validators.required]],
    });
  }


  onCancel(): void {
    this.dialogRef.close();
  }

  saveAction(): void {
    if (!this.actionForm.valid) {
      this.actionForm.markAllAsTouched();
      return;
    }
    let action: Action = this.actionForm.value;
    action.pageId = this.data.pageId;
    if (this.data && this.data.id) {
      action.id = this.data.id;
      this.actionService.updateAction(this.data.id, action).subscribe(() => {
        this.toastrService.success(this.translationService.getValue('ACTION_SAVED_SUCCESSFULLY'));
        this.dialogRef.close(this.data);
      });
    } else {
      this.actionService.addAction(action).subscribe(() => {
        this.toastrService.success(this.translationService.getValue('ACTION_SAVED_SUCCESSFULLY'));
        this.dialogRef.close(this.data);
      });
    }
  }
}
