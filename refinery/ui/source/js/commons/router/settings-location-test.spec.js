describe('Constant: LocationTest', function(){

  beforeEach(module('refineryRouter'));

  it('locationTest should exist', function(){
    expect(LocationTest).toBeDefined();
  });

/* jshint ignore:start */

  it('should return true when matchpath is found', function() {
    expect(
      LocationTest("www.refinery.com","www.refinery.com", 'true')
    ).toBe(true);
    expect(
      LocationTest("www.refinery.com","www.refinery.com", 'false')
    ).toBe(true);
    expect(
      LocationTest( "www.refinery.com/datasets/",
      "http://192.168.50.50:8000/data_sets/" +
      "88d03196-0d41-42c7-9f16-4cf03657db07/#/" +
      "files/browse", 'true')
    ).toBe(false);
    expect(
      LocationTest("www.refinery.com/analyses", "analyses", 'false')
    ).toBe(true);
  });

  it('should return false when matchpath not found', function() {
    expect(
      LocationTest("www.refinery.com","www.refinery.com/#browse", 'false')
    ).toBe(false);
    expect(
      LocationTest( "http://192.168.50.50:8000/data_sets/" +
      "88d03196-0d41-42c7-9f16-4cf03657db07/#/" +
      "files/browse","www.refinery.com/dataset/", 'false')
    ).toBe(false);
    expect(
      LocationTest( "www.refinery.com/dataset/",
      "http://192.168.50.50:8000/data_sets/" +
      "88d03196-0d41-42c7-9f16-4cf03657db07/#/" +
      "files/browse", 'true')
    ).toBe(false);
    expect(
      LocationTest("www.refinery.com/analyses", "dataset", 'false')
    ).toBe(false);
  });

/* jshint ignore:end */
});
