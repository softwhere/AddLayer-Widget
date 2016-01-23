///////////////////////////////////////////////////////////////////////////
// Copyright © 2015 Softwhere Solutions  
// All Rights Reserved.
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

define(["dojo/_base/declare",
        "dojo/_base/lang",
        "dojo/_base/array",
		"jimu/BaseWidget",
		"dojo/on",
        "./LayerListView",
		"esri/layers/ArcGISDynamicMapServiceLayer",
		"esri/layers/ArcGISTiledMapServiceLayer",
		"esri/layers/ArcGISImageServiceLayer",
        "esri/layers/FeatureLayer",
        "esri/layers/ImageParameters",
        "esri/dijit/PopupTemplate",
		"esri/SpatialReference",
		"esri/geometry/Extent",
		"esri/request",
		"esri/IdentityManager"
		],
    function (declare,
        lang,
        array,
        BaseWidget,
        on,
        LayerListView,
        ArcGISDynamicMapServiceLayer,
        ArcGISTiledMapServiceLayer,
        ArcGISImageServiceLayer,
        FeatureLayer,
        ImageParameters,
        PopupTemplate,
        SpatialReference,
        Extent,
        esriRequest,
        esriId) {

        //To create a widget, you need to derive from BaseWidget.
        return declare([BaseWidget], {

            //please note that this property is be set by the framework when widget is loaded.
            //templateString: template,

            baseClass: 'jimu-widget-addlayer',

            // attach point for the layer list in DOM
            layerListBody: null,

            //layerListView: Object{}
            //  A module is responsible for show layers list
            layerListView: null,


            postCreate: function () {
                this.inherited(arguments);
                console.log('postCreate');
            },

            startup: function () {
                this.inherited(arguments);

                // the layer list binds the checkbox to the isSelected property on each layer
                // explicitly defining this property is not required, but is added in LayerListView if not set
                array.forEach(this.config.layers, function (layer) {
                    layer.isSelected = false;
                }, this);

                this.layerListView = new LayerListView({
                    layers: this.config.layers
                }).placeAt(this.layerListBody);

                this.own(on(this.layerListView, "layer-selected", lang.hitch(this, this.onLayerSelected)));
                this.own(on(this.layerListView, "layer-unselected", lang.hitch(this, this.onLayerUnselected)));

                console.log('AddLayer::startup');
            },

            /**
             * When a layer is selected in the list, add it to the map
             * @param {Object} evt event object with layer
             */
            onLayerSelected: function (evt) {
                var layer = evt.layer;
                console.log("AddLayer :: onLayerSelected : ", layer);
                this.addLayerToMap(layer);
            },

            onLayerUnselected: function (evt) {
                var layer = evt.layer;
                this.removeLayerFromMap(layer);
                console.log("AddLayer :: onLayerUnselected : ", layer);
            },

            /**
             * Add the given layer to the map
             * @param {Object} layer layer config
             */
            addLayerToMap: function (layer) {
                console.log('AddLayer :: addLayerToMap :: begin for layer = ', layer);
                var layerType = layer.type.toUpperCase();
                switch (layerType) {
                case "DYNAMIC":
                    this.addDynamicLayerToMap(layer);
                    break;
                case "FEATURE":
                    this.addFeatureLayerToMap(layer);
                    break;
                case "TILED":
                    this.addTiledLayerToMap(layer);
                    break;
                default:
                    console.warn('AddLayer :: addLayerToMap :: layer = ', layer, ' has an unsupported type');
                    this.setErrorMessage("The layer has invalid configuration and could not be added. Contact the administrator.");
                    break;
                }

            },

            /**
             * Add a new Dynamic layer to the map for the given layer settings
             * @param {Object} layerCfg the layer config object
             */
            addDynamicLayerToMap: function (layerCfg) {

                var options,
                    layerToAdd,
                    infoTemplates;

                options = this.getOptionsForDynamicLayer(layerCfg);

                layerToAdd = new ArcGISDynamicMapServiceLayer(layerCfg.url, options);
                layerToAdd.name = layerCfg.name;

                // define popup
                if (layerCfg.popup) {
                    try {
                        infoTemplates = this.getInfoTemplatesForLayer(layerCfg);
                        if (infoTemplates) {
                            layerToAdd.setInfoTemplates(infoTemplates);
                            console.log("AddLayer :: addDynamicLayerToMap : infoTemplates set for layer ", layerCfg);
                        }
                    } catch (ex) {
                        this.setErrorMessage("Error creating popup for layer. layer will not be clickable.");
                        console.error("AddLayer :: addDynamicLayerToMap : error creating infoTemplates for layer ", layerCfg, ex);
                    }
                }

                if (layerCfg.disableclientcaching) {
                    layerToAdd.setDisableClientCaching(true);
                }

                this.own(layerToAdd.on("load", lang.hitch(this,
                    function () {
                        try {
                            // set visible layers after load

                            // To display no visible layers specify an array with a value of -1
                            var layerIdsToShow = [-1];
                            if (layerCfg.visiblelayers) {
                                layerIdsToShow = this.csvToInts(layerCfg.visiblelayers);
                                console.log("AddLayer :: addDynamicLayerToMap : set visible sublayers to ", layerIdsToShow);
                            }
                            layerToAdd.setVisibleLayers(layerIdsToShow);

                            this.onLayerAdded(layerCfg);
                        } catch (ex) {
                            this.setErrorMessage("Error loading the layer.");
                            console.error("AddLayer :: addDynamicLayerToMap : error setting visible sublayers for layer ", layerCfg, ex);
                        }
                    })));

                this.map.addLayer(layerToAdd);
                console.log('AddLayer :: addDynamicLayerToMap', layerCfg);
            },

            /**
             * Add a new Feature layer to the map for the given layer settings
             * @param {Object} layerCfg the layer config object
             */
            addFeatureLayerToMap: function (layerCfg) {

                var options,
                    layerToAdd,
                    infoTemplates;

                options = this.getOptionsForFeatureLayer(layerCfg);

                layerToAdd = new FeatureLayer(layerCfg.url, options);
                layerToAdd.name = layerCfg.name;

                this.own(layerToAdd.on("load", lang.hitch(this, this.onLayerAdded, layerCfg)));

                this.map.addLayer(layerToAdd);
                console.log('AddLayer :: addFeatureLayerToMap', layerCfg);
            },

            /**
             * Add a new Tiled layer to the map for the given layer settings
             * @param {Object} layerCfg the layer config object
             */
            addTiledLayerToMap: function (layerCfg) {

                var options,
                    layerToAdd,
                    infoTemplates;

                options = this.getOptionsForTiledLayer(layerCfg);

                layerToAdd = new ArcGISTiledMapServiceLayer(layerCfg.url, options);
                layerToAdd.name = layerCfg.name;

                // define popup
                if (layerCfg.popup) {
                    try {
                        infoTemplates = this.getInfoTemplatesForLayer(layerCfg);
                        if (infoTemplates) {
                            layerToAdd.setInfoTemplates(infoTemplates);
                            console.log("AddLayer :: addTiledLayerToMap : infoTemplates set for layer ", layerCfg);
                        }
                    } catch (ex) {
                        this.setErrorMessage("Error creating popup for layer. layer will not be clickable.");
                        console.error("AddLayer :: addTiledLayerToMap : error creating infoTemplates for layer ", layerCfg, ex);
                    }
                }

                this.own(layerToAdd.on("load", lang.hitch(this, this.onLayerAdded, layerCfg)));

                this.map.addLayer(layerToAdd);
                console.log('AddLayer :: addTiledLayerToMap', layerCfg);
            },

            /**
             * return an object that can be used in an ArcGIS Dynamic Layer constructor with properties from the given layer configuration
             * @param {Object} layer layer configuration object
             */
            getOptionsForDynamicLayer: function (layer) {

                var options = {},
                    ip;
                if (layer.hasOwnProperty('opacity')) {
                    options.opacity = layer.opacity;
                }
                if (layer.hasOwnProperty('visible') && !layer.visible) {
                    options.visible = false;
                } else {
                    options.visible = true;
                }
                if (layer.name) {
                    options.id = layer.name;
                }
                if (layer.imageformat) {
                    ip = new ImageParameters();
                    ip.format = layer.imageformat;
                    if (layer.hasOwnProperty('imagedpi')) {
                        ip.dpi = layer.imagedpi;
                    }
                    options.imageParameters = ip;
                }

                return options;
            },

            /**
             * return an object that can be used in an ArcGIS Tiled Layer constructor with properties from the given layer configuration
             * @param {Object} layer layer configuration object
             */
            getOptionsForTiledLayer: function (layer) {

                var options = {};
                if (layer.hasOwnProperty('opacity')) {
                    options.opacity = layer.opacity;
                }
                if (layer.hasOwnProperty('visible') && !layer.visible) {
                    options.visible = false;
                } else {
                    options.visible = true;
                }
                if (layer.name) {
                    options.id = layer.name;
                }
                if (layer.displayLevels) {
                    options.displayLevels = layer.displayLevels;
                }
                if (layer.hasOwnProperty('autorefresh')) {
                    options.refreshInterval = layer.autorefresh;
                }

                return options;
            },

            /**
             * return an object that can be used in the ArcGIS Feature Layer constructor with properties from the given layer configuration
             * @param {Object} layer layer configuration object
             */
            getOptionsForFeatureLayer: function (layer) {

                var options = {},
                    modeTextToNumber;

                if (layer.hasOwnProperty('opacity')) {
                    options.opacity = layer.opacity;
                }

                if (layer.hasOwnProperty('visible') && !layer.visible) {
                    options.visible = false;
                } else {
                    options.visible = true;
                }

                if (layer.name) {
                    options.id = layer.name;
                }

                if (layer.popup) {
                    options.infoTemplate = new PopupTemplate(layer.popup);
                }

                modeTextToNumber = function (modeString) {
                    var mode = 0;
                    switch (modeString) {
                    case "snapshot":
                        mode = 0;
                        break;
                    case "ondemand":
                        mode = 1;
                        break;
                    case "selection":
                        mode = 2;
                        break;
                    }
                    return mode;
                };

                if (layer.hasOwnProperty('mode')) {
                    options.mode = modeTextToNumber(layer.mode);
                }

                options.outFields = ['*'];

                if (layer.hasOwnProperty('autorefresh')) {
                    options.refreshInterval = layer.autorefresh;
                }

                if (layer.hasOwnProperty('showLabels')) {
                    options.showLabels = true;
                }

                return options;
            },

            getInfoTemplatesForLayer: function (layerCfg) {

                if (!layerCfg.popup) {
                    console.log("layer has no popup defined ", layerCfg);
                    return null;
                }

                // create infoTemplates object with each template having unique layerId
                var infoTemplates = {};
                array.forEach(layerCfg.popup.infoTemplates, function (tpl) {
                    var popupInfo = {};
                    popupInfo.title = tpl.title;
                    popupInfo.description = tpl.description || null;

                    if (tpl.fieldInfos) {
                        popupInfo.fieldInfos = tpl.fieldInfos;
                    }

                    infoTemplates[tpl.layerId] = {
                        infoTemplate: new PopupTemplate(popupInfo)
                    };
                });

                return infoTemplates;
            },

            /**
             * Remove the given layer to the map
             * @param {Object} layer layer config
             */
            removeLayerFromMap: function (layer) {
                console.log('AddLayer :: removeLayerFromMap :: begin for layer = ', layer);
                var layerToRemove = this.map.getLayer(layer.name);
                this.own(this.map.on("layer-remove", lang.hitch(this, this.onLayerRemoved, layer)));
                this.map.removeLayer(layerToRemove);
            },

            /**
             * convert comma-separated value string of integers to array
             * @param {String} csv comma separated value string
             */
            csvToInts: function (csv) {
                var strings,
                    result;
                strings = csv.split(',');
                result = array.map(strings, function (value) {
                    return parseInt(value, 10);
                }, this);
                console.log('AddLayer :: csvToInts : from ', csv, " to ", result);
                return result;
            },

            onLayerAdded: function (layer) {
                this.setSuccessMessage("Map layer added.");
            },

            onLayerRemoved: function (layer) {
                this.setSuccessMessage("Map layer removed.");
            },

            setSuccessMessage: function (message) {
                this.message.innerHTML = '<div style="color:green; width: 100%;"><b>' + message + '</b></div>';
            },

            /**
             * display error message
             * @param {String} message text to display
             */
            setErrorMessage: function (message) {
                this.message.innerHTML = '<div style="color:red; width: 100%;"><b>' + message + '</b></div>';
            },

            onOpen: function () {
                console.log('onOpen');
            },

            onClose: function () {
                console.log('onClose');
            }
        });


    });