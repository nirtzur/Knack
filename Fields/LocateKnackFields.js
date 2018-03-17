// Licnese
// This code belongs to Nir Tzur
// Usage of this code is restricted to execute through find.knack.com only.

var LocateKnackFields = (function() {
  var data = {};
  var main = { application: {}, objects: {}, fields: {}, scenes: {}, views: {}, tasks: {} }


  class Base {
    constructor(object, parent, origin = null) {
      this.input = object;
      this.key = object["key"] || "Application";
      this.name = object["name"];
      this.type = object["type"];
      this.parent = parent;
      if (origin) { this.origin = origin; }

      main[parent][this.key] = this;

      this.refers_to = {};
      this.used_by = {};
    }

    relate(sub_object) { 
      this.refers_to[sub_object.key] = sub_object;
      sub_object.used_by[this.key] = this;
    }

    contains() { return [] }

    create(object, parent) { 
      switch(parent) {
        case "objects": return new Record(object, parent, this);
        case "fields": return new Field(object, parent, this);
        case "scenes": return new Scene(object, parent, this);
        case "views": return new View(object, parent, this);
        case "tasks": return new Task(object, parent, this);
      }
    }

    usedObjects(data, object_type = "fields") {
      var regex = (object_type == "fields") ? /(field_\d+)/g : /(object_\d+)/g;
      var object_key = "";
      var object;
      var match = [];

      while (match = regex.exec(JSON.stringify(data))) {
        object_key = match[1];
        if (this.key != object_key) {
          object = main[object_type][object_key] || main["fields"]["not found fields"];
          this.relate(object);
        }
      }
    }

    builderLink() {
      return "https://builder.knack.com/" + main["application"]["Application"]["account_name"] + "/" + main["application"]["Application"]["slug"] + "#"
    }
  }

  class Application extends Base {
    constructor(object, parent) {
      super(object, parent);
      this.slug = object["slug"];
      this.account_name = object["account"]["slug"];
    }
    contains() { return [ "objects", "scenes" ] }
  }

  class Record extends Base {
    contains() { return [ "fields", "tasks" ] }
    builderLink() { return super.builderLink() + "data/" + this.key; }
  }

  class Task extends Base {
    builderLink() { return super.builderLink() + "data/" + this.origin.key + "/tasks/" + this.key; }
  }

  class Field extends Base {
    builderLink() { return super.builderLink() + "data/" + this.origin.key + "/fields/" + this.key; }
  }
  
  class Scene extends Base {
    constructor(object, parent) {
      super(object, parent);
      this.slug = object["slug"];
    }
    contains() { return [ "views" ] }
    builderLink() { return super.builderLink() + "pages/" + this.key; }
  }

  class View extends Base {
    builderLink() { return super.builderLink() + "pages/" + this.origin.key + "/views/" + this.key; }
  }

  function order(a,b) {
    if (a.parent < b.parent) { return -1; }
    if (a.parent > b.parent) { return 1; }
    if (a.name < b.name) { return -1; }
    if (a.name > b.name) { return 1; }
    return 0;
  }

  function showObject(event) {
    var source = event.srcElement || event.target;
    var key = source.id;
    var parent = source.getAttribute('parent');
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

  function getLink(object) {
    var li = document.createElement('li');
    var span = document.createElement('span');
    var link = document.createElement('a');

    span.innerHTML = object.name;
    span.id = object.key;
    span.setAttribute('parent', object.parent);
    span.style.textDecoration = "underline";
    span.title = "Find references to " + object.name;

    link.innerHTML = "(" + object.key + ")";
    link.id = object.key;
    link.href = object.builderLink();
    link.target = "_newtab";
    link.style.marginLeft = '10px';
    link.title = "Locate " + object.name + " definition in builder";

    li.appendChild(span);
    li.appendChild(link);

    return li;
  }

  function objectHeader(item) {
    var span = document.createElement('span');
    span.innerHTML = item.parent;
    span.style.fontSize = 'x-large';
    span.style.padding = '10px';
    span.style.display = 'block';
    return span;
  }

  function buildCell(cell, object) {
    if (!object || typeof object === 'string') {
      var li = document.createElement('li');
      li.innerHTML = object;
      cell.appendChild(li);
    }
    else {
      var heading = "";
      var sorted_objects = [];
      var temp = [];
      Object.keys(object).forEach(function(key) { temp.push(object[key]) });
      sorted_objects = temp.sort(order);
      sorted_objects.forEach(function(item){
        if (heading != item.parent) {
          cell.appendChild(objectHeader(item));
          heading = item.parent;
        }
        cell.appendChild(getLink(item));
      });
    };
  }

  function buildTable(records) {
    var record_keys = Object.keys(records);
    var headers = ["name", "key", "used_by", "refers_to"];
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
    var object;
    ["fields", "views", "tasks"].forEach(function(item) {
      Object.keys(main[item]).forEach(function(key) {
        object = main[item][key];
        object.usedObjects(object["input"]);
      });
    });

    Object.keys(main["objects"]).forEach(function(key) {
      object = main["objects"][key];
      object.usedObjects(object["input"]["connections"]["inbound"], "objects");
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
    analyzeData(new Application(data["application"], "application"));
    main["fields"]["not found fields"] = new Field({key: "not found fields", name: "not found"}, "application");
  }

  function searchdata() {
    var data = [];
    var sorted_objects = [];
    var temp = [];
    Object.keys(main["fields"]).forEach(function(key) { temp.push(main["fields"][key]) });
    sorted_objects = temp.sort(order);

    sorted_objects.forEach(function(field) {
      if (field.name != "not found") {
        data.push({ value: field.key, text: field.name + " (" + field.key + " defined in " + field.origin.name + ")" });
      }
    });
    return data;
  }

  function searchFields() {
    var select = document.createElement('select');
    select.id = "selectFields";
    select.style.width = '300px';
    document.getElementsByClassName('view_39')[0].appendChild(select);
    var selector = new Selectr('#selectFields', {
      searchable: true, 
      width: 300, 
      data: searchdata(), 
      defaultSelected: false,
      placeholder: "Search fields"
    });
    selector.on('selectr.select', function(option) {
      buildTable({ "object": main["fields"][option["value"]] });
    });
  }

  function loadData(application_id) {

    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
      if (this.readyState == 4) {
        if (this.status == 200) {
          data = JSON.parse(xhttp.response);
          loadObjectTypes();
          searchFields();
          locateUsedByFields();
          buildTable(main["application"]);
        }
        else {
          document.getElementsByClassName('kn-td-nodata')[0].innerText = "Invalid Application ID";
        }
      }
      Knack.hideSpinner();
    };
    Knack.showSpinner();
    xhttp.open("GET", "https://api.knackhq.com/v1/applications/" + application_id, true);
    xhttp.send();
  }
  
  return {
    loadData: loadData
  }
})()