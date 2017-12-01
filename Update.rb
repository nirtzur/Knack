require 'net/http'
require 'byebug'
require 'json'

def ApiCall(path = "", action = "Get", data = nil, params = nil)
  base = 'https://us-api.knack.com/v1/objects'
  uri = URI(base + path)
  uri.query = URI.encode_www_form(params) if params

  request = Object.const_get("Net::HTTP::#{action}").new(uri.request_uri)
  request['X-Knack-Application-Id'] = '' # 'APPID'
  request['X-Knack-REST-API-Key'] = '' #'KEY'
  request.set_form_data(data) if data

  response = Net::HTTP.start(uri.host, uri.port, use_ssl: true) do |http|
    puts "Calling #{action} on #{uri.request_uri}"
    http.request(request)
  end

  return response
end

def lookup(data, street)
  data.each { |pre|
    if pre["field_464"]["street"] && street && (pre["field_464"]["street"].downcase == street.downcase)
      return pre
    end
  }
  return nil
end

response = ApiCall('/object_22/records', "Get", nil, { page: 1, rows_per_page: 500, format: "raw" })
preproperties = JSON.parse(response.body)["records"]

response = ApiCall('/object_1/records', "Get", nil, { page: 1, rows_per_page: 1000, format: "raw" })
properties = JSON.parse(response.body)["records"]


properties.each {|property|
  pre = lookup(preproperties, property["field_2"]["street"])
  puts pre ? "match pro #{property["id"]} with pre #{pre["id"]}" : "no match for pro #{property["id"]}"

  # data = { field_799: pre["id"] }
  # pre["field_468"].each {|budget|
  #   budget_path = "/object_18/records/" + budget["id"]
  #   budget = ApiCall(budget_path, "Put", data)
  # }
}