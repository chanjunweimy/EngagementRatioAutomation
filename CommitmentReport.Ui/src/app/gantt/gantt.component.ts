import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';

import 'dhtmlx-gantt';
import {} from '@types/dhtmlxgantt';

@Component({
    selector: 'app-gantt',
    styleUrls: ['gantt.component.less'],
    templateUrl: 'gantt.component.html'
})
export class GanttComponent implements OnInit {
    @ViewChild('gantt_here') ganttContainer: ElementRef;

    view = 'week';

    ngOnInit() {
        gantt.init(this.ganttContainer.nativeElement);
    }

    private changeDepth(depth, el: any) {
        gantt.config.scale_unit = this.view = depth;
        switch (depth) {
            case 'day':
                gantt.config.step = 1;
                gantt.config.date_scale = '%M %d';
            break;
            case 'week':
                gantt.config.step = 1;
                gantt.config.date_scale = '%M %j';
            break;
            case 'month':
                gantt.config.step = 1;
                gantt.config.date_scale = '%M %Y';
            break;
            default:
                gantt.config.scale_unit = this.view = 'week';
                gantt.config.step = 1;
                gantt.config.date_scale = '%M %j';
            break;
        }
        gantt.render();
    }
}
