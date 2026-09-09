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

function Members() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);

  //set default values for the form data when adding or editing a member
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    membership: "Basic",
    status: "Active",
  });

  //fetching members from firebase firestore para mag display sa members page
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "members"),
      (snapshot) => {
        const membersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setMembers(membersData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading members:", error);
        setLoading(false);
      },
    );

    // Stop listening when the page is closed
    return () => unsubscribe();
  }, []);

  //delete function para sa members
  const handleDeleteMember = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this member?",
    );

    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "members", id));

      alert("Member deleted successfully!");
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Failed to delete member.");
    }
  };

  //edit function para sa members
  const handleEditClick = (member) => {
    setEditingMember(member);

    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone,
      membership: member.membership,
      status: member.status,
    });

    setShowModal(true);
  };

  //update function to prii
  const handleUpdateMember = async (e) => {
    e.preventDefault();

    try {
      const memberRef = doc(db, "members", editingMember.id);

      await updateDoc(memberRef, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        membership: formData.membership,
        status: formData.status,
      });

      alert("Member updated successfully!");

      setEditingMember(null);
      setShowModal(false);

      setFormData({
        name: "",
        email: "",
        phone: "",
        membership: "Basic",
        status: "Active",
      });
    } catch (error) {
      console.error("Error updating member:", error);
      alert("Failed to update member.");
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddMember = async (e) => {
    e.preventDefault();

    try {
      await addDoc(collection(db, "members"), {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        membership: formData.membership,
        status: formData.status,
        createdAt: serverTimestamp(),
      });

      alert("Member added successfully!");

      setFormData({
        name: "",
        email: "",
        phone: "",
        membership: "Basic",
        status: "Active",
      });

      setShowModal(false);
    } catch (error) {
      console.error("Error adding member:", error);
      alert("Failed to add member.");
    }
  };

  const filteredMembers = members.filter((member) =>
    member.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="members-page">
      <div className="members-header">
        <div>
          <h1>Members</h1>
          <p>Manage your gym members.</p>
        </div>

        <button
          className="add-member-btn"
          onClick={() => {
            setEditingMember(null);

            setFormData({
              name: "",
              email: "",
              phone: "",
              membership: "Basic",
              status: "Active",
            });

            setShowModal(true);
          }}
        >
          + Add Member
        </button>
      </div>

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
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="loading-message">
                    Loading members...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-message">
                    No members found.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="member-name">
                        <div className="table-avatar">
                          {member.name.charAt(0)}
                        </div>

                        {member.name}
                      </div>
                    </td>

                    <td>{member.email}</td>
                    <td>{member.phone}</td>
                    <td>{member.membership}</td>

                    <td>
                      <span
                        className={`member-status ${
                          member.status === "Active" ? "active" : "inactive"
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>

                    <td>
                      <button
                        className="edit-btn"
                        onClick={() => handleEditClick(member)}
                      >
                        Edit
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteMember(member.id)}
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

      {/* ADD MEMBER MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="member-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2> {editingMember ? "Edit Member" : "Add New Member"} </h2>

              <button className="close-btn" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form
              onSubmit={editingMember ? handleUpdateMember : handleAddMember}
            >
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

              <div className="form-group">
                <label>Phone Number</label>

                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div className="form-group">
                <label>Membership Plan</label>

                <select
                  name="membership"
                  value={formData.membership}
                  onChange={handleChange}
                >
                  <option value="Basic">Basic</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>

              <div className="form-group">
                <label>Status</label>

                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="save-btn">
                  {editingMember ? "Update Member" : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Members;
