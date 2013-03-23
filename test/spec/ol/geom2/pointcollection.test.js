goog.provide('ol.test.geom2.PointCollection');


describe('ol.geom2.PointCollection', function() {

  describe('createEmpty', function() {

    it('creates an empty instance with the specified capacity', function() {
      var pc = ol.geom2.PointCollection.createEmpty(16);
      expect(pc.getCount()).to.be(0);
      expect(pc.buf.getArray()).to.have.length(32);
    });

    it('can create empty collections for higher dimensions', function() {
      var pc = ol.geom2.PointCollection.createEmpty(16, 3);
      expect(pc.getCount()).to.be(0);
      expect(pc.buf.getArray()).to.have.length(48);
    });

  });

  describe('pack', function() {

    it('packs an empty array', function() {
      var pc = ol.geom2.PointCollection.pack([]);
      expect(pc.buf.getArray()).to.be.empty();
      expect(pc.dim).to.be(2);
    });

    it('packs an empty array with a capacity', function() {
      var pc = ol.geom2.PointCollection.pack([], 4);
      expect(pc.buf.getArray()).to.equalArray([NaN, NaN, NaN, NaN]);
      expect(pc.dim).to.be(2);
    });

    it('packs an empty array with a capacity and a dimension', function() {
      var pc = ol.geom2.PointCollection.pack([], 8, 2);
      expect(pc.buf.getArray()).to.equalArray(
          [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN]);
      expect(pc.dim).to.be(2);
    });

    it('packs a single point', function() {
      var pc = ol.geom2.PointCollection.pack([[0, 1]]);
      expect(pc.buf.getArray()).to.equalArray([0, 1]);
      expect(pc.dim).to.be(2);
    });

    it('can pack multiple points', function() {
      var pc = ol.geom2.PointCollection.pack([[0, 1], [2, 3], [4, 5]]);
      expect(pc.buf.getArray()).to.equalArray([0, 1, 2, 3, 4, 5]);
      expect(pc.dim).to.be(2);
    });

    it('can pack multiple points with a capacity', function() {
      var pc = ol.geom2.PointCollection.pack([[0, 1], [2, 3], [4, 5]], 8);
      expect(pc.buf.getArray()).to.equalArray([0, 1, 2, 3, 4, 5, NaN, NaN]);
      expect(pc.dim).to.be(2);
    });

    it('can pack a single 3-dimensional point', function() {
      var pc = ol.geom2.PointCollection.pack([[0, 1, 2]]);
      expect(pc.buf.getArray()).to.equalArray([0, 1, 2]);
      expect(pc.dim).to.be(3);
    });

    it('can pack a multiple 3-dimensional points', function() {
      var pc = ol.geom2.PointCollection.pack([[0, 1, 2], [4, 5, 6]]);
      expect(pc.buf.getArray()).to.equalArray([0, 1, 2, 4, 5, 6]);
      expect(pc.dim).to.be(3);
    });

    it('raises an error when not all points have the same dimension',
        function() {
          expect(function() {
            var pc = ol.geom2.PointCollection.pack([[0, 1], [2]]);
          }).to.throwException();
        });

    it('raises an error when the capacity is too small', function() {
      expect(function() {
        var pc = ol.geom2.PointCollection.pack([[0, 1], [2, 3], [4, 5]], 2);
      }).to.throwException();
    });

  });

  describe('with an empty buffer, with capacity for two points', function() {

    var pc;
    beforeEach(function() {
      var buf = new ol.structs.Buffer(new Array(4), 0);
      pc = new ol.geom2.PointCollection(buf);
    });

    describe('add', function() {

      it('can add a first point', function() {
        expect(pc.add([0, 1])).to.be(0);
        expect(pc.buf.getArray()).to.equalArray([0, 1, NaN, NaN]);
      });

      it('can add a second point', function() {
        expect(pc.add([0, 1])).to.be(0);
        expect(pc.buf.getArray()).to.equalArray([0, 1, NaN, NaN]);
        expect(pc.add([2, 3])).to.be(2);
        expect(pc.buf.getArray()).to.equalArray([0, 1, 2, 3]);
      });

      it('raises an error when the third point is added', function() {
        expect(pc.add([0, 1])).to.be(0);
        expect(pc.buf.getArray()).to.equalArray([0, 1, NaN, NaN]);
        expect(pc.add([2, 3])).to.be(2);
        expect(pc.buf.getArray()).to.equalArray([0, 1, 2, 3]);
        expect(function() {
          pc.add([4, 5]);
        }).to.throwException();
      });

      it('raises an error if a point of the wrong dimension is added',
          function() {
            expect(function() {
              pc.add([0, 1, 2]);
            }).to.throwException();
          });

    });

    describe('getCount', function() {

      it('returns 0', function() {
        expect(pc.getCount()).to.be(0);
      });

    });

    describe('getExtent', function() {

      it('returns an empty extent', function() {
        expect(pc.getExtent().isEmpty()).to.be(true);
      });

    });

    describe('unpack', function() {

      it('returns an empty array', function() {
        expect(pc.unpack()).to.be.empty();
      });

    });

  });

  describe('with a partially populated instance', function() {

    var dirtySet, pc;
    beforeEach(function() {
      dirtySet = new ol.structs.IntegerSet();
      pc = ol.geom2.PointCollection.pack([[0, 1], [2, 3]], 8);
      pc.buf.addDirtySet(dirtySet);
    });

    describe('add', function() {

      it('can add more points', function() {
        expect(pc.add([4, 5])).to.be(4);
        expect(pc.buf.getArray()).to.equalArray([0, 1, 2, 3, 4, 5, NaN, NaN]);
        expect(pc.add([6, 7])).to.be(6);
        expect(pc.buf.getArray()).to.equalArray([0, 1, 2, 3, 4, 5, 6, 7]);
      });

    });

    describe('get', function() {

      it('returns the expected value for the first point', function() {
        expect(pc.get(0)).to.equalArray([0, 1]);
      });

      it('returns the expected value for the second point', function() {
        expect(pc.get(2)).to.equalArray([2, 3]);
      });

    });

    describe('getCount', function() {

      it('returns the expected value', function() {
        expect(pc.getCount()).to.be(2);
      });

    });

    describe('getExtent', function() {

      it('returns the expected value', function() {
        var extent = pc.getExtent();
        expect(extent.minX).to.be(0);
        expect(extent.minY).to.be(1);
        expect(extent.maxX).to.be(2);
        expect(extent.maxY).to.be(3);
      });

    });

    describe('remove', function() {

      it('can remove the first point', function() {
        pc.remove(0);
        expect(pc.buf.getArray()).to.equalArray(
            [NaN, NaN, 2, 3, NaN, NaN, NaN, NaN]);
      });

      it('can remove the second point', function() {
        pc.remove(2);
        expect(pc.buf.getArray()).to.equalArray(
            [0, 1, NaN, NaN, NaN, NaN, NaN, NaN]);
      });

    });

    describe('set', function() {

      it('marks the updated elements as dirty', function() {
        pc.set(2, [4, 5]);
        expect(pc.buf.getArray()).to.equalArray(
            [0, 1, 4, 5, NaN, NaN, NaN, NaN]);
        expect(dirtySet.getArray()).to.equalArray([2, 4]);
      });

    });

    describe('unpack', function() {

      it('returns the expect value', function() {
        var points = pc.unpack();
        expect(points).to.be.an(Array);
        expect(points.length).to.be(2);
        expect(points[0]).to.equalArray([0, 1]);
        expect(points[1]).to.equalArray([2, 3]);
      });

    });

    describe('after removing the first point', function() {

      beforeEach(function() {
        pc.remove(0);
      });

      describe('getCount', function() {

        it('returns the expected value', function() {
          expect(pc.getCount()).to.be(1);
        });

      });

      describe('unpack', function() {

        it('returns the expected value', function() {
          var points = pc.unpack();
          expect(points).to.be.an(Array);
          expect(points.length).to.be(1);
          expect(points[0]).to.equalArray([2, 3]);
        });

      });

    });

  });

  describe('usage example', function() {

    it('works as expected', function() {
      var pc = ol.geom2.PointCollection.pack([[0, 1], [2, 3], [4, 5]], 8);
      var dirtySet = new ol.structs.IntegerSet();
      pc.buf.addDirtySet(dirtySet);
      expect(pc.buf.getArray()).to.equalArray([0, 1, 2, 3, 4, 5, NaN, NaN]);
      expect(pc.unpack()).to.have.length(3);
      expect(pc.getCount()).to.be(3);
      var point = pc.get(2);
      expect(point).to.equalArray([2, 3]);
      pc.remove(2);
      expect(pc.buf.getArray()).to.equalArray([0, 1, NaN, NaN, 4, 5, NaN, NaN]);
      expect(pc.unpack()).to.have.length(2);
      expect(pc.getCount()).to.be(2);
      point = [6, 7];
      expect(pc.add(point)).to.be(2);
      expect(pc.buf.getArray()).to.equalArray([0, 1, 6, 7, 4, 5, NaN, NaN]);
      expect(pc.unpack()).to.have.length(3);
      expect(pc.getCount()).to.be(3);
      expect(dirtySet.getArray()).to.equalArray([2, 4]);
    });

  });

});


goog.require('ol.geom2.PointCollection');
goog.require('ol.structs.Buffer');
goog.require('ol.structs.IntegerSet');
