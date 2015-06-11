/*
 * data_set_monitor.js
 *  
 * Author: Nils Gehlenborg 
 * Created: 13 May 2013
 * 
 * Provides monitor that provides information about a data set and keeps this
 * information up-to-date.
 */

/*
 * Dependencies:
 * - JQuery
 * - JQueryUI
 * - underscore.js
 * - DataSetMonitor
 */

DATA_SET_MONITOR_ANALYSES_UPDATED_COMMAND = 'data_set_monitor_analyses_updated';

function DataSetMonitor(
  dataSetUuid, apiBaseUrl, crsfMiddlewareToken, commands) {
  var self = this;
  // API related properties
  self.apiBaseUrl = apiBaseUrl;
  self.crsfMiddlewareToken = crsfMiddlewareToken;
  // data set to configure
  self.dataSetUuid = dataSetUuid;
  // current list of analyses
  self.analyses = null;
  self._commands = commands;
  // current state
  self.status = DataSetMonitor.STATE_UNDEFINED;
  // api clients
  self._analysisApiClient = new AnalysisApiClient(
      dataSetUuid, REFINERY_API_BASE_URL, crsfMiddlewareToken);
}

DataSetMonitor.prototype.initialize = function() {
  var self = this;
  self.refresh();
  return this;
};

DataSetMonitor.prototype.refresh = function() {
  var self = this;
  self._refreshAnalyses();
  return null;
};

DataSetMonitor.prototype._refreshAnalyses = function() {
  var self = this;
  self.analyses = null;
  self._analysisApiClient.getList(function() {
    self.analyses = self._analysisApiClient.list;
    self._commands.execute(DATA_SET_MONITOR_ANALYSES_UPDATED_COMMAND);
  }, function() {
    // log an error?
  });
  return null;
};

DataSetMonitor.prototype.getAnalysisLabel = function(analysisUuid) {
  var self = this;
  var analyses = self.analyses;
  if (analyses == null) {
    return analysisUuid;
  }
  for (var i = 0; i < analyses.objects.length; ++i) {
    if (analysisUuid == analyses.objects[i].uuid) {
      return (analyses.objects[i].name);
    }
  }
  return(analysisUuid);
};
