"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useContext, ChangeEvent } from "react";
import { child, get, ref, set, ref as dbRef } from "firebase/database";
import { db } from "@/db/firebase";
import Login from "@/components/Auth/Login/Login";
import { showNotification } from "@/helpers/showNotification";
import { ToastContainer } from "react-toastify";
import { v4 as uuid } from "uuid";
import {
  CountryInfo,
  CountryStoryItem,
  StoryData,
  UserData,
} from "@/helpers/types";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import Select from "react-select";
import { UserAuthBuilder } from "../../../context/context";
import { useCountdown } from "@/helpers/useCountdown";
import Preloader from "@/components/Preloader/Preloader";
import Link from "next/link";
import BtnBack from "@/components/BtnBack/BtnBack";
import TextField from "@mui/material/TextField";
import Image from "next/image";
import styles from "./CountryStories.module.css";

interface CustomValueForStory {
  team: string;
  heroes: string;
  events: string;
}

const userInitialData = {
  userName: "",
  countStoryOfDay: 3,
  expiryTime: 0,
  stories: [],
};

const selectStyles = {
  control: (base: object) => ({
    ...base,
    background: "rgba(10, 25, 60, 0.5)",
    borderColor: "rgba(80, 140, 210, 0.3)",
    borderRadius: 8,
    boxShadow: "none",
    fontFamily: "'Crimson Pro', serif",
    fontSize: 15,
    color: "#c8dff5",
    "&:hover": { borderColor: "rgba(100, 170, 255, 0.5)" },
  }),
  menu: (base: object) => ({
    ...base,
    background: "#0a1830",
    border: "1px solid rgba(80,140,210,0.25)",
    borderRadius: 8,
  }),
  option: (base: object, state: { isFocused: boolean }) => ({
    ...base,
    background: state.isFocused ? "rgba(30,70,140,0.5)" : "transparent",
    color: "#b8d4f0",
    fontFamily: "'Crimson Pro', serif",
    fontSize: 15,
    cursor: "pointer",
  }),
  singleValue: (base: object) => ({ ...base, color: "#c8dff5" }),
  placeholder: (base: object) => ({ ...base, color: "rgba(100,150,200,0.5)" }),
  input: (base: object) => ({ ...base, color: "#c8dff5" }),
};

export default function CountryStories() {
  const searchParams = useSearchParams();
  const region = searchParams?.get("region") ?? "";
  const id = searchParams?.get("id") ?? "";
  const tasksRef = ref(db);
  const { user } = useContext(UserAuthBuilder);

  const [storyCreated, setCreatedStory] = useState<StoryData | null>(null);
  const [isLoadingStory, setIsLoadingStory] = useState(false);
  const [isLoadingSaveToDB, setIsLoadingSaveToDB] = useState(false);
  const [countryMap, setCountryMap] = useState<{
    info: CountryInfo | null;
    stories: CountryStoryItem[];
  }>({ info: null, stories: [] });
  const [loadingCountryMap, setLoadingCountryMap] = useState(true);
  const [selectedValue, setSelectedValue] = useState("random");
  const [customValueForStory, setCustomValueForStory] =
    useState<CustomValueForStory>({ team: "", heroes: "", events: "" });
  const [userData, setUserData] = useState<UserData>(userInitialData);

  const options = [
    { value: "jungle", label: "Jungle" },
    { value: "travel", label: "Travel" },
    { value: "superheroes", label: "Superheroes" },
  ];

  const getUserData = async () => {
    try {
      const snapshot = await get(child(tasksRef, `users/${user.userId}`));
      if (snapshot.exists()) setUserData(snapshot.val());
    } catch (error) {
      console.error(error);
    }
  };

  const getCountryStories = async () => {
    try {
      const snapshot = await get(child(tasksRef, `maps/${id}`));
      if (snapshot.exists()) setCountryMap(snapshot.val());
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCountryMap(false);
    }
  };

  const createAIStory = async () => {
    setIsLoadingStory(true);
    if (!region) return;
    try {
      const response = await fetch("/api/openai", {
        body: JSON.stringify({ region, customValueForStory }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) return;
      setCreatedStory(await response.json());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingStory(false);
      setCustomValueForStory({ team: "", heroes: "", events: "" });
      setSelectedValue("random");
    }
  };

  const setStoryToDB = async () => {
    if (!storyCreated || !user?.userId || !id) return;
    const newStoryId = uuid();
    const storage = getStorage();
    try {
      setIsLoadingSaveToDB(true);
      const blob = await (await fetch(storyCreated.imageUrl)).blob();
      const snap = await uploadBytes(
        storageRef(
          storage,
          `stories/${user.userId}/${id}/${newStoryId}/${newStoryId}.jpg`,
        ),
        blob,
      );
      const imageDownloadUrl = await getDownloadURL(snap.ref);

      const newStory = {
        id: newStoryId,
        userId: user.userId,
        regionId: id,
        story: { ...storyCreated, imageUrl: imageDownloadUrl },
        region,
        like: 0,
        status: false,
        viewCount: 0,
      };
      const updatedStories = [...(countryMap.stories || []), newStory];

      if (newStory.id && newStory.story.title) {
        const updatedUserStories = [
          ...(userData.stories || []),
          {
            id: newStoryId,
            nameStory: storyCreated.title,
            link: newStoryId,
            imageUrl: imageDownloadUrl,
            countryId: id,
          },
        ];
        const newCount =
          userData.countStoryOfDay > 0 ? userData.countStoryOfDay - 1 : 0;
        await set(dbRef(db, `users/${user.userId}`), {
          userName: user.userName,
          countStoryOfDay: newCount,
          expiryTime:
            newCount === 0
              ? new Date(Date.now() + 24 * 60 * 60 * 1000).getTime()
              : null,
          stories: updatedUserStories,
        });
      }
      await set(dbRef(db, `maps/${id}`), {
        ...countryMap,
        stories: updatedStories,
      });
      showNotification("Saved in DB", "success");
      setCreatedStory(null);
      await getCountryStories();
    } catch (error) {
      console.error(error);
      showNotification("Error saving story", "error");
    } finally {
      setIsLoadingSaveToDB(false);
    }
  };

  const { hours, minutes, seconds } = useCountdown(
    userData.expiryTime,
    userData.stories,
  );

  useEffect(() => {
    if (id && typeof window !== "undefined") {
      getCountryStories().catch(console.error);
      if (user?.userId) getUserData().catch(console.error);
    }
  }, [id, user]);

  return (
    <div className={styles.page}>
      <BtnBack linkUrl="/" />

      {/* ── Country title ── */}
      <h1 className={styles.pageTitle}>{region}</h1>

      {/* ── Country info ── */}
      {!loadingCountryMap ? (
        countryMap.info ? (
          <div className={styles.infoCard}>
            {[
              { label: "Capital City", value: countryMap.info.capitalCity },
              {
                label: "Location & Size",
                value: countryMap.info.locationAndSize,
              },
              { label: "Language", value: countryMap.info.language },
              {
                label: "Culture & Traditions",
                value: countryMap.info.cultureAndTraditions,
              },
              {
                label: "Nature & Wildlife",
                value: countryMap.info.natureAndWildlife,
              },
              {
                label: "Friendly People",
                value: countryMap.info.friendlyPeople,
              },
            ].map(({ label, value }) => (
              <div key={label} className={styles.infoRow}>
                <span className={styles.infoLabel}>{label}</span>
                <span className={styles.infoValue}>
                  {value || "Information not available"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>
            No information found for this country.
          </p>
        )
      ) : (
        <Preloader />
      )}

      {/* ── Stories grid ── */}
      {countryMap.stories?.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Stories</h2>
          <div className={styles.storiesGrid}>
            {countryMap.stories.map((item, index) => (
              <Link
                key={index}
                href={`/story?region=${item.regionId}&id=${item.id}`}
                className={styles.storyCard}
              >
                {item.story.imageUrl && (
                  <img
                    src={item.story.imageUrl}
                    alt={item.story.title}
                    className={styles.storyCardImage}
                  />
                )}
                <div className={styles.storyCardBody}>
                  <div className={styles.storyCardTitle}>
                    {item.story.title}
                  </div>
                  {item.story.paragraphs?.[0] && (
                    <div className={styles.storyCardExcerpt}>
                      {item.story.paragraphs[0].paragraph}
                    </div>
                  )}
                  <div className={styles.storyCardMeta}>
                    👁 {item.viewCount} views
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* ── Create story panel ── */}
      <div className={styles.createPanel}>
        <div className={styles.createPanelHeader}>
          <h2 className={styles.createTitle}>✦ Create a Story</h2>
          {!user?.userId && !user?.isAuthenticated && (
            <div className={styles.authGate}>
              <span className={styles.authGateText}>
                Sign in to create stories
              </span>
              <Login />
            </div>
          )}
        </div>

        {user?.userId && user?.isAuthenticated && (
          <>
            {/* Radio: Random / Custom */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.fieldsetLegend}>Story type</legend>
              <div className={styles.radioGroup}>
                {["random", "custom"].map((val) => (
                  <label key={val} className={styles.radioLabel}>
                    <input
                      type="radio"
                      className={styles.radioInput}
                      value={val}
                      checked={selectedValue === val}
                      onChange={() => setSelectedValue(val)}
                    />
                    {val.charAt(0).toUpperCase() + val.slice(1)}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Custom inputs */}
            {selectedValue === "custom" && (
              <div className={styles.customSection}>
                <p className={styles.customSectionTitle}>
                  Choose story details
                </p>
                <Select
                  name="team"
                  styles={selectStyles}
                  options={options}
                  placeholder="Theme..."
                  value={
                    options.find((o) => o.value === customValueForStory.team) ||
                    null
                  }
                  onChange={(e) =>
                    setCustomValueForStory({
                      ...customValueForStory,
                      team: e ? e.value : "",
                    })
                  }
                />
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Hero name"
                  value={customValueForStory.heroes}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCustomValueForStory({
                      ...customValueForStory,
                      heroes: e.target.value,
                    })
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      background: "rgba(10,25,60,0.5)",
                      borderRadius: "8px",
                      fontFamily: "'Crimson Pro', serif",
                      fontSize: "15px",
                      color: "#c8dff5",
                      "& fieldset": { borderColor: "rgba(80,140,210,0.3)" },
                      "&:hover fieldset": {
                        borderColor: "rgba(100,170,255,0.5)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "rgba(100,180,255,0.7)",
                      },
                    },
                    "& input::placeholder": { color: "rgba(100,150,200,0.5)" },
                  }}
                />
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Key event in the story"
                  value={customValueForStory.events}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCustomValueForStory({
                      ...customValueForStory,
                      events: e.target.value,
                    })
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      background: "rgba(10,25,60,0.5)",
                      borderRadius: "8px",
                      fontFamily: "'Crimson Pro', serif",
                      fontSize: "15px",
                      color: "#c8dff5",
                      "& fieldset": { borderColor: "rgba(80,140,210,0.3)" },
                      "&:hover fieldset": {
                        borderColor: "rgba(100,170,255,0.5)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "rgba(100,180,255,0.7)",
                      },
                    },
                    "& input::placeholder": { color: "rgba(100,150,200,0.5)" },
                  }}
                />
              </div>
            )}

            {/* Generate / Limit */}
            {userData.countStoryOfDay > 0 ? (
              <button
                className={styles.btnPrimary}
                onClick={createAIStory}
                disabled={isLoadingStory}
              >
                {isLoadingStory ? "✦ Generating…" : "✦ Generate Story"}
              </button>
            ) : (
              <div className={styles.limitBox}>
                <span className={styles.limitText}>Daily limit reached</span>
                <span className={styles.countdown}>
                  {hours}h {minutes}m {seconds}s
                </span>
              </div>
            )}

            {/* Story preview */}
            {storyCreated && (
              <div className={styles.storyPreview}>
                {storyCreated.imageUrl && (
                  <img
                    src={storyCreated.imageUrl}
                    alt={storyCreated.title}
                    className={styles.storyPreviewImage}
                  />
                )}
                <h3 className={styles.storyPreviewTitle}>
                  {storyCreated.title}
                </h3>
                {storyCreated.paragraphs?.map((text, i) => (
                  <p key={i} className={styles.storyParagraph}>
                    {text.paragraph}
                  </p>
                ))}

                <button
                  className={styles.btnSave}
                  onClick={setStoryToDB}
                  disabled={isLoadingSaveToDB}
                >
                  {isLoadingSaveToDB ? "✦ Saving…" : "✦ Save Story"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ToastContainer
        toastStyle={{
          background: "#0a1830",
          border: "1px solid rgba(80,140,210,0.25)",
          color: "#c8dff5",
          fontFamily: "'Cinzel', serif",
          fontSize: 12,
          letterSpacing: "0.05em",
        }}
      />
    </div>
  );
}
