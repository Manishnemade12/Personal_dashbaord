import { useState } from "react";
import axios from "axios";

export default function APIForm({ selectedAPI, refreshData }) {
  const [name, setName] = useState(selectedAPI ? selectedAPI.name : "");
  const [url, setURL] = useState(selectedAPI ? selectedAPI.url : "");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedAPI) {
        await axios.put(`/api/apis/${selectedAPI._id}`, { name, url });
      } else {
        await axios.post("/api/apis", { name, url });
      }
      refreshData();
      setIsModalOpen(false);
      setName("");
      setURL("");
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="api-form-container">
      <button className="api-add-button" onClick={() => setIsModalOpen(true)}>
        {/* ➕ Add API */}
        {selectedAPI ? "Update API" : "➕ Add API"}
      </button>
      <div className={`api-modal-overlay ${isModalOpen ? "show" : ""}`}>
        <div className={`api-modal ${isModalOpen ? "show" : ""}`}>
          <button
            className="api-close-button"
            onClick={() => setIsModalOpen(false)}
          >
            ❌
          </button>
          <h2 className="api-modal-title">
            {selectedAPI ? "✏️ Edit API" : "➕ Add New API"}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="api-input-group">
              <label htmlFor="apiName" className="api-label">
                API Name
              </label>
              <input
                id="apiName"
                type="text"
                placeholder="Enter API Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="api-input-group">
              <label htmlFor="apiURL" className="api-label">
                API URL
              </label>
              <input
                id="apiURL"
                placeholder="Enter API URL"
                value={url}
                onChange={(e) => setURL(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="api-submit-button">
              {selectedAPI ? "Update API" : "Add API"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
