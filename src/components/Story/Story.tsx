"use client"
import {useEffect, useState} from 'react';
import { ref, get } from 'firebase/database';
import { useSearchParams } from 'next/navigation';
import {db} from '@/db/firebase';
import Preloader from "@/components/Preloader/Preloader";
import BtnBack from "@/components/BtnBack/BtnBack";
import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";

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
  like: number;
  status: boolean;
}

export default function Story() {
  const searchParams = useSearchParams();
  const region = searchParams?.get('region') ?? '';
  const id = searchParams?.get('id') ?? '';

  const [story, setStory] = useState<Story | null>(null);

  useEffect(() => {
    if (region && id) {
      const storyRef = ref(db, `maps/${region}/stories`);

      get(storyRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const stories = snapshot.val();

            if (Array.isArray(stories)) {
              const foundStory = stories.find((story: Story) => story.id === id);
              if (foundStory) {
                setStory(foundStory);
              } else {
                console.error("Story not found");
              }
            } else {
              console.error("Stories data is not an array");
            }
          } else {
            console.error("No stories available for this region");
          }
        })
        .catch((error) => {
          console.error("Error fetching story:", error);
        });
    }
  }, [region, id]);

  if (!story) {
    return <Preloader/>
  }

  return (
    <div className="story">
      <BtnBack linkUrl="back"/>
      <CardMedia
        sx={{height: '560px', width: '50%'}}
        image={story.story.imageUrl}
        alt={story.story.title}
        style={{marginBottom: '20px'}}
      />
      <Typography
        style={{marginBottom: '20px'}}
        gutterBottom variant="h2"
        component="div">
        {story.story.title}
      </Typography>
      <CardContent>
        {story.story.paragraphs.map((paragraph, index) => (
          <Typography
            style={{paddingBottom: 15}}
            gutterBottom
            variant="h3"
            component="div"
            key={index}
          >
            {paragraph.paragraph}
          </Typography>
        ))}
      </CardContent>
    </div>
  );
}
