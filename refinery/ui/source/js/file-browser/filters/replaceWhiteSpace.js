angular.module('refineryFileBrowser')
  .filter('fileBrowserReplaceWhiteSpace',fileBrowserReplaceWhiteSpace);

//swap white spaces with hypens
function fileBrowserReplaceWhiteSpace(){
  return function(param){
    console.log(param);
    console.log('in filter');
    if(typeof param !== 'undefined'){
      console.log(param);
      var replaceStr = param.replace(' ', '-');
      console.log(replaceStr);
      return replaceStr;
    }
  };
}

