import { Clipboard, showToast, Toast, open } from "@raycast/api";

import { execSync } from "child_process";
const CHAT_DB = "/Library/Messages/chat.db"

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
        s = s.split("NSDictionary")[0];
        s = s.substring(6, s.length - 12);
      }
    }
  }

  return { "text": s, "code": code};
};

const getCodeFromText = (text: string): string | null => {
  if (!text) return null;

  //cannot simply check for numeric/algebraic 4/6/8 digit codes as almost any word would match. 
  //Instead match for 8 digit, 6 digit, 4 digit and at last words with at least one digit

  for(const regex of [/[ ][0-9]{8,8}[ .]/gm, 
                      /[ ][0-9]{6,6}[ .]/gm,
                      /[ ][0-9]{4,4}[ .]/gm,
                      /[ ]\\w*\\d+\\w*[ .]/g
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
  const chatDbPath = process.env.HOME + CHAT_DB;
  const scriptPath = __dirname + "/assets/getChatDbLatestMessages.sh";
  const scriptArgs = [chatDbPath, limit.toString()];

  return `sh ${scriptPath} ${scriptArgs.join(" ")}`;
};

const arePermissionsGranted = (): boolean => {
  const scriptPath = __dirname + "/assets/checkPermissions.sh";
  const chatDbPath = process.env.HOME + CHAT_DB;
  const command = `sh ${scriptPath} ${chatDbPath}`;
  
  const stdout = execSync(command, { encoding: "utf8" });
  return !stdout || stdout !== "blocked";
}

const sortByCodeRecency = (a: CodeObject, b: CodeObject) => {
  if (a.code && !b.code) return -1;
  if (!a.code && b.code) return 1;
  return a.date < b.date ? 1 : -1;
};

export default async function main() {
  try {
    if(!arePermissionsGranted()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Missing Permissions",
        message: `Please enable Full-Disk Access for the Raycast Application to make this extension work.`,
        primaryAction: {
          title: "Open System Preferences",
          onAction: async () => {
            await open("x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles", "com.apple.systempreferences");
          }
        }
      });
      return;
    }

    const command = getCommand();
    const stdout = execSync(command, { encoding: "utf8" });

    if(!stdout) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: `Command execution failed. Try again.`,
      });
      return;
    }

    const allRows = stdout.split("\n");
    if(!allRows) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: `Could not extract any messages from your chats.`,
      });
      return;
    }
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

    if (codeObjects.length > 0) {
      const msg = codeObjects[0];
      if (msg.code) {
        await Clipboard.copy(msg.code);
        showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: `Security code ${msg.code} copied to your clipboard.`,
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: `No code found in your latest 5 messages.`,
        });
      }
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: `No code found in your latest 5 messages.`,
        primaryAction: {
          title: "Open Github Issues",
          onAction: async () => {
              await open("https://github.com/raycast/extensions/issues", "com.google.Chrome");
            }
        },
      });
    }
  } catch (e) {
    let message;
    if (typeof e === "string") {
      message = e.toUpperCase();
    } else if (e instanceof Error) {
      message = e.message;
    }

    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: `Some Error occured. ${message}.`,
    });
  }
}
