// Getting the csrf token
function get_requestData (watershed, subbasin, streamcomid, stationcode, stationname, startdate, province){
  getdata = {
      'watershed': watershed,
      'subbasin': subbasin,
      'streamcomid': streamcomid,
      'stationcode':stationcode,
      'stationname': stationname
  };
  $.ajax({
      url: 'get-request-data',
      type: 'GET',
      data: getdata,
      error: function() {
          $('#info').html('<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the data</strong></p>');
          $('#info').removeClass('hidden');
          console.log(e);
          $('#hydrographs-loading').addClass('hidden');
          $('#dailyAverages-loading').addClass('hidden');
          $('#monthlyAverages-loading').addClass('hidden');
          $('#scatterPlot-loading').addClass('hidden');
          $('#scatterPlotLogScale-loading').addClass('hidden');
          $('#forecast-bc-loading').addClass('hidden');
          setTimeout(function () {
              $('#info').addClass('hidden')
          }, 5000);
      },
      success: function (data) {
        console.log(data)
        get_hydrographs (watershed, subbasin, streamcomid, stationcode, stationname, startdate, province);

      }
  })

}

// Getting the csrf token
let csrftoken = Cookies.get('csrftoken');

function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}

$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
            xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
    }
});

var feature_layer;
var current_layer;
var map;
var wmsLayer;
var wmsLayer2;

let $loading = $('#view-file-loading');
var m_downloaded_historical_streamflow = false;

function toggleAcc(layerID) {
    let layer = wms_layers[layerID];
    if (document.getElementById(`wmsToggle${layerID}`).checked) {
        // Turn the layer and legend on
        layer.setVisible(true);
        $("#wmslegend" + layerID).show(200);
    } else {
        layer.setVisible(false);
        $("#wmslegend" + layerID).hide(200);

    }
}

function init_map() {

	var base_layer = new ol.layer.Tile({
		source: new ol.source.BingMaps({
			key: 'eLVu8tDRPeQqmBlKAjcw~82nOqZJe2EpKmqd-kQrSmg~AocUZ43djJ-hMBHQdYDyMbT-Enfsk0mtUIGws1WeDuOvjY4EXCH-9OK3edNLDgkc',
			imagerySet: 'Road'
			//            imagerySet: 'AerialWithLabels'
		})
	});

	var streams = new ol.layer.Image({
		source: new ol.source.ImageWMS({
			url: 'https://geoserver.hydroshare.org/geoserver/HS-97d4169fd7f54299aa9d60e61a56314f/wms',
			params: { 'LAYERS': 'north_america-canada-geoglows-drainage_line' },
			serverType: 'geoserver',
			crossOrigin: 'Anonymous'
		}),
		opacity: 0.5
	});

	wmsLayer = streams;

	var stations = new ol.layer.Image({
		source: new ol.source.ImageWMS({
			url: 'https://geoserver.hydroshare.org/geoserver/HS-97d4169fd7f54299aa9d60e61a56314f/wms',
			params: { 'LAYERS': 'Selected_Statiions_Canada_WL' },
			serverType: 'geoserver',
			crossOrigin: 'Anonymous'
		})
	});

	wmsLayer2 = stations;

	feature_layer = stations;

	map = new ol.Map({
		target: 'map',
		layers: [base_layer, streams, stations],
		view: new ol.View({
			center: ol.proj.fromLonLat([-104.895627,57.479509]),
			zoom: 3
		})
	});

}

let ajax_url = 'https://geoserver.hydroshare.org/geoserver/wfs?request=GetCapabilities';

let capabilities = $.ajax(ajax_url, {
	type: 'GET',
	data:{
		service: 'WFS',
		version: '1.0.0',
		request: 'GetCapabilities',
		outputFormat: 'text/javascript'
	},
	success: function() {
		let x = capabilities.responseText
		.split('<FeatureTypeList>')[1]
		.split('HS-97d4169fd7f54299aa9d60e61a56314f:Selected_Statiions_Canada_WL')[1]
		.split('LatLongBoundingBox ')[1]
		.split('/></FeatureType>')[0];

		let minx = Number(x.split('"')[1]);
		let miny = Number(x.split('"')[3]);
		let maxx = Number(x.split('"')[5]);
		let maxy = Number(x.split('"')[7]);

		minx = minx + 2;
		miny = miny + 2;
		maxx = maxx - 2;
		maxy = maxy - 2;

		let extent = ol.proj.transform([minx, miny], 'EPSG:4326', 'EPSG:3857').concat(ol.proj.transform([maxx, maxy], 'EPSG:4326', 'EPSG:3857'));

		map.getView().fit(extent, map.getSize());
	}
});

function get_hydrographs (watershed, subbasin, streamcomid, stationcode, stationname, startdate, province) {
	$('#hydrographs-loading').removeClass('hidden');
	m_downloaded_historical_streamflow = true;
    $.ajax({
        url: 'get-hydrographs',
        type: 'GET',
        data: {
            'watershed': watershed,
            'subbasin': subbasin,
            'streamcomid': streamcomid,
            'stationcode': stationcode,
            'stationname': stationname,
        },
        error: function() {
        	$('#hydrographs-loading').addClass('hidden');
            console.log(e);
            $('#info').html('<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the data</strong></p>');
            $('#info').removeClass('hidden');

            setTimeout(function () {
                $('#info').addClass('hidden')
            }, 5000);
        },
        success: function (data) {
            if (!data.error) {
            	console.log("get_hydrographs in");
                $('#hydrographs-loading').addClass('hidden');
                $('#dates').removeClass('hidden');
//                $('#obsdates').removeClass('hidden');
                $loading.addClass('hidden');
                $('#hydrographs-chart').removeClass('hidden');
                $('#hydrographs-chart').html(data);

                //resize main graph
                Plotly.Plots.resize($("#hydrographs-chart .js-plotly-plot")[0]);
                Plotly.relayout($("#hydrographs-chart .js-plotly-plot")[0], {
                	'xaxis.autorange': true,
                	'yaxis.autorange': true
                });

                var params_obs = {
                    watershed: watershed,
                	subbasin: subbasin,
                	streamcomid: streamcomid,
                    stationcode: stationcode,
                    stationname: stationname,
                };

                $('#submit-download-observed-water-level').attr({
                    target: '_blank',
                    href: 'get-observed-water-level-csv?' + jQuery.param(params_obs)
                });

                $('#download_observed_water_level').removeClass('hidden');

                var params_sim_bc = {
                    watershed: watershed,
                	subbasin: subbasin,
                	streamcomid: streamcomid,
                	stationcode:stationcode,
                	stationname: stationname
                };

                $('#submit-download-simulated-bc-water-level').attr({
                    target: '_blank',
                    href: 'get-simulated-bc-water-level-csv?' + jQuery.param(params_sim_bc)
                });

                $('#download_simulated_bc_water_level').removeClass('hidden');

                get_dailyAverages (watershed, subbasin, streamcomid, stationcode, stationname);
        		get_monthlyAverages (watershed, subbasin, streamcomid, stationcode, stationname);
        		get_scatterPlot (watershed, subbasin, streamcomid, stationcode, stationname);
        		get_scatterPlotLogScale (watershed, subbasin, streamcomid, stationcode, stationname);
        		makeDefaultTable(watershed, subbasin, streamcomid, stationcode, stationname);
        		get_time_series_bc(watershed, subbasin, streamcomid, stationcode, stationname, startdate, province);

           		 } else if (data.error) {
           		 	$('#hydrographs-loading').addClass('hidden');
                 	console.log(data.error);
           		 	$('#info').html('<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the Data</strong></p>');
           		 	$('#info').removeClass('hidden');

           		 	setTimeout(function() {
           		 		$('#info').addClass('hidden')
           		 	}, 5000);
           		 } else {
           		 	$('#info').html('<p><strong>An unexplainable error occurred.</strong></p>').removeClass('hidden');
           		 }
			   console.log("get_hydrographs out");
       		}
    });
};

function get_dailyAverages (watershed, subbasin, streamcomid, stationcode, stationname) {
	$('#dailyAverages-loading').removeClass('hidden');
	m_downloaded_historical_streamflow = true;
    $.ajax({
        url: 'get-dailyAverages',
        type: 'GET',
        data: {
            'watershed': watershed,
            'subbasin': subbasin,
            'streamcomid': streamcomid,
            'stationcode': stationcode,
            'stationname': stationname
        },
        error: function() {
        	console.log(e);
        	$('#dailyAverages-loading').addClass('hidden');
            $('#info').html('<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the data</strong></p>');
            $('#info').removeClass('hidden');

            setTimeout(function () {
                $('#info').addClass('hidden')
            }, 5000);
        },
        success: function (data) {
            if (!data.error) {
                $('#dailyAverages-loading').addClass('hidden');
                $('#dates').removeClass('hidden');
//                $('#obsdates').removeClass('hidden');
                $loading.addClass('hidden');
                $('#dailyAverages-chart').removeClass('hidden');
                $('#dailyAverages-chart').html(data);

                //resize main graph
                Plotly.Plots.resize($("#dailyAverages-chart .js-plotly-plot")[0]);
                Plotly.relayout($("#dailyAverages-chart .js-plotly-plot")[0], {
                	'xaxis.autorange': true,
                	'yaxis.autorange': true
                });

           		 } else if (data.error) {
           		 	console.log(data.error);
					$('#dailyAverages-loading').addClass('hidden');
           		 	$('#info').html('<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the Data</strong></p>');
           		 	$('#info').removeClass('hidden');

           		 	setTimeout(function() {
           		 		$('#info').addClass('hidden')
           		 	}, 5000);
           		 } else {
           		 	$('#info').html('<p><strong>An unexplainable error occurred.</strong></p>').removeClass('hidden');
           		 }
			   console.log("get_dailyAverages out");
       		}
    });
};

function get_monthlyAverages (watershed, subbasin, streamcomid, stationcode, stationname) {
	$('#monthlyAverages-loading').removeClass('hidden');
	m_downloaded_historical_streamflow = true;
    $.ajax({
        url: 'get-monthlyAverages',
        type: 'GET',
        data: {
            'watershed': watershed,
            'subbasin': subbasin,
            'streamcomid': streamcomid,
            'stationcode': stationcode,
            'stationname': stationname
        },
        error: function() {
        	$('#monthlyAverages-loading').addClass('hidden');
          	console.log(e);
            $('#info').html('<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the data</strong></p>');
            $('#info').removeClass('hidden');

            setTimeout(function () {
                $('#info').addClass('hidden')
            }, 5000);
        },
        success: function (data) {
            if (!data.error) {
            	console.log("get_monthlyAverages in");
                $('#monthlyAverages-loading').addClass('hidden');
                $('#dates').removeClass('hidden');
//                $('#obsdates').removeClass('hidden');
                $loading.addClass('hidden');
                $('#monthlyAverages-chart').removeClass('hidden');
                $('#monthlyAverages-chart').html(data);

                //resize main graph
                Plotly.Plots.resize($("#monthlyAverages-chart .js-plotly-plot")[0]);
                Plotly.relayout($("#monthlyAverages-chart .js-plotly-plot")[0], {
                	'xaxis.autorange': true,
                	'yaxis.autorange': true
                });

           		 } else if (data.error) {
           		 	console.log(data.error);
					$('#monthlyAverages-loading').addClass('hidden');
           		 	$('#info').html('<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the Data</strong></p>');
           		 	$('#info').removeClass('hidden');

           		 	setTimeout(function() {
           		 		$('#info').addClass('hidden')
           		 	}, 5000);
           		 } else {
           		 	$('#info').html('<p><strong>An unexplainable error occurred.</strong></p>').removeClass('hidden');
           		 }
			   console.log("get_monthlyAverages out");
       		}
    });
};

function get_scatterPlot (watershed, subbasin, streamcomid, stationcode, stationname) {
	$('#scatterPlot-loading').removeClass('hidden');
	m_downloaded_historical_streamflow = true;
    $.ajax({
        url: 'get-scatterPlot',
        type: 'GET',
        data: {
            'watershed': watershed,
            'subbasin': subbasin,
            'streamcomid': streamcomid,
            'stationcode': stationcode,
            'stationname': stationname
        },
        error: function() {
        	console.log(e);
            $('#scatterPlot-loading').addClass('hidden');
            $('#info').html('<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the data</strong></p>');
            $('#info').removeClass('hidden');

            setTimeout(function () {
                $('#info').addClass('hidden')
            }, 5000);
        },
        success: function (data) {
            if (!data.error) {
            	console.log("get_scatterPlot in");
                $('#scatterPlot-loading').addClass('hidden');
                $('#dates').removeClass('hidden');
//                $('#obsdates').removeClass('hidden');
                $loading.addClass('hidden');
                $('#scatterPlot-chart').removeClass('hidden');
                $('#scatterPlot-chart').html(data);

                //resize main graph
                Plotly.Plots.resize($("#scatterPlot-chart .js-plotly-plot")[0]);
                Plotly.relayout($("#scatterPlot-chart .js-plotly-plot")[0], {
                	'xaxis.autorange': true,
                	'yaxis.autorange': true
                });

           		 } else if (data.error) {
           		 	console.log(data.error);
					$('#scatterPlot-loading').addClass('hidden');
           		 	$('#info').html('<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the Data</strong></p>');
           		 	$('#info').removeClass('hidden');

           		 	setTimeout(function() {
           		 		$('#info').addClass('hidden')
           		 	}, 5000);
           		 } else {
           		 	$('#info').html('<p><strong>An unexplainable error occurred.</strong></p>').removeClass('hidden');
           		 }
			   console.log("get_scatterPlot out");
       		}
    });
};

function get_scatterPlotLogScale (watershed, subbasin, streamcomid, stationcode, stationname) {
	$('#scatterPlotLogScale-loading').removeClass('hidden');
	m_downloaded_historical_streamflow = true;
    $.ajax({
        url: 'get-scatterPlotLogScale',
        type: 'GET',
        data: {
            'watershed': watershed,
            'subbasin': subbasin,
            'streamcomid': streamcomid,
            'stationcode': stationcode,
            'stationname': stationname
        },
        error: function() {
        	$('#scatterPlotLogScale-loading').addClass('hidden');
            console.log(e);
            $('#info').html('<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the data</strong></p>');
            $('#info').removeClass('hidden');

            setTimeout(function () {
                $('#info').addClass('hidden')
            }, 5000);
        },
        success: function (data) {
            if (!data.error) {
            	console.log("get_scatterPlotLogScale in");
                $('#scatterPlotLogScale-loading').addClass('hidden');
                $('#dates').removeClass('hidden');
//                $('#obsdates').removeClass('hidden');
                $loading.addClass('hidden');
                $('#scatterPlotLogScale-chart').removeClass('hidden');
                $('#scatterPlotLogScale-chart').html(data);

                //resize main graph
                Plotly.Plots.resize($("#scatterPlotLogScale-chart .js-plotly-plot")[0]);
                Plotly.relayout($("#scatterPlotLogScale-chart .js-plotly-plot")[0], {
                	'xaxis.autorange': true,
                	'yaxis.autorange': true
                });

           		 } else if (data.error) {
           		 	$('#scatterPlotLogScale-loading').addClass('hidden');
					console.log(data.error);
           		 	$('#info').html('<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the Data</strong></p>');
           		 	$('#info').removeClass('hidden');

           		 	setTimeout(function() {
           		 		$('#info').addClass('hidden')
           		 	}, 5000);
           		 } else {
           		 	$('#info').html('<p><strong>An unexplainable error occurred.</strong></p>').removeClass('hidden');
           		 }
			   console.log("get_scatterPlotLogScale out");
       		}
    });
};

function map_events() {
	map.on('pointermove', function(evt) {
		if (evt.dragging) {
			return;
		}
		var pixel = map.getEventPixel(evt.originalEvent);
		var hit = map.forEachLayerAtPixel(pixel, function(layer) {
			if (layer == feature_layer) {
				current_layer = layer;
				return true;
			}
			});
		map.getTargetElement().style.cursor = hit ? 'pointer' : '';
	});

	map.on("singleclick", function(evt) {

		if (map.getTargetElement().style.cursor == "pointer") {

			var view = map.getView();
			var viewResolution = view.getResolution();
			var wms_url = current_layer.getSource().getGetFeatureInfoUrl(evt.coordinate, viewResolution, view.getProjection(), { 'INFO_FORMAT': 'application/json' });

			if (wms_url) {
				$("#obsgraph").modal('show');
				$('#hydrographs-chart').addClass('hidden');
				$('#dailyAverages-chart').addClass('hidden');
				$('#monthlyAverages-chart').addClass('hidden');
				$('#scatterPlot-chart').addClass('hidden');
				$('#scatterPlotLogScale-chart').addClass('hidden');
				$('#forecast-bc-chart').addClass('hidden');
				$('#hydrographs-loading').removeClass('hidden');
				$('#dailyAverages-loading').removeClass('hidden');
				$('#monthlyAverages-loading').removeClass('hidden');
				$('#scatterPlot-loading').removeClass('hidden');
				$('#scatterPlotLogScale-loading').removeClass('hidden');
				$('#forecast-bc-loading').removeClass('hidden');
				$("#station-info").empty()
				$('#download_observed_water_level').addClass('hidden');
                $('#download_simulated_bc_water_level').addClass('hidden');
                $('#download_forecast_bc').addClass('hidden');

				$.ajax({
					type: "GET",
					url: wms_url,
					dataType: 'json',
					success: function (result) {
						watershed = 'north_america' //OJO buscar como hacerla generica
		         		//subbasin = 'continental' //OJO buscar como hacerla generica
		         		subbasin = 'geoglows' //OJO buscar como hacerla generica
		         		var startdate = '';
		         		stationcode = result["features"][0]["properties"]["STATION_NU"];
		         		stationname = result["features"][0]["properties"]["STATION_NA"];
		         		streamcomid = result["features"][0]["properties"]["new_COMID"];
		         		province = result["features"][0]["properties"]["PROV_TERR_"];
		         		$("#station-info").append('<h3 id="Station-Name-Tab">Current Station: '+ stationname
                        			+ '</h3><h5 id="Station-Code-Tab">Station Code: '
                        			+ stationcode + '</h3><h5 id="COMID-Tab">Station COMID: '
                        			+ streamcomid+ '</h5><h5>Province: '+ province + '</h5>');

                        get_requestData(watershed, subbasin, streamcomid, stationcode, stationname, startdate, province);
                    },
                    error: function(e){
                      console.log(e);
                      $('#hydrographs-loading').addClass('hidden');
              		  $('#dailyAverages-loading').addClass('hidden');
              		  $('#monthlyAverages-loading').addClass('hidden');
              		  $('#scatterPlot-loading').addClass('hidden');
              		  $('#scatterPlotLogScale-loading').addClass('hidden');
              		  $('#forecast-bc-loading').addClass('hidden');
                    }
                });
            }
		}

	});
}

function resize_graphs() {
    $("#hydrographs_tab_link").click(function() {
    	Plotly.Plots.resize($("#hydrographs-chart .js-plotly-plot")[0]);
    	Plotly.relayout($("#hydrographs-chart .js-plotly-plot")[0], {
        	'xaxis.autorange': true,
        	'yaxis.autorange': true
        });
    });
    $("#visualAnalysis_tab_link").click(function() {
    	Plotly.Plots.resize($("#dailyAverages-chart .js-plotly-plot")[0]);
    	Plotly.relayout($("#dailyAverages-chart .js-plotly-plot")[0], {
        	'xaxis.autorange': true,
        	'yaxis.autorange': true
        });
        Plotly.Plots.resize($("#monthlyAverages-chart .js-plotly-plot")[0]);
    	Plotly.relayout($("#monthlyAverages-chart .js-plotly-plot")[0], {
        	'xaxis.autorange': true,
        	'yaxis.autorange': true
        });
        Plotly.Plots.resize($("#scatterPlot-chart .js-plotly-plot")[0]);
    	Plotly.relayout($("#scatterPlot-chart .js-plotly-plot")[0], {
        	'xaxis.autorange': true,
        	'yaxis.autorange': true
        });
        Plotly.Plots.resize($("#scatterPlotLogScale-chart .js-plotly-plot")[0]);
    	Plotly.relayout($("#scatterPlotLogScale-chart .js-plotly-plot")[0], {
        	'xaxis.autorange': true,
        	'yaxis.autorange': true
        });
    });

    $("#forecast_tab_link").click(function() {
        Plotly.Plots.resize($("#forecast-bc-chart .js-plotly-plot")[0]);
        Plotly.relayout($("#forecast-bc-chart .js-plotly-plot")[0], {
        	'xaxis.autorange': true,
        	'yaxis.autorange': true
        });
    });
};

$(function() {
	$("#app-content-wrapper").removeClass('show-nav');
	$(".toggle-nav").removeClass('toggle-nav');

	//make sure active Plotly plots resize on window resize
    window.onresize = function() {
        $('#graph .modal-body .tab-pane.active .js-plotly-plot').each(function(){
            Plotly.Plots.resize($(this)[0]);
        });
    };
    init_map();
    map_events();
    resize_graphs();

    $('#datesSelect').change(function() { //when date is changed

        //var sel_val = ($('#datesSelect option:selected').val()).split(',');
        sel_val = $("#datesSelect").val()

        //var startdate = sel_val[0];
        var startdate = sel_val;
        startdate = startdate.replace("-","");
        startdate = startdate.replace("-","");

        $loading.removeClass('hidden');
        get_time_series_bc(watershed, subbasin, streamcomid, stationcode, stationname, startdate, province);
    });

});

function getRegionGeoJsons() {

    let geojsons = region_index[$("#regions").val()]['geojsons'];
    for (let i in geojsons) {
        var regionsSource = new ol.source.Vector({
           url: staticGeoJSON + geojsons[i],
           format: new ol.format.GeoJSON()
        });

        var regionStyle = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'red',
                width: 3
            })
        });

        var regionsLayer = new ol.layer.Vector({
            name: 'myRegion',
            source: regionsSource,
            style: regionStyle
        });

        map.getLayers().forEach(function(regionsLayer) {
        if (regionsLayer.get('name')=='myRegion')
            map.removeLayer(regionsLayer);
        });
        map.addLayer(regionsLayer)

        setTimeout(function() {
            var myExtent = regionsLayer.getSource().getExtent();
            map.getView().fit(myExtent, map.getSize());
        }, 500);
    }
}

$('#stp-stream-toggle').on('change', function() {
    wmsLayer.setVisible($('#stp-stream-toggle').prop('checked'))
})
$('#stp-stations-toggle').on('change', function() {
    wmsLayer2.setVisible($('#stp-stations-toggle').prop('checked'))
})

// Regions gizmo listener
$('#regions').change(function() {getRegionGeoJsons()});


// Function for the select2 metric selection tool
$(document).ready(function() {
    $('#metric_select2').select2({ width: 'resolve' });
});

$('#metric_select2').on("select2:close", function(e) { // Display optional parameters

    let select_val = $( '#metric_select2' ).val();

    if ( select_val.includes("MASE") ) {
        $('#mase_param_div').fadeIn()
    } else {
        $('#mase_param_div').fadeOut()
    }

    if ( select_val.includes("d (Mod.)") ) {
        $('#dmod_param_div').fadeIn()
    } else {
        $('#dmod_param_div').fadeOut()
    }

    if ( select_val.includes("NSE (Mod.)") ) {
        $('#nse_mod_param_div').fadeIn()
    } else {
        $('#nse_mod_param_div').fadeOut()
    }

    if ( select_val.includes("E1'") ) {
        $('#lm_eff_param_div').fadeIn()
    } else {
        $('#lm_eff_param_div').fadeOut()
    }

    if ( select_val.includes("D1'") ) {
        $('#d1_p_param_div').fadeIn()
    } else {
        $('#d1_p_param_div').fadeOut()
    }

    if ( select_val.includes("H6 (MHE)") ) {
        $('#mean_h6_param_div').fadeIn()
    } else {
        $('#mean_h6_param_div').fadeOut()
    }

    if ( select_val.includes("H6 (MAHE)") ) {
        $('#mean_abs_H6_param_div').fadeIn()
    } else {
        $('#mean_abs_H6_param_div').fadeOut()
    }

    if ( select_val.includes("H6 (RMSHE)") ) {
        $('#rms_H6_param_div').fadeIn()
    } else {
        $('#rms_H6_param_div').fadeOut()
    }
});

// THIS DELETE THE DUPLICATES IN THE ARRAY MERGE //
function arrayUnique(array) {
    var a = array.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
}

// Event handler for the make table button
$(document).ready(function(){

    $("#make-table").click(function(){

        var model = $('#model option:selected').text();
        var watershed = 'north_america' //OJO buscar como hacerla generica
        //var subbasin = 'continental' //OJO buscar como hacerla generica
        var subbasin = 'geoglows' //OJO buscar como hacerla generica
        var startdate = '';
        /*
        let xName = $("#Station-Name-Tab")
        let xCode = $("#Station-Code-Tab")
        let xComid = $("#COMID-Tab")
        let htmlName = xName.html()
        let htmlCode = xCode.html()
        let htmlComid = xComid.html()
        var arName = htmlName.split(': ')
        var arCode = htmlCode.split(': ')
        var arComid = htmlComid.split(': ')
        let stationname = arName[1];
        let stationcode = arCode[1];
        let streamcomid = arComid[1];
        */

        let metrics_default = ["ME","RMSE","NRMSE (Mean)","MAPE","NSE","KGE (2009)", "KGE (2012)", "R (Pearson)", "R (Spearman)", "r2"];  // Default Metrics
        let selected_metrics = $( '#metric_select2' ).val();  // Selected Metrics
        let selected_metric_joined = arrayUnique(metrics_default.concat(selected_metrics));
		let additionalParametersNameList = ["mase_m", "dmod_j", "nse_mod_j", "h6_k_MHE", "h6_k_AHE", "h6_k_RMSHE", "lm_x_bar", "d1_p_x_bar"];
		let additionalParametersValuesList = [];

		let getData = {
			'watershed': watershed,
			'subbasin': subbasin,
			'streamcomid': streamcomid,
			'stationcode': stationcode,
			'stationname': stationname,
			'metrics': selected_metric_joined,
		}

		for (let i = 0; i < additionalParametersNameList.length; i++) {
			metricAbbr = additionalParametersNameList[i];
			getData[metricAbbr] = $(`#${metricAbbr}`).val();
		}

		// Creating the table
		$.ajax({
			url : "make-table-ajax", // the endpoint
			type : "GET", // http method
			data: getData,
//			contentType : "json",

			// handle a successful response
			success : function(resp) {
				$("#metric-table").show();
				$('#table').html(resp); // Render the Table
			},

			// handle a non-successful response
			error : function(xhr, errmsg, err) {
				$('#table').html("<div class='alert-box alert radius' data-alert>Oops! We have encountered an error: "+errmsg+".</div>"); // add the error to the dom
				console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
			}
		});
	});
});

function makeDefaultTable(watershed, subbasin, streamcomid, stationcode, stationname){
  let selected_metrics = ["ME","RMSE","NRMSE (Mean)","MAPE","NSE","KGE (2009)", "KGE (2012)", "R (Pearson)", "R (Spearman)", "r2"];  // Selected Metrics
  let additionalParametersNameList = ["mase_m", "dmod_j", "nse_mod_j", "h6_k_MHE", "h6_k_AHE", "h6_k_RMSHE", "lm_x_bar", "d1_p_x_bar"];
  let additionalParametersValuesList = [];

  let getData = {
  'watershed': watershed,
  'subbasin': subbasin,
  'streamcomid': streamcomid,
  'stationcode': stationcode,
  'stationname': stationname,
  'metrics': selected_metrics,
  }

  for (let i = 0; i < additionalParametersNameList.length; i++) {
    metricAbbr = additionalParametersNameList[i];
    getData[metricAbbr] = $(`#${metricAbbr}`).val();
  }

  $.ajax({
    url : "make-table-ajax", // the endpoint
    type : "GET", // http method
    data: getData,
//			contentType : "json",

    // handle a successful response
    success : function(resp) {
      $("#metric-table").show();
      $('#table').html(resp); // Render the Table
    },

    // handle a non-successful response
    error : function(xhr, errmsg, err) {
      $('#table').html("<div class='alert-box alert radius' data-alert>Oops! We have encountered an error: "+errmsg+".</div>"); // add the error to the dom
      console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
    }
  });
}

function get_available_dates(watershed, subbasin, comid) {
    $.ajax({
    	type: 'GET',
        url: 'get-available-dates/',
        dataType: 'json',
        data: {
            'watershed': watershed,
            'subbasin': subbasin,
            'comid': comid
        },
        error: function() {
            $('#dates').html(
                '<p class="alert alert-danger" style="text-align: center"><strong>An error occurred while retrieving the available dates</strong></p>'
            );

            setTimeout(function() {
                // $('#dates').addClass('hidden')
            }, 5000);
        },
        success: function(dates) {
            datesParsed = JSON.parse(dates.available_dates);
            $('#datesSelect').empty();
            $.each(datesParsed, function(i, p) {
                var val_str = p.slice(1).join();
                $('#datesSelect').append($('<option></option>').val(val_str).html(p[0]));
            });
        }
    });
}

function get_time_series_bc(watershed, subbasin, streamcomid, stationcode, stationname, startdate, province) {
    $('#forecast-bc-loading').removeClass('hidden');
    $('#forecast-bc-chart').addClass('hidden');
    $('#dates').addClass('hidden');
    $.ajax({
        type: 'GET',
        url: 'get-time-series-bc/',
        data: {
            'watershed': watershed,
            'subbasin': subbasin,
            'streamcomid': streamcomid,
            'stationcode': stationcode,
            'stationname': stationname,
            'startdate': startdate,
            'province': province,
        },
        error: function() {
        	$('#forecast-bc-loading').addClass('hidden');
			console.log(e);
            $('#info').html('<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the corrected forecast</strong></p>');
            $('#info').removeClass('hidden');

            setTimeout(function() {
                $('#info').addClass('hidden')
            }, 5000);
        },
        success: function(data) {
            if (!data.error) {
            	console.log("get_time_series_bc in");
                $('#forecast-bc-loading').addClass('hidden');
                $('#dates').removeClass('hidden');
                //$loading.addClass('hidden');
                $('#forecast-bc-chart').removeClass('hidden');
                $('#forecast-bc-chart').html(data);

                //resize main graph
                Plotly.Plots.resize($("#forecast-bc-chart .js-plotly-plot")[0]);
                Plotly.relayout($("#forecast-bc-chart .js-plotly-plot")[0], {
                	'xaxis.autorange': true,
                	'yaxis.autorange': true
                });

                var params = {
                    watershed: watershed,
                    subbasin: subbasin,
                    streamcomid: streamcomid,
                    stationcode: stationcode,
                    stationname: stationname,
                    startdate: startdate,
                    province: province,
                };

                $('#submit-download-forecast-bc').attr({
                    target: '_blank',
                    href: 'get-forecast-bc-data-csv?' + jQuery.param(params)
                });

                $('#download_forecast_bc').removeClass('hidden');

                $('#submit-download-forecast-bc-ensemble').attr({
                    target: '_blank',
                    href: 'get-forecast-ensemble-bc-data-csv?' + jQuery.param(params)
                });

                $('#download_forecast_ensemble_bc').removeClass('hidden');

            } else if (data.error) {
            	$('#forecast-bc-loading').addClass('hidden');
                console.log(data.error);
                $('#info').html('<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the corrected forecast</strong></p>');
                $('#info').removeClass('hidden');

                setTimeout(function() {
                    $('#info').addClass('hidden')
                }, 5000);
            } else {
                $('#info').html('<p><strong>An unexplainable error occurred.</strong></p>').removeClass('hidden');
            }
            console.log("get_time_series_bc out");
        }
    });
}