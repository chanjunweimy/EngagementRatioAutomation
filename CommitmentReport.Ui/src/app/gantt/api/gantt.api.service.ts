import { Http } from '@angular/http';
import { Injectable } from '@angular/core';
import 'rxjs/add/operator/map';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class GanttApiService {

  constructor(private _http: Http) { }

}

export class GanttTask {
  id: number;
  start_date: string;
  text: string;
  progress: number;
  duration: number;
  parent: number;
}

export class GanttLink {
  id: number;
  source: number;
  target: number;
  type: string;
}
