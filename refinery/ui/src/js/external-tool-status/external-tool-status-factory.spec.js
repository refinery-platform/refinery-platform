describe("External Tool Status Factory", function(){
  var factory, serverUrl;

  beforeEach(angular.mock.module('refineryExternalToolStatus'));
  beforeEach(angular.mock.inject(function(externalToolStatusFactory){
    factory = externalToolStatusFactory;
  }));

  it('factory and tools variables should exist', function(){
    expect(factory).toBeDefined();
    expect(factory.toolsDetails).toEqual([
      {"name": "SOLR", "status": "N/A", "last_time_check": "N/A", "is_active":"N/A"},
      {"name": "CELERY", "status": "N/A", "last_time_check": "N/A", "is_active":"N/A"},
      {"name": "GALAXY", "status": "N/A", "last_time_check": "N/A", "is_active":"N/A"}
    ]);
    expect(factory.tools).toEqual({});
  });

  it('processResponse method should process a response into an object with names and object statuses', function(){
    var obj = [
      {is_active: true, last_time_check: "2015-06-03T17:00:35.624156", name: "SOLR",
        resource_uri: "/api/v1/externaltoolstatus/2/", status: "SUCCESS", unique_instance_identifier: null},
      {is_active: true, last_time_check: "2015-06-03T17:00:36.641569", name: "CELERY",
        resource_uri: "/api/v1/externaltoolstatus/1/", status: "SUCCESS", unique_instance_identifier: null}
    ];

    factory.processResponse(obj);

    expect(factory.tools).toEqual({SOLR: {null: "SUCCESS"}, CELERY: {null: "SUCCESS"}});

    it('isSolrup, isCeleryUp, and isGalaxyUp should respond accordingly.', function(){
      expect(factory.isSolrUp()).toEqual("tools.SOLR[null]==='SUCCESS'");
      expect(factory.isCeleryUp()).toEqual("tools.CELERY[null]==='SUCCESS'");
      expect(factory.isGalaxyUp()).toEqual("true");

      factory.tools.pop();
      expect(factory.isSolrUp()).toEqual(false);
      factory.tools.pop();
      expect(factory.isCeleryUp()).toEqual(false);
      factory.tools.pop();
      expect(factory.isGalaxyUp()).toEqual(false);
    });
  });

  it('getSystemStatus should return overall status according to isToolUp methods.', function(){
    var obj = [
      {is_active: true, last_time_check: "2015-06-03T17:00:35.624156", name: "SOLR",
        resource_uri: "/api/v1/externaltoolstatus/2/", status: "SUCCESS", unique_instance_identifier: null},
      {is_active: true, last_time_check: "2015-06-03T17:00:36.641569", name: "CELERY",
        resource_uri: "/api/v1/externaltoolstatus/1/", status: "SUCCESS", unique_instance_identifier: null},
      {is_active: true, last_time_check: "2015-06-03T17:00:36.641569", name: "GALAXY",
        resource_uri: "/api/v1/externaltoolstatus/1/", status: "SUCCESS", unique_instance_identifier: null}
    ];
    factory.processResponse(obj);
    expect(factory.getSystemStatus()).toEqual("OK");

    factory.tools.CELERY = null;
    expect(factory.getSystemStatus()).toEqual("ERROR");

    factory.tools.CELERY = {null: "SUCCESS"};
    factory.tools.SOLR = null;
    expect(factory.getSystemStatus()).toEqual("WARNING");

    factory.tools.SOLR = {null: "SUCCESS"};
    factory.tools.GALAXY = null;
    expect(factory.getSystemStatus()).toEqual("WARNING");
  });

  it('setWhichTool should sort toolData by name', function(){
    var tempToolDetails = factory.toolsDetails;
    var testToolData = [
      {"name": "CELERY", "status": "FAIL", "last_time_check": "2014-12-17T03:24:00", "is_active":"N/A"},
      {"name": "GALAXY", "status": "SUCCESS", "last_time_check": "2014-12-17T03:24:00", "is_active":"N/A"},
      {"name": "SOLR", "status": "SUCCESS", "last_time_check": "2014-12-17T03:24:00", "is_active":"N/A"}
    ];
    for(var i = 0; i<testToolData.length; i++){
      factory.setWhichTool(testToolData[i]);
    }

    expect(tempToolDetails).toEqual([
      {"name": "SOLR", "status": "SUCCESS", "last_time_check": "2014-12-17T03:24:00", "is_active":"N/A"},
      {"name": "CELERY", "status": "FAIL", "last_time_check": "2014-12-17T03:24:00", "is_active":"N/A"},
      {"name": "GALAXY", "status": "SUCCESS", "last_time_check": "2014-12-17T03:24:00", "is_active":"N/A"}
    ]);
  });

});
