import mongoose from "mongoose";

const ApiSchema = new mongoose.Schema({
  name: { type: String, required: true },
  endpoint: { type: String, required: true },
});

const ProjectApiSchema = new mongoose.Schema({
  projectName: { type: String, required: true },
  apis: [ApiSchema],
});

export default mongoose.models.ProjectApi ||
  mongoose.model("ProjectApi", ProjectApiSchema);