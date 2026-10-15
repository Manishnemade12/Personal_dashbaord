import { useState } from "react";
import axios from "axios";
import APIForm from "./APIForm";
import { FaCopy } from "react-icons/fa";

export default function APIList({ apis = [], refreshData }) {
  const [selectedAPI, setSelectedAPI] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this API?")) {
      await axios.delete(`/api/apis/${id}`);
      refreshData();
    }
  };

  const handleEdit = (api) => {
    setSelectedAPI(api);
    setShowModal(true);
  };

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url)
      .then(() => {
        alert("API URL copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy API URL:", err);
      });
  };

  // 🔍 Filter APIs based on search query
  const filteredApis = apis.filter(api =>
    api.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="api-list">
      {apis.length === 0 ? <p className="no-data">No APIs saved yet.</p> : null}

      {/* 🔍 Search Input */}
      <input
        type="text"
        placeholder="Search APIs by name..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-input"
      />

      {filteredApis.map((api) => (
        <div key={api._id} className="api-card">
          <div className="api-info">
            <h1 className="api-name">{api.name}</h1>
            <div className="api-url-container">
              <span>
                <h2 className="api-url">{api.url}</h2>
                <button
                  className="copy-icon-btn"
                  onClick={() => handleCopy(api.url)}
                  title="Copy URL"
                >
                  <i className="fas fa-copy"><FaCopy /></i>
                </button>
              </span>
            </div>
          </div>
          <div className="api-actions">
            <button className="edit-btn" onClick={() => handleEdit(api)}>Edit</button>
            <button className="delete-btn" onClick={() => handleDelete(api._id)}>Delete</button>
          </div>
        </div>
      ))}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <APIForm
              selectedAPI={selectedAPI}
              refreshData={refreshData}
              setShowModal={setShowModal}
              onClick={() => setShowModal(false)}
            />
            <button className="button-1" onClick={() => setShowModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
