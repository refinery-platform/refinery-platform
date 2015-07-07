angular.module('refineryAnalyses')
    .factory("analysesFactory", ['$http', '$location', analysesFactory]);

function analysesFactory($http, $location) {
  "use strict";
  var serverUrl = "/api/v1/analysis/";
  var analysesList = [];
  //http://192.168.50.50:8000/api/v1/analysis/?format=json&limit=0&order_by=creation_date&data_set__uuid=102b83f1-9568-48db-9562-9e9ec58ab83d
  var getAnalysesList = function() {
    //var params = {
    //  'format':'json',
    //  'limit': 0,
    //  'order_by': 'creation_date',
    //  'data_set__uuid': dataSetUuid
    //};

    return $http.get(serverUrl +
      '?format=json&limit=0&order_by=creation_date&data_set__uuid='+ dataSetUuid)
      .then(function (response) {
      angular.copy(response.data.objects,analysesList);
    }, function (response) {
      console.error("Error accessing analyses API.");
    });
  };

 return{
   getAnalysesList: getAnalysesList,
   analysesList: analysesList,
 };
}
