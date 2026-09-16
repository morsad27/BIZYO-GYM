import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import "./Dashboard.css";

function Dashboard() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(true);

  // Fetch entry logs from Firestore
  useEffect(() => {
    const entryQuery = query(
      collection(db, "entryLogs"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      entryQuery,
      (snapshot) => {
        const entriesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setEntries(entriesData);
        setEntriesLoading(false);
      },
      (error) => {
        console.error("Error loading entry logs:", error);
        setEntriesLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Fetch members from Firestore
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

  // Total entry logs
  const totalEntries = entries.length;

  // Currently inside the gym
  const currentlyInside = entries.filter(
    (entry) => entry.status === "Inside",
  ).length;

  // Today's entries
  const today = new Date();

  const todaysEntries = entries.filter((entry) => {
    const checkInDate = entry.checkInAt?.toDate?.();

    if (!checkInDate) return false;

    return (
      checkInDate.getDate() === today.getDate() &&
      checkInDate.getMonth() === today.getMonth() &&
      checkInDate.getFullYear() === today.getFullYear()
    );
  }).length;

  // Get the 3 most recent members
  const recentMembers = [...members]
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);

      return dateB - dateA;
    })
    .slice(0, 3);

  // Format the entry date and time for display
  const formatEntryDate = (timestamp) => {
    if (!timestamp) return "-";

    return timestamp.toDate().toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatEntryTime = (timestamp) => {
    if (!timestamp) return "-";

    return timestamp.toDate().toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Show the 5 most recent check-in/check-out activities
  const recentEntries = [...entries]
    .sort((a, b) => {
      const dateA =
        a.checkOutAt?.toDate?.() || a.checkInAt?.toDate?.() || new Date(0);

      const dateB =
        b.checkOutAt?.toDate?.() || b.checkInAt?.toDate?.() || new Date(0);

      return dateB - dateA;
    })
    .slice(0, 5);

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
          <div className="stat-icon">🚪</div>

          <div>
            <p>Today's Entries</p>

            <h2>{entriesLoading ? "..." : todaysEntries}</h2>

            <span className="positive">Entries today</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👤</div>

          <div>
            <p>Currently Inside</p>

            <h2>{entriesLoading ? "..." : currentlyInside}</h2>

            <span className="positive">Members inside</span>
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

          <Link to="/memberships">📋 Create Membership</Link>

          <Link to="/payments">💳 Record Payment</Link>

          <Link to="/entry-log">🚪 Record Entry</Link>
        </div>
      </section>

      <section className="dashboard2-grid">

        <div className="recent-members">
          <div className="section-header">
            <div>
              <h2>Recent Entries</h2>
              <p>Recently checked in or out</p>
            </div>

            <Link to="/entry-log" className="view-btn">
              View All
            </Link>
          </div>

          <div className="member-list">
            {entriesLoading ? (
              <p className="dashboard-loading">Loading entries...</p>
            ) : recentEntries.length === 0 ? (
              <p className="dashboard-loading">No entries found.</p>
            ) : (
              recentEntries.map((entry) => {
                const isCheckedOut = entry.status === "Completed";

                const activityTime = isCheckedOut
                  ? entry.checkOutAt
                  : entry.checkInAt;

                return (
                  <div className="member-item" key={entry.id}>
                    <div className="member-avatar">
                      {entry.memberName?.charAt(0).toUpperCase()}
                    </div>

                    <div className="member-info">
                      <strong>{entry.memberName}</strong>

                      <span>
                        {formatEntryDate(activityTime)} •{" "}
                        {formatEntryTime(activityTime)}
                      </span>
                    </div>

                    <span
                      className={`status ${
                        isCheckedOut ? "pending-status" : "active-status"
                      }`}
                    >
                      {isCheckedOut ? "Check Out" : "Check In"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default Dashboard;
