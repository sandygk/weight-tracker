import {
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
  browserLocalPersistence,
  setPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './firebase';

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<{ user: User; isNewUser: boolean }> {
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithPopup(auth, googleProvider);
  return { user: result.user, isNewUser: getAdditionalUserInfo(result)?.isNewUser ?? false };
}

export async function signUpWithEmail(email: string, password: string): Promise<User> {
  await setPersistence(auth, browserLocalPersistence);
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  return user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  await setPersistence(auth, browserLocalPersistence);
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function onAuthChange(cb: (user: User | null) => void): () => void {
  if (!auth) { cb(null); return () => {}; }
  return onAuthStateChanged(auth, cb);
}

export type { User };
