import API from "@/models/API"; 
import { mongooseConnect } from "@/lib/mongoose";


export default async function handler(req, res) {
  await mongooseConnect();

  if (req.method === "POST") {
    try {
      const { name, url } = req.body;
      const newAPI = new API({ name, url });
      await newAPI.save();
      return res.status(201).json({ success: true, data: newAPI });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  if (req.method === "GET") {
    try {
      const apis = await API.find();
      return res.status(200).json({ success: true, data: apis });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  res.status(405).json({ success: false, message: "Method Not Allowed" });
}
