(function ($) {

AjaxSolr.SubmitWidget = AjaxSolr.AbstractTextWidget.extend({


  init: function(){
	var self=this;
	$(this.target).click(function(){
		var query=$('#query').val()
		if (query.length>0)
		self.manager.store.addByValue('q',query);
		self.doRequest();
	  });
  },
});

})(jQuery);
