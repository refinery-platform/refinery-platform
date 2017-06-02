'use strict';

function DataSetSearchApiFactory ($sce, settings, solrService, sessionService) {
  function DataSetSearchApi (searchQuery, firstTimeAllIds) {
    return function (limit, offset) {
      var query = solrService.get(
        {
          // Query for all dataset IDs and annotations. This is needed for some
          // visualization tools.
          allIds: firstTimeAllIds ? 1 : 0,
          // Synonym eDisMax Query Parser
          // https://github.com/healthonnet/hon-lucene-synonyms
          defType: settings.djangoApp.solrSynonymSearch ?
            'synonym_edismax' : 'edismax',
          // Alternative field for `title` when no highlights were
          // found
          'f.title.hl.alternateField': 'title',
          // Do not truncate the highlighted title field
          'f.title.hl.fragsize': '0',
          // Alternative field for `description` when no highlights were
          // found
          'f.description.hl.alternateField': 'description',
          // Fields that are returned
          fl: 'dbid,uuid,access',
          // Limit search space to data sets only
          fq: 'django_ct:core.dataset',
          // Highlighting enabled
          hl: true,
          // Fields that are highlighted
          'hl.fl': 'title,description',
          // Limit the alternate fields to 128 characters at most.
          // This could also be set on per field bases like so:
          // `f.description.hl.maxAlternateFieldLength = 256`
          'hl.maxAlternateFieldLength': '128',
          // Highlighting prefix
          'hl.simple.pre': '<em>',
          // Highlighting suffix
          'hl.simple.post': '</em>',
          // Query
          q: searchQuery,
          // Query fields
          qf: 'title^0.5 accession submitter text description',
          // # results returned
          rows: limit,
          // Start of return
          start: offset,
          // Enable synonym search
          synonyms: !!settings.djangoApp.solrSynonymSearch
        },
        {
          index: 'core'
        }
      );

      // In this case we explicitly want to reassign the parameter to make sure
      // that all IDs are truly only retrieved once!
      firstTimeAllIds = false;  // eslint-disable-line no-param-reassign

      return query
        .$promise
        .then(function (data) {
          var doc;
          var id;
          var userId = sessionService.get('userId');

          for (var i = 0, len = data.response.docs.length; i < len; i++) {
            doc = data.response.docs[i];
            id = 'core.dataset.' + doc.dbid;

            doc.id = doc.dbid;

            if (data.highlighting[id].title) {
              doc.titleHtml = $sce.trustAsHtml(
                data.highlighting[id].title[0]
              );
            } else {
              doc.titleHtml = $sce.trustAsHtml(
                '<span class="is-unknown">Unknown</span>'
              );
            }
            if (data.highlighting[id].description) {
              doc.descriptionHtml = $sce.trustAsHtml(
                data.highlighting[id].description[0]
              );
            } else {
              doc.descriptionHtml = null;
            }
            if (doc.access) {
              if (userId && doc.access.indexOf('u_' + userId) >= 0) {
                doc.is_owner = true;
              }
              if (doc.access.indexOf('g_' + settings.djangoApp.publicGroupId) >= 0) {
                doc.public = true;
              }
            }
          }

          return {
            meta: {
              limit: limit,
              offset: offset,
              total: data.response.numFound
            },
            data: data.response.docs,
            allIds: data.response.allIds ? data.response.allIds : []
          };
        }
      );
    };
  }

  return DataSetSearchApi;
}

angular
  .module('dataSet')
  .factory('DataSetSearchApi', [
    '$sce',
    'settings',
    'solrService',
    'sessionService',
    DataSetSearchApiFactory
  ]);
