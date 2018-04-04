import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { GanttTask, GanttLink } from './api/gantt.api.service';

import 'dhtmlx-gantt';
import {} from '@types/dhtmlxgantt';

@Component({
    selector: 'app-gantt',
    styleUrls: ['gantt.component.less'],
    templateUrl: 'gantt.component.html'
})
export class GanttComponent implements OnInit, AfterViewInit {
    @ViewChild('gantt_here') ganttContainer: ElementRef;

    view = 'week';
    grid_columns = ['title', 'progress'];

    ngOnInit() {
        gantt.config.xml_date = '%Y-%m-%d %H:%i';

        gantt.init(this.ganttContainer.nativeElement);

        const data = [
            {id: 1, text: 'Task #1', start_date: '2017-04-15 00:00', duration: 3, progress: 0.6},
            {id: 2, text: 'Task #2', start_date: '2017-04-18 00:00', duration: 3, progress: 0.4, parent: 1},
            {id: 3, text: 'Task #3', start_date: '2017-04-18 00:00', duration: 61, progress: 0.4},
            {id: 4, text: 'Task #4', start_date: '2017-04-18 00:00', duration: 15, progress: 0.4},
            {id: 5, text: 'Task #2', start_date: '2017-04-18 00:00', duration: 3, progress: 0.4},
            {id: 6, text: 'Task #2', start_date: '2017-04-18 00:00', duration: 3, progress: 0.4},
            {id: 7, text: 'Task #2', start_date: '2017-04-18 00:00', duration: 3, progress: 0.4},
            {id: 8, text: 'Task #2', start_date: '2017-04-18 00:00', duration: 3, progress: 0.4},
            {id: 9, text: 'Task #2', start_date: '2017-04-18 00:00', duration: 3, progress: 0.4},
            {id: 10, text: 'Task #2', start_date: '2017-04-18 00:00', duration: 3, progress: 0.4},
            {id: 11, text: 'Task #2', start_date: '2017-04-18 00:00', duration: 3, progress: 0.4},
            {id: 12, text: 'Task #2', start_date: '2017-04-18 00:00', duration: 3, progress: 0.4},
            {id: 13, text: 'Task #2', start_date: '2017-04-18 00:00', duration: 3, progress: 0.4},
            {id: 14, text: 'Task #2', start_date: '2017-04-18 00:00', duration: 3, progress: 0.4},
            {id: 15, text: 'Task #2', start_date: '2017-04-18 00:00', duration: 3, progress: 0.4},
            {id: 16, text: 'Task #2', start_date: '2017-04-18 00:00', duration: 3, progress: 0.4},
            {id: 17, text: 'Task #2', start_date: '2017-04-18 00:00', duration: 3, progress: 0.4},
            {id: 18, text: 'Task #2', start_date: '2017-04-18 00:00', duration: 3, progress: 0.4},
            {id: 19, text: 'Task #2', start_date: '2017-04-18 00:00', duration: 3, progress: 0.4},
            {id: 20, text: 'Task #2', start_date: '2017-04-18 00:00', duration: 10, progress: 0.4},
            {id: 21, text: 'Task #2', start_date: '2017-04-18 00:00', duration: 3, progress: 0.4},
            {id: 22, text: 'Task #22', start_date: '2017-04-18 00:00', duration: 3, progress: 0.4},
        ];

        const links = [
        ];

        gantt.parse({data, links});
        gantt.config.columns = this.setUpGridArea();
    }

    ngAfterViewInit() {
        this.changeDepth(this.view, null);
    }

    /**
     * Setup the Grid side area with the desired columns
     */
    private setUpGridArea() {
        const default_columns = {
            title: {name: 'text',  label: 'Work Item',  width: '*', tree: true },
            start_date: {name: 'start_date', label: 'Start Date', align: 'center', width: 100},
            end_date: {name: 'end_date', label: 'End Date', align: 'center' , width: 100},
            progress: {name: 'progress',   label: '%',   align: 'center', width: 44, template: (task) => {
                const percent = (( task.progress ? task.progress : 0) * 100);
                return (percent === 100 ? percent : percent.toPrecision(2) ) + '%';
            }},
            add_button: {name: 'add', label: '', width: 44}
        };

        const columns = [];
        this.grid_columns.forEach (column => {
            columns.push(default_columns[column]);
        });
        return columns;

    }

    private changeDepth(depth, el: any) {
        gantt.config.scale_unit = this.view = depth;
        switch (depth) {
            case 'day':
                gantt.config.step = 1;
                gantt.config.date_scale = '%M %d %Y';
            break;
            case 'week':
                gantt.config.step = 1;
                gantt.config.date_scale = '%M %j %Y';
            break;
            case 'month':
                gantt.config.step = 1;
                gantt.config.date_scale = '%M %Y %Y';
            break;
            default:
                gantt.config.scale_unit = this.view = 'week';
                gantt.config.step = 1;
                gantt.config.date_scale = '%M %j %Y';
            break;
        }
        gantt.render();
    }
}
