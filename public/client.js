/* global ko */
$(function() {
  
  var Dream = function(dream, isComplete) {
    var self = this;
    
    self.dream = ko.observable(dream);
    self.isComplete = ko.observable(isComplete);
    self.isSelected = ko.observable(false);
    
    self.subscribe = function(fn) {
      self.dream.subscribe(fn);
      self.isComplete.subscribe(fn);
    };
  };

  var ViewModel = function() {
    var self = this;
    self.title = ko.observable('Checklist: ');
    self.dreams = ko.observableArray([]);
    self.pctComplete = ko.computed(function() {
      var total = self.dreams().length;
      var complete = self.dreams().reduce(function(count, elt) { return elt.isComplete() ? count + 1 : count }, 0);
      return Math.round((complete.toFixed(2) / total.toFixed(2)) * 100);
    });
    self.selected = null;
    self.saving = false;

    // select a dream (for changing the text)
    self.select = function(data) {
      if (self.selected && self.selected.isSelected) {
        self.clearSelected();
      }
      if (data && data.isSelected) {
        self.selected = data;
        data.isSelected(true);
      }
    };
    self.clearSelected = function() {
      if (self.selected.dream() === "") {
         self.dreams.remove(self.selected);  
      }
      self.selected.isSelected(false);
      self.selected = null;
    };
    self.add = function(dream) {
      self.push({dream: dream, isComplete: false});
    };
    self.push = function(item) {
      var d = new Dream(item.dream, item.isComplete);
      d.subscribe(fireOnChange);
      self.dreams.push(d);
    };
    self.save = function() {
      if (self.saving) return;
      self.saving = true;
      setTimeout(function() {
        var sDreams = JSON.stringify({ items: self.dreams().map(function(elt) { return { dream: elt.dream(), isComplete: elt.isComplete() }; }) });
        $.post('./dreams?' + $.param({dream: sDreams}));
        self.saving = false;
      }, 100);
    };
    // right now, just creates a template with the same name as the checklist
    // would be cool to provide a method of providing a name at this point
    // until then, visit /checklist/<your template name> to control the name
    self.saveAsTemplate = function() {
      var path = window.location.pathname.replace('/checklist/', '/template/');
      var sDreams = JSON.stringify({ items: self.dreams().map(function(elt) { return { dream: elt.dream(), isComplete: elt.isComplete() }; }) });
      $.post(path + 'items?' + $.param({dream: sDreams}), function() {
        // empty the list, so you can see the new template as a choice
        // TODO: something better to indicate saving has happened
        loadTemplates();
        self.dreams.removeAll();
      });
    };
  };
  
  var model = new ViewModel();
  ko.applyBindings(model);
  
  // items can be either:
  // "some item"
  // {dream: "some item", isComplete: t/f}
  function fillChecklist(items) {
    items.forEach(function(dream) {
      if (typeof dream == 'string') {
        model.add(dream);
      } else {
        model.push(dream);
      }
    });
  }
  
  // make a checklist with one empty item, ready for editing
  function emptyChecklist() {
    var d = new Dream('', false);
    d.subscribe(function() { model.save() });
    model.dreams.removeAll();
    model.dreams.push(d);
    model.select(d);
  }
  
  // send a message to the parent window informing our height
  // which improves embedding experience in e.g., Manuscript
  function notifySize() {
    parent.postMessage($('main').height() + 20, '*');
  }
  
  // fire on all changes
  function fireOnChange() {
    notifySize();
    model.save();
  }
  
  $.get('./dreams', function(dreams) {
    fillChecklist(dreams.items);
    // save on changes, once the dreams are all loaded (won't fire until changes are made)
    model.dreams.subscribe(fireOnChange);
    notifySize();
  });

  $('form#items').submit(function(event) {
    event.preventDefault();
    var dream = $('input#new-item').val();
    model.add(dream);
    $('input#new-item').val('');
    $('input#new-item').focus();
  });
  
  function loadTemplates() {
    var $select = $('select#templates');
    $select.empty().append($('<option>', {
          value: "empty",
          text: "-- Empty --",
          selected: true
          }));
    $.get('/templates', function(templates) {
      templates.forEach(function(template) {
        $('select#templates').append($('<option>', {
          value: template,
          text: template
          }));
      });
    });
  }
  loadTemplates();
  
  $('form#new-checklist').submit(function(event) {
    event.preventDefault();
    var template = $('select#templates').val();
    if (template == 'empty') {
      emptyChecklist();
    } else {
      $.get("/template/" + template, function(template) {
        fillChecklist(template.items);
        $('select#templates').val('empty');
      });
    }
  });
  
  function replaceTitle(){
    var url = window.location.href;
    var checklist = url.indexOf("checklist/");
    var projectName = url.substring(checklist + 10, url.length - 1);
    model.title("Checklist: " + projectName);
  }
  
  replaceTitle();
  
  $('.save-as-template').tooltip({
        tooltipClass: "save-as-template-tooltip",
        content: "Save As Template",
        track: true,
        position: {
          my: "right-5 top"
        }
  });

});
