/*! refinery-platform-ui 2015-06-16 */

function externalToolStatusPopover(a,b){"use strict";return{restrict:"AE",link:function(c,d,e){var f=b.get("externaltool.html"),g=a(f)(c),h={content:g,placement:"bottom",html:!0,date:c.date,trigger:"hover"};$(d).popover(h)}}}angular.module("refineryExternalToolStatus").directive("externalToolStatusPopover",["$compile","$templateCache",externalToolStatusPopover]);
//# sourceMappingURL=external-tool-status-popup-directive.js.map