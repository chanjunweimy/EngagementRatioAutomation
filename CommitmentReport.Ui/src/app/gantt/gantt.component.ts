import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef, TemplateRef } from '@angular/core';
import { GanttTask, GanttLink, GanttApiService, NtTeamMember } from './api/gantt.api.service';

import 'dhtmlx-gantt';
import 'dhtmlx-gantt/codebase/ext/dhtmlxgantt_tooltip';
import {} from '@types/dhtmlxgantt';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin } from 'rxjs/observable/forkJoin';

@Component({
    selector: 'app-gantt',
    styleUrls: ['gantt.component.less'],
    templateUrl: 'gantt.component.html'
})
export class GanttComponent implements OnInit, AfterViewInit {
    @ViewChild('gantt_here') ganttContainer: ElementRef;
    @ViewChild('modalContent') modalContent: TemplateRef<any>;

    view = 'week';
    grid_columns = ['title', 'state', 'progress'];

    modalData: {
        title: string
    };

    hasStartFromFilter = false;
    hasEndByFilter = false;

    startDate: Date = new Date();
    endDate: Date = new Date();

    teamMembers: NtTeamMember[] = [];
    isTeamMemberSelected: {[id: string]: boolean } = {};
    userName = '';

    constructor(private _modal: NgbModal,
        private _apiService: GanttApiService,
        private _changeDetectorRef: ChangeDetectorRef) {}

    ngOnInit() {
        this.getNtTeamMembers();

        gantt.config.xml_date = '%Y-%m-%d %H:%i';
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
        gantt.config.subscales = [
            { unit: 'year', step: 1, date: '%Y' }
        ];

        gantt.attachEvent('onTaskDblClick', id => {
            window.open('http://aws-tfs:8080/tfs/DevSg/DevSg/_workitems?id=' + id, '_blank');
        });
        gantt.attachEvent('onBeforeGanttRender', () => {
            const range = gantt.getSubtaskDates();
            const scaleUnit = gantt.getState().scale_unit;
            if (this.hasStartFromFilter) {
                gantt.config.start_date = this.startDate;
            }
            if (this.hasEndByFilter) {
                gantt.config.end_date = this.endDate;
            }
            if (range.start_date && range.end_date) {
                if (!this.hasStartFromFilter) {
                    gantt.config.start_date = gantt.calculateEndDate(range.start_date, -1, scaleUnit);
                }
                if (!this.hasEndByFilter) {
                    gantt.config.end_date = gantt.calculateEndDate(range.end_date, 1, scaleUnit);
                }
            }
         });

        gantt.templates.tooltip_text = (start, end, task) => {
            return '<b>Task:</b> ' + task.text;
        };
        gantt.config.tooltip_hide_timeout = 5000;

        gantt.init(this.ganttContainer.nativeElement);
    }

    ngAfterViewInit() {
        this.changeDepth(this.view, null);
        // this.fetchData();
        // this.refresh();
    }

    updateDateRange(): void {
        gantt.init(this.ganttContainer.nativeElement);
    }

    refresh(): void {
        gantt.clearAll();
        this.fetchData();
    }

    getSelectedNtTeamMembers(): NtTeamMember[] {
        const ntTeamMembers: NtTeamMember[] = [];
        for (const teamMember of this.teamMembers) {
            if (this.isTeamMemberSelected[teamMember.id]) {
                ntTeamMembers.push(teamMember);
            }
        }
        return ntTeamMembers;
    }

    getNtTeamMembers(): void {
        forkJoin(this._apiService.getMyName(), this._apiService.getNtTeamMembers()).subscribe(results => {
            if (results && results.length === 2) {
                this.userName = results[0].name;
                const ntTeamMembers = results[1];
                if (ntTeamMembers.length === 0) {
                    return;
                }
                this.teamMembers = ntTeamMembers;
                this.setMineSelectedOnly();
                this._changeDetectorRef.detectChanges();
            }
        });
    }

    setMineSelectedOnly(): void {
        for (const ntTeamMember of this.teamMembers) {
            if (ntTeamMember.uniqueName.toLowerCase() === this.userName.toLowerCase()) {
                this.isTeamMemberSelected[ntTeamMember.id] = true;
            } else {
                this.isTeamMemberSelected[ntTeamMember.id] = false;
            }
        }
    }

    fetchData(): void {
        this.modalData = { title: 'Loading Gantt Chart Data...' };
        const ref = this._modal.open(this.modalContent, { size: 'sm',
                                                          windowClass: 'transparent-image',
                                                          backdrop: 'static',
                                                          keyboard: false });
        let startD: string = null;
        let endD: string = null;
        if (this.hasStartFromFilter) {
            startD = this.startDate.toDateString();
        }
        if (this.hasEndByFilter) {
            endD = this.endDate.toDateString();
        }

        this._apiService.getGanttItems(startD, endD, this.getSelectedNtTeamMembers()).subscribe(ganttTasks => {
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
            state: {name: 'state', label: 'State', align: 'center', width: 100 },
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
                gantt.config.date_scale = '%M %d';
            break;
            case 'week':
                gantt.config.step = 1;
                gantt.config.date_scale = '%M %d';
            break;
            case 'month':
                gantt.config.step = 1;
                gantt.config.date_scale = '%M';
            break;
            default:
                gantt.config.scale_unit = this.view = 'week';
                gantt.config.step = 1;
                gantt.config.date_scale = '%M %d %Y';
            break;
        }
        gantt.render();
    }
}
