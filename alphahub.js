window.addListeners = function ($) {

  function ajaxCall(action, path, callback, data, errorcall) {
    $.ajax({
      url: 'https://api.knackhq.com/v1/objects/' + path,
      type: action,
      headers: {
        'X-Knack-Application-Id': ALPHAHUB_APP_ID,
        'X-Knack-REST-API-Key': ALPHAHUB_CODE
      },
      data: data,
      success: function (response) {
        typeof callback === 'function' && callback(response);
      },
      error: function (e) {
        console.log(JSON.stringify(e));
        typeof errorcall === 'function' && errorcall(e);
      }
    })
  }

  function ajaxView(action, path, callback, data) {
    $.ajax({
      url: 'https://api.knack.com/v1/scenes/' + path,
      type: action,
      headers: {
        'X-Knack-Application-Id': Knack.application_id,
        'Authorization': Knack.getUserToken(),
        'X-Knack-REST-API-Key': 'Knack',
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(data),
      success: function (response) {
        typeof callback === 'function' && callback(response);
      },
      error: function (e) {
        console.log(JSON.stringify(e));
      }
    })
  }

  var new_identifier;
  var preproperty_id;
  var current_budget;
  var create_budget;

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

    ajaxCall('GET', obj + '/records?format=raw&filters=' + encodeURIComponent(JSON.stringify(filters)), function (response) { duplicate_subs(response, obj, fld) });
  }

  function updateSubRecords(data) {
    if (create_budget) {
      sub_records('object_19', 'field_470');
      sub_records('object_20', 'field_471');
      sub_records('object_21', 'field_469');
    }

    $('.kn-message p')[0].innerHTML = "Redirecting to newly created record"
    window.location.href = "https://alphahub.knack.com/database#rehab-budget/pre-property-details/" + preproperty_id + "/view-budget-details/" + new_identifier;

  }

  function getPre(data) {
    $('.kn-message p')[0].innerHTML = "Getting Pre Property to update"
    new_identifier = data["id"];
    updateSubRecords();
  }

  function createRecord(data) {
    $('.kn-message p')[0].innerHTML = "Creating new record";
    data["field_579"] = "Revised";
    var string = new Date().toLocaleString();
    var resultArray = string.split(":");
    var result = string.replace(":" + resultArray[2], " ") + resultArray[2].split(" ")[1];
    data["field_472"] = result;

    ajaxCall('POST', 'object_18/records', getPre, data);
  }

  function getMyData(view) {
    $('.kn-message p')[0].innerHTML = "Copying record";
    ajaxCall('GET', 'object_18/records/' + current_budget + '?format=raw', createRecord);
  }

  // set restriction and last action indication color on full row
  $(document).on('knack-view-render.view_88', function (event, view, data) {
    $("div#view_88 tbody td span.col-0").each(function () {
      $(this).parent().parent().css("backgroundColor", $(this).parent().css("backgroundColor"));
    })
  });

  $(document).on('knack-view-render.view_89', function (event, view, data) {
    $("div#view_89 tbody td span.col-0").each(function () {
      $(this).parent().parent().css("backgroundColor", $(this).parent().css("backgroundColor"));
    })
  });

  $(document).on('knack-view-render.view_91', function (event, view, data) {
    $("div#view_91 tbody td span.col-0").each(function () {
      $(this).parent().parent().css("backgroundColor", $(this).parent().css("backgroundColor"));
    });
  });

  $(document).on('knack-view-render.view_92', function (event, view, data) {
    $("div#view_92 tbody td span.col-0").each(function () {
      $(this).parent().parent().css("backgroundColor", $(this).parent().css("backgroundColor"));
    })
  });

  // Add color to ESCROW Sell table
  $(document).on('knack-view-render.view_454', function (event, view, data) {
    $("div#view_454 tbody td span.col-0").each(function () {
      $(this).parent().parent().css("backgroundColor", $(this).parent().css("backgroundColor"));
    })
  });


  // remove form if missing fund amount is 0
  $(document).on('knack-view-render.view_211', function (event, view, data) {
    var field_amount = $("tbody tr.field_241 .kn-value span").first();
    var amount = field_amount.text();
    if (amount == "$0.00") {
      $('#view_209').css('display', 'none');
    }
  });

  // set selector to "PRECISION ASSETS" and funds to calculated amount
  $(document).on('knack-view-render.view_210', function (event, view, data) {
    // var amount = window.document.getElementsByClassName('field_241')[0].getElementsByTagName('td')[0].getElementsByTagName('span')[0].innerHTML;
    var amount = window.document.getElementsByClassName('field_241')[0].getElementsByClassName('kn-detail-body')[0].innerText;
    $("#field_297").val(amount);
    $("#view_210-field_55").val("5f5d0f3925040f00158c5aba").trigger('liszt:updated');
  });


  // switch cashflow reports based on monthly/yearly filter
  $(document).on('knack-view-render.view_472', function (event, view, data) {
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
  $(document).on('knack-page-render.scene_260', function (event, page) {
    $('table.expand-records').css('width', 'inherit');
  });


  // disable payoff link if property status is not 'closed'
  // control which menu items to show for New Construction properties
  $(document).on('knack-view-render.view_77', function (event, view, data) {
    //  if ($($($("ul.kn-grid-12").children()[9]).children()).children()[0].innerHTML == "Monitoring") {
    //    return;
    //  }
    var status = $('#view_99 select#view_99-field_132').val();
    if (status != "Closed") {
      $('div#view_77 li.kn-link-10').css('display', 'none'); //Payoff
    }

    $('div#view_77 li.kn-link-12').css('display', 'none'); // Deed of Trust

    var new_construction = $('#view_99 #kn-input-field_923').first().text().trim();
    if (new_construction == "Yes") {
      $('div#view_77 li.kn-link-1').css('display', 'none'); // Buying
      $('div#view_77 li.kn-link-2').css('display', 'none'); // Occupied
      $('div#view_77 li.kn-link-3').css('display', 'none'); // Rehab
      $('div#view_77 li.kn-link-11').css('display', 'none'); // Wireform
    } else {
      $('div#view_77 li.kn-link-4').css('display', 'none'); // Buying New
      $('div#view_77 li.kn-link-5').css('display', 'none'); // P&D
      $('div#view_77 li.kn-link-6').css('display', 'none'); // New Construction
      $('div#view_77 li.kn-link-13').css('display', 'none'); // Wireform 1
      $('div#view_77 li.kn-link-14').css('display', 'none'); // Wireform 2
    }
  });

  // hide payoff data if there are missing fields
  $(document).on('knack-page-render.scene_79', function (event, view, data) {
    //  if ($($($("ul.kn-grid-12").children()[9]).children()).children()[0].innerHTML == "Monitoring") {
    //    return;
    //  }

    var display = $('#view_152 tr.field_2').css('display');
    if (display == 'none') {
      $('#view_133, #view_134, #view_211, #view_209').css('display', 'none');
    }
  });


  // hide tables in backup screen
  $(document).on('knack-page-render.scene_151', function (event, view, data) {
    $('#view_270 table, #view_271 table, #view_272 table, #view_738 table, #view_739 table').css('display', 'none');
  });

  // test
  //$(document).on('knack-view-render.view_180', function(event, view, data) {
  //  debugger;
  //});


  // Duplicate last budget update record
  $(document).on('knack-view-render.view_512', function (event, view, data) {
    $('#view_512 input[type=submit]').on("click", function (e) {
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
  $(document).on('knack-view-render.view_313', function (event, view, data) {
    var budget_id;
    if (data["field_580_raw"]) {
      ajaxCall('PUT', 'object_22/records/' + data["id"], null, { "field_580": false });
      budget_id = /id=\"(\S+)\"/.exec(data["field_430"])[1];
      window.location.href = "https://alphahub.knack.com/database#rehab-budget/pre-property-details/" + data["id"] + "/view-budget-details/" + budget_id;
    }
  });

  // set budget color on full row
  $(document).on('knack-view-render.view_505', function (event, view, data) {
    $("tbody td span.col-1").each(function () {
      $(this).parent().parent().css("backgroundColor", $(this).parent().css("backgroundColor"));
    })
  });

  // Create new expense record
  $(document).on('knack-view-render.view_513', function (event, view, data) {
    $('#view_513 input[type=submit]').on("click", function (e) {

      $('.kn-form-confirmation').css('display', 'block');
      preproperty_id = $('.crumb')[0].value;
      data = {};
      data["field_579"] = "Expense"; // Type
      data["field_431"] = 0; // Management Fee
      data["field_507"] = "Other"; // Inspection
      data["field_635"] = 0; // Inspection
      data["field_799"] = [preproperty_id];

      create_budget = false;
      ajaxCall('POST', 'object_18/records', getPre, data);
      return false;
    });
  });

  // Toggle 'create revised budget' option
  $(document).on('knack-view-render.view_431', function (event, view, data) {
    $('#view_431').css('display', 'none');
    setTimeout(function () {
      if (data["field_801"] > 1) {
        $('#view_512').css('display', 'none');
      }
    }, 200);
  });


  // Switch Paints screen based on budget/expense
  $(document).on('knack-page-render.scene_221', function (event, page) {
    if ($("#view_456-field_579").val() == "Expense") {
      $('.view_405').css('display', 'none');
      $('.view_409').css('display', 'none');
    };
  });


  // Switch Flooring screen based on budget/expense
  $(document).on('knack-page-render.scene_224', function (event, page) {
    if ($("#view_457-field_579").val() == "Expense") {
      $('.view_411').css('display', 'none');
    }
    else {
      $('.view_457').css('display', 'none');
    };
  });


  // Switch Finishing screen based on budget/expense
  $(document).on('knack-page-render.scene_226', function (event, page) {
    if ($("#view_413-field_579").val() == "Expense") {
      $('.view_415').css('display', 'none');
      $('.view_416').css('display', 'none');
      $('.view_418').css('display', 'none');
      $('.view_419').css('display', 'none');
    };
  });

  $(document).on('knack-view-render.view_621', function (event, view, data) {
    var record_id = $('#view_621 a')[0].href.split('/').slice(-1)[0];
    $('#view_621 a')[0].href += "?view_622_vars=%7B%22field_1008%22%3A%5B%22" + record_id + "%22%5D%7D";
  });

  $(document).on('knack-view-render.view_631', function (event, view, data) {
    $("#view_631 tbody td").each(function () {
      if ($(this).text().match(/-/) == null) {
        if (parseInt($(this).text().match(/\$(.*)/)[1]) > 0) {
          $(this).css("backgroundColor", "pink");
        }
      }
    });
  });

  $(document).on('knack-view-render.view_632', function (event, view, data) {
    $("#view_632 tbody td").each(function () {
      if ($(this).text().match(/-/) == null) {
        if (parseInt($(this).text()) > 0) {
          $(this).css("backgroundColor", "pink");
        }
      }
    });
  });

  // Use one selector for two graphs in Report "Current Investments vs Budget Per Investor Trend Report"
  $(document).on('knack-view-render.view_662', function (event, view, record) {
    $('#view_662 button[type=submit]').on("click", function (e) {
      e.preventDefault();
      var filter = [{ "field": "field_1127", "operator": "is", "value": $('#view_662-field_55').val() }];
      var filter_string = encodeURIComponent(JSON.stringify(filter));
      window.location.href = "https://alphahub.knack.com/database#reports/investor-budget-history-report/?view_642_0_filters=" + filter_string + "&view_642_1_filters=" + filter_string;
      return false;
    })
  });


  // Use one selector for all foremen results reports
  $(document).on('knack-view-render.view_668', function (event, view, data) {
    $('#view_668 input[type=submit]').on("click", function (e) {
      var url = "https://alphahub.knack.com/database#reports/properties10/"
      var view_613_filter = [{ "value": "", "text": "12 Months", "operator": "is during the previous", "field": "field_112", "type": "rolling years", "range": "1" }]
      var view_613_string = encodeURIComponent(JSON.stringify(view_613_filter));
      var filter = [{ "field": "field_914", "operator": "is", "value": $('#view_668-field_914').val() }];
      var filter_string = encodeURIComponent(JSON.stringify(filter));
      window.location.href = url + "?view_613_0_filters=" + view_613_string + "&view_610_filters=" + filter_string + "&view_664_filters=" + filter_string + "&view_666_filters=" + filter_string;
      return false;
    });
  });

  var total = 0;
  var completed = 0;
  var errors = 0;

  function showProgress(end = false) {
    var td = $('.view_698 td.kn-td-nodata')
    if (typeof td[0] != "undefined") {
      if (end) {
        td[0].textContent = "Refreshing data...";
      } else {
        td[0].textContent = "Progress...   Completed: " + completed + "  Errors: " + errors + " Out of total: " + total;
      }
    }
  }

  async function create_rehab_items(record) {
    var table = await new Promise(r => ajaxCall('GET', 'object_26/records?rows_per_page=1000', r));
    total = table.records.length;
    completed = 0;
    errors = 0;

    items = table.records.reduce((arr, item) => {
      arr.push(new Promise(async function (resolve, reject) {
        var data = {};
        // data['field_1378'] = [item.id];
        data['field_1379'] = record.id; // property id
        data['field_1398'] = item.field_1366; // rehab setup item
        data['field_1399'] = item.field_1367; // rehab setup description
        data['field_1401'] = item.field_1402; // iten sort order #

        // ajaxView('POST', 'scene_365/views/view_714/records', function() {
        ajaxCall('POST', 'object_37/records',
          function () {
            completed += 1;
            showProgress();
            resolve();
          },
          data,
          function () {
            errors += 1;
            showProgress();
            resolve();
          }
        );
      }));
      return arr;
    }, []);
    await Promise.all(items);

    showProgress(true);
    Knack.views["view_698"].model.fetch();
  }

  // create rehab items on new rehab property
  // $(document).on('knack-form-submit.view_697', function(event, view, record) {
  //   create_rehab_items(record);
  // });


  $(document).on('knack-page-render.scene_81', function (event, page) {
    var cells = $("#view_141 tr.kn-table-totals td");
    var totalCost = parseFloat(cells[8].innerText.replaceAll(/(\$|,)/g, ''));
    var profit = parseFloat(cells[11].innerText.replaceAll(/(\$|,)/g, ''));
    var months = parseFloat(cells[13].innerText.replaceAll(/(\$|,)/g, ''));
    cells[15].innerHTML = '<strong>' +  (profit/totalCost/months*100).toFixed(2) + '</strong>'; // profit per month %
  });

  $(document).on('knack-view-render.view_141', function (event, view, data) {
    setTimeout(function () {
      var cells = $("#view_141 tr.kn-table-totals td");
      var totalCost = parseFloat(cells[8].innerText.replaceAll(/(\$|,)/g, ''));
      var profit = parseFloat(cells[11].innerText.replaceAll(/(\$|,)/g, ''));
      var months = parseFloat(cells[13].innerText.replaceAll(/(\$|,)/g, ''));
      cells[15].innerHTML = '<strong>' +  (profit/totalCost/months*100).toFixed(2) + '</strong>'; // profit per month %
    }, 200);
  });
}