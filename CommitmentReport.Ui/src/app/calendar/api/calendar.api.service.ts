import { Http } from '@angular/http';
import { Injectable } from '@angular/core';
import 'rxjs/add/operator/map';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class CalendarApiService {

  constructor(private _http: Http) { }

  getWorkItemsByNtTeamMembers(start: string, end: string, ntTeamMembers: NtTeamMember[]): Observable<Array<NtWorkItem>> {
    return this._http.post('/api/TfsTask/work-item-all', {start: start, end: end, ntTeamMembers: ntTeamMembers}).map(x => {
      const ntWorkItems: Array<NtWorkItem> = x.json() || [];
      return ntWorkItems;
    });
  }

  getCollapsedWorkItemsByNtTeamMembers(start: string, end: string, ntTeamMembers: NtTeamMember[]):
        Observable<{ [id: string]: NtCollapsedWorkItem[]}> {
    return this._http.post('/api/TfsTask/collapsed-work-item', {start: start, end: end, ntTeamMembers: ntTeamMembers}).map(x => {
      const ntCollapsedWorkItems: { [id: string]: NtCollapsedWorkItem[]} = x.json() || {};
      return ntCollapsedWorkItems;
    });
  }

  getWeeklyWorkItemsByNtTeamMembers(start: string, end: string, ntTeamMembers: NtTeamMember[]):
        Observable<{ [id: string]: NtWeeklyWorkItem[]}> {
    return this._http.post('/api/TfsTask/weekly-work-item', {start: start, end: end, ntTeamMembers: ntTeamMembers}).map(x => {
      const ntWeeklyWorkItems: { [id: string]: NtWeeklyWorkItem[]} = x.json() || {};
      return ntWeeklyWorkItems;
    });
  }

  getNtTeamMembers(): Observable<Array<NtTeamMember>> {
    return this._http.get('/api/TfsTask/team', ).map(team => {
      const ntTeamMembers: Array<NtTeamMember> = team.json() || [];
      return ntTeamMembers;
    });
  }

  getMyName(): Observable<WindowsUser> {
    return this._http.get('/api/TfsTask/my-name', ).map(name => {
      return name.json() || {};
    });
  }
}

export class NtWorkItem {
  id: number;
  workItemType: string;
  activity: string;
  title: string;
  assignedTo: string;
  state: string;
  iterationPath: string;
  closedDate: string;
  areaPath: string;
  duration: number;
  product: string;
  teamProject: string;
}

export class NtTeamMember {
  id: string;
  uniqueName: string;
  displayName: string;
}

export class WindowsUser {
  name: string;
}

export class NtCollapsedWorkItem {
  employee: string;
  date: string;
  title: string;
  // durationDemonstration: number;
  durationDeployment: number;
  durationDesign: number;
  durationDevelopment: number;
  durationDocumentation: number;
  durationMarketing: number;
  durationRequirements: number;
  durationTesting: number;
  durationOthers: number;
  durationNA: number;
  durationTotal: number;
  product: {[id: string]: number};
  workTasksList: string[];
}

export class NtWeeklyWorkItem {
  employee: string;
  weekStartDate: string;
  weekEndDate: string;
  title: string;
  // durationDemonstration: number;
  durationDeployment: number;
  durationDesign: number;
  durationDevelopment: number;
  durationDocumentation: number;
  durationMarketing: number;
  durationRequirements: number;
  durationTesting: number;
  durationOthers: number;
  durationNA: number;
  durationTotal: number;
  product: {[id: string]: number};
  workTasksList: string[];
}
