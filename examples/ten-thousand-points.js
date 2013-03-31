goog.require('ol');
goog.require('ol.Coordinate');
goog.require('ol.Map');
goog.require('ol.RendererHints');
goog.require('ol.View2D');
goog.require('ol.geom2.PointCollection');
goog.require('ol.layer.TileLayer');
goog.require('ol.layer.VectorLayer2');
goog.require('ol.source.OpenStreetMap');
goog.require('ol.source.VectorSource2');
goog.require('ol.source.XYZ');


var pointCollection = ol.geom2.PointCollection.createEmpty(101 * 101);
var i, j, x, y;
for (i = 0; i < 101; ++i) {
  for (j = 0; j < 101; ++j) {
    x = 20000000 * (i - 50) / 50;
    y = 20000000 * (j - 50) / 50;
    pointCollection.add([x, y]);
  }
}
var pointCollection = ol.geom2.PointCollection.pack([[0, 0]]);

var source = false ?
    new ol.source.OpenStreetMap() :
    new ol.source.XYZ({
      crossOrigin: 'anonymous',
      maxZoom: 8,
      opaque: true,
      url: 'http://localhost:8080/tiles/0/tiles/{z}/{x}/{y}'
    });

var map = new ol.Map({
  layers: [
    new ol.layer.TileLayer({
      source: source
    }),
    new ol.layer.VectorLayer2({
      source: new ol.source.VectorSource2({
        projection: 'EPSG:3857',
        pointCollections: [pointCollection]
      })
    })
  ],
  renderers: ol.RendererHints.createFromQueryData(),
  target: 'map',
  view: new ol.View2D({
    center: new ol.Coordinate(0, 0),
    zoom: 2
  })
});
