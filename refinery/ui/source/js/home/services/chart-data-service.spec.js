(function () {
  'use strict';

  describe('Chart Data Service', function () {
    var factory;
    var fileService;
    var rootScope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryHome'));
    beforeEach(inject(function (
      $rootScope,
      chartDataService,
      userFileService
    ) {
      factory = chartDataService;
      fileService = userFileService;
      rootScope = $rootScope;
    }));

    it('factory and tools variables should exist', function () {
      expect(factory).toBeDefined();
      expect(factory.attributes).toEqual({});
      expect(factory.attributeNames).toEqual([]);
    });

    describe('getDataSets', function () {
      var filesResponse;
      var q;
      var field = 'technology_Characteristics_generic_s';

      beforeEach(inject(function (
        $q,
        $rootScope
      ) {
        q = $q;
        filesResponse = {
          facet_field_counts: {
            technology_Characteristics_generic_s: [
              {
                count: 143,
                name: 'DNA microarray'
              },
              {
                count: 27,
                name: 'nucleotide sequencing'
              }
            ]
          },
          attributes: [
            {
              attribute_type: 'Characteristics',
              file_ext: 's',
              display_name: 'Technology',
              internal_name: 'technology_Characteristics_generic_s'
            },
            {
              attribute_type: 'Factor Value',
              file_ext: 's',
              display_name: 'Technology',
              internal_name: 'technology_Factor_Value_generic_s'
            },
            {
              file_ext: 'uuid',
              display_name: '',
              internal_name: '*_uuid'
            }
          ] };

        spyOn(fileService, 'query').and.callFake(function () {
          var deferred = q.defer();
          deferred.resolve(filesResponse);
          return {
            $promise: deferred.promise
          };
        });

        rootScope = $rootScope;
      }));

      it('getDataSetSharing is a method', function () {
        expect(angular.isFunction(factory.getDataSets)).toBe(true);
      });

      it('getDataSetSharing returns a promise', function () {
        var successData;
        var response = factory.getDataSets().then(function (responseData) {
          successData = responseData.facet_field_counts[field].length;
        });
        rootScope.$apply();
        expect(typeof response.then).toEqual('function');
        expect(successData).toEqual(filesResponse.facet_field_counts[field].length);
      });

      it('getDataSetSharing sets attributeNames', function () {
        factory.getDataSets();
        rootScope.$apply();
        expect(factory.attributeNames[0].name).toEqual(
          filesResponse.attributes[0].display_name
        );
        expect(factory.attributeNames[0].solrName).toEqual(
          filesResponse.attributes[0].internal_name
        );
      });

      it('getDataSetSharing sets attributeNames only char attributes', function () {
        factory.getDataSets();
        rootScope.$apply();
        expect(factory.attributeNames.length).toEqual(1);
      });

      it('getDataSetSharing sets Attribute countsArray', function () {
        factory.getDataSets();
        rootScope.$apply();
        expect(factory.attributes[field].countsArray).toEqual([143, 27]);
      });

      it('getDataSetSharing sets Attribute countsArray', function () {
        factory.getDataSets();
        rootScope.$apply();
        expect(factory.attributes[field].fieldsArray[0]).toEqual(['DNA', 'microarray']);
        expect(factory.attributes[field].fieldsArray[1]).toEqual(['nucleotide', 'sequencing']);
      });
    });
  });
})();
