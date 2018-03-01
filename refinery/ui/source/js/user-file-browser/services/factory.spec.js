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
    });

    describe('createData', function () {
      it('handles empty', function () {
        expect(factory.createData([]))
        .toEqual([]);
      });

      it('handles matching duplicates', function () {
        expect(factory.createData([{
          name: 'http://example.com/foo.bar',
          organism_Characteristics_generic_s: 'dog',
          organism_Factor_Value_generic_s: 'dog'
        }]))
        .toEqual([{
          url: 'http://example.com/foo.bar',
          name: 'http://example.com/foo.bar', // TODO: This could be removed?
          organism: 'dog'
        }]);

        // TODO: and what if they don't match?
      });
    });

    describe('createFilters', function () {
      describe('utils', function () {
        it('_mergeAndAddObject', function () {
          var a = { a: 1 };
          var b = { a: 2, b: 3 };
          factory._mergeAndAddObject(a, b);
          expect(a).toEqual({
            a: 3,
            b: 3
          });
        });
        it('_objectToNameCount', function () {
          expect(factory._objectToNameCount({
            a: 1
          })).toEqual([{
            name: 'a',
            count: 1
          }]);
        });
        it('_nameCountToObject', function () {
          expect(factory._nameCountToObject([{
            name: 'a',
            count: 1
          }])).toEqual({
            a: 1
          });
        });
        it('_mergeAndAddNameCounts', function () {
          var a = [{ name: 'a', count: 1 }];
          var b = [{ name: 'a', count: 2 }, { name: 'b', count: 3 }];
          factory._mergeAndAddNameCounts(a, b);
          expect(a).toEqual([
            { name: 'a', count: 3 },
            { name: 'b', count: 3 }
          ]);
        });
      });
      it('handles duplicates', function () {
        expect(factory.createFilters(
          {
            organism_Characteristics_generic_s: [
              { name: 'mouse', count: 1 },
              { name: 'cat', count: 2 }
            ],
            organism_Factor_Value_generic_s: [
              { name: 'mouse', count: 3 },
              { name: 'dog', count: 4 }
            ]
          }
        )).toEqual(
          {
            organism: {
              facetObj: [
                { name: 'mouse', count: 4 },
                { name: 'cat', count: 2 },
                { name: 'dog', count: 4 }
              ],
              lowerCaseNames: ' mouse cat mouse dog', // This is ok: Just used for substring search.
              internalName: 'organism_Factor_Value_generic_s'
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
