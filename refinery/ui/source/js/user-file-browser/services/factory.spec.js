(function () {
  'use strict';

  describe('User File Browser Factory', function () {
    var factory;
    var fakeToken = 'xxxx1';
    var mocker;
    var rootScope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryUserFileBrowser'));
    beforeEach(inject(function ($window, userFileBrowserFactory, mockParamsFactory) {
      factory = userFileBrowserFactory;
      mocker = mockParamsFactory;
      $window.csrf_token = fakeToken;
    }));

    it('factory and tools variables should exist', function () {
      expect(factory).toBeDefined();
      expect(factory.attributeFilters).toEqual([]);
      expect(factory.dataSetNodes).toEqual({ nodesCount: 0, totalNodesCount: 0 });
    });

    describe('createData', function () {
      it('handles empty', function () {
        expect(factory.createData([]))
        .toEqual([]);
      });

      it('returns correct response', function () {
        expect(factory.createData([{
          name: 'http://example.com/foo.bar',
          organism_Characteristics_generic_s: 'dog'
        }]))
        .toEqual([{
          url: 'http://example.com/foo.bar',
          name: 'http://example.com/foo.bar',
          organism: 'dog'
        }]);
      });
    });

    describe('createFilters', function () {
      it('creates filters', function () {
        expect(factory.createFilters(
          {
            organism_Characteristics_generic_s: [
              { name: 'mouse', count: 1 },
              { name: 'cat', count: 2 }
            ]
          }
        )).toEqual(
          {
            organism: {
              facetObj: [
                { name: 'mouse', count: 1, assocAttribute: 'organism_Characteristics_generic_s' },
                { name: 'cat', count: 2, assocAttribute: 'organism_Characteristics_generic_s' }
              ],
              lowerCaseNames: ' mouse cat'
            }
          }
        );
      });
    });

    describe('getUserFiles', function () {
      var userFiles;

      beforeEach(inject(function (
        $q,
        $rootScope,
        userFileService
      ) {
        userFiles = {
          nodes: [
            { field: 'count' }
          ],
          attributes: [{
            field: 'Internal',
            file_ext: 's',
            display_name: 'foo bar',
            internal_name: 'REFINERY_foo_bar'
          }],
          facet_field_counts: {
            field: [
              { name: 'name', count: 42 }
            ]
          }
        };
        spyOn(userFileService, 'query').and.callFake(function () {
          var deferred = $q.defer();
          deferred.resolve(userFiles);
          return {
            $promise: deferred.promise
          };
        });

        rootScope = $rootScope;
      }));

      it('getUserFiles is a method', function () {
        expect(angular.isFunction(factory.getUserFiles)).toBe(true);
      });

      it('getUserFiles returns a promise', function () {
        var successData;
        var response = factory.getUserFiles({
          uuid: mocker.generateUuid()
        }).then(function (responseData) {
          successData = responseData;
        });
        rootScope.$apply();
        expect(typeof response.then).toEqual('function');
        expect(successData).toEqual(userFiles);
      });
    });
  });
})();
