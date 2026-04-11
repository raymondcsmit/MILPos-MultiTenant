import { Injectable, isDevMode } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { from, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import * as LZString from 'lz-string';

interface POSDB extends DBSchema {
  lookups: {
    key: string;
    value: any;
  };
  master_data: {
    key: string;
    value: any;
  };
}

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private dbPromise: Promise<IDBPDatabase<POSDB>>;

  constructor() {
    this.dbPromise = openDB<POSDB>('pos-db', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('lookups')) {
          db.createObjectStore('lookups');
        }
        if (!db.objectStoreNames.contains('master_data')) {
          db.createObjectStore('master_data');
        }
      },
    });
  }

  get<T>(storeName: 'lookups' | 'master_data', key: string): Observable<T | undefined> {
    return from(this.dbPromise.then(db => db.get(storeName, key))).pipe(
      map(data => {
        if (!data) return undefined;
        // Check if data is compressed string
        if (typeof data === 'string' && data.startsWith('LZ_')) {
            const decompressed = LZString.decompressFromUTF16(data.substring(3));
            return decompressed ? JSON.parse(decompressed) : undefined;
        }
        return data as T;
      }),
      catchError(err => {
        console.error('IDB Get Error', err);
        return of(undefined);
      })
    );
  }

  put(storeName: 'lookups' | 'master_data', key: string, value: any): Observable<void> {
    return from(this.dbPromise.then(async db => {
        let storageValue = value;
        // Compress if large (simple heuristic > 100 items array or basic check)
        // ideally checking size in bytes is better but expensive
        if (Array.isArray(value) && value.length > 50) {
             const json = JSON.stringify(value);
             // Basic check: only compress if likely large string
             if (json.length > 50000) { // 50KB roughly
                 storageValue = 'LZ_' + LZString.compressToUTF16(json);
             }
        }
        await db.put(storeName, storageValue, key);
    })).pipe(
      catchError(err => {
        console.error('IDB Put Error', err);
        return of(void 0);
      })
    );
  }
  
  async getAllKeys(storeName: 'lookups' | 'master_data'): Promise<string[]> {
      const db = await this.dbPromise;
      return db.getAllKeys(storeName) as Promise<string[]>;
  }

  clearDatabase(): Observable<void> {
    return from(this.dbPromise.then(async db => {
      await db.clear('lookups');
      await db.clear('master_data');
    })).pipe(
        catchError(err => {
           console.error('IDB Clear Error', err);
           return of(void 0); 
        })
    );
  }

  deleteByPattern(storeName: 'lookups' | 'master_data', pattern: string): Observable<void> {
      return from(this.dbPromise.then(async db => {
          const keys = await db.getAllKeys(storeName);
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          
          let deletedCount = 0;
          for (const key of keys) {
              if (key.includes(pattern)) {
                  store.delete(key);
                  deletedCount++;
              }
          }
          await tx.done;
          if (isDevMode()) console.log(`IDB: Deleted ${deletedCount} keys matching '${pattern}' from ${storeName}`);
      })).pipe(
          catchError(err => {
              console.error('IDB Delete Pattern Error', err);
              return of(void 0);
          })
      );
  }
}
