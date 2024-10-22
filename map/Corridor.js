/* eslint-disable */
import { metersToDegrees } from 'lib/Utils';
import L from 'leaflet';
import 'leaflet-polylinedecorator';
import useToast from 'lib/customHooks/UseToast';
import { MessageType } from 'enums/toast/MessageType';

L.Corridor = L.Polyline.extend({
  options: {
    color: '#3388ff',
    weight: 4,
    opacity: 1.0,
    stroke: true,
    width: 0, // Default width for the polyline
    decoratorLayer: null,
  },

  initialize: function (latlngs, options = {}) {
    L.Polyline.prototype.initialize.call(this, latlngs, options);

    // Initialize options
    L.setOptions(this, options);

    this._width = options.width || this.options.width;

    if (this._width === 0) {
      useToast(
        'Width must be greater than zero. Setting to default value of 1000.',
        MessageType.WARNING,
        'bottom-center',
      );

      this._width = 1000;
    }

    if (this._width > 1000000) {
      useToast(
        'Width must be less than 1000000. Setting to default value of 1000.',
        MessageType.WARNING,
        'bottom-center',
      );

      this._width = 1000;
    }

    // Ensure leaflet_id is set
    this._leaflet_id = L.Util.stamp(this);
  },

  addToMap: function addToMap(map) {
    map.addLayer(this);
    map.fire(L.Draw.Event.CREATED, { layer: this });
    return this;
  },

  onAdd: function (map) {
    L.Polyline.prototype.onAdd.call(this, map);

    if (map) {
      this._drawCorridor();
      L.Polyline.prototype.onRemove.call(this, map);
    } else {
      console.error('Map is not initialized yet.');
    }
  },

  onRemove: function (map) {
    // Remove the current polyline from the map
    if (this._map && this._corridorLayer) {
      this._map.removeLayer(this._corridorLayer);
    }

    L.Polyline.prototype.onRemove.call(this, map);
  },

  _drawCorridor: function () {
    const polylinePoints = this.getLatLngs();

    if (isNaN(this._width)) {
      useToast(
        'Width must be a number. Setting to default value of 1000.',
        MessageType.WARNING,
        'bottom-center',
      );
      this._width = 1000;
    }

    const corridor = createCorridorPolylines(
      L.polyline(polylinePoints),
      this._width,
    );

    if (this._map) {
      if (this._corridorLayer) {
        this._map.removeLayer(this._corridorLayer);
      }

      this._corridorLayer = corridor.addTo(this._map);
    } else {
      console.error('Map is not available to add the corridor.');
    }
  },

  redraw: function () {
    this._drawCorridor();
  },

  getWidth: function () {
    return this._width;
  },

  setWidth: function (width) {
    this._width = width; // Update the width
    this._drawCorridor();
  },

  setStyle: function (options) {
    if (options?.color) {
      this.options.color = options.color; // Update the color for the polyline

      if (this?._path) {
        this._path.setAttribute('stroke', options.color); // Apply the new color to the polyline path
      }
    }

    if (this._corridorLayer) {
      if (this._corridorLayer instanceof L.LayerGroup) {
        this._corridorLayer.eachLayer((layer) => {
          if (layer.setStyle) {
            layer.setStyle({
              color: options?.color || this?.options?.color,
            }); // Apply the style to each layer
          }
        });
      } else if (this._corridorLayer.setStyle) {
        // If it's a single layer, apply the style directly
        this._corridorLayer.setStyle({
          color: options?.color || this?.options?.color,
        });
      }
    }
  },
});

L.corridor = function (latlngs, options = {}) {
  return new L.Corridor(latlngs, options);
};

export function createCorridorPolylines(leafletPolyline, width) {
  const polylinePoints = leafletPolyline.getLatLngs();

  if (polylinePoints.length < 2) {
    throw new Error('Polyline must have at least two points.');
  }

  if (width === 0) {
    throw new Error('Width must be greater than zero.');
  }

  const leftPoints = [];
  const rightPoints = [];

  const projectedPoints = polylinePoints.map((latLng) =>
    L.CRS.EPSG3857.project(latLng),
  );

  const w = width / 2;

  const teta12 =
    (Math.atan2(
      projectedPoints[1].x - projectedPoints[0].x,
      projectedPoints[1].y - projectedPoints[0].y,
    ) +
      2 * Math.PI) %
    (2 * Math.PI);

  const leftPointOf1stSegment = {
    x: projectedPoints[0].x + w * Math.sin(teta12 + Math.PI / 2),
    y: projectedPoints[0].y + w * Math.cos(teta12 + Math.PI / 2),
  };

  const rightPointOf1stSegment = {
    x: projectedPoints[0].x + w * Math.sin(teta12 - Math.PI / 2),
    y: projectedPoints[0].y + w * Math.cos(teta12 - Math.PI / 2),
  };

  leftPoints.push(leftPointOf1stSegment);
  rightPoints.push(rightPointOf1stSegment);

  for (let i = 0; i < projectedPoints.length - 2; i++) {
    const teta12 =
      (Math.atan2(
        projectedPoints[i + 1].x - projectedPoints[i].x,
        projectedPoints[i + 1].y - projectedPoints[i].y,
      ) +
        2 * Math.PI) %
      (2 * Math.PI);

    const teta23 =
      (Math.atan2(
        projectedPoints[i + 2].x - projectedPoints[i + 1].x,
        projectedPoints[i + 2].y - projectedPoints[i + 1].y,
      ) +
        2 * Math.PI) %
      (2 * Math.PI);

    // Determine direction (yon) and calculate alfa
    let yon, alfa;
    if (
      /*(projectedPoints[i + 1].x - projectedPoints[i].x) *
        (projectedPoints[i + 2].y - projectedPoints[i + 1].y) -
        (projectedPoints[i + 1].y - projectedPoints[i].y) *
          (projectedPoints[i + 2].x - projectedPoints[i + 1].x)*/
      projectedPoints[i].x * projectedPoints[i].y -
        projectedPoints[i + 1].x * projectedPoints[i].x <
      0
    ) {
      yon = 1;
      alfa = (Math.PI - ((teta23 - teta12 + 2 * Math.PI) % (2 * Math.PI))) / 2;
    } else {
      yon = -1;
      alfa = (Math.PI - ((teta12 - teta23 + 2 * Math.PI) % (2 * Math.PI))) / 2;
    }

    // Calculate left and right points for current segment
    rightPoints.push({
      x:
        projectedPoints[i + 1].x +
        (w / Math.sin(alfa)) * Math.sin(teta23 + yon * alfa),
      y:
        projectedPoints[i + 1].y +
        (w / Math.sin(alfa)) * Math.cos(teta23 + yon * alfa),
    });

    leftPoints.push({
      x:
        projectedPoints[i + 1].x +
        (w / Math.sin(alfa)) * Math.sin(teta12 - yon * alfa),
      y:
        projectedPoints[i + 1].y +
        (w / Math.sin(alfa)) * Math.cos(teta12 - yon * alfa),
    });
  }

  const teta23 =
    (Math.atan2(
      projectedPoints[projectedPoints.length - 1].x -
        projectedPoints[projectedPoints.length - 2].x,
      projectedPoints[projectedPoints.length - 1].y -
        projectedPoints[projectedPoints.length - 2].y,
    ) +
      2 * Math.PI) %
    (2 * Math.PI);

  leftPoints.push({
    x:
      projectedPoints[projectedPoints.length - 1].x +
      w * Math.sin(teta23 + Math.PI / 2),
    y:
      projectedPoints[projectedPoints.length - 1].y +
      w * Math.cos(teta23 + Math.PI / 2),
  });

  rightPoints.push({
    x:
      projectedPoints[projectedPoints.length - 1].x +
      w * Math.sin(teta23 - Math.PI / 2),
    y:
      projectedPoints[projectedPoints.length - 1].y +
      w * Math.cos(teta23 - Math.PI / 2),
  });

  // Convert corridor points from meters back to lat/lng
  const latLngLeftPoints = leftPoints.map((point) =>
    L.CRS.EPSG3857.unproject(point),
  );

  const latLngRightPoints = rightPoints.map((point) =>
    L.CRS.EPSG3857.unproject(point),
  );

  const leftPolyline = L.polyline(latLngLeftPoints);

  const rightPolyline = L.polyline(latLngRightPoints);

  return L.layerGroup([leftPolyline, rightPolyline]);
}

export default L.Corridor;
