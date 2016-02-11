describe("Analysis Monitor Factory", function(){
  var factory, query, deferred, rootScope, analysisListObj;
  var valid_uuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryAnalysisMonitor'));

  beforeEach(inject( function(_analysisMonitorFactory_){
    factory = _analysisMonitorFactory_;
  }));

  it('factory and tools variables should exist', function(){
    expect(factory).toBeDefined();
    expect(factory.analysesList).toEqual([]);
    expect(factory.analysesRunningList).toEqual([]);
    expect(factory.analysesGlobalList).toEqual([]);
    expect(factory.analysesRunningGlobalList).toEqual([]);
    expect(factory.analysesDetail).toEqual({});
  });

  describe("getAnalysesList", function() {

    beforeEach(inject( function(analysisService, $q, $rootScope){
    analysisListObj = [{test1:1},{test2:2},{test3:3},{test4:4}];
    spyOn(analysisService, "query").and.callFake(function() {
      deferred = $q.defer();
      deferred.resolve(analysisListObj);
      return {$promise : deferred.promise};
    });
    rootScope = $rootScope;
  }));

    it('getAnalysesList is a method', function () {
      expect(angular.isFunction(factory.getAnalysesList)).toBe(true);
    });

    it('getAnalysesList returns a promise', function () {
      var successData;
      var response = factory.getAnalysesList({uuid: valid_uuid}).then(function (responseData) {
        successData = responseData;
      });
      rootScope.$apply();
      expect(typeof response.then).toEqual('function');
      expect(angular.isFunction(factory.getAnalysesList)).toBe(true);
      expect(successData).toEqual(analysisListObj);
    });
  });

   it('getAnalysesDetail is a method', function () {
    expect(angular.isFunction(factory.getAnalysesDetail)).toBe(true);
  });

   it('postCancelAnalysis is a method', function () {
    expect(angular.isFunction(factory.postCancelAnalysis)).toBe(true);
  });

});
