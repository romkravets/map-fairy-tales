"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth } from "@/db/firebase";
import { db } from "@/db/firebase";
import { ref, child, get, set } from "firebase/database";
import MapUa from "@/components/MapUa/MapUa";
import Modal from "@/components/Modal/Modal";
import Voting from "@/components/Voting/Voting";
import AnonymouslyLogin from "@/components/Auth/AnonymouslyLogin/AnonymouslyLogin";
import Login from "@/components/Auth/Login/Login";
import { ToastContainer } from "react-toastify";
import { showNotification } from "@/helpers/showNotification";
import "../src/app/globals.css";
import MapWorld2 from "@/components/MapWorld2/MapWorld2";

type VotingItem = {
  region: string;
  value: number;
  userId?: string;
  votes?: number[],
  regionVotes?: number,

};

type ItemMapVoting = {
  completeQuizCount: number;
  description: string;
  id: string;
  like: number;
  regionName: string;
  reports: number;
  status: boolean;
  time: number;
  title: string;
  userId: string;
  userName: string;
  voting: VotingItem[];
};

type AuthData = {
  isError: boolean;
  errorMessage: string;
  userId: string;
  isAuthenticated: boolean;
};

type VotingValue = {
  one: number,
  two: number,
  three: number,
};


const Id = () => {
  const router = useRouter();
  const id = router.query.id as string;
  const tasksRef = ref(db);

  const initialUserState: AuthData = {
    isError: false,
    errorMessage: "",
    userId: "",
    isAuthenticated: false,
  };

   const initialVotingItem: VotingItem = {
    region: "",
    value: 0,
  };

  const valuesBtnVoting: VotingValue = {
    one: 1,
    two: 2,
    three: 3,
  };


  const [modal, setModal] = useState(false);
  const [authData, setAuthData] = useState<AuthData>(initialUserState);
  const [regionData, setRegionData] = useState<VotingItem>(initialVotingItem);
  const [usersVoting, setUsersVoting] = useState<Record<string, number>>({});
  const [checkIfSetValue, setCheckIfSetValue] = useState(true);
  const [btnVotingActive, setBtnVotingActive] = useState<number | null>(null);
  const [itemMapVoting, setItemMapVoting] = useState<Partial<ItemMapVoting>>({});
  const [loadingMapApp, setLoadingMapApp] = useState(false);

  console.log(regionData, 'regionData')
  console.log(usersVoting, 'usersVoting')
  console.log(itemMapVoting, 'itemMapVoting')

  useEffect(() => {
    if (router.isReady) {
      getMapApp().catch((error) => {
        console.log(error);
      });
    }
  }, [router.isReady]);

  useEffect(() => {
    getDataUsers();
  }, [itemMapVoting]);

  const getMapApp = async () => {
    setLoadingMapApp(true);
    try {
      get(child(tasksRef, `maps/${id}`)).then((snapshot) => {
        if (snapshot.exists()) {
          setItemMapVoting(snapshot.val());
          setLoadingMapApp(false);
        } else {
          console.log("No data available");
        }
      }).catch((err) => {
        console.error(err);
      });
    } catch (error) {
      console.log(error);
    }
  };

  const getDataUsers = () => {
    const votingArray = itemMapVoting.voting;
    if (!Array.isArray(votingArray)) {
      return;
    }
    const result: Record<string, { sum: number; count: number }> = {};

    votingArray.forEach((obj) => {
      const { region, value } = obj;
      if (!result[region]) {
        result[region] = { sum: 0, count: 0 };
      }
      result[region].sum += value;
      result[region].count += 1;
    });

    const averages: Record<string, number> = {};
    for (const region in result) {
      averages[region] = result[region].sum / result[region].count;
    }
    setUsersVoting(averages);
  };

  if (loadingMapApp) return <p>Loading...</p>;

  return (
    <>
      <main>
        <MapWorld2
          modal={modal}
          setModal={setModal}
          setRegionData={setRegionData}
          regionData={regionData}
          usersVoting={usersVoting}
          loadingMapApp={loadingMapApp}
        />
      </main>
      {modal && (
        <Modal
        >
          <button onClick={() => {
            setRegionData({
              ...regionData,
              region: '',
              value: 0,
            });
            setModal(false);
            setBtnVotingActive(null);
            setCheckIfSetValue(true);
            auth.signOut().then(() => {
              setAuthData(initialUserState);
            }, function (error) {
              console.error('Sign Out Error', error);
            });
          }}>
            X
          </button>
          <div>{regionData.region}</div>
          <Voting
            setRegionData={setRegionData}
            regionData={regionData}
            setCheckIfSetValue={setCheckIfSetValue}
            setBtnVotingActive={setBtnVotingActive}
            btnVotingActive={btnVotingActive}
            valuesBtnVoting={valuesBtnVoting}
          />
          {!checkIfSetValue && !authData?.userId && !authData?.isAuthenticated ?
            <>
              <Login setAuthData={setAuthData}/>
              <AnonymouslyLogin setAuthData={setAuthData}/>
            </>
            : null
          }
          {authData?.userId ? <button
            disabled={checkIfSetValue}
            onClick={() => {
              let voting: VotingItem[] = [];
              if (Array.isArray(itemMapVoting.voting)) {
                voting = [...itemMapVoting.voting];
              }
              const data: VotingItem = {
                userId: authData.userId,
                value: regionData.value,
                region: regionData.region,
              };
              voting.push(data);
              set(ref(db, `maps/${id}`), {
                ...itemMapVoting,
                voting: voting,
              }).then(() => {
                showNotification("Ваш голос записаний!", 'success');
                setCheckIfSetValue(true);
                setRegionData({
                  region: "",
                  value: 0,
                  votes: [],
                  regionVotes: 0,
                });
                setItemMapVoting({})
                setUsersVoting({})
                setModal(false);
                auth.signOut().then(() => {
                  setAuthData(initialUserState);
                }, function (error) {
                  console.error('Sign Out Error', error);
                });
              }).then(() => {
                getMapApp().catch((err) => {
                  console.log(err);
                });
              }).catch((err) => {
                console.log(err);
              });
            }
            }
          >Підтвердити голос</button> : null}
        </Modal>
      )
      }
      <ToastContainer/>
    </>
  );
}

export default Id;
