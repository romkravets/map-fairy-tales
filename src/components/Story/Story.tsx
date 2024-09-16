"use client"
import {useEffect, useState} from 'react';
import { ref, get } from 'firebase/database';
import { useSearchParams } from 'next/navigation';
import {db} from '@/db/firebase';
import Image from "next/image";
import Preloader from "@/components/Preloader/Preloader";
import BtnBack from "@/components/BtnBack/BtnBack";

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
      <h1>{story.story.title}</h1>
      <Image
        src={story.story.imageUrl}
        alt={story.story.title}
        width={400}
        height={400}
      />
      {story.story.paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph.paragraph}</p>
      ))}
    </div>
  );
}
