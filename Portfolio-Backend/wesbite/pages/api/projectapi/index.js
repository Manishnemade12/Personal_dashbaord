import { mongooseConnect } from "../../../lib/mongoose";
import ProjectApi from "../../../models/ProjectApi";

export default async function handler(req, res) {
  await mongooseConnect();

  if (req.method === "POST") {
    const { projectName, apis } = req.body;
    try {
      const project = await ProjectApi.create({ projectName, apis });
      res.status(201).json(project);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  } else if (req.method === "GET") {
    const projects = await ProjectApi.find();
    res.status(200).json(projects);
  } else {
    res.status(405).end();
  }
}