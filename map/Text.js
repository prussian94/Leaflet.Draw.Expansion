/* eslint-disable */
import L from 'leaflet';
import useToast from 'lib/customHooks/UseToast';
import { MessageType } from 'enums/toast/MessageType';

L.Text = L.Layer.extend({
  options: {
    text: 'Default Text', // Default text content
    position: null, // Default position
    color: '#000000', // Default text color
    fontSize: '16px', // Default font size
    fontFamily: 'Arial', // Default font family
    backgroundColor: '#FFFFFF', // Default background color
    rotation: 0, // Default rotation angle in degrees
  },

  initialize: function (position, options = {}) {
    // Initialize options and position
    L.setOptions(this, options);
    this._position = position || this.options.position;

    if (!this._position) {
      useToast(
        'Position is required for L.Text!',
        MessageType.WARNING,
        'bottom-center',
      );
      throw new Error('Position is required for L.Text');
    }

    this._text = this.options.text || 'Default Text';
    this._color = this.options.color;
    this._fontSize = this.options.fontSize;
    this._fontFamily = this.options.fontFamily;
    this._backgroundColor = this.options.backgroundColor;
    this._rotation = this.options.rotation || 0;

    this._leaflet_id = L.Util.stamp(this);
  },

  onAdd: function (map) {
    this._map = map;
    this._drawText();
  },

  onRemove: function (map) {
    if (this._map && this._textLayer) {
      this._map.removeLayer(this._textLayer);
    }
    this._map = null;
  },

  setText: function (text) {
    this._text = text;
    this._updateText();
  },

  setStyle: function (style) {
    if (style.color) this._color = style.color;
    if (style.fontSize) this._fontSize = style.fontSize;
    if (style.fontFamily) this._fontFamily = style.fontFamily;
    if (style.backgroundColor) this._backgroundColor = style.backgroundColor;
    if (style.rotation !== undefined) this._rotation = style.rotation;
    this._updateText();
  },

  _drawText: function () {
    const tooltip = L.tooltip({
      permanent: true,
      direction: 'center',
      className: 'leaflet-text-label',
      interactive: true,
    })
      .setLatLng(this._position)
      .setContent(this._getTextHtml())
      .addTo(this._map);

    this._textLayer = tooltip;
  },

  _updateText: function () {
    if (this._textLayer) {
      this._textLayer.setContent(this._getTextHtml());
    }
  },

  _getTextHtml: function () {
    // Apply rotation using CSS transform
    return `<div style="
      color: ${this._color};
      font-size: ${this._fontSize};
      font-family: ${this._fontFamily};
      background-color: ${this._backgroundColor};
      padding: 4px 8px;
      border-radius: 4px;
      transform: rotate(${this._rotation}deg);
      text-align: center;">
      ${this._text}
    </div>`;
  },

  redraw: function () {
    this._updateText();
  },

  toGeoJSON: function () {
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [this._position.lng, this._position.lat],
      },
      properties: {
        text: this.options.text,
        color: this.options.color,
        fontSize: this.options.fontSize,
        backgroundColor: this.options.backgroundColor,
        rotation: this.options.rotation,
      },
    };
  },
});

// Factory method to create L.Text instances
L.text = function (position, options = {}) {
  return new L.Text(position, options);
};

export default L.Text;
