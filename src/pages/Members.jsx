import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import "./Members.css";
import { QRCodeSVG } from "qrcode.react";
import { logActivity } from "../utils/activityLogger";

function Members() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [editingMember, setEditingMember] = useState(null);
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState([]);
  const [membershipPlans, setMembershipPlans] = useState([]);

  // Set default values for the form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    membershipId: "",
    status: "Active",
  });

  // State for selected member's QR code
  const [selectedMemberQR, setSelectedMemberQR] = useState(null);

  const handleShowQR = (member) => {
    setSelectedMemberQR(member);
  };

  /*
   * Fetch membership plans from Firestore
   */
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "memberships"),
      (snapshot) => {
        const plansData = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setMembershipPlans(plansData);
      },
      (error) => {
        console.error(
          "Error loading membership plans:",
          error,
        );
      },
    );

    return () => unsubscribe();
  }, []);

  /*
   * Fetch members from Firestore
   */
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "members"),
      (snapshot) => {
        const membersData = snapshot.docs.map((memberDoc) => ({
          id: memberDoc.id,
          ...memberDoc.data(),
        }));

        setMembers(membersData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading members:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  /*
   * Delete Member
   */
  const handleDeleteMember = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this member?",
    );

    if (!confirmDelete) return;

    try {
      // Find member before deleting
      const memberToDelete = members.find(
        (member) => member.id === id,
      );

      await deleteDoc(doc(db, "members", id));

      // Create activity log
      await logActivity({
        action: "Member Deleted",
        description: `Deleted member ${
          memberToDelete?.name || "Unknown Member"
        }`,
        targetType: "member",
        targetId: id,
      });

      alert("Member deleted successfully!");
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Failed to delete member.");
    }
  };

  /*
   * Edit Member
   */
  const handleEditClick = (member) => {
    setEditingMember(member);

    setFormData({
      name: member.name || "",
      email: member.email || "",
      phone: member.phone || "",
      membershipId: member.membershipId || "",
      status: member.status || "Active",
    });

    setShowModal(true);
  };

  /*
   * Update Member
   */
  const handleUpdateMember = async (e) => {
    e.preventDefault();

    try {
      const selectedPlan = membershipPlans.find(
        (plan) => plan.id === formData.membershipId,
      );

      if (!selectedPlan) {
        alert("Please select a valid membership plan.");
        return;
      }

      const memberRef = doc(
        db,
        "members",
        editingMember.id,
      );

      await updateDoc(memberRef, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,

        membershipId: selectedPlan.id,
        membershipName: selectedPlan.name,
        membershipPrice: Number(selectedPlan.price),
        membershipDuration: Number(
          selectedPlan.duration,
        ),

        status: formData.status,
      });

      // Create activity log
      await logActivity({
        action: "Member Updated",
        description: `Updated member information for ${formData.name}`,
        targetType: "member",
        targetId: editingMember.id,
      });

      alert("Member updated successfully!");

      setEditingMember(null);

      setFormData({
        name: "",
        email: "",
        phone: "",
        membershipId: "",
        status: "Active",
      });

      setShowModal(false);
    } catch (error) {
      console.error("Error updating member:", error);
      alert("Failed to update member.");
    }
  };

  /*
   * Handle Form Changes
   */
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  /*
   * Add Member
   */
  const handleAddMember = async (e) => {
    e.preventDefault();

    try {
      // Find the selected membership plan
      const selectedPlan = membershipPlans.find(
        (plan) => plan.id === formData.membershipId,
      );

      if (!selectedPlan) {
        alert("Please select a valid membership plan.");
        return;
      }

      // Create member
      const newMemberRef = await addDoc(
        collection(db, "members"),
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,

          // Membership information
          membershipId: selectedPlan.id,
          membershipName: selectedPlan.name,
          membershipPrice: Number(selectedPlan.price),
          membershipDuration: Number(
            selectedPlan.duration,
          ),

          status: formData.status,
          createdAt: serverTimestamp(),
        },
      );

      // Create activity log
      await logActivity({
        action: "Member Added",
        description: `Added ${formData.name} as a new member`,
        targetType: "member",
        targetId: newMemberRef.id,
      });

      alert("Member added successfully!");

      setFormData({
        name: "",
        email: "",
        phone: "",
        membershipId: "",
        status: "Active",
      });

      setShowModal(false);
    } catch (error) {
      console.error("Error adding member:", error);
      alert("Failed to add member.");
    }
  };

  /*
   * Open Add Member Modal
   */
  const openAddMemberModal = () => {
    setEditingMember(null);

    setFormData({
      name: "",
      email: "",
      phone: "",
      membershipId: "",
      status: "Active",
    });

    setShowModal(true);
  };

  /*
   * Filter Members
   */
  const filteredMembers = members.filter((member) =>
    (member.name || "")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <div className="members-page">
      {/* Page Header */}
      <div className="members-header">
        <div>
          <h1>Members</h1>
          <p>Manage your gym members.</p>
        </div>

        <button
          className="add-member-btn"
          onClick={openAddMemberModal}
        >
          + Add Member
        </button>
      </div>

      {/* Members Card */}
      <div className="members-card">
        <div className="members-toolbar">
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Membership</th>
                <th>Status</th>
                <th>Actions</th>
                <th>QR Code</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="loading-message"
                  >
                    Loading members...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="empty-message"
                  >
                    No members found.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="member-name">
                        <div className="table-avatar">
                          {member.name
                            ?.charAt(0)
                            .toUpperCase()}
                        </div>

                        {member.name}
                      </div>
                    </td>

                    <td>{member.email}</td>

                    <td>{member.phone}</td>

                    <td>{member.membershipName}</td>

                    <td>
                      <span
                        className={`member-status ${
                          member.isRestricted
                            ? "restricted"
                            : member.status === "Active"
                              ? "active"
                              : "inactive"
                        }`}
                      >
                        {member.isRestricted
                          ? "Restricted"
                          : member.status}
                      </span>
                    </td>

                    <td>
                      <button
                        className="edit-btn"
                        onClick={() =>
                          handleEditClick(member)
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() =>
                          handleDeleteMember(member.id)
                        }
                      >
                        Delete
                      </button>
                    </td>

                    <td>
                      <button
                        className="qr-btn"
                        onClick={() =>
                          handleShowQR(member)
                        }
                      >
                        View QR
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MEMBER MODAL */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="member-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                {editingMember
                  ? "Edit Member"
                  : "Add New Member"}
              </h2>

              <button
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                editingMember
                  ? handleUpdateMember
                  : handleAddMember
              }
            >
              {/* Full Name */}
              <div className="form-group">
                <label>Full Name</label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  required
                />
              </div>

              {/* Email */}
              <div className="form-group">
                <label>Email</label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email"
                  required
                />
              </div>

              {/* Phone */}
              <div className="form-group">
                <label>Phone Number</label>

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
              </div>

              {/* Membership */}
              <div className="form-group">
                <label>Membership Plan</label>

                <select
                  name="membershipId"
                  value={formData.membershipId}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select a membership plan
                  </option>

                  {membershipPlans.map((plan) => (
                    <option
                      key={plan.id}
                      value={plan.id}
                    >
                      {plan.name} - ₱
                      {Number(
                        plan.price,
                      ).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="form-group">
                <label>Status</label>

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

              {/* Modal Actions */}
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() =>
                    setShowModal(false)
                  }
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

      {/* QR CODE MODAL */}
      {selectedMemberQR && (
        <div className="modal-overlay">
          <div className="qr-modal">
            <div className="modal-header">
              <h2>Member QR Code</h2>

              <button
                className="close-btn"
                onClick={() =>
                  setSelectedMemberQR(null)
                }
              >
                ×
              </button>
            </div>

            <div className="qr-content">
              <h3>{selectedMemberQR.name}</h3>

              <p>
                Scan this QR code for gym entry.
              </p>

              <div className="qr-code-container">
                <QRCodeSVG
                  value={selectedMemberQR.id}
                  size={220}
                />
              </div>

              <small>
                Member ID: {selectedMemberQR.id}
              </small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Members;