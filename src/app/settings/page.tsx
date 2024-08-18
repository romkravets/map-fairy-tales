'use client';

import { useContext, useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { UserAuthBuilder } from "../../../context/context";
import { child, get, ref as dbRef, update } from "firebase/database";
import { db } from "@/db/firebase";
import { UserData } from "@/helpers/types";
import Link from "next/link";
import { getStorage, ref as storageRef, deleteObject } from "firebase/storage";
import { ToastContainer } from "react-toastify";
import { showNotification } from "@/helpers/showNotification";

export default function Page() {
  const tasksRef = dbRef(db);
  const { user } = useContext(UserAuthBuilder);
  const router = useRouter();

  const [userDB, setUserDB] = useState<UserData>({
    userName: '',
    countStoryOfDay: 3,
    expiryTime: 0,
    stories: []
  });
  const [loadingUser, setLoadingUser] = useState<boolean>(false);
  const [deleteStory, setDeleteStory] = useState<boolean>(false);


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
      setLoadingUser(false);
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      getUserData().catch(console.error);
    }
  }, [user]);

  // useEffect(() => {
  //   if (!user || !user.isAuthenticated) {
  //     router.push('/auth');
  //   }
  // }, []);

  const handleDeleteStory = async (storyId: string | undefined , userId: string | undefined, countryId: string | undefined) => {
    if (!storyId || !userId || !countryId) return;
    setDeleteStory(true);

    const storage = getStorage();
    const storyPath = `maps/${countryId}/stories`;
    const userPath = `users/${userId}/stories`;

    try {
      const storySnapshot = await get(dbRef(db, storyPath));
      const userSnapshot = await get(dbRef(db, userPath));

      if (!storySnapshot.exists() || !userSnapshot.exists()) {
        console.error("Story or User data does not exist.");
        return;
      }

      const storyData = storySnapshot.val();
      const userData = userSnapshot.val();

      const updatedStories = storyData.filter((story: any) => story.id !== storyId);
      await update(dbRef(db, `maps/${countryId}`), { stories: updatedStories.length ? updatedStories : [] });

      const updatedUserStories = userData.filter((story: any) => story.id !== storyId);
      await update(dbRef(db, `users/${userId}`), { stories: updatedUserStories.length ? updatedUserStories : [] });

      const imageRef = storageRef(storage, `stories/${userId}/${countryId}/${storyId}/${storyId}.jpg`);
      await deleteObject(imageRef);

      getUserData().catch(console.error);
      showNotification('Delete', 'success');
      console.log('Story and image successfully deleted');
    } catch (error) {
      console.error('Error deleting story and image:', error);
    } finally {
      setDeleteStory(false);
    }
  };
  if (loadingUser) return <p>Loading...</p>;

  return (
    <div className="builder">
      {!user || !user.isAuthenticated ? (
        <div>
          <p>Please log in to view your stories.</p>
        </div>
      ) : (!userDB.stories || userDB.stories.length === 0) ? (
        <div>
          <h3>{user?.userName}</h3>
          <p>No stories available. Add a new story: <Link href='/'>Map</Link></p>
        </div>
      ) : (
        <div>
          <h3>Name: {user?.userName}</h3>
          <p>{userDB.countStoryOfDay} Stories today</p>
          <div>
            {userDB.stories.map((story, index) => (
              <div key={index}>
                <Link href={`/story?region=${story.countryId}&id=${story.link}`}>
                  <h3>{story.nameStory}</h3>
                  <p>{story.id}</p>
                  {story.imageUrl && (
                    <img
                      src={story.imageUrl}
                      alt={story.nameStory}
                      width="600"
                      height="400"
                    />
                  )}
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteStory(story.id, user?.userId, story.countryId);
                  }}
                >
                  {deleteStory ? 'Deleting...' : 'Delete Story'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}
