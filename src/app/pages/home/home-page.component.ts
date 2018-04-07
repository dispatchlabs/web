import {Component, OnInit, AfterViewInit, OnDestroy, Inject, ViewChild, ElementRef} from '@angular/core';
import {AppService} from '../../app.service';
import {Router} from '@angular/router';
import {environment} from '../../../environments/environment';
import {Observable} from 'rxjs/Rx';
import {Headers, Http, RequestOptions} from '@angular/http';
import {Config} from '../../store/states/config';
import {AppState} from '../../app.state';
import {Store} from '@ngrx/store';
import {APP_REFRESH} from '../../app.component';
import {Contact} from '../../store/states/contact';
import {Transaction} from '../../store/states/transaction';
import {DataSource} from '@angular/cdk/collections';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {M2Util} from '../../m2-angular/utils/m2-util';
import {KeyHelper} from '../../m2-angular/helpers/key-helper';

/**
 *
 */
class TransactionDatabase {

    /**
     * Class level-declarations.
     */
    public transactionBehaviorSubject: BehaviorSubject<Transaction[]> = new BehaviorSubject<Transaction[]>([]);

    /**
     *
     * @returns {Transaction[]}
     */
    get data(): Transaction[] {
        return this.transactionBehaviorSubject.value;
    }

    /**
     *
     * @param {Transaction[]} transactions
     */
    constructor(transactions: Transaction[]) {
        this.transactionBehaviorSubject.next(transactions);
    }
}

/**
 *
 */
class TransactionDataSource extends DataSource<any> {

    /**
     *
     * @param {TransactionDatabase} transactionDatabase
     */
    constructor(private transactionDatabase: TransactionDatabase) {
        super();
    }

    /**
     *
     * @returns {Observable<Transaction[]>}
     */
    connect(): Observable<Transaction[]> {
        return this.transactionDatabase.transactionBehaviorSubject;
    }

    /**
     *
     */
    disconnect() {
    }
}

/**
 * HomePageComponent
 */
@Component({
    templateUrl: './home-page.component.html',
    styleUrls: ['./home-page.component.scss']
})
export class HomePageComponent implements OnInit, AfterViewInit, OnDestroy {

    /**
     * Class Level Declarations
     */
    @ViewChild('getStartedDiv')
    public getStartedDiv: any;
    public loading = true;
    public configState: Observable<Config>;
    public config: Config;
    public configSubscription: any;
    private appEventSubscription: any;
    public delegates: Contact[];
    public selectedDelegate: Contact;
    public transactions: Transaction [];
    public dataSource: TransactionDataSource | null;
    public displayedColumns = ['to', 'value', 'time'];
    public search: string;
    public KeyHelper = KeyHelper;

    /**
     *
     * @param appService
     * @param {Router} router
     * @param {Http} http
     * @param {Store<AppState>} store
     */
    constructor(@Inject('AppService') public appService: any, private router: Router, private http: Http, private store: Store<AppState>) {
        this.configState = this.store.select('config');
        this.configSubscription = this.configState.subscribe((config: Config) => {
            this.config = config;
        });
        this.appEventSubscription = this.appService.appEvents.subscribe((event: any) => {
            switch (event.type) {
                case APP_REFRESH:
                    this.refresh();
                    return;
            }
        });
    }

    /**
     *
     */
    ngOnInit() {
        this.refresh();
    }

    /**
     *
     */
    ngAfterViewInit() {
    }

    /**
     *
     */
    ngOnDestroy() {
        this.configSubscription.unsubscribe();
        this.appEventSubscription.unsubscribe();
    }

    /**
     *
     */
    public refresh(): void {
        this.loading = true;
        /*
        setTimeout(() => {
            this.loading = false;
        }, 1000 * 3);
        */

        this.get('http://' + environment.seedNodeIp + ':1975/v1/delegates').subscribe(response => {
            this.delegates = response.data;
            this.loading = false;
        });
    }

    /**
     *
     * @param {Contact} delegate
     */
    public select(delegate: Contact): void {
        this.selectedDelegate = delegate;
        this.loading = true;
        if (M2Util.isNullOrEmpty(this.search)) {
            this.get('http://' + environment.seedNodeIp + ':1975/v1/transactions').subscribe(response => {
                this.loading = false;
                this.transactions = response.data;
                if (this.transactions && this.transactions.length > 0) {
                    this.dataSource = new TransactionDataSource(new TransactionDatabase(this.transactions));
                }
            });
        }
    }

    /**
     *
     */
    public searchByAddress(): void {
        this.loading = true;
        this.get('http://' + environment.seedNodeIp + ':1975/v1/transactions/' + this.search).subscribe(response => {
            this.loading = false;
            this.transactions = response.data;
            if (this.transactions && this.transactions.length > 0) {
                this.dataSource = new TransactionDataSource(new TransactionDatabase(this.transactions));
            }
        });
    }

    /**
     *
     */
    public scrollDown() {
        this.getStartedDiv.nativeElement.scrollIntoView({block: 'start', behavior: 'smooth'});
    }

    /**
     *
     * @param {string} url
     * @returns {Observable<any>}
     */
    public get(url: string): any {
        const headers = new Headers({'Content-Type': 'application/json'});
        const requestOptions = new RequestOptions({headers: headers});

        // Post.
        return this.http.get(url, requestOptions).map(response => response.json()).do(response => {
        }).catch(e => {
            this.loading = false;
            if (e.status === 0) {
                this.appService.error('Dispatch node is currently down for maintenance.');
            } else {
                const response = e.json();
                return new Observable(observer => {
                    observer.next(response);
                    observer.complete();
                });
            }
        });
    }
}
