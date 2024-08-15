'use client';

import { useContext, useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { UserAuthBuilder } from "../../../context/context";
import { child, get, ref } from "firebase/database";
import { db } from "@/db/firebase";
import { UserData } from "@/helpers/types";
import Link from "next/link";

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
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && (!user || !user.isAuthenticated)) {
      router.push('/auth');
    }
  }, []);


  return (
    <div className="builder">
      {loadingUser ? <p>Loading...</p> :
        (userDB.stories.length === 0 ?
            <div>
              <h3>{user.userName}</h3>
              <p>Add new story: <Link href='/'>Map</Link></p>
            </div> :
          <div>
              <h3>Name: {user.userName}</h3>
              <p>{userDB.countStoryOfDay} Stories on Day </p>
              <div>
                {userDB.stories.map((story, index) => {
                  return (
                    <Link key={index} href={`/story?region=${story.countryId}&id=${story.link}`}>
                      <h3>{story.nameStory}</h3>
                      <p>{story.id}</p>
                      {story.imageUrl && <img
                        src={story.imageUrl}
                        alt={story.nameStory} width="600"
                        height="400"
                      />}
                    </Link>
                  )
                })}
              </div>
          </div>
      )}
    </div>
  );
};
