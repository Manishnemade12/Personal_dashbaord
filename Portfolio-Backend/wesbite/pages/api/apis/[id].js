import API from "@/models/API"; 
import { mongooseConnect } from "@/lib/mongoose";

export default async function handler(req, res) {
  await mongooseConnect();
  const { id } = req.query;

  if (req.method === "PUT") {
    try {
      const { name, url } = req.body;
      const updatedAPI = await API.findByIdAndUpdate(id, { name, url }, { new: true });
      return res.status(200).json({ success: true, data: updatedAPI });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      await API.findByIdAndDelete(id);
      return res.status(200).json({ success: true, message: "API deleted successfully" });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  res.status(405).json({ success: false, message: "Method Not Allowed" });
}
