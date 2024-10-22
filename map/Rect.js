/* eslint-disable */
/**
 * @class L.Rect
 * @aka L.Polygon
 * @inherits L.Polygon
 */
L.Rect = L.Polygon.extend({
  options: {
    color: '#3388ff', // Default rectangle color
    weight: 2, // Border width
    cx: 0, // Longitude of the center
    cy: 0, // Latitude of the center
    rx: 100, // Half of width along the X axis in meters (East/West)
    ry: 50, // Half of height along the Y axis in meters (North/South)
    rotation: 0, // Rotation angle in degrees
  },

  initialize: function (options = {}) {
    L.setOptions(this, options);
    // Delay the lat/lng calculation until the map is available
    this._leaflet_id = L.Util.stamp(this);
    this._rotation = this.options.rotation;
  },

  onAdd: function (map) {
    this._map = map;
    const latlngs = this._getRectangleLatLngs();
    L.Polygon.prototype.initialize.call(this, latlngs, this.options);
    L.Polygon.prototype.onAdd.call(this, map);
  },

  addToMap: function addToMap(map) {
    map.addLayer(this);
    map.fire(L.Draw.Event.CREATED, { layer: this });
    return this;
  },

  // Calculate the rectangle's unrotated corners based on center (cx, cy), rx, and ry
  _getRectangleLatLngs: function () {
    const { cx, cy, rx, ry } = this.options;

    const center = L.latLng(cy, cx);

    // Convert rx and ry from meters to degrees using Leaflet's CRS distance method
    const rxDegrees = this._metersToLatLngDistance(center, rx, 'x');
    const ryDegrees = this._metersToLatLngDistance(center, ry, 'y');

    // Calculate the four corners without rotation
    const topLeft = L.latLng(center.lat + ryDegrees, center.lng - rxDegrees);
    const topRight = L.latLng(center.lat + ryDegrees, center.lng + rxDegrees);
    const bottomRight = L.latLng(
      center.lat - ryDegrees,
      center.lng + rxDegrees,
    );
    const bottomLeft = L.latLng(center.lat - ryDegrees, center.lng - rxDegrees);

    // Apply rotation to each corner if needed
    if (this.options.rotation !== 0 && this._map) {
      return this._rotateLatLngs(
        [topLeft, topRight, bottomRight, bottomLeft],
        center,
        this.options.rotation,
      );
    } else {
      return [topLeft, topRight, bottomRight, bottomLeft];
    }
  },

  // Helper function to convert meters to latitude or longitude degrees
  _metersToLatLngDistance: function (center, distance, axis) {
    if (axis === 'x') {
      const point = L.latLng(center.lat, center.lng + 0.01); // Point 0.01 deg away on longitude
      const metersPerDegree = center.distanceTo(point) * 100; // Convert degrees to meters
      return distance / metersPerDegree;
    } else {
      const point = L.latLng(center.lat + 0.01, center.lng); // Point 0.01 deg away on latitude
      const metersPerDegree = center.distanceTo(point) * 100; // Convert degrees to meters
      return distance / metersPerDegree;
    }
  },

  // Function to rotate the latlng points around the center
  _rotateLatLngs: function (latlngs, center, angle) {
    const angleRad = (angle * Math.PI) / 180; // Convert angle to radians

    return latlngs.map((latlng) => {
      const point = this._map.latLngToLayerPoint(latlng);
      const centerPoint = this._map.latLngToLayerPoint(center);

      // Apply rotation matrix to each point
      const rotatedPoint = this._rotatePoint(point, centerPoint, angleRad);

      return this._map.layerPointToLatLng(rotatedPoint); // Convert back to LatLng
    });
  },

  // Helper function to rotate a point around a center
  _rotatePoint: function (point, center, angleRad) {
    const x = point.x - center.x;
    const y = point.y - center.y;

    // Apply the rotation matrix
    const newX = x * Math.cos(angleRad) - y * Math.sin(angleRad);
    const newY = x * Math.sin(angleRad) + y * Math.cos(angleRad);

    return L.point(newX + center.x, newY + center.y);
  },

  // Function to update the rectangle's center, dimensions, or rotation
  setAttributes: function ({ cx, cy, rx, ry, rotation } = {}) {
    if (cx !== undefined) this.options.cx = cx;
    if (cy !== undefined) this.options.cy = cy;
    if (rx !== undefined) this.options.rx = rx;
    if (ry !== undefined) this.options.ry = ry;
    if (rotation !== undefined) this.options.rotation = rotation;

    // Redraw the rectangle with new attributes
    const latlngs = this._getRectangleLatLngs();
    this.setLatLngs(latlngs);
  },

  // Function to get the current attributes
  getAttributes: function () {
    return {
      cx: this.options.cx,
      cy: this.options.cy,
      rx: this.options.rx,
      ry: this.options.ry,
      rotation: this.options.rotation,
    };
  },
});

// Factory function to create a new rectangle instance
L.rect = function (options) {
  return new L.Rect(options);
};
