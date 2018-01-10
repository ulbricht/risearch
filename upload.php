<?php

ini_set("display_errors",1);

$sectiontree=array();


// this array is used to convert a section number to section name and department name
$sectiontree["1.1"]=array("Sectionname","Departmentname");
$sectiontree["1.2"]=array("Sectionname","Departmentname");
$sectiontree["1.3"]=array("Sectionname","Departmentname");
$sectiontree["1.4"]=array("Sectionname","Departmentname");
$sectiontree["1.5"]=array("Sectionname","Departmentname");



if (!isset($_FILES['mesi']) && !isset($_FILES['mesi']['tmp_name'])){

	echo ' <form action="upload.php" method="post" enctype="multipart/form-data">
	<input type="file" name="mesi"><br>
	<input type="submit" value="upload">
	</form>
	';


}else{

	$dsn="mysql:host=dbhost;dbname=dbname";
	$dbo= new PDO($dsn, "user", "password");

	$dbo->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);

	cleardb($dbo);
	processfile($dbo, $_FILES['mesi']['tmp_name'],$sectiontree);
	createcache($dbo);
	fulltextcache($dbo);
	unlink($_FILES['mesi']['tmp_name']);
	echo "done";
}

return;

function cleardb($dbo){
	echo "clearing database <br>\n";
	$sth=$dbo->prepare("DELETE FROM mesiid; DELETE FROM mesidata; DELETE FROM mesigeo");
	$sth->execute(array());
	$sth->closeCursor();
}

function processfile($dbo, $filename,$sectiontree){

	$handle=fopen($filename,"r");
	fgetcsv($handle); //skip header

	echo "processing ";

	while ($line=fgetcsv($handle)){


		$values=processline($line,$sectiontree);

		if (count($values)==0)
			continue;

		$id=$values["id"][0];

		$sql1="INSERT INTO mesiid (idname) SELECT :id FROM DUAL WHERE NOT EXISTS (SELECT * FROM mesiid WHERE mesiid.idname= :id)";
		$sth1=$dbo->prepare($sql1);
		$sth1->execute(array("id"=>$id));
		$sth1->closeCursor();

		$fill=" INSERT INTO mesidata (mesiid,type,value) ";
		$fill.=" SELECT mesiid.id,mesitype.id,:value FROM mesiid,mesitype WHERE mesiid.idname=:id AND mesitype.label=:label ";
		$fill.="  AND NOT EXISTS ";
		$fill.="   (SELECT * FROM mesidata JOIN mesiid ON mesidata.mesiid = mesiid.id ";
		$fill.="                           JOIN mesitype ON mesidata.type = mesitype.id ";
		$fill.="                           WHERE mesiid.idname = :id AND mesitype.label = :label AND mesidata.value = :value)";
		$sth2=$dbo->prepare($fill);
		foreach ($values as $key=>$val)
			foreach ($val as $entity){
				$entity=trim($entity);
				$sth2->execute(array("value"=>$entity,"id"=>$id,"label"=>$key));
				$sth2->closeCursor();
			}


	
	echo ".. $id ";


	}
	fclose($handle);

	echo ".. done. <br>\n";
}
function processline($line,$sectiontree){
        $values=array();

	$id=$line[0];

	if (strlen($id)==0)
		return $values;

	$values["id"]=array($id);

	if (strlen($line[2])>0){
		$values["discipline"]=preg_split("/;/",$line[2]);
	}

	if (strlen($line[3])>0)
		$values["mesiliclass"]=preg_split("/;/",$line[3]);

	if (strlen($line[4])>0){
		$values["producttype"]=preg_split("/;/",$line[4]);
	}

	if (strlen($line[5])>0){
		$values["producttypeicon"]=preg_split("/;/",$line[5]);
	}

	if (strlen($line[6])>0)
		$values["related"]=preg_split("/;/",$line[6]);

	if (strlen($line[7])>0)
		$values["ispartof"]=preg_split("/;/",$line[7]);

	if (strlen($line[8])>0)
		$values["shortname"]=array($line[8]);

	$values["title"]=array($line[9]);

	if (strlen($line[10])>0)
		$values["person"]=preg_split("/;/",$line[10]);

	$values["section"]=array();
	$values["section_and_id"]=array();
	if (strlen($line[11])>0){
	    foreach (preg_split("/;/",$line[11]) as $section){
		$section=trim($section);
		$values["section"]=array_merge($values["section"],$sectiontree[$section]);
		array_push($values["section_and_id"],$sectiontree[$section][0]." ($section)");
	    }
	}
	$values["department"]=array();
	if (strlen($line[11])>0){
	    foreach (preg_split("/;/",$line[11]) as $dep){
		$dep=trim($dep);
		$values["department"][]=$sectiontree[$dep][1];
	    }
	}
	$values["section"]=array_unique($values["section"]);

	if (strlen($line[13])>0){
		$values["cmsurl"]=array("http://www.gfz-potsdam.de/index.php?id=".$line[13].$line[14]);
	}else if (strlen($line[15])>0){
		$values["cmsurl"]=array($line[15]);
	}

	if (strlen($line[16])>0){
		$values["projecturl"]=preg_split("/;/",$line[16]);
	}

	if (strlen($line[17])>0){
		$values["datagfz"]=preg_split("/;/",$line[17]);
	}

	if (strlen($line[18])>0){
		$values["dataext"]=preg_split("/;/",$line[18]);
	}

	if (strlen(trim($line[19]))>0)
		$values["service"]=array($line[19]);


	if (strlen($line[20])>0){
		$values["datatype"]=preg_split("/;/",$line[20]);
	}

	if (strlen($line[21])>0){
		$values["gfzdiscipline"]=preg_split("/;/",$line[21]);
	}

	if (strlen($line[23])>0)
		$values["description"]=array($line[23]);

	if (strlen($line[25])>10)
		$values["thumbnail"]=array($line[25]);
	
	if (strlen($line[26])>10)
		$values["logo"]=array($line[26]);


	return $values;
}

function fulltextcache($dbo){

	$sth=$dbo->prepare("SELECT mesiid.idname, mesi.value from mesi join mesiid on mesi.id=mesiid.id and mesi.label<>'id' and mesi.search<>0");
	$sth->execute();

	$cache=array();

	while ($row=$sth->fetch()){
		$cache[$row["idname"]][]=$row["value"];
	}
	
	$fulltext=array();
	foreach ($cache as $key=>$value)
		$fulltext[$key]=implode(" ",$value);
		
	$sth=$dbo->prepare("UPDATE mesiid SET mesiid.fulltext=:fulltext WHERE mesiid.idname=:id");
	foreach ($fulltext as $key=>$value){
		$param=array("fulltext"=>strtolower($value),"id"=>$key);
		$sth->execute($param);
		$sth->closeCursor();
	}
}

function createcache($dbo){


	$sql="
		SELECT m1.value AS id,m6.value AS shortname, m2.label AS relation, m2.value AS relatedshortname, m4.value AS relatedid ,m5.value as relatedtitle
		FROM  mesi m1 
		JOIN mesi m6 ON m1.id=m6.id AND m6.label='shortname'
		JOIN mesi m2 ON m1.id=m2.id AND m2.label IN ('related','haspart','ispartof')
		LEFT JOIN mesi m3 ON m3.value=m2.value AND m3.label='shortname' 
		LEFT JOIN mesi m4 ON m3.id=m4.id AND m4.label='id'
		LEFT JOIN mesi m5 ON m3.id=m5.id AND m5.label='title'
		WHERE m1.label='id'

		";


	$sth=$dbo->prepare($sql);

	$fill=" INSERT INTO mesidata (mesiid,type,value) ";
	$fill.=" SELECT mesiid.id,mesitype.id,:value FROM mesiid,mesitype WHERE mesiid.idname=:id AND mesitype.label=:label ";
	$fill.="  AND NOT EXISTS ";
	$fill.="   (SELECT * FROM mesidata JOIN mesiid ON mesidata.mesiid = mesiid.id ";
	$fill.="                           JOIN mesitype ON mesidata.type = mesitype.id ";
	$fill.="                           WHERE mesiid.idname = :id AND mesitype.label = :label AND mesidata.value = :value)";
	$sthfill=$dbo->prepare($fill);

	$sth->execute();

	echo "writing missing relations .. ";

	$relations=array();
	while ($row=$sth->fetch()){
		if ( strlen($row["relatedid"])>0) //we add the missing links - the related entity must exist
		$relations[$row["relation"]][]=array("relatedid"=>$row["relatedid"],"shortname"=>$row["shortname"]);
	}
	$sth->closeCursor();

	if (isset($relations["haspart"])){
		foreach ($relations["haspart"] as $related){
			$id= $related["relatedid"];
			$value= $related["shortname"];
			$sthfill->execute(array("value"=>$value,"id"=>$id,"label"=>"ispartof"));
			$sthfill->closeCursor();

		}
	}
	if (isset($relations["ispartof"])){
		foreach ($relations["ispartof"] as $related){
			$id= $related["relatedid"];
			$value= $related["shortname"];
			$sthfill->execute(array("value"=>$value,"id"=>$id,"label"=>"haspart"));
			$sthfill->closeCursor();
		}
	}


	echo "reading links .. ";

	$cache=array();
	$sth->execute();
	while ($row=$sth->fetch()){

		if (isset($row["relatedid"]) && isset($row["relatedtitle"]))
			$link='<a class="modalinfrastructure" href="overview.php?id='.$row["relatedid"].'">'.$row["relatedshortname"].'</a>';
		else
			$link=$row["relatedshortname"];

		$idx="_cache_".$row["relation"];
		$cache[$idx][]=array("id"=>$row["id"],"link"=>$link);

	}
	$sth->closeCursor();

	echo "writing links .. ";

	foreach ($cache as $relation=>$entities){
		foreach ($entities as $entity){
			$id= $entity["id"];
			$value=$entity["link"];
			$label=$relation;
			$sthfill->execute(array("value"=>$value,"id"=>$id,"label"=>$label));
			$sthfill->closeCursor();
		}

	}

	echo "done <br>\n";

}

?>
