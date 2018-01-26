// use this as a Manuscript customization to get checklists embedded in cases
/* global fb, $checklist, $sidebar */

$(function(){
  
  const DOMAIN = 'DOMAIN'; // the domain of your checklist app
  const SECRET = 'SECRET'; // the shared auth secret

  if (!(fb && fb.config && fb.pubsub && fb.cases && fb.cases.current)) return;
  
  function runThisWhenCasePageModeChanges(sCommand) {
    if (sCommand == 'load' || sCommand == 'view') {
      checklist(fb.cases.current.bug.ixBug);
    }
  }
  
  // ------ set up to call your code when the case view changes -------------------
  fb.pubsub.subscribe({
    '/nav/end': function(event) {
      if (typeof fb.cases.current.sAction != 'undefined') {
        runThisWhenCasePageModeChanges(fb.cases.current.sAction);
      }   
    }   
  }); 
  setTimeout(function() { runThisWhenCasePageModeChanges(fb.cases.current.sAction) }, 100);

  // must be idempotent
  function checklist(ixBug) {
    var checklistUrl = DOMAIN + '/checklist/' + ixBug + '/';
    // if the checklist iframe has already been created; ensure the src is correct
    if (typeof($checklist) != 'undefined') {
      if ($checklist.attr('src') != checklistUrl) {
        $checklist.attr('src', checklistUrl);
      }
    } else {
      // create the checklist (this should only happen once)
      $checklist = $('<iframe/>', { name: 'checklist', id: 'sidebarChecklist' });
      $checklist.css('width', '100%');
      // start with a short height, but adjust based on messages from the iframe sending it's size
      $checklist.css('height', '50px');
      $(window).on('message onmessage', function(e) {
        if (e.originalEvent && e.originalEvent.origin == DOMAIN) {
          $checklist.height(e.originalEvent.data);
        }
      });
      // send cross-domain authentication secret
      $.ajax({
        type: "GET", 
        xhrFields: {
          withCredentials: true
        },  
        url: DOMAIN,
        beforeSend: function(xhr, settings) { xhr.setRequestHeader("Authorization", SECRET) },
        success: function(data){
          $checklist.attr('src', checklistUrl);
        }
      });
    }
    // ensure the iframe exists in the current DOM (it's removed on some types of navigation)
    if ($('#sidebarChecklist').length === 0) {
      $sidebar = $('#sidebarSubscribe').parent();
      $sidebar.append($checklist);
      // adjust the sidebar and case to give a bit more room to the checklist
      $sidebar.css('width', '300px');
      $('.events').css('width', '-webkit-calc(100% - 300px)');
    }
  }
});