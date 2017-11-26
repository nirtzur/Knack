var LocateKnackFields = (function() {
  var data = {};
  var main = { application: {}, objects: {}, fields: {}, scenes: {}, views: {} }


  class Base {
    constructor(object, parent) {
      this.input = object;
      this.key = object["key"] || "Application";
      this.name = object["name"];
      this.type = object["type"];
      this.parent = parent;

      main[parent][this.key] = this;

      this.related_to = {};
      this.used_by = {};
    }

    relate(sub_object) { 
      this.related_to[sub_object.key] = sub_object;
      sub_object.used_by[this.key] = this;
    }

    contains() { return [] }

    create(object, parent) { 
      switch(parent) {
        case "objects": return new Record(object, parent);
        case "fields": return new Field(object, parent);
        case "scenes": return new Scene(object, parent);
        case "views": return new View(object, parent);
      }
    }

    markLinks() {
      var object = this;
      Object.keys(object.related_to).forEach(function(key) {
        object.related_to[key]["used_by"][object.key] = object;
      });
    }
  }

  class Application extends Base {
    contains() { return [ "objects", "scenes" ] }
  }

  class Record extends Base {
    contains() { return [ "fields" ] }
  }

  class Field extends Base {
    euqationFields() {
      var format = this.input["format"];
      var equation = format && format["equation"];
      if (typeof equation == "undefined" || !equation) {
        this.related_to = {};
        return;
      }

      var regex = /(field_\d+)/g;
      var equation_fields = {};
      var field_key = "";
      var match = [];

      if (typeof equation === 'string') {
        while (match = regex.exec(equation)) {
          field_key = match[1];
          equation_fields[field_key] = main["fields"][field_key] || main["fields"]["not found fields"];
        }
      }
      else {
        equation.forEach(function(ref) { 
          if (ref["type"] == "field") {
            field_key = ref["field"]["key"];
            equation_fields[field_key] = main["fields"][field_key] || main["fields"]["not found fields"];
          };
        });
      };

      this.related_to = equation_fields;
    }
  }
  
  class Scene extends Base {
    constructor(object, parent) {
      super(object, parent);
      this.slug = object["slug"];
    }
    contains() { return [ "views" ] }
  }

  class View extends Base {
    viewFields() {
      var regex = /(field_\d+)/g;
      var fields = {};
      var field_key = "";
      var match = [];

      while (match = regex.exec(JSON.stringify(this.input))) {
        field_key = match[1];
        fields[field_key] = main["fields"][field_key] || main["fields"]["not found fields"];
      }

      this.related_to = fields;
    }
  }

  function showObject(event) {
    var key = event.srcElement.id;
    var parent = event.srcElement.getAttribute('parent');
    if (parent) {
      buildTable({ "object": main[parent][key] });
    }
  }

  function cleanTable(table) {
    var new_thead = document.createElement('thead');
    var old_thead = table.tHead;
    if (old_thead) {
      table.replaceChild(new_thead, old_thead);
    };

    var new_tbody = document.createElement('tbody');
    var old_tbody = table.tBodies[0];
    if (old_tbody) {
      table.replaceChild(new_tbody, old_tbody);
    };
  }

  function createHeaders(table, headers) {
    var header = table.tHead.insertRow(0);

    headers.forEach(function(key) {
      var th = document.createElement('th');
      var span = document.createElement('span');
      span.innerHTML = key;
      span.className = 'table-fixed-label';
      th.appendChild(span);
      header.appendChild(th);
    });
  }

  function getLink(object){
    var span = document.createElement('span');
    
    span.innerHTML = object.key + " -> " + object.name;
    span.id = object.key;
    span.setAttribute('parent', object.parent);
    span.style.backgroundColor = '#ebebeb';
    span.style.margin = '5px';
    span.style.padding = '2px';
    span.style.border = '1px solid #bbb';
    span.style.display = 'inline-block';
    return span;
  }

  function buildCell(cell, object) {
    var span = document.createElement('span');
    if (!object || typeof object  === 'string' ) {
      span.innerHTML = object;
      cell.appendChild(span);
    }
    else {
      Object.keys(object).forEach(function(object_id){
        cell.appendChild(getLink(object[object_id]));
      });
    };
  }

  function buildTable(records) {
    var record_keys = Object.keys(records);
    var headers = ["key", "used_by", "related_to"];
    var table = document.getElementsByClassName('kn-table-table')[0];
    cleanTable(table);
    createHeaders(table, headers);

    Object.keys(records).forEach(function(record_id) {
      var row = table.tBodies[0].insertRow(-1);
      var record = records[record_id];
      headers.forEach(function(key) {
        var cell = row.insertCell(-1);
        cell.className = 'cell-edit';
        buildCell(cell, record[key]);
      });
    });
    table.addEventListener("click", showObject, false);
  }

  function locateUsedByFields() {
    var field;
    var view;
    console.log("processing related fields");
    Object.keys(main["fields"]).forEach(function(field_key) {
      field = main["fields"][field_key];
      field.euqationFields();
      field.markLinks();
    });
    console.log("processing related views");
    Object.keys(main["views"]).forEach(function(view_key) {
      view = main["views"][view_key];
      view.viewFields();
      view.markLinks();
    });
  }

  function analyzeData(object) {
    object.contains().forEach(function(item_type) {
      object.input[item_type].forEach(function(item) {
        var sub_object = object.create(item, item_type);
        object.relate(sub_object);
        analyzeData(sub_object);
      });
    });
  }

  function loadObjectTypes() {
    console.log("analyzing data");
    analyzeData(new Application(data["application"], "application"));
    main["fields"]["not found fields"] = new Field({key: "not found fields", name: "not found"}, "application");
  }

  function loadData() {
    var application_id;
    if (typeof Knack != 'undefined') {
      application_id = Knack.application_id;
    }
    else {
      application_id = document.getElementById('application_id').value;
    }

    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        data = JSON.parse(xhttp.response);
        loadObjectTypes();
        locateUsedByFields();
        buildTable(main["application"]);
      }
    };
    xhttp.open("GET", "https://api.knackhq.com/v1/applications/" + "55bd08ae1407d36f78c321b6", true);
    xhttp.send();
  }
  
  return {
    loadData: loadData
  }
})()