import React from "react";
import Image from "next/image";
import styles from "./Story.module.css";
import { StoryData } from "@/helpers/types";

interface StoryPreviewProps {
  storyData: StoryData;
}

const StoryPreview: React.FC<StoryPreviewProps> = ({ storyData }) => {
  if (!storyData) return null;

  const paragraphs = storyData.paragraphs || [];

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
        <div className={styles.titleBlock}>
          <h1 className={styles.storyTitle}>{storyData.title}</h1>
          <div className={styles.titleDivider}>
            <div className={styles.titleDividerLine} />
            <div className={styles.titleDividerDot} />
            <div className={styles.titleDividerLine} />
          </div>
        </div>

        <div className={styles.statsBar}>
          <span className={styles.statItem}>Preview</span>
        </div>

        <div className={styles.storyBody}>
          {paragraphs.map((p, i) => (
            <React.Fragment key={i}>
              <p className={styles.paragraph}>{p.paragraph}</p>
              {(i + 1) % 5 === 0 && i !== paragraphs.length - 1 && (
                <div className={styles.paragraphSep} aria-hidden="true">
                  ✦ ✦ ✦
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className={styles.bottomActions}>
          <button
            className={styles.likeBtnLarge}
            aria-label="Like this tale"
            disabled
          >
            Like this tale <span className={styles.likeCount}>0</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoryPreview;
