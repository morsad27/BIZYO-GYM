import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { Html5QrcodeScanner } from "html5-qrcode";
import "./EntryLog.css";

function EntryLog() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [scanResult, setScanResult] = useState(null);
  const [scanMessage, setScanMessage] = useState("");
  const [scanType, setScanType] = useState("");

  // Load entry logs
  useEffect(() => {
    const entryQuery = query(
      collection(db, "entryLogs"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      entryQuery,
      (snapshot) => {
        const entriesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setEntries(entriesData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading entry logs:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Process scanned QR code
  const handleScan = async (decodedText) => {
    try {
      console.log("Scanned QR:", decodedText);

      // Prevent repeated scanner callbacks
      if (scanResult) {
        return;
      }

      // Find member using Firestore document ID
      const memberRef = doc(db, "members", decodedText);

      let member;

      try {
        const memberSnapshot = await getDoc(memberRef);

        if (!memberSnapshot.exists()) {
          setScanMessage("Member not found.");
          setScanType("error");
          return;
        }

        member = {
          id: memberSnapshot.id,
          ...memberSnapshot.data(),
        };
      } catch (error) {
        console.error("Error finding member:", error);
        setScanMessage("Unable to find member.");
        setScanType("error");
        return;
      }

      // Check member status
      if (member.status !== "Active") {
        setScanResult(member);
        setScanMessage(
          `Entry denied. ${member.name} is not an active member.`
        );
        setScanType("error");
        return;
      }

      // Check if member is already inside
      const insideQuery = query(
        collection(db, "entryLogs"),
        where("memberId", "==", member.id),
        where("status", "==", "Inside")
      );

      const insideSnapshot = await getDocs(insideQuery);

      // Member is already inside → Check Out
      if (!insideSnapshot.empty) {
        const entryDocument = insideSnapshot.docs[0];

        await updateDoc(
          doc(db, "entryLogs", entryDocument.id),
          {
            checkOut: new Date().toLocaleTimeString(),
            status: "Completed",
          }
        );

        setScanResult(member);
        setScanMessage(`${member.name} checked out successfully.`);
        setScanType("checkout");

        return;
      }

      // Member is not inside → Check In
      const now = new Date();

      await addDoc(collection(db, "entryLogs"), {
        memberId: member.id,
        memberName: member.name,
        date: now.toLocaleDateString(),
        checkIn: now.toLocaleTimeString(),
        checkOut: "",
        status: "Inside",
        createdAt: serverTimestamp(),
      });

      setScanResult(member);
      setScanMessage(`${member.name} checked in successfully.`);
      setScanType("checkin");
    } catch (error) {
      console.error("QR scan error:", error);

      setScanMessage("Something went wrong while processing the scan.");
      setScanType("error");
    }
  };

  // Start QR scanner
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: {
          width: 250,
          height: 250,
        },
      },
      false
    );

    scanner.render(
      (decodedText) => {
        handleScan(decodedText);
      },
      (errorMessage) => {
        // Ignore normal scanning errors
      }
    );

    return () => {
      scanner.clear().catch((error) => {
        console.error("Scanner cleanup error:", error);
      });
    };
  }, []);

  // Reset scan result
  const handleScanAgain = () => {
    setScanResult(null);
    setScanMessage("");
    setScanType("");
  };

  return (
    <div className="entry-log-page">
      <div className="page-header">
        <div>
          <h1>Entry Log</h1>
          <p>Scan member QR codes to record gym entries.</p>
        </div>
      </div>

      <div className="entry-scanner-section">
        <div className="scanner-card">
          <h2>Scan Member QR Code</h2>

          <p className="scanner-description">
            Scan a member QR code to automatically check them in or out.
          </p>

          <div id="qr-reader"></div>

          {scanMessage && (
            <div className={`scan-result ${scanType}`}>
              <div className="scan-icon">
                {scanType === "checkin" && "✓"}
                {scanType === "checkout" && "✓"}
                {scanType === "error" && "!"}
              </div>

              <div>
                <strong>{scanMessage}</strong>

                {scanResult && (
                  <p>
                    {scanResult.name}
                    {scanResult.membership &&
                      ` • ${scanResult.membership}`}
                  </p>
                )}
              </div>
            </div>
          )}

          {scanResult && (
            <button
              className="scan-again-btn"
              onClick={handleScanAgain}
            >
              Scan Another Member
            </button>
          )}
        </div>
      </div>

      <div className="entry-log-card">
        <div className="table-header">
          <h2>Recent Entries</h2>
        </div>

        {loading ? (
          <p className="loading-text">Loading entries...</p>
        ) : entries.length === 0 ? (
          <p className="empty-text">No entries recorded yet.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.memberName}</td>
                    <td>{entry.date}</td>
                    <td>{entry.checkIn}</td>
                    <td>{entry.checkOut || "-"}</td>

                    <td>
                      <span
                        className={`entry-status ${entry.status
                          ?.toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default EntryLog;