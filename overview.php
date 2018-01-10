<?php

//ini_set("display_errors",1);

$fields="title,description,id,logo,person,cmsurl,_cache_ispartof,_cache_haspart,_cache_related,projecturl,datagfz,dataext,datatype,service,section_and_id";

$docs=solrquery("id:".$_REQUEST["id"],$fields);
$contacts=array();

foreach ($docs["person"] as $person){
	$email=trim($person);
	$email=str_replace(" ",".",$email);
	$email=str_replace("ä","ae",$email);
	$email=str_replace("ö","oe",$email);
	$email=str_replace("ü","ue",$email);
	$email=strtolower($email);
	$email=$email."@gfz-potsdam.de";
	$contacts[]='<a href="mailto:'.$email.'">'.$person.'</a>';
}


if (strlen($docs["logo"])>10)
	echo "<img class=\"logo\" src=\"".$docs["logo"]."\"/>";

echo '<h2 class="caption">'.$docs["title"].'</h2>

	<div class="table">';
	echo '<div class="tablerow">';
	echo'<div class="tablecell caption">Description</div>
		<div class="tablecell hyphenate content" lang="en-GB">'.printarray($docs["description"],"-"," ").'</div></div>';
	if (count($docs["datatype"])>0){
	    echo'<div class="tablerow"><div class="tablecell caption">Type of Data</div>
		<div class="tablecell hyphenate content" lang="en-GB">'.printarray($docs["datatype"],"",", ").'</div></div>';
	}
	if (strlen($docs["service"])>0){
	    echo'<div class="tablerow"><div class="tablecell caption">Services</div>
		<div class="tablecell hyphenate content" lang="en-GB">'.$docs["service"].'</div></div>';
	}
	if (count($contacts)>0){
	    echo '<div class="tablerow">
		<div class="tablecell caption">Contact</div>
		<div class="tablecell content">'.printarray($contacts,"-",", ").'</div></div>';
	}

	if (count($docs["section_and_id"])>0){
	    echo '    
	    <div class="tablerow">
		<div class="tablecell caption">Sections</div>
		<div class="tablecell hyphenate content" lang="en-GB">'.printarray($docs["section_and_id"],"-",", ").'</div>
	    </div>';
	}
	$links="<ul>";
		if (strlen($docs["cmsurl"])>10)
			$links.='<li>GFZ Homepage: '.printurl($docs["cmsurl"]." ".$docs["title"]).'</li>';
		if (strlen($docs["projecturl"])>10)
			$links.='<li>Project Homepage: '.printurl($docs["projecturl"]).'</li>';
		if (count($docs["_cache_ispartof"])>0)
			$links.='<li>Higher category: '.printarray($docs["_cache_ispartof"],"",", ").'</li>';
		if (count($docs["_cache_haspart"])>0)
			$links.='<li>Sub-modules: '.printarray($docs["_cache_haspart"],"",", ").'</li>';
		if (count($docs["_cache_related"])>0)
			$links.='<li>Related infrastructure: '.printarray($docs["_cache_related"],"",", ").'</li>';

		$data=array_merge($docs["datagfz"],$docs["dataext"]);
		if (count($data)>0)
			$links.='<li class="breakall">Data access: '.printurls($data).'</li>';
	$links.="</ul>";

	if (count($data)>0 || count($docs["_cache_related"])>0 || count($docs["_cache_ispartof"])>0 || count($docs["_cache_haspart"])>0 || strlen($docs["projecturl"])>10 || strlen($docs["cmsurl"])>10){
	    echo '   <div class="tablerow">
		<div class="tablecell caption">Links</div>
		<div class="tablecell content">'.$links.'
		</div>
	    </div>';
	}
echo '</div>';


return;




function printurls($links){
	$ret="";
	foreach ($links as $link){
		if (strlen($ret)>0)
			$ret.=", ";
		$ret.=printurl($link);
	}
	return $ret;
}

function printurl($links){

	$ret="";

	$link=$links;
	$pos= strpos($link," ");
	if ($pos!== false){
		$url= substr($link,0,$pos);
		$text= substr($link,$pos);
	}else{
		$url=$link;
		$text=$link;
	}

	$ret.='<a target="_blank" href="'.$url.'">'.$text.'</a>';


	return $ret;
}

function solrquery($facet,$fields){
	$postdata = http_build_query(
	    array(
		'query' => "?facet=true&q=*:*&fq=$facet&facet.field=id&facet.limit=20&rows=10&facet.mincount=1&json.nl=map&fl=$fields"
	    )
	);
	$opts = array('http' =>
	    array(
		'method'  => 'POST',
		'header'  => 'Content-type: application/x-www-form-urlencoded',
		'content' => $postdata
	    )
	);
	$context  = stream_context_create($opts);
	$queryresult = file_get_contents("http://dataservices.gfz-potsdam.de/mesi/proxy/proxy.php", false, $context);

	$solrresponse=json_decode($queryresult);
	$response=$solrresponse->{'response'};
	$docs=$response->{'docs'};
	$ret=array();

	foreach ($docs as $doc){
		foreach (preg_split("/,/",$fields) as $key){
			if (isset($doc->{$key}))
				$ret[$key]=$doc->{$key};
		}
	}
	return $ret;
}

function printarray($array,$emptytext,$delimiter){
    $ret="";
    foreach ($array as $text){
	if (strlen($ret)>0)
		$ret.=$delimiter;

	$ret.=$text;
    }
    if (strlen($ret)==0)
	$ret.=$emptytext;

    return $ret;
}

?>







