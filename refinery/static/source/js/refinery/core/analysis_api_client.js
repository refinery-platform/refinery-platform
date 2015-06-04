/*
 * analysis_api_client.js
 *  
 * Author: Nils Gehlenborg 
 * Created: 6 April 2013
 * 
 * This provides a UI and REST API interactions to allow users to work with
 * analysis objects associated with a data set.
 */

/*
 * Dependencies:
 * - JQuery
 * - JQueryUI
 * - underscore.js
 * - Refinery Solr Utilities
 */

function AnalysisApiClient(dataSetUuid, apiBaseUrl, crsfMiddlewareToken) {
  var self = this;

  // API related properties
  self.apiEndpointList = "analysis";
  self.apiBaseUrl = apiBaseUrl;
  self.crsfMiddlewareToken = crsfMiddlewareToken;
  // data set to configure
  self.dataSetUuid = dataSetUuid;
  // current list
  self.list = null;
  // current state
  self.status = AnalysisApiClient.STATUS_UNDEFINED;
  // callbacks
  self.changeAnalysisCallback = null;
}

AnalysisApiClient.prototype.STATUS_UNDEFINED = 0;
AnalysisApiClient.prototype.STATUS_UPDATING = 1;
AnalysisApiClient.prototype.STATUS_READY = 2;
AnalysisApiClient.prototype.STATUS_ERROR = 3;

AnalysisApiClient.prototype.setChangeAnalysisCallback = function(callback) {
  var self = this;
  self.changeAnalysisCallback = callback;
};

AnalysisApiClient.prototype.initialize = function() {
  var self = this;
  self.refresh();
  return this;
};

AnalysisApiClient.prototype.refresh = function () {
  var self = this;
  self.getList(function () {
  }, function () {
  });
  return null;
};

AnalysisApiClient.prototype.createGetListUrl = function () {
  var self = this;
  var url = self.apiBaseUrl + self.apiEndpointList + "/" +
    "?" + "format=json" +
    "&" + "limit=0" +
    "&" + "order_by=creation_date" +
    "&" + "data_set__uuid=" + self.dataSetUuid;
  return url;
};

AnalysisApiClient.prototype.getList = function (callback, errorCallback) {
  var self = this;
  self.stats = AnalysisApiClient.STATUS_UPDATING;
  $.ajax({
    url: self.createGetListUrl(),
    type: "GET",
    dataType: "json",
    data: {csrfmiddlewaretoken: self.crsfMiddlewareToken},
    success: function(result) {
      if ($.isEmptyObject(result)) {
        // do nothing
        self.status = AnalysisApiClient.STATUS_UNDEFINED;
        return;
      }
      self.list = result;
      self.status = AnalysisApiClient.STATUS_READY;
      callback(result);
    },
    error: function(result) {
      self.status = AnalysisApiClient.STATUS_ERROR;
      if (errorCallback) {
        errorCallback(result);
      }
    }
  });
};
