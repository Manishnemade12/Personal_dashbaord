import { useState, useEffect } from "react";
import axios from "axios";
import APIForm from "../../components/APIForm";
import APIList from "../../components/APIList";
import Link from "next/link";

export default function APIManagement() {
  const [apis, setApis] = useState([]);
  const [selectedAPI, setSelectedAPI] = useState(null);

  const fetchAPIs = async () => {
    const res = await axios.get("/api/apis");
    setApis(res.data.data);
  };

  useEffect(() => {
    fetchAPIs();
  }, []);

  return (
    <div className="blogpage">
    <div className="p-6">
      
      <h1 className="text-2xl font-bold mb-4">API Management</h1>
      <Link href="/projectapi" className="mb-4 inline-block bg-blue-500 text-white px-4 py-2 rounded"><button className="create-project-btn">Go to Projects API</button></Link>
      <APIForm selectedAPI={selectedAPI} refreshData={fetchAPIs} />
      <APIList apis={apis} setSelectedAPI={setSelectedAPI} refreshData={fetchAPIs} />
    </div>
    </div>
  );
}
