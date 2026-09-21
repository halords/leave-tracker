// Listens for custom events dispatched by the Leave Tracker frontend
window.addEventListener("message", (event) => {
  // We only accept messages from ourselves
  if (event.source !== window) return;

  if (event.data.type && event.data.type === "DTS_BRIDGE_SUBMIT") {
    const payload = event.data.payload;

    console.log("Content Script: Received payload from Leave Tracker", payload);

    // Forward the message to the background script
    chrome.runtime.sendMessage(
      { action: "SUBMIT_TO_DTS", payload: payload },
      (response) => {
        console.log("Content Script: Received response from Background", response);

        // Send the response back to the page
        window.postMessage(
          { type: "DTS_BRIDGE_RESPONSE", payload: response, id: payload.leaveId },
          "*"
        );
      }
    );
  }
});
