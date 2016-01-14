angular.module('refinerySolr', [])


  .factory("solrFactory", function($resource, $window) {
    'use strict';

    return $resource(
      '/solr/data_set_manager/select/?q=django_ct\\:data_set_manager.node&wt=json&start=0&rows=20&fq=(uuid::nodeUuid%20AND%20study_uuid::studyUuid%20AND%20assay_uuid::assayUuid)&fq=type:(%22Raw%20Data%20File%22%20OR%20%22Derived%20Data%20File%22%20OR%20%22Array%20Data%20File%22%20OR%20%22Derived%20Array%20Data%20File%22%20OR%20%22Array%20Data%20Matrix%20File%22%20OR%20%22Derived%20Array%20Data%20Matrix%20File%22)&fl=:attributeList', {
        studyUuid: $window.externalStudyUuid,
        assayUuid: $window.externalAssayUuid
      }
    );
});
