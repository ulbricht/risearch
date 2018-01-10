(function ($) {

AjaxSolr.ResultWidget = AjaxSolr.AbstractWidget.extend({
  start: 0,

  beforeRequest: function () {
	$("#loadingnextpage").show();
  },

  facetLinks: function (facet_field, facet_values) {
    var links = [];
    if (facet_values) {
      for (var i = 0, l = facet_values.length; i < l; i++) {

	var href=facet_field+':'+AjaxSolr.Parameter.escapeValue(facet_values[i]);
	href=href.replace(/"/g,'%22');

        if (facet_values[i] !== undefined) {
          links.push(
//            $('<a href="?fq='+href+'"></a>')
	    $('<span class="resultproductclass"></span>')
            .text(facet_values[i])
//            .click(this.facetHandler(facet_field, facet_values[i]))
          );
        }
        else {
          links.push('no items found in current selection');
        }
      }
    }
    return links;
  },

  facetHandler: function (facet_field, facet_value) {
    var self = this;
    return function () {
      self.manager.store.remove('fq');
      self.manager.store.addByValue('fq', facet_field + ':' + AjaxSolr.Parameter.escapeValue(facet_value));
      self.doRequest(0);
      return false;
    };
  },
  checkClearPage: function(){
    var self=this;
    var fqvalues=this.manager.store.values("fq");
    var qvalues=this.manager.store.values("q");
    var clear=false;

    if (!self.store_fqvalues || !self.store_qvalues || self.store_fqvalues.length != fqvalues.length || self.store_qvalues.length != qvalues.length)
	clear=true;

    for (var i=0;!clear && i<fqvalues.length;i++)
	if (fqvalues[i] !=self.store_fqvalues[i])
	    clear=true;
    for (var i=0;!clear && i<qvalues.length;i++)
	if (qvalues[i] !=self.store_qvalues[i])
	    clear=true;



    self.store_qvalues=qvalues;
    self.store_fqvalues=fqvalues;


   if (clear)
	return true;
   else
        return false;

  },
  afterRequest: function () {

    var self=this;

   if (self.checkClearPage())
	 $(self.target).html($('<div id="loadingnextpage"><img src="images/ajax-loader.gif"/></div>'));


    $('#pager-header').html('<span>Found '+this.manager.response.response.numFound+' search results.</span>');

    for (var i = 0, l = this.manager.response.response.docs.length; i < l; i++) {
      var doc = this.manager.response.response.docs[i];
      var createddoc=$(this.template(doc));

      createddoc.insertBefore($('#loadingnextpage'));
      this.setupmap($('#loadingnextpage').prev());

    }


    $("#loadingnextpage").hide(); //turn off
    $(window).clearQueue();

  },
  overviewpagehandler: function(){
	self=this;
	var href=$(self).attr('href');
	$('.modal-message ').load(href, function(){
		$('.modal-message .relatedinfrastructure').click(self.overviewpagehandler);
	});

      	return false;
  },
  setupmap: function(htmlelem){


        $(htmlelem).find(".map").not(".map-processed").each(function(idx,elem){

		var datastring=$(elem).attr("data");
		$(elem).addClass("map-processed");

		var data=[];
		if (datastring && datastring.length >0){
			$.each(datastring.split(","), function (idx,val){
				data.push(val.split(" "));
			});
		}

		if (data.length <1){
			$(elem).css("display","none");
			return;
		}
		var map=L.map(elem,{ zoomControl:true }).setView([0,0],0);	
		L.tileLayer( 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
		    subdomains: ['a','b','c']
		}).addTo( map );


		$.each(data, function(idx,box){
			if (box.length==2){ //marker
				var lat=parseFloat(box[1]);
				var lon=parseFloat(box[0]);		
				L.marker([lat,lon]).addTo(map);
			}else if (box.length==4){ //bbox+marker
				var minlat=parseFloat(box[1]);
				var maxlat=parseFloat(box[3]);
				var minlon=parseFloat(box[0]);
				var maxlon=parseFloat(box[2]);
				var lat=minlat+(maxlat-minlat)/2;
				var lon=minlon+(maxlon-minlon)/2;
				if (maxlat-minlat<4 && maxlon-minlon<4)
					L.marker([lat,lon]).addTo(map);
				L.polygon([[minlat,minlon],[minlat,maxlon],[maxlat,maxlon],[maxlat,minlon]]).addTo(map);
			}
		});
		

        });
  },

  template: function (doc) {
    var snippet;
    var snippetlen=300;

//    var description="<i>Abstract missing</i>";
    var description="";


    if (doc.description && doc.description[0])
	description=doc.description[0];


   
    if (description.length > snippetlen) {
      snippet = description.substring(0, snippetlen);
      snippet = snippet.substring(0,snippet.lastIndexOf(" "));
      snippetlen=snippet.length;
      snippet += '<span style="display:none;" class="more">' + description.substring(snippetlen);
      snippet += '</span> <a href="#" class="more">more</a><a href="#" style="display:none;" class="more">less</a>';
    }
    else {
      snippet = description;
    }


    var output = '<div><h2><a class="modalinfrastructure" target="_blank" href="overview.php?id='+doc.id+'">'+ doc.title + '</a></h2>';
    output +='<p class="producttypelinks"/>';
    output += '<p class="clickmore"> <!--<u>Abstract</u>:--> ';
    if (doc.thumbnail)
	    output += '<img style="width:85px;float:right;margin-left:20px;margin-bottom:20px" src="'+ doc.thumbnail +'"/>';

    output += snippet;
    output += '</p></div>';
    if (doc.producttypeicon)
	doc.producttypeicon.sort();
    var facetlinks=this.facetLinks('producttypeicon',doc.producttypeicon);
    var outputdoc=$(output);

    $.each(facetlinks, function(idx,link){

	outputdoc.find('.producttypelinks').append(" &sdot; ");
	outputdoc.find('.producttypelinks').append(link);
	if (idx==facetlinks.length-1)
		outputdoc.find('.producttypelinks').append(" &sdot; ");

    });	
    return outputdoc;
  },
  perPage: function () {
    return parseInt(this.manager.response.responseHeader && this.manager.response.responseHeader.params && this.manager.response.responseHeader.params.rows || this.manager.store.get('rows').val() || 10);
  },
  getOffset: function () {
    return parseInt(this.manager.response.responseHeader && this.manager.response.responseHeader.params && this.manager.response.responseHeader.params.start || this.manager.store.get('start').val() || 0);
  },
  init: function () {

    var self=this;

    $(self.target).html($('<div id="loadingnextpage"><img src="images/ajax-loader.gif"/></div>'));
    $(window).scroll(function(){

	if ($("#loadingnextpage").is(':hidden')){ //it is visible while we are loading
		if (($(document).height() - $(window).height() < $(window).scrollTop()+500)){
			var start=self.getOffset();
			var perpage=self.perPage();
			self.manager.store.get('start').val(start+perpage);
			self.doRequest();
		}
	}
   	$(window).clearQueue();

    });

    $(document).on('click', 'p.clickmore', function () {
	 $(this).find(".more").toggle();
      return false;
    });
  }
});

})(jQuery);
