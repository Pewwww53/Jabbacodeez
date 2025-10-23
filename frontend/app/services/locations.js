import { collection, addDoc, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export async function saveLocation(uid, location) {
  const col = collection(db, "locations");
  const docRef = await addDoc(col, {
    uid,
    name: location.formatted || location.name || "",
    latitude: location.latitude,
    longitude: location.longitude,
    meta: location.meta || {},
    createdAt: new Date()
  });
  return docRef.id;
}

export async function getUserLocations(uid) {
  const q = query(collection(db, "locations"), where("uid", "==", uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}