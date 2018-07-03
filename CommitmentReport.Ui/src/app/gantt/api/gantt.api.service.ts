import { Http } from '@angular/http';
import { Injectable } from '@angular/core';
import 'rxjs/add/operator/map';
import { Observable } from 'rxjs/Observable';
import { StreamUtils } from 'xlsx/types';

@Injectable()
export class GanttApiService {

  constructor(private _http: Http) { }

  getGanttItems(start: string, end: string, ntTeamMembers: NtTeamMember[]): Observable<Array<GanttTask>> {
    return this._http.post('/api/TfsGantt/gantt-items', {start: start, end: end, ntTeamMembers: ntTeamMembers}).map(x => {
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
        task.state = ganttTaskDto.state;
        if (task.state.toLowerCase() === 'done') {
          task.color = 'grey';
        } else {
          task.color = 'blue';
        }
        ganttTasks.push(task);
      }
      return ganttTasks;
    });
  }

  getNtTeamMembers(): Observable<Array<NtTeamMember>> {
    return this._http.get('/api/TfsTask/team', ).map(team => {
      const ntTeamMembers: Array<NtTeamMember> = team.json() || [];
      console.log(ntTeamMembers);
      return ntTeamMembers;
    });
  }

  getMyName(): Observable<WindowsUser> {
    return this._http.get('/api/TfsTask/my-name', ).map(name => {
      return name.json() || {};
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
  state: string;
}

export class GanttTask {
  id: number;
  start_date: string;
  text: string;
  progress: number;
  duration: number;
  parent: number;
  unscheduled: boolean;
  state: string;
  color: string;
}

export class GanttLink {
  id: number;
  source: number;
  target: number;
  type: string;
}

export class NtTeamMember {
  id: string;
  uniqueName: string;
  displayName: string;
}

export class WindowsUser {
  name: string;
}
