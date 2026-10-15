import { useState } from "react";

export default function ProjectApiForm({ onCreated }) {
  const [projectName, setProjectName] = useState("");
  const [apisInput, setApisInput] = useState(""); // Single textarea input

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Split input by newlines, filter out empty lines
    const apis = apisInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const idx = line.indexOf('=');
        if (idx === -1) {
          return { name: line, endpoint: "" }; // fallback if no '='
        }
        return {
          name: line.slice(0, idx).trim(),
          endpoint: line.slice(idx + 1).trim(),
        };
      });

    const res = await fetch("/api/projectapi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName, apis }),
    });
    if (res.ok) {
      setProjectName("");
      setApisInput("");
      onCreated && onCreated();
    }
  };

  return (
    <form className="project-form" onSubmit={handleSubmit}>
      <label>Project Name:</label>
      <input
        type="text"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        required
        placeholder="Enter project name"
      />

      <div className="api-fields-list">
        <label>APIs (one per line, format: <code>NAME=ENDPOINT</code>):</label>
        <textarea
          rows={6}
          placeholder="NEXTAUTH_SECRET=U7nXY4RsMoy7KmqQIT68IUATPG8"
          value={apisInput}
          onChange={e => setApisInput(e.target.value)}
          required
          style={{ width: "100%", fontFamily: "monospace", marginBottom: 12 }}
        />
      </div>
      <button type="submit" className="create-project-btn">
        Create Project
      </button>
    </form>
  );
}