/**
 * provvis Tooltip Service
 * @namespace provvisTooltipService
 * @desc Service for drawing tooltips and hiding/showing tooltips
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisTooltipService', provvisTooltipService);

  provvisTooltipService.$inject = [
    '$',
    'provvisHelpersService',
    'provvisPartsService'
  ];

  function provvisTooltipService (
    $,
    provvisHelpersService,
    provvisPartsService
  ) {
    var provvisHelpers = provvisHelpers;
    var partsService = provvisPartsService;

    var service = {
      handleTooltips: handleTooltips,
      hideTooltip: hideTooltip,
      showTooltip: showTooltip
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    /**
     * Adds tooltips to nodes.
     */
    function handleTooltips () {
      var aBBox = partsService.aBBox;
      var aNode = partsService.aNode;
      var cell = partsService.cell;
      var lBBox = partsService.lBBox;
      var lNode = partsService.lNode;
      var node = partsService.node;
      var saBBox = partsService.saBBox;
      var saNode = partsService.saNode;
      var scaleFactor = partsService.scaleFactor;
      var vis = partsService.vis;

      /**
       * Helper function for tooltip creation.
       * @param key Property name.
       * @param value Property value.
       * @returns {string} Inner html code.
       */
      var createHTMLKeyValuePair = function (key, value) {
        return '<b>' + key + ': ' + '</b>' + value;
      };

      /* Node tooltips. */
      node.on('mouseover', function (d) {
        var self = d3.select(this);
        var ttStr = createHTMLKeyValuePair('Name', d.name) + '<br>' +
          createHTMLKeyValuePair('Type', d.fileType) + '<br>' +
          createHTMLKeyValuePair('File Url', d.fileUrl) + '<br>' +
          createHTMLKeyValuePair('UUID', d.uuid) + '<br>';
        d.attributes.forEach(function (key, value) {
          ttStr += createHTMLKeyValuePair(key, value) + '<br>';
        });
        showTooltip(ttStr, event);
        /* self.classed("mouseoverNode", true); */
        d.parent.parent.parent.children.values().forEach(function (sibling) {
          d3.select('#BBoxId-' + sibling.autoId).style('stroke-opacity', 0.3);
        });
        d3.select('#BBoxId-' + d.parent.autoId).classed('mouseoverBBox', true);
        self.select('.labels').attr('clip-path', '');

        /* Get current node label pixel width. */
        var attrText = (d.label === '') ? d.name : d.label;
        if (d.nodeType === 'stored') {
          var selAttrName = '';
          $('#prov-ctrl-visible-attribute-list > li').each(function () {
            if ($(this).find('input[type=\'radio\']').prop('checked')) {
              selAttrName = $(this).find('label').text();
            }
          });
          attrText = d.attributes.get(selAttrName);
        }

        /* Set label text. */
        self.select('.nodeAttrLabel').text(attrText);

        d3.selectAll('.node:not(#nodeId-' + d.autoId +
          ')').selectAll('.nodeAttrLabel').transition()
          .duration(partsService.nodeLinkTransitionTime).attr('opacity', 0);
      }).on('mousemove', function (d) {
        var ttStr = createHTMLKeyValuePair('Name', d.name) + '<br>' +
          createHTMLKeyValuePair('Type', d.fileType) + '<br>' +
          createHTMLKeyValuePair('File Url', d.fileUrl) + '<br>' +
          createHTMLKeyValuePair('UUID', d.uuid) + '<br>';
        d.attributes.forEach(function (key, value) {
          ttStr += createHTMLKeyValuePair(key, value) + '<br>';
        });
        d3.select('#BBoxId-' + d.parent.autoId).classed('mouseoverBBox', true);
        showTooltip(ttStr, event);
      }).on('mouseout', function (d) {
        var self = d3.select(this);
        hideTooltip();
        /* self.classed("mouseoverNode", false); */
        d.parent.parent.parent.children.values().forEach(function (sibling) {
          d3.select('#BBoxId-' + sibling.autoId).style('stroke-opacity', 0.0);
        });
        d3.select('#BBoxId-' + d.parent.autoId).classed('mouseoverBBox', false);
        self.select('.labels').attr('clip-path',
          'url(#bbClipId-' + d.autoId + ')');

        /* Get current node label pixel width. */
        var maxLabelPixelWidth = (cell.width - 2 * scaleFactor * vis.radius) *
          d3.transform(d3.select('.canvas').select('g').select('g')
            .attr('transform')).scale[0];
        var attrText = (d.label === '') ? d.name : d.label;
        if (d.nodeType === 'stored') {
          var selAttrName = '';
          $('#prov-ctrl-visible-attribute-list > li').each(function () {
            if ($(this).find('input[type=\'radio\']').prop('checked')) {
              selAttrName = $(this).find('label').text();
            }
          });
          attrText = d.attributes.get(selAttrName);
        }

        /* Set label text. */
        if (typeof attrText !== 'undefined') {
          self.select('.nodeAttrLabel').text(attrText);
          var trimRatio = parseInt(attrText.length * (maxLabelPixelWidth /
            self.select('.nodeAttrLabel').node().getComputedTextLength()), 10);
          if (trimRatio < attrText.length) {
            self.select('.nodeAttrLabel').text(attrText.substr(0, trimRatio - 3) +
              '...');
          }
        }

        d3.selectAll('.nodeAttrLabel').transition()
          .duration(partsService.nodeLinkTransitionTime).attr('opacity', 1);
      });

      /* Subanalysis tooltips. */
      saNode.on('mouseover', function (d) {
        var self = d3.select(this);
        self.select('.labels').attr('clip-path', '');
        d.parent.parent.children.values().forEach(function (sibling) {
          d3.select('#BBoxId-' + sibling.autoId).style('stroke-opacity', 0.3);
        });
      }).on('mousemove', function () {
      }).on('mouseout', function (d) {
        var self = d3.select(this);
        self.select('.labels').attr('clip-path',
          'url(#bbClipId-' + d.autoId + ')');
        d.parent.parent.children.values().forEach(function (sibling) {
          d3.select('#BBoxId-' + sibling.autoId).style('stroke-opacity', 0.0);
        });
      });

      /* Analysis tolltips. */
      aNode.on('mouseover', function (d) {
        var self = d3.select(this);
        self.select('.labels').attr('clip-path', '');
        d.parent.children.values().forEach(function (sibling) {
          d3.select('#BBoxId-' + sibling.autoId).style('stroke-opacity', 0.3);
        });
      }).on('mousemove', function () {
      }).on('mouseout', function (d) {
        var self = d3.select(this);
        self.select('.labels')
          .attr('clip-path', 'url(#bbClipId-' + d.autoId + ')');
        d.parent.children.values().forEach(function (sibling) {
          d3.select('#BBoxId-' + sibling.autoId).style('stroke-opacity', 0.0);
        });
      });

      /* Layer . */
      lNode.on('mouseover', function () {
        var self = d3.select(this);
        self.select('.labels').select('.wfLabel').attr('clip-path', '');
      }).on('mousemove', function () {
      }).on('mouseout', function (d) {
        var self = d3.select(this);
        self.select('.labels').select('.wfLabel')
          .attr('clip-path', 'url(#bbClipId-' + d.autoId + ')');
      });

      /* On mouseover subanalysis bounding box. */
      saBBox.on('mouseover', function (d) {
        var self = d3.select(this);
        self.classed('mouseoverBBox', true);
        d.parent.parent.children.values().forEach(function (sibling) {
          d3.select('#BBoxId-' + sibling.autoId).style('stroke-opacity', 0.3);
        });
        self.select('.labels').attr('clip-path', '');
        /*
         d.children.values().forEach( function (n) {
         /!* Get current node label pixel width. *!/
         var attrText = (n.label === "") ? n.name : n.label;
         if (n.nodeType === "stored") {
         var selAttrName = "";
         $("#prov-ctrl-visible-attribute-list > li").each(function () {
         if ($(this).find("input[type='radio']").prop("checked")) {
         selAttrName = $(this).find("label").text();
         }
         });
         attrText = n.attributes.get(selAttrName);
         }

         /!* Set label text. *!/
         d3.select("nodeId-" + n.autoId).select(".nodeAttrLabel").text(attrText);
         });*/
      }).on('mouseout', function (d) {
        var self = d3.select(this);
        self.classed('mouseoverBBox', false);
        d.parent.parent.children.values().forEach(function (sibling) {
          d3.select('#BBoxId-' + sibling.autoId).style('stroke-opacity', 0.0);
        });
        self.select('.labels')
          .attr('clip-path', 'url(#saBBClipId-' + d.autoId + ')');
        /*
         d.children.values().forEach( function (n) {
         /!* Get current node label pixel width. *!/
         var maxLabelPixelWidth = (cell.width - 2 * scaleFactor * vis.radius) *
         d3.transform(d3.select(".canvas").select("g").select("g")
         .attr("transform")).scale[0];
         var attrText = (n.label === "") ? n.name : n.label;
         if (n.nodeType === "stored") {
         var selAttrName = "";
         $("#prov-ctrl-visible-attribute-list > li").each(function () {
         if ($(this).find("input[type='radio']").prop("checked")) {
         selAttrName = $(this).find("label").text();
         }
         });
         attrText = n.attributes.get(selAttrName);
         }

         /!* Set label text. *!/
         d3.select("nodeId-" + n.autoId).select(".nodeAttrLabel").text(attrText);
         var trimRatio = parseInt(attrText.length * (maxLabelPixelWidth /
         d3.select("nodeId-" + n.autoId).select(".nodeAttrLabel").node()
         .getComputedTextLength()), 10);
         if (trimRatio < attrText.length) {
         d3.select("nodeId-" + n.autoId).select(".nodeAttrLabel")
         .text(attrText.substr(0, trimRatio - 3) +
         "...");
         }
         });*/
      });

      /* On mouseover analysis bounding box. */
      aBBox.on('mouseover', function (an) {
        var self = d3.select(this);
        self.select('.labels').attr('clip-path', '');
        // d3.select("#BBoxId-" + an.autoId).classed("mouseoverBBox", true);
        an.parent.children.values().forEach(function (sibling) {
          d3.select('#BBoxId-' + sibling.autoId).style('stroke-opacity', 0.3);
        });
      }).on('mouseout', function (an) {
        var self = d3.select(this);
        self.select('.labels')
          .attr('clip-path', 'url(#aBBClipId-' + an.autoId + ')');
        // d3.select("#BBoxId-" + an.autoId).classed("mouseoverBBox", false);
        an.parent.children.values().forEach(function (sibling) {
          d3.select('#BBoxId-' + sibling.autoId).style('stroke-opacity', 0.0);
        });
      });

      /* On mouseover layer bounding box. */
      lBBox.on('mouseover', function () {
        var self = d3.select(this);
        self.select('.labels').attr('clip-path', '');
        // self.classed("mouseoverBBox", true);
      }).on('mouseout', function (ln) {
        var self = d3.select(this);
        self.select('.labels')
          .attr('clip-path', 'url(#lBBClipId-' + ln.autoId + ')');
        // self.classed("mouseoverBBox", false);
      });

      /* On mouseover timeline analysis lines. */
      d3.selectAll('.tlAnalysis').on('mouseover', function (an) {
        showTooltip(
          createHTMLKeyValuePair('Created', provvisHelpers.parseISOTimeFormat(an.start)) +
          '<br>' +
          createHTMLKeyValuePair('Workflow', provvisHelpers.getWfNameByNode(an)) +
          '<br>', event);
        d3.select('#BBoxId-' + an.autoId).classed('mouseoverTlBBox', true);
      }).on('mousemove', function (an) {
        showTooltip(
          createHTMLKeyValuePair('Created', provvisHelpers.parseISOTimeFormat(an.start)) +
          '<br>' +
          createHTMLKeyValuePair('Workflow', provvisHelpers.getWfNameByNode(an)) +
          '<br>', event);
      }).on('mouseout', function (an) {
        hideTooltip();
        d3.select('#BBoxId-' + an.autoId).classed('mouseoverTlBBox', false);
      });
    }

    /**
     * Hide tooltip.
     */
    function hideTooltip () {
      partsService.tooltip.style('visibility', 'hidden');
    }

     /**
     * Make tooltip visible and align it to the events position.
     * @param label Inner html code appended to the tooltip.
     * @param event E.g. mouse event.
     */
    function showTooltip (label, event) {
      var tooltip = partsService.tooltip;
      tooltip.html(label);
      tooltip.style('visibility', 'visible');
      tooltip.style('top', (event.pageY + 10) + 'px');
      tooltip.style('left', (event.pageX + 10) + 'px');
    }
  }
})();
