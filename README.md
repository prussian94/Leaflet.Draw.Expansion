# Leaflet.Draw.Expansion

**Leaflet.Draw.Expansion** is an extension for [Leaflet](https://leafletjs.com/) that adds new custom shapes and advanced drawing capabilities to the popular Leaflet.Draw plugin. It provides additional tools to create, edit, and manage various shapes like arcs, arrows, corridors, rectangles, orbits, multi-points, and more on Leaflet maps.

## Table of Contents

- [Usage](#usage)
- [Available Shapes](#available-shapes)
- [Shape Details](#shape-details)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

## Usage

After setting up Leaflet, add the `Leaflet.Draw.Expansion` functionality to your map:

```javascript
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet.draw.expansion';

// Initialize your map
const map = L.map('map').setView([41.0082, 28.9784], 13);

// Add a tile layer (e.g., OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Initialize draw control
const drawControl = new L.Control.Draw({
	draw: {
		circle: false,
		rectangle: false,
		polyline: false,
		marker: false,
		polygon: false,
		circlemarker: false,
		arc: true,
		arrow: true,
		corridor: true,
		orbit: true,
		rect: true,
		multiPoint: true,
		text: true,
	},
	edit: {
		featureGroup: drawnItems,
	},
});
map.addControl(drawControl);

// Handle draw events
map.on(L.Draw.Event.CREATED, function (event) {
	const layer = event.layer;
	drawnItems.addLayer(layer);
});
```

## Available Shapes

The following shapes are supported by **Leaflet.Draw.Expansion**:

- **Arc**: Draws an arc segment based on center, radius, and angles.
- **Arrow**: Creates an arrow with customizable width and direction.
- **Corridor**: Draws a corridor of a specified width along a polyline.
- **MultiPoint**: Adds multiple markers, with customizable icons and sizes.
- **Orbit**: Draws circular orbits around a given center point.
- **Rect**: Adds a rectangle with customizable width, height, and rotation.
- **Text**: Adds custom text labels on the map.

## Shape Details

### Arc

**Description:** Draws a curved segment defined by a center point, radii along X and Y axes, start angle, and end angle. You can customize the curvature, tilt, and number of points along the arc.

**Properties:**

- `center` (LatLng): The center point of the arc.
- `rx` (meters): Half-width along the X-axis.
- `ry` (meters): Half-height along the Y-axis.
- `startAngle` (degrees): Starting angle of the arc.
- `endAngle` (degrees): Ending angle of the arc.
- `rotation` (degrees): Rotation angle of the entire arc.

### Arrow

**Description:** Creates an arrow shape along a polyline with customizable width and direction. Useful for indicating movement, directions, or flow.

**Properties:**

- `points` (Array of LatLng): The vertices of the arrow's polyline.
- `width` (meters): Width of the arrow’s shaft.
- `headSize` (meters): Size of the arrowhead.

### Corridor

**Description:** Draws a corridor around a polyline, representing a buffer zone along a path. Useful for planning routes, zones, or safety buffers.

**Properties:**

- `points` (Array of LatLng): The vertices of the corridor’s path.
- `width` (meters): Width of the corridor on each side of the path.

### MultiPoint

**Description:** Adds multiple markers at specified points. Each marker can be customized individually, supporting different icons, colors, or sizes.

**Properties:**

- `points` (Array of objects): Array of point objects with `lat`, `lng`, and `icon`.
- `size` (pixels): Size of each marker.

### Orbit

**Description:** Draws a circular orbit around a given center point. The orbit represents a circular area with a specific radius, useful for showing ranges, zones, or boundaries.

**Properties:**

- `center` (LatLng): The center of the orbit.
- `radius` (meters): The radius of the orbit.

### Rect

**Description:** Adds a rectangle defined by center coordinates, width, height, and rotation. Useful for highlighting rectangular areas or zones.

**Properties:**

- `cx` (longitude): Longitude of the center.
- `cy` (latitude): Latitude of the center.
- `rx` (meters): Half of the width along the X-axis.
- `ry` (meters): Half of the height along the Y-axis.
- `rotation` (degrees): Rotation angle of the rectangle.

### Text

**Description:** Adds a custom text label at a specified location on the map.

**Properties:**

- `latlng` (LatLng): The location of the text.
- `text` (string): The text content.
- `options` (object): Leaflet-style options for text styling (e.g., color, font size).

## API Reference

### Creating a Shape

To create a shape, use the corresponding constructor:

```javascript
L.arc(latlng, options).addTo(map);
L.arrow(points, options).addTo(map);
L.corridor(points, width, options).addTo(map);
L.multiPoint(points, options).addTo(map);
L.orbit(center, radius, options).addTo(map);
L.rect(options).addTo(map);
L.text(latlng, text, options).addTo(map);
```

### Shape Options

All shapes accept Leaflet-style `options` objects to customize properties like color, opacity, fill, stroke, and more.

Refer to the [Leaflet documentation](https://leafletjs.com/reference.html) for more general options.

## Contributing

Contributions, issues, and feature requests are welcome! Here’s how you can contribute:

1. Fork the repository.
2. Create a new branch for your feature (`git checkout -b feature-name`).
3. Commit your changes (`git commit -m 'Add a new feature'`).
4. Push to the branch (`git push origin feature-name`).
5. Open a pull request.

For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

---

Enjoy building with **Leaflet.Draw.Expansion**! Feel free to report any issues or suggest new features.
