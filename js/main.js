var Manager;


(function ($) {

  $(function () {

    Manager = new AjaxSolr.Manager({
      proxyUrl: 'http://pmd.gfz-potsdam.de/mesi/proxy/proxy.php'
//      proxyUrl: 'http://localhost/mesi/proxy/proxy.php'
    });

    Manager.addWidget(new AjaxSolr.ResultWidget({
      id: 'result',
      target: '#docs'
    }));

    var fields = ['discipline', 'producttype','mesiliclass'];
    for (var i = 0, l = fields.length; i < l; i++) {
      Manager.addWidget(new AjaxSolr.TagcloudWidget({
        id: fields[i],
        target: '#' + fields[i],
        field: fields[i]
      }));
    }


    Manager.addWidget(new AjaxSolr.CurrentSearchWidget({
      id: 'currentsearch',
      target: '#selection',
      mask:['-type:text']
    }));
    Manager.addWidget(new AjaxSolr.AutocompleteWidget({
      id: 'text',
      target: '#search',
      fields:  ['section', 'shortname','person', 'datatype']
    }));

    Manager.addWidget(new AjaxSolr.GCMDWidget({
      id: 'section',
      target: '#section',
      fields:  ['section']
    }));


    Manager.init();
    Manager.store.addByValue('q', '*:*');
    
    var tokens;
    var re=/[?&]?([^=]+)=([^&]*)/g;
    var q={};
    //set URL parameters
    while (tokens = re.exec(document.location.search)){
            Manager.store.addByValue(decodeURIComponent(tokens[1]), decodeURIComponent(tokens[2]));
    }

    var params = {
      facet: true,
      'facet.field':  ['section','discipline','producttype','mesiliclass'],
      'facet.limit': 30,
      'rows':10,
      'facet.mincount': 1,
      'json.nl': 'map',
	'fl' : 'title,description,id,thumbnail,producttypeicon',
       'sort': 'minted desc'
    };
    for (var name in params) {
      Manager.store.addByValue(name, params[name]);
    }
    Manager.doRequest();

  });

  $.fn.showIf = function (condition) {
    if (condition) {
      return this.show();
    }
    else {
      return this.hide();
    }
  }

})(jQuery);
