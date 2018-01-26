/* global fb, $checklist, $sidebar */

/* use this as a Manuscript customization to get checklists embedded on the case view page

  security warning: do not set this Customization to be active for anyone other than logged-in users
  so that the "SECRET" constant below isn't sent to the browser for anyone you don't
  want to have access to the checklists in Glitch
  (basically don't set a rule here for not-logged-in or community users)

*/
$(function(){
  
  const URL = 'URL'; // the domain of your checklist app
  const SECRET = 'SECRET'; // the shared auth secret
  if (!(fb && fb.config && fb.pubsub && fb.cases && fb.cases.current)) return;
  
  function runThisWhenCasePageModeChanges(sCommand) {
    if (URL === 'URL') {
      console.error('Checklist customization needs a bit more configuration. Set URL to your Glitch app url')
    } else if ( $.inArray(sCommand, ['load', 'view', 'email', 'reply', 'forward']) >= 0 )  {
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
    var checklistUrl = URL + '/checklist/' + ixBug + '/';
    // if the checklist iframe has already been created; ensure the src is correct
    if (typeof($checklist) !== 'undefined') {
      if ($checklist.attr('src') !== checklistUrl) {
        $checklist.attr('src', checklistUrl);
      }
    } else {
      // create the checklist (this should only happen once)
      $checklist = $('<iframe/>', { name: 'checklist', id: 'sidebarChecklist' });
      $checklist.css('width', '100%');
      // start with a short height, but adjust based on messages from the iframe sending it's size
      $checklist.css('height', '50px');
      $(window).on('message onmessage', function(e) {
        if (e.originalEvent && e.originalEvent.origin === URL) {
          $checklist.height(e.originalEvent.data);
        }
      });
      // send cross-domain authentication secret
      $.ajax({
        type: "GET", 
        xhrFields: {
          withCredentials: true
        },  
        url: URL,
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
    }
  }
});