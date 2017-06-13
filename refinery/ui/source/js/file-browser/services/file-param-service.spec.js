(function () {
  'use strict';

  describe('File Param Service', function () {
    var factory;
    var window;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function ($window, fileParamService) {
      window = $window;
      factory = fileParamService;
    }));

    it('factory and tools variables should exist', function () {
      expect(factory).toBeDefined();
      expect(factory.fileParam.offset).toEqual(0);
      expect(factory.fileParam.uuid).toEqual(window.externalAssayUuid);
    });

    describe('setParamFilterAttribute', function () {
      var attributeObj;

      beforeEach(inject(function () {
        attributeObj = {
          REFINERY_WORKFLOW_OUTPUT_6_3_s: [
            { '1_test_04': true },
            { '1_test_02': true }
          ]
        };
      }));

      it('setParamFilterAttribute is a method', function () {
        expect(angular.isFunction(factory.setParamFilterAttribute)).toBe(true);
      });

      it('setParamFilterAttribute sets analysisFilter', function () {
        factory.setParamFilterAttribute(attributeObj);
        expect(factory.fileParam.filter_attribute
          .REFINERY_WORKFLOW_OUTPUT_6_3_s[0]['1_test_04']).toEqual(true);
        expect(factory.fileParam.filter_attribute
          .REFINERY_WORKFLOW_OUTPUT_6_3_s[1]['1_test_02']).toEqual(true);
      });
    });
  });
})();
