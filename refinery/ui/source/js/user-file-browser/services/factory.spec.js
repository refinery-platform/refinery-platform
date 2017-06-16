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

    describe('getUserFiles', function () {
      var userFiles;

      beforeEach(inject(function (
        $q,
        $rootScope,
        userFileService
      ) {
        userFiles = {
          nodes: [
            {
              REFINERY_ANALYSIS_UUID_6_3_s: 'N/A',
              Author_Characteristics_6_3_s: 'McConnell',
              REFINERY_WORKFLOW_OUTPUT_6_3_s: 'N/A'
            },
            {
              REFINERY_ANALYSIS_UUID_6_3_s: 'fbc78aaa-1050-403b-858c-a1504a40ef54',
              Author_Characteristics_6_3_s: 'McConnell',
              REFINERY_WORKFLOW_OUTPUT_6_3_s: '1_test_01'
            },
            {
              REFINERY_ANALYSIS_UUID_6_3_s: '547ac4a0-7d5a-48a9-8859-8620ad94c7a2',
              Author_Characteristics_6_3_s: 'McConnell',
              REFINERY_WORKFLOW_OUTPUT_6_3_s: '1_test tool out'
            }],
          attributes: [{
            attribute_type: 'Internal',
            file_ext: 's',
            display_name: 'Output Type',
            internal_name: 'REFINERY_WORKFLOW_OUTPUT_6_3_s'
          }, {
            attribute_type: 'Internal',
            file_ext: 's',
            display_name: 'Analysis',
            internal_name: 'REFINERY_ANALYSIS_UUID_6_3_s'
          }, {
            attribute_type: 'Characteristics',
            file_ext: 's',
            display_name: 'Author',
            internal_name: 'Author_Characteristics_6_3_s'
          }],
          facet_field_counts: {
            REFINERY_WORKFLOW_OUTPUT_6_3_s: {
              '1_test_04': 2,
              '1_test_02': 2
            },
            REFINERY_ANALYSIS_UUID_6_3_s: {
              '5d2311d1-6d8c-4857-bc57-2f25563aee91': 4
            },
            Author_Characteristics_6_3_s: {
              Vezza: 1,
              'Harslem/Heafner': 1,
              McConnell: 6,
              'Crocker + McConnell': 4,
              Crocker: 4,
              'Postel/Cerf': 1,
              Cotton: 1
            }
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
