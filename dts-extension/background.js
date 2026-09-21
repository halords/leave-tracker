chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SUBMIT_TO_DTS") {
    handleDtsSubmit(request.payload)
      .then(sendResponse)
      .catch((error) => {
        console.error("DTS Submission Error:", error);
        sendResponse({ success: false, error: error.message || "Unknown error" });
      });
    return true; // Indicates we will send response asynchronously
  }
});

async function handleDtsSubmit(payload) {
  const { doc_name, document_date, leaveId } = payload;
  
  // OPA Office ID is 24 based on the extracted offices list
  const OPA_OFFICE_ID = 24; 
  const OPA_SHORTNAME = "OPA";

  // 1. Prepare Save Payload
  const savePayload = {
    document: {
      id: 0,
      category: "Communication",
      doc_name: doc_name,
      document_date: document_date,
      origin: { id: 50, shortname: "ASMU" },
      receiving_office: { id: OPA_OFFICE_ID, shortname: OPA_SHORTNAME },
      doc_type: { id: 7, document_type: "LEAVE", shortname: "LVE", category_type: "Communication", transaction_id: 1 },
      communication: { id: 1, communication: "To Internal", shortname: "INT" },
      document_transaction_type: { id: 1, transaction: "Simple", days: 3, shortname: "SIM" },
      is_confidential: false,
      is_advance_copy: false
    },
    user_initials: [],
    user_signatures: [],
    user_reviews: [],
    user_approval: [],
    copies_datas: [],
    days: 3 // from Simple transaction
  };

  // 2. Submit to Save Endpoint
  const saveRes = await fetch("https://dts.launion.gov.ph/handlers/communication/save.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(savePayload)
  });

  const saveText = await saveRes.text();
  console.log("Save Response:", saveText);
  
  // The API returns the new document ID as a raw number string
  const documentId = parseInt(saveText.trim(), 10);
  
  if (isNaN(documentId) || documentId <= 0) {
      // Check if it's an error message or not logged in
      if (saveText.includes("login") || saveText.includes("<!DOCTYPE html>")) {
          throw new Error("DTS Session Expired. Please log in to dts.launion.gov.ph");
      }
      throw new Error(`Failed to save to DTS. Response: ${saveText}`);
  }

  // 3. Fetch Receipt / QR Data
  const viewRes = await fetch("https://dts.launion.gov.ph/handlers/qrcode/view.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ id: documentId })
  });

  const qrData = await viewRes.json();
  console.log("QR Data:", qrData);

  if (!qrData || !qrData.qrcode) {
      throw new Error("Failed to retrieve QR code data from DTS.");
  }

  return {
    success: true,
    data: {
      dtsDocumentId: documentId,
      dtsTransactionNo: qrData.transaction_no,
      dtsQrCode: qrData.qrcode,
      rawQrData: qrData
    }
  };
}
