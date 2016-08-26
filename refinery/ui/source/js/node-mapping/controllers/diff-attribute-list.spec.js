'use strict';
describe('Controller: Diff Attribute List Ctrl', function () {
  var ctrl;
  var scope;
  var service;
  var $controller;
  var $q;
  var mockAnalysisUuid = '6da2e5a4-aff6-4656-a261-867a0e56e0fc';

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryNodeMapping'));
  beforeEach(inject(function ($rootScope, _$q_, _$controller_, _analysisService_) {
    scope = $rootScope.$new();
    $q = _$q_;
    $controller = _$controller_;
    ctrl = $controller('DiffAttributeListCtrl', { $scope: scope });
    ctrl.diffAttributes = [];
    ctrl.commonAttributes = [];
    ctrl.setA = { attributes: null };
    ctrl.setB = { attributes: null };
    service = _analysisService_;
  }));

  it('DiffAttributeListCtrl ctrl should exist', function () {
    expect(ctrl).toBeDefined();
  });

  describe('Test Helper, Seperate Common and Diff Attributes', function () {
    var setAttributeA = [];
    var setAttributeB = [];
    var expectedCommonAttributes = [];
    var expectedDiffAttributes = [];

    it('Common and Diff Gets populated', function () {
      expectedCommonAttributes = [
        { name: 'File Type', value: 'Text file' },
        { name: 'Year', value: '1971' }
      ];
      expectedDiffAttributes = [
        {
          name: 'Analysis Group',
          valueSetA: '-1',
          valueSetB: '0'
        }, {
          name: 'Analysis',
          valueSetA: 'N/A',
          valueSetB: mockAnalysisUuid
        }, {
          name: 'Title',
          valueSetA: 'Character',
          valueSetB: 'Response to RFC 86'
        }, {
          name: 'Month',
          valueSetA: 'March',
          valueSetB: 'April'
        }
      ];
      setAttributeA = [
        { name: 'Analysis Group', value: '-1' },
        { name: 'Analysis', value: 'N/A' },
        { name: 'Title', value: 'Character' },
        { name: 'File Type', value: 'Text file' },
        { name: 'Year', value: '1971' },
        { name: 'Month', value: 'March' }
      ];
      setAttributeB = [
        { name: 'Analysis Group', value: '0' },
        { name: 'Analysis', value: mockAnalysisUuid },
        { name: 'Title', value: 'Response to RFC 86' },
        { name: 'File Type', value: 'Text file' },
        { name: 'Year', value: '1971' },
        { name: 'Month', value: 'April' }
      ];
      for (var i = 0; i < setAttributeA.length; i++) {
        ctrl.seperateCommonAndDiffAttributes(setAttributeA[i], setAttributeB[i]);
      }
      expect(ctrl.commonAttributes).toEqual(expectedCommonAttributes);
      expect(ctrl.diffAttributes).toEqual(expectedDiffAttributes);
    });

    it('Only commonAttributes get Populate', function () {
      ctrl.commonAttributes = [];
      ctrl.diffAttributes = [];

      setAttributeA = [
        { name: 'Analysis Group', value: '-1' },
        { name: 'Analysis', value: 'N/A' },
        { name: 'Title', value: 'Character' },
        { name: 'File Type', value: 'Text file' },
        { name: 'Year', value: '1971' },
        { name: 'Month', value: 'March' }
      ];
      setAttributeB = setAttributeA;
      expectedCommonAttributes = setAttributeA;

      for (var i = 0; i < setAttributeA.length; i++) {
        ctrl.seperateCommonAndDiffAttributes(setAttributeA[i], setAttributeB[i]);
      }
      expect(ctrl.commonAttributes).toEqual(expectedCommonAttributes);
      expect(ctrl.diffAttributes).toEqual([]);
    });

    it('Only diffAttribute get Populate', function () {
      ctrl.commonAttributes = [];
      ctrl.diffAttributes = [];

      expectedDiffAttributes = [
        { name: 'Analysis Group', valueSetA: '-1', valueSetB: '0' },
        {
          name: 'Analysis',
          valueSetA: 'N/A',
          valueSetB: mockAnalysisUuid
        }, {
          name: 'Title',
          valueSetA: 'Character',
          valueSetB: 'Response to RFC 86'
        },
        { name: 'File Type', valueSetA: 'N/A', valueSetB: 'Text file' },
        { name: 'Year', valueSetA: '1978', valueSetB: '1971' },
        { name: 'Month', valueSetA: 'March', valueSetB: 'April' }
      ];

      setAttributeA = [
        { name: 'Analysis Group', value: '-1' },
        { name: 'Analysis', value: 'N/A' },
        { name: 'Title', value: 'Character' },
        { name: 'File Type', value: 'N/A' },
        { name: 'Year', value: '1978' },
        { name: 'Month', value: 'March' }
      ];
      setAttributeB = [
        { name: 'Analysis Group', value: '0' },
        { name: 'Analysis', value: mockAnalysisUuid },
        { name: 'Title', value: 'Response to RFC 86' },
        { name: 'File Type', value: 'Text file' },
        { name: 'Year', value: '1971' },
        { name: 'Month', value: 'April' }
      ];

      for (var i = 0; i < setAttributeA.length; i++) {
        ctrl.seperateCommonAndDiffAttributes(setAttributeA[i], setAttributeB[i]);
      }
      expect(ctrl.commonAttributes).toEqual([]);
      expect(ctrl.diffAttributes).toEqual(expectedDiffAttributes);
    });
  });

  describe('Test Helper Method, GetAndReplaceAnalysisName', function () {
    var arrayOfObj = [
      { name: 'Analysis Group', value: '-1' },
      { name: 'Title', value: 'Character' },
      { name: 'File Type', value: 'Text file' },
      { name: 'Year', value: '1971' },
      { name: 'Month', value: 'March' }
    ];
    it('No analysis name is found', function () {
      var index = ctrl.findAnalysisIndex(arrayOfObj);
      expect(index).toEqual(-1);
    });
    it('Analysis name is found', function () {
      arrayOfObj.push({ name: 'Analysis', value: 'N/A' });
      var index = ctrl.findAnalysisIndex(arrayOfObj);
      expect(index).toEqual(arrayOfObj.length - 1);
    });
  });

  describe('Test Helper Method, getAndReplaceAnalysisName', function () {
    it('Makes an service/API call and updates a common attribute obj', function () {
      var mockResponse = '';
      var fakeCommonAttributes = [
         { name: 'Analysis Group', value: '-1' },
         { name: 'Analysis', value: mockAnalysisUuid },
         { name: 'File Type', value: 'Text file' },
         { name: 'Year', value: '1971' }
      ];
      spyOn(service, 'query').and.callFake(function () {
        var deferred = $q.defer();
        deferred.resolve({ objects: [{ name: 'Analysis Fake Name' }] });
        return {
          $promise: deferred.promise
        };
      });

      expect(mockResponse).toEqual('');
      var serviceResponse = ctrl.getAndReplaceAnalysisName(
          1,
          fakeCommonAttributes,
          mockAnalysisUuid
      ).then(function (response) {
        mockResponse = response.objects[0].name;
      });
      scope.$apply();
      expect(typeof serviceResponse.then).toEqual('function');
      expect(mockResponse).toEqual('Analysis Fake Name');
      // updates the analysis name in object passed
      expect(fakeCommonAttributes[1].value).toEqual('Analysis Fake Name');
    });

    it('Makes an service/API call and updates a diff attribute obj', function () {
      var mockResponse = '';
      var fakeDiffAttributes = [
        {
          name: 'Analysis Group',
          valueSetA: '-1',
          valueSetB: '0'
        }, {
          name: 'Analysis',
          valueSetA: 'N/A',
          valueSetB: mockAnalysisUuid
        }, {
          name: 'Title',
          valueSetA: 'Character',
          valueSetB: 'Response to RFC 86'
        }, {
          name: 'Month',
          valueSetA: 'March',
          valueSetB: 'April'
        }
      ];
      spyOn(service, 'query').and.callFake(function () {
        var deferred = $q.defer();
        deferred.resolve({ objects: [{ name: 'Analysis Fake Name' }] });
        return {
          $promise: deferred.promise
        };
      });

      expect(mockResponse).toEqual('');
      var serviceResponse = ctrl.getAndReplaceAnalysisName(
          1,
          fakeDiffAttributes,
          mockAnalysisUuid
      ).then(function (response) {
        mockResponse = response.objects[0].name;
      });
      scope.$apply();
      expect(typeof serviceResponse.then).toEqual('function');
      expect(mockResponse).toEqual('Analysis Fake Name');
      // updates the analysis name in object passed
      expect(fakeDiffAttributes[1].valueSetB).toEqual('Analysis Fake Name');
    });
  });

  describe('Test Main Method, replaceAnalysisUuidWithName', function () {
    beforeEach(inject(function () {
      spyOn(ctrl, 'getAndReplaceAnalysisName');
      spyOn(ctrl, 'findAnalysisIndex').and.returnValue(0);
    }));

    it('Get and Replace Method is NOT called when Analysis === N/A', function () {
      ctrl.diffAttributes = [
        {
          name: 'Analysis',
          valueSetA: 'N/A',
          valueSetB: 'N/A'
        },
        { name: 'File Type', valueSetA: 'N/A', valueSetB: 'Text file' },
        { name: 'Month', valueSetA: 'March', valueSetB: 'April' }
      ];

      ctrl.commonAttributes = [
         { name: 'Analysis', value: 'N/A' },
         { name: 'File Type', value: 'Text file' },
         { name: 'Year', value: '1971' }
      ];
      ctrl.replaceAnalysisUuidWithName();
      expect(ctrl.getAndReplaceAnalysisName).not.toHaveBeenCalled();
    });

    it('Get and Replace Method is called when Analysis !== N/A', function () {
      ctrl.commonAttributes[0] = { name: 'Analysis', value: mockAnalysisUuid };
      ctrl.replaceAnalysisUuidWithName();
      expect(ctrl.getAndReplaceAnalysisName.calls.count()).toEqual(1);
      ctrl.diffAttributes[0] = {
        name: 'Analysis',
        valueSetA: mockAnalysisUuid,
        valueSetB: 'N/A'
      };
      ctrl.replaceAnalysisUuidWithName();
      expect(ctrl.getAndReplaceAnalysisName.calls.count()).toEqual(3);
      ctrl.diffAttributes[0] = {
        name: 'Analysis',
        valueSetA: mockAnalysisUuid,
        valueSetB: mockAnalysisUuid
      };
      ctrl.replaceAnalysisUuidWithName();
      expect(ctrl.getAndReplaceAnalysisName.calls.count()).toEqual(6);
    });
  });

  describe('Test Main Method, update diff', function () {
    beforeEach(inject(function () {
      spyOn(ctrl, 'seperateCommonAndDiffAttributes');
      spyOn(ctrl, 'replaceAnalysisUuidWithName');
    }));

    it('set attributes are empty', function () {
      ctrl.updateDiff();
      expect(ctrl.seperateCommonAndDiffAttributes).not.toHaveBeenCalled();
      expect(ctrl.replaceAnalysisUuidWithName).toHaveBeenCalled();
    });
    it('setA is populated', function () {
      ctrl.setA.attributes = [{ name: 'Title', value: 'Charater' }];
      ctrl.updateDiff();
      expect(ctrl.seperateCommonAndDiffAttributes).not.toHaveBeenCalled();
      expect(ctrl.setA.attributes).toEqual(ctrl.commonAttributes);
      expect(ctrl.replaceAnalysisUuidWithName).toHaveBeenCalled();
    });
    it('setB is populated', function () {
      ctrl.setB = { attributes: [{ name: 'Title', value: 'Charater' }] };
      ctrl.updateDiff();
      expect(ctrl.seperateCommonAndDiffAttributes).not.toHaveBeenCalled();
      expect(ctrl.setB.attributes).toEqual(ctrl.commonAttributes);
      expect(ctrl.replaceAnalysisUuidWithName).toHaveBeenCalled();
    });
    it('setA & B are populated', function () {
      ctrl.setB = { attributes: [{ name: 'Title', value: 'Charater' }] };
      ctrl.setA = { attributes: [{ name: 'Title', value: 'File Type' }] };
      ctrl.updateDiff();
      expect(ctrl.seperateCommonAndDiffAttributes).toHaveBeenCalled();
      expect(ctrl.replaceAnalysisUuidWithName).toHaveBeenCalled();
    });
  });
});
