
/**
 * Chart Data Service
 * @namespace Chart Data Service
 * @desc Service which utilizes the user/files api to populate the home page
 * chart with accessible data sets
 * @memberOf refineryApp.refineryHome
 */
(function () {
  'use strict';
  angular
    .module('refineryHome')
    .factory('chartDataService', chartDataService);

  chartDataService.$inject = ['$log', 'userFileService'];

  function chartDataService ($log, userFileService) {
    var attributes = {};
    var attributeNames = [];
    var selectedAttribute = {
      countsArray: [],
      fieldsArray: []
    };

    var service = {
      attributes: attributes,
      attributeNames: attributeNames,
      selectedAttribute: selectedAttribute,
      getDataSets: getDataSets
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
       /**
     * @name addToolLaunchStatus
     * @desc Adds tool launch to the list
     * @memberOf refineryToolLaunch.toolLaunchStatusService
     * @param {object} toolLaunch - custom tool launch object requires uuid,
     * tool type, name, and status
    **/
    function getDataSets () {
      var userFile = userFileService.query();
      userFile.$promise.then(function (response) {
        // generate ui select list
        var attributeSolrNames = Object.keys(response.facet_field_counts);
        for (var i = 0; i < response.attributes.length; i++) {
          var solrName = response.attributes[i].internal_name;
          var displayName = response.attributes[i].display_name;
          if (displayName && attributeSolrNames.indexOf(solrName) > -1 &&
            solrName.indexOf('Characteristics') > 0) {
            attributeNames.push({
              name: displayName,
              solr_name: solrName
            });
          }
        }
        // To Do att setting numbers for 5
        var maxSetting = 5;
        var maxLength = maxSetting;
        var fields = '';
        for (var k = 0; k < attributeSolrNames.length; k++) {
          if (attributeSolrNames[k].indexOf('Characteristics') > -1) {
            fields = response.facet_field_counts[attributeSolrNames[k]];
            attributes[attributeSolrNames[k]] = {
              countsArray: [],
              fieldsArray: []
            };
            maxLength = fields.length > maxSetting ? maxSetting : fields.length;
            for (var j = 0; j < maxLength; j++) {
              attributes[attributeSolrNames[k]].countsArray.push(fields[j].count);
              attributes[attributeSolrNames[k]].fieldsArray.push(fields[j].name.split(' '));
            }
          }
        }
      }, function (error) {
        $log.error(error);
      });
      return userFile.$promise;
    }
  }
})();
