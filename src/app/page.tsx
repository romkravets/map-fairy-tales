"use client"
import MapUa from '../components/MapUa/MapUa';
import Modal from '../components/Modal/Modal';
import {useEffect, useState} from "react";
import Voting from "@/components/Voting/Voting";
import {v4 as uuid} from "uuid"
import {ref, child, get, set} from "firebase/database"
import {db} from "../db/firebase"
import Login from "@/components/Auth/Login/Login"
import {auth} from '../db/firebase'

export default function Home() {
  const tasksRef = ref(db)

  const region = {
    id: '',
    region: '',
    value: {
      0: 0,
      1: 0,
      2: 0
    }
  }

  const initialState = {
    token: "",
    isError: false,
    errorMessage: "",
    userId: "",
    userName: "",
    email: "",
    isAuthenticated: false,
  }

  const [modal, setModal] = useState(false)
  const [regionData, setRegionData] = useState(region)

  const [authData, setAuthData] = useState(initialState)
  const [usersVoting, setUsersVoting] = useState({})
  const [checkIfSetValue, setCheckIfSetValue] = useState(true)
  console.log(usersVoting)

  const getDataUsers = () => {
    try {
      get(child(tasksRef, `users/${regionData.region}/${authData.userId}`)).then((snapshot) => {
        if (snapshot.exists()) {
          const dataArray = Object.keys(snapshot.val() || {}).length > 0 ? Object.values(snapshot.val()) : []
          const result = {};
          debugger
          dataArray.forEach(obj => {
            for (const userId in obj) {
              const { region, value } = obj[userId];
              if (!result[region]) {
                result[region] = value;
              }
              for (let i = 1; i <= value.length; i++) {
                if (typeof value[i] === 'number') {
                  result[region][i] += value[i];
                }
              }
            }
          });
          setUsersVoting(result)
        } else {
          console.log("No data getDataUser available")
        }
      }).catch((err) => {
        console.error(err)
      })
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => getDataUsers(), [])

  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <MapUa
          modal={modal}
          setModal={setModal}
          setRegionData={setRegionData}
          regionData={regionData}
          usersVoting={usersVoting}
        />
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
              value: {
                0: 0,
                1: 0,
                2: 0,
              },
              id: ''
            })
            setModal(false)
            auth.signOut().then( () => {
              setAuthData(prevState => ({
                ...prevState,
                isAuthenticated: false,
                userName: '',
                userId: '',
                email: '',
                token: ''
              }))
            }, function(error) {
              console.error('Sign Out Error', error)
            })
          }}>X
          </button>
          <div>{regionData.region}</div>
          <Voting
            setRegionData={setRegionData}
            regionData={regionData}
            setCheckIfSetValue={setCheckIfSetValue}
          />
          {!checkIfSetValue && !authData?.userId ?
            <Login
              setAuthData={setAuthData}
            />
            : null
          }
          {authData?.userId ? <button disabled={checkIfSetValue}
            onClick={() => {
              const regionId = uuid()
                setRegionData({...regionData, id: regionId})
                  set(ref(db, `users/${regionData.region}/${authData.userId}`), {
                    userId: authData.userId,
                    status: true,
                    region: regionData.region,
                    value: regionData.value,
                    id: regionId
                  }).then(() => {
                    alert('send user status')
                    setModal(false)
                    setCheckIfSetValue(false)
                  }).then(() => {
                    getDataUsers()
                  }).catch((err) => {
                  console.log(err)
                })
              }
             }
          >Підтвердити</button> : null}
        </Modal>
      )
      }
    </>
  );
}
