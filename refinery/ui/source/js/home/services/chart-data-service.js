/**
 * Chart Data Service
 * @namespace Chart Data Service
 * @desc Service which utilizes the user/files api for user accessible files
 * @memberOf refineryApp.refineryHome
 */
(function () {
  'use strict';
  angular
    .module('refineryHome')
    .factory('chartDataService', chartDataService);

  chartDataService.$inject = ['$log', 'userFileService'];

  function chartDataService ($log, userFileService) {
    var attributeFields = {};
    var attributeNames = [];

    var service = {
      attributeFields: attributeFields,
      attributeNames: attributeNames,
      getDataSets: getDataSets
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    /**
     * @name getDataSets
     * @desc Grab and store attribute fields and names from user files service
     * @memberOf refineryHome.chartDataService
    **/
    function getDataSets () {
      var userFile = userFileService.query();
      userFile.$promise.then(function (response) {
        // generate ui select list
        var attributeSolrNames = Object.keys(response.facet_field_counts);
        for (var i = 0; i < response.attributes.length; i++) {
          var solrName = response.attributes[i].internal_name;
          var displayName = response.attributes[i].display_name;
          // filter out unused/unwanted attribute names
          if (displayName && attributeSolrNames.indexOf(solrName) > -1 &&
            solrName.indexOf('Characteristics') > -1) {
            attributeNames.push({
              name: displayName,
              solrName: solrName
            });
          }
        }
        // parse the facet_field_counts into a counts and field names array for the data set chart
        var maxFieldLen = 5;
        var fields = '';
        for (var k = 0; k < attributeSolrNames.length; k++) {
          if (attributeSolrNames[k].indexOf('Characteristics') > -1) {
            fields = response.facet_field_counts[attributeSolrNames[k]];
            attributeFields[attributeSolrNames[k]] = {
              countsArray: [],
              fieldsArray: []
            };
            var maxCount = fields.length > maxFieldLen ? maxFieldLen : fields.length;
            for (var j = 0; j < maxCount; j++) {
              attributeFields[attributeSolrNames[k]].countsArray.push(fields[j].count);
              attributeFields[attributeSolrNames[k]].fieldsArray.push(fields[j].name.split(' '));
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
