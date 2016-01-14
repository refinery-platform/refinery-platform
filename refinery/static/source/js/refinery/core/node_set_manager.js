/*
 * node_set_manager.js
 *
 * Author: Nils Gehlenborg
 * Created: 25 January 2013
 *
 * This provides a UI and REST API interactions to allow users to create, edit
 * and delete node sets (representing a subset of files/samples/etc.) associated
 * with a data set.
 */

/*
 * Dependencies:
 * - JQuery
 * - JQueryUI
 * - underscore.js
 * - Refinery Solr Utilities
 */

function NodeSetManager(
    studyUuid, assayUuid, elementId, apiBaseUrl, crsfMiddlewareToken) {

  var self = this;
  // API related properties
  self.apiEndpoint = "nodeset";
  self.apiEndpointList = "nodesetlist";
  self.apiBaseUrl = apiBaseUrl;
  self.crsfMiddlewareToken = crsfMiddlewareToken;
  // data set to configure
  self.studyUuid = studyUuid;
  self.assayUuid = assayUuid;
  // parent element for UI
  self.elementId = elementId;
  // current list
  self.list = null;
  self.currentSelectionNodeSet = null;
  self.currentSelectionNodeSetName = "Current Selection";
  self.loadSelectionCallback = null;
  self.saveSelectionCallback = null;
}

NodeSetManager.prototype.setLoadSelectionCallback = function(callback) {
  var self = this;
  self.loadSelectionCallback = callback;
};

NodeSetManager.prototype.setSaveSelectionCallback = function (callback) {
  var self = this;
  self.saveSelectionCallback = callback;
};

NodeSetManager.prototype.initialize = function () {
  var self = this;

  if (self.elementId != null) {
    self.getList(function () {
      self.renderList();
    }, function () {
      // console.log("Failed to retrieve node set list.");
      self.renderList();
    });
  }
  else {
    self.getList(function () {
      // console.log("Successfully retrieved node set list.");
    }, function () {
      // console.log("Failed to retrieve node set list.");
    });
  }
  return null;
};


/*
 * Render the user interface components into element defined by self.elementId.
 */
NodeSetManager.prototype.renderList = function () {
  var self = this;

  // to get the bubble arrow back see here: http://www.eichefam.net/?p=4395
  var nodeSetListElementStyle = "max-height: 300px; overflow: hidden; overflow-y: auto;"
  var nodeSetListElementId = "node-set-list";
  var nodeSetSaveSelectionButtonElementId = "node-set-save-button";
  $("#" + self.elementId).html("");

  var code = "";

  code += '<select id="' + nodeSetListElementId + '" style="width:100%">';

  for (var i = 0; i < self.list.objects.length; ++i) {
    var object = self.list.objects[i];

    code += '<option id="' + object.uuid + '" data-uuid="' + object.uuid + '" data-resource-uri="' + object.resource_uri + '">' + object.name + '</option>'
  }

  code += '</select>'

  $("#" + self.elementId).html(code);

  $("#" + nodeSetListElementId).select2();



  $("#" + nodeSetListElementId).on("change", function (event) {
    // console.log(event.added.element[0].id);
    if (event.added.element[0].id !== self.currentSelectionNodeSetId) {
      var nodeSetUuid = event.added.element[0].id;
      self.getDetail(nodeSetUuid, self.loadSelectionCallback)
    }
  });

  $("#" + nodeSetSaveSelectionButtonElementId).click(function (event) {
    self.saveSelectionCallback();
  });
};


NodeSetManager.prototype.createUpdateUrl = function (nodeSet) {
  var self = this;
  var url = self.apiBaseUrl + self.apiEndpoint + "/" + nodeSet.uuid + "/";
  return url;
};


NodeSetManager.prototype.updateState = function (state, callbackSuccess) {
  callbackSuccess = callbackSuccess || function(){};
  var self = this;

  // --- START: set correct CSRF token via cookie ---
  // https://docs.djangoproject.com/en/1.4/ref/contrib/csrf/#ajax
  function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
      var cookies = document.cookie.split(';');
      for (var i = 0; i < cookies.length; i++) {
        var cookie = jQuery.trim(cookies[i]);
        // Does this cookie string begin with the name we want?
        if (cookie.substring(0, name.length + 1) == (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  var csrftoken = getCookie('csrftoken');

  function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
  }

  $.ajaxSetup({
    crossDomain: false, // obviates need for sameOrigin test
    beforeSend: function (xhr, settings) {
      if (!csrfSafeMethod(settings.type)) {
        xhr.setRequestHeader("X-CSRFToken", csrftoken);
      }
    }
  });
  // --- END: set correct CSRF token via cookie ---


  var data = state;

  if( typeof state.uuid  !== "undefined" ) {
    $.ajax({
      url: self.createUpdateUrl(state),
      type: "PUT",
      data: JSON.stringify(data),
      contentType: "application/json",
      dataType: "json",
      processData: false,
      success: function (result) {
        callbackSuccess(result);
        if ($.isEmptyObject(result)) {
          return;
        }
      },
      error: function (result) {
        // save to sessionStorage
        self.saveCurrentSelectionToSession(
          data.name,
          data.summary,
          data.solr_query,
          data.solr_query_components,
          data.node_count);
      }
    });
  }else{
     self.saveCurrentSelectionToSession(
        data.name,
        data.summary,
        data.solr_query,
        data.solr_query_components,
        data.node_count
     );
  }
};

NodeSetManager.prototype.createGetListUrl = function () {
  var self = this;

  var url = self.apiBaseUrl + self.apiEndpointList + "/" +
    "?" + "format=json" +
    "&" + "limit=0" +
    "&" + "order_by=-is_current" +
    "&" + "order_by=name" +
    "&" + "study__uuid=" + self.studyUuid +
    "&" + "assay__uuid=" + self.assayUuid;

  return url;
};


NodeSetManager.prototype.getList = function (callback, errorCallback) {
  var self = this;

  //These conditionals were added due to race conditions throwing console
  // errors. This should be refactored/removed after the angularjs convert.
  if(self.currentSelectionNodeSet !== null &&
    typeof self.currentSelectionNodeSet.uuid !== "undefined" || nodeSetManager !== null) {
    $.ajax({
      url: self.createGetListUrl(),
      type: "GET",
      dataType: "json",
      data: {csrfmiddlewaretoken: self.crsfMiddlewareToken},
      success: function (result) {

        if ($.isEmptyObject(result)) {
          // do nothing
          return;
        }

        self.list = result;

        if (self.list.objects.length > 0 && self.list.objects[0].is_current) {
          self.currentSelectionNodeSet = self.list.objects[0];
          // console.log('"' + self.currentSelectionNodeSetName + '" found.');

          callback(result);
        }
        else {
          // console.log('"' + self.currentSelectionNodeSetName + '" not found. Creating "' + self.currentSelectionNodeSetName + '"');

          // create empty selection and reload list
          self.createCurrentSelection(function () {
            self.getList(callback, errorCallback);
          }, function () {
            console.error("Failed to create current selection!");
          });
        }
      },
      error: function (result) {
        // initialize to sessionStorage
        self.saveCurrentSelectionToSession(self.currentSelectionNodeSetName, "", "", {}, 0);

        self.list = {objects: [self.loadCurrentSelectionFromSession()]};

        self.currentSelectionNodeSet = self.list.objects[0];

        if (errorCallback) {
          errorCallback(result);
        }
      }
    });
  }else{
    // initialize to sessionStorage
      self.saveCurrentSelectionToSession(self.currentSelectionNodeSetName, "", "", {}, 0);

      self.list = {objects: [self.loadCurrentSelectionFromSession()]};

      self.currentSelectionNodeSet = self.list.objects[0];
  }
};

NodeSetManager.prototype.createCurrentSelection = function(callback, errorCallback) {
  var self = this;
  self.postState(self.currentSelectionNodeSetName, "", "", {}, 0, callback, true);
};

NodeSetManager.prototype.createGetDetailUrl = function(uuid) {
  var self = this;
  var url = self.apiBaseUrl + self.apiEndpoint + "/"
    + uuid + "/" + "?" + "format=json";
  // console.log(url);
  return url;
};

NodeSetManager.prototype.getDetail = function(uuid, callback) {
  var self = this;
  $.ajax({
    url: self.createGetDetailUrl(uuid),
    type: "GET",
    dataType: "json",
    data: {csrfmiddlewaretoken: self.crsfMiddlewareToken},
    success: function (result) {
      if ($.isEmptyObject(result)) {
        // do nothing
        return;
      }
      self.detail = result;
      // callback
      self.loadSelectionCallback(result);
    }
  });
};

NodeSetManager.prototype.createPostUrl = function () {
  var self = this;
  var url = self.apiBaseUrl + self.apiEndpoint + "/";
  return url;
};

NodeSetManager.prototype.postState = function(name, summary, solr_query,
                                              solr_query_components, node_count,
                                              callback, is_current) {
  var self = this;
  is_current = false | is_current;
  // --- START: set correct CSRF token via cookie ---
  // https://docs.djangoproject.com/en/1.4/ref/contrib/csrf/#ajax
  function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
      var cookies = document.cookie.split(';');
      for (var i = 0; i < cookies.length; i++) {
        var cookie = jQuery.trim(cookies[i]);
        // Does this cookie string begin with the name we want?
        if (cookie.substring(0, name.length + 1) == (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  var csrftoken = getCookie('csrftoken');

  function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
  }

  $.ajaxSetup({
    crossDomain: false, // obviates need for sameOrigin test
    beforeSend: function (xhr, settings) {
      if (!csrfSafeMethod(settings.type)) {
        xhr.setRequestHeader("X-CSRFToken", csrftoken);
      }
    }
  });
  // --- END: set correct CSRF token via cookie ---

  var data = {
    "study": "/api/v1/study/" + self.studyUuid + "/",
    "assay": "/api/v1/assay/" + self.assayUuid + "/",
    "name": name,
    "summary": summary,
    "node_count": node_count,
    "solr_query": solr_query,
    "solr_query_components": solr_query_components,
    "uuid": null,
    "is_current": is_current
  };

  $.ajax({
    url: self.createPostUrl(),
    type: "POST",
    data: JSON.stringify(data),
    contentType: "application/json",
    dataType: "json",
    processData: false
  })
    .done(function (result, status, jqXHR) {
      callback();

      if ($.isEmptyObject(result)) {
        // do nothing
        return;
      }
    })
    .fail(function (XMLHttpRequest, textStatus, errorThrown) {
      console.error("Creation of node set failed.", XMLHttpRequest, textStatus, errorThrown);
    });
};


NodeSetManager.prototype.createCurrentSelectionSessionKey = function() {

  var self = this;

  return (self.studyUuid + "_" + self.assayUuid + "_" + "currentSelection");
};

NodeSetManager.prototype.createCurrentSelectionSessionValue = function(
    name, summary, solr_query, solr_query_components, node_count) {

  var self = this;

  var value = {
    "study": "/api/v1/study/" + self.studyUuid + "/",
    "assay": "/api/v1/assay/" + self.assayUuid + "/",
    "name": name,
    "summary": summary,
    "solr_query": solr_query,
    "solr_query_components": solr_query_components,
    "node_count": node_count,
    "is_current": true
  }

  return (value);
};


NodeSetManager.prototype.saveCurrentSelectionToSession = function(
    name, summary, solr_query, solr_query_components, node_count ) {

  var self = this;

  if (sessionStorage) {
    // console.log( "Writing to session storage as " + self.createCurrentSelectionSessionKey() );
    sessionStorage.setItem(
        self.createCurrentSelectionSessionKey(),
        JSON.stringify(self.createCurrentSelectionSessionValue(
            name, summary, solr_query, solr_query_components, node_count)));
  }
};

NodeSetManager.prototype.loadCurrentSelectionFromSession = function() {

  var self = this;

  if (sessionStorage) {
    // console.log( "Reading " + self.createCurrentSelectionSessionKey() + " from session storage" );
    return JSON.parse( sessionStorage.getItem( self.createCurrentSelectionSessionKey() ) );
  }

  return null;
};
