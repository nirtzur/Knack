// --------------- Pre-Property starts here ------------------
function ajaxCall(action, path, callback, data) {
  $.ajax({
    url: 'https://api.knackhq.com/v1/objects/' + path,
    type: action,
    headers: {
      'X-Knack-Application-Id': MKFI_APP_ID,
      'X-Knack-REST-API-Key': MKFI_CODE
    },
    data: data,
    success: function(response) {
      typeof callback === 'function' && callback(response);
    },
    error: function(e) {
      alert(e);
    }
  })
}

var new_identifier;
var preproperty_id;
var current_budget;
var create_budget;
var rehab_setup_id;

function duplicate_subs(response, obj, fld) {
  for (var rec in response["records"]) {
    var data = response["records"][rec];
    data[fld] = new_identifier;
    ajaxCall('POST', obj + '/records', null, data);
  }
}

function sub_records(obj, fld) {
  var filters = [
    {
      field: fld,
      operator: 'contains',
      value: current_budget
    }
  ]

  ajaxCall('GET', obj + '/records?format=raw&filters=' + encodeURIComponent(JSON.stringify(filters)), function(response) { duplicate_subs(response, obj, fld) } );
}
  
function updateSubRecords(data) {
  if (create_budget) {
    sub_records('object_19', 'field_470');
    sub_records('object_20', 'field_471');
    sub_records('object_21', 'field_469');
  }
  
  $('.kn-message p')[0].innerHTML= "Redirecting to newly created record"
  window.location.href = "https://mkfiprecision.knack.com/database#rehab-budget/pre-property-details/" + preproperty_id + "/view-budget-details/" + new_identifier;

}

function getPre(data) {
  $('.kn-message p')[0].innerHTML= "Getting Pre Property to update"
  new_identifier = data["id"];
  updateSubRecords();
}

function createRecord(data) {
  $('.kn-message p')[0].innerHTML= "Creating new record";
  data["field_579"] = "Revised";
  
  ajaxCall('POST', 'object_18/records', getPre, data);   
}

function getMyData(view) {
  $('.kn-message p')[0].innerHTML = "Coping record";
  ajaxCall('GET', 'object_18/records/' + current_budget + '?format=raw', createRecord);
}

function updateMaxSetup(data) {
  ajaxCall('PUT', 'object_27/records/57953902ec4d42c8487f583e', null, {"field_674": data["id"]});
  window.location.href = "https://mkfiprecision.knack.com/database#rehab-setup/edit-rehab-setup/" + data["id"];
}

function createSetup(response) {
  ajaxCall('POST', 'object_26/records', updateMaxSetup, response["records"][0]);
}


function getLastSetup(view) {
  ajaxCall('GET', 'object_26/records/' + '?format=raw&sort_field=field_638&sort_order=desc&rows_per_page=1', createSetup);
}

window.addListeners = function($) { 
  // set restriction and last action indication color on full row
  $(document).on('knack-view-render.view_88', function(event, view, data) {
      $("tbody td span.col-0").each(function() {
        $(this).parent().parent().css("backgroundColor", $(this).parent().css("backgroundColor"));
      })
  });

  $(document).on('knack-view-render.view_89', function(event, view, data) {
      $("tbody td span.col-0").each(function() {
        $(this).parent().parent().css("backgroundColor", $(this).parent().css("backgroundColor"));
      })
  });

  $(document).on('knack-view-render.view_91', function(event, view, data) {
      $("tbody td span.col-0").each(function() {
        $(this).parent().parent().css("backgroundColor", $(this).parent().css("backgroundColor"));
      })
  });

  $(document).on('knack-view-render.view_92', function(event, view, data) {
      $("tbody td span.col-0").each(function() {
        $(this).parent().parent().css("backgroundColor", $(this).parent().css("backgroundColor"));
      })
  });

  // Add color to ESCROW Sell table
  $(document).on('knack-view-render.view_454', function(event, view, data) {
      $("tbody td span.col-0").each(function() {
        $(this).parent().parent().css("backgroundColor", $(this).parent().css("backgroundColor"));
      })
  });


  // remove form if missing fund amount is 0
  $(document).on('knack-view-render.view_211', function(event, view, data) {
    var field_amount = $("tbody tr.field_241 .kn-value span").first();
    var amount = field_amount.text();
    if (amount == "$0.00") {
      $('#view_209').css('display', 'none');
    }  
  });

  // set selector to "PRECISION ASSETS" and funds to calculated amount
  $(document).on('knack-view-render.view_210', function(event, view, data) {
    var amount = window.document.getElementsByClassName('field_241')[0].getElementsByTagName('td')[0].getElementsByTagName('span')[0].innerHTML;
    $("#field_297").val(amount);
    $("#view_210-field_55").val("55c3d24b6393963e5f81be74").trigger('liszt:updated');
  });


  // switch cashflow reports based on monthly/yearly filter
  $(document).on('knack-view-render.view_472', function(event, view, data) {
    $('#view_472 table').css('display', 'none');
  //  $('table.expand-records').css('width', 'inherit');

    var option = view["filters"][0]["value"];
    if (option == "2") {
      $('#view_482').css('display', 'block');
      $('#view_474').css('display', 'none');
    } else {
      $('#view_474').css('display', 'block');
    $('#view_482').css('display', 'none');
    }
  });


  // reduce table sizes in cashflow
  $(document).on('knack-page-render.scene_260', function(event, page) {
    $('table.expand-records').css('width', 'inherit');
  });


  // disable payoff link if property status is not 'closed'
  $(document).on('knack-view-render.view_77', function(event, view, data) {
  //  if ($($($("ul.kn-grid-12").children()[9]).children()).children()[0].innerHTML == "Monitoring") {
  //    return;
  //  }
    var status = $('#view_99 select#view_99-field_132').val();
    if (status != "Closed") {
      $('div#view_77 li.kn-link-6').css('display', 'none');
    } else {
      $('div#view_77 li.kn-link-6').css('display', 'block');
    }
  });

  // hide payoff data if there are missing fields
  $(document).on('knack-page-render.scene_79', function(event, view, data) {
  //  if ($($($("ul.kn-grid-12").children()[9]).children()).children()[0].innerHTML == "Monitoring") {
  //    return;
  //  }

    var display = $('#view_152 tr.field_2').css('display');
    if (display == 'none') {
    $('#view_133, #view_134, #view_211, #view_209').css('display', 'none');
    }
  });


  // hide tables in backup screen
  $(document).on('knack-page-render.scene_151', function(event, view, data) {
    $('#view_270 table, #view_271 table, #view_272 table').css('display', 'none');
  });

  // test
  //$(document).on('knack-view-render.view_180', function(event, view, data) {
  //  debugger;
  //});

    
  // Duplicate last budget update record
  $(document).on('knack-view-render.view_509', function(event, view, data) {
    $('#view_509 input[type=submit]').on("click", function(e) {
      var table = $('.view_505 table')[0];
      create_budget = true;

      $('.kn-form-confirmation').css('display', 'block');
      preproperty_id = $('.crumb')[0].value;
      current_budget = table.rows[table.rows.length - 1].id;
      getMyData(view);
      return false;
    });
  });

  // Redirect to budget details immediately after creating a pre-property record
  $(document).on('knack-view-render.view_313', function(event, view, data) {
    var budget_id;
    if (data["field_580_raw"]) {
      ajaxCall('PUT', 'object_22/records/' + data["id"], null , {"field_580": false});
      budget_id = /id=\"(\S+)\"/.exec(data["field_430"])[1];
      window.location.href = "https://mkfiprecision.knack.com/database#rehab-budget/pre-property-details/" + data["id"] + "/view-budget-details/" + budget_id;
    }
  });

  // set budget color on full row
  $(document).on('knack-view-render.view_505', function(event, view, data) {
      $("tbody td span.col-1").each(function() {
        $(this).parent().parent().css("backgroundColor", $(this).parent().css("backgroundColor"));
      })
  });

  // Toggle 'create revised budget' option
  $(document).on('knack-view-render.view_431', function(event, view, data) {
    $('#view_431').css('display', 'none');
    setTimeout(function() {
      rehab_setup_id = data["field_639_raw"][0];
      if (data["field_801"] > 1) {
        $('#view_509').css('display', 'none');
      }
    }, 200);
  });

  // Create new expense record
  $(document).on('knack-view-render.view_510', function(event, view, data) {
    $('#view_510 input[type=submit]').on("click", function(e) {

      $('.kn-form-confirmation').css('display', 'block');
      preproperty_id = $('.crumb')[0].value;
      data = {};
      data["field_579"] = "Expense"; // Type
      data["field_431"] = 0; // Management Fee
      data["field_507"] = "Other"; // Inspection
      data["field_635"] = 0; // Inspection
      data["field_639"] = rehab_setup_id; // Rehab setup id
      data["field_799"] = [preproperty_id];
    
      create_budget = false;
      ajaxCall('POST', 'object_18/records', getPre, data);
      return false;
    });
  });

  // Hide Edit Rehab Setup button so the link is not available, but the edit screen continues to exist
  $(document).on('knack-view-render.view_442', function(event, view, data) {
    $('.field_643').css('display', 'none');
  });


  // Duplicate last setup record
  $(document).on('knack-view-render.view_446', function (event, view, data) {
    $('#view_446 input[type=submit]').on("click", function(e) {
    getLastSetup(view);
      return false;
    });
  });


  // Switch Paints screen based on budget/expense
  $(document).on('knack-page-render.scene_221', function(event, page) {
      if ($("#view_456-field_579").val() == "Expense") {
      $('.view_405').css('display', 'none');
          $('.view_409').css('display', 'none');
      } 
    else {
          $('.view_456').css('display', 'none');
    };
  });


  // Switch Flooring screen based on budget/expense
  $(document).on('knack-page-render.scene_224', function(event, page) {
      if ($("#view_457-field_579").val() == "Expense") {
      $('.view_411').css('display', 'none');
      } 
    else {
          $('.view_457').css('display', 'none');
    };      
  });


  // Switch Finishing screen based on budget/expense
  $(document).on('knack-page-render.scene_226', function(event, page) {
      if ($("#view_413-field_579").val() == "Expense") {
      $('.view_415').css('display', 'none');
      $('.view_416').css('display', 'none');
      $('.view_418').css('display', 'none');
      $('.view_419').css('display', 'none');
    };      
  });

}