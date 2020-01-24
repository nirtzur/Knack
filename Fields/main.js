const electron = require("electron");
const { app, BrowserWindow, net } = electron;
const fs = require('fs');
const archiver = require('archiver');
const AWS = require('aws-sdk');
const params = getParams();
 
app.on("ready", async () => {
  console.log('Backup process starting');
  let mainWindow = new BrowserWindow({ show: false });
  const application_data = await getUrl(params.knack_url + params.application_id);
  const application_structure = JSON.parse(application_data);
  const counts = application_structure.application.counts;
  const object_names = application_structure.application.objects.reduce(
    (map, obj) => (map[obj.key] = obj.name, map), {}
  );

  let downloads = Object.keys(counts).reduce( (arr, key) => {
    if (key.match('object')) { arr.push(download(key, object_names)); }
    return arr;
  }, []);

  let files = await Promise.all(downloads);
  let zip_file = await zipIt(files, application_structure.application.name);
  await uploadFileToS3(zip_file);
  deleteFiles(files.concat(zip_file));
  process.exit;
});
 
function getUrl(url, headers = {}) {
  return new Promise(function(resolve, reject) {
    const request = net.request(url);

    Object.keys(headers).forEach(function(header) {
      request.setHeader(header, headers[header]);
    });
    
    let body = "";
    request.on('response', (response) => {
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => { 
        console.log(`getUrl resolve: ${url} ${body.slice(0, 40)}`);
        resolve(body);
      });
    });
    request.end();
    console.log("getUrl: " + url);
  });
}

function download(object, names) {
  const url = `${params.knack_api_url}${object}/records?rows_per_page=${params.per_page}&page=`;
  const headers = { 'X-Knack-Application-Id': params.application_id, 'X-Knack-REST-API-KEY': params.api_key }
  const file_name = `${names[object]}(${object}).${params.suffix}`;

  return new Promise(async function(resolve, reject) {
    let page = 1;
    let total_pages;

    do {
      let data = await getUrl(url + page, headers);
      let parsed_data = JSON.parse(data);
      let buffer = JSON.stringify(parsed_data["records"]);

      if (page == 1) {
        fs.writeFileSync(file_name, buffer.slice(0, -1), function (err) { if (err) throw err; });
      } else {
        fs.appendFileSync(file_name, "," + buffer.slice(1, -1), function (err) { if (err) throw err; });
      }

      page += 1;
      total_pages = total_pages || parseInt(parsed_data["total_pages"]);
    } while (page <= total_pages);

    fs.appendFileSync(file_name, "]", function (err) { if (err) throw err; });

    resolve(file_name);
  });
}

function zipIt(files, app_name) {
  return new Promise(async function(resolve, reject) {
    archiver.registerFormat('zip-encryptable', require('archiver-zip-encryptable'));
    
    const zip_file = `${app_name} ${new Date().toString()}.zip`;
    var output = fs.createWriteStream(__dirname + '/' + zip_file);

    output.on('close', () => { 
      console.log("Zip file ready");
      resolve(zip_file);
    });

    var archive = archiver('zip-encryptable', {
        zlib: { level: 9 },
        forceLocalTime: true,
        password: params.zip_password
    });
    archive.pipe(output);

    files.forEach(function(file) {
      archive.file(file, { name: file });
      console.log("Zipping file " + file);
    });
     
    archive.finalize();
    console.log("Zipping into: " + zip_file);
  });
}

function uploadFileToS3(filename) {
  const s3 = new AWS.S3({
      accessKeyId: params.AWS.accessKeyId,
      secretAccessKey: params.AWS.secretAccessKey
  });
  console.log("uploading do S3");
  return new Promise(function(resolve, reject) {
    const fileContent = fs.readFileSync(filename);
    const s3_params = {
      Bucket: 'backup-knack',
      Key: `${params.application_id}/${filename}`,
      Body: fileContent
    };

    s3.upload(s3_params, function(err, data) {
      if (err) { throw err; } 
      console.log(`File uploaded successfully. ${data.Location}`);
      resolve("Uploaded");
    });
  });
}

async function deleteFiles(files) {
  console.log("deleteing files");
  delete_files = files.reduce( (arr, file) => {
    arr.push(new Promise(function(resolve, reject) {
      fs.unlink(file, (err) => {
        if (err) throw err;
        console.log(`file ${file} deleted`);
        resolve(`file ${file} deleted`);
      });
    }));
    return arr;
  }, []);
  await Promise.all(delete_files);
  console.log("All files deleted");
}

function getParams() {
  console.log('fetching params');
  return JSON.parse(fs.readFileSync('main.json'));
}