(function ($) {

AjaxSolr.TagcloudWidget = AjaxSolr.AbstractFacetWidget.extend({
  afterRequest: function () {
    if (this.manager.response.facet_counts.facet_fields[this.field] === undefined) {
      $(this.target).html('no items found in current selection');
      return;
    }

    var maxCount = 0;
    var objectedItems = [];
    for (var facet in this.manager.response.facet_counts.facet_fields[this.field]) {
      var count = parseInt(this.manager.response.facet_counts.facet_fields[this.field][facet]);
      if (count > maxCount) {
        maxCount = count;
      }
      objectedItems.push({ facet: facet, count: count });
    }
    objectedItems.sort(function (a, b) {
      return a.facet < b.facet ? -1 : 1;
    });

   var tagselector=$(this.target).closest(".tagselector");
   var siblingsandself=tagselector.siblings().andSelf();
   var width=0
   var widthelems=0;

   $.each(siblingsandself,function(idx,elem){
	if ($(elem).is(':visible'))
		width+=$(elem).width();
   });

   if (objectedItems.length==0){
	tagselector.hide();
   }else{
	tagselector.show();
   }

   $.each(siblingsandself,function(idx,elem){
	if ($(elem).is(':visible'))
		widthelems+=1;
   });

   width=width/widthelems;

   $.each(siblingsandself,function(idx,elem){
	if ($(elem).is(':visible')){
		$(elem).width(width);
	}else{
		$(elem).width(0);
	}
   });

    $(this.target).empty();
    for (var i = 0, l = objectedItems.length; i < l; i++) {
      var facet = objectedItems[i].facet;
      $(this.target).append(
        $('<a href="#" class="tagcloud_item"></a>')
        .text(facet)
	.attr("title",facet)
        .addClass('tagcloud_size_' + parseInt(objectedItems[i].count / maxCount * 10))
        .click(this.clickHandler(facet))
      );
      if (i<l-1){
         $(this.target).append(
          $('<a href="#" class="tagcloud_item sdot">&sdot;</a>').click(function(){return false;})
         );
	    }
    }

    if ($(this.target).is(':empty')){
	$(this.target).closest('div.clear').hide();
    }else{
	$(this.target).closest('div.clear').show();
    }

  }
});

})(jQuery);
