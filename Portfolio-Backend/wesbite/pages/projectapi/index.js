import ProjectApiForm from "../../components/ProjectApiForm";
import useProjectApi from "../../hooks/useProjectApi";
import Link from "next/link";

export default function ProjectApiPage() {
  const { projects, loading, fetchProjects } = useProjectApi();

  return (
    <div className="blogpage">
      <div className="titledashboard flex flex-sb mb-2">
        <h1>Create Project & APIs</h1>
      </div>
      <div className="project-api-container w-100" style={{ maxWidth: 700 }}>
        <ProjectApiForm onCreated={fetchProjects} />
        <hr className="mb-2 mt-2" />
        <h2 className="mb-2 text-center">All Projects</h2>
        {loading ? (
          <div className="text-center mt-2"><p>Loading...</p></div>
        ) : projects.length === 0 ? (
          <div className="text-center mt-2">No projects found</div>
        ) : (
          <ul className="api-list  ">
            {projects.map((p) => (
              <li
                key={p._id}
                className="api-item"
                style={{
                  cursor: "pointer",
                  transition: "box-shadow 0.15s",
                  padding: "18px 20px",
                  marginBottom: "18px",
                  background: "#f4f6fb",
                  borderRadius: "10px",
                  boxShadow: "0 2px 8px 0 rgba(60,72,88,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  height: "60px",
                 
                }}
              >
                <Link
                  href={`/projectapi/${p._id}`}
                  style={{
                    textDecoration: "none",
                    color: "#263238",
                    fontWeight: 600,
                    fontSize: "1.15rem",
                    flex: 1,
                  }}
                >
                  {p.projectName}
                </Link>
                <Link
                  href={`/projectapi/${p._id}`}
                  style={{
                    color: "#3949ab",
                    fontWeight: 600,
                    fontSize: "1.2rem",
                    marginLeft: "10px",
                  }}
                  aria-label="View Project APIs"
                  title="View APIs"
                >
                  {/* &rarr; */}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}