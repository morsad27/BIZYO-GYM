import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import "./Equipment.css";

function Equipment() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);

  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    quantity: "",
    condition: "Good",
    location: "",
    notes: "",
  });

  // Load equipment in real time
  useEffect(() => {
    const equipmentQuery = query(
      collection(db, "equipment"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      equipmentQuery,
      (snapshot) => {
        const equipmentData = snapshot.docs.map((equipmentDoc) => ({
          id: equipmentDoc.id,
          ...equipmentDoc.data(),
        }));

        setEquipment(equipmentData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading equipment:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Handle form input
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Open Add modal
  const handleAddEquipment = () => {
    setEditingEquipment(null);

    setFormData({
      name: "",
      category: "",
      quantity: "",
      condition: "Good",
      location: "",
      notes: "",
    });

    setShowModal(true);
  };

  // Open Edit modal
  const handleEditEquipment = (item) => {
    setEditingEquipment(item);

    setFormData({
      name: item.name || "",
      category: item.category || "",
      quantity: item.quantity || "",
      condition: item.condition || "Good",
      location: item.location || "",
      notes: item.notes || "",
    });

    setShowModal(true);
  };

  // Save equipment
  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const equipmentData = {
        name: formData.name.trim(),
        category: formData.category,
        quantity: Number(formData.quantity),
        condition: formData.condition,
        location: formData.location.trim(),
        notes: formData.notes.trim(),
      };

      if (editingEquipment) {
        await updateDoc(
          doc(db, "equipment", editingEquipment.id),
          equipmentData,
        );
      } else {
        await addDoc(collection(db, "equipment"), {
          ...equipmentData,
          createdAt: serverTimestamp(),
        });
      }

      setShowModal(false);
      setEditingEquipment(null);
    } catch (error) {
      console.error("Error saving equipment:", error);
      alert("Something went wrong while saving the equipment.");
    }
  };

  // Delete equipment
  const handleDeleteEquipment = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this equipment?",
    );

    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "equipment", id));
    } catch (error) {
      console.error("Error deleting equipment:", error);
      alert("Something went wrong while deleting the equipment.");
    }
  };

  // Search equipment
  const filteredEquipment = equipment.filter((item) => {
    const searchValue = search.toLowerCase();

    return (
      item.name?.toLowerCase().includes(searchValue) ||
      item.category?.toLowerCase().includes(searchValue) ||
      item.location?.toLowerCase().includes(searchValue) ||
      item.condition?.toLowerCase().includes(searchValue)
    );
  });

  return (
    <div className="equipment-page">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1>Equipment</h1>
          <p>Manage your gym equipment and maintenance status.</p>
        </div>

        <button
          className="add-equipment-btn"
          onClick={handleAddEquipment}
        >
          + Add Equipment
        </button>
      </div>

      {/* SEARCH */}
      <div className="equipment-toolbar">
        <input
          type="text"
          placeholder="Search equipment..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {/* EQUIPMENT TABLE */}
      <div className="equipment-card">
        {loading ? (
          <p className="equipment-message">
            Loading equipment...
          </p>
        ) : filteredEquipment.length === 0 ? (
          <p className="equipment-message">
            No equipment found.
          </p>
        ) : (
          <div className="equipment-table-container">
            <table>
              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Condition</th>
                  <th>Location</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredEquipment.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                    </td>

                    <td>{item.category}</td>

                    <td>{item.quantity}</td>

                    <td>
                      <span
                        className={`equipment-status ${item.condition
                          ?.toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {item.condition}
                      </span>
                    </td>

                    <td>{item.location || "-"}</td>

                    <td>{item.notes || "-"}</td>

                    <td>
                      <div className="equipment-actions">
                        <button
                          className="edit-equipment-btn"
                          onClick={() =>
                            handleEditEquipment(item)
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="delete-equipment-btn"
                          onClick={() =>
                            handleDeleteEquipment(item.id)
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="equipment-modal">
            <div className="modal-header">
              <div>
                <h2>
                  {editingEquipment
                    ? "Edit Equipment"
                    : "Add Equipment"}
                </h2>

                <p>
                  {editingEquipment
                    ? "Update equipment information."
                    : "Add a new gym equipment item."}
                </p>
              </div>

              <button
                className="close-modal-btn"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Equipment Name</label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Treadmill"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>

                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      Select category
                    </option>
                    <option value="Cardio">Cardio</option>
                    <option value="Strength">Strength</option>
                    <option value="Free Weights">
                      Free Weights
                    </option>
                    <option value="Functional">
                      Functional
                    </option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Quantity</label>

                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="Enter quantity"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Condition</label>

                  <select
                    name="condition"
                    value={formData.condition}
                    onChange={handleChange}
                  >
                    <option value="Good">Good</option>
                    <option value="Needs Maintenance">
                      Needs Maintenance
                    </option>
                    <option value="Damaged">Damaged</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Location</label>

                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g. Main Floor"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>

                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Additional information..."
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-equipment-btn"
                >
                  {editingEquipment
                    ? "Update Equipment"
                    : "Add Equipment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Equipment;