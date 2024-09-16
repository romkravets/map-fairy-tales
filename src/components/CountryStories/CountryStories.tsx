'use client'
import {useSearchParams} from 'next/navigation';
import {useEffect, useState, useContext, ChangeEvent} from 'react';
import {child, get, ref, set, ref as dbRef} from 'firebase/database';
import {db} from '@/db/firebase';
import Login from '@/components/Auth/Login/Login';
import {showNotification} from '@/helpers/showNotification';
import {ToastContainer} from 'react-toastify';
import {v4 as uuid} from 'uuid';
import {CountryInfo, CountryStoryItem, StoryData, UserData} from '@/helpers/types';
import {getStorage, ref as storageRef, uploadBytes, getDownloadURL} from 'firebase/storage';
import Select from 'react-select';
import {UserAuthBuilder} from '../../../context/context';
import {useCountdown} from "@/helpers/useCountdown";
import Preloader from "@/components/Preloader/Preloader";
import Grid from "@mui/material/Grid2";
import Card from "@mui/material/Card";
import Link from "next/link";
import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import BtnBack from "@/components/BtnBack/BtnBack";

interface CustomValueForStory {
  team: string;
  heroes: string;
  events: string;
}

const userInitialData = {
  userName: '',
  countStoryOfDay: 3,
  expiryTime: 0,
  stories: []
}

export default function CountryStories() {
  const searchParams = useSearchParams();
  const region = searchParams?.get('region') ?? '';
  const id = searchParams?.get('id') ?? '';
  const tasksRef = ref(db);
  const {user} = useContext(UserAuthBuilder);

  const [storyCreated, setCreatedStory] = useState<StoryData | null>(null);
  const [isLoadingStory, setIsLoadingStory] = useState(false);
  const [isLoadingSaveToDB, setIsLoadingSaveToDB] = useState(false);
  const [countryMap, setCountryMap] = useState<{
    info: CountryInfo | null;
    stories: CountryStoryItem[];
  }>({
    info: null,
    stories: [],
  });
  const [loadingCountryMap, setLoadingCountryMap] = useState(true);
  const [selectedValue, setSelectedValue] = useState('random');
  const [customValueForStory, setCustomValueForStory] = useState<CustomValueForStory>({
    team: '',
    heroes: '',
    events: ''
  });
  const [userData, setUserData] = useState<UserData>(userInitialData);
  const options = [
    {value: 'jungle', label: 'Jungle'},
    {value: 'travel', label: 'Travel'},
    {value: 'superheroes', label: 'Superheroes'}
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        await getCountryStories();
        if (user?.userId) await getUserData();
      }
    };
    if (typeof window !== 'undefined') {
      fetchData().catch(console.error);
    }
  }, [id, user]);

  const getUserData = async () => {
    try {
      const snapshot = await get(child(tasksRef, `users/${user.userId}`));
      if (snapshot.exists()) {
        setUserData(snapshot.val());
      } else {
        console.log('No user data available');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getCountryStories = async () => {
    try {
      const snapshot = await get(child(tasksRef, `maps/${id}`));
      if (snapshot.exists()) {
        setCountryMap(snapshot.val());
      } else {
        console.log('No data available');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCountryMap(false);
    }
  };

  const createAIStory = async () => {
    setIsLoadingStory(true);
    if (region) {
      try {
        const response = await fetch('/api/openai', {
          body: JSON.stringify({region, customValueForStory}),
          headers: {'Content-Type': 'application/json'},
          method: 'POST'
        });
        if (!response.ok) {
          console.log('Error:', response.statusText);
          return;
        }
        const data = await response.json();
        setCreatedStory(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingStory(false);
        setCustomValueForStory({team: '', heroes: '', events: ''});
        setSelectedValue('random');
      }
    }
  };

  const setStoryToDB = async () => {
    if (!storyCreated || !user?.userId || !id) return;

    const newStoryId = uuid();
    const storage = getStorage();
    const imageUrl = storyCreated.imageUrl;
    let imageDownloadUrl = '';

    try {
      setIsLoadingSaveToDB(true);
      const responseImage = await fetch(imageUrl);
      const blob = await responseImage.blob();
      const imageRef = storageRef(storage, `stories/${user.userId}/${id}/${newStoryId}/${newStoryId}.jpg`);
      const snapshot = await uploadBytes(imageRef, blob);
      imageDownloadUrl = await getDownloadURL(snapshot.ref);

      const newStory = {
        id: newStoryId,
        userId: user.userId,
        regionId: id,
        story: {...storyCreated, imageUrl: imageDownloadUrl},
        region,
        like: 0,
        status: false
      };

      const updatedStories = [...(countryMap.stories || []), newStory];
      if (newStory.id && newStory.story.title) {
        const updatedUserStories: Array<{ id: string }> = [
          ...(userData.stories || []),
          {
            id: newStoryId,
            nameStory: storyCreated.title,
            link: newStoryId,
            imageUrl: imageDownloadUrl,
            countryId: id
          }
        ];

        const newCountStoryOfDay = userData.countStoryOfDay > 0 ? userData.countStoryOfDay - 1 : 0;
        const newExpiryTime = newCountStoryOfDay === 0 ? new Date(Date.now() + 3 * 60 * 1000).getTime() : null;

        await set(dbRef(db, `users/${user.userId}`), {
          userName: user.userName,
          countStoryOfDay: newCountStoryOfDay,
          expiryTime: newExpiryTime,
          stories: updatedUserStories,
        });
      }
      await set(dbRef(db, `maps/${id}`), {...countryMap, stories: updatedStories});

      showNotification('Saved in DB', 'success');
      setCreatedStory(null);
      await getCountryStories();
    } catch (error) {
      console.error('Error saving story to Firebase Realtime Database:', error);
      showNotification('Error saving story', 'error');
    } finally {
      setIsLoadingSaveToDB(false);
    }
  };

  const handleRadioChange = (value: string) => setSelectedValue(value);
  const { hours, minutes, seconds } = useCountdown(userData.expiryTime, userData.stories);

  return (
    <div className="country-stories">
      <BtnBack linkUrl="/"/>
      <h1>{region}</h1>
      {!loadingCountryMap ? (
        countryMap.info ? (
          <div>
            <p><strong>Capital City:</strong> {countryMap.info.capitalCity || 'Information not available'}</p>
            <p><strong>Location and Size:</strong> {countryMap.info.locationAndSize || 'Information not available'}</p>
            <p><strong>Language:</strong> {countryMap.info.language || 'Information not available'}</p>
            <p><strong>Culture and
              Traditions:</strong> {countryMap.info.cultureAndTraditions || 'Information not available'}</p>
            <p><strong>Nature and Wildlife:</strong> {countryMap.info.natureAndWildlife || 'Information not available'}
            </p>
            <p><strong>Friendly People:</strong> {countryMap.info.friendlyPeople || 'Information not available'}</p>
          </div>
        ) : (
          <p>Don&lsquo;t find information...</p>
        )
      ) : (
        <Preloader/>
      )}
      {countryMap.stories?.length ? <h2>All Stories</h2> : null}
      <Grid
        container justify="center"
        style={{marginTop: 20}}
      >
        {countryMap.stories?.length > 0 && (
          countryMap.stories.map((item, index) => (
            <Grid size={4}>
              <Card key={index} sx={{maxWidth: 345}} style={{marginBottom: 20}}>
                <Link href={`/story?region=${item.regionId}&id=${item.id}`}>
                  {item.story.imageUrl && (
                    <CardMedia
                      sx={{height: 140}}
                      image={item.story.imageUrl}
                      alt={item.story.title}
                      className="settings-image-banner"
                    />
                  )}
                  <CardContent style={{padding: 10}}>
                    <Typography gutterBottom variant="h3" component="div">
                      {item.story.title}
                    </Typography>
                    {item.story.paragraphs?.[0] && (
                      <Typography gutterBottom variant="body2" component="div">
                        {item.story.paragraphs[0].paragraph}
                      </Typography>
                    )}
                  </CardContent>
                </Link>
              </Card>
            </Grid>
          )))}
      </Grid>

      <h4>Create story:</h4>
      {!user?.userId && !user?.isAuthenticated && <Login/>}
      {user?.userId && user?.isAuthenticated && (
        <>
          <fieldset>
            <legend>Get Random Story or add Your settings:</legend>
            <div>
              <input
                type="radio"
                id="random"
                name="random"
                value="random"
                checked={selectedValue === 'random'}
                onChange={() => handleRadioChange('random')}
              />
              <label htmlFor="random">Random</label>
            </div>
            <div>
              <input
                type="radio"
                id="custom"
                name="custom"
                value="custom"
                checked={selectedValue === 'custom'}
                onChange={() => handleRadioChange('custom')}
              />
              <label htmlFor="custom">Custom</label>
            </div>
          </fieldset>
          {selectedValue === 'custom' && (
            <>
              <p>Choose a theme:</p>
              <Select
                name="team"
                onChange={(e) => setCustomValueForStory({...customValueForStory, team: e ? e.value : ''})}
                value={options.find(item => item.value === customValueForStory.team)}
                options={options}
              />
              <div>
                <input
                  placeholder="Heroes"
                  value={customValueForStory.heroes}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomValueForStory({
                    ...customValueForStory,
                    heroes: e.target.value
                  })}
                />
              </div>
              <div>
                <input
                  placeholder="Events in story"
                  value={customValueForStory.events}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomValueForStory({
                    ...customValueForStory,
                    events: e.target.value
                  })}
                />
              </div>
            </>
          )}
          { userData.countStoryOfDay > 0 ?
            <Button
              variant="contained" onClick={createAIStory}>{isLoadingStory ? 'Loading...' : 'Create Story'}
            </Button>
            :
            (
              <div>
                  <p>limit reached</p>
                  <p>{hours}h {minutes}m {seconds}s</p>
              </div>
            )
          }
          {storyCreated && (
            <div>
              {storyCreated.imageUrl && (
                <img
                  src={storyCreated.imageUrl}
                  alt={storyCreated.title} width="600"
                  height="400"
                />
              )}
              <h3>{storyCreated.title}</h3>
              {storyCreated.paragraphs?.map((text, index) => (
                <p key={index}>{text.paragraph}</p>
              ))}
            </div>
          )}
          {storyCreated && user?.userId && user?.isAuthenticated && (
            <button onClick={setStoryToDB}>{isLoadingSaveToDB ? 'Send...' : 'Save'}</button>
          )}
        </>
      )}
      <ToastContainer/>
    </div>
  );
}
