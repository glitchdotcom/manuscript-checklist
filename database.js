module.exports = function(path) {

  var sqlite = require('sqlite3').verbose();
  var db = new sqlite.Database(path);
  
  initDbIfNeeded(db);
  
  return {
    checklist: {
      get: function(id) { return promisify(db, db.get, ["SELECT items FROM checklist WHERE id = ?", id]) },
      set: function(id, items) { return promisify(db, db.run, ["INSERT OR REPLACE INTO checklist VALUES (?, ?)", id, items]) },
      delete: function(id) { return promisify(db, db.run, ["DELETE FROM checklist WHERE id = ?", id]) }
    },
    template: {
      getAll: function() { return promisify(db, db.all, ["SELECT id FROM template ORDER BY id"]) },
      set: function(id, items) { return promisify(db, db.run, ["INSERT OR REPLACE INTO template VALUES (?, ?)", id, items]) },
      get: function(id) { return promisify(db, db.get, ["SELECT items FROM template WHERE id = ?", id]) },
      delete: function(id) { return promisify(db, db.get, ["DELETE FROM template WHERE id = ?", id]) }
    }
  };
};

function initDbIfNeeded(db) {
  // make sure the database exists and is happy
  return promisify(db, db.get, ["SELECT name FROM sqlite_master WHERE type='table' AND name=?;", "checklist"])
  .then(function(row) {
    if (!row) {
      return initDb(db);
    }
  });
}

// make sure the database has the right tables
function initDb(db) {
  // items is just stringified json
  return promisify(db, db.run, ["CREATE TABLE checklist(id PRIMARY KEY, items)"])
  .then(function() {
    return promisify(db, db.run, ["CREATE TABLE template(id PRIMARY KEY, items)"]);
  })
  .then(function() {
    return "ok, sweet";
  });
}

// pretty horrible attempt at converting callbacks to promises
// signature is garbage, but that's why it's buried in here
function promisify(obj, fn, args) {
  return new Promise(function(resolve, reject) {
    var cb = function(err, data) {
      if (err) return reject(err);
      return resolve(data);
    };
    args.push(cb);
    fn.apply(obj, args);
  });
}