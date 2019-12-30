// Licnese
// This code belongs to Nir Tzur
// Usage of this code is restricted to execute through find.knack.com only.

var LocateKnackFields = (function() {
  var data = {};
  var main = { application: {}, objects: {}, fields: {}, scenes: {}, views: {}, tasks: {} }
  var elements = [];
  var links = [];
  var graphScale = 1;
  var mouse = false;
  var current_object = null;
  var showObjects = false;
  var showScenes = false;
  var showViews = false;
  var showTasks = false;
  var showFields = false;

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
      event.preventDefault();
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

  function getLink(object, record) {
    var li = document.createElement('li');
    var linkToObject = document.createElement('a');
    var linkToBuilder = document.createElement('a');

    var name = (["fields", "tasks", "views"].indexOf(object.parent) > -1 && record.name != object.origin.name) ? " (" + object.origin.name + ")" : "";
    linkToObject.innerHTML = object.name + name;
    linkToObject.id = object.key;
    linkToObject.setAttribute('parent', object.parent);
    linkToObject.href = object.name;
    linkToObject.title = "Find references to " + object.name;

    linkToBuilder.innerHTML = "(" + object.key + ")";
    linkToBuilder.id = object.key;
    linkToBuilder.href = object.builderLink();
    linkToBuilder.target = "_newtab";
    linkToBuilder.title = "Locate " + object.name + " definition in builder";

    li.appendChild(linkToObject);
    li.appendChild(linkToBuilder);

    return li;
  }

  function objectHeader(item) {
    var span = document.createElement('span');
    span.innerHTML = item.parent;
    return span;
  }

  function buildCell(cell, record, key) {
    var object = record[key];
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
        cell.appendChild(getLink(item, record));
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
        buildCell(cell, record, key);
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

  function loadData(application_id, visual) {

    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
      if (this.readyState == 4) {
        if (this.status == 200) {
          data = JSON.parse(xhttp.response);
          loadObjectTypes();
          locateUsedByFields();
          if (visual == "graph") {
            mapData();
          }
          else
          {
            searchFields();
            buildTable(main["application"]);
          }
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

  function mapData(application_id) {
    var Shape = joint.dia.Element.define('demo.Shape', 
      {
        attrs: {
          rect: { refWidth: '80%', refHeight: '100%', stroke: 'gray', strokeWidth: 1, rx: 10, ry: 10, style: 'cursor: zoom-in' },
          text: { refX: '40%', refY: '50%', yAlignment: 'middle', xAlignment: 'middle', fontSize: 12, style: 'cursor: zoom-in' }
        }
      }, 
      {
        markup: '<rect/><text/>',
        setText: function(text) { return this.attr('text/text', text || ''); },
        setColor: function(text) {
          color = function(text) {
            switch(text) {
              case "objects": return "orange";
              case "fields": return "lightblue";
              case "scenes": return "green";
              case "views": return "lightgreen";
              case "tasks": return "yellow";
              default: return "pink";
            }
          }

          return this.attr('rect/fill', color(text));
        },
        setWidth: function(text) {
          var len = Math.max.apply(null, text.split("\n").map(function(txt) {return 6 + txt.length }));
          return this.size(len * 9, 80);
        }
      }
    );

    var Link = joint.dia.Link.define('demo.Link',
      {
        attrs: { 
          '.connection': { stroke: 'gray', strokeWidth: 1, pointerEvents: 'none' }
        },
        connector: { name: 'rounded' }, 
        z: -1
      },
      {
        markup: '<path class="connection"/><path class="marker-target"/>',
        connect: function(sourceId, targetId) {
          return this.set({ source: { id: sourceId }, target: { id: targetId } });
        },
      }
    );
    
    function capFirst(string) { return string.charAt(0).toUpperCase() + string.slice(1); }

    function elementExists(object) {
      var element = elements.find( (element) => { return(element.id == object.key) } );
      return typeof element != "undefined";
    }

    function addElement(object) {
      if (elements.length > 2000 || elementExists(object)) { return null; }
      var shapeText = capFirst(object.key.split('_')[0]) + ": " + object.name + "\n key: " + object.key;
      if (["fields", "tasks", "views"].indexOf(object.parent) > -1 ) {
        shapeText = shapeText + "\n defined in: " + capFirst(object.origin.key.split('_')[0]) + " " + object.origin.name
      }
      var shape = new Shape({ id: object.key }).setText(shapeText).setWidth(shapeText).setColor(object.parent);
      shape.set("parent_object", object.parent);
      elements.push(shape);
      return shape;
    }

    function showRelated(object_type) {
      switch(object_type) {
        case "objects": return showObjects;
        case "scenes": return showScenes;
        case "views": return showViews;
        case "fields": return showFields;
        case "tasks": return showTasks;
      }
    }

    function addRelated(object, related = "used_by") {
      Object.keys(object[related]).forEach(function(item) {
        if (showRelated(object[related][item].parent)) {
          var element = addElement(object[related][item]);
          links.push( related == "used_by" ? new Link().connect(item, object.key) : new Link().connect(object.key, item));
          // if (element && object[related]) { addRelated(object[related][item], related); }
        }
      });      
    }

    function createAdjancyList(object) {
      addElement(object);
      addRelated(object, "used_by");
      addRelated(object, "refers_to");
    }

    function markNeededObjects() {
      showObjects = document.getElementById('showObjects').checked;
      showScenes = document.getElementById('showScenes').checked;
      showViews = document.getElementById('showViews').checked;
      showFields = document.getElementById('showFields').checked;
      showTasks = document.getElementById('showTasks').checked;
    }

    function drawGraph(object, paper) {
      Knack.showSpinner();
      current_object = object;
      elements = [];
      links = [];
      markNeededObjects();
      createAdjancyList(object);
      $('#summary').text("Objects on screen: " + elements.length);
      graph.clear();
      graph.addCells(elements.concat(links));
      joint.layout.DirectedGraph.layout(graph, { rankSep: 20, nodeSep: 20, edgeSep: 20, rankDir: "LR" });
      paper.translate(0, 0);
      Knack.hideSpinner();
    }

    function mouseEvent(delta, paper) {
      if (mouse) {
        graphScale += delta * 0.025; 
        paper.scale(graphScale);
        setTimeout(function() { mouseEvent(delta, paper); }, 25);
      }
    }

    var graph = new joint.dia.Graph();
  
    var paper = new joint.dia.Paper({ el: $('#paper'), width: 1200, height: 600, model: graph, gridSize: 1, drawGrid: true });

    paper.on('cell:pointerclick', function(cellView, evt, x, y) { 
      drawGraph(main[cellView.model.attributes.parent_object][cellView.model.id], paper);
    });

    paper.on('blank:pointerdown', function(event, x, y) {
      dragStartPosition = { x: x * graphScale, y: y * graphScale };
    });
    paper.on('cell:pointerup blank:pointerup', function(cellView, x, y) { delete dragStartPosition; });
    $("#diagram").mousemove(function(event) {
      if (typeof dragStartPosition != 'undefined') {
        paper.translate(event.offsetX - dragStartPosition.x, event.offsetY - dragStartPosition.y);
      }
    });

    $("#plus").on("mousedown", function() { mouse = true; mouseEvent(1, paper); });
    $("#minus").on("mousedown", function() { mouse = true; mouseEvent(-1, paper); });
    $("#plus, #minus").on("mouseup mouseout", function() { mouse = false; });
    $("#reset").on("click", function() { mouse = false; graphScale = 1; paper.scale(graphScale); });
    $(".check_box").on("change", function() { drawGraph(current_object, paper); });

    drawGraph(main["application"]["Application"], paper);
  };
  
  return {
    loadData: loadData
  }
})()