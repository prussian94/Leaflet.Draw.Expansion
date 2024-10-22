/* eslint-disable */
import 'leaflet-draw';
import '../map/Orbit';
import { MessageType } from 'enums/toast/MessageType';
import useToast from 'lib/customHooks/UseToast';

L.drawLocal.draw.handlers.orbit = {
  tooltip: {
    start: 'Click to start drawing orbit.',
    line: 'Click to continue drawing orbit.',
    end: 'Click last point to finish orbit.',
  },
  error: {
    start: 'Error starting orbit.',
    line: 'Error continuing orbit.',
    end: 'Error ending orbit.',
  },
};

L.Draw.Orbit = L.Draw.Feature.extend({
  statics: {
    TYPE: 'orbit',
  },

  Orbit: L.Orbit, // Use the L.orbit class

  options: {
    allowIntersection: true,
    repeatMode: false,
    drawError: {
      color: '#b00b00',
      timeout: 2500,
    },
    icon: new L.DivIcon({
      iconSize: new L.Point(8, 8),
      className: 'leaflet-div-icon leaflet-editing-icon',
    }),
    touchIcon: new L.DivIcon({
      iconSize: new L.Point(20, 20),
      className: 'leaflet-div-icon leaflet-editing-icon leaflet-touch-icon',
    }),
    guidelineDistance: 20,
    maxGuideLineLength: 4000,
    shapeOptions: {
      stroke: true,
      color: '#3388ff',
      weight: 4,
      opacity: 0.5,
      fill: false,
      clickable: true,
      width: 1000, // Default width in meters
    },
    metric: true,
    feet: true,
    nautic: false,
    showLength: true,
    showWidth: true, // Show width in the tooltip
    zIndexOffset: 2000,
    factor: 1,
    maxPoints: 0, // Once this number of points is placed, finish shape
  },

  initialize: function (map, options) {
    if (L.Browser.touch) {
      this.options.icon = this.options.touchIcon;
    }

    this.options.drawError.message = L.drawLocal.draw.handlers.orbit.error;

    if (options && options.drawError) {
      options.drawError = L.Util.extend(
        {},
        this.options.drawError,
        options.drawError,
      );
    }

    this.type = L.Draw.Orbit.TYPE;
    L.Draw.Feature.prototype.initialize.call(this, map, options);
  },

  addHooks: function () {
    L.Draw.Feature.prototype.addHooks.call(this);
    if (this._map) {
      this._markers = [];
      this._markerGroup = new L.LayerGroup();
      this._map.addLayer(this._markerGroup);

      this._orbit = new L.Orbit([], this.options.shapeOptions); // Initialize orbit

      // Initialize the tooltip if it doesn't exist
      if (!this._tooltip) {
        this._tooltip = new L.Draw.Tooltip(this._map);
      }

      this._tooltip.updateContent(this._getTooltipText());

      if (!this._mouseMarker) {
        this._mouseMarker = L.marker(this._map.getCenter(), {
          icon: L.divIcon({
            className: 'leaflet-mouse-marker',
            iconAnchor: [20, 20],
            iconSize: [40, 40],
          }),
          opacity: 0,
          zIndexOffset: this.options.zIndexOffset,
        });
      }

      this._mouseMarker
        .on('mouseout', this._onMouseOut, this)
        .on('mousemove', this._onMouseMove, this)
        .on('mousedown', this._onMouseDown, this)
        .on('mouseup', this._onMouseUp, this)
        .addTo(this._map);

      this._map
        .on('mouseup', this._onMouseUp, this)
        .on('mousemove', this._onMouseMove, this)
        .on('zoomlevelschange', this._onZoomEnd, this)
        .on('zoomend', this._onZoomEnd, this);
    }
  },

  removeHooks: function () {
    L.Draw.Feature.prototype.removeHooks.call(this);

    this._clearHideErrorTimeout();
    this._cleanUpShape();

    this._map.removeLayer(this._markerGroup);
    delete this._markerGroup;
    delete this._markers;

    this._map.removeLayer(this._orbit);
    delete this._orbit;

    this._mouseMarker
      .off('mousedown', this._onMouseDown, this)
      .off('mouseout', this._onMouseOut, this)
      .off('mouseup', this._onMouseUp, this)
      .off('mousemove', this._onMouseMove, this);
    this._map.removeLayer(this._mouseMarker);
    delete this._mouseMarker;

    this._clearGuides();
    this._map
      .off('mouseup', this._onMouseUp, this)
      .off('mousemove', this._onMouseMove, this)
      .off('zoomlevelschange', this._onZoomEnd, this)
      .off('zoomend', this._onZoomEnd, this);
  },

  _clearHideErrorTimeout: function () {
    if (this._hideErrorTimeout) {
      clearTimeout(this._hideErrorTimeout);
      this._hideErrorTimeout = null;
    }
  },

  _cleanUpShape: function () {
    if (this._markers.length > 1) {
      this._orbit.setLatLngs(this._markers.map((marker) => marker.getLatLng()));
    }
  },

  _createMarker: function (latlng) {
    var marker = new L.Marker(latlng, {
      icon: this.options.icon,
      zIndexOffset: this.options.zIndexOffset * 2,
    });

    this._markerGroup.addLayer(marker);

    return marker;
  },

  addVertex: function (latlng) {
    var markersLength = this._markers.length;

    if (
      markersLength >= 2 &&
      !this.options.allowIntersection &&
      this._orbit.newLatLngIntersects(latlng)
    ) {
      this._showErrorTooltip();
      return;
    } else if (this._errorShown) {
      this._hideErrorTooltip();
    }

    this._markers.push(this._createMarker(latlng));
    this._orbit.addLatLng(latlng);

    if (this._orbit.getLatLngs().length === 2) {
      this._map.addLayer(this._orbit);
    }

    this._vertexChanged(latlng, true);
  },

  _updateFinishHandler: function () {
    var firstMarker = this._markers[0],
      lastMarker = this._markers[this._markers.length - 1];

    if (firstMarker && lastMarker) {
      this._markers[0].off('click', this._finishShape, this);
      lastMarker.off('click', this._finishShape, this);

      if (
        this.options.maxPoints !== 0 &&
        this._markers.length >= this.options.maxPoints
      ) {
        this._finishShape();
      }

      if (firstMarker !== lastMarker) {
        firstMarker.on('click', this._finishShape, this);
      }

      lastMarker.on('click', this._finishShape, this);
    }
  },

  _getMeasurementString: function () {
    var currentLatLng = this._currentLatLng,
      previousLatLng = this._markers[this._markers.length - 1].getLatLng(),
      distance;

    // Calculate the distance from the last fixed point to the mouse position
    distance =
      this._measurementRunningTotal + currentLatLng.distanceTo(previousLatLng);

    return L.GeometryUtil.readableDistance(
      distance,
      this.options.metric,
      this.options.feet,
      this.options.nautic,
      this.options.factor,
    );
  },

  _updateRunningMeasure: function (latlng, added) {
    var markersLength = this._markers.length,
      previousMarkerIndex,
      distance;

    if (this._markers.length === 1) {
      this._measurementRunningTotal = 0;
    } else {
      previousMarkerIndex = markersLength - (added ? 2 : 1);
      distance = latlng.distanceTo(
        this._markers[previousMarkerIndex].getLatLng(),
      );

      this._measurementRunningTotal += distance * this.options.factor;
    }
  },

  completeShape: function () {
    if (this._markers.length <= 1 || !this._shapeIsValid()) {
      return;
    }

    this._fireCreatedEvent();
    this.disable();

    if (this.options.repeatMode) {
      this.enable();
    }
  },

  _finishShape: function () {
    if (
      (!this.options.allowIntersection &&
        this._orbit.newLatLngIntersects(this._orbit.getLatLngs()[0])) ||
      !this._shapeIsValid()
    ) {
      this._showErrorTooltip();
      return;
    }

    this._fireCreatedEvent();
    this.disable();

    if (this.options.repeatMode) {
      this.enable();
    }
  },

  _shapeIsValid: function () {
    return true;
  },

  _onMouseMove: function (e) {
    var newPos = this._map.mouseEventToLayerPoint(e.originalEvent);
    var latlng = this._map.layerPointToLatLng(newPos);

    this._currentLatLng = latlng;
    this._updateTooltip(latlng);

    this._updateGuide(newPos);
    this._mouseMarker.setLatLng(latlng);

    L.DomEvent.preventDefault(e.originalEvent);
  },

  _vertexChanged: function (latlng, added) {
    this._map.fire(L.Draw.Event.DRAWVERTEX, { layers: this._markerGroup });
    this._updateFinishHandler();
    this._updateRunningMeasure(latlng, added);
    this._clearGuides();
    this._updateTooltip();
  },

  _onMouseDown: function (e) {
    if (!this._clickHandled) {
      this._onMouseMove(e);
      this._clickHandled = true;
      this.addVertex(e.latlng);
    }
  },

  _onMouseUp: function (e) {
    this._clickHandled = null;
  },

  _updateTooltip: function (latLng) {
    var text = this._getTooltipText();

    if (latLng) {
      this._tooltip.updatePosition(latLng);
    }

    if (!this._errorShown) {
      this._tooltip.updateContent(text);
    }
  },

  _getTooltipText: function () {
    var showLength = this.options.showLength,
      showWidth = this.options.showWidth,
      labelText,
      distanceStr,
      widthStr;

    if (this._markers.length === 0) {
      labelText = {
        text: L.drawLocal.draw.handlers.orbit.tooltip.start,
      };
    } else {
      distanceStr = showLength ? this._getMeasurementString() : '';
      widthStr = showWidth
        ? `Width: ${this.options.shapeOptions.width} meters`
        : '';

      if (this._markers.length === 1) {
        labelText = {
          text: L.drawLocal.draw.handlers.orbit.tooltip.line,
          subtext: `${distanceStr} ${widthStr}`,
        };
      } else {
        labelText = {
          text: L.drawLocal.draw.handlers.orbit.tooltip.end,
          subtext: `${distanceStr} ${widthStr}`,
        };
      }
    }
    return labelText;
  },

  _fireCreatedEvent: function () {
    let width =
      prompt('Enter the width in meters (default is 1000)', 1000) || 1000;
    if (isNaN(width)) {
      useToast(
        'Width must be a number. Setting to default value of 1000.',
        MessageType.WARNING,
        'bottom-center',
      );
      width = 1000;
    }
    var orbit = new L.Orbit(this._orbit.getLatLngs(), {
      width: parseFloat(width),
    });
    L.Draw.Feature.prototype._fireCreatedEvent.call(this, orbit);
  },

  _updateGuide: function (newPos) {
    var markerCount = this._markers ? this._markers.length : 0;

    if (markerCount > 0) {
      newPos = newPos || this._map.latLngToLayerPoint(this._currentLatLng);

      // Draw the guide line from the last vertex to the current mouse position
      this._clearGuides();
      this._drawGuide(
        this._map.latLngToLayerPoint(
          this._markers[markerCount - 1].getLatLng(),
        ),
        newPos,
      );
    }
  },

  _drawGuide: function (pointA, pointB) {
    var length = Math.floor(
        Math.sqrt(
          Math.pow(pointB.x - pointA.x, 2) + Math.pow(pointB.y - pointA.y, 2),
        ),
      ),
      guidelineDistance = this.options.guidelineDistance,
      maxGuideLineLength = this.options.maxGuideLineLength,
      i =
        length > maxGuideLineLength
          ? length - maxGuideLineLength
          : guidelineDistance,
      fraction,
      dashPoint,
      dash;

    if (!this._guidesContainer) {
      this._guidesContainer = L.DomUtil.create(
        'div',
        'leaflet-draw-guides',
        this._overlayPane,
      );
    }

    for (; i < length; i += this.options.guidelineDistance) {
      fraction = i / length;

      dashPoint = {
        x: Math.floor(pointA.x * (1 - fraction) + fraction * pointB.x),
        y: Math.floor(pointA.y * (1 - fraction) + fraction * pointB.y),
      };

      dash = L.DomUtil.create(
        'div',
        'leaflet-draw-guide-dash',
        this._guidesContainer,
      );
      dash.style.backgroundColor = this.options.shapeOptions.color;

      L.DomUtil.setPosition(dash, dashPoint);
    }
  },

  _clearGuides: function () {
    if (this._guidesContainer) {
      while (this._guidesContainer.firstChild) {
        this._guidesContainer.removeChild(this._guidesContainer.firstChild);
      }
    }
  },
});

L.Edit = L.Edit || {};

/**
 * @class L.Edit.orbit
 * @aka L.Edit.orbit
 * @aka Edit.orbit
 */
L.Edit.Orbit = L.Handler.extend({
  initialize: function (orbit) {
    this._orbit = orbit;

    // Set up latlngs and options specific to the orbit
    this.latlngs = [orbit._latlngs];
    if (orbit._holes) {
      this.latlngs = this.latlngs.concat(orbit._holes);
    }

    this._orbit.on('revert-edited', this._updateLatLngs, this);
  },

  _defaultShape: function () {
    return L.Polyline._flat(this._orbit._latlngs)
      ? this._orbit._latlngs
      : this._orbit._latlngs[0];
  },

  addHooks: function () {
    this._initHandlers();
    this._eachVertexHandler(function (handler) {
      handler.addHooks();
    });
  },

  removeHooks: function () {
    this._eachVertexHandler(function (handler) {
      handler.removeHooks();
    });
  },

  updateMarkers: function () {
    this._eachVertexHandler(function (handler) {
      handler.updateMarkers();
    });
  },

  _initHandlers: function () {
    this._verticesHandlers = [];
    for (let i = 0; i < this.latlngs.length; i++) {
      this._verticesHandlers.push(
        new L.Edit.orbitVerticesEdit(
          this._orbit,
          this.latlngs[i],
          this._orbit.options,
        ),
      );
    }
  },

  _updateLatLngs: function (e) {
    this.latlngs = [e.layer._latlngs];
    if (e.layer._holes) {
      this.latlngs = this.latlngs.concat(e.layer._holes);
    }
  },

  _eachVertexHandler: function (callback) {
    for (let i = 0; i < this._verticesHandlers.length; i++) {
      callback(this._verticesHandlers[i]);
    }
  },
});

/**
 * @class L.Edit.orbitVerticesEdit
 * @aka Edit.orbitVerticesEdit
 */
L.Edit.OrbitVerticesEdit = L.Handler.extend({
  options: {
    icon: new L.DivIcon({
      iconSize: new L.Point(8, 8),
      className: 'leaflet-div-icon leaflet-editing-icon',
    }),
    touchIcon: new L.DivIcon({
      iconSize: new L.Point(20, 20),
      className: 'leaflet-div-icon leaflet-editing-icon leaflet-touch-icon',
    }),
    drawError: {
      color: '#b00b00',
      timeout: 1000,
    },
  },

  initialize: function (orbit, latlngs, options) {
    if (L.Browser.touch) {
      this.options.icon = this.options.touchIcon;
    }

    this._orbit = orbit;
    this._latlngs = latlngs;

    if (options && options.drawError) {
      options.drawError = L.Util.extend(
        {},
        this.options.drawError,
        options.drawError,
      );
    }

    L.setOptions(this, options);
  },

  addHooks: function () {
    const orbit = this._orbit;

    orbit.setStyle(orbit.options.editing);

    if (this._orbit._map) {
      this._map = this._orbit._map;

      if (!this._markerGroup) {
        this._initMarkers();
      }
      this._orbit._map.addLayer(this._markerGroup);
    }
  },

  removeHooks: function () {
    const orbit = this._orbit;

    if (orbit._map) {
      orbit._map.removeLayer(this._markerGroup);
      delete this._markerGroup;
      delete this._markers;
    }

    orbit.setStyle(orbit.options.original);
  },

  updateMarkers: function () {
    this._markerGroup.clearLayers();
    this._initMarkers();
  },

  _initMarkers: function () {
    if (!this._markerGroup) {
      this._markerGroup = new L.LayerGroup();
    }
    this._markers = [];

    const latlngs = this._defaultShape();
    let marker;

    for (let i = 0, len = latlngs.length; i < len; i++) {
      marker = this._createMarker(latlngs[i], i);
      marker.on('click', this._onMarkerClick, this);
      marker.on('contextmenu', this._onContextMenu, this);
      this._markers.push(marker);
    }

    for (let i = 0, j = latlngs.length - 1; i < latlngs.length; j = i++) {
      if (i === 0) continue;

      const markerLeft = this._markers[j];
      const markerRight = this._markers[i];

      this._createMiddleMarker(markerLeft, markerRight);
      this._updatePrevNext(markerLeft, markerRight);
    }
  },

  _createMarker: function (latlng, index) {
    const marker = new L.Marker.Touch(latlng, {
      draggable: true,
      icon: this.options.icon,
    });

    marker._origLatLng = latlng;
    marker._index = index;

    marker
      .on('dragstart', this._onMarkerDragStart, this)
      .on('drag', this._onMarkerDrag, this)
      .on('dragend', this._onMarkerDragEnd, this) // Update latlngs when dragging ends
      .on('touchmove', this._onTouchMove, this)
      .on('touchend', this._onMarkerDragEnd, this); // Ensure touch events also update latlngs

    this._markerGroup.addLayer(marker);
    return marker;
  },

  _onMarkerDragStart: function () {
    this._orbit.fire('editstart');
  },

  _onMarkerDragEnd: function () {
    this._fireEdit();
    // Update the orbit with new latlngs after dragging
    this._orbit.setLatLngs(this._getLatLngsFromMarkers());
  },

  _onMarkerDrag: function (e) {
    const marker = e.target;

    const oldLatLng = L.LatLngUtil.cloneLatLng(marker._origLatLng);
    L.extend(marker._origLatLng, marker._latlng);

    if (marker._middleLeft) {
      marker._middleLeft.setLatLng(this._getMiddleLatLng(marker._prev, marker));
    }
    if (marker._middleRight) {
      marker._middleRight.setLatLng(
        this._getMiddleLatLng(marker, marker._next),
      );
    }

    this._orbit.redraw();
    this._orbit.fire('editdrag');
  },

  _onMarkerClick: function (e) {
    const marker = e.target;
    const latlngs = this._defaultShape();
    const minPoints = 2;

    if (latlngs.length < minPoints) {
      return;
    }

    this._removeMarker(marker);
    this._updatePrevNext(marker._prev, marker._next);

    if (marker._middleLeft) {
      this._markerGroup.removeLayer(marker._middleLeft);
    }
    if (marker._middleRight) {
      this._markerGroup.removeLayer(marker._middleRight);
    }

    if (marker._prev && marker._next) {
      this._createMiddleMarker(marker._prev, marker._next);
    }

    this._fireEdit();
    // Update orbit latlngs after marker is removed
    this._orbit.setLatLngs(this._getLatLngsFromMarkers());
  },

  _fireEdit: function () {
    this._orbit.edited = true;
    this._orbit.fire('edit');
    this._orbit._map.fire(L.Draw.Event.EDITVERTEX, {
      layers: this._markerGroup,
      poly: this._orbit,
    });
  },

  _getLatLngsFromMarkers: function () {
    // Collect latlngs from the markers and return them as an array
    return this._markers.map((marker) => marker.getLatLng());
  },

  _createMiddleMarker: function (marker1, marker2) {
    const latlng = this._getMiddleLatLng(marker1, marker2);
    const marker = this._createMarker(latlng);

    marker.setOpacity(0.6);

    marker1._middleRight = marker2._middleLeft = marker;

    marker
      .on('click', () => {
        this._fireEdit();
      })
      .on('dragstart', () => {
        marker.off('touchmove', this._onTouchMove, this);
        const i = marker2._index;

        marker._index = i;
        this._markers.splice(i, 0, marker);

        this._orbit._latlngs.splice(i, 0, latlng);

        marker.setOpacity(1);
        this._fireEdit();
      });

    this._markerGroup.addLayer(marker);
  },

  _getMiddleLatLng: function (marker1, marker2) {
    const map = this._orbit._map;
    const p1 = map.project(marker1.getLatLng());
    const p2 = map.project(marker2.getLatLng());

    return map.unproject(p1._add(p2)._divideBy(2));
  },

  _removeMarker: function (marker) {
    const i = marker._index;

    this._markerGroup.removeLayer(marker);
    this._markers.splice(i, 1);
    this._orbit._latlngs.splice(i, 1);

    this._updateIndexes(i, -1);
  },

  _updateIndexes: function (index, delta) {
    this._markerGroup.eachLayer((marker) => {
      if (marker._index > index) {
        marker._index += delta;
      }
    });
  },

  _updatePrevNext: function (marker1, marker2) {
    if (marker1) marker1._next = marker2;
    if (marker2) marker2._prev = marker1;
  },
});
