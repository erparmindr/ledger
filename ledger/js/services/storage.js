window.Ledger = window.Ledger || {};

/**
 * Storage adapter layer.
 *
 * Current adapter: IndexedDB (with localStorage fallback)
 * Future adapter: Google Drive sync
 *
 * Interface that every adapter must implement:
 *   init()           → Promise  — open DB, run migrations
 *   load()           → Promise<data>  — read full state
 *   save(data)       → Promise  — persist full state
 *
 * Design:
 *   - DB is always the in-memory `window.Ledger.DB`
 *   - `saveData()` writes to localStorage (sync) + adapter (async)
 *   - On boot, `Storage.init()` checks IDB, migrates from localStorage if needed
 *   - localStorage stays as a hot backup (belt + suspenders)
 */
(function(){

  var DB_NAME    = "ledger_db";
  var STORE_NAME = "state";
  var IDB_KEY    = "app";
  var idbHandle  = null;

  /* -----------------------------------------------------------
     IndexedDB helpers
     ----------------------------------------------------------- */
  function openIDB(){
    return new Promise(function(resolve, reject){
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function(e){
        var db = e.target.result;
        if(!db.objectStoreNames.contains(STORE_NAME)){
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = function(e){ resolve(e.target.result); };
      req.onerror   = function(e){ reject(e.target.error); };
    });
  }

  function idbGet(){
    return openIDB().then(function(db){
      return new Promise(function(resolve, reject){
        var tx    = db.transaction(STORE_NAME, "readonly");
        var store = tx.objectStore(STORE_NAME);
        var req   = store.get(IDB_KEY);
        req.onsuccess = function(){ resolve(req.result || null); };
        req.onerror   = function(){ reject(req.error); };
      });
    });
  }

  function idbPut(data){
    return openIDB().then(function(db){
      return new Promise(function(resolve, reject){
        var tx    = db.transaction(STORE_NAME, "readwrite");
        var store = tx.objectStore(STORE_NAME);
        var req   = store.put(data, IDB_KEY);
        req.onsuccess = function(){ resolve(); };
        req.onerror   = function(){ reject(req.error); };
      });
    });
  }

  /* -----------------------------------------------------------
     localStorage helpers (sync, used as fallback / backup)
     ----------------------------------------------------------- */
  function lsRead(){
    try{
      var raw = localStorage.getItem(window.Ledger.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
  }

  function lsWrite(data){
    try{ localStorage.setItem(window.Ledger.STORAGE_KEY, JSON.stringify(data)); }
    catch(e){ console.warn("localStorage write failed:", e); }
  }

  /* -----------------------------------------------------------
     Adapter: IndexedDB (primary)
     ----------------------------------------------------------- */
  var IDBAdapter = {
    name: "idb",

    init: function(){
      return openIDB().then(function(db){
        idbHandle = db;
        return idbGet();
      }).then(function(idbData){
        if(idbData){
          // IDB already has data — use it
          return idbData;
        }
        // No IDB data — check localStorage for migration
        var lsData = lsRead();
        if(lsData){
          // Migrate: copy localStorage → IDB
          idbPut(lsData).catch(function(err){
            console.error("IDB migration write failed:", err);
          });
          return lsData;
        }
        // Fresh install — return null so caller uses defaultData()
        return null;
      });
    },

    save: function(data){
      if(!idbHandle) return Promise.resolve();
      return idbPut(data).catch(function(err){
        console.error("IDB save failed:", err);
      });
    },

    load: function(){
      return idbGet();
    }
  };

  /* -----------------------------------------------------------
     Public API: Ledger.Storage
     ----------------------------------------------------------- */
  window.Ledger.Storage = {
    adapter: IDBAdapter,
    ready: false,

    /**
     * Init storage layer.  Call once on DOMContentLoaded.
     * Returns a Promise that resolves with the loaded data object
     * (or null if fresh install — caller should use defaultData()).
     *
     * This runs async but the sync `DB` object is already populated
     * from localStorage by store.js, so the UI can render immediately.
     * If IDB returns different data, we hot-swap DB.
     */
    init: function(){
      var self = this;
      return this.adapter.init().then(function(data){
        self.ready = true;
        if(data){
          var normalized = window.Ledger.normalizeData(data);
          window.Ledger.DB = normalized;
          lsWrite(normalized);
        }
        return data;
      }).catch(function(err){
        console.error("Storage init failed, falling back to localStorage:", err);
        self.ready = false;
        return lsRead();
      });
    },

    /**
     * Persist the current in-memory DB to all backends.
     * localStorage write is sync (immediate safety net).
     * IDB write is async (background, non-blocking).
     */
    persist: function(){
      var data = window.Ledger.DB;
      // Sync write to localStorage (backup)
      lsWrite(data);
      // Async write to IDB (primary)
      if(this.ready){
        this.adapter.save(data);
      }
    }
  };

})();
