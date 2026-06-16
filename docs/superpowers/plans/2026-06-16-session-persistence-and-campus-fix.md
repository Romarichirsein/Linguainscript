# Session Persistence and Campus Creation Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the issue where users are logged out when refreshing the page, and resolve the campus creation failure for the Directress role by ensuring all password-based logins authenticate properly via Firebase Auth.

**Architecture:** 
1. Authenticate virtual/password-based users in Firebase Auth client SDK during login using a deterministic password format (derived from email). This ensures `request.auth != null` is set, allowing Firestore security rules to accept write operations.
2. Update the `onAuthStateChanged` listener to cleanly migrate old profile IDs to the new Firebase Auth-generated UIDs.
3. Keep users signed in across page reloads by leveraging Firebase Auth's native session persistence in IndexedDB.

**Tech Stack:** React, TypeScript, Firebase Auth, Firestore.

---

### Task 1: Update Firebase Auth Imports and Login Logic
- **Modify:** `src/context/DataContext.tsx`

- [ ] **Step 1: Add Firebase Auth imports**
  Modify lines 33-39 in `src/context/DataContext.tsx` to import `signInWithEmailAndPassword` and `createUserWithEmailAndPassword`:
  ```diff
   import {
     signInWithPopup,
     GoogleAuthProvider,
     signOut,
-    onAuthStateChanged,
-    User as FirebaseUser
+    onAuthStateChanged,
+    User as FirebaseUser,
+    signInWithEmailAndPassword,
+    createUserWithEmailAndPassword
   } from "firebase/auth";
  ```

- [ ] **Step 2: Update `loginWithPassword` to authenticate with Firebase Auth**
  Modify the `loginWithPassword` function in `src/context/DataContext.tsx` to authenticate the user using a deterministic password derived from their email.
  ```diff
    const loginWithPassword = async (email: string, password: string) => {
      setLoading(true);
      const cleanEmail = email.trim().toLowerCase();
  
      // Check if hardcoded demo users
      let demoProfile: UserProfile | null = null;
      let demoUid = "";
      let demoDisplayName = "";
  
      if (cleanEmail === "romarichirsein@gmail.com" && password === "admin123") {
        demoUid = "superadmin_romaric";
        demoDisplayName = "Romaric Hirsein (Super Admin)";
        demoProfile = {
          id: demoUid,
          name: demoDisplayName,
          email: cleanEmail,
          role: UserRole.SUPERADMIN,
          campusId: null,
          schoolId: null,
          password: "admin123"
        };
      } else if (cleanEmail === "directrice.integral@gmail.com" && password === "lingua123") {
        demoUid = "directrice_integral";
        demoDisplayName = "Thérèse Ngono (Directrice)";
        demoProfile = {
          id: demoUid,
          name: demoDisplayName,
          email: cleanEmail,
          role: UserRole.DIRECTRICE,
          campusId: null,
          schoolId: "school_integral",
          password: "lingua123"
        };
      } else if (cleanEmail === "secretaire.demo@gmail.com" && password === "lingua123") {
        demoUid = "secretaire_demo";
        demoDisplayName = "Sarah Kiman (Secrétaire)";
        demoProfile = {
          id: demoUid,
          name: demoDisplayName,
          email: cleanEmail,
          role: UserRole.SECRETAIRE,
          campusId: "campus_01",
          schoolId: "school_demo",
          password: "lingua123"
        };
      }
  
+     let verifiedProfile: UserProfile | null = null;
+     let targetUid = "";
+ 
      if (demoProfile) {
-       const mockFUser = {
-         uid: demoUid,
-         email: cleanEmail,
-         displayName: demoDisplayName,
-         emailVerified: true,
-         isAnonymous: false,
-         providerData: []
-       } as any;
- 
-       try {
-         await setDoc(doc(db, "users", demoUid), demoProfile, { merge: true });
-       } catch (err) {
-         console.error("Failed writing demo session profile to Firestore:", err);
-       } finally {
-         setFirebaseUser(mockFUser);
-         setCurrentUser(demoProfile);
-         setLoading(false);
-       }
-       return;
+       verifiedProfile = demoProfile;
+       targetUid = demoUid;
+     } else {
+       // Otherwise, search for a matching user in Firestore
+       try {
+         const q = query(collection(db, "users"), where("email", "==", cleanEmail));
+         const snap = await getDocs(q);
+         if (snap.empty) {
+           throw new Error("Aucun compte trouvé avec cette adresse email.");
+         }
+ 
+         // Find first matching user profile doc
+         const userDoc = snap.docs[0];
+         const userData = userDoc.data() as UserProfile;
+         const storedPassword = userData.password || "lingua123";
+ 
+         if (password !== storedPassword) {
+           throw new Error("Mot de passe incorrect.");
+         }
+ 
+         verifiedProfile = userData;
+         targetUid = userDoc.id;
+       } catch (err: any) {
+         console.error("Email/Password authentication failed: ", err);
+         setLoading(false);
+         throw new Error(err.message || "Identifiants invalides.");
+       }
+     }
+ 
+     if (verifiedProfile) {
+       const authPassword = `${cleanEmail}_lingua_auth_2026`;
+       try {
+         await signInWithEmailAndPassword(auth, cleanEmail, authPassword);
+         console.log("Authenticated successfully with Firebase Auth.");
+       } catch (authErr: any) {
+         if (authErr.code === "auth/user-not-found" || authErr.code === "auth/invalid-credential" || authErr.code === "auth/wrong-password") {
+           try {
+             await createUserWithEmailAndPassword(auth, cleanEmail, authPassword);
+             console.log("Created and authenticated new Firebase Auth user dynamically.");
+           } catch (createErr: any) {
+             console.error("Failed creating Firebase Auth user dynamically:", createErr);
+           }
+         } else {
+           console.error("Firebase Auth sign-in failed:", authErr);
+         }
+       }
+ 
+       const mockFUser = {
+         uid: auth.currentUser?.uid || targetUid,
+         email: cleanEmail,
+         displayName: verifiedProfile.name,
+         emailVerified: true,
+         isAnonymous: false,
+         providerData: []
+       } as any;
+ 
+       try {
+         await setDoc(doc(db, "users", mockFUser.uid), {
+           ...verifiedProfile,
+           id: mockFUser.uid
+         }, { merge: true });
+       } catch (err) {
+         console.error("Failed writing profile to Firestore:", err);
+       } finally {
+         setFirebaseUser(mockFUser);
+         setCurrentUser({
+           ...verifiedProfile,
+           id: mockFUser.uid
+         });
+         setLoading(false);
+       }
      }
- 
-     // Otherwise, search for a matching user in Firestore
-     try {
-       const q = query(collection(db, "users"), where("email", "==", cleanEmail));
-       const snap = await getDocs(q);
-       if (snap.empty) {
-         throw new Error("Aucun compte trouvé avec cette adresse email.");
-       }
- 
-       // Find first matching user profile doc
-       const userDoc = snap.docs[0];
-       const userData = userDoc.data() as UserProfile;
-       const storedPassword = userData.password || "lingua123";
- 
-       if (password !== storedPassword) {
-         throw new Error("Mot de passe incorrect.");
-       }
- 
-       const mockUid = userDoc.id;
-       const mockFUser = {
-         uid: mockUid,
-         email: cleanEmail,
-         displayName: userData.name,
-         emailVerified: true,
-         isAnonymous: false,
-         providerData: []
-       } as any;
- 
-       setFirebaseUser(mockFUser);
-       setCurrentUser(userData);
- 
-     } catch (err: any) {
-       console.error("Email/Password authentication failed: ", err);
-       throw new Error(err.message || "Identifiants invalides.");
-     } finally {
-       setLoading(false);
-     }
    };
  ```

---

### Task 2: Generalize User Profile Migration in Auth Listener
- **Modify:** `src/context/DataContext.tsx`

- [ ] **Step 1: Update `onAuthStateChanged` profile migration cleanup**
  Modify lines 229-232 to delete the manual placeholder profile document if its ID is different from `user.uid`:
  ```diff
               // Remove the manual placeholder profile doc
-              if (matchingProfile.id.startsWith("profile_")) {
-                await deleteDoc(doc(db, "users", matchingProfile.id));
-              }
+              if (matchingProfile.id !== user.uid) {
+                await deleteDoc(doc(db, "users", matchingProfile.id));
+              }
  ```

---

### Task 3: Sync Local Switched User Profiles
- **Modify:** `src/context/DataContext.tsx`

- [ ] **Step 1: Support profile switching verification**
  Ensure the switcher updates the active profile correctly. Since the switcher operates on the logged-in Firebase user UID, no changes are needed for Firebase Auth persistence itself.

---

### Task 4: Verification and Testing
- [ ] **Step 1: Run project production build**
  Run:
  ```bash
  npm run build
  ```
  Expected: Build finishes with no errors.

- [ ] **Step 2: Commit changes**
  Run:
  ```bash
  git add src/context/DataContext.tsx
  git commit -m "fix: implement session persistence via Firebase Auth for password logins"
  ```
  Expected: Successful commit.

---

### Task 5: Push Updates to GitHub
- [ ] **Step 1: Push changes to remote repository**
  Run:
  ```bash
  git push origin main
  ```
  Expected: Success response from github.com.
