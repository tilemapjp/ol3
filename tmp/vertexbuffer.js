// FIXME dirty list and free list
// FIXME over-allocate array
// FIXME track length changes

goog.provide('ol.LineStringCollection');
goog.provide('ol.PointCollection');
goog.provide('ol.VertexBuffer');


/**
 * @typedef {Array.<number>}
 */
ol.Vertex;


/**
 * @typedef {ol.Vertex}
 */
ol.Point;


/**
 * @typedef {Array.<ol.Vertex>}
 */
ol.LineString;


/**
 * @typedef {Array.<Array.<ol.Vertex>>}
 */
ol.Polygon;



/**
 * @constructor
 * @param {number=} opt_dim Dimension.
 * @param {Array.<number>=} opt_arr Array.
 */
ol.VertexBuffer = function(opt_dim, opt_arr) {

  /**
   * @type {number} dim Dimension.
   * @protected
   */
  this.dim = goog.isDef(opt_dim) ? opt_dim : 2;

  /**
   * @type {Array.<number>}
   * @protected
   */
  this.arr = goog.isDef(opt_arr) ? opt_arr : [];
  goog.asserts.assert(this.arr.length % this.dim === 0);

  /**
   * @type {number}
   * @protected
   */
  this.firstDirty = -1;

  /**
   * @type {number}
   * @protected
   */
  this.lastDirty = 0;

};


/**
 * @return {boolean} Is dirty.
 */
ol.VertexBuffer.prototype.isDirty = function() {
  return this.firstDirty != -1;
};


/**
 */
ol.VertexBuffer.prototype.markClean = function() {
  this.firstDirty = -1;
};



/**
 * @constructor
 * @extends {ol.VertexBuffer}
 * @param {number=} opt_dim Dimension.
 * @param {Array.<number>=} opt_arr Array.
 */
ol.PointCollection = function(opt_dim, opt_arr) {
  goog.base(this, opt_dim, opt_arr);
};
goog.inherits(ol.PointCollection, ol.VertexBuffer);


/**
 * @param {Array.<ol.Point>} unpackedPoints Unpacked points.
 * @param {number=} opt_dim Dimension.
 * @return {ol.PointCollection} Point collection.
 */
ol.PointCollection.pack = function(unpackedPoints, opt_dim) {
  var n = unpackedPoints.length;
  var dim = goog.isDef(opt_dim) ? opt_dim :
      n > 0 ? unpackedPoints[0].length : 2;
  var arr = [];
  var i, j;
  for (i = 0; i < unpackedPoints.length; ++i) {
    goog.asserts.assert(unpackedPoints[i].length == dim);
    arr.push.apply(arr, unpackedPoints[i]);
  }
  return new ol.PointCollection(dim, arr);
};


/**
 * @param {number} index Index.
 * @return {ol.Point} Point.
 */
ol.PointCollection.prototype.getPoint = function(index) {
  goog.asserts.assert(index % this.dim === 0);
  goog.asserts.assert(0 <= index && index < this.arr.length);
  return this.arr.slice(index, index + this.dim);
};


/**
 * @param {ol.Point} point Point.
 * @return {number} Index.
 */
ol.PointCollection.prototype.pushPoint = function(point) {
  goog.asserts.assert(point.length == this.dim);
  var index = this.arr.length;
  this.arr.push.apply(this.arr, point);
  if (this.firstDirty == -1) {
    this.firstDirty = index;
  }
  this.lastDirty = index + this.dim;
  return index;
};


/**
 * @param {number} index Index.
 * @param {ol.Point} point Point.
 * @return {number} Index.
 */
ol.PointCollection.prototype.setPoint = function(index, point) {
  goog.asserts.assert(index % this.dim === 0);
  goog.asserts.assert(0 <= index && index < this.arr.length);
  goog.asserts.assert(point.length == this.dim);
  var i;
  for (i = 0; i < this.dim; ++i) {
    this.arr[index + i] = point[i];
  }
  if (this.firstDirty == -1) {
    this.firstDirty = index;
    this.lastDirty = index + this.dim;
  } else {
    this.firstDirty = Math.min(this.firstDirty, index);
    this.lastDirty = Math.max(this.lastDirty, index + this.dim);
  }
  return index;
};


/**
 * @param {number} index Index.
 */
ol.PointCollection.prototype.removePoint = function(index) {
  goog.asserts.assert(index % this.dim === 0);
  goog.asserts.assert(0 <= index && index < this.arr.length);
  this.arr.splice(index, this.dim);
  if (this.firstDirty == -1) {
    this.firstDirty = index;
  } else {
    this.firstDirty = Math.min(this.firstDirty, index);
  }
  this.lastDirty = this.arr.length;
};


/**
 * @return {Array.<ol.Point>} Unpacked points.
 */
ol.PointCollection.prototype.unpack = function() {
  var n = this.arr.length / this.dim;
  var points = new Array(n);
  var i;
  for (i = 0; i < n; ++i) {
    points[i] = this.arr.slice(i * this.dim, (i + 1) * this.dim);
  }
  return points;
};



/**
 * @constructor
 * @extends {ol.VertexBuffer}
 * @param {number=} opt_dim Dimension.
 * @param {Array.<ol.Vertex>=} opt_arr Array.
 * @param {Array.<number>=} opt_stop Indexes.
 */
ol.LineStringCollection = function(opt_dim, opt_arr, opt_stop) {

  goog.base(this, opt_dim, opt_arr);

  /**
   * @protected
   * @type {Array.<number>}
   */
  this.stop = goog.isDef(opt_stop) ? opt_stop : [];

};
goog.inherits(ol.LineStringCollection, ol.VertexBuffer);


/**
 * @param {Array.<ol.LineString>} unpackedLineStrings Unpacked line strings.
 * @param {number=} opt_dim Dimension.
 * @return {ol.LineStringCollection} Line string collection.
 */
ol.LineStringCollection.pack = function(unpackedLineStrings, opt_dim) {
  var i, j;
  var dim = goog.isDef(opt_dim) ? opt_dim :
      unpackedLineStrings.length > 0 && unpackedLineStrings[0].length ?
      unpackedLineStrings[0][0].length : 2;
  var stop = new Array(unpackedLineStrings.length);
  var n = 0;
  var arr = [];
  var stopIndex = 0;
  var unpackedLineString;
  for (i = 0; i < unpackedLineStrings.length; ++i) {
    unpackedLineString = unpackedLineStrings[i];
    n += unpackedLineString.length * dim;
    stop[stopIndex++] = n;
    for (j = 0; j < unpackedLineString.length; ++j) {
      arr.push.apply(arr, unpackedLineString[j]);
    }
  }
  return new ol.LineStringCollection(dim, arr, stop);
};


/**
 * @param {number} index Index.
 * @return {ol.LineString} Line string.
 */
ol.LineStringCollection.prototype.getLineString = function(index) {
  goog.asserts.assert(0 <= index && index < this.stop.length);
  var dim = this.dim;
  var start = index === 0 ? 0 : this.stop[index - 1];
  var stop = this.stop[index];
  var numVertices = (stop - start) / dim;
  var lineString = new Array(numVertices);
  var i;
  for (i = 0; i < numVertices; ++i) {
    lineString[i] = this.arr.slice(start + i * dim, start + (i + 1) * dim);
  }
  return lineString;
};


/**
 * @param {ol.LineString} lineString Line string.
 * @return {number} Index.
 */
ol.LineStringCollection.prototype.pushLineString = function(lineString) {
  var index = this.stop.length;
  var start = index === 0 ? 0 : this.stop[index - 1];
  this.stop.push(start + n);
  // IAMHERE
};


/**
 * @param {number} index Index.
 * @param {ol.LineString} lineString Line string.
 */
ol.LineStringCollection.prototype.setLineString =
    function(index, lineString) {
  var i, j, vertex;
  goog.asserts.assert(0 <= index && index <= this.n);
  var start = index === 0 ? 0 : this.stop[index - 1];
  var existingLength = this.stop[index] - start;
  if (lineString.length == existingLength) {
    var destIndex = start;
    for (i = 0; i < existingLength; ++i) {
      vertex = this.arr[i];
      goog.asserts.assert(vertex.length == this.dim);
      for (j = 0; j < this.dim; ++i) {
        this.arr[destIndex++] = vertex[i][j];
      }
    }
  } else {
    // FIXME shiftin' time
  }
};


/**
 * @return {Array.<Array.<ol.Vertex>>} Line strings.
 */
ol.LineStringCollection.prototype.unpack = function() {
  var arr = this.arr, dim = this.dim, stop = this.stop;
  var lineStrings = new Array(this.stop.length);
  var arrIndex = 0, lineStringsIndex = 0, start = 0;
  var i, lineString, lineStringIndex;
  for (i = 0; i < this.stop.length; ++i) {
    n = (stop[i] - start) / dim;
    lineString = new Array(n);
    lineStringIndex = 0;
    for (j = 0; j < n; ++j) {
      lineString[lineStringIndex++] = arr.slice(arrIndex, arrIndex + dim);
      arrIndex += dim;
    }
    lineStrings[lineStringsIndex++] = lineString;
    start = stop[i];
  }
  return lineStrings;
};
