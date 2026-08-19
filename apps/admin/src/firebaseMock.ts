/// <reference types="vite/client" />
// Firebase Simulation Service for Local Persistent Multi-Role Authentication & Data Storage
import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, deleteDoc } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "SELLER" | "ADMIN";
  mobileNumber?: string;
  // Customer specific
  age?: string;
  dob?: string;
  address?: string;
  pincode?: string;
  district?: string;
  state?: string;
  country?: string;
  businessName?: string;
  location?: string;
  businessType?: string;
  walletBalance?: number;
}

interface UserRecord {
  profile: UserProfile;
  passwordHash: string; // Plain simulated password or simple hash
}

// Initial seed data
const DEFAULT_USERS: Record<string, UserRecord> = {
  "admin@nexus.com": {
    profile: {
      uid: "uid-admin-1",
      email: "admin@nexus.com",
      name: "Platform Administrator",
      role: "ADMIN"
    },
    passwordHash: "NexusPass123!"
  },
  "consumer@nexus.com": {
    profile: {
      uid: "uid-consumer-1",
      email: "consumer@nexus.com",
      name: "Alice Customer",
      role: "CUSTOMER",
      mobileNumber: "9876543210",
      age: "28",
      dob: "1998-05-15",
      address: "123 Green Avenue",
      pincode: "560001",
      district: "Bengaluru",
      state: "Karnataka",
      country: "India",
      walletBalance: 50000
    },
    passwordHash: "NexusPass123!"
  },
  "seller@nexus.com": {
    profile: {
      uid: "uid-seller-1",
      email: "seller@nexus.com",
      name: "Bob Seller",
      role: "SELLER",
      mobileNumber: "8765432109",
      businessName: "Bob's Organic Market",
      location: "Indiranagar, Bengaluru",
      businessType: "Retail Groceries"
    },
    passwordHash: "NexusPass123!"
  }
};

class FirebaseMockService {
  private getUsersStore(): Record<string, UserRecord> {
    const store = localStorage.getItem("nexus_firebase_users");
    let parsed: Record<string, UserRecord> = {};
    if (store) {
      try {
        parsed = JSON.parse(store);
      } catch (e) {
        parsed = {};
      }
    }
    // Always ensure default seed users exist in the store so they can't be deleted or lost
    let changed = false;
    for (const [email, record] of Object.entries(DEFAULT_USERS)) {
      if (!parsed[email]) {
        parsed[email] = record;
        changed = true;
      }
    }
    if (changed || !store) {
      localStorage.setItem("nexus_firebase_users", JSON.stringify(parsed));
    }
    return parsed;
  }

  private saveUsersStore(store: Record<string, UserRecord>) {
    localStorage.setItem("nexus_firebase_users", JSON.stringify(store));
  }

  private getResetCodes(): Record<string, string> {
    const codes = localStorage.getItem("nexus_firebase_reset_codes");
    return codes ? JSON.parse(codes) : {};
  }

  private saveResetCodes(codes: Record<string, string>) {
    localStorage.setItem("nexus_firebase_reset_codes", JSON.stringify(codes));
  }

  // Helper to determine if we should use real Firebase
  private isRealFirebase(): boolean {
    return import.meta.env.VITE_FIREBASE_API_KEY !== undefined && import.meta.env.VITE_FIREBASE_API_KEY !== "dummy-api-key" && import.meta.env.VITE_FIREBASE_API_KEY !== "";
  }

  // Authentication API
  async signUp(email: string, password: string, role: "CUSTOMER" | "SELLER" | "ADMIN", profileDetails: Partial<UserProfile>): Promise<{ success: boolean; message: string; user?: UserProfile }> {
    const cleanEmail = email.toLowerCase().trim();

    if (this.isRealFirebase()) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const uid = userCredential.user.uid;
        const newProfile: UserProfile = {
          uid,
          email: cleanEmail,
          name: profileDetails.name || "NEXUS User",
          role,
          ...profileDetails
        };
        await setDoc(doc(db, "users", uid), newProfile);
        return { success: true, message: "Registration successful!", user: newProfile };
      } catch (err: any) {
        return { success: false, message: err.message || "Failed to register on Firebase." };
      }
    }

    // Fallback to simulated localstorage mock
    const store = this.getUsersStore();
    if (store[cleanEmail]) {
      return { success: false, message: "An account with this email address already exists." };
    }

    const uid = "uid-" + Math.random().toString(36).substring(2, 11);
    const newProfile: UserProfile = {
      uid,
      email: cleanEmail,
      name: profileDetails.name || "NEXUS User",
      role,
      ...profileDetails
    };

    store[cleanEmail] = {
      profile: newProfile,
      passwordHash: password
    };

    this.saveUsersStore(store);
    return { success: true, message: "Registration successful!", user: newProfile };
  }

  async signIn(email: string, password: string, expectedRole: "CUSTOMER" | "SELLER" | "ADMIN"): Promise<{ success: boolean; message: string; user?: UserProfile }> {
    const cleanEmail = email.toLowerCase().trim();

    if (this.isRealFirebase()) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const uid = userCredential.user.uid;
        const userDoc = await getDoc(doc(db, "users", uid));
        if (!userDoc.exists()) {
          await signOut(auth);
          return { success: false, message: "User profile document not found in Firestore." };
        }
        const profile = userDoc.data() as UserProfile;
        if (profile.role !== expectedRole) {
          await signOut(auth);
          return { success: false, message: `Invalid role! This account is registered as a ${profile.role}.` };
        }
        return { success: true, message: "Login successful!", user: profile };
      } catch (err: any) {
        return { success: false, message: err.message || "Invalid credentials" };
      }
    }

    // Fallback to simulated localstorage mock
    const store = this.getUsersStore();
    const userRecord = store[cleanEmail];

    if (!userRecord || userRecord.passwordHash !== password) {
      return { success: false, message: "Invalid email address or password" };
    }

    if (userRecord.profile.role !== expectedRole) {
      return { success: false, message: `Invalid role! This account is registered as a ${userRecord.profile.role}.` };
    }

    return { success: true, message: "Login successful!", user: userRecord.profile };
  }

  // Forgot Password API
  async sendResetCode(email: string): Promise<{ success: boolean; message: string; code?: string }> {
    const cleanEmail = email.toLowerCase().trim();

    if (this.isRealFirebase()) {
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        return { success: true, message: "Firebase Password reset email sent! Please check your inbox." };
      } catch (err: any) {
        return { success: false, message: err.message || "Failed to send reset email." };
      }
    }

    // Fallback simulated PIN outbox
    const store = this.getUsersStore();
    if (!store[cleanEmail]) {
      return { success: false, message: "No account found with this email address." };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit PIN
    const codes = this.getResetCodes();
    codes[cleanEmail] = code;
    this.saveResetCodes(codes);

    return { success: true, message: `Verification code sent!`, code };
  }

  async verifyCodeAndResetPassword(email: string, enteredCode: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.toLowerCase().trim();

    if (this.isRealFirebase()) {
      return { success: false, message: "Please reset your password using the secure link emailed to you by Firebase." };
    }

    // Fallback simulated localstorage mock
    const codes = this.getResetCodes();
    const correctCode = codes[cleanEmail];

    if (!correctCode || correctCode !== enteredCode.trim()) {
      return { success: false, message: "Incorrect verification code. Please check and try again." };
    }

    const store = this.getUsersStore();
    if (!store[cleanEmail]) {
      return { success: false, message: "User account not found." };
    }

    store[cleanEmail].passwordHash = newPassword;
    this.saveUsersStore(store);

    // Clear reset code
    delete codes[cleanEmail];
    this.saveResetCodes(codes);

    return { success: true, message: "Password updated successfully. You can now log in!" };
  }

  // Admin Management API
  async addAdmin(createdByEmail: string, newAdminEmail: string, adminPass: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = newAdminEmail.toLowerCase().trim();
    if (this.isRealFirebase()) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, adminPass);
        const uid = userCredential.user.uid;
        const newProfile: UserProfile = {
          uid,
          email: cleanEmail,
          name: "Co-Administrator",
          role: "ADMIN"
        };
        await setDoc(doc(db, "users", uid), newProfile);
        return { success: true, message: "Co-Administrator added successfully." };
      } catch (err: any) {
        return { success: false, message: err.message || "Failed to create Admin on Firebase." };
      }
    }

    // Local storage fallback
    const store = this.getUsersStore();
    const creator = store[createdByEmail.toLowerCase().trim()];

    if (!creator || creator.profile.role !== "ADMIN") {
      return { success: false, message: "Only administrators can add new admins." };
    }

    if (store[cleanEmail]) {
      return { success: false, message: "This email address is already registered." };
    }

    return this.signUp(cleanEmail, adminPass, "ADMIN", { name: "Co-Administrator" });
  }

  async getAllUsers(adminEmail: string): Promise<UserProfile[]> {
    if (this.isRealFirebase()) {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const users: UserProfile[] = [];
        querySnapshot.forEach((docSnap) => {
          users.push(docSnap.data() as UserProfile);
        });
        return users;
      } catch (e) {
        console.error(e);
        return [];
      }
    }

    // Local storage fallback
    const store = this.getUsersStore();
    const requester = store[adminEmail.toLowerCase().trim()];

    if (!requester || requester.profile.role !== "ADMIN") {
      return [];
    }

    return Object.values(store).map(record => record.profile);
  }

  async removeUser(adminEmail: string, userUidToRemove: string): Promise<{ success: boolean; message: string }> {
    if (this.isRealFirebase()) {
      try {
        await deleteDoc(doc(db, "users", userUidToRemove));
        return { success: true, message: "Account profile successfully removed from the system." };
      } catch (err: any) {
        return { success: false, message: err.message || "Failed to delete user document." };
      }
    }

    // Local storage fallback
    const store = this.getUsersStore();
    const requester = store[adminEmail.toLowerCase().trim()];

    if (!requester || requester.profile.role !== "ADMIN") {
      return { success: false, message: "Access denied. Admin role required." };
    }

    const cleanEmail = Object.keys(store).find(key => store[key].profile.uid === userUidToRemove);
    if (!cleanEmail) {
      return { success: false, message: "User profile not found." };
    }

    if (store[cleanEmail].profile.role === "ADMIN" && Object.values(store).filter(r => r.profile.role === "ADMIN").length <= 1) {
      return { success: false, message: "Cannot remove the final platform administrator." };
    }

    delete store[cleanEmail];
    this.saveUsersStore(store);
    return { success: true, message: "Account profile successfully removed from the system." };
  }

  async updateUserWallet(email: string, walletBalance: number): Promise<{ success: boolean; message: string }> {
    if (this.isRealFirebase()) {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        let targetUid = "";
        querySnapshot.forEach((docSnap) => {
          const profile = docSnap.data() as UserProfile;
          if (profile.email.toLowerCase().trim() === email.toLowerCase().trim()) {
            targetUid = docSnap.id;
          }
        });
        if (targetUid) {
          await updateDoc(doc(db, "users", targetUid), { walletBalance });
        }
        return { success: true, message: "Wallet balance updated successfully." };
      } catch (err: any) {
        return { success: false, message: err.message || "Failed to update wallet balance." };
      }
    }

    // Local storage fallback
    const store = this.getUsersStore();
    const cleanEmail = email.toLowerCase().trim();
    if (!store[cleanEmail]) {
      return { success: false, message: "User account not found." };
    }
    store[cleanEmail].profile.walletBalance = walletBalance;
    this.saveUsersStore(store);
    return { success: true, message: "Wallet balance updated successfully." };
  }
}

export const firebaseMock = new FirebaseMockService();
