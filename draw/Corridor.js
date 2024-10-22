/* eslint-disable */
import 'leaflet-draw';
import 'leaflet';
import '../map/Corridor'; // Import the custom Corridor class

/**
 * @class L.Draw.Corridor
 * @aka Draw.Corridor
 * @inherits L.Draw.Feature
 */
L.Draw.Corridor = L.Draw.Polyline.extend({
  statics: {
    TYPE: 'corridor', // Explicitly set the type to "corridor"
  },

  initialize: function (map, options) {
    L.Draw.Polyline.prototype.initialize.call(this, map, options);
    this.type = L.Draw.Corridor.TYPE;
  },

  _fireCreatedEvent: function () {
    const latlngs = this._poly.getLatLngs();

    // Prompt the user for width or set default values
    const width =
      prompt('Enter the width in meters (default is 1000)', 1000) || 1000;

    // Create the corridor with the specified width
    const corridor = L.corridor(latlngs, {
      width: parseFloat(width),
      corridorSize: width > 0 ? width * 1.5 : 15,
    });

    // Fire the event with the corridor instance
    this._map.fire(L.Draw.Event.CREATED, {
      layer: corridor,
      layerType: this.type, // Ensure that the layerType is "corridor"
    });
  },
});

// Factory function to create a Draw.Corridor instance
L.drawCorridor = function (map, options) {
  return new L.Draw.Corridor(map, options);
};

export default L.Draw.Corridor;

L.Edit = L.Edit || {};

/**
 * @class L.Edit.Corridor
 * @aka L.Edit.Corridor
 * @aka Edit.Corridor
 */
L.Edit.Corridor = L.Handler.extend({
  // @method initialize(): void
  initialize: function (corridor) {
    this.latlngs = [corridor._latlngs];
    if (corridor._holes) {
      this.latlngs = this.latlngs.concat(corridor._holes);
    }

    this._corridor = corridor;

    this._corridor.on('revert-edited', this._updateLatLngs, this);
  },

  // Compatibility method to normalize Corridor* objects
  // between 0.7.x and 1.0+
  _defaultShape: function () {
    return L.Polyline._flat(this._latlngs) ? this._latlngs : this._latlngs[0];
  },

  _eachVertexHandler: function (callback) {
    for (var i = 0; i < this._verticesHandlers.length; i++) {
      callback(this._verticesHandlers[i]);
    }
  },

  // @method addHooks(): void
  // Add listener hooks to this handler
  addHooks: function () {
    this._initHandlers();
    this._eachVertexHandler(function (handler) {
      handler.addHooks();
    });
  },

  // @method removeHooks(): void
  // Remove listener hooks from this handler
  removeHooks: function () {
    this._eachVertexHandler(function (handler) {
      handler.removeHooks();
    });
  },

  // @method updateMarkers(): void
  // Fire an update for each vertex handler
  updateMarkers: function () {
    this._eachVertexHandler(function (handler) {
      handler.updateMarkers();
    });
  },

  _initHandlers: function () {
    this._verticesHandlers = [];
    for (var i = 0; i < this.latlngs.length; i++) {
      this._verticesHandlers.push(
        new L.Edit.CorridorVerticesEdit(
          this._corridor,
          this.latlngs[i],
          this._corridor.options.corridor,
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
});

/**
 * @class L.Edit.CorridorVerticesEdit
 * @aka Edit.CorridorVerticesEdit
 */
L.Edit.CorridorVerticesEdit = L.Handler.extend({
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

  // @method intialize(): void
  initialize: function (corridor, latlngs, options) {
    // if touch, switch to touch icon
    if (L.Browser.touch) {
      this.options.icon = this.options.touchIcon;
    }
    this._corridor = corridor;

    if (options && options.drawError) {
      options.drawError = L.Util.extend(
        {},
        this.options.drawError,
        options.drawError,
      );
    }

    this._latlngs = latlngs;

    L.setOptions(this, options);
  },

  // Compatibility method to normalize Corridor* objects
  // between 0.7.x and 1.0+
  _defaultShape: function () {
    if (!L.Corridor._flat) {
      return this._latlngs;
    }
    return L.Corridor._flat(this._latlngs) ? this._latlngs : this._latlngs[0];
  },

  // @method addHooks(): void
  // Add listener hooks to this handler.
  addHooks: function () {
    var corridor = this._corridor;
    var path = corridor._path;

    if (!(corridor instanceof L.Corridor)) {
      corridor.options.fill = false;
      if (corridor.options.editing) {
        corridor.options.editing.fill = false;
      }
    }

    if (path) {
      if (corridor.options.editing && corridor.options.editing.className) {
        if (corridor.options.original.className) {
          corridor.options.original.className
            .split(' ')
            .forEach(function (className) {
              L.DomUtil.removeClass(path, className);
            });
        }
        corridor.options.editing.className
          .split(' ')
          .forEach(function (className) {
            L.DomUtil.addClass(path, className);
          });
      }
    }

    corridor.setStyle(corridor.options.editing);

    if (this._corridor._map) {
      this._map = this._corridor._map; // Set map

      if (!this._markerGroup) {
        this._initMarkers();
      }
      this._corridor._map.addLayer(this._markerGroup);
    }
  },

  // @method removeHooks(): void
  // Remove listener hooks from this handler.
  removeHooks: function () {
    var corridor = this._corridor;
    var path = corridor._path;

    if (path) {
      if (corridor.options.editing && corridor.options.editing.className) {
        corridor.options.editing.className
          .split(' ')
          .forEach(function (className) {
            L.DomUtil.removeClass(path, className);
          });
        if (corridor.options.original.className) {
          corridor.options.original.className
            .split(' ')
            .forEach(function (className) {
              L.DomUtil.addClass(path, className);
            });
        }
      }
    }

    corridor.setStyle(corridor.options.original);

    if (corridor._map) {
      corridor._map.removeLayer(this._markerGroup);
      delete this._markerGroup;
      delete this._markers;
    }
  },

  // @method updateMarkers(): void
  // Clear markers and update their location
  updateMarkers: function () {
    this._markerGroup.clearLayers();
    this._initMarkers();
  },

  _initMarkers: function () {
    if (!this._markerGroup) {
      this._markerGroup = new L.LayerGroup();
    }
    this._markers = [];

    var latlngs = this._defaultShape(),
      i,
      j,
      len,
      marker;

    for (i = 0, len = latlngs.length; i < len; i++) {
      marker = this._createMarker(latlngs[i], i);
      marker.on('click', this._onMarkerClick, this);
      marker.on('contextmenu', this._onContextMenu, this);
      this._markers.push(marker);
    }

    var markerLeft, markerRight;

    for (i = 0, j = len - 1; i < len; j = i++) {
      if (i === 0 && !(L.Corridor && this._corridor instanceof L.Corridor)) {
        continue;
      }

      markerLeft = this._markers[j];
      markerRight = this._markers[i];

      this._createMiddleMarker(markerLeft, markerRight);
      this._updatePrevNext(markerLeft, markerRight);
    }
  },

  _createMarker: function (latlng, index) {
    // Extending L.Marker in TouchEvents.js to include touch.
    var marker = new L.Marker.Touch(latlng, {
      draggable: true,
      icon: this.options.icon,
    });

    marker._origLatLng = latlng;
    marker._index = index;

    marker
      .on('dragstart', this._onMarkerDragStart, this)
      .on('drag', this._onMarkerDrag, this)
      .on('dragend', this._fireEdit, this)
      .on('touchmove', this._onTouchMove, this)
      .on('touchend', this._fireEdit, this)
      .on('MSPointerMove', this._onTouchMove, this)
      .on('MSPointerUp', this._fireEdit, this);

    this._markerGroup.addLayer(marker);

    return marker;
  },

  _onMarkerDragStart: function () {
    this._corridor.fire('editstart');
  },

  _spliceLatLngs: function () {
    var latlngs = this._defaultShape();
    var removed = [].splice.apply(latlngs, arguments);
    this._corridor._convertLatLngs(latlngs, true);
    this._corridor.redraw();
    return removed;
  },

  _removeMarker: function (marker) {
    var i = marker._index;

    this._markerGroup.removeLayer(marker);
    this._markers.splice(i, 1);
    this._spliceLatLngs(i, 1);
    this._updateIndexes(i, -1);

    marker
      .off('dragstart', this._onMarkerDragStart, this)
      .off('drag', this._onMarkerDrag, this)
      .off('dragend', this._fireEdit, this)
      .off('touchmove', this._onMarkerDrag, this)
      .off('touchend', this._fireEdit, this)
      .off('click', this._onMarkerClick, this)
      .off('MSPointerMove', this._onTouchMove, this)
      .off('MSPointerUp', this._fireEdit, this);
  },

  _fireEdit: function () {
    // Collect the updated latlngs from the markers (get their new positions)
    var updatedLatLngs = this._markers.map(function (marker) {
      return marker.getLatLng();
    });

    // Apply the new latlngs to the corridor
    this._corridor.setLatLngs(updatedLatLngs);

    // Redraw the corridor with the new coordinates
    this._corridor.redraw();

    // Fire the edit event to notify the rest of the system that editing is complete
    this._corridor.edited = true;

    // Fire the edit event on the corridor itself
    this._corridor.fire('edit');

    // Fire a global event for edit completion on the map
    this._corridor._map.fire(L.Draw.Event.EDITVERTEX, {
      layers: this._markerGroup, // Provide the updated markers
      corridor: this._corridor, // Provide the updated corridor object
    });

    // Fire the global "draw:edited" event
    this._corridor._map.fire(L.Draw.Event.EDITED, {
      layers: new L.LayerGroup().addLayer(this._corridor), // Layer group with the updated corridor
    });
  },

  _onMarkerDrag: function (e) {
    var marker = e.target;
    var corridor = this._corridor;

    // Update the latlng of the marker
    L.extend(marker._origLatLng, marker._latlng);

    // If there are middle markers, update their positions
    if (marker._middleLeft) {
      marker._middleLeft.setLatLng(this._getMiddleLatLng(marker._prev, marker));
    }
    if (marker._middleRight) {
      marker._middleRight.setLatLng(
        this._getMiddleLatLng(marker, marker._next),
      );
    }

    // Update the latlngs of the corridor with the new positions
    var updatedLatLngs = this._markers.map(function (marker) {
      return marker.getLatLng();
    });

    // Update the corridor's latlngs and redraw the shape
    corridor.setLatLngs(updatedLatLngs);
    corridor.redraw();

    this._fireEdit();
  },

  _onMarkerClick: function (e) {
    var minPoints = L.Corridor && this._corridor instanceof L.Corridor ? 4 : 3,
      marker = e.target;

    if (this._defaultShape().length < minPoints) {
      return;
    }

    // remove the marker
    this._removeMarker(marker);

    // update prev/next links of adjacent markers
    this._updatePrevNext(marker._prev, marker._next);

    // remove ghost markers near the removed marker
    if (marker._middleLeft) {
      this._markerGroup.removeLayer(marker._middleLeft);
    }
    if (marker._middleRight) {
      this._markerGroup.removeLayer(marker._middleRight);
    }

    // create a ghost marker in place of the removed one
    if (marker._prev && marker._next) {
      this._createMiddleMarker(marker._prev, marker._next);
    } else if (!marker._prev) {
      marker._next._middleLeft = null;
    } else if (!marker._next) {
      marker._prev._middleRight = null;
    }

    this._fireEdit();
  },

  _onContextMenu: function (e) {
    var marker = e.target;
    var corridor = this._corridor;
    this._corridor._map.fire(L.Draw.Event.MARKERCONTEXT, {
      marker: marker,
      layers: this._markerGroup,
      corridor: this._corridor,
    });
    L.DomEvent.stopPropagation;
  },

  _onTouchMove: function (e) {
    var layerPoint = this._map.mouseEventToLayerPoint(
        e.originalEvent.touches[0],
      ),
      latlng = this._map.layerPointToLatLng(layerPoint),
      marker = e.target;

    L.extend(marker._origLatLng, latlng);

    if (marker._middleLeft) {
      marker._middleLeft.setLatLng(this._getMiddleLatLng(marker._prev, marker));
    }
    if (marker._middleRight) {
      marker._middleRight.setLatLng(
        this._getMiddleLatLng(marker, marker._next),
      );
    }

    this._corridor.redraw();
    this.updateMarkers();
  },

  _updateIndexes: function (index, delta) {
    this._markerGroup.eachLayer(function (marker) {
      if (marker._index > index) {
        marker._index += delta;
      }
    });
  },

  _createMiddleMarker: function (marker1, marker2) {
    var latlng = this._getMiddleLatLng(marker1, marker2),
      marker = this._createMarker(latlng),
      onClick,
      onDragStart,
      onDragEnd;

    marker.setOpacity(0.6);

    marker1._middleRight = marker2._middleLeft = marker;

    onDragStart = function () {
      marker.off('touchmove', onDragStart, this);
      var i = marker2._index;

      marker._index = i;

      marker.off('click', onClick, this).on('click', this._onMarkerClick, this);

      latlng.lat = marker.getLatLng().lat;
      latlng.lng = marker.getLatLng().lng;
      this._spliceLatLngs(i, 0, latlng);
      this._markers.splice(i, 0, marker);

      marker.setOpacity(1);

      this._updateIndexes(i, 1);
      marker2._index++;
      this._updatePrevNext(marker1, marker);
      this._updatePrevNext(marker, marker2);

      this._corridor.fire('editstart');
    };

    onDragEnd = function () {
      marker.off('dragstart', onDragStart, this);
      marker.off('dragend', onDragEnd, this);
      marker.off('touchmove', onDragStart, this);

      this._createMiddleMarker(marker1, marker);
      this._createMiddleMarker(marker, marker2);
    };

    onClick = function () {
      onDragStart.call(this);
      onDragEnd.call(this);
      this._fireEdit();
    };

    marker
      .on('click', onClick, this)
      .on('dragstart', onDragStart, this)
      .on('dragend', onDragEnd, this)
      .on('touchmove', onDragStart, this);

    this._markerGroup.addLayer(marker);
  },

  _updatePrevNext: function (marker1, marker2) {
    if (marker1) {
      marker1._next = marker2;
    }
    if (marker2) {
      marker2._prev = marker1;
    }
  },

  _getMiddleLatLng: function (marker1, marker2) {
    var map = this._corridor._map,
      p1 = map.project(marker1.getLatLng()),
      p2 = map.project(marker2.getLatLng());

    return map.unproject(p1._add(p2)._divideBy(2));
  },
});

L.Corridor.addInitHook(function () {
  if (L.Edit.Corridor) {
    this.editing = new L.Edit.Corridor(this);
    if (this.options.editable) {
      this.editing.enable();
    }
  }

  this.on('add', function () {
    if (this.editing && this.editing.enabled()) {
      this.editing.addHooks();
    }
  });

  this.on('remove', function () {
    if (this.editing && this.editing.enabled()) {
      this.editing.removeHooks();
    }
  });
});
