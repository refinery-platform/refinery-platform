/**
 * provvis Highlight Service
 * @namespace provvisHighlightService
 * @desc Service for handling highlight
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisHighlightService', provvisHighlightService);

  provvisHighlightService.$inject = [
    'provvisDeclService',
    'provvisInitDOIService',
    'provvisPartsService'
  ];

  function provvisHighlightService (
    provvisDeclService,
    provvisInitDOIService,
    provvisPartsService
  ) {
    var doiService = provvisInitDOIService;
    var partsService = provvisPartsService;
    var provvisDecl = provvisDeclService;

    var service = {
      clearHighlighting: clearHighlighting,
      handlePathHighlighting: handlePathHighlighting,
      highlightPredPath: highlightPredPath,
      highlightSuccPath: highlightSuccPath

    };

    return service;
  /*
   *-----------------------
   * Method Definitions
   * ----------------------
   */
   /**
   * Reset css for all links.
   */
    function clearHighlighting () {
      var domNodeset = partsService.domNodeset;
      var hLink = partsService.hLink;
      var link = partsService.link;
      hLink.classed('hiddenLink', true);
      link.each(function (l) {
        l.highlighted = false;
      });

      domNodeset.each(function (n) {
        n.highlighted = false;
        n.doi.highlightedChanged();
      });
    }

      /**
   * Path highlighting.
   * @param d Node.
   * @param keyStroke Keystroke being pressed at mouse click.
   */
    function handlePathHighlighting (d, keyStroke) {
    /* Clear any highlighting. */
      clearHighlighting();

      if (keyStroke === 's') {
        /* Highlight path. */
        highlightSuccPath(d);
      } else if (keyStroke === 'p') {
        /* Highlight path. */
        highlightPredPath(d);
      }

      d3.select('.aHLinks').selectAll('.hLink').each(function (l) {
        if (l.highlighted) {
          l.hidden = false;
          d3.select(this).classed('hiddenLink', false);
        }
      });

      /* TODO: Temporarily enabled. */
      if (partsService.doiAutoUpdate) {
        doiService.recomputeDOI();
      }
    }

    /* TODO: Layer link highlighting. */
    /**
     * Get predecessing nodes for highlighting the path by the current
     * node selection.
     * @param n BaseNode extending constructor function.
     */
    function highlightPredPath (n) {
      /* Current node is highlighted. */
      n.highlighted = true;
      n.doi.highlightedChanged();

      /* Parent nodes are highlighted too. */
      var pn = n.parent;
      while (pn instanceof provvisDecl.BaseNode === true) {
        pn.highlighted = true;
        pn.doi.highlightedChanged();
        pn = pn.parent;
      }

      if (n instanceof provvisDecl.Layer) {
        n.children.values().forEach(function (an) {
          an.predLinks.values().forEach(function (l) {
            l.highlighted = true;
            l.hidden = false;
            d3.select('#hLinkId-' + l.autoId).classed('hiddenLink', false);

            highlightPredPath(l.source);
          });
        });
      } else {
        /* Get svg link element, and for each predecessor call recursively. */
        n.predLinks.values().forEach(function (l) {
          l.highlighted = true;
          if (!l.hidden) {
            d3.select('#hLinkId-' + l.autoId).classed('hiddenLink', false);
          }
          highlightPredPath(l.source);
        });
      }
    }

    /**
     * Get succeeding nodes for highlighting the path by the current
     * node selection.
     * @param n BaseNode extending constructor function.
     */
    function highlightSuccPath (n) {
      /* Current node is highlighted. */
      n.highlighted = true;
      n.doi.highlightedChanged();

      /* Parent nodes are highlighted too. */
      var pn = n.parent;
      while (pn instanceof provvisDecl.BaseNode === true) {
        pn.highlighted = true;
        pn.doi.highlightedChanged();
        pn = pn.parent;
      }

      if (n instanceof provvisDecl.Layer) {
        n.children.values().forEach(function (an) {
          an.succLinks.values().forEach(function (l) {
            l.highlighted = true;
            l.hidden = false;
            d3.select('#hLinkId-' + l.autoId).classed('hiddenLink', false);
            highlightSuccPath(l.target);
          });
        });
      } else {
        /* Get svg link element, and for each successor call recursively. */
        n.succLinks.values().forEach(function (l) {
          l.highlighted = true;
          if (!l.hidden) {
            d3.select('#hLinkId-' + l.autoId).classed('hiddenLink', false);
          }
          highlightSuccPath(l.target);
        });
      }
    }
  }
})();
