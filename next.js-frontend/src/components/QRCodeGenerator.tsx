import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode.react";
import { Event } from "@/types";

interface QRCodeGeneratorProps {
  currentEvent: Event | null;
}

export default function QRCodeGenerator({ currentEvent }: QRCodeGeneratorProps) {
  const router = useRouter();
  const [qrValue, setQrValue] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    // Get the base URL of the application
    setBaseUrl(window.location.origin);
    
    if (currentEvent) {
      setQrValue(`${window.location.origin}/signin/${currentEvent.id}`);
    }
  }, [currentEvent]);

  const handleDownloadQRCode = () => {
    const canvas = document.getElementById("qr-code") as HTMLCanvasElement;
    if (!canvas) return;
    
    const pngUrl = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");
    
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `qrcode-event-${currentEvent?.id || "unknown"}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  if (!currentEvent) {
    return (
      <div className="text-center py-8">
        <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Active Event</h3>
        <p className="text-gray-500 mb-4">Enable an event to generate a QR code.</p>
        <button
          onClick={() => router.push("/admin")}
          className="btn-primary"
        >
          Go to Event Management
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">QR Code for Event Sign-In</h2>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-gray-50 p-6 rounded-lg flex flex-col items-center justify-center">
          {qrValue ? (
            <>
              <QRCode
                id="qr-code"
                value={qrValue}
                size={200}
                level="H"
                includeMargin={true}
                renderAs="canvas"
              />
              <p className="mt-4 text-sm text-gray-500 text-center">
                Scan this QR code to open the sign-in page
              </p>
            </>
          ) : (
            <div className="text-center">
              <p className="text-gray-500">Unable to generate QR code</p>
            </div>
          )}
        </div>

        <div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Event Details</h3>
            <p className="text-gray-700 mb-1">
              <span className="font-medium">Status:</span>{" "}
              <span className={`${currentEvent.status === "enabled" ? "text-green-600" : "text-red-600"}`}>
                {currentEvent.status === "enabled" ? "Active" : "Inactive"}
              </span>
            </p>
            <p className="text-gray-700 mb-4">
              <span className="font-medium">ID:</span> {currentEvent.id}
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Sign-In Link</h3>
            <div className="flex items-center">
              <input
                type="text"
                value={qrValue}
                readOnly
                className="flex-1 input-field bg-gray-50"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrValue);
                }}
                className="ml-2 p-2 bg-gray-200 rounded-md hover:bg-gray-300"
                title="Copy to clipboard"
              >
                <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Share this link with visitors who can't scan the QR code
            </p>
          </div>

          <div className="space-y-3">
            <button onClick={handleDownloadQRCode} className="btn-primary w-full">
              Download QR Code
            </button>
            
            {currentEvent.status !== "enabled" && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      This event is currently inactive. Visitors won't be able to sign in until you enable it.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
