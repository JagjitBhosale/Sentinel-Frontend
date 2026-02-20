import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    type DocumentData,
    type QuerySnapshot,
} from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDGOd3sl0rXwaWOY2_gVs4M-_HYEuow980",
    authDomain: "sentinel-ed93e.firebaseapp.com",
    projectId: "sentinel-ed93e",
    storageBucket: "sentinel-ed93e.firebasestorage.app",
    messagingSenderId: "79511292062",
    appId: "1:79511292062:web:1cc08429c96c1de695538f",
    measurementId: "G-B0HRNHGEHR",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ─── Storage Helpers ───

/**
 * Get a download URL for an audio file stored in Firebase Storage.
 * @param filePath  e.g. "disaster_reports/audio_1771083326278.wav"
 */
export async function getAudioUrl(filePath: string): Promise<string> {
    const storageRef = ref(storage, filePath);
    return getDownloadURL(storageRef);
}

// ─── Collection References ───

export const ivrReportsCol = collection(db, "ivr_reports");
export const disasterReportsCol = collection(db, "disaster_reports");
export const alertsCol = collection(db, "alerts");
export const incidentsCol = collection(db, "incidents");
export const twitterReportsCol = collection(db, "twitter_reports");
export const newsReportsCol = collection(db, "news_reports");
export const facebookReportsCol = collection(db, "facebook_reports");
export const youtubeReportsCol = collection(db, "youtube_reports");
export const appReportsCol = collection(db, "reports");

// ─── Real-time Listeners ───

export function onIVRReports(callback: (docs: DocumentData[]) => void) {
    const q = query(ivrReportsCol, orderBy("created_at", "desc"));
    return onSnapshot(
        q,
        (snap: QuerySnapshot) => {
            callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        (err) => {
            console.warn("Firebase ivr_reports listener error:", err);
            callback([]);
        }
    );
}

export function onDisasterReports(callback: (docs: DocumentData[]) => void) {
    const q = query(disasterReportsCol, orderBy("created_at", "desc"));
    return onSnapshot(
        q,
        (snap: QuerySnapshot) => {
            callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        (err) => {
            console.warn("Firebase disaster_reports listener error:", err);
            callback([]);
        }
    );
}

export function onAlerts(callback: (docs: DocumentData[]) => void) {
    const q = query(alertsCol, orderBy("created_at", "desc"));
    return onSnapshot(
        q,
        (snap: QuerySnapshot) => {
            callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        (err) => {
            console.warn("Firebase alerts listener error:", err);
            callback([]);
        }
    );
}

export function onAppReports(callback: (docs: DocumentData[]) => void) {
    const q = query(appReportsCol, orderBy("createdAt", "desc"));
    return onSnapshot(
        q,
        (snap: QuerySnapshot) => {
            callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        (err) => {
            console.warn("Firebase reports listener error:", err);
            callback([]);
        }
    );
}

// ─── CRUD for Alerts ───

export async function createAlert(data: {
    title: string;
    description: string;
    severity: string;
    district: string;
    expires_at: string;
}) {
    return addDoc(alertsCol, {
        ...data,
        status: "active",
        created_at: serverTimestamp(),
    });
}

export async function updateAlert(id: string, data: Partial<DocumentData>) {
    return updateDoc(doc(db, "alerts", id), data);
}

export async function deleteAlert(id: string) {
    return deleteDoc(doc(db, "alerts", id));
}

export { serverTimestamp };
