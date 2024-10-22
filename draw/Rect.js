/* eslint-disable */
/**
 * @class L.Draw.Rect
 * @aka Draw.Rect
 * @inherits L.Draw.SimpleShape
 */
import 'leaflet-draw';
import '../map/Rect';

L.Draw.Rect = L.Draw.SimpleShape.extend({
  statics: {
    TYPE: 'rect',
  },

  options: {
    shapeOptions: {
      stroke: true,
      color: '#3388ff',
      weight: 4,
      opacity: 0.5,
      fill: true,
      fillColor: null, //same as color by default
      fillOpacity: 0.2,
      clickable: true,
    },
    showArea: true, // Whether to show the area in the tooltip
    metric: true, // Whether to use the metric measurement system or imperial
  },

  // @method initialize(): void
  initialize: function (map, options) {
    // Save the type so super can fire, need to do this as cannot do this.TYPE :(
    this.type = L.Draw.Rect.TYPE;

    this._initialLabelText = L.drawLocal.draw.handlers.rectangle.tooltip.start;

    L.Draw.SimpleShape.prototype.initialize.call(this, map, options);
  },

  // @method disable(): void
  disable: function () {
    if (!this._enabled) {
      return;
    }

    this._isCurrentlyTwoClickDrawing = false;
    L.Draw.SimpleShape.prototype.disable.call(this);
  },

  _onMouseUp: function (e) {
    if (!this._shape && !this._isCurrentlyTwoClickDrawing) {
      this._isCurrentlyTwoClickDrawing = true;
      return;
    }

    // Make sure closing click is on map
    if (
      this._isCurrentlyTwoClickDrawing &&
      !_hasAncestor(e.target, 'leaflet-pane')
    ) {
      return;
    }

    L.Draw.SimpleShape.prototype._onMouseUp.call(this);
  },

  _drawShape: function (latlng) {
    if (!this._shape) {
      // Create a new instance of L.Rect, passing the required attributes
      const center = L.latLngBounds(this._startLatLng, latlng).getCenter();
      const rx = this._startLatLng.distanceTo(latlng) / 2; // Half the distance from center to latlng
      const ry = this._startLatLng.distanceTo(latlng) / 2; // Half distance as radius for y

      this._shape = new L.Rect(
        {
          cx: center.lng, // Longitude
          cy: center.lat, // Latitude
          rx: rx, // Half-width in meters
          ry: ry, // Half-height in meters
          rotation: 0, // No rotation initially
        },
        this.options.shapeOptions,
      );

      this._map.addLayer(this._shape);
    } else {
      // Update the existing rectangle
      const center = L.latLngBounds(this._startLatLng, latlng).getCenter();
      const rx = this._startLatLng.distanceTo(latlng) / 2; // Update radius for x
      const ry = this._startLatLng.distanceTo(latlng) / 2; // Update radius for y

      // Set updated attributes using `setAttributes`
      this._shape.setAttributes({
        cx: center.lng,
        cy: center.lat,
        rx: rx,
        ry: ry,
      });
    }
  },

  _fireCreatedEvent: function () {
    const center = this._shape.getCenter();
    const rx = this._shape.options.rx;
    const ry = this._shape.options.ry;

    const rect = new L.Rect(
      {
        cx: center.lng,
        cy: center.lat,
        rx: rx,
        ry: ry,
        rotation: this._shape.options.rotation,
      },
      this.options.shapeOptions,
    );

    L.Draw.SimpleShape.prototype._fireCreatedEvent.call(this, rect);
  },

  _getTooltipText: function () {
    var tooltipText = L.Draw.SimpleShape.prototype._getTooltipText.call(this),
      shape = this._shape,
      showArea = this.options.showArea,
      latLngs,
      area,
      subtext;

    if (shape) {
      latLngs = this._shape._defaultShape
        ? this._shape._defaultShape()
        : this._shape.getLatLngs();
      area = L.GeometryUtil.geodesicArea(latLngs);
      subtext = showArea
        ? L.GeometryUtil.readableArea(area, this.options.metric)
        : '';
    }

    return {
      text: tooltipText.text,
      subtext: subtext,
    };
  },
});

function _hasAncestor(el, cls) {
  while ((el = el.parentElement) && !el.classList.contains(cls)) {}
  return el;
}

L.Edit.Rect = L.Edit.SimpleShape.extend({
  _createMoveMarker: function () {
    var bounds = this._shape.getBounds(),
      center = bounds.getCenter();

    this._moveMarker = this._createMarker(center, this.options.moveIcon);
  },

  _createResizeMarker: function () {
    var corners = this._getCorners();

    this._resizeMarkers = [];

    for (var i = 0, l = corners.length; i < l; i++) {
      this._resizeMarkers.push(
        this._createMarker(corners[i], this.options.resizeIcon),
      );
      // Monkey in the corner index as we will need to know this for dragging
      this._resizeMarkers[i]._cornerIndex = i;
    }
  },

  // Add rotation handle on top right corner
  _createRotateMarker: function () {
    var bounds = this._shape.getBounds(),
      center = bounds.getCenter(),
      ne = bounds.getNorthEast();

    // Create a marker at a small distance outside the top-right corner for rotation
    var rotatePoint = L.latLng(ne.lat + 0.0001, ne.lng); // Adjust this offset to suit your needs
    this._rotateMarker = this._createMarker(
      rotatePoint,
      this.options.rotateIcon,
    );
  },

  _onMarkerDragStart: function (e) {
    L.Edit.SimpleShape.prototype._onMarkerDragStart.call(this, e);

    // Save a reference to the opposite point
    var corners = this._getCorners(),
      marker = e.target,
      currentCornerIndex = marker._cornerIndex;

    this._oppositeCorner = corners[(currentCornerIndex + 2) % 4];

    this._toggleCornerMarkers(0, currentCornerIndex);
  },

  _onMarkerDragEnd: function (e) {
    var marker = e.target,
      bounds,
      center;

    // Reset move marker position to the center
    if (marker === this._moveMarker) {
      bounds = this._shape.getBounds();
      center = bounds.getCenter();

      marker.setLatLng(center);
    }

    this._toggleCornerMarkers(1);

    this._repositionCornerMarkers();

    L.Edit.SimpleShape.prototype._onMarkerDragEnd.call(this, e);
  },

  _move: function (newCenter) {
    var latlngs = this._shape._defaultShape
        ? this._shape._defaultShape()
        : this._shape.getLatLngs(),
      bounds = this._shape.getBounds(),
      center = bounds.getCenter(),
      offset,
      newLatLngs = [];

    // Offset the latlngs to the new center
    for (var i = 0, l = latlngs.length; i < l; i++) {
      offset = [latlngs[i].lat - center.lat, latlngs[i].lng - center.lng];
      newLatLngs.push([newCenter.lat + offset[0], newCenter.lng + offset[1]]);
    }

    this._shape.setLatLngs(newLatLngs);

    // Reposition the resize markers
    this._repositionCornerMarkers();

    this._map.fire(L.Draw.Event.EDITMOVE, { layer: this._shape });
  },

  _resize: function (latlng) {
    var bounds;

    // Update the shape based on the current position of this corner and the opposite point
    this._shape.setBounds(L.latLngBounds(latlng, this._oppositeCorner));

    // Reposition the move marker
    bounds = this._shape.getBounds();
    this._moveMarker.setLatLng(bounds.getCenter());

    this._map.fire(L.Draw.Event.EDITRESIZE, { layer: this._shape });
  },

  // Calculate rotation when the rotate marker is dragged
  _rotate: function (latlng) {
    const center = this._shape.getBounds().getCenter();

    // Calculate the angle between the center and the dragged latlng
    const angle = this._calculateRotationAngle(center, latlng);

    // Rotate the rectangle around its center by the angle
    this._shape.setLatLngs(
      this._rotateLatLngs(this._shape.getLatLngs(), center, angle),
    );

    this._map.fire(L.Draw.Event.EDITROTATE, { layer: this._shape });
  },

  _calculateRotationAngle: function (center, latlng) {
    const dx = latlng.lng - center.lng;
    const dy = latlng.lat - center.lat;
    return Math.atan2(dy, dx) * (180 / Math.PI); // Convert to degrees
  },

  _rotateLatLngs: function (latlngs, center, angle) {
    const angleRad = (angle * Math.PI) / 180; // Convert to radians
    return latlngs.map((latlng) => {
      const point = this._map.latLngToLayerPoint(latlng);
      const centerPoint = this._map.latLngToLayerPoint(center);

      // Rotate each point around the center
      const rotatedPoint = this._rotatePoint(point, centerPoint, angleRad);
      return this._map.layerPointToLatLng(rotatedPoint);
    });
  },

  _rotatePoint: function (point, center, angleRad) {
    const x = point.x - center.x;
    const y = point.y - center.y;

    // Apply the rotation matrix
    const newX = x * Math.cos(angleRad) - y * Math.sin(angleRad);
    const newY = x * Math.sin(angleRad) + y * Math.cos(angleRad);

    return L.point(newX + center.x, newY + center.y);
  },

  _getCorners: function () {
    var bounds = this._shape.getBounds(),
      nw = bounds.getNorthWest(),
      ne = bounds.getNorthEast(),
      se = bounds.getSouthEast(),
      sw = bounds.getSouthWest();

    return [nw, ne, se, sw];
  },

  _toggleCornerMarkers: function (opacity) {
    for (var i = 0, l = this._resizeMarkers.length; i < l; i++) {
      this._resizeMarkers[i].setOpacity(opacity);
    }
    if (this._rotateMarker) {
      this._rotateMarker.setOpacity(opacity);
    }
  },

  _repositionCornerMarkers: function () {
    var corners = this._getCorners();

    for (var i = 0, l = this._resizeMarkers.length; i < l; i++) {
      this._resizeMarkers[i].setLatLng(corners[i]);
    }

    // Reposition the rotate marker
    const ne = this._shape.getBounds().getNorthEast();
    const rotatePoint = L.latLng(ne.lat + 0.0001, ne.lng); // Adjust the offset
    this._rotateMarker.setLatLng(rotatePoint);
  },
});

L.Rect.addInitHook(function () {
  if (L.Edit.Rect) {
    this.editing = new L.Edit.Rect(this);

    if (this.options.editable) {
      this.editing.enable();
    }
  }
});
