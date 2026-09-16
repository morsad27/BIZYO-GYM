import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import "./RestrictedMembers.css";

function RestrictedMembers() {
  const [members, setMembers] = useState([]);
  const [allMembers, setAllMembers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    memberId: "",
    restrictionReason: "",
    restrictionUntil: "",
  });

  /* =========================
     LOAD ALL MEMBERS
  ========================= */

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "members"),
      (snapshot) => {
        const membersData = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        membersData.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        setAllMembers(membersData);
        setMembersLoading(false);

        const restrictedMembers = membersData.filter(
          (member) => member.isRestricted === true,
        );

        setMembers(restrictedMembers);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading members:", error);

        setLoading(false);
        setMembersLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  /* =========================
     SEARCH
  ========================= */

  const filteredMembers = members.filter((member) => {
    const searchText = search.toLowerCase();

    return (
      member.name?.toLowerCase().includes(searchText) ||
      member.email?.toLowerCase().includes(searchText) ||
      member.phone?.toLowerCase().includes(searchText) ||
      member.restrictionReason?.toLowerCase().includes(searchText)
    );
  });

  /* =========================
     FORM
  ========================= */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =========================
     OPEN RESTRICT MODAL
  ========================= */

  const handleOpenModal = () => {
    setFormData({
      memberId: "",
      restrictionReason: "",
      restrictionUntil: "",
    });

    setShowModal(true);
  };

  /* =========================
     RESTRICT MEMBER
  ========================= */

  const handleRestrict = async (event) => {
    event.preventDefault();

    if (!formData.memberId) {
      alert("Please select a member.");
      return;
    }

    if (!formData.restrictionReason.trim()) {
      alert("Please enter a restriction reason.");
      return;
    }

    try {
      await updateDoc(doc(db, "members", formData.memberId), {
        isRestricted: true,
        restrictionReason: formData.restrictionReason.trim(),
        restrictionDate: serverTimestamp(),
        restrictionUntil: formData.restrictionUntil || null,
      });

      setShowModal(false);

      setFormData({
        memberId: "",
        restrictionReason: "",
        restrictionUntil: "",
      });
    } catch (error) {
      console.error("Error restricting member:", error);

      alert("Failed to restrict member.");
    }
  };

  /* =========================
     REMOVE RESTRICTION
  ========================= */

  const handleRemoveRestriction = async (member) => {
    const confirmed = window.confirm(
      `Remove the restriction from ${member.name}?`,
    );

    if (!confirmed) return;

    try {
      await updateDoc(doc(db, "members", member.id), {
        isRestricted: false,
        restrictionReason: "",
        restrictionDate: null,
        restrictionUntil: null,
      });
    } catch (error) {
      console.error("Error removing restriction:", error);

      alert("Failed to remove restriction.");
    }
  };

  return (
    <div className="restricted-members-page">
      {/* HEADER */}

      <div className="restricted-members-header">
        <div>
          <h1>Restricted Members</h1>

          <p>Manage members who currently have access restrictions.</p>
        </div>

        <button className="restrict-member-btn" onClick={handleOpenModal}>
          + Restrict Member
        </button>
      </div>

      {/* CARD */}

      <div className="restricted-members-card">
        <div className="restricted-card-header">
          <div>
            <h2>Restricted Members</h2>

            <p>Members currently restricted from gym access.</p>
          </div>

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search members..."
          />
        </div>

        {/* TABLE */}

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Contact</th>
                <th>Reason</th>
                <th>Restricted Since</th>
                <th>Until</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="restricted-message">
                    Loading restricted members...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="restricted-message">
                    No restricted members found.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="restricted-member-name">
                        <div className="restricted-avatar">
                          {member.name?.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <strong>{member.name}</strong>

                          <span>{member.membership || "No Membership"}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="contact-info">
                        <span>{member.email || "-"}</span>

                        <span>{member.phone || "-"}</span>
                      </div>
                    </td>

                    <td>
                      <span className="reason-text">
                        {member.restrictionReason || "-"}
                      </span>
                    </td>

                    <td>
                      {member.restrictionDate?.toDate?.()
                        ? member.restrictionDate
                            .toDate()
                            .toLocaleDateString("en-PH", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                        : "-"}
                    </td>

                    <td>
                      {member.restrictionUntil
                        ? new Date(
                            `${member.restrictionUntil}T00:00:00`,
                          ).toLocaleDateString("en-PH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "No end date"}
                    </td>

                    <td>
                      <button
                        className="remove-restriction-btn"
                        onClick={() => handleRemoveRestriction(member)}
                      >
                        Remove Restriction
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RESTRICT MEMBER MODAL */}

      {showModal && (
        <div className="modal-overlay">
          <div className="restriction-modal">
            <div className="modal-header">
              <h2>Restrict Member</h2>

              <button className="close-btn" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleRestrict}>
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
                    {membersLoading ? "Loading members..." : "Select a member"}
                  </option>

                  {allMembers
                    .filter((member) => !member.isRestricted)
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* REASON */}

              <div className="form-group">
                <label>Reason</label>

                <textarea
                  name="restrictionReason"
                  value={formData.restrictionReason}
                  onChange={handleChange}
                  placeholder="Enter the reason for restriction..."
                  rows="4"
                  required
                />
              </div>

              {/* END DATE */}

              <div className="form-group">
                <label>Restriction Until</label>

                <input
                  type="date"
                  name="restrictionUntil"
                  value={formData.restrictionUntil}
                  onChange={handleChange}
                />

                <small className="form-help">
                  Leave empty if there is no end date.
                </small>
              </div>

              {/* ACTIONS */}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="restrict-btn">
                  Restrict Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RestrictedMembers;
