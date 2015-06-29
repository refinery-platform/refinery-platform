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
                // Alternative field for `content_auto` when no highlights were
                // found
                'f.content_auto.hl.alternateField': 'title',
                // Alternative field for `description` when no highlights were
                // found
                'f.description.hl.alternateField': 'description',
                // Fields that are returned
                'fl': 'id,uuid',
                // Limit search space to data sets only
                'fq': 'django_ct:core.dataset',
                // Highlighting enabled
                'hl': true,
                // Fields that are highlighted
                'hl.fl': 'content_auto,description',
                // Limit the alternate fields to 128 characters at most.
                // This could also be set on per field bases like so:
                // `f.description.hl.maxAlternateFieldLength = 256`
                'hl.maxAlternateFieldLength': '128',
                // Highlighting prefix
                'hl.simple.pre': '<em>',
                // Highlighting suffix
                'hl.simple.post': '</em>',
                // Query
                'q': searchQuery,
                // Query fields
                'qf': 'content_auto^0.5 submitter text',
                // # results returned
                'rows': limit,
                // Start of return
                'start': offset
              }, {
                index: 'core'
              });
          query
            .$promise
            .then(function (data) {
              var doc;

              for (var i = 0, len = data.response.docs.length; i < len; i++) {
                doc = data.response.docs[i];
                if (Object.keys(doc).length) {
                  if (data.highlighting[doc.id].content_auto) {
                    doc.title = $sce.trustAsHtml(
                      data.highlighting[doc.id].content_auto[0]
                    );
                  } else {
                    doc.title = sce.trustAsHtml(
                      '<span class="is-unknown">Unknown</span>'
                    );
                  }
                  if (data.highlighting[doc.id].description) {
                    doc.description = $sce.trustAsHtml(
                      data.highlighting[doc.id].description[0]
                    );
                  } else {
                    doc.description = null;
                  }
                } else {
                  // When there is no title and no description something's
                  // wrong with the document, so we better remove the doc from
                  // the results.
                }
              }

              deferred.resolve({
                meta: {
                  total_count: data.response.numFound
                },
                objects: data.response.docs
              });
            })
          .catch(function (error) {
              deferred.reject(error);
          });

          return deferred.promise;
        };
      };
    }
  ]);
