"use client"
import MapUa from '../components/MapUa/MapUa';
import Modal from '../components/Modal/Modal';
import {useContext, useEffect, useState} from "react";
import Voting from "@/components/Voting/Voting";
import {v4 as uuid} from "uuid"
import {ref, update, child, get, set} from "firebase/database"
import {db} from "../db/firebase"
import Login from "@/components/Auth/Login/Login"
import {auth} from '../db/firebase'

export default function Home() {
  const tasksRef = ref(db)

  const region = {
    id: '',
    region: '',
    value: {
      1: 0,
      2: 0,
      3: 0,
      4: 0
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
  const [oldValue, setOldValue] = useState(null)

  const [authData, setAuthData] = useState(initialState)
  const [userVoting, setUserVoting] = useState(false)
  const [checkIfSetValue, setCheckIfSetValue] = useState(true)
  console.log(checkIfSetValue)

  const getFormApp = async (regionName) => {
    try {
      get(child(tasksRef, `regions/${regionName}`)).then((snapshot) => {
        if (snapshot.exists()) {
          setOldValue(snapshot.val())
        } else {
          console.log("No data getFormApp available")
        }
      }).catch((err) => {
        console.error(err)
      })
    } catch (error) {
      console.log(error)
    }
  }

  const getDataUser = () => {
    try {
      get(child(tasksRef, `users/${authData.userId}`)).then((snapshot) => {
        if (snapshot.exists()) {
          console.log(snapshot.exists())
         if (authData.userId) {setUserVoting(true)}
        } else {
          console.log("No data getDataUser available")
        }
      }).then(() => {

      })
        .catch((err) => {
        console.error(err)
      })
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    getFormApp(regionData.region)
  }, [modal])

  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <MapUa
          modal={modal}
          setModal={setModal}
          setRegionData={setRegionData}
          regionData={regionData}
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
                1: 0,
                2: 0,
                3: 0,
                4: 0
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
          <Voting setRegionData={setRegionData} regionData={regionData} getFormApp={getFormApp} setCheckIfSetValue={setCheckIfSetValue}/>
          {!checkIfSetValue && !authData?.userId ? <Login authData={authData} setAuthData={setAuthData} getDataUser={getDataUser}/> : null}
          {authData?.userId ? <button disabled={checkIfSetValue}
            onClick={() => {
            getDataUser()
            if (userVoting) {
              alert('Ви вже голосували!')
            } else {
              const getKeyByValue = (object, value) => {
                return Object.keys(object).find(key => object[key] === value);
              }
              const newValue = {...oldValue.value}
              newValue[getKeyByValue(regionData.value, 1)] = (newValue[getKeyByValue(regionData.value, 1)] || 0) + 1
              const regionId = uuid()
              if (Object.values(newValue).every(item => item === 0)) {
                alert('Ви не вибрали варіант')
                return
              } else {
                setRegionData({...regionData, id: regionId})
                const dbRef = ref(db, `regions/${regionData.region}`)
                update(dbRef, {value: newValue}).then(() => {
                  getFormApp(regionData.region)
                  set(ref(db, 'users/' + authData.userId), {
                    userId: authData.userId,
                    status: true,
                    region: regionData.region,
                    value: regionData.value,
                    id: regionId
                  }).then(() => {
                    alert('send user status')
                    setModal(false)
                  })
                }).catch((err) => {
                  console.log(err)
                })
              }
            }
          }
          }
          >Підтвердити</button> : null}
          {/*{userVoting ? (*/}
          {/*  <button disabled={checkIfSetValue} onClick={() => {*/}
          {/*    getDataUser();*/}
          {/*    const getKeyByValue = (object, value) => {*/}
          {/*      return Object.keys(object).find(key => object[key] === value);*/}
          {/*    };*/}
          {/*    const oldValue = { ...regionData.value }; // Збереження старих значень*/}
          {/*    const newValue = { ...oldValue };*/}
          {/*    const editedKey = getKeyByValue(regionData.value, 1); // Отримання ключа редагованого значення*/}
          {/*    newValue[editedKey] = (newValue[editedKey] || 0) + 1; // Збільшення нового значення*/}

          {/*    // Зменшення попереднього значення на одиницю, якщо воно не нульове*/}
          {/*    if (oldValue[editedKey] && oldValue[editedKey] > 0) {*/}
          {/*      oldValue[editedKey] -= 1;*/}
          {/*    }*/}

          {/*    // Перевірка, чи користувач обрав хоча б один варіант*/}
          {/*    if (Object.values(newValue).every(item => item === 0)) {*/}
          {/*      alert('Ви не вибрали варіант');*/}
          {/*      return;*/}
          {/*    } else {*/}
          {/*      const dbRef = ref(db, `regions/${regionData.region}`);*/}
          {/*      update(dbRef, { value: newValue }).then(() => {*/}
          {/*        getFormApp(regionData.region);*/}
          {/*        set(ref(db, 'users/' + authData.userId), {*/}
          {/*          userId: authData.userId,*/}
          {/*          status: true,*/}
          {/*          region: regionData.region,*/}
          {/*          value: regionData.value*/}
          {/*        }).then(() => {*/}
          {/*          alert('send user status відредаговано');*/}
          {/*        });*/}
          {/*      }).catch((err) => {*/}
          {/*        console.log(err);*/}
          {/*      });*/}
          {/*    }*/}
          {/*  }}>Редагувати відповідь</button>*/}
          {/*) : null}*/}
        </Modal>
      )
      }
    </>
  );
}
