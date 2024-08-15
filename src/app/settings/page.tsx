'use client';

import { useContext, useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { UserAuthBuilder } from "../../../context/context";
import { child, get, ref } from "firebase/database";
import { db } from "@/db/firebase";
import { UserData } from "@/helpers/types";

export default function Page() {
  const tasksRef = ref(db);
  const { user } = useContext(UserAuthBuilder);
  const router = useRouter();

  const [userDB, setUserDB] = useState<UserData>({
    userName: '',
    countStoryOfDay: 3,
    expiryTime: 0,
    stories: []
  });
  const [loadingUser, setLoadingUser] = useState<boolean>(false);
  console.log(userDB, user)

  useEffect(() => {
    const getUserData = async () => {
      if (!user || !user.userId) return;

      setLoadingUser(true);
      try {
        const snapshot = await get(child(tasksRef, `users/${user.userId}`));
        if (snapshot.exists()) {
          setUserDB(snapshot.val());
        } else {
          console.log('No data available');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingUser(false);
      }
    };

    if (typeof window !== 'undefined') {
      getUserData().catch(console.error);
    }
  }, [user, tasksRef]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (!user || !user.isAuthenticated)) {
      router.push('/auth');
    }
  }, [user, router]);

  return (
    <div className="builder">
      {loadingUser ? <p>Loading...</p> :
        (
          <div>
              <h3>{userDB.userName}</h3>
              <p>{userDB.countStoryOfDay}</p>
              <div>
                {userDB.stories.map((story, index) => {
                  return (
                    <div key={index}>
                      <p>{story.id}</p>
                    </div>
                  )
                })}
              </div>
          </div>
      )}
    </div>
  );
};
