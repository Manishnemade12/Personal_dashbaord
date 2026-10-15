import mongoose from "mongoose";

const APISchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
  },
  { timestamps: true }
);

const API = mongoose.models.API || mongoose.model("API", APISchema);

export default API;
