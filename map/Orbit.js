L.Orbit = L.Polyline.extend({
  options: {
    width: 1000, // Default width in meters
    color: '#3388ff',
    opacity: 0.5,
    stroke: true,
  },

  initialize: function (latlngs, options) {
    L.Polyline.prototype.initialize.call(this, latlngs, options); // Call the parent initialize
    L.setOptions(this, options); // Set options using Leaflet's built-in method
    this._leaflet_id = L.Util.stamp(this);

    this._width = options.width || this.options.width; // Default to 1000 if width not provided
    this.updateCallback = this._updateWeight.bind(this); // Update weight on zoom change
  },

  addToMap: function addToMap(map) {
    map.addLayer(this);
    map.fire(L.Draw.Event.CREATED, { layer: this });
    return this;
  },

  onAdd: function (map) {
    L.Polyline.prototype.onAdd.call(this, map);
    map.on('zoomend', this.updateCallback); // Update on zoom end
    this._updateWeight();
  },

  onRemove: function (map) {
    map.off('zoomend', this.updateCallback);
    L.Polyline.prototype.onRemove.call(this, map);
  },

  getWidth: function () {
    return this._width; // Return the orbit's width
  },

  setWidth: function (width) {
    this._width = Math.abs(width || this.options.width); // Set the width, default to 1000
    this._updateWeight(); // Update the visual width on the map
    return this.redraw();
  },

  setLatLngs: function (latlngs) {
    L.Polyline.prototype.setLatLngs.call(this, latlngs); // Update the polyline latlngs
  },

  _updateWeight: function () {
    if (!this._map) return;
    const weight = this.getWidth() / this._getMetersPerPixel(); // Calculate weight
    this.setStyle({ weight });
  },

  _getMetersPerPixel: function () {
    const centerLatLng = this._map.getCenter();
    const pointC = this._map.latLngToContainerPoint(centerLatLng);
    const pointX = L.point(pointC.x + 10, pointC.y);
    const latLngX = this._map.containerPointToLatLng(pointX);
    return centerLatLng.distanceTo(latLngX) / 10; // Convert to meters per pixel
  },

  toGeoJSON: function () {
    return {
      type: 'Feature',
      properties: { width: this.getWidth() }, // Store the width in properties
      geometry: {
        type: 'LineString',
        coordinates: this.getLatLngs().map((latlng) => [
          latlng.lng,
          latlng.lat,
        ]),
      },
    };
  },
});

// Factory function to create L.orbit instance
L.orbit = function (latlngs, options) {
  return new L.Orbit(latlngs, options);
};

export default L.orbit;
