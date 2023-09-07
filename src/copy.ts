import { getMessage } from './extractMessage';
import { showHUD, Clipboard } from "@raycast/api";

export default async function main() {
  const messageCodes = await getMessage();
  if(messageCodes) {
    messageCodes.sort((a,b) => {
      if(a.code && !b.code)
        return -1
  
      if(!a.code && b.code)
        return 1;
  
      return a.date < b.date ? 1 : -1;
    });

    messageCodes.forEach((e) =>
    console.log(e)
  );
  
    if(messageCodes.length > 0) {
      //first element contains the latest code
      const msg = messageCodes[0];
      if(msg.code) {
        console.log("copied: " + msg.code)
        await Clipboard.copy(msg.code);
        await showHUD("Code " + msg.code + " was copied to Clipboard (Message Date: "+ msg.date.toString() +").");
      } else {
        await showHUD("No Code was found in your latest 10 messages.");
      }
    }

  } else {
    await showHUD("The Extension failed to extract any data from your messages.");
  }

}
