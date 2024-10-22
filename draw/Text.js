/* eslint-disable */
import 'leaflet-draw';
import 'leaflet';
import '../map/Text'; // Import the custom Text class

/**
 * @class L.Draw.Text
 * @aka Draw.Text
 * @inherits L.Draw.Feature
 */
L.Draw.Text = L.Draw.Feature.extend({
  statics: {
    TYPE: 'text', // Explicitly set the type to "text"
  },

  options: {
    repeatMode: false,
  },

  initialize: function (map, options) {
    // Call the parent initialize method first
    L.Draw.Feature.prototype.initialize.call(this, map, options);

    // Set the type to 'text'
    this.type = L.Draw.Text.TYPE;
  },

  addHooks: function () {
    L.Draw.Feature.prototype.addHooks.call(this);
    if (this._map) {
      this._tooltip.updateContent({
        text: 'Click to place text on the map.',
      });

      // Add mouse marker to follow the cursor
      if (!this._mouseMarker) {
        this._mouseMarker = L.marker(this._map.getCenter(), {
          icon: L.divIcon({
            className: 'leaflet-draw-tooltip',
            iconSize: [20, 20],
          }),
          opacity: 0, // Set opacity to 0 so it's invisible
        }).addTo(this._map);
      }

      // Update mouse marker position and tooltip position as the mouse moves
      this._map.on('mousemove', this._onMouseMove, this);
      this._map.on('click', this._onClick, this);
    }
  },

  removeHooks: function () {
    L.Draw.Feature.prototype.removeHooks.call(this);

    if (this._map) {
      this._map.off('mousemove', this._onMouseMove, this);
      this._map.off('click', this._onClick, this);
    }
  },

  _onMouseMove: function (e) {
    const latlng = e.latlng;
    this._mouseMarker.setLatLng(latlng);

    // Update the tooltip position to follow the cursor
    this._tooltip.updatePosition(latlng);
  },

  _onClick: function (e) {
    const latlng = e.latlng;

    // Prompt the user for the text content
    const text = prompt('Enter the text for this label:', 'Text Label');

    if (text) {
      const textLabel = L.text(latlng, {
        text: text,
        color: '#000000', // Default color
        fontSize: '16px', // Default font size
        backgroundColor: '#FFFFFF', // Default background
      }).addTo(this._map);

      // Fire the created event with the text label layer
      this._map.fire(L.Draw.Event.CREATED, {
        layer: textLabel,
        layerType: this.type,
      });
    }

    if (!this.options.repeatMode) {
      this.disable();
    }
  },
});

// Factory function for creating a new L.Draw.Text instance
L.drawText = function (map, options) {
  return new L.Draw.Text(map, options);
};

export default L.Draw.Text;

// Extend the default L.Edit to allow text editing
L.Edit.Text = L.Handler.extend({
  initialize: function (text, options) {
    this._text = text;
    L.setOptions(this, options);
  },

  addHooks: function () {
    this._text.on('click', this._editText, this);
  },

  removeHooks: function () {
    this._text.off('click', this._editText, this);
  },

  _editText: function () {
    // Allow the user to edit the text content
    const newText = prompt('Edit the text:', this._text.options.text);

    if (newText !== null) {
      this._text.setText(newText);
    }
  },
});

// Factory function for creating a new L.Edit.Text instance
L.editText = function (text, options) {
  return new L.Edit.Text(text, options);
};
