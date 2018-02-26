import { Http } from '@angular/http';
import { Injectable } from '@angular/core';
import 'rxjs/add/operator/map';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class NtApiService {

  constructor(private _http: Http) { }

  getDummyWorkItem(): Observable<Array<NtWorkItem>> {
    return this._http.get('/api/TfsTask/dummy-work-item', ).map(x => {
      const ntWorkItem: Array<NtWorkItem> = x.json() || {};
      return ntWorkItem;
    });
  }
}

export class NtWorkItem {
  Id: number;
  WorkItemType: string;
  Activity: string;
  Title: string;
  AssignedTo: string;
  State: string;
  IterationPath: string;
  ClosedDate: string;
  AreaPath: string;
  Duration: number;
  Product: string;
}
