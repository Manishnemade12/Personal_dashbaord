import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, ClipboardCopy } from "lucide-react"; 

export default function ProjectDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [deleting, setDeleting] = useState(false);
 const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/projectapi/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setProject(data);
        setLoading(false);
      });
  }, [id]);

  const handleCopy = async (endpoint, idx) => {
    await navigator.clipboard.writeText(endpoint);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1200);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    setDeleting(true);
    await fetch(`/api/projectapi/${id}`, { method: "DELETE" });
    setDeleting(false);
    router.push("/projectapi");
  };

    const handleCopyAll = async () => {
    if (!project?.apis?.length) return;
    const text = project.apis.map(api => `${api.name} = ${api.endpoint}`).join('\n');
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1200);
  };

  if (loading) return <div className="blogpage text-center mt-2"><p>Loading...</p></div>;
  if (!project) return <div className="blogpage text-center mt-2"><p>Project not found</p></div>;

  return (
    <div className="blogpage flex flex-col flex-center">
      <div className="project-api-container w-1000" style={{maxWidth: 700}}>
        <Link href="/projectapi" className="mb-2" style={{ display: "inline-block", color: "#3949ab", textDecoration: "none", fontWeight: 500 }}>
          ← Back to All Projects
        </Link>
        <div className="flex flex-sb flex-center mb-2" style={{ alignItems: "center" }}>
          <h1 className="mb-0 text-center" style={{ marginBottom: 0 }}>{project.projectName}</h1>
         
     <button
  onClick={handleCopyAll}
  aria-label="Copy all endpoints"
  title={copiedAll ? "Copied!" : "Copy All"}
  type="button"
  className="copy-btn-icon"
>
  <span className="copy-icon">
    {copiedAll ? <ClipboardCheck size={18} /> : <ClipboardCopy size={18} />}
  </span>
  <span>{copiedAll ? "Copied!" : "Copy All"}</span>
</button>

<style jsx>{`
  .copy-btn-icon {
  width: 150px;
  height: 40px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background-color: #3949ab;
    color: #fff;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    padding: 10px 20px;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    box-shadow: 0 4px 12px rgba(57, 73, 171, 0.2);
    position: relative;
    overflow: hidden;
  }

  .copy-btn-icon:hover {
    background-color: #303f9f;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(57, 73, 171, 0.3);
  }

  .copy-btn-icon:active {
    transform: scale(0.98);
    box-shadow: 0 2px 6px rgba(57, 73, 171, 0.2);
  }

  .copy-icon {
    display: flex;
    align-items: center;
  }
`}</style>
         
          <button
            onClick={handleDelete}
            title="Delete Project"
            disabled={deleting}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              marginLeft: 12,
              padding: 4,
              borderRadius: "6px",
              transition: "background 0.15s",
              color: "#dc3545",
              display: "flex",
              alignItems: "center",
              fontSize: "1.5rem"
            }}
          >
            {/* Trashbin SVG */}
            <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
              <rect x="5.5" y="8" width="9" height="7" rx="2" stroke="#dc3545" strokeWidth="1.7"/>
              <path d="M8 8V6.5A2 2 0 0 1 10 4.5A2 2 0 0 1 12 6.5V8" stroke="#dc3545" strokeWidth="1.7"/>
              <path d="M3 8H17" stroke="#dc3545" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <h2 className="mb-2 text-center">APIs</h2>
        <ul className="api-list">
          {project.apis.map((api, idx) => (
            <li key={idx} className="api-item">
              <div className="flex flex-sb flex-center gap-05">
                <div>
                  <div className="api-name">{api.name}</div>
                  <div className="api-endpoint-row">
                    <span className="api-endpoint">{api.endpoint}</span>
                  </div>
                </div>
                <button
                  className={`copy-btn-icon${copiedIdx === idx ? " copied" : ""}`}
                  onClick={() => handleCopy(api.endpoint, idx)}
                  aria-label="Copy endpoint"
                  title={copiedIdx === idx ? "Copied!" : "Copy"}
                  type="button"
                  style={{marginLeft: 8}}
                >
                  {copiedIdx === idx ? (
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path d="M5 10.5L9 14.5L15 7.5" stroke="#43a047" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <rect x="5" y="4" width="10" height="12" rx="2" stroke="#3949ab" strokeWidth="2"/>
                      <path d="M8 2.5h4" stroke="#3949ab" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}