angular.module('refineryFileBrowser')
  .filter('replaceWhiteSpaceWithHyphen',replaceWhiteSpaceWithHyphen);

//swap white spaces with hypens
function replaceWhiteSpaceWithHyphen(){
  return function(param){
    if(typeof param !== 'undefined'){
      return (param.replace(' ', '-'));
    }
  };
}

