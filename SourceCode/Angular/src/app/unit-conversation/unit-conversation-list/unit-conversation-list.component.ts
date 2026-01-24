import { Component, OnInit } from '@angular/core';
import { UnitConversation } from '@core/domain-classes/unit-conversation';
import { ToastrService } from '@core/services/toastr.service';
import { UnitConversationService } from '../../core/services/unit-conversation.service';
import { Observable } from 'rxjs';
import { UnitConversationListPresentationComponent } from '../unit-conversation-list-presentation/unit-conversation-list-presentation.component';
import { AsyncPipe } from '@angular/common';
import { BaseComponent } from '../../base.component';

@Component({
  selector: 'app-unit-conversation-list',
  templateUrl: './unit-conversation-list.component.html',
  styleUrls: ['./unit-conversation-list.component.scss'],
  standalone: true,
  imports: [
    UnitConversationListPresentationComponent,
    AsyncPipe
  ]
})
export class UnitConversationListComponent extends BaseComponent implements OnInit {
  unitConversations$!: Observable<UnitConversation[]>;
  constructor(
    private unitConversationService: UnitConversationService,
    private toastrService: ToastrService) {
    super();
  }

  ngOnInit(): void {
    this.getUnitConversations();
  }

  getUnitConversations(): void {
    this.unitConversations$ = this.unitConversationService.getAll();
  }

  deleteUnitConversation(id: string): void {
    this.unitConversationService.delete(id).subscribe(d => {
      this.toastrService.success(this.translationService.getValue('UNIT_CONVERSATION_DELETED_SUCCESSFULLY'));
      this.getUnitConversations();
    });
  }

  manageUnitConversation(category: UnitConversation): void {
    this.getUnitConversations();
  }
}
