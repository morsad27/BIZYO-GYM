import "./Dashboard.css";

function Dashboard() {
  return (
    <>
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

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div>
            <p>Total Members</p>
            <h2>245</h2>
            <span className="positive">+12 this month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏋️</div>
          <div>
            <p>Active Members</p>
            <h2>198</h2>
            <span className="positive">+8 this month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div>
            <p>Monthly Revenue</p>
            <h2>₱125,000</h2>
            <span className="positive">+15% this month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div>
            <p>Today's Attendance</p>
            <h2>86</h2>
            <span className="positive">Members checked in</span>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="recent-members">
          <div className="section-header">
            <div>
              <h2>Recent Members</h2>
              <p>Recently registered gym members</p>
            </div>

            <button className="view-btn">View All</button>
          </div>

          <div className="member-list">
            <div className="member-item">
              <div className="member-avatar">J</div>
              <div className="member-info">
                <strong>Juan Dela Cruz</strong>
                <span>Premium Membership</span>
              </div>
              <span className="status active-status">Active</span>
            </div>

            <div className="member-item">
              <div className="member-avatar">M</div>
              <div className="member-info">
                <strong>Maria Santos</strong>
                <span>Monthly Membership</span>
              </div>
              <span className="status active-status">Active</span>
            </div>

            <div className="member-item">
              <div className="member-avatar">C</div>
              <div className="member-info">
                <strong>Carlo Reyes</strong>
                <span>Basic Membership</span>
              </div>
              <span className="status pending-status">Pending</span>
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <h2>Quick Actions</h2>

          <button>➕ Add New Member</button>
          <button>📋 Create Membership</button>
          <button>💳 Record Payment</button>
          <button>📅 Record Attendance</button>
        </div>
      </section>
    </>
  );
}

export default Dashboard;