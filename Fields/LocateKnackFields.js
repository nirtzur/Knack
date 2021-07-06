// Licnese
// This code belongs to Nir Tzur
// Usage of this code is restricted to execute through find.knack.com only.

var LocateKnackFields = (function() {
  var data = {};
  var main = { application: {}, objects: {}, fields: {}, scenes: {}, views: {}, tasks: {}, javascript: {}, css: {}, emails: {} }
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
  var subdomain = null;

  if (typeof Knack == 'undefined') { Knack = { showSpinner() {}, hideSpinner() {} } };

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
    search_fields_in() { return this.input; }

    create(object, parent) { 
      switch(parent) {
        case "objects": return new Record(object, parent, this);
        case "fields": return new Field(object, parent, this);
        case "scenes": return new Scene(object, parent, this);
        case "views": return new View(object, parent, this);
        case "tasks": return new Task(object, parent, this);
        case "javascript": return new Text(object, parent, this);
        case "css": return new Text(object, parent, this);
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

      this.prettifyRelations();
    }

    builderLink() {
      return "https://builder" + subdomain + ".knack.com/" + main["application"]["Application"]["account_name"] + "/" + main["application"]["Application"]["slug"] + "/";
    }

    prettifyRelations() {};

    skip(item) { return false };
  }

  class Application extends Base {
    constructor(object, parent) {
      super(object, parent);
      this.slug = object["slug"];
      this.account_name = object["account"]["slug"];
    }
    contains() { return [ "objects", "scenes" ] }
    skip(item) { return item.key.startsWith("scene_") && item.name.startsWith("DELETED "); }

    analyzeSettings() {
      this.textLines(this.input["settings"]["javascript"], "javascript", "application");
      this.textLines(this.input["settings"]["css"], "css", "application");

      this.count = "<li>Total entries: " + this.input["counts"]["total_entries"] + " records" + 
                   "<li>Asset size: " + this.input["counts"]["asset_size"] + " bytes" + 
                   "<li>Number of objects: " + Object.keys(main.objects).length + 
                   "<li>Number of scenes: " + Object.keys(main.scenes).length
    }

    textLines(data, type) {
      var app = this;
      decodeURIComponent(data).split('\n').forEach(function(line, index) {
        var number = index + 1;
        app.create({key: type + " line " + number, name: line}, type);
      });
    };
  }

  class Record extends Base {
    constructor(object, parent, origin) {
      super(object, parent, origin);
      this.count = "<br>Total entries: " + data["application"]["counts"][this.key] + " records";
    }

    contains() { return [ "fields", "tasks" ] }
    builderLink() { return super.builderLink() + "schema/list/objects/" + this.key; }
  }

  class Task extends Base {
    constructor(object, parent, origin) {
      super(object, parent, origin);
      this.run_status = object["run_status"];
    }

    builderLink() { return super.builderLink() + "tasks/objects/" + this.origin.key + "/tasks/" + this.key + "/task"; }

    prettifyRelations() {
      this.criteria = getTaskCriteria(this["input"]["action"]["criteria"]);
      this.schedule = getTaskSchedule(this["input"]["schedule"]);
      this.actions = getTaskActions(this["input"]["action"]);
    }
  }

  class Field extends Base {
    additionalData() {
      var format = this.input["format"];
      this.equation = prettifyFieldSettings(take(format, "equation"));
      this.equation_type = take(format, "equation_type");
      this.format = prettifyFieldSettings(format);
      this.rules = prettyRules(this.input["rules"]);
      this.validation = (this.input["validation"] || []).map(function(rule) { return prettifyFieldSettings(rule) }).join(", ");
      if (this.type == "connection") {
        var relates = this.input.relationship;
        this.type += "<br>(" + relates["belongs_to"] + " to " + relates["has"] + " " + main.objects[relates["object"]].name + ")";
      }
    }

    builderLink() { return super.builderLink() + "schema/list/objects/" + this.origin.key + "/fields/" + this.key + "/settings/"; }
  }
  
  class Scene extends Base {
    constructor(object, parent, origin) {
      super(object, parent, origin);
      this.slug = object["slug"];
    }
    contains() { return [ "views" ] }
    skip(item) { return item.name.startsWith("DELETED VIEW"); }
    search_fields_in() { return this.input.rules; }
    builderLink() { return super.builderLink() + "pages/" + this.key; }
  }

  class View extends Base {
    constructor(object, parent, origin) {
      super(object, parent, origin);
      this.type = (object["type"] == "registration" ? "form" : object["type"]);
    }
    builderLink() { return super.builderLink() + "pages/" + this.origin.key + "/views/" + this.key + "/" + this.type; }
  }

  class Text extends Base {
    builderLink() { return super.builderLink() + "settings/api"; }
  }

  class Email extends Base {
    constructor(object, parent, origin) {
      super(object, parent, origin);
      this.criteria = prettifyFieldSettings("<li>" + prettyCriteria(object) + "</li>");
      this.from_email = object.email.from_email || "";
      this.from_name = object.email.from_name || "";
      this.message = prettifyFieldSettings(object.email.message || "");
      this.subject = prettifyFieldSettings(object.email.subject || "");
      this.recipients = getRecipients(object.email.recipients || []);
    }
  }

  function take(object, key) {
    var value;
    if (object && typeof object != 'string') {
      value = object[key];
      delete object[key];
    }
    return value || "";
  }

  function prettifyFieldSettings(data) {
    if (!data) { return ""; }
    var regex = /(field_\d+)/g;
    var txt = (JSON.stringify(data, null, ' ') || "").replace(/\"/g, "");
    var match = [];

    if (typeof data != 'string') {
      txt = txt.slice(1,-1);
    }

    while (match = regex.exec(txt)) {
      txt = txt.replace(match[1], "<strong>" + fieldName(match[1]) + "</strong>");
    }

    return txt;
  }

  function prettyCriteria(item) {
    var criteria = [];

    if (!item["criteria"] || item["criteria"].length == 0) {
      criteria = ["every record "];
    } else {
      item["criteria"].forEach(function(crt) {
        var val_txt = typeof crt["value"] == 'object' ? "" : " " + crt["value"];
        criteria.push(crt["field"] + " " + crt["operator"] + val_txt);
      });
    }
    return("When " + criteria.join(" and "));
  }

  function prettyRules(data) {
    if (!data || data == []) { return "" }
    var rule = [];
    var val;

    data.forEach(function(item) {
      var values = null;
      val = item["values"][0];
      values = " Set " + val["field"] + " to " + (val["type"] == "value" ? val["value"] : val["input"]);
      rule.push("<li>" + prettyCriteria(item) + values + "</li>");
    });
    return prettifyFieldSettings(rule.join(""));
  }

  function fieldName(key) {
    if (typeof main["fields"][key] == "undefined") { return "Field not found"; } 
    return main["fields"][key].origin.name + "." + main["fields"][key].name;
  }

  function getTaskCriteria(criteria) {
    var criteria_array = [];
    criteria.forEach(function(crit) {
      var value_string = "";
      if (crit["value"]) {
        if (typeof crit["value"]["date"] != "undefined") {
          value_string = crit["value"]["date"];
        }
        else if (typeof crit["value"]["range"] != "undefined") {
          value_string = crit["range"] + " " + crit["type"];
        }
        else {
          value_string = crit["value"];
        }
      }
      else {
        value_string = crit["range"] + " " + crit["type"];
      }
      criteria_array.push(fieldName(crit["field"]) + " " + crit["operator"] + " " + value_string);
    })
    return criteria_array;
  }

  function getTaskSchedule(schedule) {
    return schedule["time"] + " " + schedule["date"] + " " + schedule["repeat"];
  }

  function getTaskActions(actions) {
    var action_array = [];
    var action_string = "";

    switch(actions["action"]) {
      case "record": { 
        action_string = "Update existing record";
        break;
      }
      case "connection": {
        action_string = "Update connected " + main["objects"][actions["connection"].split('.')[0]].name + " record";
        break;
      }
      case "insert": {
        action_string = "Insert new connected " + main["objects"][actions["connection"].split('.')[0]].name + " record";
        break;
      }
      case "email": {
        action_string = "Send a custom email";
        break;
      }
    }

    action_array.push(action_string);

    actions["values"] && actions["values"].forEach(function(action) {
      action_string = "Set " + fieldName(action["field"])
      switch(action["type"]) {
        case "record": {
          action_string += " to field " + fieldName(action["input"]) + " value";
          break;
        }
        case "connection": {
          var connected_object = fieldName(action["connection_field"].split('-')[0]);
          var connected_field = fieldName(action["connection_field"].split('-')[1]);
          action_string += " to a connected value of " + connected_object + "." + connected_field + " value";
          break;
        }
        case "value": {
          var value = (typeof action["value"] === 'string') ? action["value"] : Object.values(action["value"] || {}).join(' ');
          action_string += " to custom value " + value;
          break;
        }
      }
      action_array.push(action_string);
    });

    if (actions["email"]) {
      action_array.push("Email subject \"" + actions["email"]["subject"] + "\"")
    }
    return action_array;
  }

  function getRecipients(recipients) {
    if (!recipients) { return ""; }
    var list = [];
    recipients.forEach(function(recipient) {
      list.push("<li>" + recipient.recipient_mode + " " + (recipient.recipient_type == "custom" ? recipient.field : recipient.email) + "</li>")
    });
    return prettifyFieldSettings(list.join(" "));
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

  function getLink(object, record, click) {
    var li = document.createElement('li');
    var linkToObject = document.createElement('a');
    var linkToBuilder = document.createElement('a');

    var name = (["fields", "tasks", "views"].indexOf(object.parent) > -1 && object.origin && record.name != object.origin.name) ? " (" + object.origin.name + ")" : "";
    linkToObject.innerHTML = object.name + name;
    linkToObject.id = object.key;
    linkToObject.setAttribute('parent', object.parent);
    if (click) {
      linkToObject.href = object.name;
      linkToObject.title = "Find references to " + object.name;
    }

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

  function sorted_data(records) {
    var temp = [];
    Object.keys(records).forEach(function(key) { temp.push(records[key]) });
    return temp.sort(order);
  }

  function buildCell(cell, record, key, click) {
    var object = record[key];
    if (object.name) { object = object.name }
    if (!object || typeof object === 'string') {
      var span = document.createElement('span');
      span.innerHTML = object;
      if (record.count && key == "name") {
        var count = document.createElement('span');
        count.innerHTML = record.count;
        span.appendChild(count);
      }
      cell.appendChild(span);
    }
    else if (Object.prototype.toString.call(object) === '[object Array]') {
      object.forEach(function(obj) {
        var li = document.createElement('li');
        li.innerHTML = obj;
        cell.appendChild(li);   
      });
    } else {
      var heading = "";
      sorted_data(object).forEach(function(item){
        if (heading != item.parent) {
          cell.appendChild(objectHeader(item));
          heading = item.parent;
        }
        cell.appendChild(getLink(item, record, click));
      });
    };
  }

  function buildTable(records, headers = ["name", "key", "used_by", "refers_to"], click = true, visual = "") {
    var table = document.getElementsByClassName('kn-table-table')[0];
    cleanTable(table);
    createHeaders(table, headers);

    sorted_data(records).forEach(function(record) {
      if (visual == "bookoffields" && record.key == "not found fields") { return; }
      var row = table.tBodies[0].insertRow(-1);
      headers.forEach(function(key) {
        var cell = row.insertCell(-1);
        cell.className = 'cell-edit';
        buildCell(cell, record, key, click);
      });
    });
    if (click) { table.addEventListener("click", showObject, false); }
  }

  function locateUsedByFields() {
    var object;
    ["fields", "scenes" ,"views", "tasks", "javascript", "css"].forEach(function(item) {
      Object.keys(main[item]).forEach(function(key) {
        object = main[item][key];
        object.usedObjects(object.search_fields_in());
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
        if (object.skip(item)) { return; }
        var sub_object = object.create(item, item_type);
        object.relate(sub_object);
        analyzeData(sub_object);
      });
    });
  }

  function loadObjectTypes() {
    var application = new Application(data["application"], "application");
    analyzeData(application);
    application.analyzeSettings();
    main["fields"]["not found fields"] = new Field({key: "not found fields", name: "not found"}, "application", application);
  }

  function analyzeEmails() {
    var key = 0;
    Object.keys(main.views).forEach(function(view) {
      var rules = main.views[view].input["rules"]
      if (!rules) { return; }
      var emails = rules["emails"]
      if (!emails) { return; }
      emails.forEach(function(email) {
        new Email({ key: key, criteria: email.criteria, email: email.email }, "emails", view);
        key += 1;
      })
    });
  }

  function searchdata() {
    var temp = [];

    ["objects", "fields", "scenes", "views", "tasks"].forEach(function(type) {
      Object.keys(main[type]).forEach(function(object) {
        obj = main[type][object];
        if (obj.name == "not found") { return }
        temp.push({
          value: obj.key,
          text: obj.name + " (" + obj.key + " defined in " + obj.origin.name + ")",
          parent: type,
        });
        if (type == "views" && obj.input.description) {
          temp.push({
            value: obj.key,
            text: obj.input.description + " (description of " + obj.key + " defined in " + obj.origin.name + ")",
            parent: type,
          });
        }
      });
    });

    return temp.sort(order);
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
      buildTable({ "object": main[this.data[option.idx].parent][option["value"]] });
    });
  }

  function loadData(application_id, app_subdomain, visual) {
    subdomain = app_subdomain ? "." + app_subdomain : "";
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
      if (this.readyState == 4) {
        if (this.status == 200) {
          data = JSON.parse(xhttp.response);
          loadObjectTypes();
          locateUsedByFields();
          switch(visual) {
            case "graph": {
              buildMapScreen();
              mapData();
              break;
            }
            case "tasks": {
              buildTable(main["tasks"], ["name", "key", "run_status", "used_by", "refers_to", "schedule", "criteria", "actions"], false);
              break;
            }
            case "bookoffields": {
              Object.keys(main.fields).forEach(function(field) { main.fields[field].additionalData() });
              buildTable(main["fields"], ["name", "key", "type", "origin", "equation", "equation_type", "format", "rules", "validation"], false, visual);
              break;
            }
            case "emails": {
              analyzeEmails();
              buildTable(main["emails"], ["origin", "criteria", "from_email", "from_name", "subject", "recipients", "message"], false);
              break;
            }
            default: {
              searchFields();
              buildTable(main["application"]);
            }
          }
        }
        else {
          document.getElementsByClassName('kn-td-nodata')[0].innerText = "Invalid Application ID";
        }
      }
     Knack.hideSpinner();
    };
   Knack.showSpinner();
    xhttp.open("GET", "https://api" + subdomain + ".knack.com/v1/applications/" + application_id, true);
    xhttp.send();
  }

  function mapData(application_id) {
    var Shape = joint.dia.Element.define('demo.Shape', 
      {
        attrs: {
          rect: { refWidth: '50%', refHeight: '100%', stroke: 'gray', strokeWidth: 1, rx: 10, ry: 10, style: 'cursor: zoom-in' },
          text: { refX: '25%', refY: '50%', yAlignment: 'middle', xAlignment: 'middle', fontSize: 12, style: 'cursor: zoom-in' }
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
          var len = Math.max.apply(null, text.split("\n").map(function(txt) {return 10 + txt.length }));
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
        default: return true;
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

  function createButton(id, class_name, innerHTML) {
    var button = document.createElement('div');
    button.id = id;
    button.className = class_name;
    button.innerHTML = innerHTML;
    return button;
  }

  function createCheckBox(div, id, text) {
    var checkBox = document.createElement('input');
    checkBox.type = 'checkbox';
    checkBox.id = id;
    checkBox.checked = true;
    checkBox.className = 'check_box';
    div.appendChild(checkBox);
    var text = document.createTextNode(text);
    div.appendChild(text);
  }

  function buildMapScreen() {
    var diagram = document.createElement('div');
    diagram.id = 'diagram'
    document.getElementById('view_45').appendChild(diagram);
    
    var paper = document.createElement('div');
    paper.id = 'paper';
    paper.style.width = '1200px';
    paper.style.height = '600px';
    paper.style.border = '1px solid #D8DDE6';
    diagram.appendChild(paper);
    
    diagram.appendChild(createButton('plus', 'zoom', 'Zoom In'));
    diagram.appendChild(createButton('reset', 'zoom', 'Reset'));
    diagram.appendChild(createButton('minus', 'zoom', 'Zoom Out'));
    
    var summary = document.createElement('div');
    summary.id = 'summary';
    summary.style.textAlign = "center";
    diagram.appendChild(summary);
    
    var checkBoxes = document.createElement('div');
    checkBoxes.className = 'kn-detail-body';
    
    createCheckBox(checkBoxes, 'showObjects', "Show Objects");
    createCheckBox(checkBoxes, 'showScenes', "Show Scenes");
    createCheckBox(checkBoxes, 'showViews', "Show Views");
    createCheckBox(checkBoxes, 'showFields', "Show Fields");
    createCheckBox(checkBoxes, 'showTasks', "Show Tasks");

    var application_id = document.getElementsByClassName('field_33')[0];
    application_id.appendChild(checkBoxes);
  }
  
  return {
    loadData: loadData
  }
})()