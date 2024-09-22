"use client"
import {useContext, useEffect, useState} from 'react';
import { ref, get, update } from 'firebase/database';
import {useRouter, useSearchParams} from 'next/navigation';
import {db} from '@/db/firebase';
import Preloader from "@/components/Preloader/Preloader";
import BtnBack from "@/components/BtnBack/BtnBack";
import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import {UserAuthBuilder} from "../../../context/context";
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import { ToastContainer } from "react-toastify"
import { notifyApp } from "@/src/helpers/notifications/notifications"
import {showNotification} from "@/helpers/showNotification";

interface Story {
  id: string;
  userId: string;
  regionId: string;
  story: {
    title: string;
    imageUrl: string;
    paragraphs: Array<{ paragraph: string }>;
  };
  region: string;
  likes?: { [key: string]: boolean };
  status: boolean;
  viewCount: number;
}

export default function Story() {
  const searchParams = useSearchParams();
  const region = searchParams?.get('region') ?? '';
  const id = searchParams?.get('id') ?? '';
  const { user } = useContext(UserAuthBuilder);
  const router = useRouter();

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [story, setStory] = useState<Story | null>(null);

  useEffect(() => {
    const fetchAndUpdateStory = async () => {
      if (!region || !id) return;

      try {
        const storyRef = ref(db, `maps/${region}/stories`);
        const snapshot = await get(storyRef);

        if (snapshot.exists()) {
          const stories = snapshot.val();

          if (Array.isArray(stories)) {
            const foundStoryIndex = stories.findIndex((story) => story.id === id);

            if (foundStoryIndex !== -1) {
              const foundStory = stories[foundStoryIndex];
              const updatedStory = {
                ...foundStory,
                viewCount: (foundStory.viewCount || 0) + 1,
              };

              setStory(updatedStory);
              setLikeCount(Object.keys(updatedStory.likes || {}).length);
              setLiked(!!updatedStory.likes?.[user.userId]);

              stories[foundStoryIndex] = updatedStory;

              await update(ref(db, `maps/${region}`), { stories });

              console.log('Story view count incremented successfully.');
            } else {
              console.error('Story not found in the list.');
            }
          } else {
            console.error('Stories data is not an array.');
          }
        } else {
          console.error('No stories available for this region.');
        }
      } catch (error) {
        console.error('Error fetching story:', error);
      }
    };

    fetchAndUpdateStory().catch(() => console.log('fetchAndUpdateStory'));
  }, [region, id, user.userId]);

  const handleLike = async () => {
    if (!user.userId && !user.isAuthenticated) {
      showNotification('SignIn of like story', 'success')
    }
    if (!story || !region || !id) return;

    try {
      const storyRef = ref(db, `maps/${region}/stories`);
      const snapshot = await get(storyRef);

      if (snapshot.exists()) {
        const stories = snapshot.val();

        if (Array.isArray(stories)) {
          const foundStoryIndex = stories.findIndex((s) => s.id === id);

          if (foundStoryIndex !== -1) {
            let updatedStory;

            if (liked) {
              const { [user.userId]: removedLike, ...remainingLikes } = stories[foundStoryIndex].likes || {};
              updatedStory = {
                ...stories[foundStoryIndex],
                likes: remainingLikes,
              };

              setLiked(false);
              setLikeCount(Object.keys(remainingLikes).length);
              console.log('Story unliked successfully.');
            } else {
              updatedStory = {
                ...stories[foundStoryIndex],
                likes: {
                  ...(stories[foundStoryIndex].likes || {}),
                  [user.userId]: true,
                },
              };

              setLiked(true);
              setLikeCount(Object.keys(updatedStory.likes).length);
              console.log('Story liked successfully.');
            }

            stories[foundStoryIndex] = updatedStory;
            await update(ref(db, `maps/${region}`), { stories });

          }
        }
      }
    } catch (error) {
      console.error('Error liking the story:', error);
    }
  };

  if (!story) {
    return <Preloader />;
  }

  return (
    <div>
    <div className="story-container">
      <div className="story-navigation" style={{display: 'flex', alignItems: 'center', justifyContent: "space-between"}}>
        <BtnBack linkUrl="back" />
        <div style={{display: 'flex', justifyContent: "space-between", width: '60%', alignItems: "center"}}>
          <p className="statistic">{story.region}</p>
          <h4 className="statistic">
            {story.story.title}
          </h4>
          <div
            className="statistic"
            style={{ display: 'flex', alignItems: "center"}}
          >
            <RemoveRedEyeIcon/> {story.viewCount}
          </div>
          <div
            className="statistic"
            onClick={handleLike}
            style={{cursor: 'pointer', display: 'flex', alignItems: "center"}}
          >
            {liked ? <FavoriteIcon  color={'primary'}/> : <FavoriteBorderIcon/>} {likeCount}
          </div>
        </div>
      </div>

      <div className="story-header">
        <CardMedia
          className="story-image"
          sx={{ height: '560px', width: '100%' }}
          image={story.story.imageUrl}
        />
        <Typography className="story-title" gutterBottom variant="h2" component="h2">
          {story.story.title}
        </Typography>
        <p className="view-count">Count view: {story.viewCount}</p>
      </div>
      <CardContent className="story-content">
        {story.story.paragraphs.map((paragraph, index) => (
          <Typography
            className="story-paragraph"
            gutterBottom
            variant="body1"
            component="p"
            key={index}
          >
            {paragraph.paragraph}
          </Typography>
        ))}
      </CardContent>
      <div
        onClick={handleLike}
        style={{cursor: 'pointer', display: 'flex', alignItems: "center"}}
      >
        {liked ? <FavoriteIcon  color={'primary'}/> : <FavoriteBorderIcon/>} {likeCount}
      </div>
    </div>
      <ToastContainer/>
    </div>
  );
}
