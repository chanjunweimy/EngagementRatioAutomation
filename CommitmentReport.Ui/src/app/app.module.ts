import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { HttpModule } from '@angular/http';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

// modules needed to build calendar
import { CalendarModule } from 'angular-calendar';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppComponent } from './app.component';
import { CalendarUtilModule } from './calendar-util/calendar-util.module';
import { TfsCalendarModule } from './calendar/calendar.module';
import { TfsGanttModule } from './gantt/gantt.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    NgbModule.forRoot(),
    CalendarModule.forRoot(),
    HttpClientModule,
    HttpModule,
    NgbModalModule,
    CalendarUtilModule,
    TfsCalendarModule,
    TfsGanttModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
