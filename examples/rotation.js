goog.require('ol.Map');
goog.require('ol.RendererHints');
goog.require('ol.View2D');
goog.require('ol.layer.TileLayer');
goog.require('ol.source.OpenStreetMap');


var map = new ol.Map({
  layers: [
    new ol.layer.TileLayer({
      source: new ol.source.OpenStreetMap()
    })
  ],
  renderers: ol.RendererHints.createFromQueryData(),
  target: 'map',
  view: new ol.View2D({
    center: [-25860000, 4130000],
    rotation: Math.PI / 6,
    zoom: 10
  })
});
