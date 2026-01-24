import { Component, inject, Renderer2, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { forkJoin } from 'rxjs';
import { FullCalendarModule } from '@fullcalendar/angular';
import { FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { DashboardService } from '../dashboard/dashboard.service';
import { CalenderReminderDto } from './model/calender-reminder';
import { CommonError } from '@core/error-handler/common-error';
import { AddReminderComponent } from '../reminder/add-reminder/add-reminder.component';
import { TruncatePipe } from '@shared/pipes/truncate.pipe';



@Component({
  selector: 'app-calendar-view',
  imports: [
    TranslateModule,
    PageHelpTextComponent,
    FullCalendarModule,
  ],
  templateUrl: './calendar-view.html',
  styleUrl: './calendar-view.scss'
})
export class CalendarView {
  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;
  events: any[] = [];
  renderer = inject(Renderer2);

  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    dateClick: (arg: any) => this.handleDateClick(arg),
    datesSet: (arg: any) => this.handleDatesSet(arg),
    dayCellDidMount: this.addDateHoverEffect.bind(this),
  };

  dashboardService = inject(DashboardService);
  dialog = inject(MatDialog);

  ngOnInit(): void { }

  handleDateClick(arg: any) {
    this.openReminderDialog({
      selectedDate: arg.date,
      dateStr: arg.dateStr
    });
  }

  openReminderDialog(data: any, clickEvent?: Event) {
    // Prevent event bubbling to avoid double calls
    if (clickEvent) {
      clickEvent.stopPropagation();
      clickEvent.preventDefault();
    }

    // Determine dialog data based on whether it's an event click or date click
    const dialogData = data.extendedProps ? {
      // Event click - editing existing reminder
      reminderId: data.extendedProps?.remiderId,
      selectedDate: data.start,
      isEdit: true
    } : {
      // Date click - creating new reminder
      selectedDate: data.selectedDate,
      dateStr: data.dateStr,
      isEdit: false
    };

    // Open dialog for editing/viewing or creating reminder
    const dialogRef = this.dialog.open(AddReminderComponent, {
      data: dialogData,
      maxWidth: '60vw',
      maxHeight: '90vh',
      width: '100%',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.handleDatesSet();
      }
    });
  }

  handleDatesSet(arg?: any) {
    const currentDate = this.calendarComponent
      ?.getApi()
      .getCurrentData().currentDate;
    this.gerReminders(currentDate.getMonth() + 1, currentDate.getFullYear());
  }

  gerReminders(month: number, year: number) {
    this.events = [];
    const dailyReminders = this.dashboardService.getDailyReminders(month, year);
    const weeklyReminders = this.dashboardService.getWeeklyReminders(
      month,
      year
    );
    const monthlyReminders = this.dashboardService.getMonthlyReminders(
      month,
      year
    );
    const quarterlyReminders = this.dashboardService.getQuarterlyReminders(
      month,
      year
    );
    const halfYearlyReminders = this.dashboardService.getHalfYearlyReminders(
      month,
      year
    );
    const yearlyReminders = this.dashboardService.getYearlyReminders(
      month,
      year
    );
    const oneTimeReminders = this.dashboardService.getOneTimeReminders(
      month,
      year
    );

    const allEvents$ = [
      dailyReminders,
      weeklyReminders,
      monthlyReminders,
      quarterlyReminders,
      halfYearlyReminders,
      yearlyReminders,
      oneTimeReminders,
    ];

    forkJoin(allEvents$).subscribe((results: (CalenderReminderDto[] | CommonError)[]) => {
      results.forEach((reminders) => {
        if (Array.isArray(reminders)) {
          this.addEvent(reminders);
        } else {
          console.error(reminders);
        }
      });
    });
  }

  addEvent(calenderReminder: CalenderReminderDto[]) {
    const event = calenderReminder.map((c) => {
      return {
        title: new TruncatePipe().transform(c?.title, '30'),
        start: new Date(c.start.toString()),
        end: new Date(c.end.toString()),
        extendedProps: {
          remiderId: c?.id,
          description: c?.title,
        },
      };
    });
    this.events = this.events.concat(event);
  }

  addDateHoverEffect(info: any) {
    const dateCell = info.el;

    // Add custom CSS class for styling
    this.renderer.addClass(dateCell, 'date-cell-hover');

    // Add hover listeners
    this.renderer.listen(dateCell, 'mouseenter', () => {
      this.renderer.setStyle(dateCell, 'background-color', 'rgba(0, 123, 255, 0.27)');
      this.renderer.setStyle(dateCell, 'cursor', 'pointer');
      this.renderer.setStyle(dateCell, 'transition', 'all 0.2s ease-in-out');
      this.renderer.setStyle(dateCell, 'box-shadow', '0 2px 8px rgba(0, 0, 0, 0.15)');
    });

    this.renderer.listen(dateCell, 'mouseleave', () => {
      this.renderer.setStyle(dateCell, 'background-color', '');
      this.renderer.setStyle(dateCell, 'cursor', '');
      this.renderer.setStyle(dateCell, 'transform', '');
      this.renderer.setStyle(dateCell, 'box-shadow', '');
    });
  }
}
