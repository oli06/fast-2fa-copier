import { showHUD, Clipboard } from "@raycast/api";

import { execSync } from "child_process";

interface CodeObject {
  code: string | null;
  date: number;
  text: string | null;
  rowId: number;
  constructedFromAttributeBody: boolean;
}

interface StreamTypedMessage {
  text: string;
  code: null|string;
}

const getCodeObject = (resultArray: string[]): CodeObject | null => {
  let text = resultArray[1];
  let code = null;

  let constructed = false;
  if (!text) {
    if (resultArray[2]) {
      const streamTypedMessage = parseAttributedBody(resultArray[2]);
      text = streamTypedMessage.text;
      code = streamTypedMessage.code;
    } else {
      return null;
    }
    constructed = true;
  }

  return {
    rowId: Number.parseInt(resultArray[0]),
    text: text,
    constructedFromAttributeBody: constructed,
    code: code ?? getCodeFromText(text),
    date: Date.parse(resultArray[3]),
  };
};

const parseAttributedBody = (hexData: string): StreamTypedMessage => {

  const b = Buffer.from(hexData, "hex");

  return parseStreamtyped(b.toString("utf-8"));
};

const parseStreamtyped = (s: string): StreamTypedMessage => {
  let code: string | null = null;

  if(s.includes("OneTimeCodeAttributeName")) {
    const displayCodeIndex = s.indexOf("displayCode");
    if(displayCodeIndex > -1) {
      const codeIndex = s.indexOf("code", displayCodeIndex + "displayCode".length)
      if(codeIndex > -1) {
        code = s.substring(displayCodeIndex + 17, codeIndex - 6);
      }
    }
  }

  if (s.includes("NSNumber")) {
    s = s.split("NSNumber")[0];
    if (s.includes("NSString")) {
      s = s.split("NSString")[1];
      if (s.includes("NSDictionary")) {
        console.log("has dict");
        s = s.split("NSDictionary")[0];
        s = s.substring(6, s.length - 12);
      }
    }
  }

  return { "text": s, "code": code};
};

const getCodeFromText = (text: string): string | null => {
  if (!text) return null;

  //cannot simply check for numeric/algebraic 4/6/8 digit codes as almost any message would match. (8 digit, 6 digit, 4 digit, word with at least one digit)

  for(const regex of ["/[ ][0-9]{8,8}[ .]/gm", 
                      "/[ ][0-9]{6,6}[ .]/gm,",
                      "/[ ][0-9]{4,4}[ .]/gm",
                      "/[ ]\\w*\\d+\\w*[ .]/gm"
                    ]) {
    const result = text.match(regex);
    if (result && result.length == 1) {
      return result[0].trim().replace(".", "");
    }
  }

  return null;
};


const getCommand = () => {
  const limit = 5;
  const chatDb = process.env.HOME + "/Library/Messages/chat.db";
  //chatDb = "/Users/oliverzernikow/Documents/test_messages_db/raycast-extension2/chat.db";
  const scriptPath = __dirname + "/assets/getChatDbLatestMessages.sh";
  const scriptArgs = [chatDb, limit.toString()];

  return `sh ${scriptPath} ${scriptArgs.join(" ")}`;
};

const sortByCodeRecency = (a: CodeObject, b: CodeObject) => {
  if (a.code && !b.code) return -1;
  if (!a.code && b.code) return 1;
  return a.date < b.date ? 1 : -1;
};

export default async function main() {
  try {
    const command = getCommand();

    const stdout = execSync(command, { encoding: "utf8" });
    const allRows = stdout.split("\n");
    const codeObjects: CodeObject[] = [];
    allRows.forEach((element) => {
      if (element) {
        const codeObject = getCodeObject(element.split("|"));
        if(codeObject) {
          codeObjects.push(codeObject);
        }
      }
    });

    codeObjects.sort(sortByCodeRecency);

    if (process) codeObjects.forEach((e) => console.log(e));
    if (codeObjects.length > 0) {
      const msg = codeObjects[0];
      if (msg.code) {
        await Clipboard.copy(msg.code);
        await showHUD(`Code ${msg.code} was copied (${new Date(msg.date).toLocaleString()}).`);
      } else {
        await showHUD("No Code was found in your latest messages.");
      }
    } else {
      await showHUD(
        "Could not extract any code from your messages. If you're sure there is one please open a ticket in GitHub."
      );
    }
  } catch (e) {
    let message;
    if (typeof e === "string") {
      message = e.toUpperCase();
    } else if (e instanceof Error) {
      message = e.message;
    }
    await showHUD(`Some error occurred. ${message}`);
  }
}
