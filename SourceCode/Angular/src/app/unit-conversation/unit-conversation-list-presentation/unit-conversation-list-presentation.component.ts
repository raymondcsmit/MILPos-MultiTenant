import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { UnitConversation } from '@core/domain-classes/unit-conversation';
import { ManageUnitConversationComponent } from '../manage-unit-conversation/manage-unit-conversation.component';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { BaseComponent } from '../../base.component';
import { UnitOperatorPipe } from '@shared/pipes/operator.pipe';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NgClass } from '@angular/common';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-unit-conversation-list-presentation',
  templateUrl: './unit-conversation-list-presentation.component.html',
  styleUrls: ['./unit-conversation-list-presentation.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    UnitOperatorPipe,
    MatMenuModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    NgClass
  ]
})
export class UnitConversationListPresentationComponent extends BaseComponent implements OnInit {
  @Input() unitConversations: UnitConversation[] | null = [];
  @Output() addEditUnitConversationHandler: EventEmitter<UnitConversation> = new EventEmitter<UnitConversation>();
  @Output() deleteUnitConversationHandler: EventEmitter<string> = new EventEmitter<string>();
  columnsToDisplay: string[] = ['action', 'name', 'code', 'baseUnitName', 'operator', 'value'];
  expandedElement!: UnitConversation | null;
  constructor(
    private dialog: MatDialog,
    private commonDialogService: CommonDialogService,
    private toastrService: ToastrService,
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
  }

  deleteUnitConversation(category: UnitConversation): void {
    this.sub$.sink = this.commonDialogService
      .deleteConformationDialog(`${this.translationService.getValue('ARE_YOU_SURE_YOU_WANT_TO_DELETE')} ${category.name}`)
      .subscribe(isTrue => {
        if (isTrue) {
          this.deleteUnitConversationHandler.emit(category.id);
        }
      });
  }

  manageUnitConversation(unitdata: UnitConversation | null): void {
    const dialogRef = this.dialog.open(ManageUnitConversationComponent, {
      width: '80vh',
      data: {
        unitdata: Object.assign({}, unitdata),
        units: this.unitConversations
      }
    });

    this.sub$.sink = dialogRef.afterClosed()
      .subscribe((result: UnitConversation) => {
        if (result) {
          this.addEditUnitConversationHandler.emit(result);
        }
      });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any): number {
    if (row) {
      return this.unitConversations?.indexOf(row) ?? -1;
    }
    return -1;
  }
}
