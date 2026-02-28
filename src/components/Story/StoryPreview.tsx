import React from "react";
import Image from "next/image";
import styles from "./Story.module.css";
import { StoryData } from "@/helpers/types";

interface StoryPreviewProps {
  storyData: StoryData;
}

const StoryPreview: React.FC<StoryPreviewProps> = ({ storyData }) => {
  if (!storyData) return null;
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        {storyData.imageUrl && (
          <Image
            src={storyData.imageUrl}
            alt={storyData.title}
            className={styles.heroImg}
            width={800}
            height={400}
            style={{ objectFit: "cover" }}
            priority
          />
        )}
        <div className={styles.heroOverlay} />
      </div>
      <div className={styles.content}>
        <h1 className={styles.storyTitle}>{storyData.title}</h1>
        <div className={styles.storyBody}>
          {storyData.paragraphs?.map((p, i) => (
            <p key={i}>{p.paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StoryPreview;
