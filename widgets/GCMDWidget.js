(function ($) {

AjaxSolr.GCMDWidget = AjaxSolr.AbstractTextWidget.extend({

  init: function(){
    var self=this;
    $(self.target).fancytree({

	checkbox:true,
	source:{"title": "Folder 2", "key": "2", "folder": true, "children": []},
	select: function(event,data) {
		self.requestSent = true;
		if (!data.node.isSelected()){
		      if (self.manager.store.removeByValue('fq', data.node.data.field + ':' + AjaxSolr.Parameter.escapeValue(data.node.key))) {
			self.manager.store.get('start').val(0);
			self.doRequest();
		      }
		}else{
			self.manager.store.addByValue('fq', data.node.data.field + ':' + AjaxSolr.Parameter.escapeValue(data.node.key));
		}

		self.doRequest();
	},
	extensions: ["filter"],
	filter: {  
	    counter: false, 
	    mode: "hide",
	    autoExpand: true  
	},
	init: function(event,data){
		var nodes=data.tree.getSelectedNodes();
		$.each(nodes, function(i,node){
			while (node){
				node.setExpanded();
				node=node.parent;
			}
		});
	}
    });


    $("input[name=filtergcmd]").keyup(function(e){
		var tree = $(self.target).fancytree('getTree');

		match = $(this).val();

		if(e && e.which === $.ui.keyCode.ESCAPE || $.trim(match) === ""){
			tree.clearFilter();
			return;
		}

		tree.filterNodes.call(tree, match, tree.options.filter);

	}).focus();
  },
  callback: function (response) {

	var self=this;

	if (!self.expandedlist)
	   self.expandedlist={};

	$(self.target).fancytree('getTree').visit(function(node){
		self.expandedlist[node.key]=node.isExpanded();
	});

	var keys={};
	var selpath={};

	var fq = self.manager.store.values('fq');

	self.lastquery_q = self.manager.store.get('q').val();
	self.lastquery_fq = fq;

	//find the selection
	for (var i = 0, l = fq.length; i < l; i++) {
		var selname=fq[i];
		selname=selname.substring(selname.indexOf(":")+1);
		selname=selname.substring(1,selname.length-1);
		selpath[selname]=selname;
	}

	var parents={};
	//create flat list of tree elements
	for (var i = 0; i < self.fields.length; i++) {
		var field = self.fields[i];
		var delimiter=" > ";
		for (var facet in response.facet_counts.facet_fields[field]) {
		  var count=parseInt(response.facet_counts.facet_fields[field][facet])
  		  var parent=facet.substring(facet.lastIndexOf(delimiter),-1);
 		  if (parent.length<1) 
			parent=null;
		  var title=facet.substring(facet.lastIndexOf(delimiter)+1);
		  if (title.substring(0,2)=="> ")
		     title=title.substring(2);
		  keys[facet]={
		    "field": field,
		    "key": facet,
		    "count": count,
		    "parent": parent,
		    "folder": true,
		    "title": title//+" ("+count+")"
		  };

		 if (facet in selpath)
			keys[facet].selected=true;
		 if (facet in self.expandedlist)
			keys[facet].expanded=self.expandedlist[facet];
		  if (parent)
			parents[parent]=true;
		}
	}

	//leafs are not parent
	$.each(keys,function(idx,elem){
		if (!(elem.key in parents))
			elem.folder=false;
	});

	parents=null;

	//build tree from flat structure
	var childlist=$.map(keys, function(c){
	if (c.parent){
		var parent=keys[c.parent];
		if (parent.children){
			parent.children.push(c);
		}else{
			parent.children = [c]
		}
		return null;
	}
	return c;
	});

	//sort by title
	$.each(childlist, function(i, c){
		if( c.children && c.children.length > 1 ) {
		    c.children.sort(function(a, b){
			return ((a.title < b.title) ? -1 : ((a.title > b.title) ? 1 : 0));
		    });
		}
	});

	var tree= {"title": "Folder 2", "key": "2", "folder": true, "children": []};
	for (var child in childlist)
		tree.children.push(childlist[child]);

	$(self.target).fancytree('getTree').reload(tree);

    }, // end callback
  afterRequest: function () {

    var self = this;

    var thisquery_q = self.manager.store.get('q').val();
    var thisquery_fq = self.manager.store.values('fq');


    if (self.lastquery_q === thisquery_q && self.lastquery_fq.length === thisquery_fq.length)
	return;

    var params = [ 'rows=0&facet=true&facet.limit=-1&facet.mincount=1&json.nl=map' ];
    for (var i = 0; i < self.fields.length; i++) {
      params.push('facet.field=' + self.fields[i]);
    }
    var values = self.manager.store.values('fq');
    for (var i = 0; i < values.length; i++) {
      params.push('fq=' + encodeURIComponent(values[i]));
    }
    params.push('q=' + self.manager.store.get('q').val());

    if (self.manager.proxyUrl){
	var options = {dataType: 'text'};
        options.url = self.manager.proxyUrl;
        options.data = {query: params.join('&') + '&wt=json&json.wrf=?'};
	options.type = 'POST';
	$.ajax(options).done(function(response){
	    var start=response.indexOf("(")+1;
	    var end=response.lastIndexOf(")");
  	   self.callback($.parseJSON(response.substring(start,end)));

	}).fail(function( jqxhr, textStatus, error ) {
	    var err = textStatus + ", " + error;
	    console.log( "Request Failed: " + err );
	});

    }else{
    	$.getJSON(self.manager.solrUrl + 'select?' + params.join('&') + '&wt=json&json.wrf=?', {}, callback);
    }
  }
});

})(jQuery);
