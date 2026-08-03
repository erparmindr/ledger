(function(){
/* ============================================================
   BACKUP FORMAT  —  versioned wrapper + integrity + migration
   Pure module: no DOM, no storage. Loaded before backup.js.

   Format (v1):
   {
     format:  "ledger-backup",
     version: 1,
     exportedAt: <ISO string>,
     checksum: <SHA-256 hex of JSON.stringify(data)>,
     data:    <DB object>
   }

   Legacy backups (raw DB object without a wrapper) are still
   accepted: unwrapBackup() returns version 0 for them and the
   migration framework treats 0 -> 1 as identity (field backfill
   happens in normalizeData on restore).
   ============================================================ */
window.Ledger = window.Ledger || {};

window.Ledger.BACKUP_FORMAT = "ledger-backup";
window.Ledger.BACKUP_VERSION = 1;

/* ------------------------------------------------------------
   SHA-256 (pure JS, no dependencies). Returns lowercase hex.
   Used for the integrity checksum in the backup wrapper.
   ------------------------------------------------------------ */
window.Ledger.sha256hex = function(str){
  var bytes = [];
  for(var i = 0; i < str.length; i++){
    var c = str.charCodeAt(i);
    if(c < 0x80) bytes.push(c);
    else if(c < 0x800) bytes.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
    else if(c < 0xD800 || c >= 0xE000) bytes.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
    else{
      i++;
      var cp = 0x10000 + (((c & 0x3FF) << 10) | (str.charCodeAt(i) & 0x3FF));
      bytes.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F), 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
    }
  }

  var bitLen = bytes.length * 8;
  bytes.push(0x80);
  while(bytes.length % 64 !== 56) bytes.push(0);
  var lenHi = Math.floor(bitLen / 0x100000000);
  bytes.push((lenHi >>> 24) & 0xFF, (lenHi >>> 16) & 0xFF, (lenHi >>> 8) & 0xFF, lenHi & 0xFF);
  bytes.push((bitLen >>> 24) & 0xFF, (bitLen >>> 16) & 0xFF, (bitLen >>> 8) & 0xFF, bitLen & 0xFF);

  var K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  var W = new Array(64);
  function rrot(x, n){ return (x >>> n) | (x << (32 - n)); }

  for(var off = 0; off < bytes.length; off += 64){
    for(var t = 0; t < 16; t++){
      W[t] = (bytes[off + t*4] << 24) | (bytes[off + t*4 + 1] << 16) | (bytes[off + t*4 + 2] << 8) | bytes[off + t*4 + 3];
    }
    for(t = 16; t < 64; t++){
      var s0 = rrot(W[t-15], 7) ^ rrot(W[t-15], 18) ^ (W[t-15] >>> 3);
      var s1 = rrot(W[t-2], 17) ^ rrot(W[t-2], 19) ^ (W[t-2] >>> 10);
      W[t] = (W[t-16] + s0 + W[t-7] + s1) | 0;
    }
    var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for(t = 0; t < 64; t++){
      var S1 = rrot(e, 6) ^ rrot(e, 11) ^ rrot(e, 25);
      var ch = (e & f) ^ (~e & g);
      var t1 = (h + S1 + ch + K[t] + W[t]) | 0;
      var S0 = rrot(a, 2) ^ rrot(a, 13) ^ rrot(a, 22);
      var maj = (a & b) ^ (a & c) ^ (b & c);
      var t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }

  var out = "";
  for(var j = 0; j < 8; j++) out += ("00000000" + ((H[j] >>> 0).toString(16))).slice(-8);
  return out;
};

/* ------------------------------------------------------------
   Wrapper helpers
   ------------------------------------------------------------ */

/* Wrap a DB snapshot into the versioned backup object.
   The data is deep-copied so the wrapper is a true snapshot:
   later mutations to the live DB must not alter an exported backup
   or break its checksum. */
window.Ledger.wrapBackup = function(db, exportedAt){
  var data = JSON.parse(JSON.stringify(db));
  var checksum = window.Ledger.sha256hex(JSON.stringify(data));
  return {
    format: window.Ledger.BACKUP_FORMAT,
    version: window.Ledger.BACKUP_VERSION,
    exportedAt: exportedAt || new Date().toISOString(),
    checksum: checksum,
    data: data
  };
};

/* Detect wrapper vs legacy. Returns { version, data, isWrapper }. */
window.Ledger.unwrapBackup = function(parsed){
  if(parsed && typeof parsed === "object" &&
     parsed.format === window.Ledger.BACKUP_FORMAT &&
     typeof parsed.version === "number"){
    return { version: parsed.version, data: parsed.data, isWrapper: true };
  }
  return { version: 0, data: parsed, isWrapper: false };
};

/* Recompute the checksum of a wrapper's data and compare. */
window.Ledger.verifyBackupChecksum = function(wrapper){
  if(!wrapper || !wrapper.checksum) return false;
  return window.Ledger.sha256hex(JSON.stringify(wrapper.data)) === wrapper.checksum;
};

/* ------------------------------------------------------------
   Migration framework
   ------------------------------------------------------------ */

/* Version step functions keyed by source version. Each step
   transforms data from `v` to `v+1`. No transforms exist yet
   (v1 is current; legacy 0 -> 1 is identity because normalizeData
   performs field backfill on restore). */
window.Ledger._backupMigrations = {};
window.Ledger._backupMigrations[0] = function(data){ return data; };

/* Migrate data from fromVersion up to (but not incl.) toVersion. */
window.Ledger.migrateBackup = function(data, fromVersion, toVersion){
  var out = data;
  var target = toVersion === undefined ? window.Ledger.BACKUP_VERSION : toVersion;
  for(var v = fromVersion; v < target; v++){
    if(window.Ledger._backupMigrations[v]) out = window.Ledger._backupMigrations[v](out);
  }
  return out;
};

/* ------------------------------------------------------------
   Backup metadata (last backup status) — stored separately from
   the DB so it is not part of the backed-up payload.
   ------------------------------------------------------------ */
window.Ledger.BACKUP_META_KEY = "ledger_backup_meta";

window.Ledger.getBackupMeta = function(){
  try{
    var raw = localStorage.getItem(window.Ledger.BACKUP_META_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
};

window.Ledger.setBackupMeta = function(meta){
  try{ localStorage.setItem(window.Ledger.BACKUP_META_KEY, JSON.stringify(meta)); }
  catch(e){ /* non-fatal */ }
};

})();
