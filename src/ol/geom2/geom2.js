goog.provide('ol.geom2');

goog.require('ol.Extent');


/**
 * @typedef {{start: number, stop: number}}
 */
ol.geom2.Range;


/**
 * @param {ol.structs.Buffer} buf Buffer.
 * @param {number} dim Dimension.
 * @return {ol.Extent} Extent.
 */
ol.geom2.getExtent = function(buf, dim) {
  var bufArr = buf.getArray();
  var extent = ol.Extent.createEmptyExtent();
  buf.forEachRange(function(start, stop) {
    var i;
    for (i = start; i < stop; i += dim) {
      extent.extendXY(bufArr[i], bufArr[i + 1]);
    }
  });
  return extent;
};


/**
 * @param {Array.<number>} arr Array.
 * @param {number} offset Offset.
 * @param {Array.<Array.<number>>} unpackedPoints Unpacke points.
 * @param {number} dim Dimension.
 * @return {number} Offset.
 */
ol.geom2.packPoints = function(arr, offset, unpackedPoints, dim) {
  var n = unpackedPoints.length;
  var i, j, point;
  for (i = 0; i < n; ++i) {
    point = unpackedPoints[i];
    goog.asserts.assert(point.length == dim);
    for (j = 0; j < dim; ++j) {
      arr[offset++] = point[j];
    }
  }
  return offset;
};


/**
 * @param {Array.<number>} arr Array.
 * @param {number} offset Offset.
 * @param {number} end End.
 * @param {number} dim Dimension.
 * @return {Array.<Array.<number>>} Unpacked points.
 */
ol.geom2.unpackPoints = function(arr, offset, end, dim) {
  var unpackedPoints = new Array((end - offset) / dim);
  var i = 0;
  var j;
  for (j = offset; j < end; j += dim) {
    unpackedPoints[i++] = arr.slice(offset, offset + dim);
  }
  return unpackedPoints;
};
