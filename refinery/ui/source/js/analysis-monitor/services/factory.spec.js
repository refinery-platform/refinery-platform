describe("Analysis Monitor Factory", function(){
  var factory, analysisMockList, valid_uuid, query;

  beforeEach(function(){
    module('refineryAnalysisMonitor', function($provide){
       valid_uuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';

       analysisMockList = jasmine.createSpyObj('analysisService', ['query']);

       $provide.value('analysisService', analysisMockList);
    });

    inject(function(_analysisMonitorFactory_){
      factory = _analysisMonitorFactory_;
    });
  });


  it('factory and tools variables should exist', function(){
    expect(factory).toBeDefined();
    expect(factory.analysesList).toEqual([]);
    expect(factory.analysesRunningList).toEqual([]);
    expect(factory.analysesGlobalList).toEqual([]);
    expect(factory.analysesRunningGlobalList).toEqual([]);
    expect(factory.analysesDetail).toEqual({});
  });


  it('getAnalysesList is a method', function () {
    //factory.getAnalysesList({uuid: valid_uuid});
    expect(angular.isFunction(factory.getAnalysesList)).toBe(true);
    //expect(analysisMockList.query).toHaveBeenCalled();
  });

   it('getAnalysesDetail is a method', function () {
    expect(angular.isFunction(factory.getAnalysesDetail)).toBe(true);
  });

   it('postCancelAnalysis is a method', function () {
    expect(angular.isFunction(factory.postCancelAnalysis)).toBe(true);
  });
});
