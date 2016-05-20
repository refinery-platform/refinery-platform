'use strict';
describe('Controller: Diff Attribute List Ctrl', function () {
  var ctrl;
  var scope;
  var service;
  var $controller;
  var $q;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryNodeMapping'));
  beforeEach(inject(function ($rootScope, _$q_, _$controller_, _analysisService_) {
    scope = $rootScope.$new();
    $q = _$q_;
    $controller = _$controller_;
    ctrl = $controller('DiffAttributeListCtrl', { $scope: scope });
    ctrl.diffAttributes = [];
    ctrl.commonAttributes = [];
    ctrl.setA = { attributes: [] };
    ctrl.setB = { attributes: [] };
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
          valueSetB: '6da2e5a4-aff6-4656-a261-867a0e56e0fc'
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
        { name: 'Analysis', value: '6da2e5a4-aff6-4656-a261-867a0e56e0fc' },
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
          valueSetB: '6da2e5a4-aff6-4656-a261-867a0e56e0fc'
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
        { name: 'Analysis', value: '6da2e5a4-aff6-4656-a261-867a0e56e0fc' },
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
    it('Makes an service/API call', function () {
      var mockResponse = '';
      var fakeCommonAttributes = [
         { name: 'Analysis Group', value: '-1' },
         { name: 'Analysis', value: '6da2e5a4-aff6-4656-a261-867a0e56e0fc' },
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
          '6da2e5a4-aff6-4656-a261-867a0e56e0fc'
      ).then(function (response) {
        mockResponse = response.objects[0].name;
      });
      scope.$apply();
      expect(typeof serviceResponse.then).toEqual('function');
      expect(mockResponse).toEqual('Analysis Fake Name');
      // updates the analysis name in object passed
      expect(fakeCommonAttributes[0].value).toEqual('Analysis Fake Name');
    });
  });
});
