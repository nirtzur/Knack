var data = {};
var application_name = "";
var objects = {};
var fields = {};

function getFieldName(key) {
	var name = fields[key] && fields[key]["name"];
	if (typeof name == "undefined") {
		return key + " not found";
	}
	return name;
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
    		equation_fields.push([field_key, getFieldName(field_key)]);
		  }
		} 
		else {
			equation.forEach(function(ref) { 
				if (ref["type"] == "field") {
					field_key = ref["field"]["key"]
					equation_fields.push([field_key, getFieldName(field_key)]);
				};
			});
		};
	}
	return equation_fields;
}

function loadField(field) {
	var match;
	var fld = {
		"id": field["_id"],
		"key": field["key"],
		"name": field["name"],
		"type": field["type"]
	};
	fld["related_fields"] = euqationFields(field["format"]);
	fields[field["key"]] = fld;
}

function locateObjects() {
	data["application"]["objects"].forEach(function(object) {
		var obj = {
			"id": object["_id"],
			"key": object["key"],
			"name": object["name"],
			"tasks": null,
			"related_fields": object["fields"].map(function(field) {
				loadField(field);
				return [ field["key"], field["name"] ];
			})
		};
		objects[object["key"]] = obj;
	});
}

function showObject() {
	var key = this.id;
	buildTable(fields[key]["related_fields"]);
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

function getLink(field){
	var span = document.createElement('span');
	span.innerHTML = field[1] + " ";
	span.id = field[0];
	var related_fields = fields[field[0]["related_fields"]];
	if (related_fields && related_fields.length > 0) {
		span.addEventListener("click", showObject, false);
	}
	return span;
}

function buildCell(cell, field, key) {
	if (!field || typeof field  === 'string' ) {
		cell.innerHTML = field;
	}
	else {
		field.forEach(function(related_field){
			cell.appendChild(getLink(related_field));
		});
	};
}

function buildTable(records) {
	var record_keys = Object.keys(records);
	var headers = Object.keys(records[record_keys[0]]);
	var table = document.getElementById("FieldsTable");
	cleanTable(table);
	createHeaders(table, headers);

	Object.keys(records).forEach(function(record_id) {
		var row = table.insertRow(-1);
		var record = records[record_id];
		headers.forEach(function(key) {
			var cell = row.insertCell(-1);
			buildCell(cell, record[key], key);
		});
	});
}

function parseData() {
	application_name = data["application"]["name"];
	locateObjects();
	buildTable(objects);
}

function loadData() {
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
	  if (this.readyState == 4 && this.status == 200) {
			data = JSON.parse(xhttp.response);
			parseData();
    }
	};
	xhttp.open("GET", "https://api.knackhq.com/v1/applications/55bd08ae1407d36f78c321b6", true);
	xhttp.send();
}
