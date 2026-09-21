export interface DtsSubmitPayload {
  leaveId: string;
  doc_name: string;
  document_date: string; // ISO string or format accepted by DTS
}

export interface DtsSubmitResponse {
  success: boolean;
  data?: {
    dtsDocumentId: number;
    dtsTransactionNo: string;
    dtsQrCode: string;
    rawQrData: any;
  };
  error?: string;
}

/**
 * Sends a message to the Chrome Extension content script to submit a leave to DTS.
 * Returns a promise that resolves with the response from the extension.
 */
export async function submitLeaveToDts(payload: DtsSubmitPayload): Promise<DtsSubmitResponse> {
  return new Promise((resolve) => {
    // 1. Setup a one-time listener for the response
    const handleResponse = (event: MessageEvent) => {
      // Only accept messages from ourselves
      if (event.source !== window) return;

      if (event.data.type && event.data.type === "DTS_BRIDGE_RESPONSE" && event.data.id === payload.leaveId) {
        window.removeEventListener("message", handleResponse);
        resolve(event.data.payload);
      }
    };

    window.addEventListener("message", handleResponse);

    // 2. Dispatch the request to the content script
    window.postMessage(
      {
        type: "DTS_BRIDGE_SUBMIT",
        payload: payload,
      },
      "*"
    );

    // 3. Setup a timeout in case the extension is not installed or fails silently
    setTimeout(() => {
      window.removeEventListener("message", handleResponse);
      resolve({
        success: false,
        error: "Timeout waiting for DTS extension response. Is the extension installed and active?",
      });
    }, 15000); // 15 seconds timeout
  });
}
