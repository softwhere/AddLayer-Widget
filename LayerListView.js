///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////
/*global console, define, dojo */
define([
    'dijit/_WidgetBase',
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/dom-construct',
    'dojo/on',
    'dojo/query',
    'jimu/dijit/CheckBox',
    'dijit/_TemplatedMixin',
    'dojo/text!./LayerListView.html',
    'dojo/dom-attr',
    'dojo/dom-class',
    'dojo/dom-style'
], function (_WidgetBase, declare, lang, array, domConstruct, on, query,
    CheckBox, _TemplatedMixin, template,
    domAttr, domClass, domStyle) {

    return declare([_WidgetBase, _TemplatedMixin], {

        // list of layer configs to display
        layers: [],

        // attach point for table body
        layerListTable: null,

        templateString: template,
        _currentSelectedLayerRowNode: null,

        postMixInProperties: function () {
            this.inherited(arguments);
        },

        postCreate: function () {
            this.addLayersToTable();
        },

        addLayersToTable: function () {
            array.forEach(this.layers, function (layer) {
                this.addLayerToTable(layer);
            }, this);
        },

        /**
         * Add a row to the table for the given layer
         * @param   {Object} layer [[Description]]
         * @returns {Object} tableRow Element
         */
        addLayerToTable: function (layer) {
            var layerRowNode,
                layerCheckTdNode,
                layerCheckbox,
                layerTitleTdNode;

            layerRowNode = domConstruct.create('tr', {
                'class': 'jimu-widget-row layer-row ',
                'layerId': layer.name
            }, this.layerListTable);

            layerCheckTdNode = domConstruct.create('td', {
                'class': 'col col1 layer-check'
            }, layerRowNode);

            layerCheckbox = new CheckBox({
                checked: layer.isSelected
            });
            domConstruct.place(layerCheckbox.domNode, layerCheckTdNode);

            layerTitleTdNode = domConstruct.create('td', {
                'class': 'col col2 layer-title',
                'innerHTML': layer.name
            }, layerRowNode);

            //bind event
            this.own(on(layerTitleTdNode,
                'click',
                lang.hitch(this,
                    this._onLayerRowClick,
                    layer,
                    layerRowNode)));

            this.own(on(layerRowNode,
                'mouseover',
                lang.hitch(this, this._onLayerNodeMouseover, layerRowNode)));
            this.own(on(layerRowNode,
                'mouseout',
                lang.hitch(this, this._onLayerNodeMouseout, layerRowNode)));
            this.own(on(layerCheckbox.domNode, 'click', lang.hitch(this,
                this._onLayerCheckNodeClick,
                layer,
                layerCheckbox)));

            return layerRowNode;
        },

        _onLayerCheckNodeClick: function (layer, layerCheckBox, evt) {
            var eventName = layerCheckBox.checked ? "layer-selected" : "layer-unselected";
            this.emit(eventName, {
                "layer": layer
            });
            console.log("LayerListView :: _onLayerCheckNodeClick : ", eventName, layer);
            evt.stopPropagation();
        },

        _onLayerNodeMouseover: function (layerTrNode) {
            domClass.add(layerTrNode, "layer-row-mouseover");
        },

        _onLayerNodeMouseout: function (layerTrNode) {
            domClass.remove(layerTrNode, "layer-row-mouseover");
        },

        _onLayerRowClick: function (layerInfo, imageShowLegendNode, layerTrNode, subNode) {
            this._changeSelectedLayerRow(layerTrNode);

        },

        _changeSelectedLayerRow: function (layerTrNode) {
            if (this._currentSelectedLayerRowNode && this._currentSelectedLayerRowNode === layerTrNode) {
                return;
            }
            if (this._currentSelectedLayerRowNode) {
                domClass.remove(this._currentSelectedLayerRowNode, 'jimu-widget-row-selected');
            }
            domClass.add(layerTrNode, 'jimu-widget-row-selected');
            this._currentSelectedLayerRowNode = layerTrNode;
        }

    });
});