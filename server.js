// server.js
// where your node app starts

// init project
const pkg = require('./package'),
      express = require('express'),
      app = express()

// SQLite database
const db = require('./database')()

// make trailing slashes matter
app.enable('strict routing');

// http://expressjs.com/en/api.html#req.cookies
app.use(require('cookie-parser')());

// CORS to allow embedding
app.use(function(request, response, next) {
  // allow our designated site (or all sites if none defined)
  response.set('Access-Control-Allow-Origin', process.env.ALLOWED_DOMAIN || '*');
  // allow cookies to be set cross domain
  response.set('Access-Control-Allow-Credentials', true);
  // allow the auth secret on cross domain requests
  response.set('Access-Control-Allow-Headers', 'Authorization');
  next();
});

// http://expressjs.com/en/starter/static-files.html
// NOTE the 1 Day cache!
app.use(express.static('public', { maxage: '1d' }));

// make sure requests contain our secret as header or cookie
app.use(function(request, response, next) {
  if (request.method == 'OPTIONS') {
    // allow anon OPTIONS requests so CORS preflight doesn't need to have auth
    next();
  } else if (!process.env.SECRET) {
    // if there is no secret, checklists are open to any and everyone
    next()
  } else if (request.get('Authorization') == process.env.SECRET) {
    // header expected on initial request; set cookie for subsequent requests
    response.cookie('Authorization', process.env.SECRET, {httpOnly: true, secure: true});
    next();
  } else if (request.cookies.Authorization == process.env.SECRET) {
    // if you've been here already, you're good
    next();
  } else {
    // delay a few seconds on unauthenticated requests... mitigate brute force
    setTimeout(function() {
      response.sendStatus(403);
    }, 2000);
  }
});

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.send("Visit /checklist/&lt;some name&gt; to start checklisting.");
});

// ensure trailing slash so relative paths work on client
app.get('/checklist/:ixChecklist', function (req, res) {
  res.redirect(301, `/checklist/${req.params.ixChecklist}/`);
});

app.get('/checklist/:ixChecklist/', function (req, res) {
  console.log(`rendering ${req.params.ixChecklist}`);
  res.sendFile(__dirname + '/views/checklist.html');
});

app.get('/template/:ixTemplate/edit', function (req, res) {
  console.log(`rendering ${req.params.ixTemplate}`);
  res.sendFile(__dirname + '/views/checklist.html');
});

// return a list of available templates
app.get('/templates', function (request, response, next) {
  db.template.getAll()
  .then(function(rows) {
    var templates = rows.map(function (row) { return row.id; });
    response.json(templates);
  })
  .catch(next);
});

// return a single template to start a new checklist
app.get('/template/:ixTemplate', function (req, res, next) {
  db.template.get(req.params.ixTemplate)
  .then(function(row) {
    // if there is a template, return it.
    if (row) {
      res.json(JSON.parse(row.items));
    }
    // otherwise, 404
    else {
      res.sendStatus(404);
    }
  })
  .catch(next);
});

// save a checklist as a template
app.post('/template/:ixTemplate/items', function (request, response, next) {
  let template = JSON.parse(request.query.dream),
      ixTemplate = request.params.ixTemplate;
  if (!template.items || template.items.length === 0) {
    db.template.delete(ixTemplate)
    .then(function() {
      response.sendStatus(202);
    })
    .catch(next);
  } else {
    // templates don't have completed items, so scrub them from the JSON
    db.template.set(ixTemplate, JSON.stringify(template, (key, value) => key === 'isComplete' ? undefined : value))
    .then(function() {
      response.sendStatus(200);
    })
    .catch(next);
  }
});

// get the items on a single checklist
app.get("/checklist/:checklistId/dreams", function (req, res, next) {
  db.checklist.get(req.params.checklistId)
  .then(function(row) {
    // if there is a checklist, render it.
    if (row) {
      res.json(JSON.parse(row.items));
    }
    // otherwise, return an empty checklist to render the "make a new checklist page"
    else {
      res.json({items:[]});
    }
  })
  .catch(next);
});

// save (or delete) a checklist
app.post("/checklist/:checklistId/dreams", function (request, response, next) {
  if (request.query.dream == "{\"items\":[]}") {
    db.checklist.delete(request.params.checklistId)
    .then(function() {
      response.sendStatus(202);
    })
    .catch(next);
  } else {
    db.checklist.set(request.params.checklistId, request.query.dream)
    .then(function() {
      response.sendStatus(200);
    })
    .catch(next);
  }
});

// error handler
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// listen for requests :)
app.listen(process.env.PORT, () => console.log(`☑️✨🚀 ${pkg.name} ${pkg.version} running node ${process.version} ☑️✨🚀`))