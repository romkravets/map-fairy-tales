"use client"
import {useEffect, useState} from "react"
import {useRouter} from "next/router"
import {auth} from '@/db/firebase'
import {db} from "@/db/firebase"
import {ref, child, get, set, serverTimestamp} from "firebase/database"
import MapUa from '@/components/MapUa/MapUa'
import Modal from '@/components/Modal/Modal'
import Voting from "@/components/Voting/Voting"
import AnonymouslyLogin from "@/components/Auth/AnonymouslyLogin/AnonymouslyLogin"
import Login from "@/components/Auth/Login/Login"
import {ToastContainer} from "react-toastify"
import {showNotification} from "@/helpers/showNotification"
import "../src/app/globals.css"
import MapWorld from "@/components/MapWorld/MapWorld";

const Id = () => {
  const router = useRouter()
  const id = router.query.id
  const tasksRef = ref(db)

  const votingItemRegionUser = {
    region: '',
    value: 0
  }

  const valuesBtnVoting = {
    'one': 0.1,
    'two': 0.5,
    'three': 1
  }

  const initialUserState = {
    isError: false,
    errorMessage: "",
    userId: "",
    isAuthenticated: false,
  }

  const votingType = {
    // id: '',
    // regionName: '',
    // time: serverTimestamp(),
    // status: false,
    // like: 0,
    // reports: 0,
    // title: '',
    // description: '',
    // userId: '',
    // userName: '',
    voting: {},
  }

  const [modal, setModal] = useState(false)

  const [authData, setAuthData] = useState(initialUserState)
  const [regionData, setRegionData] = useState(votingItemRegionUser)
  const [usersVoting, setUsersVoting] = useState({})
  console.log(usersVoting, 'usersVoting')
  const [checkIfSetValue, setCheckIfSetValue] = useState(true)

  const [btnVotingActive, setBtnVotingActive] = useState(null)

  const [itemMapVoting, setItemMapVoting] = useState(votingType)
  const [loadingMapApp, setLoadingMapApp] = useState(false)
  console.log(itemMapVoting, 'itemMapVoting')

  const getMapApp = async () => {
    setLoadingMapApp(true)
    try {
      get(child(tasksRef, `maps/${id}`)).then((snapshot) => {
        if (snapshot.exists()) {
          setItemMapVoting(snapshot.val())
          setLoadingMapApp(false)
        } else {
          console.log("No data available")
        }
      }).catch((err) => {
        console.error(err)
      })
    } catch (error) {
      console.log(error)
    }
  }

  const getDataUsers = () => {
    const votingArray = itemMapVoting.voting;
    if (!Array.isArray(votingArray)) {
      return;
    }

    const result = {};

    votingArray.forEach(obj => {
      const {region, value} = obj;
      if (!result[region]) {
        result[region] = 0;
      }
      result[region] += value;
    });

    setUsersVoting(result);
  };

  useEffect(() => {
    if (router.isReady) {
      getMapApp().catch((error) => {
        console.log(error)
      })
    }
  }, [router.isReady])

  useEffect(() => getDataUsers(), [itemMapVoting])

  if (loadingMapApp) return <p>Loading</p>

  return (
    <>
      <main className="min-h-screen flex-col items-center justify-between p-24">
        {itemMapVoting.regionName === 'ukraine' ?
          <MapUa
            modal={modal}
            setModal={setModal}
            setRegionData={setRegionData}
            regionData={regionData}
            usersVoting={usersVoting}
            loadingMapApp={loadingMapApp}
          />
          : itemMapVoting.regionName === "world" ?
          <MapWorld
            modal={modal}
            setModal={setModal}
            setRegionData={setRegionData}
            regionData={regionData}
            usersVoting={usersVoting}
            loadingMapApp={loadingMapApp}
          /> : <h2>no data</h2>
        }
      </main>
      {modal && (
        <Modal
          setModal={setModal}
          setRegionData={setRegionData}
          regionData={regionData}
        >
          <button onClick={() => {
            setRegionData({
              ...regionData,
              region: '',
              value: 0,
            })
            setModal(false)
            setBtnVotingActive(null)
            setCheckIfSetValue(true)
            auth.signOut().then(() => {
              setAuthData(initialUserState)
            }, function (error) {
              console.error('Sign Out Error', error)
            })
          }}>X
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
              let voting = [];
              if (Array.isArray(itemMapVoting.voting)) {
                voting = [...itemMapVoting.voting];
              }
              const data = {
                userId: authData.userId,
                value: regionData.value,
                region: regionData.region,
              };
              voting.push(data);
              set(ref(db, `maps/${id}`), {
                ...itemMapVoting,
                voting: voting,
              }).then(() => {
                showNotification("Ваш голос записаний!", 'success')
                setCheckIfSetValue(true)
                setRegionData({
                  ...regionData,
                  value: 0,
                })
                setModal(false)
                auth.signOut().then(() => {
                  setAuthData(initialUserState)
                }, function (error) {
                  console.error('Sign Out Error', error)
                })
              }).then(() => {
                getMapApp().catch((err) => {
                  console.log(err)
                })
              }).catch((err) => {
                console.log(err)
              })
            }
            }
          >Підтвердити голос</button> : null}
        </Modal>
      )
      }
      <ToastContainer/>
    </>
  )
}

export default Id
