# risearch
*AJAX-SOLR frontend to the a mySQL database using an adapter implementing a subset of the SOLR API
*The mySQL-SOLR-API adapter is proxy/proxy.php and uses the view MESI defined in MESI_MySQL.sql for queries. The adapter answers AJAX calls that populate a web page.


#Installation
* git clone https://github.com/evolvingweb/ajax-solr into the root directory
* git clone https://github.com/mar10/fancytree.git into the root directory
* change the connection information for the database in the search function of file proxy/proxy.php; the two lines you have to update are:
  * $dsn="mysql:host=mydbhost;dbname=dbname";
  * $db= new PDO($dsn, "password", "user");
* edit the file js/main.js and point the proxyUrl of AjaxSolr.Manager to your local infrastructure
* copy the root directory on your web server
* upload MESI_MySQL.sql to your database and populate the database.


#Tables

##MESITYPE
contains an ID, the labels (=solr facets) and defines if a facet can occur multiple times and if it should be used for full-text search

##MESIID
is the table that defines solr documents; it contains an ID, a name and a field that should be used for fulltext search

##MESIDATA
contains the "data" of a facet; the table is made of an ID, the MESIID (i.e. the document), the typeID that links to the facet/label name and the content of the facet in the value attribute

#Views
##MESI
The view assembles the information of the tables in a label-value style. Facetting of results is achieved by nested select statements.
