'use strict';

/**
 * Collect all data sets associated with a node i.e. ontology term by traversing
 * the tree down to the leaves.
 *
 * @description
 * As this could potentially be very resource intensive, this methods wrapped
 * in a separate web worker and runs in parallel to other code to avoid blocking
 * the ui.
 *
 * @method  getAssociatedDataSets
 * @author  Fritz Lekschas
 * @date    2015-10-14
 *
 * @param   {Object}  node  Starting node for the traversion.
 * @return  {Object}        Object of boolean keys representing the dataset IDs.
 */
function getAssociatedDataSets (node) {
  var dataSetIds = {};

  /**
   * Recursively collecting dataset IDs to an object passed by reference.
   *
   * @method  collectIds
   * @author  Fritz Lekschas
   * @date    2015-10-14
   *
   * @param   {Object}  node        Current node, i.e. ontology term.
   */
  function collectIds (_node) {
    var i;
    var keys;

    if (_node.dataSets) {
      keys = Object.keys(_node.dataSets);
      for (i = keys.length; i--;) {
        dataSetIds[keys[i]] = true;
      }
    }

    if (_node._children) {
      for (i = _node._children.length; i--;) {
        collectIds(_node._children[i], dataSetIds);
      }
    }
  }

  collectIds(node);

  return dataSetIds;
}

function endAll (transition, callback) {
  var n = 0;

  if (transition.size() === 0) {
    callback();
  }

  transition
    .each(function () {
      ++n;
    })
    .each('end', function () {
      if (!--n) {
        callback.apply(this, arguments);
      }
    });
}

/**
 * TreeMap controller constructor.
 *
 * @method  TreemapCtrl
 * @author  Fritz Lekschas
 * @date    2015-12-21
 *
 * @param  {Object}  $element               Directive's root element.
 * @param  {Object}  $q                     Angular's promise service.
 * @param  {Object}  $                      jQuery.
 * @param  {Object}  $window                `document.window`.
 * @param  {Object}  _                      Lodash.
 * @param  {Object}  d3                     D3.
 * @param  {Object}  HEX                    HEX class.
 * @param  {Object}  D3Colors               Service for creating D3 color
 *                                          scalings.
 * @param  {Object}  treemapSettings        Treemap settings.
 * @param  {Object}  pubSub                 PubSub service.
 * @param  {Object}  treemapContext         Context helper.
 * @param  {Object}  Webworker              Web Worker service.
 */
function TreemapCtrl (
  $element,
  $log,
  $q,
  $window,
  $,
  _,
  d3,
  HEX,
  D3Colors,
  treemapSettings,
  pubSub,
  treemapContext,
  Webworker,
  $rootScope,
  $timeout,
  dashboardIntroStarter,
  dashboardVisWrapperResizer
) {
  var that = this;

  that.$ = $;
  that._ = _;
  that.$q = $q;
  that.d3 = d3;
  that.HEX = HEX;
  that.$log = $log;
  that.$window = $window;
  that.$rootScope = $rootScope;
  that.$element = $element;
  that.$d3Element = that.$element.find('.treemap svg');
  that.settings = treemapSettings;
  that.pubSub = pubSub;
  that.treemapContext = treemapContext;
  that.$visWrapper = that.$element.closest('.vis-wrapper');
  that.$timeout = $timeout;
  that.dashboardVisWrapperResizer = dashboardVisWrapperResizer;

  that.Webworker = Webworker;

  that._visibleDepth = 1;
  that.currentLevel = 0;

  that.treemap.width = that.$d3Element.width();
  that.treemap.height = that.$d3Element.height();

  that.numColors = 10;
  that.steps = 6;

  // that.treemap.colors = new D3Colors(
  //   that.d3.scale.category10().domain(d3.range(that.numColors)).range()
  // ).getScaledFadedColors(that.steps);

  // Mono color scale
  that.treemap.colors = new D3Colors(
    ['#444444']
  ).getScaledFadedColors(that.steps);

  // Mono color scale
  that.treemap.lockHighlightColors = new D3Colors(
    [that.settings.highlightBGColor]
  ).getScaledFadedColors(that.steps);

  that.multipleColorScaling = false;

  that.treemap.x = that.d3.scale.linear()
    .domain([0, that.treemap.width])
    .range([0, that.treemap.width]);

  that.treemap.y = that.d3.scale.linear()
    .domain([0, that.treemap.height])
    .range([0, that.treemap.height]);

  that.treemap.el = that.d3.layout.treemap()
    .children(function (d, depth) {
      return depth ? null : d._children;
    })
    .sort(function (a, b) {
      return a.value - b.value;
    })
    .round(false)
    .ratio(1);

  that.treemap.element = that.d3.select(that.$d3Element[0])
    .attr('viewBox', '0 0 ' + that.treemap.width + ' ' + that.treemap.height);
  that.treemap.$element = that.$(that.treemap.element.node());

  that.treemap.mainGroup = that.treemap.element
    .append('g')
    .style('shape-rendering', 'crispEdges');

  that.treemap.grandParent = that.d3.select(that.$visWrapper[0])
    .select('#treemap-root-path');
  that.treemap.$grandParent = that.$(that.treemap.grandParent.node());
  that.treemap.$grandParentContainer = that.treemap.$grandParent.parent();

  // To-DO: Refactor, the `visData` service should handle this properly
  // The node index is needed to quickly access nodes since D3's tree map layout
  // requires a data structure which doesn't provide any quick access.
  that.nodeIndex = {};

  that.currentlyLockedNodes = {};
  that.prevEventDataSets = {};

  if (that.graph) {
    that.graph.then(function (data) {
      that.data = data;
      that.pubSub.trigger('treemap.loaded');
      that.draw();
      that.addEventListeners();
    });
  } else {
    that.pubSub.trigger('treemap.noData');
  }

  that.introStart = function () {
    dashboardIntroStarter.start('satori-treemap', that);
  };

  that.maximize = function () {
    if (!that.isMaximized) {
      dashboardVisWrapperResizer.maximize.call(dashboardVisWrapperResizer);
      that.$timeout(that.reRender.bind(that), 0);
    }
  };

  that.minimize = function () {
    if (!that.isMinimized) {
      dashboardVisWrapperResizer.minimize.call(dashboardVisWrapperResizer);
      that.$timeout(that.reRender.bind(that), 0);
    }
  };

  that.equalize = function () {
    if (!that.isEqualized) {
      dashboardVisWrapperResizer.equalize.call(dashboardVisWrapperResizer);
      that.$timeout(that.reRender.bind(that), 0);
    }
  };

  that.pubSub.on('resize', function () {
    that.$timeout(that.reRender.bind(that), 25);
  });

  that.treemapContext.set('treemap', this);

  that.icons = this.$window.getStaticUrl('images/icons.svg');
}

/*
 * -----------------------------------------------------------------------------
 * Methods
 * -----------------------------------------------------------------------------
 */

/**
 * Recursively adds children to the parent for `this.visibleDepth` levels.
 *
 * @method  addChildren
 * @author  Fritz Lekschas
 * @date    2015-08-18
 *
 * @param   {Object}   parent     D3 selection of parent.
 * @param   {Object}   data       D3 data object of `parent`.
 * @param   {Number}   level      Current level of depth relative to
 *   `this.currentLevel`, i.e. level = 0 = this.currentLevel.
 * @param   {Boolean}  firstTime  When `true` triggers a set of initializing
 *   animation.
 * @return  {Object}              D3 selection of `parent`'s children.
 */
TreemapCtrl.prototype.addChildren = function (parent, data, level, firstTime) {
  var that = this;
  var childChildNode;
  var promises = [];

  // Create a `g` wrapper for all children.
  var children = parent.selectAll('.group-of-nodes')
    .data(data._children)
    .enter()
    .append('g')
    .attr('class', 'group-of-nodes');

  // Recursion
  if (level < this.visibleDepth) {
    this.children[level + 1] = this.children[level + 1] || [];
    children.each(function (childData) {
      if (childData._children && childData._children.length) {
        var childChildren = that.addChildren(
          that.d3.select(this), childData, level + 1, firstTime);
        that.children[level + 1].push(childChildren[0]);
        promises.push(childChildren[1]);
      }
    });
  } else {
    /* Final level, i.e. `level === this.visibleDepth`.
     *
     * Since we only call the recursion as long as `level` is smaller than
     * `this.visibleDepth` this else statement will only be reached when both
     * variables are the same.
     *
     * On the final level we add "inner nodes"
     */

    childChildNode = this.addInnerNodes(children, level);
  }

  // D3 selection of all children without any children, i.e. leafs.
  var childrensLeafs = children.filter(function (child) {
    return !(child._children && child._children.length);
  });

  var leafs = childrensLeafs
    .selectAll('.leaf-node')
    .data(function (_data) {
      return [_data];
    })
    .enter()
    .append('g')
    .attr('class', 'node leaf-node')
    .attr('opacity', 0);

  var extraPadding = (0.25 * (level - 1));

  leafs
    .append('rect')
    .attr('class', 'leaf')
    .attr('fill', this.color.bind(this))
    .call(this.rect.bind(this), extraPadding);

  leafs
    .append('use')
    .attr({
      class: 'icon icon-unlocked',
      'xlink:href': this.$window.getStaticUrl('images/icons.svg#unlocked')
    })
    .call(this.setUpNodeCenterIcon.bind(this));

  leafs
    .append('use')
    .attr({
      class: 'icon icon-locked',
      'xlink:href': this.$window.getStaticUrl('images/icons.svg#locked')
    })
    .call(this.setUpNodeCenterIcon.bind(this));

  leafs
    .call(this.addLabel.bind(this), 'name', extraPadding);

  // Merge `leaf` and `childChildNode` selections. This turns out to be
  var animateEls = leafs;
  if (!leafs.length) {
    animateEls = childrensLeafs;
  }
  if (childChildNode && childChildNode.length) {
    animateEls[0] = animateEls[0].concat(childChildNode[0]);
  }

  promises = promises.concat(this.fadeIn(animateEls, firstTime));

  return [children, this.$q.all(promises)];
};

/**
 * Adds global event listeners using jQuery.
 *
 * @method  addEventListeners
 * @author  Fritz Lekschas
 * @date    2015-08-04
 */
TreemapCtrl.prototype.addEventListeners = function () {
  var that = this;

  this.treemap.$grandParent.on('click', 'a', function () {
    /*
     * that = TreemapCtrl
     * this = the clicked DOM element
     * data = data
     */

    that.storeEmitHighlightDataSets(
      that.d3.select(this).datum(), false, false, true
    );
    that.transition(that.d3.select(this).datum());
  });

  this.treemap.$element.on(
    'dblclick',
    '.label-wrapper, .outer-border',
    function () {
      /*
       * that = TreemapCtrl
       * this = the clicked DOM element
       * data = data
       */
      var $this = that.$(this);

      if ($this.parent().attr('class') === 'leaf-node') {
        return;
      }

      that.storeEmitHighlightDataSets(
        that.d3.select(this).datum(), false, false, true
      );
      that.transition(that.d3.select(this).datum());
    }
  );

  this.treemap.$element.on(
    'mouseenter',
    '.node',
    function () {
      that.storeEmitHighlightDataSets(
        that.d3.select(this).datum(), false, true, false
      );
    }
  );

  this.treemap.$element.on(
    'mouseleave',
    '.node',
    function () {
      that.storeEmitHighlightDataSets(
        that.d3.select(this).datum(), false, true, true
      );
    }
  );

  this.treemap.$element.on(
    'click',
    '.node',
    function (e) {
      var data = that.d3.select(this).datum();

      // Mac OS X's command key is down
      if (e.metaKey) {
        that.storeEmitHighlightDataSets(data, false, false, true);
        that.transition(data);
      } else {
        that.nodeLockToggleHandler(data);
      }
    }
  );

  this.treemap.$element.on('mousewheel', function (e) {
    e.preventDefault();
    this.visibleDepth += e.deltaY > 0 ? 1 : -1;
  }.bind(this));

  // Listen to triggers from outside
  this.$rootScope.$on('dashboardVisNodeEnter', function (event, data) {
    this.findNodesToHighlight(data.nodeUri);
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeLeave', function (event, data) {
    this.findNodesToHighlight(data.nodeUri, true);
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeFocus', function (event, data) {
    var termIds = [];
    if (data.terms) {
      for (var i = data.terms.length; i--;) {
        termIds.push(data.terms[i].term);
      }
    } else {
      this.$log.info('No annotations available.', data);
    }
    this.focusNode(termIds);
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeBlur', function (event, data) {
    var termIds = [];
    if (data.terms) {
      for (var i = data.terms.length; i--;) {
        termIds.push(data.terms[i].term);
      }
    } else {
      this.$log.info('No annotations available.', data);
    }
    this.blurNode(termIds);
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeRoot', function (event, data) {
    if (data.source !== 'treeMap') {
      var uri = data.nodeUri;
      if (!this.nodeIndex[uri]) {
        this.$log.error('Node not found: ', uri);
      } else {
        this.setRootNode({
          ontId: this.nodeIndex[uri][0].ontId,
          uri: uri,
          // This is tricky because there are multiple paths in the tree map but
          // not in the list graph.
          branchId: 0,
          label: this.nodeIndex[uri][0].label
        }, true);
      }
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeUnroot', function (event, data) {
    if (data.source !== 'treeMap') {
      this.setRootNode({
        ontId: this.absRootNode.ontId,
        uri: this.absRootNode.uri,
        branchId: 0,
        label: this.absRootNode.label
      }, true);
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeReroot', function (event, data) {
    if (data.source !== 'treeMap') {
      var uri = data.nodeUri;
      if (!this.nodeIndex[uri]) {
        this.$log.error('Node not found: ', uri);
      } else {
        this.setRootNode({
          ontId: this.nodeIndex[uri][0].ontId,
          uri: uri,
          branchId: 0,
          label: this.nodeIndex[uri][0].label
        }, true);
      }
    }
  }.bind(this));

  this.$rootScope.$on(
    'dashboardVisNodeLock', function (event, data) {
      if (data.source !== 'treeMap') {
        this.nodeLockHandler(data.nodeUri, true);
      }
    }.bind(this)
  );

  this.$rootScope.$on('dashboardVisNodeUnlock', function (event, data) {
    if (data.source !== 'treeMap') {
      this.nodeUnlockHandler(true);
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisVisibleDepth', function (event, data) {
    if (data.source !== 'treeMap') {
      this._noVisibleDepthNotification = true;
      this.visibleDepth = data.visibleDepth;
    }
  }.bind(this));
};

/**
 * Get the size of the treemap
 *
 * @method  getSize
 * @author  Fritz Lekschas
 * @date    2017-01-16
 */
TreemapCtrl.prototype.getSize = function () {
  this.treemap.width = this.$d3Element.width();
  this.treemap.height = this.$d3Element.height();
};

/**
 * Update the size of the treemap
 *
 * @method  updateSize
 * @author  Fritz Lekschas
 * @date    2017-01-16
 */
TreemapCtrl.prototype.updateSize = function () {
  this.getSize();
  this.data.dx = this.treemap.width;
  this.data.dy = this.treemap.height;

  this.treemap.x = this.d3.scale.linear()
    .domain([0, this.treemap.width])
    .range([0, this.treemap.width]);

  this.treemap.y = this.d3.scale.linear()
    .domain([0, this.treemap.height])
    .range([0, this.treemap.height]);

  this.treemap.element.attr(
    'viewBox', '0 0 ' + this.treemap.width + ' ' + this.treemap.height
  );
};

/**
 * Handles node lock toggling
 *
 * @method  nodeLockToggleHandler
 * @author  Fritz Lekschas
 * @date    2016-10-31
 * @param   {Object}  data  D3 data object of the element.
 */
TreemapCtrl.prototype.nodeLockToggleHandler = function (data) {
  if (this.lockedNodeUri) {
    if (this.lockedNodeUri === data.uri) {
      this.nodeUnlockHandler();
    } else {
      this.nodeUnlockHandler();
      this.nodeLockHandler(data.uri);
    }
  } else {
    this.nodeLockHandler(data.uri);
  }
};

/**
 * Handles node locking
 *
 * @method  nodeLockHandler
 * @author  Fritz Lekschas
 * @date    2016-10-31
 * @param   {Object}   uri             URI of the node to be locked.
 * @param   {Boolean}  noNotification  If `true` no notification will be emitted
 */
TreemapCtrl.prototype.nodeLockHandler = function (uri, noNotification) {
  this.lockedNodeUri = uri;

  this.checkNodesLocked();
  this.storeEmitHighlightDataSets(
    this.getDataByUri(this.lockedNodeUri), false, false, false, noNotification
  );
};

/**
 * Handles node unlocking
 *
 * @method  nodeUnlockHandler
 * @author  Fritz Lekschas
 * @date    2016-10-31
 * @param   {Boolean}  noNotification  If `true` no notification will be emitted
 */
TreemapCtrl.prototype.nodeUnlockHandler = function (noNotification) {
  if (this.lockedNodeUri) {
    this.checkNodesLocked(true);
    this.storeEmitHighlightDataSets(
      this.getDataByUri(this.lockedNodeUri), false, false, true, noNotification
    );

    this.lockedNodeUri = undefined;
  }
};

/**
 * Checks if locked nodes needs to be visually locked.
 *
 * @method  checkNodesLocked
 * @author  Fritz Lekschas
 * @date    2016-10-31
 * @param   {Boolean}  unlocked  If `true` will check for unlocking.
 */
TreemapCtrl.prototype.checkNodesLocked = function (unlocked) {
  if (this.lockedNodeUri) {
    var selection = this.getD3NodeByUri(this.lockedNodeUri);

    if (!selection.empty()) {
      if (unlocked) {
        this.unlockNode(selection);
      } else {
        this.lockNode(selection);
      }
    }
  }
};

/**
 * Find nodes (i.e. rectangles) by URI and highlight them
 *
 * @method  findNodesToHighlight
 * @author  Fritz Lekschas
 * @date    2016-05-06
 * @param   {String}   uri          URI of the node of interest.
 * @param   {Boolean}  dehighlight  If `true` removes highlighting.
 */
TreemapCtrl.prototype.findNodesToHighlight = function (uri, dehighlight) {
  var node = this.getD3NodeByUri(uri);

  if (!node.empty() && node.datum().meta.depth === this.visibleDepth) {
    // Node is at the current level, i.e. it can be highlighted directly
    this.hoverRectangle(node, !!!dehighlight);
  } else {
    // Loop over all nodes (might be many depending on the number of
    // duplicates).
    if (this.nodeIndex[uri]) {
      for (var i = this.nodeIndex[uri].length; i--;) {
        // Try to find a DOM element related to that URI
        node = this.getD3NodeByUri(
          this.getParentAtLevel(
            this.nodeIndex[uri][i],
            this.currentLevel + this.visibleDepth
          ).uri
        );

        // When a DOM element was found highlight it.
        if (!node.empty()) {
          this.hoverRectangle(node, !!!dehighlight);
        }
      }
    } else {
      this.$log.error('Node not found: ', uri);
    }
  }
};

/**
 * Visually lock a node (i.e. rectangle)
 *
 * @description
 * This means filling the node in orange and displayed a locked _lock_ icon.
 *
 * @method  lockNode
 * @author  Fritz Lekschas
 * @date    2016-05-06
 * @param   {Object}    selection       D3 selection of elements.
 * @param   {Boolean}   noNotification  If `true` no events will be emmited.
 */
TreemapCtrl.prototype.lockNode = function (selection) {
  var that = this;

  selection.each(function () {
    that.lockHighlightEl(this);
  });
};

/**
 * Visually unlock a node (i.e. rectangle)
 *
 * @description
 * This means resetting the filling of the currently locked node.
 *
 * @method  unlockNode
 * @author  Fritz Lekschas
 * @date    2016-10-30
 */
TreemapCtrl.prototype.unlockNode = function (selection) {
  var that = this;

  selection.each(function () {
    that.unlockHighlightEl(this);
  });
};

/**
 * Programmatic way to add the `hovering` class to D3 selection.
 *
 * @method  hoverRectangle
 * @author  Fritz Lekschas
 * @date    2016-05-06
 * @param   {Object}   selection  D3 selection.
 * @param   {Boolean}  enter      If `true` the _hovering_ class will be added.
 *   Otherwise the class will be removed.
 */
TreemapCtrl.prototype.hoverRectangle = function (selection, enter) {
  selection.classed('hovering', enter);
};

/**
 * Get a DOM element wrapped as a D3 selection by a node's URI.
 *
 * @method  getD3NodeByUri
 * @author  Fritz Lekschas
 * @date    2016-01-20
 * @param   {String}  uri  Node's URI.
 * @return  {Object}       D3 selection of the DOM element.
 */
TreemapCtrl.prototype.getD3NodeByUri = function (uri) {
  // This feels inefficient. There should be a way to cache node references so
  // that the DOM doesn't need to be queried all the time.
  return this.treemap.element.selectAll('.node').filter(function (data) {
    return data.uri === uri;
  });
};

/**
 * Get a DOM element's data by a node's URI.
 *
 * @method  getDataByUri
 * @author  Fritz Lekschas
 * @date    2016-10-31
 * @param   {String}  uri  Node's URI.
 * @return  {Object}       D3 data of the DOM element.
 */
TreemapCtrl.prototype.getDataByUri = function (uri) {
  // This feels inefficient. There should be a way to cache node references so
  // that the DOM doesn't need to be queried all the time.
  var els = this.treemap.element.selectAll('.node').filter(function (data) {
    return data.uri === uri;
  });

  var data = els.data();

  return data[0];
};

/**
 * Find the parent of a term at on a certain level
 *
 * @description
 * Since only a certain level is visible at the time and another visualization
 * might highlighted a term in a lower level we often have to traverse up to the
 * root and see if we can find a parent there.
 *
 * @method  getParentAtLevel
 * @author  Fritz Lekschas
 * @date    2016-05-06
 * @param   {Object}            node   Node to start traversing from.
 * @param   {Number}            level  Level to look at.
 * @return  {Object|Undefined}         Parental node of `node` or `undefined`.
 */
TreemapCtrl.prototype.getParentAtLevel = function (node, level) {
  // The parent's level must be lower than the node's level, hence if `level` is
  // greater we can stop here directly.
  if (level > node.meta.level) {
    return undefined;
  }

  var parent = node;

  while (parent.meta.depth > level) {
    parent = parent.parent;
  }

  return parent;
};

/**
 * Visually focus (i.e. highlight) a node (i.e. rectangle)
 *
 * @method  focusNode
 * @author  Fritz Lekschas
 * @date    2016-05-06
 * @param   {Array}  termIds  List of term IDs.
 */
TreemapCtrl.prototype.focusNode = function (termIds) {
  var visibleNodes = {};
  var nodes;

  for (var i = termIds.length; i--;) {
    nodes = this.nodeIndex[termIds[i]];
    if (nodes && nodes.length) {
      for (var j = nodes.length; j--;) {
        if (nodes[j].meta.depth === this.currentLevel + this.visibleDepth) {
          // Node is at the current level, i.e. it can be highlighted directly
          visibleNodes[nodes[j].uri] = true;
        } else if (
          nodes[j].meta.leaf &&
          nodes[j].meta.depth < this.currentLevel + this.visibleDepth
        ) {
          // Leafs should be highlighted up until the visible depth.
          visibleNodes[nodes[j].uri] = true;
        } else {
          // Find parent node at the current level
          visibleNodes[
            this.getParentAtLevel(
              nodes[j],
              this.currentLevel + this.visibleDepth
            ).uri
          ] = true;
        }
      }
    }
  }

  nodes = this.treemap.element.selectAll('.node').filter(function (data) {
    return visibleNodes[data.uri];
  });

  nodes.classed('focus', true).selectAll('.bg, .leaf')
    .attr('fill', function (data, index) {
      return this.color.call(this, data, index, undefined, true);
    }.bind(this));

  this.currentlyFocusedNodes = nodes;
};

/**
 * Blur visually highlighted nodes (i.e. rectangles)
 *
 * @method  blurNode
 * @author  Fritz Lekschas
 * @date    2016-05-06
 * @param   {Array}  termIds  Array of term IDs.
 */
TreemapCtrl.prototype.blurNode = function (termIds) {
  var nodes = this.currentlyFocusedNodes;

  if (!nodes || nodes.empty()) {
    var visibleNodes = {};

    for (var i = termIds.length; i--;) {
      nodes = this.nodeIndex[termIds[i]];
      if (nodes && nodes.length) {
        for (var j = nodes.length; j--;) {
          if (nodes[j].meta.depth === this.currentLevel + this.visibleDepth) {
            // Node is at the current level, i.e. it can be highlighted directly
            visibleNodes[nodes[j].uri] = true;
          } else if (
            nodes[j].meta.leaf &&
            nodes[j].meta.depth < this.currentLevel + this.visibleDepth
          ) {
            // Leafs should be highlighted up until the visible depth.
            visibleNodes[nodes[j].uri] = true;
          } else {
            // Find parent node at the current level
            visibleNodes[
              this.getParentAtLevel(nodes[j], this.visibleDepth).uri
            ] = true;
          }
        }
      }
    }

    nodes = this.treemap.element.selectAll('.node').filter(function (data) {
      return visibleNodes[data.uri];
    });
  }

  nodes.classed('focus', false).selectAll('.bg, .leaf')
    .attr('fill', function (data) {
      return this.color.call(this, data);
    }.bind(this));
};

/**
 * Add inner nodes
 *
 * @method  addInnerNodes
 * @author  Fritz Lekschas
 * @date    2015-08-05
 *
 * @param   {Object}  parents  Selection of parent nodes.
 */
TreemapCtrl.prototype.addInnerNodes = function (parents, level) {
  // D3 selection of all children with children
  var parentsWithChildren = parents.filter(function (parent) {
    return parent._children && parent._children.length;
  });

  // Level needs to be decreased by 1.
  var actualLevel = Math.max(level ? level - 1 : 0, 0) * 0.25;

  var innerNodes = parentsWithChildren
    .append('g')
    .attr('class', 'node inner-node')
    .attr('opacity', 0);

  innerNodes
    .append('rect')
    .attr('class', 'bg')
    .attr('fill', this.color.bind(this))
    .call(this.rect.bind(this), 1 + actualLevel);

  innerNodes
    .append('rect')
    .attr('class', 'inner-border')
    .call(this.rect.bind(this), 2 + actualLevel);

  innerNodes
    .append('use')
    .attr({
      class: 'icon icon-unlocked',
      'xlink:href': this.$window.getStaticUrl('images/icons.svg#unlocked')
    })
    .call(this.setUpNodeCenterIcon.bind(this));

  innerNodes
    .append('use')
    .attr({
      class: 'icon icon-locked',
      'xlink:href': this.$window.getStaticUrl('images/icons.svg#locked')
    })
    .call(this.setUpNodeCenterIcon.bind(this));

  innerNodes
    .append('rect')
    .attr('class', 'outer-border')
    .call(this.rect.bind(this), actualLevel);

  innerNodes
    .call(this.addLabel.bind(this), 'name');

  return innerNodes;
};

/**
 * Appends a `foreignObject` into SVG holding a `DIV`
 *
 * @method  addLabel
 * @author  Fritz Lekschas
 * @date    2015-08-04
 * @param   {Object}  el     D3 selection.
 * @param   {String}  attr   Attribute name which holds the label's text.
 * @param   {Number}  level  Add padding to the label according to the depth.
 */
TreemapCtrl.prototype.addLabel = function (el, attr, level) {
  var that = this;

  el.append('foreignObject')
    .attr('class', 'label-wrapper')
    .call(this.rect.bind(this), 2, Math.max(level || 0, 0) * 0.25)
    .append('xhtml:div')
    .attr('class', 'label')
    .attr('title', function (data) {
      return data[attr];
    })
    .classed('label-bright', function (data) {
      if (data.meta.colorRgb) {
        var contrastBlack = data.meta.colorRgb
          .contrast(new that.HEX('#000000').toRgb());
        var contrastWhite = data.meta.colorRgb
          .contrast(new that.HEX('#ffffff').toRgb());
        return contrastBlack < contrastWhite;
      }
      return false;
    })
    .append('xhtml:span')
    .text(function (data) {
      return data[attr];
    });
};

/**
 * Add levels of children starting from level `level` until `this.visibleDepth`.
 *
 * @method  addLevelsOfNodes
 * @author  Fritz Lekschas
 * @date    2016-03-27
 *
 * @param   {Number}  oldVisibleDepth  Starting level.
 * @return  {Object}                   Promise resolving when all new nodes have
 *   been faded in.
 */
TreemapCtrl.prototype.addLevelsOfNodes = function (oldVisibleDepth) {
  var currentInnerNodes = this.d3.selectAll('.inner-node');
  var promises = [];
  var that = this;

  this.children[oldVisibleDepth + 1] = this.children[oldVisibleDepth + 1] || [];
  for (var i = 0, len = this.children[oldVisibleDepth].length; i < len; i++) {
    // Ignoring jsHint because basically we just have another nested for loop.
    /* jshint -W083 */
    this.children[oldVisibleDepth][i].each(function (data) {
      if (data._children && data._children.length) {
        var children = that.addChildren(
          that.d3.select(this), data, oldVisibleDepth + 1);
        that.children[oldVisibleDepth + 1].push(children[0]);
        promises.push(children[1]);
      }
    });
  /* jshint +W083 */
  }

  // Remove formerly displayed inner nodes after all new inner nodes have been
  // faded in.
  return this.$q.all(promises)
    .then(function () {
      currentInnerNodes.remove();
    });
};

/**
 * Helper function that decides whether nodes have to be added or removed.
 *
 * @method  adjustLevelDepth
 * @author  Fritz Lekschas
 * @date    2016-03-27
 *
 * @param   {Number}  oldVisibleDepth  Former level of depth.
 * @return  {Object}                   Promise resolving when node have been
 *   faded in and labels have been checked.
 */
TreemapCtrl.prototype.adjustLevelDepth = function (oldVisibleDepth) {
  var transition = this.$q.when();

  if (oldVisibleDepth < this.visibleDepth) {
    transition = this.addLevelsOfNodes(oldVisibleDepth);
  } else {
    transition = this.removeLevelsOfNodes(oldVisibleDepth);
  }

  return transition.then(function () {
    this.checkLabelReadbility();
    this.checkNodesLocked();
    return true;
  }.bind(this));
};

TreemapCtrl.prototype.changeVisibleDepth = function (newValue, noLocationChange) {
  if (noLocationChange) {
    this.visibleDepth = newValue;
  } else {
    this.visibleDepth = newValue;
  }
};

/**
 * Assess the readability of all currently drawn labels and shrink them in size
 * or hide them in case not enough space is available to avoid clutter.
 *
 * @method  checkLabelReadbility
 * @author  Fritz Lekschas
 * @date    2016-05-06
 */
TreemapCtrl.prototype.checkLabelReadbility = function () {
  var el;

  this.treemap.element.selectAll('.label').each(function () {
    el = d3.select(this);
    el.classed({
      visible: false,
      hidden: false
    });

    var visible = false;
    var hidden = false;
    var smaller = false;

    var rectBox = this.getBoundingClientRect();
    var labelBox = this.children[0].getBoundingClientRect();

    if (rectBox.height / labelBox.height < 1) {
      if (rectBox.height / labelBox.height > 0.5) {
        smaller = true;
      } else {
        hidden = true;
      }
    }

    if (rectBox.width * 1.5 < labelBox.width) {
      hidden = true;
    }

    visible = !hidden;

    el.classed({
      hidden: hidden,
      smaller: smaller,
      visible: visible
    });
  });
};

/**
 * Generate a color given an elements node data object.
 *
 * @method  color
 * @author  Fritz Lekschas
 * @date    2015-07-31
 *
 * @param   {Object}  node  D3 node data object.
 * @return  {String}        HEX color string.
 */
TreemapCtrl.prototype.color = function (node, index, unknown, highlight) {
  var hex;
  var rgb;
  var colors = highlight ?
    this.treemap.lockHighlightColors : this.treemap.colors;
  var multiColorStepSelection = 0;

  if (node.meta.colorHex && !highlight) {
    return node.meta.colorHex;
  }

  if (this.multipleColorScaling) {
    multiColorStepSelection = this.steps;
  }

  if (this.colorMode === 'depth') {
    // Color by original depth
    // The deeper the node, the lighter the color
    hex = colors((node.meta.branchNo[0] * multiColorStepSelection) +
      Math.min(this.steps, node.meta.originalDepth) - 1);
  } else {
    // Default:
    // Color by reverse final depth (after pruning). The fewer children a node
    // has, the lighter the color. E.g. a leaf is lightest while the root is
    // darkest.
    // Explanation:
    // `(node.meta.branchNo[0] * multiColorStepSelection)`:
    // Chooses the color to use according to the first branch.
    // `Math.max(0, this.steps - node.meta.revDepth - 1))`
    // Determines which luminescence to choose.
    hex = colors((node.meta.branchNo[0] * multiColorStepSelection) +
      Math.max(0, this.steps - node.meta.revDepth - 1));
  }

  // Precompute RGB
  rgb = new this.HEX(hex).toRgb();

  if (!highlight) {
    // Cache colors for speed
    node.meta.colorHex = hex;
    node.meta.colorRgb = rgb;
  }

  return hex;
};

/**
 * Provide a color to a DOM's attribute
 *
 * @method  colorEl
 * @author  Fritz Lekschas
 * @date    2015-11-02
 *
 * @param   {Object}  element    DOM element created by D3.
 * @param   {String}  attribute  Name of attribute that should be colored.
 * @param   {String}  color      HEX string.
 */
TreemapCtrl.prototype.colorEl = function (element, attribute, color) {
  element.attr(attribute, color || this.color.bind(this));
};

/**
 * Copy `children` to `_children`.
 *
 * @method  copyChildren
 * @author  Fritz Lekschas
 * @date    2015-12-22
 * @param   {Object}  node  Node object.
 */
TreemapCtrl.prototype.copyChildren = function (node) {
  node._children = node.children;

  var i = node.children.length;

  while (i--) {
    this.copyChildren(node.children[i]);
  }
};

/**
 * Display the data.
 *
 * @param   {Object}  node  D3 data object of the node.
 * @return  {Object}        D3 selection of node's children.
 */
TreemapCtrl.prototype.display = function (node, firstTime) {
  this.setBreadCrumb(node);

  // Keep a reference to the old wrapper
  this.treemap.formerGroupWrapper = this.treemap.groupWrapper;

  // Create a new wrapper group for the children.
  this.treemap.groupWrapper = this.treemap.mainGroup
    .append('g')
    .datum(node)
    .attr('class', 'depth');

  // For completeness we store the children of level zero.
  this.children[0] = [this.treemap.groupWrapper];

  var _node = node;

  if (!node._children.length) {
    _node = { _children: [node] };
  }

  var children = this.addChildren(
    this.treemap.groupWrapper, _node, 1, firstTime);

  // We have to cache the children to dynamically adjust the level depth.
  this.children[1] = [children[0]];

  return children;
};

/**
 * Draws the treemap.
 *
 * This is kind of a constructor for the actual visualization. It executes all
 * methods needed to get prepare the data, register event listeners and finally
 * calls the drawing.
 *
 * @method  draw
 * @author  Fritz Lekschas
 * @date    2017-05-05
 * @param   {Boolean}  reRender  If `true` drawn is called by the rerenderer.
 */
TreemapCtrl.prototype.draw = function (reRender) {
  if (this.data === null) {
    return;
  }

  // We only need to prepare the data once. Since the preloader service stores
  // the data we can skip this step the second time the treemap is initialized.
  if (!this.data.ready) {
    this.initialize(this.data);
    this.copyChildren(this.data);
    this.layout(this.data, 0);

    // Mark data as ready so that we can skip the former steps next time.
    this.data.ready = true;
  } else {
    this.updateSize();
    this.layout(this.data, 0, true);
  }

  this.absRootNode = this.data;

  this.display(this.data, true);

  var rootNodeData;

  if (this.rootNode) {
    rootNodeData = this.cacheTerms[this.rootNode.ontId][this.rootNode.branchId];
  }

  if (rootNodeData) {
    this.transition(rootNodeData, reRender, true);
  } else {
    this.setRootNode(
      {
        branchId: 0,
        ontId: this.data.ontId,
        uri: this.data.uri,
        visibleDepth: this.visibleDepth,
        label: this.data.label
      }
    );
  }

  if (this.rootNode && this.rootNode.visibleDepth) {
    this._noVisibleDepthNotification = true;
    this.visibleDepth = this.rootNode.visibleDepth;
  }
};

/**
 * Fade in a selection.
 *
 * @method  fadeIn
 * @author  Fritz Lekschas
 * @date    2015-08-05
 * @param   {Object}   selection  D3 selection.
 * @param   {Boolean}  firstTime  True if triggered the first time, i.e. after
 *   the page loaded.
 * @return  {Array}              Angular promises.
 */
TreemapCtrl.prototype.fadeIn = function (selection, firstTime) {
  var defers = [];
  var promises = [];
  var that = this;

  selection
    .each(function (data, index) {
      defers[index] = that.$q.defer();
      promises[index] = defers[index].promise;
    });

  selection
    .transition()
    .duration(function () {
      if (firstTime) {
        return (
        that.settings.treemapFadeInDuration +
        Math.random() *
        that.settings.treemapFadeInDuration
        );
      }
      return that.settings.treemapFadeInDuration;
    })
    .delay(function () {
      if (firstTime) {
        return Math.random() * that.settings.treemapFadeInDuration;
      }
      return 0;
    })
    .attr('opacity', 1)
    .each('end', function (data, index) {
      defers[index].resolve();
    });

  return promises;
};

/**
 * Highlight datasets associated to a term.
 *
 * @method  storeEmitHighlightDataSets
 * @author  Fritz Lekschas
 * @date    2015-12-21
 *
 * @param   {Object}   data            Data object associated to the rectangle
 *   being clicked.
 * @param   {Boolean}  multiple        If `true` currently highlighted datasets
 *   will not be _de-highlighted_.
 * @param   {Boolean}  hover           If `true` reports only mouse over related
 *   highlighting.
 * @param   {Boolean}  reset           If `true` resets highlighting.
 */
TreemapCtrl.prototype.storeEmitHighlightDataSets = function (
  data, multiple, hover, reset, noNotification
) {
  // Check if data is available
  if (!data) { return; }

  var dataSetIds = getAssociatedDataSets(data);
  var eventName;
  var mode = hover ? 'hover' : 'lock';
  var prevData = this.prevEventDataSets[mode + 'Terms'];
  var set = false;

  if (prevData && reset !== true) {
    if (multiple) {
      dataSetIds = this._.merge(dataSetIds, prevData.dataSetIds);
    } else if (hover) {
      // Difference between previously highlighted datasets and datasets
      // highlighted next.
      var keys = Object.keys(prevData.dataSetIds);
      for (var i = keys.length; i--;) {
        if (dataSetIds[keys[i]]) {
          delete prevData.dataSetIds[keys[i]];
        }
      }
    }
  }

  if (prevData) {
    if (hover) {
      eventName = 'dashboardVisNodeLeave';
    } else {
      eventName = 'dashboardVisNodeUnlock';
    }
    if (!noNotification) {
      this.$rootScope.$emit(eventName, {
        nodeUri: prevData.nodeUri,
        dataSetIds: prevData.dataSetIds,
        source: 'treeMap'
      });
    }

    if (prevData.nodeUri === data.uri) {
      this.prevEventDataSets[mode + 'Terms'] = undefined;
    } else {
      if (!reset) {
        set = true;
      }
    }
  } else {
    if (!reset) {
      set = true;
    }
  }

  if (set) {
    if (hover) {
      eventName = 'dashboardVisNodeEnter';
    } else {
      eventName = 'dashboardVisNodeLock';
    }
    this.prevEventDataSets[mode + 'Terms'] = {
      nodeUri: data.uri,
      dataSetIds: dataSetIds,
      source: 'treeMap'
    };
    if (!noNotification) {
      this.$rootScope.$emit(eventName, this.prevEventDataSets[mode + 'Terms']);
    }
  }
};

/**
 * Highlight a rectangle visually.
 *
 * @method  highlightEl
 * @author  Fritz Lekschas
 * @date    2015-11-02
 *
 * @param   {Object}  element  DOM element.
 */
TreemapCtrl.prototype.highlightEl = function (element) {
  this.colorEl(element, 'fill', this.settings.highlightBGColor);
  this.colorEl(element, 'color', this.settings.highlightTextColor);
};

/**
 * Initialize the root node. This would usually be computed by `treemap()`.
 *
 * @method  initialize
 * @author  Fritz Lekschas
 * @date    2015-08-03
 * @param   {Object}  data  D3 data object.
 */
TreemapCtrl.prototype.initialize = function (data) {
  data.x = data.y = 0;
  data.dx = this.treemap.width;
  data.dy = this.treemap.height;
  data.depth = 0;
  data.meta = {
    branchNo: []
  };
};

/**
 * Highlight locked state of a rectangle.
 *
 * @method  highlightEl
 * @author  Fritz Lekschas
 * @date    2016-01-12
 *
 * @param   {Object}  element  DOM element.
 */
TreemapCtrl.prototype.lockHighlightEl = function (element) {
  var d3El = this.d3.select(element);

  d3El.classed('locked', true)
    .select(d3El.datum().meta.leaf ? '.leaf' : '.bg')
    .attr('fill', function (data, index) {
      return this.color.call(this, data, index, undefined, true);
    }.bind(this));
};

/**
 * Unhighlight locked state of a rectangle.
 *
 * @method  unlockHighlightEl
 * @author  Fritz Lekschas
 * @date    2016-10-31
 *
 * @param   {Object}  element  DOM element.
 */
TreemapCtrl.prototype.unlockHighlightEl = function (element) {
  var d3El = this.d3.select(element);

  d3El.classed('locked', false)
    .select(d3El.datum().meta.leaf ? '.leaf' : '.bg')
    .attr('fill', function (data) {
      return this.color.call(this, data);
    }.bind(this));
};

/**
 * Recursively compute the layout of each node depended on its parent.
 *
 * Compute the treemap layout recursively such that each group of siblings uses
 * the same size (1×1) rather than the dimensions of the parent cell. This
 * optimizes the layout for the current zoom state. Note that a wrapper object
 * is created for the parent node for each group of siblings so that the
 * parent's dimensions are not discarded as we recurse. Since each group of
 * sibling was laid out in 1×1, we must rescale to fit using absolute
 * coordinates. This lets us use a viewport to zoom.
 *
 * @method  layout
 * @author  Fritz Lekschas
 * @date    2015-08-03
 * @param   {Object}  data  D3 data object.
 */
TreemapCtrl.prototype.layout = function (parent, depth, reRender) {
  parent.meta.depth = depth;

  if (!reRender) {
    // Initialize a cache object used later
    parent.cache = {};

    // Cache the the branch id for each node, which is needed to uniquely
    // identify the position of a selected term.
    if (parent.ontId in this.cacheTerms) {
      parent.cache.branchId = this.cacheTerms[parent.ontId].push(parent) - 1;
    } else {
      this.cacheTerms[parent.ontId] = [parent];
      parent.cache.branchId = 0;
    }
  }

  // Store a reference to the node by it's URI. Since nodes can be duplicated
  // there might be more than one tree map node refering to a term.
  if (!this.nodeIndex[parent.uri]) {
    this.nodeIndex[parent.uri] = [parent];
  } else {
    this.nodeIndex[parent.uri].push(parent);
  }

  if (parent._children && parent._children.length) {
    this.depth = Math.max(this.depth, depth + 1);
    // This creates an anonymous 1px x 1px treemap and sets the children's
    // coordinates accordingly.
    this.treemap.el({
      _children: parent._children
    });
    for (var i = 0, len = parent._children.length; i < len; i++) {
      var child = parent._children[i];
      child.x = parent.x + child.x * parent.dx;
      child.y = parent.y + child.y * parent.dy;
      child.dx *= parent.dx;
      child.dy *= parent.dy;
      child.parent = parent;

      // Store complete branching history how to get to this current node. Thus,
      // this can be seen as a traversal path.
      // E.g. `2-0-1-5` corresponds to root-child.2-child.0-child.1-child.5
      child.meta.branchNo = parent.meta.branchNo.concat([i]);

      this.layout(child, depth + 1);
      parent.meta.revDepth = Math.max(
        child.meta.revDepth + 1,
        parent.meta.revDepth || 0
      );
    }
  } else {
    // Leaf
    // Leafs have a reverse depth of zero.
    parent.meta.revDepth = 0;
  }
};

/**
 * Set the coordinates of the rectangular.
 *
 * @description
 * How to invoke:
 * `d3.selectAll('rect').call(this.rect.bind(this))`
 *
 * Note: This weird looking double _this_ is needed as the context of a `call`
 * function is actually the same as the selection passed to it, which seems
 * redundant but that's how it works right now. So to assign `TreemapCtrl` as
 * the context we have to manually bind `this`.
 *
 * URL: https://github.com/mbostock/d3/wiki/Selections#call
 *
 * @method  rect
 * @author  Fritz Lekschas
 * @date    2015-08-03
 * @param   {Array}  elements  D3 selection of DOM elements.
 */
TreemapCtrl.prototype.rect = function (elements, reduction) {
  var that = this;

  var _reduction = reduction || 0;

  elements
    .attr('x', function (data) {
      return that.treemap.x(data.x) + _reduction;
    })
    .attr('y', function (data) {
      return that.treemap.y(data.y) + _reduction;
    })
    .attr('width', function (data) {
      data.cache.width = Math.max(0, (
        that.treemap.x(data.x + data.dx) -
        that.treemap.x(data.x) -
        (2 * _reduction)
        ));

      return data.cache.width;
    })
    .attr('height', function (data) {
      data.cache.height = Math.max(0, (
        that.treemap.y(data.y + data.dy) -
        that.treemap.y(data.y) -
        (2 * _reduction)
        ));

      return data.cache.height;
    });
};

/**
 * Remove all levels until `newLevel`.
 *
 * @method  removeLevelsOfNodes
 * @author  Fritz Lekschas
 * @date    2016-03-27
 * @param   {Number}  oldVisibleDepth  Former level of depth.
 * @return  {Object}                   Promise resolving when all nodes have
 *   been removed.
 */
TreemapCtrl.prototype.removeLevelsOfNodes = function (oldVisibleDepth) {
  var i;
  var len;
  var that = this;
  var deferred = this.$q.defer();

  // Add inner nodes to `.group-of-nodes` at `startLevel`.
  for (i = 0, len = this.children[this.visibleDepth].length; i < len; i++) {
    this.children[this.visibleDepth][i].each(function () {
      that.fadeIn(that.addInnerNodes(that.d3.select(this)));
    });
  }

  var groups = false;
  if (this.children[this.visibleDepth + 1].length) {
    groups = this.children[this.visibleDepth + 1][0];
  }

  function pushSelection (target, selection) {
    selection.each(function pushDomNode () {
      target[0].push(this);
    });
  }

  for (
    i = 1, len = this.children[this.visibleDepth + 1].length;
    i < len;
    i++
  ) {
    // Merge selections into one single selection
    pushSelection(groups, this.children[this.visibleDepth + 1][i]);
  }

  var transition = groups.transition().duration(250);
  transition.style('opacity', 0).remove();
  transition.call(endAll, function () {
    deferred.resolve();
  });

  // Unset intemediate levels
  for (i = this.visibleDepth + 1; i <= oldVisibleDepth; i++) {
    this.children[i] = undefined;
  }

  return deferred.promise;
};

/**
 * Rerender treemap
 *
 * @method  reRender
 * @author  Fritz Lekschas
 * @date    2017-01-16
 */
TreemapCtrl.prototype.reRender = function () {
  this.draw(true);
  this.checkLabelReadbility(this.visibleDepth);
};

/**
 * Set breadcrumb navigation from the current `node` to the root.
 *
 * @method  setBreadCrumb
 * @author  Fritz Lekschas
 * @date    2015-08-03
 * @param   {Object}  node  D3 data object.
 */
TreemapCtrl.prototype.setBreadCrumb = function (node) {
  this.treemap.grandParent.selectAll('li').remove();
  this.treemap.$grandParent
    .removeClass('right')
    .removeAttr('style');
  this.treemap.breadCrumbWidth = 0;
  this.treemap.breadCrumbContainerWidth = this.treemap.breadCrumbContainerWidth ||
    this.treemap.$grandParentContainer.width();

  var child = node;
  var parent = child.parent;

  // Add current root as an indecator where we are.
  var current = this.treemap.grandParent
    .append('li')
    .attr('class', 'current-root');

  if (parent) {
    current
      .append('svg')
      .attr('class', 'fa fa-arrow-left is-mirrored')
      .append('use')
      .attr('xlink:href', this.$window.getStaticUrl('images/icons.svg#arrow-left'));
  }

  current
    .append('span')
    .attr('class', 'text')
    .text(child.name);

  this.treemap.breadCrumbWidth += this.$(current.node()).width();

  while (parent) {
    var crumb = this.treemap.grandParent
      .insert('li', ':first-child')
      .append('a')
      .datum(parent);

    if (parent.parent) {
      crumb
        .append('svg')
        .attr('class', 'icon-arrow-left is-mirrored')
        .append('use')
        .attr('xlink:href', this.$window.getStaticUrl('images/icons.svg#arrow-left'));
    }

    crumb
      .append('span')
      .attr('class', 'text')
      .text(parent.name);

    this.treemap.breadCrumbWidth += this.$(crumb.node()).outerWidth();

    if (this.treemap.breadCrumbWidth > this.treemap.breadCrumbContainerWidth) {
      this.treemap.$grandParent
        .addClass('right')
        .css('marginLeft', -this.treemap.breadCrumbWidth);

      this.$(crumb.node()).parent().html('&hellip;');

      break;
    }

    child = parent;
    parent = child.parent;
  }
};

/**
 * Set a new root node and communicate the change by setting `treemapContext`
 * and emitting events on `$rootScope`.
 *
 * @method  setRootNode
 * @author  Fritz Lekschas
 * @date    2016-05-06
 * @param   {Object}   root            Object containing `ontId`, `uri`, and
 *   `branchNo` of the node to be set as root.
 * @param   {Boolean}  noNotification  If `true` no events will be emitted.
 */
TreemapCtrl.prototype.setRootNode = function (root, noNotification) {
  var prevRoot = this.treemapContext.get('root');
  var prevRootUri;
  if (prevRoot) {
    prevRootUri = prevRoot.uri;
    if (!prevRootUri) {
      prevRootUri = this.cacheTerms[prevRoot.ontId][0].uri;
    }
  }

  if (root.uri === prevRootUri && root.uri === this.absRootNode.uri) {
    return;
  }

  if (root.uri !== this.absRootNode.uri) {
    if (!noNotification) {
      this.$rootScope.$emit(
        'dashboardVisNodeRoot',
        {
          nodeUri: root.uri,
          source: 'treeMap'
        });
    }
  } else {
    if (!noNotification && this.treemapContext.get('root')) {
      this.$rootScope.$emit(
        'dashboardVisNodeUnroot',
        {
          nodeUri: prevRootUri,
          source: 'treeMap'
        }
      );
    }
  }

  var terms = [
    {
      nodeUri: root.uri,
      nodeLabel: root.label,
      dataSetIds: getAssociatedDataSets(
        this.cacheTerms[root.ontId][root.branchId]
      ),
      mode: 'and',
      query: true,
      root: true
    }
  ];

  if (prevRoot && prevRoot.ontId !== root.ontId) {
    terms.push({
      nodeUri: prevRootUri,
      dataSetIds: getAssociatedDataSets(
        this.cacheTerms[prevRoot.ontId][prevRoot.branchId]
      )
    });
  }

  if (!noNotification) {
    this.$rootScope.$emit('dashboardVisNodeToggleQuery', {
      terms: terms,
      source: 'treeMap'
    });
  }

  this.treemapContext.set('root', {
    ontId: root.ontId,
    uri: root.uri,
    branchId: root.branchId || 0
  });

  this.transition(this.cacheTerms[root.ontId][root.branchId], true, true);
};

/**
 * Add a centered lock and unlock icon to an element.
 *
 * @method  setUpNodeCenterIcon
 * @author  Fritz Lekschas
 * @date    2016-05-06
 * @param   {Object}  selection  D3 selection the two icons should be added to.
 */
TreemapCtrl.prototype.setUpNodeCenterIcon = function (selection) {
  var that = this;

  selection
    .attr('width', function (data) {
      if (data.cache.width < 20 || data.cache.height < 20) {
        data.cache.iconLockSmall = true;
        return 8;
      }
      data.cache.iconLockSmall = false;
      return 16;
    })
    .attr('height', function (data) {
      if (data.cache.iconLockSmall) {
        return 8;
      }
      return 16;
    })
    .attr('x', function (data) {
      return that.treemap.x(data.x) +
      (data.cache.width / 2) - (data.cache.iconLockSmall ? 4 : 8);
    })
    .attr('y', function (data) {
      return that.treemap.y(data.y) +
      (data.cache.height / 2) - (data.cache.iconLockSmall ? 4 : 8);
    })
    .classed('hidden', function (data) {
      if (data.cache.width < 10) {
        data.lockIconHidden = true;
        return true;
      }
      if (data.cache.height < 10) {
        data.lockIconHidden = true;
        return true;
      }
      data.lockIconHidden = false;
      return false;
    });
};

/**
 * Transition between parent and child branches of the treemap.
 *
 * @method  transition
 * @author  Fritz Lekschas
 * @date    2016-01-19
 * @param   {Object}  data            D3 data object of the node to transition
 *   to.
 * @param   {Object}  noNotification  If `true` doesn't set the tree map context
 *   since the method was called by `setRootNode` already.
 */
TreemapCtrl.prototype.transition = function (data, noNotification, auto) {
  if (this.treemap.transitioning || !data) {
    return;
  }

  if (!auto) {
    this.transVis = true;
    this.visibleDepth = 1;
  }

  this.currentLevel = data.meta.depth;

  this.treemap.transitioning = true;

  var newGroups = this.display.call(this, data);
  var newGroupsTrans;
  var formerGroupWrapper;
  var formerGroupWrapperTrans;

  // After all newly added inner nodes and leafs have been faded in we call the
  // zoom transition.
  var transition = newGroups[1]
    .then(function () {
      // Fade in animations finished
      newGroups = newGroups[0];
      newGroupsTrans = newGroupsTrans = newGroups
        .transition()
        .duration(this.settings.treemapZoomDuration);
      formerGroupWrapper = this.treemap.formerGroupWrapper;
      formerGroupWrapperTrans = formerGroupWrapper
        .transition()
        .duration(this.settings.treemapZoomDuration);

      // Update the domain only after entering new elements.
      this.treemap.x.domain([data.x, data.x + data.dx]);
      this.treemap.y.domain([data.y, data.y + data.dy]);

      // Enable anti-aliasing during the transition.
      this.treemap.mainGroup.style('shape-rendering', null);

      // Fade-in entering text.
      newGroups.selectAll('.label').classed('visible', false);

      // Icons do not need to be animated. Animating to many DOM elements at
      // once kills the performance.
      formerGroupWrapper.selectAll('.icon')
        .style('opacity', 0);
      newGroups.selectAll('.icon')
        .style('opacity', 0);

      formerGroupWrapperTrans.selectAll('.bg')
        .call(this.rect.bind(this), 1);

      formerGroupWrapperTrans.selectAll('.inner-border')
        .call(this.rect.bind(this), 2);

      formerGroupWrapperTrans.selectAll('.outer-border, .leaf')
        .call(this.rect.bind(this));

      formerGroupWrapperTrans.selectAll('.label-wrapper')
        .call(this.rect.bind(this), 2);

      newGroupsTrans.selectAll('.bg')
        .call(this.rect.bind(this), 1);

      newGroupsTrans.selectAll('.inner-border')
        .call(this.rect.bind(this), 2);

      newGroupsTrans.selectAll('.outer-border, .leaf')
        .call(this.rect.bind(this));

      newGroupsTrans.selectAll('.label-wrapper')
        .call(this.rect.bind(this), 2);

      // Remove the old node when the transition is finished.
      formerGroupWrapperTrans.remove()
        .each('end', function () {
          this.treemap.mainGroup.style('shape-rendering', 'crispEdges');
          this.treemap.transitioning = false;
        }.bind(this));

      newGroupsTrans.call(endAll, function () {
        this.checkLabelReadbility();
        newGroups.selectAll('.icon')
          .call(this.setUpNodeCenterIcon.bind(this))
          .style('opacity', function () {
            return data.lockIconHidden ? 1 : undefined;
          });
      }.bind(this));
    }.bind(this))
    .catch(function (e) {
      this.$log.error(e);
    });

  if (!noNotification) {
    transition.then(function () {
      this.setRootNode({
        ontId: data.ontId,
        uri: data.uri,
        branchId: data.cache.branchId,
        label: data.name
      });
    }.bind(this));
  }
};


/*
 * -----------------------------------------------------------------------------
 * Properties
 * -----------------------------------------------------------------------------
 */

/**
 * Cache objects of ontology terms pointing to the nodes in the tree.
 *
 * @author  Fritz Lekschas
 * @date    2015-10-02
 * @type  {Object}
 */
Object.defineProperty(
  TreemapCtrl.prototype,
  'cacheTerms',
  {
    enumerable: true,
    value: {},
    writable: true
  });

/**
 * Holds all nodes per level.
 *
 * @author  Fritz Lekschas
 * @date    2015-08-04
 * @type    {Array}
 */
Object.defineProperty(
  TreemapCtrl.prototype,
  'children',
  {
    enumerable: true,
    value: [],
    writable: true
  }
);

/**
 * D3 data object.
 *
 * @author  Fritz Lekschas
 * @date    2015-10-02
 * @type    {Object}
 */
Object.defineProperty(
  TreemapCtrl.prototype,
  'data',
  {
    enumerable: true,
    value: {},
    writable: true
  });

/**
 * Depth of the pruned data tree.
 *
 * @author  Fritz Lekschas
 * @date    2015-08-04
 * @type    {Number}
 */
Object.defineProperty(
  TreemapCtrl.prototype,
  'depth',
  {
    enumerable: true,
    value: 0,
    writable: true
  });

/**
 * Array of highlighted DOM elements.
 *
 * @author  Fritz Lekschas
 * @date    2015-11-02
 * @type    {Array}
 */
Object.defineProperty(
  TreemapCtrl.prototype,
  'highlightedEls',
  {
    enumerable: true,
    value: [],
    writable: true
  });

/**
 * Current root node.
 *
 * This variable is needed to distinguish context changes initiated by the
 * treemap form external changes.
 *
 * @author  Fritz Lekschas
 * @date    2015-10-05
 * @type    {Boolean}
 */
Object.defineProperty(
  TreemapCtrl.prototype,
  'rootNode',
  {
    enumerable: true,
    get: function () {
      return this.treemapContext.get('root');
    }
  });

/**
 * Object holding the actual D3 treemap and related data.
 *
 * @author  Fritz Lekschas
 * @date    2015-10-02
 * @type    {Object}
 */
Object.defineProperty(
  TreemapCtrl.prototype,
  'treemap',
  {
    enumerable: true,
    value: {},
    writable: true
  });

/**
 * Number of visible levels below the current level.
 *
 * @author  Fritz Lekschas
 * @date    2015-08-04
 * @type    {Number}
 */
Object.defineProperty(
  TreemapCtrl.prototype,
  'visibleDepth',
  {
    enumerable: true,
    get: function () {
      return this._visibleDepth;
    },
    set: function (visibleDepth) {
      var newVisibleDepth = Math.min(
        Math.max(1, parseInt(visibleDepth, 10) || 0), this.depth
      );

      if (newVisibleDepth === this._visibleDepth) {
        return;
      }

      // Disable visible depth field until new level of nodes have been loaded
      this.loadingVisibleDepth = true;

      var oldVisibleDepth = this._visibleDepth;
      this._visibleDepth = newVisibleDepth;

      // Wait one digestion cycle. Otherwise adding or removing new nodes will
      // happen before the spinner is displayed.
      this.$timeout(function () {
        var adjustedLabels = this.adjustLevelDepth(oldVisibleDepth);

        if (!this._noVisibleDepthNotification) {
          this.$rootScope.$emit('dashboardVisVisibleDepth', {
            source: 'treeMap',
            visibleDepth: visibleDepth
          });
        } else {
          // Reset no notification.
          this._noVisibleDepthNotification = undefined;
        }

        adjustedLabels.finally(function () {
          this.loadingVisibleDepth = false;
          // Wait one digestion cycle.
          if (!this.transVis) {
            this.$timeout(function () {
              // Focus the input element again because it lost the focus when the
              // input was disabled during the time the new nodes have been
              // loaded.
              this.$rootScope.$broadcast('focusOn', 'visibleDepthInput');
            }.bind(this), 0);
          }
          this.transVis = false;
        }.bind(this));
      }.bind(this), 0);
    }
  }
);

Object.defineProperty(
  TreemapCtrl.prototype,
  'isMaximized',
  {
    get: function () {
      return this.dashboardVisWrapperResizer.isMaximized;
    }
  }
);

Object.defineProperty(
  TreemapCtrl.prototype,
  'isMinimized',
  {
    get: function () {
      return this.dashboardVisWrapperResizer.isMinimized;
    }
  }
);

Object.defineProperty(
  TreemapCtrl.prototype,
  'isEqualized',
  {
    get: function () {
      return this.dashboardVisWrapperResizer.isEqualized;
    }
  }
);

angular
  .module('treemap')
  .controller('TreemapCtrl', [
    '$element',
    '$log',
    '$q',
    '$window',
    '$',
    '_',
    'd3',
    'HEX',
    'D3Colors',
    'treemapSettings',
    'pubSub',
    'treemapContext',
    'Webworker',
    '$rootScope',
    '$timeout',
    'dashboardIntroStarter',
    'dashboardVisWrapperResizer',
    TreemapCtrl
  ]);
