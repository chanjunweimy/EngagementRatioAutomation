import { Component, OnInit } from '@angular/core';

import { NtApiService } from './api/nt-api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Engagement Ratio UI';

  constructor (private _ntApiService: NtApiService) {

  }

  ngOnInit() {
    this._ntApiService.getDummyWorkItem().subscribe(x => {console.log(x)});  
  }
}
