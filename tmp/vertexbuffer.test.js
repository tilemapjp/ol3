goog.provide('ol.test.VertexBuffer');


describe('ol.VertexBuffer', function() {

  it('throws an error if the supplied array is the wrong size', function() {
    expect(function() {
      var vb = new ol.VertexBuffer(2, [1]);
    }).toThrow();
  });

});

describe('ol.PointCollection', function() {

  it('allows an empty point collections to be constructed', function() {
    var pc = new ol.PointCollection();
    expect(pc.dim).toEqual(2);
    expect(pc.arr).toEqual([]);
    expect(pc.isDirty()).toBeFalsy();
  });

  it('packs points correctly', function() {
    var pc = ol.PointCollection.pack([[1, 2], [3, 4]]);
    expect(pc.dim).toEqual(2);
    expect(pc.arr).toEqual([1, 2, 3, 4]);
    expect(pc.isDirty()).toBeFalsy();
  });

  it('guesses dimensions correctly', function() {
    var pc = ol.PointCollection.pack([[1, 2, 3], [4, 5, 6]]);
    expect(pc.dim).toEqual(3);
    expect(pc.arr).toEqual([1, 2, 3, 4, 5, 6]);
    expect(pc.isDirty()).toBeFalsy();
  });

  it('throws an error when dimensions are inconsistent', function() {
    expect(function() {
      var pc = new PointCollection.pack([[1, 2, 3], [4, 5]]);
    }).toThrow();
  });

  it('unpacks points correctly', function() {
    var pc = new ol.PointCollection(2, [1, 2, 3, 4]);
    expect(pc.unpack()).toEqual([[1, 2], [3, 4]]);
    expect(pc.isDirty()).toBeFalsy();
  });

  it('allows vertices to be pushed', function() {
    var pc = new ol.PointCollection();
    expect(pc.pushPoint([1, 2])).toEqual(0);
    expect(pc.dim).toEqual(2);
    expect(pc.arr).toEqual([1, 2]);
    expect(pc.isDirty()).toBeTruthy();
    expect(pc.firstDirty).toEqual(0);
    expect(pc.lastDirty).toEqual(2);
  });

  it('tracks dirty vertices', function() {
    var pc = new ol.PointCollection(2, [1, 2, 3, 4, 5, 6]);
    expect(pc.getPoint(2)).toEqual([3, 4]);
    expect(pc.setPoint(2, [7, 8])).toEqual(2);
    expect(pc.getPoint(2)).toEqual([7, 8]);
    expect(pc.isDirty()).toBeTruthy();
    expect(pc.firstDirty).toEqual(2);
    expect(pc.lastDirty).toEqual(4);
  });

});


describe('ol.LineStringCollection', function() {

  describe('constructor', function() {

    it('allows an empty line string collection to be constructed', function() {
      var lsc = new ol.LineStringCollection();
      expect(lsc.dim).toEqual(2);
      expect(lsc.arr).toEqual([]);
      expect(lsc.stop).toEqual([]);
      expect(lsc.isDirty()).toBeFalsy();
    });

  });

  describe('pack', function() {

    it('correctly packs a line string', function() {
      var lsc =
          ol.LineStringCollection.pack([[[1, 2], [3, 4]], [[5, 6], [7, 8]]]);
      expect(lsc.dim).toEqual(2);
      expect(lsc.arr).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(lsc.stop).toEqual([4, 8]);
      expect(lsc.isDirty()).toBeFalsy();
    });

  });

  describe('unpack', function() {

    it('correctly unpacks a line string', function() {
      var lsc =
          new ol.LineStringCollection(2, [1, 2, 3, 4, 5, 6, 7, 8], [4, 8]);
      expect(lsc.unpack()).toEqual([[[1, 2], [3, 4]], [[5, 6], [7, 8]]]);
    });

  });

  describe('getLineString', function() {

    it('correctly gets individual line strings', function() {
      var lsc =
          new ol.LineStringCollection(2, [1, 2, 3, 4, 5, 6, 7, 8], [4, 8]);
      expect(lsc.getLineString(0)).toEqual([[1, 2], [3, 4]]);
      expect(lsc.getLineString(1)).toEqual([[5, 6], [7, 8]]);
    });

  });

});


goog.require('ol.LineStringCollection');
goog.require('ol.PointCollection');
goog.require('ol.VertexBuffer');
