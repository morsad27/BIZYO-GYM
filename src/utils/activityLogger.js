import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export const logActivity = async ({
  action,
  description,
  user = "Admin",
  targetType,
  targetId = null,
  metadata = {},
}) => {
  try {
    await addDoc(collection(db, "activityLogs"), {
      action,
      description,
      user,
      targetType,
      targetId,
      metadata,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error creating activity log:", error);
  }
};