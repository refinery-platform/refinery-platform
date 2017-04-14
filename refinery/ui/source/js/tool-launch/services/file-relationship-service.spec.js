(function () {
  'use strict';

  describe('File Relationship Service', function () {
    var mocker;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (
      fileRelationshipService,
      mockParamsFactory
    ) {
      service = fileRelationshipService;
      mocker = mockParamsFactory;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    it('setGroupCollection is a method', function () {
      expect(angular.isFunction(service.setGroupCollection)).toBe(true);
    });

    it('setNodeSelectCollection is a method', function () {
      expect(angular.isFunction(service.setNodeSelectCollection)).toBe(true);
    });

    it('refreshFileMap is a method', function () {
      expect(angular.isFunction(service.refreshFileMap)).toBe(true);
    });

    describe('File Relationship Service', function () {
      it('resetCurrents is a method', function () {
        expect(angular.isFunction(service.resetCurrents)).toBe(true);
      });

      it('resetCurrents resets variables', function () {
        service.currentGroup = [0, 0, 1];
        service.currentTypes = ['PAIR', 'LIST', 'LIST'];
        service.inputFileTypes = [
          {
            name: 'Input File Mock Name',
            uuid: mocker.generateUuid(),
            description: 'Big WIG',
            allowed_filetypes: [{ name: 'BAM' }]
          }
        ];
        service.resetCurrents();
        expect(service.currentGroup).toEqual([]);
        expect(service.currentTypes).toEqual([]);
        expect(service.inputFileTypes).toEqual([]);
      });
    });
  });
})();
