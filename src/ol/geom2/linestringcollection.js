goog.provide('ol.geom2.LineString');
goog.provide('ol.geom2.LineStringCollection');

goog.require('goog.object');
goog.require('ol.geom2');
goog.require('ol.structs.Buffer');


/**
 * @typedef {Array.<Array.<number>>}
 */
ol.geom2.LineString;



/**
 * @constructor
 * @param {ol.structs.Buffer} buf Buffer.
 * @param {Object.<number, ol.geom2.Range>=} opt_ranges Ranges.
 * @param {number=} opt_dim Dimension.
 */
ol.geom2.LineStringCollection = function(buf, opt_ranges, opt_dim) {

  /**
   * @type {ol.structs.Buffer}
   */
  this.buf = buf;

  /**
   * @type {Object.<number, ol.geom2.Range>}
   */
  this.ranges = goog.isDef(opt_ranges) ? opt_ranges : {};

  /**
   * @type {number}
   */
  this.dim = goog.isDef(opt_dim) ? opt_dim : 2;

};


/**
 * @param {number} capacity Capacity.
 * @param {number=} opt_dim Dimension.
 * @return {ol.geom2.LineStringCollection} Line string collection.
 */
ol.geom2.LineStringCollection.createEmpty = function(capacity, opt_dim) {
  var dim = goog.isDef(opt_dim) ? opt_dim : 2;
  var buf = new ol.structs.Buffer(new Array(capacity * dim), 0);
  return new ol.geom2.LineStringCollection(buf, undefined, dim);
};


/**
 * @param {Array.<ol.geom2.LineString>} unpackedLineStrings Unpacked line
 *     strings.
 * @param {number=} opt_capacity Capacity.
 * @param {number=} opt_dim Dimension.
 * @return {ol.geom2.LineStringCollection} Line string collection.
 */
ol.geom2.LineStringCollection.pack =
    function(unpackedLineStrings, opt_capacity, opt_dim) {
  var i;
  var n = unpackedLineStrings.length;
  var dim = goog.isDef(opt_dim) ? opt_dim :
      n > 0 ? unpackedLineStrings[0][0].length : 2;
  var capacity;
  if (goog.isDef(opt_capacity)) {
    capacity = opt_capacity;
  } else {
    capacity = 0;
    for (i = 0; i < n; ++i) {
      capacity += unpackedLineStrings[i].length;
    }
  }
  capacity *= dim;
  var arr = new Array(capacity);
  /** @type {Object.<number, number>} */
  var end = {};
  var arrIndex = 0;
  var j, k, lineString, point, start;
  for (i = 0; i < n; ++i) {
    lineString = unpackedLineStrings[i];
    start = arrIndex;
    for (j = 0; j < lineString.length; ++i) {
      point = lineString[j];
      goog.asserts.assert(point.length == dim);
      for (k = 0; k < dim; ++k) {
        arr[arrIndex++] = point[k];
      }
    }
    end[start] = arrIndex;
  }
  goog.asserts.assert(arrIndex <= capacity);
  var buf = new ol.structs.Buffer(buf, arrIndex);
  return new ol.geom2.LineStringCollection(buf, end, dim);
};


/**
 * @param {ol.geom2.LineString} lineString Line string.
 * @return {number} Offset.
 */
ol.geom2.LineStringCollection.prototype.add = function(lineString) {
  var n = lineString.length * this.dim;
  var offset = this.buf.allocate(n);
  goog.asserts.assert(offset != -1);
  this.ranges[offset] = {
    start: offset,
    stop: offset + n
  };
  return ol.geom2.packPoints(this.buf.getArray(), offset, lineString, this.dim);
};


/**
 * @param {number} offset Offset.
 * @return {ol.geom2.LineString} Line string.
 */
ol.geom2.LineStringCollection.prototype.get = function(offset) {
  goog.asserts.assert(offset in this.ranges);
  var range = this.ranges[offset];
  return ol.geom2.unpackPoints(
      this.buf.getArray(), range.start, range.stop, this.dim);
};


/**
 * @return {number} Count.
 */
ol.geom2.LineStringCollection.prototype.getCount = function() {
  return goog.object.getCount(this.ranges);
};


/**
 * @return {ol.Extent} Extent.
 */
ol.geom2.LineStringCollection.prototype.getExtent = function() {
  return ol.geom2.getExtent(this.buf, this.dim);
};


/**
 * @param {number} offset Offset.
 */
ol.geom2.LineStringCollection.prototype.remove = function(offset) {
  goog.asserts.assert(offset in this.ranges);
  var range = this.ranges[offset];
  this.buf.remove(range.stop - range.start, range.start);
  delete this.ranges[offset];
};


/**
 * @param {number} offset Offset.
 * @param {ol.geom2.LineString} lineString Line string.
 * @return {number} Offset.
 */
ol.geom2.LineStringCollection.prototype.set = function(offset, lineString) {
  var dim = this.dim;
  goog.asserts.assert(offset in this.ranges);
  var range = this.ranges[offset];
  if (lineString.length * dim == range.stop - range.start) {
    ol.geom2.packPoints(this.buf.getArray(), range.start, lineString, dim);
    this.buf.markDirty(range.stop - range.start, range.start);
    return offset;
  } else {
    this.remove(offset);
    return this.add(lineString);
  }
};


/**
 * @return {Array.<ol.geom2.LineString>} Line strings.
 */
ol.geom2.LineStringCollection.prototype.unpack = function() {
  var dim = this.dim;
  var n = this.getCount();
  var lineStrings = new Array(n);
  var i = 0;
  var offset, range;
  for (offset in this.ranges) {
    range = this.ranges[offset];
    lineStrings[i++] = ol.geom2.unpackPoints(
        this.buf.getArray(), range.start, range.stop, dim);
  }
  return lineStrings;
};
