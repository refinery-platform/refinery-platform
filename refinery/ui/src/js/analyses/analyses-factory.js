angular.module('refineryAnalyses')
    .factory("analysesFactory", ['$http', analysesFactory]);

function analysesFactory($http) {
  "use strict";
  var serverUrl = "/api/v1/analysis";
  var analysesList = [];
  var analysesRunningList = [];
  var analysisDetail = {};
  //http://192.168.50.50:8000/api/v1/analysis/?format=json&limit=0&order_by=creation_date&data_set__uuid=102b83f1-9568-48db-9562-9e9ec58ab83d

  //http.post needed to be adjusted because django was not recognizing it
  // as an ajax call, hence line 18.
  var getAnalysisDetail = function(uuid) {
    return $http({
      method: 'POST',
      url: '/analysis_manager/' + uuid + "/?format=json",
      data: {'csrfmiddlewaretoken': csrf_token},
      headers: { "X-Requested-With" : 'XMLHttpRequest'}
    }).then(function(response) {
     //   angular.copy(response.data, analysisDetail);
      processAnalysisDetail(response.data);
      }, function(error){
        console.error("Error accessing analysis monitoring API");
      });
  };

  var processAnalysisDetail = function(data){
    analysisDetail.preprocessing = data.preprocessing[0].state;
    analysisDetail.preprocessingPercentDone = data.preprocessing[0].percent_done;
    analysisDetail.postprocessing = data.postprocessing[0].state;
    analysisDetail.postprocessingPercentDone = data.postprocessing[0].percent_done;
    analysisDetail.execution = data.execution[0].state;
    analysisDetail.executionPercentDone = data.execution[0].percent_done;
  };

  var getAnalysesList = function() {
    return $http.get(serverUrl +
      '/?format=json&limit=0&order_by=creation_date&data_set__uuid='+ dataSetUuid)
      .then(function (response) {
      angular.copy(response.data.objects,analysesList);
    }, function (response) {
      console.error("Error accessing analyses API.");
    });
  };

 return{
   getAnalysesList: getAnalysesList,
   getAnalysisDetail: getAnalysisDetail,
   analysisDetail: analysisDetail,
   analysesList: analysesList,
   analysesRunningList: analysesRunningList,
 };
}
