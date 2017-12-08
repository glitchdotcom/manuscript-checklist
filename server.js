// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();
var sqlite = require('sqlite3').verbose();
var db = require('./database')('.data/db.sqlite');

// make trailing slashes matter
app.enable('strict routing');

// http://expressjs.com/en/api.html#req.cookies
app.use(require('cookie-parser')());

// CORS to allow embedding
app.use(function(request, response, next) {
  // allow our designated site
  response.set('Access-Control-Allow-Origin', process.env.ALLOWED_DOMAIN);
  // allow cookies to be set cross domain
  response.set('Access-Control-Allow-Credentials', true);
  // allow the auth secret on cross domain requests
  response.set('Access-Control-Allow-Headers', 'Authorization');
  next();
});

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// make sure requests contain our secret as header or cookie
app.use(function(request, response, next) {
  if (request.method == 'OPTIONS') {
    // allow anon OPTIONS requests so CORS preflight doesn't need to have auth
    next();
  } else if (!process.env.SECRET) {
    // don't fill in a secret if checklists are open to any and everyone
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
app.get('/checklist/:checklistId', function (req, res) {
  res.redirect(301, `/checklist/${req.params.checklistId}/`);
});

app.get('/checklist/:checklistId/', function (req, res) {
  console.log(`rendering ${req.params.checklistId}`);
  res.sendFile(__dirname + '/views/index.html');
});

app.get('/templates', function (request, response, next) {
  db.template.getAll()
  .then(function(rows) {
    var templates = rows.map(function (row) { return row.id; });
    response.json(templates);
  })
  .catch(next);
});

app.get('/template/:templateId', function (req, res, next) {
  db.template.get(req.params.templateId)
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

app.post('/template/:templateId/items', function (request, response, next) {
  var template = JSON.parse(request.query.dream);
  if (!template.items || template.items.length === 0) {
    db.template.delete(request.params.templateId)
    .then(function() {
      response.sendStatus(202);
    })
    .catch(next);
  } else {
    // templates don't have completed items
    template.items.forEach(function(item) { delete item.isCompleted });
    db.template.set(request.params.templateId, JSON.stringify(template))
    .then(function() {
      response.sendStatus(200);
    })
    .catch(next);
  }
});

app.get("/checklist/:checklistId/dreams", function (req, res, next) {
  db.checklist.get(req.params.checklistId)
  .then(function(row) {
    // if there is a checklist, render it.
    if (row) {
      console.log(row);
      res.json(JSON.parse(row.items));
    }
    // otherwise, render the "make a new checklist page"
    else {
      res.json({items:[]});
    }
  })
  .catch(next);
});

// could also use the POST body instead of query string: http://expressjs.com/en/api.html#req.body
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

app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});