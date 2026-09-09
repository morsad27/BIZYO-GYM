import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import "./Payments.css";

function Payments() {
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    memberId: "",
    amount: "",
    paymentMethod: "Cash",
    notes: "",
  });

  // Load members in real time
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "members"),
      (snapshot) => {
        const membersData = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setMembers(membersData);
      },
      (error) => {
        console.error("Error loading members:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Load payments in real time
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "payments"),
      (snapshot) => {
        const paymentsData = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        // Sort newest payments first
        paymentsData.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);

          return dateB - dateA;
        });

        setPayments(paymentsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading payments:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Selected member
  const selectedMember = members.find(
    (member) => member.id === formData.memberId
  );

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      memberId: "",
      amount: "",
      paymentMethod: "Cash",
      notes: "",
    });
  };

  const openPaymentModal = () => {
    resetForm();
    setShowModal(true);
  };

  // Record payment
  const handleAddPayment = async (e) => {
    e.preventDefault();

    if (!selectedMember) {
      alert("Please select a member.");
      return;
    }

    const paymentAmount = Number(formData.amount);

    if (!paymentAmount || paymentAmount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    try {
      await addDoc(collection(db, "payments"), {
        memberId: selectedMember.id,
        memberName: selectedMember.name,

        membershipId: selectedMember.membershipId || "",
        membershipName:
          selectedMember.membershipName || "No Membership",

        amount: paymentAmount,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes,

        createdAt: serverTimestamp(),
      });

      alert("Payment recorded successfully!");

      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error("Error recording payment:", error);
      alert("Failed to record payment.");
    }
  };

  // Delete payment
  const handleDeletePayment = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this payment?"
    );

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "payments", id));

      alert("Payment deleted successfully!");
    } catch (error) {
      console.error("Error deleting payment:", error);
      alert("Failed to delete payment.");
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) {
      return "Just now";
    }

    return timestamp.toDate().toLocaleDateString();
  };

  return (
    <div className="payments-page">
      <div className="payments-header">
        <div>
          <h1>Payments</h1>
          <p>Record and manage gym membership payments.</p>
        </div>

        <button
          className="add-payment-btn"
          onClick={openPaymentModal}
        >
          + Record Payment
        </button>
      </div>

      <div className="payments-card">
        <div className="payments-card-header">
          <h2>Payment History</h2>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Membership</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="payment-message">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="payment-message">
                    No payments found.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.memberName}</td>

                    <td>
                      {payment.membershipName ||
                        "No Membership"}
                    </td>

                    <td className="payment-amount">
                      ₱
                      {Number(
                        payment.amount || 0
                      ).toLocaleString()}
                    </td>

                    <td>{payment.paymentMethod}</td>

                    <td>
                      {formatDate(payment.createdAt)}
                    </td>

                    <td>
                      <button
                        className="delete-btn"
                        onClick={() =>
                          handleDeletePayment(payment.id)
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="payment-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Record Payment</h2>

              <button
                className="close-btn"
                onClick={() => {
                  resetForm();
                  setShowModal(false);
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddPayment}>
              {/* MEMBER */}
              <div className="form-group">
                <label>Member</label>

                <select
                  name="memberId"
                  value={formData.memberId}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select a member
                  </option>

                  {members.map((member) => (
                    <option
                      key={member.id}
                      value={member.id}
                    >
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* MEMBERSHIP INFORMATION */}
              {selectedMember && (
                <div className="member-payment-info">
                  <div>
                    <span>Membership Plan</span>
                    <strong>
                      {selectedMember.membershipName ||
                        "No Membership"}
                    </strong>
                  </div>

                  <div>
                    <span>Membership Price</span>
                    <strong>
                      ₱
                      {Number(
                        selectedMember.membershipPrice || 0
                      ).toLocaleString()}
                    </strong>
                  </div>
                </div>
              )}

              {/* AMOUNT */}
              <div className="form-group">
                <label>Payment Amount (₱)</label>

                <input
                  type="number"
                  name="amount"
                  placeholder={
                    selectedMember
                      ? `Suggested: ₱${Number(
                          selectedMember.membershipPrice || 0
                        ).toLocaleString()}`
                      : "Enter payment amount"
                  }
                  value={formData.amount}
                  onChange={handleChange}
                  min="1"
                  required
                />
              </div>

              {/* PAYMENT METHOD */}
              <div className="form-group">
                <label>Payment Method</label>

                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                >
                  <option value="Cash">Cash</option>
                  <option value="GCash">GCash</option>
                  <option value="Bank Transfer">
                    Bank Transfer
                  </option>
                  <option value="Credit/Debit Card">
                    Credit/Debit Card
                  </option>
                </select>
              </div>

              {/* NOTES */}
              <div className="form-group">
                <label>Notes (Optional)</label>

                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Additional payment information..."
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-btn"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payments;