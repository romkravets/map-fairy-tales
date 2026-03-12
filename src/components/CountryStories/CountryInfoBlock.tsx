// CountryInfoBlock.snippet.tsx
// Заміна для блоку з countryMap.info у CountryStories.tsx

import { useCountryInfo } from "@/helpers/useCountryInfo";
import Preloader from "@/components/Preloader/Preloader";
import styles from "./CountryStories.module.css";

// ── У компоненті CountryStories додай: ────────────────
// const { info, loading } = useCountryInfo(region);
// і заміни старий блок на цей:

function CountryInfoBlock({ region }: { region: string }) {
  const { info, loading } = useCountryInfo(region);

  if (loading) return <Preloader />;
  if (!info)
    return (
      <p className={styles.emptyState}>
        No information found for this country.
      </p>
    );

  const fields = [
    { label: "Capital City", value: info.capitalCity },
    { label: "Location & Size", value: info.locationAndSize },
    { label: "Language", value: info.language },
    { label: "Culture & Traditions", value: info.cultureAndTraditions },
    { label: "Nature & Wildlife", value: info.natureAndWildlife },
    { label: "Friendly People", value: info.friendlyPeople },
  ];

  return (
    <>
      {/* Info grid */}
      <div
        className={styles.infoCard}
        role="region"
        aria-label="Country information"
      >
        {fields.map(({ label, value }) => (
          <div key={label} className={styles.infoRow}>
            <span className={styles.infoLabel}>{label}</span>
            <span className={styles.infoValue}>{value}</span>
          </div>
        ))}
      </div>

      {/* Media: photos */}
      {info.media.photos.some((p) => p.url) && (
        <div className={styles.mediaRow}>
          {info.media.photos
            .filter((p) => p.url)
            .map((photo, i) => (
              <div key={i} className={styles.mediaPhoto}>
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className={styles.mediaImg}
                />
                <span className={styles.mediaCaption}>{photo.caption}</span>
              </div>
            ))}
        </div>
      )}

      {/* Media: videos */}
      {info.media.videos.some((v) => v.url) && (
        <div className={styles.mediaVideos}>
          {info.media.videos
            .filter((v) => v.url)
            .map((video, i) => (
              <a
                key={i}
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.videoLink}
                aria-label={`Watch video: ${video.title}`}
              >
                <span aria-hidden="true">▶</span> {video.title}
              </a>
            ))}
        </div>
      )}
    </>
  );
}

export default CountryInfoBlock;
