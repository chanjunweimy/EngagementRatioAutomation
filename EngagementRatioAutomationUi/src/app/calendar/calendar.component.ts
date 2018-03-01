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
    differenceInCalendarDays,
    lastDayOfMonth,
    parse
} from 'date-fns';
import { Subject } from 'rxjs/Subject';
import { NgbModal, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';

import {
    CalendarEvent,
    CalendarEventAction,
    CalendarEventTimesChangedEvent
} from 'angular-calendar';
import { forkJoin } from 'rxjs/observable/forkJoin';

import { NtApiService, NtWorkItem, NtTeamMember, NtCollapsedWorkItem } from '../api/nt-api.service';

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

@Component({
    selector: 'app-calendar-component',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['calendar.component.less'],
    templateUrl: 'calendar.component.html'
})
export class CalendarComponent implements AfterViewInit, OnInit {
    @ViewChild('modalContent') modalContent: TemplateRef<any>;

    view = 'month';

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

    EXCEL_HEADER_1 = ['', '', '', '', '', 'Duration', '', '', '', '', '', '', '', '', '', '', ''];

    EXCEL_HEADER_2 = ['Employee', 'Date', 'Remark', 'Hours Engaged', 'Title', 'Demonstration', 'Deployment', 'Design',
                    'Development', 'Documentation', 'Marketing', 'Requirements', 'Testing', 'Others',
                    'N/A', 'Total', 'Mismatch'];

    EXCEL_HEADER_DICT = {
        EMPLOYEE: 0,
        DATE: 1,
        REMARK: 2,
        EH: 3,
        TITLE: 4,
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
    };

    // JustLogin
    JUSTLOGIN_HEADER_DICT = {
        EMPLOYEE: 'Employee',
        DATE: 'Date',
        DAY: 'Day',
        IN: 'In',
        REMARKS: 'Remarks',
        WH: 'Hours Worked'
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

    constructor(private _modal: NgbModal,
                private _apiService: NtApiService,
                private _changeDetectorRef: ChangeDetectorRef) {}

    ngOnInit() {
        this.isCollapse = false;
        this.getNtTeamMembers();
    }

    ngAfterViewInit() {
    }

    weekInit() {
        this.view = 'week';
        this.getWeeklyWorkItem(this.viewDate);
    }

    monthInit() {
        this.view = 'month';
        this.getMontlyWorkItem(this.viewDate);
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
            if (workItem.teamProject.toLowerCase() === 'ntcloud') {
                window.open('http://aws-tfs:8080/tfs/NtCloud/NtCloud/_workitems?id=' + workItem.id, '_blank');
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
        this.getViewWorkItem();
    }

    getMine(): void {
        this.setMineSelectedOnly();
        this.getViewWorkItem();
    }

    exportToCsv(): void {
        this.modalData = { title: 'Exporting...' };
        const ref = this._modal.open(this.modalContent, { size: 'sm',
                                                          windowClass: 'transparent-image',
                                                          backdrop: 'static',
                                                          keyboard: false });
        const ntTeamMembers = this.getSelectedNtTeamMembers();
        this._apiService.getCollapsedWorkItemsByNtTeamMembers(this.startDate.toDateString(), this.endDate.toDateString(), ntTeamMembers)
            .subscribe(collapsedWorkItems => {
                this.createExcel(collapsedWorkItems, this.startDate, this.endDate);
                ref.close();
                this._changeDetectorRef.detectChanges();
            });
    }

    onFileChange(evt: any) {
        /* wire up file reader */
        const target: DataTransfer = <DataTransfer>(evt.target);
        if (target.files.length !== 1) {
            throw new Error('Cannot use multiple files');
        }
        const reader: FileReader = new FileReader();
        reader.onload = (e: any) => {
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
                    title !== this.JUSTLOGIN_HEADER_DICT.WH &&
                    title !== this.JUSTLOGIN_HEADER_DICT.REMARKS) {
                    continue;
                }
                headerDict[title] = i;
            }
            this.justLoginDict = {};
            for (let i = 1; i < data.length; i++) {
                const dateString: string = data[i][headerDict[this.JUSTLOGIN_HEADER_DICT.DATE]].trim();
                let tokens: string[] = [];
                for (const separator of this.DATE_SEPARATORS) {
                    if (dateString.includes(separator)) {
                        tokens = dateString.split(separator);
                    }
                }

                let employee = data[i][headerDict[this.JUSTLOGIN_HEADER_DICT.EMPLOYEE]];
                employee = this.JUSTLOGIN_NAME_DICT[employee];

                let date: string;
                if (tokens.length >= 3) {
                    const cur = new Date(+tokens[2], +tokens[1] - 1, +tokens[0]);
                    if (tokens[2].length === 2) {
                        cur.setFullYear(cur.getFullYear() + 100);
                    }
                    date = cur.toDateString();
                }
                let inOffice: string;
                if (data[i][headerDict[this.JUSTLOGIN_HEADER_DICT.IN]].trim() === '-') {
                    inOffice = undefined;
                } else {
                    inOffice = new Date(date + ' '
                                + data[i][headerDict[this.JUSTLOGIN_HEADER_DICT.IN]]).toTimeString();
                }
                const remarks: string = data[i][headerDict[this.JUSTLOGIN_HEADER_DICT.REMARKS]];

                let engagedHour = +data[i][headerDict[this.JUSTLOGIN_HEADER_DICT.WH]];
                if (!inOffice) {
                    engagedHour = 0;
                } else if (remarks && (remarks.toLowerCase().includes('annual') || remarks.toLowerCase().includes('sick'))) {
                    engagedHour -= 4;
                }

                if (!this.justLoginDict.hasOwnProperty(employee)) {
                    this.justLoginDict[employee] = {};
                }

                this.justLoginDict[employee][date] = {
                    in: inOffice,
                    engagedHour: engagedHour,
                    remarks: remarks
                };
            }
            console.log(this.justLoginDict);
        };
        reader.readAsBinaryString(target.files[0]);
    }

    collapse() {
        console.log(this.isCollapse);
        // this.isCollapse = true;
        this.getViewWorkItem();
    }

    // ============================================= HELPER START =========================================================

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
        if (workItems.length === 0) {
            return;
        }
        this.events.length = 0;
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
                this.monthInit();
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

    createExcel(collapsedWorkItems: { [id: string]: NtCollapsedWorkItem[]}, startDate: Date, endDate: Date): void {
        /* generate workbook and add the worksheet */
        const wb: XLSX.WorkBook = XLSX.utils.book_new();

        const sheets = this.initExcelSheets(collapsedWorkItems, startDate, endDate);
        for (const employee in sheets) {
            if (sheets.hasOwnProperty(employee)) {
                const excelData: AOA = sheets[employee];

                /* generate worksheet */
                const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(excelData);

                let sheetName = employee.replace(/ *<[^)]*> */g, '');
                sheetName = sheetName.replace(/ /g, '');
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            }
        }

        /* save to file */
        if (!this.excelFileName.toLowerCase().endsWith(this.EXCEL_EXT.toLowerCase())) {
            this.excelFileName += this.EXCEL_EXT;
        }
        XLSX.writeFile(wb, this.excelFileName);
    }

    initExcelSheets(collapseWorkItems: { [id: string]: NtCollapsedWorkItem[]}, startDate: Date, endDate: Date): { [id: string]: any[]} {
        const sheets: { [id: string]: any[]} = {};
        const header1 = this.EXCEL_HEADER_1;
        const header2 = this.EXCEL_HEADER_2;
        const headerDict = this.EXCEL_HEADER_DICT;

        for (const employee in collapseWorkItems) {
            if (!collapseWorkItems.hasOwnProperty(employee)) {
                continue;
            }
            sheets[employee] = [];
            sheets[employee].push(['']);
            sheets[employee].push(['']);
            sheets[employee].push(header1);
            sheets[employee].push(header2);

            const sortedCollapsedItems = collapseWorkItems[employee].sort((a, b) => {
                return compareAsc(new Date(a.date), new Date(b.date));
            });

            let start = new Date(startDate);
            let durationDemonstration = 0;
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

                let diff = differenceInCalendarDays(start, target);
                if (diff < 0) {
                    diff *= -1;
                }
                if (i === sortedCollapsedItems.length - 1 && !isLastDayOfMonth(target)) {
                    target = lastDayOfMonth(target);
                }

                let diff2 = differenceInCalendarDays(start, target);
                if (diff2 < 0) {
                    diff2 *= -1;
                }

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
                            0,
                            engagedHour
                        ];
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
                            collapsedWorkItem.durationDemonstration,
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

                        durationDemonstration += collapsedWorkItem.durationDemonstration;
                        durationDeployment += collapsedWorkItem.durationDeployment;
                        durationDesign += collapsedWorkItem.durationDesign;
                        durationDevelopment += collapsedWorkItem.durationDevelopment;
                        durationDocumentation += collapsedWorkItem.durationDocumentation;
                        durationMarketing += collapsedWorkItem.durationMarketing;
                        durationRequirements += collapsedWorkItem.durationRequirements;
                        durationTesting += collapsedWorkItem.durationTesting;
                        durationOthers += collapsedWorkItem.durationOthers;
                        durationNA += collapsedWorkItem.durationNA;

                        for (const productName in collapsedWorkItem.product) {
                            if (!collapsedWorkItem.product.hasOwnProperty(productName)) {
                                continue;
                            }
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
                        sheets[employee][index].push(header2[headerDict.DURATION_DEMONSTRATION]);
                        sheets[employee][index].push(header2[headerDict.DURATION_DEPLOYMENT]);
                        sheets[employee][index].push(header2[headerDict.DURATION_DESIGN]);
                        sheets[employee][index].push(header2[headerDict.DURATION_DEVELOPMENT]);
                        sheets[employee][index].push(header2[headerDict.DURATION_DOCUMENTATION]);
                        sheets[employee][index].push(header2[headerDict.DURATION_MARKETING]);
                        sheets[employee][index].push(header2[headerDict.DURATION_REQUIREMENTS]);
                        sheets[employee][index].push(header2[headerDict.DURATION_TESTING]);
                        sheets[employee][index].push(header2[headerDict.DURATION_OTHERS]);
                        sheets[employee][index].push(header2[headerDict.DURATION_NA]);

                        index = sheets[employee].length - 1;
                        sheets[employee][index].push(durationDemonstration);
                        sheets[employee][index].push(durationDeployment);
                        sheets[employee][index].push(durationDesign);
                        sheets[employee][index].push(durationDevelopment);
                        sheets[employee][index].push(durationDocumentation);
                        sheets[employee][index].push(durationMarketing);
                        sheets[employee][index].push(durationRequirements);
                        sheets[employee][index].push(durationTesting);
                        sheets[employee][index].push(durationOthers);
                        sheets[employee][index].push(durationNA);

                        durationDemonstration = 0;
                        durationDeployment = 0;
                        durationDesign = 0;
                        durationDevelopment = 0;
                        durationDocumentation = 0;
                        durationMarketing = 0;
                        durationRequirements = 0;
                        durationTesting = 0;
                        durationOthers = 0;
                        durationNA = 0;

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
        }
        return sheets;
    }
    // ============================================= HELPER END ===========================================================
}

