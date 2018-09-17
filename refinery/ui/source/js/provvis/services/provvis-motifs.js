/**
 * provvis Motifs Service
 * @namespace provvisMotifsService
 * @desc Main motif discovery and injection module function
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisMotifsService', provvisMotifsService);

  provvisMotifsService.$inject = [
    '_',
    'provvisDeclService',
    'provvisHelpersService'
  ];

  function provvisMotifsService (
    _,
    provvisDeclService,
    provvisHelpersService
  ) {
    var provvisDecl = provvisDeclService;
    var provvisHelpers = provvisHelpersService;

    var service = {
      runMotifs: runMotifs
    };

    return service;

    /*
     *-----------------------
     * Method Definitions
     *
     */
    /**
     * Main motif discovery and injection module function.
     * @param graph The main graph object of the provenance visualization.
     * @param layerMethod Strict or weak layering, changing the condition analyses
     * are layered together.
     */
    function runMotifs (graph, layerMethod) {
      cleanLayerAnalysisMapping(graph);
      graph.lNodes = createLayerNodes(graph, layerMethod);
      createLayerAnalysisMapping(graph);
      computeAnalysisMotifDiff(graph);
    }
    /**
     * Module for motif discovery and injection.
     */
    /* TODO: May refine algorithm. */
    /**
     * Find and mark sequential and parallel analysis steps.
     * @param graph The provenance graph.
     * @param layerMethod Strict or weak layering, changing the condition analyses
     * are layered together.
     * @returns {*} Layered nodes.
     */
    function createLayerNodes (graph, layerMethod) {
      var layers = [];
      var lNodes = d3.map();
      var layerId = 0;

      /* Iterate breath first search. */
      graph.bclgNodes.forEach(function (l, i) {
        var motifs = d3.map();

        /* For each depth-level. */
        l.sort(function (a, b) {
          return provvisHelpers.parseISOTimeFormat(a.start) -
            provvisHelpers.parseISOTimeFormat(b.start);
        }).forEach(function (an) {
          var foundMotif = false;
          var thisMotif = null;
          var anPreds = d3.map();
          var anSuccs = d3.map();

          an.predLinks.values().forEach(function (pl) {
            anPreds.set(pl.source.autoId, pl.source);
          });
          an.succLinks.values().forEach(function (sl) {
            anSuccs.set(sl.target.autoId, sl.target);
          });

          /* Check if the current analysis conforms to a motif already created. */
          motifs.values().forEach(function (m) {
            /* Strict or weak layering. */
            if ((m.wfUuid === an.wfUuid && layerMethod === 'weak') ||
              (m.wfUuid === an.wfUuid && layerMethod === 'strict' &&
              m.numSubanalyses === an.children.size() &&
              an.predLinks.size() === m.numIns &&
              an.succLinks.size() === m.numOuts)) {
              if ((an.preds.values()[0].uuid === 'dataset' &&
                provvisHelpers.compareMaps(anPreds, m.preds)) ||
                an.preds.values()[0].uuid !== 'dataset') {
                foundMotif = true;
                thisMotif = m;
              }
            }
          });

          /* Create new motif. */
          if (!foundMotif) {
            // eslint-disable-line new-cap
            var motif = new provvisDecl.Motif();
            an.predLinks.values().forEach(function (pl) {
              motif.preds.set(pl.source.autoId, pl.source);
            });
            an.succLinks.values().forEach(function (sl) {
              motif.succs.set(sl.target.autoId, sl.target);
            });
            motif.numIns = an.predLinks.size();
            motif.numOuts = an.succLinks.size();
            motif.wfUuid = an.wfUuid;
            motif.numSubanalyses = an.children.size();
            motifs.set(motif.autoId, motif);
            an.motif = motif;
          } else {
            an.motif = thisMotif;
          }
        });

        layers.push(d3.map());


        /* Group the same motifs into a layer. */
        l.forEach(function (an) {
          var keyStr = an.preds.values().map(function (pan) {
            return pan.motif.autoId;
          });
          var layer = Object.create(null);

          /* Check topology of pred motifs and actual motif. */

          /* Create new layer. */
          if (!(layers[i].has(keyStr + '-' + an.motif.autoId))) {
            // eslint-disable-line new-cap
            layer = new provvisDecl.Layer(layerId, an.motif, graph, false);
            layer.children.set(an.autoId, an);
            an.layer = layer;
            lNodes.set(layer.autoId, an.layer);
            layerId++;

            layers[i].set(keyStr + '-' + an.motif.autoId, layer.autoId);

            /* Add to existing layer. */
          } else {
            layer = lNodes.get(layers[i].get(keyStr + '-' + an.motif.autoId));
            layer.children.set(an.autoId, an);
            an.layer = layer;
          }
        });
      });
      return lNodes;
    }

    /**
     * For each layer the corresponding analyses, preceding and succeeding links
     * as well as specifically in- and output nodes are mapped to it.
     * @param graph The provenance graph.
     */
    function createLayerAnalysisMapping (graph) {
      /* Layer children are set already. */
      graph.lNodes.values().forEach(function (ln) {
        ln.children.values().forEach(function (an) {
          /* Set analysis parent. */
          an.parent = an.layer;

          /* Set input nodes. */
          an.inputs.values().forEach(function (n) {
            ln.inputs.set(n.autoId, n);
          });
          /* Set output nodes. */
          an.outputs.values().forEach(function (n) {
            ln.outputs.set(n.autoId, n);
          });
        });

        /* Set workflow name. */
        var wfName = 'dataset';
        if (typeof graph.workflowData.get(ln.motif.wfUuid) !== 'undefined') {
          wfName = graph.workflowData.get(ln.motif.wfUuid).name;
        }
        ln.wfName = wfName.toString();
        ln.wfCode = ln.children.values()[0].wfCode;

        /* Set layer parent. */
        ln.parent = graph;

        /* Set layer visibility. */
        if (ln.children.size() <= 1) {
          ln.hidden = true;
        }
        /* Set child analysis visibility. */
        if (ln.children.size() === 1) {
          ln.children.values()[0].hidden = false;

          /* Set link visibility. */
          ln.children.values()[0].predLinks.values().forEach(function (pl) {
            pl.hidden = false;
          });
          ln.children.values()[0].succLinks.values().forEach(function (sl) {
            sl.hidden = false;
          });
        }
      });

      graph.lNodes.values().forEach(function (ln) {
        /* Set predecessor layers. */
        ln.children.values().forEach(function (an) {
          an.preds.values().forEach(function (pan) {
            if (!ln.preds.has(pan.layer.autoId)) {
              ln.preds.set(pan.layer.autoId, pan.layer);
            }
          });
        });

        /* Set successor layers. */
        ln.children.values().forEach(function (an) {
          an.succs.values().forEach(function (san) {
            if (!ln.succs.has(san.layer.autoId)) {
              ln.succs.set(san.layer.autoId, san.layer);
            }
          });
        });
      });

      /* Set layer links. */
      graph.lNodes.values().forEach(function (ln) {
        ln.children.values().forEach(function (an) {
          an.links.values().forEach(function (anl) {
            ln.links.set(anl.autoId, anl);
          });
        });
      });

      /* Set layer links. */
      var linkId = 0;
      graph.lNodes.values().forEach(function (pl) {
        pl.succs.values().forEach(function (sl) {
          // eslint-disable-line new-cap
          var layerLink = new provvisDecl.Link(linkId, pl, sl, pl.hidden ||
            sl.hidden);
          graph.lLinks.set(layerLink.autoId, layerLink);
          pl.succLinks.set(layerLink.autoId, layerLink);
          sl.predLinks.set(layerLink.autoId, layerLink);
          linkId++;
        });
      });
    }

    /**
     * Compute difference between motif and analysis.
     * @param graph The provenance graph.
     */
    function computeAnalysisMotifDiff (graph) {
      /* Compute motif analysis change*/
      graph.aNodes.sort(function (a, b) {
        return provvisHelpers.parseISOTimeFormat(a.start) -
          provvisHelpers.parseISOTimeFormat(b.start);
      }).forEach(function (an) {
        /* TODO: Fix as some new layers with a single analysis may have the motif
         * of the last layer created. */
        if (_.has(an.parent, 'children') && an.parent.children.size() !== 1) {
          an.motifDiff.numSubanalyses = an.children.size() -
            an.motif.numSubanalyses;
          an.motifDiff.numIns = an.predLinks.size() - an.motif.numIns;
          an.motifDiff.numOuts = an.succLinks.size() - an.motif.numOuts;
        }
      });
    }

    /**
     * Clear all layer information from analyses.
     * @param graph The provenance graph.
     */
    function cleanLayerAnalysisMapping (graph) {
      graph.aNodes.forEach(function (an) {
        an.layer = Object.create(null);
        an.motif = Object.create(null);
        an.parent = graph;
        an.motifDiff = {
          numIns: 0,
          numOuts: 0,
          wfUuid: an.wfUuid,
          numSubanalyses: 0
        };
      });
      graph.lNodes = d3.map();
      graph.lLinks = d3.map();
    }
  }
})();
