import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { logActivity } from "../utils/activityLogger";
import "./Payments.css";

function Payments() {
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  const [formData, setFormData] = useState({
    memberId: "",
    amount: "",
    paymentDate: "",
    paymentMethod: "Cash",
    membership: "",
    notes: "",
  });

  /*
   * Load Payments
   */
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "payments"),
      (snapshot) => {
        const paymentsData = snapshot.docs.map(
          (paymentDoc) => ({
            id: paymentDoc.id,
            ...paymentDoc.data(),
          }),
        );

        paymentsData.sort((a, b) => {
          const dateA =
            a.createdAt?.toDate?.() || new Date(0);

          const dateB =
            b.createdAt?.toDate?.() || new Date(0);

          return dateB - dateA;
        });

        setPayments(paymentsData);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Error loading payments:",
          error,
        );

        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  /*
   * Load Members
   */
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "members"),
      (snapshot) => {
        const membersData = snapshot.docs.map(
          (memberDoc) => ({
            id: memberDoc.id,
            ...memberDoc.data(),
          }),
        );

        membersData.sort((a, b) =>
          (a.name || "").localeCompare(
            b.name || "",
          ),
        );

        setMembers(membersData);
        setMembersLoading(false);
      },
      (error) => {
        console.error(
          "Error loading members:",
          error,
        );

        setMembersLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  /*
   * Get selected member
   */
  const getSelectedMember = () => {
    return members.find(
      (member) =>
        member.id === formData.memberId,
    );
  };

  /*
   * Calculate total amount already paid
   * by a member.
   *
   * If editing a payment, exclude the
   * current payment from the calculation.
   */
  const getMemberTotalPaid = (
    memberId,
    excludePaymentId = null,
  ) => {
    return payments.reduce(
      (total, payment) => {
        if (
          payment.memberId !== memberId ||
          payment.id === excludePaymentId
        ) {
          return total;
        }

        return total + Number(payment.amount || 0);
      },
      0,
    );
  };

  /*
   * Get membership price
   */
  const getMembershipPrice = (member) => {
    return Number(
      member?.membershipPrice || 0,
    );
  };

  /*
   * Get payment status
   */
  const getPaymentStatus = (memberId) => {
    const member = members.find(
      (item) => item.id === memberId,
    );

    if (!member) {
      return {
        price: 0,
        paid: 0,
        remaining: 0,
        status: "No Payment",
      };
    }

    const price = getMembershipPrice(member);

    const paid = getMemberTotalPaid(
      memberId,
    );

    const remaining = Math.max(
      price - paid,
      0,
    );

    let status = "No Payment";

    if (price > 0 && paid >= price) {
      status = "Fully Paid";
    } else if (paid > 0) {
      status = "Partially Paid";
    }

    return {
      price,
      paid,
      remaining,
      status,
    };
  };

  /*
   * Handle Form Changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "memberId") {
      const selectedMember = members.find(
        (member) => member.id === value,
      );

      setFormData((previous) => ({
        ...previous,
        memberId: value,
        membership:
          selectedMember?.membershipName || "",
      }));

      return;
    }

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /*
   * Open Add Payment Modal
   */
  const openAddPaymentModal = () => {
    setEditingPayment(null);

    setFormData({
      memberId: "",
      amount: "",
      paymentDate: new Date()
        .toISOString()
        .split("T")[0],
      paymentMethod: "Cash",
      membership: "",
      notes: "",
    });

    setShowModal(true);
  };

  /*
   * Open Edit Payment Modal
   */
  const handleEditClick = (payment) => {
    setEditingPayment(payment);

    setFormData({
      memberId: payment.memberId || "",
      amount: payment.amount || "",
      paymentDate: payment.paymentDate || "",
      paymentMethod:
        payment.paymentMethod || "Cash",
      membership: payment.membership || "",
      notes: payment.notes || "",
    });

    setShowModal(true);
  };

  /*
   * Add Payment
   */
  const handleAddPayment = async (e) => {
    e.preventDefault();

    if (!formData.memberId) {
      alert("Please select a member.");
      return;
    }

    if (
      !formData.amount ||
      Number(formData.amount) <= 0
    ) {
      alert(
        "Please enter a valid payment amount.",
      );
      return;
    }

    try {
      const selectedMember =
        getSelectedMember();

      if (!selectedMember) {
        alert(
          "Selected member was not found.",
        );
        return;
      }

      const newPaymentRef = await addDoc(
        collection(db, "payments"),
        {
          memberId: selectedMember.id,
          memberName: selectedMember.name,
          amount: Number(formData.amount),
          paymentDate:
            formData.paymentDate,
          paymentMethod:
            formData.paymentMethod,
          membership:
            formData.membership ||
            selectedMember.membershipName ||
            "",
          notes: formData.notes.trim(),
          createdAt: serverTimestamp(),
        },
      );

      const newTotalPaid =
        getMemberTotalPaid(
          selectedMember.id,
        ) + Number(formData.amount);

      const membershipPrice =
        getMembershipPrice(
          selectedMember,
        );

      let paymentStatus = "No Payment";

      if (
        membershipPrice > 0 &&
        newTotalPaid >= membershipPrice
      ) {
        paymentStatus = "Fully Paid";
      } else if (newTotalPaid > 0) {
        paymentStatus = "Partially Paid";
      }

      await logActivity({
        action: "Payment Added",
        description: `Added payment of ₱${Number(
          formData.amount,
        ).toLocaleString()} for ${
          selectedMember.name
        } - ${paymentStatus}`,
        targetType: "payment",
        targetId: newPaymentRef.id,
      });

      alert("Payment added successfully!");

      closeModal();
    } catch (error) {
      console.error(
        "Error adding payment:",
        error,
      );

      alert("Failed to add payment.");
    }
  };

  /*
   * Update Payment
   */
  const handleUpdatePayment = async (e) => {
    e.preventDefault();

    if (!formData.memberId) {
      alert("Please select a member.");
      return;
    }

    if (
      !formData.amount ||
      Number(formData.amount) <= 0
    ) {
      alert(
        "Please enter a valid payment amount.",
      );
      return;
    }

    try {
      const selectedMember =
        getSelectedMember();

      if (!selectedMember) {
        alert(
          "Selected member was not found.",
        );
        return;
      }

      /*
       * Calculate the total excluding
       * the payment currently being edited.
       */
      const previousPaymentsTotal =
        getMemberTotalPaid(
          selectedMember.id,
          editingPayment.id,
        );

      const newTotalPaid =
        previousPaymentsTotal +
        Number(formData.amount);

      const membershipPrice =
        getMembershipPrice(
          selectedMember,
        );

      let paymentStatus = "No Payment";

      if (
        membershipPrice > 0 &&
        newTotalPaid >= membershipPrice
      ) {
        paymentStatus = "Fully Paid";
      } else if (newTotalPaid > 0) {
        paymentStatus = "Partially Paid";
      }

      const paymentRef = doc(
        db,
        "payments",
        editingPayment.id,
      );

      await updateDoc(paymentRef, {
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        amount: Number(formData.amount),
        paymentDate:
          formData.paymentDate,
        paymentMethod:
          formData.paymentMethod,
        membership:
          formData.membership ||
          selectedMember.membershipName ||
          "",
        notes: formData.notes.trim(),
      });

      await logActivity({
        action: "Payment Updated",
        description: `Updated payment for ${
          selectedMember.name
        } - ${paymentStatus}`,
        targetType: "payment",
        targetId: editingPayment.id,
      });

      alert(
        "Payment updated successfully!",
      );

      closeModal();
    } catch (error) {
      console.error(
        "Error updating payment:",
        error,
      );

      alert("Failed to update payment.");
    }
  };

  /*
   * Delete Payment
   */
  const handleDeletePayment = async (
    payment,
  ) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this payment from ${payment.memberName}?`,
    );

    if (!confirmDelete) return;

    try {
      await deleteDoc(
        doc(db, "payments", payment.id),
      );

      await logActivity({
        action: "Payment Deleted",
        description: `Deleted payment of ₱${Number(
          payment.amount || 0,
        ).toLocaleString()} for ${
          payment.memberName ||
          "Unknown Member"
        }`,
        targetType: "payment",
        targetId: payment.id,
      });

      alert(
        "Payment deleted successfully!",
      );
    } catch (error) {
      console.error(
        "Error deleting payment:",
        error,
      );

      alert("Failed to delete payment.");
    }
  };

  /*
   * Close Modal
   */
  const closeModal = () => {
    setShowModal(false);
    setEditingPayment(null);

    setFormData({
      memberId: "",
      amount: "",
      paymentDate: "",
      paymentMethod: "Cash",
      membership: "",
      notes: "",
    });
  };

  /*
   * Format Amount
   */
  const formatAmount = (amount) => {
    return `₱${Number(
      amount || 0,
    ).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  /*
   * Format Date
   */
  const formatDate = (date) => {
    if (!date) return "-";

    const parsedDate = new Date(date);

    if (
      Number.isNaN(parsedDate.getTime())
    ) {
      return "-";
    }

    return parsedDate.toLocaleDateString(
      "en-PH",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      },
    );
  };

  /*
   * Get Status Class
   */
  const getStatusClass = (status) => {
    if (status === "Fully Paid") {
      return "fully-paid";
    }

    if (status === "Partially Paid") {
      return "partially-paid";
    }

    return "no-payment";
  };

  /*
   * Filter Payments
   */
  const filteredPayments = payments.filter(
    (payment) => {
      const searchText =
        search.toLowerCase();

      const paymentStatus =
        getPaymentStatus(
          payment.memberId,
        ).status;

      return (
        (payment.memberName || "")
          .toLowerCase()
          .includes(searchText) ||
        (payment.paymentMethod || "")
          .toLowerCase()
          .includes(searchText) ||
        (payment.membership || "")
          .toLowerCase()
          .includes(searchText) ||
        (payment.notes || "")
          .toLowerCase()
          .includes(searchText) ||
        paymentStatus
          .toLowerCase()
          .includes(searchText)
      );
    },
  );

  /*
   * Calculate Total Revenue
   */
  const totalRevenue = payments.reduce(
    (total, payment) =>
      total + Number(payment.amount || 0),
    0,
  );

  /*
   * Count Fully Paid Members
   */
  const fullyPaidMembers =
    members.filter((member) => {
      const paymentInfo =
        getPaymentStatus(member.id);

      return (
        paymentInfo.status === "Fully Paid"
      );
    }).length;

  /*
   * Count Partially Paid Members
   */
  const partiallyPaidMembers =
    members.filter((member) => {
      const paymentInfo =
        getPaymentStatus(member.id);

      return (
        paymentInfo.status ===
        "Partially Paid"
      );
    }).length;

  return (
    <div className="payments-page">
      {/* Header */}
      <div className="payments-header">
        <div>
          <h1>Payments</h1>

          <p>
            Manage member payments and
            transactions.
          </p>
        </div>

        <button
          className="add-payment-btn"
          onClick={openAddPaymentModal}
        >
          + Add Payment
        </button>
      </div>

      {/* Summary */}
      <div className="payment-summary">
        <div className="payment-summary-card">
          <span>Total Payments</span>

          <strong>
            {payments.length}
          </strong>
        </div>

        <div className="payment-summary-card">
          <span>Total Revenue</span>

          <strong className="payment-total-revenue">
            {formatAmount(totalRevenue)}
          </strong>
        </div>

        <div className="payment-summary-card">
          <span>Fully Paid Members</span>

          <strong className="payment-status-full">
            {fullyPaidMembers}
          </strong>
        </div>

        <div className="payment-summary-card">
          <span>Partially Paid Members</span>

          <strong className="payment-status-partial">
            {partiallyPaidMembers}
          </strong>
        </div>
      </div>

      {/* Payments Card */}
      <div className="payments-card">
        <div className="payments-card-header">
          <div>
            <h2>Payment Records</h2>

            <p>
              View and manage payment
              transactions.
            </p>
          </div>

          <input
            type="text"
            placeholder="Search payments..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        {loading ? (
          <p className="payment-message">
            Loading payments...
          </p>
        ) : filteredPayments.length ===
          0 ? (
          <p className="payment-message">
            No payment records found.
          </p>
        ) : (
          <div className="payments-table-container">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Membership</th>
                  <th>Membership Price</th>
                  <th>Total Paid</th>
                  <th>Remaining</th>
                  <th>Payment Status</th>
                  <th>Payment Date</th>
                  <th>Method</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.map(
                  (payment) => {
                    const paymentInfo =
                      getPaymentStatus(
                        payment.memberId,
                      );

                    return (
                      <tr key={payment.id}>
                        <td>
                          <strong>
                            {payment.memberName ||
                              "Unknown Member"}
                          </strong>
                        </td>

                        <td>
                          {payment.membership ||
                            "-"}
                        </td>

                        <td>
                          {formatAmount(
                            paymentInfo.price,
                          )}
                        </td>

                        <td>
                          <span className="payment-amount">
                            {formatAmount(
                              paymentInfo.paid,
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              paymentInfo.remaining >
                              0
                                ? "payment-remaining"
                                : "payment-zero"
                            }
                          >
                            {formatAmount(
                              paymentInfo.remaining,
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`payment-status ${getStatusClass(
                              paymentInfo.status,
                            )}`}
                          >
                            {paymentInfo.status}
                          </span>
                        </td>

                        <td>
                          {formatDate(
                            payment.paymentDate,
                          )}
                        </td>

                        <td>
                          <span className="payment-method">
                            {payment.paymentMethod ||
                              "-"}
                          </span>
                        </td>

                        <td>
                          <button
                            className="edit-payment-btn"
                            onClick={() =>
                              handleEditClick(
                                payment,
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="delete-payment-btn"
                            onClick={() =>
                              handleDeletePayment(
                                payment,
                              )
                            }
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT PAYMENT MODAL */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={closeModal}
        >
          <div
            className="payment-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2>
                  {editingPayment
                    ? "Edit Payment"
                    : "Add Payment"}
                </h2>

                <p>
                  Record a member payment.
                </p>
              </div>

              <button
                className="close-btn"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                editingPayment
                  ? handleUpdatePayment
                  : handleAddPayment
              }
            >
              {/* Member */}
              <div className="form-group">
                <label>Member</label>

                <select
                  name="memberId"
                  value={formData.memberId}
                  onChange={handleChange}
                  required
                  disabled={membersLoading}
                >
                  <option value="">
                    {membersLoading
                      ? "Loading members..."
                      : "Select a member"}
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

              {/* Member Payment Information */}
              {formData.memberId && (
                <div className="member-payment-info">
                  {(() => {
                    const selectedMember =
                      getSelectedMember();

                    const paymentInfo =
                      getPaymentStatus(
                        formData.memberId,
                      );

                    return (
                      <>
                        <div>
                          <span>
                            Selected Member
                          </span>

                          <strong>
                            {
                              selectedMember?.name
                            }
                          </strong>
                        </div>

                        <div>
                          <span>
                            Membership
                          </span>

                          <strong>
                            {formData.membership ||
                              "No Membership"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Membership Price
                          </span>

                          <strong>
                            {formatAmount(
                              paymentInfo.price,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Already Paid
                          </span>

                          <strong className="modal-paid">
                            {formatAmount(
                              paymentInfo.paid,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Remaining Balance
                          </span>

                          <strong className="modal-remaining">
                            {formatAmount(
                              paymentInfo.remaining,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Current Status
                          </span>

                          <strong
                            className={`modal-payment-status ${getStatusClass(
                              paymentInfo.status,
                            )}`}
                          >
                            {
                              paymentInfo.status
                            }
                          </strong>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Amount */}
              <div className="form-group">
                <label>Amount</label>

                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="Enter payment amount"
                  min="1"
                  step="0.01"
                  required
                />
              </div>

              {/* Payment Date */}
              <div className="form-group">
                <label>
                  Payment Date
                </label>

                <input
                  type="date"
                  name="paymentDate"
                  value={
                    formData.paymentDate
                  }
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Payment Method */}
              <div className="form-group">
                <label>
                  Payment Method
                </label>

                <select
                  name="paymentMethod"
                  value={
                    formData.paymentMethod
                  }
                  onChange={handleChange}
                  required
                >
                  <option value="Cash">
                    Cash
                  </option>

                  <option value="GCash">
                    GCash
                  </option>

                  <option value="Bank Transfer">
                    Bank Transfer
                  </option>

                  <option value="Card">
                    Card
                  </option>
                </select>
              </div>

              {/* Membership */}
              <div className="form-group">
                <label>
                  Membership
                </label>

                <input
                  type="text"
                  name="membership"
                  value={
                    formData.membership
                  }
                  onChange={handleChange}
                  placeholder="Membership plan"
                />
              </div>

              {/* Notes */}
              <div className="form-group">
                <label>Notes</label>

                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Optional notes..."
                  rows="3"
                />
              </div>

              {/* Modal Actions */}
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-btn"
                >
                  {editingPayment
                    ? "Update Payment"
                    : "Add Payment"}
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