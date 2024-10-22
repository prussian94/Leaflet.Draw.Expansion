/* eslint-disable */
import { metersToDegrees } from 'lib/Utils';
import L from 'leaflet';
import 'leaflet-polylinedecorator';
import useToast from 'lib/customHooks/UseToast';
import { MessageType } from 'enums/toast/MessageType';

L.Arrow = L.Polyline.extend({
  options: {
    color: '#3388ff',
    weight: 4,
    opacity: 1.0,
    arrowSize: 10, // Arrowhead size in meters
    stroke: true,
    width: 0, // Default width for the polyline
    decoratorLayer: null,
  },

  initialize: function (latlngs, options = {}) {
    L.Polyline.prototype.initialize.call(this, latlngs, options);

    // Initialize options
    L.setOptions(this, options);

    // Ensure that the arrowSize and width are initialized
    this._arrowSize = options.arrowSize || this.options.arrowSize;
    this._width = options.width || this.options.width;
    this._decoratorLayer =
      options.decoratorLayer || this.options.decoratorLayer;

    // Ensure leaflet_id is set
    this._leaflet_id = L.Util.stamp(this);
  },

  addToMap: function addToMap(map) {
    map.addLayer(this);
    //fire L.Draw.Created event
    map.fire(L.Draw.Event.CREATED, { layer: this });
    return this;
  },

  onAdd: function (map) {
    L.Polyline.prototype.onAdd.call(this, map);

    // Ensure the map is fully initialized before drawing the arrow
    if (map) {
      this._drawArrow();
      L.Polyline.prototype.onRemove.call(this, map);
    } else {
      console.error('Map is not initialized yet.');
    }
  },

  onRemove: function (map) {
    // Remove the current polyline from the map
    if (this._map && this._arrowLayer) {
      this._map.removeLayer(this._arrowLayer); // Remove the arrow layer
    }

    //remove arrowhead too if exists
    if (this._map && this._decoratorLayer) {
      this._map.removeLayer(this._decoratorLayer); // Remove the decorator layer
    }

    L.Polyline.prototype.onRemove.call(this, map);
  },

  _setDecoratorLayer: function (decoratorLayer) {
    this._decoratorLayer = decoratorLayer;
    this._map.addLayer(this._decoratorLayer);
  },

  _setArrowLayer: function (arrowLayer) {
    this._arrowLayer = arrowLayer;
    this._map.addLayer(this._arrowLayer);
  },

  // Function to draw the body of the arrow and the arrowhead at the tip
  _drawArrow: function () {
    if (this._map) {
      const polylinePoints = this.getLatLngs();

      if (isNaN(this._width)) {
        useToast(
          'Width must be a number. Setting to default value of 1000.',
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

      // Create arrow with boundaries or just arrowhead depending on width
      const arrow = createArrowPolyline(
        L.polyline(polylinePoints),
        this._width,
      );
      this.onRemove(this._map); // Remove the existing arrow if it exists

      if (this._width === 0) {
        this._setDecoratorLayer(arrow[1]);
        this._setArrowLayer(arrow[0]);
      } else {
        this._setArrowLayer(arrow);
      }
    } else {
      console.error('Map is not available to add the arrow.');
    }
  },

  redraw: function () {
    this._drawArrow();
  },

  getWidth: function () {
    return this._width;
  },

  // Function to update the width of the arrow
  setWidth: function (width) {
    this._width = width; // Update the width
    this._drawArrow(); // Redraw the arrow with the new width
  },

  // Function to update the color of the arrowhead
  setStyle: function (options) {
    // Update the arrow's color for the polyline
    if (options?.color) {
      this.options.color = options.color; // Update the color for the polyline

      if (this?._path) {
        this._path.setAttribute('stroke', options.color); // Apply the new color to the polyline path
      }
    }

    console.log('options', options);
    console.log('this.options.color', this.options.color);

    // If the width is 0, handle the decorator separately
    if (this?._width === 0) {
      if (this._arrowLayer) {
        // Remove the existing decorator and polyline if needed
        this.onRemove(this._map);

        // Recreate the base polyline with the new color
        const basePolyline = L.polyline(this.getLatLngs(), {
          color: this?.options?.color,
          weight: 2, // You can customize the weight here
        });

        // Recreate the arrowhead decoration using the new color
        const arrowDecorator = L.polylineDecorator(basePolyline, {
          patterns: [
            {
              offset: '100%', // Place the arrowhead at the end of the polyline
              repeat: 0, // No repetition
              symbol: L.Symbol.arrowHead({
                pixelSize: 15, // Size of the arrowhead in pixels
                polygon: false, // Whether the arrowhead is a polygon (open shape)
                pathOptions: { stroke: true, color: this.options?.color }, // Customize the arrowhead color here
              }),
            },
          ],
        });
        this._setArrowLayer(basePolyline);
        this._setDecoratorLayer(arrowDecorator);

        console.log('arrowDecorator', arrowDecorator);
        console.log('baseDecorator', basePolyline);
      }
    } else {
      if (this._arrowLayer) {
        this._arrowLayer.setStyle({
          color: options?.color || this?.options?.color,
        });
      }
    }
  },
});

// Factory function to create an Arrow instance
L.arrow = function (latlngs, options = {}) {
  return new L.Arrow(latlngs, options);
};

export function createArrowPolyline(leafletPolyline, width) {
  const polylinePoints = leafletPolyline.getLatLngs();

  if (polylinePoints.length < 2) {
    throw new Error('Polyline must have at least two points.');
  }

  // If the width is zero, we decorate the polyline with an arrowhead
  if (width === 0) {
    const basePolyline = L.polyline(polylinePoints, {
      weight: 2, // Customize the polyline weight
    });

    // Create the arrowhead decoration using the decorator
    const arrowDecorator = L.polylineDecorator(basePolyline, {
      patterns: [
        {
          offset: '100%', // Place the arrowhead at the end of the polyline
          repeat: 0, // No repetition
          symbol: L.Symbol.arrowHead({
            pixelSize: 15, // Size of the arrowhead in pixels
            polygon: false, // Whether the arrowhead is a polygon (open shape)
            pathOptions: { stroke: true }, // Customize the arrowhead
          }),
        },
      ],
    });

    // Return both the polyline and the arrowhead decorator as separate layers
    return [basePolyline, arrowDecorator];
  }

  const leftPoints = [];
  const rightPoints = [];

  // Convert lat/lng points to meters (Cartesian coordinates)
  const projectedPoints = polylinePoints.map((latLng) =>
    L.CRS.EPSG3857.project(latLng),
  );

  const w = width / 2; // Half the width

  // Calculate first segment's left and right points
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

  // Iterate through the segments and calculate left and right offsets
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

  const arrowLengthFactor = 3; // Equivalent to 'okUzunlukKatsayisi' in MATLAB

  const lastPoint = projectedPoints[projectedPoints.length - 1];

  // First set of side points for the arrowhead
  const wing1 = {
    x: lastPoint.x + 2 * w * Math.sin(teta23 + Math.PI / 2),
    y: lastPoint.y + 2 * w * Math.cos(teta23 + Math.PI / 2),
  };

  const wing2 = {
    x: lastPoint.x + 2 * w * Math.sin(teta23 - Math.PI / 2),
    y: lastPoint.y + 2 * w * Math.cos(teta23 - Math.PI / 2),
  };

  // Arrow tip point
  const arrowTip = {
    x: lastPoint.x + arrowLengthFactor * w * Math.sin(teta23),
    y: lastPoint.y + arrowLengthFactor * w * Math.cos(teta23),
  };

  // Combine the left, right, and arrowhead points
  const arrowPoints = [
    ...leftPoints,
    wing1,
    arrowTip,
    wing2,
    ...rightPoints.reverse(),
  ].map((point) => L.point(point.x, point.y));

  // Convert arrow points from meters back to lat/lng
  const latLngArrowPoints = arrowPoints.map((point) =>
    L.CRS.EPSG3857.unproject(point),
  );

  // Return the final polyline with arrow points
  return L.polyline(latLngArrowPoints);
}

export default L.Arrow;
