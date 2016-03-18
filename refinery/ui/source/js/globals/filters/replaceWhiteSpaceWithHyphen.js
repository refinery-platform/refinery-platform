angular.module('replaceWhiteSpaceWithHyphen', [])
  .filter('replaceWhiteSpaceWithHyphen',replaceWhiteSpaceWithHyphen);

//swap white spaces with hypens
function replaceWhiteSpaceWithHyphen(){
  return function(param){
    if(typeof param !== 'undefined'){
      //regex global search & replace
      return (param.replace(/ /g, '-'));
    }
  };
}

