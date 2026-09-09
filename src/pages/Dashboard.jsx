import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import "./Dashboard.css";

function Dashboard() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

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
        console.error("Error loading dashboard data:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Total members
  const totalMembers = members.length;

  // Active members
  const activeMembers = members.filter(
    (member) => member.status === "Active",
  ).length;

  // Get the 3 most recent members
  const recentMembers = [...members]
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);

      return dateB - dateA;
    })
    .slice(0, 3);

  return (
    <>
      {/* HEADER */}
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back! Here's what's happening today.</p>
        </div>

        <div className="admin-profile">
          <div className="admin-avatar">A</div>

          <div>
            <strong>Admin</strong>
            <p>Administrator</p>
          </div>
        </div>
      </header>

      {/* STATISTICS */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>

          <div>
            <p>Total Members</p>

            <h2>{loading ? "..." : totalMembers}</h2>

            <span className="positive">Registered members</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏋️</div>

          <div>
            <p>Active Members</p>

            <h2>{loading ? "..." : activeMembers}</h2>

            <span className="positive">Currently active</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>

          <div>
            <p>Monthly Revenue</p>
            <h2>₱0</h2>

            <span className="positive">Connect payments next</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📅</div>

          <div>
            <p>Today's Attendance</p>
            <h2>0</h2>

            <span className="positive">Connect attendance next</span>
          </div>
        </div>
      </section>

      {/* BOTTOM SECTION */}
      <section className="dashboard-grid">
        {/* RECENT MEMBERS */}
        <div className="recent-members">
          <div className="section-header">
            <div>
              <h2>Recent Members</h2>
              <p>Recently registered gym members</p>
            </div>

            <Link to="/members" className="view-btn">
              View All
            </Link>
          </div>

          <div className="member-list">
            {loading ? (
              <p className="dashboard-loading">Loading members...</p>
            ) : recentMembers.length === 0 ? (
              <p className="dashboard-loading">No members found.</p>
            ) : (
              recentMembers.map((member) => (
                <div className="member-item" key={member.id}>
                  <div className="member-avatar">
                    {member.name?.charAt(0).toUpperCase()}
                  </div>

                  <div className="member-info">
                    <strong>{member.name}</strong>

                    <span>{member.membershipName || "No Membership"}</span>
                  </div>

                  <span
                    className={`status ${
                      member.status === "Active"
                        ? "active-status"
                        : "pending-status"
                    }`}
                  >
                    {member.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>

          <Link to="/members">➕ Add New Member</Link>

          <button>📋 Create Membership</button>

          <button>💳 Record Payment</button>

          <button>📅 Record Attendance</button>
        </div>
      </section>
    </>
  );
}

export default Dashboard;
