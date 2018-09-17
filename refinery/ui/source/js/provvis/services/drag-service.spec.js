(function () {
  'use strict';

  describe('provvis Drag Service', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      provvisDragService
    ) {
      service = provvisDragService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    describe('dragStart', function () {
      it('dragStart is a method', function () {
        expect(angular.isFunction(service.dragStart)).toBe(true);
      });
    });

    describe('dragging', function () {
      it('dragging is a method', function () {
        expect(angular.isFunction(service.dragging)).toBe(true);
      });
    });

    describe('dragEnd', function () {
      it('dragEnd is a method', function () {
        expect(angular.isFunction(service.dragEnd)).toBe(true);
      });
    });

    describe('applyDragBehavior', function () {
      it('applyDragBehavior is a method', function () {
        expect(angular.isFunction(service.applyDragBehavior)).toBe(true);
      });
    });
  });
})();

