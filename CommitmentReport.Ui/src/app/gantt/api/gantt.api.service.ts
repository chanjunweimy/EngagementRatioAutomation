import { Http } from '@angular/http';
import { Injectable } from '@angular/core';
import 'rxjs/add/operator/map';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class GanttApiService {

  constructor(private _http: Http) { }

  getGanttItems(start: string, end: string): Observable<Array<GanttTask>> {
    return this._http.post('/api/TfsGantt/gantt-items', {start: start, end: end}).map(x => {
      const ganttTaskDtos: Array<GanttTaskDto> = x.json() || [];
      const ganttTasks: Array<GanttTask> = [];
      for (const ganttTaskDto of ganttTaskDtos) {
        const task = new GanttTask();
        task.id = ganttTaskDto.id;
        task.start_date = ganttTaskDto.startDate;
        task.text = ganttTaskDto.text;
        task.progress = ganttTaskDto.progress;
        task.duration = ganttTaskDto.duration;
        task.parent = ganttTaskDto.parent;
        task.unscheduled = ganttTaskDto.unscheduled;
        ganttTasks.push(task);
      }
      return ganttTasks;
    });
  }
}

export class GanttTaskDto {
  id: number;
  startDate: string;
  text: string;
  progress: number;
  duration: number;
  parent: number;
  unscheduled: boolean;
}

export class GanttTask {
  id: number;
  start_date: string;
  text: string;
  progress: number;
  duration: number;
  parent: number;
  unscheduled: boolean;
}

export class GanttLink {
  id: number;
  source: number;
  target: number;
  type: string;
}