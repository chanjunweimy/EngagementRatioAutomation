import {
    Component,
    ChangeDetectionStrategy,
    ViewChild,
    TemplateRef,
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
    addHours
} from 'date-fns';
import { Subject } from 'rxjs/Subject';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
    CalendarEvent,
    CalendarEventAction,
    CalendarEventTimesChangedEvent
} from 'angular-calendar';
import { NtApiService, NtWorkItem } from '../api/nt-api.service';

declare var $: any;
declare var jQuery: any;

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
export class CalendarComponent implements OnInit {
    @ViewChild('modalContent') modalContent: TemplateRef<any>;

    view = 'month';

    viewDate: Date = new Date();

    modalData: {
        title: string
        workItem: NtWorkItem
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
        /*
        {
            start: subDays(startOfDay(new Date()), 1),
            end: addDays(new Date(), 1),
            title: 'A 3 day event',
            color: colors.red,
            actions: this.actions
        },
        {
            start: startOfDay(new Date()),
            title: 'An event with no end date',
            color: colors.yellow,
            actions: this.actions
        },
        {
            start: subDays(endOfMonth(new Date()), 3),
            end: addDays(endOfMonth(new Date()), 3),
            title: 'A long event that spans 2 months',
            color: colors.blue
        },
        {
            start: addHours(startOfDay(new Date()), 2),
            end: new Date(),
            title: 'A draggable and resizable event',
            color: colors.yellow,
            actions: this.actions,
            resizable: {
                beforeStart: true,
                afterEnd: true
            },
            draggable: true
        }
        */
    ];

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
                private _apiService: NtApiService) {}

    ngOnInit() {
        const today = new Date();
        this.getMontlyWorkItem(today);
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

        if (this.view.toLowerCase() === 'month') {
            this.getMontlyWorkItem(date);
        } else if (this.view.toLowerCase() === 'week') {
            this.getWeeklyWorkItem(date);
        }
    }

    eventTimesChanged({
    event,
        newStart,
        newEnd
}: CalendarEventTimesChangedEvent): void {
        event.start = newStart;
        event.end = newEnd;
        this.handleEvent('Dropped or resized', event);
        this.refresh.next();
    }

    handleEvent(action: string, event: CalendarEvent): void {
        this.modalData = { title: event.title, workItem: this.workItemDict[event.title] };
        this._modal.open(this.modalContent, { size: 'lg' });
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

    getWeeklyWorkItem(date: Date): void {
        const mon = this.getDay(date, this.DAY_CONSTS.MONDAY).toDateString();
        const sun = this.getDay(date, this.DAY_CONSTS.SUNDAY).toDateString();
        this.getWorkItem(mon, sun);
    }

    getMontlyWorkItem(date: Date): void {
        const start = this.getStartOfMonth(date).toDateString();
        const end = this.getEndOfMonth(date).toDateString();
        this.getWorkItem(start, end);
    }

    getWorkItem(mon: string, sun: string): void {
        this._apiService.getWorkItem(mon, sun).subscribe(workItems => {
            if (workItems.length === 0) {
                return;
            }
            this.events.length = 0;
            this.workItemDict = {};
            for (const workItem of workItems) {
                const id = workItem.id + ' ' + workItem.title;
                this.events.push(
                    {
                        title: id,
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
        });
    }
    // ============================================= HELPER END ===========================================================
}
