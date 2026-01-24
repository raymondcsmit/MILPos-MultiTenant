import { Component, Inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { UnitConversation } from '@core/domain-classes/unit-conversation';
import { ToastrService } from '@core/services/toastr.service';
import { UnitConversationService } from '../../core/services/unit-conversation.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { BaseComponent } from '../../base.component';
import { UnitOperatorPipe } from '@shared/pipes/operator.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Operators } from '@core/domain-classes/operator';

@Component({
  selector: 'app-manage-unit-conversation',
  templateUrl: './manage-unit-conversation.component.html',
  styleUrls: ['./manage-unit-conversation.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    MatDialogModule,
    ReactiveFormsModule,
    TranslateModule,
    MatSelectModule,
    UnitOperatorPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class ManageUnitConversationComponent extends BaseComponent implements OnInit {
  isEdit: boolean = false;
  unitOperatorslist: UnitConversation[] = [];
  baseUnits: UnitConversation[] = [];
  unitConversationForm!: UntypedFormGroup;
  isOperator: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<ManageUnitConversationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { unitdata: UnitConversation, units: UnitConversation[] },
    private unitConversationService: UnitConversationService,
    private fb: UntypedFormBuilder,
    private toastrService: ToastrService) {
    super();
    this.getLangDir();
    this.baseUnits = this.data.units.filter(c => !c.parentId);
  }

  unitOperators: { id: string, value: Operators }[] = Object.keys(Operators)
    .filter(key => !isNaN(Number(Operators[key as any])))
    .map(key => ({
      id: key,
      value: Operators[key as keyof typeof Operators]
    }));

  ngOnInit(): void {
    this.createForm();
    this.unitConversationsList();
    if (this.data.unitdata.id) {
      this.unitConversationForm.patchValue(this.data.unitdata);
      this.baseUnits = this.data.units.filter(c => c.id != this.data.unitdata.id && !c.parentId)
      this.isEdit = true;
    }
  }

  createForm() {
    this.unitConversationForm = this.fb.group({
      id: [''],
      name: ['', Validators.required],
      code: ['', Validators.required],
      operator: [''],
      value: [''],
      parentId: ['']
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onCountryChange(unit: any) {
    if (unit) {
      this.isOperator = true;
    }
  }

  unitConversationsList() {
    this.sub$.sink = this.unitConversationService.getAll()
      .subscribe(f => this.unitOperatorslist = [...f]);
  }

  saveUnitConversation(): void {
    if (!this.unitConversationForm.valid) {
      this.unitConversationForm.markAllAsTouched();
      return;
    }
    const unitConversation: UnitConversation = this.unitConversationForm.getRawValue();
    if (this.data && this.data.unitdata.id) {
      this.unitConversationService.update(this.data.unitdata.id, unitConversation).subscribe(c => {
        this.toastrService.success(this.translationService.getValue('UNIT_CONVERSATION_SAVED_SUCCESSFULLY'));
        this.dialogRef.close(c);
      });
    } else {
      this.unitConversationService.add(unitConversation).subscribe(c => {
        this.toastrService.success(this.translationService.getValue('UNIT_CONVERSATION_SAVED_SUCCESSFULLY'));
        this.dialogRef.close(c);
      });
    }
  }
}

