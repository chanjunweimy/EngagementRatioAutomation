import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { HttpModule } from '@angular/http';

// modules needed to build calendar
import { CalendarModule } from 'angular-calendar';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppComponent } from './app.component';
import { CalendarUtilModule } from './calendar-util/calendar-util.module';
import { NtCalendarModule } from './calendar/calendar.module';
import { NtApiService } from './api/nt-api.service';


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
    NtCalendarModule,
    CalendarUtilModule
  ],
  providers: [
    NtApiService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
