import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef, TemplateRef } from '@angular/core';
import { GanttTask, GanttLink, GanttApiService } from './api/gantt.api.service';

import 'dhtmlx-gantt';
import {} from '@types/dhtmlxgantt';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-gantt',
    styleUrls: ['gantt.component.less'],
    templateUrl: 'gantt.component.html'
})
export class GanttComponent implements OnInit, AfterViewInit {
    @ViewChild('gantt_here') ganttContainer: ElementRef;
    @ViewChild('modalContent') modalContent: TemplateRef<any>;

    view = 'week';
    grid_columns = ['title', 'progress'];

    modalData: {
        title: string
    };

    hasStartFromFilter = false;
    hasEndByFilter = false;

    startDate: Date = new Date();
    endDate: Date = new Date();

    constructor(private _modal: NgbModal,
        private _apiService: GanttApiService,
        private _changeDetectorRef: ChangeDetectorRef) {}

    ngOnInit() {
        gantt.config.xml_date = '%Y-%m-%d %H:%i';

        gantt.init(this.ganttContainer.nativeElement);
        gantt.config.show_progress = true;
        gantt.config.show_unscheduled = true;
        gantt.config.touch = false;
        gantt.config.touch_drag = false;
        gantt.config.touch_feedback = false;
        gantt.config.correct_work_time = false;
        gantt.config.details_on_dblclick = false;
        gantt.config.drag_lightbox = true;
        gantt.config.drag_links = false;
        gantt.config.drag_move = false;
        gantt.config.drag_progress = false;
        gantt.config.drag_resize = false;
        gantt.config.columns = this.setUpGridArea();
    }

    ngAfterViewInit() {
        this.changeDepth(this.view, null);
        this.refresh();
    }

    refresh(): void {
        gantt.clearAll();
        let start: string = null;
        let end: string = null;
        if (this.hasStartFromFilter) {
            start = this.startDate.toDateString();
            gantt.config.start_date = this.startDate;
        }
        if (this.hasEndByFilter) {
            end = this.endDate.toDateString();
            gantt.config.end_date = this.endDate;
        }

        this.modalData = { title: 'Loading Gantt Chart Data...' };
        const ref = this._modal.open(this.modalContent, { size: 'sm',
                                                          windowClass: 'transparent-image',
                                                          backdrop: 'static',
                                                          keyboard: false });
        this._apiService.getGanttItems(start, end).subscribe(ganttTasks => {
            const data = ganttTasks;
            const links = [];
            gantt.parse({data, links});

            if (this.hasStartFromFilter) {
                gantt.config.start_date = this.startDate;
            }
            if (this.hasEndByFilter) {
                gantt.config.end_date = this.endDate;
            }
            ref.close();
        });
    }

    /**
     * Setup the Grid side area with the desired columns
     */
    setUpGridArea() {
        const default_columns = {
            title: {name: 'text',  label: 'Work Item',  width: '*', tree: true },
            start_date: {name: 'start_date', label: 'Start Date', align: 'center', width: 100},
            end_date: {name: 'end_date', label: 'End Date', align: 'center' , width: 100},
            progress: {name: 'progress',   label: '%',   align: 'center', width: 44, template: (task) => {
                const percent = (( task.progress ? task.progress : 0));
                return percent + '%';
            }},
            add_button: {name: 'add', label: '', width: 44}
        };

        const columns = [];
        this.grid_columns.forEach (column => {
            columns.push(default_columns[column]);
        });
        return columns;

    }

    changeDepth(depth, el: any) {
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
