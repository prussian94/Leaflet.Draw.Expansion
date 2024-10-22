import L from 'leaflet';
import 'leaflet.markercluster'; // Optional if you want to cluster the points

// Define the L.MultiPoint class
L.MultiPoint = L.LayerGroup.extend({
	options: {
		symbolOptions: {}, // Options for customizing symbols (currently not used)
		pointData: [], // Array of points [{ lat, lng }, ...]
		size: 25, // Default size for the markers
	},

	initialize: function (pointData, symbolOptions = {}, options = {}) {
		L.Util.setOptions(this, options);

		// Set pointData and symbolOptions
		this.pointData = pointData || this.options.pointData;
		this.symbolOptions = symbolOptions || this.options.symbolOptions;

		// Create a marker layer group
		this.markerLayer = L.layerGroup();

		this._leaflet_id = L.Util.stamp(this);

		// Call the superclass initialize method
		L.LayerGroup.prototype.initialize.call(this, [this.markerLayer]);

		// Render the points on initialization
		this._renderPoints();
	},

	addToMap: function addToMap(map) {
		map.addLayer(this);
		map.fire(L.Draw.Event.CREATED, { layer: this });
		return this;
	},

	// Helper function to create a marker with a default Leaflet icon
	_createPointMarker: function (point) {
		const { lat, lng } = point;

		// Create a default Leaflet marker icon
		const icon = L.icon({
			iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
			iconSize: [this.options.size, this.options.size],
			iconAnchor: [this.options.size / 2, this.options.size],
			popupAnchor: [1, -34],
			shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
			shadowSize: [41, 41],
		});

		// Return the L.Marker instance with the default icon
		return L.marker([lat, lng], { icon });
	},

	// Render the points onto the map
	_renderPoints: function () {
		// Clear any existing markers
		this.markerLayer.clearLayers();

		// Loop through each point and add markers
		this.pointData.forEach((point) => {
			const { lat, lng } = point;
			const marker = this._createPointMarker({ lat, lng });

			this.markerLayer.addLayer(marker); // Add marker to the layer
		});
	},

	// Function to update the points (for dynamic updates)
	setPoints: function (newPoints) {
		this.pointData = newPoints;
		this._renderPoints(); // Redraw the points
	},

	// Function to update symbol options dynamically (currently not used)
	setSymbolOptions: function (newSymbolOptions) {
		this.symbolOptions = newSymbolOptions;
		this._renderPoints(); // Redraw the points
	},

	// Convert the MultiPoint layer into GeoJSON format
	toGeoJSON: function () {
		const features = this.pointData.map((point) => {
			const { lat, lng } = point;
			return {
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: [lng, lat], // GeoJSON uses [longitude, latitude]
				},
				properties: {},
			};
		});

		return {
			type: 'FeatureCollection',
			features,
		};
	},
});

// Factory function to create an instance of L.MultiPoint
L.multiPoint = function (pointData, symbolOptions, options) {
	return new L.MultiPoint(pointData, symbolOptions, options);
};
