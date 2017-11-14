'use strict';
/* eslint-disable */
/**
 * The refinery provenance graph visualization.
 *
 * @author sluger Stefan Luger https://github.com/sluger
 * @exports runProvVis The published function to run the visualization.
 */
var provvis = (function (  // eslint-disable-line no-unused-vars
  $, provvisDecl, provvisLayout, provvisMotifs, provvisRender
) {
  /**
   * On attribute filter change, the provenance visualization will be updated.
   * @param solrResponse Query response object holding information
   * about attribute filter changed.
   */
  var runProvVisUpdatePrivate = function (solrResponse) {
    provvisRender.runRenderUpdate(vis, solrResponse);
  };

  /**
   * Visualization instance getter.
   * @returns {null} The provvis instance.
   */
  var getProvVisPrivate = function () {
    return vis;
  };

  /**
   * Publish module function.
   */
  return {
    run: function (studyUuid, studyAnalyses, solrResponse) {
      runProvVisPrivate(studyUuid, studyAnalyses, solrResponse);
    },
    update: function (solrResponse) {
      runProvVisUpdatePrivate(solrResponse);
    },
    get: function () {
      return getProvVisPrivate();
    }
  };
}(
  window.$,
  window.provvisDecl,
  window.provvisLayout,
  window.provvisMotifs,
  window.provvisRender
));
