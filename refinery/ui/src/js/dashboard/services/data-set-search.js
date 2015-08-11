angular
  .module('refineryDashboard')
  .factory('dashboardDataSetSearchService', [
    '$sce',
    'settings',
    'solrService',
    'sessionService',
    function ($sce, settings, solrService, sessionService) {
      return function (searchQuery) {
        return function (limit, offset) {
          var query = solrService.get({
                // Extended DisMax
                'defType': 'edismax',
                // Alternative field for `content_auto` when no highlights were
                // found
                'f.content_auto.hl.alternateField': 'title',
                // Alternative field for `description` when no highlights were
                // found
                'f.description.hl.alternateField': 'description',
                // Fields that are returned
                'fl': 'id,uuid,access',
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

          return query
            .$promise
            .then(function (data) {
              var doc,
                  userId = sessionService.get('userId');

              for (var i = 0, len = data.response.docs.length; i < len; i++) {
                doc = data.response.docs[i];
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
                if (doc.access) {
                  if (userId && doc.access.indexOf('u_' + userId) >= 0) {
                    doc.is_owner = true;
                  }
                  if (doc.access.indexOf('g_' + settings.publicGroupId) >= 0) {
                    doc.public = true;
                  }
                }
              }

              return {
                meta: {
                  total_count: data.response.numFound
                },
                objects: data.response.docs
              };
            });
        };
      };
    }
  ]);
