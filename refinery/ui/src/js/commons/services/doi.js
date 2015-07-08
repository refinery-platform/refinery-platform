angular
  .module('refineryApp')
  .factory('doiService', ['$resource', 'settings',
    function ($resource, settings) {

      var doi = $resource('http://dx.doi.org/:id',
        {
          id: '@id'
        }
      );

      return doi;
    }
  ]);
