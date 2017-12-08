module.exports = function(options) {
  
  // defaults
  options = Object.assign({
    dir: '.data',
    db: 'sqlite',
  }, options)

  // sqlite3 object
  const conn = openConnection(path(options)),
  
      // our db wrapper
      db = {
        checklist: {
          get: function(id) { return conn.get('SELECT items FROM checklist WHERE id = ?', id) },
          set: function(id, items) { return conn.run('INSERT OR REPLACE INTO checklist VALUES (?, ?)', id, items) },
          delete: function(id) { return conn.run('DELETE FROM checklist WHERE id = ?', id) }
        },
        template: {
          getAll: function() { return conn.all('SELECT id FROM template ORDER BY id') },
          set: function(id, items) { return conn.run('INSERT OR REPLACE INTO template VALUES (?, ?)', id, items) },
          get: function(id) { return conn.get('SELECT items FROM template WHERE id = ?', id) },
          delete: function(id) { return conn.run('DELETE FROM template WHERE id = ?', id) }
        }
      }
  
  initDbIfNeeded(db, ensureTableFn(conn)).then(() => db.initialized = true)
  
  return db
}

function initDbIfNeeded(db, tableFn) {
  // create our tables if they don't already exist
  return tableFn('checklist', 'CREATE TABLE checklist(id PRIMARY KEY, items)')
    .then(() => tableFn('template', 'CREATE TABLE template(id PRIMARY KEY, items)'))
}

function path(options) {
  return options.dir + '/' + options.db + '.db'
}

// also adds a promise-based API
function openConnection(path) {
  const sqlite = require('sqlite3').verbose(),
        db = new sqlite.Database(path)
  db.get = promisify(db.get)
  db.all = promisify(db.all)
  db.run = promisify(db.run, true)
  return db
}

function ensureTableFn(connection) {
  return (name, definition, drop) => (
    drop ?
      connection.run("DROP TABLE IF EXISTS " + name) :
      connection.get("SELECT name FROM sqlite_master WHERE type='table' AND name=?;", name)
  ).then(row => { if (!row) return connection.run(definition) })
}

// backport some of node8s util.promisify... only works with single arg returns, which is fine here
function promisify(orig, resolveWithThis) {

  function fn(...args) {
    return new Promise((resolve, reject) => {
      try {
        orig.call(this, ...args, function(err, ...values) {
          if (err) {
            reject(err);
          } else if (resolveWithThis) {
            resolve(this);
          } else {
            resolve(values[0]);
          }
        });
      } catch (err) {
        reject(err);
      }
    })
  }

  Object.setPrototypeOf(fn, Object.getPrototypeOf(orig));
  return Object.defineProperties(fn, Object.getOwnPropertyDescriptors(orig));
}