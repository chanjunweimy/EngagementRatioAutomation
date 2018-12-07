import {
    Component,
    ChangeDetectionStrategy,
    ViewChild,
    TemplateRef,
    AfterViewInit,
    ChangeDetectorRef,
    OnInit
} from '@angular/core';
import {
    startOfDay,
    endOfDay,
    subDays,
    addDays,
    endOfMonth,
    isSameDay,
    isSameMonth,
    addHours,
    isLastDayOfMonth,
    compareAsc,
    lastDayOfMonth,
    parse,
    startOfWeek,
    isWeekend,
    isSaturday,
    isSunday
} from 'date-fns';
import { Subject } from 'rxjs/Subject';
import { NgbModal, NgbDateStruct, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

import {
    CalendarEvent,
    CalendarEventAction,
    CalendarEventTimesChangedEvent
} from 'angular-calendar';
import { forkJoin } from 'rxjs/observable/forkJoin';

import { CalendarApiService, NtWorkItem, NtTeamMember, NtCollapsedWorkItem, NtWeeklyWorkItem } from './api/calendar.api.service';

import * as XLSX from 'xlsx';

type AOA = any[][];

const colors: any = {
    red: {
        primary: '#ad2121',
        secondary: '#FAE3E3'
    },
    blue: {
        primary: '#1e90ff',
        secondary: '#D1E8FF'
    },
    yellow: {
        primary: '#e3bc08',
        secondary: '#FDF1BA'
    }
};

enum ExcelType {
    daily = 1,
    weekly = 2
}

@Component({
    selector: 'app-calendar-component',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['calendar.component.less'],
    templateUrl: 'calendar.component.html'
})
export class CalendarComponent implements AfterViewInit, OnInit {
    @ViewChild('modalContent') modalContent: TemplateRef<any>;

    view = 'month';
    viewString = 'month';

    userName = '';

    viewDate: Date = new Date();

    modalData: {
        title: string
    };

    workItemDict: {
        [id: string]: NtWorkItem
    } = {};

    actions: CalendarEventAction[] = [
        {
            label: '<i class="fa fa-fw fa-pencil"></i>',
            onClick: ({ event }: { event: CalendarEvent }): void => {
                this.handleEvent('Edited', event);
            }
        }
        /*
        , {
            label: '<i class="fa fa-fw fa-times"></i>',
            onClick: ({ event }: { event: CalendarEvent }): void => {
                this.events = this.events.filter(iEvent => iEvent !== event);
                this.handleEvent('Deleted', event);
            }
        }
        */
    ];

    refresh: Subject<any> = new Subject();

    events: CalendarEvent[] = [
    ];

    teamMembers: NtTeamMember[] = [];

    isTeamMemberSelected: {[id: string]: boolean } = {};

    startDate: Date = new Date();

    endDate: Date = new Date();

    isCollapse: boolean;

    // excel
    excelWopts: XLSX.WritingOptions = { bookType: 'xlsx', type: 'array' };

    excelFileName = 'SoftwareDevelopmentCost_LaborCost_Allocation.xlsx';

    EXCEL_EXT = '.xlsx';

    EXCEL_HEADER_EMPTY = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];

    EXCEL_HEADER_1 = ['', '', '', '', '', 'Duration', '', '', '', '', '', '', '', '', '', ''];

    EXCEL_HEADER_2 = ['Employee', 'Date', 'Remark', 'Hours Engaged', 'Title', /*'Demonstration',*/ 'Deployment', 'Design',
                    'Development', 'Documentation', 'Marketing', 'Requirements', 'Testing', 'Others', 'N/A', 'Total', 'Mismatch'];

    EXCEL_HEADER_DICT = {
        EMPLOYEE: 0,
        DATE: 1,
        REMARK: 2,
        EH: 3,
        TITLE: 4,
        /*
        DURATION_DEMONSTRATION: 5,
        DURATION_DEPLOYMENT: 6,
        DURATION_DESIGN: 7,
        DURATION_DEVELOPMENT: 8,
        DURATION_DOCUMENTATION: 9,
        DURATION_MARKETING: 10,
        DURATION_REQUIREMENTS: 11,
        DURATION_TESTING: 12,
        DURATION_OTHERS: 13,
        DURATION_NA: 14,
        DURATION_TOTAL: 15,
        MISMATCH: 16
        */
        DURATION_DEPLOYMENT: 5,
        DURATION_DESIGN: 6,
        DURATION_DEVELOPMENT: 7,
        DURATION_DOCUMENTATION: 8,
        DURATION_MARKETING: 9,
        DURATION_REQUIREMENTS: 10,
        DURATION_TESTING: 11,
        DURATION_OTHERS: 12,
        DURATION_NA: 13,
        DURATION_TOTAL: 14,
        MISMATCH: 15
    };

    EXCEL_WEEK_HEADER_1 = ['', '', '', '', '', '', 'Duration', '', '', '', '', '', '', '', '', '', '', ''];

    EXCEL_WEEK_HEADER_2 = ['Employee', 'Week StartDate', 'Week EndDate', 'Remark', 'Hours Engaged', 'Title', 'Deployment', 'Design',
                    'Development', 'Documentation', 'Marketing', 'Requirements', 'Testing', 'Others', 'N/A', 'Total', 'Mismatch'];

    EXCEL_WEEK_HEADER_DICT = {
        EMPLOYEE: 0,
        WEEK_STARTDATE: 1,
        WEEK_ENDDATE: 2,
        REMARK: 3,
        EH: 4,
        TITLE: 5,
        DURATION_DEPLOYMENT: 6,
        DURATION_DESIGN: 7,
        DURATION_DEVELOPMENT: 8,
        DURATION_DOCUMENTATION: 9,
        DURATION_MARKETING: 10,
        DURATION_REQUIREMENTS: 11,
        DURATION_TESTING: 12,
        DURATION_OTHERS: 13,
        DURATION_NA: 14,
        DURATION_TOTAL: 15,
        MISMATCH: 16
    };

    // JustLogin
    JUSTLOGIN_HEADER_DICT = {
        EMPLOYEE: 'Employee',
        DATE: 'Date',
        DAY: 'Day',
        IN: 'In',
        OUT: 'Out',
        REMARKS: 'Remarks',
        WH: 'Hours Worked',
        OT2: 'OT2 (Hrs.)'
    };

    JUSTLOGIN_NAME_DICT = {
        'Ai Matsuoka': 'Ai Matsuoka',
        'Chan Jun Wei': 'Chan Jun Wei',
        'Chang Hai Bin': 'Chang Hai Bin',
        'Chen Penghao': 'Chen Penghao',
        'Lee Chung': 'Chung Lee',
        'Shaoxin Luan': 'Shaoxin Luan',
        'Siaw Kian Zhong': 'Kian Zhong Siaw',
        'Wan Youyi': 'Youyi, Wan'
    };

    DATE_SEPARATORS = ['-', '/'];

    justLoginDict: {[id: string]:
                        {[id: string]: {
                            in: string,
                            remarks: string,
                            engagedHour: number
                        }}} = {};

    justLoginWeekDict: {[id: string]:
                            {[id: string]: {
                                remarks: string,
                                engagedHour: number
                            }}} = {};

    justLoginLeaveDict: {[id: string]:
                            {[id: string]: {
                                curMonthLeave: number,
                                nextMonthLeave: number
                                    }}} = {};

    justLoginMonthlyHourDict: {[id: string]:
        {[id: string]: number }} = {};

    justLoginCounter = 0;

    justLoginRef: NgbModalRef;

    DAY_CONSTS = {
        MONDAY: 0,
        TUESDAY: 1,
        WEDNESDAY: 2,
        THURSDAY: 3,
        FRIDAY: 4,
        SATURDAY: 5,
        SUNDAY: 6
    };

    activeDayIsOpen = true;

    private readonly EXCEL_TASK_HEADER = ['ID', 'Task'];

    constructor(private _modal: NgbModal,
                private _apiService: CalendarApiService,
                private _changeDetectorRef: ChangeDetectorRef) {}

    ngOnInit() {
        this.isCollapse = false;
        this.getNtTeamMembers();
    }

    ngAfterViewInit() {
    }

    weekInit() {
        this.view = 'week';
        this.viewString = this.view;
        this.getWeeklyWorkItem(this.viewDate);
    }

    monthInit() {
        this.view = 'month';
        this.viewString = this.view;
        this.getMontlyWorkItem(this.viewDate);
    }

    iterationInit() {
        this.view = 'iteration';
        this.viewString = 'month';
    }

    dayClicked({ date, events }: { date: Date; events: CalendarEvent[] }): void {
        if (isSameMonth(date, this.viewDate)) {
            if (
                (isSameDay(this.viewDate, date) && this.activeDayIsOpen === true) ||
                events.length === 0
            ) {
                this.activeDayIsOpen = false;
            } else {
                this.activeDayIsOpen = true;
                this.viewDate = date;
            }
        }
    }

    viewDateChange(date: Date): void {
        this.activeDayIsOpen = false;

        this.getViewWorkItem();
    }

    handleEvent(action: string, event: CalendarEvent): void {
        if (!this.isCollapse) {
            const workItem = this.workItemDict[event.title];
            if (workItem.teamProject.toLowerCase() === 'devsg') {
                window.open('http://aws-tfs:8080/tfs/DevSg/DevSg/_workitems?id=' + workItem.id, '_blank');
            } else if (workItem.teamProject.toLowerCase() === 'misc sg') {
                window.open('http://aws-tfs:8080/tfs/NumtechSg/MISC%20Sg/_workitems?id=' + workItem.id, '_blank');
            }
        }
    }

    addEvent(): void {
        /*
        this.events.push(
            {
                title: 'New event',
                start: startOfDay(new Date()),
                end: endOfDay(new Date()),
                color: colors.red,
                draggable: true,
                resizable: {
                    beforeStart: true,
                    afterEnd: true
                }
            }
        );
        */
        this.refresh.next();
    }

    getAllMembers(): void {
        for (const teamMember of this.teamMembers) {
            this.isTeamMemberSelected[teamMember.id] = true;
        }
        // this.getViewWorkItem();
    }

    getMine(): void {
        this.setMineSelectedOnly();
        // this.getViewWorkItem();
    }

    exportToDailyCsv(): void {
        this.modalData = { title: 'Exporting According to Daily Tasks...' };
        const ref = this._modal.open(this.modalContent, { size: 'sm',
                                                          windowClass: 'transparent-image',
                                                          backdrop: 'static',
                                                          keyboard: false });
        const ntTeamMembers = this.getSelectedNtTeamMembers();
        this._apiService.getCollapsedWorkItemsByNtTeamMembers(this.startDate.toDateString(), this.endDate.toDateString(), ntTeamMembers)
            .subscribe(collapsedWorkItems => {
                this.createDailyExcel(collapsedWorkItems, this.startDate, this.endDate);
                ref.close();
                this._changeDetectorRef.detectChanges();
            });
    }

    exportToWeeklyCsv(): void {
        this.modalData = { title: 'Exporting According to Weekly Tasks...' };
        const ref = this._modal.open(this.modalContent, { size: 'sm',
                                                          windowClass: 'transparent-image',
                                                          backdrop: 'static',
                                                          keyboard: false });
        const ntTeamMembers = this.getSelectedNtTeamMembers();
        this._apiService.getWeeklyWorkItemsByNtTeamMembers(this.startDate.toDateString(), this.endDate.toDateString(), ntTeamMembers)
            .subscribe(weeklyWorkItems => {
                this.createWeeklyExcel(weeklyWorkItems, this.startDate, this.endDate);
                ref.close();
                this._changeDetectorRef.detectChanges();
            });
    }

    onFileChange(evt: any) {
        /* wire up file reader */
        const target: DataTransfer = <DataTransfer>(evt.target);
        this.justLoginDict = {};
        this.justLoginWeekDict = {};
        this.justLoginLeaveDict = {};
        this.justLoginMonthlyHourDict = {};

        this.justLoginCounter = target.files.length;
        let fileString = 'files';
        if (target.files.length <= 1) {
            fileString = 'file';
        }
        this.modalData = { title: 'Uploading ' + this.justLoginCounter + fileString };
        this.justLoginRef = this._modal.open(this.modalContent, { size: 'sm',
                                                          windowClass: 'transparent-image',
                                                          backdrop: 'static',
                                                          keyboard: false });

        for (const fileIndex in target.files) {
            if (!target.files.hasOwnProperty(fileIndex)) {
                continue;
            }
            const reader: FileReader = new FileReader();
            reader.onload = (e: any) => this.fileOnLoad(e);
            reader.readAsBinaryString(target.files[fileIndex]);
        }
    }

    collapse() {
        // this.isCollapse = true;
        this.getViewWorkItem();
    }

    // ============================================= HELPER START =========================================================

    fileOnLoad(e: any) {
        this.justLoginCounter--;

        /* read workbook */
        const bstr: string = e.target.result;
        const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

        /* grab first sheet */
        const wsname: string = wb.SheetNames[0];
        const ws: XLSX.WorkSheet = wb.Sheets[wsname];

        /* save data */
        const data = <AOA>(XLSX.utils.sheet_to_json(ws, { header: 1 }));
        const header = data[0];
        const headerDict = {};
        for (let i = 0; i < header.length; i++) {
            let title = header[i];
            title = title.trim();
            if (title !== this.JUSTLOGIN_HEADER_DICT.EMPLOYEE &&
                title !== this.JUSTLOGIN_HEADER_DICT.DATE &&
                title !== this.JUSTLOGIN_HEADER_DICT.DAY &&
                title !== this.JUSTLOGIN_HEADER_DICT.IN &&
                title !== this.JUSTLOGIN_HEADER_DICT.OUT &&
                title !== this.JUSTLOGIN_HEADER_DICT.WH &&
                title !== this.JUSTLOGIN_HEADER_DICT.REMARKS &&
                title !== this.JUSTLOGIN_HEADER_DICT.OT2) {
                continue;
            }
            headerDict[title] = i;
        }
        for (let i = 1; i < data.length; i++) {
            const dateString: string = data[i][headerDict[this.JUSTLOGIN_HEADER_DICT.DATE]].trim();
            let tokens: string[] = [];
            for (const separator of this.DATE_SEPARATORS) {
                if (dateString.includes(separator)) {
                    tokens = dateString.split(separator);
                    if (tokens[2].length === 2) {
                        tokens[2] = '20' + tokens[2];
                    }
                }
            }

            let employee = data[i][headerDict[this.JUSTLOGIN_HEADER_DICT.EMPLOYEE]];
            employee = this.JUSTLOGIN_NAME_DICT[employee];

            let curDate: Date;
            let date: string;
            let weekStartDate: Date = new Date();
            if (tokens.length >= 3) {
                curDate = new Date(+tokens[2], +tokens[1] - 1, +tokens[0]);
                weekStartDate = startOfWeek(curDate, {weekStartsOn: 1});
                date = curDate.toDateString();
            }

            if (!this.justLoginLeaveDict.hasOwnProperty(employee)) {
                this.justLoginLeaveDict[employee] = {};
            }

            if (!this.justLoginLeaveDict[employee].hasOwnProperty(weekStartDate.toDateString())) {
                this.justLoginLeaveDict[employee][weekStartDate.toDateString()] = {
                    curMonthLeave: 0,
                    nextMonthLeave: 0
                };
            }

            let inOffice: string;
            let inOfficeDate: Date;
            let outOfficeDate: Date;
            if (data[i][headerDict[this.JUSTLOGIN_HEADER_DICT.IN]].trim() === '-') {
                inOffice = undefined;
            } else {
                inOfficeDate = new Date(date + ' '
                    + data[i][headerDict[this.JUSTLOGIN_HEADER_DICT.IN]]);
                outOfficeDate = new Date(date + ' '
                    + data[i][headerDict[this.JUSTLOGIN_HEADER_DICT.OUT]]);
                inOffice = inOfficeDate.toTimeString();
            }
            let remarks: string = data[i][headerDict[this.JUSTLOGIN_HEADER_DICT.REMARKS]];

            let engagedHour = +data[i][headerDict[this.JUSTLOGIN_HEADER_DICT.WH]];
            if (!inOffice) {
                // definitely full day leave
                engagedHour = 0;
                if (isSameMonth(weekStartDate, date) && !isSaturday(date) && !isSunday(date)) {
                    this.justLoginLeaveDict[employee][weekStartDate.toDateString()].curMonthLeave += 1;
                } else if ((!isSameMonth(weekStartDate, date) && !isSaturday(date) && !isSunday(date))) {
                    this.justLoginLeaveDict[employee][weekStartDate.toDateString()].nextMonthLeave += 1;
                }
            } else if (remarks && (remarks.toLowerCase().includes('annual') || remarks.toLowerCase().includes('sick'))) {
                const actualHours = (outOfficeDate.getTime() - inOfficeDate.getTime() ) / (1000 * 60 * 60);
                const actualDiff = engagedHour - actualHours + 1;

                // console.log(employee);
                // console.log(inOfficeDate.toDateString());
                // console.log(outOfficeDate.toDateString());
                // console.log(actualDiff);
                let leaveDay = 1;
                if (actualDiff < 4.1) {
                    engagedHour -= 4;
                    leaveDay = 0.5;
                } else {
                    engagedHour -= 8;
                }
                if (isSameMonth(weekStartDate, date) && !isSaturday(date) && !isSunday(date)) {
                    this.justLoginLeaveDict[employee][weekStartDate.toDateString()].curMonthLeave += leaveDay;
                } else if ((!isSameMonth(weekStartDate, date) && !isSaturday(date) && !isSunday(date))) {
                    this.justLoginLeaveDict[employee][weekStartDate.toDateString()].nextMonthLeave += leaveDay;
                }
            }

            if (!this.justLoginDict.hasOwnProperty(employee)) {
                this.justLoginDict[employee] = {};
            }

            this.justLoginDict[employee][date] = {
                in: inOffice,
                engagedHour: engagedHour,
                remarks: remarks
            };

            if (!this.justLoginWeekDict.hasOwnProperty(employee)) {
                this.justLoginWeekDict[employee] = {};
            }

            if (!this.justLoginMonthlyHourDict.hasOwnProperty(employee)) {
                this.justLoginMonthlyHourDict[employee] = {};
            }

            const curMonth = curDate.getMonth() + 1;
            const yearMonthKey = curDate.getFullYear() + '-' + curMonth;
            // console.log(curDate.toDateString());
            // console.log(curMonth);
            if (!this.justLoginMonthlyHourDict[employee].hasOwnProperty(yearMonthKey)) {
                this.justLoginMonthlyHourDict[employee][yearMonthKey] = engagedHour;
            } else {
                this.justLoginMonthlyHourDict[employee][yearMonthKey] += engagedHour;
            }

            const weekStartDateString = weekStartDate.toDateString();
            if (!remarks) {
                remarks = '';
            } else {
                remarks = remarks + ' ( ' + date + ' ) ';
            }
            if (!this.justLoginWeekDict[employee].hasOwnProperty(weekStartDateString)) {
                this.justLoginWeekDict[employee][weekStartDateString] = {
                    engagedHour: engagedHour,
                    remarks: remarks
                };
            } else {
                this.justLoginWeekDict[employee][weekStartDateString].engagedHour += engagedHour;
                if (this.justLoginWeekDict[employee][weekStartDateString].remarks !== '' && remarks !== '') {
                    this.justLoginWeekDict[employee][weekStartDateString].remarks += ', ' + remarks;
                } else {
                    this.justLoginWeekDict[employee][weekStartDateString].remarks += remarks;
                }
            }
        }

        if (this.justLoginCounter === 0) {
            this.justLoginRef.close();
            alert('Upload finished');
        }
        // console.log(this.justLoginDict);
        // console.log(this.justLoginMonthlyHourDict);
        // console.log(this.justLoginLeaveDict);
    }

    getDay(date: Date, desiredDay: number): Date {
        date = new Date(date);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        return new Date(date.setDate(diff + desiredDay));
    }

    getStartOfMonth(date: Date): Date {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1);
    }

    getEndOfMonth(date: Date): Date {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0);
    }

    getViewWorkItem(): void {
        if (this.view.toLowerCase() === 'month') {
            this.getMontlyWorkItem(this.viewDate);
        } else if (this.view.toLowerCase() === 'week') {
            this.getWeeklyWorkItem(this.viewDate);
        }
    }

    getWeeklyWorkItem(date: Date): void {
        const mon = this.getDay(date, this.DAY_CONSTS.MONDAY).toDateString();
        const sun = this.getDay(date, this.DAY_CONSTS.SUNDAY).toDateString();
        this.getWorkItemByTeamMembers(mon, sun);
    }

    getMontlyWorkItem(date: Date): void {
        const start = this.getStartOfMonth(date).toDateString();
        const end = this.getEndOfMonth(date).toDateString();
        this.getWorkItemByTeamMembers(start, end);
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

    getWorkItemByTeamMembers(start: string, end: string): void {
        this.startDate = new Date(start);
        this.endDate = new Date(end);

        this.modalData = { title: 'Loading...' };
        const ref = this._modal.open(this.modalContent, { size: 'sm',
                                                          windowClass: 'transparent-image',
                                                          backdrop: 'static',
                                                          keyboard: false });
        const ntTeamMembers = this.getSelectedNtTeamMembers();
        if (!this.isCollapse) {
            this._apiService.getWorkItemsByNtTeamMembers(start, end, ntTeamMembers).subscribe(ntWorkItems => {
                this.updateEvents(ntWorkItems);
                ref.close();
            });
        } else {
            this._apiService.getCollapsedWorkItemsByNtTeamMembers(start, end, ntTeamMembers)
            .subscribe(collapsedWorkItems => {
                this.updateCollapsedEvents(collapsedWorkItems);
                ref.close();
            });
        }
    }

    updateEvents(workItems: NtWorkItem[]) {
        this.events.length = 0;
        if (workItems.length === 0) {
            this.refresh.next();
            return;
        }

        this.workItemDict = {};
        for (const workItem of workItems) {
            const id = workItem.teamProject.replace(/ /g, '') + '-' + workItem.id + ' ' + workItem.title;
            const title = id;
            this.events.push(
                {
                    title: title,
                    start: new Date(workItem.closedDate),
                    end: new Date(workItem.closedDate),
                    color: colors.red,
                    draggable: false,
                    resizable: {
                        beforeStart: true,
                        afterEnd: true
                    }
                }
            );
            this.workItemDict[id] = workItem;
        }
        this.refresh.next();
    }

    updateCollapsedEvents(workItems: { [id: string]: NtCollapsedWorkItem[]}) {
        this.events.length = 0;
        for (const employee in workItems) {
            if (!workItems.hasOwnProperty(employee)) {
                continue;
            }

            for (const workItem of workItems[employee]) {
                const title = workItem.employee + ': ' + workItem.title;
                const id = title;
                this.events.push(
                    {
                        title: title,
                        start: new Date(workItem.date),
                        end: new Date(workItem.date),
                        color: colors.red,
                        draggable: false,
                        resizable: {
                            beforeStart: true,
                            afterEnd: true
                        }
                    }
                );
            }
        }
        this.refresh.next();
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
                this.view = 'month';
                this.viewString = this.view;
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

    createDailyExcel(collapsedWorkItems: { [id: string]: NtCollapsedWorkItem[]}, startDate: Date, endDate: Date): void {
        /* generate workbook and add the worksheet */
        const wb: XLSX.WorkBook = XLSX.utils.book_new();

        let whSheets: { [id: string]: any[]} = {};
        whSheets = this.initDailyExcelSheets(collapsedWorkItems, startDate, endDate);
        const taskSheets = this.createTaskSheets(this.convertCollapseWorkItemsToTaskList(collapsedWorkItems));

        for (const employee in whSheets) {
            if (whSheets.hasOwnProperty(employee)) {
                const excelData: AOA = whSheets[employee];

                /* generate worksheet */
                const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(excelData);

                let sheetName = employee.replace(/ *<[^)]*> */g, '');
                sheetName = sheetName.replace(/ /g, '');
                sheetName = sheetName + '_WH';
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            }
        }

        for (const employee in taskSheets) {
            if (taskSheets.hasOwnProperty(employee)) {
                const excelData: AOA = taskSheets[employee];

                /* generate worksheet */
                const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(excelData);

                let sheetName = employee.replace(/ *<[^)]*> */g, '');
                sheetName = sheetName.replace(/ /g, '');
                sheetName = sheetName + '_Tasks';
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            }
        }

        /* save to file */
        if (!this.excelFileName.toLowerCase().endsWith(this.EXCEL_EXT.toLowerCase())) {
            this.excelFileName += this.EXCEL_EXT;
        }
        XLSX.writeFile(wb, this.excelFileName);
    }

    convertCollapseWorkItemsToTaskList(collapseWorkItems: { [id: string]: NtCollapsedWorkItem[]}): {[id: string]: string[]} {
        const taskLists: {[id: string]: string[]} = {};
        for (const employee in collapseWorkItems) {
            if (!collapseWorkItems.hasOwnProperty(employee)) {
                continue;
            }

            if (!taskLists.hasOwnProperty(employee)) {
                taskLists[employee] = [];
            }

            for (const item of collapseWorkItems[employee]) {
                taskLists[employee] = taskLists[employee].concat(item.workTasksList);
            }
        }
        return taskLists;
    }

    calculateDateDiff(leftDate: Date, rightDate: Date) {
        const diffInMs = leftDate.getTime() - rightDate.getTime();
        const diffInDates = diffInMs / 1000.0 / 60.0 / 60.0 / 24.0;
        return diffInDates;
    }

    initDailyExcelSheets(collapseWorkItems: { [id: string]: NtCollapsedWorkItem[]}, startDate: Date, endDate: Date):
                        { [id: string]: any[]} {
        const sheets: { [id: string]: any[]} = {};
        let header1 = [];
        header1 = header1.concat(this.EXCEL_HEADER_1);
        let header2 = [];
        header2 = header2.concat(this.EXCEL_HEADER_2);
        const headerDict = this.EXCEL_HEADER_DICT;

        for (const employee in collapseWorkItems) {
            if (!collapseWorkItems.hasOwnProperty(employee)) {
                continue;
            }
            sheets[employee] = [];
            sheets[employee].push([].concat(this.EXCEL_HEADER_EMPTY));
            sheets[employee].push([].concat(this.EXCEL_HEADER_EMPTY));
            sheets[employee].push([].concat(header1));
            sheets[employee].push([].concat(header2));

            const sortedCollapsedItems = collapseWorkItems[employee].sort((a, b) => {
                return compareAsc(new Date(a.date), new Date(b.date));
            });

            let start: Date = new Date(sortedCollapsedItems[0].date);

            if (this.calculateDateDiff(startDate, start) < 0) {
                start = new Date(startDate);
            }

            let monthlyMismatch = 0;
            // let durationDemonstration = 0;
            let durationDeployment = 0;
            let durationDesign = 0;
            let durationDevelopment = 0;
            let durationDocumentation = 0;
            let durationMarketing = 0;
            let durationRequirements = 0;
            let durationTesting = 0;
            let durationOthers = 0;
            let durationNA = 0;
            let durationProduct: {[id: string]: number} = {};
            for (let i = 0; i < sortedCollapsedItems.length; i++) {
                const collapsedWorkItem = sortedCollapsedItems[i];
                let target = new Date(collapsedWorkItem.date);

                const diff = this.calculateDateDiff(target, start);
                if (i === sortedCollapsedItems.length - 1 && !isLastDayOfMonth(target)) {
                    target = lastDayOfMonth(target);
                }

                const diff2 = this.calculateDateDiff(target, start);

                const person = collapsedWorkItem.employee.replace(/ *<[^)]*> */g, '').trim();
                for (let j = 0; j <= diff2; j++) {
                    if (j !== diff) {
                        let engagedHour = 0;
                        let remarks = '';
                        const dateString = start.toDateString();
                        if (this.justLoginDict.hasOwnProperty(person) && this.justLoginDict[person].hasOwnProperty(dateString)) {
                            engagedHour = this.justLoginDict[person][dateString].engagedHour;
                            if (this.justLoginDict[person][dateString].remarks) {
                                remarks = this.justLoginDict[person][dateString].remarks;
                            }
                        }
                        const dummyRow = [
                            collapsedWorkItem.employee,
                            start.toDateString(),
                            remarks,
                            engagedHour,
                            '',
                            // 0,
                            0,
                            0,
                            0,
                            0,
                            0,
                            0,
                            0,
                            0,
                            0,
                            0,
                            engagedHour
                        ];
                        monthlyMismatch += engagedHour;
                        sheets[employee].push(dummyRow);
                    } else {
                        let engagedHour = 0;
                        let remarks = '';
                        const dateString = new Date(collapsedWorkItem.date).toDateString();
                        if (this.justLoginDict.hasOwnProperty(person) && this.justLoginDict[person].hasOwnProperty(dateString)) {
                            engagedHour = this.justLoginDict[person][dateString].engagedHour;
                            if (this.justLoginDict[person][dateString].remarks) {
                                remarks = this.justLoginDict[person][dateString].remarks;
                            }
                        }
                        const row = [
                            collapsedWorkItem.employee,
                            dateString,
                            remarks,
                            engagedHour,
                            collapsedWorkItem.title,
                            // collapsedWorkItem.durationDemonstration,
                            collapsedWorkItem.durationDeployment,
                            collapsedWorkItem.durationDesign,
                            collapsedWorkItem.durationDevelopment,
                            collapsedWorkItem.durationDocumentation,
                            collapsedWorkItem.durationMarketing,
                            collapsedWorkItem.durationRequirements,
                            collapsedWorkItem.durationTesting,
                            collapsedWorkItem.durationOthers,
                            collapsedWorkItem.durationNA,
                            collapsedWorkItem.durationTotal,
                            engagedHour - collapsedWorkItem.durationTotal
                        ];

                        // durationDemonstration += collapsedWorkItem.durationDemonstration;
                        durationDeployment += collapsedWorkItem.durationDeployment;
                        durationDesign += collapsedWorkItem.durationDesign;
                        durationDevelopment += collapsedWorkItem.durationDevelopment;
                        durationDocumentation += collapsedWorkItem.durationDocumentation;
                        durationMarketing += collapsedWorkItem.durationMarketing;
                        durationRequirements += collapsedWorkItem.durationRequirements;
                        durationTesting += collapsedWorkItem.durationTesting;
                        durationOthers += collapsedWorkItem.durationOthers;
                        durationNA += collapsedWorkItem.durationNA;
                        monthlyMismatch += engagedHour - collapsedWorkItem.durationTotal;

                        for (let productName in collapsedWorkItem.product) {
                            if (!collapsedWorkItem.product.hasOwnProperty(productName)) {
                                continue;
                            }
                            productName = productName.trim();
                            if (!durationProduct.hasOwnProperty(productName)) {
                                durationProduct[productName] = 0;
                            }
                            durationProduct[productName] += collapsedWorkItem.product[productName];
                        }

                        sheets[employee].push(row);
                    }

                    if (isLastDayOfMonth(start)) {
                        // duration
                        let index = sheets[employee].length - 2;
                        // sheets[employee][index].push(header2[headerDict.DURATION_DEMONSTRATION]);
                        sheets[employee][index].push(header2[headerDict.DURATION_DEPLOYMENT]);
                        sheets[employee][index].push(header2[headerDict.DURATION_DESIGN]);
                        sheets[employee][index].push(header2[headerDict.DURATION_DEVELOPMENT]);
                        sheets[employee][index].push(header2[headerDict.DURATION_DOCUMENTATION]);
                        sheets[employee][index].push(header2[headerDict.DURATION_MARKETING]);
                        sheets[employee][index].push(header2[headerDict.DURATION_REQUIREMENTS]);
                        sheets[employee][index].push(header2[headerDict.DURATION_TESTING]);
                        sheets[employee][index].push(header2[headerDict.DURATION_OTHERS]);
                        sheets[employee][index].push(header2[headerDict.DURATION_NA]);
                        sheets[employee][index].push(header2[headerDict.MISMATCH]);

                        index = sheets[employee].length - 1;
                        // sheets[employee][index].push(durationDemonstration);
                        sheets[employee][index].push(durationDeployment);
                        sheets[employee][index].push(durationDesign);
                        sheets[employee][index].push(durationDevelopment);
                        sheets[employee][index].push(durationDocumentation);
                        sheets[employee][index].push(durationMarketing);
                        sheets[employee][index].push(durationRequirements);
                        sheets[employee][index].push(durationTesting);
                        sheets[employee][index].push(durationOthers);
                        sheets[employee][index].push(durationNA);
                        sheets[employee][index].push(monthlyMismatch);

                        // durationDemonstration = 0;
                        durationDeployment = 0;
                        durationDesign = 0;
                        durationDevelopment = 0;
                        durationDocumentation = 0;
                        durationMarketing = 0;
                        durationRequirements = 0;
                        durationTesting = 0;
                        durationOthers = 0;
                        durationNA = 0;
                        monthlyMismatch = 0;

                        console.log(employee);
                        console.log(durationProduct);

                        // product
                        index = sheets[employee].length - 4;
                        for (const productName in durationProduct) {
                            if (!durationProduct.hasOwnProperty(productName)) {
                                continue;
                            }
                            sheets[employee][index].push(productName);
                            sheets[employee][index + 1].push(durationProduct[productName]);
                        }
                        durationProduct = {};
                    }
                    start = addDays(start, 1);
                }
            }
            durationProduct = {};
        } // end of employee loop
        return sheets;
    }

    createWeeklyExcel(weeklyWorkItems: { [id: string]: NtWeeklyWorkItem[]}, startDate: Date, endDate: Date): void {
        /* generate workbook and add the worksheet */
        const wb: XLSX.WorkBook = XLSX.utils.book_new();

        let whSheets: { [id: string]: any[]} = {};
        whSheets = this.initWeeklyExcelSheets(weeklyWorkItems, startDate, endDate);
        const taskSheets = this.createTaskSheets(this.converWeeklyWorkItemsToTaskList(weeklyWorkItems));

        for (const employee in whSheets) {
            if (whSheets.hasOwnProperty(employee)) {
                const excelData: AOA = whSheets[employee];

                /* generate worksheet */
                const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(excelData);

                let sheetName = employee.replace(/ *<[^)]*> */g, '');
                sheetName = sheetName.replace(/ /g, '');
                sheetName = sheetName + '_WH';
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            }
        }

        for (const employee in taskSheets) {
            if (taskSheets.hasOwnProperty(employee)) {
                const excelData: AOA = taskSheets[employee];

                /* generate worksheet */
                const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(excelData);

                let sheetName = employee.replace(/ *<[^)]*> */g, '');
                sheetName = sheetName.replace(/ /g, '');
                sheetName = sheetName + '_Tasks';
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            }
        }

        /* save to file */
        if (!this.excelFileName.toLowerCase().endsWith(this.EXCEL_EXT.toLowerCase())) {
            this.excelFileName += this.EXCEL_EXT;
        }
        XLSX.writeFile(wb, this.excelFileName);
    }

    converWeeklyWorkItemsToTaskList(weeklyWorkItems: { [id: string]: NtWeeklyWorkItem[]}): {[id: string]: string[]} {
        const taskLists: {[id: string]: string[]} = {};
        for (const employee in weeklyWorkItems) {
            if (!weeklyWorkItems.hasOwnProperty(employee)) {
                continue;
            }

            if (!taskLists.hasOwnProperty(employee)) {
                taskLists[employee] = [];
            }

            for (const item of weeklyWorkItems[employee]) {
                taskLists[employee] = taskLists[employee].concat(item.workTasksList);
            }
        }
        return taskLists;
    }

    initWeeklyExcelSheets(weeklyWorkItems: { [id: string]: NtWeeklyWorkItem[]}, startDate: Date, endDate: Date):
                        { [id: string]: any[]} {
        const sheets: { [id: string]: any[]} = {};
        const header1 = this.EXCEL_WEEK_HEADER_1;
        const header2 = this.EXCEL_WEEK_HEADER_2;
        const weekHeaderDict = this.EXCEL_WEEK_HEADER_DICT;

        for (const employee in weeklyWorkItems) {
            if (!weeklyWorkItems.hasOwnProperty(employee)) {
                continue;
            }
            sheets[employee] = [];
            sheets[employee].push(header1);
            sheets[employee].push(header2);

            const sortedWeeklyItems = weeklyWorkItems[employee].sort((a, b) => {
                return compareAsc(new Date(a.weekStartDate), new Date(b.weekStartDate));
            });

            let start: Date = new Date(sortedWeeklyItems[0].weekStartDate);
            if (this.calculateDateDiff(startDate, start) < 0) {
                start = startOfWeek(startDate, {weekStartsOn: 1});
            }

            while (this.calculateDateDiff(new Date(sortedWeeklyItems[sortedWeeklyItems.length - 1].weekEndDate), endDate) < 0) {
                const ntWeeklyItem = new NtWeeklyWorkItem();
                ntWeeklyItem.employee = sortedWeeklyItems[0].employee;
                ntWeeklyItem.weekStartDate = addDays(sortedWeeklyItems[sortedWeeklyItems.length - 1].weekStartDate, 7).toDateString();
                ntWeeklyItem.weekEndDate = addDays(sortedWeeklyItems[sortedWeeklyItems.length - 1].weekEndDate, 7).toDateString();
                ntWeeklyItem.title = '';
                ntWeeklyItem.durationDeployment = 0;
                ntWeeklyItem.durationDesign = 0;
                ntWeeklyItem.durationDevelopment = 0;
                ntWeeklyItem.durationDocumentation = 0;
                ntWeeklyItem.durationMarketing = 0;
                ntWeeklyItem.durationRequirements = 0;
                ntWeeklyItem.durationTesting = 0;
                ntWeeklyItem.durationOthers = 0;
                ntWeeklyItem.durationNA = 0;
                ntWeeklyItem.durationTotal = 0;
                ntWeeklyItem.product = {};
                ntWeeklyItem.workTasksList = [];
                sortedWeeklyItems.push(ntWeeklyItem);
            }

            const durationMonth: {[id: string]: {
                monthlyMismatch: number,
                durationDeployment: number,
                durationDesign: number,
                durationDevelopment: number,
                durationDocumentation: number,
                durationMarketing: number,
                durationRequirements: number,
                durationTesting: number,
                durationOthers: number,
                durationNA: number,
                durationProduct: {[id: string]: number}
            }} = {};
            for (let i = 0; i < sortedWeeklyItems.length; i++) {
                const sortedWeekItem = sortedWeeklyItems[i];
                const target = new Date(sortedWeekItem.weekStartDate);

                const diff = this.calculateDateDiff(target, start);

                const person = sortedWeekItem.employee.replace(/ *<[^)]*> */g, '').trim();
                for (let j = 0; j <= diff; j += 7) {
                    const friday = addDays(start, 4);
                    const isWeekCrossMonth = !isSameMonth(start, friday);
                    const isLastWeekItem = (j === diff && i === sortedWeeklyItems.length - 1);

                    const yearMonthKey: string = start.getFullYear() + '-' + (start.getMonth() + 1);
                    const nextYearMonthKey: string = start.getFullYear() + '-' + (start.getMonth() + 2);
                    if (!durationMonth.hasOwnProperty(yearMonthKey)) {
                        durationMonth[yearMonthKey] = {
                            monthlyMismatch: 0,
                            durationDeployment: 0,
                            durationDesign: 0,
                            durationDevelopment: 0,
                            durationDocumentation: 0,
                            durationMarketing: 0,
                            durationRequirements: 0,
                            durationTesting: 0,
                            durationOthers: 0,
                            durationNA: 0,
                            durationProduct: {}
                        };
                    }

                    if (!durationMonth.hasOwnProperty(nextYearMonthKey)) {
                        durationMonth[nextYearMonthKey] = {
                            monthlyMismatch: 0,
                            durationDeployment: 0,
                            durationDesign: 0,
                            durationDevelopment: 0,
                            durationDocumentation: 0,
                            durationMarketing: 0,
                            durationRequirements: 0,
                            durationTesting: 0,
                            durationOthers: 0,
                            durationNA: 0,
                            durationProduct: {}
                        };
                    }

                    let monthRatio = 1;
                    let nextMonthRatio = 0;
                    if (isWeekCrossMonth) {
                        let curMonthLeave = 0;
                        let nextMonthLeave = 0;
                        const startString = start.toDateString();
                        if (this.justLoginLeaveDict.hasOwnProperty(employee) &&
                            this.justLoginLeaveDict[employee].hasOwnProperty(startString)) {
                            curMonthLeave = this.justLoginLeaveDict[employee][startString].curMonthLeave;
                            nextMonthLeave = this.justLoginLeaveDict[employee][startString].nextMonthLeave;
                        }
                        const workingDay = 5 - curMonthLeave - nextMonthLeave;
                        if (workingDay !== 0) {
                            let day: Date = addDays(start, 1);
                            while (isSameMonth(day, start)) {
                                day = addDays(day, 1);
                            }
                            let weekDiff = this.calculateDateDiff(day, start);
                            weekDiff -= curMonthLeave;
                            monthRatio = weekDiff / workingDay;
                            nextMonthRatio = 1 - monthRatio;
                        } else {
                            monthRatio = 0;
                            nextMonthRatio = 0;
                        }
                    }

                    let engagedHour = 0;
                    let remarks = '';
                    const dateString = start.toDateString();
                    if (this.justLoginWeekDict.hasOwnProperty(person) && this.justLoginWeekDict[person].hasOwnProperty(dateString)) {
                        engagedHour = this.justLoginWeekDict[person][dateString].engagedHour;
                        if (this.justLoginWeekDict[person][dateString].remarks) {
                            remarks = this.justLoginWeekDict[person][dateString].remarks;
                        }
                    }

                    if (j !== diff) {
                        const dummyRow = [
                            sortedWeekItem.employee,
                            start.toDateString(),
                            friday.toDateString(),
                            remarks,
                            engagedHour,
                            '',
                            // 0,
                            0,
                            0,
                            0,
                            0,
                            0,
                            0,
                            0,
                            0,
                            0,
                            0,
                            engagedHour
                        ];
                        durationMonth[yearMonthKey].monthlyMismatch += engagedHour * monthRatio;
                        durationMonth[nextYearMonthKey].monthlyMismatch += engagedHour * nextMonthRatio;
                        sheets[employee].push(dummyRow);
                    } else {
                        const row = [
                            sortedWeekItem.employee,
                            start.toDateString(),
                            friday.toDateString(),
                            remarks,
                            engagedHour,
                            sortedWeekItem.title,
                            // collapsedWorkItem.durationDemonstration,
                            sortedWeekItem.durationDeployment,
                            sortedWeekItem.durationDesign,
                            sortedWeekItem.durationDevelopment,
                            sortedWeekItem.durationDocumentation,
                            sortedWeekItem.durationMarketing,
                            sortedWeekItem.durationRequirements,
                            sortedWeekItem.durationTesting,
                            sortedWeekItem.durationOthers,
                            sortedWeekItem.durationNA,
                            sortedWeekItem.durationTotal,
                            engagedHour - sortedWeekItem.durationTotal
                        ];

                        // durationDemonstration += collapsedWorkItem.durationDemonstration;
                        durationMonth[yearMonthKey].durationDeployment += sortedWeekItem.durationDeployment * monthRatio;
                        durationMonth[yearMonthKey].durationDesign += sortedWeekItem.durationDesign * monthRatio;
                        durationMonth[yearMonthKey].durationDevelopment += sortedWeekItem.durationDevelopment * monthRatio;
                        durationMonth[yearMonthKey].durationDocumentation += sortedWeekItem.durationDocumentation * monthRatio;
                        durationMonth[yearMonthKey].durationMarketing += sortedWeekItem.durationMarketing * monthRatio;
                        durationMonth[yearMonthKey].durationRequirements += sortedWeekItem.durationRequirements * monthRatio;
                        durationMonth[yearMonthKey].durationTesting += sortedWeekItem.durationTesting * monthRatio;
                        durationMonth[yearMonthKey].durationOthers += sortedWeekItem.durationOthers * monthRatio;
                        durationMonth[yearMonthKey].durationNA += sortedWeekItem.durationNA * monthRatio;
                        durationMonth[yearMonthKey].monthlyMismatch += (engagedHour - sortedWeekItem.durationTotal) * monthRatio;

                        durationMonth[nextYearMonthKey].durationDeployment += sortedWeekItem.durationDeployment * nextMonthRatio;
                        durationMonth[nextYearMonthKey].durationDesign += sortedWeekItem.durationDesign * nextMonthRatio;
                        durationMonth[nextYearMonthKey].durationDevelopment += sortedWeekItem.durationDevelopment * nextMonthRatio;
                        durationMonth[nextYearMonthKey].durationDocumentation += sortedWeekItem.durationDocumentation * nextMonthRatio;
                        durationMonth[nextYearMonthKey].durationMarketing += sortedWeekItem.durationMarketing * nextMonthRatio;
                        durationMonth[nextYearMonthKey].durationRequirements += sortedWeekItem.durationRequirements * nextMonthRatio;
                        durationMonth[nextYearMonthKey].durationTesting += sortedWeekItem.durationTesting * nextMonthRatio;
                        durationMonth[nextYearMonthKey].durationOthers += sortedWeekItem.durationOthers * nextMonthRatio;
                        durationMonth[nextYearMonthKey].durationNA += sortedWeekItem.durationNA * nextMonthRatio;
                        durationMonth[nextYearMonthKey].monthlyMismatch += (engagedHour - sortedWeekItem.durationTotal) * nextMonthRatio;

                        for (let productName in sortedWeekItem.product) {
                            if (!sortedWeekItem.product.hasOwnProperty(productName)) {
                                continue;
                            }
                            productName = productName.trim();
                            if (!durationMonth[yearMonthKey].durationProduct.hasOwnProperty(productName)) {
                                durationMonth[yearMonthKey].durationProduct[productName] = 0;
                            }
                            if (!durationMonth[nextYearMonthKey].durationProduct.hasOwnProperty(productName)) {
                                durationMonth[nextYearMonthKey].durationProduct[productName] = 0;
                            }
                            durationMonth[yearMonthKey].durationProduct[productName] += sortedWeekItem.product[productName] * monthRatio;
                            durationMonth[nextYearMonthKey].durationProduct[productName] +=
                                                    sortedWeekItem.product[productName] * nextMonthRatio;
                        }

                        sheets[employee].push(row);
                    }

                    start = addDays(start, 7);
                }
            }

            sheets[employee].push(['']);
            sheets[employee].push(['']);

            for (const yearMonthKey in durationMonth) {
                if (!durationMonth.hasOwnProperty(yearMonthKey)) {
                    continue;
                }
                const person = employee.replace(/ *<[^)]*> */g, '').trim();
                let monthlyHour = 0;
                if (this.justLoginMonthlyHourDict.hasOwnProperty(person) &&
                    this.justLoginMonthlyHourDict[person].hasOwnProperty(yearMonthKey)) {
                    monthlyHour = this.justLoginMonthlyHourDict[person][yearMonthKey];
                }
                // console.log(person);
                // console.log(yearMonthKey);
                // console.log(this.justLoginMonthlyHourDict);
                sheets[employee].push(['']);
                sheets[employee].push([yearMonthKey, '', 'Total Working Hours:', monthlyHour]);
                sheets[employee].push([]);
                sheets[employee].push([]);
                const index = sheets[employee].length - 2;

                for (const productName in durationMonth[yearMonthKey].durationProduct) {
                    if (!durationMonth[yearMonthKey].durationProduct.hasOwnProperty(productName)) {
                        continue;
                    }
                    sheets[employee][index].push(productName);
                    sheets[employee][index + 1].push(durationMonth[yearMonthKey].durationProduct[productName]);
                }

                const headerRow = [
                    header2[weekHeaderDict.DURATION_DEPLOYMENT],
                    header2[weekHeaderDict.DURATION_DESIGN],
                    header2[weekHeaderDict.DURATION_DEVELOPMENT],
                    header2[weekHeaderDict.DURATION_DOCUMENTATION],
                    header2[weekHeaderDict.DURATION_MARKETING],
                    header2[weekHeaderDict.DURATION_REQUIREMENTS],
                    header2[weekHeaderDict.DURATION_TESTING],
                    header2[weekHeaderDict.DURATION_OTHERS],
                    header2[weekHeaderDict.DURATION_NA],
                    header2[weekHeaderDict.MISMATCH]
                ];

                const contentRow = [
                    durationMonth[yearMonthKey].durationDeployment,
                    durationMonth[yearMonthKey].durationDesign,
                    durationMonth[yearMonthKey].durationDevelopment,
                    durationMonth[yearMonthKey].durationDocumentation,
                    durationMonth[yearMonthKey].durationMarketing,
                    durationMonth[yearMonthKey].durationRequirements,
                    durationMonth[yearMonthKey].durationTesting,
                    durationMonth[yearMonthKey].durationOthers,
                    durationMonth[yearMonthKey].durationNA,
                    durationMonth[yearMonthKey].monthlyMismatch
                ];

                sheets[employee].push(headerRow);
                sheets[employee].push(contentRow);
            }
        }
        return sheets;
    }

    createTaskSheets(taskLists: {[id: string]: string[]}): { [id: string]: any[]}  {
        const sheets: { [id: string]: any[]} = {};
        const header1 = this.EXCEL_TASK_HEADER;
        for (const employee in taskLists) {
            if (!taskLists.hasOwnProperty(employee)) {
                continue;
            }
            sheets[employee] = [];
            sheets[employee].push(header1);
            for (let i = 0; i < taskLists[employee].length; i++) {
                const id = i + 1;
                const task = taskLists[employee][i];
                sheets[employee].push([id, task]);
            }
        }
        return sheets;
    }
    // ============================================= HELPER END ===========================================================
}

