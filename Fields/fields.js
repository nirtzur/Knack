var data = {};
var map = {
	object_types: { 
		"Objects": { "Type": "Object", "Name": [] }, 
		"Scenes": { "Type": "Scene", "Name": [] } 
	},
	objects: {},
	fields: {}
}

function getFieldName(key, parent) {
	var name = map["fields"][key] && map["fields"][key]["Name"];
	if (typeof name == "undefined") {
		return key + " not found";
	}
	if (parent == map["fields"][key]["Parent"][0][0]) {
		return name;
	}
	return map["fields"][key]["Parent"][0][1] + "." + name;
}

function euqationFields(format) {
	var equation = format && format["equation"];
	if (typeof equation == "undefined" || !equation) {
		return [];
	}

	var regex = /{(field_\d+)}/g;
	var equation_fields = [];
	var field_key = "";
	if (equation) {
		if (typeof equation === 'string') {
		  while (match = regex.exec(equation)) {
		  	field_key = match[1];
    		equation_fields.push([field_key, null, "fields"]);
		  }
		} 
		else {
			equation.forEach(function(ref) { 
				if (ref["type"] == "field") {
					field_key = ref["field"]["key"]
					equation_fields.push([field_key, null, "fields"]);
				};
			});
		};
	}
	return equation_fields;
}

function loadField(field, object_key, object_name) {
	var match;
	var fld = {
		"Key": field["key"],
		"Object": "Field",
		"Name": field["name"],
		"Type": field["type"],
		"Parent": [[object_key, object_name, "objects"]]
	};
	fld["Related Fields"] = euqationFields(field["format"]);
	map["fields"][field["key"]] = fld;
}

function locateObjects() {
	data["application"]["objects"].forEach(function(object) {
		map["object_types"]["Objects"]["Name"].push( [object["key"], object["name"], "objects"] );
		var obj = {
			"Key": object["key"],
			"Object": "Object",
			"Name": object["name"],
			"Tasks": null,
			"Parent": [["Objects", "Map", "object_types"]],
			"Related Fields": object["fields"].map(function(field) {
				loadField(field, object["key"], object["name"]);
				return [ field["key"], null, "fields" ];
			})
		};
		map["objects"][object["key"]] = obj;
	});
}

function showObject(event) {
	var key = event.srcElement.id;
	var type = event.srcElement.getAttribute('type');
	if (type) {
		buildTable({ "object": map[type][key] });
	}
}

function cleanTable(table) {
	var new_tbody = document.createElement('tbody');
	var old_tbody = table.getElementsByTagName('tbody')[0];
	if (old_tbody) {
		table.replaceChild(new_tbody, old_tbody);
	};
}

function createHeaders(table, headers) {
	var header = table.insertRow(0);

	headers.forEach(function(key) {
		var cell = header.insertCell(-1);
		cell.innerHTML = key;
	});
}

function getLink(field, parent){
	var span = document.createElement('span');
	if (field[1]) {
		span.innerHTML = field[1] + " ";
	}
	else {
		span.innerHTML = getFieldName(field[0], parent) + " ";
	}
	span.id = field[0];
	span.setAttribute('type', field[2]);
	return span;
}

function buildCell(cell, field, parent) {
	if (!field || typeof field  === 'string' ) {
		cell.innerHTML = field;
	}
	else {
		field.forEach(function(related_field){
			cell.appendChild(getLink(related_field, parent));
		});
	};
}

function buildTable(records) {
	var record_keys = Object.keys(records);
	var headers = Object.keys(records[record_keys[0]]);
	var table = document.getElementsByClassName('kn-table-table')[0];
	cleanTable(table);
	createHeaders(table, headers);

	Object.keys(records).forEach(function(record_id) {
		var row = table.insertRow(-1);
		var record = records[record_id];
		headers.forEach(function(key) {
			var cell = row.insertCell(-1);
			buildCell(cell, record[key], record["Key"]);
		});
	});
	table.addEventListener("click", showObject, false);
}

function loadObjectTypes() {
	locateObjects();
	// locateScenes();
}

function loadData() {
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
	  if (this.readyState == 4 && this.status == 200) {
			data = JSON.parse(xhttp.response);
			loadObjectTypes();
			buildTable(map["object_types"]);
    }
	};
	xhttp.open("GET", "https://api.knackhq.com/v1/applications/55bd08ae1407d36f78c321b6", true);
	xhttp.send();
}
