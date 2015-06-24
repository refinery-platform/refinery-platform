angular
  .module('refineryDashboard')
  .factory('dashboardDataSetSearchService', ['$q', '$sce', 'solrService',
    function ($q, $sce, solrService) {
      return function (searchQuery) {
        return function (limit, offset) {
          var deferred = $q.defer(),
              query = solrService.get({
                // Extended DisMax
                'defType': 'edismax',
                // Fields that are returned
                'fl': 'id,title,uuid',
                // Highlighting enabled
                'hl': true,
                // Fields that are highlighted
                'hl.fl': 'content_auto',
                // Highlighting prefix
                'hl.simple.pre': '<em>',
                // Highlighting suffix
                'hl.simple.post': '</em>',
                // Query
                'q': searchQuery,
                // Query fields
                'qf': 'content_auto^0.5 text',
                // # results returned
                'rows': limit,
                // Start of return
                'start': offset
              }, {
                index: 'core'
              });

          query
            .$promise
            .then(
              function (data) {
                var docId ;

                for (var i = 0, len = data.response.docs.length; i < len; i++) {
                  docId = data.response.docs[i].id;
                  if (data.highlighting[docId]) {
                    data.response.docs[i].highlighting = $sce.trustAsHtml(data.highlighting[docId].content_auto[0]);
                  } else {
                    data.response.docs[i].highlighting = false;
                  }
                }

                deferred.resolve({
                  meta: {
                    total_count: data.response.numFound
                  },
                  objects: data.response.docs
                });
              },
              function (error) {
                deferred.reject(error);
              }
            );

          return deferred.promise;
        };
      };
    }
  ]);
