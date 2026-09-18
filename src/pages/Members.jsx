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
import { QRCodeSVG } from "qrcode.react";
import { db } from "../firebase";
import { logActivity } from "../utils/activityLogger";
import "./Members.css";

function Members() {
  const [members, setMembers] = useState([]);
  const [membershipPlans, setMembershipPlans] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] =
    useState(true);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [showQRModal, setShowQRModal] =
    useState(false);

  const [editingMember, setEditingMember] =
    useState(null);

  const [selectedMemberQR, setSelectedMemberQR] =
    useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    membershipId: "",
    membershipStartDate: "",
    status: "Active",
  });

  /*
   * Load Members
   */
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "members"),
      (snapshot) => {
        const membersData =
          snapshot.docs.map((memberDoc) => ({
            id: memberDoc.id,
            ...memberDoc.data(),
          }));

        membersData.sort((a, b) =>
          (a.name || "").localeCompare(
            b.name || "",
          ),
        );

        setMembers(membersData);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Error loading members:",
          error,
        );

        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  /*
   * Load Membership Plans
   */
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "memberships"),
      (snapshot) => {
        const plansData =
          snapshot.docs.map((planDoc) => ({
            id: planDoc.id,
            ...planDoc.data(),
          }));

        plansData.sort((a, b) =>
          (a.name || "").localeCompare(
            b.name || "",
          ),
        );

        setMembershipPlans(plansData);
        setPlansLoading(false);
      },
      (error) => {
        console.error(
          "Error loading membership plans:",
          error,
        );

        setPlansLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  /*
   * Calculate membership expiration date
   *
   * Duration is treated as number of days.
   */
  const calculateExpirationDate = (
    startDate,
    duration,
  ) => {
    if (!startDate || !duration) {
      return "";
    }

    const date = new Date(
      `${startDate}T00:00:00`,
    );

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    date.setDate(
      date.getDate() + Number(duration),
    );

    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1,
    ).padStart(2, "0");

    const day = String(
      date.getDate(),
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  /*
   * Format Firestore date/string
   */
  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    let date;

    if (value?.toDate) {
      date = value.toDate();
    } else if (
      typeof value === "string"
    ) {
      date = new Date(
        `${value}T00:00:00`,
      );
    } else {
      return "-";
    }

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString(
      "en-PH",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      },
    );
  };

  /*
   * Open Add Member Modal
   */
  const openAddModal = () => {
    const today = new Date();

    const year = today.getFullYear();

    const month = String(
      today.getMonth() + 1,
    ).padStart(2, "0");

    const day = String(
      today.getDate(),
    ).padStart(2, "0");

    const todayString = `${year}-${month}-${day}`;

    setEditingMember(null);

    setFormData({
      name: "",
      email: "",
      phone: "",
      membershipId: "",
      membershipStartDate: todayString,
      status: "Active",
    });

    setShowModal(true);
  };

  /*
   * Open Edit Member Modal
   */
  const openEditModal = (member) => {
    setEditingMember(member);

    setFormData({
      name: member.name || "",
      email: member.email || "",
      phone: member.phone || "",
      membershipId:
        member.membershipId || "",
      membershipStartDate:
        member.membershipStartDate || "",
      status: member.status || "Active",
    });

    setShowModal(true);
  };

  /*
   * Close Modal
   */
  const closeModal = () => {
    setShowModal(false);
    setEditingMember(null);

    setFormData({
      name: "",
      email: "",
      phone: "",
      membershipId: "",
      membershipStartDate: "",
      status: "Active",
    });
  };

  /*
   * Handle Form Changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target;

    /*
     * Phone number:
     * Allow numbers only and limit to 11 digits.
     */
    if (name === "phone") {
      const numbersOnly =
        value.replace(/\D/g, "");

      setFormData((previous) => ({
        ...previous,
        phone: numbersOnly.slice(0, 11),
      }));

      return;
    }

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /*
   * Get selected membership plan
   */
  const selectedPlan =
    membershipPlans.find(
      (plan) =>
        plan.id === formData.membershipId,
    );

  /*
   * Calculate preview expiration date
   */
  const previewExpirationDate =
    selectedPlan &&
    formData.membershipStartDate
      ? calculateExpirationDate(
          formData.membershipStartDate,
          selectedPlan.duration,
        )
      : "";

  /*
   * Add / Edit Member
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    /*
     * Validate phone
     */
    if (
      formData.phone.length !== 11
    ) {
      alert(
        "Phone number must be exactly 11 digits.",
      );

      return;
    }

    /*
     * Validate membership plan
     */
    const selectedMembershipPlan =
      membershipPlans.find(
        (plan) =>
          plan.id ===
          formData.membershipId,
      );

    if (!selectedMembershipPlan) {
      alert(
        "Please select a valid membership plan.",
      );

      return;
    }

    /*
     * Validate start date
     */
    if (!formData.membershipStartDate) {
      alert(
        "Please select a membership start date.",
      );

      return;
    }

    /*
     * Calculate expiration
     */
    const membershipExpirationDate =
      calculateExpirationDate(
        formData.membershipStartDate,
        selectedMembershipPlan.duration,
      );

    if (!membershipExpirationDate) {
      alert(
        "Unable to calculate membership expiration date.",
      );

      return;
    }

    try {
      if (editingMember) {
        /*
         * UPDATE MEMBER
         */
        await updateDoc(
          doc(
            db,
            "members",
            editingMember.id,
          ),
          {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone,
            membershipId:
              selectedMembershipPlan.id,
            membershipName:
              selectedMembershipPlan.name,
            membershipPrice: Number(
              selectedMembershipPlan.price,
            ),
            membershipDuration: Number(
              selectedMembershipPlan.duration,
            ),
            membershipStartDate:
              formData.membershipStartDate,
            membershipExpirationDate,
            status: formData.status,
          },
        );

        await logActivity({
          action: "Member Updated",
          description: `Updated member ${formData.name.trim()}`,
          targetType: "member",
          targetId: editingMember.id,
        });

        alert(
          "Member updated successfully.",
        );
      } else {
        /*
         * ADD MEMBER
         */
        const newMemberRef =
          await addDoc(
            collection(db, "members"),
            {
              name: formData.name.trim(),
              email: formData.email.trim(),
              phone: formData.phone,
              membershipId:
                selectedMembershipPlan.id,
              membershipName:
                selectedMembershipPlan.name,
              membershipPrice: Number(
                selectedMembershipPlan.price,
              ),
              membershipDuration: Number(
                selectedMembershipPlan.duration,
              ),
              membershipStartDate:
                formData.membershipStartDate,
              membershipExpirationDate,
              status: formData.status,
              isRestricted: false,
              restrictionReason: "",
              restrictionDate: null,
              restrictionUntil: null,
              createdAt:
                serverTimestamp(),
            },
          );

        await logActivity({
          action: "Member Added",
          description: `Added member ${formData.name.trim()}`,
          targetType: "member",
          targetId: newMemberRef.id,
        });

        alert(
          "Member added successfully.",
        );
      }

      closeModal();
    } catch (error) {
      console.error(
        "Error saving member:",
        error,
      );

      alert(
        "Failed to save member.",
      );
    }
  };

  /*
   * Delete Member
   */
  const handleDelete = async (
    member,
  ) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${member.name}?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(
        doc(db, "members", member.id),
      );

      await logActivity({
        action: "Member Deleted",
        description: `Deleted member ${member.name}`,
        targetType: "member",
        targetId: member.id,
      });

      alert(
        "Member deleted successfully.",
      );
    } catch (error) {
      console.error(
        "Error deleting member:",
        error,
      );

      alert(
        "Failed to delete member.",
      );
    }
  };

  /*
   * Open QR Modal
   */
  const openQRModal = (member) => {
    setSelectedMemberQR(member);
    setShowQRModal(true);
  };

  /*
   * Close QR Modal
   */
  const closeQRModal = () => {
    setShowQRModal(false);
    setSelectedMemberQR(null);
  };

  /*
   * Search Members
   */
  const filteredMembers =
    members.filter((member) => {
      const searchText =
        search.toLowerCase();

      return (
        (member.name || "")
          .toLowerCase()
          .includes(searchText) ||
        (member.email || "")
          .toLowerCase()
          .includes(searchText) ||
        (member.phone || "")
          .toLowerCase()
          .includes(searchText) ||
        (
          member.membershipName ||
          ""
        )
          .toLowerCase()
          .includes(searchText)
      );
    });

  /*
   * Get membership expiration status
   */
  const getExpirationStatus = (
    member,
  ) => {
    if (
      !member.membershipExpirationDate
    ) {
      return "No Date";
    }

    let expirationDate;

    if (
      member.membershipExpirationDate?.toDate
    ) {
      expirationDate =
        member.membershipExpirationDate.toDate();
    } else {
      expirationDate = new Date(
        `${member.membershipExpirationDate}T23:59:59`,
      );
    }

    if (
      Number.isNaN(
        expirationDate.getTime(),
      )
    ) {
      return "No Date";
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    expirationDate.setHours(
      0,
      0,
      0,
      0,
    );

    const difference =
      expirationDate.getTime() -
      today.getTime();

    const daysRemaining = Math.ceil(
      difference /
        (1000 * 60 * 60 * 24),
    );

    if (daysRemaining < 0) {
      return "Expired";
    }

    if (daysRemaining <= 7) {
      return "Expiring Soon";
    }

    return "Active";
  };

  return (
    <div className="members-page">
      {/* HEADER */}
      <div className="members-header">
        <div>
          <h1>Members</h1>

          <p>
            Manage gym members and their
            memberships.
          </p>
        </div>

        <button
          className="add-member-btn"
          onClick={openAddModal}
        >
          + Add Member
        </button>
      </div>

      {/* SEARCH */}
      <div className="members-toolbar">
        <input
          type="text"
          placeholder="Search members..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />
      </div>

      {/* TABLE CARD */}
      <div className="members-card">
        {loading || plansLoading ? (
          <p className="members-message">
            Loading members...
          </p>
        ) : filteredMembers.length ===
          0 ? (
          <p className="members-message">
            No members found.
          </p>
        ) : (
          <div className="members-table-container">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Contact</th>
                  <th>Membership</th>
                  <th>Start Date</th>
                  <th>Expiration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredMembers.map(
                  (member) => {
                    const expirationStatus =
                      getExpirationStatus(
                        member,
                      );

                    return (
                      <tr key={member.id}>
                        {/* MEMBER */}
                        <td>
                          <div className="member-name">
                            <div className="member-avatar">
                              {member.name
                                ?.charAt(
                                  0,
                                )
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {member.name}
                              </strong>

                              <span>
                                ID:{" "}
                                {member.id.slice(
                                  0,
                                  8,
                                )}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* CONTACT */}
                        <td>
                          <div className="contact-info">
                            <span>
                              {member.email ||
                                "-"}
                            </span>

                            <span>
                              {member.phone ||
                                "-"}
                            </span>
                          </div>
                        </td>

                        {/* MEMBERSHIP */}
                        <td>
                          <div className="membership-info">
                            <strong>
                              {member.membershipName ||
                                "No Membership"}
                            </strong>

                            {member.membershipPrice !==
                              undefined && (
                              <span>
                                ₱
                                {Number(
                                  member.membershipPrice,
                                ).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* START DATE */}
                        <td>
                          {formatDate(
                            member.membershipStartDate,
                          )}
                        </td>

                        {/* EXPIRATION */}
                        <td>
                          <div className="expiration-info">
                            <strong>
                              {formatDate(
                                member.membershipExpirationDate,
                              )}
                            </strong>

                            {member.membershipExpirationDate && (
                              <span
                                className={`expiration-badge ${
                                  expirationStatus
                                    .toLowerCase()
                                    .replace(
                                      /\s+/g,
                                      "-",
                                    )
                                }`}
                              >
                                {
                                  expirationStatus
                                }
                              </span>
                            )}
                          </div>
                        </td>

                        {/* STATUS */}
                        <td>
                          <span
                            className={`member-status ${
                              member.isRestricted
                                ? "restricted"
                                : member.status ===
                                    "Active"
                                  ? "active"
                                  : "inactive"
                            }`}
                          >
                            {member.isRestricted
                              ? "Restricted"
                              : member.status}
                          </span>
                        </td>

                        {/* ACTIONS */}
                        <td>
                          <div className="member-actions">
                            <button
                              className="qr-btn"
                              onClick={() =>
                                openQRModal(
                                  member,
                                )
                              }
                            >
                              QR
                            </button>

                            <button
                              className="edit-btn"
                              onClick={() =>
                                openEditModal(
                                  member,
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="delete-btn"
                              onClick={() =>
                                handleDelete(
                                  member,
                                )
                              }
                            >
                              Delete
                            </button>
                          </div>
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

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={closeModal}
        >
          <div
            className="member-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2>
                  {editingMember
                    ? "Edit Member"
                    : "Add Member"}
                </h2>

                <p>
                  {editingMember
                    ? "Update member information."
                    : "Add a new gym member."}
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
              onSubmit={handleSubmit}
            >
              {/* NAME */}
              <div className="form-group">
                <label>
                  Full Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  required
                />
              </div>

              {/* EMAIL */}
              <div className="form-group">
                <label>
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  required
                />
              </div>

              {/* PHONE */}
              <div className="form-group">
                <label>
                  Phone Number
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{11}"
                  maxLength="11"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter 11-digit phone number"
                  required
                />

                <small>
                  Enter exactly 11 digits.
                </small>
              </div>

              {/* MEMBERSHIP */}
              <div className="form-group">
                <label>
                  Membership Plan
                </label>

                <select
                  name="membershipId"
                  value={
                    formData.membershipId
                  }
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select membership plan
                  </option>

                  {membershipPlans.map(
                    (plan) => (
                      <option
                        key={plan.id}
                        value={plan.id}
                      >
                        {plan.name} — ₱
                        {Number(
                          plan.price || 0,
                        ).toLocaleString()}{" "}
                        /{" "}
                        {plan.duration} days
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* START DATE */}
              <div className="form-group">
                <label>
                  Membership Start Date
                </label>

                <input
                  type="date"
                  name="membershipStartDate"
                  value={
                    formData.membershipStartDate
                  }
                  onChange={handleChange}
                  required
                />
              </div>

              {/* EXPIRATION PREVIEW */}
              {selectedPlan &&
                formData.membershipStartDate && (
                  <div className="expiration-preview">
                    <div>
                      <span>
                        Membership Duration
                      </span>

                      <strong>
                        {
                          selectedPlan.duration
                        }{" "}
                        days
                      </strong>
                    </div>

                    <div>
                      <span>
                        Expiration Date
                      </span>

                      <strong>
                        {formatDate(
                          previewExpirationDate,
                        )}
                      </strong>
                    </div>
                  </div>
                )}

              {/* STATUS */}
              <div className="form-group">
                <label>
                  Status
                </label>

                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </div>

              {/* ACTIONS */}
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
                  {editingMember
                    ? "Update Member"
                    : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {showQRModal &&
        selectedMemberQR && (
          <div
            className="modal-overlay"
            onClick={closeQRModal}
          >
            <div
              className="qr-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div className="modal-header">
                <div>
                  <h2>
                    Member QR Code
                  </h2>

                  <p>
                    Use this QR code for
                    gym entry.
                  </p>
                </div>

                <button
                  className="close-btn"
                  onClick={closeQRModal}
                >
                  ×
                </button>
              </div>

              <div className="qr-content">
                <div className="qr-code-wrapper">
                  <QRCodeSVG
                    value={
                      selectedMemberQR.id
                    }
                    size={220}
                    level="H"
                  />
                </div>

                <h3>
                  {
                    selectedMemberQR.name
                  }
                </h3>

                <p>
                  {
                    selectedMemberQR.email
                  }
                </p>

                <span className="qr-member-id">
                  Member ID:{" "}
                  {
                    selectedMemberQR.id
                  }
                </span>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default Members;