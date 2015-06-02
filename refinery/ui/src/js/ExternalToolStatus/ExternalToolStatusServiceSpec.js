describe("External Tool Status Service", function(){
  var service;

  beforeEach(module('refineryExternalToolStatus'));
  beforeEach(inject(function(externalToolStatusService){
    service = externalToolStatusService;
  }));

  it('should exist', function(){
    expect(service).toBeDefined();
  });

  it('should return an external tools array of object', function(){
    var tempToolDetails = service.getToolsDetails();

    expect(tempToolDetails).toEqual([
      {"name": "SOLR", "status": "N/A", "last_time_check": "N/A", "is_active":"N/A"},
      {"name": "CELERY", "status": "N/A", "last_time_check": "N/A", "is_active":"N/A"},
      {"name": "GALAXY", "status": "N/A", "last_time_check": "N/A", "is_active":"N/A"}
    ]);
  });

  it('should sort toolData by name', function(){
    var tempToolDetails = service.getToolsDetails();
    var testToolData = [
      {"name": "CELERY", "status": "FAIL", "last_time_check": "2014-12-17T03:24:00", "is_active":"N/A"},
      {"name": "GALAXY", "status": "SUCCESS", "last_time_check": "2014-12-17T03:24:00", "is_active":"N/A"},
      {"name": "SOLR", "status": "SUCCESS", "last_time_check": "2014-12-17T03:24:00", "is_active":"N/A"}
    ];
    for(var i = 0; i<testToolData.length; i++){
      service.setWhichTool(testToolData[i]);
    };

    expect(tempToolDetails).toEqual([
      {"name": "SOLR", "status": "SUCCESS", "last_time_check": "2014-12-17T03:24:00", "is_active":"N/A"},
      {"name": "CELERY", "status": "FAIL", "last_time_check": "2014-12-17T03:24:00", "is_active":"N/A"},
      {"name": "GALAXY", "status": "SUCCESS", "last_time_check": "2014-12-17T03:24:00", "is_active":"N/A"}
    ]);
  })
});