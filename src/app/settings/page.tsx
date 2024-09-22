'use client';

import {useContext, useEffect, useState} from "react";
import {useRouter} from 'next/navigation';
import {UserAuthBuilder} from "../../../context/context";
import {child, get, ref as dbRef, update} from "firebase/database";
import {db} from "@/db/firebase";
import {UserData} from "@/helpers/types";
import Link from "next/link";
import {getStorage, ref as storageRef, deleteObject} from "firebase/storage";
import {ToastContainer} from "react-toastify";
import {showNotification} from "@/helpers/showNotification";
import {useCountdown} from "@/helpers/useCountdown";
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import Preloader from "@/components/Preloader/Preloader";
import Box from '@mui/material/Box';
import BtnBack from "../../components/BtnBack/BtnBack"
import DeleteIcon from '@mui/icons-material/Delete';
import AutoDeleteIcon from '@mui/icons-material/AutoDelete';

export default function Page() {
  const tasksRef = dbRef(db);
  const {user} = useContext(UserAuthBuilder);
  const router = useRouter();

  const [userDB, setUserDB] = useState<UserData>({
    userName: '',
    countStoryOfDay: 0,
    expiryTime: 0,
    stories: [] || undefined,
  })


  console.log(userDB, 'userDB')
  const [loadingUser, setLoadingUser] = useState<boolean>(false);
  const [deleteStoryMap, setDeleteStoryMap] = useState<Record<string, boolean>>({});

  const getUserData = async () => {
    if (!user || !user.userId) return;
    setLoadingUser(true);

    try {
      const snapshot = await get(child(tasksRef, `users/${user.userId}`));
      if (snapshot.exists()) {
        setUserDB(snapshot.val());
        if (userDB.countStoryOfDay <= 2 && !userDB.expiryTime) {
          const newCountStoryOfDay = 3;
          await update(dbRef(db, `users/${user.userId}`), {
            countStoryOfDay: newCountStoryOfDay,
          });
        }
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
  }, []);

  const handleDeleteStory = async (storyId: string | undefined, userId: string | undefined, countryId: string | undefined) => {
    if (!storyId || !userId || !countryId) return;
    setDeleteStoryMap((prev) => ({...prev, [storyId]: true}));

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
      await update(dbRef(db, `maps/${countryId}`), {stories: updatedStories.length ? updatedStories : []});

      const updatedUserStories = userData.filter((story: any) => story.id !== storyId);
      await update(dbRef(db, `users/${userId}`), {stories: updatedUserStories.length ? updatedUserStories : []});

      const imageRef = storageRef(storage, `stories/${userId}/${countryId}/${storyId}/${storyId}.jpg`);
      await deleteObject(imageRef);

      getUserData().catch(console.error);
      showNotification('Delete', 'success');
      console.log('Story and image successfully deleted');
    } catch (error) {
      console.error('Error deleting story and image:', error);
    } finally {
      setDeleteStoryMap((prev) => ({...prev, [storyId]: false}));
    }
  };

  const {hours, minutes, seconds} = useCountdown(userDB.expiryTime, userDB.stories, getUserData);

  if (loadingUser) return <Preloader/>

  return (
    <div className="settings">
      <div className="settings-container">
        <BtnBack linkUrl="/"/>
        <h1 style={{marginBottom: 30}}>Settings</h1>
        {!user || !user.isAuthenticated ? (
          <Box sx={{display: 'flex'}} style={{
            display: 'flex', flexDirection: 'column', width: '100%',
            height: '100vh', alignItems: 'center', justifyContent: 'center'
          }}>
            <Preloader/>
          </Box>
        ) : (!userDB.stories || userDB.stories.length === 0) ? (
          <div>
            User name: <h3>{user?.userName}</h3>
            <Box sx={{display: 'flex'}} style={{
              display: 'flex', flexDirection: 'column', width: '100%',
              height: '50vh', alignItems: 'center', justifyContent: 'center'
            }}>
              <p>No stories available.<br/> Create you story:
                <Link href='/'><h2>Go to World Map</h2></Link>
              </p>
            </Box>
          </div>
        ) : (
          <div>
            <h3 style={{marginBottom: 30}}>Name: {user?.userName}</h3>
            <p style={{marginBottom: 30}}>Create Story: <Button variant="contained" onClick={() => router.push('/')}>Go
              to World Map</Button></p>
            {userDB.countStoryOfDay === 0 ?
              (
                <div>
                  <p>New stories: {hours}h {minutes}m {seconds}s</p>
                </div>
              ) : <p>{userDB.countStoryOfDay} Stories today</p>}
            <Grid
              container
              style={{marginTop: 20}}
            >
              {userDB.stories.length > 0 && (
                userDB.stories.map((story, index) => {
                  console.log(story, 'story')
                  return (
                    <Grid size={4} key={index}>
                      <Card sx={{maxWidth: 245}} style={{marginBottom: 20}}>
                        <Link href={`/story?region=${story.countryId}&id=${story.link}`} passHref>
                          {story.imageUrl && (
                            <CardMedia
                              sx={{height: 275}}
                              image={story.imageUrl}
                              className="settings-image-banner"
                            />
                          )}
                          <CardContent style={{padding: 10}}>
                            <Typography gutterBottom variant="h3" component="div">
                              {story.nameStory}
                            </Typography>
                          </CardContent>
                        </Link>
                        <CardActions style={{padding: 10, justifyContent: 'end'}}>
                          <Button
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStory(story.id, user?.userId, story.countryId);
                            }}
                          >
                            {deleteStoryMap[story.id] ? <AutoDeleteIcon style={{fontSize: 20, color: 'grey'}}/> :
                              <DeleteIcon style={{fontSize: 20, color: 'grey'}}/>}
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  )
                })
              )}
            </Grid>
          </div>
        )}
        <ToastContainer/>
      </div>
    </div>
  );
}
