
CREATE TABLE IF NOT EXISTS mesitype(
	id int(11) NOT NULL AUTO_INCREMENT,
	label varchar(50) NOT NULL,
	multi boolean NOT NULL,
	search boolean NOT NULL,
	PRIMARY KEY (id)
)
ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
CREATE INDEX mesitype_label  ON mesitype (label);


CREATE TABLE IF NOT EXISTS mesiid(
	id int(11) NOT NULL AUTO_INCREMENT,
	idname varchar(20) NOT NULL,
	`fulltext` text NOT NULL,
	PRIMARY KEY (id)
)
ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
CREATE INDEX mesiid_idname  ON mesiid (idname);
CREATE FULLTEXT INDEX mesiid_value_fulltext  ON mesiid (`fulltext`); 


CREATE TABLE IF NOT EXISTS mesidata(
	id int(11) NOT NULL AUTO_INCREMENT,
	mesiid int(11) NOT NULL,
	type int(11) NOT NULL,
	`value` text NOT NULL,
	PRIMARY KEY (id)
)
ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
CREATE INDEX mesidata_mesiid  ON mesidata (mesiid);
CREATE INDEX mesidata_type  ON mesidata (type);   
CREATE FULLTEXT INDEX mesidata_value_fulltext  ON mesidata (`value`);   


CREATE TABLE IF NOT EXISTS mesigeo(
	id int(11) NOT NULL AUTO_INCREMENT,
        mesiid int(11) NOT NULL,
	minlat double,
	maxlat double,
	minlon double,
	maxlon double,
	PRIMARY KEY (id)
)
ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
CREATE INDEX mesigeo_mesiid  ON mesigeo (mesiid);

INSERT INTO mesitype (label,multi,search) VALUES
("id", true,false),
("related", true,true),
("shortname", true,true),
("title", true,true),
("ispartof", true,true),
("mesiclass", true,true),
("person", true,true),
("cmsurl", true,false),
("description", true,true),
("department", true,false),
("section", true,true),
("projecturl", true,false),
("datagfz", true,false),
("dataext", true,false),
("ismesi", true,true),
("thumbnail", true,true),
("logo", true,true),
("productcategory", true,true),
("service", true,true),
("datatype", true,true),
("internationalconsortium", true,true),
("gfzdiscipline", true,true),
("discipline", true,true),
("_cache_haspart", true,false),
("_cache_ispartof", true,false),
("_cache_related", true,false);


CREATE VIEW mesi AS
SELECT mesidata.mesiid as id, label, value, search, multi, minlat, maxlat, minlon, maxlon 
FROM mesidata 
JOIN mesitype ON mesidata.type=mesitype.id
LEFT JOIN mesigeo ON mesidata.id=mesigeo.mesiid





