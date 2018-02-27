import { Http } from '@angular/http';
import { Injectable } from '@angular/core';
import 'rxjs/add/operator/map';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class NtApiService {

  constructor(private _http: Http) { }

  getDummyWorkItems(): Observable<Array<NtWorkItem>> {
    return this._http.get('/api/TfsTask/dummy-work-item', ).map(x => {
      const ntWorkItems: Array<NtWorkItem> = x.json() || [];
      return ntWorkItems;
    });
  }

  getMyYearlyWorkItems(): Observable<Array<NtWorkItem>> {
    return this._http.get('/api/TfsTask/my-yearly-work-item', ).map(x => {
      const ntWorkItems: Array<NtWorkItem> = x.json() || [];
      return ntWorkItems;
    });
  }

  getMyWorkItems(start: string, end: string): Observable<Array<NtWorkItem>> {
    return this._http.get('/api/TfsTask/my-work-item', {params: {start: start, end: end}}).map(x => {
      const ntWorkItems: Array<NtWorkItem> = x.json() || [];
      return ntWorkItems;
    });
  }

  getWorkItemsByUserName(start: string, end: string, userName: string): Observable<Array<NtWorkItem>> {
    return this._http.get('/api/TfsTask/work-item-individual', {params: {start: start, end: end, userName: userName}}).map(x => {
      const ntWorkItems: Array<NtWorkItem> = x.json() || [];
      return ntWorkItems;
    });
  }

  getWorkItemsByNtTeamMembers(start: string, end: string, ntTeamMembers: NtTeamMember[]): Observable<Array<NtWorkItem>> {
    return this._http.post('/api/TfsTask/work-item-all', {start: start, end: end, ntTeamMembers: ntTeamMembers}).map(x => {
      const ntWorkItems: Array<NtWorkItem> = x.json() || [];
      return ntWorkItems;
    });
  }

  getNtTeamMembers(): Observable<Array<NtTeamMember>> {
    return this._http.get('api/TfsTask/team', ).map(team => {
      const ntTeamMembers: Array<NtTeamMember> = team.json() || [];
      return ntTeamMembers;
    });
  }

  getMyName(): Observable<WindowsUser> {
    return this._http.get('api/TfsTask/my-name', ).map(name => {
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
}

export class NtTeamMember {
  id: string;
  uniqueName: string;
  displayName: string;
}

export class WindowsUser {
  name: string;
}
