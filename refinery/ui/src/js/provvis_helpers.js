/**
 * Helper function collection for the provvis module.
 */

/**
 * Set hidden attribute for object and class for css of BaseNode.
 * @param n BaseNode.
 */
var hideChildNodes = function (n) {
    if (!n.children.empty()) {
        n.children.values().forEach(function (cn) {
            cn.hidden = true;
            d3.selectAll("#nodeId-" + cn.autoId).classed({"selectedNode": false, "hiddenNode": true});
            if (!cn.children.empty())
                hideChildNodes(cn);
        });
    }
};

/**
 * Set selected attribute for object of BaseNode.
 * @param n BaseNode.
 * @param selected Node may be selected or not.
 */
var propagateNodeSelection = function (n, selected) {
    if (!n.children.empty()) {
        n.children.values().forEach(function (cn) {
            cn.selected = selected;
            cn.doi.selectedChanged();
            //d3.selectAll("#nodeId-" + cn.autoId).classed({"selectedNode": selected});
            if (!cn.children.empty())
                propagateNodeSelection(cn, selected);
        });
    }
};