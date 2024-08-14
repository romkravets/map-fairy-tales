"use client";
import {useSearchParams} from 'next/navigation'
import {useRouter} from "next/router";
import {useEffect, useState, useContext} from "react";
import {child, get, ref, set, ref as dbRef} from "firebase/database";
import {db} from "@/db/firebase";
import Login from "@/components/Auth/Login/Login";
import {showNotification} from "@/helpers/showNotification";
import {ToastContainer} from "react-toastify";
import {v4 as uuid} from "uuid";
import {ItemCountryMap, StoryData, UserData} from "@/helpers/types";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import Select from 'react-select'
import {UserAuthBuilder} from "../context/context";

export default function Country() {
  const router = useRouter();
  const region = useSearchParams().get('region');
  const id = useSearchParams().get('id');
  const tasksRef = ref(db);
  const { user } = useContext(UserAuthBuilder);

  const [storyCreated, setCreatedStory] = useState<StoryData>(null);
  const [isLoadingStory, setIsLoadingStory] = useState(false);
  const [isLoadingSveToDB, setIsLoadingSveToDB] = useState(false);
  const [countryMap, setCountryMap] = useState<Partial<ItemCountryMap>>({});
  const [loadingCountryMap, setLoadingCountryMap] = useState(true);
  const [
    selectedValue,
    setSelectedValue,
  ] = useState("random");

  const [customValueForStory, setCustomValueForStory] = useState({
    team: '',
    heroes: '',
    events: ''
  });

  const [userData, setUserData] = useState<UserData>([]);


  const handleRadioChange = (value) => setSelectedValue(value);

  const getUserData = async () => {
    try {
      get(child(tasksRef, `users/${user.userId}`)).then((snapshot) => {
        if (snapshot.exists()) {
          setUserData(snapshot.val());
        } else {
          console.log("No user data available");
        }
      }).catch((err) => {
        console.error(err);
      });
    } catch (error) {
      console.log(error);
    } finally {
    }
  }

  const getCountryStories = async () => {
    try {
      get(child(tasksRef, `maps/${id}`)).then((snapshot) => {
        if (snapshot.exists()) {
          setCountryMap(snapshot.val());
          setLoadingCountryMap(false);
        } else {
          console.log("No data available");
        }
      }).catch((err) => {
        console.error(err);
      });
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingCountryMap(false);
    }
  };

  useEffect(() => {
    if (id) {
      getCountryStories().catch((err) => console.log(err));
      if (user.userId) {getUserData().catch((err) => console.log(err))}
    }
  }, [id, user.userId])

  const createAIStory = async () => {
    setIsLoadingStory(true)
    if (region) {
      try {
        const res = await fetch(`/api/openai`, {
          body: JSON.stringify({region, customValueForStory}),
          headers: {
            'Content-Type': 'application/json'
          },
          method: 'POST'
        });
        if (!res.ok) {
          console.log(!res.ok)
        }
        const data = await res.json();
        setCreatedStory(data);
      } catch (error) {
      } finally {
        setIsLoadingStory(false);
        setCustomValueForStory({
          team: '',
          heroes: '',
          events: ''
        })
        setSelectedValue('random')
      }
    }
  };

  const setStoryToDB = async () => {
    let data = [];
    let userDataArray=[];

    if (Array.isArray(countryMap.stories)) {
      data = [...countryMap.stories];
    }

    if (Array.isArray(userData.stories)) {
      userDataArray = [...userData.stories];
    }

    if (storyCreated && user?.userId && id) {
      const newStoryId = uuid();
      const storage = getStorage();
      const imageUrl = storyCreated.imageUrl;
      let imageDownloadUrl = '';

      try {
        setIsLoadingSveToDB(true)
        const responseImage = await fetch(imageUrl);
        const blob = await responseImage.blob();

        const imageRef = storageRef(storage, `stories/${user.userId}/${id}/${newStoryId}/${newStoryId}.jpg`);

        const snapshot = await uploadBytes(imageRef, blob);
        imageDownloadUrl = await getDownloadURL(snapshot.ref);
        setIsLoadingSveToDB(false)
      } catch (error) {
        console.error('Error uploading image to Firebase Storage:', error);
        showNotification("Error uploading image", 'error');
        return;
      }

      const newStory = {
        id: newStoryId,
        userId: user.userId,
        regionId: id,
        story: {
          ...storyCreated,
          imageUrl: imageDownloadUrl,
        },
        region: region,
        like: 0,
        status: false,
      };
      const userStoryData = {
        id: newStoryId,
      };
      data.push(newStory);
      if (!userDataArray.some(story => story.id === newStoryId)) {
        userDataArray.push(userStoryData);
      }
      try {
        await set(dbRef(db, `maps/${id}`), {
          ...countryMap,
          stories: data,
        });
        await set(dbRef(db, `users/${user.userId}`), {
          ...userData,
          stories: userDataArray,
        });

        showNotification("Saved in DB", 'success');
        setCreatedStory(null);
        setUserData([])
        getCountryStories().catch((err) => console.log(err));
        getUserData().catch((err) => console.log(err));
      } catch (err) {
        console.error('Error saving story to Firebase Realtime Database:', err);
        showNotification("Error saving story", 'error');
        setUserData([])
      }
    }
  };

  const {
    capitalCity,
    locationAndSize,
    language,
    cultureAndTraditions,
    natureAndWildlife,
    friendlyPeople
  } = countryMap.info || {};

  const options = [
    { value: 'jungle', label: 'Jungle' },
    { value: 'travel', label: 'Travel' },
    { value: 'superheroes', label: 'Superheroes' }
  ]

  return (
    <>
      <button onClick={() => router.push('/')}>Back</button>
      <h1>{region}</h1>
      {!loadingCountryMap ? (
        countryMap.info ? (
          <div>
            <p><strong>Capital City:</strong> {capitalCity || 'Information not available'}</p>
            <p><strong>Location and Size:</strong> {locationAndSize || 'Information not available'}</p>
            <p><strong>Language:</strong> {language || 'Information not available'}</p>
            <p><strong>Culture and Traditions:</strong> {cultureAndTraditions || 'Information not available'}</p>
            <p><strong>Nature and Wildlife:</strong> {natureAndWildlife || 'Information not available'}</p>
            <p><strong>Friendly People:</strong> {friendlyPeople || 'Information not available'}</p>
          </div>
        ) : (
          <p>Don&apos;t find information...</p>
        )
      ) : (
        <p>Loading country information...</p>
      )}
      <h2>All Stories</h2>
      {countryMap?.stories?.length > 0 &&
        countryMap.stories?.map((item, index) => {
          const {title, paragraphs, imageUrl} = item.story
          return (
            <div key={index}>
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={title}
                  width="600"
                  height="400"
                />
              )}
              <h3>{title}</h3>
              {paragraphs?.map((text, index) => {
                return (
                  <p key={index}>{text.paragraph}</p>
                )
              })}
            </div>
          )
        })
      }
      <h3>Create story:</h3>
      {!user?.userId && !user?.isAuthenticated && <Login/>}
      {user?.userId && user?.isAuthenticated &&
      <>
        <fieldset>
          <legend>Get Random Story or add You settings:</legend>
          <div>
            <input type="radio" id="random" name="random" value="random"
                   checked={selectedValue === "random"}
                   onChange={() => handleRadioChange("random")}
            />
            <label htmlFor="random">Random</label>
          </div>
          <div>
            <input type="radio" id="custom" name="custom" value="custom"
                   checked={selectedValue === "custom"}
                   onChange={() => handleRadioChange("custom")}
            />
            <label htmlFor="custom">Custom</label>
          </div>
        </fieldset>
        {selectedValue === "custom" && (
          <>
            <p>Обери тему:</p>
            <Select
              name="team"
              onChange={(e) => setCustomValueForStory({
                ...customValueForStory,
                team: e ? e.value : ''
              })}
              value={options.find(item => item.value === customValueForStory.team)}
              options={options}
            />
            <div>
              <input
                placeholder="Heroes" value={customValueForStory.heroes}
                onChange={e => setCustomValueForStory({
                  ...customValueForStory,
                  heroes: e.target.value
                })
                }
              />
            </div>
            <div>
              <input
                placeholder="Events in story"
               value={customValueForStory.events}
               onChange={e => setCustomValueForStory({
                 ...customValueForStory,
                 events: e.target.value
               })
               }
              />
            </div>
          </>
        )}
          <button onClick={() => createAIStory()}>{isLoadingStory ? 'Loading...' :  'Create Story'}</button>
          {storyCreated && (
              <div>
                {storyCreated.imageUrl && (
                  <img
                    src={storyCreated.imageUrl}
                    alt={storyCreated.title}
                    width="600"
                    height="400"
                  />
                )}
                <h3>{storyCreated.title}</h3>
                {storyCreated.paragraphs?.map((text, index) => {
                  return (
                    <p key={index}>{text.paragraph}</p>
                  )
                })}
              </div>
              )}
        </>}
        {(storyCreated && user?.userId && user?.isAuthenticated) && <button onClick={setStoryToDB}>{isLoadingSveToDB ? 'Send...' : 'Save'}</button>}
      <ToastContainer/>
    </>
  );
}
