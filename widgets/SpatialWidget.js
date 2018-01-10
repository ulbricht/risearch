(function ($) {

AjaxSolr.SpatialWidget = AjaxSolr.AbstractWidget.extend({

  setTextboxesContent: function(location){
	var self=this;
	var minlat="";
	var maxlat="";
	var minlon="";
	var maxlon="";
	if (!isNaN(location[0][0]))
		minlat=location[0][0];
	if (!isNaN(location[0][1]))
		minlon=location[0][1];
	if (!isNaN(location[1][0]))
		maxlat=location[1][0];
	if (!isNaN(location[1][1]))
		maxlon=location[1][1];
	$(self.target).find("input[name='minlat']").val(minlat);
	$(self.target).find("input[name='minlon']").val(minlon);
	$(self.target).find("input[name='maxlat']").val(maxlat);
	$(self.target).find("input[name='maxlon']").val(maxlon);

  },
  getTextboxesContent: function(location){

	var self=this;
	var minlat=parseFloat($(self.target).find("input[name='minlat']").val());
	var maxlat=parseFloat($(self.target).find("input[name='maxlat']").val());
	var minlon=parseFloat($(self.target).find("input[name='minlon']").val());
	var maxlon=parseFloat($(self.target).find("input[name='maxlon']").val());

	return [[minlat,minlon],[maxlat,maxlon]];
  },
  validLocation: function(location){
	return (!isNaN(location[0][0]) && !isNaN(location[0][1]) && !isNaN(location[1][0]) && !isNaN(location[1][1]));
  },
  normalizeLocation: function(location){
	var minlon=location[0][1];
	var maxlon=location[1][1];	
	if (maxlon-minlon>=360.0){
		minlon=-180.0;
		maxlon=180.0;
	}
	while (minlon<-180.0){
		minlon+=360.0;
		maxlon+=360.0;
	}
	while (minlon>180.0){
		minlon-=360.0;
		maxlon-=360.0;
	}

	location[0][1]=minlon;
	location[1][1]=maxlon;

	return location;

  }, 
  replaceLocationFacet: function (location){
	var self=this;

	$.each(self.manager.store.values('fq'), function(idx,val){
		if(val && val.substr(0,3)=="geo")
			self.manager.store.removeByValue('fq', val);

		if(val && val.substr(0,9)=="(*:* -geo")
			self.manager.store.removeByValue('fq', val);
	});
	if (self.validLocation(location)){

		location=self.normalizeLocation(location);
		var minlon=location[0][1];
		var maxlon=location[1][1];		
		if (maxlon<=180.0){
			var fqstring= "geo:["+location[0][0]+","+location[0][1]+" TO "+location[1][0]+","+location[1][1]+"]";
			self.manager.store.addByValue('fq',fqstring);
		}else{
			maxlon-=360.0;
			var fqstring= "(*:* -geo:["+location[1][0]+",-180 TO 90,180])";
			self.manager.store.addByValue('fq',fqstring);

			fqstring= "(*:* -geo:[-90,-180 TO "+location[0][0]+",180])";
			self.manager.store.addByValue('fq',fqstring);

			fqstring= "(*:* -geo:["+location[0][0]+","+maxlon+" TO "+location[1][0]+","+minlon+"])";
			self.manager.store.addByValue('fq',fqstring);

			fqstring= "geo:[-90,-180 TO 90,180]";
			self.manager.store.addByValue('fq',fqstring);
		}
	}
  },
  visualizeLocation: function(location){
	var self=this;
	if ($(self.searchmap).is(":visible")==true){
		self.drawnItems.clearLayers();
		if (self.validLocation(location)){
			var rect=L.rectangle(location).addTo(self.map);
			self.drawnItems.addLayer(rect);
		}
	}
  },
  setVisualExtent: function(){
 	var self=this;
	if ($(self.searchmap).is(":visible")==true){		
		self.map.invalidateSize();
		self.map.fitBounds(L.latLngBounds(L.latLng(-70,-170),L.latLng(70,170)));
		if (self.openmap)
			$(self.openmap).val("Close Map");
	}else{
		if (self.openmap)
			$(self.openmap).val("Open Map");
	}


  },
  init: function(){
	var self=this;
	var minlat="";
	var maxlat="";
	var minlon="";
	var maxlon="";
	var ret=this.setupMap();
	self.map=ret["map"];
	self.drawnItems=ret["drawnItems"];
	var out='<table><tbody>';
	out+='<tr><td></td><td><input type="text" name="maxlat" value="'+maxlat+'"></td><td></td></tr>';
	out+='<tr><td style="vertical-align:middle"><input type="text" name="minlon" value="'+minlon+'"></td>';
	out+= '<td class="tdmiddle"> <input type="image" src="images/windrose.png" title="Click here to select via map." alt="Click here to select via map."></td>';
	out+= '<td class="tdmiddle"><input type="text" name="maxlon" value="'+maxlon+'"></td>';
	out+='</tr>';
	out+='<tr><td></td><td><input type="text" name="minlat" value="'+minlat+'"></td></tr>';
	out+='</tbody></table>';

	$(this.target).append(out);

	var openmap=this.target;
	if (self.openmap && self.openmap.length>0)
	    openmap=self.openmap;


	$(openmap).click(function(){
		$(self.searchmap).toggle(400,function(){
			var location=self.getTextboxesContent();
			self.visualizeLocation(location);
			self.setVisualExtent();	
		});
	});

	self.setVisualExtent();		


	$(this.target).find("input[type='text']").keyup(function (e) {
	  if (e.which == 13) {
		var location=self.getTextboxesContent();
		self.replaceLocationFacet(location);
		self.visualizeLocation(location);
		self.doRequest();
		e.preventDefault();
	  }
	});
  },
  afterRequest: function () {
   	var self = this;

	self.setVisualExtent();	

	var fq = this.manager.store.values('fq');
	var includes=[];
	var excludes=[];
	for (var i = 0, l = fq.length; i < l; i++) {

		var val=fq[i];
		var m=val.match(/^geo:\[(.+),(.+)\ TO\ (.+),(.+)\]/);
		if (m){
			includes.push(val);
		}
		m=val.match(/-geo:\[(.+),(.+)\ TO\ (.+),(.+)\]/);
		if (m){ 
			excludes.push(val);
		}
	}

	if (includes.length==0 && excludes.length==0){
		self.setTextboxesContent([[NaN,NaN],[NaN,NaN]]);
		self.visualizeLocation([[NaN,NaN],[NaN,NaN]]);
	}else if (includes.length==1 && excludes.length==0){
		var m=includes[0].match(/^geo:\[(.+),(.+)\ TO\ (.+),(.+)\]/);
		if (m){
			self.setTextboxesContent([[m[1],m[2]],[m[3],m[4]]]);
		}
	}else if (includes.length==1 && excludes.length==3){

		if (includes[0].match(/geo:\[-90,-180 TO 90,180\]/)){

			$.each(excludes, function(idx,val){
		
				var minlon,maxlon,minlat,maxlat;

				var upper=val.match(/-geo:\[(.+),-180 TO 90,180\]/); //maxlat
				if (upper){
					maxlat=parseFloat(upper[0]);
				}else{
					var lower=val.match(/-geo:\[-90,-180 TO (.+),180\]/);  //minlat
					if (lower){
						minlat=parseFloat(lower[0]);
					}else{
								 //minlat,(maxlon-360)  TO maxlat, minlon
						var between=val.match(/-geo:\[(.+),(.+)\ TO\ (.+),(.+)\]/);
						if (between){
							minlon=parseFloat(between[3]);
							maxlon=parseFloat(between[1]);
							maxlon+=360.0;
						}
					}
				}
				if (!isNaN(minlat) && !isNaN(maxlat) && !isNaN(minlon) && !isNaN(maxlon))
					self.setTextboxesContent([[minlat,minlon],[maxlat,maxlon]]);

				//When the if-chain fails, we did not generate this. It could be any custom query.
			});
		}
	}
    },
    setupMap:  function () {

	var self=this;
	var map,drawnItems;
	$(self.searchmap).each(function(idx, elem){

		//setup map & draw layer
		map=L.map(elem,{ zoomControl:true }).setView([0,0],0);	
		L.tileLayer( 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
		    subdomains: ['a','b','c']
		}).addTo( map );

		drawnItems = new L.FeatureGroup();
		map.addLayer(drawnItems);

		//setup draw control
		var drawControl = new L.Control.Draw({
			position: 'topright',
			draw: {
				polygon: false,
				circle: false,
				marker: false,
				polyline: false,
				rectangle: {
					shapeOptions: {
						color: '#0033ff'
					}
				}
			},
			edit: false
		});
		map.addControl(drawControl);

		map.on('draw:created', function (e) {
			var layer = e.layer;
			var bounds=layer.getBounds();
			var location=[[bounds.getSouth(),bounds.getWest()],[bounds.getNorth(),bounds.getEast()]];
			self.setTextboxesContent(location);
			self.replaceLocationFacet(location);
			self.visualizeLocation(location);
			self.doRequest();
		});


	});
	var ret={"map":map, "drawnItems":drawnItems};
	return ret;

}

});

})(jQuery);
