var fs = require("fs");

const initSqlJs = require("sql.js");
//const filebuffer = fs.readFileSync("/Users/oliverzernikow/Library/Messages/chat.db");
const filebuffer = fs.readFileSync("/Users/oliverzernikow/Documents/test_messages_db/raycast-extension2/chat.db");
export async function getMessage() {
    //copyChatFiles();

    console.log("get Message");
    const SQL = await initSqlJs({
        locateFile: (file) => `/Users/oliverzernikow/Documents/test_messages_db/sql-wasm.wasm`,
    });

    // Load the db
    console.log("load after init");
    const db = new SQL.Database(filebuffer);
    //const res = db.exec('SELECT * FROM message WHERE is_sent == 0 ORDER BY date DESC LIMIT 10');
    
    console.log("before db run");
    const stmt1 = db.prepare("SELECT ROWID from message WHERE is_sent=0 order by rowid desc limit 5");
    while (stmt1.step()) {
        console.log(stmt1.getAsObject());
      }
    stmt1.free();

    const pragmaStatement = db.prepare('PRAGMA wal_checkpoint(full)');
    while(pragmaStatement.step()) console.log(pragmaStatement.get());
    pragmaStatement.free();
    console.log("db run complete")
    const stmt2 = db.prepare("SELECT ROWID from message WHERE is_sent=0 order by rowid desc limit 5");

    while (stmt2.step()) {
        console.log(stmt2.getAsObject());
      }

      stmt2.free();
    
    //const stmt = db.prepare("SELECT text, attributedBody, datetime((date / 1000000000) + 978307200, 'unixepoch', 'localtime') as timestamp FROM message WHERE is_sent=0 ORDER BY ROWID DESC LIMIT 15");


    //const stmt = db.prepare("SELECT ROWID from message WHERE is_sent=0 order by rowid desc limit 5");

      console.log("blubb")
      console.log("bl2")

  // Bind values to the parameters and fetch the results of the query
  var transformed = [];
  /*while (stmt.step()) {
    const result = stmt.getAsObject();
console.log(result)
    //transformed.push(getCodeObject(result));
  }
console.log("reaching this.");
  stmt.free();*/
  db.close()

  //console.table(JSON.stringify(transformed))
  console.log(transformed.length)

  return transformed
}

function copyChatFiles() {
    const basePath = "/Users/oliverzernikow/Documents/test_messages_db/";
    const paths = ["chat.db", "chat.db-wal", "chat.db-shm"];
    const raycast = "raycast-extension2";
    if(!fs.existsSync(basePath + raycast)) {
        fs.mkdirSync(basePath + raycast);
    }

    paths.forEach(file => { 
        const path = basePath + file;
        const destination = basePath + raycast + "/" + file;
        fs.copyFileSync(path, destination);
    });
    console.log("copied files");
}

function getCodeObject(result) {
    var msgBody = result["text"]

    if(!msgBody) {
        msgBody = parseAttributedBody(Buffer.from(result["attributedBody"]).toString("utf-8"))
    } else {
        console.log("we found text " + msgBody)
    }

    return {text: msgBody, code: parse_text_to_code(msgBody), date: Date.parse(result['timestamp']), hrd: result['timestamp']};
}

function parseAttributedBody(s) {
    if(s.includes("NSNumber")) {
        s = s.split("NSNumber")[0]
        if(s.includes("NSString")) {
            s = s.split("NSString")[1]
            if(s.includes("NSDictionary")) {
                s = s.split("NSDictionary")[0]
                s = s.substr(8, s.length - 20)
            }
        }
    }

    return s
}


function parse_text_to_code(text) {
  const regex = /[ ][0-9][0-9][0-9][0-9][0-9][0-9][ .]/gm;
  const result = text.match(regex);
  if (result && result.length == 1) {
    return result[0].trim().replace(".", "");
  }

  return null;
}
