import { Http } from '@angular/http';
import { Injectable } from '@angular/core';
import 'rxjs/add/operator/map';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class NtApiService {

  constructor(private _http: Http) { }

  getDummyWorkItem(): Observable<Array<NtWorkItem>> {
    return this._http.get('/api/TfsTask/dummy-work-item', ).map(x => {
      const ntWorkItem: Array<NtWorkItem> = x.json() || [];
      return ntWorkItem;
    });
  }

  getAllWorkItem(): Observable<Array<NtWorkItem>> {
    return this._http.get('/api/TfsTask/all-work-item', ).map(x => {
      const ntWorkItem: Array<NtWorkItem> = x.json() || [];
      return ntWorkItem;
    });
  }

  getWorkItem(start: string, end: string): Observable<Array<NtWorkItem>> {
    return this._http.get('/api/TfsTask/work-item', {params: {start: start, end: end}}).map(x => {
      const ntWorkItem: Array<NtWorkItem> = x.json() || [];
      return ntWorkItem;
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
