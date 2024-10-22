/* eslint-disable */

import 'leaflet-draw';
import '../map/MultiPoint';

/**
 * @class L.Draw.MultiPoint
 * @aka Draw.MultiPoint
 * @inherits L.Draw.Feature
 */
L.Draw.MultiPoint = L.Draw.Feature.extend({
	statics: {
		TYPE: 'multipoint',
	},

	options: {
		repeatMode: false,
		iconSize: 15, // Default icon size
		shapeOptions: {
			color: '#3388ff',
			weight: 2,
			fill: false,
		},
	},

	initialize: function (map, options) {
		this.type = L.Draw.MultiPoint.TYPE;
		L.Draw.Feature.prototype.initialize.call(this, map, options);
	},

	addHooks: function () {
		L.Draw.Feature.prototype.addHooks.call(this);
		if (this._map) {
			this._markers = [];
			this._tooltip.updateContent({
				text: 'Click to place the multipoint marker',
			});

			// Add click event for adding points
			this._map.on('click', this._onClick, this);

			// Add event listeners for mouse movement to update tooltip position
			this._map.on('mousemove', this._onMouseMove, this);

			// Add keydown event listener for ESC key to complete drawing
			L.DomEvent.on(document, 'keydown', this._onKeyDown, this);
		}
	},

	removeHooks: function () {
		L.Draw.Feature.prototype.removeHooks.call(this);

		if (this._map) {
			this._map.off('click', this._onClick, this);
			this._map.off('mousemove', this._onMouseMove, this);

			// Remove the keydown event listener when exiting draw mode
			L.DomEvent.off(document, 'keydown', this._onKeyDown, this);

			// Clear all markers
			if (this._markers) {
				for (const marker of this._markers) {
					this._map.removeLayer(marker);
				}
			}
		}
	},

	_onClick: function (e) {
		const latlng = e.latlng;

		// Create a default Leaflet marker icon
		const icon = L.icon({
			iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
			iconSize: [25, 41],
			iconAnchor: [12, 41],
			popupAnchor: [1, -34],
			shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
			shadowSize: [41, 41],
		});

		const marker = L.marker(latlng, { icon }).addTo(this._map);
		this._markers.push(marker);

		// Update tooltip text
		this._tooltip.updateContent({
			text: 'Click to add another point, or press "ESC" to finish.',
		});
	},

	_onMouseMove: function (e) {
		// Update tooltip position to follow the cursor
		this._tooltip.updatePosition(e.latlng);
	},

	_onKeyDown: function (e) {
		// ESC key is pressed to complete the drawing
		if (e.key === 'Escape') {
			this._completeDrawing();
		}
	},

	_completeDrawing: function () {
		// If there are markers, fire the created event
		if (this._markers.length > 0) {
			this._fireCreatedEvent();
		}

		// Disable the drawing mode
		this.disable();
	},

	_fireCreatedEvent: function () {
		const points = this._markers.map((marker) => marker.getLatLng());

		// Create a new MultiPoint instance and fire the event
		const multiPointLayer = L.multiPoint(
			points.map((latlng) => ({
				lat: latlng.lat,
				lng: latlng.lng,
			}))
		);

		// Fire the CREATED event and pass the created multiPointLayer
		L.Draw.Feature.prototype._fireCreatedEvent.call(this, multiPointLayer);
	},
});

// Factory function for L.Draw.MultiPoint
L.drawMultiPoint = function (map, options) {
	return new L.Draw.MultiPoint(map, options);
};

L.Edit = L.Edit || {};

/**
 * @class L.Edit.MultiPoint
 * @aka Edit.MultiPoint
 * @inherits L.Edit.Feature
 */
L.Edit.MultiPoint = L.Handler.extend({
	initialize: function (layer) {
		this._layer = layer;
		this._map = layer._map;

		this._markers = layer.markerLayer.getLayers(); // Get all markers from the multiPoint layer
	},

	addHooks: function () {
		if (this._layer._map) {
			this._initMarkers();
		}
	},

	removeHooks: function () {
		if (this._layer._map) {
			this._removeMarkers();
		}
	},

	_initMarkers: function () {
		// Add draggable behavior to all markers
		this._markers.forEach((marker) => {
			marker.dragging.enable();
			marker.on('dragend', this._onMarkerDragEnd, this);
		});
	},

	_removeMarkers: function () {
		// Disable draggable behavior from all markers
		this._markers.forEach((marker) => {
			marker.dragging.disable();
			marker.off('dragend', this._onMarkerDragEnd, this);
		});
	},

	_onMarkerDragEnd: function (e) {
		const marker = e.target;
		marker.setLatLng(marker.getLatLng()); // Update marker position

		// Fire an edit event when markers are moved
		this._layer._map.fire(L.Draw.Event.EDITED, {
			layer: this._layer,
		});
	},

	// Add new marker to the MultiPoint
	addNewMarker: function (latlng) {
		const icon = L.icon({
			iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
			iconSize: [25, 41],
			iconAnchor: [12, 41],
			popupAnchor: [1, -34],
			shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
			shadowSize: [41, 41],
		});

		const marker = L.marker(latlng, { icon }).addTo(this._map);

		// Add dragging behavior to the new marker
		marker.dragging.enable();
		marker.on('dragend', this._onMarkerDragEnd, this);

		// Add to the markers array
		this._markers.push(marker);
		this._layer.markerLayer.addLayer(marker); // Add the new marker to the layer
	},

	// Function to delete a marker from MultiPoint
	deleteMarker: function (marker) {
		this._layer.markerLayer.removeLayer(marker);
		this._markers = this._markers.filter((m) => m !== marker);
	},
});

// Add init hook to L.MultiPoint
L.MultiPoint.addInitHook(function () {
	if (L.Edit.MultiPoint) {
		this.editing = new L.Edit.MultiPoint(this);

		if (this.options.editable) {
			this.editing.enable();
		}
	}
});
