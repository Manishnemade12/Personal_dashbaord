import { mongooseConnect } from "../../../lib/mongoose";
import ProjectApi from "../../../models/ProjectApi";

export default async function handler(req, res) {
  await mongooseConnect();
  const { id } = req.query;

  if (req.method === "GET") {
    const project = await ProjectApi.findById(id);
    if (!project) return res.status(404).json({ error: "Not found" });
    res.status(200).json(project);
  } else if (req.method === "PUT") {
    const { projectName, apis } = req.body;
    const updated = await ProjectApi.findByIdAndUpdate(
      id,
      { projectName, apis },
      { new: true }
    );
    res.status(200).json(updated);
  } else if (req.method === "DELETE") {
    await ProjectApi.findByIdAndDelete(id);
    res.status(204).end();
  } else {
    res.status(405).end();
  }
}