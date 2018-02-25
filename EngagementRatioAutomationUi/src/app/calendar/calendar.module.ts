import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarModule } from 'angular-calendar';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CalendarUtilModule } from '../calendar-util/calendar-util.module';
import { CalendarComponent } from './calendar.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    BrowserAnimationsModule,
    NgbModalModule,
    CalendarModule,
    CalendarUtilModule
  ],
  declarations: [CalendarComponent],
  exports: [CalendarComponent]
})
export class NtCalendarModule {}
