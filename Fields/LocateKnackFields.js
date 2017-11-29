var LocateKnackFields = (function() {
  var data = {};
  var main = { application: {}, objects: {}, fields: {}, scenes: {}, views: {}, tasks: {} }


  class Base {
    constructor(object, parent) {
      this.input = object;
      this.key = object["key"] || "Application";
      this.name = object["name"];
      this.type = object["type"];
      this.parent = parent;

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
        case "objects": return new Record(object, parent);
        case "fields": return new Field(object, parent);
        case "scenes": return new Scene(object, parent);
        case "views": return new View(object, parent);
        case "tasks": return new Task(object, parent);
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
  }

  class Application extends Base {
    contains() { return [ "objects", "scenes" ] }
  }

  class Record extends Base {
    contains() { return [ "fields", "tasks" ] }
  }

  class Task extends Base {
  }

  class Connection extends Base {
  }

  class Field extends Base {
  }
  
  class Scene extends Base {
    constructor(object, parent) {
      super(object, parent);
      this.slug = object["slug"];
    }
    contains() { return [ "views" ] }
  }

  class View extends Base {
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
    var li = document.createElement('li');

    li.innerHTML = object.name + " (" + object.key + ")";
    li.id = object.key;
    li.setAttribute('parent', object.parent);
    li.style.textDecoration = "underline";
    return li;
  }

  function buildCell(cell, object) {
    var li = document.createElement('li');
    if (!object || typeof object === 'string') {
      li.innerHTML = object;
      cell.appendChild(li);
    }
    else {
      var heading = "";
      Object.keys(object).forEach(function(object_id){
        if (heading != object[object_id].parent) {
          var span = document.createElement('span');
          heading = object[object_id].parent;
          span.innerHTML = object[object_id].parent;
          span.style.fontSize = 'x-large';
          span.style.padding = '10px';
          span.style.display = 'block';
          cell.appendChild(span);
        }
        cell.appendChild(getLink(object[object_id]));
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
      console.log("processing related " + item);
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
      console.log("analyzing " + item_type);
      object.input[item_type].forEach(function(item) {
        console.log("analyzing " + item.key);
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