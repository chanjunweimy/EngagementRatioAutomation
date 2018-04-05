import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CalendarUtilModule } from '../calendar-util/calendar-util.module';
import { GanttComponent } from './gantt.component';
import { GanttApiService } from './api/gantt.api.service';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    BrowserAnimationsModule,
    NgbModalModule,
    CalendarUtilModule
  ],
  declarations: [GanttComponent],
  exports: [GanttComponent],
  providers: [
    GanttApiService
  ]
})
export class TfsGanttModule {}
