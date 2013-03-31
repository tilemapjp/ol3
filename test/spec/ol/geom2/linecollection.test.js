goog.provide('ol.test.geom2.LineStringCollection');


describe('ol.geom2.LineStringCollection', function() {

  describe('createEmpty', function() {

    it('creates an empty instance with the specified capacity', function() {
      var lsc = ol.geom2.LineStringCollection.createEmpty(16);
      expect(lsc.getCount()).to.be(0);
      expect(lsc.buf.getArray()).to.have.length(32);
    });

    it('can create empty collections for higher dimensions', function() {
      var lsc = ol.geom2.LineStringCollection.createEmpty(16, 3);
      expect(lsc.getCount()).to.be(0);
      expect(lsc.buf.getArray()).to.have.length(48);
    });

  });

  describe('pack', function() {

    it('packs an empty array', function() {
      var lsc = ol.geom2.LineStringCollection.pack([]);
      expect(lsc.buf.getArray()).to.be.empty();
      expect(lsc.dim).to.be(2);
    });

    it('packs an empty array with a capacity', function() {
      var lsc = ol.geom2.LineStringCollection.pack([], 4);
      expect(lsc.buf.getArray()).to.equalArray([NaN, NaN, NaN, NaN]);
      expect(lsc.dim).to.be(2);
    });

  });

});


goog.require('ol.geom2.LineStringCollection');
