(function () {
  /** Unit Tests **/
  'use strict';

  describe('Controller: Assay Files Util Modal Ctrl', function () {
    var ctrl;
    var scope;
    var factory;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function ($controller, $rootScope, fileBrowserFactory) {
      scope = $rootScope.$new();
      // Create mock version of dependency
      var $uibModalInstance = { close: function () {} };
      ctrl = $controller(
        'AssayFilesUtilModalCtrl',
        {
          $scope: scope,
          $uibModalInstance: $uibModalInstance
        });
      factory = fileBrowserFactory;
    }));

    it('AssayFilesUtilModalCtrl ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.assayAttributeOrder).toEqual([]);
    });

    describe('Refresh and Update AssayFilter from Factory', function () {
      it('refreshAssayFilter is method', function () {
        expect(angular.isFunction(ctrl.refreshAssayAttributes)).toBe(true);
      });

      it('refreshAssayFiles returns promise', function () {
        var mockAssayAttributes = false;
        spyOn(factory, 'getAssayAttributeOrder').and.callFake(function () {
          return {
            then: function () {
              mockAssayAttributes = true;
            }
          };
        });

        ctrl.refreshAssayAttributes();
        expect(mockAssayAttributes).toEqual(true);
      });

      it('updateAssayAttributes is method', function () {
        expect(angular.isFunction(ctrl.updateAssayAttributes)).toBe(true);
      });

      it('updateAssayAttributes returns promise', function () {
        var mockPostAssayAttributes = false;
        spyOn(factory, 'postAssayAttributeOrder').and.callFake(function () {
          return {
            then: function () {
              mockPostAssayAttributes = true;
            }
          };
        });

        ctrl.updateAssayAttributes();
        expect(mockPostAssayAttributes).toEqual(true);
      });

      it('updateAttributeRank method', function () {
        expect(angular.isFunction(ctrl.updateAttributeRank)).toBe(true);
      });

      it('updateAttributeRank returns promise', function () {
        var mockPostAssayAttributes = false;

        // Mock the array after a drag and drop movement
        ctrl.assayAttributeOrder = [
          { solr_field: 'Title', rank: 1 },
          { solr_field: 'Character', rank: 2 },
          { solr_field: 'Cell Type', rank: 3 },
          { solr_field: 'Name', rank: 4 },
          { solr_field: 'Character', rank: 2 }
        ];
        spyOn(ctrl, 'updateAssayAttributes').and.callFake(function () {
          mockPostAssayAttributes = true;
          return mockPostAssayAttributes;
        });

        ctrl.updateAttributeRank({ solr_field: 'Character', rank: 2 }, 1);
        expect(mockPostAssayAttributes).toEqual(true);
        // confirm removal of duplication in method
        expect(ctrl.assayAttributeOrder.length).toEqual(4);
        // check ranks are updated locally
        expect(ctrl.assayAttributeOrder[3].rank).toEqual(4);
        expect(ctrl.assayAttributeOrder[2].rank).toEqual(3);
        expect(ctrl.assayAttributeOrder[1].rank).toEqual(2);
        expect(ctrl.assayAttributeOrder[0].rank).toEqual(1);
      });
    });
  });
})();
