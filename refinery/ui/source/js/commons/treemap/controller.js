/* global angular:false */

/**
 * TreeMap controller constructor.
 *
 * @method  TreemapCtrl
 * @author  Fritz Lekschas
 * @date    2015-08-04
 * @param   {Object}     $element   Directive's root element.
 * @param   {Object}     $q         Angular's promise service.
 * @param   {Object}     $          jQuery.
 * @param   {Object}     d3         D3.
 * @param   {Object}     neo4jToD3  Neo4J to D3 converter.
 * @param   {Object}     HEX        HEX class.
 * @param   {Object}     D3Colors   Service for creating D3 color scalings.
 * @param   {Object}     settings   Treemap settings.
 */
function TreemapCtrl ($element, $q, $, d3, HEX, D3Colors, treemapSettings,
  pubSub, dashboardTreemapPreloader) {
  console.log('Init Treemap');

  this.$ = $;
  this.$q = $q;
  this.d3 = d3;
  this.HEX = HEX;
  this.$element = this.$($element);
  this.$d3Element = this.$element.find('.treemap svg');
  this.settings = treemapSettings;
  this.pubSub = pubSub;

  this._visibleDepth = 1;
  this.currentLevel = 0;

  this.treemap.width = this.$d3Element.width();
  this.treemap.height = this.$d3Element.height();

  this.numColors = 10;
  this.steps = 6;

  this.treemap.colors = new D3Colors(
    this.d3.scale.category10().domain(d3.range(this.numColors)).range()
  ).getScaledFadedColors(this.steps);

  this.treemap.x = this.d3.scale.linear()
    .domain([0, this.treemap.width])
    .range([0, this.treemap.width]);

  this.treemap.y = this.d3.scale.linear()
    .domain([0, this.treemap.height])
    .range([0, this.treemap.height]);

  this.treemap.el = this.d3.layout.treemap()
    .children(function(d, depth) { return depth ? null : d._children; })
    .sort(function(a, b) { return a.value - b.value; })
    .ratio(this.treemap.height / this.treemap.width * 0.5 * (1 + Math.sqrt(5)))
    .round(false)
    .ratio(1);

  this.treemap.element = this.d3.select(this.$d3Element[0])
    .attr('viewBox', '0 0 ' + this.treemap.width + ' ' + this.treemap.height)
    .append('g')
      .style('shape-rendering', 'crispEdges');
  this.treemap.$element = this.$(this.treemap.element.node());

  this.treemap.grandParent = this.d3.select('#back');
  this.treemap.$grandParent = this.$(this.treemap.grandParent.node());
  this.treemap.$grandParentContainer = this.treemap.$grandParent.parent();

  /* ---------------------------- [START: STATIC] --------------------------- */
  // this.d3.json('data/cl.json', function(error, data) {
  //   if (error) return console.warn(error);
  //   this.data = data;
  //   this.draw();
  // }.bind(this));
  /* ----------------------------- [END: STATIC] ---------------------------- */

  /* ----------------------------- [START: LIVE] ---------------------------- */
  dashboardTreemapPreloader
    .data
    .then(function (data) {
      this.data = data;
      this.pubSub.trigger('treemap.loaded');
      this.draw();
    }.bind(this));
  /* ------------------------------ [END: LIVE] ----------------------------- */
}

/*
 * -----------------------------------------------------------------------------
 * Methods
 * -----------------------------------------------------------------------------
 */

/**
 * Starter function for aggrgation and pruning.
 *
 * @method  accumulateAndPrune
 * @author  Fritz Lekschas
 * @date    2015-08-18
 *
 * @param   {Object}  data        D3 data object.
 * @param   {String}  valueProp   Name of the property holding the value.
 */
TreemapCtrl.prototype.accumulateAndPrune = function (data, valueProp) {
  var numChildren = data.children ? data.children.length : false;
  data.meta = data.meta || {};

  if (numChildren) {
    accumulateAndPruneChildren.call(this, data, numChildren, valueProp, 0);
    if (data.value) {
      data.value += data[valueProp];
    } else {
      data.value = data[valueProp];
    }
  }

  /**
   * Recursively accumulate `valueProp` values and prune _empty_ leafs.
   *
   * This function traverses all inner loops and stops one level BEFORE a leaf
   * to be able to splice (delete) empty leafs from the list of children
   *
   * @method  accumulateAndPruneChildren
   * @author  Fritz Lekschas
   * @date    2015-08-18
   *
   * @param   {Object}   node         D3 data object of the node.
   * @param   {Number}   numChildren  Number of children of `node.
   * @param   {String}   valueProp    Property name of the propery holding the
   *   value of the node's _size_.
   * @param   {Number}   depth        Original depth of the current node.
   * @param   {Boolean}  root         If node is the root.
   */
  function accumulateAndPruneChildren (node, numChildren, valueProp, depth) {
    // A reference for later
    node._children = node.children;
    node.meta.originalDepth = depth;
    var i = numChildren;
    // We move in reverse order so that deleting nodes doesn't affect future
    // indices.
    while (i--) {
      var child = node.children[i];
      var numChildChildren = child.children ? child.children.length : false;

      child.meta = child.meta || {};

      if (numChildChildren) {
        // Inner node.
        accumulateAndPruneChildren.call(
          this, child, numChildChildren, valueProp, depth + 1
        );
        numChildChildren = child.children.length;
      }

      // We check again the number of children of the child since it can happen
      // that all children have been deleted meanwhile and the inner node became
      // a leaf as well.
      if (numChildChildren) {
        // Inner node.
        if (child[valueProp]) {
          // Add own `numDataSets` to existing `value`.
          child.value += child[valueProp];
          // To represent this node visually in the tree map we need to create
          // a "fake" child, i.e. pseudo node, holding the values of this inner
          // node.
          child.children.push({
            name: child.name,
            meta: {
              originalDepth: child.depth + 1,
              pseudoNode: true
            },
            value: child[valueProp]
          });
          child.children[child.children.length - 1][valueProp] = child[valueProp];
        } else {
          // We prune `child`, i.e. remove, a node in two cases
          // A) `child` is the only child of `node` or
          // B) `child` only has one child.
          // This way we ensure that the out degree of `child` is two or higher.
          if (numChildren === 1 || numChildChildren === 1) {
            // We can remove the inner node since it wasn't used for any
            // annotations.
            for (var j = 0, len = child.children.length; j < len; j++) {
              if (child.children[j].meta.skipped) {
                child.children[j].meta.skipped.unshift(child.name);
              } else {
                child.children[j].meta.skipped = [child.name];
              }
              node.children.push(child.children[j]);
            }
            // Remove the child with the empty valueProp
            node.children.splice(i, 1);
          }
        }
      } else {
        // Leaf.
        if (!child[valueProp]) {
          // Leaf was not used for annotation so we remove it.
          node.children.splice(i, 1);
          numChildren--;
          continue;
        } else {
          // Set `value` of the leaf itself.
          child.value = child[valueProp];
          child.meta.leaf = true;
          child.meta.originalDepth = depth + 1;
        }
      }

      // Increase `value` if the node by the children's `numDataSets`.
      if (typeof node.value !== 'undefined') {
        node.value += child.value;
      } else {
        node.value = child.value;
      }
    }
  }
};

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
  var that = this,
      childChildNode,
      promises = [];

  // Create a `g` wrapper for all children.
  var children = parent.selectAll('.group-of-nodes')
    .data(data._children)
    .enter()
      .append('g')
      .attr('class', 'group-of-nodes');

  // Recursion
  if (level < this.visibleDepth) {
    this.children[level + 1] = this.children[level + 1] || [];
    children.each(function (data) {
      if (data._children && data._children.length) {
        var childChildren = that.addChildren(
          that.d3.select(this), data, level + 1, firstTime);
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

    childChildNode = this.addInnerNodes(children);
  }

  // D3 selection of all children without any children, i.e. leafs.
  var childrensLeafs = children.filter(function(child) {
      return !(child._children && child._children.length);
    });

  var leafs = childrensLeafs
    .selectAll('.leaf-node')
    .data(function (data) {
      return [data];
    })
    .enter()
    .append('g')
      .attr('class', 'leaf-node')
      .attr('opacity', 0);

  leafs
    .append('rect')
      .attr('class', 'leaf')
      .attr('fill', this.color.bind(this))
      .call(this.rect.bind(this));

  leafs
    .call(this.addLabel.bind(this), 'name');

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
    that.transition(this, this.__data__);
  });

  this.treemap.$element.on(
    'click',
    '.label-wrapper, .outer-border',
    function () {
      /*
       * that = TreemapCtrl
       * this = the clicked DOM element
       * data = data
       */
      var $this = $(this);

      if ($this.parent().attr('class') === 'leaf-node') {
        return;
      }

      that.transition(this, this.__data__);
    }
  );

  this.treemap.$element.on('mousewheel', function (e) {
    e.preventDefault();
    this.visibleDepth += e.deltaY > 0 ? 1 : -1;
  }.bind(this));
};

/**
 * Add inner nodes
 *
 * @method  addInnerNodes
 * @author  Fritz Lekschas
 * @date    2015-08-05
 * @param   {[type]}       parents  [description]
 */
TreemapCtrl.prototype.addInnerNodes = function (parents) {
  // D3 selection of all children with children
  var parentsWithChildren = parents.filter(function(parent) {
    return parent._children && parent._children.length;
  });

  innerNodes = parentsWithChildren
    .append('g')
      .attr('class', 'inner-node')
      .attr('opacity', 0);

  innerNodes
    .append('rect')
      .attr('class', 'inner-border')
      .attr('fill', this.color.bind(this))
      .call(this.rect.bind(this), 1);

  innerNodes
    .append('rect')
    .attr('class', 'outer-border')
    .call(this.rect.bind(this));

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
 * @param   {Object}    el    D3 selection.
 * @param   {String}    attr  Attribute name which holds the label's text.
 */
TreemapCtrl.prototype.addLabel = function (el, attr) {
  var that = this;

  el.append('foreignObject')
    .attr('class', 'label-wrapper')
    .call(this.rect.bind(this), 2)
    .append('xhtml:div')
      .attr('class', 'label')
      .attr('title', function(data) {
          return data[attr];
      })
      .classed('label-bright', function (data) {
        if (data.meta.colorRgb) {
          var contrastBlack = data.meta.colorRgb
              .contrast(new that.HEX('#000000').toRgb()),
            contrastWhite = data.meta.colorRgb
              .contrast(new that.HEX('#ffffff').toRgb());
          return contrastBlack < contrastWhite;
        }
      })
      .append('xhtml:span')
        .text(function(data) {
            return data[attr];
        });
};

/**
 * Add levels of children starting from level `level` until `this.visibleDepth`.
 *
 * @method  addLevelsOfNodes
 * @author  Fritz Lekschas
 * @date    2015-08-18
 *
 * @param   {Number}  oldVisibleDepth  Starting level.
 */
TreemapCtrl.prototype.addLevelsOfNodes = function (oldVisibleDepth) {
  var currentInnerNodes = this.d3.selectAll('.inner-node'),
    promises = [],
    that = this;

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
  this.$q.all(promises)
    .then(function () {
      currentInnerNodes.remove();
    });
};

/**
 * Helper function that decides whether nodes have to be added or removed.
 *
 * @method  adjustLevelDepth
 * @author  Fritz Lekschas
 * @date    2015-08-18
 *
 * @param   {Number}  oldVisibleDepth  Former level of depth.
 */
TreemapCtrl.prototype.adjustLevelDepth = function (oldVisibleDepth) {
  var that = this;

  if (oldVisibleDepth < this.visibleDepth) {
    this.addLevelsOfNodes(oldVisibleDepth);
  }
  if (oldVisibleDepth > this.visibleDepth) {
    this.removeLevelsOfNodes(oldVisibleDepth);
  }
};

/**
 * Generate a color given an elements node data object.
 *
 * @method  color
 * @author  Fritz Lekschas
 * @date    2015-07-31
 * @param   {Object}  node  D3 node data object.
 * @return  {String}        HEX color string.
 */
TreemapCtrl.prototype.color = function (node) {
  var hex, rgb;

  if (node.meta.colorHex) {
    return node.meta.colorHex;
  }

  if (this.colorMode === 'depth') {
    // Color by original depth
    // The deeper the node, the lighter the color
    hex = this.treemap.colors((node.meta.branchNo[0] * this.steps) +
      Math.min(this.steps, node.meta.originalDepth) - 1);
  } else {
    // Default:
    // Color by reverse final depth (after pruning). The fewer children a node
    // has, the lighter the color. E.g. a leaf is lightest while the root is
    // darkest.
    hex = this.treemap.colors((node.meta.branchNo[0] * this.steps) +
      Math.max(0, this.steps - node.meta.revDepth - 1));
  }

  // Precompute RGB
  rgb = new this.HEX(hex).toRgb();

  // Cache colors for speed
  node.meta.colorHex = hex;
  node.meta.colorRgb = rgb;

  return hex;
};

/**
 * Provide a color to a DOM's attribute
 *
 * @method  colorEl
 * @author  Fritz Lekschas
 * @date    2015-07-31
 * @param   {Object}    element    DOM element created by D3.
 * @param   {String}    attribute  Name of attribute that should be colored.
 */
TreemapCtrl.prototype.colorEl = function (element, attribute) {
  element
    .attr(attribute, this.color.bind(this));
};

/**
 * Display the data.
 *
 * @param   {Object}  node  D3 data object of the node.
 * @return  {Object}        D3 selection of node's children.
 */
TreemapCtrl.prototype.display = function (node, firstTime) {
  var that = this;

  this.setBreadCrumb(node);

  // Keep a reference to the old wrapper
  this.treemap.formerGroupWrapper = this.treemap.groupWrapper;

  // Create a new wrapper group for the children.
  this.treemap.groupWrapper = this.treemap.element
    .append('g')
    .datum(node)
    .attr('class', 'depth');

  // For completeness we store the children of level zero.
  this.children[0] = [this.treemap.groupWrapper];

  var children = this.addChildren(
    this.treemap.groupWrapper, node, 1, firstTime);

  // We have to cache the children to dynamically adjust the level depth.
  this.children[1] = [children[0]];

  return children;
};

/**
 * Draw the treemap.
 *
 * @method  draw
 * @author  Fritz Lekschas
 * @date    2015-08-03
 */
TreemapCtrl.prototype.draw = function () {
  if (this.data === null) {
    return false;
  }

  this.initialize(this.data);
  this.accumulateAndPrune(this.data, 'numDataSets');
  this.layout(this.data, 0);
  this.display(this.data, true);

  this.addEventListeners();
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
  var defers = [],
      promises = [],
      that = this;

  selection
    .each(function (data, index) {
      defers[index] = that.$q.defer();
      promises[index] = defers[index].promise;
    });

  selection
    .transition()
    .duration(function () {
      if (firstTime) {
        return that.settings.treemapFadeInDuration + (Math.random() * that.settings.treemapFadeInDuration);
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
TreemapCtrl.prototype.layout = function (parent, depth) {
  // Initialize a cache object used later
  parent.cache = {};
  parent.meta.depth = depth;
  if (parent._children && parent._children.length) {
    this.depth = Math.max(this.depth, depth + 1);
    // This creates an anonymous 1px x 1px treemap and sets the children's
    // coordinates accordingly.
    this.treemap.el({_children: parent._children});
    for (var i = 0, len = parent._children.length; i < len; i++) {
      var child = parent._children[i];
      child.x = parent.x + child.x * parent.dx;
      child.y = parent.y + child.y * parent.dy;
      child.dx *= parent.dx;
      child.dy *= parent.dy;
      child.parent = parent;

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

  reduction = reduction || 0;

  elements
    .attr('x', function (data) {
      return that.treemap.x(data.x) + reduction;
    })
    .attr('y', function (data) {
      return that.treemap.y(data.y) + reduction;
    })
    .attr('width', function (data) {
      data.cache.width = Math.max(0, (
        that.treemap.x(data.x + data.dx) -
        that.treemap.x(data.x) -
        (2 * reduction)
      ));

      return data.cache.width;
    })
    .attr('height', function (data) {
      data.cache.height = Math.max(0, (
        that.treemap.y(data.y + data.dy) -
        that.treemap.y(data.y) -
        (2 * reduction)
      ));

      return data.cache.height;
    });
};

/**
 * Remove all levels until `newLevel`.
 *
 * @method  removeLevelsOfNodes
 * @author  Fritz Lekschas
 * @date    2015-08-05
 * @param   {Number}  oldVisibleDepth  Former level of depth.
 */
TreemapCtrl.prototype.removeLevelsOfNodes = function (oldVisibleDepth) {
    var i,
      len,
      startLevel = this.currentLevel + this.visibleDepth,
      that = this;

    // Add inner nodes to `.group-of-nodes` at `startLevel`.
    for (i = 0, len = this.children[this.visibleDepth].length; i < len; i++) {
      // Ignoring jsHint because basically we just have another nested for loop.
      /* jshint -W083 */
      this.children[this.visibleDepth][i].each(function (data) {
        that.fadeIn(that.addInnerNodes(that.d3.select(this)));
      });
      /* jshint +W083 */
    }

    // Remove all children deeper than what is specified.
    for (i = 0, len = this.children[this.visibleDepth + 1].length; i < len; i++) {
      var group = this.children[this.visibleDepth + 1][i].transition().duration(250);

      // Fade groups out and remove them
      group
        .style('opacity', 0)
        .remove();
    }
    // Unset intemediate levels
    for (i = this.visibleDepth + 1; i <= oldVisibleDepth; i++) {
      this.children[i] = undefined;
    }
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
  this.treemap.breadCrumbContainerWidth = this.treemap.breadCrumbContainerWidth || this.treemap.$grandParentContainer.width();

  var gp = $(this.treemap.grandParent[0]);

  var parent = node.parent,
      that = this;

  // Add current root as an indecator where we are.
  var current = this.treemap.grandParent
    .append('li')
      .attr('class', 'current-root');

  if (parent) {
    current
      .append('svg')
        .attr('class', 'icon-arrow-left is-mirrored')
        .append('use')
          .attr('xlink:href', 'assets/images/icons.svg#arrow-left');
  }

  current
    .append('span')
      .attr('class', 'text')
      .text(node.name);

  this.treemap.breadCrumbWidth += $(current.node()).width();

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
            .attr('xlink:href', 'assets/images/icons.svg#arrow-left');
    }

    crumb
      .append('span')
        .attr('class', 'text')
        .text(parent.name);

    this.treemap.breadCrumbWidth += $(crumb.node()).outerWidth();

    if (this.treemap.breadCrumbWidth > this.treemap.breadCrumbContainerWidth) {
      this.treemap.$grandParent
        .addClass('right')
        .css('marginLeft', -this.treemap.breadCrumbWidth);

      $(crumb.node()).parent().html('&hellip;');

      break;
    }

    node = parent;
    parent = node.parent;
  }
};

/**
 * Transition between parent and child branches of the treemap.
 *
 * @method  transition
 * @author  Fritz Lekschas
 * @date    2015-08-03
 * @param   {Object}  data  D3 data object of the node to transition to.
 */
TreemapCtrl.prototype.transition = function (el, data) {
  if (this.treemap.transitioning || !data) {
    return;
  }

  this.currentLevel = data.meta.depth;

  this.treemap.transitioning = true;

  var newGroups = this.display.call(this, data),
      newGroupsTrans, formerGroupWrapper, formerGroupWrapperTrans;

  // After all newly added inner nodes and leafs have been faded in we call the
  // zoom transition.
  newGroups[1]
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
      this.treemap.element.style('shape-rendering', null);

      // Fade-in entering text.
      newGroups.selectAll('.label-wrapper')
        .style('fill-opacity', 0);

      formerGroupWrapperTrans.selectAll('.inner-border')
        .call(this.rect.bind(this), 1);

      formerGroupWrapperTrans.selectAll('.outer-border, .leaf')
        .call(this.rect.bind(this));

      formerGroupWrapperTrans.selectAll('.label-wrapper')
        .call(this.rect.bind(this), 2);

      newGroupsTrans.selectAll('.inner-border')
        .call(this.rect.bind(this), 1);

      newGroupsTrans.selectAll('.outer-border, .leaf')
        .call(this.rect.bind(this));

      newGroupsTrans.selectAll('.label-wrapper')
        .style('fill-opacity', 1)
        .call(this.rect.bind(this), 2);

      // Remove the old node when the transition is finished.
      formerGroupWrapperTrans.remove()
        .each('end', function() {
          this.treemap.element.style('shape-rendering', 'crispEdges');
          this.treemap.transitioning = false;
        }.bind(this));
    }.bind(this))
    .catch(function (e) {
      console.error(e);
    });
};


/*
 * -----------------------------------------------------------------------------
 * Properties
 * -----------------------------------------------------------------------------
 */

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
    configurable: false,
    enumerable: true,
    value: [],
    writable: true
  }
);

/**
 * D3 data object.
 *
 * @author  Fritz Lekschas
 * @date    2015-08-04
 * @type    {Boolean}
 */
Object.defineProperty(
  TreemapCtrl.prototype,
  'data',
  {
    configurable: false,
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
    configurable: false,
    enumerable: true,
    value: 0,
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
    configurable: false,
    enumerable: true,
    get: function () {
      return this._visibleDepth;
    },
    set: function (visibleDepth) {
      var oldVisibleDepth = this._visibleDepth;
      this._visibleDepth = Math.min(Math.max(1, visibleDepth), this.depth);
      this.adjustLevelDepth(oldVisibleDepth);
    }
});

/**
 * Object holding the actual D3 treemap and related data.
 *
 * @type  {Object}
 */
Object.defineProperty(
  TreemapCtrl.prototype,
  'treemap',
  {
    configurable: false,
    enumerable: true,
    value: {},
    writable: true
});

angular
  .module('treemap')
  .controller('TreemapCtrl', [
    '$element',
    '$q',
    '$',
    'd3',
    'HEX',
    'D3Colors',
    'treemapSettings',
    'pubSub',
    'dashboardTreemapPreloader',
    TreemapCtrl
  ]);
