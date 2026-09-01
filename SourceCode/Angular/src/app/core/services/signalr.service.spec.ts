import { TestBed } from '@angular/core/testing';
import * as signalR from '@microsoft/signalr';

import { SignalrService } from './signalr.service';
import { SecurityService } from '@core/security/security.service';
import { ClonerService } from './clone.service';
import { TranslationService } from './translation.service';
import { ToastrService } from './toastr.service';
import { OnlineUser } from '@core/domain-classes/online-user';

class FakeHubConnection {
  state = signalR.HubConnectionState.Disconnected;
  connectionId = 'conn-1';
  handlers: Record<string, (...args: any[]) => void> = {};
  invocations: { method: string; args: any[] }[] = [];
  reconnectedHandler: (() => void) | null = null;
  oncloseHandler: (() => void) | null = null;
  startPromise = Promise.resolve();

  on(handler: string, cb: (...args: any[]) => void) {
    this.handlers[handler] = cb;
  }
  onreconnected(cb: () => void) {
    this.reconnectedHandler = cb;
  }
  onclose(cb: () => void) {
    this.oncloseHandler = cb;
  }
  invoke(method: string, ...args: any[]): Promise<any> {
    this.invocations.push({ method, args });
    return Promise.resolve();
  }
  start(): Promise<void> {
    this.state = signalR.HubConnectionState.Connected;
    return this.startPromise;
  }
  emit(handler: string, ...args: any[]) {
    this.handlers[handler]?.(...args);
  }
}

describe('SignalrService', () => {
  let service: SignalrService;
  let fakeConn: FakeHubConnection;
  let securityService: jasmine.SpyObj<SecurityService>;
  let clonerService: jasmine.SpyObj<ClonerService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let withUrlSpy: jasmine.Spy;
  let reconnectSpy: jasmine.Spy;
  let buildSpy: jasmine.Spy;

  beforeEach(() => {
    fakeConn = new FakeHubConnection();
    securityService = jasmine.createSpyObj<SecurityService>('SecurityService', ['getUserDetail', 'logout']);
    clonerService = jasmine.createSpyObj<ClonerService>('ClonerService', ['deepClone']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['error', 'success']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);

    const builder = {
      withUrl: jasmine.createSpy('withUrl'),
      withAutomaticReconnect: jasmine.createSpy('withAutomaticReconnect'),
      build: jasmine.createSpy('build').and.returnValue(fakeConn as any),
    };
    builder.withUrl.and.callFake(() => builder);
    builder.withAutomaticReconnect.and.callFake(() => builder);

    // Patch the real class prototype so `new HubConnectionBuilder()` methods
    // chain to our fake builder and `build()` returns the fake connection.
    spyOn(signalR.HubConnectionBuilder.prototype as any, 'withUrl').and.callFake(
      () => builder as any
    );
    spyOn(signalR.HubConnectionBuilder.prototype as any, 'withAutomaticReconnect').and.callFake(
      () => builder as any
    );
    spyOn(signalR.HubConnectionBuilder.prototype as any, 'build').and.returnValue(fakeConn as any);

    TestBed.configureTestingModule({
      providers: [
        SignalrService,
        { provide: SecurityService, useValue: securityService },
        { provide: ClonerService, useValue: clonerService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
      ],
    });
    service = TestBed.inject(SignalrService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('startConnection', () => {
    it('builds a connection and resolves true on start', async () => {
      fakeConn.startPromise = Promise.resolve();
      const res = await service.startConnection();
      expect(signalR.HubConnectionBuilder).toBeDefined();
      expect(res).toBe(true);
    });

    it('rejects false when start fails', async () => {
      fakeConn.startPromise = Promise.reject(new Error('fail'));
      fakeConn.start = (() => {
        fakeConn.state = signalR.HubConnectionState.Disconnected;
        return Promise.reject(new Error('fail'));
      }) as any;
      const res = await service.startConnection().catch((r) => r);
      expect(res).toBe(false);
    });
  });

  describe('connectionId + userNotification$', () => {
    it('exposes connectionId and userNotification$', () => {
      (service as any).hubConnection = fakeConn;
      service.handleMessage();
      expect(service.connectionId).toBe('conn-1');
      let notif = '';
      service.userNotification$.subscribe((n) => (notif = n));
      fakeConn.emit('sendNotification', 'user-9');
      expect(notif).toBe('user-9');
    });
  });

  describe('onlineUsers$', () => {
    it('returns cached when non-empty', () => {
      clonerService.deepClone.and.callFake((x: any) => JSON.parse(JSON.stringify(x)));
      (service as any)._onlineUsers.next([{ id: 'u1' } as any]);
      let users: any;
      service.onlineUsers$.subscribe((u) => (users = u));
      expect(users.length).toBe(1);
    });

    it('reads from localStorage when cache empty', () => {
      clonerService.deepClone.and.callFake((x: any) => JSON.parse(JSON.stringify(x)));
      localStorage.setItem('onlineuser_key', JSON.stringify([{ id: 'u2' }]));
      let users: any;
      service.onlineUsers$.subscribe((u) => (users = u));
      expect(users).toEqual([{ id: 'u2' }]);
      localStorage.removeItem('onlineuser_key');
    });

    it('returns null when neither cache nor localStorage has users', () => {
      localStorage.removeItem('onlineuser_key');
      let users: any = 'unset';
      service.onlineUsers$.subscribe((u) => (users = u));
      expect(users).toBeNull();
    });
  });

  describe('addUser / forceLogout / logout', () => {
    it('invokes join only when connected', () => {
      (service as any).hubConnection = fakeConn;
      fakeConn.state = signalR.HubConnectionState.Connected;
      service.addUser({ id: 'u1', connectionId: 'c1' } as any);
      expect(fakeConn.invocations.some((i) => i.method === 'join')).toBe(true);
    });

    it('does not invoke join when disconnected', () => {
      (service as any).hubConnection = fakeConn;
      fakeConn.state = signalR.HubConnectionState.Disconnected;
      service.addUser({ id: 'u1' } as any);
      expect(fakeConn.invocations.length).toBe(0);
    });

    it('invokes forceLogout when connected', () => {
      (service as any).hubConnection = fakeConn;
      fakeConn.state = signalR.HubConnectionState.Connected;
      service.forceLogout('u1');
      expect(fakeConn.invocations.some((i) => i.method === 'forceLogout')).toBe(true);
    });

    it('logout clears storage and invokes logout', () => {
      (service as any).hubConnection = fakeConn;
      fakeConn.state = signalR.HubConnectionState.Connected;
      localStorage.setItem('onlineuser_key', 'x');
      service.logout('u1');
      expect(localStorage.getItem('onlineuser_key')).toBeNull();
      expect(fakeConn.invocations.some((i) => i.method === 'logout')).toBe(true);
    });
  });

  describe('handleMessage', () => {
    beforeEach(() => {
      (service as any).hubConnection = fakeConn;
      service.handleMessage();
    });

    it('userLeft removes the user', () => {
      clonerService.deepClone.and.callFake((x: any) => JSON.parse(JSON.stringify(x)));
      localStorage.setItem('onlineuser_key', JSON.stringify([{ id: 'a' }, { id: 'b' }]));
      fakeConn.emit('userLeft', 'a');
      localStorage.removeItem('onlineuser_key');
      expect(localStorage.getItem('onlineuser_key')).toBeNull();
    });

    it('newOnlineUser merges a new user into the subject', () => {
      clonerService.deepClone.and.callFake((x: any) => JSON.parse(JSON.stringify(x)));
      localStorage.setItem('onlineuser_key', JSON.stringify([{ id: 'a' }]));
      fakeConn.emit('newOnlineUser', { id: 'b' });
      let users: any;
      service.onlineUsers$.subscribe((u) => (users = u));
      expect(users.map((s: any) => s.id)).toEqual(['a', 'b']);
      localStorage.removeItem('onlineuser_key');
    });

    it('forceLogout toast errors and logs out', () => {
      toastrService.error.and.stub();
      translationService.getValue.and.returnValue('kicked');
      fakeConn.emit('forceLogout', { id: 'u1' });
      expect(toastrService.error).toHaveBeenCalledWith('kicked');
      expect(securityService.logout).toHaveBeenCalled();
    });

    it('onlineUsers with empty array clears storage', () => {
      fakeConn.emit('onlineUsers', []);
      expect(localStorage.getItem('onlineuser_key')).toBeNull();
    });

    it('onlineUsers with users stores them', () => {
      fakeConn.emit('onlineUsers', [{ id: 'u1' }]);
      expect(JSON.parse(localStorage.getItem('onlineuser_key')!)).toEqual([{ id: 'u1' }]);
      localStorage.removeItem('onlineuser_key');
    });
  });
});
