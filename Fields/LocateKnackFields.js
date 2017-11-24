var LocateKnackFields = (function() {
  var data = {};
  // var main = { objects: {}, fields: {}, scenes: {}, views: {} }

  class Base {
    constructor(object, parent) {
      this.key = object["key"];
      this.name = object["name"];
      this.type = object["type"];
      this.parent = parent;
      this.related_to = [];
      this.used_by = [];
    }

    link() { return new Relation(key, name, object_type); }
    value(header) { return this[header.toLowerCase().replace(" ", "_")]; }
    contains() { return {} }
  }

  class Application extends Base {
    contains() { return { objects: Record, scenes: Scene } }
  }

  class Record extends Base {
    contains() { return { fields: Field, connections: Field } }
  }

  class Field extends Base {
    contains() { return {  } }
  }
  
  class Scene extends Base {
    constructor(object, parent) {
      super(object);
      this.slug = slug;
    }
    contains() { return { views: View } }
  }

  class Relation {
    constructor(key, name, parent_type) {
      this.key = key;
      this.name = name;
      this.parent_type = parent_type;
    }

    linkText(parent_key) {
      var name = main[parent_type][key] && main[parent_type][key].name;
      if (typeof name == "undefined") {
        return key + " not found in " + parent_type;
      }
      if (parent_key == main[parent_type][key].parent.key) {
        return name;
      }
      return main[parent_type][key].parent.name + "->" + name;
    }
  }

  function getLinkText(key, type, parent) {
    var name = main[type][key] && main[type][key]["Name"];
    if (typeof name == "undefined") {
      return key + " not found";
    }
    if (parent == main[type][key]["Parent"][0][0]) {
      return name;
    }
    return main[type][key]["Parent"][0][1] + "->" + name;
  }

  function euqationFields(format) {
    var equation = format && format["equation"];
    if (typeof equation == "undefined" || !equation) {
      return new Relation();
    }

    var regex = /(field_\d+)/g;
    var equation_fields = [];
    var field_key = "";
    if (equation) {
      if (typeof equation === 'string') {
        while (match = regex.exec(equation)) {
          field_key = match[1];
          equation_fields.push(new Relation(field_key, null, "fields"));
        }
      } 
      else {
        equation.forEach(function(ref) { 
          if (ref["type"] == "field") {
            field_key = ref["field"]["key"]
            equation_fields.push(new Relation(field_key, null, "fields"));
          };
        });
      };
    }
    return equation_fields;
  }

  function loadView(view, scene_key, scene_name) {
    // var match;
    var view_obj = {
      "Key": view["key"],
      "Object": "View",
      "Name": view["name"],
      "Label": view["label"],
      "Type": view["type"],
      "Parent": [[scene_key, scene_name, "scenes"]]
      // "Used By": []
    };
    // fld["Related Fields"] = euqationFields(field["format"]);
    main["views"][view["key"]] = view_obj;
  }

  function loadField(field, parent) {
    var kfield = new Record(field["key"], field["name"], field["type"], "Field", parent);
    kfield.related_to = euqationFields(field["format"]);
    main["fields"][field["key"]] = kfield;
  }

  function locateObjects() {
    main["object_types"]["objects"] = new RecordType("Objects", "Items", "Object", null, new Relation("Main"));

    data["application"]["objects"].forEach(function(object) {
      var kobject = new Record(object["key"], object["name"], "Object", "Object", new Relation("Main"));
      kobject.related_to = object["fields"].map(function(field) {
        loadField(field, kobject.link);
        return new Relation(field["key"], null, "fields");
      });
      main["objects"][object["key"]] = kobject;
      main["object_types"]["objects"].related_to.push(kobject.link);
    });
  }

  function showObject(event) {
    var key = event.srcElement.id;
    var type = event.srcElement.getAttribute('type');
    if (type) {
      buildTable({ "object": main[type][key] });
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

  function getLink(field, parent){
    var span = document.createElement('span');
    
    if (field[1]) {
      span.innerHTML = field[1];
    }
    else {
      span.innerHTML = getLinkText(field[0], field[2], parent);
    }
    span.id = field[0];
    span.setAttribute('type', field[2]);
    span.style.backgroundColor = '#ebebeb';
    span.style.margin = '5px';
    span.style.padding = '2px';
    span.style.border = '1px solid #bbb';
    span.style.display = 'inline-block';
    return span;
  }

  function buildCell(cell, field, parent) {
    var span = document.createElement('span');
    if (!field || typeof field  === 'string' ) {
      span.innerHTML = field;
      cell.appendChild(span);
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
      var row = table.tBodies[0].insertRow(-1);
      var record = records[record_id];
      headers.forEach(function(key) {
        var cell = row.insertCell(-1);
        cell.className = 'cell-edit';
        buildCell(cell, record[key], record["Object"] == "Field" ? record["Parent"][0][0] : record["Key"]);
      });
    });
    table.addEventListener("click", showObject, false);
  }

  function locateUsedByFields() {
    var using_field;
    Object.keys(main["fields"]).forEach(function(field_id) {
      main["fields"][field_id]["Related Fields"].forEach(function(related_field) {
        using_field = main["fields"][related_field[0]];
        if (using_field) {
          using_field["Used By"].push([field_id, null, "fields"]);
        }
      });
    });
  }

  function locateScenes() {
    main["object_types"]["scenes"] = new RecordType("Scenes", "Items", "Scene", null, new Relation("Main"));

    data["application"]["scenes"].forEach(function(scene) {
      var kscene = new Record(scene["key"], scene["name"], "Scene", "Scene", new Relation("Main"), scene["slug"]);
      kscene.related_to = scene["views"].map(function(view) {
        loadView(view, kscene.link);
        return new Relation(scene["key"], null, "scenes");
      });
      main["scenes"][scene["key"]] = kscene;
      main["object_types"]["scenes"].related_to.push(kscene.link);
    });
  }

  function analyzeData(object) {
    Object.keys(object.contains).forEach(function(item_type) {
      input[item_type].forEach(function(item) {
        analyzeData(new object.contains[item_type](item, object));
      });
    });
  }

  function loadObjectTypes() {
    analyzeData(new Application(data["application"]);

    // Applications("objects", "fields", Record)
    // locateObjects();
    // locateScenes();
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
        buildTable(main["object_types"]);
      }
    };
    xhttp.open("GET", "https://api.knackhq.com/v1/applications/" + "55bd08ae1407d36f78c321b6", true);
    xhttp.send();
  }
  
  return {
    loadData: loadData
  }
})()