"use client"
import {useState, useEffect} from 'react'
import Link from "next/link"
import { db } from '@/db/firebase';
import {ref, get} from "firebase/database";
import PrimaryLayout from "@/layout/PrimaryLayout/PrimaryLayout";

export default function Home() {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dbRef = ref(db, '/maps');
        const snapshot = await get(dbRef);
        if (snapshot.exists()) {
          const fetchedData = snapshot.val();
          const dataArray = Object.values(fetchedData);
          setData(dataArray);
          console.log(dataArray, 'dataArray')
        } else {
          setError('No data available');
        }
      } catch (error) {
        setError('Error reading data');
        console.error('Error reading data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <PrimaryLayout>
      {data.length > 0 ? (
        <ul>
          {data.map((item: any) => (
            <div key={item.id}>
            <Link href={`/${item.id}`}>{item.title}</Link>
            </div>
          ))}
        </ul>
      ) : (
        <p>No items found</p>
      )}
    </PrimaryLayout>
  )
}
