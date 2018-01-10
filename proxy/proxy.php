<?php

/**
 *
 * The solr_proxy_main() function was copied from https://gist.github.com/jpmckinney/2123215 to parse the
 * parameters of the SOLR API. This script has been modified - specifically the search function - to 
 * connect to a MySQL database instead of SOLR instance to retrieve data.   
 * 
 */


error_reporting(E_ALL ^ E_NOTICE);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");

solr_proxy_main();

/**
 * Executes the Solr query and returns the JSON response.
 */
function solr_proxy_main() {

  if (isset($_POST['query'])) {
    $params = array();
    $keys = '';
    $core = '';

    // The names of Solr parameters that may be specified multiple times.
    $multivalue_keys = array('bf', 'bq', 'facet.date', 'facet.date.other', 'facet.field', 'facet.query', 'fq', 'pf', 'qf');

    $pairs = explode('&', $_POST['query']);
    foreach ($pairs as $pair) {
      list($key, $value) = explode('=', $pair, 2);
      $value = urldecode($value);
      if (in_array($key, $multivalue_keys)) {
        $params[$key][] = $value;
      }
      elseif ($key == 'q') {
        $keys = $value;
      }
      elseif ($key == 'core') {
        $core = "$value/";
      }
      else {
        $params[$key] = $value;
      }
    }

    try {

      $response = search($keys, $params['start'], $params['rows'], $params);
    }
    catch (Exception $e) {
      die($e->__toString());
    }

    print $response;
  }
}

function facetsql($fq){

	$ret=array();
	$ret["sql"]="";
	$ret["param"]=array();
	$count=0;

	if ($fq){
		foreach ($fq as $facet){
			if (!preg_match("/-geo:\[(.+),(.+)\ TO\ (.+),(.+)\]/",$facet) && !preg_match("/^\(geo:\[(.+),(.+)\ TO\ (.+),(.+)\]/",$facet)){

				if (strlen($ret["sql"])>0){
					$ret["sql"].= " AND id IN ";
				}
				$ret["sql"].=" ( SELECT DISTINCT(id) FROM mesi WHERE ";
				if (strpos($facet,"-")===0){
					list($label,$value)=explode(":",substr($facet,1),2);
					$ret["sql"].=" label = :fqname$count AND value <> :fqvalue$count ";
					$ret["param"][":fqname$count"]=$label;
					$ret["param"][":fqvalue$count"]=trim($value,'"');
				}else{
					list($label,$value)=explode(":",$facet,2);

					$likevalue=preg_replace("|\*|","%",$value);
					if ($value===$likevalue){
						$ret["sql"].=" label = :fqname$count AND value = :fqvalue$count ";
						$ret["param"][":fqname$count"]=$label;
						$ret["param"][":fqvalue$count"]=trim($value,'"');
					}else{
						$ret["sql"].=" label = :fqname$count AND value LIKE :fqvalue$count ";
						$ret["param"][":fqname$count"]=$label;
						$ret["param"][":fqvalue$count"]=trim($likevalue,'"');
					}
				}
				$count++;
			}
		}
		foreach ($fq as $facet){
			$ret["sql"].=" ) ";
		}
	}
	return $ret;

}

function searchsql($q){

	$ret=array();
	$ret["sql"]="";
	$ret["param"]=array();
	$count=0;
	if ($q && $q!="*:*" && $q!="*"){

		$ret["sql"].=" ( SELECT DISTINCT(id) FROM mesiid WHERE mesiid.fulltext LIKE :qvalue OR  MATCH (mesiid.fulltext) AGAINST ( :qvalue ) )";
		$q=strtolower($q);

//do word stemming
		$q=str_replace("analogue", "analog*",$q);
		$q=str_replace("modelling", "model*",$q);
		$q=str_replace("modeling", "model*",$q);
		$q=str_replace("catalogue", "catalog*",$q);
		$q=str_replace("center", "cent*t*",$q);
		$q=str_replace("centre", "cent*t*",$q);
		$q=str_replace("services", "service*",$q);

		$ret["param"][":qvalue"]=preg_replace("|\*|","%",$q);

	}
	return $ret;
}



function flwhereclause($facetlist){

	$ret["sql"]="";
	$ret["param"]=array();

	$flparams=array();
	$flcount=0;
	$fls=explode(",",$facetlist);

	foreach ($fls as $fl){
		if ($flcount > 0){
			$ret["sql"].=" OR ";
		}
		$ret["sql"].=" label = :fl$flcount";
		$ret["param"][":fl$flcount"]=$fl;
		$flcount++;
	}

	if (strlen($ret["sql"])>0){
		$ret["sql"]=" ( ".$ret["sql"]." ) ";
	}else{
		$ret["sql"]=" ( true ) ";
	}

	return $ret;

}

function facetcount ($db,$fields,$limit,$facetsql,$searchsql){
	$sql["sql"]="";
	$count=0;
	$sql["param"]=array();

	$innersql="";
	if (strlen($facetsql["sql"])>0){
		$innersql.=" AND mesi.id IN ( ".$facetsql["sql"]." ) ";
	}
	if (strlen($searchsql["sql"])>0){
		$innersql.=" AND mesi.id IN ( ".$searchsql["sql"]." ) ";
	}

	foreach ($fields as $field){
		if (strlen($sql["sql"])>0)
			$sql["sql"].=" UNION ";
		$sql["sql"].="( ";
		$sql["sql"].="SELECT value, COUNT(value) AS count,label FROM mesi WHERE label= :facetlabel$count $innersql";
		$sql["sql"].=" GROUP BY value ORDER BY count DESC ";
		if ($limit && intval($limit)>=0){
			$sql["sql"].= sprintf (" limit %d ", intval($limit));
		}
		$sql["sql"].=" )";

		$sql["param"][":facetlabel$count"]=$field;
		$count++;
	}
	$sql["param"]=array_merge($sql["param"], $facetsql["param"],$searchsql["param"]);

	$sth=$db->prepare($sql["sql"]);
	$sth->execute($sql["param"]);
	$res=$sth->fetchall();
	$facetresult=array();
	foreach($res as $row){
		$facetresult[$row["label"]][$row["value"]]=intval($row["count"]);
	}

	return $facetresult;
}


function resultcount($db,$facetsql,$searchsql){

	$innersql="";

	if (strlen($facetsql["sql"])>0 || strlen($searchsql["sql"])){
		$innersql.=" WHERE ";
	}
	if (strlen($facetsql["sql"])>0){
		$innersql.=" id IN ( ".$facetsql["sql"]." ) ";
	}
	if (strlen($facetsql["sql"])>0 && strlen($searchsql["sql"])){
		$innersql.=" AND ";
	}
	if (strlen($searchsql["sql"])>0){
		$innersql.=" id IN ( ".$searchsql["sql"]." ) ";
	}

	$countsql="SELECT COUNT(DISTINCT(id)) AS count FROM mesi $innersql ";
	$sth=$db->prepare($countsql);
	$sth->execute(array_merge($facetsql["param"],$searchsql["param"]));
	$res=$sth->fetchall();

	$resultcount=0;
	if ($res && $res[0] && $res[0]["count"])
		$resultcount=intval($res[0]["count"]);

	return $resultcount;

}

function docresults($db,$start,$rows,$facetsql,$searchsql,$flwhere){

	$innersql="";
	if (strlen($facetsql["sql"])>0 || strlen($searchsql["sql"])>0){
		$innersql.=" mesi.id IN ( SELECT id FROM ( ";

		$innersql.=" SELECT id FROM mesiid WHERE ";

		if (strlen($facetsql["sql"])>0){
			$innersql.=" id IN ".$facetsql["sql"];
		}

		if (strlen($facetsql["sql"])>0 && strlen($searchsql["sql"])>0){
			$innersql.=" AND ";
		}
		if (strlen($searchsql["sql"])>0){
			$innersql.=" id IN ".$searchsql["sql"];
		}
		$innersql.=sprintf(" LIMIT %d, %d ",intval($start),intval($rows));
		$innersql.=" ) t  ) AND ";
	}else{
		$innersql.=" mesi.id IN ( SELECT id FROM (( SELECT DISTINCT(id) FROM ";
		$innersql.=" mesi ) ";
		$innersql.=" ORDER BY id ASC ";
		$innersql.=sprintf(" LIMIT %d, %d ",intval($start),intval($rows));
		$innersql.=" ) t  ) AND ";
	}

	$docsql=array();

	if (strlen($searchsql["sql"])>0){
		$docsql["sql"]=" SELECT mesi.id as mesiid, label, value, multi, minlat, maxlat, minlon, maxlon "  ;
		$docsql["sql"].=" , MATCH (mesiid.fulltext) AGAINST ( :qvalue ) as relevance ";
		$docsql["sql"].=" FROM mesi join mesiid on mesi.id=mesiid.id WHERE $innersql ".$flwhere["sql"];
		$docsql["sql"].=" ORDER BY relevance DESC, mesiid ASC";
	}else{
		$docsql["sql"]=" SELECT mesi.id as mesiid, label, value, multi, minlat, maxlat, minlon, maxlon "  ;
		$docsql["sql"].=" FROM mesi WHERE $innersql ".$flwhere["sql"];
	}

	$docsql["param"]=array_merge($facetsql["param"],$searchsql["param"],$flwhere["param"]);

	$sth=$db->prepare($docsql["sql"]);
	$sth->execute($docsql["param"]);
	$res=$sth->fetchall();

	$docresultrows=array();
	$docresultgeos=array();
	foreach($res as $row){
		if  ($row["multi"]=="1"){
			$docresultrows[$row["mesiid"]][$row["label"]][]=$row["value"];
		}else{
			$docresultrows[$row["mesiid"]][$row["label"]]=$row["value"];
		}
		
		if (strlen($row["minlat"])>0 && strlen($row["maxlat"])>0 && strlen($row["minlon"])>0 && strlen($row["maxlon"])>0){
			if ($row["minlat"] === $row["maxlat"] && $row["minlon"] === $row["maxlon"]){
				$docresultgeos[$row["mesiid"]][]= $row["minlon"]." ".$row["minlat"];
			}else{
				$docresultgeos[$row["mesiid"]][]= $row["minlon"]." ".$row["minlat"]." ".$row["maxlon"]." ".$row["maxlat"];
			}
		}
	}
	$docresults=array();
	foreach ($docresultrows as $mesiid=>$result){
		if (isset($docresultgeos[$mesiid])){
			$result["geo"]=$docresultgeos[$mesiid];
		}
		$docresults[]=$result;
	}


	return $docresults;
}

function search ($keys, $start, $rows, $params){



	$timebeforequery = microtime(true);


	if (!isset($start)){
		 $start=0;
	}
	if (!isset($rows)){
		$rows=10;
	}

	$dsn="mysql:host=mydbhost;dbname=dbname";
	$db= new PDO($dsn, "user", "password");



	$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

	$facetsql=facetsql($params["fq"]);
	$searchsql=searchsql($keys);

	$facetcount=facetcount ($db,$params["facet.field"],$params["facet.limit"],$facetsql,$searchsql);

	$resultcount=resultcount($db,$facetsql,$searchsql);

	$flwhere=flwhereclause($params["fl"]);

	if ($start <= $resultcount){
		$docresults=docresults($db,$start,$rows,$facetsql,$searchsql,$flwhere);
	}else{
		$docresults=array();
	}
	$timeafterquery = microtime(true)-$timebeforequery;

	$empty=array();

	$response=array("responseHeader"=>array("status"=>0,
						"QTime"=>intval(1000*$timeafterquery)),
			"response"=>array("numFound"=>$resultcount, 
					  "start"=>$start,
					  "docs"=> $docresults), 
			"facet_counts"=>array(	"facet_queries"=>$empty,
					      	"facet_fields"=>$facetcount,
						"facet_dates"=>$empty,
						"facet_ranges"=>$empty)
			);

	if ($params["json.wrf"]==="?")
		echo "?(".json_encode($response).")";
	else
		echo json_encode($response);
}
?>
