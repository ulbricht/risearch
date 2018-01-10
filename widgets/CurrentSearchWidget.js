(function ($) {

AjaxSolr.CurrentSearchWidget = AjaxSolr.AbstractWidget.extend({
  start: 0,

  beforeRequest: function () {
    var q = this.manager.store.get('q').val();
    if (q.slice(-1) != '*')
       q=q+"*";
    if (q.slice(0,1) != '*')
       q="*"+q;
    this.manager.store.get('q').val(q);

  },
  afterRequest: function () {
    var self = this;
    var links = [];
    var closesym = [];

    var permalink="";
    var q = this.manager.store.get('q').val();
    if (q != '*:*') {
      links.push($('<a href="#"></a>').text(q).click(function () {
        self.manager.store.get('q').val('*:*');
	self.manager.store.get('start').val(0);
        self.doRequest();
        return false;
      }));
      closesym.push($('&nbsp;<b>x</b>').click(function () {
        self.manager.store.get('q').val('*:*');
	self.manager.store.get('start').val(0);
        self.doRequest();
        return false;
      }));

      permalink+="?q="+encodeURI(q);
    }

    var fq = this.manager.store.values('fq');
    for (var i = 0, l = fq.length; i < l; i++) {
      if (this.mask && this.mask.indexOf(fq[i]) < 0 ){
	if (permalink.length>0)
		permalink+="&fq="+encodeURI(fq[i]);
	else
		permalink+="?fq="+encodeURI(fq[i]);
	var selname=fq[i].replace("_facet:",":");
	if (selname.startsWith("datacentre:"))
		selname='datacentre:"'+selname.substr(selname.indexOf("-")+2);
        links.push($('<a href="#"></a>').text(selname).attr('title',"remove "+selname).click(self.removeFacet(fq[i])));
	closesym.push($('&nbsp;<b>x</b>').click(self.removeFacet(fq[i])));
	}
    }

    permalink=window.location.protocol+"//"+window.location.host+window.location.pathname+permalink;
    $(this.target).closest('div').find("#permalink").html('(<a href="'+permalink+'">Link</a>)');

    if (links.length > 1) {
      links.unshift($('<a id="selectionremoveall" href="#" title="clear selection" "></a>').html('remove&nbsp;all').click(function () {
	self.manager.store.get('q').val('*:*');
	self.manager.store.remove('fq');
	self.manager.store.get('start').val(0);
	self.doRequest();
	return false;
  }));
      closesym.unshift($('&nbsp;<b>x</b>').click(function () {
	self.manager.store.get('q').val('*:*');
	self.manager.store.remove('fq');
	self.manager.store.get('start').val(0);
	self.doRequest();
	return false;
  }));
    }

    if (links.length) {
      var $target = $(this.target);
      $target.empty();
      for (var i = 0, l = links.length; i < l; i++) {
        $target.append($('<li></li>').append(links[i]).append(closesym[i]));
      }
      $(this.target).closest('div').show();

    }
    else {
      $(this.target).html('<li>Viewing all documents!</li>');
      $(this.target).closest('div').hide();
    }
  },
  removeFacet: function (facet) {
    var self = this;
    return function () {
      if (self.manager.store.removeByValue('fq', facet)) {
	self.manager.store.get('start').val(0);
        self.doRequest();
      }
      return false;
    };
  }
});

})(jQuery);
