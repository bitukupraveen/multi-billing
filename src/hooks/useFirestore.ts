import { useState, useEffect } from 'react';
import {
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    QueryConstraint
} from 'firebase/firestore';
import { db } from '../firebase/config';

export function useFirestore<T extends { id?: string }>(collectionName: string, queryConstraints: QueryConstraint[] = []) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Real-time subscription
    useEffect(() => {
        setLoading(true);
        const collectionRef = collection(db, collectionName);
        const q = query(collectionRef, ...queryConstraints);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const results: T[] = [];
            snapshot.docs.forEach(doc => {
                results.push({ ...doc.data(), id: doc.id } as T);
            });
            setData(results);
            setLoading(false);
        }, (err) => {
            console.error(err);
            setError(err.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [collectionName]);

    const add = async (docData: Omit<T, 'id'>) => {
        try {
            await addDoc(collection(db, collectionName), docData);
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const update = async (id: string, docData: Partial<T>) => {
        try {
            const docRef = doc(db, collectionName, id);
            await updateDoc(docRef, docData);
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const remove = async (id: string) => {
        try {
            const docRef = doc(db, collectionName, id);
            await deleteDoc(docRef);
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    return { data, loading, error, add, update, remove };
}
