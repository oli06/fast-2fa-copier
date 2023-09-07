const sqlite3 = require('sqlite3').verbose();
const tstream = require('node-typestream');
const WriteAbleStream = require('node:stream/web');
const fs = require('fs');
const { exec } = require('child_process');
const escapeString = require('sql-string-escape');

//const { promisify } = require('util');

let arguments = process.argv;
const dbFilePath = arguments[2];
var db = new sqlite3.Database(dbFilePath);
var query = 'select text, ROWID, attributedBody from message where text is null and attributedBody is not null limit 10;';

db.each(query,function (res, row) {

	(function run() {
		try {
			var fileName = row.ROWID + '.bin';
			console.log('Starting ' + row.ROWID);
			var pattern = /^((?!�).)*$/;
			fs.writeFile(fileName, row.attributedBody, function (err){
				//var content = new TextDecoder().decode(row.attributedBody);
				var content = exec('C:\\Users\\johnn\\AppData\\Local\\Packages\\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\\LocalCache\\local-packages\\Python311\\Scripts\\pytypedstream.exe decode ' + fileName +'|egrep \'NSString|NSMutableString\' |grep -v __', (error, stdout, stderr) => {
						if (error) {
							console.error(`error: ${error.message}`);
							content = 'No good text avail';
						}

						if (stderr) {
							console.error(`stderr: ${stderr}`)
							content = 'No good text available.';
						}

						//success
						var content = stdout.split('(')[1];
						content = content.replace(')','');
						content = escapeString(content);

						var updateQuery = 'update message set text = ' + content + ' where ROWID = \'' + row.ROWID +'\'';

						console.log(updateQuery);

						db.run(updateQuery);

						fs.rm(fileName, { recursive:true }, (err) => {
							if(err){
								console.log(err);
							}
						});

					}
				);
			});
		}
			// Shows error
		catch (err) {
			console.error('pipeline failed with error:', err);
		}
	})();
});